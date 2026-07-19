import { Image, StyleSheet, View } from "react-native";
import React, { useEffect } from "react";
import { s } from "react-native-size-matters";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./Contexts/Authcontext";

const Splashscreen = () => {
  const navigation = useNavigation<any>();
  const { user, isLoadingAuth } = useAuth();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13151c",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: s(320),
    height: s(320),
  },
});
