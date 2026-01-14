import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

type LutCardLut = {
  id: string;
  name: string;
  premium: boolean;
  beforeUri?: string | null;
  afterUri?: string | null;
  category?: string;
};

type Props = {
  lut?: LutCardLut;
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function LutCard({ lut, onPress, containerStyle }: Props) {
  if (!lut) return null; // ✅ evita el error afterUri

  const img = lut.afterUri || lut.beforeUri || "";
  const hasImage = Boolean(img);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, containerStyle, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.mediaWrap}>
        {hasImage ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Preview unavailable</Text>
          </View>
        )}
        {lut.premium && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {lut.name}
          </Text>
        </View>

        {!!lut.category && <Text style={styles.category}>{lut.category}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 18,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.04,
  },
  mediaWrap: { position: "relative" },
  image: { width: "100%", height: 240, backgroundColor: "#e6e9ef" },
  placeholder: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef1f6",
  },
  placeholderText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  info: { padding: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 6 },
  category: { marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: "600" },
});
