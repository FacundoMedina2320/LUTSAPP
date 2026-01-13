import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // solo register
  const [confirmPassword, setConfirmPassword] = useState("");

  // redirect para OAuth + email confirmation
  const redirectTo = useMemo(() => makeRedirectUri(), []);

  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(String(value).trim());

  const onEmailAuth = async () => {
    try {
      if (!validateEmail(email)) {
        Alert.alert("Email inválido", "Escribí un email válido.");
        return;
      }
      if (!password || password.length < 6) {
        Alert.alert("Contraseña débil", "La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      setBusy(true);

      if (mode === "register") {
        if (!confirmPassword) {
          Alert.alert("Falta confirmar", "Repetí la contraseña.");
          return;
        }
        if (confirmPassword !== password) {
          Alert.alert("No coincide", "Las contraseñas no coinciden.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // ✅ para que el link de confirmación vuelva a tu app
            emailRedirectTo: redirectTo,
            data: { created_from: "mobile_app" },
          },
        });

        if (error) {
          Alert.alert("No se pudo registrar", error.message);
          return;
        }

        const needsEmailConfirm = !data?.session;

        Alert.alert(
          "Revisá tu email",
          needsEmailConfirm
            ? "Te mandamos un correo de confirmación. Abrilo y confirmá tu cuenta. Luego volvé y hacé Log in."
            : "Cuenta creada. Ya podés usar la app."
        );

        // limpiamos campos sensibles
        setPassword("");
        setConfirmPassword("");

        // Volvemos a login (flujo clásico: confirmar mail y luego login)
        setMode("login");
        return;
      }

      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert("Error al iniciar sesión", error.message);
        return;
      }

      // ✅ fallback: navega directo
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    try {
      setBusy(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider, // "google" | "apple"
        options: { redirectTo },
      });

      if (error) {
        Alert.alert("OAuth error", error.message);
        return;
      }

      // útil para debug
      console.log("OAuth started:", data?.url);
    } catch (e) {
      Alert.alert("Error", "No se pudo iniciar con proveedor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>L</Text>
        </View>
        <Pressable style={styles.helpBtn} onPress={() => router.replace("/(tabs)")}>
          <Ionicons name="help-circle-outline" size={20} color="#111" />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Cinematic LUTs</Text>
        <Text style={styles.heroTitle}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
        <Text style={styles.heroSubtitle}>
          Professional color grading for Blackmagic Camera. Save, preview, and download LUTs anytime.
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Ionicons name="sparkles-outline" size={14} color="#111" />
            <Text style={styles.statText}>120+ LUTs</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="download-outline" size={14} color="#111" />
            <Text style={styles.statText}>Instant access</Text>
          </View>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
          onPress={() => setMode("login")}
          disabled={busy}
        >
          <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>Log in</Text>
        </Pressable>

        <Pressable
          style={[styles.toggleBtn, mode === "register" && styles.toggleBtnActive]}
          onPress={() => setMode("register")}
          disabled={busy}
        >
          <Text style={[styles.toggleText, mode === "register" && styles.toggleTextActive]}>Register</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color="#666" />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color="#666" />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!busy}
          />
        </View>

        {mode === "register" && (
          <View style={styles.inputRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#666" />
            <TextInput
              placeholder="Confirm password"
              placeholderTextColor="#999"
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!busy}
            />
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={onEmailAuth}
          disabled={busy}
        >
          <Text style={styles.primaryBtnText}>
            {mode === "login" ? "Log in" : "Create account"}
          </Text>
        </Pressable>

        <Pressable style={styles.linkRow} onPress={() => Alert.alert("Recuperación", "Pronto podrás restablecer tu contraseña.")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.oauthRow}>
        <Pressable
          style={[styles.oauthBtn, busy && { opacity: 0.6 }]}
          onPress={() => signInWithProvider("google")}
          disabled={busy}
        >
          <Ionicons name="logo-google" size={18} color="#111" />
          <Text style={styles.oauthBtnText}>Google</Text>
        </Pressable>

        <Pressable
          style={[styles.oauthBtn, styles.appleBtn, busy && { opacity: 0.6 }]}
          onPress={() => signInWithProvider("apple")}
          disabled={busy}
        >
          <Ionicons name="logo-apple" size={18} color="#fff" />
          <Text style={styles.appleBtnText}>Apple</Text>
        </Pressable>
      </View>

      <Text style={styles.note}>
        Si registrás con email, puede requerir confirmación por correo según tu configuración de Supabase.
      </Text>

      <Pressable onPress={() => router.replace("/(tabs)")} style={styles.skipRow}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f6f6f8",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  helpBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  heroEyebrow: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#777" },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "#111", marginTop: 8 },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 20, color: "#555" },
  heroStats: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, gap: 10 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  statText: { fontSize: 12, color: "#111", fontWeight: "600" },

  toggleRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#fff" },
  toggleBtnActive: { backgroundColor: "#111" },
  toggleText: { fontWeight: "700", color: "#111" },
  toggleTextActive: { color: "#fff" },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111",
  },

  primaryBtn: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkRow: { alignItems: "center", marginTop: 10 },
  linkText: { fontWeight: "600", color: "#111" },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  dividerText: { marginHorizontal: 10, color: "#666", fontSize: 12 },

  oauthRow: { flexDirection: "row", gap: 12 },
  oauthBtn: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  oauthBtnText: { color: "#111", fontWeight: "700" },

  appleBtn: { backgroundColor: "#111", borderColor: "#111" },
  appleBtnText: { color: "#fff", fontWeight: "700" },

  note: { marginTop: 8, fontSize: 12, color: "#777", lineHeight: 16 },
  skipRow: { marginTop: 12, alignItems: "center" },
  skipText: { fontWeight: "700", color: "#111" },
});
