/**
 * Second round of questions for the teacher: Hán Việt readings of the next most frequent kanji, and the
 * words translated or reworded by us after the first round.
 *
 *   npx tsx scripts/dict/review-next.ts [--out ../docs/dict-can-xac-nhan-2.md]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictKanji, DictVi, type IDictEntry, type IDictKanji, type IDictVi } from "../../src/models/Dict.js";

const oi = process.argv.indexOf("--out");
const OUT = path.resolve(oi >= 0 ? process.argv[oi + 1]! : "../docs/dict-can-xac-nhan-2.md");
const done = new Set(Object.keys(JSON.parse(fs.readFileSync(new URL("./data/hanviet.json", import.meta.url), "utf8"))));

/** Added after the first round without a teacher's answer (new JLPT entries) or reworded from his notes. */
const NEW_WORDS = [1000580, 1050390, 1123880, 1128430, 1310740, 1046190, 1059720, 1195660];
const REWORDED: Array<{ id: number; ask: string }> = [
  { id: 1921990, ask: "玉 nghĩa (5) geisha: mình bỏ \"kỹ nữ Nhật\" (dễ hiểu nhầm) và để \"geisha / nghệ giả\"; nghĩa (3)–(6) viết lại theo ghi chú của giáo sư. Có ổn không?" },
  { id: 2764440, ask: "華奢 かしゃ: gắn nhãn (từ cổ); còn きゃしゃ (mảnh mai) là mục chính, xem mục A1 bên dưới." },
  { id: 2826481, ask: "予言 かねごと: \"(từ cổ) lời hứa trước; lời hẹn ước; lời tiên đoán\" có đúng thứ tự không?" },
  { id: 2836694, ask: "傑: \"(hậu tố sau số đếm) người kiệt xuất; gương mặt xuất sắc nhất (ví dụ: thập kiệt, top 10)\" có ổn không?" },
  { id: 1295510, ask: "細い: đã ẩn nghĩa (2) \"unlucky\" khỏi trang. Có cần ghi chú gì không?" },
  { id: 1365850, ask: "辛い からい: nghĩa (4) có chú thích \"thường đọc là つらい…\" ở cuối. Câu chú thích này đã đúng chưa?" },
];

const esc = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const forms = (e: IDictEntry) => [...e.k.filter((k) => !k.g?.length).map((k) => k.t), ...e.r.map((r) => r.t)].slice(0, 4).join("・");

async function main() {
  await connectMongo();
  const out: string[] = [];
  const line = (s = "") => out.push(s);

  line("# Đợt 2: các mục cần giáo sư xác nhận cho từ điển Nhật – Việt");
  line();
  line(`_Xuất tự động ngày ${new Date().toISOString().slice(0, 10)}. Đợt 1 đã được áp dụng; đây là phần còn lại._`);
  line();

  // ---- A. Hán Việt ----
  const kanji = (await DictKanji.find({}).lean<IDictKanji[]>())
    .filter((k) => !done.has(k._id) && k.hv.length > 1 && ((k.fq ?? 99999) <= 2500 || k.l))
    .sort((a, b) => (a.fq ?? 99999) - (b.fq ?? 99999));
  line("## A. Âm Hán Việt (đợt tiếp theo)");
  line();
  line(`${kanji.length} chữ thông dụng (nằm trong 2.500 chữ thường gặp nhất trên báo, hoặc có trong danh sách kanji JLPT) mà dữ liệu hiện liệt kê nhiều âm, có lẫn âm Nôm. Cách làm giống đợt 1: ghi **âm Hán Việt chuẩn đứng đầu**, giữ âm thứ hai nếu chữ đa âm có nghĩa khác nhau phổ biến, bỏ âm Nôm. Chữ nào để nguyên thì ghi "ok".`);
  line();
  line("| # | Chữ | Âm hiện có | Nghĩa (EN) | Âm chuẩn |");
  line("|---|---|---|---|---|");
  kanji.forEach((k, i) => line(`| ${i + 1} | ${k._id} | ${esc(k.hv.join(" / "))} | ${esc(k.m.slice(0, 3).join(", "))} | |`));
  line();

  // ---- B. new words ----
  line("## B. Từ mới dịch sau đợt 1");
  line();
  line("Các mục JLPT này mới được gắn nhãn sau khi sửa danh sách trỏ nhầm (đợt 1, mục B) nên chưa được giáo sư xem bản dịch.");
  line();
  line("| # | Từ | Nghĩa gốc (JMdict) | Bản dịch hiện tại | Xác nhận |");
  line("|---|---|---|---|---|");
  let n = 0;
  for (const id of NEW_WORDS) {
    const e = await DictEntry.findById(id).lean<IDictEntry>();
    const v = await DictVi.findById(id).lean<IDictVi>();
    if (!e) continue;
    const en = e.s.map((s, i) => `(${i + 1}) ${s.g.slice(0, 3).join("; ")}`).join(" ");
    const vi = e.s.map((_, i) => `(${i + 1}) ${(v?.s[i] ?? []).join("; ")}`).join(" ");
    line(`| ${++n} | ${esc(forms(e))} | ${esc(en)} | ${esc(vi)} | |`);
  }
  line();

  // ---- C. reworded ----
  line("## C. Mục mình viết lại theo ghi chú của giáo sư");
  line();
  line("| # | Từ | Bản dịch hiện tại | Câu hỏi | Xác nhận |");
  line("|---|---|---|---|---|");
  n = 0;
  for (const r of REWORDED) {
    const e = await DictEntry.findById(r.id).lean<IDictEntry>();
    const v = await DictVi.findById(r.id).lean<IDictVi>();
    if (!e) continue;
    const vi = e.s.map((_, i) => (v?.hs?.includes(i) ? `(${i + 1}) [đã ẩn]` : `(${i + 1}) ${(v?.s[i] ?? []).join("; ")}`)).join(" ");
    line(`| ${++n} | ${esc(forms(e))} | ${esc(vi)} | ${esc(r.ask.replace("きゃしゃ", "きゃしゃ"))} | |`);
  }
  line();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`[review] wrote ${OUT}: ${kanji.length} kanji, ${NEW_WORDS.length} new words, ${REWORDED.length} reworded`);
  await disconnectMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
