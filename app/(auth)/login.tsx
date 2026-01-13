import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // solo register
  const [confirmPassword, setConfirmPassword] = useState("");

  // redirect para OAuth + email confirmation
  const redirectTo = useMemo(() => makeRedirectUri(), []);

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(String(value).trim());

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

  const signInWithProvider = async (provider) => {
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
    <View style={styles.container}>
      <Text style={styles.title}>{mode === "login" ? "Log in" : "Register"}</Text>

      {/* Toggle */}
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

      {/* Email */}
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

      {/* Password */}
      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      {/* Confirm password solo en register */}
      {mode === "register" && (
        <TextInput
          placeholder="Confirm password"
          placeholderTextColor="#999"
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!busy}
        />
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

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      {/* Google */}
      <Pressable
        style={[styles.oauthBtn, busy && { opacity: 0.6 }]}
        onPress={() => signInWithProvider("google")}
        disabled={busy}
      >
        <Text style={styles.oauthBtnText}>Continue with Google</Text>
      </Pressable>

      {/* Apple */}
      <Pressable
        style={[styles.oauthBtn, styles.appleBtn, busy && { opacity: 0.6 }]}
        onPress={() => signInWithProvider("apple")}
        disabled={busy}
      >
        <Text style={styles.appleBtnText}>Continue with Apple</Text>
      </Pressable>

      <Text style={styles.note}>
        Si registrás con email, puede requerir confirmación por correo según tu configuración de Supabase.
      </Text>

      <Pressable onPress={() => router.replace("/(tabs)")} style={{ marginTop: 10, alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: "#111" }}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 16 },

  toggleRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#fff" },
  toggleBtnActive: { backgroundColor: "#111" },
  toggleText: { fontWeight: "700", color: "#111" },
  toggleTextActive: { color: "#fff" },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#111",
  },

  primaryBtn: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 16, alignItems: "center", marginTop: 2 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  divider: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  dividerText: { marginHorizontal: 10, color: "#666", fontSize: 12 },

  oauthBtn: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  oauthBtnText: { color: "#111", fontWeight: "700" },

  appleBtn: { backgroundColor: "#111", borderColor: "#111" },
  appleBtnText: { color: "#fff", fontWeight: "700" },

  note: { marginTop: 8, fontSize: 12, color: "#777", lineHeight: 16 },
});
