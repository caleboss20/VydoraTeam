import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
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
// ── Types ─────────────────────────────────────────────────────────
type RootStackParamList = {
  verifyemail: { email: string };
  passwordreset: { email: string; resetToken: string };
  passwordsuccess: undefined;
};
interface PasswordErrors {
  newPassword?: string;
  confirmPassword?: string;
}
interface TouchedFields {
  newPassword?: boolean;
  confirmPassword?: boolean;
}
// ── Validation ────────────────────────────────────────────────────
const validatePasswords = (
  newPassword: string,
  confirmPassword: string
): PasswordErrors => {
  const e: PasswordErrors = {};
  if (!newPassword || newPassword.trim() === "") {
    e.newPassword = "Password is required";
  } else if (newPassword.length < 8) {
    e.newPassword = "Password must be at least 8 characters";
  } else if (!/[A-Z]/.test(newPassword)) {
    e.newPassword = "Must contain at least one uppercase letter";
  } else if (!/[a-z]/.test(newPassword)) {
    e.newPassword = "Must contain at least one lowercase letter";
  } else if (!/[0-9]/.test(newPassword)) {
    e.newPassword = "Must contain at least one number";
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
    e.newPassword = "Must contain at least one special character";
  }
  if (!confirmPassword || confirmPassword.trim() === "") {
    e.confirmPassword = "Please confirm your password";
  } else if (newPassword !== confirmPassword) {
    e.confirmPassword = "Passwords do not match";
  }
  return e;
};
function PasswordReset(){
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "passwordreset">>();
  const resetToken = route.params?.resetToken || "";
  const email = route.params?.email || "";
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  const hasError = (field: keyof PasswordErrors): boolean =>
    !!(touched[field] && errors[field]);
  const isFieldValid = (field: keyof PasswordErrors): boolean =>
    !!(touched[field] && !errors[field] &&
      (field === "newPassword" ? newPassword.length > 0 : confirmPassword.length > 0));
  const handleBlur = (field: keyof TouchedFields): void => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e = validatePasswords(newPassword, confirmPassword);
    setErrors(e);
  };
  const handleNewPasswordChange = (value: string): void => {
    setNewPassword(value);
    if (touched.newPassword || touched.confirmPassword) {
      const e = validatePasswords(value, confirmPassword);
      setErrors(e);
    }
  };
  const handleConfirmPasswordChange = (value: string): void => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const e = validatePasswords(newPassword, value);
      setErrors(e);
    }
  };
  const handleSave = async (): Promise<void> => {
    setTouched({ newPassword: true, confirmPassword: true });
    const e = validatePasswords(newPassword, confirmPassword);
    setErrors(e);
    setApiError("");
    if (Object.keys(e).length !== 0) return;
    if (!resetToken) {
      setApiError("Reset session expired. Request a new code.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      navigation.navigate("passwordsuccess");
    } catch (err: any) {
      setApiError(err?.message || "Could not reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
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
          {/* Back */}
          <Pressable
            style={styles.backBtn}
            onPress={() =>
              navigation.navigate("verifyemail", { email: email || "" })
            }
          >
            <Ionicons name="arrow-back" size={ms(20)} color="#FFFFFF" />
          </Pressable>
          {/* Heading */}
          <Text style={styles.heading}>Create{"\n"}New password</Text>
          {/* Subtext */}
          <Text style={styles.subText}>
            Your new password must be different{"\n"}from previously used password
          </Text>
          {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}
          {/* New Password */}
          <View
            style={[
              styles.inputRow,
              hasError("newPassword") && styles.inputError,
              isFieldValid("newPassword") && styles.inputSuccess,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={ms(16)}
              color="#ccc"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#cccccc"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              onBlur={() => handleBlur("newPassword")}
            />
            <Pressable onPress={() => setShowNew(!showNew)}>
              <Ionicons
                name={showNew ? "eye-outline" : "eye-off-outline"}
                size={ms(16)}
                color="#ccc"
              />
            </Pressable>
          </View>
          {hasError("newPassword") && (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          )}
          {/* Confirm Password */}
          <View
            style={[
              styles.inputRow,
              hasError("confirmPassword") && styles.inputError,
              isFieldValid("confirmPassword") && styles.inputSuccess,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={ms(16)}
              color="#ccc"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#cccccc"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              onBlur={() => handleBlur("confirmPassword")}
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={ms(16)}
                color="#ccc"
              />
            </Pressable>
          </View>
          {hasError("confirmPassword") && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
          {/* Password strength hints */}
          {touched.newPassword && newPassword.length > 0 && (
            <View style={styles.hintsWrap}>
              <StrengthHint label="8+ characters" met={newPassword.length >= 8} />
              <StrengthHint label="Uppercase letter" met={/[A-Z]/.test(newPassword)} />
              <StrengthHint label="Lowercase letter" met={/[a-z]/.test(newPassword)} />
              <StrengthHint label="Number" met={/[0-9]/.test(newPassword)} />
              <StrengthHint label="Special character" met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)} />
            </View>
          )}
          {/* Save Button */}
          <Pressable
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#13151c" />
            ) : (
              <Text style={styles.ctaText}>Reset Password</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
// ── Strength hint row ─────────────────────────────────────────────
interface StrengthHintProps {
  label: string;
  met: boolean;
}
const StrengthHint = ({ label, met }: StrengthHintProps): JSX.Element => (
  <View style={hintStyles.row}>
    <Ionicons
      name={met ? "checkmark-circle" : "ellipse-outline"}
      size={ms(14)}
      color={met ? "#4CAF50" : "#555555"}
    />
    
    <Text style={[hintStyles.label, met && hintStyles.labelMet]}>{label}</Text>
  </View>
);
const hintStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
    marginBottom: vs(4),
  },
  label: {
    fontSize: ms(13),
    color: "#555555",
  },
  labelMet: {
    color: "#4CAF50",
  },
});
export default PasswordReset;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13151c",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: s(24),
    paddingBottom: vs(40),
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
    fontSize: ms(14),
    color: "#aaaaaa",
    lineHeight: ms(20),
    marginBottom: vs(32),
  },
  // Inputs
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: vs(13),
    marginBottom: vs(10),
    gap: s(10),
    borderWidth: s(0.5),
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#eb4343",
  },
  inputSuccess: {
    borderColor: "#4CAF50",
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
    fontSize: ms(13),
    color: "#eb4343",
    marginBottom: vs(17),
    marginLeft: s(4),
  },
  // Hints
  hintsWrap: {
    marginBottom: vs(24),
    marginLeft: s(4),
    marginTop: vs(8),
    
  },
  // CTA
  cta: {
    backgroundColor: "#F5A623",
    borderRadius: s(50),
    paddingVertical: vs(11),
    alignItems: "center",
    marginTop: vs(40),
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