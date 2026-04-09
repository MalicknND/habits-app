import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function TabsLayout() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#60a5fa",
        tabBarInactiveTintColor: dark ? "#a3a3a3" : "#737373",
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: dark ? "#0a0a0a" : "#fafafa",
        },
        headerTintColor: dark ? "#fafafa" : "#171717",
        tabBarStyle: {
          backgroundColor: dark ? "#0a0a0a" : "#fafafa",
          borderTopColor: dark ? "#262626" : "#e5e5e5",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "New habit",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
