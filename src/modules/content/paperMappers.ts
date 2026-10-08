import type { PaperItem, PaperPackage, PaperPart, PaperPassage } from "@jd/content-schema";

export type PaperCounts = Record<PaperPart, number>;

export function paperCounts(paper: PaperPackage): PaperCounts {
  const counts: PaperCounts = { vocab: 0, grammar: 0, reading: 0 };
  for (const item of paper.items) counts[item.part] += 1;
  return counts;
}

/** What the lesson list/detail says about a lesson's written part (null when it has none to serve). */
export function paperInfo(paper: PaperPackage | null) {
  if (!paper) return null;
  return { status: paper.status, content_version: paper.content_version, counts: paperCounts(paper) };
}

/** Question as the learner first sees it: no answer, explanation, translation or arrangement. */
export function stripItemForPractice(item: PaperItem) {
  return {
    id: item.id,
    no: item.no,
    part: item.part,
    mondai: item.mondai,
    type: item.type,
    ...(item.passage_id ? { passage_id: item.passage_id } : {}),
    stem: {
      ja: item.stem.ja,
      ...(item.stem.reading ? { reading: item.stem.reading } : {}),
      ...(item.stem.target ? { target: item.stem.target } : {}),
    },
    choices: item.choices.map((c) => ({ id: c.id, text: c.text })),
  };
}

/** Passage text as printed: blanks stay blank (問題9), translations and drill data are withheld. */
export function stripPassageForPractice(passage: PaperPassage) {
  return {
    id: passage.id,
    mondai: passage.mondai,
    kind: passage.kind,
    ...(passage.title_ja ? { title_ja: passage.title_ja } : {}),
    ...(passage.layout_ja ? { layout_ja: passage.layout_ja } : {}),
    sentences: passage.sentences.map((s) => ({
      id: s.id,
      text: s.ja_blank ?? s.ja,
      ...(s.notes ? { notes: s.notes } : {}),
    })),
  };
}

export function toPaperPractice(paper: PaperPackage) {
  return {
    lesson_id: paper.lesson_id,
    status: paper.status,
    content_version: paper.content_version,
    counts: paperCounts(paper),
    items: paper.items.map(stripItemForPractice),
    passages: paper.passages.map(stripPassageForPractice),
  };
}

/** Everything revealed once the learner has answered an item. */
export function toItemResult(item: PaperItem, selectedChoiceId: string) {
  const correct = item.choices.find((c) => c.correct);
  return {
    correct: correct?.id === selectedChoiceId,
    selected_choice_id: selectedChoiceId,
    correct_choice_id: correct?.id ?? null,
    stem_vi: item.stem.vi ?? "",
    summary_vi: item.summary_vi ?? "",
    point_tags: item.point_tags,
    vocab: item.vocab,
    choices: item.choices.map((c) => ({
      id: c.id,
      text: c.text,
      correct: c.correct,
      explanation_vi: c.explanation_vi,
      ...(c.meaning_vi ? { meaning_vi: c.meaning_vi } : {}),
    })),
    ...(item.sort ? { sort: item.sort } : {}),
    evidence_sentence_ids: item.evidence_sentence_ids,
  };
}

export function toPassageTranslation(passage: PaperPassage) {
  return {
    passage_id: passage.id,
    sentences: passage.sentences.map((s) => ({
      id: s.id,
      ja: s.ja,
      vi: s.vi ?? "",
      ...(s.notes ? { notes: s.notes } : {}),
    })),
    full_translation_vi: passage.full_translation_vi ?? "",
  };
}

export function findSentence(paper: PaperPackage, sentenceId: string) {
  for (const passage of paper.passages) {
    const sentence = passage.sentences.find((s) => s.id === sentenceId);
    if (sentence) return { passage, sentence };
  }
  return null;
}
