import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HowToImport() {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Text style={styles.back}>Back</Text>
      </Pressable>

      <Text style={styles.title}>How to import LUTs</Text>
      <Text style={styles.sub}>Blackmagic Camera (iPhone)</Text>

      <View style={styles.card}>
        <Text style={styles.step}><Text style={styles.bold}>1.</Text> Download the LUT (.cube) from this app</Text>
        <Text style={styles.step}><Text style={styles.bold}>2.</Text> Open Files and locate the .cube</Text>
        <Text style={styles.step}><Text style={styles.bold}>3.</Text> Open Blackmagic Camera</Text>
        <Text style={styles.step}><Text style={styles.bold}>4.</Text> Settings → LUTs → Import LUT → Browse</Text>
        <Text style={styles.step}><Text style={styles.bold}>5.</Text> Select the .cube and apply it</Text>
      </View>

      <Text style={styles.note}>
        Tip: keep your LUTs in a “LUTs” folder in Files to find them faster.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  back: { color: "#111", fontWeight: "700", marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  sub: { fontSize: 13, color: "#666", marginBottom: 14 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#fafafa",
    borderRadius: 20,
    padding: 14,
  },
  step: { fontSize: 14, color: "#111", marginBottom: 10, lineHeight: 20 },
  bold: { fontWeight: "800" },
  note: { marginTop: 12, fontSize: 12, color: "#666", lineHeight: 16 },
});
