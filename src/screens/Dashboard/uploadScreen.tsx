
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { VideoProject } from '../types';
const CONFIG = {
  USE_MOCK: false,
};
const COLORS = {
  background: '#212121',
  surface: '#2A2A2A',
  border: '#3A3A3A',
  gold: '#C9A227',
  goldBright: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  textMuted: '#6B6B6B',
};
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export default function VideoUploadScreen() {
  const navigation = useNavigation<any>();
  const { setCurrentVideoProject } = useVideoProject();
  const [isPicking, setIsPicking] = useState(false);
  const startProjectFromAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const durationMs = (asset.duration ?? 0) * 1000;
    const project: VideoProject = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri: asset.uri,
      durationMs,
      width: asset.width,
      height: asset.height,
      thumbnailUri: undefined,
    };
    setCurrentVideoProject(project);
    navigation.navigate('editorscreen');
  };
  const requestPermissionAndPick = async () => {
    try {
      setIsPicking(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Vydora needs access to your media library to select a video.'
        );
        setIsPicking(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });
      setIsPicking(false);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await startProjectFromAsset(result.assets[0]);
      }
    } catch (error) {
      setIsPicking(false);
      Alert.alert('Something went wrong', 'Could not open your media library. Try again.');
    }
  };
  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Vydora needs camera access to record a video.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await startProjectFromAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Something went wrong', 'Could not open your camera. Try again.');
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close-outline" size={scale(26)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Project</Text>
        <View style={{ width: scale(26) }} />
      </View>
      <TouchableOpacity
        style={styles.uploadBox}
        activeOpacity={0.8}
        onPress={requestPermissionAndPick}
        disabled={isPicking}
      >
        <View style={styles.uploadIconCircle}>
          <Ionicons name="add" size={scale(36)} color={COLORS.background} />
        </View>
        <Text style={styles.uploadTitle}>
          {isPicking ? 'Opening library…' : 'Select a video'}
        </Text>
        <Text style={styles.uploadSubtitle}>
          Choose a clip from your gallery to start editing
        </Text>
        <View style={styles.dashedHint}>
          <Ionicons name="film-outline" size={scale(18)} color={COLORS.textMuted} />
          <Text style={styles.dashedHintText}>MP4, MOV supported</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.recordButton} activeOpacity={0.7} onPress={handleRecordVideo}>
        <Ionicons name="videocam-outline" size={scale(20)} color={COLORS.goldBright} />
        <Text style={styles.recordButtonText}>Record a new video</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
// styles unchanged — keep whatever you already have below this line
// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  uploadBox: {
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(8),
    paddingHorizontal: scale(24),
  },
  uploadIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: COLORS.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  uploadTitle: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(21),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  uploadSubtitle: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: moderateScale(23),
    maxWidth: '80%',
  },
  dashedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(28),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.background,
  },
  dashedHintText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(12),
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: verticalScale(46),
    paddingVertical: verticalScale(12),
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  recordButtonText: {
    color: COLORS.goldBright,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
});