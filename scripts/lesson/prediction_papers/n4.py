from common import Q, R, S, O, P

TESTS = [
{
"vocab": [
[
 R("近くの病院で働いています。", "Tôi làm việc ở bệnh viện gần đây.", "病院", "びょういん", "bệnh viện", "びよういん|びよういん là tiệm làm tóc (美容院); thiếu âm dài よう thì nghĩa đổi.", "びょいん|病 có âm dài びょう, không phải びょ.", "ひょういん|病 đọc âm đầu びょう, không phải ひょう."),
 R("旅行の準備をしています。", "Tôi đang chuẩn bị cho chuyến du lịch.", "準備", "じゅんび", "chuẩn bị", "じゅんぴ|備 đọc là び, không phải ぴ.", "じゅび|準 có âm ん trong じゅん, không được bỏ.", "しゅんび|準 đọc là じゅん, có âm đục じゅ."),
 R("駅まで急いでください。", "Hãy đi nhanh đến ga.", "急いで", "いそいで", "vội đi, nhanh lên", "およいで|およいで là bơi (泳いで), không phải 急いで.", "さわいで|さわいで là gây ồn (騒いで), không phải vội.", "あるいて|あるいて là đi bộ (歩いて), không phải 急いで."),
 R("会議は三時に始まります。", "Cuộc họp bắt đầu lúc ba giờ.", "会議", "かいぎ", "cuộc họp", "かいき|議 đọc là ぎ, không phải き.", "かぎ|会 đọc là かい, không được bỏ âm い.", "がいぎ|会 có âm かい, không phải がい."),
],
[
 Q("友だちとの約束を（　）しまいました。", "Tôi lỡ quên cuộc hẹn với bạn.", "vocab:忘れる", "忘れて|約束を忘れる là quên cuộc hẹn; てしまう nêu việc đáng tiếc.", "落として|落とす là làm rơi đồ vật, không tự nhiên với một lời hẹn.", "拾って|拾う là nhặt vật bị rơi, không đi với cuộc hẹn.", "消えて|消える là tự biến mất, không nhận tân ngữ 約束を."),
 Q("この道は車が多くて（　）です。気をつけてください。", "Đường này nhiều xe nên nguy hiểm. Hãy cẩn thận.", "vocab:危険", "危険|危険 là nguy hiểm; hợp với xe đông và lời nhắc cẩn thận.", "安全|安全 là an toàn, ngược với lời cảnh báo ở đây.", "親切|親切 là tử tế, không tả đường đông xe.", "残念|残念 là đáng tiếc, không nêu nguy cơ giao thông."),
 Q("使った道具は、もとの場所に（　）ください。", "Dụng cụ dùng xong hãy trả về chỗ cũ.", "vocab:戻す", "戻して|物を場所に戻す là trả vật về vị trí cũ.", "帰って|帰る là tự trở về, không nhận tân ngữ 道具を.", "着いて|着く là đến nơi, không diễn tả đặt dụng cụ về chỗ.", "通って|通う là đi lại thường xuyên, không dùng để cất dụng cụ."),
 Q("荷物が重いので、駅まで（　）くれませんか。", "Hành lý nặng nên bạn có thể chở tôi đến ga không?", "vocab:送る", "送って|人を駅まで送る nghĩa là đưa hoặc chở người đến ga.", "通って|通う là đi lại thường xuyên, không có nghĩa chở người khác đến ga.", "出して|出す là đưa ra ngoài; không diễn tả chở đến ga.", "貸して|貸す là cho mượn; không thể dùng với đích đến 駅まで như thế này."),
],
[
 Q("この機械はだれでも簡単に使えます。", "Chiếc máy này ai cũng dùng dễ dàng được.", "vocab:簡単", "むずかしくなく|簡単に là một cách đơn giản, không khó.", "時間をかけて|Bỏ nhiều thời gian không đồng nghĩa với dễ dàng.", "力を入れて|Dùng sức không phải nghĩa của 簡単に.", "人に聞きながら|Vừa hỏi người khác vừa dùng không có nghĩa là đơn giản.", target="簡単に"),
 Q("彼は必ず来ます。", "Anh ấy nhất định sẽ đến.", "vocab:必ず", "きっと来ます|きっと diễn tả tin chắc, gần nghĩa 必ず trong câu này.", "来るかもしれません|Có thể đến thể hiện không chắc, yếu hơn 必ず.", "来ないと思います|Nghĩ sẽ không đến là ý trái ngược.", "来たことがあります|Đã từng đến nói kinh nghiệm quá khứ, không phải sự chắc chắn tương lai.", target="必ず"),
 Q("この町には昔から住んでいます。", "Tôi sống ở thị trấn này từ lâu rồi.", "vocab:昔", "ずっと前|昔 là thời gian từ rất lâu trước đây.", "少しあと|Một lúc sau là thời gian tương lai, trái với 昔.", "今朝|Sáng nay là thời gian gần, không phải ngày xưa.", "来年|Năm sau là tương lai, không phải từ trước.", target="昔"),
 Q("あの店はもう閉まっています。", "Cửa hàng kia đã đóng cửa rồi.", "vocab:閉まる", "今は店に入って買い物ができません|Cửa hàng đóng cửa thì lúc này không thể vào mua sắm.", "これから店を開けます|Sắp mở cửa không phải đã đóng cửa.", "今も買い物ができます|Vẫn mua sắm được trái với trạng thái cửa hàng đã đóng.", "店の中はとても広いです|Độ rộng của cửa hàng không liên quan đến 閉まる.", target="閉まっています"),
],
[
 Q("「間に合う」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 間に合う (kịp giờ)?", "usage:間に合う", "走ったので、電車に間に合いました。|電車に間に合う là kịp chuyến tàu; chạy nên kịp giờ là tự nhiên.", "電車を間に合いました。|間に合う không nhận tân ngữ を; phải nói 電車に間に合う.", "机の上に間に合いました。|机の上 là vị trí đồ vật, không phải thời hạn cần kịp.", "このケーキは間に合い味です。|間に合い không ghép với 味 để miêu tả vị bánh."),
 Q("「手伝う」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 手伝う (giúp)?", "usage:手伝う", "妹の宿題を手伝いました。|宿題を手伝う là giúp làm bài tập, đúng cách dùng.", "妹に手伝ってもらいましたを。|を không thể đứng cuối sau mẫu 手伝ってもらいました.", "雨が手伝って降りました。|Không dùng 手伝う để nói mưa rơi.", "このりんごは手伝っています。|Quả táo không phải chủ thể hỗ trợ công việc trong ngữ cảnh này."),
 Q("「調べる」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 調べる (tra cứu, tìm hiểu)?", "usage:調べる", "知らない言葉を辞書で調べました。|Tra một từ chưa biết bằng từ điển là 調べる.", "ジュースをコップに調べました。|Rót nước phải dùng 注ぐ hoặc 入れる, không phải 調べる.", "靴を調べますて、外に出ました。|調べます không nối て trực tiếp; thể て đúng là 調べて.", "寒いので、窓を調べて閉めましただけです。|Cụm ましただけです sai cấu trúc; phải đặt thể thường trước だけ."),
 Q("「残る」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 残る (còn lại)?", "usage:残る", "冷蔵庫に牛乳が少し残っています。|牛乳が残る là sữa còn lại, đúng chủ ngữ với が.", "牛乳を残っています。|残る là tự động từ; dùng が残る, không phải を残る.", "私は冷蔵庫を残ります。|Không dùng を残る để nói mình ở lại; cấu trúc sai.", "この道を左に残ってください。|Rẽ trái phải dùng 曲がる, không phải 残る."),
]],
"grammar": [
 Q("日本へ行った（　）があります。", "Tôi đã từng đi Nhật.", "grammar:たことがある", "こと|Vたことがある diễn tả kinh nghiệm đã từng.", "もの|Vたものがある nói có đồ vật đã làm, không phải kinh nghiệm đi Nhật.", "ため|ためがある không diễn tả kinh nghiệm.", "ところ|行ったところがある nói có nơi đã đi; 日本へ行ったところ không dùng thay mẫu kinh nghiệm này."),
 Q("雨が降っている（　）、試合をします。", "Dù trời đang mưa nhưng trận đấu vẫn diễn ra.", "grammar:のに", "のに|のに nối tình huống trái dự đoán: mưa nhưng vẫn thi đấu.", "ために|ために chỉ mục đích hoặc nguyên nhân, không diễn tả nhượng bộ ở đây.", "ながら|ながら cần động từ bỏ ます hoặc cấu trúc khác; 降っているながら sai.", "まで|まで là đến khi, không thể hiện dù mưa vẫn chơi."),
 Q("明日は早いので、もう（　）ほうがいいですよ。", "Ngày mai phải dậy sớm nên bạn nên ngủ ngay.", "grammar:たほうがいい", "寝た|Vたほうがいい là lời khuyên nên làm gì.", "寝るな|寝るな là cấm ngủ, không nối với ほうがいい.", "寝ます|Không đặt thể ます trực tiếp trước ほう.", "寝て|Vてほうがいい không đúng mẫu khuyên bảo."),
 Q("先生がわたしに日本語を教えて（　）。", "Thầy cô đã dạy tiếng Nhật cho tôi.", "grammar:てくれる", "くれました|くれる diễn tả người khác làm việc có lợi cho tôi.", "あげました|あげる nhìn từ người cho ra; trong câu người nhận là わたし nên dùng くれる.", "もらいました|もらう cần người nhận làm chủ ngữ; ở đây chủ ngữ là 先生.", "いただきました|いただく cũng cần người nhận làm chủ ngữ, không đi với 先生が như câu này."),
 Q("この図書館では大きな声で（　）はいけません。", "Trong thư viện này không được nói lớn.", "grammar:てはいけない", "話して|Vてはいけない diễn tả cấm làm gì.", "話す|Thể từ điển không nối trực tiếp với はいけない.", "話します|Thể ます không nối trực tiếp với はいけない.", "話した|Quá khứ た không tạo mẫu cấm ở đây."),
 Q("新しいくつを買い（　）、駅前の店へ行きました。", "Tôi đến cửa hàng trước ga để mua giày mới.", "grammar:ます語幹に行く", "に|V bỏ ます + に行く chỉ mục đích đi đâu.", "を|を không nối thân 買い với mục đích đi.", "で|で không tạo mẫu mục đích với 買い.", "へ|へ đứng sau địa điểm, không sau thân động từ 買い."),
 Q("すみません、この漢字の読み方を教えて（　）か。", "Xin lỗi, bạn có thể chỉ tôi cách đọc kanji này không?", "grammar:ていただけませんか", "いただけません|〜ていただけませんか là lời nhờ lịch sự.", "いただきましょう|いただきましょうか là đề nghị mình nhận/làm, không phải lời nhờ này.", "あげません|あげる là tôi làm cho người khác, ngược hướng nhờ giúp.", "くださいませんでした|Đây là phủ định quá khứ, hỏi vì sao trước đó không giúp, không phải lời nhờ hiện tại."),
 Q("ごはんを食べた（　）、薬を飲んでください。", "Sau khi ăn cơm hãy uống thuốc.", "grammar:たあとで", "あとで|Vたあとで là sau khi làm xong việc gì.", "まえに|まえに đi với thể từ điển, không phải 食べた; nghĩa cũng ngược thứ tự.", "ながら|ながら đi với thân ます, không phải 食べた.", "ときで|ときで không tạo liên kết trình tự như câu này."),
],
"sort": [
 O("わたしは", ["日本へ", "行った", "こと", "が"], "あります。", "Tôi đã từng đến Nhật."),
 O("この本は", ["漢字", "が", "少ない", "ので"], "読みやすいです。", "Sách này ít kanji nên dễ đọc."),
 O("駅に着いた", ["ときに", "電話を", "かけた", "相手は"], "友だちです。", "Người tôi gọi điện khi đến ga là bạn tôi."),
 O("これは", ["母", "が", "作って", "くれた"], "おべんとうです。", "Đây là cơm hộp mẹ làm cho tôi."),
],
"cloze": P("cloze", "料理教室", [
 S("先週から|Từ tuần trước", "料理教室に通っています。|tôi bắt đầu đi học nấu ăn."),
 S("わたしは料理を作るのが|Tôi", "あまり上手ではありません。|không giỏi nấu ăn lắm.", blank="わたしは料理を作る（　）あまり上手ではありません。"),
 S("先生は|Giáo viên", "ゆっくり説明してくれます。|giải thích chậm rãi cho tôi.", blank="先生はゆっくり説明して（　）。"),
 S("昨日はカレーを作って、|Hôm qua tôi làm cà ri", "家族に食べてもらいました。|và nhờ gia đình ăn thử.", blank="昨日はカレーを作って、家族に食べて（　）。"),
 S("もっと上手に|Tôi muốn", "なりたいです。|trở nên giỏi hơn.", blank="もっと上手（　）なりたいです。"),
 ], [
 Q("わたしは料理を作る（　）あまり上手ではありません。", "Tôi không giỏi nấu ăn lắm.", "grammar:のが上手", "のが|Vのが上手だ danh từ hóa hoạt động rồi đánh dấu bằng が.", "のを|上手だ không nhận tân ngữ を.", "ことに|ことに không đánh dấu đối tượng năng lực của 上手.", "ためが|ため không dùng để danh từ hóa kỹ năng ở đây.", evidence=[2]),
 Q("先生はゆっくり説明して（　）。", "Giáo viên giải thích chậm rãi cho tôi.", "grammar:てくれる", "くれます|Giáo viên làm việc có lợi cho người viết nên dùng くれる.", "もらいます|もらう cần người viết làm chủ ngữ, không phải 先生は.", "いただきます|いただく cũng cần người nhận làm chủ ngữ.", "いませんでした|Phủ định quá khứ không hợp lời giới thiệu cách dạy hiện tại.", evidence=[1,3]),
 Q("昨日はカレーを作って、家族に食べて（　）。", "Hôm qua tôi làm cà ri và nhờ gia đình ăn thử.", "grammar:てもらう", "もらいました|私は家族に食べてもらう: người viết nhận sự hợp tác ăn thử từ gia đình.", "あげました|食べてあげる là mình ăn giúp người khác; ngược chủ thể ăn ở đây.", "くれました|Nếu dùng くれる thì 家族 cần là chủ ngữ が/は, không phải に.", "もらいます|昨日 yêu cầu quá khứ, không phải hiện tại もらいます.", evidence=[4]),
 Q("もっと上手（　）なりたいです。", "Tôi muốn trở nên giỏi hơn.", "grammar:な形容詞になる", "に|Tính từ な + になる diễn tả trở nên như thế nào.", "く|くなる dành cho tính từ い; 上手 là tính từ な.", "を|を không nối tính từ 上手 với なる.", "で|上手でなる không đúng cấu trúc biến đổi trạng thái.", evidence=[5]),
 ]),
"reading": [
 P("email", "山田さんへ", [
 S("あしたの会議は|Cuộc họp ngày mai", "三時から四時に変わりました。|đổi từ ba giờ sang bốn giờ."),
 S("場所は|Địa điểm", "三階の会議室です。|là phòng họp tầng ba."),
 S("新しい資料は|Tài liệu mới", "会議室の入口に置きます。|sẽ được để ở lối vào phòng họp."),
 S("古い資料は|Tài liệu cũ", "持ってこなくてもいいです。|không cần mang theo."),
 ], [
 Q("あしたの会議は何時に始まりますか。", "Cuộc họp ngày mai bắt đầu lúc mấy giờ?", "reading:detail", "四時|Ba giờ là giờ cũ; thông báo đổi sang bốn giờ.", "三時|Ba giờ đã được thay đổi, không còn là giờ bắt đầu.", "二時|Hai giờ không xuất hiện trong thông báo.", "五時|Năm giờ không được nêu trong thông báo.", evidence=[1]),
 Q("山田さんは資料について、どうすればいいですか。", "Yamada nên làm gì về tài liệu?", "reading:action", "入口にある新しい資料を使います|Tài liệu mới để ở cửa; tài liệu cũ không cần đem.", "古い資料を必ず持っていきます|Câu cuối nói rõ không cần mang tài liệu cũ.", "新しい資料を自分でコピーします|Thông báo không yêu cầu tự photocopy.", "三階の入口に古い資料を置きます|Tài liệu được đặt là bản mới ở lối vào phòng họp, không phải bản cũ do Yamada đặt.", evidence=[3,4]),
 ]),
 P("prose", "朝の散歩", [
 S("わたしは以前、|Trước đây", "朝起きるのが苦手でした。|tôi rất khó dậy buổi sáng."),
 S("友だちにさそわれて、|Sau khi được bạn rủ,", "朝の散歩を始めました。|tôi bắt đầu đi bộ buổi sáng."),
 S("初めは十分だけでしたが、|Ban đầu chỉ đi mười phút,", "今は三十分歩いています。|nhưng nay tôi đi bộ ba mươi phút."),
 S("夜はよく眠れるようになり、|Tôi bắt đầu ngủ ngon vào ban đêm,", "朝も楽に起きられます。|và sáng cũng dậy dễ hơn."),
 S("一人ではやめていたかもしれませんが、|Nếu đi một mình có lẽ tôi đã bỏ,", "友だちと話せるので続いています。|nhưng được trò chuyện với bạn nên tôi duy trì được."),
 ], [
 Q("散歩を始めて、何が変わりましたか。", "Điều gì thay đổi sau khi bắt đầu đi bộ?", "reading:change", "朝、起きやすくなりました|Câu 4 nói sáng nay có thể dậy dễ dàng hơn.", "夜、眠れなくなりました|Trái lại người viết ngủ ngon hơn vào ban đêm.", "歩く時間が短くなりました|Thời gian tăng từ mười lên ba mươi phút, không giảm.", "友だちと会わなくなりました|Người viết vẫn đi cùng và trò chuyện với bạn.", evidence=[3,4]),
 Q("散歩を続けられるのはどうしてですか。", "Vì sao người viết có thể duy trì đi bộ?", "reading:reason", "友だちと話せるから|Câu cuối nêu được nói chuyện cùng bạn là lý do tiếp tục.", "一人で歩くのが好きだから|Người viết nói nếu một mình có lẽ đã bỏ, ngược lựa chọn này.", "毎日十分しか歩かないから|Hiện nay đi ba mươi phút, không chỉ mười phút.", "友だちにお金をもらえるから|Không có việc được bạn trả tiền.", evidence=[5]),
 ]),
 P("prose", "図書館のしごと", [
 S("夏休みに|Trong kỳ nghỉ hè", "図書館でボランティアをしました。|tôi làm tình nguyện ở thư viện."),
 S("本を並べるだけだと思っていましたが、|Tôi tưởng chỉ xếp sách,", "子どもに本を読む仕事もありました。|nhưng còn có việc đọc sách cho trẻ em."),
 S("最初は声が小さくて、|Ban đầu giọng tôi nhỏ,", "子どもたちに聞こえませんでした。|nên các em không nghe được."),
 S("職員の方に相談して、|Tôi trao đổi với nhân viên", "ゆっくり大きな声で読む練習をしました。|và luyện đọc chậm, to rõ."),
 S("最後の日、子どもたちにまた来てと言われて、|Ngày cuối được các em bảo hãy đến nữa,", "うれしくなりました。|tôi thấy rất vui."),
 ], [
 Q("筆者が練習したのは、どんなことですか。", "Người viết đã luyện việc gì?", "reading:detail", "ゆっくり大きな声で本を読むこと|Câu 4 nói luyện đọc sách chậm với giọng to.", "本を早く並べること|Đoạn không nói luyện tốc độ xếp sách.", "小さい声で読むこと|Giọng nhỏ là vấn đề ban đầu, cần sửa bằng giọng to hơn.", "子どもに字を書かせること|Không có việc dạy trẻ viết chữ.", evidence=[3,4]),
 Q("最後の日、筆者はどうしてうれしくなりましたか。", "Ngày cuối, vì sao người viết vui?", "reading:reason", "子どもたちがまた来てほしいと言ったから|Lời mong người viết quay lại từ trẻ em khiến người viết vui.", "新しい本をもらったから|Không có việc được tặng sách.", "仕事が本を並べるだけになったから|Công việc có đọc sách, không chuyển thành chỉ xếp sách.", "夏休みが終わったから|Ngày cuối là bối cảnh, lời của trẻ mới là lý do vui.", evidence=[5]),
 ]),
 P("info", "市民センターの教室", [
 S("料理教室は|Lớp nấu ăn", "水曜日の午後二時からで、千円です。|bắt đầu hai giờ chiều thứ Tư, phí một nghìn yên."),
 S("写真教室は|Lớp chụp ảnh", "土曜日の午前十時からで、八百円です。|bắt đầu mười giờ sáng thứ Bảy, phí tám trăm yên."),
 S("絵の教室は|Lớp vẽ", "土曜日の午後二時からで、六百円です。|bắt đầu hai giờ chiều thứ Bảy, phí sáu trăm yên."),
 S("どの教室も|Với mọi lớp", "前の日までに電話で申し込んでください。|hãy đăng ký qua điện thoại chậm nhất vào hôm trước."),
 S("料理教室には|Đến lớp nấu ăn", "エプロンを持ってきてください。|hãy mang theo tạp dề."),
 ], [
 Q("土曜日の午後に行ける教室はどれですか。", "Chiều thứ Bảy có thể đi học lớp nào?", "reading:information", "絵の教室|Lớp vẽ diễn ra chiều thứ Bảy lúc hai giờ.", "料理教室|Lớp nấu ăn vào chiều thứ Tư, không phải thứ Bảy.", "写真教室|Lớp ảnh vào sáng thứ Bảy, không phải buổi chiều.", "三つとも|Chỉ lớp vẽ đúng cả ngày lẫn buổi được hỏi.", evidence=[1,2,3]),
 Q("料理教室について正しいものはどれですか。", "Thông tin nào đúng về lớp nấu ăn?", "reading:information", "前の日までに電話で申し込みます|Quy tắc đăng ký trước một ngày áp dụng cho cả lớp nấu ăn.", "当日、教室で申し込みます|Phải đăng ký qua điện thoại chậm nhất hôm trước, không phải tại lớp hôm đó.", "八百円かかります|Tám trăm yên là lớp ảnh; lớp nấu ăn một nghìn yên.", "何も持っていかなくてもいいです|Riêng lớp nấu ăn phải mang tạp dề.", evidence=[1,4,5]),
 ]),
]},
{
"vocab": [
[
 R("工場を見学しました。", "Tôi đã tham quan nhà máy.", "工場", "こうじょう", "nhà máy", "こうばい|こうばい thường là 購買 (mua hàng), không phải 工場.", "こうじょ|場 có âm dài じょう, không phải じょ.", "くじょう|くじょう là 苦情 (phàn nàn), không phải 工場."),
 R("住所を書いてください。", "Hãy ghi địa chỉ.", "住所", "じゅうしょ", "địa chỉ", "じゅしょ|住 có âm dài じゅう, không phải じゅ.", "じゅうしょう|所 ở đây đọc là しょ, không kéo dài しょう.", "じょうしょ|住 đọc じゅう, không phải じょう."),
 R("この橋を渡ってください。", "Hãy qua cây cầu này.", "橋", "はし", "cầu", "はな|はな là 花 (hoa), không phải 橋.", "はやし|はやし là 林 (rừng thưa), không phải 橋.", "はる|はる là 春 (mùa xuân), không phải 橋."),
 R("妹は歌が得意です。", "Em gái tôi hát giỏi.", "得意", "とくい", "sở trường, giỏi", "とっき|とっき là cách đọc từ khác như 特記; 得意 không đọc như vậy.", "とくぎ|とくぎ là 特技 (kỹ năng đặc biệt), khác từ 得意.", "どくい|得 đọc とく, không phải どく."),
],
[
 Q("風邪をひいて、熱が（　）。", "Tôi bị cảm và lên cơn sốt.", "vocab:熱が出る", "出ました|熱が出る là lên sốt, cách kết hợp tự nhiên.", "入りました|熱が入る không diễn tả phát sốt trong câu này.", "起きました|Không nói 熱が起きる để chỉ bị sốt.", "開きました|開く là mở, không đi với 熱 theo nghĩa sốt."),
 Q("帰る前に、忘れ物がないか（　）ください。", "Trước khi về, hãy kiểm tra xem có quên đồ không.", "vocab:確かめる", "確かめて|〜か確かめる là kiểm tra xem có đúng hoặc có xảy ra không.", "決めて|決める là quyết định, không phải kiểm tra đồ sót.", "伝えて|伝える là truyền đạt, không tự kiểm tra tình trạng.", "集めて|集める là thu thập, không đi với mệnh đề nghi vấn theo nghĩa xác nhận."),
 Q("今日は用事があるので、早く帰らせて（　）。", "Hôm nay có việc nên xin cho tôi về sớm.", "vocab:いただく", "いただきます|帰らせていただく là cách lịch sự xin phép mình được về.", "あげます|帰らせてあげる là cho người khác về, không phải xin phép mình về.", "くれます|くれる cần người cho phép làm chủ thể, không dùng cho chính người nói theo cách này.", "おります|帰らせております là đang cho ai đó về, không phải xin phép bản thân."),
 Q("ここは車を止めてはいけない（　）です。", "Đây là nơi không được đỗ xe.", "vocab:場所", "場所|場所 là địa điểm; mệnh đề trước bổ nghĩa nơi cấm đỗ xe.", "理由|理由 là lý do; ở đây ここは chỉ vị trí, không phải lý do.", "気持ち|気持ち là cảm xúc, không phải địa điểm.", "予定|予定 là dự định, không phải nơi chốn."),
],
[
 Q("あの店は利用しやすいです。", "Cửa hàng kia tiện sử dụng.", "vocab:利用する", "使うのに便利です|利用しやすい nghĩa là dễ và thuận tiện khi dùng.", "いつも休みです|Luôn nghỉ không đồng nghĩa với tiện sử dụng.", "店員が少ないです|Ít nhân viên không phải nghĩa của 利用しやすい.", "値段が一番高いです|Đắt nhất không nói lên việc dễ sử dụng.", target="利用しやすい"),
 Q("たいてい七時に起きます。", "Tôi thường dậy lúc bảy giờ.", "vocab:たいてい", "ほとんど毎日|たいてい là thường, hầu hết các ngày.", "一度だけ|Chỉ một lần khác với thói quen thường xuyên.", "絶対に毎日|Tuyệt đối mỗi ngày mạnh hơn たいてい, không chừa ngoại lệ.", "今まで一度も|Chưa từng lần nào là ý trái ngược.", target="たいてい"),
 Q("すぐに連絡してください。", "Hãy liên lạc ngay.", "vocab:連絡", "電話やメールなどで知らせてください|連絡する là báo tin hoặc liên hệ bằng điện thoại, thư điện tử.", "駅まで来てください|Đến ga là di chuyển, không phải nghĩa của liên lạc.", "よく休んでください|Nghỉ ngơi không có nghĩa báo tin.", "ここに名前を書いてください|Ghi tên không tự nó là liên lạc.", target="連絡して"),
 Q("この紙は必要ありません。", "Tờ giấy này không cần thiết.", "vocab:必要", "使わなくても大丈夫です|Không cần dùng cũng được tương đương không cần thiết.", "必ず持ってきてください|Bắt buộc mang theo là ngược với không cần.", "もっと買ってください|Mua thêm không phải nghĩa không cần thiết.", "まだ読んでいません|Chưa đọc không có nghĩa không cần giấy.", target="必要ありません"),
],
[
 Q("「迎える」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 迎える (đón)?", "usage:迎える", "駅へ友だちを迎えに行きました。|友だちを迎えに行く là đi đón bạn tại ga.", "友だちに駅を迎えました。|Người được đón đi với を; không dùng 駅を迎える theo nghĩa đón bạn.", "宿題を迎えてから寝ます。|Làm xong bài tập dùng 終える, không phải 迎える.", "りんごを迎えて食べました。|Không dùng 迎える cho hành động chuẩn bị ăn táo."),
 Q("「直す」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 直す (sửa)?", "usage:直す", "まちがえた漢字を直しました。|直す có thể là sửa chữ Hán viết sai.", "風邪が直しました。|Bệnh khỏi dùng 治る; không nói 風邪が直す.", "駅まで直して歩きました。|Không dùng 直す để chỉ hướng đi đến ga.", "水を直して飲みました。|Nước uống không phải đối tượng sửa chữa trong ngữ cảnh này."),
 Q("「間違える」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 間違える (nhầm)?", "usage:間違える", "電話番号を間違えました。|電話番号を間違える là nhầm số điện thoại.", "電話番号が間違えました。|間違える là tha động từ trong câu này, cần を, không phải が.", "雨が間違えて降りました。|Không dùng 間違える để nói mưa rơi nhầm.", "この服は間違えくて安いです。|Không có dạng tính từ 間違えくて."),
 Q("「楽しみ」の使い方として正しいものはどれですか。", "Câu nào dùng đúng 楽しみ (mong chờ)?", "usage:楽しみ", "来週の旅行を楽しみにしています。|Nを楽しみにする là mong chờ một sự kiện sắp tới.", "旅行を楽しみくしています。|楽しみ không đổi thành trạng từ 楽しみく.", "旅行が楽しみをあります。|Không dùng 楽しみをある; cấu trúc sai trợ từ.", "楽しいに旅行をしています。|楽しい là tính từ い; không nối trực tiếp に như thế này."),
]],
"grammar": [
 Q("テレビを（　）ながら、ごはんを食べないでください。", "Đừng vừa xem tivi vừa ăn cơm.", "grammar:ながら", "見|V bỏ ます + ながら: 見ながら là vừa xem vừa làm gì.", "見る|Thể từ điển không đứng trước ながら trong mẫu đồng thời.", "見て|Thể て không nối với ながら.", "見た|Thể quá khứ không nối với ながら."),
 Q("この漢字は難しくて、まだ（　）。", "Kanji này khó nên tôi vẫn chưa đọc được.", "grammar:可能否定", "読めません|読めません là không thể đọc, nêu khả năng chưa có.", "読みませんでした|Quá khứ không đọc không thể hiện chưa có khả năng hiện tại.", "読ませます|読ませる là bắt/cho đọc, không nói năng lực của mình.", "読んでください|Đây là yêu cầu người khác đọc, không diễn tả khả năng bản thân."),
 Q("会議が始まる（　）、資料をコピーしてください。", "Hãy photocopy tài liệu trước khi cuộc họp bắt đầu.", "grammar:前に", "前に|V từ điển + 前に là trước khi làm gì.", "後で|後で cần Vた, không phải 始まる; nghĩa cũng đảo thời điểm.", "ながら|ながら cần thân ます và hai hành động đồng thời cùng chủ thể.", "ためで|ためで không tạo quan hệ trước-sau trong câu."),
 Q("部屋が暗いので、電気をつけて（　）か。", "Phòng tối nên bạn có thể bật đèn giúp tôi không?", "grammar:てもらえませんか", "もらえません|〜てもらえませんか là lời nhờ người khác làm giúp.", "あげません|あげる là làm cho người khác, không phải nhờ bật đèn cho mình.", "しまいました|Phủ định/khẳng định quá khứ 完了 không tạo lời nhờ ở đây.", "おきませんでした|Đây là phủ định quá khứ của làm sẵn, không phải lời nhờ hiện tại."),
 Q("明日は雪が（　）そうです。天気予報で聞きました。", "Nghe dự báo thời tiết nói ngày mai sẽ có tuyết.", "grammar:伝聞そうだ", "降る|Thể thường + そうだ diễn tả nghe nói; dự báo là nguồn tin.", "降り|降りそうだ là trông có vẻ sắp có tuyết, không phải nghe tin từ dự báo.", "降って|降ってそう không phải cấu trúc truyền đạt tin được học ở đây.", "降ります|Thể ます không nối trực tiếp với そうだ truyền văn."),
 Q("ここに名前を（　）ください。", "Hãy ghi tên vào đây.", "grammar:てください", "書いて|Vてください là lời yêu cầu, 書く → 書いて.", "書く|Thể từ điển không nối trực tiếp với ください.", "書きます|Thể ます không nối trực tiếp với ください.", "書いた|Thể quá khứ không nối trực tiếp với ください."),
 Q("毎朝、新聞を読む（　）しています。", "Tôi cố gắng duy trì đọc báo mỗi sáng.", "grammar:ようにする", "ように|Vようにする diễn tả cố tạo hoặc duy trì thói quen.", "ためを|ためをしている không phải mẫu chỉ duy trì thói quen.", "ことが|読むことがしています sai trợ từ và cấu trúc.", "ところへ|ところへ chỉ đúng lúc có sự việc đến, không kết hợp しています như ở đây."),
 Q("先生に、宿題を忘れない（　）言われました。", "Tôi được thầy cô nhắc đừng quên bài tập.", "grammar:ように言う", "ように|Vないように言う dùng để thuật lại lời nhắc hoặc yêu cầu.", "ために|ために chỉ mục đích, không là nội dung được nhắc trực tiếp ở đây.", "ながら|ながら không gắn với động từ phủ định 忘れない.", "ことを|忘れないことを言われる không phải cách thuật lời nhắc tự nhiên của mẫu này."),
],
"sort": [
 O("わたしは", ["朝ごはん", "を", "食べる", "前に"], "散歩します。", "Tôi đi dạo trước khi ăn sáng."),
 O("この辞書は", ["漢字", "を", "調べる", "のに"], "便利です。", "Từ điển này tiện cho việc tra kanji."),
 O("雨が降った", ["場合", "は", "家に", "いる"], "つもりです。", "Nếu trời mưa tôi định ở nhà."),
 O("これは", ["先生", "に", "見てもらった", "作文"], "です。", "Đây là bài văn tôi đã nhờ thầy cô xem."),
],
"cloze": P("cloze", "自転車で通う", [
 S("先月まで|Cho đến tháng trước", "バスで会社に通っていました。|tôi đi làm bằng xe buýt."),
 S("今は健康のために、|Bây giờ vì sức khỏe,", "自転車で行くようにしています。|tôi cố gắng đi bằng xe đạp.", blank="今は健康のために、自転車で行く（　）しています。"),
 S("雨の日は|Vào ngày mưa", "危ないので、バスを使います。|vì nguy hiểm nên tôi đi xe buýt.", blank="雨の日は危ない（　）、バスを使います。"),
 S("会社に着いてから、|Sau khi đến công ty,", "水を飲みます。|tôi uống nước.", blank="会社に（　）から、水を飲みます。"),
 S("前より|So với trước", "体が軽くなった気がします。|tôi cảm thấy người nhẹ nhõm hơn.", blank="前より体が軽く（　）気がします。"),
 ], [
 Q("今は健康のために、自転車で行く（　）しています。", "Bây giờ vì sức khỏe, tôi cố đi làm bằng xe đạp.", "grammar:ようにしている", "ように|Vようにしている thể hiện cố duy trì một thói quen.", "ことが|行くことがしています sai cấu trúc, không diễn tả thói quen.", "ためが|ためがしています không tạo cấu trúc chỉ nỗ lực duy trì.", "ところで|ところでしています không nối với 行く theo nghĩa này.", evidence=[2]),
 Q("雨の日は危ない（　）、バスを使います。", "Ngày mưa nguy hiểm nên tôi đi xe buýt.", "grammar:ので", "ので|危ないので đưa ra nguyên nhân dùng xe buýt thay xe đạp.", "のに|のに chỉ dù nguy hiểm vẫn làm trái dự đoán; ở đây chọn phương tiện an toàn hơn.", "まで|まで là đến khi hoặc đến đâu, không chỉ nguyên nhân.", "ながら|Tính từ 危ない không trực tiếp nối ながら như mẫu động từ đồng thời.", evidence=[3]),
 Q("会社に（　）から、水を飲みます。", "Sau khi đến công ty tôi uống nước.", "grammar:てから", "着いて|Vてから chỉ trình tự, 着く → 着いて.", "着く|V từ điển + から ở đây không tạo mẫu sau khi xong.", "着きます|Không nối thể ます trực tiếp với から theo mẫu trình tự này.", "着いたら|着いたらから lặp hai cấu trúc điều kiện/trình tự, không đúng.", evidence=[4]),
 Q("前より体が軽く（　）気がします。", "Tôi cảm thấy cơ thể nhẹ nhõm hơn trước.", "grammar:くなる", "なった|軽い → 軽くなる: trở nên nhẹ hơn; なった bổ nghĩa 気.", "した|軽くする là làm cho nhẹ, khác với cảm giác tự thay đổi trạng thái cơ thể.", "なります|Thể ます không đứng trực tiếp trước danh từ 気.", "なるを|を không thể chen giữa động từ bổ nghĩa và 気.", evidence=[5]),
 ]),
"reading": [
 P("notice", "店の前の自転車", [
 S("お客様の自転車は|Xe đạp của khách", "店の右側に止めてください。|xin đỗ bên phải cửa hàng."),
 S("入口の前は|Phía trước lối vào", "荷物を運ぶ車が使います。|dành cho xe chuyển hàng."),
 S("長い時間止める場合は、|Nếu đỗ lâu,", "駅の駐輪場を利用してください。|xin dùng bãi xe đạp của ga."),
 ], [
 Q("買い物の間、自転車はどこに止めますか。", "Trong lúc mua sắm nên đỗ xe đạp ở đâu?", "reading:detail", "店の右側|Thông báo chỉ rõ xe khách mua sắm đỗ bên phải cửa hàng.", "入口の前|Phía trước lối vào dành cho xe chở hàng.", "店の左側|Thông báo nói bên phải, không phải bên trái.", "車の中|Không có thông tin cất xe đạp trong ô tô.", evidence=[1,2]),
 Q("長い時間止めたい人は、どうしますか。", "Người muốn đỗ xe lâu nên làm gì?", "reading:action", "駅の駐輪場を使います|Câu cuối hướng dẫn đỗ lâu thì dùng bãi xe đạp của ga.", "入口の前に止めます|Lối vào dành cho xe chuyển hàng, không được đỗ lâu ở đó.", "店員に自転車を預けます|Thông báo không có dịch vụ gửi xe cho nhân viên.", "車が来るまで待ちます|Không có chỉ dẫn chờ xe hàng.", evidence=[3]),
 ]),
 P("prose", "小さい店", [
 S("家の近くに|Gần nhà tôi", "小さいパン屋があります。|có một tiệm bánh mì nhỏ."),
 S("種類は多くありませんが、|Tuy không có nhiều loại,", "毎朝焼いたパンを売っています。|tiệm bán bánh mới nướng mỗi sáng."),
 S("店の人はいつも|Người bán luôn", "パンの食べ方を教えてくれます。|chỉ tôi cách ăn bánh."),
 S("わたしが風邪をひいたときには、|Khi tôi bị cảm,", "食べやすいやわらかいパンをすすめてくれました。|họ gợi ý bánh mềm dễ ăn."),
 S("安い店はほかにもありますが、|Các tiệm rẻ thì còn có nơi khác,", "わたしはこの店に通いたいです。|nhưng tôi muốn tiếp tục đến tiệm này."),
 ], [
 Q("このパン屋について正しいものはどれですか。", "Thông tin nào đúng về tiệm bánh?", "reading:detail", "毎朝、新しく焼いたパンを売っています|Câu 2 nói tiệm bán bánh mới nướng mỗi sáng.", "パンの種類がとても多いです|Đoạn nói rõ số loại bánh không nhiều.", "近くで一番安い店です|Người viết còn nhắc các tiệm rẻ khác; không nói rẻ nhất.", "店の人は話をしません|Người bán thường hướng dẫn và gợi ý bánh cho khách.", evidence=[2,3]),
 Q("筆者はどうしてこの店に通いたいのですか。", "Vì sao người viết muốn tiếp tục đến tiệm này?", "reading:reason", "店の人が自分に合うパンを考えてくれるから|Người bán hướng dẫn, gợi ý bánh mềm khi khách ốm; đó là sự quan tâm phù hợp khách.", "種類が町で一番多いから|Số loại bánh được nói là không nhiều.", "必ず安くしてくれるから|Không có thông tin giảm giá cho người viết.", "風邪の薬を売っているから|Tiệm bán bánh, không bán thuốc cảm.", evidence=[3,4,5]),
 ]),
 P("email", "町のそうじ", [
 S("今度の日曜日、|Chủ nhật tới", "町のそうじをします。|chúng ta sẽ dọn vệ sinh khu phố."),
 S("朝九時に|Lúc chín giờ sáng", "公園の入口に集まってください。|hãy tập trung tại cổng công viên."),
 S("ごみ袋はこちらで用意しますが、|Ban tổ chức chuẩn bị túi rác,", "手袋は持ってきてください。|nhưng hãy tự mang găng tay."),
 S("雨が降ったら、|Nếu trời mưa,", "次の日曜日に変えます。|sẽ chuyển sang Chủ nhật tuần sau nữa."),
 S("参加する人は|Người tham gia", "金曜日までにメールで知らせてください。|hãy báo qua thư điện tử chậm nhất thứ Sáu."),
 ], [
 Q("参加する人が持っていくものは何ですか。", "Người tham gia cần mang gì?", "reading:detail", "手袋|Câu 3 phân biệt túi rác được chuẩn bị sẵn, còn găng tay phải tự mang.", "ごみ袋|Ban tổ chức chuẩn bị túi rác, không yêu cầu người tham gia tự mang.", "メール|Thư điện tử là cách báo tham gia, không phải vật mang theo.", "雨の日の服|Không yêu cầu đồ đi mưa vì ngày mưa sẽ hoãn.", evidence=[3]),
 Q("日曜日に雨が降ったら、そうじはいつしますか。", "Nếu Chủ nhật mưa thì khi nào dọn vệ sinh?", "reading:condition", "次の日曜日|Câu 4 nói chuyển sang Chủ nhật kế tiếp.", "同じ日の午後|Không chuyển sang buổi chiều cùng ngày.", "次の月曜日|次の日曜日 là Chủ nhật sau, không phải thứ Hai sau.", "金曜日|Thứ Sáu là hạn báo tham gia, không phải ngày dọn.", evidence=[4,5]),
 ]),
 P("info", "貸し会議室", [
 S("小会議室は|Phòng họp nhỏ", "十人までで、一時間五百円です。|chứa tối đa mười người, giá năm trăm yên mỗi giờ."),
 S("大会議室は|Phòng họp lớn", "三十人までで、一時間千円です。|chứa tối đa ba mươi người, giá một nghìn yên mỗi giờ."),
 S("どちらも|Cả hai phòng", "午前九時から午後六時まで使えます。|đều dùng được từ chín giờ sáng đến sáu giờ chiều."),
 S("予約は|Đặt phòng", "利用日の三日前までにしてください。|phải thực hiện chậm nhất ba ngày trước ngày dùng."),
 S("飲み物はいいですが、|Có thể mang đồ uống,", "食事はできません。|nhưng không được ăn trong phòng."),
 ], [
 Q("十二人で二時間使う場合、料金はいくらですか。", "Mười hai người dùng hai giờ thì phí bao nhiêu?", "reading:information", "二千円|12 người vượt sức chứa phòng nhỏ, phải dùng phòng lớn 1000 yên/giờ; hai giờ là 2000 yên.", "五百円|500 yên chỉ là một giờ phòng nhỏ, không đủ chỗ cho 12 người.", "千円|1000 yên là một giờ phòng lớn, trong khi cần hai giờ.", "三千円|Không có căn cứ tính ba giờ; nhu cầu là hai giờ.", evidence=[1,2]),
 Q("会議室について正しいものはどれですか。", "Thông tin nào đúng về phòng họp?", "reading:information", "使う日の三日前までに予約します|Câu 4 yêu cầu đặt chậm nhất ba ngày trước ngày dùng.", "午後八時まで使えます|Giờ sử dụng kết thúc lúc 18 giờ, không phải 20 giờ.", "飲み物を飲んではいけません|Đồ uống được phép; chỉ bữa ăn bị cấm.", "十人なら大会議室しか使えません|Phòng nhỏ chứa tối đa 10 người nên 10 người dùng được cả phòng nhỏ.", evidence=[1,3,4,5]),
 ]),
]},
]
