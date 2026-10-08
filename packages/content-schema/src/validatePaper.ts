import type { AnswerKey, PaperPackage, PaperPart } from "./paper.js";
import type { ValidationIssue } from "./validate.js";

const MIN_EXPLANATION = 10;

function partOf(no: number, key: AnswerKey): PaperPart | null {
  for (const part of ["vocab", "grammar", "reading"] as const) {
    const r = key.parts[part];
    if (no >= r.from && no <= r.to) return part;
  }
  return null;
}

const MIN_CHUNK_COVERAGE = 0.7;
const MAX_ACCEPT_LENGTH = 40;

type Sentence = PaperPackage["passages"][number]["sentences"][number];

function checkChunks(
  s: Sentence,
  gap: (m: string) => void,
  error: (m: string) => void,
): void {
  if (s.chunks.length === 0) {
    gap(`sentence ${s.id} has no translation chunks`);
    return;
  }
  let covered = 0;
  for (const c of s.chunks) {
    if (!s.ja.includes(c.ja)) error(`sentence ${s.id}: chunk "${c.ja}" is not a substring of the sentence`);
    covered += c.ja.length;
    for (const a of c.accept_vi) {
      if (a.length > MAX_ACCEPT_LENGTH) error(`sentence ${s.id}: accept_vi "${a}" is too long — use short phrases`);
    }
  }
  if (covered / s.ja.length < MIN_CHUNK_COVERAGE) {
    gap(`sentence ${s.id}: chunks cover under ${MIN_CHUNK_COVERAGE * 100}% of the sentence`);
  }
}

/**
 * Semantic checks on a schema-valid paper.json. With an answer key the official answers are the
 * source of truth: every question must exist exactly once and its correct choice must match.
 * In `draft` some gaps are warnings; in `verified`/`published` they are errors.
 */
export function checkPaper(
  paper: PaperPackage,
  key?: AnswerKey,
  file = "paper.json",
): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const strict = paper.status !== "draft";
  const push = (severity: "ERROR" | "WARNING", message: string, questionId?: string) =>
    out.push({ severity, file, message, ...(questionId ? { questionId } : {}) });
  const error = (message: string, questionId?: string) => push("ERROR", message, questionId);
  const gap = (message: string, questionId?: string) =>
    push(strict ? "ERROR" : "WARNING", message, questionId);

  const passages = new Map<string, Set<string>>();
  for (const p of paper.passages) {
    if (passages.has(p.id)) error(`duplicate passage id ${p.id}`);
    const sentenceIds = new Set<string>();
    for (const s of p.sentences) {
      if (sentenceIds.has(s.id)) error(`duplicate sentence id ${s.id} in passage ${p.id}`);
      sentenceIds.add(s.id);
      if (!s.vi) gap(`sentence ${s.id} has no Vietnamese translation`);
      checkChunks(s, gap, error);
    }
    passages.set(p.id, sentenceIds);
    if (p.review?.flag) gap(`passage ${p.id} flagged for review: ${p.review.reason}`);
  }

  const ids = new Set<string>();
  const nos = new Set<number>();
  for (const item of paper.items) {
    const qid = item.id;
    if (ids.has(item.id)) error("duplicate item id", qid);
    ids.add(item.id);
    if (nos.has(item.no)) error(`duplicate question number ${item.no}`, qid);
    nos.add(item.no);

    const choiceIds = item.choices.map((c) => c.id).join("");
    if (choiceIds !== "1234") error(`choices must be ids 1,2,3,4 in order (got ${choiceIds})`, qid);

    const correct = item.choices.filter((c) => c.correct);
    if (correct.length !== 1) {
      error(`expected exactly 1 correct choice, found ${correct.length}`, qid);
    }

    for (const c of item.choices) {
      if (c.explanation_vi.trim().length < MIN_EXPLANATION) {
        error(`choice ${c.id} needs an explanation_vi (>= ${MIN_EXPLANATION} chars)`, qid);
      }
    }
    if (!item.summary_vi?.trim()) gap("missing summary_vi", qid);
    if (!item.stem.vi?.trim()) gap("missing stem.vi (translation)", qid);
    if (item.point_tags.length === 0) gap("missing point_tags", qid);
    if (item.review?.flag) gap(`flagged for review: ${item.review.reason}`, qid);

    if (item.sort && item.sort.star_index >= item.sort.slots.length) {
      error("sort.star_index is outside sort.slots", qid);
    }
    if (item.type === "sort_star" && !item.sort) error("type sort_star requires `sort`", qid);

    if (item.passage_id) {
      const sentences = passages.get(item.passage_id);
      if (!sentences) {
        error(`passage_id ${item.passage_id} not found`, qid);
      } else {
        for (const sid of item.evidence_sentence_ids) {
          if (!sentences.has(sid)) error(`evidence sentence ${sid} not in ${item.passage_id}`, qid);
        }
      }
    } else if (item.part === "reading") {
      error("reading item needs passage_id", qid);
    }
    if (item.part === "reading" && item.passage_id && item.evidence_sentence_ids.length === 0) {
      gap("reading item needs evidence_sentence_ids", qid);
    }

    if (key) {
      const expectedPart = partOf(item.no, key);
      if (!expectedPart) {
        error(`question number ${item.no} is not in the answer key`, qid);
        continue;
      }
      if (expectedPart !== item.part) {
        error(`question ${item.no} belongs to part ${expectedPart}, item says ${item.part}`, qid);
      }
      const official = key.answers[String(item.no)];
      const marked = correct[0]?.id;
      if (marked && official !== undefined && Number(marked) !== official) {
        error(`correct choice ${marked} contradicts the answer key (${official})`, qid);
      }
    }
  }

  if (key) {
    const missing = Object.keys(key.answers).map(Number).filter((no) => !nos.has(no));
    if (missing.length) error(`${missing.length} question(s) in the answer key but missing from paper.json: ${missing.join(", ")}`);
  }
  return out;
}
