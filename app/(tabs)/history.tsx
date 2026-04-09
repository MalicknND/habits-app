import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildMonthGrid, WEEKDAY_LABELS } from "@/lib/monthGrid";
import { getHabitLogs, getHabits } from "@/lib/habitsStorage";
import type { DateYMD, Habit, HabitLog } from "@/types";

function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<DateYMD | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [h, l] = await Promise.all([getHabits(), getHabitLogs()]);
    setHabits(h);
    setLogs(l);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let a = true;
      void (async () => {
        setLoading(true);
        try {
          await refresh();
        } finally {
          if (a) setLoading(false);
        }
      })();
      return () => {
        a = false;
      };
    }, [refresh]),
  );

  const habitById = useMemo(() => {
    const m = new Map<string, Habit>();
    for (const h of habits) m.set(h.id, h);
    return m;
  }, [habits]);

  const completedByDate = useMemo(() => {
    const map = new Map<
      DateYMD,
      { count: number; titles: string[] }
    >();
    for (const log of logs) {
      if (!log.completed) continue;
      const habit = habitById.get(log.habitId);
      if (!habit) continue;
      const cur = map.get(log.date) ?? { count: 0, titles: [] };
      cur.count += 1;
      cur.titles.push(habit.title);
      map.set(log.date, cur);
    }
    return map;
  }, [logs, habitById]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  );

  const selectedDetail = selected ? completedByDate.get(selected) : undefined;

  const goPrev = () => {
    setCursor((c) => {
      const nm = c.m - 1;
      if (nm < 0) return { y: c.y - 1, m: 11 };
      return { y: c.y, m: nm };
    });
    setSelected(null);
  };

  const goNext = () => {
    setCursor((c) => {
      const nm = c.m + 1;
      if (nm > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m: nm };
    });
    setSelected(null);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#60a5fa" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <View className="border-b border-neutral-200 bg-neutral-50 px-5 pb-4 pt-2 dark:border-neutral-800 dark:bg-neutral-950">
        <Text className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          History
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Days with at least one habit completed. Week starts Monday.
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={goPrev}
            className="rounded-full bg-neutral-200 p-2 dark:bg-neutral-800"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#60a5fa" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {monthTitle(cursor.y, cursor.m)}
          </Text>
          <Pressable
            onPress={goNext}
            className="rounded-full bg-neutral-200 p-2 dark:bg-neutral-800"
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={22} color="#60a5fa" />
          </Pressable>
        </View>

        <View className="mb-2 flex-row">
          {WEEKDAY_LABELS.map((d, i) => (
            <View key={`${d}-${i}`} className="flex-1 items-center py-1">
              <Text className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                {d}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {grid.map((cell, idx) => (
            <View
              key={idx}
              className="mb-1"
              style={{ width: `${100 / 7}%` }}
            >
              {cell.kind === "empty" ? (
                <View className="aspect-square p-0.5" />
              ) : (
                <Pressable
                  onPress={() =>
                    setSelected((s) => (s === cell.date ? null : cell.date))
                  }
                  className={`m-0.5 aspect-square items-center justify-center rounded-xl border ${
                    selected === cell.date
                      ? "border-blue-500 bg-blue-500/15 dark:bg-blue-500/25"
                      : "border-transparent"
                  } ${
                    (completedByDate.get(cell.date)?.count ?? 0) > 0
                      ? "bg-emerald-500/20 dark:bg-emerald-500/30"
                      : "bg-neutral-200/60 dark:bg-neutral-800/80"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected === cell.date
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-neutral-800 dark:text-neutral-100"
                    }`}
                  >
                    {cell.dayOfMonth}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View className="mt-6 flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="h-3 w-3 rounded-full bg-emerald-500" />
          <Text className="flex-1 text-sm text-neutral-600 dark:text-neutral-300">
            Green = at least one habit checked that day.
          </Text>
        </View>

        {selected && (
          <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {selected}
            </Text>
            {selectedDetail && selectedDetail.count > 0 ? (
              <>
                <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {selectedDetail.count} completed
                </Text>
                <View className="mt-3 gap-2">
                  {[...new Set(selectedDetail.titles)].map((t) => (
                    <Text
                      key={t}
                      className="text-sm text-neutral-800 dark:text-neutral-200"
                    >
                      • {t}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                No completions logged this day.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
