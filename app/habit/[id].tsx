import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  dateFromTimeHHmm,
  parseTodayTimeHHmm,
  toTimeHHmm,
} from "@/lib/date";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { getHabitById, updateHabit } from "@/lib/habitsStorage";
import { getAppChrome } from "@/lib/screenBackground";

export default function EditHabitScreen() {
  const { resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

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

  if (loading || !id) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, backgroundColor: c.bg }}>
          <Text style={{ fontSize: 14, color: c.textMuted }}>
            Update title or reminder time.
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
              marginBottom: 16,
              alignItems: "center",
              borderRadius: 12,
              backgroundColor: "#2563eb",
              paddingVertical: 16,
              opacity: saving ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
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
