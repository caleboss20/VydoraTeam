import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { TextInput } from "react-native";
// ── Types ─────────────────────────────────────────────────────────
type RootStackParamList = {
  ForgotPassword: undefined;
  CreateNewPassword: undefined;
};
// ── Helper: generate 4 digit OTP ─────────────────────────────────
const generateOTP = (): string => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  console.log("🔐 DEV OTP CODE:", code); // dev only
  return code;
};
function VerifyEmail() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [code, setCode] = useState<string>(()=>generateOTP());
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  // refs for each input box
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  // shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  // ── Resend countdown ────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer === 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);
  // ── Shake animation ─────────────────────────────────────────────
  const triggerShake = (): void => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };
  // ── OTP input handlers ──────────────────────────────────────────
  const handleChange = (value: string, index: number): void => {
    // only allow digits
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    // move to next box
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyPress = (key: string, index: number): void => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };
  // ── Resend ──────────────────────────────────────────────────────
  const handleResend = (): void => {
    if (!canResend) return;
    const newCode = generateOTP();
    setCode(newCode);
    setOtp(["", "", "", ""]);
    setError("");
    setCanResend(false);
    setResendTimer(30);
    inputRefs.current[0]?.focus();
  };
  // ── Verify ──────────────────────────────────────────────────────
  const handleVerify = (): void => {
    const entered = otp.join("");
    // check all boxes filled
    if (entered.length < 4) {
      setError("Please enter the 4 digit code");
      triggerShake();
      return;
    }
    // check code match
    if (entered !== code) {
      setError("Incorrect code. Please try again");
      triggerShake();
      setOtp(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }
    // correct — load and navigate
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.navigate("passwordreset");
    }, 2000);
  };
  const enteredFull = otp.every((d) => d !== "");
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#13151A" />
      {/* Back */}
      <Pressable
        style={styles.backBtn}
        onPress={() => navigation.navigate("forgotpassword")}
      >
        <Ionicons name="arrow-back" size={ms(20)} color="#FFFFFF" />
        {/* <Text style={styles.backText}>Back</Text> */}
      </Pressable>
      {/* Heading */}
      <Text style={styles.heading}>Verify{"\n"}Your Email</Text>
      {/* Subtext */}
      <Text style={styles.subText}>
        Please enter the 4 digit code{"\n"}Sent to your email
      </Text>
      {/* OTP Boxes */}
      <Animated.View
        style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.otpBox,
              digit ? styles.otpBoxFilled : null,
              error ? styles.otpBoxError : null,
            ]}
            value={digit}
            onChangeText={(v) => handleChange(v, index)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(nativeEvent.key, index)
            }
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            selectionColor="#F5A623"
          />
        ))}
      </Animated.View>
      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {/* Resend */}
      <Pressable
        style={styles.resendWrap}
        onPress={handleResend}
        disabled={!canResend}
      >
        <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
          {canResend ? "Resend Code" : `Resend Code in ${resendTimer}s`}
        </Text>
      </Pressable>
      {/* Verify Button */}
      <Pressable
        style={[styles.cta, (!enteredFull || loading) && styles.ctaDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#1A0E00" />
        ) : (
          <Text style={styles.ctaText}>Verify</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
};
export default VerifyEmail;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13151c",
    paddingHorizontal: s(24),
  },
  // Back
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
    marginTop: vs(10),
    marginBottom: vs(32),
  },
  backText: {
    fontSize: ms(14),
    color: "#FFFFFF",
  },
  // Heading
  heading: {
    fontSize: s(32),
    color: "#ffffff",
    fontWeight: "800",
    lineHeight: s(40),
    marginBottom: vs(14),
  },
  // Subtext
  subText: {
   color:"#ccc",
   marginBottom:s(30),
   lineHeight:s(21),
   fontSize:s(13),

  },
  // OTP
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(12),
  },
  otpBox: {
    width: s(55),
    height: s(55),
    backgroundColor: "#1e1e1e",
    borderRadius: s(12),
    fontSize: ms(22),
    fontWeight: "700",
    color: "#FFFFFF",
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  otpBoxFilled: {
    borderColor: "#F5A623",
  },
  otpBoxError: {
    borderColor: "#eb4343",
  },
  // Error
  errorText: {
    fontSize: ms(11),
    color: "#eb4343",
    marginBottom: vs(10),
    marginLeft: s(4),
  },
  // Resend
  resendWrap: {
    alignItems: "center",
    marginBottom: vs(32),
    marginTop: s(46),
  },
  resendText: {
    fontSize: ms(13),
    color: "#cecece",
    fontWeight: "600",
  },
  resendDisabled: {
    color: "#ccc",
  },
  // CTA
  cta: {
    backgroundColor: "#F5A623",
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
    // alignSelf:'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: ms(15),
    fontWeight: "700",
    color: "#13151c",
  },
});