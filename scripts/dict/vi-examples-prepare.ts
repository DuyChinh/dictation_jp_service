/**
 * Cut the example sentences of the JLPT words into batches for translating into Vietnamese.
 *
 *   npx tsx scripts/dict/vi-examples-prepare.ts [--size 100] [--out .work/dict/vi] [--missing]
 *     --missing  only the sentences of words in dict_vi that have no Vietnamese yet (batches exm-NNN);
 *                each item also carries `k`, its position inside the sense
 *
 * Writes <out>/ex-in/ex-NNN.jsonl, one word per line:
 *   {"id":1358280,"forms":["食べる","たべる"],"ex":[{"sense":1,"ja":"…","en":"…"}, …]}
 * The translator answers each line in <out>/ex-out/<same name>:
 *   {"id":1358280,"vi":["…", …],"flags":[{"n":2,"why":"…"}]}
 * `vi` has one Vietnamese sentence per `ex` item, same order; `flags` (optional) lists sentences that
 * need a native check, `n` being the 1-based position in `ex`.
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, type IDictEntry, type IDictVi } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const SIZE = Number.parseInt(opt("--size", "100"), 10);
const OUT = path.resolve(opt("--out", ".work/dict/vi"));
const MISSING = args.includes("--missing");

async function main() {
  await connectMongo();
  const prefix = MISSING ? "exm" : "ex";
  let todo: IDictEntry[];
  const missingOf = new Map<number, Array<{ sense: number; k: number; ja: string; en: string }>>();
  if (MISSING) {
    const vi = new Map((await DictVi.find({}).lean<IDictVi[]>()).map((d) => [d._id, d]));
    const rows = await DictEntry.find({ "s.x.0": { $exists: true } }).lean<IDictEntry[]>();
    todo = rows.filter((e) => {
      const d = vi.get(e._id);
      if (!d) return false;
      const items: Array<{ sense: number; k: number; ja: string; en: string }> = [];
      e.s.forEach((s, si) => {
        if (d.hs?.includes(si)) return;
        (s.x ?? []).forEach((x, k) => {
          if (!d.x?.[si]?.[k] && !d.hx?.includes(`${si}:${k}`)) items.push({ sense: si + 1, k, ja: d.xj?.[si]?.[k] || x.ja, en: x.en });
        });
      });
      if (items.length) missingOf.set(e._id, items);
      return items.length > 0;
    });
  } else {
    const rows = await DictEntry.find({ l: { $exists: true }, "s.x.0": { $exists: true } }).lean<IDictEntry[]>();
    todo = rows;
  }
  todo.sort((a, b) => (b.l ?? 0) - (a.l ?? 0) || b.c - a.c || b.w - a.w || a._id - b._id);
  fs.mkdirSync(path.join(OUT, "ex-in"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "ex-out"), { recursive: true });
  let n = 0;
  let sentences = 0;
  for (let i = 0; i < todo.length; i += SIZE) {
    const name = `${prefix}-${String(++n).padStart(3, "0")}.jsonl`;
    const lines = todo.slice(i, i + SIZE).map((e) => {
      const ex = missingOf.get(e._id) ?? e.s.flatMap((s, si) => (s.x ?? []).map((x) => ({ sense: si + 1, ja: x.ja, en: x.en })));
      sentences += ex.length;
      return JSON.stringify({ id: e._id, forms: [...e.k.map((k) => k.t), ...e.r.map((r) => r.t)], ex });
    });
    fs.writeFileSync(path.join(OUT, "ex-in", name), lines.join("\n") + "\n");
  }
  console.log(`[vi] ${todo.length} words, ${sentences} sentences in ${n} batches → ${path.join(OUT, "ex-in")}`);
  await disconnectMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
