from common import Q, R, S, O, P

TESTS = [
{
"vocab": [
[
 R("毎朝、水を飲みます。", "Mỗi sáng tôi uống nước.", "水", "みず", "nước", "ひ|ひ là lửa (火), không phải 水.", "き|き là cây (木), không phải 水.", "つち|つち là đất (土), không phải 水."),
 R("駅で友だちに会います。", "Tôi gặp bạn ở ga.", "駅", "えき", "ga", "いえ|いえ là nhà (家), không phải 駅.", "みせ|みせ là cửa hàng (店), không phải 駅.", "まち|まち là khu phố (町), không phải 駅."),
 R("父は会社にいます。", "Bố tôi đang ở công ty.", "父", "ちち", "bố của mình", "はは|はは là mẹ của mình (母), không phải 父.", "あに|あに là anh trai của mình (兄), không phải 父.", "あね|あね là chị gái của mình (姉), không phải 父."),
 R("今日は学校へ行きます。", "Hôm nay tôi đi học.", "今日", "きょう", "hôm nay", "きのう|きのう là hôm qua (昨日), không phải 今日.", "あした|あした là ngày mai (明日), không phải 今日.", "まいにち|まいにち là mỗi ngày (毎日), không phải 今日."),
],
[
 Q("あたらしい本を買いました。", "Tôi đã mua một cuốn sách mới.", "kanji:writing", "新しい|新しい đọc là あたらしい, nghĩa là mới; đúng từ được hỏi.", "古い|古い đọc là ふるい, nghĩa là cũ, trái với あたらしい.", "高い|高い đọc là たかい, nghĩa là cao hoặc đắt, không phải mới.", "長い|長い đọc là ながい, nghĩa là dài, không phải mới.", target="あたらしい"),
 Q("まいにち日本語を勉強します。", "Tôi học tiếng Nhật mỗi ngày.", "kanji:writing", "毎日|毎日 đọc là まいにち, nghĩa là mỗi ngày.", "毎月|毎月 là まいつき, mỗi tháng, không phải mỗi ngày.", "毎年|毎年 là まいとし, mỗi năm, không phải mỗi ngày.", "毎週|毎週 là まいしゅう, mỗi tuần, không phải mỗi ngày.", target="まいにち"),
 Q("このやまは高いです。", "Ngọn núi này cao.", "kanji:writing", "山|山 đọc là やま, nghĩa là núi.", "川|川 đọc là かわ, nghĩa là sông, không phải núi.", "田|田 đọc là た, nghĩa là ruộng lúa.", "天|天 đọc là てん, nghĩa là trời, không phải やま.", target="やま"),
 Q("みぎに曲がってください。", "Hãy rẽ phải.", "kanji:writing", "右|右 đọc là みぎ, chỉ bên phải.", "左|左 đọc là ひだり, chỉ bên trái.", "上|上 đọc là うえ, chỉ phía trên.", "下|下 đọc là した, chỉ phía dưới.", target="みぎ"),
],
[
 Q("このスープはとても（　）です。水をください。", "Món súp này rất cay. Cho tôi nước với.", "vocab:からい", "からい|からい là cay; người nói xin nước vì súp cay.", "ねむい|ねむい là buồn ngủ, không dùng để tả món súp.", "いそがしい|いそがしい là bận, không dùng để tả vị.", "ひろい|ひろい là rộng, không tả vị của súp."),
 Q("雨が降っていますから、（　）を持っていきます。", "Vì trời đang mưa nên tôi mang ô theo.", "vocab:かさ", "かさ|かさ là ô, phù hợp để dùng khi trời mưa.", "はし|はし là đũa trong ngữ cảnh vật dụng; không che mưa được.", "さら|さら là đĩa, không phải vật dùng che mưa.", "かぎ|かぎ là chìa khóa; không gắn với lý do trời mưa."),
 Q("パンを二つ（　）。いくらですか。", "Cho tôi hai cái bánh mì. Bao nhiêu tiền vậy?", "vocab:ください", "ください|Danh từ をください dùng để yêu cầu lấy món hàng.", "あります|あります là có, không phải lời yêu cầu người bán đưa hàng.", "います|います dùng cho sự tồn tại của người, động vật, không phải bánh mì.", "なります|なります là trở thành, không dùng để đặt mua như câu này."),
 Q("夜です。部屋が暗いので、電気を（　）。", "Buổi tối rồi. Vì phòng tối nên tôi bật đèn.", "vocab:つける", "つけます|電気をつけます là bật đèn, hợp với lý do phòng tối.", "けします|電気をけします là tắt đèn, khiến phòng tối hơn.", "しめます|しめます là đóng cửa hoặc vật tương tự, không đi với 電気.", "あらいます|あらいます là rửa; không dùng cho việc làm phòng sáng."),
],
[
 Q("このかばんは安いです。", "Chiếc cặp này rẻ.", "vocab:安い", "ねだんが高くないです|Giá không cao chính là nghĩa của 安い.", "とても大きいです|Rất lớn nói về kích thước, không phải giá rẻ.", "とても重いです|Rất nặng nói về trọng lượng, không phải giá.", "あまり新しくないです|Không mới lắm nói về tình trạng, không có nghĩa là rẻ.", target="安い"),
 Q("ここで少し待ってください。", "Hãy đợi ở đây một chút.", "vocab:少し", "ちょっと|ちょっと có nghĩa là một chút, tương đương 少し.", "たくさん|たくさん là nhiều, trái với 少し.", "いつも|いつも là luôn luôn, không chỉ lượng ít.", "ぜんぜん|ぜんぜん thường đi với phủ định, nghĩa là hoàn toàn không.", target="少し"),
 Q("田中さんはとても元気です。", "Anh Tanaka rất khỏe.", "vocab:元気", "からだのちょうしがいいです|Tình trạng sức khỏe tốt là nghĩa của 元気 trong câu.", "お金がたくさんあります|Có nhiều tiền không phải là nghĩa của 元気.", "じかんがありません|Không có thời gian diễn tả sự bận rộn.", "せが高いです|Cao người nói về chiều cao, không phải sức khỏe.", target="元気"),
 Q("この店はいつもにぎやかです。", "Cửa hàng này lúc nào cũng nhộn nhịp.", "vocab:にぎやか", "人が多くて、声などがよく聞こえます|Đông người, có nhiều âm thanh là nhộn nhịp.", "人がいなくて、しずかです|Vắng người, yên tĩnh là trái với にぎやか.", "何も売っていません|Không bán gì không phải nghĩa của nhộn nhịp.", "駅から遠いです|Xa ga nói về vị trí, không phải không khí cửa hàng.", target="にぎやか"),
]],
"grammar": [
 Q("わたしは毎朝七時（　）起きます。", "Mỗi sáng tôi dậy lúc bảy giờ.", "grammar:時刻に", "に|に đánh dấu thời điểm cụ thể: 七時に起きます.", "で|で thường chỉ nơi hành động hoặc phương tiện, không gắn giờ thức dậy.", "を|を đánh dấu tân ngữ; 七時 không phải vật chịu tác động.", "へ|へ chỉ hướng đến, không dùng sau giờ."),
 Q("図書館（　）本を読みます。", "Tôi đọc sách ở thư viện.", "grammar:場所で", "で|で đánh dấu nơi diễn ra hành động 読みます.", "に|に chỉ nơi tồn tại hoặc đích đến; ở đây là hoạt động đọc.", "へ|へ chỉ hướng di chuyển, không phải nơi đọc.", "を|を không dùng để chỉ địa điểm đọc sách."),
 Q("これはわたし（　）かさです。", "Đây là ô của tôi.", "grammar:所有の", "の|N1のN2 thể hiện sở hữu: ô của tôi.", "と|と là và hoặc cùng với, không diễn tả sở hữu.", "も|も là cũng, không nối chủ sở hữu với vật.", "が|が đánh dấu chủ ngữ, không dùng trước danh từ như ở đây."),
 Q("昨日、映画を（　）。", "Hôm qua tôi đã xem phim.", "grammar:動詞過去", "見ました|昨日 là quá khứ nên dùng 見ました.", "見ます|見ます là hiện tại hoặc tương lai, không phù hợp mốc 昨日.", "見ましょう|見ましょう là lời rủ, không kể việc đã làm hôm qua.", "見てください|見てください là yêu cầu người khác xem, không thuật lại quá khứ."),
 Q("この部屋は（　）です。", "Căn phòng này yên tĩnh.", "grammar:な形容詞述語", "しずか|Tính từ な làm vị ngữ: しずかです, không thêm な.", "しずかな|しずかな phải đi trước danh từ, như しずかな部屋.", "しずかに|しずかに bổ nghĩa động từ, không đứng với です theo cách này.", "しずかく|しずか là tính từ な, không đổi thành しずかく."),
 Q("いっしょに昼ごはんを（　）か。", "Bạn có muốn cùng ăn trưa không?", "grammar:ませんか", "食べません|〜ませんか là lời mời cùng làm gì.", "食べて|食べてか không tạo thành lời mời đúng cấu trúc.", "食べた|食べたか hỏi việc đã ăn, không phải lời rủ lịch sự.", "食べるな|食べるな là cấm ăn, ngược với lời mời."),
 Q("机の上に本が三冊（　）。", "Trên bàn có ba cuốn sách.", "grammar:あります", "あります|本 là vật vô tri, dùng あります để nói có.", "います|います dùng cho người, động vật; không dùng cho sách.", "します|します là làm, không phải động từ chỉ tồn tại.", "いきます|いきます là đi, sách không tự đi và câu nói về tồn tại."),
 Q("コーヒーは飲みますが、お酒は（　）。", "Tôi uống cà phê, nhưng không uống rượu.", "grammar:動詞否定", "飲みません|飲みません là phủ định lịch sự, phù hợp đối lập với uống cà phê.", "飲むません|Không gắn ません sau thể từ điển 飲む; phải dùng thân 飲み.", "飲みましょう|飲みましょう là cùng uống nào, không nói thói quen không uống.", "飲んでください|飲んでください là xin hãy uống, không nói thói quen của tôi."),
],
"sort": [
 O("この本は", ["わたし", "の", "では", "ありません"], "。", "Cuốn sách này không phải của tôi."),
 O("わたしは", ["昨日", "から", "今日", "まで"], "休みです。", "Tôi nghỉ từ hôm qua đến hôm nay."),
 O("この", ["白い", "かばん", "は", "いくら"], "ですか。", "Chiếc cặp trắng này giá bao nhiêu?"),
 O("毎朝、", ["ごはん", "を", "食べて", "から"], "学校へ行きます。", "Mỗi sáng tôi ăn cơm xong rồi đi học."),
],
"cloze": P("cloze", "わたしの土曜日", [
 S("土曜日は|Thứ Bảy", "学校がありません。|tôi không có giờ học."),
 S("朝、|Buổi sáng,", "公園へ行きました。|tôi đã đi công viên.", blank="朝、公園（　）行きました。"),
 S("公園で|Ở công viên", "友だちとテニスをしました。|tôi chơi quần vợt với bạn.", blank="公園（　）友だちとテニスをしました。"),
 S("テニスのあとで、|Sau khi chơi quần vợt,", "パンを食べました。|tôi ăn bánh mì.", blank="テニスのあとで、パンを（　）。"),
 S("日曜日も|Chủ nhật", "公園へ行きたいです。|tôi cũng muốn đi công viên.", blank="日曜日（　）公園へ行きたいです。"),
 ], [
 Q("朝、公園（　）行きました。", "Buổi sáng tôi đã đi công viên.", "grammar:方向へ", "へ|へ chỉ hướng đi đến công viên.", "で|で chỉ nơi hành động; 行く cần đích đến, không phải nơi diễn ra.", "を|を có thể chỉ tuyến đi qua nhưng không diễn tả đi đến công viên ở đây.", "と|と chỉ đi cùng, không dùng cho nơi chốn.", evidence=[2]),
 Q("公園（　）友だちとテニスをしました。", "Tôi chơi quần vợt với bạn ở công viên.", "grammar:場所で", "で|で chỉ nơi diễn ra hành động chơi quần vợt.", "へ|へ chỉ hướng di chuyển; câu này không có động từ di chuyển.", "に|に không đánh dấu nơi diễn ra テニスをする.", "の|の nối danh từ, không chỉ nơi chơi ở cấu trúc này.", evidence=[3]),
 Q("テニスのあとで、パンを（　）。", "Sau khi chơi quần vợt tôi đã ăn bánh mì.", "grammar:過去", "食べました|Đoạn kể việc đã làm vào thứ Bảy nên dùng quá khứ.", "食べます|食べます là hiện tại/tương lai, không khớp chuỗi kể quá khứ.", "食べましょう|Đây là lời rủ, không phải lời kể lại hoạt động.", "食べてください|Đây là yêu cầu người khác ăn, không khớp chủ thể tự kể.", evidence=[2,3,4]),
 Q("日曜日（　）公園へ行きたいです。", "Chủ nhật tôi cũng muốn đi công viên.", "grammar:追加も", "も|も là cũng: đã đi thứ Bảy và muốn đi cả Chủ nhật.", "を|を không đi sau ngày làm tân ngữ của 行く.", "で|で không chỉ thêm ngày thực hiện mong muốn trong cấu trúc này.", "へ|へ chỉ hướng đến nơi, không gắn với 日曜日.", evidence=[2,5]),
 ]),
"reading": [
 P("email", "ミナさんへ", [
 S("あした、|Ngày mai,", "いっしょに図書館へ行きませんか。|chúng mình cùng đi thư viện nhé?"),
 S("わたしは午前中に|Buổi sáng mình", "アルバイトがあります。|có việc làm thêm."),
 S("午後二時に|Lúc hai giờ chiều", "駅の前で会いましょう。|hãy gặp nhau trước ga."),
 S("図書館は駅のとなりですから、|Vì thư viện ở cạnh ga,", "歩いて行けます。|chúng ta có thể đi bộ đến."),
 ], [
 Q("二人はいつ会いますか。", "Hai người sẽ gặp lúc nào?", "reading:detail", "午後二時|Câu 3 hẹn gặp lúc hai giờ chiều, không phải giờ buổi sáng.", "午前二時|Đoạn ghi 午後二時, không phải hai giờ sáng.", "午前中|Buổi sáng người gửi bận làm thêm, không hẹn gặp.", "午後四時|Bốn giờ chiều không xuất hiện trong lời hẹn.", evidence=[3]),
 Q("図書館へどうやって行きますか。", "Họ sẽ đến thư viện bằng cách nào?", "reading:detail", "歩いて行きます|Câu cuối nói thư viện cạnh ga nên đi bộ được.", "バスで行きます|Đoạn không nói đi xe buýt mà nói 歩いて.", "車で行きます|Không có thông tin đi ô tô; họ đi bộ từ ga.", "電車で行きます|Ga là điểm gặp, không phải phương tiện đi đến thư viện.", evidence=[4]),
 ]),
 P("prose", "わたしの犬", [
 S("わたしの家には|Nhà tôi", "小さい犬がいます。|có một con chó nhỏ."),
 S("名前はポチで、|Nó tên là Pochi,", "二歳です。|hai tuổi."),
 S("朝は父が|Buổi sáng bố tôi", "犬と公園へ行きます。|đưa chó đi công viên."),
 S("わたしは学校から帰ってから、|Sau khi đi học về,", "犬と遊びます。|tôi chơi với chó."),
 S("犬はボールで遊ぶのが|Con chó", "好きです。|thích chơi bóng."),
 ], [
 Q("朝、犬と公園へ行くのはだれですか。", "Ai đưa chó đi công viên vào buổi sáng?", "reading:detail", "父|Câu 3 nói bố đưa chó đi công viên buổi sáng.", "母|Không có thông tin mẹ đưa chó đi; người được nhắc là bố.", "わたし|Người viết chơi với chó sau khi đi học về, không phải buổi sáng.", "友だち|Đoạn không nhắc bạn bè đưa chó đi.", evidence=[3]),
 Q("犬は何をするのが好きですか。", "Con chó thích làm gì?", "reading:detail", "ボールで遊ぶこと|Câu cuối nói rõ chó thích chơi với bóng.", "学校へ行くこと|Chó không đi học; người viết mới là người đi học.", "本を読むこと|Đoạn không nói chó thích đọc sách.", "車に乗ること|Không có thông tin chó thích ngồi ô tô.", evidence=[5]),
 ]),
 P("notice", "本屋からのお知らせ", [
 S("この店は|Cửa hàng này", "毎日十時に開きます。|mở cửa lúc mười giờ mỗi ngày."),
 S("月曜日から金曜日までは|Từ thứ Hai đến thứ Sáu", "午後八時に閉まります。|cửa hàng đóng lúc tám giờ tối."),
 S("土曜日と日曜日は|Vào thứ Bảy và Chủ nhật", "午後六時に閉まります。|cửa hàng đóng lúc sáu giờ chiều."),
 S("本は二階で、|Sách ở tầng hai,", "雑誌は一階で売っています。|tạp chí được bán ở tầng một."),
 S("今週の日曜日は|Chủ nhật tuần này", "休みです。|cửa hàng nghỉ."),
 ], [
 Q("土曜日、この店は何時に閉まりますか。", "Thứ Bảy cửa hàng đóng lúc mấy giờ?", "reading:information", "午後六時|Câu 3 quy định giờ đóng cửa cuối tuần là 18 giờ.", "午後八時|20 giờ là giờ đóng cửa từ thứ Hai đến thứ Sáu.", "午前十時|10 giờ là giờ mở cửa, không phải giờ đóng.", "午前六時|Đoạn ghi sáu giờ chiều, không phải sáu giờ sáng.", evidence=[3]),
 Q("今週の日曜日に、この店で本を買えますか。", "Chủ nhật tuần này có mua sách ở cửa hàng này được không?", "reading:information", "いいえ、店が休みです|Câu cuối nói riêng Chủ nhật tuần này cửa hàng nghỉ.", "はい、二階で買えます|Sách ở tầng hai nhưng ngày đó cửa hàng nghỉ nên không mua được.", "はい、午後六時まで買えます|18 giờ là giờ thường lệ; thông báo nghỉ tuần này được ưu tiên.", "はい、一階で買えます|Tầng một bán tạp chí và ngày đó cửa hàng cũng không mở.", evidence=[4,5]),
 ]),
 P("info", "日本語クラス", [
 S("朝のクラスは|Lớp buổi sáng", "月曜日と水曜日の九時から十時までです。|học từ chín đến mười giờ thứ Hai và thứ Tư."),
 S("夜のクラスは|Lớp buổi tối", "火曜日と木曜日の七時から八時までです。|học từ bảy đến tám giờ thứ Ba và thứ Năm."),
 S("どちらのクラスも|Cả hai lớp", "一か月三千円です。|đều có học phí ba nghìn yên một tháng."),
 S("勉強したい人は|Người muốn học", "教室で名前を書いてください。|hãy ghi tên ở phòng học."),
 ], [
 Q("夜のクラスは何曜日ですか。", "Lớp buổi tối học vào thứ mấy?", "reading:information", "火曜日と木曜日|Câu 2 ghi lớp tối học thứ Ba và thứ Năm.", "月曜日と水曜日|Đây là lịch lớp sáng, không phải lớp tối.", "水曜日と金曜日|Không có lớp nào theo lịch thứ Tư và thứ Sáu.", "土曜日と日曜日|Thông báo không có lớp cuối tuần.", evidence=[2]),
 Q("朝のクラスは一か月いくらですか。", "Lớp buổi sáng một tháng bao nhiêu tiền?", "reading:information", "三千円|どちらのクラスも nghĩa là cả hai lớp đều ba nghìn yên mỗi tháng.", "千円|Một nghìn yên không phải học phí được thông báo.", "二千円|Hai nghìn yên không xuất hiện trong mức học phí.", "六千円|Không cộng tiền hai lớp: câu hỏi chỉ hỏi lớp sáng.", evidence=[3]),
 ]),
]},
{
"vocab": [
[
 R("来週、京都へ行きます。", "Tuần sau tôi đi Kyoto.", "来週", "らいしゅう", "tuần sau", "こんしゅう|こんしゅう là tuần này (今週), không phải 来週.", "せんしゅう|せんしゅう là tuần trước (先週), không phải 来週.", "まいしゅう|まいしゅう là mỗi tuần (毎週), không phải 来週."),
 R("花を買いました。", "Tôi đã mua hoa.", "花", "はな", "hoa", "くさ|くさ là cỏ (草), không phải 花.", "き|き là cây (木), không phải 花.", "やま|やま là núi (山), không phải 花."),
 R("外は寒いです。", "Bên ngoài trời lạnh.", "外", "そと", "bên ngoài", "なか|なか là bên trong (中), trái với 外.", "まえ|まえ là phía trước (前), không phải 外.", "うしろ|うしろ là phía sau (後ろ), không phải 外."),
 R("先生の話を聞きます。", "Tôi nghe thầy cô nói.", "先生", "せんせい", "thầy cô", "がくせい|がくせい là học sinh (学生), không phải 先生.", "せんしゅう|せんしゅう là tuần trước (先週), khác chữ và nghĩa.", "せんねん|せんねん là một nghìn năm (千年), không phải 先生."),
],
[
 Q("でんしゃで会社へ行きます。", "Tôi đi làm bằng tàu điện.", "kanji:writing", "電車|電車 đọc là でんしゃ, nghĩa là tàu điện.", "自転車|自転車 đọc là じてんしゃ, nghĩa là xe đạp.", "電話|電話 đọc là でんわ, nghĩa là điện thoại.", "車道|車道 đọc là しゃどう, là phần đường cho xe chạy.", target="でんしゃ"),
 Q("きたに山があります。", "Phía bắc có núi.", "kanji:writing", "北|北 đọc là きた, nghĩa là bắc.", "南|南 đọc là みなみ, nghĩa là nam.", "東|東 đọc là ひがし, nghĩa là đông.", "西|西 đọc là にし, nghĩa là tây.", target="きた"),
 Q("母はちいさいかばんを持っています。", "Mẹ tôi mang một chiếc cặp nhỏ.", "kanji:writing", "小さい|小さい đọc là ちいさい, nghĩa là nhỏ.", "大きい|大きい đọc là おおきい, nghĩa là lớn, trái nghĩa.", "少ない|少ない đọc là すくない, nghĩa là ít về số lượng.", "細い|細い đọc là ほそい, nghĩa là mảnh, không phải ちいさい.", target="ちいさい"),
 Q("ここに名前をかいてください。", "Hãy viết tên vào đây.", "kanji:writing", "書いて|書いて là thể て của 書く, viết.", "聞いて|聞いて là nghe hoặc hỏi, đọc きいて.", "買って|買って là mua, đọc かって.", "待って|待って là đợi, đọc まって.", target="かいて"),
],
[
 Q("手を（　）から、ごはんを食べます。", "Tôi rửa tay rồi ăn cơm.", "vocab:あらう", "あらって|手をあらう là rửa tay, hợp với việc làm trước khi ăn.", "あけて|あける là mở, không dùng với tay trong ngữ cảnh này.", "つけて|つける là bật hoặc gắn, không phải rửa tay.", "かして|かす là cho mượn; không phù hợp trình tự trước khi ăn."),
 Q("このシャツは（　）です。もっと大きいのはありますか。", "Chiếc áo này chật. Có chiếc nào to hơn không?", "vocab:きつい", "きつい|きつい là chật; vì thế người nói xin áo rộng hơn.", "あまい|あまい là ngọt, không tả kích thước áo.", "おいしい|おいしい là ngon, không dùng cho áo.", "ねむい|ねむい là buồn ngủ, không dùng cho áo."),
 Q("駅まで（　）十分ぐらいです。足が疲れます。", "Đi bộ đến ga mất khoảng mười phút. Chân tôi mỏi.", "vocab:あるく", "あるいて|あるいて là đi bộ; liên quan trực tiếp đến chân mỏi.", "およいで|およいで là bơi, không phải cách đến ga bằng chân trên đường.", "とんで|とんで là bay hoặc nhảy, không phải cách đi thông thường ở đây.", "うたって|うたって là hát, không nói phương thức đi bằng chân."),
 Q("このへやは（　）です。そうじをしましょう。", "Căn phòng này bẩn. Hãy dọn dẹp nào.", "vocab:きたない", "きたない|きたない là bẩn; vì bẩn nên cần dọn.", "あたらしい|Mới không phải lý do trực tiếp để dọn bẩn trong câu.", "おもしろい|おもしろい là thú vị, không diễn tả phòng cần vệ sinh.", "つめたい|つめたい là lạnh khi chạm vào, không phải lý do quét dọn."),
],
[
 Q("この道はせまいです。", "Con đường này hẹp.", "vocab:せまい", "道のはばが小さいです|Chiều ngang đường nhỏ chính là đường hẹp.", "道がとても長いです|Đường rất dài nói về chiều dài, không phải độ hẹp.", "道に車がありません|Không có xe không đồng nghĩa với đường hẹp.", "道が新しいです|Đường mới không nói lên độ rộng.", target="せまい"),
 Q("すぐに来てください。", "Hãy đến ngay.", "vocab:すぐ", "今、来てください|Đến bây giờ thể hiện yêu cầu đến ngay.", "あした来てください|Ngày mai khác với ngay bây giờ.", "来なくてもいいです|Không cần đến trái với lời yêu cầu đến ngay.", "ゆっくり来てください|Đến từ từ không diễn tả sự tức thời của すぐ.", target="すぐ"),
 Q("もう一度言ってください。", "Hãy nói lại một lần nữa.", "vocab:もう一度", "また言ってください|また diễn tả làm lại, tương đương nói thêm một lần.", "もっと大きい声で言ってください|Nói to hơn là yêu cầu âm lượng, không phải lặp lại.", "何も言わないでください|Đừng nói gì trái với yêu cầu nói lại.", "ゆっくり書いてください|Viết chậm là hành động khác với nói lại.", target="もう一度"),
 Q("この問題はやさしいです。", "Câu hỏi này dễ.", "vocab:やさしい", "むずかしくないです|Không khó chính là dễ trong ngữ cảnh câu hỏi.", "とても長いです|Rất dài không nói mức độ dễ khó.", "よくありません|Không tốt là đánh giá khác, không đồng nghĩa dễ.", "答えがありません|Không có đáp án không phải nghĩa của やさしい.", target="やさしい"),
]],
"grammar": [
 Q("昨日は（　）です。", "Hôm qua trời lạnh.", "grammar:い形容詞過去", "寒かった|Tính từ い quá khứ: 寒い → 寒かったです.", "寒い|寒いです diễn tả hiện tại, không hợp 昨日.", "寒いでした|Không gắn でした trực tiếp sau tính từ い.", "寒く|寒く là dạng nối hoặc trạng từ, chưa tạo vị ngữ quá khứ."),
 Q("テーブルの下（　）猫がいます。", "Dưới bàn có mèo.", "grammar:存在の場所", "に|に đánh dấu nơi tồn tại với います.", "で|で chỉ nơi diễn ra hoạt động, không đi với います để chỉ tồn tại.", "を|を không chỉ nơi tồn tại của mèo.", "へ|へ chỉ hướng, không phải vị trí có mèo."),
 Q("わたしは日本語（　）英語を勉強しています。", "Tôi đang học tiếng Nhật và tiếng Anh.", "grammar:並列と", "と|と nối hai danh từ theo nghĩa và.", "に|に không nối hai ngôn ngữ thành danh sách như câu này.", "で|で chỉ phương tiện, không mang nghĩa và ở đây.", "へ|へ chỉ hướng đến, không nối hai ngôn ngữ."),
 Q("ここで写真を（　）もいいですか。", "Tôi chụp ảnh ở đây có được không?", "grammar:てもいい", "とって|Vて + もいいですか dùng để xin phép; とる → とって.", "とる|Thể từ điển không nối trực tiếp với もいい trong mẫu này.", "とります|Thể ます không nối trực tiếp với もいい.", "とらない|Phủ định ない không tạo mẫu xin phép làm việc gì."),
 Q("わたしのかばんは、あの黒い（　）です。", "Cặp của tôi là cái màu đen kia.", "grammar:代名詞の", "の|の thay cho danh từ かばん đã biết, tránh lặp lại.", "こと|こと thường danh từ hóa việc, không thay cho chiếc cặp.", "とき|とき nghĩa là lúc, không thay cho đồ vật.", "ところ|ところ là nơi chốn, không thay cho cái cặp."),
 Q("きのうは日曜日（　）。", "Hôm qua là Chủ nhật.", "grammar:名詞過去", "でした|Danh từ làm vị ngữ quá khứ dùng でした.", "です|です là hiện tại, không hợp きのう.", "にします|にします là quyết định chọn, không phải xác định ngày hôm qua.", "があります|Có một Chủ nhật không phải cách nói hôm qua là Chủ nhật."),
 Q("このりんごを二つ（　）。", "Cho tôi hai quả táo này.", "grammar:をください", "ください|Nをください là mẫu xin hoặc mua một vật.", "あります|あります là có, không tạo lời yêu cầu người bán.", "います|います không dùng cho sự tồn tại của táo.", "なります|なります là trở thành, không dùng để mua táo."),
 Q("どこ（　）行きませんでした。家にいました。", "Tôi đã không đi đâu cả. Tôi ở nhà.", "grammar:どこへもない", "へも|どこへも〜ない nghĩa là không đi đâu cả.", "へは|どこへは không tạo mẫu phủ định toàn bộ địa điểm.", "では|どこでは dùng nơi diễn ra hành động, không chỉ đích đến của 行く.", "から|どこから hỏi điểm xuất phát, không diễn tả không đi đâu.",),
],
"sort": [
 O("わたしは", ["日本語", "が", "好き", "です"], "。", "Tôi thích tiếng Nhật."),
 O("あの店は", ["駅から", "歩いて", "五分", "です"], "。", "Cửa hàng kia cách ga năm phút đi bộ."),
 O("この本は", ["あまり", "むずかしく", "ない", "です"], "。", "Cuốn sách này không khó lắm."),
 O("毎日", ["日本語", "を", "勉強して", "います"], "。", "Tôi học tiếng Nhật mỗi ngày."),
],
"cloze": P("cloze", "新しいうち", [
 S("先月、|Tháng trước", "新しいうちに来ました。|tôi chuyển đến nhà mới."),
 S("うちは|Nhà tôi", "駅の近くにあります。|ở gần ga.", blank="うちは駅の近く（　）あります。"),
 S("前のうちより|So với nhà cũ", "広いです。|nhà này rộng hơn.", blank="前のうち（　）広いです。"),
 S("でも、|Tuy nhiên,", "学校までは遠いです。|đến trường thì xa.", blank="（　）、学校までは遠いです。"),
 S("毎朝、|Mỗi sáng", "バスで学校へ行きます。|tôi đi học bằng xe buýt.", blank="毎朝、バス（　）学校へ行きます。"),
 ], [
 Q("うちは駅の近く（　）あります。", "Nhà tôi ở gần ga.", "grammar:存在に", "に|近くにあります dùng に chỉ vị trí tồn tại.", "で|で chỉ nơi hoạt động, không dùng cho vị trí tồn tại với あります.", "を|を đánh dấu tân ngữ, không chỉ nơi có nhà.", "と|と chỉ cùng với hoặc liệt kê, không chỉ vị trí.", evidence=[2]),
 Q("前のうち（　）広いです。", "Nhà này rộng hơn nhà trước.", "grammar:比較より", "より|Nより chỉ đối tượng được lấy làm mốc so sánh.", "まで|まで là đến, không tạo phép so sánh hơn.", "しか|しか phải đi với phủ định và nghĩa chỉ, không so sánh độ rộng.", "へ|へ chỉ hướng, không dùng cho mốc so sánh.", evidence=[3]),
 Q("（　）、学校までは遠いです。", "Tuy nhiên, đến trường thì xa.", "grammar:でも", "でも|Nhà gần ga nhưng xa trường: でも nối hai đặc điểm đối lập.", "だから|だから là vì thế; gần ga không phải nguyên nhân khiến xa trường.", "そして|そして thêm ý cùng chiều, không làm rõ sự đối lập mà câu nhấn mạnh.", "それでは|それでは là vậy thì, thường chuyển sang kết luận hoặc hành động.", evidence=[2,4]),
 Q("毎朝、バス（　）学校へ行きます。", "Mỗi sáng tôi đi học bằng xe buýt.", "grammar:手段で", "で|で đánh dấu phương tiện: バスで đi bằng xe buýt.", "に|に dùng trong バスに乗る; động từ ở đây là 行く.", "を|を không diễn tả phương tiện di chuyển.", "へ|へ chỉ hướng đến, xe buýt không phải đích đến trong câu.", evidence=[5]),
 ]),
"reading": [
 P("email", "ケンさんへ", [
 S("今日のテニスは|Buổi quần vợt hôm nay", "できません。|không thể tổ chức."),
 S("朝から|Từ sáng", "雨が降っています。|trời đã mưa."),
 S("あしたの午後は|Chiều mai", "どうですか。|bạn thấy thế nào?"),
 S("二時に|Lúc hai giờ", "学校の前で待っています。|mình sẽ đợi trước trường."),
 ], [
 Q("どうして今日テニスができませんか。", "Vì sao hôm nay không chơi quần vợt được?", "reading:reason", "雨が降っているから|Câu 2 cho biết trời mưa từ sáng, giải thích việc không chơi hôm nay.", "学校が休みだから|Đoạn không nói trường nghỉ là lý do.", "ケンさんが病気だから|Không có thông tin Ken bị bệnh.", "午後は仕事があるから|Không có thông tin về công việc buổi chiều.", evidence=[1,2]),
 Q("あした、どこで会いますか。", "Ngày mai sẽ gặp nhau ở đâu?", "reading:detail", "学校の前|Câu cuối nói đợi trước trường lúc hai giờ.", "駅の前|Đoạn không hẹn trước ga.", "公園の中|Không có lời hẹn trong công viên.", "うちの前|Không hẹn trước nhà mà trước trường.", evidence=[4]),
 ]),
 P("prose", "おべんとう", [
 S("わたしは毎朝、家で|Mỗi sáng ở nhà", "おべんとうを作ります。|tôi làm cơm hộp."),
 S("前は会社の食堂で|Trước đây tôi", "昼ごはんを食べていました。|ăn trưa ở nhà ăn công ty."),
 S("でも、食堂のごはんは|Nhưng cơm ở nhà ăn", "高いです。|đắt."),
 S("おべんとうは|Cơm hộp", "安くて、おいしいです。|rẻ và ngon."),
 S("昼休みに|Vào giờ nghỉ trưa", "友だちと食べます。|tôi ăn cùng bạn."),
 ], [
 Q("今、わたしはどこで作った昼ごはんを食べていますか。", "Hiện nay người viết ăn bữa trưa được làm ở đâu?", "reading:detail", "自分のうち|Người viết tự làm cơm hộp mỗi sáng, thay vì ăn ở nhà ăn như trước.", "会社の食堂|Đây là nơi ăn trước đây, không phải bữa trưa hiện nay.", "友だちのうち|Bạn chỉ cùng ăn, không có thông tin bạn làm cơm.", "駅の店|Không có thông tin mua bữa trưa ở cửa hàng gần ga.", evidence=[1,2,4]),
 Q("どうしておべんとうを作りますか。", "Vì sao người viết làm cơm hộp?", "reading:reason", "食堂のごはんは高いから|Người viết nêu cơm nhà ăn đắt, còn cơm hộp rẻ và ngon.", "食堂がないから|Công ty có nhà ăn; người viết từng ăn ở đó.", "友だちが作れないから|Không có thông tin khả năng nấu của bạn.", "昼休みがないから|Đoạn cuối có nói rõ giờ nghỉ trưa.", evidence=[3,4]),
 ]),
 P("notice", "プールのお知らせ", [
 S("このプールは|Bể bơi này", "九時から五時までです。|mở từ chín giờ đến năm giờ."),
 S("火曜日は|Thứ Ba", "休みです。|bể bơi nghỉ."),
 S("大人は五百円、|Người lớn trả năm trăm yên,", "子どもは二百円です。|trẻ em trả hai trăm yên."),
 S("食べ物は|Đồ ăn", "持ってこないでください。|xin đừng mang vào."),
 S("水は|Nước uống", "持ってきてもいいです。|có thể mang theo."),
 ], [
 Q("プールが休みなのは何曜日ですか。", "Bể bơi nghỉ thứ mấy?", "reading:detail", "火曜日|Câu 2 nói bể bơi nghỉ thứ Ba.", "月曜日|Thứ Hai không được nêu là ngày nghỉ.", "木曜日|Thứ Năm không được nêu là ngày nghỉ.", "日曜日|Chủ nhật không được nêu là ngày nghỉ.", evidence=[2]),
 Q("プールへ持っていってもいいものは何ですか。", "Có thể mang gì đến bể bơi?", "reading:detail", "水|Câu cuối cho phép mang nước uống.", "パン|Bánh mì là đồ ăn, thuộc loại bị cấm mang vào.", "おべんとう|Cơm hộp là đồ ăn nên không được mang vào.", "おかし|Bánh kẹo cũng là đồ ăn, thông báo không cho mang.", evidence=[4,5]),
 ]),
 P("info", "やさいの店", [
 S("トマトは|Cà chua", "三つで二百円です。|ba quả giá hai trăm yên."),
 S("にんじんは|Cà rốt", "二本で百円です。|hai củ giá một trăm yên."),
 S("じゃがいもは|Khoai tây", "四つで三百円です。|bốn củ giá ba trăm yên."),
 S("今日は|Hôm nay", "玉ねぎはありません。|không có hành tây."),
 ], [
 Q("トマト三つとにんじん二本で、いくらですか。", "Ba quả cà chua và hai củ cà rốt giá bao nhiêu?", "reading:information", "三百円|Cà chua 200 yên và cà rốt 100 yên, tổng là 300 yên.", "百円|100 yên chỉ là giá hai củ cà rốt.", "二百円|200 yên chỉ là giá ba quả cà chua.", "五百円|500 yên không đúng tổng 200 cộng 100.", evidence=[1,2]),
 Q("今日、この店で買えないものは何ですか。", "Hôm nay không mua được món gì tại cửa hàng này?", "reading:information", "玉ねぎ|Câu cuối ghi hôm nay không có hành tây.", "トマト|Cà chua được liệt kê đang bán với giá cụ thể.", "にんじん|Cà rốt được liệt kê đang bán, hai củ 100 yên.", "じゃがいも|Khoai tây có bán, bốn củ 300 yên.", evidence=[4]),
 ]),
]},
]
