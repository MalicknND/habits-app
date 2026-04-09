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
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { localDateYMD } from "@/lib/date";
import { getAppChrome } from "@/lib/screenBackground";
import type { Habit } from "@/types";
import {
  deleteHabit,
  getHabitLogs,
  getTodayHabits,
  toggleHabitCompletion,
  type TodayHabitRow,
} from "@/lib/habitsStorage";
import { maxStreakAcrossHabits } from "@/lib/streak";

export default function HomeScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

  const [rows, setRows] = useState<TodayHabitRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const todayRows = await getTodayHabits();
    const logs = await getHabitLogs();
    const today = localDateYMD();
    setRows(todayRows);
    setStreak(
      maxStreakAcrossHabits(
        todayRows.map((r) => r.habit),
        logs,
        today,
      ),
    );
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
      await refresh();
    } catch (e) {
      Alert.alert(
        "Update failed",
        e instanceof Error ? e.message : "Could not save completion.",
      );
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
          Streak{" "}
          <Text style={{ fontWeight: "600", color: c.text }}>🔥 {streak} day{streak === 1 ? "" : "s"}</Text>
        </Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: c.hint }}>
          Long press a habit to edit or delete.
        </Text>
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
                <Text style={{ flex: 1, fontSize: 16, fontWeight: "500", color: c.text }} numberOfLines={2}>
                  {item.habit.title}
                </Text>
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
