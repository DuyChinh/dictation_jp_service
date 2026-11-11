"""Small authoring helpers; choices are supplied correct-first, then rotated on export."""

# Authored alternatives for the translation drill. Keys are exact Japanese meaning units.
ALIASES = {
    "学校がありません。": ["không có buổi học", "không phải đi học"],
    "公園へ行きました。": ["đã đến công viên", "đã đi ra công viên"],
    "友だちとテニスをしました。": ["chơi tennis với bạn", "đánh quần vợt cùng bạn"],
    "パンを食べました。": ["ăn bánh mì", "đã ăn bánh mì"],
    "公園へ行きたいです。": ["muốn đi công viên", "muốn đến công viên"],
    "駅の近くにあります。": ["nằm gần nhà ga", "ở gần ga tàu"],
    "広いです。": ["rộng hơn", "rộng rãi hơn"],
    "学校までは遠いです。": ["đến trường khá xa", "trường học thì xa"],
    "バスで学校へ行きます。": ["đến trường bằng xe buýt", "đi học bằng xe bus"],
    "駅の前で会いましょう。": ["gặp nhau ở trước nhà ga", "hẹn gặp trước ga"],
    "歩いて行けます。": ["đi bộ đến được", "có thể đi bộ tới"],
    "休みです。": ["nghỉ", "đóng cửa"],
    "持ってきてもいいです。": ["được phép mang theo", "có thể mang đến"],
    "持ってこないでください。": ["không được mang vào", "đừng đem theo"],
    "あまり上手ではありません。": ["không giỏi lắm", "chưa giỏi lắm"],
    "ゆっくり説明してくれます。": ["giảng chậm cho tôi", "giải thích chậm cho mình"],
    "家族に食べてもらいました。": ["nhờ người nhà ăn thử", "nhờ gia đình nếm thử"],
    "なりたいです。": ["muốn giỏi hơn", "mong trở nên giỏi hơn"],
    "自転車で行くようにしています。": ["cố đi bằng xe đạp", "duy trì đi xe đạp"],
    "危ないので、バスを使います。": ["nguy hiểm nên đi xe buýt", "đi xe bus vì nguy hiểm"],
    "体が軽くなった気がします。": ["cảm thấy cơ thể nhẹ nhõm hơn", "thấy người nhẹ nhàng hơn"],
    "少し落ち着くことができた。": ["đã bình tĩnh hơn", "có thể trấn tĩnh hơn"],
    "早めに準備しようと思う。": ["định chuẩn bị sớm", "muốn chuẩn bị trước"],
    "三日で直せるそうだ。": ["nghe nói sửa được trong ba ngày", "thợ nói ba ngày sửa xong"],
    "直してもらうことにした。": ["quyết định nhờ sửa", "đã chọn nhờ sửa chữa"],
    "修理代は新しいかばんよりずっと安かったので、": ["vì tiền sửa rẻ hơn nhiều", "do phí sửa rẻ hơn cặp mới"],
    "終了時刻も決めることにした。": ["quyết định cả giờ kết thúc", "ấn định giờ kết thúc"],
    "時間を短くすればよいというわけではなく、": ["không chỉ cần rút ngắn thời gian", "không phải cứ giảm giờ là được"],
    "必要な議論を残すことが重要だ。": ["cần giữ trao đổi cần thiết", "giữ phần thảo luận cần thiết"],
    "相手がすぐ読めるとは限らない。": ["chưa chắc đối phương đọc được ngay", "không chắc người kia đọc ngay"],
    "必要な期限と理由を伝えるべきだ。": ["nên nói rõ thời hạn và lý do", "cần báo hạn cùng lý do"],
    "使う人への配慮を忘れてはならない。": ["không được quên quan tâm người dùng", "cần nghĩ đến người sử dụng"],
    "一人の働きを評価することはできない。": ["không thể đánh giá công sức một người", "không đủ đánh giá đóng góp cá nhân"],
    "数値による評価をすべて放棄すべきだというのではない。": ["không có nghĩa bỏ hết đánh giá bằng số", "không nên bác bỏ toàn bộ số liệu"],
    "その外側にある貢献をどう認めるかが問われている。": ["cần công nhận đóng góp ngoài số liệu", "xét công nhận phần ngoài phạm vi ấy"],
    "喜ばしいことに違いない。": ["chắc chắn đáng mừng", "hẳn là điều vui mừng"],
    "操作方法以前に利用の入り口が失われかねない。": ["có nguy cơ mất cả lối tiếp cận", "có thể mất khả năng tiếp cận"],
    "その前提から外れる人への対応を考えずには済まされない。": ["phải nghĩ đến người ngoài tiền đề đó", "không thể bỏ qua hỗ trợ họ"],
    "必要な人が実際に使えるかどうかによって問われるべきだ。": ["xét người cần có dùng được không", "đánh giá qua khả năng dùng thực tế"],
}

PITFALLS = {
    "学校がありません。": (["có giờ học", "phải đi học"], "ありません phủ định: hôm đó không có giờ học."),
    "持ってこないでください。": (["hãy mang theo", "được phép mang vào"], "ないでください là yêu cầu không làm; đồ ăn không được mang vào."),
    "あまり上手ではありません。": (["rất giỏi", "giỏi lắm"], "あまり đi với phủ định nghĩa là không giỏi lắm, không phải rất giỏi."),
    "家族に食べてもらいました。": (["tôi ăn giúp gia đình", "tôi ăn cho cả nhà"], "家族に食べてもらう: gia đình là người ăn thử, người viết nhận sự hợp tác."),
    "三日で直せるそうだ。": (["trông như sửa được", "nhìn có vẻ sửa được"], "店の人によると nêu nguồn tin; 直せるそうだ là nghe nói sửa được, không phải đoán bằng vẻ ngoài."),
    "時間を短くすればよいというわけではなく、": (["chỉ cần rút ngắn thời gian là được"], "わけではなく bác bỏ cách hiểu chỉ rút ngắn thời gian là đủ."),
    "相手がすぐ読めるとは限らない。": (["chắc chắn đọc được ngay", "nhất định đọc ngay"], "とは限らない phủ định sự chắc chắn: chưa chắc người kia đọc được ngay."),
    "一人の働きを評価することはできない。": (["có thể đánh giá đầy đủ đóng góp"], "できない là không thể; chỉ số xử lý không đủ đánh giá toàn bộ đóng góp."),
    "数値による評価をすべて放棄すべきだというのではない。": (["nên bỏ toàn bộ đánh giá bằng số"], "というのではない bác bỏ kết luận phải bỏ hết đánh giá bằng số."),
    "その前提から外れる人への対応を考えずには済まされない。": (["không cần quan tâm người ngoài tiền đề"], "ずには済まされない nghĩa là không thể bỏ qua trách nhiệm, tức phải nghĩ cách hỗ trợ."),
}


def Q(ja, vi, point, *choices, target=None, vocab=None, evidence=None):
    assert len(choices) == 4
    parsed = []
    for choice in choices:
        text, explanation = choice.split("|", 1)
        parsed.append({"text": text, "explanation_vi": explanation})
    return {"ja": ja, "vi": vi, "point": point, "choices": parsed,
            "target": target, "vocab": vocab or [], "evidence": evidence or []}


def R(ja, vi, word, reading, meaning, *wrong):
    return Q(ja, vi, "kanji:reading",
             f"{reading}|{word} đọc là {reading}, nghĩa là {meaning}. Trong câu: {vi}",
             *wrong, target=word,
             vocab=[{"word": word, "reading": reading, "meaning_vi": meaning}])


def S(*chunks, label=None, blank=None, pitfalls=None):
    pairs = [chunk.split("|", 1) for chunk in chunks]
    units = [{"ja": ja, "vi": vi.split("~")[0], "accept_vi": vi.split("~")[1:]} for ja, vi in pairs]
    authored_pitfalls = []
    for unit in units:
        unit["accept_vi"].extend(ALIASES.get(unit["ja"], []))
        if unit["ja"] in PITFALLS:
            wrong, why = PITFALLS[unit["ja"]]
            authored_pitfalls.append({"wrong_vi": wrong, "explanation_vi": why})
    result = {"ja": "".join(p[0] for p in pairs),
              "vi": " ".join(u["vi"] for u in units),
              "chunks": units, "pitfalls": (pitfalls or []) + authored_pitfalls}
    if label:
        result["notes"] = label
    if blank:
        result["ja_blank"] = blank
    return result


def O(before, slots, after, vi, star=2):
    assert len(slots) == len(set(slots)) == 4
    return {"before": before, "slots": slots, "after": after, "vi": vi, "star": star}


def P(kind, title, sentences, questions):
    return {"kind": kind, "title": title, "sentences": sentences, "questions": questions}
