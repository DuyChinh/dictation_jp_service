/**
 * Undo Japanese verb / adjective conjugation: 食べませんでした → 食べる, 行かなかった → 行く.
 * Candidates are only guesses; the caller keeps those a dictionary entry of the right word class confirms.
 */

export const WordClass = {
  V1: 1, // ichidan
  V5: 2, // godan
  VS: 4, // suru
  VK: 8, // kuru
  ADJI: 16, // i-adjective
  // Forms that exist only half-way through a chain; never a dictionary entry themselves.
  MASU: 32,
  TE: 64,
} as const;

export type Deinflection = {
  word: string;
  /** 0 = the text as written; otherwise the word classes this candidate must belong to. */
  classes: number;
  /** Conjugations undone, outermost first, e.g. ["polite-past", ...]. */
  reasons: string[];
};

type Rule = { from: string; to: string; need: number; make: number; reason: string };

const { V1, V5, VS, VK, ADJI, MASU, TE } = WordClass;

// [dictionary ending, a, i, e, o, te, ta] stems of each godan ending
const GODAN: Array<[string, string, string, string, string, string, string]> = [
  ["う", "わ", "い", "え", "お", "って", "った"],
  ["く", "か", "き", "け", "こ", "いて", "いた"],
  ["ぐ", "が", "ぎ", "げ", "ご", "いで", "いだ"],
  ["す", "さ", "し", "せ", "そ", "して", "した"],
  ["つ", "た", "ち", "て", "と", "って", "った"],
  ["ぬ", "な", "に", "ね", "の", "んで", "んだ"],
  ["ぶ", "ば", "び", "べ", "ぼ", "んで", "んだ"],
  ["む", "ま", "み", "め", "も", "んで", "んだ"],
  ["る", "ら", "り", "れ", "ろ", "って", "った"],
];

const rules: Rule[] = [];
const add = (from: string, to: string, need: number, make: number, reason: string) =>
  rules.push({ from, to, need, make, reason });

// ---- Words that conjugate by attaching to another word -------------------------------------
// Chain links: the inflected tail turns into a plain stem class so the next rule can continue.
add("ません", "ます", 0, MASU, "polite-negative");
add("ませんでした", "ます", 0, MASU, "polite-past-negative");
add("ました", "ます", 0, MASU, "polite-past");
add("ましょう", "ます", 0, MASU, "polite-volitional");
add("まして", "ます", 0, MASU, "polite-te");
add("なかった", "ない", 0, ADJI, "past-negative");
add("なくて", "ない", 0, ADJI, "negative-te");
add("なければ", "ない", 0, ADJI, "negative-conditional");
add("なくても", "ない", 0, ADJI, "negative-concessive");

// ---- i-adjectives ---------------------------------------------------------------------------
add("く", "い", 0, ADJI, "adverbial");
add("くて", "い", 0, ADJI, "te");
add("かった", "い", 0, ADJI, "past");
add("くない", "い", 0, ADJI, "negative");
add("くなかった", "い", 0, ADJI, "past-negative");
add("ければ", "い", 0, ADJI, "conditional");
add("かったら", "い", 0, ADJI, "conditional");
add("さ", "い", 0, ADJI, "noun");
add("そう", "い", 0, ADJI, "looks-like");
add("すぎる", "い", 0, ADJI, "too-much");
add("すぎ", "い", 0, ADJI, "too-much");
for (const [from, reason] of [["よく", "adverbial"], ["よくて", "te"], ["よかった", "past"], ["よくない", "negative"], ["よければ", "conditional"]] as const) {
  add(from, "いい", 0, ADJI, reason);
}

// ---- Ichidan ---------------------------------------------------------------------------------
add("ない", "る", ADJI, V1, "negative");
add("ます", "る", MASU, V1, "polite");
add("て", "る", TE, V1, "te");
add("た", "る", 0, V1, "past");
add("たら", "る", 0, V1, "conditional");
add("たり", "る", 0, V1, "tari");
add("れば", "る", 0, V1, "conditional");
add("よう", "る", 0, V1, "volitional");
add("ろ", "る", 0, V1, "imperative");
add("よ", "る", 0, V1, "imperative");
add("ず", "る", 0, V1, "negative");
add("られる", "る", V1, V1, "potential-passive");
add("れる", "る", V1, V1, "potential");
add("させる", "る", V1, V1, "causative");
add("させられる", "る", V1, V1, "causative-passive");
add("たい", "る", ADJI, V1, "want");
add("そう", "る", 0, V1, "looks-like");
add("すぎる", "る", V1, V1, "too-much");
add("ながら", "る", 0, V1, "while");
add("", "る", 0, V1, "stem");

// ---- Godan -----------------------------------------------------------------------------------
for (const [u, a, i, e, o, te, ta] of GODAN) {
  add(`${a}ない`, u, ADJI, V5, "negative");
  add(`${a}ず`, u, 0, V5, "negative");
  add(`${i}ます`, u, MASU, V5, "polite");
  add(te, u, TE, V5, "te");
  add(ta, u, 0, V5, "past");
  add(ta + "ら", u, 0, V5, "conditional");
  add(ta + "り", u, 0, V5, "tari");
  add(`${e}ば`, u, 0, V5, "conditional");
  add(`${e}る`, u, V1, V5, "potential");
  add(`${a}れる`, u, V1, V5, "passive");
  add(`${a}せる`, u, V1, V5, "causative");
  add(`${a}される`, u, V1, V5, "causative-passive");
  add(`${a}せられる`, u, V1, V5, "causative-passive");
  add(e, u, 0, V5, "imperative");
  add(`${o}う`, u, 0, V5, "volitional");
  add(`${i}たい`, u, ADJI, V5, "want");
  add(`${i}そう`, u, 0, V5, "looks-like");
  add(`${i}すぎる`, u, V1, V5, "too-much");
  add(`${i}ながら`, u, 0, V5, "while");
  add(i, u, 0, V5, "stem");
}
// 行く is the one godan verb whose te / ta forms are 行って / 行った
add("って", "く", TE, V5, "te");
add("った", "く", 0, V5, "past");

// ---- する / 来る -----------------------------------------------------------------------------
// Both the full verb (愛する) and the noun it hangs on (勉強) are candidates.
for (const base of ["する", ""]) {
  add("し", base, 0, VS, "stem");
  add("した", base, 0, VS, "past");
  add("して", base, 0, VS, "te");
  add("しない", base, ADJI, VS, "negative");
  add("します", base, MASU, VS, "polite");
  add("しよう", base, 0, VS, "volitional");
  add("しろ", base, 0, VS, "imperative");
  add("せよ", base, 0, VS, "imperative");
  add("すれば", base, 0, VS, "conditional");
  add("したら", base, 0, VS, "conditional");
  add("したい", base, ADJI, VS, "want");
  add("される", base, V1, VS, "passive");
  add("させる", base, V1, VS, "causative");
  add("できる", base, V1, VS, "potential");
  add("しながら", base, 0, VS, "while");
}
for (const [from, to, need, reason] of [
  ["こない", "くる", ADJI, "negative"], ["きます", "くる", MASU, "polite"], ["きた", "くる", 0, "past"],
  ["きて", "くる", 0, "te"], ["こよう", "くる", 0, "volitional"], ["こい", "くる", 0, "imperative"],
  ["くれば", "くる", 0, "conditional"], ["こられる", "くる", V1, "potential-passive"],
  ["こさせる", "くる", V1, "causative"], ["きたい", "くる", ADJI, "want"], ["き", "くる", 0, "stem"],
  ["来ない", "来る", ADJI, "negative"], ["来ます", "来る", MASU, "polite"], ["来た", "来る", 0, "past"],
  ["来て", "来る", 0, "te"], ["来よう", "来る", 0, "volitional"], ["来い", "来る", 0, "imperative"],
  ["来れば", "来る", 0, "conditional"], ["来られる", "来る", V1, "potential-passive"],
  ["来させる", "来る", V1, "causative"], ["来たい", "来る", ADJI, "want"],
] as const) {
  add(from, to, need, VK, reason);
}
add("行って", "行く", TE, V5, "te");

// ---- Auxiliaries hanging on the te-form: 食べている, 食べてしまった, 見てみる ---------------
const TE_AUX: Array<[string, number, string]> = [
  ["ている", V1, "progressive"], ["てる", V1, "progressive"], ["でいる", V1, "progressive"], ["でる", V1, "progressive"],
  ["てある", V5, "resultative"], ["ておく", V5, "preparatory"], ["てしまう", V5, "completive"],
  ["ちゃう", V5, "completive"], ["じゃう", V5, "completive"],
  ["てみる", V1, "try"], ["ていく", V5, "go-on"], ["てくる", VK, "come-to"],
  ["てくれる", V1, "favour"], ["てあげる", V1, "favour"], ["てもらう", V5, "favour"],
  ["てください", 0, "request"], ["てくださる", V5, "request"],
];
for (const [from, need, reason] of TE_AUX) {
  add(from, from.startsWith("で") || from.startsWith("じ") ? "で" : "て", need, TE, reason);
}
add("ちゃった", "ちゃう", 0, V5, "past");
add("じゃった", "じゃう", 0, V5, "past");

const BY_SUFFIX_LENGTH = (() => {
  const map = new Map<number, Rule[]>();
  for (const r of rules) {
    const list = map.get(r.from.length) ?? [];
    list.push(r);
    map.set(r.from.length, list);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
})();

/** The text itself first, then every word it could be an inflection of (breadth-first, ≤ 6 steps). */
export function deinflect(text: string): Deinflection[] {
  const seen = new Set<string>([`${text}|0`]);
  const out: Deinflection[] = [{ word: text, classes: 0, reasons: [] }];
  let frontier = out.slice();
  for (let step = 0; step < 6 && frontier.length; step++) {
    const next: Deinflection[] = [];
    for (const cur of frontier) {
      for (const [len, list] of BY_SUFFIX_LENGTH) {
        if (len > cur.word.length) continue;
        const tail = cur.word.slice(cur.word.length - len);
        for (const r of list) {
          if (r.from !== tail) continue;
          if (r.need !== 0 && cur.classes !== 0 && (cur.classes & r.need) === 0) continue;
          // bare stems (食べ, 飲み, し) only make sense on the text as written, not half-way through a chain
          if (r.reason === "stem" && cur.reasons.length > 0) continue;
          const word = cur.word.slice(0, cur.word.length - len) + r.to;
          if (!word) continue;
          const key = `${word}|${r.make}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const d: Deinflection = { word, classes: r.make, reasons: [...cur.reasons, r.reason] };
          next.push(d);
          out.push(d);
        }
      }
    }
    frontier = next;
  }
  return out;
}

/** JMdict part-of-speech tags → the word classes above (0 for everything that never conjugates). */
export function classesOfPos(pos: readonly string[]): number {
  let mask = 0;
  for (const p of pos) {
    if (p === "v1" || p === "v1-s") mask |= V1;
    else if (p.startsWith("v5") || p === "v4r") mask |= V5;
    else if (p === "vs" || p === "vs-i" || p === "vs-s" || p === "vs-c") mask |= VS;
    else if (p === "vk") mask |= VK;
    else if (p === "adj-i" || p === "adj-ix") mask |= ADJI;
  }
  return mask;
}

/** Does a candidate (as produced by `deinflect`) fit an entry with these part-of-speech tags? */
export function fitsPos(candidate: Deinflection, pos: readonly string[]): boolean {
  if (candidate.classes === 0) return true;
  return (candidate.classes & classesOfPos(pos)) !== 0;
}
