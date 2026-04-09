import type { DateYMD, Habit, HabitLog, HabitPriority } from "@/types";

import { addDays, localDateYMD, parseYMD } from "@/lib/date";
import type { TodayHabitRow } from "@/lib/habitsStorage";

const PRIORITY_ORDER: Record<HabitPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Sort today rows: high → medium → low, then title. */
export function sortTodayRowsByPriority(rows: TodayHabitRow[]): TodayHabitRow[] {
  return [...rows].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.habit.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.habit.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.habit.title.localeCompare(b.habit.title, undefined, {
      sensitivity: "base",
    });
  });
}

/** Share of habits completed today, 0–100, or `null` if no habits. */
export function disciplineScore(rows: TodayHabitRow[]): number | null {
  if (rows.length === 0) return null;
  const done = rows.filter((r) => r.completed).length;
  return Math.round((done / rows.length) * 100);
}

/**
 * Over the last `n` calendar days ending `today`: completed slots / total slots.
 * A slot counts if the habit existed on that day.
 */
export function completionRateLastNDays(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
  n: number,
): number | null {
  if (habits.length === 0) return null;
  let slots = 0;
  let done = 0;
  const end = parseYMD(today);
  for (let i = 0; i < n; i++) {
    const ymd = localDateYMD(addDays(end, -i));
    for (const h of habits) {
      if (localDateYMD(new Date(h.createdAt)) > ymd) continue;
      slots++;
      const log = logs.find((l) => l.habitId === h.id && l.date === ymd);
      if (log?.completed) done++;
    }
  }
  if (slots === 0) return null;
  return Math.round((done / slots) * 100);
}

export type MissedHabitStat = { habit: Habit; missedDays: number };

/** Habits with most incomplete days in the window (ties kept, sorted by misses desc). */
export function mostMissedHabits(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
  days: number,
  limit: number,
): MissedHabitStat[] {
  if (habits.length === 0 || days < 1) return [];
  const end = parseYMD(today);
  const stats: MissedHabitStat[] = habits.map((h) => {
    let missedDays = 0;
    for (let i = 0; i < days; i++) {
      const ymd = localDateYMD(addDays(end, -i));
      if (localDateYMD(new Date(h.createdAt)) > ymd) continue;
      const log = logs.find((l) => l.habitId === h.id && l.date === ymd);
      if (!log?.completed) missedDays++;
    }
    return { habit: h, missedDays };
  });
  stats.sort((a, b) => b.missedDays - a.missedDays);
  const maxMiss = stats[0]?.missedDays ?? 0;
  if (maxMiss === 0) return [];
  return stats.filter((s) => s.missedDays === maxMiss).slice(0, limit);
}
