import { describe, expect, it } from "vitest";
import type { IDictEntry, IDictKanji, IDictVi } from "../../models/Dict.js";
import type { DictionaryRepository } from "./DictionaryRepository.js";
import { DictionaryService } from "./DictionaryService.js";
import { foldLatin, glossTokens, katakanaToHiragana, romajiToHiragana } from "./kana.js";

function entry(id: number, kanji: string[], kana: string[], pos: string[], glosses: string[], w = 0): IDictEntry {
  return {
    _id: id,
    k: kanji.map((t) => ({ t })),
    r: kana.map((t) => ({ t })),
    s: [{ p: pos, g: glosses }],
    c: 0,
    w,
    keys: [...kanji, ...kana.map(katakanaToHiragana), ...kana],
    en: glosses.flatMap(glossTokens),
  };
}

const ENTRIES = [
  entry(1, ["食べる"], ["たべる"], ["v1", "vt"], ["to eat"], 40),
  entry(2, ["学校"], ["がっこう"], ["n"], ["school"], 40),
  entry(3, ["勉強"], ["べんきょう"], ["n", "vs"], ["study"], 40),
  entry(4, ["行く"], ["いく", "ゆく"], ["v5k-s"], ["to go"], 40),
  entry(5, [], ["に"], ["prt"], ["at; in"], 40),
  entry(6, ["学"], ["がく"], ["n"], ["learning"], 0),
  entry(7, [], ["コーヒー"], ["n"], ["coffee"], 40),
  entry(8, ["門"], ["もん"], ["n"], ["gate"], 0),
  entry(9, [], ["バター"], ["n"], ["butter"], 40),
  entry(10, ["父"], ["ちち"], ["n"], ["father"], 40),
  entry(11, ["押す"], ["おす"], ["v5s"], ["to push"], 0),
];
// 門 also has a later sense "school"; it must rank below 学校, whose first sense is exactly that
ENTRIES[7]!.s.push({ p: ["n"], g: ["school"] });
ENTRIES[7]!.en.push("school");

ENTRIES[0]!.s[0]!.x = [
  { ja: "りんごを食べる。", en: "I eat an apple." },
  { ja: "ここでは食べない。", en: "I don't eat here." },
];

const VI: IDictVi[] = [
  { _id: 1, s: [["ăn"]], x: [["Tôi ăn táo.", "Tôi không ăn ở đây."]], hx: ["0:1"], t: ["an"], src: "reviewed" },
  { _id: 9, s: [["bơ"]], t: ["bo"], src: "ai" },
  { _id: 10, s: [["bố", "cha"]], t: ["bo", "cha"], src: "ai" },
  { _id: 11, s: [["(dùng lực) ấn", "đẩy"]], t: ["dung", "luc", "an", "day"], src: "ai" },
];
const KANJI: IDictKanji[] = [
  { _id: "食", n: 9, on: ["ショク"], kun: ["た.べる"], m: ["eat"], hv: ["Thực"], parts: [] },
  { _id: "学", n: 8, on: ["ガク"], kun: ["まな.ぶ"], m: ["study"], hv: ["Học"], parts: [] },
];

const repo: DictionaryRepository = {
  findByKeys: async (keys) => ENTRIES.filter((e) => e.keys.some((k) => keys.includes(k))),
  findByKeyPrefix: async (p, limit) => ENTRIES.filter((e) => e.keys.some((k) => k.startsWith(p))).slice(0, limit),
  findByEnglish: async (tokens) => ENTRIES.filter((e) => tokens.every((t) => e.en.includes(t))),
  findByVietnamese: async (tokens) => {
    const ids = VI.filter((v) => tokens.every((t) => v.t.includes(t))).map((v) => v._id);
    return ENTRIES.filter((e) => ids.includes(e._id));
  },
  getEntry: async (id) => ENTRIES.find((e) => e._id === id) ?? null,
  getVi: async (ids) => new Map(VI.filter((v) => ids.includes(v._id)).map((v) => [v._id, v])),
  getKanji: async (chars) => KANJI.filter((k) => chars.includes(k._id)),
};
const service = new DictionaryService(repo);

describe("lookupAt", () => {
  const text = "昨日は学校に行きませんでした";

  it("finds a plain word and its kanji", async () => {
    const r = await service.lookupAt(text, 3);
    expect(r?.matched).toBe("学校");
    expect(r?.start).toBe(3);
    expect(r?.entries[0]?.id).toBe(2);
  });

  it("undoes conjugation and reports the range of the whole conjugated word", async () => {
    const r = await service.lookupAt(text, 7);
    expect(r).toMatchObject({ matched: "行きませんでした", start: 6, length: 8 });
    expect(r?.entries[0]?.id).toBe(4);
    expect(r?.reasons).toEqual(["polite-past-negative", "polite"]);
  });

  it("finds the word when the click lands in its okurigana", async () => {
    const r = await service.lookupAt("食べませんでした", 4);
    expect(r?.entries[0]?.id).toBe(1);
    expect(r?.start).toBe(0);
  });

  it("returns the clicked particle rather than a longer word before it", async () => {
    const r = await service.lookupAt(text, 5);
    expect(r?.matched).toBe("に");
  });

  it("includes Vietnamese meanings and Hán Việt when we have them", async () => {
    const r = await service.lookupAt("食べる", 0);
    expect(r?.entries[0]?.senses[0]?.vi).toEqual(["ăn"]);
    expect(r?.entries[0]?.viSource).toBe("reviewed");
    expect(r?.kanji[0]?.hanViet).toEqual(["Thực"]);
  });

  it("attaches Vietnamese to each example and leaves out the ones flagged as unsuitable", async () => {
    const r = await service.lookupAt("食べる", 0);
    expect(r?.entries[0]?.senses[0]?.examples).toEqual([{ ja: "りんごを食べる。", en: "I eat an apple.", vi: "Tôi ăn táo." }]);
  });

  it("shows a teacher-corrected sentence and leaves out senses that were taken down", async () => {
    VI[0] = { ...VI[0]!, xj: [["りんごを食べます。", ""]] };
    const r = await service.lookupAt("食べる", 0);
    expect(r?.entries[0]?.senses[0]?.examples[0]?.ja).toBe("りんごを食べます。");
    VI[0] = { ...VI[0]!, hs: [0] };
    expect((await service.lookupAt("食べる", 0))?.entries[0]?.senses).toEqual([]);
    VI[0] = { ...VI[0]!, xj: undefined, hs: undefined };
  });

  it("gives nothing for punctuation, out-of-range offsets and unknown text", async () => {
    expect(await service.lookupAt("食べる。", 3)).toBeNull();
    expect(await service.lookupAt("食べる", 9)).toBeNull();
    expect(await service.lookupAt("ぬぬぬ", 1)).toBeNull();
  });
});

describe("search", () => {
  it("detects Japanese and puts exact matches before prefix matches", async () => {
    const r = await service.search("学");
    expect(r.lang).toBe("ja");
    expect(r.entries.map((e) => e.id)).toEqual([6, 2]);
    expect(r.kanji[0]?.char).toBe("学");
  });

  it("finds a Japanese word from romaji and from katakana", async () => {
    expect((await service.search("taberu")).entries[0]?.id).toBe(1);
    expect((await service.search("コーヒー")).entries[0]?.id).toBe(7);
  });

  it("searches English with the first-sense, exact-gloss match first", async () => {
    const r = await service.search("school");
    expect(r.lang).toBe("en");
    expect(r.entries.map((e) => e.id)).toEqual([2, 8]);
  });

  it("searches Vietnamese, with or without diacritics", async () => {
    expect((await service.search("ăn")).entries[0]?.id).toBe(1);
    expect((await service.search("an", "vi")).entries[0]?.id).toBe(1);
  });

  it("puts a Vietnamese match with the same diacritics before one found only by folding them", async () => {
    expect((await service.search("bơ")).entries.map((e) => e.id)).toEqual([9, 10]);
    expect((await service.search("ăn")).entries[0]?.id).toBe(1);
    // "an" with no marks may mean either; both are offered, 食べる (ăn) first
    expect((await service.search("an", "vi")).entries.map((e) => e.id)).toEqual([1, 11]);
  });

  it("returns an empty list when nothing matches", async () => {
    expect((await service.search("zzzz")).entries).toEqual([]);
  });
});

describe("kana helpers", () => {
  it("converts romaji", () => {
    expect(romajiToHiragana("taberu")).toBe("たべる");
    expect(romajiToHiragana("gakkou")).toBe("がっこう");
    expect(romajiToHiragana("kitte")).toBe("きって");
    expect(romajiToHiragana("shinbun")).toBe("しんぶん");
    expect(romajiToHiragana("konnichiha")).toBe("こんにちは");
    expect(romajiToHiragana("kinou")).toBe("きのう");
    expect(romajiToHiragana("ăn")).toBeNull();
  });

  it("folds Vietnamese and tokenises glosses", () => {
    expect(foldLatin("Đang ĂN cơm")).toBe("dang an com");
    expect(glossTokens("to eat (food)")).toEqual(["to", "eat", "food"]);
  });
});
