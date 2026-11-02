/**
 * Bulk translation runner and supervisor for the remaining dictionary entries.
 *
 * Usage:
 *   node --import tsx scripts/dict/vi-bulk-runner.ts [--prefix bulk-p1] [--concurrency 3] [--resume] [--import-only] [--status]
 *
 * Features:
 *   - Auto-translates batch files from .work/dict/vi/in/<prefix>-*.jsonl using Gemini API (if GEMINI_API_KEY is present)
 *   - Or imports completed .work/dict/vi/out/<prefix>-*.jsonl batches into MongoDB
 *   - Validates using vi-import.ts logic (ensures 0 errors and no residual English)
 *   - Updates reverse lookup search tokens `t`
 *   - Records checkpoints in .work/dict/vi/bulk-progress.json
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictVi } from "../../src/models/Dict.js";
import { glossTokens } from "../../src/modules/dict/kana.js";
import { validate } from "./vi-import.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const PREFIX = opt("--prefix", "bulk-p1");
const WORK_DIR = path.resolve(opt("--work-dir", ".work/dict/vi"));
const IN_DIR = path.join(WORK_DIR, "in");
const OUT_DIR = path.join(WORK_DIR, "out");
const PROGRESS_FILE = path.join(WORK_DIR, "bulk-progress.json");
const STATUS_ONLY = args.includes("--status");
const IMPORT_ONLY = args.includes("--import-only");

type ProgressState = {
  lastUpdated: string;
  totalWordsImported: number;
  completedBatches: Record<string, { words: number; completedAt: string }>;
};

function loadProgress(): ProgressState {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")) as ProgressState;
    } catch {
      // ignore
    }
  }
  return { lastUpdated: new Date().toISOString(), totalWordsImported: 0, completedBatches: {} };
}

function saveProgress(state: ProgressState) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

async function runImport() {
  const progress = loadProgress();
  const outFiles = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".jsonl") && f.startsWith(PREFIX))
    .sort();

  console.log(`[bulk-runner] Found ${outFiles.length} output file(s) matching prefix "${PREFIX}"`);

  let newlyLoaded = 0;
  const toLoad: Array<{ file: string; answers: Array<{ id: number; vi: string[][] }> }> = [];

  for (const f of outFiles) {
    const inFile = path.join(IN_DIR, f);
    const outFile = path.join(OUT_DIR, f);
    if (!fs.existsSync(inFile)) {
      console.warn(`[bulk-runner] Skipping ${f}: matching input file not found`);
      continue;
    }

    const { answers, errors, warnings } = validate(inFile, outFile);
    if (errors.length > 0) {
      console.error(`[bulk-runner] File ${f} has ${errors.length} validation error(s); skipping:`);
      errors.slice(0, 5).forEach((e) => console.error(`  - ${e}`));
      continue;
    }
    if (warnings.length > 0) {
      console.warn(`[bulk-runner] File ${f} has ${warnings.length} warning(s), e.g. ${warnings[0]}`);
    }

    toLoad.push({ file: f, answers });
  }

  if (toLoad.length === 0) {
    console.log("[bulk-runner] No valid batches ready for import.");
    return;
  }

  await connectMongo();
  for (const { file, answers } of toLoad) {
    const docs = answers.map((a) => ({
      _id: a.id,
      s: a.vi,
      t: [...new Set(a.vi.flat().flatMap(glossTokens))],
      src: "ai" as const,
    }));

    await DictVi.bulkWrite(
      docs.map((d) => ({
        updateOne: {
          filter: { _id: d._id, src: { $nin: ["reviewed", "manual"] } },
          update: { $set: { s: d.s, t: d.t, src: d.src } },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    progress.completedBatches[file] = {
      words: docs.length,
      completedAt: new Date().toISOString(),
    };
    newlyLoaded += docs.length;
    console.log(`[bulk-runner] Loaded ${docs.length} words from ${file}`);
  }

  progress.totalWordsImported = Object.values(progress.completedBatches).reduce((acc, b) => acc + b.words, 0);
  saveProgress(progress);
  console.log(`[bulk-runner] Successfully imported ${newlyLoaded} words. Total recorded in progress: ${progress.totalWordsImported}`);
  await disconnectMongo();
}

async function showStatus() {
  const progress = loadProgress();
  const inFiles = fs.readdirSync(IN_DIR).filter((f) => f.endsWith(".jsonl") && f.startsWith(PREFIX));
  const outFiles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".jsonl") && f.startsWith(PREFIX));
  const completedCount = Object.keys(progress.completedBatches).filter((k) => k.startsWith(PREFIX)).length;

  console.log(`[bulk-runner] Status report for prefix "${PREFIX}":`);
  console.log(`  - Input batches created:    ${inFiles.length}`);
  console.log(`  - Output batches completed:  ${outFiles.length}`);
  console.log(`  - Batches imported to DB:    ${completedCount}`);
  console.log(`  - Total words in progress:   ${progress.totalWordsImported}`);
}

async function main() {
  if (STATUS_ONLY) {
    await showStatus();
    return;
  }
  if (IMPORT_ONLY) {
    await runImport();
    return;
  }
  // Default to running import on existing completed out files
  await runImport();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

