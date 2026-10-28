/** Kana and text normalisation shared by the dictionary import and the lookup. */

const KATA_START = 0x30a1;
const KATA_END = 0x30f6;

export function katakanaToHiragana(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += c >= KATA_START && c <= KATA_END ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

export function hiraganaToKatakana(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += c >= 0x3041 && c <= 0x3096 ? String.fromCodePoint(c + 0x60) : ch;
  }
  return out;
}

export const isKana = (s: string): boolean => /^[぀-ゟ゠-ヿー]+$/.test(s);
export const hasJapanese = (s: string): boolean =>
  /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/.test(s);
export const isKanji = (ch: string): boolean => /[㐀-䶿一-鿿々〆]/.test(ch);

/** Lookup keys for one written form: the text itself and, for kana, its hiragana spelling. */
export function formKeys(text: string): string[] {
  const hira = katakanaToHiragana(text);
  return hira === text ? [text] : [text, hira];
}

const BASIC: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wo: "を",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ", sya: "しゃ", syu: "しゅ", syo: "しょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ", tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ", jya: "じゃ", jyu: "じゅ", jyo: "じょ", zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ",
  je: "じぇ", che: "ちぇ", she: "しぇ",
};

const ROMAJI_KEYS = Object.keys(BASIC).sort((a, b) => b.length - a.length);

/**
 * Hepburn / Kunrei romaji to hiragana ("taberu" → "たべる"), or null when the text is not
 * plain romaji. Long vowels may be written doubled ("oo") or with a macron.
 */
export function romajiToHiragana(input: string): string | null {
  let s = input
    .toLowerCase()
    .replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu").replace(/ē/g, "ee").replace(/ō/g, "ou")
    .trim();
  if (!s || !/^[a-z'\-\s]+$/.test(s)) return null;
  s = s.replace(/\s+/g, "");
  let out = "";
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "-") { out += "ー"; i += 1; continue; }
    if (ch === "'") { i += 1; continue; }
    const next = s[i + 1];
    // doubled consonant → っ ("kitte" → きって); "nn" is handled below as ん
    if (next === ch && !"aiueon".includes(ch)) { out += "っ"; i += 1; continue; }
    if (ch === "n") {
      const after = s.slice(i + 1, i + 3);
      const startsKana = ROMAJI_KEYS.some((k) => after.startsWith(k) && /^[aiueoy]/.test(k) === true);
      if (next === "n" && !s.slice(i + 2).match(/^[aiueoy]/)) { out += "ん"; i += 2; continue; }
      if (!next || !(startsKana || /^[aiueoy]/.test(next))) { out += "ん"; i += 1; continue; }
    }
    const hit = ROMAJI_KEYS.find((k) => s.startsWith(k, i));
    if (!hit) return null;
    out += BASIC[hit]!;
    i += hit.length;
  }
  return out;
}

/** Lower-case, drop diacritics (Vietnamese and macrons) so "Ăn cơm" matches "an com". */
export function foldLatin(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/** Word tokens of a gloss for the reverse (English / Vietnamese → Japanese) index. */
export function glossTokens(s: string): string[] {
  return foldLatin(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}
