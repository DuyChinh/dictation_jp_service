import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ListeningPackageSchema,
  formatIssue,
  validateListeningPackage,
  validatePackageDir,
} from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../../../content/fixtures");
const testDataRoot = path.resolve(here, "../testdata");

describe("content-schema", () => {
  it("parses valid sample fixture", () => {
    const dir = path.join(fixturesRoot, "sample-lesson");
    const data = JSON.parse(
      fs.readFileSync(path.join(dir, "listening.json"), "utf8"),
    );
    const r = ListeningPackageSchema.safeParse(data);
    expect(r.success).toBe(true);

    const v = validatePackageDir(dir);
    const errors = v.issues.filter((i) => i.severity === "ERROR");
    expect(errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it("rejects missing evidence with clear question id", () => {
    const dir = path.join(testDataRoot, "invalid-evidence");
    const v = validatePackageDir(dir, { requireAudio: false });
    expect(v.ok).toBe(false);
    const evidence = v.issues.find((i) =>
      i.message.includes("evidence_segment_id"),
    );
    expect(evidence).toBeDefined();
    expect(evidence?.questionId).toBe("fixture-invalid-evidence-m1-q1");
    expect(formatIssue(evidence!).includes("Question:")).toBe(true);
  });

  it("rejects two correct choices", () => {
    const data = JSON.parse(
      fs.readFileSync(
        path.join(fixturesRoot, "sample-lesson", "listening.json"),
        "utf8",
      ),
    );
    data.id = "two-correct-test";
    data.sections[0].questions[0].choices[0].correct = true;
    data.sections[0].questions[0].choices[1].correct = true;

    const v = validateListeningPackage(data, {
      file: "inline.json",
      dir: path.join(fixturesRoot, "sample-lesson"),
      requireAudio: false,
    });
    expect(v.ok).toBe(false);
    expect(
      v.issues.some((i) =>
        i.message.includes("exactly one correct choice"),
      ),
    ).toBe(true);
  });
});
