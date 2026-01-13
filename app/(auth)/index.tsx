import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AuthIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cinematic LUTs</Text>
      <Text style={styles.sub}>
        Download LUTs to your phone and import them into Blackmagic Camera.
      </Text>

      <Pressable style={styles.btn} onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.btnText}>Continue</Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.link}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" },
  title: { fontSize: 34, fontWeight: "700", color: "#111", marginBottom: 10 },
  sub: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 22 },
  btn: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  linkBtn: { paddingVertical: 14, alignItems: "center" },
  link: { color: "#111", fontWeight: "700" },
});
