import type { IDictEntry } from "../../models/Dict.js";
import type { DictionaryRepository } from "./DictionaryRepository.js";
import { deinflect, fitsPos, type Deinflection } from "./deinflect.js";
import { entryToDto, kanjiToDto, type EntryDto, type KanjiDto } from "./dictMappers.js";
import { foldLatin, glossTokens, hasJapanese, isKanji, katakanaToHiragana, romajiToHiragana } from "./kana.js";

/** Longest word we try to match, and how far left of the click a word may start. */
const MAX_WORD = 20;
const LOOK_BACK = 6;
const LOOKUP_ENTRIES = 8;
const SEARCH_LIMIT = 30;
const SEARCH_POOL = 120;

export type SearchLang = "auto" | "ja" | "en" | "vi";

export type LookupResult = {
  /** Where the matched word starts in the text that was sent, and how long it is. */
  start: number;
  length: number;
  matched: string;
  /** Conjugations the text was in, e.g. ["polite", "past"]; empty when it was the dictionary form. */
  reasons: string[];
  entries: EntryDto[];
  kanji: KanjiDto[];
};

export type SearchResult = {
  query: string;
  lang: Exclude<SearchLang, "auto">;
  entries: EntryDto[];
  kanji: KanjiDto[];
};

const VIETNAMESE_MARKS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;

function unionPos(entry: IDictEntry): string[] {
  return entry.s.flatMap((s) => s.p);
}

export class DictionaryService {
  constructor(private readonly repo: DictionaryRepository) {}

  /** Look up the word under `offset` in `text`, undoing conjugation (食べました → 食べる). */
  async lookupAt(text: string, offset: number): Promise<LookupResult | null> {
    const chars = [...text];
    if (offset < 0 || offset >= chars.length || !hasJapanese(chars[offset]!)) return null;

    // Words never span punctuation, spaces or line breaks.
    let runStart = offset;
    while (runStart > 0 && hasJapanese(chars[runStart - 1]!)) runStart--;
    let runEnd = offset;
    while (runEnd < chars.length - 1 && hasJapanese(chars[runEnd + 1]!)) runEnd++;

    const firstStart = Math.max(runStart, offset - LOOK_BACK);
    type Cand = { start: number; len: number; d: Deinflection };
    const cands: Cand[] = [];
    const wanted = new Set<string>();
    for (let start = firstStart; start <= offset; start++) {
      const maxLen = Math.min(MAX_WORD, runEnd - start + 1);
      for (let len = maxLen; len >= 1; len--) {
        const piece = chars.slice(start, start + len).join("");
        for (const d of deinflect(piece)) {
          cands.push({ start, len, d });
          wanted.add(d.word);
          wanted.add(katakanaToHiragana(d.word));
        }
      }
    }

    const entries = await this.repo.findByKeys([...wanted]);
    const byKey = new Map<string, IDictEntry[]>();
    for (const e of entries) {
      for (const key of e.keys) {
        const list = byKey.get(key);
        if (list) list.push(e);
        else byKey.set(key, [e]);
      }
    }

    // Earliest start that has a word reaching the clicked character; at that start, the longest word.
    for (let start = firstStart; start <= offset; start++) {
      const atStart = cands.filter((c) => c.start === start && start + c.len > offset);
      const lens = [...new Set(atStart.map((c) => c.len))].sort((a, b) => b - a);
      for (const len of lens) {
        const hits = new Map<number, { entry: IDictEntry; reasons: string[] }>();
        for (const c of atStart.filter((x) => x.len === len)) {
          const pool = [...(byKey.get(c.d.word) ?? []), ...(byKey.get(katakanaToHiragana(c.d.word)) ?? [])];
          for (const entry of pool) {
            if (!fitsPos(c.d, unionPos(entry))) continue;
            const prev = hits.get(entry._id);
            if (!prev || c.d.reasons.length < prev.reasons.length) hits.set(entry._id, { entry, reasons: c.d.reasons });
          }
        }
        if (!hits.size) continue;

        // As written first, then conjugated readings; common and JLPT words ahead within each group.
        const ranked = [...hits.values()]
          .sort((a, b) => (a.reasons.length === 0 ? 0 : 1) - (b.reasons.length === 0 ? 0 : 1) || b.entry.w - a.entry.w || a.entry._id - b.entry._id)
          .slice(0, LOOKUP_ENTRIES);
        const matched = chars.slice(start, start + len).join("");
        const [dtos, kanji] = await Promise.all([this.toDtos(ranked.map((r) => r.entry)), this.kanjiOf(matched)]);
        if (!dtos.length) continue; // every entry here was taken down; try a shorter word
        return { start, length: len, matched, reasons: ranked[0]!.reasons, entries: dtos, kanji };
      }
    }
    return null;
  }

  async search(query: string, lang: SearchLang = "auto", limit = SEARCH_LIMIT): Promise<SearchResult> {
    const q = query.trim().replace(/\s+/g, " ");
    // Japanese text is always looked up as Japanese: the language tab only decides how Latin text is read.
    const resolved = hasJapanese(q) ? "ja" : lang === "auto" ? this.detectLang(q) : lang;
    let found: IDictEntry[] = [];

    if (resolved === "ja") {
      // the 日本語 tab also takes romaji ("taberu")
      const kana = hasJapanese(q) ? q : romajiToHiragana(q);
      found = kana ? await this.searchJapanese(kana, limit) : [];
    } else if (resolved === "en") found = await this.searchGloss(q, limit, "en");
    else found = await this.searchGloss(q, limit, "vi");

    // Latin text that is plain romaji ("taberu") may be a Japanese reading rather than English.
    if (lang === "auto" && resolved !== "ja") {
      const kana = romajiToHiragana(q);
      if (kana) {
        const byReading = await this.searchJapanese(kana, limit);
        const seen = new Set(found.map((e) => e._id));
        const exact = byReading.filter((e) => e.keys.includes(kana) && !seen.has(e._id));
        found = [...exact, ...found.filter((e) => !exact.includes(e))].slice(0, limit);
      }
    }

    const kanjiChars = [...new Set([...q].filter(isKanji))].slice(0, 12);
    const [entries, kanji] = await Promise.all([
      this.toDtos(found),
      kanjiChars.length ? this.repo.getKanji(kanjiChars) : Promise.resolve([]),
    ]);
    return { query: q, lang: resolved, entries, kanji: kanji.map(kanjiToDto) };
  }

  async entry(id: number): Promise<EntryDto | null> {
    const entry = await this.repo.getEntry(id);
    if (!entry) return null;
    const [dto] = await this.toDtos([entry]);
    return dto ?? null;
  }

  async kanji(chars: string[]): Promise<KanjiDto[]> {
    const rows = await this.repo.getKanji([...new Set(chars)].slice(0, 40));
    const order = new Map(chars.map((c, i) => [c, i]));
    return rows.map(kanjiToDto).sort((a, b) => (order.get(a.char) ?? 0) - (order.get(b.char) ?? 0));
  }

  private detectLang(q: string): Exclude<SearchLang, "auto"> {
    if (hasJapanese(q)) return "ja";
    return VIETNAMESE_MARKS.test(q) ? "vi" : "en";
  }

  private async searchJapanese(q: string, limit: number): Promise<IDictEntry[]> {
    const hira = katakanaToHiragana(q);
    const keys = new Set<string>([q, hira]);
    const inflected: Array<{ d: Deinflection; word: string }> = [];
    for (const d of deinflect(q)) {
      if (d.classes === 0) continue;
      keys.add(d.word);
      inflected.push({ d, word: d.word });
    }
    const exact = (await this.repo.findByKeys([...keys])).filter((e) => {
      if (e.keys.includes(q) || e.keys.includes(hira)) return true;
      return inflected.some(({ d }) => e.keys.includes(d.word) && fitsPos(d, unionPos(e)));
    });
    const prefix = await this.repo.findByKeyPrefix(q, limit * 2);
    const seen = new Set<number>();
    const out: IDictEntry[] = [];
    const byWeight = (a: IDictEntry, b: IDictEntry) => b.w - a.w || a._id - b._id;
    for (const e of [...exact.sort(byWeight), ...prefix.sort(byWeight)]) {
      if (seen.has(e._id)) continue;
      seen.add(e._id);
      out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  }

  private async searchGloss(q: string, limit: number, lang: "en" | "vi"): Promise<IDictEntry[]> {
    const tokens = glossTokens(q);
    if (!tokens.length) return [];
    const pool = lang === "en" ? await this.repo.findByEnglish(tokens, SEARCH_POOL) : await this.repo.findByVietnamese(tokens, SEARCH_POOL);
    if (!pool.length) return [];

    // Ranking: a gloss equal to the query ("eat", "to eat", "ăn") beats one that merely contains it; a match
    // that keeps the query's diacritics beats one only found after folding ("ăn" over "ấn"); a match in the
    // first sense beats one buried in the fifth. Qualifiers in brackets, "(tôn kính) ăn", are not compared.
    const viRows = lang === "vi" ? await this.repo.getVi(pool.map((e) => e._id)) : null;
    const typed = q.trim().toLowerCase();
    const folded = foldLatin(typed);
    const hasMarks = folded !== typed;
    const bare = (g: string) => g.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().toLowerCase().replace(/^to /, "");
    const score = (e: IDictEntry): number => {
      const senses = lang === "en" ? e.s.map((s) => s.g) : (viRows!.get(e._id)?.s ?? []);
      let best = 0;
      senses.forEach((glosses, i) => {
        for (const g of glosses) {
          const raw = bare(g);
          const f = foldLatin(raw);
          const contains = (text: string, w: string) => text === w || text.startsWith(w + " ") || text.endsWith(" " + w);
          let kind = 1;
          if (raw === typed) kind = 6;
          else if (contains(raw, typed)) kind = 5;
          else if (f === folded) kind = hasMarks ? 2 : 4;
          else if (contains(f, folded)) kind = hasMarks ? 1.5 : 3;
          best = Math.max(best, kind * 10 - Math.min(i, 5));
        }
      });
      return best;
    };
    return pool
      .map((e) => ({ e, s: score(e) }))
      .sort((a, b) => b.s - a.s || b.e.w - a.e.w || a.e._id - b.e._id)
      .slice(0, limit)
      .map((x) => x.e);
  }

  private async toDtos(entries: IDictEntry[]): Promise<EntryDto[]> {
    const vi = await this.repo.getVi(entries.map((e) => e._id));
    // an entry whose every sense was taken down (not for learners) is left out altogether
    return entries.map((e) => entryToDto(e, vi.get(e._id))).filter((d) => d.senses.length > 0);
  }

  private async kanjiOf(text: string): Promise<KanjiDto[]> {
    const chars = [...new Set([...text].filter(isKanji))];
    return chars.length ? (await this.repo.getKanji(chars)).map(kanjiToDto) : [];
  }
}
