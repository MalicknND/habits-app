import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type ThemePreference,
  useAppTheme,
} from "@/context/AppTheme";
import type { AppSettings } from "@/lib/appSettings";
import { getAppSettings, saveAppSettings } from "@/lib/appSettings";
import { syncHabitNotifications } from "@/lib/habitNotifications";
import { getAppChrome } from "@/lib/screenBackground";
import type { TimeHHmm } from "@/types";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  hint: string;
}[] = [
  {
    value: "system",
    label: "Automatique",
    hint: "Suit le thème du téléphone (clair / sombre).",
  },
  {
    value: "light",
    label: "Clair",
    hint: "Toujours afficher le thème clair.",
  },
  {
    value: "dark",
    label: "Sombre",
    hint: "Toujours afficher le thème sombre.",
  },
];

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export default function SettingsScreen() {
  const { preference, setPreference, resolvedScheme } = useAppTheme();
  const c = useMemo(() => getAppChrome(resolvedScheme), [resolvedScheme]);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [followUpInput, setFollowUpInput] = useState("22:00");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await getAppSettings();
    setAppSettings(s);
    setFollowUpInput(s.followUpTime);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let a = true;
      void (async () => {
        setLoading(true);
        try {
          await load();
        } finally {
          if (a) setLoading(false);
        }
      })();
      return () => {
        a = false;
      };
    }, [load]),
  );

  const patchSettings = async (patch: Partial<AppSettings>) => {
    const next = await saveAppSettings(patch);
    setAppSettings(next);
    await syncHabitNotifications();
  };

  const commitFollowUpTime = async () => {
    const t = followUpInput.trim();
    const m = TIME_RE.exec(t);
    if (!m) {
      Alert.alert("Heure invalide", "Utilisez le format 24h HH:mm (ex. 22:00).");
      setFollowUpInput(appSettings?.followUpTime ?? "22:00");
      return;
    }
    const hh = `${m[1]!.padStart(2, "0")}:${m[2]!.padStart(2, "0")}` as TimeHHmm;
    await patchSettings({ followUpTime: hh });
  };

  const rowBase = {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  if (loading || !appSettings) {
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
          Réglages
        </Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: c.textSubtle }}>
          Thème actuel côté app :{" "}
          <Text style={{ fontWeight: "600", color: c.text }}>
            {resolvedScheme === "dark" ? "sombre" : "clair"}
          </Text>
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 28 }}>
        <View>
          <Text
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: c.textMuted,
            }}
          >
            Apparence
          </Text>
          <View style={{ gap: 8 }}>
            {THEME_OPTIONS.map((opt) => {
              const selected = preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => void setPreference(opt.value)}
                  style={{
                    ...rowBase,
                    borderColor: selected ? "#3b82f6" : c.border,
                    backgroundColor: selected ? c.cardPressed : c.card,
                  }}
                >
                  <View style={{ marginTop: 2 }}>
                    <Ionicons
                      name={selected ? "radio-button-on" : "radio-button-off"}
                      size={22}
                      color={selected ? "#60a5fa" : c.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>
                      {opt.label}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: c.textSubtle }}>
                      {opt.hint}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: c.textMuted,
            }}
          >
            Discipline & rappels
          </Text>
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => void patchSettings({ strictMode: !appSettings.strictMode })}
              style={{
                ...rowBase,
                borderColor: appSettings.strictMode ? "#b45309" : c.border,
                backgroundColor: c.card,
              }}
            >
              <View style={{ marginTop: 2 }}>
                <Ionicons
                  name={appSettings.strictMode ? "checkbox" : "square-outline"}
                  size={22}
                  color={appSettings.strictMode ? "#b45309" : c.textMuted}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>
                  Mode discipline stricte
                </Text>
                <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: c.textSubtle }}>
                  Pas d’annulation une fois coché. Streak « strict » : tous les jours, toutes les habitudes — un trou casse la série.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                void patchSettings({ followUpReminders: !appSettings.followUpReminders })
              }
              style={{
                ...rowBase,
                borderColor: c.border,
                backgroundColor: c.card,
              }}
            >
              <View style={{ marginTop: 2 }}>
                <Ionicons
                  name={appSettings.followUpReminders ? "checkbox" : "square-outline"}
                  size={22}
                  color={appSettings.followUpReminders ? "#60a5fa" : c.textMuted}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: c.text }}>
                  Rappel de relance (soir)
                </Text>
                <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: c.textSubtle }}>
                  Si une habitude n’est pas cochée aujourd’hui, une notification à l’heure choisie (iOS / Android uniquement).
                </Text>
              </View>
            </Pressable>

            {appSettings.followUpReminders ? (
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.card,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", color: c.textMuted }}>
                  Heure de relance (HH:mm)
                </Text>
                <TextInput
                  value={followUpInput}
                  onChangeText={setFollowUpInput}
                  onBlur={() => void commitFollowUpTime()}
                  placeholder="22:00"
                  placeholderTextColor={c.hint}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.inputBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: c.text,
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
