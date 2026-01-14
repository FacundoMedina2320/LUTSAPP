import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import BeforeAfterSlider from "../../components/BeforeAfterSlider";
import { supabase } from "../../lib/supabase";

type LutRow = {
  id: string;
  name: string;
  category: { name: string } | null;
  is_premium: boolean;
  before_url: string | null;
  after_url: string | null;
  cube_path: string | null;
  downloads_count: number | null;
};

export default function LutDetail() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const lutId = Array.isArray(id) ? id[0] : id;

  const [lut, setLut] = useState<LutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [show, setShow] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    if (!lutId) {
      setLoading(false);
      Alert.alert("Error", "Missing LUT identifier.");
      return;
    }

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("luts")
          .select(
            "id,name,is_premium,before_url,after_url,cube_path,downloads_count,category:categories(name)"
          )
          .eq("id", lutId)
          .single();

        if (error) throw error;
        setLut(data as LutRow);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load LUT");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lutId]);

  const handleDownload = async () => {
    try {
      if (!lut?.id) {
        Alert.alert("Error", "Missing LUT file");
        return;
      }
      if (!lut.cube_path) {
        Alert.alert("No disponible", "Este LUT aún no tiene archivo descargable.");
        return;
      }

      setBusy(true);

      const { data, error } = await supabase.functions.invoke("download-lut", {
        body: { lut_id: lut.id },
      });

      if (error) {
        throw error;
      }

      const signedUrl = data?.url as string | undefined;
      if (!signedUrl) {
        throw new Error("Signed URL missing");
      }

      const safeName = lut.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!baseDirectory) {
        Alert.alert("Error", "File storage is unavailable on this device.");
        return;
      }

      const filename = `${safeName || "lut"}.cube`;
      const dest = `${baseDirectory}${filename}`;

      const result = await FileSystem.downloadAsync(signedUrl, dest);
      if (result.status !== 200) {
        throw new Error("Download failed");
      }
      setLocalUri(result.uri);

      setShow(true);
    } catch (e: any) {
      Alert.alert("Download error", e?.message ?? "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const openInFiles = async () => {
    if (!localUri) return;

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Not supported", "Sharing not available on this device");
      return;
    }

    await Sharing.shareAsync(localUri);
  };

  if (loading || !lut) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading LUT…</Text>
      </View>
    );
  }

  const hasBefore = Boolean(lut.before_url);
  const hasAfter = Boolean(lut.after_url);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
        </Pressable>
        <Text style={styles.title}>{lut.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Slider */}
      <BeforeAfterSlider
        beforeUri={lut.before_url}
        afterUri={lut.after_url}
        height={420}
        radius={24}
      />

      {/* Labels */}
      {(hasBefore || hasAfter) && (
        <View style={styles.labelsRow}>
          {hasBefore && <Text style={styles.pill}>Before</Text>}
          {hasAfter && <Text style={styles.pill}>After</Text>}
        </View>
      )}

      {!hasBefore && !hasAfter && (
        <View style={styles.previewEmpty}>
          <Ionicons name="image-outline" size={18} color="#64748b" />
          <View style={styles.previewTextWrap}>
            <Text style={styles.previewTitle}>Preview en preparación</Text>
            <Text style={styles.previewText}>Este LUT todavía no tiene imágenes de antes/después.</Text>
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="pricetag-outline" size={14} color="#0f172a" />
          <Text style={styles.metaText}>{lut.category?.name ?? "Sin categoría"}</Text>
        </View>
        <View style={styles.metaPill}>
          <Ionicons name="download-outline" size={14} color="#0f172a" />
          <Text style={styles.metaText}>{lut.downloads_count ?? 0} descargas</Text>
        </View>
        {lut.is_premium && (
          <View style={styles.metaPillDark}>
            <Ionicons name="sparkles-outline" size={14} color="#fff" />
            <Text style={styles.metaTextDark}>Premium</Text>
          </View>
        )}
      </View>

      {/* Download */}
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.btnPressed,
          busy && { opacity: 0.6 },
        ]}
        onPress={handleDownload}
        disabled={busy}
      >
        {busy ? (
          <View style={styles.btnRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.btnText}>Downloading…</Text>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Download LUT</Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.helper}>
        This LUT will be downloaded as a .cube file for Blackmagic Camera.
      </Text>

      {/* Modal */}
      <Modal visible={show} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setShow(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </View>
              <Text style={styles.modalTitle}>LUT downloaded successfully</Text>
            </View>

            <Pressable style={({ pressed }) => [styles.modalBtn, pressed && styles.btnPressed]} onPress={openInFiles}>
              <Text style={styles.modalBtnText}>Open in Files</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.modalBtnSecondary, pressed && styles.modalBtnSecondaryPressed]}
              onPress={() => {
                setShow(false);
                router.push("/how-to-import");
              }}
            >
              <Text style={styles.modalBtnTextSecondary}>
                How to import in Blackmagic Camera
              </Text>
            </Pressable>

            <Pressable onPress={() => setShow(false)} style={styles.closeBtn}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#f6f7fb",
    padding: 16,
  },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", flex: 1, textAlign: "center" },

  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 14,
  },
  pill: {
    fontSize: 12,
    color: "#0f172a",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#fff",
  },
  previewEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginBottom: 12,
  },
  previewTextWrap: { flex: 1 },
  previewTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  previewText: { marginTop: 4, fontSize: 12, color: "#64748b" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  metaText: { fontSize: 12, fontWeight: "600", color: "#0f172a" },
  metaPillDark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
  metaTextDark: { fontSize: 12, fontWeight: "600", color: "#fff" },

  btn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  btnPressed: { transform: [{ scale: 0.98 }] },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  helper: { fontSize: 12, color: "#64748b", marginTop: 10 },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
  },
  modalHeader: { alignItems: "center", marginBottom: 10 },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  modalBtn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "700" },

  modalBtnSecondary: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
  },
  modalBtnSecondaryPressed: { backgroundColor: "#e2e8f0" },
  modalBtnTextSecondary: { color: "#0f172a", fontWeight: "700" },

  closeBtn: { alignItems: "center", marginTop: 12 },
  close: { fontWeight: "700", color: "#0f172a" },
});
