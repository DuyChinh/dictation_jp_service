import type {
  ListeningPackage,
  PaperPackage,
  Question,
  Segment,
} from "@jd/content-schema";
import {
  PaperPackageSchema,
  checkPaper,
  validatePackageDir,
  type ContentStatus,
} from "@jd/content-schema";
import fs from "node:fs";
import path from "node:path";

export type LessonMeta = {
  package: ListeningPackage;
  dir: string;
  audioPath: string;
  /** The written part (文字・語彙 / 文法 / 読解) when the folder has a valid paper.json. */
  paper?: PaperPackage;
};

export type LessonFilter = {
  level?: string;
  year?: number;
  month?: number;
  statuses?: readonly ContentStatus[];
  /** Lessons an admin hid are left out unless this is set. */
  includeHidden?: boolean;
};

/** A lesson folder that could not be loaded, and why. */
export type ContentProblem = {
  /** Folder relative to the content root. */
  dir: string;
  messages: string[];
};

export class StaticContentRepository {
  private byId = new Map<string, LessonMeta>();
  private hidden = new Set<string>();
  private lastProblems: ContentProblem[] = [];
  private contentRoot: string;

  constructor(contentRoot: string) {
    this.contentRoot = contentRoot;
  }

  private relative(dir: string): string {
    return path.relative(this.contentRoot, dir).split(path.sep).join("/");
  }

  load(): { loaded: number; errors: string[] } {
    this.byId.clear();
    this.lastProblems = [];
    const errors: string[] = [];
    if (!fs.existsSync(this.contentRoot)) {
      errors.push(`content root missing: ${this.contentRoot}`);
      return { loaded: 0, errors };
    }

    const { packages, audioOnly } = findPackageDirs(this.contentRoot);
    for (const dir of audioOnly) {
      this.lastProblems.push({ dir: this.relative(dir), messages: ["listening.json missing (audio only)"] });
    }

    for (const dir of packages) {
      // Skip known invalid test fixtures from catalog
      if (dir.includes(`${path.sep}invalid-`)) continue;

      const result = validatePackageDir(dir);
      if (!result.ok || !result.package) {
        const messages: string[] = [];
        for (const i of result.issues.filter((x) => x.severity === "ERROR")) {
          errors.push(`${i.file}: ${i.message}`);
          messages.push(i.message);
        }
        this.lastProblems.push({ dir: this.relative(dir), messages });
        continue;
      }
      const pkg = result.package;
      if (this.byId.has(pkg.id)) {
        errors.push(`duplicate lesson id: ${pkg.id}`);
        this.lastProblems.push({ dir: this.relative(dir), messages: [`duplicate lesson id: ${pkg.id}`] });
        continue;
      }
      const paper = this.loadPaper(dir, pkg.id, errors);
      this.byId.set(pkg.id, {
        package: pkg,
        dir,
        audioPath: path.join(dir, pkg.audio.file),
        ...(paper ? { paper } : {}),
      });
    }
    return { loaded: this.byId.size, errors };
  }

  /**
   * paper.json is optional and never blocks the listening lesson: a broken one is reported in
   * `problems()` and the lesson simply has no written part.
   */
  private loadPaper(dir: string, lessonId: string, errors: string[]): PaperPackage | null {
    const file = path.join(dir, "paper.json");
    if (!fs.existsSync(file)) return null;
    const fail = (messages: string[]) => {
      for (const m of messages) errors.push(`${this.relative(file)}: ${m}`);
      this.lastProblems.push({ dir: this.relative(dir), messages: messages.map((m) => `paper.json: ${m}`) });
      return null;
    };
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return fail([`invalid JSON: ${(e as Error).message}`]);
    }
    const parsed = PaperPackageSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`));
    }
    if (parsed.data.lesson_id !== lessonId) {
      return fail([`lesson_id ${parsed.data.lesson_id} does not match ${lessonId}`]);
    }
    const blocking = checkPaper(parsed.data).filter((i) => i.severity === "ERROR");
    if (blocking.length) return fail(blocking.slice(0, 5).map((i) => i.message));
    return parsed.data;
  }

  /** The written part of a lesson, only if its status is one the caller may serve. */
  getPaper(lessonId: string, statuses: readonly ContentStatus[]): PaperPackage | null {
    const paper = this.byId.get(lessonId)?.paper;
    return paper && statuses.includes(paper.status) ? paper : null;
  }

  /** Folders the last load skipped. */
  problems(): ContentProblem[] {
    return this.lastProblems;
  }

  /** Every loaded lesson, whatever its status or visibility. */
  all(): LessonMeta[] {
    return [...this.byId.values()];
  }

  isHidden(lessonId: string): boolean {
    return this.hidden.has(lessonId);
  }

  setHidden(lessonIds: Iterable<string>, hidden: boolean): void {
    for (const id of lessonIds) {
      if (hidden) this.hidden.add(id);
      else this.hidden.delete(id);
    }
  }

  list(filter: LessonFilter = {}): LessonMeta[] {
    const statuses = filter.statuses ?? ["published"];
    return [...this.byId.values()].filter((m) => {
      const p = m.package;
      if (!filter.includeHidden && this.hidden.has(p.id)) return false;
      if (!statuses.includes(p.status)) return false;
      if (filter.level) {
        const level = p.source.type === "jlpt" || p.source.type === "practice" ? p.source.level : null;
        if (level !== filter.level) return false;
      }
      if (filter.year != null && p.source.type === "jlpt") {
        if (p.source.year !== filter.year) return false;
      }
      if (filter.month != null && p.source.type === "jlpt") {
        if (p.source.month !== filter.month) return false;
      }
      return true;
    });
  }

  get(lessonId: string): LessonMeta | null {
    return this.byId.get(lessonId) ?? null;
  }

  getQuestion(
    lessonId: string,
    questionId: string,
  ): { meta: LessonMeta; sectionId: string; question: Question } | null {
    const meta = this.get(lessonId);
    if (!meta) return null;
    for (const section of meta.package.sections) {
      const q = section.questions.find((x) => x.id === questionId);
      if (q) return { meta, sectionId: section.id, question: q };
    }
    return null;
  }

  getSegment(
    lessonId: string,
    segmentId: string,
  ): { question: Question; segment: Segment } | null {
    const meta = this.get(lessonId);
    if (!meta) return null;
    for (const section of meta.package.sections) {
      for (const q of section.questions) {
        const s = q.segments.find((x) => x.id === segmentId);
        if (s) return { question: q, segment: s };
      }
    }
    return null;
  }
}

/** Folders holding a listening.json, and folders with audio but no listening.json. */
function findPackageDirs(root: string): { packages: string[]; audioOnly: string[] } {
  const packages: string[] = [];
  const audioOnly: string[] = [];
  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === "listening.json")) {
      packages.push(dir);
    } else if (entries.some((e) => e.isFile() && e.name.endsWith(".mp3"))) {
      audioOnly.push(dir);
    }
    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
    }
  }
  walk(root);
  return { packages, audioOnly };
}
