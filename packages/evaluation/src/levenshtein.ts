import { toCodePoints } from "./codepoints.js";

/**
 * Classic Levenshtein distance on Unicode code points.
 */
export function levenshtein(a: string, b: string): number {
  const aa = toCodePoints(a);
  const bb = toCodePoints(b);
  const m = aa.length;
  const n = bb.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use two-row DP for memory
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1, // delete
        curr[j - 1]! + 1, // insert
        prev[j - 1]! + cost, // replace
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n]!;
}
