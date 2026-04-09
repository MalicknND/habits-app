import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type ThemePreference,
  useAppTheme,
} from "@/context/AppTheme";
import { appScreenBackground } from "@/lib/screenBackground";

const OPTIONS: {
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

export default function SettingsScreen() {
  const { preference, setPreference, resolvedScheme } = useAppTheme();
  const isDark = resolvedScheme === "dark";
  const bg = appScreenBackground(resolvedScheme);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: bg }}
      edges={["top"]}
    >
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "#262626" : "#e5e5e5",
          backgroundColor: bg,
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: 8,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: isDark ? "#fafafa" : "#171717",
          }}
        >
          Réglages
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 14,
            color: isDark ? "#a3a3a3" : "#737373",
          }}
        >
          Thème actuel côté app :{" "}
          <Text
            style={{
              fontWeight: "600",
              color: isDark ? "#e5e5e5" : "#262626",
            }}
          >
            {isDark ? "sombre" : "clair"}
          </Text>
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <Text
          style={{
            marginBottom: 12,
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: isDark ? "#a3a3a3" : "#737373",
          }}
        >
          Apparence
        </Text>
        <View style={{ gap: 8 }}>
          {OPTIONS.map((opt) => {
            const selected = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => void setPreference(opt.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selected
                    ? "#3b82f6"
                    : isDark
                      ? "#404040"
                      : "#e5e5e5",
                  backgroundColor: selected
                    ? isDark
                      ? "rgba(59, 130, 246, 0.2)"
                      : "rgba(59, 130, 246, 0.1)"
                    : isDark
                      ? "#171717"
                      : "#ffffff",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              >
                <View style={{ marginTop: 2 }}>
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={selected ? "#60a5fa" : "#a3a3a3"}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: isDark ? "#fafafa" : "#171717",
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      lineHeight: 20,
                      color: isDark ? "#a3a3a3" : "#737373",
                    }}
                  >
                    {opt.hint}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
