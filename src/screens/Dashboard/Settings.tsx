
import React, { FC, useState } from 'react';
import {
    Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  moderateScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';
const COLORS = {
  background: '#000000',
  card: '#111111',
  border: '#262626',
  text: '#FFFFFF',
  secondary: '#8A8A8A',
  yellow: '#FFD400',
  iconBackground: '#1E1E1E',
};
interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightText?: string;
  showArrow?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
}
const SettingItem: FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  rightText,
  showArrow,
  switchValue,
  onSwitch,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.item}>
      <View style={styles.leftContainer}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color="#FFFFFF"
          />
        </View>
        <View>
          <Text style={styles.title}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {switchValue !== undefined ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitch}
          trackColor={{
            false: '#555',
            true: COLORS.yellow,
          }}
          thumbColor="#000"
        />
      ) : showArrow ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#666"
        />
      ) : rightText ? (
        <Text style={styles.rightText}>
          {rightText}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};
const SettingsScreen: FC = () => {
const navigation=useNavigation()

  const [darkMode, setDarkMode] =
    useState(true);
  const [autoSave, setAutoSave] =
    useState(true);
  const [proxyEditing, setProxyEditing] =
    useState(false);
  const [notifications, setNotifications] =
    useState(true);
  const [presence, setPresence] =
    useState(true);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        bounces={false}>
       
        {/* Header */}
        <View style={styles.header}>
          <Pressable
          onPress={()=>navigation.navigate("projects")}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color="#FFFFFF"
            />
          </Pressable>
          <Text style={styles.headerTitle}>
            Settings
          </Text>
        </View>
        {/* Preferences */}
        <Text style={styles.section}>
          PREFERENCES
        </Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <View style={styles.leftContainer}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="sunny-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.title}>
                Theme
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setDarkMode(!darkMode)
              }
              style={styles.themeButton}>
              <Text style={styles.themeText}>
                {darkMode ? 'Dark' : 'Light'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <SettingItem
            icon="globe-outline"
            title="Language"
            rightText="English"
          />
          <View style={styles.divider} />
          <SettingItem
            icon="archive-outline"
            title="Storage"
            subtitle="3.2 GB of 200 GB used"
            showArrow
          />
        </View>
        {/* Editing */}
        <Text style={styles.section}>
          EDITING
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="save-outline"
            title="Auto-save"
            switchValue={autoSave}
            onSwitch={setAutoSave}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="film-outline"
            title="Default export quality"
            rightText="1080p"
          />
          <View style={styles.divider} />
          <SettingItem
            icon="wifi-outline"
            title="Proxy editing on cellular"
            switchValue={proxyEditing}
            onSwitch={setProxyEditing}
          />
        </View>
        {/* Collaboration */}
        <Text style={styles.section}>
          COLLABORATION
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="notifications-outline"
            title="Push notifications"
            switchValue={notifications}
            onSwitch={setNotifications}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="eye-outline"
            title="Show presence to others"
            switchValue={presence}
            onSwitch={setPresence}
          />
        </View>
        {/* About */}
        <Text style={styles.section}>
          ABOUT
        </Text>
        <View style={styles.card}>
          <SettingItem
            icon="information-circle-outline"
            title="Version"
            rightText="2.4.1"
          />
          <View style={styles.divider} />
          <SettingItem
            icon="document-text-outline"
            title="Terms & privacy policy"
            showArrow
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
export default SettingsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(25),
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: moderateScale(28),
    fontWeight: '700',
    marginLeft: scale(18),
  },
  section: {
    color: '#666',
    fontSize: moderateScale(12),
    fontWeight: '700',
    marginTop: verticalScale(24),
    marginBottom: verticalScale(12),
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(18),
  },
  item: {
    minHeight: verticalScale(52),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical:15,
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: COLORS.iconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  title: {
    color: COLORS.text,
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: moderateScale(13),
    marginTop: verticalScale(3),
  },
  rightText: {
    color: COLORS.secondary,
    fontSize: moderateScale(15),
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  themeRow: {
    minHeight: verticalScale(80),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeButton: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(5),
    borderRadius: scale(30),
  },
  themeText: {
    color: '#000',
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
});