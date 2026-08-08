/**
 * Unicode-safe code point helpers.
 */

export function toCodePoints(text: string): string[] {
  return [...text];
}

export function joinCodePoints(points: string[]): string {
  return points.join("");
}
