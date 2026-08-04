import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import MainStackNavigator from "./src/screens/MainstackNavigator";
import { NavigationContainer, LinkingOptions, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { AuthProvider } from "./src/screens/Contexts/Authcontext";
import { ProjectProvider } from "./src/screens/Contexts/projectContext";
import { ClipProvider } from "./src/screens/Contexts/clipContext";
import { MemberProvider } from "./src/screens/Contexts/memberContext";
import { CommentProvider } from "./src/screens/Contexts/commentContext";
import { MessageProvider } from "./src/screens/Contexts/messageContext";
import { NotificationProvider } from "./src/screens/Contexts/notificatinContext";
import { ExportProvider } from "./src/screens/Contexts/exportContext";
import { VideoProjectProvider } from "./src/screens/Contexts/VideoProjectContext";
import { VersionHistoryProvider } from "./src/screens/Contexts/VersionHistoryContext";
import { InviteProvider } from "./src/screens/Contexts/InviteContext";
import { ThemeProvider, useTheme } from "./src/screens/Contexts/ThemeContext";
import { resolveApiEndpoint } from "./src/screens/services/apiEndpoint";

const linking: LinkingOptions<any> = {
  prefixes: ["vydora://", "https://vydora.io", "https://vydora.app"],
  config: {
    screens: {
      AcceptInvite: "invite/:token",
      GuestReview: "review/:token",
      // Share links: vydora://referral/VYD-XXXXXX · https://vydora.app/r/VYD-XXXXXX
      referral: {
        path: "referral/:code",
        parse: {
          code: (code: string) => code?.toUpperCase?.() ?? code,
        },
      },
      signup: {
        path: "r/:referralCode",
        parse: {
          referralCode: (code: string) => code?.toUpperCase?.() ?? code,
        },
      },
    },
  },
};

function AppNavigation() {
  const { isDark, colors } = useTheme();
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <MainStackNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  // Preload icon font so Ionicons don't flash/lag after Metro serves the JS.
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    void resolveApiEndpoint();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B0B0D",
        }}
      >
        <ActivityIndicator color="#F5C518" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <VideoProjectProvider>
            <InviteProvider>
              <ClipProvider>
                <VersionHistoryProvider>
                  <ExportProvider>
                    <MemberProvider>
                      <CommentProvider>
                        <MessageProvider>
                          <NotificationProvider>
                            <AppNavigation />
                          </NotificationProvider>
                        </MessageProvider>
                      </CommentProvider>
                    </MemberProvider>
                  </ExportProvider>
                </VersionHistoryProvider>
              </ClipProvider>
            </InviteProvider>
          </VideoProjectProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
