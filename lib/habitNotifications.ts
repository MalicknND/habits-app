import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyTriggerInput } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getHabits } from "@/lib/habitsStorage";
import type { TimeHHmm } from "@/types";

const STORAGE_MAP = "@habits/notification_ids";
const ANDROID_CHANNEL = "habits-reminders";

function parseTimeHM(t: TimeHHmm): { hour: number; minute: number } {
  const [h, m] = t.split(":").map((x) => Number(x));
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

async function loadIdMap(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_MAP);
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, string>;
    return o && typeof o === "object" ? o : {};
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
 * Aligns scheduled local notifications with current habits (daily at each habit's time).
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

  let map = await loadIdMap();
  const alive = new Set(habits.map((h) => h.id));

  for (const hid of Object.keys(map)) {
    if (!alive.has(hid)) {
      await Notifications.cancelScheduledNotificationAsync(map[hid]!);
      delete map[hid];
    }
  }

  for (const h of habits) {
    const prev = map[h.id];
    if (prev) {
      await Notifications.cancelScheduledNotificationAsync(prev);
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
        data: { habitId: h.id },
      },
      trigger,
    });
    map = { ...map, [h.id]: nid };
  }

  await saveIdMap(map);
}
