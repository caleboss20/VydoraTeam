import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'
import { s } from 'react-native-size-matters'
import { useMemo } from 'react'
import DashboardScreen from '../Dashboard/Dashboard'
import LibraryScreen from '../Dashboard/LibraryScreen'
import ActivityScreen from '../Dashboard/ActivityScreen'
import ProfileScreen from '../Dashboard/ProfileScreen'
import ExportLibraryScreen from '../Editor/Export'
import { useTheme } from '../Contexts/ThemeContext'

type IoniconName = keyof typeof Ionicons.glyphMap
export type DashboardTabParamList = {
  projects: undefined
  export: undefined
  Activity: undefined
  Profile: undefined
}
const Tab = createBottomTabNavigator<DashboardTabParamList>()

export default function Dashboardtabbar() {
  const { colors, isDark } = useTheme()
  const tabBarStyle = useMemo(
    () => [
      styles.tabBar,
      {
        backgroundColor: colors.tabBar,
        borderTopColor: colors.tabBarBorder,
      },
    ],
    [colors]
  )

  return (
    <Tab.Navigator
      screenOptions={({
        route,
      }: {
        route: RouteProp<DashboardTabParamList, keyof DashboardTabParamList>
      }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
        tabBarLabelStyle: { color: isDark ? undefined : colors.textSecondary },
        tabBarIcon: ({
          color,
          focused,
        }: {
          color: string
          focused: boolean
          size: number
        }) => {
          let iconName: IoniconName = 'ellipse-outline'
          if (route.name === 'projects') {
            iconName = focused ? 'folder' : 'folder-outline'
          } else if (route.name === 'export') {
            iconName = focused ? 'film' : 'film-outline'
          } else if (route.name === 'Activity') {
            iconName = focused ? 'pulse' : 'pulse-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          }
          return <Ionicons name={iconName} size={s(22)} color={color} />
        },
      })}
    >
      <Tab.Screen name="projects" component={DashboardScreen} />
      <Tab.Screen name="export" component={ExportLibraryScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: s(70),
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
  },
})
