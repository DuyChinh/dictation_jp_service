# Đề dự đoán JLPT T12/2026 — nghe và phần viết

10 đề mới, 2 đề cho mỗi cấp N1–N5: **280 câu nghe và 400 câu phần viết**.
Mỗi thư mục có thêm `paper.json` (từ vựng, ngữ pháp, đọc hiểu), cùng với
`source.json` (kịch bản gốc), `listening.mp3` (audio tổng hợp CBR) và `listening.json`
(dữ liệu ứng dụng, bản dịch, đáp án, giải thích từng lựa chọn và dòng làm căn cứ).

| Cấp | Đề 1 | Đề 2 | Câu/đề | Phân bố câu theo 問題 | Audio đề 1 / đề 2 |
| --- | --- | --- | ---: | --- | --- |
| N1 | [practice-01](../jlpt/n1/practice-01/source.json) | [practice-02](../jlpt/n1/practice-02/source.json) | 30 | 5 / 6 / 5 / 11 / 3 | 21,7 / 21,8 phút |
| N2 | [practice-02](../jlpt/n2/practice-02/source.json) | [practice-03](../jlpt/n2/practice-03/source.json) | 30 | 5 / 6 / 5 / 11 / 3 | 20,4 / 20,4 phút |
| N3 | [practice-02](../jlpt/n3/practice-02/source.json) | [practice-03](../jlpt/n3/practice-03/source.json) | 28 | 6 / 6 / 3 / 4 / 9 | 16,6 / 16,5 phút |
| N4 | [practice-01](../jlpt/n4/practice-01/source.json) | [practice-02](../jlpt/n4/practice-02/source.json) | 28 | 8 / 7 / 5 / 8 | 14,9 / 15,1 phút |
| N5 | [practice-01](../jlpt/n5/practice-01/source.json) | [practice-02](../jlpt/n5/practice-02/source.json) | 24 | 7 / 6 / 5 / 6 | 11,9 / 11,6 phút |

N2/N3 dùng số thư mục 02–03 để giữ nguyên các đề `practice-01` đã tồn tại.
Tên hiển thị của 10 đề mới đều ghi rõ “Đề dự đoán T12/2026 — Đề 1/2”.
[manifest.json](manifest.json) ghi ID, đường dẫn, số câu, thời lượng và kết quả kiểm tra.

## Phạm vi và trạng thái

- Đây là **đề luyện nghe tự biên soạn**, có chủ đề và dạng câu hỏi JLPT; đáp án được
  xác định từ kịch bản gốc. Nội dung không phải đề thi chính thức hay thông tin rò rỉ.
- Quy trình dựa trên skill Claude [add-listening-lesson](../../.claude/skills/add-listening-lesson/SKILL.md)
  và phần Practice tests trong [hướng dẫn](../../scripts/lesson/README.md).
- Các nhóm câu hỏi theo [cấu trúc công bố của JLPT](https://www.jlpt.jp/guideline/testsections.html).
  Số câu là cấu trúc luyện tập được chọn cho bộ này, không phải cam kết về kỳ thi tương lai.
- Thời lượng ngắn hơn thi thật; chưa phải bài mô phỏng đầy đủ thời gian thi.
- Dạng phát ngôn theo tình huống ở N3/N4/N5 dùng mô tả bằng lời thay cho tranh;
  hướng dẫn audio đã được điều chỉnh tương ứng.
- Cả `source.json` và `listening.json` đã chuyển sang **published** ngày 11/11/2026,
  theo yêu cầu duyệt và đưa 10 đề hiện có lên ứng dụng. Backend nạp lại nội dung sẽ
  hiển thị chúng trong mục **Đề luyện tập** (`/lessons?kind=practice`).
  Bộ nội dung được lưu cùng backend để triển khai theo phiên bản của repository.
- Đã bổ sung `paper.json` cho cả 10 đề: mỗi đề **16 câu từ vựng, 16 câu ngữ pháp,
  8 câu đọc hiểu**. Phần viết tự biên soạn có trạng thái `published`,
  sẵn sàng được backend nạp; đây là bản luyện rút gọn, không phải mô phỏng trọn đề thi.

## Phần từ vựng, ngữ pháp, đọc hiểu

| Cấp | Phạm vi luyện từ vựng | Đọc hiểu |
| --- | --- | --- |
| N1 | Cách đọc, ngữ cảnh, đồng nghĩa, cách dùng | Đoạn ngắn, đoạn vừa, so sánh A/B, tìm thông tin |
| N2 | Cách đọc, biểu ký, ngữ cảnh, đồng nghĩa | Đoạn ngắn, đoạn vừa, so sánh A/B, tìm thông tin |
| N3 | Cách đọc, ngữ cảnh, đồng nghĩa, cách dùng | Đoạn ngắn, đoạn vừa, bài dài rút gọn, tìm thông tin |
| N4 | Cách đọc, ngữ cảnh, đồng nghĩa, cách dùng | Đoạn ngắn, đoạn vừa, thông báo, tìm thông tin |
| N5 | Cách đọc, biểu ký, ngữ cảnh, đồng nghĩa | Thư ngắn, đoạn văn, thông báo, tìm thông tin |

- Mỗi đề có 8 câu chọn ngữ pháp, 4 câu sắp xếp ★ và 4 chỗ trống trong một đoạn.
- Phần đọc có 4 văn bản riêng cho mỗi đề, mỗi văn bản 2 câu hỏi; N1/N2 có bài A/B.
- Cả 400 câu có bản dịch và giải thích tiếng Việt cho đủ 4 lựa chọn; câu đọc có
  tham chiếu câu căn cứ. Cách đọc kanji có ghi chú từ vựng và âm Hán Việt.
- **272 câu văn** của 50 văn bản đọc/điền từ có bản dịch theo câu, đơn vị nghĩa để luyện dịch;
  80 cách diễn đạt thay thế và 10 bẫy dịch được bổ sung ở những câu trọng điểm.
  Bộ so khớp không đánh giá được mọi cách diễn đạt tự do.
- Vị trí đáp án được trộn có tính tái lập, cân bằng 10 đáp án ở mỗi vị trí trong từng đề;
  không theo chuỗi 1–2–3–4 lặp lại. Câu, bài đọc và nội dung giữa hai đề của một cấp khác nhau.
- Không bổ sung dạng cấu tạo từ riêng cho N2 hoặc bài đọc dài N1 trong bộ rút gọn này.
  Số câu và phạm vi không được trình bày là cấu trúc đủ của kỳ thi thực tế.
- Xem danh mục [written-manifest.json](written-manifest.json) và kết quả kiểm tra
  [written-review.json](written-review.json). Độ khó chưa được chuẩn hóa qua học viên;
  chưa có người biên tập tiếng Nhật độc lập duyệt toàn bộ.

### Dựng lại và kiểm tra phần viết

Từ thư mục backend:

```sh
python3 scripts/lesson/build_prediction_papers.py
MONGODB_URI= NODE_ENV=production npx tsx scripts/lesson/review_prediction_papers.ts
```

Nguồn biên soạn đặt trong `scripts/lesson/prediction_papers/n1.py` đến `n5.py`;
script dựng chỉ ghi `paper.json` và danh mục phần viết, giữ nguyên file nghe.
Script kiểm tra dùng schema, bộ nạp và API thực tế với bộ lọc `published`, không kết nối DB:
đủ câu/nhóm, câu ★, chỗ trống không lộ đáp án, chấm từng câu, thi cả đề/từng phần,
bỏ trống và bản dịch tham chiếu. Giao diện bổ sung nhãn nhóm đúng cấp cho N3/N5.

## Kiểm tra

- Validator của backend: **0 lỗi** trên 10 đề.
- Kiểm tra API với bộ lọc production: cả 10 đề được liệt kê, đọc được chi tiết và bài
  luyện, audio hỗ trợ Range; nộp đáp án đúng chấm 280/280, bỏ trống chấm 0.
  Payload luyện tập không lộ đáp án/giải thích. 23 test API hiện có đều đạt.
  Chi tiết: [publication-review.json](publication-review.json).
- 280 câu có đúng một đáp án đúng, giải thích tiếng Việt cho mọi lựa chọn,
  bản dịch Việt/Anh cho lựa chọn và tham chiếu dòng làm căn cứ hợp lệ.
- 1.691 đoạn, bao gồm bản sao hội thoại dùng chung cho hai câu hỏi: có bản dịch Việt,
  đúng thứ tự, mốc thời gian tăng và nằm trong audio; lượt thoại dài đã tách theo câu.
- Thời lượng MP3 đo bằng ffprobe khớp dữ liệu trong sai số dưới 150 ms.
- 62 cảnh báo `segment gap > 10 seconds` đều thuộc khoảng đọc lựa chọn 15 giây
  có chủ ý ở 問題2, không phải thiếu audio.
- Whisper small đối chiếu mẫu **89 đoạn** từ mọi phần của cả 10 đề, trên audio cuối cùng:
  **0 đoạn có tỷ lệ khớp dưới 0,75**. Chi tiết trong [audio-review.json](audio-review.json).
  Điểm thấp chỉ là dấu hiệu cần xem, vì ASR có thể đổi chữ số, kana/kanji hoặc nhận sai.
  Đã rà soát đáp án, bản dịch, giải thích, tính đồng bộ kịch bản/audio và khả năng nạp.
  Chưa có người nghe duyệt toàn bộ audio hoặc chuẩn hóa độ khó bằng thử nghiệm với học viên.

## Dựng lại một đề

Chỉnh `source.json`, rồi từ thư mục backend chạy bằng môi trường Python có
`edge-tts` và `numpy`:

```sh
../.venv-align/bin/python scripts/lesson/practice_tts.py content/jlpt/n1/practice-01
```

File audio và `listening.json` phải được dựng cùng nhau. Công cụ giữ cache clip,
hỗ trợ `tts_readings` để chỉ định cách đọc và `section_instructions` để đổi hướng dẫn
phù hợp dạng câu hỏi. Mỗi yêu cầu TTS có giới hạn chờ 45 giây và cơ chế thử lại.
