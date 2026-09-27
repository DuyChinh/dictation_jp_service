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

describe("uploaded team videos", () => {
  it("only accepts ids in the team video folder", () => {
    expect(isValidVideo({ provider: "cloudinary", id: "feedback/team/videos/0123456789abcdef01" })).toBe(true);
    expect(isValidVideo({ provider: "cloudinary", id: "feedback/64b000000000000000000001/x" })).toBe(false);
    expect(isValidVideo({ provider: "cloudinary", id: "other/0123456789abcdef01" })).toBe(false);
  });
});
