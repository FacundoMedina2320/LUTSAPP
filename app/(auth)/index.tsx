import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function AuthIndex() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Welcome</Text>
      <Pressable onPress={() => router.push("/(auth)/login")} style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700" }}>Go to Login</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/(tabs)")} style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700" }}>Skip</Text>
      </Pressable>
    </View>
  );
}