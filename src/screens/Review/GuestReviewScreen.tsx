/**
 * Guest review — watch project export + leave timestamped comments (no login).
 * Opened via vydora://review/:token or https://vydora.io/review/:token
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  reviewService,
  ReviewCommentResponse,
} from '../services/reviewService';

type RouteParams = { GuestReview: { token: string } };

function formatTs(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function GuestReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'GuestReview'>>();
  const token = route.params?.token;
  const { background, surface, border, yellow, textPrimary, textSecondary, textMuted, danger } =
    useAppPalette();

  const styles = useMemo(
    () =>
      makeStyles({
        background,
        surface,
        border,
        yellow,
        textPrimary,
        textSecondary,
        textMuted,
        danger,
      }),
    [background, surface, border, yellow, textPrimary, textSecondary, textMuted, danger]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<ReviewCommentResponse[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [playing, setPlaying] = useState(false);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    try {
      p.timeUpdateEventInterval = 0.25;
    } catch {
      /* older expo-video */
    }
  });

  useEventListener(player, 'timeUpdate', (e: { currentTime?: number }) => {
    if (typeof e?.currentTime === 'number') setCurrentSec(e.currentTime);
  });
  useEventListener(player, 'playingChange', (e: { isPlaying?: boolean }) => {
    setPlaying(!!e?.isPlaying);
  });

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing review token.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await reviewService.getGuest(token);
      setProjectName(data.projectName || 'Review');
      setVideoUrl(data.videoUrl);
      setComments(data.comments || []);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load this review link.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlay = () => {
    if (!player || !videoUrl) return;
    if (playing) player.pause();
    else player.play();
  };

  const seekTo = (sec: number) => {
    if (!player) return;
    try {
      player.currentTime = Math.max(0, sec);
      setCurrentSec(sec);
    } catch {
      /* ignore */
    }
  };

  const submitComment = async () => {
    if (!token || posting) return;
    const name = authorName.trim();
    const body = text.trim();
    if (!name || !body) {
      Alert.alert('Add a name and comment');
      return;
    }
    try {
      setPosting(true);
      const created = await reviewService.postGuestComment(token, {
        authorName: name,
        text: body,
        timestampSeconds: currentSec,
      });
      setComments((prev) =>
        [...prev, created].sort(
          (a, b) => a.timestampSeconds - b.timestampSeconds
        )
      );
      setText('');
    } catch (e: any) {
      Alert.alert('Could not post', e?.message ?? 'Try again.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={yellow} />
        <Text style={styles.muted}>Loading review…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Ionicons name="link-outline" size={scale(36)} color={textMuted} />
        <Text style={styles.errorTitle}>Review unavailable</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="close" size={scale(24)} color={textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {projectName}
            </Text>
            <Text style={styles.subtitle}>Guest review</Text>
          </View>
        </View>

        <View style={styles.playerWrap}>
          {videoUrl ? (
            <VideoView
              style={styles.video}
              player={player}
              contentFit="contain"
              nativeControls={false}
            />
          ) : (
            <View style={[styles.video, styles.center]}>
              <Text style={styles.muted}>
                No export ready yet. Ask the editor to export first.
              </Text>
            </View>
          )}
          <View style={styles.transport}>
            <TouchableOpacity onPress={togglePlay} disabled={!videoUrl}>
              <Ionicons
                name={playing ? 'pause' : 'play'}
                size={scale(28)}
                color={yellow}
              />
            </TouchableOpacity>
            <Text style={styles.time}>{formatTs(currentSec)}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.comments}
          contentContainerStyle={{ paddingBottom: verticalScale(16) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.section}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.muted}>No comments yet — be the first.</Text>
          ) : (
            comments.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.commentRow}
                onPress={() => seekTo(c.timestampSeconds)}
              >
                <Text style={styles.commentTs}>{formatTs(c.timestampSeconds)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentAuthor}>{c.authorName}</Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <Text style={styles.composerHint}>
            Comment at {formatTs(currentSec)}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={textMuted}
            value={authorName}
            onChangeText={setAuthorName}
            maxLength={80}
          />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Leave feedback…"
            placeholderTextColor={textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.postBtn, posting && { opacity: 0.5 }]}
            onPress={submitComment}
            disabled={posting}
          >
            {posting ? (
              <ActivityIndicator color="#1A0E00" />
            ) : (
              <Text style={styles.postBtnText}>Post comment</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: Record<string, string>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(10),
    },
    title: {
      color: c.textPrimary,
      fontSize: moderateScale(17),
      fontWeight: '700',
    },
    subtitle: {
      color: c.textSecondary,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    playerWrap: {
      backgroundColor: '#000',
      marginHorizontal: scale(12),
      borderRadius: scale(12),
      overflow: 'hidden',
    },
    video: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
    },
    transport: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(10),
      backgroundColor: c.surface,
    },
    time: {
      color: c.textPrimary,
      fontSize: moderateScale(13),
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    comments: {
      flex: 1,
      paddingHorizontal: scale(16),
      marginTop: verticalScale(12),
    },
    section: {
      color: c.textPrimary,
      fontSize: moderateScale(14),
      fontWeight: '700',
      marginBottom: verticalScale(8),
    },
    commentRow: {
      flexDirection: 'row',
      gap: scale(10),
      paddingVertical: verticalScale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    commentTs: {
      color: c.yellow,
      fontSize: moderateScale(12),
      fontWeight: '700',
      width: scale(40),
    },
    commentAuthor: {
      color: c.textPrimary,
      fontSize: moderateScale(13),
      fontWeight: '600',
    },
    commentText: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      marginTop: 2,
      lineHeight: moderateScale(17),
    },
    composer: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      padding: scale(14),
      backgroundColor: c.surface,
      gap: verticalScale(8),
    },
    composerHint: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      fontWeight: '600',
    },
    input: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: scale(10),
      color: c.textPrimary,
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(10),
      fontSize: moderateScale(13),
    },
    inputMulti: { minHeight: verticalScale(64), textAlignVertical: 'top' },
    postBtn: {
      backgroundColor: c.yellow,
      borderRadius: scale(10),
      paddingVertical: verticalScale(12),
      alignItems: 'center',
    },
    postBtnText: {
      color: '#1A0E00',
      fontWeight: '800',
      fontSize: moderateScale(14),
    },
    muted: {
      color: c.textSecondary,
      fontSize: moderateScale(13),
      textAlign: 'center',
      paddingHorizontal: scale(24),
    },
    errorTitle: {
      color: c.textPrimary,
      fontSize: moderateScale(18),
      fontWeight: '700',
      marginTop: verticalScale(8),
    },
    secondaryBtn: {
      marginTop: verticalScale(16),
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderRadius: scale(10),
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryBtnText: {
      color: c.textPrimary,
      fontWeight: '600',
    },
  });
}
