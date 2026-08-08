import { toCodePoints } from "./codepoints.js";

export type DiffOp =
  | { type: "equal"; text: string }
  | { type: "insert"; text: string }
  | { type: "delete"; text: string }
  | { type: "replace"; expected: string; actual: string };

/**
 * Character-level LCS-based diff (expected vs actual).
 * insert = extra in answer, delete = missing from answer.
 */
export function diffCharacters(expected: string, actual: string): DiffOp[] {
  const a = toCodePoints(expected);
  const b = toCodePoints(actual);
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to raw ops
  type Raw =
    | { type: "equal"; ch: string }
    | { type: "insert"; ch: string }
    | { type: "delete"; ch: string };

  const raw: Raw[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ type: "equal", ch: a[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      raw.push({ type: "insert", ch: b[j - 1]! });
      j--;
    } else {
      raw.push({ type: "delete", ch: a[i - 1]! });
      i--;
    }
  }
  raw.reverse();

  // Merge consecutive same-type ops; merge delete+insert sequence as replace when adjacent
  const merged: DiffOp[] = [];
  let k = 0;
  while (k < raw.length) {
    const cur = raw[k]!;
    if (cur.type === "equal") {
      let text = cur.ch;
      k++;
      while (k < raw.length && raw[k]!.type === "equal") {
        text += (raw[k] as { ch: string }).ch;
        k++;
      }
      merged.push({ type: "equal", text });
      continue;
    }

    // Collect run of deletes and inserts → compress to replace when both present
    let del = "";
    let ins = "";
    while (k < raw.length && raw[k]!.type !== "equal") {
      const r = raw[k]!;
      if (r.type === "delete") del += r.ch;
      else if (r.type === "insert") ins += r.ch;
      k++;
    }
    if (del && ins) {
      merged.push({ type: "replace", expected: del, actual: ins });
    } else if (del) {
      merged.push({ type: "delete", text: del });
    } else if (ins) {
      merged.push({ type: "insert", text: ins });
    }
  }

  // Empty both
  if (merged.length === 0 && expected === "" && actual === "") {
    return [{ type: "equal", text: "" }];
  }

  return merged;
}

export function opsToSimpleLabel(ops: DiffOp[]): string {
  return ops
    .map((op) => {
      switch (op.type) {
        case "equal":
          return op.text;
        case "insert":
          return `+${op.text}`;
        case "delete":
          return `-${op.text}`;
        case "replace":
          return `[${op.expected}→${op.actual}]`;
      }
    })
    .join("");
}
