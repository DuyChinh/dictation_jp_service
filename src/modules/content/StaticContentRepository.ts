import type {
  ListeningPackage,
  Question,
  Segment,
} from "@jd/content-schema";
import {
  validatePackageDir,
  type ContentStatus,
} from "@jd/content-schema";
import fs from "node:fs";
import path from "node:path";

export type LessonMeta = {
  package: ListeningPackage;
  dir: string;
  audioPath: string;
};

export type LessonFilter = {
  level?: string;
  year?: number;
  month?: number;
  statuses?: readonly ContentStatus[];
};

export class StaticContentRepository {
  private byId = new Map<string, LessonMeta>();
  private contentRoot: string;

  constructor(contentRoot: string) {
    this.contentRoot = contentRoot;
  }

  load(): { loaded: number; errors: string[] } {
    this.byId.clear();
    const errors: string[] = [];
    if (!fs.existsSync(this.contentRoot)) {
      errors.push(`content root missing: ${this.contentRoot}`);
      return { loaded: 0, errors };
    }

    for (const dir of findPackageDirs(this.contentRoot)) {
      // Skip known invalid test fixtures from catalog
      if (dir.includes(`${path.sep}invalid-`)) continue;

      const result = validatePackageDir(dir);
      if (!result.ok || !result.package) {
        for (const i of result.issues.filter((x) => x.severity === "ERROR")) {
          errors.push(`${i.file}: ${i.message}`);
        }
        continue;
      }
      const pkg = result.package;
      if (this.byId.has(pkg.id)) {
        errors.push(`duplicate lesson id: ${pkg.id}`);
        continue;
      }
      this.byId.set(pkg.id, {
        package: pkg,
        dir,
        audioPath: path.join(dir, pkg.audio.file),
      });
    }
    return { loaded: this.byId.size, errors };
  }

  list(filter: LessonFilter = {}): LessonMeta[] {
    const statuses = filter.statuses ?? ["published"];
    return [...this.byId.values()].filter((m) => {
      const p = m.package;
      if (!statuses.includes(p.status)) return false;
      if (filter.level && p.source.type === "jlpt") {
        if (p.source.level !== filter.level) return false;
      } else if (filter.level && p.source.type !== "jlpt") {
        return false;
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
      if (e.isDirectory()) walk(path.join(dir, e.name));
    }
  }
  walk(root);
  return out;
}
