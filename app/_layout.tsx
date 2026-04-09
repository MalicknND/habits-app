import { Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="habit/[id]"
        options={{
          headerShown: true,
          title: "Edit habit",
          presentation: "modal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#fafafa" },
          headerTintColor: "#2563eb",
        }}
      />
    </Stack>
  );
}
