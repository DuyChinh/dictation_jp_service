/**
 * Prepare batches for bulk translation of the remaining 176,699 dictionary entries.
 *
 * Usage:
 *   node --import tsx scripts/dict/vi-prepare-bulk.ts [--phase 1|2|3|4|all] [--limit 5000] [--size 50] [--start 1] [--out .work/dict/vi]
 *
 * Phases:
 *   1 = joyo      Kanji Joyo compounds (~103k words), ranked by kanji frequency & word length
 *   2 = kana      Kana-only & Katakana loanwords (~37k words)
 *   3 = tech      Technical / scientific terms with field tags (~22k words)
 *   4 = rest      Rare words, archaic terms, biological Latin names (~14k words)
 *
 * Generates <out>/in/bulk-p<phase>-NNN.jsonl ready for translation.
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

const PHASE_ARG = opt("--phase", "1");
const LIMIT = Number.parseInt(opt("--limit", "0"), 10); // 0 = all
const SIZE = Number.parseInt(opt("--size", "50"), 10);
const START = Number.parseInt(opt("--start", "1"), 10);
const OUT = path.resolve(opt("--out", ".work/dict/vi"));
const PREFIX = opt("--prefix", "");
const MAX_SENSES = 6;
const MAX_GLOSSES = 4;

const KANJI_RE = /[\u4e00-\u9faf]/g;
const VALID_JP_RE = /^[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff々ヶー]+$/;
const TECHNICAL_FIELDS = new Set([
  "biol", "bot", "zool", "ent", "fish", "ornith", "chem", "geol", "paleo", "anat", "min", "comp", "med", "econ", "law", "ling", "sports", "math", "phys"
]);
const OBSOLETE_MISC = new Set(["obsc", "arch", "rare"]);
const NUMBER_KANJI = new Set(["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万"]);

type ScoredCandidate = {
  doc: IDictEntry;
  phase: number;
  score: number;
  form: string;
};

async function main() {
  await connectMongo();
  console.log("[prepare-bulk] Loading existing DictVi IDs...");
  const viIds = new Set(await DictVi.find({}, { _id: 1 }).distinct("_id"));
  console.log(`[prepare-bulk] Found ${viIds.size} existing words in DictVi`);

  console.log("[prepare-bulk] Loading kanji metadata...");
  const kanjiMap = new Map<string, { gr?: number; fq: number; l?: number }>();
  const allKanji = await DictKanji.find({}, { _id: 1, gr: 1, fq: 1, l: 1 }).lean();
  for (const k of allKanji) {
    kanjiMap.set(k._id, { gr: k.gr, fq: k.fq ?? 3000, l: k.l });
  }

  console.log("[prepare-bulk] Scanning remaining DictEntries...");
  const phase1: ScoredCandidate[] = [];
  const phase2: ScoredCandidate[] = [];
  const phase3: ScoredCandidate[] = [];
  const phase4: ScoredCandidate[] = [];

  const cursor = DictEntry.find({}, { k: 1, r: 1, s: 1, w: 1, c: 1, l: 1 }).lean().cursor();
  for await (const raw of cursor) {
    const doc = raw as unknown as IDictEntry;
    if (viIds.has(doc._id)) continue;

    const form = doc.k[0]?.t || doc.r[0]?.t || "";
    if (!form || !VALID_JP_RE.test(form)) {
      phase4.push({ doc, phase: 4, score: 0, form });
      continue;
    }

    const isTech = doc.s.some((s) => s.f && s.f.length > 0);
    const isObs = doc.s.some((s) => s.m && s.m.some((m) => OBSOLETE_MISC.has(m)));
    const isBio = doc.s.some((s) => s.g && s.g.some((g) => /\([A-Z][a-z]+ [a-z]+\)/.test(g)));
    const kanjis = form.match(KANJI_RE) || [];

    if (kanjis.length === 0) {
      // Kana-only / Katakana
      let score = 50;
      if (form.length >= 2 && form.length <= 5) score += 15;
      if (doc.s.length > 1) score += 5;
      phase2.push({ doc, phase: 2, score, form });
    } else if (isTech) {
      let score = 40;
      if (form.length >= 2 && form.length <= 4) score += 10;
      phase3.push({ doc, phase: 3, score, form });
    } else if (isObs || isBio) {
      phase4.push({ doc, phase: 4, score: 10, form });
    } else {
      // Check if Joyo
      let allJoyo = true;
      let kanjiScore = 0;
      for (const k of kanjis) {
        const info = kanjiMap.get(k);
        if (!info || (!info.gr && !info.l && (info.fq ?? 9999) > 3000)) {
          allJoyo = false;
          break;
        }
        const grPts = info.gr ? (info.gr <= 6 ? (7 - info.gr) * 10 + 40 : 30) : 10;
        const fqPts = Math.max(0, 100 - (info.fq ?? 3000) / 25);
        kanjiScore += grPts + fqPts;
      }
      if (allJoyo) {
        kanjiScore /= kanjis.length;
        let bonus = 0;
        if (form.startsWith("お") || form.startsWith("ご")) bonus += 15;
        if (form.length >= 2 && form.length <= 4) bonus += 20;
        else if (form.length === 5) bonus += 5;
        if (doc.k.length > 1) bonus += 5;
        if (doc.r.length > 1) bonus += 5;
        if (doc.s.length > 1) bonus += 5;
        // Penalize plain number counters
        if (NUMBER_KANJI.has(form[0]!) && form.length <= 3 && /^[一二三四五六七八九十百千万]+[時分秒年月日時日月度人男女]$/.test(form)) {
          bonus -= 40;
        }
        phase1.push({ doc, phase: 1, score: kanjiScore + bonus, form });
      } else {
        phase4.push({ doc, phase: 4, score: 20, form });
      }
    }
  }

  // Sort candidates by score descending
  phase1.sort((a, b) => b.score - a.score || a.doc._id - b.doc._id);
  phase2.sort((a, b) => b.score - a.score || a.doc._id - b.doc._id);
  phase3.sort((a, b) => b.score - a.score || a.doc._id - b.doc._id);
  phase4.sort((a, b) => b.score - a.score || a.doc._id - b.doc._id);

  console.log(`[prepare-bulk] Classification results:`);
  console.log(`  Phase 1 (Joyo Compounds):   ${phase1.length} words`);
  console.log(`  Phase 2 (Kana / Katakana):  ${phase2.length} words`);
  console.log(`  Phase 3 (Technical / Field): ${phase3.length} words`);
  console.log(`  Phase 4 (Rest / Rare / Bio): ${phase4.length} words`);
  console.log(`  Total remaining:            ${phase1.length + phase2.length + phase3.length + phase4.length} words`);

  fs.mkdirSync(path.join(OUT, "in"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "out"), { recursive: true });

  // Save catalog summary
  const catalog = {
    updatedAt: new Date().toISOString(),
    remaining: phase1.length + phase2.length + phase3.length + phase4.length,
    phases: {
      1: { name: "joyo-compounds", count: phase1.length, description: "Kanji Joyo compounds ranked by frequency" },
      2: { name: "kana-katakana", count: phase2.length, description: "Kana-only and Katakana loanwords" },
      3: { name: "technical", count: phase3.length, description: "Technical and scientific domain terms" },
      4: { name: "rare-rest", count: phase4.length, description: "Rare, archaic, and biological species terms" },
    },
  };
  fs.writeFileSync(path.join(OUT, "bulk-catalog.json"), JSON.stringify(catalog, null, 2));

  // Determine which phases to emit
  const targets: Array<{ pNum: number; pPrefix: string; items: ScoredCandidate[] }> = [];
  if (PHASE_ARG === "1" || PHASE_ARG === "all") targets.push({ pNum: 1, pPrefix: PREFIX || "bulk-p1", items: phase1 });
  if (PHASE_ARG === "2" || PHASE_ARG === "all") targets.push({ pNum: 2, pPrefix: PREFIX || "bulk-p2", items: phase2 });
  if (PHASE_ARG === "3" || PHASE_ARG === "all") targets.push({ pNum: 3, pPrefix: PREFIX || "bulk-p3", items: phase3 });
  if (PHASE_ARG === "4" || PHASE_ARG === "all") targets.push({ pNum: 4, pPrefix: PREFIX || "bulk-p4", items: phase4 });

  for (const target of targets) {
    let list = target.items;
    if (LIMIT > 0) list = list.slice(0, LIMIT);

    let batchCount = START - 1;
    for (let i = 0; i < list.length; i += SIZE) {
      const batch = list.slice(i, i + SIZE);
      const name = `${target.pPrefix}-${String(++batchCount).padStart(4, "0")}.jsonl`;
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
    console.log(`[prepare-bulk] Emitted Phase ${target.pNum} (${target.pPrefix}): ${list.length} words in ${batchCount - START + 1} batches (size ${SIZE}) to ${path.join(OUT, "in")}`);
  }

  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

