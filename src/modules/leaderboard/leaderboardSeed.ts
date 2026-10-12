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

export interface SeedLearner {
  name: string;
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

export type Period = "week" | "month" | "all";

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** First day (a key) a period counts from: the Monday of this week or the 1st of this month. */
export function periodStart(period: "week" | "month", now: Date): string {
  const today = dayKey(now);
  if (period === "month") return `${today.slice(0, 7)}-01`;
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, -((weekday + 6) % 7));
}
