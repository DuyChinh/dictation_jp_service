/**
 * Apply a teacher's answers (docs/k_t_qu_x_c_nh_n_t_i_n_nh_t_vi_t_b_n_t_ng_h_p_2026_11_02.md, answering docs/dict-can-xac-nhan.md):
 * corrected word meanings, example decisions (drop / correct / keep) and the 12 restored sentences.
 * Idempotent. Hán Việt answers live in scripts/dict/data/hanviet.json and are applied by import.ts.
 *
 *   npx tsx scripts/dict/apply-review.ts [--decisions .work/dict/vi/decisions.json] [--dry]
 *
 * decisions.json: [{ n, decision, note, id, sense, ja, vi }] — one row per flagged example, in the order of §C.
 */
import fs from "node:fs";
import path from "node:path";
import { connectMongo, disconnectMongo } from "../../src/database/mongo.js";
import { DictEntry, DictVi, type IDictEntry, type IDictVi } from "../../src/models/Dict.js";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const di = args.indexOf("--decisions");
const DECISIONS = path.resolve(di >= 0 ? args[di + 1]! : ".work/dict/vi/decisions.json");

/** New Vietnamese for specific senses (1-based) of entries the teacher answered about. */
const WORD_EDITS: Record<number, Record<number, string[]>> = {
  1120990: { 2: ["(nhạc, viết tắt) kèn trompet"] },
  1001140: { 4: ["ơ kìa", "hả (khó chịu)", "lại phải làm sao", "chán thế"], 5: ["(phương ngữ Kansai) tốt", "được"] },
  1921990: {
    3: ["lô chứng khoán hoặc hàng hóa đang giao dịch", "hàng đang mua bán"],
    4: ["vị thế giao dịch (tài chính: lượng chứng khoán đang nắm giữ hoặc đang nợ; như 建玉 = vị thế mở)"],
    5: ["geisha", "nghệ giả"],
    6: ["tiền giờ gọi geisha (玉代)", "phí gọi geisha tính theo giờ"],
  },
  2826481: { 1: ["(từ cổ) lời hứa trước", "lời hẹn ước", "lời tiên đoán"] },
  2764440: { 1: ["(từ cổ) xa hoa", "phù phiếm", "sang trọng", "lòe loẹt"] },
  2836694: { 1: ["(hậu tố sau số đếm) người kiệt xuất", "gương mặt xuất sắc nhất (ví dụ: thập kiệt, top 10)"] },
  1702340: { 2: ["quà lưu niệm (thường đọc là みやげ)", "quà (mang về)", "đồ lưu niệm"] },
  1177800: { 6: ["nhìn gần kém", "lão thị (trong cụm 目が遠い)"] },
  1365850: { 4: ["đau đớn", "cay đắng", "khó khăn", "vất vả", "(thường đọc là つらい; đọc là からい trong một số quán dụng ngữ như 辛い目にあう)"] },
};
/** Senses taken down because the teacher found them wrong or misleading (1-based). */
const HIDE_SENSES: Record<number, number[]> = { 1295510: [2] };
/** Entries the teacher answered about (any answer), so they count as reviewed. */
const REVIEWED_IDS = [1098390, 1120990, 1001140, 1921990, 2796690, 2826481, 2764440, 2859682, 2810460, 2836694, 2220320, 1690070, 1702340, 1177800, 1295510, 1365850, 1550190, 1554820];
const REVIEWED_FORMS: Array<[string, string]> = [["鉄片", "てっぺん"], ["丁々", "とうとう"], ["利根", "りこん"]];

/** Vietnamese the teacher rewrote or annotated, by row number of §C. */
const VI_EDITS: Record<number, string> = {
  1: "Nếu là cái đó (người đó) thì chắc chắn ổn rồi!",
  35: "Hãy cất cuốn sách đó về chỗ cũ (phương ngữ Kansai).",
  61: "Tôi làm há cảo ở nhà, nhưng có lẽ vì vỏ bánh hơi ít nên nhân bị thừa một chút.",
  67: "Nếu bát bị ném tới thì hãy đỡ bằng bông (lấy sự mềm mỏng để hóa giải cơn giận).",
  96: "Nếu cửa sổ kín khí kém thì sẽ đọng hơi nước thành giọt.",
  97: "Quán ăn đó sử dụng bát đĩa gốm sứ.",
  128: "Nước bọt đã nhổ ra thì không nuốt lại được (ý nói lời đã nói ra không rút lại được).",
  158: "Hì hì... cô bé đó không phải con người đâu. Là robot đấy. A-n-d-r-o-i-d (người máy).",
  168: "Có vẻ như ổ cứng bị phân mảnh rồi.",
  208: "Tòa báo đó sở hữu mười chiếc máy bay.",
  218: "Bầu trời phía trên đầu có màu xanh da trời đậm.",
  220: "Anh ấy có tính cách vô tư, dễ được lợi.",
  263: "Tôi chưa tiêm phòng MMR ở Nhật.",
  302: "Tôi không thích phong khí (màu sắc đặc trưng) của ngôi trường đó.",
  306: "Ai cũng có ít nhất một tật riêng.",
  311: "Ra lệnh quay đằng sau (quay 180 độ).",
  358: "Thông thường, người ta gán cùng một giá trị cho thuộc tính id và thuộc tính name.",
  368: "Chúng tôi đã mời anh ấy đến dự bữa tiệc tối.",
  412: "Chị gái tôi đang làm việc trong ngành phúc lợi xã hội.",
};

/** Sentences hidden earlier that the teacher found fine for a learners' dictionary (news-style / mild). */
const RESTORE = [
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
];

type Decision = { n: number; decision: string; note: string; id: number; sense: number; ja: string; vi: string };

/** The corrected sentence in a "Sửa JA" note: the back-quoted span that ends like a sentence. */
function correctedJa(note: string, n?: number, origJa?: string): string | null {
  if (n === 429 && origJa) {
    return origJa.replace("。？", "？");
  }
  if (n === 306) {
    return null;
  }
  const spans = [...note.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
  const sentenceSpans = spans.filter((s) => /[。！？〜…」\?]$/.test(s) && s.length > 5);
  if (sentenceSpans.length > 0) return sentenceSpans[sentenceSpans.length - 1]!;
  return spans.find((s) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(s)) ?? null;
}

async function main() {
  await connectMongo();
  const log: string[] = [];
  const docs = new Map<number, IDictVi>();
  const load = async (id: number): Promise<IDictVi> => {
    let d = docs.get(id);
    if (!d) {
      const found = await DictVi.findById(id).lean<IDictVi>();
      d = found ?? { _id: id, s: [], t: [], src: "ai" };
      docs.set(id, d);
    }
    return d;
  };

  // 1. words
  for (const [idStr, senses] of Object.entries(WORD_EDITS)) {
    const d = await load(Number(idStr));
    for (const [sense, vi] of Object.entries(senses)) {
      d.s[Number(sense) - 1] = vi;
      log.push(`word ${idStr} sense ${sense} → ${vi.join(" / ")}`);
    }
  }
  for (const [idStr, senses] of Object.entries(HIDE_SENSES)) {
    const d = await load(Number(idStr));
    d.hs = [...new Set([...(d.hs ?? []), ...senses.map((s) => s - 1)])];
    log.push(`word ${idStr} hide senses ${senses.join(",")}`);
  }
  const reviewed = new Set(REVIEWED_IDS);
  for (const [kanji, reading] of REVIEWED_FORMS) {
    const e = await DictEntry.findOne({ keys: kanji, "r.t": reading }, { _id: 1 }).lean<{ _id: number }>();
    if (e) reviewed.add(e._id);
  }
  for (const id of reviewed) (await load(id)).src = "reviewed";

  // 2. examples
  const decisions = JSON.parse(fs.readFileSync(DECISIONS, "utf8")) as Decision[];
  const entries = new Map<number, IDictEntry>();
  const counts = { drop: 0, ja: 0, vi: 0, keep: 0, missing: 0 };
  for (const dec of decisions) {
    let entry = entries.get(dec.id);
    if (!entry) {
      entry = (await DictEntry.findById(dec.id).lean<IDictEntry>()) ?? undefined;
      if (entry) entries.set(dec.id, entry);
    }
    const si = dec.sense - 1;
    const k = entry?.s[si]?.x?.findIndex((x) => x.ja === dec.ja) ?? -1;
    if (!entry || k < 0) {
      counts.missing++;
      log.push(`#${dec.n}: example not found (entry ${dec.id} sense ${dec.sense})`);
      continue;
    }
    const d = await load(dec.id);
    const text = dec.decision.replace(/\*/g, "");
    const key = `${si}:${k}`;
    const isDrop = text.startsWith("Bỏ");
    if (isDrop) {
      d.hx = [...new Set([...(d.hx ?? []), key])];
      if (d.xj?.[si]?.[k]) d.xj[si]![k] = "";
      counts.drop++;
      continue;
    }
    if (text.includes("JA") && dec.n !== 306) {
      const ja = correctedJa(dec.note, dec.n, dec.ja);
      if (!ja) {
        log.push(`#${dec.n}: no corrected sentence found in the note`);
      } else {
        d.xj = entry.s.map((s, i) => (s.x ?? []).map((_, j) => d.xj?.[i]?.[j] ?? ""));
        d.xj[si]![k] = ja;
        counts.ja++;
      }
    }
    if (VI_EDITS[dec.n]) {
      d.x = entry.s.map((s, i) => (s.x ?? []).map((_, j) => d.x?.[i]?.[j] ?? ""));
      d.x[si]![k] = VI_EDITS[dec.n]!;
      counts.vi++;
    }
    if (!isDrop && !text.includes("JA") && !VI_EDITS[dec.n]) counts.keep++;
  }

  // 3. restore
  for (const ja of RESTORE) {
    const matchingEntries = await DictEntry.find({ "s.x.ja": ja }).lean<IDictEntry[]>();
    if (!matchingEntries.length) {
      log.push(`restore: "${ja}" not found`);
      continue;
    }
    for (const e of matchingEntries) {
      const d = await load(e._id);
      e.s.forEach((s, i) => (s.x ?? []).forEach((x, k) => x.ja === ja && (d.hx = (d.hx ?? []).filter((h) => h !== `${i}:${k}`))));
      log.push(`restored: "${ja}" in word ${e._id}`);
    }
  }

  console.log(log.slice(0, 50).join("\n"));
  if (log.length > 50) console.log(`... and ${log.length - 50} more log entries`);
  console.log(`[review] examples: ${counts.drop} dropped, ${counts.ja} Japanese corrected, ${counts.vi} Vietnamese edited, ${counts.keep} kept as is, ${counts.missing} not found; ${docs.size} words touched`);
  if (!DRY) {
    await DictVi.bulkWrite(
      [...docs.values()].map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false },
    );
    console.log("[review] saved");
  }
  await disconnectMongo();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
