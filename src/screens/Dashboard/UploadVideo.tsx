
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
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { VideoClip } from '../types';
import {useProject} from '../Contexts/projectContext';
// ---------------------------------------------------------------------------
// Vydora — Upload Video screen
// Full screen (not a modal), dark theme, single yellow accent.
// Real file selection via expo-image-picker / expo-document-picker.
// Upload progress is simulated client-side (no backend), but file picking,
// names, sizes, and the "voiceover added" flow are all real device data.
//
// WIRING NOTE: VideoProjectContext is the single source of truth for the
// video being edited. As soon as a file is picked (not when simulated
// progress finishes), we hand it to setCurrentVideoProject so EditorScreen
// has something to read immediately. The old ProjectContext/ClipContext
// (university project system) is intentionally not used here — this screen
// is purely for Vydora's video editor now.
//
// Search "TWEAK:" comments below for spots you'll likely revisit once the
// real backend / real video metadata probing is wired in.
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
  uri: string;
  sizeLabel: string;
  isAudio: boolean;
  progress: number; // 0-100
  status: FileStatus;
  // TWEAK: durationMs comes from expo-image-picker's asset.duration (ms) when
  // available. Falls back to 0 until we wire real metadata probing for files
  // picked via DocumentPicker / URL import.
  durationMs: number;
  durationLabel: string;
  // TWEAK: width/height can't be reliably read without expo-av or a native
  // module. Left undefined for now — VideoClip.width/height are optional.
}
function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function formatDuration(ms?: number): string {
  // TWEAK: this only works for camera roll picks where expo-image-picker
  // returns `duration` in milliseconds. DocumentPicker / URL imports won't
  // have this — they fall back to '--:--' until real probing is added.
  if (!ms || ms <= 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
function getExtension(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
function isAudioExt(ext: string) {
  return ['mp3', 'wav', 'm4a', 'aac'].includes(ext);
}
export default function UploadVideoScreen({ navigation }: any) {
  const { setCurrentVideoProject } = useVideoProject();
const { currentProject, updateThumbnail } = useProject(); // ADDED

  // TWEAK: removed hardcoded seed files (clip_01.mp4 etc) — starts empty now.
  const [files, setFiles] = useState<UploadFile[]>([]);
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
  // ── Builds a VideoClip from a picked file and hands it to VideoProjectContext ──
  // TWEAK: this is where real backend upload would actually happen instead
  // of just registering metadata — for now we just build the local project
  // shape so EditorScreen has something real (uri, duration) to play.
  //
  // Current behavior: each picked file becomes (or is appended to) a single
  // ongoing VideoProject — the one currently held in context. If none exists
  // yet, a new one is created. If you want every upload to start a *new*
  // project instead of appending, drop the `currentVideoProject` branch below
  // and always build a fresh project.
 
const persistClipToVideoProject = useCallback(
  (file: UploadFile) => {
    const newClip: VideoClip = {
      id: file.id,
      uri: file.uri,
      durationMs: file.durationMs,
      order: 0,
      textOverlays: [],
    };
    const now = new Date().toISOString();
    setCurrentVideoProject({
      id: `vp-${Date.now()}`,
      projectId: currentProject?.id ?? '',
      title: file.name,
      createdAt: now,
      updatedAt: now,
      clips: [newClip],
      totalDurationMs: file.durationMs,
    });
    // navigation.navigate('editorscreen') REMOVED FROM HERE
  },
  [setCurrentVideoProject, currentProject]
);





 const startSimulatedUpload = useCallback((id: string) => {
  const interval = setInterval(() => {
    setFiles((prev) => {
      return prev.map((f) => {
        if (f.id !== id) return f;
        const bump = f.isAudio ? 18 : Math.random() * 9 + 3;
        const nextProgress = Math.min(100, f.progress + bump);
        const isDone = nextProgress >= 100;
        if (isDone && timersRef.current[id]) {
          clearInterval(timersRef.current[id]);
          delete timersRef.current[id];
        }
        return { ...f, progress: nextProgress, status: isDone ? 'done' : 'uploading' };
      });
    });
  }, 450)
  timersRef.current[id] = interval;
}, []);



  const addFile = useCallback(
    (name: string, uri: string, bytes: number, durationMs?: number) => {
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
        uri,
        sizeLabel: formatBytes(bytes),
        isAudio: audio,
        progress: 0,
        status: 'uploading',
        durationMs: durationMs ?? 0,
        durationLabel: formatDuration(durationMs),
      };
      setFiles((prev) => [newFile, ...prev]);
      startSimulatedUpload(id);
      // Hand the picked video straight to VideoProjectContext immediately —
      // EditorScreen reads currentVideoProject, not upload progress state,
      // so the video shows up in the editor right away rather than waiting
      // for the simulated progress bar to finish.
      persistClipToVideoProject(newFile);
    },
    [startSimulatedUpload, persistClipToVideoProject]
  );
  const removeFile = (id: string) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // TWEAK: this only removes from local UI state — does NOT remove the
    // clip from VideoProjectContext. If the file was already handed off to
    // the project, it stays there after removal here. Wire a removeClip
    // call (VideoProjectContext doesn't currently expose one for this
    // lightweight flow) if you want removal to stay fully in sync.
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
    // TWEAK: asset.duration is in milliseconds on iOS/Android via expo-image-picker.
    addFile(name, asset.uri, asset.fileSize ?? 0, asset.duration ?? undefined);
  };
  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'audio/mpeg'],
      multiple: true,
      copyToCacheDirectory: false,
    });
    if (result.canceled) return;
    // TWEAK: DocumentPicker doesn't return duration — falls back to '--:--'.
    result.assets.forEach((asset) => addFile(asset.name, asset.uri, asset.size ?? 0));
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
    addFile(fileName, trimmed, Math.floor(Math.random() * 200 + 40) * 1024 * 1024);
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
          <Animated.View style={{ transform: [{ scale: dropPulse }] }}>
            <Ionicons name="cloud-upload-outline" size={40} color={COLORS.yellow} />
          </Animated.View>
          <Text style={styles.dropZoneText}>Tap to select a video</Text>
          <Text style={styles.dropZoneSubtext}>MP4, MOV, AVI, MKV — up to 10 GB</Text>
        </Pressable>
        {/* Import sources */}
        <View style={styles.sourceRow}>
          {importSources.map((source) => (
            <Pressable
              key={source.key}
              onPress={source.onPress}
              style={({ pressed }) => [styles.sourceButton, pressed && styles.sourceButtonPressed]}
            >
              <Ionicons name={source.icon} size={22} color={COLORS.text} />
              <Text style={styles.sourceLabel}>{source.label}</Text>
            </Pressable>
          ))}
        </View>
        {/* File list */}
        {files.map((file) => {
  const isDone = file.status === 'done';
  return (
    <Pressable
      key={file.id}
      style={styles.fileRow}
      disabled={!isDone}
      onPress={() => {
        if (isDone) navigation.navigate('editorscreen');
      }}
    >
      <View style={styles.fileIconWrap}>
        <Ionicons
          name={file.isAudio ? 'musical-notes' : 'film-outline'}
          size={20}
          color={COLORS.yellow}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.fileMeta}>
          {file.sizeLabel} · {file.durationLabel}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${file.progress}%` }]} />
        </View>
      </View>
      {isDone ? (
        <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
      ) : (
        <Pressable onPress={() => removeFile(file.id)} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={COLORS.textFaint} />
        </Pressable>
      )}
    </Pressable>
  );
})}




      </ScrollView>
      {/* URL import modal */}
      <Modal visible={urlModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Import from URL</Text>
            <TextInput
              value={urlDraft}
              onChangeText={(t) => { setUrlDraft(t); setUrlError(false); }}
              placeholder="https://example.com/video.mp4"
              placeholderTextColor={COLORS.textFaint}
              style={[styles.modalInput, urlError && styles.modalInputError]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {urlError && <Text style={styles.modalErrorText}>Enter a valid URL.</Text>}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setUrlModalVisible(false)} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitUrl} style={styles.modalSubmitButton}>
                <Text style={styles.modalSubmitText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingTop: s(20),
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
    marginTop:s(10),
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
    marginTop:s(30),
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
    modalSubmitButton: {
    backgroundColor: COLORS.yellow,
    borderRadius: 8,
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    marginLeft: s(8),
  },
  modalSubmitText: {
     color: '#1A1A1A',
      fontSize: ms(13), 
     fontWeight: '600' },
     sourceRow: {
       flexDirection: 'row', 
       justifyContent: 'space-between',
        marginTop:s(25),
     },
       sourceLabel: { 
        color: COLORS.textMuted, 
        fontSize: ms(10),
       },
       modalCancelButton: { 
        paddingHorizontal: s(14), 
        paddingVertical: vs(8) 
      },
       
  dropZoneText: { 
    color: COLORS.text,
     fontSize: ms(14),
      fontWeight: '600', 
      marginTop: vs(10) 
    },

     dropZoneSubtext: { 
      color: COLORS.textMuted,
       fontSize: ms(11),
     },
       sourceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: vs(12),
    marginHorizontal: s(4),
    backgroundColor: COLORS.surface,
    borderRadius: 10,
  },
  sourceButtonPressed: {
     opacity: 0.7 
    },
  fileMeta: { color: COLORS.textFaint, 
    fontSize: ms(10), 
    marginTop: vs(2) 
  },

})