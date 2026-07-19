
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
import { useClip } from '../Contexts/clipContext';
import { uploadService } from '../services/uploadService';
import { VideoClip } from '../types';
import { useProject } from '../Contexts/projectContext';
// ---------------------------------------------------------------------------
// Vydora — Upload Video screen
// Pick → POST /uploads/video → POST /projects/{id}/clips → show on Project Detail.
// Local file:// is also handed to VideoProjectContext so the editor can preview.
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
/** Matches backend UploadController (Cloudinary free-tier video cap). */
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
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
  durationMs: number;
  durationLabel: string;
  errorMessage?: string;
}
function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
function formatDuration(ms?: number): string {
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
function mimeForVideo(ext: string): string {
  switch (ext) {
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    default:
      return 'video/mp4';
  }
}
function isRemoteUrl(uri: string) {
  return /^https?:\/\//i.test(uri);
}
export default function UploadVideoScreen({ navigation }: any) {
  const { setCurrentVideoProject } = useVideoProject();
  const { currentProject } = useProject();
  const { addClip, fetchClips } = useClip();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [dropPulse] = useState(new Animated.Value(1));
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

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

  const updateFile = useCallback((id: string, patch: Partial<UploadFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const persistClipToVideoProject = useCallback(
    (file: UploadFile, playUri?: string) => {
      const newClip: VideoClip = {
        id: file.id,
        uri: playUri || file.uri,
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
    },
    [setCurrentVideoProject, currentProject]
  );

  /** Soft progress while the network upload runs (no byte-level events from fetch). */
  const startProgressPulse = useCallback((id: string) => {
    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== id || f.status !== 'uploading') return f;
          if (f.progress >= 88) return f;
          return { ...f, progress: Math.min(88, f.progress + (Math.random() * 6 + 2)) };
        })
      );
    }, 400);
    timersRef.current[id] = interval;
  }, []);

  const stopProgressPulse = useCallback((id: string) => {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const uploadVideoToProject = useCallback(
    async (file: UploadFile) => {
      if (!currentProject?.id) {
        updateFile(file.id, {
          status: 'error',
          progress: 0,
          errorMessage: 'Open a project first, then upload.',
        });
        Alert.alert(
          'No project selected',
          'Open a project from the dashboard, then upload a video into it.'
        );
        return;
      }

      startProgressPulse(file.id);
      // Local preview for the editor while Cloudinary upload runs.
      persistClipToVideoProject(file);

      try {
        let videoUrl = file.uri;
        let durationSeconds =
          file.durationMs > 0 ? file.durationMs / 1000 : 1;

        if (isRemoteUrl(file.uri)) {
          // Already a public URL — register as a clip without re-uploading bytes.
          updateFile(file.id, { progress: 60 });
        } else {
          const ext = getExtension(file.name);
          const result = await uploadService.uploadVideo(
            file.uri,
            file.name,
            mimeForVideo(ext)
          );
          videoUrl = result.url;
          if (result.durationSeconds && result.durationSeconds > 0) {
            durationSeconds = result.durationSeconds;
          }
          updateFile(file.id, { progress: 75 });
        }

        const durationLabel =
          file.durationLabel !== '--:--'
            ? file.durationLabel
            : formatDuration(durationSeconds * 1000);

        await addClip(
          currentProject.id,
          file.name.replace(/\.[^.]+$/, '') || file.name,
          durationLabel,
          '1080p',
          {
            videoUrl,
            durationSeconds: Math.max(1, Math.round(durationSeconds)),
            order: 0,
          }
        );

        stopProgressPulse(file.id);
        const durationMs =
          file.durationMs > 0
            ? file.durationMs
            : Math.round(durationSeconds * 1000);
        updateFile(file.id, {
          status: 'done',
          progress: 100,
          durationMs,
          durationLabel: formatDuration(durationMs),
        });
        // Prefer CDN URL in the editor so the clip survives after local cache clears.
        persistClipToVideoProject({ ...file, durationMs }, videoUrl);
        await fetchClips(currentProject.id);
      } catch (e: any) {
        stopProgressPulse(file.id);
        const message = e?.message || 'Upload failed. Try again.';
        updateFile(file.id, {
          status: 'error',
          progress: 0,
          errorMessage: message,
        });
        Alert.alert('Upload failed', message);
      }
    },
    [
      currentProject,
      addClip,
      fetchClips,
      persistClipToVideoProject,
      startProgressPulse,
      stopProgressPulse,
      updateFile,
    ]
  );

  const addFile = useCallback(
    (name: string, uri: string, bytes: number, durationMs?: number) => {
      const ext = getExtension(name);
      const audio = isAudioExt(ext);
      if (!audio && !VALID_EXTENSIONS.includes(ext) && !isRemoteUrl(uri)) {
        Alert.alert(
          'Unsupported file',
          `${ext.toUpperCase() || 'This file type'} isn't supported. Use MP4, MOV, AVI, or MKV.`
        );
        return;
      }
      if (!audio && bytes > MAX_BYTES) {
        Alert.alert('File too large', 'Videos must be under 100 MB.');
        return;
      }
      if (!audio && !currentProject?.id) {
        Alert.alert(
          'No project selected',
          'Open a project first, then upload a video into it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Projects',
              onPress: () => navigation.navigate('projects'),
            },
          ]
        );
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

      if (audio) {
        // Audio stays local-only for now (backend upload endpoint is video).
        startProgressPulse(id);
        setTimeout(() => {
          stopProgressPulse(id);
          updateFile(id, { status: 'done', progress: 100 });
        }, 800);
        return;
      }

      void uploadVideoToProject(newFile);
    },
    [
      currentProject?.id,
      navigation,
      startProgressPulse,
      stopProgressPulse,
      updateFile,
      uploadVideoToProject,
    ]
  );

  const removeFile = (id: string) => {
    stopProgressPulse(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

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
    addFile(name, asset.uri, asset.fileSize ?? 0, asset.duration ?? undefined);
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'audio/mpeg'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    result.assets.forEach((asset) => addFile(asset.name, asset.uri, asset.size ?? 0));
  };

  const pickFromCloud = pickFromFiles;

  const submitUrl = () => {
    const trimmed = urlDraft.trim();
    const looksValid =
      /^https?:\/\/.+\.(mp4|mov|avi|mkv|mp3)(\?.*)?$/i.test(trimmed) ||
      /^https?:\/\/.+/i.test(trimmed);
    if (!looksValid) {
      setUrlError(true);
      return;
    }
    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'remote_video.mp4';
    addFile(fileName, trimmed, 0);
    setUrlDraft('');
    setUrlError(false);
    setUrlModalVisible(false);
  };

  const handleClose = () => {
    if (navigation?.goBack) navigation.goBack();
  };

  const importSources: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    { key: 'camera', label: 'Camera roll', icon: 'videocam', onPress: pickFromCameraRoll },
    { key: 'files', label: 'Files', icon: 'film', onPress: pickFromFiles },
    { key: 'cloud', label: 'Cloud', icon: 'cloud-upload', onPress: pickFromCloud },
    { key: 'url', label: 'URL', icon: 'link', onPress: () => setUrlModalVisible(true) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
        <Pressable onPress={pickFromFiles} style={styles.dropZone}>
          <Animated.View style={{ transform: [{ scale: dropPulse }] }}>
            <Ionicons name="cloud-upload-outline" size={40} color={COLORS.yellow} />
          </Animated.View>
          <Text style={styles.dropZoneText}>Tap to select a video</Text>
          <Text style={styles.dropZoneSubtext}>MP4, MOV, AVI, MKV — up to 100 MB</Text>
          {currentProject?.name ? (
            <Text style={styles.projectHint}>Uploading to · {currentProject.name}</Text>
          ) : (
            <Text style={styles.projectHintWarn}>Open a project first to sync clips</Text>
          )}
        </Pressable>

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

        {files.map((file) => {
          const isDone = file.status === 'done';
          const isError = file.status === 'error';
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
                  color={isError ? COLORS.danger : COLORS.yellow}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileMeta}>
                  {isError
                    ? file.errorMessage || 'Upload failed'
                    : `${file.sizeLabel} · ${file.durationLabel}`}
                </Text>
                {!isError && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${file.progress}%` }]} />
                  </View>
                )}
              </View>
              {isDone ? (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.online} />
              ) : (
                <Pressable onPress={() => removeFile(file.id)} hitSlop={10}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={isError ? COLORS.danger : COLORS.textFaint}
                  />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

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
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    gap: s(12),
    marginTop: s(30),
  },
  fileIconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
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
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: s(25),
  },
  sourceLabel: {
    color: COLORS.textMuted,
    fontSize: ms(10),
  },
  modalCancelButton: {
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
  },
  dropZoneText: {
    color: COLORS.text,
    fontSize: ms(14),
    fontWeight: '600',
    marginTop: vs(10),
  },
  dropZoneSubtext: {
    color: COLORS.textMuted,
    fontSize: ms(11),
  },
  projectHint: {
    color: COLORS.yellow,
    fontSize: ms(11),
    marginTop: vs(10),
    fontWeight: '600',
  },
  projectHintWarn: {
    color: COLORS.danger,
    fontSize: ms(11),
    marginTop: vs(10),
    fontWeight: '600',
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
    opacity: 0.7,
  },
  fileMeta: {
    color: COLORS.textFaint,
    fontSize: ms(10),
    marginTop: vs(2),
  },
});
