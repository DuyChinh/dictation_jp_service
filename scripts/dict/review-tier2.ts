/**
 * Questions for the teacher about the tier-2 (common words) translations: the entries the translators flagged
 * as ambiguous, plus a convention question. Entries are given by JMdict id, or by written form when the
 * translator only named the word.
 *
 *   npx tsx scripts/dict/review-tier2.ts [--out ../docs/dict-can-xac-nhan-3.md]
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, type IDictEntry, type IDictVi } from "../../src/models/Dict.js";

const oi = process.argv.indexOf("--out");
const OUT = path.resolve(oi >= 0 ? process.argv[oi + 1]! : "../docs/dict-can-xac-nhan-3.md");

type Item = { id?: number; form?: string; sense?: number; note: string };
const ITEMS: Item[] = [
  { id: 1136470, note: "ヤンマ: tiếng Anh ghi \"lamenting\" nhưng có thể là chuồn chuồn yanma" },
  { id: 1141430, note: "リス: nghĩa \"fracture\" (leo núi) dịch là khe nứt" },
  { id: 1115100, note: "ブンド: \"bond\" có thể là keo dán Bond" },
  { id: 1119340, note: "ベア: nghĩa chưa rõ" },
  { id: 1125050, note: "ポジショニング: nghĩa chưa rõ" },
  { id: 1052750, note: "コントラ: chỉ có nghĩa \"contra\", dịch \"nghịch / đối lập\"" },
  { id: 1051400, note: "コリア: Hàn Quốc / Triều Tiên" },
  { id: 1048620, note: "ゲバリスタ: người theo phái Guevara" },
  { id: 1039420, note: "カント: \"cant\" có thể là Kant" },
  { id: 1038190, note: "カブ: \"cub\"" },
  { id: 1039960, note: "ガウシアン: Gaussian" },
  { id: 1196280, note: "過渡: nghĩa \"crossing, ferry\" lệch với nghĩa thường dùng \"quá độ\"" },
  { id: 1205440, note: "格闘: nghĩa chưa rõ" },
  { id: 1208770, note: "葛: nghĩa 2 chỉ là cây dây leo Trung Quốc" },
  { id: 1322530, note: "煮やす: nghĩa \"to cook inside\" lạ, dịch \"nấu chín bên trong\"" },
  { id: 1315440, sense: 2, note: "慈悲: nghĩa 2 là chim hawk-cuckoo, dịch \"chim cu diều\"" },
  { id: 1324470, sense: 3, note: "寂: nghĩa 3 \"well-trained voice\", dịch \"giọng hát luyện kỹ\"" },
  { id: 1080410, note: "テレスキャン" },
  { id: 1082640, note: "デカルコマニー: \"transfer\" / decalcomania" },
  { id: 1073160, note: "スペンサージャケット" },
  { id: 1348020, note: "小結: komusubi, hạng bốn của lực sĩ sumo" },
  { id: 1358420, note: "食管法: dịch theo từ Nhật \"luật quản lý lương thực\" thay vì \"food quality\" của tiếng Anh" },
  { id: 1363170, sense: 4, note: "真: nghĩa 4 dịch \"lối chữ chân phương\"" },
  { id: 1269730, sense: 3, note: "後手: nghĩa 3 là thuật ngữ cờ gote" },
  { id: 1282320, note: "講談: nghệ thuật kể chuyện kodan" },
  { id: 1280840, note: "絞り: nhiều nghĩa kỹ thuật" },
  { id: 1106980, note: "ピリ: \"hiệp, phần thi đấu\"" },
  { id: 1109190, note: "フィナカップ: cúp FINA" },
  { id: 1111810, note: "フリーター: giữ \"freeter\" kèm giải thích" },
  { id: 1166600, sense: 4, note: "一本: nghĩa 4 \"ippon\", dịch \"điểm trọn (võ thuật)\"" },
  { id: 1164900, sense: 3, note: "一通: nghĩa 3 là thuật ngữ mạt chược" },
  { id: 1181090, sense: 3, note: "横目: nghĩa 3 dịch \"bộ võng (bộ 罒)\"" },
  { id: 1305070, note: "仕手: giữ \"shite\" vai chính kịch Noh và \"người đầu cơ\"" },
  { id: 1306410, note: "刺し: nghĩa \"ống thăm dò gạo\"" },
  { id: 1300990, note: "三振: dịch \"bị loại sau ba lần đánh hụt\"" },
  { id: 1266890, note: "己: đại từ 5 nghĩa" },
  { id: 1264610, note: "限り: 6 nghĩa" },
  { id: 1267770, note: "誇示" },
  { id: 1099580, note: "バムバム: dịch là tên một bài hát pop Nhật" },
  { id: 1098110, note: "バウサイド: \"bow side\" trong chèo thuyền" },
  { id: 1089390, sense: 3, note: "ドロー: nghĩa 3 \"draw (shot)\" dịch theo bi-a, có thể là gôn" },
  { id: 1002530, sense: 3, note: "おでこ: nghĩa 3 \"not catching anything\" (bài), dịch tạm" },
  { id: 1017930, sense: 2, note: "アフター: nghĩa 2, đi chơi ngoài giờ với tiếp viên club" },
  { id: 1013790, sense: 2, note: "アーム: nghĩa 2 \"ARMM\"" },
  { id: 1400500, note: "槍: nghĩa 3-4 mơ hồ, đoán là quân hương xa shogi và \"lời chế giễu chen vào\"" },
  { id: 1418530, sense: 3, note: "炭酸: nghĩa 3 \"baking soda\" dịch \"bột nở\"" },
  { id: 1401220, note: "相槌: giữ phiên âm aizuchi kèm giải thích" },
  { id: 1649190, note: "トゥルー: adj-f \"true\"" },
  { id: 1648540, note: "非常勤: tiếng Anh chỉ ghi \"part-time\", đã thêm \"(nhân viên) hợp đồng\"" },
  { id: 1648690, note: "党議: \"hội nghị đảng\" và \"quyết định của đảng\"" },
  { id: 1555900, note: "瑠璃: nghĩa chim xanh nhỏ" },
  { id: 1544450, note: "余念: \"ý nghĩ khác\", thường dùng trong 余念がない" },
  { id: 1537730, note: "弥生: nghĩa \"cỏ mọc rậm\" hiếm gặp" },
  { id: 2849423, note: "中越: chọn \"Chuetsu (vùng Niigata)\" và \"Trung–Việt\"" },
  { id: 2870837, note: "んす: dịch theo nghĩa のだ của JMdict" },
  { id: 2273360, note: "サーセン: \"xin lỗi (thân mật, suồng sã)\"" },
  { id: 2085020, sense: 3, note: "もどき: nghĩa 3 về nhân vật hài nhại" },
  { id: 2088970, note: "しないのではないか: dịch sát nghĩa tiếng Anh" },
  { id: 2098230, sense: 2, note: "でもある: nghĩa 2 \"…hay gì đó\" chưa chắc" },
  { id: 1462000, note: "二十: dữ liệu lẫn các cách viết số" },
  { id: 1461870, note: "二次: các nghĩa lẫn lộn (thứ hai, thứ cấp, bậc hai, 2D)" },
  { id: 1459640, note: "乍ら: 5 nghĩa ngữ pháp, dịch theo cách dùng quen thuộc" },
  { id: 1580410, sense: 2, note: "上唇: nghĩa 2 \"labrum\" (giải phẫu)" },
  { id: 1601895, sense: 2, note: "必至: nghĩa 2 là thế bắt buộc chiếu hết trong shogi" },
  { id: 1600300, sense: 5, note: "伸び: nghĩa 5 \"nobi\" chuyên ngành" },
  { id: 1632180, note: "とも: nghĩa \"well\" (trợ từ nhấn mạnh), dịch \"ừ thì\", \"vâng\"" },
  { id: 1605860, note: "要約: forms ghi sai cách đọc ようやく nhưng nghĩa là \"tóm tắt\"" },
  { id: 1639840, sense: 1, note: "小口: nghĩa \"tiger's den\" dịch \"hang hổ\"" },
  { form: "淑女", sense: 2, note: "淑女: nghĩa 2 \"(female) pervert\", dịch \"(đùa) phụ nữ biến thái\"" },
  { form: "十両", note: "十両: hạng jūryō, hạng thứ hai trong sumo" },
  { form: "係長", note: "係長: dịch \"tổ trưởng / trưởng nhóm / phó phòng\"" },
  { form: "金縛り", note: "金縛り: nghĩa 1 \"binding hand and foot\", dịch \"trói chặt tay chân\"" },
  { form: "曉星", note: "曉星: nghĩa \"rarity\", dịch \"sao hiếm hoi\"" },
  { form: "丸太", note: "丸太: nghĩa \"dace\" dịch \"cá ugui\"" },
  { form: "義兄", note: "義兄 / 義姉 / 義弟 / 義妹: anh/chị/em rể, dâu... gộp chung vì tiếng Anh không phân biệt" },
  { form: "坊主", sense: 5, note: "坊主: nghĩa 5 lá bài hanafuda tháng 8" },
  { form: "幕府", sense: 3, note: "幕府: nghĩa 3 \"Cận vệ Hoàng gia\"" },
  { form: "愛国", sense: 2, note: "愛国: nghĩa 2 \"Ai-len\", JMdict ghi lạ" },
];

const esc = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const forms = (e: IDictEntry) => [...e.k.filter((k) => !k.g?.length).map((k) => k.t), ...e.r.map((r) => r.t)].slice(0, 3).join("・");

async function main() {
  await connectMongo();
  const out: string[] = [];
  const line = (s = "") => out.push(s);
  line("# Đợt 3: từ thông dụng người dịch không chắc");
  line();
  line(`_Xuất tự động ngày ${new Date().toISOString().slice(0, 10)}. Bản dịch tiếng Việt của khoảng 15.400 từ thông dụng đã nạp xong; đây là các mục người dịch (AI) đã báo là mơ hồ, đa số là chỗ dữ liệu JMdict gốc lạ hoặc thuật ngữ chuyên ngành (sumo, cờ shogi, mạt chược…)._`);
  line();
  line("Giáo sư ghi nghĩa tiếng Việt đúng vào cột **Xác nhận** (hoặc \"ok\" nếu bản dịch đã đúng, hoặc \"bỏ\" nếu mục này không nên hiện cho người học).");
  line();
  line("| # | Từ | Nghĩa gốc (JMdict, tiếng Anh) | Bản dịch hiện tại | Ghi chú của người dịch | Xác nhận |");
  line("|---|---|---|---|---|---|");
  let n = 0;
  const rowIds: number[] = [];
  for (const it of ITEMS) {
    const e = it.id
      ? await DictEntry.findById(it.id).lean<IDictEntry>()
      : await DictEntry.findOne({ keys: it.form }).sort({ w: -1, _id: 1 }).lean<IDictEntry>();
    if (!e) continue;
    const v = await DictVi.findById(e._id).lean<IDictVi>();
    const idx = it.sense ? [it.sense - 1] : e.s.map((_, i) => i).slice(0, 6);
    const en = idx.map((i) => `(${i + 1}) ${(e.s[i]?.g ?? []).slice(0, 3).join("; ")}`).join(" ");
    const vi = idx.map((i) => `(${i + 1}) ${(v?.s[i] ?? []).join("; ")}`).join(" ");
    rowIds.push(e._id);
    line(`| ${++n} | ${esc(forms(e))} | ${esc(en)} | ${esc(vi)} | ${esc(it.note)} | |`);
  }
  line();
  line("## Quy ước");
  line();
  line("Nhiều từ mượn tiếng Anh và tên riêng được giữ nguyên dạng quốc tế trong bản dịch (Singapore, Chicago, hormone, plasma, virus, Excel…) vì tiếng Việt dùng đúng dạng đó. Giáo sư thấy từ nào nên đổi sang cách đọc / viết tiếng Việt thì ghi lại, hoặc cho biết quy ước chung (ví dụ giữ dạng quốc tế với tên riêng, phiên âm kiểu Việt với từ phổ thông như *vi-rút*).");
  line();
  // row number → JMdict id, so a teacher's answers can be applied later (scripts/dict/apply-tier2.ts)
  fs.writeFileSync(path.resolve(".work/dict/vi/review3-ids.json"), JSON.stringify(rowIds));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`[review] wrote ${OUT}: ${n} entries`);
  await disconnectMongo();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
