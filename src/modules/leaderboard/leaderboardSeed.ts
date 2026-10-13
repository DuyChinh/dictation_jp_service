/** Pure helpers for the demo learners: who they are, how many points they start with, what they earn per day. */

export const BASE_POINTS = 1000;
export const SEED_COUNT = 200;

/** Vietnam is where the learners are, so "today" rolls over at midnight there. */
const DAY_OFFSET_MS = 7 * 60 * 60 * 1000;

export type Rand = () => number;

/** Small deterministic generator, so the same demo crowd is built every time. */
export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dayKey(now: Date): string {
  return new Date(now.getTime() + DAY_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const ms = Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : 0;
}

const FAMILY = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý",
];
const MIDDLE = ["Minh", "Thanh", "Ngọc", "Quốc", "Hoàng", "Thu", "Gia", "Bảo", "Khánh", "Anh", "Hải", "Phương", "Đức", "Mai"];
const GIVEN = [
  "Anh", "An", "Bình", "Châu", "Dung", "Duy", "Giang", "Hà", "Hải", "Hân", "Hiếu", "Hòa", "Hùng", "Huy", "Khoa", "Lan",
  "Linh", "Long", "Mai", "My", "Nam", "Nga", "Ngân", "Nhi", "Phúc", "Quân", "Quyên", "Sơn", "Thảo", "Thắng", "Thủy",
  "Trang", "Trâm", "Trung", "Tú", "Tuấn", "Uyên", "Vy", "Yến", "Hạnh", "Khánh", "Lâm", "Nhung", "Tâm", "Việt",
];
const HANDLE_A = [
  "sakura", "hana", "kanji", "mochi", "neko", "shiba", "daruma", "ramen", "fuji", "matcha", "tanuki", "ume", "kaze",
  "hoshi", "sora", "yuki", "takoyaki", "onigiri", "kitsune", "tsubaki",
];
const HANDLE_B = ["_n2", "_n3", "_n1", "_n4", "_study", "_jp", "_hoctiengnhat", "88", "99", "2k", "_vn", ".jp"];
const JP_NAMES = [
  "Yuki Tanaka", "Haruto Sato", "Aoi Suzuki", "Ren Takahashi", "Mei Ito", "Sota Watanabe", "Hina Kobayashi", "Kaito Yamamoto",
];

const pick = <T,>(list: readonly T[], rand: Rand): T => list[Math.floor(rand() * list.length)]!;

function makeName(rand: Rand): string {
  const roll = rand();
  if (roll < 0.68) return `${pick(FAMILY, rand)} ${pick(MIDDLE, rand)} ${pick(GIVEN, rand)}`;
  if (roll < 0.82) return `${pick(MIDDLE, rand)} ${pick(GIVEN, rand)} ${pick(FAMILY, rand).charAt(0)}.`;
  if (roll < 0.97) {
    const n = rand() < 0.5 ? String(Math.floor(rand() * 90) + 10) : "";
    return `${pick(HANDLE_A, rand)}${pick(HANDLE_B, rand)}${n}`;
  }
  return pick(JP_NAMES, rand);
}

export const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type Level = (typeof LEVELS)[number];

/** Share of learners per level: N3 and N2 are the busiest. */
const LEVEL_WEIGHTS: Array<[Level, number]> = [["N5", 0.18], ["N4", 0.2], ["N3", 0.27], ["N2", 0.24], ["N1", 0.11]];

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

/** A demo learner's level, fixed by their name so it never changes between runs. */
export function levelForName(name: string): Level {
  let roll = (hashString(`${name}|level`) % 1000) / 1000;
  for (const [level, weight] of LEVEL_WEIGHTS) {
    if (roll < weight) return level;
    roll -= weight;
  }
  return "N3";
}

export interface SeedLearner {
  name: string;
  level: Level;
  points: number;
  activity: number;
  intensity: number;
}

/** A crowd with a long tail: a few leaders, many mid-table, and plenty of newcomers near the base. */
export function buildSeedLearners(count = SEED_COUNT, rand: Rand = mulberry32(20241012)): SeedLearner[] {
  const names = new Set<string>();
  const out: SeedLearner[] = [];
  while (out.length < count) {
    const name = makeName(rand);
    if (names.has(name)) continue;
    names.add(name);
    out.push({
      name,
      level: levelForName(name),
      points: BASE_POINTS + Math.floor(Math.pow(rand(), 2.2) * 9000),
      activity: 0.25 + 0.7 * rand(),
      intensity: 0.3 + 1.2 * Math.pow(rand(), 1.5),
    });
  }
  return out;
}

/** What a seeded learner earns in one day: nothing on a day off, otherwise 10 to a few hundred, tapering at the top. */
export function dailyGain(learner: { points: number; activity: number; intensity: number }, rand: Rand): number {
  if (rand() >= learner.activity) return 0;
  const taper = 1 / (1 + Math.max(0, learner.points - BASE_POINTS) / 25000);
  return Math.max(10, Math.round(learner.intensity * (30 + rand() * 270) * taper));
}

export type Period = "week" | "month" | "year" | "all";

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** First day (a key) a period counts from: the Monday of this week, the 1st of this month or of this year. */
export function periodStart(period: "week" | "month" | "year", now: Date): string {
  const today = dayKey(now);
  if (period === "year") return `${today.slice(0, 4)}-01-01`;
  if (period === "month") return `${today.slice(0, 7)}-01`;
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, -((weekday + 6) % 7));
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Share of a day's study done by this hour (Vietnam time): quiet at night, busy in the evening. */
const DAY_CURVE: Array<[number, number]> = [
  [0, 0], [6, 0.03], [9, 0.2], [12, 0.4], [15, 0.55], [18, 0.7], [21, 0.92], [24, 1],
];

export function dayProgress(hour: number): number {
  const h = Math.min(24, Math.max(0, hour));
  for (let i = 1; i < DAY_CURVE.length; i++) {
    const [h1, p1] = DAY_CURVE[i]!;
    if (h <= h1) {
      const [h0, p0] = DAY_CURVE[i - 1]!;
      return p0 + ((p1 - p0) * (h - h0)) / (h1 - h0);
    }
  }
  return 1;
}

export function vietnamHour(now: Date): number {
  const vn = new Date(now.getTime() + DAY_OFFSET_MS);
  return vn.getUTCHours() + vn.getUTCMinutes() / 60;
}

/** What a learner will have earned by the end of `day`; the same answer every time it is asked. */
export function plannedGain(
  learner: { points: number; activity: number; intensity: number },
  id: string,
  day: string,
): number {
  return dailyGain(learner, mulberry32(hashString(`${id}|${day}`)));
}

/**
 * How much of that day's gain is done at `hour` (0-24, Vietnam time). Each learner is a couple of hours
 * early or late, so they don't all move at the same moment. Past days (`hour` of 24 or more) are complete.
 */
export function gainSoFar(planned: number, id: string, day: string, hour: number): number {
  if (hour >= 24) return planned;
  const shift = mulberry32(hashString(`${id}|${day}|shift`))() * 4 - 2;
  return Math.round(planned * dayProgress(hour + shift));
}
