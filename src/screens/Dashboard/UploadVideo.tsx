
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ms, s, vs } from "react-native-size-matters";
import * as DocumentPicker from 'expo-document-picker';
// ---------------------------------------------------------------------------
// Vydora — Upload Video screen
// Full screen (not a modal), dark theme, single yellow accent.
// Real file selection via expo-image-picker / expo-document-picker.
// Upload progress is simulated client-side (no backend), but file picking,
// names, sizes, and the "voiceover added" flow are all real device data.
// ---------------------------------------------------------------------------
const COLORS = {
  bg: '#1A1A1A',
  surface: '#262626',
  surfaceAlt: '#2E2E2E',
  border: '#3A3A3A',
  borderDashed: '#4A4A4A',
  yellow: '#F2C200',
  yellowDim: 'rgba(242, 194, 0, 0.12)',
  text: '#FFFFFF',
  textMuted: '#9A9A9A',
  textFaint: '#6B6B6B',
  danger: '#FF6B6B',
  online: '#3DD68C',
};
const MAX_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
const VALID_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv'];
type FileStatus = 'uploading' | 'done' | 'error';
interface UploadFile {
  id: string;
  name: string;
  sizeLabel: string;
  isAudio: boolean;
  progress: number; // 0-100
  status: FileStatus;
}
function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function getExtension(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
function isAudioExt(ext: string) {
  return ['mp3', 'wav', 'm4a', 'aac'].includes(ext);
}
export default function UploadVideoScreen({ navigation }: any) {
  const [files, setFiles] = useState<UploadFile[]>([
    { id: 'seed-1', name: 'clip_01.mp4', sizeLabel: '128 MB', isAudio: false, progress: 72, status: 'uploading' },
    { id: 'seed-2', name: 'b_roll_final.mp4', sizeLabel: '256 MB', isAudio: false, progress: 34, status: 'uploading' },
    { id: 'seed-3', name: 'voiceover_v2.mp3', sizeLabel: '12 MB', isAudio: true, progress: 100, status: 'done' },
  ]);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [dropPulse] = useState(new Animated.Value(1));
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // Subtle ambient pulse on the drop-zone icon — signals "this is live/active"
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dropPulse, { toValue: 1.08, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dropPulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const startSimulatedUpload = useCallback((id: string) => {
    const interval = setInterval(() => {
      setFiles((prev):any => {
        let cleared = false;
        const next = prev.map((f) => {
          if (f.id !== id) return f;
          const bump = f.isAudio ? 18 : Math.random() * 9 + 3;
          const nextProgress = Math.min(100, f.progress + bump);
          if (nextProgress >= 100) cleared = true;
          return { ...f, progress: nextProgress, status: nextProgress >= 100 ? 'done' : 'uploading' };
        });
        if (cleared) {
          clearInterval(timersRef.current[id]);
          delete timersRef.current[id];
        }
        return next;
      });
    }, 450);
    timersRef.current[id] = interval;
  }, []);
  const addFile = useCallback(
    (name: string, bytes: number) => {
      const ext = getExtension(name);
      const audio = isAudioExt(ext);
      if (!audio && !VALID_EXTENSIONS.includes(ext)) {
        Alert.alert('Unsupported file', `${ext.toUpperCase() || 'This file type'} isn't supported. Use MP4, MOV, AVI, or MKV.`);
        return;
      }
      if (bytes > MAX_BYTES) {
        Alert.alert('File too large', 'Files must be under 10 GB.');
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newFile: UploadFile = {
        id,
        name,
        sizeLabel: formatBytes(bytes),
        isAudio: audio,
        progress: 0,
        status: 'uploading',
      };
      setFiles((prev) => [newFile, ...prev]);
      startSimulatedUpload(id);
    },
    [startSimulatedUpload]
  );
  const removeFile = (id: string) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };


  // --- Real pickers -------------------------------------------------------
  const pickFromCameraRoll = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your camera roll to choose a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = asset.fileName || `camera_roll_${Date.now()}.mp4`;
    addFile(name, asset.fileSize ?? 0);
  };
  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'audio/mpeg'],
      multiple: true,
      copyToCacheDirectory: false,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => addFile(asset.name, asset.size ?? 0));
  };


  // No real cloud SDK is wired up (Drive/Dropbox would need API keys), so
  // "Cloud" routes through the same document picker — on-device, this surface
  // already includes cloud-linked locations like iCloud Drive / Google Drive.
  const pickFromCloud = pickFromFiles;
  const submitUrl = () => {
    const trimmed = urlDraft.trim();
    const looksValid = /^https?:\/\/.+\.(mp4|mov|avi|mkv|mp3)(\?.*)?$/i.test(trimmed) || /^https?:\/\/.+/i.test(trimmed);
    if (!looksValid) {
      setUrlError(true);
      return;
    }
    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'remote_video.mp4';
    addFile(fileName, Math.floor(Math.random() * 200 + 40) * 1024 * 1024);
    setUrlDraft('');
    setUrlError(false);
    setUrlModalVisible(false);
  };
  const handleClose = () => {
    if (navigation?.goBack) navigation.goBack();
  };
  const importSources: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { key: 'camera', label: 'Camera roll', icon: 'videocam', onPress: pickFromCameraRoll },
    { key: 'files', label: 'Files', icon: 'film', onPress: pickFromFiles },
    { key: 'cloud', label: 'Cloud', icon: 'cloud-upload', onPress: pickFromCloud },
    { key: 'url', label: 'URL', icon: 'link', onPress: () => setUrlModalVisible(true) },
  ];


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Upload Video</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Drop zone */}
        <Pressable onPress={pickFromFiles} style={styles.dropZone}>
          <Animated.View style={[styles.dropIconWrap, { transform: [{ scale: dropPulse }] }]}>
            <Ionicons name="cloud-upload-outline" size={26} color={COLORS.yellow} />
          </Animated.View>
          <Text style={styles.dropTitle}>Tap to choose a file</Text>
          <Text style={styles.dropSubtitle}>MP4, MOV, AVI, MKV up to 10 GB</Text>
        </Pressable>
        {/* Import from */}
        <Text style={styles.sectionLabel}>IMPORT FROM</Text>
        <View style={styles.importRow}>
          {importSources.map((src) => (
            <Pressable
              key={src.key}
              onPress={src.onPress}
              style={({ pressed }) => [styles.importTile, pressed && styles.importTilePressed]}
            >
              <Ionicons name={src.icon} size={20} color={COLORS.yellow} />
              <Text style={styles.importLabel}>{src.label}</Text>
            </Pressable>
          ))}
        </View>
        {/* Uploading list */}
        {files.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              {files.some((f) => f.status === 'uploading') ? 'UPLOADING' : 'FILES'}
            </Text>
            <View style={{ gap: s(12) }}>
              {files.map((file) => (
                <FileRow key={file.id} file={file} onRemove={() => removeFile(file.id)} />
              ))}
            </View>
          </>
        )}
        {/* Add more files */}
        <Pressable
          onPress={pickFromFiles}
          style={({ pressed }) => [styles.addMoreButton, pressed && styles.addMorePressed]}
        >
          <Ionicons name="add" size={18} color={COLORS.text} />
          <Text style={styles.addMoreText}>Add more files</Text>
        </Pressable>
      </ScrollView>
      {/* URL import modal */}
      <Modal visible={urlModalVisible} transparent animationType="fade" onRequestClose={() => setUrlModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Import from URL</Text>
            <TextInput
              value={urlDraft}
              onChangeText={(t) => {
                setUrlDraft(t);
                setUrlError(false);
              }}
              placeholder="https://example.com/video.mp4"
              placeholderTextColor={COLORS.textFaint}
              style={[styles.modalInput, urlError && styles.modalInputError]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {urlError && <Text style={styles.modalErrorText}>Enter a valid URL</Text>}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setUrlModalVisible(false);
                  setUrlDraft('');
                  setUrlError(false);
                }}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitUrl} style={styles.modalConfirm}>
                <Text style={styles.modalConfirmText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}




function FileRow({ file, onRemove }: { file: UploadFile; onRemove: () => void }) {
  const widthAnim = useRef(new Animated.Value(file.progress)).current;
  const checkAnim = useRef(new Animated.Value(file.status === 'done' ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: file.progress,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    if (file.status === 'done') {
      Animated.spring(checkAnim, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    }
  }, [file.progress, file.status]);
  return (
    <View style={styles.fileRow}>
      <View style={styles.fileIconWrap}>
        <Ionicons name={file.isAudio ? 'musical-notes' : 'film'} size={18} color={COLORS.text} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.fileTopRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          {file.status === 'done' ? (
            <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.online} />
            </Animated.View>
          ) : (
            <Text style={styles.filePercent}>{Math.floor(file.progress)}%</Text>
          )}
        </View>
        <Text style={styles.fileSize}>{file.sizeLabel}</Text>
        {file.status !== 'done' && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: widthAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.fileRemove}>
        <Ionicons name="close" size={16} color={COLORS.textFaint} />
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconButtonPressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  dropZone: {
    borderWidth: 1.5,
    borderColor: COLORS.borderDashed,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  dropIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.yellowDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dropTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  dropSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 10,
  },
  importRow: {
    flexDirection: 'row',
    gap: s(10),
  },
  importTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  importTilePressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  importLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    gap: s(12),
  },
  fileIconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fileName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  filePercent: {
    color: COLORS.yellow,
    fontSize: 13,
    fontWeight: '700',
  },
  fileSize: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.yellow,
  },
  fileRemove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: s(17),

    marginTop: s(90),
  },
  addMorePressed: {
    backgroundColor: COLORS.surfaceAlt,
  },
  addMoreText: {
    color: COLORS.text,
    fontSize: s(13),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    padding: 12,
  },
  modalInputError: {
    borderColor: COLORS.danger,
  },
  modalErrorText: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.yellow,
  },
  modalConfirmText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '800',
  },
});