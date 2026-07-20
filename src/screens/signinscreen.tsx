
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useTheme, ThemeColors } from "./Contexts/ThemeContext";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./Contexts/Authcontext";
import { CONFIG } from "./config"; // adjust path if config.ts sits elsewhere relative to this file
// signin params + AcceptInvite added for the invite-driven login path —
// same reasoning as Signupscreen: an invitee might already have an account
// and land here instead of signup.
type RootStackParamList = {
  signup: undefined;
  forgotpassword: undefined;
  signin:
    | {
        prefillEmail?: string;
        pendingInviteToken?: string;
        needsOnboarding?: boolean;
      }
    | undefined;
  AcceptInvite: { token: string };
  onboarding: undefined;
  projects: undefined;
};
interface ValidationFields {
  email: string;
  password: string;
}
interface ValidationErrors {
  email?: string;
  password?: string;
}
interface TouchedFields {
  email?: boolean;
  password?: boolean;
}
export default function SignInscreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "signin">>();
  const { login, isLoadingAuth, error } = useAuth();
  const [email, setEmail] = useState<string>(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  // ── Validation ────────────────────────────────────────────────
  const validate = (fields: ValidationFields): ValidationErrors => {
    const e: ValidationErrors = {};
    if (!fields.email || fields.email.trim() === "") {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      e.email = "Enter a valid email address";
    }
    if (!fields.password || fields.password === "") {
      e.password = "Password is required";
    } else if (fields.password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }
    return e;
  };
  const handleBlur = (field: keyof TouchedFields): void => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e = validate({ email, password });
    setErrors(e);
  };
  const handleSignIn = async (): Promise<void> => {
    setTouched({ email: true, password: true });
    const e = validate({ email, password });
    setErrors(e);
    if (Object.keys(e).length === 0) {
      try {
        // Real API: POST /api/v1/auth/login → validates against DB password hash.
        await login(email, password);
      } catch {
        return; // AuthContext already set `error` for the UI
      }
      const pendingToken =
        route.params?.pendingInviteToken ??
        (await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN));
      if (pendingToken) {
        navigation.navigate("AcceptInvite", { token: pendingToken });
        return;
      }
      // New signups pass needsOnboarding; otherwise show tutorial until marked done.
      const onboardingDone = await AsyncStorage.getItem("vydora:onboarding:done");
      if (route.params?.needsOnboarding || !onboardingDone) {
        navigation.reset({
          index: 0,
          routes: [{ name: "onboarding" }],
        });
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "projects" }],
      });
    }
  };
  const hasError = (field: keyof ValidationErrors): boolean =>
    !!(touched[field] && errors[field]);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back arrow */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("signup")}
          >
            <Ionicons name="arrow-back" size={ms(20)} color={colors.text} />
          </TouchableOpacity>
          {/* Heading */}
          <Text style={styles.heading}>Login to {"\n"}your Account</Text>
          {/* Email Input */}
          <View style={[styles.inputRow, hasError("email") && styles.inputError]}>
            <Ionicons name="mail-outline" size={ms(18)} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(v: string) => {
                setEmail(v);
                if (touched.email) {
                  const e = validate({ email: v, password });
                  setErrors(e);
                }
              }}
              onBlur={() => handleBlur("email")}
            />
          </View>
          {hasError("email") && <Text style={styles.errorText}>{errors.email}</Text>}
          {/* Password Input */}
          <View style={[styles.inputRow, hasError("password") && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={ms(18)} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(v: string) => {
                setPassword(v);
                if (touched.password) {
                  const e = validate({ email, password: v });
                  setErrors(e);
                }
              }}
              onBlur={() => handleBlur("password")}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={ms(18)}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          {hasError("password") && <Text style={styles.errorText}>{errors.password}</Text>}
          {/* Auth error from context */}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {/* Remember Me */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={ms(12)} color={colors.background} />}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>
          {/* Sign In CTA */}
          <TouchableOpacity
            style={[styles.cta, isLoadingAuth && styles.ctaDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={isLoadingAuth}
          >
            {isLoadingAuth ? (
              <ActivityIndicator size="small" color={colors.accentOn} />
            ) : (
              <Text style={styles.ctaText}>Sign In</Text>
            )}
          </TouchableOpacity>
          {/* Forgot Password */}
          <Pressable
            style={styles.forgotWrap}
            onPress={() => navigation.navigate("forgotpassword")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
          {/* Or continue with */}
          <Text style={styles.orText}>or continue with</Text>
          {/* Social icons row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8}>
              <Image style={styles.logo} source={require("../../assets/facebook.png")} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8}>
              <Image style={styles.logo} source={require("../../assets/google.png")} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8}>
              <Ionicons name="logo-apple" size={ms(22)} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Sign Up */}
          <View style={styles.signupRow}>
            <Text style={styles.signupMuted}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate("signup")}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}






function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.background,
  },
  scroll: {
    // flexGrow: 1,
    paddingHorizontal: s(24),
    // paddingTop: vs(20),
    // paddingBottom: vs(20),
  },
  backBtn: {
    marginBottom: vs(28),
  },
  heading: {
    fontSize: s(32),
    marginTop: vs(0),
    color: c.text,
    fontWeight: "600",
    marginBottom: vs(35),
    lineHeight: s(46),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surface,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    marginBottom: vs(16),
    gap: s(10),
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  inputError: {
    borderColor: c.danger,
  },
  inputIcon: {
    width: s(20),
  },
  input: {
    flex: 1,
    fontSize: ms(14),
    color: c.text,
    padding: 0,
  },
  errorText: {
    fontSize: ms(11),
    color: c.danger,
    marginBottom: s(16),
    marginLeft: s(4),
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    marginTop: vs(6),
    marginBottom: vs(24),
    alignSelf: "center",
  },
  checkbox: {
    width: s(16),
    height: s(16),
    borderRadius: s(5),
    borderWidth: 2,
    borderColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  rememberText: {
    fontSize: ms(13),
    color: c.textSecondary,
  },
  cta: {
    backgroundColor: c.accent,
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
  },
  ctaText: {
    fontSize: ms(14),
    fontWeight: "700",
    color: c.accentOn,
  },
  forgotWrap: {
    alignItems: "center",
  },
  forgotText: {
    fontSize: ms(13),
    color: c.accent,
  },
  orText: {
    marginTop: vs(40),
    fontSize: ms(13),
    color: c.textMuted,
    textAlign: "center",
    marginBottom: vs(16),
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: s(16),
  },
  socialIconBtn: {
    width: s(60),
    height: s(48),
    backgroundColor: c.surface,
    borderRadius: s(12),
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: s(18),
    height: s(18),
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: s(2),
    marginTop: vs(25),
  },
  signupMuted: {
    fontSize: ms(13),
    color: c.textMuted,
  },
  signupLink: {
    fontSize: ms(13),
    color: c.accent,
    fontWeight: "700",
  },
  ctaDisabled:{
     backgroundColor: c.textMuted,
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
  }
});
}
