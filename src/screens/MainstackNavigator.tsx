import {createNativeStackNavigator } from "@react-navigation/native-stack"
import splashscreen from "./splashscreen";
import signinscreen from "./signinscreen";
import SignInscreen from "./signinscreen";
import Signupscreen from "./Signupscreen";
import ForgotPassword from "./ForgotPassword";
import VerifyEmail from "./OtpVerification";
import PasswordReset from "./Passwordreset";
import PasswordSuccess from "./Passwordsuccess";
import Onboarding from "./Onboarding/Onboardingscreen";
import EditorScreen from "./Editor/Editorscreen";
import TimelineScreen from "./Editor/TimeLine";
import Bottomtabbar from "./Tabbar/BottomTabbar";
import Dashboardtabbar from "./Tabbar/DashboardTabbar";
import NewProjectScreen from "./Dashboard/NewProject";
import InviteMemberScreen from "./Dashboard/InviteMember";
import UploadVideoScreen from "./Dashboard/UploadVideo";
import { Settings } from "react-native";
import SettingsScreen from "./Dashboard/Settings";
import ProjectDetailScreen from "./Project/ProjectDetail";
import ActivityScreen from "./Dashboard/ActivityScreen";
import ExportLibraryScreen from "./Editor/Export";
import VideoUploadScreen from "./Dashboard/uploadScreen";

const Stack=createNativeStackNavigator();

function MainStackNavigator(){
    return(
        <Stack.Navigator
        screenOptions={{
            headerShown:false
        }}
        initialRouteName="splashscreen"
        >
            <Stack.Screen name="splashscreen" component={splashscreen} />
             <Stack.Screen name="signin" component={SignInscreen} />
             <Stack.Screen name="signup" component={Signupscreen} />
               <Stack.Screen name="forgotpassword" component={ForgotPassword} />
                <Stack.Screen name="verifyemail" component={VerifyEmail} />
                 <Stack.Screen name="passwordreset" component={PasswordReset} />
                 <Stack.Screen name="passwordsuccess" component={PasswordSuccess} />
             <Stack.Screen name="onboarding" component={Onboarding} />

              <Stack.Screen name="editorscreen" component={Bottomtabbar} />
               <Stack.Screen name="newproject" component={NewProjectScreen} />
                <Stack.Screen name="projectdetail" component={ProjectDetailScreen} />
                <Stack.Screen name="projects" component={Dashboardtabbar} />
                  <Stack.Screen name="invitemember" component={InviteMemberScreen} />
                   <Stack.Screen name="uploadvideo" component={UploadVideoScreen} />
                    <Stack.Screen name="settings" component={SettingsScreen} />
                     <Stack.Screen name="activities" component={ActivityScreen} />
                      <Stack.Screen name="uploadscreen" component={VideoUploadScreen} />
                   
              
        </Stack.Navigator>
    )
}

export default MainStackNavigator;