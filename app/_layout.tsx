import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AppThemeProvider, useAppTheme } from "@/context/AppTheme";
import {
  configureNotificationHandler,
  syncHabitNotifications,
} from "@/lib/habitNotifications";

import "./global.css";

configureNotificationHandler();

function RootStack() {
  const { resolvedScheme } = useAppTheme();
  const dark = resolvedScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="habit/[id]"
        options={{
          headerShown: true,
          title: "Edit habit",
          presentation: "modal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: dark ? "#171717" : "#fafafa" },
          headerTintColor: "#60a5fa",
          headerTitleStyle: { color: dark ? "#fafafa" : "#171717" },
        }}
      />
    </Stack>
  );
}

function RootLayoutInner() {
  const { resolvedScheme } = useAppTheme();
  const dark = resolvedScheme === "dark";

  useEffect(() => {
    void syncHabitNotifications();
  }, []);

  return (
    <View
      className={dark ? "dark flex-1" : "flex-1"}
      style={{
        flex: 1,
        backgroundColor: dark ? "#0a0a0a" : "#fafafa",
      }}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <RootStack />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
