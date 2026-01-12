import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import LutCard from "../../components/LutCard";

const LUTS = [
  { id: "1", name: "Cinematic Gold", image: "https://picsum.photos/500/700?1", premium: true },
  { id: "2", name: "Moody Night", image: "https://picsum.photos/500/700?2", premium: false },
];

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LUTs</Text>

      <FlatList
        data={LUTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LutCard lut={item} onPress={() => router.push(`/lut/${item.id}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: "600", marginVertical: 20 },
});
