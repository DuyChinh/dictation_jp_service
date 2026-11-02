/**
 * Apply a teacher's answers to the tier-2 questions (written by scripts/dict/review-tier2.ts): row number →
 * JMdict id comes from .work/dict/vi/review3-ids.json. Idempotent; never touches JMdict itself.
 *
 *   npx tsx scripts/dict/apply-tier2.ts [--dry]
 */
import fs from "node:fs";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, type IDictEntry, type IDictVi } from "../../src/models/Dict.js";
import { glossTokens } from "../../src/modules/dict/kana.js";

const DRY = process.argv.includes("--dry");

/** Rows answered "Bỏ" for the whole entry (rare, specialist or junk data). */
const HIDE_ENTRY = [1, 2, 3, 8, 18, 19, 20, 28, 39, 40];
/** Rows where only some senses are taken down (1-based). */
const HIDE_SENSES: Record<number, number[]> = {
  12: [1], 16: [2], 31: [3], 32: [3], 34: [1], 42: [3], 44: [2], 45: [3, 4], 51: [4, 5], 53: [3], 59: [2],
  63: [2], 65: [5], 68: [4], 69: [2], 73: [2, 3, 4], 75: [5], 76: [3], 77: [2],
};
/** Rows whose Vietnamese the teacher rewrote: row → sense (1-based) → meanings. */
const VI_EDITS: Record<number, Record<number, string[]>> = {
  9: { 1: ["Kant (triết gia)", "độ nghiêng (mặt đường, đường ray)"] },
  10: { 1: ["thú con (sói, gấu, sư tử)", "hướng đạo sinh nhi đồng (Cub Scout)"] },
  15: { 1: ["(trong cụm 業を煮やす) tức lộn ruột; mất kiên nhẫn"] },
  24: { 3: ["(cờ vây, shogi) nước đi sau; thế bị động (như 後手に回る = rơi vào thế bị động)"] },
  41: { 3: ["cú đánh xoáy lùi (bi-a)", "cú đánh bóng lượn (golf)"] },
  46: { 3: ["(cũ / viết tắt) muối natri cacbonat", "bột baking soda (重曹)"] },
  55: { 1: ["(khẩu ngữ) là vì ...", "lý do là ...", "sự thật là ...", "giải thích là ..."] },
  58: { 1: ["tôi nghĩ (cái gì đó) sẽ không…", "có lẽ không phải là…", "chẳng phải là không ~ hay sao", "có lẽ là sẽ không ~"] },
  68: { 2: ["số lượng nhỏ", "khoản nhỏ", "số tiền nhỏ", "(kinh tế) giao dịch lẻ (小口現金, 小口取引)"] },
};
/** The common word the teacher pointed to when rejecting a rare homograph (リス → con sóc). */
const ADD_WORDS: Array<{ id: number; vi: string[][] }> = [{ id: 1246890, vi: [["con sóc"]] }];

async function main() {
  const ids: number[] = JSON.parse(fs.readFileSync(".work/dict/vi/review3-ids.json", "utf8"));
  await connectMongo();
  const docs = new Map<number, IDictVi>();
  const load = async (id: number) => {
    let d = docs.get(id);
    if (!d) {
      d = (await DictVi.findById(id).lean<IDictVi>()) ?? { _id: id, s: [], t: [], src: "ai" };
      docs.set(id, d);
    }
    return d;
  };
  const entryOf = (row: number) => DictEntry.findById(ids[row - 1]).lean<IDictEntry>();

  // every row was read by the teacher
  for (const id of ids) (await load(id)).src = "reviewed";

  for (const row of HIDE_ENTRY) {
    const e = await entryOf(row);
    if (e) (await load(e._id)).hs = e.s.map((_, i) => i);
  }
  for (const [rowStr, senses] of Object.entries(HIDE_SENSES)) {
    const d = await load(ids[Number(rowStr) - 1]!);
    d.hs = [...new Set([...(d.hs ?? []), ...senses.map((s) => s - 1)])];
  }
  for (const [rowStr, senses] of Object.entries(VI_EDITS)) {
    const d = await load(ids[Number(rowStr) - 1]!);
    for (const [sense, vi] of Object.entries(senses)) d.s[Number(sense) - 1] = vi;
    d.t = [...new Set(d.s.flat().flatMap(glossTokens))];
  }
  for (const w of ADD_WORDS) {
    const d = await load(w.id);
    d.s = w.vi;
    d.t = [...new Set(w.vi.flat().flatMap(glossTokens))];
    d.src = "reviewed";
  }

  console.log(`[review] ${HIDE_ENTRY.length} entries taken down, ${Object.keys(HIDE_SENSES).length} entries lose senses, ${Object.keys(VI_EDITS).length} rewritten, ${ADD_WORDS.length} added; ${docs.size} words touched`);
  if (!DRY) {
    await DictVi.bulkWrite(
      [...docs.values()].map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false },
    );
    console.log("[review] saved");
  }
  await disconnectMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
