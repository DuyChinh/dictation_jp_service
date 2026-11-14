/**
 * Check picture search phrase batches and load them into `dict_pic`.
 *
 *   npx tsx scripts/dict/pic-import.ts --check <out/file.jsonl> ...
 *   npx tsx scripts/dict/pic-import.ts [--src .work/dict/pic] [--only name-prefix]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictPic } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const SRC = path.resolve(opt("--src", ".work/dict/pic"));
const ONLY = opt("--only", "");

type Input = { id: number; forms: string[]; pos: string[]; en: string[] };
type Answer = { id: number; q: string[] };

const OFFENSIVE_WORDS = new Set([
  "naked",
  "nude",
  "sex",
  "blood",
  "gun",
  "kill",
  "dead",
  "corpse",
  "drug",
  "logo",
]);

const readLines = (file: string) =>
  fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());

export function normalizePhrase(raw: string): string {
  return raw
    .normalize("NFC")
    .toLowerCase()
    .replace(/["'“”‘’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validate(inputFile: string, outFile: string): {
  answers: Answer[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inputs = new Map<number, Input>(
    readLines(inputFile).map((l) => JSON.parse(l) as Input).map((i) => [i.id, i]),
  );
  const answers: Answer[] = [];
  const seen = new Set<number>();

  readLines(outFile).forEach((line, n) => {
    let a: Answer;
    try {
      a = JSON.parse(line) as Answer;
    } catch {
      errors.push(`line ${n + 1}: not valid JSON`);
      return;
    }
    const input = inputs.get(a.id);
    if (!input) return void errors.push(`line ${n + 1}: id ${a.id} is not in the input`);
    if (seen.has(a.id)) return void errors.push(`id ${a.id}: answered twice`);
    seen.add(a.id);

    if (!Array.isArray(a.q)) {
      return void errors.push(`id ${a.id}: "q" must be an array`);
    }
    if (a.q.length > 3) {
      errors.push(`id ${a.id}: "q" has ${a.q.length} items (max 3 allowed)`);
    }

    if (a.q.length === 1) {
      warnings.push(`id ${a.id}: only 1 phrase provided (expected 2-3 or 0)`);
    }

    const normalizedPhrases: string[] = [];
    const seenPhrase = new Set<string>();

    for (const raw of a.q) {
      if (typeof raw !== "string") {
        errors.push(`id ${a.id}: phrase must be a string, got ${JSON.stringify(raw)}`);
        continue;
      }
      if (/\d/.test(raw)) {
        errors.push(`id ${a.id}: phrase contains digits: ${JSON.stringify(raw)}`);
      }
      if (/["'“”‘’`]/.test(raw)) {
        errors.push(`id ${a.id}: phrase contains quotes: ${JSON.stringify(raw)}`);
      }
      if (/[^a-zA-Z\s-]/.test(raw)) {
        errors.push(`id ${a.id}: phrase contains non-ASCII letters/symbols: ${JSON.stringify(raw)}`);
      }

      const norm = normalizePhrase(raw);
      if (!norm) {
        errors.push(`id ${a.id}: empty phrase`);
        continue;
      }
      if (norm.length > 60) {
        errors.push(`id ${a.id}: phrase exceeds 60 chars (${norm.length}): "${norm}"`);
      }
      const wordCount = norm.split(/\s+/).length;
      if (wordCount > 6) {
        errors.push(`id ${a.id}: phrase has ${wordCount} words (max 6): "${norm}"`);
      }

      // Check against English glosses
      if (input.en.some((e) => normalizePhrase(e) === norm)) {
        warnings.push(`id ${a.id}: phrase "${norm}" is identical to English gloss`);
      }

      // Check offensive words
      const words = norm.split(/[\s-]+/);
      for (const w of words) {
        if (OFFENSIVE_WORDS.has(w)) {
          warnings.push(`id ${a.id}: phrase "${norm}" contains sensitive word "${w}"`);
        }
      }

      if (!seenPhrase.has(norm)) {
        seenPhrase.add(norm);
        normalizedPhrases.push(norm);
      }
    }

    answers.push({ id: a.id, q: normalizedPhrases });
  });

  for (const id of inputs.keys()) {
    if (!seen.has(id)) errors.push(`id ${id}: not answered`);
  }

  return { answers, errors, warnings };
}

async function main() {
  if (CHECK) {
    let bad = 0;
    const targets = args.filter((a) => a.endsWith(".jsonl"));
    if (!targets.length) {
      console.error("No jsonl files specified to check.");
      process.exit(1);
    }
    for (const out of targets) {
      const base = path.basename(out);
      const input = path.join(path.dirname(path.dirname(path.resolve(out))), "in", base);
      if (!fs.existsSync(input)) {
        console.error(`Input file not found: ${input}`);
        bad++;
        continue;
      }
      const { errors, warnings } = validate(input, path.resolve(out));
      console.log(`${base}: ${errors.length} error(s), ${warnings.length} warning(s)`);
      errors.slice(0, 30).forEach((e) => console.log(`  ERROR ${e}`));
      warnings.slice(0, 15).forEach((w) => console.log(`  warn  ${w}`));
      bad += errors.length;
    }
    process.exit(bad ? 1 : 0);
  }

  const outDir = path.join(SRC, "out");
  if (!fs.existsSync(outDir)) {
    console.error(`Output directory does not exist: ${outDir}`);
    process.exit(1);
  }
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jsonl") && f.startsWith(ONLY)).sort();
  if (!files.length) {
    console.log(`No files to load in ${outDir} matching prefix "${ONLY}".`);
    process.exit(0);
  }

  const docs: Array<{ _id: number; q: string[]; src: "ai" }> = [];
  for (const f of files) {
    const inputFile = path.join(SRC, "in", f);
    const outFile = path.join(outDir, f);
    if (!fs.existsSync(inputFile)) {
      console.log(`[pic] skip ${f}: no matching input file in ${path.join(SRC, "in")}`);
      continue;
    }
    const { answers, errors, warnings } = validate(inputFile, outFile);
    if (errors.length) {
      console.log(`[pic] skip ${f}: ${errors.length} error(s), first: ${errors[0]}`);
      continue;
    }
    if (warnings.length) console.log(`[pic] ${f}: ${warnings.length} warning(s), first: ${warnings[0]}`);
    for (const a of answers) {
      docs.push({ _id: a.id, q: a.q, src: "ai" });
    }
  }

  await connectMongo();
  const protectedIds = new Set(
    (
      await DictPic.find({ src: "manual", _id: { $in: docs.map((d) => d._id) } }, { _id: 1 }).lean<
        Array<{ _id: number }>
      >()
    ).map((d) => d._id),
  );
  const toWrite = docs.filter((d) => !protectedIds.has(d._id));

  for (let i = 0; i < toWrite.length; i += 1000) {
    await DictPic.bulkWrite(
      toWrite.slice(i, i + 1000).map((d) => ({
        updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true },
      })),
      { ordered: false },
    );
  }
  await DictPic.createIndexes();
  console.log(`[pic] loaded ${toWrite.length} words from ${files.length} file(s) (${protectedIds.size} kept as manual)`);
  console.log(`[pic] dict_pic now holds ${await DictPic.countDocuments()} words`);
  await disconnectMongo();
}

const isDirectRun = process.argv[1] && (process.argv[1].endsWith("pic-import.ts") || process.argv[1].endsWith("pic-import.js"));

if (isDirectRun) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
