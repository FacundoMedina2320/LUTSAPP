import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Login() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Login</Text>
      <Pressable onPress={() => router.replace("/(tabs)")} style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "700" }}>Login (mock)</Text>
      </Pressable>
    </View>
  );
}