import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
import {
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

import { parseTodayTimeHHmm, toTimeHHmm } from "@/lib/date";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { addHabit } from "@/lib/habitsStorage";

function defaultTimeDate(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function AddHabitScreen() {
  const colorScheme = useColorScheme();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(defaultTimeDate);
  const [webTime, setWebTime] = useState("09:00");
  const [iosPickerOpen, setIosPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      await addHabit({ title: trimmed, time: toTimeHHmm(timeDate) });
      await syncHabitNotifications();
      setTitle("");
      setTime(defaultTimeDate());
      setWebTime("09:00");
      router.push("/");
    } catch (e) {
      Alert.alert(
        "Could not save",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      edges={["top"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-5 pt-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            New habit
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Name it and pick a daily reminder time.
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
            className="mt-auto mb-6 items-center rounded-xl bg-blue-600 py-4 active:bg-blue-700 disabled:opacity-50"
          >
            <Text className="text-base font-semibold text-white">
              {saving ? "Saving…" : "Save habit"}
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
