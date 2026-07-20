import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import React, { useState, useMemo } from "react";
import { useTheme, ThemeColors } from "./Contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { authService } from "./services/authservice";
type RootStackParamList = {
  signin: undefined;
  verifyemail: { email: string };
};
function ForgotPassword(){
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [touched, setTouched] = useState<boolean>(false);
  // ── Strict email validation ───────────────────────────────────
  const validateEmail = (value: string): string => {
    if (!value || value.trim() === "") {
      return "Email address is required";
    }
    // strict: must have local@domain.tld, no consecutive dots, no special chars
    const strictEmailRegex =
      /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    if (!strictEmailRegex.test(value.trim())) {
      return "Enter a valid email address (e.g. name@example.com)";
    }
    return "";
  };
  const handleChangeText = (value: string): void => {
    setEmail(value);
    setSuccess(false);
    if (touched) {
      setError(validateEmail(value));
    }
  };
  const handleBlur = (): void => {
    setTouched(true);
    setError(validateEmail(email));
  };
  const handleSend = async (): Promise<void> => {
    setTouched(true);
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }
    setError("");
    setLoading(true);
    setSuccess(false);
    try {
      await authService.forgotPassword(email.trim());
      setSuccess(true);
      setTimeout(() => {
        navigation.navigate("verifyemail", {
          email: email.trim().toLowerCase(),
        });
      }, 600);
    } catch (e: any) {
      setError(e?.message || "Could not send reset code. Try again.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };
  const isEmailValid = validateEmail(email) === "";
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.navigate("signin")}
          >
            <Ionicons name="arrow-back" size={ms(20)} color={colors.text} />
          </Pressable>
          <Text style={styles.heading}>Forgot Password </Text>
          <Text style={styles.info}>Enter your email address</Text>
          <View
            style={[
              styles.inputRow,
              touched && error ? styles.inputError : null,
              touched && isEmailValid && email.length > 0
                ? styles.inputSuccess
                : null,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={ms(18)}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={handleChangeText}
              onBlur={handleBlur}
            />
            {/* tick icon when valid */}
            
            {/* error icon */}
            {touched && error ? (
              <Ionicons name="alert-circle" size={ms(18)} color={colors.danger} />
            ) : null}
          </View>
          {/* Error message */}
          {touched && error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {/* Success message */}
          {success && (
            <Text style={styles.successText}>
              If an account exists, a 4-digit code was sent. Check your inbox
              (or backend logs if email isn’t configured).
            </Text>
          )}
        </View>
        {/* CTA */}
        <Pressable
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accentOn} />
          ) : (
            <Text style={styles.ctaText}>Request password reset</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
export default ForgotPassword;
function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: s(24),
  },
  heading: {
    fontSize: s(30),
    marginTop: vs(1),
    color: c.text,
    fontWeight: "600",
    marginBottom: vs(15),
    lineHeight: s(46),
  },
  info: {
    fontSize: s(15),
    color: c.textMuted,
    marginBottom: s(50),
  },
  backBtn: {
    marginBottom: vs(20),
    marginTop: s(10),
  },
  input: {
    flex: 1,
    fontSize: ms(14),
    color: c.text,
    padding: 0,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    marginBottom: vs(6),
    gap: s(10),
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  inputError: {
    borderColor: c.danger,
  },
  inputSuccess: {
    borderColor: "#4CAF50",
  },
  inputIcon: {
    width: s(20),
  },
  errorText: {
    fontSize: ms(14),
    color: c.danger,
    marginBottom: vs(10),
    marginLeft: s(4),
     marginTop:s(10),
  },
  successText: {
    fontSize: ms(14),
    color: "#4CAF50",
    marginBottom: vs(10),
    marginLeft: s(4),
    fontWeight: "500",
    marginTop:s(10),
  },
  cta: {
    backgroundColor: c.accent,
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
    marginTop:s(40),
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: ms(16),
    fontWeight: "600",
    color: c.accentOn,
  },
});
}
