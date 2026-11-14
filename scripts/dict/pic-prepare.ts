/**
 * Cut words into batches for writing concrete picture-search phrases.
 *
 *   npx tsx scripts/dict/pic-prepare.ts [--tier jlpt|common] [--size 100] [--out .work/dict/pic]
 *
 * Writes <out>/in/<tier>-NNN.jsonl, one word per line:
 *   {"id":1358280,"forms":["食べる","たべる"],"pos":["v1","vt"],"en":["to eat","to live on (e.g. a salary)"]}
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictPic, type IDictEntry } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const TIER = opt("--tier", "jlpt");
const SIZE = Number.parseInt(opt("--size", "100"), 10);
const OUT = path.resolve(opt("--out", ".work/dict/pic"));

const GRAMMAR_POS = new Set(["prt", "cop", "aux", "aux-v", "aux-adj", "conj", "int"]);
const isGrammarSense = (s: { p: string[] }) => s.p.length > 0 && s.p.every((p) => GRAMMAR_POS.has(p));
const isAllGrammar = (e: IDictEntry) => e.s.length > 0 && e.s.every(isGrammarSense);

async function main() {
  await connectMongo();
  const filter =
    TIER === "jlpt"
      ? { l: { $exists: true } }
      : TIER === "common"
        ? { c: 1, l: { $exists: false } }
        : {};

  const rows = await DictEntry.find(filter).lean<IDictEntry[]>();
  const existing = new Set((await DictPic.find({}, { _id: 1 }).lean<Array<{ _id: number }>>()).map((d) => d._id));

  // Skip already written words and pure grammar words
  const todo = rows.filter((e) => !existing.has(e._id) && !isAllGrammar(e));

  // N5 first (l=5), down to N1 (l=1), then by weight desc
  todo.sort((a, b) => (b.l ?? 0) - (a.l ?? 0) || b.w - a.w || a._id - b._id);

  console.log(`[pic] ${TIER}: ${rows.length} total, ${todo.length} to write (${existing.size} already in dict_pic, ${rows.length - todo.length - existing.size} grammar-only skipped)`);

  fs.mkdirSync(path.join(OUT, "in"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "out"), { recursive: true });

  let n = 0;
  for (let i = 0; i < todo.length; i += SIZE) {
    const name = `${TIER}-${String(++n).padStart(3, "0")}.jsonl`;
    const lines = todo.slice(i, i + SIZE).map((e) =>
      JSON.stringify({
        id: e._id,
        forms: [...e.k.map((k) => k.t), ...e.r.map((r) => r.t)],
        pos: e.s[0]?.p ?? [],
        en: e.s.slice(0, 3).flatMap((s) => s.g.slice(0, 4)).slice(0, 6),
      }),
    );
    fs.writeFileSync(path.join(OUT, "in", name), lines.join("\n") + "\n");
  }

  console.log(`[pic] wrote ${n} batches of up to ${SIZE} to ${path.join(OUT, "in")}`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
