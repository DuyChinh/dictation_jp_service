import { describe, expect, it } from "vitest";
import { getLocalizedText } from "./getLocalizedText.js";

describe("getLocalizedText", () => {
  it("uses preferred lang", () => {
    expect(
      getLocalizedText({ ja: "あ", vi: "a", en: "a-en" }, "en"),
    ).toBe("a-en");
  });

  it("falls back vi → en → ja", () => {
    expect(getLocalizedText({ ja: "あ", en: "a" }, "vi")).toBe("a");
    expect(getLocalizedText({ ja: "あ" }, "en")).toBe("あ");
  });

  it("handles string passthrough", () => {
    expect(getLocalizedText("x", "vi")).toBe("x");
  });

  it("empty on null", () => {
    expect(getLocalizedText(null, "vi")).toBe("");
  });
});
