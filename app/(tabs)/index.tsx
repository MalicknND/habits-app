import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/AppTheme";
import { getAppSettings } from "@/lib/appSettings";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { localDateYMD } from "@/lib/date";
import { getAppChrome } from "@/lib/screenBackground";
import {
  disciplineScore,
  sortTodayRowsByPriority,
} from "@/lib/services/habitService";
import {
  maxStreakAcrossHabits,
  strictMasterStreak,
} from "@/lib/services/streakService";
import type { Habit, HabitPriority } from "@/types";
import {
  deleteHabit,
  getHabitLogs,
  getTodayHabits,
  toggleHabitCompletion,
  type TodayHabitRow,
} from "@/lib/habitsStorage";

function priorityLabel(p: HabitPriority): string {
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Med";
}

function priorityBadgeColor(p: HabitPriority): string {
  if (p === "high") return "#dc2626";
  if (p === "low") return "#64748b";
  return "#ca8a04";
}

export default function HomeScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

  const [rows, setRows] = useState<TodayHabitRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [strictStreak, setStrictStreak] = useState(0);
  const [strictMode, setStrictMode] = useState(false);
  const [discipline, setDiscipline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const todayRows = await getTodayHabits();
    const logs = await getHabitLogs();
    const today = localDateYMD();
    const habits = todayRows.map((r) => r.habit);
    const sorted = sortTodayRowsByPriority(todayRows);
    const settings = await getAppSettings();
    setRows(sorted);
    setDiscipline(disciplineScore(sorted));
    setStrictMode(settings.strictMode);
    setStreak(maxStreakAcrossHabits(habits, logs, today));
    setStrictStreak(strictMasterStreak(habits, logs, today));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        try {
          await refresh();
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [refresh]),
  );

  const onToggle = async (habitId: string) => {
    setBusyId(habitId);
    try {
      await toggleHabitCompletion(habitId);
      await syncHabitNotifications();
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save completion.";
      Alert.alert("Update failed", msg);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (habit: Habit) => {
    Alert.alert(
      "Delete habit?",
      `“${habit.title}” and its history will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteHabit(habit.id);
                await syncHabitNotifications();
                await refresh();
              } catch (e) {
                Alert.alert(
                  "Error",
                  e instanceof Error ? e.message : "Could not delete.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const showRowMenu = (habit: Habit) => {
    Alert.alert(habit.title, "Edit or delete this habit.", [
      {
        text: "Edit",
        onPress: () => router.push(`/habit/${habit.id}`),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDelete(habit),
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
        <Text style={{ fontSize: 24, fontWeight: "700", color: c.text }}>
          Today
        </Text>
        <Text style={{ marginTop: 4, fontSize: 16, color: c.textSubtle }}>
          Discipline{" "}
          <Text style={{ fontWeight: "700", color: c.text }}>
            {discipline === null ? "—" : `${discipline}%`}
          </Text>
          {rows.length > 0 ? (
            <Text style={{ color: c.textMuted }}>
              {" "}
              ({rows.filter((r) => r.completed).length}/{rows.length})
            </Text>
          ) : null}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 16, color: c.textSubtle }}>
          Streak{" "}
          <Text style={{ fontWeight: "600", color: c.text }}>🔥 {streak} day{streak === 1 ? "" : "s"}</Text>
          {strictMode ? (
            <Text style={{ color: c.textSubtle }}>
              {" · "}
              <Text style={{ fontWeight: "600", color: "#b45309" }}>
                Strict {strictStreak}d
              </Text>
            </Text>
          ) : null}
        </Text>
        {strictMode ? (
          <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 18, color: "#b45309", fontWeight: "500" }}>
            Strict discipline: you cannot undo a completed habit. Every habit must be done every day — one miss breaks the strict streak.
          </Text>
        ) : (
          <Text style={{ marginTop: 8, fontSize: 12, color: c.hint }}>
            Long press a habit to edit or delete.
          </Text>
        )}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.habit.id}
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 28,
          flexGrow: 1,
          backgroundColor: c.bg,
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 64 }}>
            <Text style={{ textAlign: "center", fontSize: 16, color: c.textSubtle }}>
              No habits yet.
            </Text>
            <Text style={{ marginTop: 8, textAlign: "center", fontSize: 14, color: c.textMuted }}>
              Open the Add tab to create your first one.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const disabled = busyId === item.habit.id;
          const pr = item.habit.priority;
          return (
            <Pressable
              disabled={disabled}
              onPress={() => onToggle(item.habit.id)}
              onLongPress={() => showRowMenu(item.habit)}
              delayLongPress={380}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.cardPressed : c.card,
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: disabled ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  height: 28,
                  width: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: item.completed ? "#2563eb" : c.checkBorder,
                  backgroundColor: item.completed ? "#2563eb" : c.inputBg,
                }}
              >
                {item.completed ? (
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>✓</Text>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: `${priorityBadgeColor(pr)}22`,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: priorityBadgeColor(pr) }}>
                      {priorityLabel(pr).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: c.text }} numberOfLines={2}>
                    {item.habit.title}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: c.textMuted }}>
                  {item.habit.time}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
