import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function LutDetail() {
  const { id } = useLocalSearchParams();
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LUT {id}</Text>

      <Image
        source={{ uri: "https://picsum.photos/600/900" }}
        style={styles.image}
      />

      <Pressable style={styles.btn} onPress={() => setShow(true)}>
        <Text style={styles.btnText}>Download LUT</Text>
      </Pressable>

      <Text style={styles.helper}>
        This LUT will be saved as a .cube file to import into Blackmagic Camera.
      </Text>

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>LUT downloaded successfully</Text>

            <Pressable style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Open in Files</Text>
            </Pressable>

            <Pressable style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>How to import in Blackmagic Camera</Text>
            </Pressable>

            <Pressable onPress={() => setShow(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  image: { width: "100%", height: 420, borderRadius: 24, marginBottom: 16 },
  btn: { backgroundColor: "#111", padding: 14, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  helper: { fontSize: 12, color: "#666", marginTop: 8 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 24, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  modalBtn: { backgroundColor: "#111", padding: 12, borderRadius: 14, marginTop: 8 },
  modalBtnText: { color: "#fff", textAlign: "center" },
  close: { textAlign: "center", marginTop: 12, fontWeight: "600" },
});
