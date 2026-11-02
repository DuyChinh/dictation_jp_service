/**
 * Check translated batches and load them into `dict_vi`.
 *
 *   npx tsx scripts/dict/vi-import.ts --check <out/file.jsonl> …   validate only, touch nothing
 *   npx tsx scripts/dict/vi-import.ts --examples [--check <ex-out/file.jsonl> …]   same for the example-sentence batches (ex-in / ex-out);
 *       flagged sentences are collected in <src>/flags.jsonl, and those marked "hide" are kept off the site
 *   npx tsx scripts/dict/vi-import.ts [--src .work/dict/vi] [--only name-prefix]   validate and load every file in <src>/out
 *
 * A file is loaded only when it is complete and well-formed: every word of the matching <src>/in file
 * answered once, with one non-empty list of meanings per sense. Words whose meanings were reviewed or
 * written by hand (src "reviewed" / "manual") are never overwritten.
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi } from "../../src/models/Dict.js";
import { glossTokens } from "../../src/modules/dict/kana.js";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const SRC = path.resolve(opt("--src", ".work/dict/vi"));
const ONLY = opt("--only", "");
const EXAMPLES = args.includes("--examples");

type Input = { id: number; senses: Array<{ en: string[] }> };
type Answer = { id: number; vi: string[][] };

const readLines = (file: string) =>
  fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim());

/** Problems that make a file unusable (errors) and oddities worth a look (warnings). */
export function validate(inputFile: string, outFile: string): { answers: Answer[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inputs = new Map<number, Input>(readLines(inputFile).map((l) => JSON.parse(l) as Input).map((i) => [i.id, i]));
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
    if (!Array.isArray(a.vi) || a.vi.length !== input.senses.length) {
      return void errors.push(`id ${a.id}: needs ${input.senses.length} sense list(s), got ${Array.isArray(a.vi) ? a.vi.length : "none"}`);
    }
    a.vi.forEach((meanings, i) => {
      if (!Array.isArray(meanings) || !meanings.length) return void errors.push(`id ${a.id} sense ${i + 1}: empty`);
      for (const m of meanings) {
        if (typeof m !== "string" || !m.trim() || m.length > 100) errors.push(`id ${a.id} sense ${i + 1}: bad meaning ${JSON.stringify(m)}`);
        else if (input.senses[i]!.en.some((e) => e.toLowerCase() === m.trim().toLowerCase()) && /^[\x20-\x7e]+$/.test(m)) {
          warnings.push(`id ${a.id} sense ${i + 1}: "${m}" is still English`);
        }
      }
    });
    answers.push({ id: a.id, vi: a.vi.map((s) => s.map((m) => m.trim())) });
  });
  for (const id of inputs.keys()) if (!seen.has(id)) errors.push(`id ${id}: not answered`);
  return { answers, errors, warnings };
}

type ExInput = { id: number; ex: Array<{ sense: number; k?: number; ja: string; en: string }> };
type Flag = { n: number; kind: "check" | "hide"; why: string };
type ExAnswer = { id: number; vi: string[]; flags?: Flag[] };

export function validateExamples(inputFile: string, outFile: string): { answers: ExAnswer[]; inputs: Map<number, ExInput>; errors: string[] } {
  const errors: string[] = [];
  const inputs = new Map<number, ExInput>(readLines(inputFile).map((l) => JSON.parse(l) as ExInput).map((i) => [i.id, i]));
  const answers: ExAnswer[] = [];
  const seen = new Set<number>();
  readLines(outFile).forEach((line, n) => {
    let a: ExAnswer;
    try {
      a = JSON.parse(line) as ExAnswer;
    } catch {
      return void errors.push(`line ${n + 1}: not valid JSON`);
    }
    const input = inputs.get(a.id);
    if (!input) return void errors.push(`line ${n + 1}: id ${a.id} is not in the input`);
    if (seen.has(a.id)) return void errors.push(`id ${a.id}: answered twice`);
    seen.add(a.id);
    if (!Array.isArray(a.vi) || a.vi.length !== input.ex.length) {
      return void errors.push(`id ${a.id}: needs ${input.ex.length} sentence(s), got ${Array.isArray(a.vi) ? a.vi.length : "none"}`);
    }
    a.vi.forEach((v, i) => {
      if (typeof v !== "string" || !v.trim() || v.length > 400) errors.push(`id ${a.id} sentence ${i + 1}: bad translation ${JSON.stringify(v)}`);
      else if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(v)) errors.push(`id ${a.id} sentence ${i + 1}: still contains Japanese`);
    });
    for (const f of a.flags ?? []) {
      if (!Number.isInteger(f.n) || f.n < 1 || f.n > input.ex.length || (f.kind !== "check" && f.kind !== "hide") || !String(f.why ?? "").trim()) {
        errors.push(`id ${a.id}: bad flag ${JSON.stringify(f)}`);
      }
    }
    answers.push({ id: a.id, vi: a.vi.map((v) => v.trim()), flags: a.flags });
  });
  for (const id of inputs.keys()) if (!seen.has(id)) errors.push(`id ${id}: not answered`);
  return { answers, inputs, errors };
}

async function loadExamples() {
  const outDir = path.join(SRC, "ex-out");
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jsonl") && f.startsWith(ONLY)).sort();
  const flags: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: number; x: string[][]; hide: string[] }> = [];

  await connectMongo();
  const entries = await DictEntry.find({}, { s: 1, k: 1, r: 1 }).lean<Array<{ _id: number; s: Array<{ x?: unknown[] }>; k: Array<{ t: string }>; r: Array<{ t: string }> }>>();
  const byId = new Map(entries.map((e) => [e._id, e]));
  // what is stored already, so a pass that covers only some sentences adds to it instead of replacing it
  const stored = new Map((await DictVi.find({}, { x: 1, hx: 1 }).lean<Array<{ _id: number; x?: string[][]; hx?: string[] }>>()).map((d) => [d._id, d]));
  for (const f of files) {
    const { answers, inputs, errors } = validateExamples(path.join(SRC, "ex-in", f), path.join(outDir, f));
    if (errors.length) {
      console.log(`[vi] skip ${f}: ${errors.length} error(s), first: ${errors[0]}`);
      continue;
    }
    for (const a of answers) {
      const entry = byId.get(a.id);
      const input = inputs.get(a.id)!;
      if (!entry) continue;
      // lay the flat answer back onto the entry's senses: x[sense][example]
      const before = stored.get(a.id);
      const x: string[][] = entry.s.map((s, si) => (s.x ?? []).map((_, k) => before?.x?.[si]?.[k] ?? ""));
      const hide: string[] = [...(before?.hx ?? [])];
      const seenInSense = new Map<number, number>();
      // an item's position inside its sense: given (`k`) when only some sentences were sent, else by order
      const positions = input.ex.map((e) => {
        const si = e.sense - 1;
        const k = e.k ?? seenInSense.get(si) ?? 0;
        seenInSense.set(si, (e.k ?? seenInSense.get(si) ?? 0) + 1);
        return { si, k };
      });
      positions.forEach(({ si, k }, i) => {
        if (x[si]) x[si]![k] = a.vi[i]!;
      });
      for (const fl of a.flags ?? []) {
        const e = input.ex[fl.n - 1]!;
        const { si, k } = positions[fl.n - 1]!;
        if (fl.kind === "hide" && !hide.includes(`${si}:${k}`)) hide.push(`${si}:${k}`);
        flags.push({ id: a.id, forms: [...entry.k.map((k2) => k2.t), ...entry.r.map((r) => r.t)].slice(0, 4), sense: e.sense, ja: e.ja, en: e.en, vi: a.vi[fl.n - 1], kind: fl.kind, why: fl.why });
      }
      updates.push({ id: a.id, x, hide });
    }
  }

  for (let i = 0; i < updates.length; i += 1000) {
    await DictVi.bulkWrite(
      updates.slice(i, i + 1000).map((u) => ({ updateOne: { filter: { _id: u.id }, update: { $set: { x: u.x, hx: u.hide } } } })),
      { ordered: false },
    );
  }
  fs.writeFileSync(path.join(SRC, ONLY ? `flags-${ONLY}.jsonl` : "flags.jsonl"), flags.map((f) => JSON.stringify(f)).join("\n") + (flags.length ? "\n" : ""));
  console.log(`[vi] loaded examples for ${updates.length} words from ${files.length} file(s); ${flags.length} flagged (${flags.filter((f) => f.kind === "hide").length} hidden) → ${path.join(SRC, ONLY ? `flags-${ONLY}.jsonl` : "flags.jsonl")}`);
  await disconnectMongo();
}

async function main() {
  if (EXAMPLES) {
    if (CHECK) {
      let bad = 0;
      for (const out of args.filter((a) => a.endsWith(".jsonl"))) {
        const input = path.join(path.dirname(path.dirname(path.resolve(out))), "ex-in", path.basename(out));
        const { errors, answers } = validateExamples(input, path.resolve(out));
        const flagged = answers.reduce((n, a) => n + (a.flags?.length ?? 0), 0);
        console.log(`${path.basename(out)}: ${errors.length} error(s), ${flagged} flagged sentence(s)`);
        errors.slice(0, 30).forEach((e) => console.log(`  ERROR ${e}`));
        bad += errors.length;
      }
      process.exit(bad ? 1 : 0);
    }
    return loadExamples();
  }
  if (CHECK) {
    let bad = 0;
    for (const out of args.filter((a) => a.endsWith(".jsonl"))) {
      const input = path.join(path.dirname(path.dirname(path.resolve(out))), "in", path.basename(out));
      const { errors, warnings } = validate(input, path.resolve(out));
      console.log(`${path.basename(out)}: ${errors.length} error(s), ${warnings.length} warning(s)`);
      errors.slice(0, 30).forEach((e) => console.log(`  ERROR ${e}`));
      warnings.slice(0, 15).forEach((w) => console.log(`  warn  ${w}`));
      bad += errors.length;
    }
    process.exit(bad ? 1 : 0);
  }

  const outDir = path.join(SRC, "out");
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".jsonl") && f.startsWith(ONLY)).sort();
  const docs: Array<{ _id: number; s: string[][]; t: string[]; src: "ai" }> = [];
  for (const f of files) {
    const { answers, errors, warnings } = validate(path.join(SRC, "in", f), path.join(outDir, f));
    if (errors.length) {
      console.log(`[vi] skip ${f}: ${errors.length} error(s), first: ${errors[0]}`);
      continue;
    }
    if (warnings.length) console.log(`[vi] ${f}: ${warnings.length} warning(s), first: ${warnings[0]}`);
    for (const a of answers) docs.push({ _id: a.id, s: a.vi, t: [...new Set(a.vi.flat().flatMap(glossTokens))], src: "ai" });
  }

  await connectMongo();
  const protectedIds = new Set(
    (await DictVi.find({ src: { $ne: "ai" }, _id: { $in: docs.map((d) => d._id) } }, { _id: 1 }).lean<Array<{ _id: number }>>()).map((d) => d._id),
  );
  const toWrite = docs.filter((d) => !protectedIds.has(d._id));
  for (let i = 0; i < toWrite.length; i += 1000) {
    await DictVi.bulkWrite(
      toWrite.slice(i, i + 1000).map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true } })),
      { ordered: false },
    );
  }
  await DictVi.createIndexes();
  console.log(`[vi] loaded ${toWrite.length} words from ${files.length} file(s) (${protectedIds.size} kept as reviewed/manual)`);
  console.log(`[vi] dict_vi now holds ${await DictVi.countDocuments()} words`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
