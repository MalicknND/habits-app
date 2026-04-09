import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DateYMD, Habit, HabitLog, TimeHHmm } from "@/types";

import { localDateYMD } from "@/lib/date";

const KEY_HABITS = "@habits/habits";
const KEY_LOGS = "@habits/logs";

export type TodayHabitRow = {
  habit: Habit;
  /** Whether this habit is marked completed for today (local date). */
  completed: boolean;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** All habits, newest last (order preserved from storage). */
export async function getHabits(): Promise<Habit[]> {
  const list = await readJson<Habit[]>(KEY_HABITS, []);
  return Array.isArray(list) ? list : [];
}

async function getLogs(): Promise<HabitLog[]> {
  const list = await readJson<HabitLog[]>(KEY_LOGS, []);
  return Array.isArray(list) ? list : [];
}

async function saveLogs(logs: HabitLog[]): Promise<void> {
  await writeJson(KEY_LOGS, logs);
}

async function saveHabits(habits: Habit[]): Promise<void> {
  await writeJson(KEY_HABITS, habits);
}

export type NewHabitInput = {
  title: string;
  time: TimeHHmm;
};

/** Appends a habit with a generated id and `createdAt` (ISO). */
export async function addHabit(input: NewHabitInput): Promise<Habit> {
  const habits = await getHabits();
  const habit: Habit = {
    id: newId(),
    title: input.title.trim(),
    time: input.time,
    createdAt: new Date().toISOString(),
  };
  habits.push(habit);
  await saveHabits(habits);
  return habit;
}

/**
 * Upserts today's log for `habitId` and flips `completed`.
 * At most one log per habit per calendar day (local).
 */
export async function toggleHabitCompletion(habitId: string): Promise<void> {
  const habits = await getHabits();
  if (!habits.some((h) => h.id === habitId)) {
    throw new Error(`Unknown habit: ${habitId}`);
  }

  const today: DateYMD = localDateYMD();
  const logs = await getLogs();
  const i = logs.findIndex((l) => l.habitId === habitId && l.date === today);

  if (i === -1) {
    logs.push({
      id: newId(),
      habitId,
      date: today,
      completed: true,
    });
  } else {
    const prev = logs[i];
    logs[i] = { ...prev, completed: !prev.completed };
  }

  await saveLogs(logs);
}

function todayLogCompleted(
  logs: HabitLog[],
  habitId: string,
  today: DateYMD,
): boolean {
  const log = logs.find((l) => l.habitId === habitId && l.date === today);
  return log?.completed ?? false;
}

/** All habits with completion state for today (local date). */
export async function getTodayHabits(): Promise<TodayHabitRow[]> {
  const [habits, logs] = await Promise.all([getHabits(), getLogs()]);
  const today = localDateYMD();
  return habits.map((habit) => ({
    habit,
    completed: todayLogCompleted(logs, habit.id, today),
  }));
}
