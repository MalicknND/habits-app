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

import { useAppTheme } from "@/context/AppTheme";
import { buildMonthGrid, WEEKDAY_LABELS } from "@/lib/monthGrid";
import { getAppChrome } from "@/lib/screenBackground";
import { getHabitLogs, getHabits } from "@/lib/habitsStorage";
import type { DateYMD, Habit, HabitLog } from "@/types";

function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

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
    const map = new Map<DateYMD, { count: number; titles: string[] }>();
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
    setCursor((co) => {
      const nm = co.m - 1;
      if (nm < 0) return { y: co.y - 1, m: 11 };
      return { y: co.y, m: nm };
    });
    setSelected(null);
  };

  const goNext = () => {
    setCursor((co) => {
      const nm = co.m + 1;
      if (nm > 11) return { y: co.y + 1, m: 0 };
      return { y: co.y, m: nm };
    });
    setSelected(null);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", alignItems: "center" }}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color="#60a5fa" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          backgroundColor: c.bg,
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: 8,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", color: c.text }}>History</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: c.textMuted }}>
          Days with at least one habit completed. Week starts Monday.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16, backgroundColor: c.bg }}
      >
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={goPrev}
            style={{ borderRadius: 999, backgroundColor: c.chip, padding: 8 }}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#60a5fa" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "600", color: c.text }}>
            {monthTitle(cursor.y, cursor.m)}
          </Text>
          <Pressable
            onPress={goNext}
            style={{ borderRadius: 999, backgroundColor: c.chip, padding: 8 }}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={22} color="#60a5fa" />
          </Pressable>
        </View>

        <View style={{ marginBottom: 8, flexDirection: "row" }}>
          {WEEKDAY_LABELS.map((d, i) => (
            <View key={`${d}-${i}`} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "500", color: c.hint }}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {grid.map((cell, idx) => (
            <View key={idx} style={{ marginBottom: 4, width: `${100 / 7}%` }}>
              {cell.kind === "empty" ? (
                <View style={{ aspectRatio: 1, padding: 2 }} />
              ) : (
                <Pressable
                  onPress={() => setSelected((s) => (s === cell.date ? null : cell.date))}
                  style={{
                    margin: 2,
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: selected === cell.date ? 2 : 0,
                    borderColor: selected === cell.date ? c.selectedDayBorder : "transparent",
                    backgroundColor:
                      selected === cell.date
                        ? c.selectedDayBg
                        : (completedByDate.get(cell.date)?.count ?? 0) > 0
                          ? c.doneDay
                          : c.emptyDay,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: selected === cell.date ? c.selectedDayText : c.dayText,
                    }}
                  >
                    {cell.dayOfMonth}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: 24,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.legendBg,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View style={{ height: 12, width: 12, borderRadius: 999, backgroundColor: "#10b981" }} />
          <Text style={{ flex: 1, fontSize: 14, color: c.textSubtle }}>
            Green = at least one habit checked that day.
          </Text>
        </View>

        {selected && (
          <View
            style={{
              marginTop: 24,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.legendBg,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>{selected}</Text>
            {selectedDetail && selectedDetail.count > 0 ? (
              <>
                <Text style={{ marginTop: 4, fontSize: 14, color: c.textMuted }}>
                  {selectedDetail.count} completed
                </Text>
                <View style={{ marginTop: 12 }}>
                  {[...new Set(selectedDetail.titles)].map((t, i) => (
                    <Text
                      key={t}
                      style={{ fontSize: 14, color: c.textSubtle, marginTop: i > 0 ? 8 : 0 }}
                    >
                      • {t}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={{ marginTop: 8, fontSize: 14, color: c.textMuted }}>
                No completions logged this day.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
