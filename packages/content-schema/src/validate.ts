import fs from "node:fs";
import path from "node:path";
import {
  ListeningPackageSchema,
  type ListeningPackage,
  type Question,
} from "./schema.js";

export type ValidationSeverity = "ERROR" | "WARNING";

export type ValidationIssue = {
  severity: ValidationSeverity;
  file: string;
  questionId?: string;
  segmentId?: string;
  message: string;
};

export type ValidatePackageResult = {
  ok: boolean;
  package: ListeningPackage | null;
  issues: ValidationIssue[];
};

export type CatalogValidateResult = {
  ok: boolean;
  issues: ValidationIssue[];
  packages: ListeningPackage[];
};

function issue(
  severity: ValidationSeverity,
  file: string,
  message: string,
  extra?: Partial<ValidationIssue>,
): ValidationIssue {
  return { severity, file, message, ...extra };
}

function hasAnyExplanation(
  e?: { vi?: string; en?: string; ja?: string },
): boolean {
  return Boolean(e?.vi?.trim() || e?.en?.trim() || e?.ja?.trim());
}

export function validateListeningPackage(
  data: unknown,
  opts: { file: string; dir: string; requireAudio?: boolean },
): ValidatePackageResult {
  const issues: ValidationIssue[] = [];
  const file = opts.file;
  const requireAudio = opts.requireAudio ?? true;

  const parsed = ListeningPackageSchema.safeParse(data);
  if (!parsed.success) {
    for (const e of parsed.error.issues) {
      issues.push(
        issue(
          "ERROR",
          file,
          `schema: ${e.path.join(".") || "(root)"} — ${e.message}`,
        ),
      );
    }
    return { ok: false, package: null, issues };
  }

  const pkg = parsed.data;

  if (requireAudio) {
    const audioPath = path.join(opts.dir, pkg.audio.file);
    if (!fs.existsSync(audioPath)) {
      issues.push(
        issue("ERROR", file, `audio file missing: ${pkg.audio.file}`),
      );
    }
  }

  const speakerIds = new Set(pkg.speakers.map((s) => s.id));
  if (speakerIds.size !== pkg.speakers.length) {
    issues.push(issue("ERROR", file, "duplicate speaker ids"));
  }

  const sectionIds = new Set<string>();
  const questionIds = new Set<string>();
  const segmentIds = new Set<string>();

  for (const section of pkg.sections) {
    if (sectionIds.has(section.id)) {
      issues.push(issue("ERROR", file, `duplicate section id: ${section.id}`));
    }
    sectionIds.add(section.id);

    for (const q of section.questions) {
      if (questionIds.has(q.id)) {
        issues.push(
          issue("ERROR", file, `duplicate question id: ${q.id}`, {
            questionId: q.id,
          }),
        );
      }
      questionIds.add(q.id);
      validateQuestion(q, file, issues, speakerIds, segmentIds);
    }
  }

  const ok = !issues.some((i) => i.severity === "ERROR");
  return { ok, package: pkg, issues };
}

function validateQuestion(
  q: Question,
  file: string,
  issues: ValidationIssue[],
  speakerIds: Set<string>,
  segmentIds: Set<string>,
): void {
  const qid = q.id;

  if (q.audio.end_ms <= q.audio.start_ms) {
    issues.push(
      issue("ERROR", file, "question audio end_ms must be > start_ms", {
        questionId: qid,
      }),
    );
  }

  if (q.type === "listening_multiple_choice") {
    if (!q.prompt) {
      issues.push(
        issue("ERROR", file, "MC question requires prompt", {
          questionId: qid,
        }),
      );
    }
    if (q.choices == null) {
      issues.push(
        issue("WARNING", file, "MC question has no choices", {
          questionId: qid,
        }),
      );
    } else if (q.choices.length < 3) {
      issues.push(
        issue("ERROR", file, "MC question requires at least 3 choices", {
          questionId: qid,
        }),
      );
    } else {
      const correctCount = q.choices.filter((c) => c.correct).length;
      if (correctCount !== 1) {
        issues.push(
          issue(
            "ERROR",
            file,
            `exactly one correct choice required, found ${correctCount}`,
            { questionId: qid },
          ),
        );
      }
      for (const c of q.choices) {
        if (!hasAnyExplanation(c.explanation)) {
          issues.push(
            issue("ERROR", file, `choice ${c.id} missing explanation`, {
              questionId: qid,
            }),
          );
        }
        if (c.correct && !c.evidence_segment_ids?.length) {
          issues.push(
            issue(
              "WARNING",
              file,
              "correct choice has no evidence_segment_ids",
              { questionId: qid },
            ),
          );
        }
        if (q.choice_display_mode === "image" && !c.image?.url) {
          issues.push(
            issue(
              "WARNING",
              file,
              `image mode choice ${c.id} missing image.url`,
              { questionId: qid },
            ),
          );
        }
      }
    }
  }

  const localSeg = new Map<string, (typeof q.segments)[0]>();
  let prevStart = -1;
  let prevEnd = -1;

  const ordered = [...q.segments].sort((a, b) => a.order - b.order);
  for (const s of ordered) {
    if (segmentIds.has(s.id)) {
      issues.push(
        issue("ERROR", file, `duplicate segment id: ${s.id}`, {
          questionId: qid,
          segmentId: s.id,
        }),
      );
    }
    segmentIds.add(s.id);
    localSeg.set(s.id, s);

    if (!speakerIds.has(s.speaker_id)) {
      issues.push(
        issue("ERROR", file, `unknown speaker_id: ${s.speaker_id}`, {
          questionId: qid,
          segmentId: s.id,
        }),
      );
    }

    const start = s.start_ms;
    const end = s.end_ms;
    const hasTime =
      start != null && end != null && Number.isFinite(start) && Number.isFinite(end);

    if (s.timing_status === "verified") {
      if (!hasTime || (end as number) <= (start as number)) {
        issues.push(
          issue(
            "ERROR",
            file,
            "verified segment requires valid start_ms/end_ms",
            { questionId: qid, segmentId: s.id },
          ),
        );
      } else {
        const s0 = start as number;
        const s1 = end as number;
        if (s0 < q.audio.start_ms || s1 > q.audio.end_ms) {
          issues.push(
            issue(
              "ERROR",
              file,
              "segment timestamps outside question audio range",
              { questionId: qid, segmentId: s.id },
            ),
          );
        }
        if (s1 - s0 > 30_000) {
          issues.push(
            issue("WARNING", file, "segment duration > 30 seconds", {
              questionId: qid,
              segmentId: s.id,
            }),
          );
        }
        if (prevEnd >= 0 && s0 - prevEnd > 10_000) {
          issues.push(
            issue("WARNING", file, "segment gap > 10 seconds", {
              questionId: qid,
              segmentId: s.id,
            }),
          );
        }
        if (s0 < prevStart) {
          issues.push(
            issue("WARNING", file, "segments not chronological by start_ms", {
              questionId: qid,
              segmentId: s.id,
            }),
          );
        }
        prevStart = s0;
        prevEnd = s1;
      }
    } else {
      issues.push(
        issue("WARNING", file, "unverified segment timing", {
          questionId: qid,
          segmentId: s.id,
        }),
      );
    }
  }

  for (const c of q.choices ?? []) {
    for (const eid of c.evidence_segment_ids ?? []) {
      if (!localSeg.has(eid)) {
        issues.push(
          issue("ERROR", file, `evidence_segment_id "${eid}" does not exist`, {
            questionId: qid,
          }),
        );
      }
    }
  }

  for (const item of q.dictation?.modes?.fill_blank?.items ?? []) {
    if (!localSeg.has(item.segment_id)) {
      issues.push(
        issue(
          "ERROR",
          file,
          `fill_blank segment_id "${item.segment_id}" does not exist`,
          { questionId: qid },
        ),
      );
    }
  }

  const sentenceIds = q.dictation?.modes?.sentence_dictation?.segment_ids;
  if (sentenceIds) {
    for (const sid of sentenceIds) {
      if (!localSeg.has(sid)) {
        issues.push(
          issue(
            "ERROR",
            file,
            `sentence_dictation segment_id "${sid}" does not exist`,
            { questionId: qid },
          ),
        );
      }
    }
  }
}

export function formatIssue(i: ValidationIssue): string {
  const lines = [i.severity, `File: ${i.file}`];
  if (i.questionId) lines.push(`Question: ${i.questionId}`);
  if (i.segmentId) lines.push(`Segment: ${i.segmentId}`);
  lines.push(`Problem: ${i.message}`);
  return lines.join("\n");
}

export function validatePackageDir(
  dir: string,
  options?: { requireAudio?: boolean },
): ValidatePackageResult {
  const file = path.join(dir, "listening.json");
  if (!fs.existsSync(file)) {
    return {
      ok: false,
      package: null,
      issues: [issue("ERROR", file, "listening.json not found")],
    };
  }
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return {
      ok: false,
      package: null,
      issues: [
        issue("ERROR", file, `invalid JSON: ${(e as Error).message}`),
      ],
    };
  }
  return validateListeningPackage(data, {
    file,
    dir,
    requireAudio: options?.requireAudio,
  });
}

export function validateContentRoot(
  contentRoot: string,
  options?: { requireAudio?: boolean },
): CatalogValidateResult {
  const issues: ValidationIssue[] = [];
  const packages: ListeningPackage[] = [];
  const idSet = new Set<string>();

  if (!fs.existsSync(contentRoot)) {
    return {
      ok: false,
      issues: [issue("ERROR", contentRoot, "content root does not exist")],
      packages: [],
    };
  }

  for (const dir of findPackageDirs(contentRoot)) {
    if (dir.includes(`${path.sep}invalid-`)) continue;
    // only listen for listening.json packages; skip source-only dirs
    const result = validatePackageDir(dir, {
      requireAudio: options?.requireAudio,
    });
    issues.push(...result.issues);
    if (result.package) {
      if (idSet.has(result.package.id)) {
        issues.push(
          issue(
            "ERROR",
            path.join(dir, "listening.json"),
            `duplicate lesson id across content: ${result.package.id}`,
          ),
        );
      } else {
        idSet.add(result.package.id);
        packages.push(result.package);
      }
    }
  }

  return {
    ok: !issues.some((i) => i.severity === "ERROR"),
    issues,
    packages,
  };
}

function findPackageDirs(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === "listening.json")) {
      out.push(dir);
    }
    for (const e of entries) {
      if (e.isDirectory() && e.name !== "node_modules") {
        walk(path.join(dir, e.name));
      }
    }
  }
  walk(root);
  return out;
}
