/**
 * Probe picture search phrases against Wikimedia Commons API to verify they return photos.
 *
 *   npx tsx scripts/dict/pic-probe.ts --src <out/file.jsonl> [--n 50]
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const src = opt("--src", "");
const limitN = parseInt(opt("--n", "50"), 10);

if (!src) {
  console.error("Usage: npx tsx scripts/dict/pic-probe.ts --src <out/file.jsonl> [--n 50]");
  process.exit(1);
}

const BITMAP_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function countWikimediaBitmaps(query: string): Promise<number> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    query,
  )}&gsrlimit=10&prop=imageinfo&iiprop=mime&format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "japanese-dictation-pic-probe/1.0 (flashcard-dictation; contact@local.dev)",
      },
    });
    if (!res.ok) {
      return 0;
    }
    const data = (await res.json()) as {
      query?: {
        pages?: Record<string, { imageinfo?: Array<{ mime?: string }> }>;
      };
    };

    const pages = Object.values(data.query?.pages ?? {});
    let bitmapCount = 0;
    for (const p of pages) {
      const mime = p.imageinfo?.[0]?.mime;
      if (mime && BITMAP_MIMES.has(mime)) {
        bitmapCount++;
      }
    }
    return bitmapCount;
  } catch (err) {
    console.error(`Error probing "${query}":`, err);
    return 0;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const filePath = path.resolve(src);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim());

  type Answer = { id: number; q: string[] };
  const answers: Answer[] = lines.map((l) => JSON.parse(l) as Answer);

  console.log(`Probing up to ${limitN} words from ${path.basename(filePath)}...`);

  let lowYieldCount = 0;
  let totalPhrasesTested = 0;
  const testedWords = answers.slice(0, limitN);

  for (const item of testedWords) {
    if (!item.q || item.q.length === 0) continue;
    for (const phrase of item.q) {
      totalPhrasesTested++;
      const count = await countWikimediaBitmaps(phrase);
      if (count < 3) {
        lowYieldCount++;
        console.log(`[LOW YIELD] id ${item.id}: "${phrase}" returned only ${count} bitmap results`);
      }
      await sleep(300);
    }
  }

  console.log(
    `Probe complete: tested ${totalPhrasesTested} phrases across ${testedWords.length} words. Low yield (<3 photos): ${lowYieldCount}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
