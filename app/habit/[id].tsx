import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  dateFromTimeHHmm,
  parseTodayTimeHHmm,
  toTimeHHmm,
} from "@/lib/date";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { getHabitById, updateHabit } from "@/lib/habitsStorage";

export default function EditHabitScreen() {
  const colorScheme = useColorScheme();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = typeof rawId === "string" ? rawId : rawId?.[0];

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [webTime, setWebTime] = useState("09:00");
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }
    const habit = await getHabitById(id);
    if (!habit) {
      Alert.alert("Not found", "This habit no longer exists.");
      router.back();
      return;
    }
    setTitle(habit.title);
    const t = dateFromTimeHHmm(habit.time);
    setTime(t);
    setWebTime(habit.time);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTimePicker = () => {
    if (Platform.OS === "web") return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: time,
        mode: "time",
        is24Hour: true,
        onChange: (e, picked) => {
          if (e.type === "set" && picked) setTime(picked);
        },
      });
      return;
    }
    setIosPickerOpen(true);
  };

  const save = async () => {
    if (!id) return;
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("Title required", "Give your habit a short name.");
      return;
    }

    let timeDate = time;
    if (Platform.OS === "web") {
      const parsed = parseTodayTimeHHmm(webTime);
      if (!parsed) {
        Alert.alert("Invalid time", "Use 24h format HH:mm (e.g. 09:30).");
        return;
      }
      timeDate = parsed;
    }

    setSaving(true);
    try {
      await updateHabit(id, { title: trimmed, time: toTimeHHmm(timeDate) });
      await syncHabitNotifications();
      router.back();
    } catch (e) {
      Alert.alert(
        "Could not save",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !id) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-5 pt-2">
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            Update title or reminder time.
          </Text>

          <Text className="mb-1.5 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning run"
            placeholderTextColor="#a3a3a3"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
            editable={!saving}
            returnKeyType="next"
          />

          <Text className="mb-1.5 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Time
          </Text>
          {Platform.OS === "web" ? (
            <TextInput
              value={webTime}
              onChangeText={setWebTime}
              placeholder="HH:mm"
              placeholderTextColor="#a3a3a3"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
              editable={!saving}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          ) : (
            <Pressable
              onPress={openTimePicker}
              disabled={saving}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5 active:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800"
            >
              <Text className="text-base tabular-nums text-neutral-900 dark:text-neutral-50">
                {toTimeHHmm(time)}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            className="mt-auto mb-4 items-center rounded-xl bg-blue-600 py-4 active:bg-blue-700 disabled:opacity-50"
          >
            <Text className="text-base font-semibold text-white">
              {saving ? "Saving…" : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === "ios" && (
        <Modal
          visible={iosPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIosPickerOpen(false)}
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setIosPickerOpen(false)}
          >
            <Pressable
              className="rounded-t-2xl bg-white px-4 pb-6 pt-3 dark:bg-neutral-900"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Time
                </Text>
                <Pressable
                  onPress={() => setIosPickerOpen(false)}
                  hitSlop={12}
                >
                  <Text className="text-base font-semibold text-blue-600">
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                themeVariant={colorScheme === "dark" ? "dark" : "light"}
                onChange={(_, picked) => {
                  if (picked) setTime(picked);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}
