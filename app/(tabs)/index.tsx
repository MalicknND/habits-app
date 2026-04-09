import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { localDateYMD } from "@/lib/date";
import {
  getHabitLogs,
  getTodayHabits,
  toggleHabitCompletion,
  type TodayHabitRow,
} from "@/lib/habitsStorage";
import { maxStreakAcrossHabits } from "@/lib/streak";

export default function HomeScreen() {
  const [rows, setRows] = useState<TodayHabitRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [todayRows, logs] = await Promise.all([
      getTodayHabits(),
      getHabitLogs(),
    ]);
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top"]}>
      <View className="border-b border-neutral-200 bg-neutral-50 px-5 pb-4 pt-2">
        <Text className="text-2xl font-bold tracking-tight text-neutral-900">
          Today
        </Text>
        <Text className="mt-1 text-base text-neutral-600">
          Streak{" "}
          <Text className="font-semibold text-neutral-900">
            🔥 {streak} day{streak === 1 ? "" : "s"}
          </Text>
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.habit.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 28,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-center text-base text-neutral-600">
              No habits yet.
            </Text>
            <Text className="mt-2 text-center text-sm text-neutral-500">
              Open the Add tab to create your first one.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => {
          const disabled = busyId === item.habit.id;
          return (
            <Pressable
              disabled={disabled}
              onPress={() => onToggle(item.habit.id)}
              className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 active:bg-neutral-100"
            >
              <View
                className={`h-7 w-7 items-center justify-center rounded-lg border-2 ${
                  item.completed
                    ? "border-blue-600 bg-blue-600"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {item.completed ? (
                  <Text className="text-sm font-bold text-white">✓</Text>
                ) : null}
              </View>
              <View className="min-w-0 flex-1 flex-row items-center justify-between gap-3">
                <Text
                  className="flex-1 text-base font-medium text-neutral-900"
                  numberOfLines={2}
                >
                  {item.habit.title}
                </Text>
                <Text className="shrink-0 text-sm tabular-nums text-neutral-500">
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
