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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from "@react-navigation/native";
import { useState, useMemo } from "react";
import { useTheme, ThemeColors } from "./Contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./Contexts/Authcontext";
import { useWowPath } from "./Contexts/useWowPath";
import { CONFIG } from "./config"; // adjust path if config.ts sits elsewhere relative to this file
import { useGoogleIdToken } from "./services/googleAuth";
// ── Types ─────────────────────────────────────────────────────────
// signup params + AcceptInvite added to support the invite-driven signup path:
// - prefillEmail / pendingInviteToken arrive when AcceptInviteScreen sends a
//   logged-out invitee here
// - AcceptInvite needs to be listed since this screen may navigate there
//   after a successful invite-driven signup
type RootStackParamList = {
  splashscreen: undefined;
  signin:
    | {
        prefillEmail?: string;
        needsOnboarding?: boolean;
      }
    | undefined;
  onboarding: undefined;
  projects: undefined;
  signup:
    | {
        prefillEmail?: string;
        pendingInviteToken?: string;
        referralCode?: string;
        resumeWow?: boolean;
      }
    | undefined;
  AcceptInvite: { token: string };
  editorscreen: { wow?: boolean; initialTool?: string } | undefined;
};
interface ValidationFields {
  fullName: string;
  email: string;
  password: string;
}
interface ValidationErrors {
  fullName?: string;
  email?: string;
  password?: string;
}
interface TouchedFields {
  fullName?: boolean;
  email?: boolean;
  password?: boolean;
}
export default function Signupscreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "signup">>();
  const { register, loginWithGoogle, isLoadingAuth, error } = useAuth();
  const { startWowPath, starting } = useWowPath();
  const { promptGoogle, ready: googleReady } = useGoogleIdToken();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [fullName, setFullName] = useState<string>("");
  // Prefilled with the invited email address, if this screen was reached
  // via an invite link — reduces the chance of signing up with a
  // different email than the one that was actually invited.
  const [email, setEmail] = useState<string>(route.params?.prefillEmail ?? "");
  const [password, setPassword] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>(
    route.params?.referralCode?.trim().toUpperCase() ?? ""
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  // ── Validation ────────────────────────────────────────────────
  const validate = (fields: ValidationFields): ValidationErrors => {
    const e: ValidationErrors = {};
    if (!fields.fullName || fields.fullName.trim() === "") {
      e.fullName = "Full name is required";
    } else if (fields.fullName.trim().length < 2) {
      e.fullName = "Name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(fields.fullName.trim())) {
      e.fullName = "Name can only contain letters";
    }
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
    const e = validate({ fullName, email, password });
    setErrors(e);
  };
  const handleGoogle = async (): Promise<void> => {
    if (!googleReady || googleBusy || isLoadingAuth || starting) return;
    try {
      setGoogleBusy(true);
      const idToken = await promptGoogle();
      if (!idToken) return;
      await loginWithGoogle(idToken, referralCode.trim() || undefined);
      const pendingToken =
        route.params?.pendingInviteToken ??
        (await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.PENDING_INVITE_TOKEN));
      if (pendingToken) {
        navigation.navigate("AcceptInvite", { token: pendingToken });
        return;
      }
      const resumeWow = !!route.params?.resumeWow;
      if (resumeWow) {
        await AsyncStorage.setItem("vydora:onboarding:done", "true");
        await startWowPath();
        return;
      }
      await AsyncStorage.removeItem("vydora:onboarding:done");
      navigation.reset({
        index: 0,
        routes: [{ name: "onboarding" }],
      });
    } catch (e: any) {
      Alert.alert("Google sign-in", e?.message ?? "Could not sign in with Google.");
    } finally {
      setGoogleBusy(false);
    }
  };
  const handleSignup = async (): Promise<void> => {
    setTouched({ fullName: true, email: true, password: true });
    const e = validate({ fullName, email, password });
    setErrors(e);
    if (Object.keys(e).length === 0) {
      try {
        // Real API: POST /api/v1/auth/register → user row in Postgres + JWTs.
        await register(
          fullName,
          email,
          password,
          referralCode.trim() || undefined
        );
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
      // Stay logged in — fresh accounts go straight into the create hook.
      await AsyncStorage.removeItem("vydora:onboarding:done");
      await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_DONE);
      await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.WOW_PATH_ACTIVE);

      const resumeWow = !!route.params?.resumeWow;
      if (resumeWow) {
        await AsyncStorage.setItem("vydora:onboarding:done", "true");
        await startWowPath();
        return;
      }
      // First-time signup → onboarding (create promise) → wow CTA on last slide.
      navigation.reset({
        index: 0,
        routes: [{ name: "onboarding" }],
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
            activeOpacity={0.7}
            onPress={() => navigation.navigate("splashscreen")}
          >
            <Ionicons name="arrow-back" size={ms(20)} color={colors.text} />
          </TouchableOpacity>
          {/* Heading */}
          <Text style={styles.heading}>Create your{"\n"}Account</Text>
          {/* Full Name Input */}
          <View style={[styles.inputRow, hasError("fullName") && styles.inputError]}>
            <Ionicons name="person-outline" size={ms(18)} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={fullName}
              onChangeText={(v: string) => {
                setFullName(v);
                if (touched.fullName) {
                  const e = validate({ fullName: v, email, password });
                  setErrors(e);
                }
              }}
              onBlur={() => handleBlur("fullName")}
            />
          </View>
          {hasError("fullName") && <Text style={styles.errorText}>{errors.fullName}</Text>}
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
                  const e = validate({ fullName, email: v, password });
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
                  const e = validate({ fullName, email, password: v });
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
          {/* Optional friend invite — same input row pattern */}
          <View style={styles.inputRow}>
            <Ionicons name="gift-outline" size={ms(18)} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Invite code (optional)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              value={referralCode}
              onChangeText={(v: string) => setReferralCode(v.toUpperCase())}
            />
          </View>
          {/* Auth error from context */}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {/* Sign Up CTA */}
          <TouchableOpacity
            style={[styles.cta, (isLoadingAuth || starting) && styles.ctaDisabled]}
            onPress={handleSignup}
            activeOpacity={0.85}
            disabled={isLoadingAuth || starting}
          >
            {isLoadingAuth || starting ? (
              <ActivityIndicator size="small" color={colors.accentOn} />
            ) : (
              <Text style={styles.ctaText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          {/* Or continue with */}
          <Text style={styles.orText}>or continue with</Text>
          {/* Social icons row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8}>
              <Image style={styles.logo} source={require("../../assets/facebook.png")} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIconBtn}
              activeOpacity={0.8}
              onPress={() => void handleGoogle()}
              disabled={!googleReady || googleBusy || isLoadingAuth || starting}
            >
              {googleBusy ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Image style={styles.logo} source={require("../../assets/google.png")} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8}>
              <Ionicons name="logo-apple" size={ms(22)} color={colors.text} />
            </TouchableOpacity>
          </View>
          {/* Sign In */}
          <View style={styles.signupRow}>
            <Text style={styles.signupMuted}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("signin")}>
              <Text style={styles.signupLink}>Sign In</Text>
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
    paddingHorizontal: s(20),
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
    marginBottom: vs(26),
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
    marginBottom: s(10),
    marginLeft: s(4),
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
    marginTop: s(20),
  },
  ctaDisabled: {
    opacity: 0.5,
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
    marginTop: vs(20),
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
    marginTop: vs(20),
    marginBottom: vs(30),
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
});
}
