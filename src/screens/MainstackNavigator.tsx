import {createNativeStackNavigator } from "@react-navigation/native-stack"
import splashscreen from "./splashscreen";
import signinscreen from "./signinscreen";
import SignInscreen from "./signinscreen";
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
        
              
        </Stack.Navigator>
    )
}

export default MainStackNavigator;