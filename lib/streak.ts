import type { DateYMD, Habit, HabitLog } from "@/types";

import { addDays, localDateYMD, parseYMD } from "@/lib/date";

function completedOnDay(
  logs: HabitLog[],
  habitId: string,
  day: DateYMD,
): boolean {
  return logs.some(
    (l) => l.habitId === habitId && l.date === day && l.completed,
  );
}

/**
 * Consecutive completed days ending at `today` if today is done,
 * otherwise ending at yesterday (so the streak stays visible until you complete today).
 */
export function currentStreakForHabit(
  logs: HabitLog[],
  habitId: string,
  today: DateYMD,
): number {
  let cursor = parseYMD(today);
  if (!completedOnDay(logs, habitId, today)) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  let d = cursor;
  for (let i = 0; i < 36500; i++) {
    const ymd = localDateYMD(d);
    if (!completedOnDay(logs, habitId, ymd)) break;
    count++;
    d = addDays(d, -1);
  }
  return count;
}

/** Best current streak among all habits (motivation headline). */
export function maxStreakAcrossHabits(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
): number {
  if (habits.length === 0) return 0;
  return Math.max(
    0,
    ...habits.map((h) => currentStreakForHabit(logs, h.id, today)),
  );
}
