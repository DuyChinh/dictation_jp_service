#!/usr/bin/env python3
"""
Build a listening lesson (content/<...>/listening.json) from its audio.

    python3 scripts/lesson/lesson_tool.py audio      content/jlpt/n2/2024-07
    python3 scripts/lesson/lesson_tool.py transcribe content/jlpt/n2/2024-07
    # write content/jlpt/n2/2024-07/source.json (see scripts/lesson/README.md)
    python3 scripts/lesson/lesson_tool.py build      content/jlpt/n2/2024-07
    python3 scripts/lesson/lesson_tool.py verify     content/jlpt/n2/2024-07
    python3 scripts/lesson/lesson_tool.py speakers   content/jlpt/n2/2024-07

Scratch files (ASR words, audio backups, reports) go to backend/.work/<lesson dir>/.
Needs: ffmpeg, numpy, faster-whisper (pip install faster-whisper numpy).
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

import numpy as np

BACKEND = Path(__file__).resolve().parents[2]
WORK_ROOT = BACKEND / ".work"

# ---------------------------------------------------------------- helpers


def lesson_dir(arg: str) -> Path:
    d = Path(arg).resolve()
    if not d.is_dir():
        sys.exit(f"not a directory: {d}")
    return d


def work_dir(d: Path) -> Path:
    try:
        rel = d.relative_to(BACKEND / "content")
    except ValueError:
        rel = Path(d.name)
    w = WORK_ROOT / rel
    w.mkdir(parents=True, exist_ok=True)
    return w


def audio_path(d: Path) -> Path:
    p = d / "listening.mp3"
    if not p.exists():
        sys.exit(f"missing audio: {p}")
    return p


def duration_ms(p: Path) -> int:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True,
    ).stdout
    return int(round(float(out) * 1000))


def decode_mono(p: Path, sr: int = 16000) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


PUNCT = re.compile(r"[\s、。，．,.!?！？「」『』（）()\[\]【】・…ー〜~\-―:：;；\"'“”‘’]")


def norm(s: str) -> str:
    """Comparable form: NFKC, no punctuation, katakana folded to hiragana."""
    s = PUNCT.sub("", unicodedata.normalize("NFKC", s))
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def clock(sec: float) -> str:
    m, s = divmod(max(0.0, sec), 60)
    return f"{int(m):02d}:{s:04.1f}"


# ---------------------------------------------------------------- audio


def is_vbr(p: Path) -> bool:
    head = p.read_bytes()[:8192]
    return b"Xing" in head or b"VBRI" in head


def cmd_audio(args) -> None:
    """Browsers seek VBR mp3 inaccurately (sentences start late/early): make it CBR."""
    d = lesson_dir(args.dir)
    src = audio_path(d)
    if not is_vbr(src) and not args.force:
        print(f"{src.name}: already CBR, nothing to do")
        return
    w = work_dir(d)
    backup = w / "listening.original.mp3"
    if not backup.exists():
        shutil.copy2(src, backup)
    tmp = w / "listening.cbr.mp3"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(backup), "-map", "0:a:0", "-codec:a", "libmp3lame",
         "-b:a", args.bitrate, "-ar", "44100", "-write_xing", "0", str(tmp)],
        check=True,
    )
    shutil.move(tmp, src)
    print(f"{src}: re-encoded to CBR {args.bitrate} ({duration_ms(src) / 1000:.1f}s); original kept at {backup}")


# ---------------------------------------------------------------- transcribe


def cmd_transcribe(args) -> None:
    from faster_whisper import WhisperModel

    d = lesson_dir(args.dir)
    w = work_dir(d)
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)
    segs, _ = model.transcribe(
        str(audio_path(d)), language="ja", word_timestamps=True, vad_filter=True,
        beam_size=5, condition_on_previous_text=False,
    )
    out, lines = [], []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text,
                    "words": [{"s": x.start, "e": x.end, "w": x.word, "p": x.probability} for x in s.words]})
        line = f"[{clock(s.start)}] {s.text.strip()}"
        lines.append(line)
        print(line, flush=True)
    (w / "words.json").write_text(json.dumps(out, ensure_ascii=False))
    (w / "transcript.txt").write_text("\n".join(lines) + "\n")
    print(f"wrote {w / 'words.json'} and {w / 'transcript.txt'}")


# ---------------------------------------------------------------- source.json → package skeleton

DEFAULT_SPEAKERS = {
    "narrator": {"ja": "ナレーション", "vi": "Người dẫn", "en": "Narrator"},
    "male": {"ja": "男", "vi": "Nam", "en": "Man"},
    "female": {"ja": "女", "vi": "Nữ", "en": "Woman"},
}
CHOICE_SPK = re.compile(r"^choice_(\d+)$")


def speaker_label(sid: str, custom: dict) -> dict:
    if sid in custom:
        return custom[sid]
    if sid in DEFAULT_SPEAKERS:
        return DEFAULT_SPEAKERS[sid]
    m = CHOICE_SPK.match(sid)
    if m:
        return {"ja": m.group(1), "vi": m.group(1), "en": m.group(1)}
    sys.exit(f"unknown speaker '{sid}': add it to source.json \"speakers\"")


def loc(obj: dict | None, *keys: str) -> dict | None:
    if not obj:
        return None
    out = {k: obj[k] for k in keys if obj.get(k)}
    return out or None


def build_skeleton(src: dict, audio_ms: int) -> tuple[dict, list[dict]]:
    """Package without timings, plus one alignment job per distinct dialogue."""
    base = src["id"]
    custom = src.get("speakers", {})
    used_speakers: list[str] = []
    sections, jobs = [], []

    for sec in src["sections"]:
        sid = f"{base}-m{sec['no']}"
        questions = []
        for qsrc in sec["questions"]:
            qid = f"{sid}-q{qsrc['no']}"
            lines = qsrc["lines"]
            for spk, *_ in lines:
                if spk not in used_speakers:
                    used_speakers.append(spk)
            subs = qsrc.get("sub") or [qsrc]
            multi = "sub" in qsrc
            job = {"qids": [], "lines": lines, "segments": []}
            for k, part in enumerate(subs, start=1):
                pid = f"{qid}-sq{k}" if multi else qid
                segs = [
                    {
                        "id": f"{pid}-s{i}",
                        "order": i,
                        "speaker_id": spk,
                        "start_ms": None,
                        "end_ms": None,
                        "text": {"ja": ja, **({"vi": vi} if vi else {}), **({"en": rest[0]} if rest and rest[0] else {})},
                        "timing_status": "unverified",
                        "dictation_eligible": True,
                    }
                    for i, (spk, ja, vi, *rest) in enumerate(lines, start=1)
                ]
                q = {
                    "id": pid,
                    "order": qsrc["no"] * 100 + k if multi else qsrc["no"],
                    "type": "listening_multiple_choice",
                    "audio": {"start_ms": 0, "end_ms": 1},
                    "prompt": loc(part.get("prompt"), "ja", "vi", "en"),
                    "listening_unit_id": qid,
                    "prompt_visibility": "after_submit",
                    "segments": segs,
                    "dictation": {
                        "enabled": True,
                        "modes": {
                            # one copy of a shared dialogue in dictation is enough
                            "sentence_dictation": {"enabled": k == 1},
                            "full_question_dictation": {"enabled": k == 1},
                        },
                    },
                }
                choices = build_choices(part, lines, pid, qid)
                if choices:
                    q["choices"] = choices
                    q["choice_display_mode"] = part.get("mode") or (
                        "text" if part.get("choices") else "numbers")
                image = part.get("image") or qsrc.get("image")
                if image:
                    q["image"] = {"url": image["url"], **({"alt": loc(image.get("alt"), "ja", "vi", "en")}
                                                        if image.get("alt") else {})}
                if part.get("review_note"):
                    q["review_note"] = part["review_note"]
                questions.append(q)
                job["qids"].append(pid)
                job["segments"].append(segs)
            jobs.append(job)
        sections.append({
            "id": sid,
            "order": sec["no"],
            "title": {"ja": f"問題{sec['no']}", "vi": f"Vấn đề {sec['no']}", "en": f"Part {sec['no']}"},
            "questions": questions,
        })

    s = src["source"]
    pkg = {
        "schema_version": 2,
        "id": base,
        "status": src.get("status", "published"),
        "content_version": src.get("content_version", 1),
        "title": src.get("title") or {
            "ja": f"JLPT {s['level']} {s['year']}年{s['month']}月 聴解",
            "vi": f"JLPT {s['level']} {s['month']}/{s['year']} Nghe hiểu",
            "en": f"JLPT {s['level']} {s['month']:02d}/{s['year']} Listening",
        },
        "source": s,
        "audio": {"file": "listening.mp3", "duration_ms": audio_ms},
        "speakers": [{"id": sp, "label": speaker_label(sp, custom)} for sp in used_speakers],
        "sections": sections,
    }
    if src.get("review_note"):
        pkg["review_required"] = True
        pkg["review_note"] = src["review_note"]
    return pkg, jobs


def build_choices(part: dict, lines: list, pid: str, qid: str) -> list[dict] | None:
    """Printed choices come from part["choices"]; spoken ones from the choice_N lines."""
    answer = part.get("answer")
    if answer is None:
        return None  # no answer key yet: dictation-only until someone fills it in
    raw = part.get("choices")
    if raw is None:
        raw = [{"id": CHOICE_SPK.match(spk).group(1), "ja": ja, "vi": vi, **({"en": r[0]} if r else {})}
               for spk, ja, vi, *r in lines if CHOICE_SPK.match(spk)]
    if not raw:
        return None
    why = part.get("why", {})
    evidence = [f"{pid}-s{n}" for n in part.get("evidence", [])]
    out = []
    for c in raw:
        cid = str(c["id"])
        item = {
            "id": cid,
            "text": loc(c, "ja", "vi", "en") or {"ja": cid},
            "correct": cid == str(answer),
        }
        if c.get("image"):
            item["image"] = c["image"]
        expl = why.get(cid)
        if isinstance(expl, str):
            expl = {"vi": expl}
        if expl:
            item["explanation"] = expl
        if item["correct"] and evidence:
            item["evidence_segment_ids"] = evidence
        out.append(item)
    if not any(c["correct"] for c in out):
        sys.exit(f"{qid}: answer {answer!r} is not one of the choice ids")
    return out


# ---------------------------------------------------------------- alignment (ASR words ↔ script)


class Asr:
    def __init__(self, words_json: Path):
        chars, st, en, widx, self.words = [], [], [], [], []
        for seg in json.loads(words_json.read_text()):
            for w in seg["words"]:
                t = norm(w["w"])
                if not t:
                    continue
                wi = len(self.words)
                self.words.append(w)
                n = len(t)
                for k, c in enumerate(t):
                    chars.append(ord(c))
                    st.append(w["s"] + (w["e"] - w["s"]) * k / n)
                    en.append(w["s"] + (w["e"] - w["s"]) * (k + 1) / n)
                    widx.append(wi)
        self.A = np.array(chars, dtype=np.int64)
        self.start = np.array(st)
        self.end = np.array(en)
        self.word_of = widx

    def semiglobal(self, S: np.ndarray, a0: int, a1: int):
        """Edit-distance alignment of the whole script S inside A[a0:a1] (free ASR prefix/suffix)."""
        T = self.A[a0:a1]
        n, m = len(S), len(T)
        D = np.zeros((n + 1, m + 1), dtype=np.int32)
        P = np.zeros((n + 1, m + 1), dtype=np.int8)  # 1 diag, 2 script gap, 3 asr gap
        D[1:, 0] = np.arange(1, n + 1)
        P[1:, 0] = 2
        idx = np.arange(m + 1)
        for i in range(1, n + 1):
            sub = np.where(T == S[i - 1], 0, 1).astype(np.int32)
            diag = D[i - 1, :-1] + sub
            up = D[i - 1, 1:] + 1
            E = np.empty(m + 1, dtype=np.int32)
            E[0] = D[i, 0]
            E[1:] = np.minimum(diag, up)
            ptr = np.empty(m + 1, dtype=np.int8)
            ptr[0] = 2
            ptr[1:] = np.where(diag <= up, 1, 2)
            acc = np.minimum.accumulate(E - idx) + idx
            ptr[acc < E] = 3
            D[i] = acc
            P[i] = ptr
        j = int(np.argmin(D[n]))
        cost = int(D[n, j])
        amap, match = [-1] * n, [False] * n
        i = n
        while i > 0:
            p = P[i, j]
            if p == 1:
                amap[i - 1] = a0 + j - 1
                match[i - 1] = bool(T[j - 1] == S[i - 1])
                i, j = i - 1, j - 1
            elif p == 2:
                i -= 1
            else:
                j -= 1
        return amap, match, cost


def align_jobs(asr: Asr, jobs: list[dict]) -> list[list[list[float]]]:
    """Per job: [start, end, confidence] per line, walking through the audio in order."""
    cursor = 0.0
    results = []
    for job in jobs:
        S_list, owner = [], []
        for li, (_, ja, *_) in enumerate(job["lines"]):
            t = norm(ja)
            S_list.extend(ord(c) for c in t)
            owner.extend([li] * len(t))
        S = np.array(S_list, dtype=np.int64)
        a0 = int(np.searchsorted(asr.start, cursor - 1.0))
        # section intros and examples can sit between two questions: keep the window generous
        span = max(300.0, len(S) * 0.35 + 150)
        a1 = int(np.searchsorted(asr.start, cursor + span))
        amap, match, cost = asr.semiglobal(S, a0, a1)
        out = []
        for li in range(len(job["lines"])):
            pos = [k for k in range(len(S)) if owner[k] == li]
            mt = [amap[k] for k in pos if amap[k] >= 0 and match[k]]
            conf = len(mt) / max(1, len(pos))
            if mt:
                # drop edge chars whose timestamps jump away from the rest (ASR timing glitches)
                while len(mt) > 2 and asr.start[mt[-1]] - asr.end[mt[-2]] > 2.5:
                    mt.pop()
                while len(mt) > 2 and asr.start[mt[1]] - asr.end[mt[0]] > 2.5:
                    mt.pop(0)
                out.append([asr.words[asr.word_of[mt[0]]]["s"], asr.words[asr.word_of[mt[-1]]]["e"], conf])
            else:
                out.append([None, None, conf])
        for li, o in enumerate(out):  # lines ASR missed: squeeze between neighbours
            if o[0] is None:
                prev_e = next((out[k][1] for k in range(li - 1, -1, -1) if out[k][1] is not None), cursor)
                nxt_s = next((out[k][0] for k in range(li + 1, len(out)) if out[k][0] is not None), prev_e + 2)
                o[0], o[1] = prev_e + 0.1, max(prev_e + 0.5, nxt_s - 0.1)
        cursor = max(o[1] for o in out)
        low = [(li + 1, round(o[2], 2)) for li, o in enumerate(out) if o[2] < 0.6]
        print(f"  {job['qids'][0]}: {clock(out[0][0])}–{clock(cursor)}  cost {cost}/{len(S)}"
              + (f"  LOW lines {low}" if low else ""), flush=True)
        results.append(out)
    return results


# ---------------------------------------------------------------- snapping to real pauses


class Energy:
    def __init__(self, p: Path):
        x = decode_mono(p)
        hop = 160  # 10 ms
        nf = len(x) // hop
        rms = np.sqrt((x[: nf * hop].reshape(nf, hop) ** 2).mean(axis=1) + 1e-12)
        db = np.convolve(20 * np.log10(rms), np.ones(3) / 3, mode="same")
        floor, loud = np.percentile(db, 10), np.percentile(db, 90)
        # between the noise floor and speech level; clean studio audio ends up near -45 dB
        self.thr = float(np.clip(floor + 0.3 * (loud - floor), -55, -30))
        self.voiced = db > self.thr
        self.nf = nf
        gaps, k = [], 0
        while k < nf:
            if not self.voiced[k]:
                j = k
                while j < nf and not self.voiced[j]:
                    j += 1
                if j - k >= 15:  # ≥150 ms pause
                    gaps.append((k / 100, j / 100))
                k = j
            else:
                k += 1
        self.gaps = gaps

    def f(self, t: float) -> int:
        return min(self.nf - 1, max(0, int(round(t * 100))))

    def snap_start(self, st: float, limit: float) -> float:
        a = self.f(st)
        k = a
        if self.voiced[a]:
            while k > 0 and self.voiced[k - 1] and a - k < 40:
                k -= 1
            return k / 100
        while k < self.f(limit) and not self.voiced[k] and k - a < 100:
            k += 1
        return k / 100 if k < self.f(limit) else st

    def snap_end(self, en: float, limit: float) -> float:
        b = self.f(en)
        k = b
        if self.voiced[b]:
            while k < self.nf - 1 and self.voiced[k + 1] and k - b < 60:
                k += 1
            return (k + 1) / 100
        while k > self.f(limit) and not self.voiced[k - 1] and b - k < 150:
            k -= 1
        return k / 100 if k > self.f(limit) else en

    def boundary(self, prev_start: float, e: float, s: float, next_end: float) -> tuple[float, float]:
        """The real pause nearest to the ASR boundary between two consecutive lines."""
        guess = (e + s) / 2
        lo, hi = min(e, s) - 1.2, max(e, s) + 1.0
        best = None
        for g0, g1 in self.gaps:
            if g1 < lo or g0 > hi or g0 < prev_start + 0.2 or g1 > next_end - 0.2:
                continue
            score = abs((g0 + g1) / 2 - guess) - 0.4 * min(g1 - g0, 1.5)
            if best is None or score < best[0]:
                best = (score, g0, g1)
        return (best[1], best[2]) if best else (guess, guess)


NUM_WORD = re.compile(r"^[\s0-9０-９一二三四、。.]+$|^(いち|に|さん|よん)$")
PAD_START, PAD_END = 0.15, 0.25
LONG_PAUSE = 1.5  # seconds between ASR words; longer than any pause inside a turn


def finalize(pkg: dict, jobs: list[dict], aligned: list, asr: Asr, en: Energy, manual: dict) -> None:
    words = asr.words

    def skip_choice_number(start: float, asr_start: float) -> float:
        """Spoken choices start with 「1、」: keep the number out of the sentence."""
        nums = [w for w in words if w["e"] > start and w["s"] < asr_start - 0.05
                and w["e"] <= asr_start + 0.05 and NUM_WORD.match(w["w"].strip())]
        if not nums:
            return start
        after = nums[-1]["e"]
        g = [g1 for g0, g1 in en.gaps if after - 0.3 <= g0 and g1 <= asr_start + 0.3]
        return g[0] if g else max(start, asr_start - 0.05)

    qmap = {q["id"]: q for s in pkg["sections"] for q in s["questions"]}
    for job, al in zip(jobs, aligned):
        spans = [[a, b] for a, b, _ in al]
        spans[0][0] = en.snap_start(spans[0][0], spans[0][1])
        spans[-1][1] = en.snap_end(spans[-1][1], spans[-1][0])
        for i in range(1, len(spans)):
            asr_start = spans[i][0]
            if spans[i][0] - spans[i - 1][1] > LONG_PAUSE:
                # a real pause (often with a chime in it): end each line at its own speech edge
                spans[i - 1][1] = en.snap_end(spans[i - 1][1], spans[i - 1][0])
                spans[i][0] = en.snap_start(spans[i][0], spans[i][1])
            else:
                spans[i - 1][1], spans[i][0] = en.boundary(spans[i - 1][0], spans[i - 1][1], spans[i][0], spans[i][1])
            if CHOICE_SPK.match(job["lines"][i][0]):
                spans[i][0] = skip_choice_number(spans[i][0], asr_start)
        for i, sp in enumerate(spans):  # padding, never into a neighbour
            lo = spans[i - 1][1] if i > 0 else sp[0] - 1.0
            hi = spans[i + 1][0] if i + 1 < len(spans) else sp[1] + 1.0
            s0 = max(sp[0] - PAD_START, (lo + sp[0]) / 2) if lo < sp[0] else sp[0]
            s1 = min(sp[1] + PAD_END, (sp[1] + hi) / 2) if hi > sp[1] else sp[1]
            sp[2:] = [s0, s1]
        for i in range(1, len(spans)):  # hand-set boundaries: "<qid>-s<n>": seconds
            key = f"{job['qids'][0]}-s{i + 1}"
            if key in manual:
                spans[i - 1][3] = spans[i][2] = float(manual[key])
        first = spans[0][2]
        cue = [w for w in words if first - 5.0 <= w["s"] < first and "番" in w["w"]]
        q_start = min(first, cue[-1]["s"] - PAD_START) if cue else first
        for qid, segs in zip(job["qids"], job["segments"]):
            for seg, sp in zip(segs, spans):
                seg["start_ms"] = int(round(sp[2] * 1000))
                seg["end_ms"] = int(round(sp[3] * 1000))
                seg["timing_status"] = "verified"
            qmap[qid]["audio"] = {"start_ms": int(round(max(0.0, q_start) * 1000)),
                                  "end_ms": int(round(spans[-1][3] * 1000))}
        for a, b in zip(job["segments"][0], job["segments"][0][1:]):
            assert a["start_ms"] < a["end_ms"] <= b["start_ms"], (job["qids"][0], a["id"])


def cmd_build(args) -> None:
    d = lesson_dir(args.dir)
    w = work_dir(d)
    src = json.loads((d / "source.json").read_text())
    words = w / "words.json"
    if not words.exists():
        sys.exit(f"missing {words}: run `transcribe` first")
    audio = audio_path(d)
    if is_vbr(audio):
        print("WARNING: audio is VBR, run `audio` first or seeking will drift", file=sys.stderr)
    pkg, jobs = build_skeleton(src, duration_ms(audio))
    print(f"aligning {len(jobs)} dialogues…")
    asr = Asr(words)
    aligned = align_jobs(asr, jobs)
    en = Energy(audio)
    print(f"silence threshold {en.thr:.1f} dB")
    finalize(pkg, jobs, aligned, asr, en, src.get("manual_boundaries", {}))
    (w / "aligned.json").write_text(json.dumps(aligned))
    out = d / "listening.json"
    out.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")
    n_seg = sum(len(q["segments"]) for s in pkg["sections"] for q in s["questions"]
                if q["dictation"]["modes"]["sentence_dictation"]["enabled"])
    no_mc = [q["id"] for s in pkg["sections"] for q in s["questions"] if not q.get("choices")]
    print(f"wrote {out}: {sum(len(s['questions']) for s in pkg['sections'])} questions, {n_seg} sentences")
    if no_mc:
        print(f"  no answer key yet (dictation only): {', '.join(no_mc)}")


# ---------------------------------------------------------------- verify


def cmd_verify(args) -> None:
    """Re-transcribe every sentence clip on its own and compare with the script."""
    from difflib import SequenceMatcher
    from faster_whisper import WhisperModel

    d = lesson_dir(args.dir)
    w = work_dir(d)
    pkg = json.loads((d / "listening.json").read_text())
    x = decode_mono(audio_path(d))
    model = WhisperModel(args.model, device="cpu", compute_type="int8", cpu_threads=args.threads)
    rows, seen = [], set()
    for sec in pkg["sections"]:
        for q in sec["questions"]:
            for s in q["segments"]:
                key = (s["start_ms"], s["text"]["ja"])
                if key in seen:
                    continue
                seen.add(key)
                clip = x[s["start_ms"] * 16: s["end_ms"] * 16]
                segs, _ = model.transcribe(clip, language="ja", beam_size=5,
                                           condition_on_previous_text=False, vad_filter=False)
                hyp = "".join(t.text for t in segs)
                r = SequenceMatcher(None, norm(s["text"]["ja"]), norm(hyp)).ratio()
                rows.append({"id": s["id"], "start_ms": s["start_ms"], "end_ms": s["end_ms"],
                             "ref": s["text"]["ja"], "hyp": hyp, "ratio": round(r, 3)})
                flag = "  <-- check" if r < args.threshold else ""
                print(f"{r:.2f} {clock(s['start_ms'] / 1000)} {s['id']} | {s['text']['ja'][:28]} | {hyp[:36]}{flag}",
                      flush=True)
    (w / "verify.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    bad = [r for r in rows if r["ratio"] < args.threshold]
    print(f"\n{len(rows)} sentences, {len(bad)} below {args.threshold} (details in {w / 'verify.json'})")


# ---------------------------------------------------------------- speakers (pitch check)


def median_f0(clip: np.ndarray, sr: int = 16000) -> float | None:
    """Median pitch of the voiced 40 ms frames (autocorrelation, 70–400 Hz)."""
    win, hop = 640, 320
    lo, hi = sr // 400, sr // 70
    f0s = []
    for i in range(0, len(clip) - win, hop):
        fr = clip[i:i + win] - clip[i:i + win].mean()
        if np.sqrt((fr ** 2).mean()) < 0.01:
            continue
        ac = np.correlate(fr, fr, mode="full")[win - 1:]
        if ac[0] <= 0:
            continue
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] / ac[0] > 0.45:
            f0s.append(sr / lag)
    return float(np.median(f0s)) if len(f0s) >= 5 else None


def cmd_speakers(args) -> None:
    """Pitch of every line next to its speaker label; flags male/female labels that look swapped."""
    d = lesson_dir(args.dir)
    pkg = json.loads((d / "listening.json").read_text())
    x = decode_mono(audio_path(d))
    seen = set()
    flagged = 0
    for sec in pkg["sections"]:
        for q in sec["questions"]:
            if q["segments"][0]["start_ms"] in seen:
                continue
            seen.add(q["segments"][0]["start_ms"])
            print(q["id"])
            for i, s in enumerate(q["segments"], start=1):
                f0 = median_f0(x[s["start_ms"] * 16: s["end_ms"] * 16])
                spk = s["speaker_id"]
                odd = f0 is not None and ((spk == "male" and f0 > args.split + 15)
                                          or (spk == "female" and f0 < args.split - 15))
                flagged += odd
                shown = f"{f0:5.0f} Hz" if f0 else "   ?    "
                print(f"  {i:2d} {shown}  {spk:10s} {s['text']['ja'][:34]}{'   <-- check' if odd else ''}")
    print(f"\n{flagged} line(s) whose pitch disagrees with the label (split at {args.split} Hz)")


# ---------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("audio", help="re-encode listening.mp3 to CBR")
    p.add_argument("dir")
    p.add_argument("--bitrate", default="96k")
    p.add_argument("--force", action="store_true")
    p.set_defaults(fn=cmd_audio)
    p = sub.add_parser("transcribe", help="ASR with word timestamps → .work/<dir>/words.json, transcript.txt")
    p.add_argument("dir")
    p.add_argument("--model", default="medium")
    p.add_argument("--threads", type=int, default=8)
    p.set_defaults(fn=cmd_transcribe)
    p = sub.add_parser("build", help="source.json + words.json → listening.json with timings")
    p.add_argument("dir")
    p.set_defaults(fn=cmd_build)
    p = sub.add_parser("verify", help="re-ASR each sentence and flag mismatches")
    p.add_argument("dir")
    p.add_argument("--model", default="small")
    p.add_argument("--threads", type=int, default=8)
    p.add_argument("--threshold", type=float, default=0.75)
    p.set_defaults(fn=cmd_verify)
    p = sub.add_parser("speakers", help="pitch per line to catch swapped male/female labels")
    p.add_argument("dir")
    p.add_argument("--split", type=float, default=185.0)
    p.set_defaults(fn=cmd_speakers)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
