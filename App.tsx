import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MainStackNavigator from "./src/screens/MainstackNavigator";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/screens/Contexts/Authcontext";
import { ProjectProvider } from "./src/screens/Contexts/projectContext";
import { ClipProvider } from "./src/screens/Contexts/clipContext";
import { MemberProvider } from "./src/screens/Contexts/memberContext";
import { CommentProvider } from "./src/screens/Contexts/commentContext";
import { NotificationProvider } from "./src/screens/Contexts/notificatinContext";
import { ExportProvider } from "./src/screens/Contexts/exportContext";
import { VideoProjectProvider } from "./src/screens/Contexts/VideoProjectContext";
import { VersionHistoryProvider } from "./src/screens/Contexts/VersionHistoryContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProjectProvider>
          <VideoProjectProvider>
            <ClipProvider>
              <VersionHistoryProvider>
                <ExportProvider>
                  <MemberProvider>
                    <CommentProvider>
                      <NotificationProvider>
                        <NavigationContainer>
                          <MainStackNavigator />
                        </NavigationContainer>
                      </NotificationProvider>
                    </CommentProvider>
                  </MemberProvider>
                </ExportProvider>
              </VersionHistoryProvider>
            </ClipProvider>
          </VideoProjectProvider>
        </ProjectProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
