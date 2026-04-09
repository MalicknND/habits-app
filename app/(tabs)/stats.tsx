import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/AppTheme";
import { getAppSettings } from "@/lib/appSettings";
import { localDateYMD } from "@/lib/date";
import { getHabitLogs, getHabits, getTodayHabits } from "@/lib/habitsStorage";
import {
  completionRateLastNDays,
  disciplineScore,
  mostMissedHabits,
  sortTodayRowsByPriority,
} from "@/lib/services/habitService";
import {
  maxBestStreakAcrossHabits,
  maxStreakAcrossHabits,
  strictMasterStreak,
} from "@/lib/services/streakService";
import { getAppChrome } from "@/lib/screenBackground";

export default function StatsScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

  const [loading, setLoading] = useState(true);
  const [strict, setStrict] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [strictStreak, setStrictStreak] = useState(0);
  const [rate7, setRate7] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [missed, setMissed] = useState<
    { habit: { id: string; title: string }; missedDays: number }[]
  >([]);

  const refresh = useCallback(async () => {
    const today = localDateYMD();
    const [habits, logs, rows, settings] = await Promise.all([
      getHabits(),
      getHabitLogs(),
      getTodayHabits(),
      getAppSettings(),
    ]);
    setStrict(settings.strictMode);
    const sorted = sortTodayRowsByPriority(rows);
    setScore(disciplineScore(sorted));
    setCurrentStreak(maxStreakAcrossHabits(habits, logs, today));
    setBestStreak(maxBestStreakAcrossHabits(habits, logs, today));
    setStrictStreak(strictMasterStreak(habits, logs, today));
    setRate7(completionRateLastNDays(habits, logs, today, 7));
    setMissed(mostMissedHabits(habits, logs, today, 7, 5));
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

  const card = {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    padding: 16,
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
        <Text style={{ fontSize: 24, fontWeight: "700", color: c.text }}>Stats</Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: c.textSubtle }}>
          Summary and trends for the last week.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
          backgroundColor: c.bg,
        }}
      >
        <View style={{ gap: 12 }}>
          <View style={card}>
            <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: c.textMuted }}>
              Today discipline
            </Text>
            <Text style={{ marginTop: 8, fontSize: 32, fontWeight: "800", color: c.text }}>
              {score === null ? "—" : `${score}%`}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 14, color: c.textSubtle }}>
              Completed habits / total for today.
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={[card, { flex: 1, minWidth: "45%" }]}>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Current streak</Text>
              <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "700", color: c.text }}>
                🔥 {currentStreak}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: c.textSubtle }}>Best single habit</Text>
            </View>
            <View style={[card, { flex: 1, minWidth: "45%" }]}>
              <Text style={{ fontSize: 12, color: c.textMuted }}>Best streak ever</Text>
              <Text style={{ marginTop: 6, fontSize: 22, fontWeight: "700", color: c.text }}>
                🏆 {bestStreak}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: c.textSubtle }}>Longest run recorded</Text>
            </View>
          </View>

          {strict ? (
            <View style={[card, { borderColor: "#b45309", backgroundColor: resolvedScheme === "dark" ? "rgba(180, 83, 9, 0.15)" : "rgba(251, 191, 36, 0.2)" }]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#b45309" }}>Strict discipline</Text>
              <Text style={{ marginTop: 8, fontSize: 26, fontWeight: "800", color: c.text }}>
                {strictStreak} day{strictStreak === 1 ? "" : "s"}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 18, color: c.textSubtle }}>
                Consecutive days where every habit was completed. One miss breaks the chain.
              </Text>
            </View>
          ) : null}

          <View style={card}>
            <Text style={{ fontSize: 12, color: c.textMuted }}>7-day completion rate</Text>
            <Text style={{ marginTop: 8, fontSize: 28, fontWeight: "800", color: c.text }}>
              {rate7 === null ? "—" : `${rate7}%`}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: c.textSubtle }}>
              All check-ins over the last 7 days vs possible slots (habits that existed each day).
            </Text>
          </View>

          <View style={card}>
            <Text style={{ fontSize: 12, color: c.textMuted }}>Most missed (7 days)</Text>
            {missed.length === 0 ? (
              <Text style={{ marginTop: 10, fontSize: 15, color: c.textSubtle }}>
                No misses in this window — nice work.
              </Text>
            ) : (
              <View style={{ marginTop: 10, gap: 10 }}>
                {missed.map(({ habit, missedDays }) => (
                  <View
                    key={habit.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.text }} numberOfLines={2}>
                      {habit.title}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#dc2626" }}>
                      {missedDays} missed
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
