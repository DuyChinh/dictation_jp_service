import { describe, expect, it } from "vitest";
import { isValidVideo } from "./videoLinks.js";

describe("isValidVideo", () => {
  it("accepts well-formed ids and rejects anything else", () => {
    expect(isValidVideo({ provider: "youtube", id: "dQw4w9WgXcQ" })).toBe(true);
    expect(isValidVideo({ provider: "youtube", id: "short" })).toBe(false);
    expect(isValidVideo({ provider: "youtube", id: "dQw4w9WgXcQ\"><x" })).toBe(false);
    expect(isValidVideo({ provider: "drive", id: "1AbCdEfGhIjKlMnOpQrStUvWxYz012345" })).toBe(true);
    expect(isValidVideo({ provider: "drive", id: "../../etc" })).toBe(false);
  });
});
