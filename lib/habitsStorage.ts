import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DateYMD, Habit, HabitLog, HabitPriority, TimeHHmm } from "@/types";

import { getAppSettings } from "@/lib/appSettings";
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

function normalizeHabit(raw: unknown): Habit {
  const h = raw as Partial<Habit> & Pick<Habit, "id">;
  const p = h.priority;
  const priority: HabitPriority =
    p === "high" || p === "medium" || p === "low" ? p : "medium";
  return {
    id: h.id,
    title: typeof h.title === "string" ? h.title : "",
    time: typeof h.time === "string" ? h.time : "09:00",
    createdAt: typeof h.createdAt === "string" ? h.createdAt : new Date().toISOString(),
    priority,
  };
}

/** All habits, newest last (order preserved from storage). */
export async function getHabits(): Promise<Habit[]> {
  const list = await readJson<Habit[]>(KEY_HABITS, []);
  if (!Array.isArray(list)) return [];
  return list.map((h) => normalizeHabit(h));
}

/**
 * One log row per (habitId, date). If duplicates exist, merge:
 * `completed` is true if any duplicate was completed; keep the first `id`.
 */
export function mergeDuplicateDayLogs(logs: HabitLog[]): HabitLog[] {
  const map = new Map<string, HabitLog>();
  for (const l of logs) {
    const key = `${l.habitId}\0${l.date}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...l });
    } else {
      map.set(key, {
        ...prev,
        completed: prev.completed || l.completed,
      });
    }
  }
  return [...map.values()];
}

async function readLogsRaw(): Promise<HabitLog[]> {
  const list = await readJson<HabitLog[]>(KEY_LOGS, []);
  return Array.isArray(list) ? list : [];
}

/** Loads logs, repairs duplicates in storage when needed. */
async function loadAndRepairLogs(): Promise<HabitLog[]> {
  const raw = await readLogsRaw();
  const merged = mergeDuplicateDayLogs(raw);
  if (merged.length !== raw.length) {
    await writeJson(KEY_LOGS, merged);
  }
  return merged;
}

async function getLogs(): Promise<HabitLog[]> {
  return loadAndRepairLogs();
}

/** All completion logs (merged; safe for streaks / stats). */
export async function getHabitLogs(): Promise<HabitLog[]> {
  return getLogs();
}

async function saveLogs(logs: HabitLog[]): Promise<void> {
  await writeJson(KEY_LOGS, mergeDuplicateDayLogs(logs));
}

async function saveHabits(habits: Habit[]): Promise<void> {
  await writeJson(KEY_HABITS, habits);
}

/**
 * Ensures each habit has exactly one `HabitLog` for `date` (creates `completed: false` if missing).
 * Call for “daily tracking” rows without guessing completion.
 */
export async function ensureTrackingLogsForDate(date: DateYMD): Promise<void> {
  const habits = await getHabits();
  let logs = await loadAndRepairLogs();
  let changed = false;
  for (const habit of habits) {
    const exists = logs.some(
      (l) => l.habitId === habit.id && l.date === date,
    );
    if (!exists) {
      logs.push({
        id: newId(),
        habitId: habit.id,
        date,
        completed: false,
      });
      changed = true;
    }
  }
  if (changed) {
    await saveLogs(logs);
  }
}

export type NewHabitInput = {
  title: string;
  time: TimeHHmm;
  priority?: HabitPriority;
};

/** Appends a habit with a generated id and `createdAt` (ISO). */
export async function addHabit(input: NewHabitInput): Promise<Habit> {
  const habits = await getHabits();
  const habit: Habit = {
    id: newId(),
    title: input.title.trim(),
    time: input.time,
    createdAt: new Date().toISOString(),
    priority: input.priority ?? "medium",
  };
  habits.push(habit);
  await saveHabits(habits);
  await ensureTrackingLogsForDate(localDateYMD());
  return habit;
}

/**
 * Flips `completed` for this habit on **today** (local). At most one row per habit per day
 * after merge; placeholder rows come from `ensureTrackingLogsForDate`.
 */
export async function toggleHabitCompletion(habitId: string): Promise<void> {
  const habits = await getHabits();
  if (!habits.some((h) => h.id === habitId)) {
    throw new Error(`Unknown habit: ${habitId}`);
  }

  const today: DateYMD = localDateYMD();
  await ensureTrackingLogsForDate(today);
  const logs = await loadAndRepairLogs();
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
    if (prev.completed) {
      const { strictMode } = await getAppSettings();
      if (strictMode) {
        throw new Error(
          "Discipline stricte : une habitude validée ne peut pas être annulée.",
        );
      }
    }
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

/** All habits with completion state for today; ensures tracking rows for today exist first. */
export async function getTodayHabits(): Promise<TodayHabitRow[]> {
  const today = localDateYMD();
  await ensureTrackingLogsForDate(today);
  const [habits, logs] = await Promise.all([getHabits(), loadAndRepairLogs()]);
  return habits.map((habit) => ({
    habit,
    completed: todayLogCompleted(logs, habit.id, today),
  }));
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const habits = await getHabits();
  return habits.find((h) => h.id === id) ?? null;
}

export async function updateHabit(
  habitId: string,
  patch: { title: string; time: TimeHHmm; priority?: HabitPriority },
): Promise<Habit> {
  const habits = await getHabits();
  const i = habits.findIndex((h) => h.id === habitId);
  if (i === -1) {
    throw new Error(`Unknown habit: ${habitId}`);
  }
  const updated: Habit = {
    ...habits[i],
    title: patch.title.trim(),
    time: patch.time,
    priority: patch.priority ?? habits[i]!.priority,
  };
  habits[i] = updated;
  await saveHabits(habits);
  return updated;
}

/** Removes the habit and all its logs. */
export async function deleteHabit(habitId: string): Promise<void> {
  const habits = await getHabits();
  const nextHabits = habits.filter((h) => h.id !== habitId);
  if (nextHabits.length === habits.length) {
    throw new Error(`Unknown habit: ${habitId}`);
  }
  await saveHabits(nextHabits);
  const logs = (await loadAndRepairLogs()).filter((l) => l.habitId !== habitId);
  await saveLogs(logs);
}
