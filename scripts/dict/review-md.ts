/**
 * Write the list of things a Japanese teacher should confirm: odd dictionary entries, JLPT list mix-ups,
 * example sentences the translators doubted, and the Hán Việt reading to show first for common kanji.
 *
 *   npx tsx scripts/dict/review-md.ts [--out ../docs/dict-can-xac-nhan.md] [--src .work/dict/vi]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictKanji, DictVi, type IDictEntry, type IDictKanji, type IDictVi } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};
const OUT = path.resolve(opt("--out", "../docs/dict-can-xac-nhan.md"));
const SRC = path.resolve(opt("--src", ".work/dict/vi"));

/** Entries the translators were unsure of: JMdict id (or kanji + reading), the sense number, the question. */
const WORDS: Array<{ id?: number; kanji?: string; reading?: string; sense?: number; ask: string }> = [
  { id: 1098390, sense: 2, ask: "バス nghĩa thứ 2 trong JMdict cũng ghi \"bus\"; đây có phải bus trong máy tính / điện (đường truyền dữ liệu) không?" },
  { id: 1120990, sense: 2, ask: "ペット nghĩa \"trumpet\" (kèn trompet): có thật là cách dùng này không, hay JMdict ghi nhầm?" },
  { id: 1001140, sense: 4, ask: "ええ: nghĩa \"grrr / gah / must I?\" nên dịch thế nào cho tự nhiên?" },
  { id: 1001140, sense: 5, ask: "ええ: nghĩa adj-f \"good\" (phương ngữ của いい) có nên giữ trong từ điển cho người học không?" },
  { id: 1921990, sense: 3, ask: "玉 (ぎょく): các nghĩa chứng khoán / geisha (tiền gọi theo giờ) dịch có chuẩn thuật ngữ không?" },
  { id: 2796690, ask: "地方 đọc là じかた: nghĩa múa Nhật / kịch Nô; dịch thuật ngữ có đúng không?" },
  { id: 2826481, ask: "予言 đọc là かねごと (\"lời hứa / lời tiên đoán\"): thứ tự nghĩa đã hợp lý chưa? Cách đọc phổ biến là よげん." },
  { id: 2764440, ask: "華奢 đọc là かしゃ (\"xa hoa, lòe loẹt\"); nghĩa phổ biến きゃしゃ (mảnh mai) có là mục riêng không, và mục này có nên hiện cho người học?" },
  { id: 2859682, sense: 2, ask: "怒る (いかる) nghĩa \"to be angular/square\" (gồ lên, góc cạnh): nghĩa hiếm, dịch có đúng không?" },
  { id: 2810460, sense: 2, ask: "一目 (いちもく) nghĩa \"one stone\": có phải một quân cờ vây không?" },
  { id: 2836694, ask: "傑: chỉ là từ đếm / hậu tố, khó dịch thành nghĩa tự nhiên. Nên ghi chú thế nào?" },
  { id: 2220320, ask: "箇: từ đếm / hậu tố; cách trình bày nghĩa có ổn không?" },
  { id: 1690070, ask: "捕吏 đọc ほり: cách đọc có đúng không (thường là とりかた/ほり?). Dịch \"cảnh binh / sai nha\" ổn không?" },
  { id: 1702340, ask: "土産 đọc どさん: nghĩa \"sản vật địa phương\" có đúng không? (thường đọc みやげ = quà lưu niệm)" },
  { kanji: "鉄片", reading: "てっぺん", ask: "鉄片 đọc てっぺん: cách đọc lệch với nghĩa thông dụng, xin xác nhận." },
  { kanji: "丁々", reading: "とうとう", ask: "丁々 đọc とうとう: từ tượng thanh (tiếng chặt rìu): dịch có tự nhiên không?" },
  { kanji: "利根", reading: "りこん", ask: "利根 đọc りこん: \"thông minh, năng khiếu\": cách đọc và nghĩa có đúng không?" },
  { id: 1177800, ask: "遠い có nghĩa \"nearsighted\" (nhìn kém) trong JMdict: có thực sự là một nghĩa của 遠い không?" },
  { id: 1295510, ask: "細い có nghĩa \"unlucky\" (kém may mắn) trong JMdict: có đúng không?" },
  { id: 1365850, ask: "辛い (からい) có nghĩa \"painful/difficult\"; thường là つらい, mục này có bị gán nhầm không?" },
  { id: 1550190, sense: 6, ask: "裏 nghĩa thứ 6 \"proof\": nghĩa này là gì và dịch \"bằng chứng, chứng cứ\" có đúng không?" },
  { id: 1554820, sense: 5, ask: "力 nghĩa thứ 5 (quyền lực, thế lực, ảnh hưởng, uy tín): dịch có ổn không?" },
];

const esc = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const formsOf = (e: IDictEntry) => [...e.k.filter((k) => !k.g?.length).map((k) => k.t), ...e.r.map((r) => r.t)].slice(0, 4).join("・");

async function main() {
  await connectMongo();
  const out: string[] = [];
  const line = (s = "") => out.push(s);

  line("# Các mục cần giáo sư xác nhận cho từ điển Nhật – Việt");
  line();
  line(`_Xuất tự động ngày ${new Date().toISOString().slice(0, 10)}. Nghĩa tiếng Việt và câu ví dụ được AI dịch; các mục dưới đây là chỗ người dịch không chắc hoặc dữ liệu gốc (JMdict, danh sách JLPT, Tatoeba) có vẻ lạ._`);
  line();
  line("Cách dùng: mỗi bảng có cột **Câu hỏi**; giáo sư ghi đáp án vào cột **Xác nhận** (hoặc trả lời riêng theo số thứ tự). Sau khi có đáp án mình sẽ sửa vào dữ liệu và đánh dấu là `reviewed`.");
  line();

  // ---- A. words ----
  line("## A. Mục từ có nghĩa / cách đọc lạ");
  line();
  line("| # | Từ | Cách đọc | Nghĩa gốc (JMdict, tiếng Anh) | Bản dịch hiện tại | Câu hỏi | Xác nhận |");
  line("|---|---|---|---|---|---|---|");
  let n = 0;
  for (const w of WORDS) {
    const entry = w.id
      ? await DictEntry.findById(w.id).lean<IDictEntry>()
      : await DictEntry.findOne({ keys: w.kanji, "r.t": w.reading }).lean<IDictEntry>();
    if (!entry) continue;
    const vi = await DictVi.findById(entry._id).lean<IDictVi>();
    const idx = w.sense ? [w.sense - 1] : entry.s.map((_, i) => i);
    const en = idx.map((i) => `(${i + 1}) ${entry.s[i]?.g.join("; ")}`).join(" ");
    const vn = idx.map((i) => `(${i + 1}) ${(vi?.s[i] ?? []).join("; ")}`).join(" ");
    line(`| ${++n} | ${esc(formsOf(entry))} | ${esc(entry.r[0]?.t)} | ${esc(en)} | ${esc(vn)} | ${esc(w.ask)} | |`);
  }
  line();

  // ---- B. JLPT list mix-ups ----
  const movedFile = path.join(SRC, "..", "jlpt-moved.json");
  const moved: Array<[number, number]> = fs.existsSync(movedFile) ? JSON.parse(fs.readFileSync(movedFile, "utf8")) : [];
  if (moved.length) {
    line("## B. Danh sách JLPT trỏ nhầm sang từ khác");
    line();
    line("Danh sách từ vựng JLPT (Jonathan Waller) có một số dòng mà mã mục JMdict trỏ sang một từ khác hoặc một từ đồng âm hiếm (ví dụ グッド bị trỏ vào ぐっと, コップ vào nghĩa \"cảnh sát\"). Hệ thống đã chuyển cấp độ JLPT sang mục thông dụng khớp cả cách đọc lẫn cách viết. Xin giáo sư xác nhận cột thứ hai là mục **đúng**.");
    line();
    line("| # | Danh sách trỏ tới (đã bỏ nhãn JLPT) | Chuyển sang (đang gắn nhãn JLPT) | Xác nhận |");
    line("|---|---|---|---|");
    let m = 0;
    for (const [from, to] of moved) {
      const [a, b] = await Promise.all([DictEntry.findById(from).lean<IDictEntry>(), DictEntry.findById(to).lean<IDictEntry>()]);
      if (!a || !b) continue;
      const g = (e: IDictEntry) => `${formsOf(e)}: ${e.s[0]?.g.slice(0, 2).join("; ")}`;
      line(`| ${++m} | ${esc(g(a))} | ${esc(g(b))} | |`);
    }
    line();
  }

  // ---- C. flagged example sentences ----
  const flagFile = path.join(SRC, "flags.jsonl");
  const flags = fs.existsSync(flagFile)
    ? fs.readFileSync(flagFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { forms: string[]; ja: string; en: string; vi: string; kind: string; why: string })
    : [];
  const checks = flags.filter((f) => f.kind === "check");
  const hides = flags.filter((f) => f.kind === "hide");
  line("## C. Câu ví dụ nghi ngờ (từ Tatoeba)");
  line();
  line(`Có ${checks.length} câu người dịch thấy tiếng Nhật chưa tự nhiên / có thể sai, hoặc bản tiếng Anh lệch nghĩa. Giáo sư chọn: **giữ**, **sửa** (ghi câu đúng) hoặc **bỏ**.`);
  line();
  if (checks.length) {
    line("| # | Từ | Câu tiếng Nhật | Tiếng Anh (gốc) | Tiếng Việt (AI dịch) | Lý do nghi ngờ | Giữ / sửa / bỏ |");
    line("|---|---|---|---|---|---|---|");
    checks.forEach((f, i) => line(`| ${i + 1} | ${esc(f.forms.join("・"))} | ${esc(f.ja)} | ${esc(f.en)} | ${esc(f.vi)} | ${esc(f.why)} | |`));
    line();
  }
  line(`### Câu đã ẩn khỏi trang vì không phù hợp (${hides.length})`);
  line();
  line("Các câu này (nội dung tục tĩu, bạo lực, nhạy cảm…) không hiển thị trên trang. Liệt kê để giáo sư biết; nếu thấy câu nào bị ẩn oan, ghi số thứ tự.");
  line();
  if (hides.length) {
    line("| # | Từ | Câu tiếng Nhật | Lý do ẩn |");
    line("|---|---|---|---|");
    hides.forEach((f, i) => line(`| ${i + 1} | ${esc(f.forms.join("・"))} | ${esc(f.ja)} | ${esc(f.why)} |`));
    line();
  }

  // ---- D. Hán Việt ----
  const kanji = await DictKanji.find({ fq: { $lte: 500 }, "hv.1": { $exists: true } }).sort({ fq: 1 }).lean<IDictKanji[]>();
  line("## D. Âm Hán Việt nào hiển thị đầu tiên");
  line();
  line(`Dữ liệu KANJIDIC2 liệt kê nhiều âm cho một chữ, có lẫn âm Nôm / âm cổ, và âm đầu tiên đôi khi không phải âm Hán Việt chuẩn (ví dụ 読 hiện \"Đậu / Độc\"). Dưới đây là ${kanji.length} chữ thông dụng nhất có nhiều hơn một âm. Xin giáo sư ghi **âm chuẩn** (hoặc gạch bỏ âm không phải Hán Việt).`);
  line();
  line("| # | Chữ | Âm hiện có (theo thứ tự đang hiển thị) | Nghĩa (EN) | Âm chuẩn |");
  line("|---|---|---|---|---|");
  kanji.forEach((k, i) => line(`| ${i + 1} | ${k._id} | ${esc(k.hv.join(" / "))} | ${esc(k.m.slice(0, 3).join(", "))} | |`));
  line();

  // ---- E. conventions ----
  line("## E. Quy ước dịch cần thống nhất");
  line();
  line("1. **Từ mượn / từ văn hóa Nhật**: hiện giữ phiên âm kèm giải thích (udon, samurai, ikebana, shogi, tokonoma, Shinkansen…); từ mượn đã quen thì giữ nguyên (fax, menu, haiku). Có muốn đổi quy ước này không?");
  line("2. **Nhãn sắc thái**: dùng *(tôn kính)*, *(khiêm nhường)*, *(thân mật)*, *(thô)*, *(văn viết)*, *(khẩu ngữ)* trong ngoặc trước nghĩa. Danh sách này đã đủ và đúng thuật ngữ chưa?");
  line("3. **Tên riêng / địa danh**: giữ tên quen thuộc trong tiếng Việt (Tokyo, núi Phú Sĩ, Okinawa). Có muốn dùng tên Hán Việt (Đông Kinh…) cho một số tên không?");
  line("4. **Từ Hán Việt vs thuần Việt**: ưu tiên cách nói tự nhiên (学校 → trường học). Với các từ Hán Việt phổ biến như 勉強 (học tập), có nên đặt Hán Việt lên đầu không?");
  line();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`[review] wrote ${OUT}: ${n} words, ${moved.length} moved, ${checks.length} checks, ${hides.length} hidden, ${kanji.length} kanji`);
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
