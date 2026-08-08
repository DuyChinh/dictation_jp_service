import type { ListeningPackage, Question } from "@jd/content-schema";
import type { LessonMeta } from "./StaticContentRepository.js";

export type LessonCounts = {
  sections: number;
  questions: number;
  dictation_segments: number;
};

export function computeCounts(pkg: ListeningPackage): LessonCounts {
  let questions = 0;
  let dictation_segments = 0;
  for (const s of pkg.sections) {
    questions += s.questions.length;
    for (const q of s.questions) {
      dictation_segments += q.segments.filter(
        (seg) => seg.dictation_eligible !== false,
      ).length;
    }
  }
  return {
    sections: pkg.sections.length,
    questions,
    dictation_segments,
  };
}

export function toLessonSummary(meta: LessonMeta) {
  const p = meta.package;
  return {
    id: p.id,
    title: p.title,
    source: p.source,
    status: p.status,
    content_version: p.content_version,
    counts: computeCounts(p),
  };
}

export function toLessonDetail(meta: LessonMeta, baseUrl = "") {
  const p = meta.package;
  return {
    id: p.id,
    title: p.title,
    source: p.source,
    status: p.status,
    content_version: p.content_version,
    audio_url: `${baseUrl}/api/audio/${p.id}`,
    sections: p.sections.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      question_count: s.questions.length,
      dictation_segment_count: s.questions.reduce(
        (n, q) =>
          n + q.segments.filter((seg) => seg.dictation_eligible !== false).length,
        0,
      ),
    })),
    counts: computeCounts(p),
  };
}

/** Strip answer leakage for practice payloads. Keep image URLs for image choices. */
export function stripQuestionForPractice(q: Question): unknown {
  const { choices, ...rest } = q;

  const strippedChoices = choices?.map((c) => ({
    id: c.id,
    text: c.text,
    ...(c.image ? { image: c.image } : {}),
    // omit correct, explanation, evidence_segment_ids
  }));

  return {
    ...rest,
    ...(strippedChoices ? { choices: strippedChoices } : {}),
  };
}

export function stripPackageForPractice(pkg: ListeningPackage, baseUrl = "") {
  return {
    id: pkg.id,
    title: pkg.title,
    source: pkg.source,
    status: pkg.status,
    content_version: pkg.content_version,
    audio_url: `${baseUrl}/api/audio/${pkg.id}`,
    speakers: pkg.speakers,
    sections: pkg.sections.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      questions: s.questions.map(stripQuestionForPractice),
    })),
  };
}
