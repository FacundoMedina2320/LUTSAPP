import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import BeforeAfterSlider from "../../components/BeforeAfterSlider";

type Lut = {
  id: string;
  name: string;
  premium: boolean;
  beforeUri: string;
  afterUri: string;
};

const MOCK_LUTS: Lut[] = [
  {
    id: "1",
    name: "Cinematic Gold",
    premium: true,
    beforeUri: "https://picsum.photos/800/1200?random=11",
    afterUri: "https://picsum.photos/800/1200?random=12",
  },
  {
    id: "2",
    name: "Moody Night",
    premium: false,
    beforeUri: "https://picsum.photos/800/1200?random=21",
    afterUri: "https://picsum.photos/800/1200?random=22",
  },
];

function normalizeId(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim().length > 0) return raw[0];
  return null;
}

export default function LutDetail() {
  const params = useLocalSearchParams();
  const id = normalizeId((params as any).id);

  const [show, setShow] = useState(false);

  const lut = useMemo(() => {
    if (!id) return MOCK_LUTS[0];
    return MOCK_LUTS.find((x) => x.id === id) ?? MOCK_LUTS[0];
  }, [id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <Text style={styles.title}>{lut.name}</Text>

        <View style={{ width: 44 }} />
      </View>

      {/* Slider */}
      <BeforeAfterSlider
        beforeUri={lut.beforeUri}
        afterUri={lut.afterUri}
        height={420}
        radius={24}
      />

      {/* Labels */}
      <View style={styles.labelsRow}>
        <Text style={styles.pill}>Before</Text>
        <Text style={styles.pill}>After</Text>
      </View>

      {/* CTA */}
      <Pressable style={styles.btn} onPress={() => setShow(true)}>
        <Text style={styles.btnText}>Download LUT</Text>
      </Pressable>

      <Text style={styles.helper}>
        This LUT will be saved as a .cube file to import into Blackmagic Camera.
      </Text>

      {/* Success Modal */}
      <Modal
        visible={show}
        transparent
        animationType="fade"
        onRequestClose={() => setShow(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setShow(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>LUT downloaded successfully</Text>

            <Pressable style={styles.modalBtn} onPress={() => {}}>
              <Text style={styles.modalBtnText}>Open in Files</Text>
            </Pressable>

            <Pressable
              style={styles.modalBtnSecondary}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  back: { fontSize: 14, color: "#111", fontWeight: "600", width: 44 },
  title: { fontSize: 18, fontWeight: "600", color: "#111" },

  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 14,
  },
  pill: {
    fontSize: 12,
    color: "#111",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },

  btn: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  helper: { fontSize: 12, color: "#666", marginTop: 10, lineHeight: 16 },

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
  modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: "#111" },

  modalBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  modalBtnSecondary: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  modalBtnTextSecondary: { color: "#111", fontWeight: "600", fontSize: 14 },

  closeBtn: { alignItems: "center", marginTop: 12, paddingVertical: 6 },
  close: { color: "#111", fontWeight: "600" },
});
