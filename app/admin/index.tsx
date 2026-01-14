import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { ADMIN_USER_ID, isAdminUser } from "../../constants/admin";
import { slugify } from "../../lib/slug";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type UploadItem = {
  id: string;
  name: string;
  description: string;
  tags: string;
  categorySlugs: string;
  isPremium: boolean;
  price: string;
  currency: string;
  beforeFile?: PickedFile | null;
  afterFile?: PickedFile | null;
  cubeFile?: PickedFile | null;
  status: "idle" | "uploading" | "success" | "error";
  message?: string | null;
};

const createEmptyItem = (): UploadItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: "",
  description: "",
  tags: "",
  categorySlugs: "",
  isPremium: false,
  price: "",
  currency: "USD",
  beforeFile: null,
  afterFile: null,
  cubeFile: null,
  status: "idle",
  message: null,
});

const pickFile = async (type: string | string[]) => {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  const file = result.assets[0];
  return {
    uri: file.uri,
    name: file.name ?? "file",
    mimeType: file.mimeType,
  } as PickedFile;
};

const getFileExtension = (filename: string) => {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts.pop()}` : "";
};

const uploadToStorage = async (path: string, file: PickedFile, contentType: string) => {
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from("luts").upload(path, blob, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
};

export default function AdminPanel() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([createEmptyItem()]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  const isAdmin = useMemo(() => isAdminUser(userId), [userId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug")
        .order("name", { ascending: true });

      if (!error) setCategories((data as CategoryRow[]) || []);
    };

    loadCategories();
  }, []);

  if (checking) return null;
  if (!userId) return <Redirect href="/(auth)/login" />;
  if (!isAdmin || !ADMIN_USER_ID) return <Redirect href="/(tabs)" />;

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleUpload = async (item: UploadItem) => {
    const name = item.name.trim();
    if (!name) {
      updateItem(item.id, { status: "error", message: "Name is required." });
      return;
    }
    if (!item.cubeFile) {
      updateItem(item.id, { status: "error", message: "Cube file is required." });
      return;
    }

    updateItem(item.id, { status: "uploading", message: null });

    try {
      const slug = slugify(name);
      if (!slug) throw new Error("Invalid name for slug.");

      const categorySlugs = item.categorySlugs
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const categoryIds = categories
        .filter((category) => categorySlugs.includes(category.slug))
        .map((category) => category.id);

      const tags = item.tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const cubeExt = getFileExtension(item.cubeFile.name) || ".cube";
      const cubePath = `cube/${slug}/${slug}${cubeExt}`;
      await uploadToStorage(cubePath, item.cubeFile, "application/octet-stream");

      let beforeUrl: string | null = null;
      if (item.beforeFile) {
        const beforeExt = getFileExtension(item.beforeFile.name) || ".jpg";
        const beforePath = `images/${slug}/before${beforeExt}`;
        await uploadToStorage(beforePath, item.beforeFile, item.beforeFile.mimeType ?? "image/jpeg");
        beforeUrl = supabase.storage.from("luts").getPublicUrl(beforePath).data.publicUrl;
      }

      let afterUrl: string | null = null;
      if (item.afterFile) {
        const afterExt = getFileExtension(item.afterFile.name) || ".jpg";
        const afterPath = `images/${slug}/after${afterExt}`;
        await uploadToStorage(afterPath, item.afterFile, item.afterFile.mimeType ?? "image/jpeg");
        afterUrl = supabase.storage.from("luts").getPublicUrl(afterPath).data.publicUrl;
      }

      const priceCents = item.isPremium ? Math.max(0, Math.round(Number(item.price || 0) * 100)) : 0;

      const { data, error } = await supabase
        .from("luts")
        .upsert(
          {
            name,
            slug,
            description: item.description.trim() || null,
            tags,
            is_premium: item.isPremium,
            price_cents: priceCents,
            currency: item.currency || "USD",
            cube_path: cubePath,
            before_url: beforeUrl,
            after_url: afterUrl,
            category_id: categoryIds[0] ?? null,
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (error || !data?.id) throw error ?? new Error("Insert failed");

      if (categoryIds.length > 0) {
        await supabase.from("lut_categories").delete().eq("lut_id", data.id);
        const entries = categoryIds.map((categoryId) => ({
          lut_id: data.id,
          category_id: categoryId,
        }));
        const { error: catError } = await supabase.from("lut_categories").insert(entries);
        if (catError) throw catError;
      }

      updateItem(item.id, { status: "success", message: "Uploaded successfully." });
    } catch (error: any) {
      updateItem(item.id, { status: "error", message: error?.message ?? "Upload failed." });
    }
  };

  const handleUploadAll = async () => {
    for (const item of items) {
      await handleUpload(item);
    }
    Alert.alert("Batch upload", "Upload completed.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Admin Upload</Text>
          <Text style={styles.subtitle}>Visible solo para el usuario administrador.</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
          <Text style={styles.badgeText}>Admin</Text>
        </View>
      </View>

      {items.map((item, index) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>LUT #{index + 1}</Text>
            <Text style={styles.cardMeta}>Slug: {item.name ? slugify(item.name) : "—"}</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Name"
            value={item.name}
            onChangeText={(value) => updateItem(item.id, { name: value })}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Description"
            value={item.description}
            onChangeText={(value) => updateItem(item.id, { description: value })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Tags (comma separated)"
            value={item.tags}
            onChangeText={(value) => updateItem(item.id, { tags: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Categories (slugs, comma separated)"
            value={item.categorySlugs}
            onChangeText={(value) => updateItem(item.id, { categorySlugs: value })}
          />

          <View style={styles.row}>
            <Text style={styles.label}>Premium</Text>
            <Switch
              value={item.isPremium}
              onValueChange={(value) => updateItem(item.id, { isPremium: value })}
            />
          </View>

          {item.isPremium && (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="Price (USD)"
                value={item.price}
                onChangeText={(value) => updateItem(item.id, { price: value })}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.currencyInput]}
                placeholder="Currency"
                value={item.currency}
                onChangeText={(value) => updateItem(item.id, { currency: value })}
              />
            </View>
          )}

          <View style={styles.fileRow}>
            <Pressable
              style={styles.fileButton}
              onPress={async () => updateItem(item.id, { beforeFile: await pickFile("image/*") })}
            >
              <Ionicons name="image-outline" size={18} color="#0f172a" />
              <Text style={styles.fileButtonText}>Before</Text>
            </Pressable>
            <Text style={styles.fileName}>{item.beforeFile?.name ?? "No file"}</Text>
          </View>

          <View style={styles.fileRow}>
            <Pressable
              style={styles.fileButton}
              onPress={async () => updateItem(item.id, { afterFile: await pickFile("image/*") })}
            >
              <Ionicons name="image-outline" size={18} color="#0f172a" />
              <Text style={styles.fileButtonText}>After</Text>
            </Pressable>
            <Text style={styles.fileName}>{item.afterFile?.name ?? "No file"}</Text>
          </View>

          <View style={styles.fileRow}>
            <Pressable
              style={styles.fileButton}
              onPress={async () => updateItem(item.id, { cubeFile: await pickFile("*/*") })}
            >
              <Ionicons name="document-outline" size={18} color="#0f172a" />
              <Text style={styles.fileButtonText}>Cube</Text>
            </Pressable>
            <Text style={styles.fileName}>{item.cubeFile?.name ?? "No file"}</Text>
          </View>

          {item.message ? (
            <Text
              style={[
                styles.statusText,
                item.status === "error" ? styles.errorText : styles.successText,
              ]}
            >
              {item.message}
            </Text>
          ) : null}

          <Pressable
            style={[styles.primaryButton, item.status === "uploading" && styles.buttonDisabled]}
            onPress={() => handleUpload(item)}
            disabled={item.status === "uploading"}
          >
            <Text style={styles.primaryButtonText}>
              {item.status === "uploading" ? "Uploading..." : "Upload LUT"}
            </Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.footerRow}>
        <Pressable style={styles.secondaryButton} onPress={() => setItems((prev) => [...prev, createEmptyItem()])}>
          <Text style={styles.secondaryButtonText}>Add another LUT</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleUploadAll}>
          <Text style={styles.primaryButtonText}>Upload all</Text>
        </Pressable>
      </View>

      <View style={styles.helperCard}>
        <Text style={styles.helperTitle}>Category slugs disponibles</Text>
        <Text style={styles.helperText}>
          {categories.length > 0
            ? categories.map((category) => category.slug).join(", ")
            : "No categories loaded"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f6f7fb",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#111827",
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginBottom: 16,
  },
  cardHeader: { marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardMeta: { fontSize: 12, color: "#64748b", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  priceInput: { flex: 1, marginBottom: 0 },
  currencyInput: { width: 90, marginLeft: 8, marginBottom: 0 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  fileButtonText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  fileName: { flex: 1, fontSize: 12, color: "#64748b" },
  statusText: { fontSize: 12, marginBottom: 10, fontWeight: "600" },
  successText: { color: "#16a34a" },
  errorText: { color: "#dc2626" },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#0f172a", fontWeight: "700" },
  footerRow: { gap: 12, marginBottom: 20 },
  helperCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#fff",
  },
  helperTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  helperText: { fontSize: 12, color: "#64748b" },
});
