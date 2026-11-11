from common import Q, R, S, O, P

TESTS = [
{
"vocab": [
[
 R("使用済みの部品を廃棄した。", "Đã loại bỏ các linh kiện đã qua sử dụng.", "廃棄", "はいき", "vứt bỏ, loại bỏ", "はっき|はっき là 発揮 (phát huy), không phải 廃棄.", "はいぎ|棄 đọc き, không đục thành ぎ.", "ひき|廃 có cách đọc はい, không phải ひ."),
 R("長期の滞在を予定している。", "Tôi dự định lưu trú dài hạn.", "滞在", "たいざい", "lưu trú", "たいさい|在 trong từ này đọc ざい, không phải さい.", "ていざい|滞 đọc たい, không phải てい.", "だいざい|滞 đọc たい, không đục thành だい."),
 R("担当者に早急な対応を促した。", "Tôi đã thúc giục người phụ trách nhanh chóng xử lý.", "促した", "うながした", "thúc giục", "ほどこした|ほどこした là 施した (thi hành, ban cho), không phải 促した.", "おびやかした|おびやかした là 脅かした (đe dọa), không phải 促した.", "もたらした|もたらした là mang lại, không phải cách đọc 促した."),
 R("この制度には改善の余地がある。", "Chế độ này vẫn còn dư địa cải thiện.", "余地", "よち", "dư địa, chỗ còn để làm gì", "よじ|地 ở đây đọc ち, không phải じ.", "よっち|余地 không có âm ngắt っ.", "ゆち|余 đọc よ, không phải ゆ."),
],
[
 Q("議論の（　）がずれている。今は費用ではなく、安全性を検討すべきだ。", "Trọng tâm tranh luận đang bị lệch. Lúc này cần xét độ an toàn chứ không phải chi phí.", "vocab:論点", "論点|論点 là điểm đang tranh luận; nói về chi phí khi cần xét an toàn là lệch trọng tâm.", "典型|典型 là hình mẫu tiêu biểu, không chỉ điểm cần tranh luận.", "経緯|経緯 là quá trình diễn biến, không phải nội dung trọng tâm của tranh luận.", "本音|本音 là suy nghĩ thật, không phải thuật ngữ chỉ điểm bàn luận."),
 Q("この契約書の表現は（　）で、人によって異なる解釈が生じかねない。", "Cách diễn đạt trong hợp đồng mơ hồ, có nguy cơ mỗi người hiểu khác nhau.", "vocab:曖昧", "曖昧|曖昧 là không rõ, cho phép nhiều cách hiểu, đúng với nguy cơ khác biệt diễn giải.", "明快|明快 là rõ ràng dễ hiểu, trái với nguy cơ do cách viết mơ hồ.", "厳密|厳密 là chặt chẽ chính xác, không hợp lý do mỗi người hiểu khác.", "率直|率直 là thẳng thắn, không nói mức độ xác định của điều khoản."),
 Q("失敗を個人の責任に（　）するだけでは、仕組みの欠陥は見えない。", "Chỉ quy thất bại về trách nhiệm cá nhân thì không thấy khiếm khuyết hệ thống.", "vocab:還元", "還元|責任に還元する là quy một vấn đề phức tạp về một yếu tố duy nhất.", "回収|回収 là thu hồi vật hoặc tiền, không kết hợp 個人の責任にする theo nghĩa quy nguyên nhân.", "回覧|回覧 là chuyền tài liệu cho mọi người xem, không chỉ quy lỗi.", "回転|回転 là quay, không dùng cho phân tích trách nhiệm."),
 Q("同じ基準を機械的に当てはめず、事情に応じて（　）に対応すべきだ。", "Không nên áp cùng tiêu chuẩn máy móc, mà cần ứng phó linh hoạt tùy hoàn cảnh.", "vocab:柔軟", "柔軟|柔軟に対応する là linh hoạt điều chỉnh, đối lập áp dụng máy móc.", "頑固|頑固 là ngoan cố, trái với thay đổi tùy hoàn cảnh.", "強引|強引 là cưỡng ép, không hợp xem xét từng tình huống.", "無謀|無謀 là liều lĩnh, không phải tính linh hoạt có cân nhắc."),
],
[
 Q("この指摘は的を射ている。", "Nhận xét này rất đúng trọng tâm.", "vocab:的を射る", "本質を正確に捉えている|的を射る là nắm trúng điểm cốt yếu, đúng trọng tâm.", "相手を不必要に傷つけている|Làm tổn thương người khác không phải nghĩa thành ngữ này.", "議論をわざと避けている|Cố tránh tranh luận trái với việc nêu trúng trọng tâm.", "事実を大げさに述べている|Phóng đại sự thật khác với nhận định chính xác.", target="的を射ている"),
 Q("その説明には無理がある。", "Lời giải thích đó có điểm gượng ép.", "vocab:無理がある", "筋が通らないところがある|説明に無理がある là có phần logic không thuyết phục hoặc gượng ép.", "理解するのに努力が全くいらない|Không cần cố gắng để hiểu không phải nghĩa gượng ép.", "説明をする時間が十分にある|Đủ thời gian giải thích không liên quan tính hợp lý.", "話の内容がすべて確かめられている|Mọi nội dung đã được xác minh không phải nghĩa câu.", target="無理がある"),
 Q("両者の主張は平行線をたどった。", "Lập trường hai bên vẫn không tìm được điểm gặp nhau.", "vocab:平行線をたどる", "意見の隔たりが埋まらなかった|平行線をたどる là bất đồng không thu hẹp, không đạt đồng thuận.", "同じ結論に到達した|Cùng đạt kết luận là đồng thuận, trái thành ngữ.", "一方が全面的に譲歩した|Một bên nhượng bộ toàn bộ sẽ phá bế tắc, không phải bình hành.", "話し合いの場所が変更された|Đổi địa điểm không phải nghĩa của hình ảnh 平行線.", target="平行線をたどった"),
 Q("彼は事情をつぶさに説明した。", "Anh ấy giải thích cặn kẽ tình hình.", "vocab:つぶさに", "細かい点まで詳しく|つぶさに là tỉ mỉ đến từng chi tiết.", "大事な点をすべて省いて|Bỏ hết điểm quan trọng trái với cặn kẽ.", "自分に都合のよい部分だけ|Chỉ chọn phần có lợi không phải nghĩa của つぶさに.", "一言も話さずに|Không nói lời nào trái với giải thích chi tiết.", target="つぶさに"),
],
[
 Q("「踏まえる」の使い方として適切なものはどれか。", "Câu nào dùng đúng 踏まえる (dựa trên, xét đến)?", "usage:踏まえる", "過去の失敗を踏まえて、計画を練り直した。|経験や事実を踏まえる là lấy chúng làm căn cứ cân nhắc hành động mới.", "階段を一段ずつ踏まえて上った。|Bước lên bậc thang dùng 踏む; 踏まえる ở đây không chỉ từng bước chân.", "雨が踏まえたので、試合を中止した。|踏まえる không dùng cho mưa bắt đầu hoặc ngừng.", "切符を改札に踏まえて入れた。|Cho vé vào cổng không dùng 踏まえる."),
 Q("「見合わせる」の使い方として適切なものはどれか。", "Câu nào dùng đúng 見合わせる (tạm hoãn)?", "usage:見合わせる", "安全が確認できるまで、運転を見合わせる。|運転を見合わせる là tạm ngừng vận hành chờ xác nhận điều kiện.", "景色が美しくて、窓から山を見合わせた。|Ngắm núi dùng 眺める; 見合わせる không mang nghĩa ngắm cảnh một mình.", "資料を印刷機に見合わせて百枚出した。|見合わせる không chỉ thao tác nạp giấy vào máy in.", "暗いので、電気を見合わせてつけた。|Bật đèn không dùng 見合わせて theo cách này."),
 Q("「損なう」の使い方として適切なものはどれか。", "Câu nào dùng đúng 損なう (làm tổn hại)?", "usage:損なう", "事実を隠す行為は、組織への信頼を損なう。|信頼を損なう là làm suy giảm lòng tin, đúng kết hợp của tha động từ.", "組織への信頼が損なった。|Ở đây cần 信頼が損なわれた hoặc 信頼を損なった, không phải が損なった.", "健康を損なって元気になった。|Làm hại sức khỏe mâu thuẫn trực tiếp với việc nhờ đó khỏe lên trong câu này.", "書類を封筒に損なって送った。|損なう không diễn tả cho tài liệu vào phong bì."),
 Q("「一律」の使い方として適切なものはどれか。", "Câu nào dùng đúng 一律 (đồng loạt, cùng một mức)?", "usage:一律", "事情の違いを考慮せず、一律に制限するのは問題だ。|一律に制限する là hạn chế cùng mức bất kể khác biệt hoàn cảnh.", "人によって料金を変え、一律に違う値段にした。|Thay mức giá theo từng người mâu thuẫn 一律 là cùng một chuẩn.", "毎年一律ずつ会議を開く。|一律 không phải đơn vị đếm số lần họp.", "この坂は一律くて歩きにくい。|一律 không có dạng tính từ い là 一律くて."),
]],
"grammar": [
 Q("事故の被害を伝える映像は、正視する（　）。", "Những hình ảnh thiệt hại vụ tai nạn khiến người ta không đành nhìn thẳng.", "grammar:に堪えない", "に堪えない|Vるに堪えない là không chịu nổi khi nhìn/nghe; hình ảnh quá đau xót.", "に越したことはない|に越したことはない là làm thế vẫn tốt nhất, không hợp ý quá đau lòng.", "にほかならない|にほかならない là không gì khác ngoài, không kết nối hành động nhìn với sự đau lòng.", "に先立つ|に先立つ là trước khi, không diễn tả cảm giác không thể chịu nổi."),
 Q("大雪のため、主催者は大会の延期を（　）。", "Do tuyết lớn, ban tổ chức buộc phải hoãn giải.", "grammar:を余儀なくされる", "余儀なくされた|Nを余儀なくされる là bị hoàn cảnh buộc phải làm điều không mong muốn.", "余儀なくした|余儀なくする cần chủ thể là nguyên nhân ép người khác; 主催者 ở đây là bên bị buộc.", "余儀なかった|余儀ない không chia thành 余儀なかった để mang nghĩa bị ép trong cấu trúc này.", "余儀なくさせられた|Đây là bị động sai khiến khiến chủ thể bị buộc phải ép ai khác, không phải trực tiếp bị buộc hoãn như câu."),
 Q("説明する（　）、この資料を見れば違いは明らかだ。", "Không cần giải thích, nhìn tài liệu này cũng rõ khác biệt.", "grammar:までもなく", "までもなく|Vるまでもなく là không cần đến mức phải làm gì.", "かたわら|かたわら là bên cạnh hoạt động chính; không diễn tả không cần giải thích.", "にかけては|にかけては nói về mặt sở trường, không nêu việc không cần làm.", "ものの|ものの là tuy có làm nhưng, trong câu không phải đã giải thích rồi đối lập."),
 Q("毎日は無理だとしても、週に一度（　）、運動する時間を確保したい。", "Dù không thể mỗi ngày, ít nhất mỗi tuần một lần tôi vẫn muốn dành thời gian vận động.", "grammar:なりとも", "なりとも|Số lượng tối thiểu + なりとも nhấn mạnh dù ít nhất chỉ chừng đó.", "ともなると|ともなると là hễ đến tầm/mức, không diễn tả nhượng bộ mức tối thiểu.", "を皮切りに|を皮切りに là bắt đầu từ rồi nối tiếp nhiều sự kiện, không phải ít nhất một lần.", "に至っては|に至っては nêu trường hợp cực đoan, không phù hợp mức mong muốn tối thiểu."),
 Q("この小説の結末は、読む者の心を揺さぶら（　）。", "Kết thúc tiểu thuyết này chắc chắn sẽ lay động lòng người đọc.", "grammar:ずにはおかない", "ずにはおかない|Vない bỏ ない + ずにはおかない: chắc chắn gây tác động mạnh.", "ないではすまない|ないではすまない nói không thể tránh trách nhiệm phải làm, không hợp kết thúc tác phẩm là chủ thể.", "なければならなかった|Phải làm trong quá khứ nêu nghĩa vụ, không phải sức tác động tất yếu của tác phẩm.", "ないにかたくない|ないにかたくない không phải mẫu chuẩn để nói chắc chắn làm lay động."),
 Q("突然職を失った彼の不安は、想像する（　）。", "Không khó hình dung nỗi bất an của anh ấy khi đột ngột mất việc.", "grammar:にかたくない", "にかたくない|想像するにかたくない là không khó để tưởng tượng.", "べくもない|想像するべくもない là không thể hình dung, trái với suy ra từ hoàn cảnh cụ thể.", "に忍びない|に忍びない là không đành làm vì thương cảm; không phải dễ suy ra cảm xúc.", "まじきだ|まじき thường bổ nghĩa danh từ sau Vる, không kết thúc まじきだ như vậy."),
 Q("責任者（　）、自分の判断の根拠を説明できなくては困る。", "Đã ở vị trí người chịu trách nhiệm thì phải giải thích được căn cứ phán đoán của mình.", "grammar:ともなると", "ともなると|Nともなると là khi đã ở vị thế/mức đó thì có yêu cầu tương xứng.", "をおいてほかに|をおいてほかに là ngoài đối tượng đó không còn ai, không nêu trách nhiệm theo vị thế.", "にひきかえ|にひきかえ so sánh tương phản hai đối tượng, câu không có vế đối chiếu.", "につけても|につけても là mỗi khi/cứ thấy, không chỉ đòi hỏi gắn với chức vụ."),
 Q("本日の午後五時（　）、申し込みを締め切ります。", "Vào đúng năm giờ chiều hôm nay, chúng tôi sẽ chốt đăng ký.", "grammar:をもって", "をもって|Thời điểm + をもって dùng trang trọng để xác định mốc kết thúc.", "をよそに|をよそに là mặc kệ, không đặt mốc thời gian.", "とあって|とあって là vì hoàn cảnh đặc biệt, không chỉ giờ đóng đăng ký.", "にひきかえ|にひきかえ là trái với một đối tượng khác, không dùng cho giờ chốt."),
],
"sort": [
 O("制度の見直しに", ["あたって", "現場の", "声を", "聞かずには"], "済まされない。", "Khi xem xét lại chế độ, không thể bỏ qua việc lắng nghe tiếng nói thực tế."),
 O("成功するかどうかは", ["準備", "の", "仕方", "いかんに"], "かかっている。", "Thành công hay không phụ thuộc vào cách chuẩn bị."),
 O("この問題は", ["個人", "の", "努力", "のみをもってしては"], "解決できない。", "Không thể giải quyết vấn đề này chỉ bằng nỗ lực cá nhân."),
 O("これは", ["専門家", "と", "いえども", "容易には"], "答えられない問いだ。", "Đây là câu hỏi dù chuyên gia cũng không dễ trả lời."),
],
"cloze": P("cloze", "記録されない仕事", [
 S("職場の仕事を数値化しようとすると、|Khi định lượng công việc ở nơi làm,", "処理件数のような目に見える成果に注目が集まりやすい。|người ta dễ tập trung vào thành quả nhìn thấy như số vụ xử lý."),
 S("しかし、その件数のみをもって、|Tuy nhiên chỉ với con số đó", "一人の働きを評価することはできない。|không thể đánh giá đóng góp của một người.", blank="しかし、その件数（　）、一人の働きを評価することはできない。"),
 S("相談に乗ったり、失敗を未然に防いだりする行為は、|Những việc như tư vấn hay phòng ngừa sai sót", "結果として件数に表れない場合があるからだ。|có khi không thể hiện thành số vụ trong kết quả.", blank="相談に乗ったり、失敗を未然に防いだりする行為は、結果として件数に表れない場合が（　）。"),
 S("だからといって、|Dẫu vậy,", "数値による評価をすべて放棄すべきだというのではない。|không phải cần bỏ hết cách đánh giá bằng số.", blank="（　）、数値による評価をすべて放棄すべきだというのではない。"),
 S("数値で捉えられる範囲を見極めたうえで、|Sau khi xác định phạm vi đo được bằng số,", "その外側にある貢献をどう認めるかが問われている。|điều cần trả lời là công nhận đóng góp ngoài phạm vi ấy thế nào.", blank="数値で捉えられる範囲を見極めた（　）、その外側にある貢献をどう認めるかが問われている。"),
 ], [
 Q("しかし、その件数（　）、一人の働きを評価することはできない。", "Nhưng chỉ số vụ đó không đủ đánh giá đóng góp một người.", "grammar:のみをもって", "のみをもって|Nのみをもって〜できない là không thể chỉ bằng một căn cứ duy nhất.", "に至るまで|に至るまで là đến tận, không nêu giới hạn của một chỉ số.", "を皮切りに|を皮切りに là mở đầu một chuỗi, không chỉ căn cứ đánh giá.", "にひきかえ|にひきかえ cần đối tượng so sánh rõ, không mang nghĩa chỉ bằng số vụ.", evidence=[1,2]),
 Q("相談に乗ったり、失敗を未然に防いだりする行為は、結果として件数に表れない場合が（　）。", "Vì tư vấn, phòng lỗi có khi không hiện thành số vụ.", "grammar:からだ", "あるからだ|からだ nêu lý do cho khẳng định không thể đánh giá chỉ bằng số vụ ở câu trước.", "あるにもかかわらず|にもかかわらず để ngỏ vế sau và nêu trái ngược, không hoàn tất lời giải thích.", "あればこそだろうか|Câu nghi vấn tự hỏi không phù hợp lời giải thích trực tiếp ở đoạn này.", "ないにすぎない|Phủ định có trường hợp là trái với các ví dụ về đóng góp khó đếm.", evidence=[2,3]),
 Q("（　）、数値による評価をすべて放棄すべきだというのではない。", "Dù vậy không có nghĩa nên bỏ toàn bộ đánh giá bằng số.", "grammar:だからといって", "だからといって|Chấp nhận hạn chế của số liệu nhưng ngăn suy luận cực đoan phải bỏ hẳn.", "そうであれば当然|Nếu vậy đương nhiên khẳng định kết luận, không hợp bác bỏ suy luận.", "その証拠に|その証拠に đưa bằng chứng cho ý trước, không chuyển sang giới hạn kết luận.", "なぜなら|なぜなら đưa nguyên nhân cho câu trước; câu này là điều chỉnh cách hiểu chứ không giải thích ví dụ.", evidence=[3,4]),
 Q("数値で捉えられる範囲を見極めた（　）、その外側にある貢献をどう認めるかが問われている。", "Cần xác định phạm vi số liệu rồi xét công nhận phần đóng góp bên ngoài.", "grammar:たうえで", "うえで|Vたうえで lấy bước nhận diện phạm vi làm tiền đề xét bước sau.", "が早いか|が早いか chỉ hai việc tức thì nối tiếp bất ngờ, không phải quy trình đánh giá.", "ものを|ものを thường tiếc nuối/trách, không biểu thị sau khi làm cơ sở.", "ばかりに|ばかりに gắn nguyên nhân với hệ quả xấu, không nêu bước phân tích cần làm.", evidence=[5]),
 ]),
"reading": [
 P("prose", "残しておく余白", [
 S("地域の展示館で、|Ở phòng trưng bày địa phương", "説明板を増やしてほしいという声があった。|có ý kiến muốn thêm bảng giải thích."),
 S("一方で、|Mặt khác,", "説明が先に目に入ると自分の印象を確かめられないという来館者もいた。|có khách nói thấy giải thích trước thì không tự kiểm chứng cảm nhận được."),
 S("そこで担当者は、|Vì thế người phụ trách", "入口では作品名だけを示し、詳しい解説は出口で読めるようにした。|chỉ ghi tên tác phẩm ở lối vào, còn giải thích chi tiết đặt ở lối ra."),
 S("情報を減らすことが|Giảm thông tin", "目的なのではない。|không phải mục đích."),
 S("情報に触れる順番を|Thứ tự tiếp cận thông tin", "選べる余地を残したのである。|đã được để cho khách có thể lựa chọn."),
 ], [
 Q("詳しい解説を出口に置いた目的は何か。", "Mục đích đặt giải thích chi tiết ở lối ra là gì?", "reading:intention", "自分の印象を持つ段階と解説を読む段階を分けられるようにするため|Khách có thể tự xem trước rồi đọc giải thích; trọng tâm là thứ tự tiếp cận.", "解説を必要とする来館者を減らすため|Không nhằm giảm số người cần giải thích mà đáp ứng hai nhu cầu.", "作品名すら知られないようにするため|Lối vào vẫn ghi tên tác phẩm.", "詳しい情報を完全に取り除くため|Câu cuối phủ định mục đích giảm thông tin, giải thích vẫn có ở lối ra.", evidence=[2,3,4,5]),
 Q("筆者の考えに最も近いものはどれか。", "Ý nào gần nhất với quan điểm tác giả?", "reading:main_idea", "情報量だけでなく受け取り方の選択肢も重要である|Bài kết luận giữ khả năng lựa chọn thứ tự, không chỉ tăng/giảm lượng.", "情報は多ければ多いほど理解を助ける|Một nhóm khách bị giải thích có sẵn lấn át cảm nhận, nên không luôn nhiều là tốt.", "作品の解釈は解説板だけで決まるべきだ|Bố trí mới tôn trọng cảm nhận trước của khách.", "来館者は解説を読まないほうがよい|Không cấm đọc; giải thích chi tiết vẫn được cung cấp.", evidence=[2,3,4,5]),
 ]),
 P("prose", "例外を記す", [
 S("業務の標準化を進めるとき、|Khi chuẩn hóa nghiệp vụ,", "例外的な処理はできるだけ排除すべきだと言われる。|người ta thường nói cần loại bỏ tối đa xử lý ngoại lệ."),
 S("確かに、一人にしかわからない手順が多ければ、|Quả thực nếu có nhiều thao tác chỉ một người hiểu,", "仕事を引き継ぐことは難しい。|việc bàn giao sẽ khó khăn."),
 S("しかし、例外を単に手順の乱れと見なすと、|Nhưng nếu chỉ coi ngoại lệ là sự lệch quy trình,", "そこに対応せざるを得なかった事情が見えなくなる。|ta sẽ không thấy hoàn cảnh đã buộc người ta phải xử lý như vậy."),
 S("ある窓口では、申請書に書けない事情を聞き取るため、|Ở một quầy dịch vụ, để nghe hoàn cảnh không ghi được trong đơn,", "担当者が通常より長い時間をかけていた。|nhân viên đã dành thời gian lâu hơn thông thường."),
 S("処理時間の短縮だけを目標にすれば、|Nếu chỉ đặt mục tiêu rút ngắn thời gian,", "この対応は削るべき無駄に見えるだろう。|việc này có lẽ trông như lãng phí cần cắt bỏ."),
 S("だが、事情を理解せずに書類を戻せば、|Nhưng nếu trả hồ sơ mà chưa hiểu hoàn cảnh,", "申請者は同じ窓口を何度も訪れることになる。|người nộp sẽ phải đến cùng quầy nhiều lần."),
 S("例外を記録するのは、|Ghi lại ngoại lệ", "すべてを無条件に残すためではない。|không nhằm giữ vô điều kiện mọi thứ."),
 S("どの不都合に対処していたのかを共有し、|Cần chia sẻ xem ngoại lệ từng xử lý bất tiện nào", "標準の側を改善する手掛かりにするためだ。|để dùng làm đầu mối cải thiện chính quy trình chuẩn."),
 ], [
 Q("窓口で時間をかけていた対応は、どのような役割を果たしていたか。", "Việc dành thêm thời gian tại quầy có vai trò gì?", "reading:inference", "書類だけではわからない事情を把握し、再訪の負担を避けること|Câu 4 và 6 nối việc hiểu hoàn cảnh với tránh khách phải quay lại nhiều lần.", "申請者の数を故意に減らすこと|Không nhằm làm khó để giảm số người nộp đơn.", "標準化そのものを中止させること|Nhân viên xử lý nhu cầu thực tế; tác giả không yêu cầu bỏ chuẩn hóa.", "すべての申請を審査せずに認めること|Nghe hoàn cảnh không có nghĩa duyệt vô điều kiện.", evidence=[4,5,6]),
 Q("筆者が例外の記録を勧める理由は何か。", "Vì sao tác giả khuyến nghị ghi lại ngoại lệ?", "reading:main_idea", "例外が生じた理由から標準の不足を見つけ改善できるから|Kết luận dùng lý do ngoại lệ làm đầu mối cải thiện chuẩn, không bảo tồn mọi lệch lạc.", "例外は標準より必ず正しいから|Tác giả không khẳng định ngoại lệ luôn đúng.", "処理時間を測定する意味が全くないから|Chỉ phê phán đặt thời gian làm mục tiêu duy nhất, không phủ định mọi đo lường.", "担当者ごとの独自手順を永久に固定するため|Bài thừa nhận cách chỉ một người biết gây khó bàn giao; muốn chia sẻ và cải thiện.", evidence=[2,7,8]),
 ]),
 P("pair", "失敗を共有する", [
 S("失敗の報告を求めるなら、|Nếu yêu cầu báo cáo thất bại,", "まず報告者が不利益を受けない仕組みを用意すべきだ。|trước hết phải có cơ chế để người báo cáo không bị thiệt.", label="A"),
 S("正直に話した人ほど評価が下がるのでは、|Nếu càng thành thật càng bị đánh giá thấp,", "沈黙を選ぶほうが合理的になってしまう。|thì chọn im lặng lại thành hợp lý."),
 S("責任の所在を曖昧にするのではなく、|Không phải làm mờ nơi chịu trách nhiệm,", "事実を集める段階と責任を判断する段階を区別する必要がある。|mà cần phân biệt giai đoạn thu thập sự thật với giai đoạn xét trách nhiệm."),
 S("失敗事例を集めても、|Dù tập hợp được các ví dụ thất bại,", "単に気をつけようと呼びかけるだけでは次の行動は変わらない。|nếu chỉ kêu gọi cẩn thận thì hành động lần sau không đổi.", label="B"),
 S("その場で何がわかっていて、何が見えていなかったのかを、|Cần ghi cụ thể khi đó đã biết gì và chưa nhìn thấy gì", "判断の条件とともに記すべきだ。|cùng với điều kiện ra phán đoán."),
 S("そうすれば別の担当者も、|Khi đó người phụ trách khác", "似た条件に置かれた際に判断を見直せる。|cũng có thể xem lại phán đoán khi rơi vào điều kiện tương tự."),
 S("共有とは報告の件数を増やすことではなく、|Chia sẻ không phải tăng số báo cáo,", "後の行動に使える形にすることだ。|mà là làm cho thông tin dùng được trong hành động về sau."),
 ], [
 Q("AとBはそれぞれ、何を主に論じているか。", "A và B mỗi bên bàn chính về điều gì?", "reading:comparison", "Aは事実を出しやすい条件、Bは集めた情報を役立てる方法|A tập trung bảo vệ việc báo thật; B tập trung nội dung giúp quyết định lần sau.", "Aは報告数の競争、Bは責任者の処罰|A không cổ vũ cạnh tranh số lượng, B không bàn trừng phạt.", "Aは責任の全面免除、Bは事例の隠蔽|A nói rõ không làm mờ trách nhiệm; B muốn thông tin dùng được, không giấu.", "AもBも失敗の個人評価だけ|Cả hai bàn cách hệ thống học hỏi, không chỉ chấm cá nhân.", evidence=[1,3,5,7]),
 Q("AとBを踏まえた取り組みとして適切なのはどれか。", "Cách làm nào phù hợp khi kết hợp A và B?", "reading:synthesis", "報告段階での不利益を避け、当時の判断条件も記録する|Kết hợp cơ chế báo thật an toàn của A với ghi điều kiện quyết định cụ thể của B.", "報告者を直ちに処分し、件数だけを公表する|Trái cả việc tránh bất lợi ở bước báo lẫn việc thông tin phải dùng cho hành động.", "責任の検討を永久に禁止し、具体例は削除する|A vẫn cho phép xét trách nhiệm ở giai đoạn riêng; B cần cụ thể.", "報告を口頭の注意だけで終わらせる|B nói kêu gọi cẩn thận chung chung không làm thay đổi hành vi.", evidence=[1,3,5,6,7]),
 ]),
 P("info", "研究資料の閲覧", [
 S("公開資料は|Tư liệu công khai", "登録せずに一階の閲覧席で利用できます。|có thể dùng tại ghế đọc tầng một mà không đăng ký."),
 S("保存資料は|Tư liệu lưu trữ", "研究目的の登録者に限り、事前申請により閲覧できます。|chỉ người đăng ký cho mục đích nghiên cứu mới được xem sau khi xin trước."),
 S("申請は閲覧希望日の五開館日前までに|Đơn phải đến chậm nhất năm ngày mở cửa trước ngày muốn xem", "資料番号を明記して提出してください。|và ghi rõ mã tư liệu."),
 S("保存資料の撮影は原則認めませんが、|Về nguyên tắc không cho chụp tư liệu lưu trữ,", "複写は資料の状態を確認したうえで職員が行います。|nhưng nhân viên có thể sao chụp sau khi kiểm tra tình trạng tư liệu."),
 S("一回の申請は三点までで、|Mỗi lần xin tối đa ba tài liệu,", "同じ日に複数の申請を行うことはできません。|và không thể nộp nhiều đơn cùng ngày."),
 S("休館日は月曜日です。|Thứ Hai là ngày đóng cửa.", "休館日は申請期限の日数に含めません。|Ngày đóng cửa không được tính vào số ngày của hạn xin."),
 ], [
 Q("保存資料の閲覧を希望する人に必要なことは何か。", "Người muốn xem tư liệu lưu trữ cần làm gì?", "reading:information", "研究目的で登録し、資料番号を示して期限内に申請する|Cần đủ tư cách đăng ký nghiên cứu, ghi mã và nộp trước năm ngày mở cửa.", "登録せず当日一階で資料を受け取る|Không đăng ký chỉ áp dụng tư liệu công khai, không phải lưu trữ.", "利用目的を問わず六点を一度に申し込む|Giới hạn nghiên cứu và tối đa ba điểm mỗi lần, không phải sáu.", "資料番号を省略して撮影許可だけを求める|Mã tư liệu là bắt buộc; chụp ảnh về nguyên tắc không được.", evidence=[1,2,3,5]),
 Q("保存資料の扱いについて正しいものはどれか。", "Thông tin nào đúng về cách xử lý tư liệu lưu trữ?", "reading:information", "状態の確認後、職員による複写が可能な場合がある|Không tự chụp theo nguyên tắc, nhưng nhân viên có thể sao sau kiểm tra tình trạng.", "登録者なら自由に自分で撮影できる|Đăng ký không tự đem lại quyền tự chụp ảnh.", "同じ日に申請を分ければ六点閲覧できる|Không được chia nhiều đơn cùng ngày, giới hạn ba điểm.", "月曜日も期限の五日に数える|Ngày đóng cửa không được tính vào hạn năm ngày mở cửa.", evidence=[4,5,6]),
 ]),
]},
{
"vocab": [
[
 R("予算不足への懸念を示した。", "Họ bày tỏ lo ngại về thiếu ngân sách.", "懸念", "けねん", "lo ngại", "けんねん|懸念 là けねん, không có âm ん sau け.", "けれん|念 đọc ねん, không phải れん.", "げねん|懸 trong từ này đọc け, không phải げ."),
 R("解決策を模索している。", "Họ đang tìm kiếm giải pháp.", "模索", "もさく", "mò tìm, tìm tòi", "ぼさく|模 đọc も, không phải ぼ.", "もさつ|索 đọc さく, không phải さつ.", "もざく|索 đọc さく, không đục thành ざく."),
 R("判断の根拠を問い直す。", "Xét lại căn cứ của phán đoán.", "根拠", "こんきょ", "căn cứ", "こんこ|拠 ở đây đọc きょ, không phải こ.", "ごんきょ|根 đọc こん, không đục thành ごん.", "こんきょう|拠 không kéo dài thành きょう trong 根拠."),
 R("需要と供給の均衡が崩れた。", "Cân bằng cung cầu đã bị phá vỡ.", "均衡", "きんこう", "cân bằng", "きんごう|衡 đọc こう, không phải ごう.", "きんこ|衡 có âm dài こう, không phải こ.", "ぎんこう|ぎんこう là 銀行 (ngân hàng), không phải 均衡."),
],
[
 Q("少数の成功例を全体に（　）して、効果があると断定するのは危険だ。", "Khái quát vài ví dụ thành công ra toàn bộ rồi khẳng định hiệu quả là nguy hiểm.", "vocab:一般化", "一般化|一般化する là khái quát trường hợp riêng thành kết luận chung.", "私有化|私有化 là tư hữu hóa, không nói suy luận từ mẫu nhỏ.", "暗号化|暗号化 là mã hóa, không liên quan tính đại diện của ví dụ.", "液状化|液状化 là hóa lỏng, không dùng cho phương pháp lập luận."),
 Q("発言の一部だけを（　）と、本来の意図とは違って伝わることがある。", "Nếu cắt riêng một phần phát ngôn, đôi khi thông điệp được truyền đi khác ý ban đầu.", "vocab:切り取る", "切り取る|発言の一部を切り取る là trích một phần tách khỏi ngữ cảnh, dễ méo ý.", "積み立てる|積み立てる là tích lũy tiền từng đợt, không đi với phát ngôn.", "取り締まる|取り締まる là kiểm soát, xử lý vi phạm, không chỉ cắt đoạn lời nói.", "差し支える|差し支える là gây trở ngại, tự động từ, không nhận 一部を."),
 Q("問題を（　）に扱わず、当事者の事情を丁寧に聞き取るべきだ。", "Không nên xử lý vấn đề một cách qua loa, mà cần nghe kỹ hoàn cảnh người trong cuộc.", "vocab:安易", "安易|安易に là dễ dãi, đơn giản hóa thiếu cân nhắc, đối lập với 丁寧に聞き取る.", "綿密|綿密に là tỉ mỉ, cùng chiều nghe kỹ chứ không phải điều cần tránh trong câu.", "慎重|慎重に là thận trọng, không phải hành vi đối lập với lắng nghe kỹ.", "厳正|厳正に là nghiêm minh công bằng, không mang ý qua loa."),
 Q("反対意見を封じるのではなく、議論の（　）として受け止めたい。", "Tôi muốn đón nhận phản đối làm điểm xuất phát cho thảo luận, thay vì dập tắt.", "vocab:出発点", "出発点|議論の出発点 là điều khởi đầu cho xem xét sâu hơn, phù hợp không dập tắt phản đối.", "終着点|終着点 là đích cuối cùng; ở đây phản đối mở việc trao đổi, không kết thúc.", "既成事実|既成事実 là sự đã rồi, không chỉ động lực bắt đầu thảo luận.", "免罪符|免罪符 là cái cớ miễn trách, không liên quan lắng nghe phản đối."),
],
[
 Q("その説明をうのみにするべきではない。", "Không nên tin nguyên lời giải thích đó mà không kiểm chứng.", "vocab:うのみにする", "確かめずにそのまま信じる|うのみにする là chấp nhận nguyên xi không xem xét thật giả.", "内容を詳しく検証する|Kiểm chứng kỹ là trái với tin không xét.", "必要な部分だけを書き写す|Chép phần cần không phải nghĩa tin toàn bộ.", "相手の言葉を正確に引用する|Trích đúng nguyên văn không đồng nghĩa với tin không kiểm chứng.", target="うのみにする"),
 Q("彼は現場の事情に疎い。", "Anh ấy không am hiểu tình hình thực tế tại hiện trường.", "vocab:疎い", "事情をよく知らない|事情に疎い là ít hiểu biết, không nắm rõ hoàn cảnh.", "事情を誰よりも詳しく知っている|Hiểu hơn mọi người là ngược với 疎い.", "現場へ毎日通っている|Đi mỗi ngày không tự diễn tả mức am hiểu.", "現場の仕事を好んでいる|Thích công việc không có nghĩa hiểu hoặc không hiểu tình hình.", target="疎い"),
 Q("その見通しは心もとない。", "Triển vọng ấy khiến người ta chưa yên tâm.", "vocab:心もとない", "確かなものと思えず不安だ|心もとない là thiếu chắc chắn để an tâm tin cậy.", "必ず成功すると確信できる|Chắc chắn thành công là ngược với chưa yên tâm.", "予想よりはるかに楽しい|Vui hơn dự kiến không phải nghĩa của từ này.", "すでにすべて完了している|Hoàn tất hết không liên quan cảm giác thiếu tin cậy về triển vọng.", target="心もとない"),
 Q("彼の発言は示唆に富んでいる。", "Phát biểu của anh ấy chứa nhiều gợi mở.", "vocab:示唆に富む", "考える手掛かりを多く含んでいる|示唆に富む là có nhiều đầu mối, gợi ý để suy nghĩ sâu hơn.", "結論が一つも理解できない|Không hiểu được kết luận không phải nghĩa nhiều gợi mở.", "話題と全く無関係である|Hoàn toàn không liên quan khác với chứa gợi ý hữu ích.", "同じ注意を機械的に繰り返している|Lặp máy móc không phải phong phú gợi mở.", target="示唆に富んでいる"),
],
[
 Q("「顧みる」の使い方として適切なものはどれか。", "Câu nào dùng đúng 顧みる (nhìn lại, quan tâm)?", "usage:顧みる", "目先の利益に追われ、長期的な影響を顧みなかった。|影響を顧みない là không xem xét hoặc quan tâm hậu quả.", "窓から景色を顧みて写真を撮った。|Ngắm cảnh trước mặt dùng 眺める; 顧みる không phải động từ ngắm cảnh thông thường.", "この靴は私の足に顧みる。|Vừa chân dùng 合う; 顧みる không chỉ độ vừa.", "駅に顧みて電車を待った。|Không dùng 顧みる cho đến ga đợi tàu."),
 Q("「介する」の使い方として適切なものはどれか。", "Câu nào dùng đúng 介する (thông qua)?", "usage:介する", "代理人を介して交渉を進めた。|人を介して là thông qua một người trung gian.", "代理人が介してを交渉した。|を bị đặt sai sau thể て; cấu trúc không đúng.", "雨を介して傘を開いた。|Mưa là lý do mở ô, không phải trung gian của đàm phán/hành động này.", "この料理は介しくておいしい。|介する là động từ, không có dạng tính từ 介しくて."),
 Q("「覆す」の使い方として適切なものはどれか。", "Câu nào dùng đúng 覆す (lật ngược)?", "usage:覆す", "新たな証拠が、従来の見方を覆した。|証拠が見方を覆す là bằng chứng khiến cách hiểu trước bị đảo ngược.", "従来の見方が覆した。|覆す là tha động từ cần tân ngữ; nếu cách hiểu bị đảo ngược dùng 覆った.", "花瓶に水を覆して満たした。|Đổ đầy bình dùng 注ぐ; 覆す không mang nghĩa rót đầy.", "晴れた空を覆して散歩した。|Không dùng 覆す để miêu tả đi dạo dưới trời quang."),
 Q("「一概に」の使い方として適切なものはどれか。", "Câu nào dùng đúng 一概に (khái quát một chiều)?", "usage:一概に", "事情はさまざまで、一概に失敗とは言えない。|一概に〜とは言えない là không thể kết luận đồng loạt không xét khác biệt.", "駅まで一概に歩いて十分だ。|一概に không phải trạng từ diễn tả phương thức đi bộ.", "この箱は一概に三キロある。|Không dùng 一概に để khẳng định trọng lượng một hộp.", "一概に窓を閉めてから寝た。|Không dùng 一概に cho một thao tác đơn lẻ đóng cửa."),
]],
"grammar": [
 Q("専門家（　）、誤りを犯さないわけではない。", "Dù là chuyên gia cũng không phải không mắc sai lầm.", "grammar:といえども", "といえども|Nといえども là ngay cả/dù là một đối tượng được đánh giá cao.", "を皮切りに|を皮切りに là mở đầu một chuỗi sự kiện, không nhượng bộ địa vị chuyên gia.", "に先駆けて|に先駆けて là trước ai đó, không phù hợp kết luận ai cũng có thể sai.", "をもって|をもって là bằng hoặc tại mốc, không chỉ dù là chuyên gia."),
 Q("被災地の様子を見て、深い悲しみを（　）。", "Nhìn cảnh vùng bị nạn, tôi không nén được nỗi buồn sâu sắc.", "grammar:を禁じ得ない", "禁じ得なかった|感情を禁じ得ない là không thể kìm nén cảm xúc.", "禁じられていた|悲しみを禁じられる là bị cấm buồn, khác với cảm xúc trào lên.", "禁じさせた|Là khiến ai đó cấm cảm xúc, không nói nỗi buồn của người nhìn.", "禁じてはいけなかった|Không được phép cấm nỗi buồn là nghĩa vòng khác, không diễn tả không nén được."),
 Q("実情に（　）、支援の方法を見直す必要がある。", "Cần xem lại phương thức hỗ trợ cho sát tình hình thực tế.", "grammar:に即して", "即して|実情に即して là căn cứ, phù hợp với hoàn cảnh thực tế.", "かまけて|にかまけて là mải mê xao nhãng việc khác, không phù hợp phương pháp hỗ trợ sát thực tế.", "かこつけて|にかこつけて là vin cớ, không phải điều chỉnh chân thành theo thực trạng.", "あっての|実情にあっての sai cách nối; NあってのN là nhờ có N mới có N khác."),
 Q("弱い立場の人を利用するとは、指導者にある（　）行為だ。", "Lợi dụng người yếu thế là hành vi không thể chấp nhận ở một người lãnh đạo.", "grammar:まじき", "まじき|Nにあるまじき行為 là hành vi không xứng với vị thế N.", "べからず|べからず dùng kết thúc lời cấm, không trực tiếp bổ nghĩa 行為 ở đây.", "べくして|べくして diễn tả hợp lẽ xảy ra, không phê phán hành vi không xứng.", "かたがた|かたがた đi sau danh từ để nói nhân tiện, không gắn ある như mẫu này."),
 Q("この資料は、許可なく社外に持ち出す（　）。", "Tài liệu này cấm mang ra ngoài công ty khi chưa được phép.", "grammar:べからず", "べからず|Vるべからず dùng văn bản trang trọng, mệnh lệnh cấm.", "べくも|べくも thiếu phần phủ định thường đi sau và không hoàn tất lệnh cấm.", "まじきの|まじき bổ nghĩa danh từ không thêm の, cũng không kết thúc lệnh cấm như thế này.", "ともなく|ともなく là không chủ ý làm gì, không diễn tả cấm đưa tài liệu ra ngoài."),
 Q("彼女は研究を続ける（　）、地域の子どもに科学を教えている。", "Bên cạnh nghiên cứu, cô ấy còn dạy khoa học cho trẻ địa phương.", "grammar:かたわら", "かたわら|Vるかたわら diễn tả hoạt động phụ song song với công việc chính lâu dài.", "が早いか|が早いか chỉ hành động nối tiếp tức thì, không phải hai hoạt động lâu dài.", "や否や|や否や là ngay khi vừa, không biểu thị đồng thời lâu dài.", "そばから|そばから thường việc vừa làm lại bị lặp/đảo ngược, không nêu nghề song song."),
 Q("地域の一日も早い復興を願って（　）。", "Tôi luôn tha thiết mong địa phương sớm phục hồi.", "grammar:てやまない", "やまない|Vてやまない diễn tả cảm xúc mong ước bền bỉ, sâu sắc.", "ならではだ|ならでは cần danh từ trước, không nối sau 願って.", "までのことだった|までのことだ là chỉ cần làm, không nối trực tiếp với 願って.", "ずにはおかない|ずにはおかない cần thân phủ định như 願わず, không theo 願って và nghĩa cũng khác."),
 Q("彼は今にも泣き出さ（　）の表情で、こちらを見た。", "Anh ấy nhìn về phía tôi với vẻ mặt như sắp òa khóc.", "grammar:んばかり", "んばかり|Vない bỏ ない + んばかり: như sắp làm gì; 泣き出さ + んばかり.", "ずじまい|ずじまい là rốt cuộc không làm, không diễn tả vẻ sắp khóc.", "ないまでも|ないまでも là dù chưa đến mức làm, không đi cùng の表情 để nói sắp òa khóc.", "ざるを得ない|ざるを得ない là buộc phải làm, không phải mẫu mô tả vẻ mặt sắp làm.",),
],
"sort": [
 O("現場の事情を", ["知らない", "までも", "知ろうとする", "姿勢は"], "必要だ。", "Dù chưa biết rõ thực tế, vẫn cần thái độ muốn tìm hiểu."),
 O("この成果は", ["多くの人", "の", "協力", "なくしては"], "得られなかった。", "Không có sự hợp tác của nhiều người thì không đạt được thành quả này."),
 O("この制度は", ["地域", "の", "実情", "に即して"], "見直すべきだ。", "Chế độ này cần được xem lại sát với thực trạng địa phương."),
 O("説明を", ["聞いた", "ところで", "納得できる", "とは"], "限らない。", "Dù nghe giải thích cũng không chắc thuyết phục được mình."),
],
"cloze": P("cloze", "便利さの前提", [
 S("手続きをオンラインにすれば、|Nếu chuyển thủ tục lên trực tuyến,", "窓口に出向く手間を省ける。|có thể bỏ bớt công đi đến quầy."),
 S("利用者の負担が減るのは|Việc gánh nặng người dùng giảm", "喜ばしいことに違いない。|chắc chắn là điều đáng mừng.", blank="利用者の負担が減るのは喜ばしい（　）。"),
 S("ただ、その負担は|Nhưng gánh nặng ấy", "本当に全員にとって減ったのだろうか。|liệu thật sự đã giảm với mọi người chưa?"),
 S("端末を持たない人にとっては、|Với người không có thiết bị,", "操作方法以前に利用の入り口が失われかねない。|ngay trước vấn đề thao tác, lối tiếp cận đã có nguy cơ mất đi.", blank="端末を持たない人にとっては、操作方法以前に利用の入り口が（　）。"),
 S("効率化を進めるにしても、|Dù thúc đẩy hiệu quả,", "その前提から外れる人への対応を考えずには済まされない。|cũng không thể bỏ qua việc hỗ trợ người nằm ngoài tiền đề ấy.", blank="効率化を進める（　）、その前提から外れる人への対応を考えずには済まされない。"),
 S("便利さは手段の新しさだけではなく、|Sự tiện lợi không chỉ ở phương tiện mới,", "必要な人が実際に使えるかどうかによって問われるべきだ。|mà cần được xét qua việc người cần có thực sự dùng được hay không.", blank="便利さは手段の新しさ（　）、必要な人が実際に使えるかどうかによって問われるべきだ。"),
 ], [
 Q("利用者の負担が減るのは喜ばしい（　）。", "Việc gánh nặng người dùng giảm là điều đáng mừng.", "grammar:に違いない", "ことに違いない|ことに違いない công nhận lợi ích chắc chắn rồi câu sau đặt giới hạn về đối tượng hưởng lợi.", "ばかりのことはない|ばかりのことはない không phải cách công nhận lợi ích tự nhiên trong câu này.", "べからざることだ|べからざる là điều không được, trái với đánh giá 喜ばしい.", "まじきことだ|まじき là không nên, không phù hợp nhận xét lợi ích đáng mừng.", evidence=[2]),
 Q("端末を持たない人にとっては、操作方法以前に利用の入り口が（　）。", "Với người không thiết bị, có nguy cơ mất cả lối tiếp cận.", "grammar:かねない", "失われかねない|V thân ます + かねない chỉ nguy cơ không mong muốn có thể xảy ra.", "失われるまでもない|るまでもない là không cần làm đến mức đó, không phải nguy cơ mất tiếp cận.", "失われてやまない|てやまない dùng cảm xúc tha thiết, không dùng cho lối tiếp cận bị mất.", "失われるならではだ|ならでは cần danh từ và nét độc đáo tích cực, không đúng cách nối.", evidence=[4]),
 Q("効率化を進める（　）、その前提から外れる人への対応を考えずには済まされない。", "Dù tăng hiệu quả cũng phải nghĩ đến người nằm ngoài tiền đề.", "grammar:にしても", "にしても|Vるにしても là dù chọn làm thì vẫn cần điều kiện/lưu ý khác.", "そばから|そばから là vừa làm xong lại..., không nêu điều cần cân nhắc khi chọn hiệu quả hóa.", "が早いか|が早いか nêu hai hành động tức thì nối tiếp, không phải nhượng bộ.", "や否や|や否や cũng chỉ vừa mới là ngay lập tức, không phù hợp lập luận điều kiện.", evidence=[5]),
 Q("便利さは手段の新しさ（　）、必要な人が実際に使えるかどうかによって問われるべきだ。", "Sự tiện lợi không chỉ xét độ mới mà còn khả năng dùng thực tế.", "grammar:だけではなく", "だけではなく|Nだけではなく mở rộng tiêu chí từ độ mới sang khả năng tiếp cận thực tế.", "にほかならず|にほかならず khẳng định tiện lợi chính là độ mới, trái với kết luận mở rộng tiêu chí.", "をよそに|をよそに là mặc kệ, không tạo cấu trúc so hai tiêu chí trong câu.", "にかまけて|にかまけて là mải mê bỏ việc khác, không gắn với 便利さは theo ý đánh giá.", evidence=[6]),
 ]),
"reading": [
 P("prose", "残った訂正", [
 S("地域史の冊子を改訂したとき、|Khi sửa sách nhỏ về lịch sử địa phương,", "編集者は旧版の誤りを一覧にして巻末に残した。|biên tập viên giữ một danh sách lỗi bản cũ ở cuối sách."),
 S("直したのなら古い誤りは消してよいという意見もあったが、|Có ý kiến cho rằng sửa rồi thì có thể xóa lỗi cũ đi,", "それでは旧版を読んだ人が変更に気づけない。|nhưng như vậy người từng đọc bản cũ không nhận ra thay đổi."),
 S("訂正を見える形にするのは、|Làm đính chính thành thứ nhìn thấy được", "誤りを誇るためではなく、読者が自分の理解を更新できるようにするためである。|không phải để khoe lỗi, mà để người đọc cập nhật hiểu biết của mình."),
 S("正確さを求める仕事には、|Công việc theo đuổi tính chính xác", "現在の記述だけでなく、変えた経緯への責任も含まれる。|bao gồm cả trách nhiệm với quá trình đã thay đổi, không chỉ nội dung hiện tại."),
 ], [
 Q("旧版の誤りを一覧にした理由は何か。", "Vì sao liệt kê các lỗi của bản cũ?", "reading:reason", "以前の読者が自分の理解を修正できるようにするため|Câu 2-3 nêu người đã đọc bản cũ cần biết thay đổi để cập nhật hiểu biết.", "旧版を読んだ人を批判するため|Không nhằm chê người đọc mà hỗ trợ họ nhận ra đính chính.", "旧版のほうが正確だったと示すため|Bản cũ có lỗi đã sửa, không được coi chính xác hơn.", "現在の記述を検証しなくて済むようにするため|Công khai lịch sử chỉnh sửa bổ sung trách nhiệm chứ không miễn kiểm chứng hiện tại.", evidence=[2,3]),
 Q("筆者のいう責任とは何か。", "Trách nhiệm tác giả nói đến là gì?", "reading:main_idea", "正しい内容とともに、変更の経緯を読者に示すこと|Câu cuối mở rộng trách nhiệm từ nội dung hiện tại đến quá trình thay đổi.", "一度出版した内容を絶対に変えないこと|Sửa sai là việc đã làm và được ủng hộ.", "誤りを一切認めず現在の版だけを売ること|Bài coi công khai đính chính là cần thiết, không giấu lỗi.", "旧版の読者に新しい版の購入を義務づけること|Không có yêu cầu bắt người đọc mua lại.", evidence=[3,4]),
 ]),
 P("prose", "比較の物差し", [
 S("二つの町の暮らしやすさを比較する記事で、|Trong bài so sánh độ dễ sống của hai thị trấn,", "駅からの距離や店舗数が点数化されていた。|khoảng cách đến ga và số cửa hàng đã được chấm điểm."),
 S("測りやすい指標を用いれば、|Nếu dùng chỉ số dễ đo,", "誰もが同じ手順で計算できる。|ai cũng tính được theo cùng trình tự."),
 S("だが、同じ距離でも坂が多いかどうかで、|Nhưng cùng khoảng cách mà có nhiều dốc hay không", "歩く人の負担は変わる。|thì gánh nặng người đi bộ sẽ khác."),
 S("店舗数が同じでも、|Dù số cửa hàng như nhau,", "日用品を買える店があるか、夜まで開いているかによって意味は異なる。|ý nghĩa vẫn khác tùy có chỗ mua đồ thiết yếu và có mở đến tối không."),
 S("指標を増やせば解決するとも限らない。|Tăng chỉ số cũng không chắc giải quyết được.", "何に重みを置くかという選択は、計算の前にすでに行われている。|Việc chọn coi trọng điều gì đã diễn ra trước cả phép tính."),
 S("通勤する人と家で過ごす時間の長い人では、|Người đi làm hằng ngày và người ở nhà nhiều", "必要とする便利さが一致するとは限らない。|không nhất thiết cần cùng kiểu tiện lợi."),
 S("順位は比較を始める入り口にはなるが、|Thứ hạng có thể là lối bắt đầu so sánh,", "自分の生活を代わりに判断してくれるわけではない。|nhưng không thể thay mình phán đoán cuộc sống bản thân."),
 S("物差しを捨てるのではなく、|Không phải bỏ thước đo,", "誰のどのような暮らしを想定したものかを確かめながら使いたい。|mà nên dùng trong khi xác nhận nó giả định cuộc sống kiểu nào của ai."),
 ], [
 Q("筆者が、指標を増やせばよいとは言えないとする理由は何か。", "Vì sao tác giả nói không thể chỉ tăng số chỉ số là đủ?", "reading:reason", "何を重視するかが人の暮らし方によって異なるから|Vấn đề nằm ở việc chọn trọng số và giả định nhu cầu, không chỉ số lượng chỉ số.", "指標が増えると距離が測れなくなるから|Không có việc khoảng cách bỗng không đo được.", "計算の方法は誰にも理解できないから|Câu 2 nói chỉ số dễ đo giúp mọi người tính cùng cách.", "店舗数は常に暮らしやすさと無関係だから|Bài không nói hoàn toàn vô can; cần biết loại hàng và giờ mở cửa.", evidence=[4,5,6]),
 Q("筆者が順位や指標に対して勧める態度はどれか。", "Tác giả khuyến nghị thái độ nào với thứ hạng và chỉ số?", "reading:main_idea", "想定される生活像を確認し、自分の判断の材料として使う|Câu cuối yêu cầu biết thước đo dành cho ai rồi dùng như đầu mối quyết định.", "最高順位の町を誰もが無条件に選ぶ|Thứ hạng không thay được phán đoán cho lối sống riêng.", "比較に数字を使うことを全面的にやめる|Tác giả nói không phải vứt bỏ thước đo.", "自分の暮らしより店舗数だけを優先する|Bài phản đối đồng nhất nhu cầu đa dạng với một con số.", evidence=[6,7,8]),
 ]),
 P("pair", "地域の記憶を残す", [
 S("古い商店街の記録を残すなら、|Nếu lưu ký ức của khu phố buôn bán cũ,", "建物の写真だけでなく、そこで営まれた日常を聞き取るべきだ。|nên ghi lời kể về sinh hoạt từng có chứ không chỉ ảnh tòa nhà.", label="A"),
 S("何時に店を開け、誰と声を交わしたかという話は、|Chuyện mở cửa lúc mấy giờ, chào hỏi ai", "地図には表れない関係を伝える。|truyền lại các quan hệ không hiện trên bản đồ."),
 S("ただし、懐かしいという感情だけで整理せず、|Tuy nhiên không nên chỉ sắp xếp theo cảm giác hoài niệm,", "時期や場所を照合できる情報も添える必要がある。|mà cần kèm thông tin đối chiếu thời gian, địa điểm."),
 S("聞き取りは貴重だが、|Ghi lời kể là quý,", "語られた記憶を地域全体の記憶と同一視してはならない。|nhưng không được đồng nhất ký ức đã kể với ký ức toàn vùng.", label="B"),
 S("声を上げやすい人の話だけが残ると、|Nếu chỉ còn lời người dễ lên tiếng,", "その場にいたのに記録されない人が生まれる。|sẽ có người từng ở đó mà không được ghi lại."),
 S("資料には誰からいつ聞いたかを明記し、|Tư liệu cần ghi rõ nghe từ ai, lúc nào", "別の経験を加えられる余地を開いておくべきだ。|và chừa chỗ bổ sung những trải nghiệm khác."),
 S("完成した一つの物語を急ぐより、|Thay vì vội tạo một câu chuyện hoàn chỉnh,", "異なる記憶が並び立つ形を保ちたい。|tôi muốn giữ hình thức các ký ức khác nhau cùng tồn tại."),
 ], [
 Q("AとBに共通している考えは何か。", "Quan điểm chung của A và B là gì?", "reading:comparison", "聞き取った話に、確認や位置づけに必要な情報を添えるべきだ|A yêu cầu thông tin đối chiếu thời gian nơi chốn, B yêu cầu ai kể khi nào; đều muốn đặt lời kể trong bối cảnh.", "写真があれば聞き取りは不要だ|A yêu cầu cả đời sống qua lời kể; B cũng công nhận nghe kể quý.", "地域の記憶は一つの結論に統一すべきだ|B rõ ràng muốn giữ ký ức đa dạng song song.", "懐かしい話以外は記録しないほうがよい|A không muốn chỉ theo hoài niệm; B muốn mở thêm trải nghiệm khác.", evidence=[1,3,4,6]),
 Q("Bが特に注意している点は何か。", "B đặc biệt lưu ý điều gì?", "reading:comparison", "記録に残った語りが全員の経験を代表するとは限らないこと|B cảnh báo người khó lên tiếng có thể bị bỏ sót, nên không đồng nhất lời đã ghi với toàn vùng.", "昔の話はすべて事実と異なること|B không phủ định mọi ký ức là sai, chỉ nói tính đại diện có giới hạn.", "建物の写真は人の話より必ず優れること|B không lập thứ bậc tuyệt đối giữa ảnh và lời kể.", "異なる経験を追加すると記録の価値がなくなること|Ngược lại B muốn mở chỗ bổ sung trải nghiệm khác.", evidence=[4,5,6,7]),
 ]),
 P("info", "共同研究助成の募集", [
 S("応募できるのは、|Đối tượng được nộp đơn", "異なる二機関以上に所属する研究者三名以上のチームです。|là nhóm ít nhất ba nhà nghiên cứu thuộc ít nhất hai cơ quan khác nhau."),
 S("代表者は常勤である必要がありますが、|Đại diện cần làm việc toàn thời gian,", "他の構成員の雇用形態は問いません。|còn hình thức tuyển dụng của thành viên khác không bị giới hạn."),
 S("申請書は今月末日の午後五時までに|Đơn phải được nộp trước hoặc đúng năm giờ chiều ngày cuối tháng này", "電子システムで提出してください。|qua hệ thống điện tử."),
 S("所属機関の承認書に限り、|Riêng giấy chấp thuận của cơ quan", "翌月三日の正午まで追加提出を認めます。|được bổ sung đến trưa ngày ba tháng sau."),
 S("審査では研究計画の独自性に加え、|Khi xét ngoài tính độc đáo của kế hoạch,", "異なる専門を結び付ける必要性も重視します。|cũng coi trọng sự cần thiết kết nối chuyên môn khác nhau."),
 S("同一内容の計画が他の助成に採択された場合は、|Nếu cùng nội dung kế hoạch được một quỹ khác chấp thuận,", "本助成への申請を取り下げてください。|hãy rút đơn xin quỹ này."),
 ], [
 Q("応募条件を満たすチームはどれか。", "Nhóm nào đáp ứng điều kiện nộp đơn?", "reading:information", "二機関に所属する三名で、代表者が常勤のチーム|Đủ ít nhất hai cơ quan, ba người và đại diện toàn thời gian; thành viên khác không bị giới hạn.", "一機関の常勤研究者五名のチーム|Dù đủ người, chỉ một cơ quan nên không đạt điều kiện.", "三機関の研究者二名のチーム|Nhóm chỉ hai người không đạt tối thiểu ba người.", "二機関の三名で、代表者も全員非常勤のチーム|Đại diện phải toàn thời gian, không thể tất cả bán thời gian.", evidence=[1,2]),
 Q("締め切りに関する説明として正しいものはどれか。", "Giải thích nào đúng về hạn nộp?", "reading:information", "申請書は今月末日までに提出し、承認書だけは後日補える|Đơn đúng hạn 17 giờ cuối tháng; chỉ giấy chấp thuận được thêm đến trưa ngày 3 tháng sau.", "すべての書類を翌月三日の午後五時まで出せばよい|Không dời tất cả giấy tờ; hạn thêm giấy cũng là trưa, không phải 17 giờ.", "承認書がない場合は申請書も翌月まで待ってよい|Ngoại lệ chỉ cho giấy chấp thuận, không cho đơn chính.", "電子提出できない場合は郵送すればよい|Quy định chỉ nêu nộp điện tử, không có ngoại lệ gửi bưu điện.", evidence=[3,4]),
 ]),
]},
]
