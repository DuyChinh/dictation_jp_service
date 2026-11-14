/**
 * Dump `dict_pic` to a JSONL file: backup.
 *
 *   npx tsx scripts/dict/export-pic.ts [--out .work/dict/pic/export]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictPic } from "../../src/models/Dict.js";

const i = process.argv.indexOf("--out");
const outDir = path.resolve(i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : ".work/dict/pic/export");

async function main() {
  await connectMongo();
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `dict_pic-${new Date().toISOString().slice(0, 10)}.jsonl`);
  const out = fs.createWriteStream(file);
  let n = 0;
  for await (const d of DictPic.find({}).sort({ _id: 1 }).lean().cursor()) {
    out.write(
      JSON.stringify({
        id: d._id,
        q: d.q,
        src: d.src,
      }) + "\n",
    );
    n++;
  }
  out.end();
  console.log(`[pic] exported ${n} words to ${file}`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
