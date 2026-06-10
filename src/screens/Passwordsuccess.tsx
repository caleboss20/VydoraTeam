import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs, ms } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
// ── Types ─────────────────────────────────────────────────────────
type RootStackParamList = {
  signin: undefined;
};
function PasswordSuccess(){
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#13151A" />
      <View style={styles.content}>
        {/* Glow rings + icon */}
        <View style={styles.outerGlow}>
          <View style={styles.middleGlow}>
            <View style={styles.innerCircle}>
              <Ionicons name="checkmark" size={ms(40)} color="#F5A623" />
            </View>
          </View>
        </View>
        {/* Heading */}
        <Text style={styles.heading}>Password Updated!</Text>
        {/* Subtext */}
        <Text style={styles.subText}>
          Your password has been updated successfully.{"\n"}You can now sign in with your new password.
        </Text>
      </View>
      {/* CTA */}
      <Pressable
        style={styles.cta}
        onPress={() => navigation.navigate("signin")}
      >
        <Text style={styles.ctaText}>Back to Login</Text>
      </Pressable>
    </SafeAreaView>
  );
};
export default PasswordSuccess;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13151c",
    paddingHorizontal: s(24),
    justifyContent: "space-between",
    paddingBottom: vs(40),
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Glow layers — outermost to innermost
  outerGlow: {
    width: s(180),
    height: s(180),
    borderRadius: s(90),
    backgroundColor: "rgba(245, 166, 35, 0.07)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(36),
  },
  middleGlow: {
    width: s(130),
    height: s(130),
    borderRadius: s(65),
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: s(88),
    height: s(88),
    borderRadius: s(44),
    backgroundColor: "rgba(245, 166, 35, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Heading
  heading: {
    fontSize: s(26),
    color: "#ffffff",
    fontWeight: "800",
    textAlign: "center",
    marginBottom: vs(14),
  },
  // Subtext
  subText: {
    fontSize: ms(13),
    color: "#aaaaaa",
    textAlign: "center",
    lineHeight: ms(21),
    paddingHorizontal: s(10),
  },
  // CTA
  cta: {
    backgroundColor: "#F5A623",
    borderRadius: s(50),
    paddingVertical: vs(12),
    alignItems: "center",
  },
  ctaText: {
    fontSize: ms(15),
    fontWeight: "700",
    color: "#1A0E00",
  },
});