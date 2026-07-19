
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
import { useState } from "react";
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
  signin: { prefillEmail?: string; pendingInviteToken?: string } | undefined;
  AcceptInvite: { token: string };
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
      <StatusBar barStyle="light-content" backgroundColor="#13151A" />
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
            <Ionicons name="arrow-back" size={ms(20)} color="#FFFFFF" />
          </TouchableOpacity>
          {/* Heading */}
          <Text style={styles.heading}>Login to {"\n"}your Account</Text>
          {/* Email Input */}
          <View style={[styles.inputRow, hasError("email") && styles.inputError]}>
            <Ionicons name="mail-outline" size={ms(18)} color="#ccc" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#cccccc"
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
            <Ionicons name="lock-closed-outline" size={ms(18)} color="#ccc" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#cccccc"
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
                color="#ccc"
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
              {rememberMe && <Ionicons name="checkmark" size={ms(12)} color="#13151A" />}
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
              <ActivityIndicator size="small" color="#1A0E00" />
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
              <Ionicons name="logo-apple" size={ms(22)} color="#FFFFFF" />
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






const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#13151c",
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
    color: "#ffffff",
    fontWeight: "600",
    marginBottom: vs(35),
    lineHeight: s(46),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    marginBottom: vs(16),
    gap: s(10),
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#eb4343",
  },
  inputIcon: {
    width: s(20),
  },
  input: {
    flex: 1,
    fontSize: ms(14),
    color: "#FFFFFF",
    padding: 0,
  },
  errorText: {
    fontSize: ms(11),
    color: "#FF4D4D",
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
    borderColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxActive: {
    backgroundColor: "#F5A623",
    borderColor: "#F5A623",
  },
  rememberText: {
    fontSize: ms(13),
    color: "#AAAAAA",
  },
  cta: {
    backgroundColor: "#F5C518",
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
  },
  ctaText: {
    fontSize: ms(14),
    fontWeight: "700",
    color: "#1A0E00",
  },
  forgotWrap: {
    alignItems: "center",
  },
  forgotText: {
    fontSize: ms(13),
    color: "#F5A623",
  },
  orText: {
    marginTop: vs(40),
    fontSize: ms(13),
    color: "#ccc",
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
    backgroundColor: "#1e1e1e",
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
    color: "#666666",
  },
  signupLink: {
    fontSize: ms(13),
    color: "#F5A623",
    fontWeight: "700",
  },
  ctaDisabled:{
     backgroundColor: "#ccc",
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
  }
});