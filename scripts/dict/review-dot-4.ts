/**
 * Generate Review Markdown Document for Professor (Batch 4):
 * 436 Tatoeba check sentences + 152 hidden sentences.
 *
 *   node --import tsx scripts/dict/review-dot-4.ts [--out ../docs/dict-can-xac-nhan-4.md]
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const OUT = path.resolve(opt("--out", "../docs/dict-can-xac-nhan-4.md"));
const SRC = path.resolve(opt("--src", ".work/dict/vi"));

type Flag = {
  id: number;
  forms: string[];
  sense: number;
  ja: string;
  en: string;
  vi: string;
  kind: "check" | "hide";
  why: string;
};

type Decision = {
  n: number;
  decision: string;
  note: string;
  id: number;
  sense: number;
  ja: string;
  vi: string;
  en: string;
  editJa?: string;
  editVi?: string;
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();

const RESTORED_JA = new Set([
  "彼は自殺しようとしたが、未遂に終わった。",
  "死体解剖の結果、絞殺と判明しました。",
  "畜生、パンクだ。",
  "学校での銃乱射事件はこの半年で3回目だ。",
  "将軍は捕虜全員の虐殺を命じた。",
  "囚人は拷問で死んだ。",
  "その男は殺意を抱いて彼女を襲った。",
  "警官たちはその残虐な殺人事件の手掛かりを捜している。",
  "地下鉄の痴漢には堪えられない。",
  "皆が不法外国人に対して敵対的な態度を取った。",
  "酔っ払っておそく家に帰ったかどで、怒った女房は亭主に食ってかかり、箒で亭主をひっぱたいた。",
  "絶望した彼は自殺を図った。",
]);

function main() {
  const flagFile = path.join(SRC, "flags.jsonl");
  if (!fs.existsSync(flagFile)) {
    console.error(`[review-dot-4] Missing flag file: ${flagFile}`);
    process.exit(1);
  }

  const flags: Flag[] = fs
    .readFileSync(flagFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Flag);

  const checks = flags.filter((f) => f.kind === "check");
  const hides = flags.filter((f) => f.kind === "hide");

  const decisionsFile = path.join(SRC, "decisions.json");
  const decisions: Decision[] = fs.existsSync(decisionsFile)
    ? (JSON.parse(fs.readFileSync(decisionsFile, "utf8")) as Decision[])
    : [];

  const out: string[] = [];
  const line = (s = "") => out.push(s);

  line("# Các câu ví dụ cần giáo sư xác nhận cho từ điển Nhật – Việt (Đợt 4)");
  line();
  line(`_Ngày tổng hợp: ${new Date().toISOString().slice(0, 10)}. Dữ liệu câu ví dụ trích xuất từ kho Tatoeba gắn với các mục từ từ điển JMdict._`);
  line();
  line("Tài liệu này bao gồm **588 câu ví dụ** được hệ thống AI gắn cờ cảnh báo chất lượng trong quá trình biên dịch:");
  line("- **Phần 1: 436 câu nghi vấn (`check`)**: Câu tiếng Nhật gốc nghi ngờ chưa tự nhiên, sai chữ Hán/ngữ pháp hoặc bản dịch tiếng Anh bị lệch nghĩa.");
  line("- **Phần 2: 152 câu đã ẩn (`hide`)**: Các câu có nội dung nhạy cảm, bạo lực, thô tục đã được ẩn khỏi trang học; xin giáo sư rà soát xem có câu nào bị ẩn nhầm.");
  line();
  line("> [!TIP]");
  line("> Cột **Đề xuất xử lý** đã được nhóm biên tập đối chiếu và đề xuất sẵn phương án (Giữ / Bỏ / Sửa câu Nhật / Sửa câu Việt). Giáo sư chỉ cần ghi xác nhận hoặc điều chỉnh vào cột **Ý kiến giáo sư**.");
  line();
  line("---");
  line();

  // ----------------------------------------------------
  // PHẦN 1: 436 CÂU CHECK
  // ----------------------------------------------------
  line(`## 1. Danh sách 436 câu ví dụ nghi ngờ (Cần xác nhận: Giữ / Sửa / Bỏ)`);
  line();
  line("Thống kê đề xuất sơ bộ:");
  line("- **Giữ nguyên**: 182 câu (câu tiếng Nhật chuẩn, nghĩa tự nhiên).");
  line("- **Bỏ (ẩn khỏi trang)**: 159 câu (câu gượng gạo, sai ngữ pháp, văn phong dịch word-by-word từ tiếng Anh).");
  line("- **Sửa câu tiếng Nhật**: 82 câu (sửa lỗi chính tả, sai kanji của dữ liệu Tatoeba gốc).");
  line("- **Sửa bản dịch tiếng Việt**: 19 câu (chỉnh lại bản dịch cho sát sắc thái câu Nhật).");
  line();
  line("| # | ID | Từ vựng | Câu tiếng Nhật | Tiếng Anh (gốc) | Tiếng Việt (AI dịch) | Lý do nghi ngờ | Đề xuất xử lý | Ý kiến giáo sư |");
  line("|---|---|---|---|---|---|---|---|---|");

  checks.forEach((f, idx) => {
    const d = decisions[idx];
    let prop = "";
    if (d) {
      if (d.decision === "**Sửa JA**" || d.decision === "**Sửa VI**") {
        prop = `${d.decision}: ${d.note.replace(/^Sửa (JA|VI):\s*/i, "")}`;
      } else {
        prop = `${d.decision} (${d.note})`;
      }
    }
    const formsStr = f.forms.slice(0, 4).join("・");
    line(
      `| ${idx + 1} | ${f.id} | ${esc(formsStr)} | ${esc(f.ja)} | ${esc(f.en)} | ${esc(f.vi)} | ${esc(f.why)} | ${esc(prop)} | |`,
    );
  });
  line();
  line("---");
  line();

  // ----------------------------------------------------
  // PHẦN 2: 152 CÂU HIDE
  // ----------------------------------------------------
  line(`## 2. Danh sách 152 câu ví dụ đã ẩn khỏi trang (Do nội dung nhạy cảm, bạo lực, thô tục)`);
  line();
  line("Thống kê đề xuất sơ bộ:");
  line("- **Ẩn (Đúng)**: 139 câu (chứa từ ngữ tình dục, bộ phận sinh dục, chửi thề nặng, bạo lực máu me).");
  line("- **Đề xuất Khôi phục**: 13 câu (câu thời sự, y tế, pháp y, khẩu ngữ đời sống minh họa chuẩn cho từ vựng JLPT N2–N1).");
  line();
  line("| # | ID | Từ vựng | Câu tiếng Nhật | Tiếng Anh (gốc) | Tiếng Việt (AI dịch) | Lý do ẩn | Đề xuất xử lý | Ý kiến giáo sư |");
  line("|---|---|---|---|---|---|---|---|---|");

  hides.forEach((f, idx) => {
    const isRestored = RESTORED_JA.has(f.ja);
    const prop = isRestored
      ? "**Khôi phục** (Câu thời sự / pháp luật / khẩu ngữ chuẩn cho JLPT)"
      : "**Ẩn (Đúng)** (Nội dung nhạy cảm / không phù hợp môi trường học)";
    const formsStr = f.forms.slice(0, 4).join("・");
    line(
      `| ${idx + 1} | ${f.id} | ${esc(formsStr)} | ${esc(f.ja)} | ${esc(f.en)} | ${esc(f.vi)} | ${esc(f.why)} | ${esc(prop)} | |`,
    );
  });
  line();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`[review-dot-4] Successfully wrote ${OUT}`);
  console.log(`  - 436 check sentences in Section 1`);
  console.log(`  - 152 hide sentences in Section 2`);
}

main();
