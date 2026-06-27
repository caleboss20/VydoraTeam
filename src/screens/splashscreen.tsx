import { Image, StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import { s } from "react-native-size-matters";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "./Contexts/Authcontext"; 
const Splashscreen = () => {
  const navigation = useNavigation();
  const { user, isLoadingAuth } = useAuth();
  useEffect(() => {
    const checkAndNavigate = async () => {
      // wait for auth to finish rehydrating from AsyncStorage
      if (isLoadingAuth) return;
      const onboardingDone = await AsyncStorage.getItem('vydora:onboarding:done');
      if (!onboardingDone) {
        // first time user — show onboarding
        navigation.navigate("onboarding");
      } else if (user) {
        // returning user with valid session — go straight to dashboard
        navigation.navigate("projects");
      } else {
        // returning user but not logged in — go to signin
        navigation.navigate("signin");
      }
    };
    const timer = setTimeout(checkAndNavigate, 2000);
    return () => clearTimeout(timer);
  }, [isLoadingAuth, user]);
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
    // marginRight:s(10),
  },
});
