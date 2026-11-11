#!/usr/bin/env python3
"""Build the ten original, condensed December 2026 written practice papers.

Run from any directory: python3 backend/scripts/lesson/build_prediction_papers.py
The readable authoring sources live in prediction_papers/n1.py through n5.py.
Never reads or rewrites audio/listening/source files.
"""
import copy
import json
import random
from pathlib import Path
import runpy
import sys

BACKEND = Path(__file__).resolve().parents[2]
AUTHORED = Path(__file__).parent / "prediction_papers"
HANVIET = json.loads((AUTHORED / "hanviet.json").read_text())
sys.path.insert(0, str(AUTHORED))

GROUPS = {
    "N1": {"vocab": [1, 2, 3, 4], "grammar": [5, 6, 7], "reading": [8, 9, 11, 13]},
    "N2": {"vocab": [1, 2, 4, 5], "grammar": [7, 8, 9], "reading": [10, 11, 12, 14]},
    "N3": {"vocab": [1, 3, 4, 5], "grammar": [7, 8, 9], "reading": [10, 11, 13, 14]},
    "N4": {"vocab": [1, 3, 4, 5], "grammar": [6, 7, 8], "reading": [9, 10, 10, 11]},
    "N5": {"vocab": [1, 2, 3, 4], "grammar": [5, 6, 7], "reading": [8, 9, 9, 10]},
}


def build(level, test, directory):
    lesson_id = f"jlpt-{level.lower()}-{directory}"
    paper = {"schema_version": 1, "id": f"{lesson_id}-paper", "lesson_id": lesson_id,
             "status": "published", "content_version": 1,
             "source": {"level": level, "year": 2026, "month": 12}, "items": [], "passages": []}
    groups = GROUPS[level]
    positions = []
    rng = random.Random(lesson_id)
    for size in [16, 16, 8]:
        block = list(range(4)) * (size // 4)
        rng.shuffle(block)
        positions.extend(block)

    def item(row, part, mondai, kind="mcq", passage_id=None):
        no = len(paper["items"]) + 1
        # Balanced within each part, without a guessable repeating answer pattern.
        position = positions[no - 1]
        choices = copy.deepcopy(row["choices"])
        correct = choices.pop(0)
        choices.insert(position, correct)
        for i, choice in enumerate(choices):
            choice.update(id=str(i + 1), correct=i == position)
        result = {"id": f"{lesson_id}-{part[0]}-q{no}", "no": no, "part": part,
                  "mondai": mondai, "type": kind, "stem": {"ja": row["ja"], "vi": row["vi"]},
                  "choices": choices, "summary_vi": correct["explanation_vi"],
                  "point_tags": [row["point"]], "vocab": row["vocab"], "evidence_sentence_ids": []}
        if row.get("target"):
            assert row["target"] in row["ja"], row
            result["stem"]["target"] = row["target"]
        if passage_id:
            result["passage_id"] = passage_id
            result["evidence_sentence_ids"] = [f"{passage_id}-s{i}" for i in row["evidence"]]
        paper["items"].append(result)
        return result

    def passage(source, part, index, mondai):
        pid = f"{lesson_id}-{part}-p{index}"
        sentences = []
        evidence_map = {}
        # Split authored meaning units at sentence boundaries and remap question evidence.
        for old_no, original in enumerate(source["sentences"], 1):
            groups = [[]]
            for chunk in original["chunks"]:
                groups[-1].append(copy.deepcopy(chunk))
                if chunk["ja"].endswith("。"):
                    groups.append([])
            groups = [group for group in groups if group]
            evidence_map[old_no] = []
            for j, group in enumerate(groups):
                sentence = copy.deepcopy(original)
                sentence.update(ja="".join(c["ja"] for c in group), vi=" ".join(c["vi"] for c in group), chunks=group)
                if j:
                    sentence.pop("notes", None)
                evidence_map[old_no].append(len(sentences) + 1)
                sentences.append(sentence)
        source["evidence_map"] = evidence_map
        for i, sentence in enumerate(sentences, 1):
            sentence["id"] = f"{pid}-s{i}"
        result = {"id": pid, "mondai": mondai, "kind": source["kind"],
                  "title_ja": source["title"], "sentences": sentences,
                  "full_translation_vi": "\n".join(s["vi"] for s in sentences)}
        paper["passages"].append(result)
        return pid

    assert [len(g) for g in test["vocab"]] == [4] * 4
    for group, mondai in zip(test["vocab"], groups["vocab"]):
        for row in group:
            item(row, "vocab", mondai)
    assert len(test["grammar"]) == 8
    for row in test["grammar"]:
        item(row, "grammar", groups["grammar"][0])
    assert len(test["sort"]) == 4
    for row in test["sort"]:
        slots = row["slots"]
        completed = row["before"] + "".join(slots) + row["after"]
        correct = slots[row["star"]]
        options = [{"text": correct, "explanation_vi": f"Thứ tự đúng: {completed} ★ ở vị trí {row['star'] + 1}, nên chọn {correct}."}]
        for i, fragment in enumerate(slots):
            if fragment != correct:
                options.append({"text": fragment, "explanation_vi": f"Mảnh {fragment} ở vị trí {i + 1}, không phải vị trí ★ ({row['star'] + 1}). Câu đúng: {completed}"})
        q = {"ja": row["before"] + " ".join("★" if i == row["star"] else "＿＿" for i in range(4)) + row["after"],
             "vi": row["vi"], "point": "grammar:sentence_order", "choices": options, "vocab": [], "evidence": []}
        result = item(q, "grammar", groups["grammar"][1], "sort_star")
        result["sort"] = {"slots": slots, "star_index": row["star"]}
    cloze = test["cloze"]
    assert len(cloze["questions"]) == 4
    pid = passage(cloze, "g", 1, groups["grammar"][2])
    for i, row in enumerate(cloze["questions"], 29):
        row = copy.deepcopy(row)
        row["ja"] = row["ja"].replace("（　）", f"（{i}）")
        # Blank numbers in the shared passage match the stable question numbers.
        for sentence in paper["passages"][-1]["sentences"]:
            if sentence.get("ja_blank") == cloze["questions"][i - 29]["ja"]:
                sentence["ja_blank"] = row["ja"]
        row["evidence"] = [new for old in row["evidence"] for new in cloze["evidence_map"][old]]
        item(row, "grammar", groups["grammar"][2], "cloze_blank", pid)
    assert len(test["reading"]) == 4
    for index, (source, mondai) in enumerate(zip(test["reading"], groups["reading"]), 1):
        assert len(source["questions"]) == 2
        pid = passage(source, "r", index, mondai)
        for row in source["questions"]:
            row = copy.deepcopy(row)
            row["evidence"] = [new for old in row["evidence"] for new in source["evidence_map"][old]]
            item(row, "reading", mondai, passage_id=pid)
    assert len(paper["items"]) == 40
    for question in paper["items"]:
        for note in question["vocab"]:
            word = note["word"]
            if "sino_vi" not in note:
                note["sino_vi"] = HANVIET[word]
    target = BACKEND / "content" / "jlpt" / level.lower() / directory / "paper.json"
    if target.exists():
        existing = json.loads(target.read_text())
        if existing.get("id") != paper["id"]:
            raise ValueError(f"Refusing to replace unrelated content: {target}")
    target.write_text(json.dumps(paper, ensure_ascii=False, indent=2) + "\n")
    return {"id": lesson_id, "file": str(target.relative_to(BACKEND / "content")),
            "status": paper["status"], "vocab": 16, "grammar": 16, "reading": 8,
            "passages": len(paper["passages"]), "sentences": sum(len(p["sentences"]) for p in paper["passages"])}


def main():
    results = []
    for level in GROUPS:
        tests = runpy.run_path(str(AUTHORED / f"{level.lower()}.py"))["TESTS"]
        assert len(tests) == 2
        first = 2 if level in ("N2", "N3") else 1
        for i, test in enumerate(tests):
            results.append(build(level, test, f"practice-{first + i:02}"))
    manifest = {"target": "2026-12", "scope": "vocab/grammar/reading", "authorship": "Original condensed practice material; not official JLPT questions or a forecast of actual questions.",
                "total_questions": sum(r["vocab"] + r["grammar"] + r["reading"] for r in results), "lessons": results}
    path = BACKEND / "content/predictions-2026-12/written-manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
