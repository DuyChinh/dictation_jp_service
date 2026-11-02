/**
 * Build the dictionary collections from the source files. Safe to re-run: every document is replaced by
 * id, and `dict_vi` (our Vietnamese meanings) is never touched.
 *
 *   npx tsx scripts/dict/import.ts [--src .work/dict/raw] [--dry]
 *
 * Sources (all under --src):
 *   jmdict-examples-eng-*.json   JMdict + Tatoeba examples   (jmdict-simplified, CC BY-SA 4.0 — EDRDG)
 *   kanjidic2-en-*.json          KANJIDIC2                    (CC BY-SA 4.0 — EDRDG)
 *   kradfile-*.json              kanji components             (CC BY-SA 4.0 — EDRDG)
 *   jlpt/n1.csv … n5.csv         JLPT vocabulary lists        (Jonathan Waller, CC BY)
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictKanji, type IDictEntry, type IDictKanji } from "../../src/models/Dict.js";
import { formKeys, glossTokens, katakanaToHiragana } from "../../src/modules/dict/kana.js";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const SRC = path.resolve(opt("--src", ".work/dict/raw"));
const DRY = flag("--dry");
const BATCH = 2000;

function sourceFile(prefix: string): string {
  const name = fs.readdirSync(SRC).find((f) => f.startsWith(prefix) && f.endsWith(".json"));
  if (!name) throw new Error(`No ${prefix}*.json under ${SRC}`);
  return path.join(SRC, name);
}
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));

// ---- JLPT word lists ------------------------------------------------------------------------------
type JlptRow = { seq: number; kana: string; kanji: string; level: number };

/** The JLPT lists as (JMdict id, kana, kanji, level) rows; 5 = N5 … 1 = N1. */
function loadJlptRows(): JlptRow[] {
  const rows: JlptRow[] = [];
  for (const level of [1, 2, 3, 4, 5]) {
    const file = path.join(SRC, "jlpt", `n${level}.csv`);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1)) {
      const [seq, kana = "", kanji = ""] = line.split(",");
      const id = Number.parseInt(seq ?? "", 10);
      if (Number.isInteger(id)) rows.push({ seq: id, kana: kana.trim(), kanji: kanji.trim(), level });
    }
  }
  return rows;
}

/**
 * JMdict id → level. The lists sometimes point at a rare homograph (コップ → "cop", だんだん → "thank you"),
 * so when the listed entry is not common but another entry with the same kana and kanji is, the level goes
 * to that common one. A word listed at two levels counts at the easier one.
 * Teacher-confirmed additions (docs/dict-can-xac-nhan.md): both meanings of 元 and マッチ are JLPT words, and
 * the reading きゃしゃ of 華奢 is the one learners need although the list names かしゃ.
 */
const KEEP_BOTH = new Set<number>([2219590, 2784220]);
const ALSO_TAG: Array<[number, number]> = [[1195660, 1]];

function resolveJlpt(rows: JlptRow[], words: SrcWord[]): { levels: Map<number, number>; moved: Array<[number, number]> } {
  const byKana = new Map<string, SrcWord[]>();
  for (const w of words) for (const r of w.kana) (byKana.get(katakanaToHiragana(r.text)) ?? byKana.set(katakanaToHiragana(r.text), []).get(katakanaToHiragana(r.text))!).push(w);
  const isCommon = (w: SrcWord) => [...w.kanji, ...w.kana].some((f) => f.common);
  const byId = new Map(words.map((w) => [Number.parseInt(w.id, 10), w]));

  const levels = new Map<number, number>();
  const moved: Array<[number, number]> = [];
  const tag = (id: number, level: number) => levels.set(id, Math.max(levels.get(id) ?? 0, level));
  for (const row of rows) {
    let id = row.seq;
    const listed = byId.get(id);
    if (!listed || !isCommon(listed)) {
      const same = (byKana.get(katakanaToHiragana(row.kana)) ?? []).filter(
        (w) => isCommon(w) && (!row.kanji || w.kanji.some((k) => k.text === row.kanji)) && (row.kanji || w.kanji.length === 0 || w.kana.some((k) => k.common)),
      );
      const better = same.find((w) => Number.parseInt(w.id, 10) !== id);
      if (better) {
        id = Number.parseInt(better.id, 10);
        moved.push([row.seq, id]);
        if (KEEP_BOTH.has(row.seq)) tag(row.seq, row.level);
      }
    }
    tag(id, row.level);
  }
  for (const [id, level] of ALSO_TAG) tag(id, level);
  return { levels, moved };
}

const JLPT_WEIGHT: Record<number, number> = { 5: 30, 4: 25, 3: 20, 2: 15, 1: 10 };

// ---- JMdict ----------------------------------------------------------------------------------------
type SrcForm = { common: boolean; text: string; tags: string[]; appliesToKanji?: string[] };
type SrcSense = {
  partOfSpeech: string[];
  appliesToKanji: string[];
  appliesToKana: string[];
  field: string[];
  dialect: string[];
  misc: string[];
  info: string[];
  gloss: Array<{ text: string }>;
  examples?: Array<{ sentences: Array<{ lang: string; text: string }> }>;
};
type SrcWord = { id: string; kanji: SrcForm[]; kana: SrcForm[]; sense: SrcSense[] };

const only = <T,>(a: T[] | undefined): T[] | undefined => (a && a.length ? a : undefined);
const restrict = (a: string[]): string[] | undefined => (a.length === 1 && a[0] === "*" ? undefined : only(a));

function toEntry(w: SrcWord, jlpt: Map<number, number>): IDictEntry {
  const id = Number.parseInt(w.id, 10);
  const level = jlpt.get(id);
  const common = [...w.kanji, ...w.kana].some((f) => f.common);
  const keys = new Set<string>();
  for (const f of [...w.kanji, ...w.kana]) for (const k of formKeys(f.text)) keys.add(k);
  const en = new Set<string>();
  for (const s of w.sense) for (const g of s.gloss) for (const t of glossTokens(g.text)) en.add(t);

  return {
    _id: id,
    k: w.kanji.map((k) => ({ t: k.text, ...(k.common ? { c: 1 as const } : {}), ...(only(k.tags) ? { g: k.tags } : {}) })),
    r: w.kana.map((r) => ({
      t: r.text,
      ...(r.common ? { c: 1 as const } : {}),
      ...(only(r.tags) ? { g: r.tags } : {}),
      ...(restrict(r.appliesToKanji ?? ["*"]) ? { ak: restrict(r.appliesToKanji ?? ["*"]) } : {}),
    })),
    s: w.sense.map((s) => {
      const misc = [...s.misc, ...s.dialect];
      const x = (s.examples ?? [])
        .map((e) => ({
          ja: e.sentences.find((t) => t.lang === "jpn")?.text ?? "",
          en: e.sentences.find((t) => t.lang === "eng")?.text ?? "",
        }))
        .filter((e) => e.ja && e.en)
        .slice(0, 2);
      return {
        p: s.partOfSpeech,
        g: s.gloss.map((g) => g.text),
        ...(only(s.field) ? { f: s.field } : {}),
        ...(only(misc) ? { m: misc } : {}),
        ...(only(s.info) ? { i: s.info } : {}),
        ...(restrict(s.appliesToKanji) ? { ak: restrict(s.appliesToKanji) } : {}),
        ...(restrict(s.appliesToKana) ? { ar: restrict(s.appliesToKana) } : {}),
        ...(x.length ? { x } : {}),
      };
    }),
    c: common ? 1 : 0,
    ...(level ? { l: level } : {}),
    w: (common ? 40 : 0) + (level ? JLPT_WEIGHT[level]! : 0),
    keys: [...keys],
    en: [...en],
  };
}

async function writeInBatches<T extends { _id: string | number }>(
  model: mongoose.Model<any>,
  docs: T[],
  label: string,
): Promise<void> {
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH);
    await model.bulkWrite(
      slice.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false },
    );
    process.stdout.write(`\r${label}: ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  process.stdout.write("\n");
}

// ---- KANJIDIC2 -------------------------------------------------------------------------------------
type SrcKanji = {
  literal: string;
  radicals: Array<{ type: string; value: number }>;
  misc: { grade: number | null; strokeCounts: number[]; frequency: number | null; jlptLevel: number | null };
  readingMeaning?: {
    groups: Array<{
      readings: Array<{ type: string; value: string }>;
      meanings: Array<{ lang: string; value: string }>;
    }>;
  };
};

/** Hán Việt readings confirmed by a teacher (docs/dict-can-xac-nhan.md §D): standard reading first, no Nôm readings. */
const HAN_VIET: Record<string, string[]> = JSON.parse(fs.readFileSync(new URL("./data/hanviet.json", import.meta.url), "utf8"));

function toKanji(k: SrcKanji, parts: Map<string, string[]>): IDictKanji {
  const groups = k.readingMeaning?.groups ?? [];
  const readings = (type: string) => [...new Set(groups.flatMap((g) => g.readings.filter((r) => r.type === type).map((r) => r.value)))];
  const rad = k.radicals.find((r) => r.type === "classical")?.value;
  return {
    _id: k.literal,
    ...(k.misc.strokeCounts[0] ? { n: k.misc.strokeCounts[0] } : {}),
    ...(k.misc.grade ? { gr: k.misc.grade } : {}),
    ...(k.misc.jlptLevel ? { l: k.misc.jlptLevel } : {}),
    ...(k.misc.frequency ? { fq: k.misc.frequency } : {}),
    on: readings("ja_on"),
    kun: readings("ja_kun"),
    m: [...new Set(groups.flatMap((g) => g.meanings.filter((m) => m.lang === "en").map((m) => m.value)))],
    hv: HAN_VIET[k.literal] ?? readings("vietnam"),
    ...(rad ? { rad } : {}),
    parts: parts.get(k.literal) ?? [],
  };
}

async function main() {
  console.log(`[dict] source ${SRC}${DRY ? " (dry run)" : ""}`);
  const rows = loadJlptRows();
  const jmdict = readJson(sourceFile("jmdict-examples-eng"));
  const { levels: jlpt, moved } = resolveJlpt(rows, jmdict.words as SrcWord[]);
  fs.mkdirSync(path.join(SRC, ".."), { recursive: true });
  fs.writeFileSync(path.join(SRC, "..", "jlpt-moved.json"), JSON.stringify(moved));
  console.log(`[dict] JLPT list: ${rows.length} rows → ${jlpt.size} words (${moved.length} moved to the common homograph)`);
  const entries = (jmdict.words as SrcWord[]).map((w) => toEntry(w, jlpt));
  const tagged = entries.filter((e) => e.l).length;
  console.log(`[dict] JMdict ${jmdict.version} (${jmdict.dictDate}): ${entries.length} entries, ${tagged} with a JLPT level`);

  const krad = new Map(Object.entries(readJson(sourceFile("kradfile")).kanji as Record<string, string[]>));
  const kanjidic = readJson(sourceFile("kanjidic2-en"));
  const kanji = (kanjidic.characters as SrcKanji[]).map((k) => toKanji(k, krad));
  const withHv = kanji.filter((k) => k.hv.length).length;
  console.log(`[dict] KANJIDIC2 ${kanjidic.version}: ${kanji.length} kanji, ${withHv} with Hán Việt`);

  if (DRY) return;
  await connectMongo();
  await writeInBatches(DictEntry, entries, "dict_entries");
  await writeInBatches(DictKanji, kanji, "dict_kanji");
  console.log("[dict] building indexes…");
  await Promise.all([DictEntry.createIndexes(), DictKanji.createIndexes()]);
  await disconnectMongo();
  console.log("[dict] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
