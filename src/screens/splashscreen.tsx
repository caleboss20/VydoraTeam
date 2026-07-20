import { Image, StyleSheet, View } from "react-native";
import React, { useEffect, useMemo } from "react";
import { useTheme, ThemeColors } from "./Contexts/ThemeContext";
import { s } from "react-native-size-matters";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./Contexts/Authcontext";

const Splashscreen = () => {
  const navigation = useNavigation<any>();
  const { user, isLoadingAuth } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    const checkAndNavigate = async () => {
      if (isLoadingAuth) return;

      const onboardingDone = await AsyncStorage.getItem(
        "vydora:onboarding:done"
      );

      if (user) {
        // Signed-in users see onboarding once before the dashboard.
        if (!onboardingDone) {
          navigation.reset({
            index: 0,
            routes: [{ name: "onboarding" }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: "projects" }],
          });
        }
        return;
      }

      // Logged out → sign in / sign up (onboarding comes after first login).
      navigation.reset({
        index: 0,
        routes: [{ name: "signin" }],
      });
    };

    const timer = setTimeout(checkAndNavigate, 2000);
    return () => clearTimeout(timer);
  }, [isLoadingAuth, user, navigation]);

  return (
    <View style={styles.container}>
      <Image style={styles.logo} source={require("../../assets/logo.png")} />
    </View>
  );
};

export default Splashscreen;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: s(320),
      height: s(320),
    },
  });
}
