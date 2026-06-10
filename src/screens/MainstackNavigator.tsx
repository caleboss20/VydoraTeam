import {createNativeStackNavigator } from "@react-navigation/native-stack"
import splashscreen from "./splashscreen";
import signinscreen from "./signinscreen";
import SignInscreen from "./signinscreen";
import Signupscreen from "./Signupscreen";
import ForgotPassword from "./ForgotPassword";
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
        
              
        </Stack.Navigator>
    )
}

export default MainStackNavigator;