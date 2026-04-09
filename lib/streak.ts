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
 * Consecutive **completed** local days for this habit, walking backward from
 * today if today is done, otherwise from yesterday (streak still visible until you complete today).
 * Days before `habit.createdAt` (local calendar) never count.
 */
export function currentStreakForHabit(
  logs: HabitLog[],
  habit: Habit,
  today: DateYMD,
): number {
  const createdDay = localDateYMD(new Date(habit.createdAt));

  let cursor = parseYMD(today);
  if (!completedOnDay(logs, habit.id, today)) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  let d = cursor;
  for (let i = 0; i < 36500; i++) {
    const ymd = localDateYMD(d);
    if (ymd < createdDay) break;
    if (!completedOnDay(logs, habit.id, ymd)) break;
    count++;
    d = addDays(d, -1);
  }
  return count;
}

/** Highest current streak among habits (each respects its own `createdAt`). */
export function maxStreakAcrossHabits(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
): number {
  if (habits.length === 0) return 0;
  return Math.max(
    0,
    ...habits.map((h) => currentStreakForHabit(logs, h, today)),
  );
}
