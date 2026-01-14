import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import LutCard from "../../components/LutCard";

type LutRow = {
  id: string;
  name: string;
  category: string;
  premium: boolean;
  before_url: string | null;
  after_url: string | null;
  downloads_count: number | null;
  rating_avg: number | null;
};

type LibraryRow = {
  created_at: string;
  luts: LutRow | null; // viene del join alias luts:lut_id(...)
};

export default function Library() {
  const [loading, setLoading] = useState<boolean>(false);
  const [items, setItems] = useState<LutRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const numColumns = width >= 720 ? 3 : width >= 520 ? 2 : 1;
  const cardGap = 14;
  const sidePadding = 16;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        Alert.alert("Login required", "Please log in to see your library.");
        router.push("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_library")
        .select(
          "created_at, luts:lut_id ( id, name, category, premium, before_url, after_url, downloads_count, rating_avg )"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = ((data as unknown) as LibraryRow[]) || [];

      // mapeo limpio: de [{created_at, luts:{...}}] => [{...lut}]
      const mapped: LutRow[] = rows
        .map((r) => r.luts)
        .filter((x): x is LutRow => !!x);

      setItems(mapped);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar tu librería.");
      Alert.alert("Library error", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.h1}>My Library</Text>
          <Text style={styles.subhead}>Todos tus LUTs descargados, listos para usar.</Text>
        </View>
        {loading ? <ActivityIndicator size="small" color="#0f172a" /> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{
          paddingHorizontal: sidePadding,
          paddingBottom: 40,
          gap: cardGap,
        }}
        key={numColumns}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: cardGap } : undefined}
        renderItem={({ item }) => (
          <LutCard
            lut={{
              id: item.id,
              name: item.name,
              premium: item.premium,
              beforeUri: item.before_url,
              afterUri: item.after_url,
              category: item.category,
            }}
            onPress={() => router.push(`/lut/${item.id}`)}
            containerStyle={numColumns > 1 ? styles.cardColumn : undefined}
          />
        )}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name={error ? "alert-circle-outline" : "download-outline"} size={26} color="#94a3b8" />
              <Text style={styles.emptyTitle}>
                {error ? "No se pudo cargar" : "Todavía no descargaste LUTs"}
              </Text>
              <Text style={styles.empty}>
                {error ?? "Descargá un LUT desde el marketplace para verlo acá."}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7fb" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  h1: { fontSize: 26, fontWeight: "800", color: "#0f172a" },
  subhead: { marginTop: 4, fontSize: 13, color: "#64748b" },
  emptyWrap: {
    marginTop: 16,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    alignItems: "center",
  },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: "700", color: "#0f172a" },
  empty: { marginTop: 4, fontSize: 12, color: "#64748b", textAlign: "center" },
  cardColumn: { flex: 1 },
});
