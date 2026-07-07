// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
// import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
// import type { RouteProp } from '@react-navigation/native'
// import { Ionicons } from '@expo/vector-icons'
// import { View, TouchableOpacity, StyleSheet } from 'react-native'
// import { s } from 'react-native-size-matters'
// import EditScreen from '../Editor/Editorscreen'
// import TimelineScreen from './TimelineScreen'
// import AddTextScreen from './AddTextScreen'
// import FilterScreen from './FilterScreen'
// import MoreScreen from './MoreScreen'

// // import FiltersScreen from './FiltersScreen'
// // import MoreScreen from './MoreScreen'
// type IoniconName = keyof typeof Ionicons.glyphMap
// // Param list for this tab navigator — passing this as the generic to
// // createBottomTabNavigator<T>() is what makes `route.name` below get
// // narrowed to exactly these five strings (typos get caught at compile
// // time) and makes `color` in tabBarIcon resolve to `string` for free.
// // No params are passed to any of these screens, so each is `undefined`.
// export type EditorTabParamList = {
//   Edit: undefined
//   Addtext: undefined
//   Timeline: undefined
//   more: undefined
//   addtext:undefined
//   filter:undefined
// }
// const Tab = createBottomTabNavigator<EditorTabParamList>()
// function ExportTabButton({ children, onPress }: BottomTabBarButtonProps) {
//   return (
//     <TouchableOpacity
//       activeOpacity={0.85}
//       onPress={onPress}
//       style={styles.exportButtonWrapper}>
//       <View style={styles.exportButton}>{children}</View>
//     </TouchableOpacity>
//   )
// }
// export default function Bottomtabbar() {
//   return (
//     <Tab.Navigator
//       screenOptions={({
//         route,
//       }: {
//         route: RouteProp<EditorTabParamList, keyof EditorTabParamList>
//       }) => ({
//         headerShown: false,
//         tabBarActiveTintColor: '#F4C430',
//         tabBarInactiveTintColor: '#8A8A8E',
//         tabBarStyle: styles.tabBar,
//         tabBarIcon: ({ color }: { color: string; focused: boolean; size: number }) => {
//           let iconName: IoniconName = 'ellipse-outline' // safe fallback if route.name doesn't match below
//           // Plain/outline icons for every side tab — matches the thin
//           // line-style icons (Edit, Text, Filters, More) in the
//           // reference. Timeline keeps its own icon, untouched.
//           if (route.name === 'Edit') iconName = 'pencil-outline'
//           else if (route.name === 'Timeline') iconName = 'layers-outline'
//           else if (route.name === 'Addtext') iconName = 'text-outline'
//           else if (route.name === 'filter') iconName = 'color-filter-outline'
//           else if (route.name === 'more') iconName = 'ellipsis-horizontal'
//           // Timeline tab always shows a dark icon since it sits on a yellow circle
//           if (route.name === 'Timeline') {
//             return <Ionicons name={iconName}
//             size={s(22)} color="#0E0E10" />
//           }
//           return <Ionicons name={iconName}
//           size={s(18)} color={color} />
//         },
//       })}>
//       <Tab.Screen name="Edit" component={EditScreen} />
//       <Tab.Screen
//         name="Timeline"
//         component={TimelineScreen}
//         options={{
//           tabBarButton: (props: BottomTabBarButtonProps) => <ExportTabButton {...props} />,
//           tabBarLabel: () => null,
//         }}
//       />
//      <Tab.Screen name="addtext" component={AddTextScreen} />
//      <Tab.Screen name="filter" component={FilterScreen} />
//       <Tab.Screen name="more" component={MoreScreen}
//        options={{tabBarStyle:{display:'none'}}}
//        />
   
//     </Tab.Navigator>
//   )
// }
// const styles = StyleSheet.create({
//   tabBar: {
//     height: s(70),
//     paddingBottom: 20,
//     paddingTop: 8,
//     backgroundColor: '#0E0E10',
//     borderTopWidth: 1,
//     borderTopColor: '#2A2A2E',
//   },
//   // Wrapper positions the button above the tab bar line, centered.
//   exportButtonWrapper: {
//     top: -s(8),
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   // The raised yellow circle itself, with shadow so it visibly "pops".
//   exportButton: {
//     width: s(42),
//     height: s(42),
//     borderRadius: s(28),
//     backgroundColor: '#F4C430',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#F4C430',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.35,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   exportLabel: {
//     fontSize: s(10),
//     fontWeight: '600',
//     color: '#F4C430',
//     marginTop: s(4),
//   },
// })