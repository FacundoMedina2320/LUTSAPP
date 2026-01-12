import { StyleSheet, Text, View } from "react-native";

export default function Library() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Library</Text>
      <Text>No LUTs downloaded yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
});
