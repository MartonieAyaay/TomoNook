/** A calendar day in the user's local timezone, formatted YYYY-MM-DD. */
export type DayKey = string;

// ---------- To-do ----------

export interface TodoCategory {
  id: string;
  /** Max CATEGORY_NAME_MAX characters. */
  name: string;
  /** Hex color for the card's border, title and tasks. */
  color: string;
}

export const MAX_CATEGORIES = 10;
export const CATEGORY_NAME_MAX = 25;
export const DEFAULT_CATEGORY_COLOR = "#e66b33";

export interface Todo {
  id: string;
  categoryId: string;
  day: DayKey;
  title: string;
  /** "HH:mm" local time. A todo with a time is a deadline. */
  time?: string;
  done: boolean;
  /** ISO timestamp of when it was checked off. */
  completedAt?: string;
}

/** What the tomato under a calendar day number shows on the to-do tab. */
export type TodoDayState =
  | { kind: "empty" } // no deadlines: gray silhouette
  | { kind: "filling"; done: number; total: number }
  | { kind: "complete" }
  | { kind: "missed" }; // red splatter

// ---------- Mood ----------

export interface Mood {
  id: string;
  name: string;
  /** Hex color used to fill the tomato. */
  color: string;
}

export const MAX_MOODS = 8;
export const MOOD_NAME_MAX = 15;

export const DEFAULT_MOODS: Mood[] = [
  { id: "happy", name: "Happy", color: "#F5C842" },
  { id: "sad", name: "Sad", color: "#4A7FD1" },
  { id: "angry", name: "Angry", color: "#D9382E" },
];

export interface MoodEntry {
  day: DayKey;
  moodId: string;
  loggedAt: string;
}

export interface MoodPost {
  id: string;
  day: DayKey;
  /** Max POST_MAX_CHARS characters. */
  text: string;
  createdAt: string;
}

export const POST_MAX_CHARS = 500;
export const POSTS_PER_DAY_NO_STREAK = 2;
export const POSTS_PER_DAY_STREAK = 10;

// ---------- Timers ----------

/** A saved timer card: focus time, then a break, repeated until stopped. */
export interface TimerPreset {
  id: string;
  name: string;
  lockMs: number;
  chillMs: number;
}

export type TimerPhaseName = "lock" | "chill";

export const MAX_TIMERS = 12;
export const TIMER_NAME_MAX = 20;
/** Longest a single phase can be: 23:59:59. */
export const TIMER_PHASE_MAX_MS = (24 * 3600 - 1) * 1000;

// ---------- Avatar & profile ----------

export type BodyShape = "skinny" | "plus";

export type AdjustablePart = "eyes" | "brows" | "nose" | "mouth" | "hair";

/** Nudge for one part: x/y in % of the avatar canvas, scale 1 = as drawn. */
export interface PartAdjust {
  x: number;
  y: number;
  scale: number;
  /** Eyes and brows only: extra gap between the left and right halves, in %. */
  spacing?: number;
}

/** Option numbers match the art files (e.g. hair 3 = hair-3.png). */
export interface AvatarConfig {
  body: BodyShape;
  /** 1–6, light to dark. */
  skin: number;
  shirtColor: string;
  /** 1–6 */
  eyes: number;
  lashes: boolean;
  eyeColor: string;
  /** 1–8 */
  brows: number;
  /** 1–4 */
  nose: number;
  /** 1–9 */
  mouth: number;
  /** 1–9 */
  hair: number;
  hairColor: string;
  /** Parts the user has moved or resized; missing = default spot. */
  adjust: Partial<Record<AdjustablePart, PartAdjust>>;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  body: "skinny",
  skin: 1,
  shirtColor: "#c13828",
  eyes: 1,
  lashes: true,
  eyeColor: "#5a3825",
  brows: 1,
  nose: 1,
  mouth: 1,
  hair: 1,
  hairColor: "#5a3825",
  adjust: {},
};

export const PROFILE_NAME_MAX = 20;

export interface Food {
  id: string;
  name: string;
  /** Undefined for the built-in cookie. */
  imageUrl?: string;
}

export const DEFAULT_FOOD: Food = { id: "cookie", name: "Cookie" };

// ---------- "On open" reactions ----------

/** Persisted so the splat plays once per event, not on every open. */
export interface SplatSeen {
  missedDeadlineDays: DayKey[];
  brokenStreakDays: DayKey[];
}
