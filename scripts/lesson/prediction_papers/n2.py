from common import Q, R, S, O, P

TESTS = [
{
"vocab": [
[
 R("調査の結果を公表した。", "Họ đã công bố kết quả khảo sát.", "公表", "こうひょう", "công bố", "こうびょう|表 trong 公表 đọc ひょう, không phải びょう.", "くひょう|公 đọc こう có âm dài, không phải く.", "こうひょ|表 có âm dài ひょう, không phải ひょ."),
 R("十分な睡眠を取ることが大切だ。", "Ngủ đủ giấc là điều quan trọng.", "睡眠", "すいみん", "giấc ngủ", "すいめん|すいめん là 水面 (mặt nước), không phải 睡眠.", "ずいみん|睡 đọc すい, không đục thành ずい.", "すみん|睡 có âm すい, không bỏ い."),
 R("計画の実施には慎重な判断が必要だ。", "Việc thực hiện kế hoạch cần sự phán đoán thận trọng.", "慎重", "しんちょう", "thận trọng", "しんじゅう|重 ở đây đọc ちょう, không phải じゅう.", "しんちょ|重 có âm dài ちょう, không phải ちょ.", "じんちょう|慎 đọc しん, không phải じん."),
 R("会場への道は坂が多い。", "Đường đến hội trường có nhiều dốc.", "坂", "さか", "dốc", "さけ|さけ là cá hồi hoặc rượu, không phải 坂.", "はん|坂 có âm Hán はん trong từ khác, nhưng danh từ độc lập ở đây là さか.", "いた|いた là 板 (tấm ván), chữ khác với 坂."),
],
[
 Q("計画のへんこうを全員に伝えた。", "Tôi đã báo thay đổi kế hoạch cho mọi người.", "kanji:writing", "変更|変更 đọc là へんこう, nghĩa là thay đổi kế hoạch, quy định.", "変化|変化 đọc へんか, thường chỉ biến đổi trạng thái, không phải へんこう.", "返校|返校 không phải từ thông dụng chỉ thay đổi; chữ 返 là trả lại.", "偏向|偏向 cũng đọc へんこう nhưng là thiên lệch, không phải đổi kế hoạch.", target="へんこう"),
 Q("けいやくの内容を確認した。", "Tôi đã kiểm tra nội dung hợp đồng.", "kanji:writing", "契約|契約 là hợp đồng, đọc けいやく.", "計略|計略 đọc けいりゃく, nghĩa là mưu kế.", "契訳|契訳 không phải cách viết chuẩn của hợp đồng; cần 約.", "軽約|軽約 không phải cách viết chuẩn của けいやく.", target="けいやく"),
 Q("新しい制度をどうにゅうした。", "Họ đã áp dụng chế độ mới.", "kanji:writing", "導入|導入 là đưa vào áp dụng, hợp với 制度.", "投入|投入 đọc とうにゅう, là đưa nguồn lực vào, không phải どうにゅう.", "同入|同入 không phải cách viết chuẩn cho đưa chế độ vào áp dụng.", "道入|道 là đường; từ cần chữ 導 chỉ dẫn dắt.", target="どうにゅう"),
 Q("この方法なら費用をせつやくできる。", "Cách này có thể tiết kiệm chi phí.", "kanji:writing", "節約|節約 là tiết kiệm, đọc せつやく.", "制約|制約 đọc せいやく, nghĩa là hạn chế/ràng buộc.", "節役|Tiết kiệm viết 約, không phải 役 chỉ vai trò.", "接約|接 chỉ tiếp xúc, không tạo từ tiết kiệm chuẩn.", target="せつやく"),
],
[
 Q("議論が長引いたが、最終的には全員の意見が（　）した。", "Thảo luận kéo dài nhưng cuối cùng ý kiến mọi người đã thống nhất.", "vocab:一致", "一致|意見が一致する là ý kiến thống nhất, cùng quan điểm.", "接近|接近する là tiến gần về vị trí/mức độ; không diễn tả đã thống nhất hoàn toàn như 最終的には ở đây.", "通過|通過する là đi qua, không dùng cho ý kiến thống nhất.", "所属|所属する là thuộc một tổ chức, không dùng với 意見が."),
 Q("相手の話を最後まで聞かずに判断するのは（　）だ。", "Phán xét khi chưa nghe hết lời người khác là hấp tấp.", "vocab:軽率", "軽率|軽率だ là thiếu suy nghĩ, hấp tấp; hợp với phán xét trước khi nghe đủ.", "誠実|誠実だ là thành thật, không phù hợp hành vi vội kết luận.", "円満|円満だ là êm đẹp, hòa thuận, không tả cách đánh giá vội.", "豊富|豊富だ là phong phú, không miêu tả sự thiếu thận trọng."),
 Q("この資料は社外には出せないので、取り扱いには十分（　）してください。", "Tài liệu này không được đưa ra ngoài công ty nên hãy hết sức chú ý khi xử lý.", "vocab:注意", "注意|取り扱いに注意する là chú ý khi xử lý tài liệu cần bảo mật.", "応援|応援する là cổ vũ, không dùng với việc xử lý tài liệu.", "納得|納得する là hiểu và chấp nhận, không kết hợp 取り扱いには theo nghĩa cẩn thận.", "招待|招待する là mời tham dự, không liên quan giữ bí mật tài liệu."),
 Q("締め切りまで時間がない。細かい表現より、まず全体の（　）を決めよう。", "Không còn nhiều thời gian trước hạn. Thay vì tiểu tiết câu chữ, trước tiên hãy xác định cấu trúc toàn bài.", "vocab:構成", "構成|全体の構成 là bố cục tổng thể, đối lập với từng cách diễn đạt nhỏ.", "天候|天候 là thời tiết, không dùng cho bố cục tài liệu.", "体温|体温 là thân nhiệt, không phù hợp chủ đề viết.", "通貨|通貨 là tiền tệ, không phải tổ chức nội dung."),
],
[
 Q("今回の案は、いったん保留にしましょう。", "Hãy tạm gác phương án lần này lại.", "vocab:保留", "今は決めず、あとで検討しましょう|保留 là giữ lại chưa quyết định, chờ xem xét sau.", "今すぐ実行しましょう|Thực hiện ngay trái với tạm chưa quyết định.", "二度と検討しないことにしましょう|Vĩnh viễn không xem xét là hủy bỏ, không phải bảo lưu.", "全員に知らせず決めましょう|Quyết định bí mật không phải nghĩa của 保留.", target="保留にしましょう"),
 Q("彼の説明は具体的だった。", "Giải thích của anh ấy rất cụ thể.", "vocab:具体的", "実際の例や内容がはっきりしていた|具体的 là chỉ rõ nội dung thực tế, không dừng ở khái niệm chung.", "難しい言葉だけを使っていた|Chỉ dùng từ khó không có nghĩa là cụ thể.", "何を言いたいのか全く不明だった|Không rõ muốn nói gì trái với cụ thể.", "事実とは異なる話ばかりだった|Chỉ nói điều sai thực tế không phải nghĩa 具体的.", target="具体的"),
 Q("この機械は従来のものより小さい。", "Máy này nhỏ hơn loại trước đây.", "vocab:従来", "これまで使われてきた|従来 chỉ cái từ trước đến nay được dùng.", "今後新しく作られる|Sẽ mới được chế tạo trong tương lai trái với 従来.", "海外でしか使えない|Chỉ dùng ở nước ngoài không phải nghĩa từ này.", "故障してしまった|Đã hỏng nói tình trạng, không phải trước đây.", target="従来"),
 Q("問題の原因を把握する必要がある。", "Cần nắm rõ nguyên nhân vấn đề.", "vocab:把握", "よく理解する|把握する là nắm bắt, hiểu rõ sự việc.", "人に隠す|Che giấu với người khác không phải nắm rõ.", "何も調べずに決める|Không tìm hiểu đã quyết định trái với việc nắm nguyên nhân.", "別の問題に置き換える|Thay bằng vấn đề khác không phải hiểu vấn đề hiện tại.", target="把握する"),
]],
"grammar": [
 Q("経験が豊富な人（　）、必ずしも教えるのが上手だとは限らない。", "Không phải cứ người nhiều kinh nghiệm là nhất thiết dạy giỏi.", "grammar:からといって", "だからといって|Nだからといって〜とは限らない bác bỏ suy luận tuyệt đối từ một điều kiện.", "にしたがって|にしたがって là theo hoặc cùng với thay đổi, không nối suy luận bị bác bỏ.", "を問わず|を問わず là bất kể, không gắn với 人 theo nghĩa vì nhiều kinh nghiệm.", "をきっかけに|をきっかけに là lấy sự kiện làm bước ngoặt, không phải lập luận này."),
 Q("資料を読んだ（　）、参加するかどうか決めてください。", "Hãy đọc tài liệu rồi mới quyết định có tham gia không.", "grammar:たうえで", "うえで|Vたうえで là sau khi hoàn tất, lấy đó làm cơ sở quyết định.", "最中に|最中に là đang giữa lúc; không diễn tả đọc xong làm cơ sở quyết định.", "ばかりに|ばかりに nêu chỉ vì gây kết quả xấu, không phải yêu cầu trình tự.", "につれて|につれて không gắn trực tiếp với 読んだ để nói sau khi hoàn tất."),
 Q("仕事が忙しいからといって、健康を無視する（　）。", "Dù công việc bận cũng không được coi thường sức khỏe.", "grammar:わけにはいかない", "わけにはいかない|Vるわけにはいかない là không thể làm vì lý do đạo lý/trách nhiệm.", "わけではないかもしれない|Không chắc không phải như vậy không đưa ra điều không nên làm ở đây.", "に違いない|に違いない là chắc chắn coi thường sức khỏe, trái với lời răn.", "ほどでもある|ほどでもある không tạo cách nói cấm bỏ qua sức khỏe."),
 Q("この店は安い（　）、品質もよい。", "Cửa hàng này vừa rẻ lại có chất lượng tốt.", "grammar:ばかりか", "ばかりか|〜ばかりか〜も là không chỉ mà còn, cộng hai ưu điểm.", "ばかりに|ばかりに nêu nguyên nhân đáng tiếc, không cộng ưu điểm.", "をもとに|をもとに đi sau danh từ chỉ căn cứ; không nối trực tiếp 安い.", "につけて|につけて thường chỉ mỗi khi, không dùng nối hai ưu điểm như câu này."),
 Q("参加者の増加（　）、会場を変更する必要が出てきた。", "Cùng với số người tham gia tăng, nảy sinh nhu cầu đổi địa điểm.", "grammar:に伴って", "に伴って|Nに伴って chỉ một thay đổi kéo theo thay đổi khác.", "に反して|に反して là trái với, trong khi tăng người là nguyên nhân hợp lý phải đổi chỗ.", "に限って|に限って là riêng/chính lúc, không nêu biến đổi kéo theo.", "に向かって|に向かって là hướng tới, không biểu thị quan hệ số người tăng kéo theo nhu cầu."),
 Q("連絡がない（　）、予定どおり実施します。", "Chừng nào không có thông báo thì sẽ thực hiện đúng kế hoạch.", "grammar:ない限り", "限り|Vない限り là trừ khi có điều kiện xảy ra, nếu không thì tiếp tục.", "わりに|わりに là so với mức kỳ vọng, không đặt điều kiện trừ khi có tin.", "ついでに|ついでに là tiện thể, không diễn tả điều kiện duy trì.", "ところで|Vたところで thường là dù; ở đây ないところで không tạo mẫu trừ khi."),
 Q("この件については、本人に確認して（　）、結論は出せない。", "Về việc này, nếu chưa xác nhận với chính người đó thì chưa thể kết luận.", "grammar:てからでないと", "からでないと|Vてからでないと〜ない nghĩa là phải làm bước trước rồi mới có thể làm bước sau.", "ばかりなら|Vてばかりなら là nếu chỉ toàn, không phù hợp yêu cầu xác nhận trước.", "ほどには|Vてほどには không đúng cấu trúc mức độ ở đây.", "ついでなら|Không nối 確認してついでなら; ついで cũng không chỉ điều kiện tiên quyết."),
 Q("会議の開始に（　）、資料をお配りします。", "Trước khi cuộc họp bắt đầu, chúng tôi sẽ phát tài liệu.", "grammar:に先立って", "先立って|Nに先立って là trước khi sự kiện chính diễn ra.", "したがいまして|開始にしたがいまして nói cùng theo sự bắt đầu, không biểu thị phát tài liệu trước đó.", "応じると|に応じると không nêu việc chuẩn bị trước một sự kiện.", "とっては|にとっては là đối với ai, không đi với 開始 để nêu trình tự."),
],
"sort": [
 O("このサービスは", ["利用する", "人の", "年齢", "を問わず"], "開かれています。", "Dịch vụ này mở cho người sử dụng bất kể tuổi tác."),
 O("この資料は", ["専門家向け", "に", "書かれた", "ものの"], "初心者にも読みやすい。", "Dù được viết cho chuyên gia, tài liệu này người mới cũng dễ đọc."),
 O("詳しいことは", ["本人", "に", "確認した", "うえで"], "お知らせします。", "Tôi sẽ xác nhận với chính người đó rồi mới thông báo chi tiết."),
 O("この制度は", ["利用者", "の", "声", "に基づいて"], "改善されました。", "Chế độ này được cải tiến dựa trên ý kiến người dùng."),
],
"cloze": P("cloze", "会議の短縮", [
 S("わが社では会議が長いことが|Ở công ty chúng tôi, họp quá dài", "課題になっていた。|đã trở thành một vấn đề."),
 S("そこで、議題を事前に共有することに加えて、|Vì vậy ngoài việc chia sẻ nội dung trước,", "終了時刻も決めることにした。|chúng tôi còn quyết định giờ kết thúc.", blank="そこで、議題を事前に共有すること（　）、終了時刻も決めることにした。"),
 S("時間を短くすればよいというわけではなく、|Không có nghĩa chỉ cần rút ngắn thời gian là được,", "必要な議論を残すことが重要だ。|điều quan trọng là vẫn giữ các trao đổi cần thiết.", blank="時間を短くすればよいという（　）、必要な議論を残すことが重要だ。"),
 S("そのため、結論が出なかった議題については、|Vì vậy với nội dung chưa có kết luận,", "何を確認すべきかを記録するようにした。|chúng tôi tạo thói quen ghi lại điều cần xác minh.", blank="（　）、結論が出なかった議題については、何を確認すべきかを記録するようにした。"),
 S("この方法を始めて以来、|Kể từ khi bắt đầu phương pháp này,", "同じ説明を繰り返すことが減った。|việc lặp lại cùng một giải thích đã giảm.", blank="この方法を始めて（　）、同じ説明を繰り返すことが減った。"),
 ], [
 Q("そこで、議題を事前に共有すること（　）、終了時刻も決めることにした。", "Ngoài chia sẻ nội dung trước, chúng tôi còn quyết định giờ kết thúc.", "grammar:に加えて", "に加えて|Nに加えて〜も là bổ sung thêm một biện pháp.", "に反して|に反して là trái với; quyết định giờ không mâu thuẫn chia sẻ nội dung.", "に代わって|に代わって là thay cho, trong khi hai biện pháp được thực hiện cùng nhau.", "に限って|に限って là chỉ riêng, không diễn tả bổ sung.", evidence=[2]),
 Q("時間を短くすればよいという（　）、必要な議論を残すことが重要だ。", "Không phải chỉ rút ngắn giờ là đủ, cần giữ thảo luận cần thiết.", "grammar:わけではない", "わけではなく|わけではなく phủ định kết luận đơn giản rồi bổ sung điều cần coi trọng.", "ことにして|ことにする là quyết định; ở đây tác giả bác bỏ chỉ tiêu đơn thuần rút ngắn.", "つもりで|つもり là ý định cá nhân, không nêu giới hạn của một cách hiểu.", "はずなので|はずなので khẳng định suy luận chỉ cần rút ngắn, trái ý câu sau.", evidence=[3]),
 Q("（　）、結論が出なかった議題については、何を確認すべきかを記録するようにした。", "Vì vậy với vấn đề chưa kết luận, chúng tôi ghi điều cần xác minh.", "grammar:そのため", "そのため|Biện pháp ghi lại điều cần xác minh nhằm giữ chất lượng thảo luận vừa nêu.", "ところが|ところが là thế nhưng, không phù hợp quan hệ mục đích và biện pháp cùng chiều.", "ところで|ところで đổi chủ đề, trong khi vẫn bàn cách cải tiến họp.", "それにもかかわらず|Dù vậy chỉ quan hệ trái kỳ vọng; biện pháp này thực hiện đúng yêu cầu trước.", evidence=[3,4]),
 Q("この方法を始めて（　）、同じ説明を繰り返すことが減った。", "Kể từ khi bắt đầu cách này, việc giải thích lặp đã giảm.", "grammar:て以来", "以来|Vて以来 nêu mốc bắt đầu rồi trạng thái tiếp tục đến nay.", "直前|直前 là ngay trước; không đi sau 始めて để chỉ từ đó đến nay.", "最中|最中 là đang giữa lúc; không nối trực tiếp với 始めて.", "に先立ち|に先立ち là trước sự kiện và đi sau danh từ, không nối 始めて.", evidence=[5]),
 ]),
"reading": [
 P("email", "展示会の写真について", [
 S("先日の展示会で撮影した写真を|Ảnh chụp tại triển lãm vừa qua", "広報誌に掲載したいと考えています。|chúng tôi muốn đăng trên bản tin."),
 S("作品のみが写っている写真は|Ảnh chỉ có tác phẩm", "作者の許可を得ているため、そのまま使用できます。|đã được tác giả đồng ý nên có thể dùng nguyên trạng."),
 S("来場者の顔がわかる写真については、|Với ảnh nhận diện được mặt khách,", "本人の同意を得るか、顔がわからないように加工してください。|hãy xin đồng ý hoặc xử lý để không nhận diện được."),
 S("使用を希望する写真の番号を|Số ảnh muốn dùng", "金曜日までにお知らせください。|xin báo cho chúng tôi trước hoặc trong thứ Sáu."),
 ], [
 Q("来場者の顔がわかる写真を使うには、どうすればよいか。", "Muốn dùng ảnh nhận diện được mặt khách cần làm gì?", "reading:condition", "本人の許可を取るか、顔を特定できないようにする|Câu 3 đưa hai phương án thay thế: đồng ý của người trong ảnh hoặc xử lý không nhận diện.", "作品の作者の許可だけを取る|Cho phép của tác giả chỉ đủ đối với ảnh chỉ có tác phẩm, không thay thế quyền của khách.", "金曜日までに送れば加工は不要だ|Hạn gửi số ảnh không miễn yêu cầu bảo vệ người trong ảnh.", "顔が写っている写真は一切使えない|Có thể dùng nếu đáp ứng một trong hai điều kiện, không cấm tuyệt đối.", evidence=[2,3]),
 Q("このメールで金曜日までに求めていることは何か。", "Thư yêu cầu làm gì chậm nhất thứ Sáu?", "reading:action", "使いたい写真の番号を知らせる|Câu cuối yêu cầu báo số của ảnh muốn sử dụng.", "展示会の作品を返却する|Không có yêu cầu trả tác phẩm.", "広報誌の印刷を終える|Không yêu cầu hoàn tất in bản tin trước thứ Sáu.", "来場者全員の顔写真を撮る|Không yêu cầu chụp thêm ảnh mọi khách.", evidence=[4]),
 ]),
 P("prose", "質問の置き場所", [
 S("会議で質問はないかと聞かれると、|Khi được hỏi có câu hỏi nào không trong cuộc họp,", "私はすぐには何も思いつかないことが多かった。|tôi thường không nghĩ ra ngay điều gì."),
 S("しかし席に戻って資料を読み直すと、|Nhưng khi về chỗ đọc lại tài liệu,", "確認したい点がいくつも出てきた。|tôi lại thấy nhiều điều muốn xác nhận."),
 S("以前は、自分の理解が遅いせいだと思い、|Trước đây tôi nghĩ do mình hiểu chậm", "質問すること自体をためらっていた。|nên ngần ngại cả việc đặt câu hỏi."),
 S("ある上司が、会議の翌日まで質問を受け付ける|Một cấp trên tạo một ô trên mạng nội bộ", "欄を社内サイトに作った。|để nhận câu hỏi đến hết ngày sau cuộc họp."),
 S("すると私だけでなく、|Kết quả là không chỉ tôi", "普段発言の少ない人からも具体的な質問が集まった。|mà cả người ít phát biểu cũng gửi câu hỏi cụ thể."),
 S("質問の多さは説明の失敗とは限らない。|Có nhiều câu hỏi không nhất thiết là giải thích thất bại.", "理解しようとする人が参加できる形になったとも考えられる。|Cũng có thể hiểu rằng cách thức đã cho phép người muốn hiểu tham gia."),
 S("意見が出ないときには、|Khi không có ý kiến,", "人の積極性だけでなく、出せる時間や場所も見直す必要がある。|cần xem lại cả thời gian và nơi phát biểu chứ không chỉ tính chủ động của người tham dự."),
 ], [
 Q("質問欄を作ったあと、どんな変化があったか。", "Sau khi tạo ô nhận câu hỏi, điều gì thay đổi?", "reading:change", "会議中に発言しない人からも具体的な質問が寄せられた|Câu 5 nói người thường ít phát biểu cũng gửi câu hỏi cụ thể.", "会議の資料を読む人がいなくなった|Không có thông tin ngừng đọc tài liệu; việc đọc lại giúp nảy câu hỏi.", "上司が質問に一切答えなくなった|Thiết lập nơi nhận câu hỏi không có nghĩa từ chối trả lời.", "質問するのは筆者だけになった|Bài nói rõ không chỉ người viết mà nhiều người khác cũng hỏi.", evidence=[4,5]),
 Q("筆者の考えに合うものはどれか。", "Ý nào phù hợp với quan điểm người viết?", "reading:main_idea", "意見を出しやすくする仕組みも参加に影響する|Kết luận nhấn mạnh cả thời gian, nơi chốn và hình thức giúp người khác tham gia.", "質問が多いほど説明は必ず失敗している|Câu 6 bác bỏ suy luận câu hỏi nhiều nhất thiết là giải thích thất bại.", "すぐ質問できない人は会議に参加すべきでない|Toàn bài cho thấy họ có thể tham gia nếu có thời gian phù hợp.", "発言しない理由は本人の意欲のなさだけである|Câu cuối nói không chỉ tính chủ động mà còn điều kiện phát biểu.", evidence=[6,7]),
 ]),
 P("pair", "仕事の引き継ぎ", [
 S("引き継ぎの資料は|Tài liệu bàn giao", "できる限り詳しく書くべきだ。|nên được viết càng chi tiết càng tốt.", label="A"),
 S("担当者が変わるたびに説明をやり直すのは|Mỗi lần đổi người phụ trách lại phải giải thích từ đầu", "時間の無駄になる。|là lãng phí thời gian."),
 S("手順だけでなく過去の失敗例も残せば、|Nếu lưu cả trình tự lẫn các ví dụ thất bại trước đây,", "初めての人も同じ間違いを避けられる。|người mới cũng tránh được lỗi tương tự."),
 S("ただし資料は更新されなければ、|Tuy nhiên nếu tài liệu không được cập nhật,", "古い情報が誤解を生むこともある。|thông tin cũ cũng có thể gây hiểu nhầm."),
 S("資料は必要だが、|Tài liệu là cần thiết,", "それだけで引き継ぎが終わるわけではない。|nhưng không có nghĩa chỉ thế là bàn giao xong.", label="B"),
 S("実際に一度作業してもらうと、|Khi để người mới thử làm một lần,", "書き手が当然だと思って省いた説明に気づく。|ta nhận ra những giải thích người viết tưởng đương nhiên nên bỏ qua."),
 S("資料を読んだ人の疑問を聞き、|Nghe thắc mắc của người đọc tài liệu", "必要な点を書き加えていくことが大切だ。|rồi thêm các điểm cần thiết là quan trọng."),
 ], [
 Q("AとBの両方に共通する考えはどれか。", "Quan điểm chung của A và B là gì?", "reading:comparison", "資料は必要であり、内容を見直すことも大切だ|A yêu cầu cập nhật, B yêu cầu bổ sung dựa trên thắc mắc; cả hai đều coi tài liệu cần thiết.", "資料があれば実際の作業は不要だ|B rõ ràng cần cho người mới thử làm thực tế.", "過去の失敗は資料からすべて削るべきだ|A khuyến khích lưu ví dụ thất bại.", "担当者が変わったら資料を全部捨てるべきだ|Cả hai muốn lưu và cải thiện, không bỏ tất cả.", evidence=[3,4,5,7]),
 Q("Bが特に重視していることは何か。", "B đặc biệt coi trọng điều gì?", "reading:comparison", "読み手が試したときの疑問をもとに資料を補うこと|B nhấn mạnh thử thực tế để thấy phần bị lược và bổ sung theo câu hỏi người đọc.", "資料の長さを増やすことだけ|B chú trọng phần còn thiếu cụ thể, không chỉ tăng độ dài.", "失敗例を一切書かないこと|B không phản đối ví dụ thất bại, chỉ bổ sung cách kiểm tra tính đủ dùng.", "担当者の経験に頼って説明を省くこと|Chính việc coi điều gì là đương nhiên rồi lược bỏ là hạn chế B chỉ ra.", evidence=[6,7]),
 ]),
 P("info", "学習室の利用案内", [
 S("個人席は予約不要で、|Ghế cá nhân không cần đặt trước,", "一日三時間まで無料で使えます。|được dùng miễn phí tối đa ba giờ mỗi ngày."),
 S("二人以上で話し合う場合は、|Nếu từ hai người trở lên cần trao đổi,", "グループ室を予約してください。|hãy đặt phòng nhóm."),
 S("グループ室は二人から六人までで、|Phòng nhóm dành cho hai đến sáu người,", "一室一時間五百円です。|phí năm trăm yên mỗi phòng mỗi giờ."),
 S("予約は利用日の七日前から前日まで|Có thể đặt từ bảy ngày trước đến ngày trước khi dùng", "窓口かウェブで受け付けます。|tại quầy hoặc trên web."),
 S("予約を取り消す場合は、|Nếu hủy đặt phòng,", "前日の午後五時までに連絡してください。|hãy báo chậm nhất năm giờ chiều hôm trước."),
 S("個人席では|Tại ghế cá nhân", "会話と通話は禁止です。|cấm trò chuyện và gọi điện."),
 ], [
 Q("四人で二時間話し合いたい。必要なことと料金はどれか。", "Bốn người muốn trao đổi hai giờ. Cần làm gì và phí bao nhiêu?", "reading:information", "前日までにグループ室を予約し、千円払う|Bốn người cần phòng nhóm, đặt chậm nhất hôm trước; 500 yên/phòng/giờ × 2 = 1000 yên.", "予約せず個人席を使い、無料で話し合う|Ghế cá nhân cấm trò chuyện, không đáp ứng nhu cầu.", "当日グループ室を予約し、二千円払う|Không nhận đặt ngày dùng; phí cũng không tính theo đầu người.", "七日前より前に予約し、五百円払う|Chỉ nhận từ bảy ngày trước; hai giờ phải trả 1000 yên.", evidence=[2,3,4,6]),
 Q("予約を取り消すときは、いつまでに連絡するか。", "Khi hủy đặt phòng phải báo chậm nhất khi nào?", "reading:information", "利用する前日の午後五時|Câu 5 quy định chính xác hạn 17 giờ hôm trước.", "利用する当日の午後五時|Ngày dùng đã quá hạn; phải hôm trước.", "利用日の七日前|Bảy ngày trước là lúc bắt đầu nhận đặt, không phải hạn hủy.", "利用が終わったあと|Không thể hủy sau khi đã hết giờ sử dụng theo quy định này.", evidence=[4,5]),
 ]),
]},
{
"vocab": [
[
 R("研究の成果が認められた。", "Thành quả nghiên cứu đã được công nhận.", "成果", "せいか", "thành quả", "せっか|成 đọc せい, không đổi thành âm ngắt trong từ này.", "せいが|果 đọc か, không đục thành が.", "しょうか|しょうか là cách đọc từ khác như 消化, không phải 成果."),
 R("地域の課題について話し合った。", "Chúng tôi thảo luận vấn đề của địa phương.", "課題", "かだい", "vấn đề cần giải quyết", "がだい|課 đọc か, không phải が.", "かたい|題 đọc だい có âm đục, không phải たい.", "かでい|題 đọc だい, không phải でい."),
 R("作業の負担を減らしたい。", "Tôi muốn giảm gánh nặng công việc.", "負担", "ふたん", "gánh nặng", "ぶたん|負 trong từ này đọc ふ, không phải ぶ.", "ふだん|ふだん là 普段 (thường ngày), khác với 負担.", "ふとう|担 đọc たん, không phải とう."),
 R("雨で服が湿っている。", "Quần áo ẩm vì mưa.", "湿って", "しめって", "bị ẩm", "しげって|しげって là 茂って (mọc um tùm), không phải 湿って.", "しまって|しまって có thể là 閉まって, không phải 湿って.", "ぬめって|ぬめって là nhầy trơn, không phải cách đọc 湿って."),
],
[
 Q("地域とのれんけいを強める。", "Tăng cường liên kết với địa phương.", "kanji:writing", "連携|連携 là phối hợp, liên kết cùng làm việc, đọc れんけい.", "連形|形 là hình dạng; không phải cách viết của phối hợp.", "連経|連経 không phải cách viết của hợp tác; cần 携 thay vì 経.", "連計|計 là tính toán; không phải cách viết chuẩn của hợp tác.", target="れんけい"),
 Q("十分なじゅんびが必要だ。", "Cần chuẩn bị đầy đủ.", "kanji:writing", "準備|準備 là chuẩn bị, đọc じゅんび.", "順備|順 là thứ tự; từ chuẩn bị cần chữ 準.", "準美|美 là đẹp, không phải 備 trong chuẩn bị.", "純備|純 là thuần khiết, không tạo từ chuẩn bị chuẩn.", target="じゅんび"),
 Q("商品のじゅようが増えている。", "Nhu cầu đối với sản phẩm đang tăng.", "kanji:writing", "需要|需要 là nhu cầu hàng hóa hoặc dịch vụ, hợp với 商品.", "重要|重要 đọc じゅうよう, nghĩa là quan trọng, không phải nhu cầu.", "受用|受用 không phải từ thường dùng cho nhu cầu thị trường.", "授用|授 là trao dạy, không phải cách viết nhu cầu.", target="じゅよう"),
 Q("説明のこんきょを示してください。", "Hãy chỉ ra căn cứ của lời giải thích.", "kanji:writing", "根拠|根拠 là cơ sở, căn cứ, đọc こんきょ.", "根居|居 là cư trú; không phải chữ 拠 chỉ căn cứ.", "混拠|混 là trộn lẫn, không tạo từ căn cứ.", "根挙|挙 là nêu hoặc giơ lên; từ căn cứ cần 拠.", target="こんきょ"),
],
[
 Q("新しい機械を導入したが、使い方が職員に十分（　）していない。", "Đã đưa máy mới vào nhưng cách dùng chưa được phổ biến đủ đến nhân viên.", "vocab:浸透", "浸透|知識や考えが人々に浸透する là kiến thức hoặc ý tưởng thấm và được hiểu rộng.", "流出|流出する là chảy hoặc rò rỉ ra ngoài, không phải phổ biến nội bộ.", "独占|独占する là độc quyền; 使い方が職員に独占する sai vai trò.", "回収|回収する là thu hồi, không diễn tả nhân viên hiểu cách dùng."),
 Q("調査の対象が一部に（　）いるため、全体の傾向とは言えない。", "Vì đối tượng khảo sát bị thiên về một phần nên chưa thể nói là xu hướng chung.", "vocab:偏る", "偏って|対象が一部に偏る là mẫu tập trung lệch vào một nhóm, dẫn đến thiếu đại diện.", "散らかって|散らかる là bừa bộn về đồ vật, không chỉ sai lệch mẫu.", "ためらって|ためらう là do dự của chủ thể có ý chí, không dùng cho đối tượng khảo sát.", "引き受けて|引き受ける là nhận đảm trách, không đi với 対象が一部に."),
 Q("事故を防ぐため、この計画では利用者の安全を最も（　）すべきだ。", "Để ngăn tai nạn, kế hoạch này cần coi trọng nhất sự an toàn người dùng.", "vocab:重視", "重視|安全を重視する là coi an toàn là ưu tiên quan trọng.", "軽視|軽視 là coi nhẹ, trái với 最も ưu tiên an toàn trong ý câu.", "停止|停止 là dừng hoạt động; không nói 安全を停止する.", "発行|発行 là phát hành tài liệu, không đi với 安全を."),
 Q("二つの案は似ているが、費用の点では大きな（　）がある。", "Hai phương án giống nhau nhưng có khác biệt lớn về chi phí.", "vocab:相違", "相違|相違 là sự khác nhau; hợp cấu trúc giống nhưng xét chi phí thì khác.", "一致|一致 là thống nhất/trùng khớp, trái với đối lập 似ているが ở đây.", "援助|援助 là hỗ trợ, không chỉ quan hệ khác nhau giữa hai phương án.", "満足|満足 là hài lòng, không dùng để nêu chênh lệch chi phí."),
],
[
 Q("この制度は廃止される予定だ。", "Chế độ này dự kiến bị bãi bỏ.", "vocab:廃止", "なくなることになっている|廃止 là dừng và bỏ hẳn chế độ hiện có.", "少しだけ改善される|Cải tiến một chút vẫn giữ chế độ, khác bãi bỏ.", "対象が広げられる|Mở rộng đối tượng không phải bỏ chế độ.", "一週間だけ休まれる|Tạm nghỉ một tuần khác với bãi bỏ lâu dài.", target="廃止される予定だ"),
 Q("彼は発言を控えた。", "Anh ấy hạn chế phát biểu.", "vocab:控える", "話すのをできるだけ少なくした|発言を控える là tự kiềm chế, giảm phát biểu.", "だれよりも長く話した|Nói lâu hơn tất cả trái với hạn chế phát biểu.", "話の内容をすべて忘れた|Quên nội dung không phải nghĩa của 控える.", "話す場所を変更した|Đổi chỗ nói không phải kiềm chế nói.", target="発言を控えた"),
 Q("作業の手順を簡略化した。", "Đã đơn giản hóa trình tự công việc.", "vocab:簡略化", "複雑な部分を減らして簡単にした|簡略化 là lược phần rườm rà để đơn giản hơn.", "工程を増やして詳しくした|Tăng công đoạn, chi tiết hơn không phải giản lược.", "すべての作業を中止した|Dừng toàn bộ công việc khác với đơn giản hóa trình tự.", "担当者だけを入れ替えた|Chỉ đổi nhân sự không đồng nghĩa với giản lược quy trình.", target="簡略化した"),
 Q("もう少し余裕を持って出発したい。", "Tôi muốn khởi hành có dư thời gian hơn một chút.", "vocab:余裕", "時間にゆとりを持って|余裕 trong tình huống khởi hành là có thời gian dự phòng.", "荷物をできるだけ多く持って|Mang nhiều hành lý không phải dư thời gian.", "出発をぎりぎりまで遅らせて|Đợi sát giờ mới đi trái với chừa thời gian.", "目的地を決めずに|Không quyết định điểm đến không có nghĩa có thời gian dư.", target="余裕を持って"),
]],
"grammar": [
 Q("この説明書は、初心者（　）書かれている。", "Hướng dẫn này được viết dành cho người mới.", "grammar:向けに", "向けに|N向けに chỉ đối tượng mà tài liệu được thiết kế hướng đến.", "向きでの|向きでの書かれている sai cách nối với bị động.", "にとっての|にとっての cần danh từ theo sau, không nối trực tiếp 書かれている.", "としての|としての cũng cần danh từ theo sau, không hợp cấu trúc này."),
 Q("長く使う（　）、多少高くても丈夫なものを選びたい。", "Nếu định dùng lâu, tôi muốn chọn loại bền dù hơi đắt.", "grammar:からには", "からには|Vるからには là một khi đã xác định làm thì nên chọn hành động tương xứng.", "ばかりに|ばかりに nêu nguyên nhân đáng tiếc, không diễn tả quyết định phù hợp mục tiêu.", "にすぎず|にすぎず là chỉ đến mức, không nối Vる theo mẫu điều kiện ở đây.", "につれて|につれて là cùng quá trình thay đổi; 長く使う không là biến đổi tương ứng ở câu này."),
 Q("彼が断ったのは、やる気がない（　）、時間が足りないからだ。", "Anh ấy từ chối không phải vì thiếu nhiệt tình mà vì không đủ thời gian.", "grammar:のではなく", "のではなく|AのではなくB khẳng định B mới là nguyên nhân, phủ định cách giải thích A.", "うえに|うえに cộng thêm nguyên nhân A với B, không bác bỏ A như câu này.", "にしても|にしても nhượng bộ A, không tạo sự sửa lại nguyên nhân trực tiếp.", "とともに|とともに là cùng với, không thể hiện phủ định nguyên nhân trước."),
 Q("費用の問題は（　）、まず実現できるかを調べよう。", "Tạm gác vấn đề chi phí, trước tiên hãy xem có thực hiện được không.", "grammar:はともかく", "ともかく|Nはともかく tạm đặt một vấn đề sang bên để bàn việc khác.", "もちろん|はもちろん nghĩa là đương nhiên bao gồm, không phải tạm gác.", "したがって|はしたがって không đúng cấu trúc; したがって nối hệ quả.", "にもかかわらず|はにもかかわらず sai cách nối, cũng không mang nghĩa tạm gác."),
 Q("この町は、観光地として（　）、生活の場としても魅力がある。", "Thị trấn này hấp dẫn không chỉ với tư cách điểm du lịch mà cả nơi sinh sống.", "grammar:のみならず", "のみならず|〜のみならず〜も là không chỉ mà còn, cộng hai vai trò.", "に限られ|に限られ là bị giới hạn, trái với việc thêm vai trò nơi sinh sống.", "に比べて|に比べて cần đối tượng so sánh, không nối sau として như câu này.", "のせいで|のせいで là vì lỗi của, không cộng ưu điểm của thị trấn."),
 Q("本人の同意を得ない（　）、写真を公開することはできない。", "Nếu chưa được người đó đồng ý thì không thể công khai ảnh.", "grammar:ないことには", "ことには|Vないことには〜ない nghĩa là nếu không làm điều kiện trước thì không thể thực hiện.", "ばかりか|ばかりか cộng ý không chỉ, không nêu điều kiện bắt buộc.", "とおりに|Vないとおりに không tạo mẫu điều kiện phải có đồng ý.", "につけ|につけ diễn tả mỗi khi hoặc dù thế nào, không chỉ điều kiện tiên quyết."),
 Q("予算が限られている以上、すべての希望に応える計画は（　）。", "Vì ngân sách có hạn, đáp ứng mọi mong muốn là điều khó thực hiện.", "grammar:がたい", "実現しがたい|V bỏ ます + がたい chỉ việc khó thực hiện trên thực tế.", "実現しがちだ|がちだ là thường hay xảy ra, trái với nhận xét khó làm do thiếu ngân sách.", "実現しきった|しきった là đã làm hết hoàn toàn, không phải đánh giá khó thực hiện.", "実現しつつあった|しつつあった là đã đang dần thực hiện, không nêu hạn chế khó đáp ứng."),
 Q("利用者の声を聞く（　）、制度を見直していく必要がある。", "Cần xem xét lại chế độ đồng thời lắng nghe ý kiến người dùng.", "grammar:とともに", "とともに|Vるとともに nối hai hành động song song cần thực hiện.", "に反して|に反して đi sau danh từ; 聞くに反して không đúng cách nối.", "とはいえない|聞くとはいえない là không thể nói có lắng nghe, không nối yêu cầu cùng làm.", "ばかりを|聞くばかりを không đúng cấu trúc nối với việc cải tiến.",),
],
"sort": [
 O("この案は", ["費用", "の", "点", "から見ると"], "再検討が必要です。", "Xét về chi phí, phương án này cần xem xét lại."),
 O("人手が", ["足りない", "からといって", "確認", "を"], "省くわけにはいきません。", "Không thể bỏ bước kiểm tra chỉ vì thiếu người."),
 O("この調査は", ["実際の", "利用状況", "に", "基づいて"], "行われました。", "Khảo sát này được thực hiện dựa trên tình hình sử dụng thực tế."),
 O("この件は", ["担当者", "に", "相談して", "からでないと"], "判断できません。", "Nếu chưa trao đổi với người phụ trách thì chưa thể phán đoán việc này."),
],
"cloze": P("cloze", "返事を急がせない", [
 S("連絡手段が増えたことで、|Việc có thêm nhiều phương tiện liên lạc", "すぐ返事をするのが当然だと思われることがある。|đôi khi khiến người ta coi phản hồi ngay là đương nhiên."),
 S("しかし、通知が届いたからといって、|Tuy nhiên, nhận được thông báo", "相手がすぐ読めるとは限らない。|không có nghĩa người kia lập tức đọc được.", blank="しかし、通知が届いた（　）、相手がすぐ読めるとは限らない。"),
 S("急ぎの用件なら、|Nếu là việc gấp,", "必要な期限と理由を伝えるべきだ。|nên cho biết thời hạn cần và lý do.", blank="急ぎの用件なら、必要な期限と理由を伝える（　）。"),
 S("そうでなければ、|Nếu không phải việc gấp,", "相手の都合を考えて待つ余裕も必要だ。|cũng cần có sự thong thả chờ theo hoàn cảnh người kia.", blank="（　）、相手の都合を考えて待つ余裕も必要だ。"),
 S("便利な道具を使ううえで、|Khi sử dụng công cụ tiện lợi,", "使う人への配慮を忘れてはならない。|không được quên quan tâm đến người sử dụng.", blank="便利な道具を使う（　）、使う人への配慮を忘れてはならない。"),
 ], [
 Q("しかし、通知が届いた（　）、相手がすぐ読めるとは限らない。", "Thông báo đến không có nghĩa người kia có thể đọc ngay.", "grammar:からといって", "からといって|AからといってBとは限らない bác bỏ suy luận tất yếu từ A đến B.", "とたんに|とたんに là ngay sau khi, không hợp câu bác bỏ suy luận tổng quát.", "うえに|うえに cộng thêm, không thể hiện giới hạn của điều suy ra.", "かわりに|かわりに là thay thế hoặc bù lại, không phù hợp.", evidence=[2]),
 Q("急ぎの用件なら、必要な期限と理由を伝える（　）。", "Nếu việc gấp nên nói rõ hạn và lý do.", "grammar:べきだ", "べきだ|Vるべきだ là lời khuyên về điều nên làm.", "おそれがある|おそれがある là nguy cơ xấu, không phải lời khuyên tích cực.", "にすぎなかった|にすぎなかった là chỉ là, quá khứ, không hợp khuyến nghị hiện tại.", "わけがない|わけがない là không thể nào, phủ nhận việc cần thông báo.", evidence=[3]),
 Q("（　）、相手の都合を考えて待つ余裕も必要だ。", "Nếu không gấp, cần biết chờ xét hoàn cảnh người kia.", "grammar:そうでなければ", "そうでなければ|そう thay cho 急ぎの用件; nếu không phải việc gấp thì nên chờ.", "それにもかかわらず|Dù vậy đặt quan hệ đối lập, không chia hai trường hợp gấp/không gấp.", "その結果|Kết quả là không nối được trường hợp điều kiện đối lập với việc gấp.", "たとえば|Đây không phải ví dụ cho việc nói rõ hạn mà là trường hợp không gấp.", evidence=[3,4]),
 Q("便利な道具を使う（　）、使う人への配慮を忘れてはならない。", "Khi dùng công cụ tiện lợi, không được quên quan tâm đến con người.", "grammar:うえで", "うえで|Vるうえで nghĩa là trong quá trình/xét việc sử dụng, điều cần chú ý.", "ばかりに|ばかりに gắn nguyên nhân với kết quả xấu đã xảy ra, không nêu nguyên tắc dùng công cụ.", "とたん|とたん thường sau Vた, không sau 使う.", "に先立ち|に先立ち đi với danh từ hoặc Vること, không trực tiếp 使うに先立ち trong mẫu này.", evidence=[5]),
 ]),
"reading": [
 P("notice", "講座の録画公開", [
 S("今月の公開講座は、|Buổi chuyên đề công khai tháng này", "終了後に録画を配信します。|sẽ có bản ghi hình được phát sau khi kết thúc."),
 S("録画を見られるのは、|Người được xem bản ghi", "当日参加した方と事前にオンライン視聴を申し込んだ方です。|là người dự trực tiếp và người đã đăng ký xem trực tuyến trước."),
 S("視聴用のリンクは翌日にメールで送り、|Liên kết xem được gửi qua thư điện tử vào ngày hôm sau,", "一週間有効です。|và có hiệu lực một tuần."),
 S("講師への質問は会場でのみ受け付け、|Câu hỏi cho diễn giả chỉ nhận tại hội trường,", "録画視聴者からの質問には対応できません。|không thể tiếp nhận câu hỏi từ người xem ghi hình."),
 ], [
 Q("録画を見ることができるのはだれか。", "Ai có thể xem bản ghi hình?", "reading:condition", "会場参加者と事前にオンライン視聴を申し込んだ人|Câu 2 cho phép hai nhóm này xem, không phải mọi người vô điều kiện.", "当日会場に来た人だけ|Còn có người đăng ký xem trực tuyến trước.", "講座終了後に申し込んだ人すべて|Yêu cầu đăng ký trước, không phải cứ đăng ký sau là được.", "質問をメールで送った人だけ|Quyền xem không dựa trên gửi câu hỏi; cũng không nhận câu hỏi từ người xem ghi hình.", evidence=[2,4]),
 Q("録画を視聴する場合、できないことは何か。", "Khi xem bản ghi, việc nào không thể làm?", "reading:detail", "講師に質問すること|Câu cuối nói chỉ nhận câu hỏi tại hội trường, không hỗ trợ người xem bản ghi.", "翌日に送られたリンクを使うこと|Đây chính là cách được cung cấp để xem.", "配信後一週間以内に見ること|Liên kết có hiệu lực một tuần, nên việc này được phép.", "事前に申し込んで視聴すること|Đăng ký trước là một trong hai cách có quyền xem.", evidence=[3,4]),
 ]),
 P("prose", "数えやすいもの", [
 S("ある図書館は利用状況を知るため、|Một thư viện muốn nắm tình hình sử dụng", "貸し出した本の冊数を毎月集計していた。|nên thống kê số sách cho mượn hằng tháng."),
 S("ところが、館内で資料を読む人や、|Thế nhưng người đọc tư liệu tại chỗ", "調べ物を相談する人はその数に含まれない。|và người nhờ tư vấn tìm tin không có trong con số ấy."),
 S("貸出数が少ない時間を不要と判断して、|Nếu coi giờ có ít lượt mượn là không cần thiết", "開館時間を短くすれば、別の使い方をしている人が困る。|rồi rút ngắn giờ mở cửa, người dùng theo cách khác sẽ gặp khó."),
 S("そこで職員は、貸出数に加え、|Vì vậy ngoài số lượt mượn, nhân viên", "相談件数と館内の滞在状況も記録し始めた。|bắt đầu ghi cả số lượt tư vấn và tình hình ở lại trong thư viện."),
 S("すべてを数字にすればよいのではない。|Không phải cứ biến tất cả thành số là được.", "何を数えた結果なのかを確認しなければならない。|Cần xác nhận con số là kết quả đếm điều gì."),
 S("数字は判断の助けになるが、|Số liệu hỗ trợ phán đoán,", "そこに含まれない活動を見失わないことも重要だ。|nhưng cũng quan trọng là không bỏ quên hoạt động nằm ngoài số liệu."),
 ], [
 Q("貸出数だけで開館時間を決めると、どんな問題があるか。", "Nếu chỉ dựa vào số mượn để quyết giờ mở thì có vấn đề gì?", "reading:inference", "館内で読む人などの利用を見落としてしまう|Số mượn không tính đọc tại chỗ, tư vấn; cắt giờ sẽ bỏ qua nhu cầu đó.", "貸出数が正確に計算できなくなる|Vấn đề không nằm ở phép tính sai mà ở phạm vi đo chưa đủ.", "必ず本の種類が増えすぎる|Không có thông tin số loại sách tăng do cách chọn giờ.", "すべての利用者が同時に来るようになる|Bài không dự báo tất cả khách đến đồng thời.", evidence=[2,3]),
 Q("筆者が数字を使う際に大切だと考えるのは何か。", "Theo tác giả, điều quan trọng khi dùng số liệu là gì?", "reading:main_idea", "数字が示す範囲と、示さない活動を意識すること|Kết luận yêu cầu hiểu phạm vi số liệu và không quên điều nằm ngoài nó.", "数えられない活動には価値がないと決めること|Bài cho thấy hoạt động không nằm trong số mượn vẫn có giá trị.", "どんな判断でも数字を使わないこと|Tác giả vẫn công nhận số liệu hỗ trợ phán đoán.", "すべての活動を一つの数字にまとめること|Bài không muốn gom mọi thứ thành một số, mà muốn hiểu số đo gì.", evidence=[5,6]),
 ]),
 P("pair", "地域の行事", [
 S("地域の行事は、|Sinh hoạt cộng đồng", "まず続けられる規模にすることが大切だ。|trước tiên cần ở quy mô có thể duy trì.", label="A"),
 S("参加者を増やそうと企画を増やしても、|Dù thêm nhiều chương trình để tăng người tham gia,", "準備する人が疲れてしまえば長くは続かない。|nếu người chuẩn bị kiệt sức thì không thể lâu bền."),
 S("内容を絞り、|Nên chọn lọc nội dung", "毎年無理なく開ける形を目指すべきだ。|và hướng đến hình thức có thể tổ chức hằng năm mà không quá sức."),
 S("地域の行事が毎年同じ顔ぶれになるのは、|Việc sinh hoạt cộng đồng năm nào cũng chỉ có cùng những gương mặt", "新しい人が入りにくいからかもしれない。|có thể vì người mới khó gia nhập.", label="B"),
 S("従来の準備方法を当然とせず、|Không nên coi cách chuẩn bị lâu nay là đương nhiên,", "短い時間だけでも手伝える仕事を示してはどうか。|mà thử nêu những việc có thể giúp dù chỉ trong thời gian ngắn."),
 S("仕事を分けて選べるようにすれば、|Nếu chia việc để người tham gia lựa chọn,", "初めての人も参加しやすくなる。|người mới cũng dễ góp mặt hơn."),
 S("続けるためには、|Để duy trì,", "今いる人以外の力も借りられる工夫が必要だ。|cần nghĩ cách huy động cả người ngoài nhóm hiện tại."),
 ], [
 Q("AとBに共通する目的は何か。", "Mục đích chung của A và B là gì?", "reading:comparison", "地域の行事を続けられるようにすること|A thu gọn để duy trì, B mở lối người mới góp sức để duy trì.", "行事を今まで以上に大きくすること|A chủ trương quy mô vừa sức, không nhất thiết mở rộng.", "準備する人を全員入れ替えること|B muốn thêm người, không thay toàn bộ; A không đòi đổi người.", "参加者を毎年同じ人に限定すること|B coi việc chỉ cùng gương mặt là vấn đề cần xử lý.", evidence=[1,3,6,7]),
 Q("Bの提案に最も近いものはどれか。", "Đề xuất nào gần nhất với ý B?", "reading:comparison", "一時間だけ手伝える作業も一覧にして募集する|Việc ngắn, rõ và chọn được giúp người mới góp sức, đúng câu 5-6.", "すべての準備を以前からの担当者だけで行う|B muốn huy động người ngoài nhóm hiện có.", "新しい参加者にも準備の全日程への出席を求める|Yêu cầu toàn bộ thời gian làm khó người mới, trái việc cho giúp ngắn.", "仕事の内容は説明せず、当日来た人に決めさせる|B yêu cầu nêu rõ việc để chọn, không phải giấu nội dung.", evidence=[5,6,7]),
 ]),
 P("info", "市営スポーツ室", [
 S("平日昼間の利用は|Sử dụng ban ngày ngày thường", "午前九時から午後五時まで、一回四百円です。|từ chín giờ đến mười bảy giờ, giá bốn trăm yên một lượt."),
 S("平日夜間と土日祝日は|Buổi tối ngày thường và ngày cuối tuần, ngày lễ", "一回六百円です。|giá sáu trăm yên một lượt."),
 S("回数券は二千円で、|Vé nhiều lượt giá hai nghìn yên,", "平日昼間に六回使えます。|dùng được sáu lần vào ban ngày ngày thường."),
 S("回数券を夜間や土日祝日に使う場合は、|Nếu dùng vé nhiều lượt vào buổi tối hoặc cuối tuần, lễ,", "一回につき二百円を追加してください。|hãy trả thêm hai trăm yên mỗi lượt."),
 S("初めて利用する方は、|Người sử dụng lần đầu", "利用時間にかかわらず、前日までの講習予約が必要です。|bất kể giờ sử dụng đều phải đặt buổi hướng dẫn chậm nhất hôm trước."),
 ], [
 Q("回数券で土曜日に二回利用する場合、追加料金はいくらか。", "Dùng vé nhiều lượt hai lần vào thứ Bảy thì trả thêm bao nhiêu?", "reading:information", "四百円|Mỗi lượt cuối tuần thêm 200 yên, hai lượt là 400 yên.", "二百円|200 yên chỉ là phần thêm cho một lượt, câu hỏi hai lượt.", "六百円|600 yên là giá vé thường một lượt, không phải khoản thêm hai lượt.", "千二百円|1200 yên là hai vé thường, không phải khoản bù khi đã có vé nhiều lượt.", evidence=[2,4]),
 Q("初めて使う人は何をしなければならないか。", "Người dùng lần đầu phải làm gì?", "reading:information", "前日までに講習を予約する|Câu cuối áp dụng cho mọi khung giờ của người dùng mới.", "必ず回数券を買う|Không bắt buộc mua vé nhiều lượt.", "平日昼間にしか利用しない|Không giới hạn giờ; chỉ yêu cầu đặt hướng dẫn trước.", "当日、予約せず講習だけ受ける|Phải đặt chậm nhất hôm trước, không được tự đến không hẹn.", evidence=[5]),
 ]),
]},
]
