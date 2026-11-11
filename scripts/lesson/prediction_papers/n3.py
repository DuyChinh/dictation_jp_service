from common import Q, R, S, O, P

TESTS = [
{
"vocab": [
[
 R("商品の値段を比較しました。", "Tôi đã so sánh giá các sản phẩm.", "比較", "ひかく", "so sánh", "びかく|比 ở đây đọc ひ, không phải び.", "ひこう|較 đọc かく, không phải こう.", "ひっかく|比較 không có âm ngắt っ; cách đọc là ひかく."),
 R("この店では現金で払ってください。", "Ở cửa hàng này hãy thanh toán bằng tiền mặt.", "現金", "げんきん", "tiền mặt", "げんぎん|金 trong 現金 đọc きん, không đục hóa thành ぎん.", "けんきん|現 đọc げん, không phải けん.", "げきん|現 có âm ん trong げん, không được bỏ."),
 R("荷物を預けてから出かけました。", "Tôi gửi hành lý rồi đi ra ngoài.", "預けて", "あずけて", "gửi nhờ giữ", "あづけて|Cách viết kana chuẩn của 預ける là あずける, không phải あづける.", "つづけて|つづけて là 続けて (tiếp tục), không phải 預けて.", "とどけて|とどけて là 届けて (giao đến), không phải 預けて."),
 R("急な変更にも対応できます。", "Chúng tôi có thể ứng phó cả với thay đổi đột xuất.", "変更", "へんこう", "thay đổi", "へんごう|更 trong từ này đọc こう, không phải ごう.", "べんこう|変 đọc へん, không phải べん.", "へんこ|更 có âm dài こう, không phải こ."),
],
[
 Q("大切なデータが消えないように、別の場所にも（　）してあります。", "Để dữ liệu quan trọng không mất, tôi đã lưu ở một nơi khác nữa.", "vocab:保存", "保存|保存する là lưu giữ dữ liệu; phù hợp mục đích tránh mất.", "出席|出席する là tham dự, không đi với データを.", "約束|約束する là hứa, không dùng cho lưu tệp.", "遠慮|遠慮する là ngại hoặc kiềm chế, không dùng với dữ liệu."),
 Q("約束の時間に遅れそうなので、友人に電話で（　）した。", "Vì có vẻ sẽ trễ giờ hẹn, tôi đã gọi điện xin lỗi bạn.", "vocab:謝罪", "謝罪|謝罪する là xin lỗi; hợp việc sắp trễ hẹn với bạn.", "招待|招待する là mời tham dự, không giải quyết việc sắp trễ hẹn.", "注文|注文する là đặt hàng hoặc gọi món, không phải xin lỗi.", "掃除|掃除する là dọn vệ sinh, không thực hiện bằng điện thoại như câu này."),
 Q("電車が止まっているので、別の（　）で会社に行く。", "Vì tàu ngừng chạy nên tôi đi làm bằng phương tiện khác.", "vocab:方法", "方法|別の方法で chỉ bằng cách khác, phù hợp đổi cách đi làm.", "気温|気温 là nhiệt độ không khí, không chỉ phương thức di chuyển.", "景色|景色 là phong cảnh, không đi với で để diễn tả cách đi ở đây.", "性格|性格 là tính cách, không phải cách đến công ty."),
 Q("留学の経験を、将来の仕事に（　）たい。", "Tôi muốn tận dụng kinh nghiệm du học cho công việc tương lai.", "vocab:生かす", "生かし|経験を生かす là phát huy, tận dụng kinh nghiệm; thân 生かし nối たい.", "生き|生きる là sống, tự động từ, không nhận 経験を.", "通い|通う là đi lại thường xuyên, không đi với 経験を.", "暮らし|暮らす là sinh sống, không mang nghĩa phát huy kinh nghiệm."),
],
[
 Q("この作業は一人では困難だ。", "Công việc này khó làm một mình.", "vocab:困難", "難しい|困難だ đồng nghĩa với khó thực hiện.", "必要だ|必要だ là cần thiết, không phải khó.", "安全だ|安全だ là an toàn, không diễn tả khó khăn.", "簡単だ|簡単だ là đơn giản, trái với 困難だ.", target="困難だ"),
 Q("この辺りは以前、畑だった。", "Khu vực này trước đây từng là ruộng.", "vocab:以前", "前は|以前 là trước đây, tương đương 前は trong câu.", "これから|これから là từ bây giờ, không phải trước đây.", "まもなく|まもなく là sắp sửa, chỉ tương lai gần.", "今でも|今でも là ngay cả bây giờ, không phải trước kia.", target="以前"),
 Q("彼は自分の意見をはっきり述べた。", "Anh ấy trình bày rõ ý kiến của mình.", "vocab:述べる", "話した|述べる là trình bày bằng lời; 話した gần nghĩa trong câu này.", "忘れた|Quên là hành động trái với trình bày ý kiến.", "隠した|Che giấu là không bộc lộ, trái với はっきり述べる.", "変えた|Thay đổi ý kiến không đồng nghĩa với trình bày ý kiến.", target="述べた"),
 Q("この道具はかなり便利です。", "Dụng cụ này khá tiện lợi.", "vocab:かなり", "ずいぶん|ずいぶん chỉ mức độ đáng kể, gần với かなり.", "少しも|少しも thường đi với phủ định, không mang nghĩa khá nhiều.", "たった一度|Chỉ một lần nói về số lần, không phải mức độ.", "必ず|必ず nói sự chắc chắn, không biểu thị mức độ tiện lợi.", target="かなり"),
],
[
 Q("「断る」の使い方として正しいものはどれか。", "Câu nào dùng đúng 断る (từ chối)?", "usage:断る", "予定があったので、食事の誘いを断った。|誘いを断る là từ chối lời mời do bận việc.", "駅で電車を断って、会社へ行った。|Lên tàu dùng 乗る, không dùng 断る để chỉ phương tiện.", "紙をはさみで断ってから貼った。|Cắt giấy bằng kéo thường dùng 切る; 断る không mang nghĩa cắt giấy.", "雨が急に断ってきた。|Không dùng 断る cho hiện tượng mưa bắt đầu."),
 Q("「支える」の使い方として正しいものはどれか。", "Câu nào dùng đúng 支える (chống đỡ, hỗ trợ)?", "usage:支える", "家族の言葉が、つらい時期の私を支えてくれた。|Lời động viên hỗ trợ tinh thần cho người gặp khó khăn là cách dùng tự nhiên.", "家族に私を支えてあげた。|家族に私を khiến hướng người hỗ trợ và người nhận lẫn lộn.", "音楽を大きく支えて聞いた。|Không dùng 支える để chỉ tăng âm lượng nhạc.", "空が青く支えている。|Không dùng 支える để miêu tả bầu trời xanh."),
 Q("「減る」の使い方として正しいものはどれか。", "Câu nào dùng đúng 減る (giảm đi)?", "usage:減る", "節約したので、先月より電気代が減った。|電気代が減る là chi phí điện tự giảm đi.", "電気代を減った。|減る là tự động từ, phải dùng が; tha động từ là 減らす.", "会社は社員を減った。|Giảm nhân sự phải dùng 社員を減らした, không phải を減った.", "新しい店がたくさん減って建った。|たくさん建つ là nhiều cửa hàng mọc lên; 減る không bổ nghĩa theo cách này."),
 Q("「伝わる」の使い方として正しいものはどれか。", "Câu nào dùng đúng 伝わる (được truyền đạt)?", "usage:伝わる", "ゆっくり説明したら、気持ちが相手に伝わった。|気持ちが相手に伝わる là cảm xúc được người kia hiểu.", "私は気持ちを相手に伝わった。|Có tân ngữ を thì dùng 伝えた, không dùng tự động từ 伝わった.", "駅を伝わって電車に乗った。|Đi qua ga phải dùng 通るなど, không phải 伝わる.", "この料理を伝わって食べた。|Không dùng 伝わる để diễn tả cách ăn món ăn."),
]],
"grammar": [
 Q("毎日練習して、日本語のニュースが少しわかる（　）なった。", "Nhờ luyện mỗi ngày, tôi bắt đầu hiểu được một chút tin tức tiếng Nhật.", "grammar:ようになる", "ように|Vようになる diễn tả thay đổi khả năng hoặc trạng thái.", "ために|ためになる nghĩa khác và không nối khả năng theo mẫu này.", "ことを|ことをなった sai trợ từ; không tạo mẫu thay đổi khả năng.", "そうを|そうをなった không phải cấu trúc tiếng Nhật."),
 Q("健康のため、毎日歩く（　）にした。", "Vì sức khỏe, tôi quyết định đi bộ mỗi ngày.", "grammar:ことにする", "こと|Vことにする diễn tả quyết định của bản thân.", "もの|ものにする là làm chủ hoặc biến thành của mình, không diễn tả quyết định đi bộ.", "ところ|ところにする không tạo mẫu quyết định hành động.", "はず|はずにする không dùng để diễn tả quyết tâm."),
 Q("昼ごはんを食べた（　）なので、まだおなかがすいていない。", "Vì vừa ăn trưa xong nên tôi chưa đói.", "grammar:たばかり", "ばかり|Vたばかり là vừa mới làm xong, giải thích việc chưa đói.", "まま|食べたまま chỉ trạng thái giữ nguyên, không diễn tả mới ăn.", "はず|食べたはず là lẽ ra/nhớ là đã ăn; không nhấn mạnh vừa mới.", "ほど|食べたほどなので không có mốc so sánh và không diễn tả vừa xong."),
 Q("この問題は、思っていた（　）難しくなかった。", "Câu hỏi này không khó như tôi đã nghĩ.", "grammar:ほどない", "ほど|〜ほど〜ない nghĩa là không đến mức như đối tượng so sánh.", "ばかり|ばかり không tạo so sánh mức độ với phủ định như câu này.", "だけに|だけに nhấn mạnh chính vì, không phải mức độ so sánh.", "たびに|たびに là mỗi lần, không phù hợp việc so sánh dự đoán."),
 Q("日本に住んでいても、毎日日本語を使う（　）ではない。", "Dù sống ở Nhật cũng không có nghĩa ngày nào cũng dùng tiếng Nhật.", "grammar:わけではない", "わけ|わけではない phủ định việc suy ra một kết luận tuyệt đối.", "はず|はずではない thể hiện không đáng lẽ, khác với phủ định khái quát ở đây.", "つもり|つもりではない là không có ý định, không nói quan hệ sống ở Nhật với việc dùng tiếng Nhật.", "ところ|ところではない không tạo ý không nhất thiết ngày nào cũng dùng."),
 Q("先生が丁寧に教えてくれた（　）、試験に合格できた。", "Nhờ thầy cô hướng dẫn cẩn thận, tôi đã thi đỗ.", "grammar:おかげで", "おかげで|おかげで gắn nguyên nhân tích cực với kết quả tốt và lòng biết ơn.", "せいで|せいで thường quy nguyên nhân cho kết quả không mong muốn, không hợp lời biết ơn.", "かわりに|かわりに là thay thế hoặc đánh đổi, không phải nhờ sự giúp đỡ.", "とたんに|とたんに chỉ ngay sau một sự kiện, không nêu công lao của người dạy."),
 Q("この歌を聞く（　）、学生時代を思い出す。", "Mỗi lần nghe bài hát này, tôi lại nhớ thời sinh viên.", "grammar:たびに", "たびに|Vたびに chỉ mỗi lần hành động xảy ra thì có kết quả lặp lại.", "うえで|うえで là sau khi hoặc trên phương diện, không nêu sự lặp lại mỗi lần.", "ところを|ところを thường chỉ đúng lúc hoặc dù đang bận, không là mỗi lần.", "ばかりに|ばかりに nêu chỉ vì mà có kết quả xấu, không phù hợp hồi tưởng lặp lại."),
 Q("同じ言葉でも、使う場面（　）意味が変わる。", "Dù cùng một từ, nghĩa có thể thay đổi tùy ngữ cảnh dùng.", "grammar:によって", "によって|Nによって diễn tả sự khác nhau tùy vào điều kiện.", "について|について là về chủ đề, không chỉ yếu tố làm nghĩa thay đổi.", "にとって|にとって là đối với ai, không dùng cho điều kiện 場面 như câu này.", "に対して|に対して là hướng tới/đối với hoặc đối lập, không diễn tả tùy từng ngữ cảnh."),
],
"sort": [
 O("これは", ["友人", "が", "貸して", "くれた"], "辞書です。", "Đây là từ điển bạn đã cho tôi mượn."),
 O("日本語が", ["上手に", "なる", "ため", "には"], "練習が欠かせません。", "Để giỏi tiếng Nhật thì không thể thiếu việc luyện tập."),
 O("駅へ行く", ["途中で", "会った", "人", "は"], "昔の友人でした。", "Người tôi gặp trên đường đến ga là người bạn cũ."),
 O("この店は", ["値段", "が", "安い", "だけでなく"], "味もいいです。", "Quán này không chỉ rẻ mà còn ngon."),
],
"cloze": P("cloze", "初めての発表", [
 S("先週、授業で|Tuần trước trong giờ học", "初めて日本語で発表した。|tôi lần đầu thuyết trình bằng tiếng Nhật."),
 S("準備する時間は十分あったのに、|Dù có đủ thời gian chuẩn bị,", "前の日まで何も書かなかった。|tôi vẫn không viết gì cho đến hôm trước buổi trình bày.", blank="準備する時間は十分あった（　）、前の日まで何も書かなかった。"),
 S("そのため、|Vì vậy,", "当日の朝まで練習することになった。|tôi rơi vào tình cảnh phải luyện đến tận sáng hôm đó.", blank="（　）、当日の朝まで練習することになった。"),
 S("友人に発表を聞いてもらったおかげで、|Nhờ nhờ bạn nghe thử bài trình bày,", "少し落ち着くことができた。|tôi đã bình tĩnh hơn một chút.", blank="友人に発表を聞いてもらった（　）、少し落ち着くことができた。"),
 S("次の発表では、|Ở lần trình bày tới,", "早めに準備しようと思う。|tôi định chuẩn bị sớm hơn.", blank="次の発表では、早めに準備（　）と思う。"),
 ], [
 Q("準備する時間は十分あった（　）、前の日まで何も書かなかった。", "Dù có đủ thời gian chuẩn bị tôi vẫn không viết gì đến ngày hôm trước.", "grammar:のに", "のに|Có đủ thời gian mà không làm là quan hệ trái mong đợi, dùng のに.", "ので|ので chỉ nguyên nhân; có đủ thời gian không phải lý do hợp lý cho việc trì hoãn được nhấn mạnh.", "ため|ため chỉ mục đích hoặc nguyên nhân, không thể hiện sự đối lập.", "なら|なら là điều kiện; việc đã có đủ thời gian là sự thật, không phải giả định.", evidence=[2]),
 Q("（　）、当日の朝まで練習することになった。", "Vì vậy tôi phải luyện đến tận sáng hôm trình bày.", "grammar:そのため", "そのため|そのため nối hệ quả của việc trì hoãn chuẩn bị.", "ところで|ところで đổi chủ đề, không giải thích hậu quả vừa nêu.", "それなのに|それなのに là vậy mà, trong khi luyện sát giờ là hệ quả dự đoán được.", "たとえば|たとえば đưa ví dụ, không chỉ quan hệ nguyên nhân và hệ quả.", evidence=[2,3]),
 Q("友人に発表を聞いてもらった（　）、少し落ち着くことができた。", "Nhờ bạn nghe thử bài nói, tôi bình tĩnh hơn một chút.", "grammar:おかげで", "おかげで|Sự giúp đỡ của bạn dẫn đến kết quả tích cực, dùng おかげで.", "せいで|せいで quy lỗi cho kết quả xấu, không hợp sự biết ơn ở đây.", "かわりに|かわりに là thay thế/đánh đổi, không nêu lợi ích của sự giúp đỡ.", "とおりに|とおりに là làm theo đúng, không chỉ nguyên nhân bình tĩnh.", evidence=[4]),
 Q("次の発表では、早めに準備（　）と思う。", "Ở buổi trình bày tới tôi định chuẩn bị sớm.", "grammar:意向形と思う", "しよう|V ý chí + と思う diễn tả dự định của người nói.", "して|してと思う không diễn tả ý định chuẩn bị.", "しろ|しろ là mệnh lệnh, không phải ý định tự làm.", "するな|するな là cấm làm, trái với ý sẽ chuẩn bị sớm.", evidence=[5]),
 ]),
"reading": [
 P("email", "資料の確認", [
 S("来週の説明会で使う資料を|Tài liệu dùng cho buổi giới thiệu tuần sau", "メールで送りました。|tôi đã gửi qua thư điện tử."),
 S("内容に間違いがないか、|Xin hãy kiểm tra xem nội dung có sai không", "木曜日の昼までに確認してください。|chậm nhất trưa thứ Năm."),
 S("修正がない場合も、|Ngay cả khi không có chỉnh sửa", "確認したことを知らせてください。|cũng hãy báo đã kiểm tra."),
 S("印刷はこちらでまとめて行うので、|Vì phía tôi sẽ in chung tất cả,", "各自で印刷する必要はありません。|mọi người không cần tự in."),
 ], [
 Q("メールを受け取った人がすることは何か。", "Người nhận thư cần làm gì?", "reading:action", "木曜日の昼までに内容を確認して連絡する|Cần kiểm tra trước hạn và phản hồi cả khi không có lỗi.", "修正があるときだけ金曜日までに返事する|Phải phản hồi cả khi không sửa và hạn là trưa thứ Năm.", "資料を印刷して説明会へ持っていく|Người gửi lo in chung, không yêu cầu người nhận tự in.", "説明会のあとで間違いを調べる|Phải kiểm tra trước buổi giới thiệu, không đợi sau đó.", evidence=[2,3,4]),
 Q("自分で印刷しなくてもよいのはなぜか。", "Vì sao không cần tự in?", "reading:reason", "送り手が全員分を印刷するから|こちらでまとめて行う nghĩa là phía người gửi sẽ in tập trung.", "資料を説明会で使わないから|Tài liệu rõ ràng dùng cho buổi giới thiệu tuần sau.", "間違いが多くて読めないから|Thư yêu cầu kiểm tra lỗi, không khẳng định quá nhiều lỗi.", "確認の返事が必要ないから|Vẫn phải báo đã kiểm tra; không liên quan việc tự in.", evidence=[1,4]),
 ]),
 P("prose", "雨の日の店", [
 S("私が働く喫茶店は、|Quán cà phê nơi tôi làm việc", "駅から少し離れている。|nằm hơi xa ga."),
 S("以前は雨が降ると客が減るので、|Trước đây hễ mưa khách lại giảm,", "店長は雨の日が嫌いだった。|nên chủ quán ghét ngày mưa."),
 S("ある日、入口に傘を忘れた客がいて、|Một hôm có khách để quên ô ở cửa,", "取りに来るまで預かることにした。|chúng tôi quyết định giữ đến khi khách quay lại lấy."),
 S("それを見た別の客が、|Một khách khác nhìn thấy việc đó", "使わない傘を店に寄付してくれた。|đã tặng quán những chiếc ô không dùng."),
 S("今は急な雨のときに|Bây giờ khi trời bất chợt mưa", "その傘を無料で貸している。|quán cho mượn những chiếc ô ấy miễn phí."),
 S("傘を返しに来た人が、|Những người quay lại trả ô", "またコーヒーを飲んでいくこともある。|đôi khi lại uống cà phê rồi mới đi."),
 S("店長は、雨の日にも|Chủ quán bắt đầu nghĩ", "いいことがあると思うようになった。|ngày mưa cũng có điều hay."),
 ], [
 Q("店が傘を貸すようになったきっかけは何か。", "Điều gì mở đầu việc quán cho mượn ô?", "reading:sequence", "客の忘れ物を預かる様子を見て、別の客が傘をくれたこと|Giữ ô khách quên dẫn đến khách khác tặng ô, rồi quán cho mượn số ô ấy.", "店長が雨の日だけ傘を売ろうと考えたこと|Quán cho mượn miễn phí, không bắt đầu từ ý định bán ô.", "駅から傘を買ってほしいと頼まれたこと|Không có yêu cầu mua ô từ phía ga.", "すべての客が傘を返さなくなったこと|Đoạn còn nói có người quay lại trả ô và uống cà phê.", evidence=[3,4,5]),
 Q("店長の考えはどう変わったか。", "Suy nghĩ của chủ quán thay đổi thế nào?", "reading:change", "雨の日にも客とのつながりが生まれると感じるようになった|Ban đầu ghét ngày mưa vì ít khách, sau thấy việc mượn/trả ô tạo cơ hội khách trở lại.", "雨の日は絶対に店を閉めることにした|Không có việc đóng cửa ngày mưa.", "駅の近くへ店を移したくなった|Quán xa ga chỉ là bối cảnh; không có dự định chuyển quán.", "傘を借りる客は来ないほうがよいと思った|Quán tiếp tục cho mượn ô và chủ thấy có điều tốt, không đuổi khách.", evidence=[2,6,7]),
 ]),
 P("prose", "勉強の記録", [
 S("日本語を勉強し始めたころ、|Lúc mới bắt đầu học tiếng Nhật,", "私は毎日新しい単語を三十覚えると決めた。|tôi quyết định mỗi ngày nhớ ba mươi từ mới."),
 S("最初の一週間は頑張れたが、|Tuần đầu tôi cố làm được,", "次の週には疲れて何もしなくなった。|nhưng tuần sau mệt nên chẳng học nữa."),
 S("先生に相談すると、|Khi tôi hỏi ý kiến giáo viên,", "数より続けることを大切にしたらどうかと言われた。|thầy cô khuyên nên coi trọng sự duy trì hơn số lượng."),
 S("そこで、一日五つに減らし、|Vì thế tôi giảm còn năm từ mỗi ngày", "前の日の単語も確認するようにした。|và tạo thói quen ôn từ hôm trước."),
 S("勉強した日はカレンダーに丸を付けると、|Khi đánh dấu tròn trên lịch vào ngày đã học,", "丸が増えるのが楽しみになった。|tôi thấy vui khi số dấu tăng lên."),
 S("忙しい日は一つしか覚えられないこともあるが、|Ngày bận có khi tôi chỉ nhớ được một từ,", "全くやらない日を作らないようにしている。|nhưng cố không để có ngày hoàn toàn bỏ học."),
 S("三か月たった今、|Sau ba tháng đến nay,", "以前より忘れる単語が少なくなった。|số từ tôi quên ít hơn trước."),
 S("自分にできる量を知ることが、|Biết lượng mình làm được", "勉強を長く続ける第一歩なのだと思う。|theo tôi là bước đầu để học lâu dài."),
 ], [
 Q("先生の助言を聞いて、筆者は何を変えたか。", "Sau lời khuyên của giáo viên, người viết đã thay đổi gì?", "reading:detail", "一日に覚える数を減らして復習もするようにした|Câu 4 cho biết giảm từ 30 xuống 5 và ôn lại từ hôm trước.", "毎日三十の単語を覚えるまで寝ないことにした|Đây không phải cách mới; chỉ tiêu 30 từ là điều đã bỏ.", "カレンダーの丸を付けるだけで勉強しなくなった|Dấu tròn ghi ngày đã học, không thay cho việc học.", "忙しい日は一切勉強しないことにした|Người viết cố không có ngày hoàn toàn bỏ học.", evidence=[3,4,6]),
 Q("筆者が最も伝えたいことは何か。", "Điều người viết muốn truyền đạt nhất là gì?", "reading:main_idea", "無理のない量で毎日続けることが大切だ|Toàn bài đối chiếu mục tiêu quá sức với lượng vừa sức duy trì hằng ngày.", "単語は一日に三十以上覚えなければならない|Chỉ tiêu đó làm người viết mệt và bỏ học, trái bài học rút ra.", "復習より新しい単語を増やすことを優先すべきだ|Cách mới có ôn tập và kết quả quên ít hơn.", "カレンダーを買えば勉強は必ず成功する|Lịch là công cụ ghi nhận, không phải điều kiện bảo đảm thành công.", evidence=[4,6,7,8]),
 ]),
 P("info", "週末のボランティア", [
 S("公園の清掃は|Dọn công viên", "土曜日の朝八時からで、予約はいりません。|bắt đầu tám giờ sáng thứ Bảy, không cần đăng ký."),
 S("子どもへの読み聞かせは|Đọc truyện cho trẻ", "土曜日の午後一時からで、木曜日までに申し込みます。|bắt đầu một giờ chiều thứ Bảy, đăng ký trước hoặc trong thứ Năm."),
 S("外国人の生活相談は|Tư vấn đời sống cho người nước ngoài", "日曜日の午後二時からで、通訳経験がある人を募集しています。|diễn ra hai giờ chiều Chủ nhật, tuyển người từng phiên dịch."),
 S("清掃用の道具と|Dụng cụ dọn vệ sinh và", "読み聞かせの本はこちらで用意します。|sách đọc cho trẻ do ban tổ chức chuẩn bị."),
 S("どの活動も|Mọi hoạt động", "参加費は無料です。|đều miễn phí tham gia."),
 ], [
 Q("木曜日までに申し込む必要があるのはどの活動か。", "Hoạt động nào cần đăng ký chậm nhất thứ Năm?", "reading:information", "子どもへの読み聞かせ|Câu 2 quy định riêng đọc truyện phải đăng ký trước hoặc trong thứ Năm.", "公園の清掃|Dọn công viên không cần đăng ký.", "外国人の生活相談|Đoạn này nêu yêu cầu kinh nghiệm, không nêu hạn thứ Năm.", "三つすべての活動|Không áp dụng cho tất cả vì dọn công viên rõ ràng không cần đăng ký.", evidence=[1,2,3]),
 Q("通訳の経験がない人が、申し込まずに参加できるのはどれか。", "Người không có kinh nghiệm phiên dịch có thể tham gia hoạt động nào mà không đăng ký?", "reading:information", "土曜日の公園清掃|Dọn công viên không yêu cầu phiên dịch và không cần đăng ký.", "土曜日の読み聞かせ|Đọc truyện cần đăng ký trước, không đáp ứng điều kiện.", "日曜日の生活相談|Hoạt động tư vấn yêu cầu từng làm phiên dịch.", "日曜日の公園清掃|Dọn công viên diễn ra thứ Bảy, không phải Chủ nhật.", evidence=[1,2,3]),
 ]),
]},
{
"vocab": [
[
 R("交通事故が増えています。", "Tai nạn giao thông đang tăng.", "事故", "じこ", "tai nạn", "じこう|故 ở đây không có âm dài こう; đọc こ.", "しこ|事 đọc じ có âm đục, không phải し.", "じご|故 đọc こ, không phải ご trong 事故."),
 R("書類を確認してから送ってください。", "Hãy kiểm tra giấy tờ rồi mới gửi.", "確認", "かくにん", "xác nhận, kiểm tra", "かっにん|確 đọc かく, không đổi thành âm ngắt trước にん.", "かくねん|認 đọc にん, không phải ねん.", "がくにん|確 đọc かく, không phải がく."),
 R("この経験は将来役に立つ。", "Kinh nghiệm này sẽ hữu ích trong tương lai.", "将来", "しょうらい", "tương lai", "しょらい|将 có âm dài しょう, không phải しょ.", "じょうらい|将 đọc しょう, không phải じょう.", "しょうれい|来 đọc らい, không phải れい."),
 R("新しい計画を提案した。", "Tôi đã đề xuất một kế hoạch mới.", "提案", "ていあん", "đề xuất", "だいあん|提 đọc てい, không phải だい.", "てあん|提 có cách đọc てい, không bỏ い.", "ていなん|案 đọc あん, không phải なん."),
],
[
 Q("説明が長すぎて、何が大切なのか（　）わからなかった。", "Giải thích quá dài nên cuối cùng tôi không hiểu điều gì quan trọng.", "vocab:結局", "結局|結局 là rốt cuộc, kết quả cuối cùng sau quá trình nghe dài.", "たとえば|たとえば là ví dụ, không chỉ kết quả nghe không hiểu.", "必ず|必ず là chắc chắn, không tự nhiên khi mô tả kết quả một lần đã xảy ra.", "まさか|まさか thường đi với phủ định dự đoán bất ngờ, không thay cho rốt cuộc trong câu này."),
 Q("説明書を読まずに機械を動かすのは（　）だ。", "Vận hành máy khi chưa đọc hướng dẫn là nguy hiểm.", "vocab:危険", "危険|危険だ đánh giá nguy cơ khi không đọc chỉ dẫn trước khi dùng máy.", "得意|得意だ là giỏi hoặc sở trường, không đánh giá một hành vi thiếu an toàn.", "親切|親切だ là tử tế, không thích hợp hành vi bỏ hướng dẫn.", "満員|満員だ là kín chỗ người, không dùng cho hành động vận hành máy."),
 Q("このアプリは操作が簡単で、初心者にも（　）がある。", "Ứng dụng này dễ thao tác và được cả người mới ưa chuộng.", "vocab:人気", "人気|人気がある là được ưa chuộng; dễ thao tác là lý do người mới thích.", "天気|天気がある không dùng để nói mức độ được ưa thích của ứng dụng.", "温度|温度 là nhiệt độ, không phù hợp nhận xét về người dùng mới.", "住所|住所 là địa chỉ, không chỉ độ phổ biến của ứng dụng."),
 Q("道がわからなかったので、近くの人に（　）した。", "Vì không biết đường nên tôi hỏi người ở gần.", "vocab:質問", "質問|質問する là đặt câu hỏi, phù hợp nhờ chỉ đường.", "出発|出発する là khởi hành, không đi với 人に theo nghĩa hỏi.", "故障|故障する là hỏng máy, không thực hiện với người được hỏi.", "成長|成長する là trưởng thành, không diễn tả việc hỏi đường."),
],
[
 Q("次の角を曲がると、すぐ店があります。", "Rẽ ở góc tiếp theo là thấy cửa hàng ngay.", "vocab:すぐ", "遠くないところに|すぐ trong chỉ đường nghĩa là ngay gần, không xa.", "一時間ほど先に|Một tiếng nữa mới đến không phù hợp với ngay gần.", "道の終わりにだけ|Chỉ ở cuối đường không phải nghĩa của すぐ.", "必ず左側に|すぐ không tự quy định cửa hàng ở bên trái.", target="すぐ"),
 Q("彼女はしばらく黙っていた。", "Cô ấy im lặng một lúc.", "vocab:黙る", "何も話さなかった|黙る là im lặng, không nói gì.", "早く話した|Nói nhanh trái với im lặng.", "大きな声で笑った|Cười lớn không phải trạng thái im lặng được nói ở đây.", "部屋から出た|Rời phòng là di chuyển, không phải nghĩa 黙る.", target="黙っていた"),
 Q("新しい方法を試してみた。", "Tôi đã thử phương pháp mới.", "vocab:試す", "実際にやってみた|試す là làm thử thực tế để xem có hiệu quả hay không.", "やめることにした|Quyết định dừng là không thử làm.", "人に秘密にした|Giữ bí mật không đồng nghĩa với thử nghiệm.", "前の方法に戻した|Quay về cách cũ khác với thử cách mới.", target="試してみた"),
 Q("この説明では十分ではない。", "Giải thích thế này chưa đủ.", "vocab:十分", "もっと説明が必要だ|Chưa đủ nghĩa là vẫn cần giải thích thêm.", "これ以上説明しなくてよい|Không cần giải thích nữa là đã đủ, trái câu.", "説明が長すぎる|Quá dài khác với chưa đủ nội dung.", "説明する人が多すぎる|Nhiều người giải thích không phải nghĩa của 十分ではない.", target="十分ではない"),
],
[
 Q("「延期」の使い方として正しいものはどれか。", "Câu nào dùng đúng 延期 (hoãn)?", "usage:延期", "雨のため、遠足を来週に延期した。|Sự kiện được dời sang thời điểm muộn hơn là 延期する.", "遠足を昨日に延期した。|延期 là dời muộn hơn, không thể dời một kế hoạch tương lai về hôm qua.", "道が長いので延期して歩いた。|Không dùng 延期して để chỉ đi dài hơn trên đường.", "飲み物をコップに延期した。|延期 không có nghĩa rót hoặc chuyển đồ uống vào cốc."),
 Q("「似合う」の使い方として正しいものはどれか。", "Câu nào dùng đúng 似合う (hợp với)?", "usage:似合う", "その青いシャツは、あなたによく似合う。|Trang phục が/は người に似合う là hợp với người mặc.", "あなたを青いシャツが似合う。|Người phù hợp đi với に, không phải を.", "雨が昨日と似合って降った。|So sánh hai ngày mưa dùng 似ている, không dùng 似合う.", "駅に似合って電車に乗った。|似合う không dùng để nói đến ga hay lên tàu."),
 Q("「済む」の使い方として正しいものはどれか。", "Câu nào dùng đúng 済む (xong, đủ)?", "usage:済む", "予約が済んだら、確認のメールが届きます。|予約が済む là việc đặt chỗ hoàn tất.", "予約を済みました。|済む là tự động từ; phải dùng が済む hoặc を済ませる.", "この町に十年済んでいる。|Sống ở một nơi viết 住む, không phải 済む.", "電車を済んで学校へ行った。|Không dùng 済む với を để diễn tả đi tàu."),
 Q("「協力」の使い方として正しいものはどれか。", "Câu nào dùng đúng 協力 (hợp tác)?", "usage:協力", "みんなで協力して、教室を掃除した。|Cùng hợp sức làm một việc là 協力する.", "一人でだれとも関わらず協力した。|協力 cần sự phối hợp, mâu thuẫn với hoàn toàn không liên quan ai.", "協力を寒くして窓を開けた。|協力 là danh từ/hành động hợp tác, không đi với 寒くする như thế này.", "この机は協力に重い。|協力 không phải trạng từ chỉ mức độ nặng của bàn."),
]],
"grammar": [
 Q("田中さんはもう家を出た（　）だ。さっき連絡があった。", "Chắc Tanaka đã rời nhà rồi. Vừa nãy tôi nhận được tin nhắn.", "grammar:はず", "はず|Vたはずだ là suy đoán có căn cứ từ thông tin vừa nhận.", "つもり|つもり là ý định, không dùng để đoán việc người khác đã làm.", "ため|ためだ là vì, không diễn tả suy đoán đã rời nhà.", "ところに|ところにだ không tạo thành vị ngữ đúng."),
 Q("このケーキは（　）そうですね。", "Chiếc bánh này trông có vẻ ngon nhỉ.", "grammar:様態そうだ", "おいし|Tính từ い bỏ い + そうだ: おいしそう, trông ngon.", "おいしいな|Không thêm な vào tính từ い trước そうだ.", "おいしくて|Thể くて không nối trực tiếp そうだ theo mẫu trông có vẻ.", "おいしさ|Danh từ mức độ おいしさ không nối そうだ theo cách này."),
 Q("忘れない（　）、予定をメモしておいた。", "Để không quên, tôi đã ghi chú lịch sẵn.", "grammar:ないように", "ように|Vないように chỉ mục đích tránh một trạng thái.", "ばかりに|ばかりに chỉ vì mà có kết quả xấu, không diễn tả phòng quên.", "とおりに|とおりに là làm theo đúng, không chỉ mục đích phủ định.", "ところに|ところに là đúng lúc/vào chỗ, không diễn tả mục đích."),
 Q("日本にいる（　）、いろいろな町を訪ねたい。", "Trong thời gian còn ở Nhật tôi muốn thăm nhiều thị trấn.", "grammar:うちに", "うちに|〜うちに là trong khi điều kiện còn tồn tại, trước khi đổi khác.", "たびに|たびに là mỗi lần; không hợp trạng thái liên tục いる ở đây.", "ばかりに|ばかりに nêu nguyên nhân đáng tiếc, không diễn tả khoảng thời gian.", "とたんに|とたんに đi sau Vた để chỉ ngay khi, không sau いる."),
 Q("今日は兄が料理を作る（　）、私は皿を洗う。", "Hôm nay anh trai nấu ăn, đổi lại tôi rửa bát.", "grammar:かわりに", "かわりに|かわりに thể hiện sự phân công/đánh đổi giữa hai người.", "たびに|たびに nói mỗi lần lặp lại, không phải sự phân công cho hôm nay.", "ほどに|ほどに chỉ mức độ, không nêu đổi lại.", "ままに|ままに là theo đúng hoặc tùy theo, không diễn tả đổi việc."),
 Q("今、家を出る（　）です。十分後に着きます。", "Bây giờ tôi sắp rời nhà. Mười phút nữa sẽ đến.", "grammar:るところ", "ところ|Vるところだ chỉ sắp bắt đầu một hành động.", "ばかり|Vるばかりです là chỉ toàn làm hoặc chỉ còn làm, không phải mẫu thời điểm sắp đi đơn giản ở đây.", "あいだ|家を出るあいだです không tạo cách nói sắp khởi hành.", "まえで|まえでです không đúng cấu trúc vị ngữ."),
 Q("私が出かけている（　）、荷物が届いた。", "Trong lúc tôi đi vắng, có bưu kiện được giao đến.", "grammar:間に", "間に|〜間に chỉ một sự kiện xảy ra tại một lúc trong khoảng thời gian.", "間を|間を không đánh dấu mốc xảy ra sự kiện 届く.", "うえに|うえに là hơn nữa, không nêu khoảng thời gian.", "わりに|わりに là so với mức dự kiến, không chỉ trong lúc."),
 Q("何度説明（　）、彼は同じ間違いをする。", "Dù giải thích bao lần, anh ấy vẫn mắc cùng một lỗi.", "grammar:ても", "しても|Vても diễn tả dù làm gì thì kết quả vẫn như cũ.", "すると|Vると nêu hễ làm là, không diễn tả sự nhượng bộ nhiều lần ở đây.", "しながら|ながら là hai việc đồng thời của một chủ thể, trong câu có người giải thích và người mắc lỗi.", "するため|ため là mục đích/nguyên nhân, không chỉ dù bao lần.",),
],
"sort": [
 O("約束を", ["忘れない", "ように", "する", "ことが"], "大切です。", "Cố gắng không quên cuộc hẹn là điều quan trọng."),
 O("朝起きた", ["あとで", "水を", "飲む", "ことに"], "しています。", "Tôi có thói quen uống nước sau khi thức dậy buổi sáng."),
 O("この店には", ["料理", "が", "おいしい", "だけでなく"], "景色もいいという特徴があります。", "Quán này không chỉ đồ ăn ngon mà phong cảnh cũng đẹp."),
 O("友人が", ["来る", "までに", "部屋の", "掃除を"], "終わらせます。", "Tôi sẽ dọn phòng xong trước khi bạn đến."),
],
"cloze": P("cloze", "修理して使う", [
 S("毎日使っていたかばんの|Chiếc cặp tôi dùng mỗi ngày", "ファスナーが壊れた。|bị hỏng khóa kéo."),
 S("新しいものを買おうと思ったが、|Tôi định mua cái mới,", "近所に修理の店があることを知った。|nhưng biết được gần nhà có tiệm sửa.", blank="新しいものを（　）と思ったが、近所に修理の店があることを知った。"),
 S("店の人によると、|Theo người thợ,", "三日で直せるそうだ。|nghe nói có thể sửa xong trong ba ngày.", blank="店の人によると、三日で直せる（　）。"),
 S("修理代は新しいかばんよりずっと安かったので、|Vì tiền sửa rẻ hơn rất nhiều so với cặp mới,", "直してもらうことにした。|tôi quyết định nhờ sửa.", blank="修理代は新しいかばんよりずっと安かったので、直してもらう（　）にした。"),
 S("物を長く使うためには、|Để dùng đồ lâu dài,", "壊れたらすぐ捨てないことも大切だと思った。|tôi nhận ra việc không vứt ngay khi hỏng cũng quan trọng.", blank="物を長く使う（　）、壊れたらすぐ捨てないことも大切だと思った。"),
 ], [
 Q("新しいものを（　）と思ったが、近所に修理の店があることを知った。", "Tôi định mua cái mới nhưng biết gần nhà có tiệm sửa.", "grammar:意向形", "買おう|V ý chí + と思う là nghĩ định làm gì.", "買って|買ってと思う không tạo mẫu dự định.", "買え|買え là mệnh lệnh, không phải ý định của người viết.", "買うな|買うな là cấm mua, ngược với dự định ban đầu.", evidence=[1,2]),
 Q("店の人によると、三日で直せる（　）。", "Theo người thợ, nghe nói ba ngày là sửa được.", "grammar:伝聞そうだ", "そうだ|によると nêu nguồn tin, dùng thể thường + そうだ truyền văn.", "ためだ|ためだ là vì, không truyền lại lời người thợ.", "つもりだ|つもり là ý định của chủ thể, không thuật thông tin khả năng sửa.", "ばかりだ|ばかりだ không diễn tả nghe nói có thể sửa trong ba ngày.", evidence=[3]),
 Q("修理代は新しいかばんよりずっと安かったので、直してもらう（　）にした。", "Vì phí sửa rẻ hơn nhiều, tôi quyết định nhờ sửa.", "grammar:ことにする", "こと|Vことにする dùng cho quyết định tự mình đưa ra.", "もの|ものにする là chiếm lĩnh/làm chủ, không phải quyết định nhờ sửa.", "はず|はずにする không phải cấu trúc quyết định.", "ところ|ところにする không tạo mẫu quyết định hành động.", evidence=[4]),
 Q("物を長く使う（　）、壊れたらすぐ捨てないことも大切だと思った。", "Để dùng đồ lâu dài tôi nghĩ cũng cần không vứt ngay khi hỏng.", "grammar:ためには", "ためには|Vためには đưa mục tiêu và điều cần làm để đạt mục tiêu.", "せいには|せい là quy lỗi, không nêu mục tiêu tích cực.", "かわりには|かわり là thay thế/đánh đổi, không diễn tả để dùng lâu.", "ばかりには|ばかりには không tạo quan hệ mục đích trong câu.", evidence=[5]),
 ]),
"reading": [
 P("notice", "エレベーターの点検", [
 S("来週の火曜日、|Thứ Ba tuần sau,", "午前十時から正午までエレベーターを点検します。|thang máy được kiểm tra từ mười giờ sáng đến trưa."),
 S("その間は|Trong thời gian đó", "階段を使ってください。|hãy sử dụng cầu thang bộ."),
 S("重い荷物の配達を予定している方は、|Ai dự định nhận hàng nặng", "点検の時間を避けるように業者に連絡してください。|hãy liên lạc nhà vận chuyển để tránh giờ kiểm tra."),
 S("点検が早く終わった場合でも、|Ngay cả khi kiểm tra xong sớm,", "正午までは利用できません。|vẫn không được sử dụng cho đến trưa."),
 ], [
 Q("エレベーターはいつから使えるか。", "Có thể dùng thang máy từ khi nào?", "reading:detail", "火曜日の正午から|Quy định cuối nêu dù xong sớm cũng chỉ được dùng từ 12 giờ.", "火曜日の午前十時から|10 giờ là bắt đầu ngừng hoạt động để kiểm tra.", "点検が終わった直後から必ず|Không nhất thiết: xong sớm vẫn phải đợi đến trưa.", "水曜日の午前十時から|Thông báo chỉ ngừng hai giờ thứ Ba, không kéo sang thứ Tư.", evidence=[1,4]),
 Q("重い荷物を受け取る予定の人は何をする必要があるか。", "Người sắp nhận hàng nặng cần làm gì?", "reading:action", "配達が点検時間と重ならないよう業者に連絡する|Câu 3 yêu cầu liên lạc nhà vận chuyển để tránh khoảng kiểm tra.", "点検の担当者に荷物を運んでもらう|Không có dịch vụ nhờ người kiểm tra mang hàng.", "必ず火曜日の午前十時に配達してもらう|10 giờ bắt đầu kiểm tra, chính là giờ cần tránh.", "すべての配達を翌週に延期する|Chỉ cần tránh giờ kiểm tra, không phải dời mọi đơn sang tuần sau.", evidence=[3]),
 ]),
 P("prose", "初めての店長", [
 S("店長になったばかりの私は、|Mới làm chủ quán,", "客を増やそうとメニューを次々に増やした。|tôi liên tục thêm món để tăng khách."),
 S("しかし、材料の管理が難しくなり、|Tuy nhiên, quản lý nguyên liệu khó hơn", "料理を出すまでに時間がかかるようになった。|và thời gian ra món cũng lâu hơn."),
 S("常連の客から、|Một khách quen nói với tôi", "前のようにすぐ食べられるほうがいいと言われた。|rằng được ăn nhanh như trước thì tốt hơn."),
 S("そこで、注文の多い料理を調べ、|Vì thế tôi tìm xem món nào được gọi nhiều", "人気のあるものだけを残した。|và chỉ giữ lại các món được ưa thích."),
 S("メニューは少なくなったが、|Thực đơn ít món hơn,", "客を待たせる時間も短くなった。|nhưng thời gian để khách chờ cũng ngắn đi."),
 S("何を増やすかより、|Thay vì chỉ nghĩ nên thêm gì,", "何を大切にするかを考える必要があったのだ。|điều tôi cần là nghĩ xem nên coi trọng điều gì."),
 ], [
 Q("メニューを増やした結果、どんな問題が起きたか。", "Sau khi tăng số món, vấn đề gì xảy ra?", "reading:cause_effect", "料理を出すまで客を長く待たせるようになった|Câu 2 cho biết quản lý khó, món ăn ra chậm khiến khách đợi lâu.", "注文する料理が一つもなくなった|Vấn đề không phải không có món để gọi mà là quá nhiều món.", "材料の値段がすべて同じになった|Không có thông tin mọi nguyên liệu cùng giá.", "常連の客が全員いなくなった|Có khách quen phản hồi; bài không nói tất cả đã bỏ đi.", evidence=[2,3]),
 Q("筆者が学んだことは何か。", "Người viết học được điều gì?", "reading:main_idea", "数を増やすだけでなく店の大切な点を考えるべきだ|Kết luận nhấn mạnh ưu tiên giá trị phục vụ thay vì chỉ thêm số lượng món.", "客の意見は聞かないほうがよい|Phản hồi của khách giúp cải thiện, không bị bác bỏ.", "人気のある料理から先にやめるべきだ|Người viết giữ món phổ biến, không bỏ chúng trước.", "料理を遅く出すほど客は増える|Tốc độ chậm là vấn đề đã sửa, không phải cách tăng khách.", evidence=[3,4,5,6]),
 ]),
 P("prose", "駅までの道", [
 S("毎朝、私は駅まで|Mỗi sáng tôi đến ga", "同じ道を急いで歩いていた。|bằng cùng một con đường và bước rất vội."),
 S("ある日、工事でその道が使えず、|Một hôm đường đó không đi được do thi công,", "川のそばを回って行った。|tôi phải đi vòng ven sông."),
 S("いつもより五分長くかかったが、|Tuy mất hơn thường lệ năm phút,", "朝の光や鳥の声が気持ちよかった。|ánh sáng ban mai và tiếng chim khiến tôi dễ chịu."),
 S("それからは時間に余裕のある日に、|Từ đó vào ngày có thời gian dư dả,", "川の道を選ぶようになった。|tôi bắt đầu chọn đường ven sông."),
 S("急ぐ日には前の道を使うので、|Vào ngày vội tôi vẫn đi đường cũ,", "必ず遠回りをするわけではない。|nên không phải lúc nào tôi cũng đi vòng."),
 S("けれども、最短の道しかないと思っていたころより、|Nhưng so với hồi chỉ nghĩ đến đường ngắn nhất,", "朝の過ごし方を自分で選べる感じがする。|tôi cảm thấy mình chủ động chọn cách trải qua buổi sáng hơn."),
 S("便利さは大切だが、|Sự tiện lợi quan trọng,", "少し遅く進むことで見つかるものもある。|nhưng đi chậm hơn một chút cũng có điều để khám phá."),
 ], [
 Q("筆者は今、どのように駅までの道を選んでいるか。", "Hiện nay người viết chọn đường đến ga như thế nào?", "reading:detail", "急ぐ日は近道、余裕のある日は川の道を使う|Câu 4 và 5 phân biệt theo thời gian có hay không.", "どんな日も必ず川の道を使う|Câu 5 phủ định việc lúc nào cũng đi vòng.", "工事が終わるまで駅へ行かない|Người viết vẫn đi ga qua đường khác khi thi công.", "鳥の声が聞こえない日は家にいる|Không có điều kiện như vậy trong bài.", evidence=[4,5]),
 Q("筆者が伝えたいことは何か。", "Người viết muốn truyền đạt điều gì?", "reading:main_idea", "速さだけを基準にせず別の良さを見つけることも大切だ|Trải nghiệm đường vòng cho thấy ngoài tiện và nhanh còn có sự dễ chịu, quyền lựa chọn.", "便利な道はすべて使わないほうがよい|Người viết vẫn dùng đường nhanh khi vội và nói tiện lợi là quan trọng.", "毎朝できるだけ遅刻したほうがよい|Đi chậm khi dư thời gian không có nghĩa chủ động đi muộn.", "工事が多い町ほど暮らしやすい|Thi công là tình huống mở đầu, không phải kết luận về chất lượng đô thị.", evidence=[5,6,7]),
 ]),
 P("info", "図書館の予約サービス", [
 S("貸出中の本は|Sách đang được mượn", "インターネットか窓口で予約できます。|có thể đặt trước qua mạng hoặc tại quầy."),
 S("予約できるのは|Số sách được đặt trước", "一人五冊までです。|tối đa năm cuốn mỗi người."),
 S("本が用意できたら|Khi chuẩn bị được sách", "メールでお知らせします。|thư viện sẽ thông báo qua thư điện tử."),
 S("連絡の翌日から七日以内に|Trong bảy ngày tính từ ngày sau ngày thông báo", "図書館で受け取ってください。|hãy đến thư viện nhận sách."),
 S("受け取らないまま期限を過ぎると、|Nếu quá hạn mà chưa nhận,", "予約は取り消されます。|đặt trước sẽ bị hủy."),
 S("受け取りには|Khi nhận sách", "図書館カードが必要です。|cần thẻ thư viện."),
 ], [
 Q("予約した本は、いつまでに受け取る必要があるか。", "Cần nhận sách đã đặt trước chậm nhất khi nào?", "reading:information", "連絡の翌日から七日以内|Câu 4 xác định thời gian bảy ngày tính từ ngày sau khi được báo.", "予約した当日中|Không phải trong ngày đặt, vì sách có thể chưa được trả.", "連絡が来る前日まで|Không thể yêu cầu nhận trước ngày thông báo đã sẵn sách.", "期限はなく、いつでもよい|Có hạn và quá hạn thì đặt trước bị hủy.", evidence=[3,4,5]),
 Q("このサービスについて正しいものはどれか。", "Thông tin nào đúng về dịch vụ này?", "reading:information", "窓口でも予約でき、受け取りにはカードが必要だ|Câu 1 cho phép đặt tại quầy; câu 6 yêu cầu thẻ khi nhận.", "予約はインターネットでしかできない|Còn có thể đặt tại quầy.", "一人七冊まで予約できる|Tối đa năm cuốn, bảy là số ngày nhận sách.", "期限を過ぎても予約はそのまま残る|Quá hạn chưa nhận thì đặt trước bị hủy.", evidence=[1,2,5,6]),
 ]),
]},
]
