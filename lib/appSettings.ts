import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TimeHHmm } from "@/types";

const KEY = "@habits/app_settings";

export type AppSettings = {
  strictMode: boolean;
  /** Second reminder if habit not completed yet today (native only). */
  followUpReminders: boolean;
  /** 24h time for follow-up (default 22:00). */
  followUpTime: TimeHHmm;
};

const DEFAULTS: AppSettings = {
  strictMode: false,
  followUpReminders: true,
  followUpTime: "22:00",
};

function merge(raw: Partial<AppSettings> | null): AppSettings {
  return {
    strictMode: typeof raw?.strictMode === "boolean" ? raw.strictMode : DEFAULTS.strictMode,
    followUpReminders:
      typeof raw?.followUpReminders === "boolean"
        ? raw.followUpReminders
        : DEFAULTS.followUpReminders,
    followUpTime:
      typeof raw?.followUpTime === "string" && /^\d{2}:\d{2}$/.test(raw.followUpTime)
        ? (raw.followUpTime as TimeHHmm)
        : DEFAULTS.followUpTime,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    const o = JSON.parse(raw) as Partial<AppSettings>;
    return merge(o && typeof o === "object" ? o : null);
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const prev = await getAppSettings();
  const next = merge({ ...prev, ...patch });
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
