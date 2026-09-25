---
name: add-listening-lesson
description: Add a new JLPT (or other) listening test to the app from its mp3 — transcribe, write source.json with translations/choices/answers, align timings, verify. Use when the user drops a new listening.mp3 under backend/content/ and asks to add/update that test, or to fix timings of an existing one.
---

# Add a listening lesson

Pipeline and `source.json` format: `scripts/lesson/README.md` (read it first).
Tool: `python3 scripts/lesson/lesson_tool.py <audio|transcribe|build|verify> <lesson dir>`, run from `backend/`.

## 1. Prepare

- Folder: `content/jlpt/<level>/<yyyy-mm>/` with `listening.mp3`. Anything else already in it
  (a pasted YouTube transcript, an old `listening.json` that is not JSON) → move to
  `.work/<same path>/` as reference, so the server doesn't choke on it.
- `audio` — re-encodes VBR to CBR in place (original backed up in `.work/`). Always run it:
  VBR mp3 makes browser seeking drift by seconds.
- `transcribe` in the background (`run_in_background`), ~0.5× real time on an M1 with `medium`.
  While it runs, read any reference transcript and start drafting `source.json`.

## 2. Write source.json (the part that needs judgment)

From `.work/<path>/transcript.txt` (Whisper, timestamps) plus any reference transcript:

- **Japanese text**: fix ASR errors (homophones, names, dropped particles) using context; keep
  what is actually said — fillers like 「あ、」「えっと」 stay if spoken. One line = one sentence.
  Narrator lines include the question read aloud (問題1/2 read it twice: two narrator lines).
- **Speakers**: `narrator`, `male`, `female` from context (「男の学生は…」, speech style); add custom
  ids in `"speakers"` only when a dialogue has two people of the same gender.
- **Spoken options** (問題3, 4, 5-1): lines `choice_1…`, no number prefix in the text.
- **Printed options** (問題1, 2, 5 last item) are NOT in the audio. Never invent them. Ask the
  user for the booklet pages (screenshots are fine) and copy the options exactly, kana as printed.
  Until then omit `choices`/`answer` → the question is dictation-only and `build` lists it.
- **Pictures** (問題1 illustrations, picture options): crop the figure from the booklet screenshot
  the user sent (it is saved under the session's `images/` folder; `sips -c <h> <w> --cropOffset <y> <x>`),
  Read the crop to check the frame, then `node scripts/lesson/upload_image.mjs <png>
  jlpt/<level>/<yyyy-mm>/m<s>-q<n>-figure` → put the URL in the question's `"image"` (shown above the
  options) or in each choice's `"image"` with `"mode": "image"` when every option is a picture.
  Options that are only labels (ア イ) need no translation.
- **Spoken options** stay hidden in the app until the learner answers (the UI shows 1–4 only for
  問題3–5), so their text must still be transcribed and translated.
- **Answers**: an official key given by the user wins. Otherwise answer from the audio only when it
  is unambiguous (問題3/4/5 spoken options usually are) and set a top-level `review_note` saying the
  answers were inferred from the audio. Never guess printed-option order.
- **Translations**: `vi` for every line (natural spoken Vietnamese, matching register: 敬語 →
  lịch sự), `vi` + `en` for prompts and options.
- **why**: one short `vi` explanation per option — for the right one say what in the dialogue
  proves it; for wrong ones say concretely why not (mentioned but rejected, someone else does it,
  later step…). The validator requires an explanation on every option. No boilerplate.
- **evidence**: line numbers containing the deciding information.

Work section by section and write the file in chunks if it is long; keep valid JSON.

## 3. Build and check

1. `build` → read the per-dialogue report. `LOW lines` or a dialogue whose time range looks off
   (overlapping the next 番, far too long) → fix the text in `source.json` and rebuild.
2. `speakers` → every `<-- check` line: re-read the dialogue with the pitch column and fix who
   says what (a run of flags = turns shifted). Re-check the answer and the `why` texts afterwards:
   in 2024-07 問題2-3 the swap changed the correct option. Rebuild.
3. `verify` (background) → inspect lines under 0.75: compare `ref` vs `hyp` in `.work/<path>/verify.json`.
   Low scores from ASR mishearing a correct line are fine; a clip cut mid-word, or containing the
   neighbour sentence, is not → adjust with `manual_boundaries` and rebuild.
4. `npx tsx packages/content-schema/src/cli.ts content` → 0 errors. Warnings "MC question has no
   choices" are expected for questions without an answer key.
5. Optional smoke test: run backend (`npm run dev`) + frontend and open the lesson.

## 4. Report and ship

- Tell the user: questions / sentences count, which questions are dictation-only and why,
  whether answers are official or inferred, anything flagged by `verify`.
- Commit only when asked. In this project: no Co-Authored-By trailer, push straight to `main`
  (CI/CD deploys). The mp3 is committed with the lesson (served from `content/`).
