import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/AppTheme";
import { parseTodayTimeHHmm, toTimeHHmm } from "@/lib/date";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { addHabit } from "@/lib/habitsStorage";
import { getAppChrome } from "@/lib/screenBackground";

function defaultTimeDate(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function AddHabitScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

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

  const inputStyle = {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.text,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, backgroundColor: c.bg }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: c.text }}>New habit</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: c.textMuted }}>
            Name it and pick a daily reminder time.
          </Text>

          <Text style={{ marginBottom: 6, marginTop: 32, fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: c.textMuted }}>
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Morning run"
            placeholderTextColor={c.hint}
            style={inputStyle}
            editable={!saving}
            returnKeyType="next"
          />

          <Text style={{ marginBottom: 6, marginTop: 24, fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: c.textMuted }}>
            Time
          </Text>
          {Platform.OS === "web" ? (
            <TextInput
              value={webTime}
              onChangeText={setWebTime}
              placeholder="HH:mm"
              placeholderTextColor={c.hint}
              style={inputStyle}
              editable={!saving}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
          ) : (
            <Pressable
              onPress={openTimePicker}
              disabled={saving}
              style={({ pressed }) => ({
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.cardPressed : c.inputBg,
                paddingHorizontal: 16,
                paddingVertical: 14,
              })}
            >
              <Text style={{ fontSize: 16, color: c.text }}>{toTimeHHmm(time)}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={{
              marginTop: "auto",
              marginBottom: 24,
              alignItems: "center",
              borderRadius: 12,
              backgroundColor: "#2563eb",
              paddingVertical: 16,
              opacity: saving ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
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
            style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
            onPress={() => setIosPickerOpen(false)}
          >
            <Pressable
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                backgroundColor: resolvedScheme === "dark" ? "#171717" : "#fff",
                paddingHorizontal: 16,
                paddingBottom: 24,
                paddingTop: 12,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>Time</Text>
                <Pressable onPress={() => setIosPickerOpen(false)} hitSlop={12}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#60a5fa" }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                themeVariant={resolvedScheme === "dark" ? "dark" : "light"}
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
