import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useState } from "react";
export default function SignInscreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {/* Logo */}
          <Text style={styles.logo}>vydora</Text>
          {/* Heading */}
          <Text style={styles.heading}>Sign In</Text>
          {/* Google */}
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Text style={styles.socialIcon}>G </Text>
            <Text style={styles.socialLabel}>Sign up with Google</Text>
          </TouchableOpacity>
          {/* Apple */}
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Text style={styles.socialIcon}> </Text>
            <Text style={styles.socialLabel}>Sign up with Apple</Text>
          </TouchableOpacity>
          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
          </View>
          {/* Email */}
          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor="#555555"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#888888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          {/* Forgot */}
          <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
          {/* Sign In CTA */}
          <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Sign In</Text>
          </TouchableOpacity>
          {/* Sign Up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupMuted}>Don't have a account? </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  // Logo
  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 6,
  },
  // Heading
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
  },
  // Social buttons
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
  },
  socialIcon: {
    fontSize: 16,
    color: "#FFFFFF",
    marginRight: 6,
  },
  socialLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    fontWeight: "500",
  },
  // Divider
  dividerRow: {
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: "#333333",
  },
  // Labels
  label: {
    fontSize: 13,
    color: "#CCCCCC",
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 4,
  },
  // Inputs
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
    gap: 10,
  },
  inputIcon: {
    fontSize: 14,
    color: "#666666",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    padding: 0,
  },
  // Forgot
  forgotWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: "#888888",
  },
  // CTA
  cta: {
    backgroundColor: "#F5A623",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A0E00",
  },
  // Sign up
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupMuted: {
    fontSize: 13,
    color: "#666666",
  },
  signupLink: {
    fontSize: 13,
    color: "#CCCCCC",
    fontWeight: "700",
  },
});


