import { describe, expect, it } from "vitest";
import { WordClass, classesOfPos, deinflect, fitsPos } from "./deinflect.js";

/** Does `text` deinflect to `word` as a dictionary entry with these part-of-speech tags? */
function resolves(text: string, word: string, pos: string[]): boolean {
  return deinflect(text).some((d) => d.word === word && fitsPos(d, pos));
}

describe("deinflect", () => {
  it("keeps the text as written as the first candidate", () => {
    expect(deinflect("食べる")[0]).toEqual({ word: "食べる", classes: 0, reasons: [] });
  });

  it("undoes ichidan forms", () => {
    expect(resolves("食べませんでした", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べなかった", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べさせられた", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べられる", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べたい", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べ", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べています", "食べる", ["v1"])).toBe(true);
    expect(resolves("食べてしまった", "食べる", ["v1"])).toBe(true);
  });

  it("undoes the godan endings", () => {
    const cases: Array<[string, string]> = [
      ["書いた", "書く"], ["泳いだ", "泳ぐ"], ["話した", "話す"], ["待った", "待つ"],
      ["死んだ", "死ぬ"], ["遊んで", "遊ぶ"], ["読んだ", "読む"], ["帰った", "帰る"],
      ["買わない", "買う"], ["行かなかった", "行く"], ["飲みます", "飲む"], ["飲んでいます", "飲む"],
      ["読ませる", "読む"], ["読まれた", "読む"], ["飲める", "飲む"], ["書けば", "書く"],
      ["話そう", "話す"], ["読みたくなかった", "読む"], ["行って", "行く"], ["行った", "行く"],
    ];
    for (const [text, word] of cases) {
      expect(resolves(text, word, ["v5" + word.slice(-1)]), `${text} → ${word}`).toBe(true);
    }
  });

  it("undoes i-adjectives", () => {
    expect(resolves("高くなかった", "高い", ["adj-i"])).toBe(true);
    expect(resolves("美しければ", "美しい", ["adj-i"])).toBe(true);
    expect(resolves("大きくて", "大きい", ["adj-i"])).toBe(true);
    expect(resolves("よくない", "いい", ["adj-ix"])).toBe(true);
  });

  it("undoes suru and kuru, with or without the noun", () => {
    expect(resolves("勉強しました", "勉強", ["n", "vs"])).toBe(true);
    expect(resolves("勉強している", "勉強", ["n", "vs"])).toBe(true);
    expect(resolves("愛した", "愛する", ["vs-s"])).toBe(true);
    expect(resolves("しなかった", "する", ["vs-i"])).toBe(true);
    expect(resolves("来なかった", "来る", ["vk"])).toBe(true);
    expect(resolves("こられない", "くる", ["vk"])).toBe(true);
  });

  it("rejects an entry of the wrong word class", () => {
    // 食べない cannot be a godan or an adjective entry
    expect(resolves("食べなかった", "食べる", ["n"])).toBe(false);
    expect(resolves("書いた", "書く", ["v1"])).toBe(false);
    expect(resolves("来た", "来る", ["n"])).toBe(false);
    expect(resolves("来た", "来る", ["vk"])).toBe(true);
  });

  it("records the conjugations it undid", () => {
    const hit = deinflect("食べませんでした").find((d) => d.word === "食べる" && d.classes === WordClass.V1);
    expect(hit?.reasons).toEqual(["polite-past-negative", "polite"]);
  });
});

describe("classesOfPos", () => {
  it("maps JMdict tags and ignores words that never conjugate", () => {
    expect(classesOfPos(["v5k-s"])).toBe(WordClass.V5);
    expect(classesOfPos(["vs-i", "n"])).toBe(WordClass.VS);
    expect(classesOfPos(["n", "adj-na"])).toBe(0);
  });
});
