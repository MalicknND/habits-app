import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6">
      <Text className="text-lg font-semibold text-neutral-900">Today</Text>
      <Text className="mt-2 text-center text-sm text-neutral-500">
        Habits for today will appear here.
      </Text>
    </View>
  );
}
