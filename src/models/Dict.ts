import mongoose, { Schema } from "mongoose";

/**
 * Dictionary data. JMdict / KANJIDIC2 are loaded by `scripts/dict/import.ts` and can be rebuilt at any
 * time from the source files; `dict_vi` holds our own Vietnamese meanings and is the part worth backing up
 * (`scripts/dict/export-vi.ts`).
 */

export type DictForm = { t: string; c?: 1; g?: string[] };
export type DictReading = DictForm & { ak?: string[] };
export type DictSense = {
  /** part of speech */
  p: string[];
  /** English glosses */
  g: string[];
  f?: string[];
  m?: string[];
  i?: string[];
  /** only for these kanji / kana forms */
  ak?: string[];
  ar?: string[];
  /** example sentences (Tatoeba) */
  x?: Array<{ ja: string; en: string }>;
};

export interface IDictEntry {
  _id: number;
  k: DictForm[];
  r: DictReading[];
  s: DictSense[];
  /** 1 when any form is marked common */
  c: 0 | 1;
  /** JLPT level 5 (N5) .. 1 (N1) of the word list this entry appears in */
  l?: number;
  /** ranking weight, higher is better */
  w: number;
  /** every written form (and its hiragana spelling) for exact / prefix lookup */
  keys: string[];
  /** folded word tokens of the English glosses, for English → Japanese search */
  en: string[];
}

const formSchema = { _id: false, t: String, c: Number, g: [String] };
const entrySchema = new Schema<IDictEntry>(
  {
    _id: { type: Number },
    k: [formSchema],
    r: [{ ...formSchema, ak: [String] }],
    s: [
      {
        _id: false,
        p: [String],
        g: [String],
        f: [String],
        m: [String],
        i: [String],
        ak: [String],
        ar: [String],
        x: [{ _id: false, ja: String, en: String }],
      },
    ],
    c: { type: Number, default: 0 },
    l: { type: Number },
    w: { type: Number, default: 0 },
    keys: { type: [String], index: true },
    en: { type: [String], index: true },
  },
  { collection: "dict_entries", versionKey: false },
);

export const DictEntry = mongoose.model<IDictEntry>("DictEntry", entrySchema);

export type ViSource = "ai" | "reviewed" | "manual";

export interface IDictVi {
  _id: number;
  /** Vietnamese meanings, one array per JMdict sense (same order); an empty array = not translated yet */
  s: string[][];
  /** Vietnamese translations of the example sentences: x[sense][example], same order as the entry's `s[sense].x` */
  x?: string[][];
  /** Corrected Japanese for examples with a typo in the Tatoeba original: xj[sense][example], "" = no correction */
  xj?: string[][];
  /** senses kept off the site (wrong or misleading in JMdict), as indexes into the entry's senses */
  hs?: number[];
  /** examples kept off the site (unsuitable for learners), as "sense:example" positions */
  hx?: string[];
  /** folded word tokens, for Vietnamese → Japanese search */
  t: string[];
  src: ViSource;
}

const viSchema = new Schema<IDictVi>(
  {
    _id: { type: Number },
    s: [[String]],
    x: [[String]],
    xj: [[String]],
    hs: [Number],
    hx: [String],
    t: { type: [String], index: true },
    src: { type: String, enum: ["ai", "reviewed", "manual"], default: "ai" },
  },
  { collection: "dict_vi", versionKey: false, timestamps: true },
);

export const DictVi = mongoose.model<IDictVi>("DictVi", viSchema);

export interface IDictKanji {
  _id: string;
  /** stroke count */
  n?: number;
  /** school grade (1-6 elementary, 8 secondary, 9-10 names) */
  gr?: number;
  /** old four-level JLPT list from KANJIDIC2 (4 = easiest) */
  l?: number;
  /** frequency rank in newspapers */
  fq?: number;
  on: string[];
  kun: string[];
  /** English meanings */
  m: string[];
  /** Sino-Vietnamese (Hán Việt) readings */
  hv: string[];
  /** Kangxi radical number */
  rad?: number;
  /** component parts (KRADFILE) */
  parts: string[];
}

const kanjiSchema = new Schema<IDictKanji>(
  {
    _id: { type: String },
    n: Number,
    gr: Number,
    l: Number,
    fq: Number,
    on: [String],
    kun: [String],
    m: [String],
    hv: [String],
    rad: Number,
    parts: [String],
  },
  { collection: "dict_kanji", versionKey: false },
);

export const DictKanji = mongoose.model<IDictKanji>("DictKanji", kanjiSchema);
