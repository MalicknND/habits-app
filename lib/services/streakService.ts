import type { DateYMD, Habit, HabitLog } from "@/types";

import { addDays, localDateYMD, parseYMD } from "@/lib/date";

export function completedOnDay(
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

/** Longest run of consecutive completed local days from creation through `today`. */
export function bestStreakEverForHabit(
  logs: HabitLog[],
  habit: Habit,
  today: DateYMD,
): number {
  const createdDay = localDateYMD(new Date(habit.createdAt));
  let best = 0;
  let run = 0;
  let d = parseYMD(createdDay);
  const end = parseYMD(today);
  while (d <= end) {
    const ymd = localDateYMD(d);
    if (completedOnDay(logs, habit.id, ymd)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    d = addDays(d, 1);
  }
  return best;
}

export function maxBestStreakAcrossHabits(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
): number {
  if (habits.length === 0) return 0;
  return Math.max(
    0,
    ...habits.map((h) => bestStreakEverForHabit(logs, h, today)),
  );
}

/** Habits that existed on `day` must all be completed that day. */
export function allHabitsCompletedOnDay(
  habits: Habit[],
  logs: HabitLog[],
  day: DateYMD,
): boolean {
  const active = habits.filter(
    (h) => localDateYMD(new Date(h.createdAt)) <= day,
  );
  if (active.length === 0) return true;
  return active.every((h) => completedOnDay(logs, h.id, day));
}

/**
 * Consecutive days (walking backward) where every existing habit was completed.
 * If today is incomplete, counts from yesterday. Stops on first day with any miss
 * or before any habit existed.
 */
export function strictMasterStreak(
  habits: Habit[],
  logs: HabitLog[],
  today: DateYMD,
): number {
  if (habits.length === 0) return 0;

  let cursor = parseYMD(today);
  if (!allHabitsCompletedOnDay(habits, logs, today)) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  let d = cursor;
  for (let i = 0; i < 36500; i++) {
    const ymd = localDateYMD(d);
    const active = habits.filter(
      (h) => localDateYMD(new Date(h.createdAt)) <= ymd,
    );
    if (active.length === 0) break;
    if (!allHabitsCompletedOnDay(habits, logs, ymd)) break;
    count++;
    d = addDays(d, -1);
  }
  return count;
}
