/**
 * Cut the words still lacking a Vietnamese meaning into batches for translating.
 *
 *   npx tsx scripts/dict/vi-prepare.ts [--tier jlpt|common|rest-ex|gaps] [--size 100] [--out .work/dict/vi]
 *     rest-ex  words outside the JLPT / common lists that have example sentences
 *     gaps     translated words with a sense that has no Vietnamese yet (re-sent whole, up to 20 senses)
 *
 * Writes <out>/in/<tier>-NNN.jsonl, one word per line:
 *   {"id":1358280,"forms":["食べる","たべる"],"jlpt":5,"senses":[{"pos":["v1","vt"],"en":["to eat"]}]}
 * The translator answers each line in <out>/out/<same name> as {"id":…,"vi":[["ăn"],["sống bằng …"]]},
 * one array per sense in the same order. `import-vi.ts` checks and loads the answers.
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, type IDictEntry } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const TIER = opt("--tier", "jlpt");
const SIZE = Number.parseInt(opt("--size", "100"), 10);
const OUT = path.resolve(opt("--out", ".work/dict/vi"));
const MAX_SENSES = TIER === "gaps" ? 30 : 6;
const MAX_GLOSSES = 4;

async function main() {
  await connectMongo();
  const filter =
    TIER === "jlpt"
      ? { l: { $exists: true } }
      : TIER === "common"
        ? { c: 1, l: { $exists: false } }
        : TIER === "rest-ex"
          ? { c: { $ne: 1 }, l: { $exists: false }, "s.x.0": { $exists: true } }
          : {};
  const rows = await DictEntry.find(filter).lean<IDictEntry[]>();
  const existing = new Map((await DictVi.find({}, { s: 1, hs: 1, src: 1 }).lean<Array<{ _id: number; s: string[][]; hs?: number[]; src: string }>>()).map((d) => [d._id, d]));
  // gaps: a word we translated that still has a visible sense without Vietnamese
  const todo =
    TIER === "gaps"
      ? rows.filter((e) => {
          const d = existing.get(e._id);
          return !!d && d.src === "ai" && e.s.some((_, i) => !d.hs?.includes(i) && !(d.s[i]?.length));
        })
      : rows.filter((e) => !existing.has(e._id));
  // easiest levels first, then by importance, so the most-searched words are translated first
  todo.sort((a, b) => (b.l ?? 0) - (a.l ?? 0) || b.w - a.w || a._id - b._id);
  console.log(`[vi] ${TIER}: ${rows.length} words, ${todo.length} to translate`);

  fs.mkdirSync(path.join(OUT, "in"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "out"), { recursive: true });
  let n = 0;
  for (let i = 0; i < todo.length; i += SIZE) {
    const name = `${TIER}-${String(++n).padStart(3, "0")}.jsonl`;
    const lines = todo.slice(i, i + SIZE).map((e) =>
      JSON.stringify({
        id: e._id,
        forms: [...e.k.map((k) => k.t), ...e.r.map((r) => r.t)],
        ...(e.l ? { jlpt: e.l } : {}),
        senses: e.s.slice(0, MAX_SENSES).map((s) => ({ pos: s.p, en: s.g.slice(0, MAX_GLOSSES) })),
      }),
    );
    fs.writeFileSync(path.join(OUT, "in", name), lines.join("\n") + "\n");
  }
  console.log(`[vi] wrote ${n} batches of up to ${SIZE} to ${path.join(OUT, "in")}`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
