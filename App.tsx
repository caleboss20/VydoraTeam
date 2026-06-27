import MainStackNavigator from "./src/screens/MainstackNavigator"
import { NavigationContainer } from '@react-navigation/native';

// transactionprovider as using for state management
// for transactions data to made available to all screens//
// any screen can read or add transactionswithout passing props

export default function App() {
  return (

       <NavigationContainer>
    <MainStackNavigator />
   </NavigationContainer>
    
  );
}
