import { Image, StyleSheet, Text,  View } from 'react-native'
import React, { useEffect } from 'react'
import {s} from "react-native-size-matters"
import { useNavigation } from '@react-navigation/native'


const splashscreen = () => {
  const navigation=useNavigation()

 useEffect(() => {
  const timer=setTimeout(() => {
    navigation.navigate("signin")
  }, 5000);
  return()=>clearTimeout(timer)
  }, [])
  



  return (
    <View style={styles.container}>
       <Image
                style={styles.logo}
                source={require("../../assets/logo.png")}
                />
    </View>
  )
}

export default splashscreen

const styles = StyleSheet.create({
container:{
 flex:1,
 backgroundColor:'#13151c',
 justifyContent:'center',
 alignItems:'center',
},
logo:{

width:s(320),
height:s(320),
// marginRight:s(10),
}
})