import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyTriggerInput } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getAppSettings } from "@/lib/appSettings";
import { localDateYMD, parseYMD } from "@/lib/date";
import { getHabitLogs, getHabits } from "@/lib/habitsStorage";
import { completedOnDay } from "@/lib/services/streakService";
import type { DateYMD, TimeHHmm } from "@/types";

const STORAGE_MAP = "@habits/notification_ids";
const ANDROID_CHANNEL = "habits-reminders";

function primaryKey(habitId: string): string {
  return `primary:${habitId}`;
}

function followupKey(habitId: string): string {
  return `followup:${habitId}`;
}

function parseTimeHM(t: TimeHHmm): { hour: number; minute: number } {
  const [h, m] = t.split(":").map((x) => Number(x));
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function todayAtHM(ymd: DateYMD, hm: TimeHHmm): Date {
  const d = parseYMD(ymd);
  const { hour, minute } = parseTimeHM(hm);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function loadIdMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_MAP);
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, string>;
    if (!o || typeof o !== "object") return {};
    const migrated: Record<string, string> = {};
    let changed = false;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v !== "string") continue;
      if (k.includes(":")) {
        migrated[k] = v;
      } else {
        migrated[primaryKey(k)] = v;
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem(STORAGE_MAP, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return {};
  }
}

async function saveIdMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_MAP, JSON.stringify(map));
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: "Habit reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#2563eb",
  });
}

/** Call once at startup (e.g. root layout). Safe to call multiple times. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Aligns scheduled local notifications with current habits.
 * Primary: daily at each habit's time. Follow-up: once today if enabled, habit not done, time still ahead.
 * No-op on web. Requests permission when habits exist.
 */
export async function syncHabitNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  const habits = await getHabits();
  if (habits.length === 0) {
    const map = await loadIdMap();
    for (const id of Object.values(map)) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await saveIdMap({});
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") {
    return;
  }

  await ensureAndroidChannel();

  const settings = await getAppSettings();
  const today = localDateYMD();
  const logs = await getHabitLogs();

  let map = await loadIdMap();
  const alive = new Set(habits.map((h) => h.id));

  for (const k of Object.keys(map)) {
    const hid =
      k.startsWith("primary:") ? k.slice(8) : k.startsWith("followup:") ? k.slice(9) : null;
    if (hid && !alive.has(hid)) {
      await Notifications.cancelScheduledNotificationAsync(map[k]!);
      delete map[k];
    }
  }

  for (const h of habits) {
    const pk = primaryKey(h.id);
    const prevP = map[pk];
    if (prevP) {
      await Notifications.cancelScheduledNotificationAsync(prevP);
    }
    const { hour, minute } = parseTimeHM(h.time);
    const trigger: DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL } : {}),
    };

    const nid = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit reminder",
        body: `Time for: ${h.title}`,
        data: { habitId: h.id, kind: "primary" },
      },
      trigger,
    });
    map = { ...map, [pk]: nid };

    const fk = followupKey(h.id);
    const prevF = map[fk];
    if (prevF) {
      await Notifications.cancelScheduledNotificationAsync(prevF);
      delete map[fk];
    }

    if (settings.followUpReminders) {
      const done = completedOnDay(logs, h.id, today);
      if (!done) {
        const when = todayAtHM(today, settings.followUpTime);
        const now = new Date();
        if (when.getTime() > now.getTime()) {
          const fid = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Rappel",
              body: `Pas encore coché : ${h.title}`,
              data: { habitId: h.id, kind: "followup" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: when,
              ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL } : {}),
            },
          });
          map = { ...map, [fk]: fid };
        }
      }
    }
  }

  await saveIdMap(map);
}
