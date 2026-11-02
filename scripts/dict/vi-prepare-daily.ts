/**
 * Prepare batches of high-frequency daily compound words for Vietnamese translation.
 *
 *   node --import tsx scripts/dict/vi-prepare-daily.ts [--limit 5000] [--size 100] [--out .work/dict/vi]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, DictKanji, type IDictEntry } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const LIMIT = Number.parseInt(opt("--limit", "5000"), 10);
const SIZE = Number.parseInt(opt("--size", "50"), 10);
const OUT = path.resolve(opt("--out", ".work/dict/vi"));
const PREFIX = opt("--prefix", "daily");
const START = Number.parseInt(opt("--start", "1"), 10);
const MAX_SENSES = 6;
const MAX_GLOSSES = 4;

const KANJI_RE = /[\u4e00-\u9faf]/g;
const VALID_JP_RE = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff々ヶー]+$/;
const TECHNICAL_FIELDS = new Set([
  "biol", "bot", "zool", "ent", "fish", "ornith", "chem", "geol", "paleo", "anat", "min"
]);
const OBSOLETE_MISC = new Set(["obsc", "arch"]);
const NUMBER_KANJI = new Set(["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万"]);

async function main() {
  await connectMongo();
  console.log("[prepare-daily] Loading existing DictVi IDs...");
  const viIds = new Set(await DictVi.find({}, { _id: 1 }).distinct("_id"));
  console.log(`[prepare-daily] Found ${viIds.size} existing words in DictVi`);

  console.log("[prepare-daily] Loading kanji metadata...");
  const kanjiMap = new Map<string, { gr?: number; fq: number; l?: number }>();
  const allKanji = await DictKanji.find({}, { _id: 1, gr: 1, fq: 1, l: 1 }).lean();
  for (const k of allKanji) {
    kanjiMap.set(k._id, { gr: k.gr, fq: k.fq ?? 3000, l: k.l });
  }

  console.log("[prepare-daily] Scanning DictEntry...");
  const candidates: Array<{ doc: IDictEntry; score: number; form: string }> = [];

  const cursor = DictEntry.find({}, { k: 1, r: 1, s: 1, w: 1, c: 1, l: 1 }).lean().cursor();
  for await (const raw of cursor) {
    const doc = raw as unknown as IDictEntry;
    if (viIds.has(doc._id)) continue;

    const form = doc.k[0]?.t || doc.r[0]?.t || "";
    if (form.length < 2 || form.length > 5) continue;
    if (!VALID_JP_RE.test(form)) continue;

    // Filter senses
    const validSenses = doc.s.filter((s) => {
      if (s.m?.some((m) => OBSOLETE_MISC.has(m))) return false;
      if (s.f?.some((f) => TECHNICAL_FIELDS.has(f))) return false;
      if (s.g?.some((g) => /\([A-Z][a-z]+ [a-z]+\)/.test(g))) return false;
      return true;
    });
    if (validSenses.length === 0) continue;

    // Filter simple number + counter compounds (e.g. 六時, 五男)
    if (NUMBER_KANJI.has(form[0]!) && form.length <= 3 && /^[一二三四五六七八九十百千万]+[時分秒年月日時日月度人男女]$/.test(form)) {
      continue;
    }

    const kanjis = form.match(KANJI_RE) || [];
    let joyo = true;
    let kanjiScore = 0;
    if (kanjis.length > 0) {
      for (const k of kanjis) {
        const info = kanjiMap.get(k);
        if (!info || (!info.gr && !info.l && info.fq >= 3000)) {
          joyo = false;
          break;
        }
        const grPts = info.gr ? (info.gr <= 6 ? (7 - info.gr) * 10 + 40 : 30) : 10;
        const fqPts = Math.max(0, 100 - info.fq / 25);
        kanjiScore += grPts + fqPts;
      }
      if (!joyo) continue;
      kanjiScore /= kanjis.length;
    } else {
      // Kana-only
      kanjiScore = 60;
    }

    let bonus = 0;
    if (form.startsWith("お") || form.startsWith("ご")) bonus += 15;
    if (doc.k.length > 1) bonus += 5;
    if (doc.r.length > 1) bonus += 5;
    if (doc.s.length > 1) bonus += 5;
    if (form.length >= 2 && form.length <= 4) bonus += 10;

    candidates.push({
      doc,
      score: kanjiScore + bonus,
      form,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.doc._id - b.doc._id);
  const selected = candidates.slice(0, LIMIT);
  console.log(`[prepare-daily] Selected top ${selected.length} words from ${candidates.length} candidates`);

  fs.mkdirSync(path.join(OUT, "in"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "out"), { recursive: true });

  let batchCount = START - 1;
  for (let i = 0; i < selected.length; i += SIZE) {
    const batch = selected.slice(i, i + SIZE);
    const name = `${PREFIX}-${String(++batchCount).padStart(3, "0")}.jsonl`;
    const lines = batch.map(({ doc }) =>
      JSON.stringify({
        id: doc._id,
        forms: [...doc.k.map((k) => k.t), ...doc.r.map((r) => r.t)],
        senses: doc.s.slice(0, MAX_SENSES).map((s) => ({
          pos: s.p,
          en: s.g.slice(0, MAX_GLOSSES),
        })),
      }),
    );
    fs.writeFileSync(path.join(OUT, "in", name), lines.join("\n") + "\n");
  }

  console.log(`[prepare-daily] Wrote ${batchCount} batches of up to ${SIZE} words to ${path.join(OUT, "in")}/${PREFIX}-*.jsonl`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

