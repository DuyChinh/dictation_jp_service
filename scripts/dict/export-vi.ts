/**
 * Dump `dict_vi` (our Vietnamese meanings) to a JSONL file: the backup, and what gets loaded into
 * PostgreSQL when the dictionary moves off MongoDB.
 *
 *   npx tsx scripts/dict/export-vi.ts [--out .work/dict/vi/export]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictVi } from "../../src/models/Dict.js";

const i = process.argv.indexOf("--out");
const outDir = path.resolve(i >= 0 ? process.argv[i + 1]! : ".work/dict/vi/export");

async function main() {
  await connectMongo();
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `dict_vi-${new Date().toISOString().slice(0, 10)}.jsonl`);
  const out = fs.createWriteStream(file);
  let n = 0;
  for await (const d of DictVi.find({}).sort({ _id: 1 }).lean().cursor()) {
    out.write(JSON.stringify({
        id: d._id,
        vi: d.s,
        ...(d.x?.some((a) => a.length) ? { examples: d.x } : {}),
        ...(d.xj?.some((a) => a.some(Boolean)) ? { examplesJa: d.xj } : {}),
        ...(d.hs?.length ? { hiddenSenses: d.hs } : {}),
        ...(d.hx?.length ? { hiddenExamples: d.hx } : {}),
        src: d.src,
      }) + "\n");
    n++;
  }
  out.end();
  console.log(`[vi] exported ${n} words to ${file}`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
