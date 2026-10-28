import type { IDictEntry, IDictKanji, IDictVi, ViSource } from "../../models/Dict.js";

export type EntryDto = {
  id: number;
  common: boolean;
  /** 5 = N5 … 1 = N1; null when the word is in none of the JLPT lists */
  jlpt: number | null;
  kanji: Array<{ text: string; common: boolean; tags: string[] }>;
  kana: Array<{ text: string; common: boolean; tags: string[]; appliesToKanji: string[] | null }>;
  senses: Array<{
    pos: string[];
    field: string[];
    misc: string[];
    info: string[];
    appliesToKanji: string[] | null;
    appliesToKana: string[] | null;
    glosses: string[];
    /** Vietnamese meanings; empty while this sense is untranslated */
    vi: string[];
    examples: Array<{ ja: string; en: string; vi: string | null }>;
  }>;
  viSource: ViSource | null;
};

export type KanjiDto = {
  char: string;
  strokes: number | null;
  grade: number | null;
  /** old four-level JLPT list, 4 = easiest */
  jlpt: number | null;
  on: string[];
  kun: string[];
  meanings: string[];
  hanViet: string[];
  radical: number | null;
  parts: string[];
};

export function entryToDto(entry: IDictEntry, vi?: IDictVi | null): EntryDto {
  const translated = vi?.s ?? [];
  return {
    id: entry._id,
    common: entry.c === 1,
    jlpt: entry.l ?? null,
    kanji: entry.k.map((k) => ({ text: k.t, common: k.c === 1, tags: k.g ?? [] })),
    kana: entry.r.map((r) => ({
      text: r.t,
      common: r.c === 1,
      tags: r.g ?? [],
      appliesToKanji: r.ak?.length ? r.ak : null,
    })),
    senses: entry.s.flatMap((s, i) => (vi?.hs?.includes(i) ? [] : [{ s, i }])).map(({ s, i }) => ({
      pos: s.p,
      field: s.f ?? [],
      misc: s.m ?? [],
      info: s.i ?? [],
      appliesToKanji: s.ak?.length ? s.ak : null,
      appliesToKana: s.ar?.length ? s.ar : null,
      glosses: s.g,
      vi: translated[i] ?? [],
      examples: (s.x ?? [])
        .map((x, k) => ({ ...x, ja: vi?.xj?.[i]?.[k] || x.ja, vi: vi?.x?.[i]?.[k] || null, hidden: vi?.hx?.includes(`${i}:${k}`) ?? false }))
        .filter((x) => !x.hidden)
        .map(({ hidden: _hidden, ...x }) => x),
    })),
    viSource: vi ? vi.src : null,
  };
}

export function kanjiToDto(k: IDictKanji): KanjiDto {
  return {
    char: k._id,
    strokes: k.n ?? null,
    grade: k.gr ?? null,
    jlpt: k.l ?? null,
    on: k.on,
    kun: k.kun,
    meanings: k.m,
    hanViet: k.hv,
    radical: k.rad ?? null,
    parts: k.parts,
  };
}
