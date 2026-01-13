import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function Paywall() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium required</Text>
      <Text style={styles.sub}>
        Subscribe or buy this LUT to unlock premium content.
      </Text>

      <Pressable style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#111" },
  sub: { marginTop: 10, color: "#666", lineHeight: 20 },
  btn: { marginTop: 18, backgroundColor: "#111", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
