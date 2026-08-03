/**
 * Post-onboarding profile setup — photo + display name before Dashboard.
 * Photo feeds collab avatars (header / sidebar); not editable inside collab.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';
import { useAuth } from '../Contexts/Authcontext';
import { uploadService } from '../services/uploadService';
import { markProfileSetupDone } from '../services/profileSetupGate';
import { useWowPath } from '../Contexts/useWowPath';

type Params = {
  profilesetup: { resumeWow?: boolean } | undefined;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function ProfileSetupScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'profilesetup'>>();
  const { user, updateUser } = useAuth();
  const { startWowPath, starting } = useWowPath();

  const [name, setName] = useState(user?.name ?? '');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const displayAvatar = localAvatarUri || user?.avatarUrl || null;
  const canContinue = name.trim().length >= 2;

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to set your profile picture.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow camera access to take a profile picture.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const openPhotoSheet = () => {
    if (busy) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take photo', 'Choose from library'],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) void pickFromCamera();
          if (i === 2) void pickFromLibrary();
        }
      );
      return;
    }
    Alert.alert('Profile photo', 'This photo shows up when you collaborate.', [
      { text: 'Take photo', onPress: () => void pickFromCamera() },
      { text: 'Choose from library', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const finishToApp = async () => {
    await markProfileSetupDone();
    await AsyncStorage.setItem('vydora:onboarding:done', 'true');
    if (route.params?.resumeWow) {
      await startWowPath();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'projects' }],
    });
  };

  const handleSkip = async () => {
    if (busy || starting) return;
    setBusy(true);
    try {
      await finishToApp();
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = async () => {
    if (!canContinue || busy || starting) return;
    setBusy(true);
    try {
      const trimmed = name.trim();
      const patch: { name?: string; avatarUrl?: string } = {};
      if (trimmed && trimmed !== (user?.name ?? '').trim()) {
        patch.name = trimmed;
      }

      if (localAvatarUri) {
        const fileName = `avatar_${Date.now()}.jpg`;
        const uploaded = await uploadService.uploadImage(
          localAvatarUri,
          fileName,
          'image/jpeg'
        );
        patch.avatarUrl = uploaded.url;
      }

      if (Object.keys(patch).length) {
        await updateUser(patch);
      }
      await finishToApp();
    } catch (e: any) {
      Alert.alert(
        'Couldn’t save profile',
        e?.message || 'Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Text style={styles.step}>Set up your profile</Text>
            <TouchableOpacity
              onPress={() => void handleSkip()}
              disabled={busy || starting}
              hitSlop={10}
            >
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Show your face{'\n'}in collab</Text>
          <Text style={styles.subtitle}>
            Teammates see this photo in the editor — same idea as Zoom. You can
            change it later in Profile.
          </Text>

          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={openPhotoSheet}
            activeOpacity={0.85}
            disabled={busy}
            accessibilityLabel="Add profile photo"
          >
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: user?.color || colors.iconBg },
                ]}
              >
                <Text style={styles.avatarInitials}>
                  {initialsOf(name || user?.name || '')}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons
                name="camera"
                size={moderateScale(16)}
                color={colors.accentOn}
              />
            </View>
          </TouchableOpacity>

          <Text style={styles.photoHint}>Tap to add a photo</Text>

          <Text style={styles.label}>Display name</Text>
          <View style={styles.inputRow}>
            <Ionicons
              name="person-outline"
              size={moderateScale(18)}
              color={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              maxLength={60}
              editable={!busy}
            />
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Collaboration preview</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewStack}>
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    style={styles.previewFace}
                  />
                ) : (
                  <View
                    style={[
                      styles.previewFace,
                      styles.previewFaceFallback,
                      { backgroundColor: user?.color || colors.accent },
                    ]}
                  >
                    <Text style={styles.previewInitials}>
                      {initialsOf(name || '?')}
                    </Text>
                  </View>
                )}
                <View style={styles.onlinePip} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name.trim() || 'Your name'}
                </Text>
                <Text style={styles.previewMeta}>Online in editor</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!canContinue || busy || starting) && styles.continueDisabled,
            ]}
            onPress={() => void handleContinue()}
            disabled={!canContinue || busy || starting}
            activeOpacity={0.85}
          >
            {busy || starting ? (
              <ActivityIndicator color={colors.accentOn} />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      paddingHorizontal: scale(24),
      paddingTop: verticalScale(8),
      paddingBottom: verticalScale(24),
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: verticalScale(18),
    },
    step: {
      color: c.textMuted,
      fontSize: moderateScale(13),
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    skip: {
      color: c.accent,
      fontSize: moderateScale(14),
      fontWeight: '700',
    },
    title: {
      color: c.text,
      fontSize: moderateScale(30),
      fontWeight: '800',
      lineHeight: moderateScale(36),
      letterSpacing: -0.5,
      marginBottom: verticalScale(10),
    },
    subtitle: {
      color: c.textSecondary,
      fontSize: moderateScale(14),
      lineHeight: moderateScale(21),
      marginBottom: verticalScale(28),
    },
    avatarWrap: {
      alignSelf: 'center',
      width: scale(120),
      height: scale(120),
      borderRadius: scale(28),
      marginBottom: verticalScale(10),
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: scale(28),
    },
    avatarFallback: {
      width: '100%',
      height: '100%',
      borderRadius: scale(28),
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      color: '#FFFFFF',
      fontSize: moderateScale(36),
      fontWeight: '800',
    },
    cameraBadge: {
      position: 'absolute',
      right: -scale(2),
      bottom: -scale(2),
      width: scale(36),
      height: scale(36),
      borderRadius: scale(18),
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: c.background,
    },
    photoHint: {
      alignSelf: 'center',
      color: c.textMuted,
      fontSize: moderateScale(12),
      marginBottom: verticalScale(28),
    },
    label: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      fontWeight: '700',
      marginBottom: verticalScale(8),
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: scale(14),
      paddingHorizontal: scale(14),
      paddingVertical: Platform.OS === 'ios' ? verticalScale(14) : verticalScale(4),
      marginBottom: verticalScale(22),
    },
    input: {
      flex: 1,
      color: c.text,
      fontSize: moderateScale(16),
      fontWeight: '600',
      paddingVertical: verticalScale(8),
    },
    previewCard: {
      backgroundColor: c.card,
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: c.border,
      padding: scale(16),
    },
    previewLabel: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: verticalScale(12),
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
    },
    previewStack: {
      position: 'relative',
    },
    previewFace: {
      width: scale(44),
      height: scale(44),
      borderRadius: scale(12),
    },
    previewFaceFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewInitials: {
      color: c.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(14),
    },
    onlinePip: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: scale(12),
      height: scale(12),
      borderRadius: scale(6),
      backgroundColor: c.online,
      borderWidth: 2,
      borderColor: c.card,
    },
    previewName: {
      color: c.text,
      fontSize: moderateScale(15),
      fontWeight: '700',
    },
    previewMeta: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      marginTop: 2,
    },
    footer: {
      paddingHorizontal: scale(24),
      paddingBottom: verticalScale(12),
      paddingTop: verticalScale(8),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    continueBtn: {
      backgroundColor: c.accent,
      borderRadius: scale(14),
      height: verticalScale(52),
      alignItems: 'center',
      justifyContent: 'center',
    },
    continueDisabled: {
      opacity: 0.45,
    },
    continueText: {
      color: c.accentOn,
      fontSize: moderateScale(16),
      fontWeight: '800',
    },
  });
}
