/**
 * Media Library — project clips + stock shortcuts.
 * Opened from More → Media Library (`MediaLibrary` stack route).
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTheme, ThemeColors } from '../Contexts/ThemeContext';
import { useVideoProject } from '../Contexts/VideoProjectContext';
import { useProject } from '../Contexts/projectContext';
import { useClip } from '../Contexts/clipContext';
import {
  MUSIC_LIBRARY,
  SFX_LIBRARY,
  FOOTAGE_LIBRARY,
} from '../services/musicLibrary';

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { currentVideoProject } = useVideoProject();
  const { currentProject } = useProject();
  const { getClipsForProject } = useClip();

  const timelineClips = currentVideoProject?.clips ?? [];
  const collabClips = currentProject
    ? getClipsForProject(currentProject.id)
    : [];
  const mediaClips =
    timelineClips.length > 0
      ? timelineClips.map((c) => ({
          id: c.id,
          title: c.name || 'Clip',
          uri: c.uri,
          thumbnailUri: c.thumbnailUri,
          durationMs: c.durationMs,
        }))
      : collabClips.map((c) => ({
          id: c.id,
          title: c.title || 'Clip',
          uri: c.videoUrl || '',
          thumbnailUri: c.thumbnailUrl,
          durationMs: 0,
        }));

  const stockPreview = [
    ...MUSIC_LIBRARY.slice(0, 2),
    ...SFX_LIBRARY.slice(0, 2),
    ...FOOTAGE_LIBRARY.slice(0, 2),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={scale(24)} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Media Library</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>
          {currentProject?.name
            ? `${currentProject.name} · clips`
            : 'Project clips'}
        </Text>

        {mediaClips.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="folder-open-outline"
              size={scale(36)}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No media yet</Text>
            <Text style={styles.emptyBody}>
              Upload clips to this project, or pull royalty-free stock from the
              editor.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('uploadvideo')}
            >
              <Text style={styles.primaryBtnText}>Upload video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {mediaClips.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('editorscreen')}
              >
                {c.thumbnailUri ? (
                  <Image
                    source={{ uri: c.thumbnailUri }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons
                      name="videocam"
                      size={scale(22)}
                      color={colors.textMuted}
                    />
                  </View>
                )}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {c.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.section, { marginTop: verticalScale(28) }]}>
          Stock library
        </Text>
        <Text style={styles.hint}>
          Music, SFX, and B-roll — open the editor Stock tool to search and add.
        </Text>

        {stockPreview.map((t) => (
          <View key={t.id} style={styles.stockRow}>
            <View style={styles.stockIcon}>
              <Ionicons
                name={
                  t.kind === 'footage'
                    ? 'film-outline'
                    : t.kind === 'sfx'
                      ? 'flash-outline'
                      : 'musical-notes-outline'
                }
                size={scale(16)}
                color={colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stockTitle}>{t.title}</Text>
              <Text style={styles.stockMeta}>
                {t.kind.toUpperCase()} · {t.mood} · {t.durationLabel}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('editorscreen')}
        >
          <Ionicons name="albums-outline" size={scale(16)} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>Open editor → Stock</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(14),
      paddingHorizontal: scale(18),
      paddingVertical: verticalScale(12),
    },
    headerTitle: {
      color: colors.text,
      fontSize: moderateScale(24),
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: scale(18),
      paddingBottom: verticalScale(40),
    },
    section: {
      color: colors.textMuted,
      fontSize: moderateScale(12),
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: verticalScale(12),
      textTransform: 'uppercase',
    },
    hint: {
      color: colors.textSecondary,
      fontSize: moderateScale(12),
      marginBottom: verticalScale(12),
      lineHeight: moderateScale(17),
    },
    empty: {
      alignItems: 'center',
      paddingVertical: verticalScale(28),
      paddingHorizontal: scale(12),
      gap: verticalScale(8),
      backgroundColor: colors.card,
      borderRadius: scale(14),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: moderateScale(16),
      fontWeight: '700',
      marginTop: verticalScale(4),
    },
    emptyBody: {
      color: colors.textSecondary,
      fontSize: moderateScale(13),
      textAlign: 'center',
      lineHeight: moderateScale(18),
      marginBottom: verticalScale(8),
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
      borderRadius: scale(10),
    },
    primaryBtnText: {
      color: colors.accentOn,
      fontWeight: '800',
      fontSize: moderateScale(13),
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scale(10),
    },
    card: {
      width: '47%',
      backgroundColor: colors.card,
      borderRadius: scale(12),
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    thumb: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: colors.iconBg,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      color: colors.text,
      fontSize: moderateScale(12),
      fontWeight: '600',
      padding: scale(8),
    },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(12),
      paddingVertical: verticalScale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    stockIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: scale(10),
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stockTitle: {
      color: colors.text,
      fontSize: moderateScale(13),
      fontWeight: '600',
    },
    stockMeta: {
      color: colors.textSecondary,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
      marginTop: verticalScale(18),
      paddingVertical: verticalScale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryBtnText: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: moderateScale(13),
    },
  });
}
