import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,

  StatusBar,
  Dimensions,
} from 'react-native';
import { s, vs, ms } from "react-native-size-matters";
import {  SafeAreaView,} from "react-native-safe-area-context"
import { Ionicons } from '@expo/vector-icons';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLORS = {
  bg: 'rgba(0,0,0,0.6)',
  sheet: '#1A1A1A',
  surface: '#222222',
  yellow: '#F5C518',
  text: '#FFFFFF',
  textMuted: '#888888',
  border: '#2A2A2A',
  handle: '#3A3A3A',
} as const;
interface MenuItem {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}
const MENU_ITEMS: MenuItem[] = [
  {
    key: 'media',
    label: 'Media Library',
    subtitle: 'Add clips, audio & images',
    icon: 'folder-open-outline',
    color: '#777',
  },
  {
    key: 'export',
    label: 'Export',
    subtitle: 'Export your video',
    icon: 'share-outline',
    color: '#ccc',
  },
  {
    key: 'comments',
    label: 'Comments',
    subtitle: 'View & add comments',
    icon: 'chatbubble-outline',
    color: '#ccc',
  },
  {
    key: 'history',
    label: 'Version History',
    subtitle: 'Restore previous versions',
    icon: 'time-outline',
    color: '#ccc',
  },
  {
    key: 'activity',
    label: 'Activity',
    subtitle: 'See recent changes',
    icon: 'pulse-outline',
    color: '#ccc',
  },
];
interface Props {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}
export default function MoreScreen({ navigation }: Props) {
  function handlePress(key: string) {
    navigation?.goBack();
    // Navigate to respective screen
    if (key === 'media') navigation?.navigate('MediaLibrary');
    if (key === 'export') navigation?.navigate('Export');
    if (key === 'comments') navigation?.navigate('Comments');
    if (key === 'history') navigation?.navigate('versionhistory');
    if (key === 'activity') navigation?.navigate('Activity');
  }
  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" />
      {/* Tap outside to close */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation?.goBack()}
      />
      {/* Sheet */}
      <SafeAreaView style={styles.sheet}>
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        {/* Menu Items */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                index < MENU_ITEMS.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => handlePress(item.key)}
              activeOpacity={0.7}
            >
              {/* Icon bubble */}
              <View style={[styles.iconBubble, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              {/* Text */}
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              {/* Arrow */}
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.95)',
   
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Sheet
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height:'89%',
    paddingBottom: 24,
     position:'relative',
  },
  // Handle
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  
  },
  // Menu
  menuList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap:s(15)
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});