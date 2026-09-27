#!/usr/bin/env python3
"""
Build a practice listening test whose audio is synthesised from its script.

    python3 scripts/lesson/practice_tts.py content/practice/n2/p01
    python3 scripts/lesson/lesson_tool.py verify content/practice/n2/p01   # re-listen with ASR

Reads <dir>/source.json (same format as a real test, see README.md), speaks every line with
edge-tts, lays the clips out with JLPT pacing (section instructions, 「1番」 cues, reading and
answer pauses) and writes <dir>/listening.mp3 + <dir>/listening.json. The timings come from
the clips themselves, so they are exact — no alignment step.

Clips are cached in backend/.work/<dir>/tts/ keyed by voice + text: editing one line only
re-synthesises that line.
Needs: ffmpeg, numpy, edge-tts (pip install edge-tts numpy), network access for edge-tts.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lesson_tool import CHOICE_SPK, build_skeleton, lesson_dir, work_dir  # noqa: E402

SR = 24000  # edge-tts native rate

# voice key → (edge-tts voice, rate, pitch). Main dialogue pair uses the native voices.
VOICES = {
    "narrator": ("fr-FR-VivienneMultilingualNeural", "-5%", "+0Hz"),
    "female": ("ja-JP-NanamiNeural", "+0%", "+0Hz"),
    "male": ("ja-JP-KeitaNeural", "+0%", "+0Hz"),
    "female2": ("en-US-AvaMultilingualNeural", "+0%", "+0Hz"),
    "male2": ("en-US-AndrewMultilingualNeural", "+0%", "+0Hz"),
    "female3": ("de-DE-SeraphinaMultilingualNeural", "+0%", "+0Hz"),
    "male3": ("de-DE-FlorianMultilingualNeural", "+0%", "+0Hz"),
}

INSTRUCTIONS = {
    1: "問題1では、まず質問を聞いてください。それから話を聞いて、問題用紙の1から4の中から、最もよいものを一つ選んでください。",
    2: "問題2では、まず質問を聞いてください。そのあと、問題用紙のせんたくしを読んでください。読む時間があります。"
       "それから話を聞いて、問題用紙の1から4の中から、最もよいものを一つ選んでください。",
    3: "問題3では、問題用紙に何も印刷されていません。この問題は、全体としてどんな内容かを聞く問題です。"
       "話の前に質問はありません。まず話を聞いてください。それから、質問とせんたくしを聞いて、1から4の中から、最もよいものを一つ選んでください。",
    4: "問題4では、問題用紙に何も印刷されていません。まず文を聞いてください。それから、それに対する返事を聞いて、1から3の中から、最もよいものを一つ選んでください。",
    5: "問題5では、長めの話を聞きます。この問題には練習はありません。メモをとってもかまいません。",
}
M5_SINGLE = "問題用紙に何も印刷されていません。まず話を聞いてください。それから、質問とせんたくしを聞いて、1から4の中から、最もよいものを一つ選んでください。"
M5_MULTI = "まず話を聞いてください。それから、二つの質問を聞いて、それぞれ問題用紙の1から4の中から、最もよいものを一つ選んでください。"
CHOICE_NUM = {1: "いち", 2: "に", 3: "さん", 4: "よん"}

# seconds of silence
P = {
    "after_intro": 2.5,
    "after_cue": 1.0,          # 「1番」 → first line
    "setup_question": 0.8,     # narrator setup → narrator question
    "before_dialogue": 1.5,
    "reading": 15.0,           # 問題2: time to read the printed options
    "turn": 0.45,              # speaker change
    "same_speaker": 0.3,
    "before_question": 1.8,    # end of talk → narrator question
    "before_choices": 1.5,
    "choice_num": 0.35,        # 「いち」 → option text
    "between_choices": 1.6,
    "answer": {1: 10.0, 2: 10.0, 3: 8.0, 4: 6.0, 5: 10.0},
    "after_section": 3.0,
}
PAD_START, PAD_END = 0.12, 0.2  # segment padding, never into a neighbour


def voice_for(spk: str, qsrc: dict, custom: dict) -> str:
    over = qsrc.get("voices", {})
    if spk in over:
        return over[spk]
    if CHOICE_SPK.match(spk):
        return over.get("choice", "narrator")
    if spk in VOICES:
        return spk
    if spk in custom and custom[spk].get("voice"):
        return custom[spk]["voice"]
    if spk == "speaker":
        return "female"
    sys.exit(f"no voice for speaker '{spk}': give it \"voice\" in source.json speakers or a question \"voices\" map")


def tts_text(ja: str, readings: dict) -> str:
    for k, v in readings.items():
        ja = ja.replace(k, v)
    return ja


class Synth:
    def __init__(self, cache: Path):
        self.cache = cache
        cache.mkdir(parents=True, exist_ok=True)
        self.pending: dict[Path, tuple[str, str]] = {}

    def path(self, voice: str, text: str) -> Path:
        v, rate, pitch = VOICES[voice]
        h = hashlib.sha1(f"{v}|{rate}|{pitch}|{text}".encode()).hexdigest()[:16]
        return self.cache / f"{h}.mp3"

    def want(self, voice: str, text: str) -> Path:
        p = self.path(voice, text)
        if not p.exists():
            self.pending[p] = (voice, text)
        return p

    async def _one(self, sem, p: Path, voice: str, text: str) -> None:
        import edge_tts

        v, rate, pitch = VOICES[voice]
        async with sem:
            for attempt in range(4):
                try:
                    tmp = p.with_suffix(".part")
                    await edge_tts.Communicate(text, v, rate=rate, pitch=pitch).save(str(tmp))
                    tmp.rename(p)
                    return
                except Exception as e:  # network hiccups: retry
                    if attempt == 3:
                        raise RuntimeError(f"edge-tts failed for {text!r}: {e}") from e
                    await asyncio.sleep(2 * (attempt + 1))

    def run(self) -> None:
        if not self.pending:
            return
        print(f"synthesising {len(self.pending)} clips…", flush=True)

        async def main():
            sem = asyncio.Semaphore(6)
            await asyncio.gather(*(self._one(sem, p, v, t) for p, (v, t) in self.pending.items()))

        asyncio.run(main())
        self.pending.clear()


def load_clip(p: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    # trim the silence edge-tts leaves around speech (keep 30 ms)
    frame = int(SR * 0.01)
    n = len(x) // frame
    if n == 0:
        return x
    rms = np.sqrt(np.mean(x[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    loud = np.where(20 * np.log10(rms) > 20 * np.log10(rms.max()) - 40)[0]
    if not len(loud):
        return x
    a = max(0, loud[0] * frame - int(SR * 0.03))
    b = min(len(x), (loud[-1] + 1) * frame + int(SR * 0.03))
    return x[a:b]


class Timeline:
    def __init__(self):
        self.chunks: list[np.ndarray] = []
        self.n = 0

    def silence(self, sec: float) -> None:
        k = int(round(sec * SR))
        self.chunks.append(np.zeros(k, dtype=np.float32))
        self.n += k

    def clip(self, x: np.ndarray) -> tuple[float, float]:
        t0 = self.n / SR
        self.chunks.append(x)
        self.n += len(x)
        return t0, self.n / SR

    def audio(self) -> np.ndarray:
        return np.concatenate(self.chunks)


def line_pause(no: int, lines: list, li: int, talk_started: bool) -> float:
    """Silence before line li of a question (JLPT pacing)."""
    spk = lines[li][0]
    if li == 0:
        return P["after_cue"]
    prev = lines[li - 1][0]
    if CHOICE_SPK.match(spk):
        return P["between_choices"] if CHOICE_SPK.match(prev) else P["before_choices"]
    if spk == "narrator":
        if not talk_started:
            return P["setup_question"]
        # closing question; 問題5 質問1 → 質問2 leaves answer time in between
        return P["answer"][5] if prev == "narrator" else P["before_question"]
    if not talk_started:
        return P["reading"] if no == 2 else P["before_dialogue"]
    return P["same_speaker"] if spk == prev else P["turn"]


def plan(src: dict) -> list[dict]:
    """Every sound in playback order: {"voice", "text", "pause"} plus "cue"/"line" markers."""
    custom = src.get("speakers", {})
    readings = src.get("tts_readings", {})
    ev: list[dict] = []

    def say(voice, text, pause, **kw):
        ev.append({"voice": voice, "text": tts_text(text, readings), "pause": pause, **kw})

    for si, sec in enumerate(src["sections"]):
        no = sec["no"]
        say("narrator", f"問題{no}。", P["after_section"] if si else 0.0)
        say("narrator", INSTRUCTIONS[no], 0.8)
        for qi, qsrc in enumerate(sec["questions"]):
            pause = P["after_intro"] if qi == 0 else P["answer"][no]
            if no == 5:
                say("narrator", M5_MULTI if "sub" in qsrc else M5_SINGLE, pause)
                pause = 1.5
            say("narrator", f"{qsrc['no']}番。", pause, cue=qsrc)
            lines = qsrc["lines"]
            talk_started = False
            for li, (spk, ja, *_) in enumerate(lines):
                pause = line_pause(no, lines, li, talk_started)
                voice = voice_for(spk, qsrc, custom)
                m = CHOICE_SPK.match(spk)
                if m:  # 「いち」 is spoken but stays outside the option's segment
                    say(voice, CHOICE_NUM[int(m.group(1))] + "。", pause)
                    pause = P["choice_num"]
                elif spk != "narrator":
                    talk_started = True
                say(voice, ja, pause, line=(qsrc, li))
    return ev


def cmd_synth(args) -> None:
    d = lesson_dir(args.dir)
    w = work_dir(d)
    src = json.loads((d / "source.json").read_text())
    events = plan(src)
    syn = Synth(w / "tts")
    for e in events:
        e["path"] = syn.want(e["voice"], e["text"])
    syn.run()

    tl = Timeline()
    tl.silence(0.5)
    spans: dict[tuple[int, int], tuple[float, float]] = {}  # (id(question), line index) → clip span
    cues: dict[int, float] = {}  # id(question) → start of its 「N番」
    for e in events:
        tl.silence(e["pause"])
        t0, t1 = tl.clip(load_clip(e["path"]))
        if "cue" in e:
            cues[id(e["cue"])] = t0
        if "line" in e:
            qsrc, li = e["line"]
            spans[(id(qsrc), li)] = (t0, t1)
    tl.silence(2.0)
    audio = tl.audio()

    wav = w / "listening.wav"
    pcm = (audio / (float(np.abs(audio).max()) or 1.0) * 0.89 * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", str(wav)],
                   input=pcm.tobytes(), check=True)
    mp3 = d / "listening.mp3"
    # CBR: browsers seek VBR inaccurately
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "96k",
                    "-ar", "44100", "-write_xing", "0", str(mp3)], check=True)
    total_ms = int(round(len(audio) / SR * 1000))

    custom = {k: {x: y for x, y in v.items() if x != "voice"} for k, v in src.get("speakers", {}).items()}
    pkg, jobs = build_skeleton({**src, "speakers": custom}, total_ms)
    qmap = {q["id"]: q for s in pkg["sections"] for q in s["questions"]}
    qsrcs = [q for s in src["sections"] for q in s["questions"]]
    for qsrc, job in zip(qsrcs, jobs):
        sp = [spans[(id(qsrc), i)] for i in range(len(qsrc["lines"]))]
        padded = []
        for i, (a, b) in enumerate(sp):
            lo = sp[i - 1][1] if i else a - 1.0
            hi = sp[i + 1][0] if i + 1 < len(sp) else b + 1.0
            padded.append((max(a - PAD_START, (lo + a) / 2), min(b + PAD_END, (b + hi) / 2)))
        for segs in job["segments"]:
            for seg, (a, b) in zip(segs, padded):
                seg["start_ms"] = int(round(a * 1000))
                seg["end_ms"] = int(round(b * 1000))
                seg["timing_status"] = "verified"
        for qid in job["qids"]:
            qmap[qid]["audio"] = {"start_ms": int(round((cues[id(qsrc)] - 0.1) * 1000)),
                                  "end_ms": int(round(padded[-1][1] * 1000))}
    out = d / "listening.json"
    out.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {mp3} ({total_ms / 60000:.1f} min) and {out}: {len(qmap)} questions")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir")
    ap.set_defaults(fn=cmd_synth)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
