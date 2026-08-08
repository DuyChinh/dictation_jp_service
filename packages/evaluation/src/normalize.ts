import { toCodePoints } from "./codepoints.js";

/**
 * norm-v1 primary normalize:
 * NFKC + remove all Unicode whitespace separators/controls that act as spacing.
 */
export function normalizePrimary(text: string): string {
  const nfkc = text.normalize("NFKC");
  // Remove whitespace: Zs, Zl, Zp + common ASCII space/tabs/newlines already in \s
  // Also remove BOM and zero-width spaces that break equality for learners.
  return nfkc
    .replace(/[\s\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/gu, "")
    .trim();
}

/** Characters ignored for punctuation-insensitive equality (Tier B). */
const PUNCT_CLASS =
  /[。．，、.,!！?？…・「」『』""'‘’]/gu;

export function stripPunctuation(text: string): string {
  return text.replace(PUNCT_CLASS, "");
}

export function normalizeForPunctInsensitive(text: string): string {
  return stripPunctuation(normalizePrimary(text));
}

export function lengthCodePoints(text: string): number {
  return toCodePoints(text).length;
}
