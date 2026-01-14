import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import LutCard from "../../components/LutCard";

type LutRow = {
  id: string;
  name: string;
  category: { name: string } | null;
  is_premium: boolean;
  before_url: string | null;
  after_url: string | null;
  downloads_count: number | null;
  created_at?: string | null;
};

type SuggestionRow = {
  id: string;
  name: string;
  category: { name: string } | null;
  is_premium: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
};

export default function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [sort, setSort] = useState<"downloads" | "newest">("downloads");
  const [category, setCategory] = useState<CategoryRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [showSug, setShowSug] = useState<boolean>(false);

  const [luts, setLuts] = useState<LutRow[]>([]);

  const { width } = useWindowDimensions();
  const numColumns = width >= 720 ? 3 : width >= 520 ? 2 : 1;
  const cardGap = 14;
  const sidePadding = 16;

  const orderBy = useMemo(() => {
    return sort === "newest"
      ? { col: "created_at" as const, asc: false }
      : { col: "downloads_count" as const, asc: false };
  }, [sort]);

  const onOpenLut = (id: string) => router.push(`/lut/${id}`);

  // Load Home list
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        let q = supabase
          .from("luts")
          .select("id,name,is_premium,before_url,after_url,downloads_count,created_at,category:categories(name)")
          .order(orderBy.col, { ascending: orderBy.asc })
          .limit(30);

        if (category?.id) q = q.eq("category_id", category.id);

        const { data, error } = await q;

        if (error) throw error;

        if (!cancelled) setLuts((data as LutRow[]) || []);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo cargar el marketplace.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, orderBy]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id,name")
          .order("name", { ascending: true });

        if (error) throw error;
        if (!cancelled) setCategories((data as CategoryRow[]) || []);
      } catch (e: any) {
        console.log("Categories error:", e?.message ?? e);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Suggestions while typing (debounced)
  useEffect(() => {
    let timer: any = null;
    let cancelled = false;

    const run = async () => {
      const text = query.trim();
      if (text.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        let q = supabase
          .from("luts")
          .select("id,name,is_premium,category:categories(name)")
          .ilike("name", `%${text}%`)
          .order("downloads_count", { ascending: false })
          .limit(6);

        if (category?.id) q = q.eq("category_id", category.id);

        const { data, error } = await q;
        if (error) throw error;

        if (!cancelled) setSuggestions((data as SuggestionRow[]) || []);
      } catch (e: any) {
        console.log("Suggestion error:", e?.message ?? e);
      }
    };

    timer = setTimeout(run, 250);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [query, category]);

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.h1}>Marketplace</Text>
          <Text style={styles.subhead}>Encuentra LUTs cinematográficos y listos para producción.</Text>
        </View>
        <Pressable style={styles.searchCta} onPress={() => setShowSug(true)}>
          <Ionicons name="sparkles-outline" size={18} color="#111827" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setShowSug(true);
            }}
            placeholder="Buscar LUTs por nombre"
            placeholderTextColor="#94a3b8"
            style={styles.search}
            autoCapitalize="none"
          />
        </View>

        {/* Suggestions */}
        {showSug && (suggestions.length > 0 || query.trim().length >= 2) && (
          <View style={styles.sugBox}>
            {suggestions.length > 0 ? (
              suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setShowSug(false);
                    setQuery("");
                    onOpenLut(s.id);
                  }}
                  style={({ pressed }) => [styles.sugRow, pressed && styles.sugRowPressed]}
                >
                  <Text style={styles.sugName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.sugMeta}>
                    {s.category?.name ?? "Sin categoría"}
                    {s.is_premium ? " • Premium" : ""}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.sugEmpty}>
                <Text style={styles.sugEmptyTitle}>Sin resultados</Text>
                <Text style={styles.sugEmptyText}>Probá con otro nombre o categoría.</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Pressable
          style={({ pressed }) => [
            styles.sortPill,
            sort === "downloads" && styles.sortPillActive,
            pressed && styles.pressedScale,
          ]}
          onPress={() => setSort("downloads")}
        >
          <Text style={[styles.sortText, sort === "downloads" && styles.sortTextActive]}>
            Más descargadas
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.sortPill,
            sort === "newest" && styles.sortPillActive,
            pressed && styles.pressedScale,
          ]}
          onPress={() => setSort("newest")}
        >
          <Text style={[styles.sortText, sort === "newest" && styles.sortTextActive]}>
            Novedades
          </Text>
        </Pressable>
      </View>

      {/* Categories */}
      <FlatList
        data={[{ id: "all", name: "All" }, ...categories]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setCategory(item.id === "all" ? null : item)}
            style={({ pressed }) => [
              styles.catPill,
              category?.id === item.id || (!category && item.id === "all")
                ? styles.catPillActive
                : null,
              pressed && styles.pressedScale,
            ]}
          >
            <Text
              style={[
                styles.catText,
                category?.id === item.id || (!category && item.id === "all")
                  ? styles.catTextActive
                  : null,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {sort === "downloads" ? "Más descargadas" : "Nuevas en catálogo"}
        </Text>
        <View style={styles.sectionMeta}>
          {loading ? (
            <ActivityIndicator size="small" color="#111827" />
          ) : (
            <Text style={styles.sectionCount}>{luts.length} LUTs</Text>
          )}
        </View>
      </View>
    </View>
  );

  const emptyState = (
    <View style={styles.emptyWrap}>
      {error ? (
        <>
          <Ionicons name="alert-circle-outline" size={26} color="#ef4444" />
          <Text style={styles.emptyTitle}>No se pudo cargar</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </>
      ) : (
        <>
          <Ionicons name="images-outline" size={26} color="#94a3b8" />
          <Text style={styles.emptyTitle}>Sin resultados</Text>
          <Text style={styles.emptyText}>Intentá con otra categoría o filtro.</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={luts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: sidePadding,
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
              premium: item.is_premium,
              beforeUri: item.before_url,
              afterUri: item.after_url,
              category: item.category?.name ?? "Sin categoría",
            }}
            onPress={() => onOpenLut(item.id)}
            containerStyle={numColumns > 1 ? styles.cardColumn : undefined}
          />
        )}
        refreshing={loading}
        onRefresh={() => {
          // refresh simple
          setSort((s) => (s === "downloads" ? "newest" : "downloads"));
          setTimeout(() => setSort((s) => (s === "downloads" ? "newest" : "downloads")), 0);
        }}
        ListEmptyComponent={!loading ? emptyState : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7fb" },

  headerWrap: { paddingTop: 10, paddingBottom: 6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  subhead: { marginTop: 4, fontSize: 13, color: "#64748b", maxWidth: 240 },
  searchCta: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: { position: "relative", marginTop: 16 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  search: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },

  sugBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 18,
    overflow: "hidden",
    zIndex: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sugRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.05)",
  },
  sugRowPressed: { backgroundColor: "rgba(15, 23, 42, 0.04)" },
  sugName: { fontWeight: "700", color: "#0f172a" },
  sugMeta: { marginTop: 2, fontSize: 12, color: "#64748b" },
  sugEmpty: { padding: 14 },
  sugEmptyTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  sugEmptyText: { marginTop: 4, fontSize: 12, color: "#64748b" },

  sortRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  sortPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "#fff",
  },
  sortPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  sortText: { fontWeight: "700", color: "#0f172a", fontSize: 12 },
  sortTextActive: { color: "#fff" },

  catPill: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "#fff",
  },
  catPillActive: { backgroundColor: "#111827", borderColor: "#111827" },
  catText: { fontWeight: "700", color: "#0f172a", fontSize: 12 },
  catTextActive: { color: "#fff" },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { marginTop: 4, fontSize: 14, fontWeight: "800", color: "#0f172a" },
  sectionMeta: { marginTop: 4 },
  sectionCount: { fontSize: 12, fontWeight: "700", color: "#64748b" },

  pressedScale: { transform: [{ scale: 0.98 }] },
  cardColumn: { flex: 1 },

  emptyWrap: {
    marginTop: 24,
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: "700", color: "#0f172a" },
  emptyText: { marginTop: 4, fontSize: 12, color: "#64748b", textAlign: "center" },
});
