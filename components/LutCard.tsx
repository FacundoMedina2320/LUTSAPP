import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function LutCard({ lut, onPress }: any) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: lut.image }} style={styles.image} />

      <View style={styles.row}>
        <Text style={styles.name}>{lut.name}</Text>
        {lut.premium && <Text style={styles.lock}>🔒</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: 280,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
  },
  lock: {
    fontSize: 16,
  },
});
