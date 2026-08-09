import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { adaptV4ToPackage } from "./adaptV4.js";
import { ListeningPackageSchema } from "./schema.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const v4Path = path.join(
  repoRoot,
  "content/jlpt/n2/2025-12/source.v4.json",
);

describe("adaptV4ToPackage", () => {
  it("maps m1-q1 text mode and m1-q2 image mode", () => {
    if (!fs.existsSync(v4Path)) {
      console.warn("skip: v4 source missing");
      return;
    }
    const raw = JSON.parse(fs.readFileSync(v4Path, "utf8"));
    const pkg = adaptV4ToPackage(raw, {
      imageUrls: {
        "m1-q2:1": "https://res.cloudinary.com/demo/image/upload/c1.png",
        "m1-q2:2": "https://res.cloudinary.com/demo/image/upload/c2.png",
        "m1-q2:3": "https://res.cloudinary.com/demo/image/upload/c3.png",
        "m1-q2:4": "https://res.cloudinary.com/demo/image/upload/c4.png",
      },
    });

    expect(pkg.id).toBe("jlpt-n2-2025-12");
    const q1 = pkg.sections[0]!.questions[0]!;
    expect(q1.choice_display_mode).toBe("text");
    expect(q1.choices?.filter((c) => c.correct)).toHaveLength(1);

    const q2 = pkg.sections[0]!.questions[1]!;
    expect(q2.choice_display_mode).toBe("image");
    expect(q2.choices?.[0]?.image?.url).toContain("cloudinary");

    const parsed = ListeningPackageSchema.safeParse(pkg);
    expect(parsed.success).toBe(true);
  });
});
