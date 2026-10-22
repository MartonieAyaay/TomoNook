import type { DayKey } from "./types.ts";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-timezone day key for a Date. Never use toISOString() for this — it's UTC. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayKey(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: DayKey, n: number): DayKey {
  const date = fromDayKey(day);
  date.setDate(date.getDate() + n);
  return toDayKey(date);
}

export function today(): DayKey {
  return toDayKey(new Date());
}
