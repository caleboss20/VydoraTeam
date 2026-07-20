import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Animated,
  TextInput,
} from "react-native";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTheme, ThemeColors } from "./Contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  NavigationProp,
  useRoute,
  RouteProp,
} from "@react-navigation/native";
import { authService } from "./services/authservice";

type RootStackParamList = {
  forgotpassword: undefined;
  verifyemail: { email: string };
  passwordreset: { email: string; resetToken: string };
};

function VerifyEmail() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "verifyemail">>();
  const email = (route.params?.email || "").trim().toLowerCase();

  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!email) {
      navigation.navigate("forgotpassword");
    }
  }, [email, navigation]);

  useEffect(() => {
    if (resendTimer === 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

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

  const handleChange = (value: string, index: number): void => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
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

  const handleResend = async (): Promise<void> => {
    if (!canResend || !email) return;
    try {
      setError("");
      await authService.forgotPassword(email);
      setOtp(["", "", "", ""]);
      setCanResend(false);
      setResendTimer(30);
      inputRefs.current[0]?.focus();
    } catch (e: any) {
      setError(e?.message || "Could not resend code.");
    }
  };

  const handleVerify = async (): Promise<void> => {
    const entered = otp.join("");
    if (entered.length < 4) {
      setError("Please enter the 4 digit code");
      triggerShake();
      return;
    }
    if (!email) {
      setError("Missing email. Go back and try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { resetToken } = await authService.verifyResetOtp(email, entered);
      navigation.navigate("passwordreset", { email, resetToken });
    } catch (e: any) {
      setError(e?.message || "Incorrect code. Please try again");
      triggerShake();
      setOtp(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const enteredFull = otp.every((d) => d !== "");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Pressable
        style={styles.backBtn}
        onPress={() => navigation.navigate("forgotpassword")}
      >
        <Ionicons name="arrow-back" size={ms(20)} color={colors.text} />
      </Pressable>
      <Text style={styles.heading}>Verify{"\n"}Your Email</Text>
      <Text style={styles.subText}>
        Please enter the 4 digit code{"\n"}
        Sent to {email || "your email"}
      </Text>
      <Animated.View
        style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
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
            selectionColor={colors.accent}
          />
        ))}
      </Animated.View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        style={styles.resendWrap}
        onPress={handleResend}
        disabled={!canResend}
      >
        <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
          {canResend ? "Resend Code" : `Resend Code in ${resendTimer}s`}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.cta, (!enteredFull || loading) && styles.ctaDisabled]}
        onPress={handleVerify}
        disabled={loading || !enteredFull}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.accentOn} />
        ) : (
          <Text style={styles.ctaText}>Verify</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

export default VerifyEmail;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: s(24),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
    marginTop: vs(10),
    marginBottom: vs(32),
  },
  heading: {
    fontSize: s(32),
    color: c.text,
    fontWeight: "800",
    lineHeight: s(40),
    marginBottom: vs(14),
  },
  subText: {
    color: c.textMuted,
    marginBottom: s(30),
    lineHeight: s(21),
    fontSize: s(13),
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(12),
  },
  otpBox: {
    width: s(55),
    height: s(55),
    backgroundColor: c.surface,
    borderRadius: s(12),
    fontSize: ms(22),
    fontWeight: "700",
    color: c.text,
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  otpBoxFilled: {
    borderColor: c.accent,
  },
  otpBoxError: {
    borderColor: c.danger,
  },
  errorText: {
    fontSize: ms(11),
    color: c.danger,
    marginBottom: vs(10),
    marginLeft: s(4),
  },
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
    color: c.textMuted,
  },
  cta: {
    backgroundColor: c.accent,
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginBottom: vs(16),
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: ms(15),
    fontWeight: "700",
    color: c.background,
  },
});
}
