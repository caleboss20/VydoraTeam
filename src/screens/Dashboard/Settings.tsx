
import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  moderateScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';
import { CONFIG } from '../config';

const COLORS = {
  background: '#000000',
  card: '#111111',
  border: '#262626',
  text: '#FFFFFF',
  secondary: '#8A8A8A',
  yellow: '#FFD400',
  iconBackground: '#1E1E1E',
};

export type AppSettings = {
  darkMode: boolean;
  autoSave: boolean;
  proxyEditing: boolean;
  notifications: boolean;
  presence: boolean;
  language: string;
  exportQuality: '720p' | '1080p' | '4K';
};

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  autoSave: true,
  proxyEditing: false,
  notifications: true,
  presence: true,
  language: 'English',
  exportQuality: '1080p',
};

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG.ASYNC_STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveAppSettings(next: AppSettings) {
  await AsyncStorage.setItem(
    CONFIG.ASYNC_STORAGE_KEYS.SETTINGS,
    JSON.stringify(next)
  );
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightText?: string;
  showArrow?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  onPress?: () => void;
}
const SettingItem: FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  rightText,
  showArrow,
  switchValue,
  onSwitch,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.item}
      onPress={onPress}
      disabled={!onPress && switchValue === undefined}
    >
      <View style={styles.leftContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
        <Ionicons name="chevron-forward" size={20} color="#666" />
      ) : rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const SettingsScreen: FC = () => {
  const navigation = useNavigation<any>();
  const [prefs, setPrefs] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [cacheHint, setCacheHint] = useState('Local cache on this device');

  useEffect(() => {
    loadAppSettings().then(setPrefs);
  }, []);

  const patch = useCallback(async (partial: Partial<AppSettings>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      void saveAppSettings(next);
      return next;
    });
  }, []);

  // Keep in sync with app.json expo.version
  const appVersion = '1.0.0';

  const pickLanguage = () => {
    Alert.alert('Language', 'Choose display language', [
      { text: 'English', onPress: () => patch({ language: 'English' }) },
      { text: 'French', onPress: () => patch({ language: 'French' }) },
      { text: 'Spanish', onPress: () => patch({ language: 'Spanish' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickExportQuality = () => {
    Alert.alert('Default export quality', 'Used when starting a new export', [
      { text: '720p', onPress: () => patch({ exportQuality: '720p' }) },
      { text: '1080p', onPress: () => patch({ exportQuality: '1080p' }) },
      { text: '4K', onPress: () => patch({ exportQuality: '4K' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleStorage = () => {
    Alert.alert(
      'Storage',
      `${cacheHint}\n\nCloud project storage is managed with your plan. You can clear cached exports and clips from this device.`,
      [
        {
          text: 'Clear local cache',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                CONFIG.ASYNC_STORAGE_KEYS.EXPORTS,
                CONFIG.ASYNC_STORAGE_KEYS.CLIPS,
                CONFIG.ASYNC_STORAGE_KEYS.COMMENTS,
              ]);
              setCacheHint('Local cache cleared');
              Alert.alert('Cleared', 'Cached exports and clips were removed.');
            } catch (e: any) {
              Alert.alert('Couldn’t clear cache', e?.message || 'Try again.');
            }
          },
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  const openTerms = async () => {
    const url = 'https://vydora.app/terms';
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert('Terms', 'Open https://vydora.app/terms in your browser.');
    } catch {
      Alert.alert('Terms', 'Open https://vydora.app/terms in your browser.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate('projects')}>
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <Text style={styles.section}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <View style={styles.leftContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="sunny-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Theme</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => patch({ darkMode: !prefs.darkMode })}
              style={styles.themeButton}
            >
              <Text style={styles.themeText}>
                {prefs.darkMode ? 'Dark' : 'Light'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <SettingItem
            icon="globe-outline"
            title="Language"
            rightText={prefs.language}
            showArrow
            onPress={pickLanguage}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="archive-outline"
            title="Storage"
            subtitle={cacheHint}
            showArrow
            onPress={handleStorage}
          />
        </View>

        <Text style={styles.section}>EDITING</Text>
        <View style={styles.card}>
          <SettingItem
            icon="save-outline"
            title="Auto-save"
            switchValue={prefs.autoSave}
            onSwitch={(v) => patch({ autoSave: v })}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="film-outline"
            title="Default export quality"
            rightText={prefs.exportQuality}
            showArrow
            onPress={pickExportQuality}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="wifi-outline"
            title="Proxy editing on cellular"
            switchValue={prefs.proxyEditing}
            onSwitch={(v) => patch({ proxyEditing: v })}
          />
        </View>

        <Text style={styles.section}>COLLABORATION</Text>
        <View style={styles.card}>
          <SettingItem
            icon="notifications-outline"
            title="Push notifications"
            switchValue={prefs.notifications}
            onSwitch={(v) => patch({ notifications: v })}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="eye-outline"
            title="Show presence to others"
            switchValue={prefs.presence}
            onSwitch={(v) => patch({ presence: v })}
          />
        </View>

        <Text style={styles.section}>ABOUT</Text>
        <View style={styles.card}>
          <SettingItem
            icon="information-circle-outline"
            title="Version"
            rightText={appVersion}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="document-text-outline"
            title="Terms & privacy policy"
            showArrow
            onPress={openTerms}
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
    paddingVertical: 15,
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
