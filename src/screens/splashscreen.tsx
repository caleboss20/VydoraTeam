import { StyleSheet, Text,  View } from 'react-native'
import React, { useEffect } from 'react'
import {s} from "react-native-size-matters"
import { useNavigation } from '@react-navigation/native'


const splashscreen = () => {
  const navigation=useNavigation()

 useEffect(() => {
  const timer=setTimeout(() => {
    navigation.navigate("signin")
  }, 4000);
  return()=>clearTimeout(timer)
  }, [])
  



  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Vydora</Text>
    </View>
  )
}

export default splashscreen

const styles = StyleSheet.create({
container:{
 flex:1,
 backgroundColor:'black',
 justifyContent:'center',
},
logo:{
 fontSize:s(30),
 color:'#ffc107',
 textAlign:'center',
 fontWeight:'600',
}
})