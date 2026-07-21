/**
 * CapCut-style Templates panel — Starter gallery + My templates.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useNavigation } from '@react-navigation/native';
import { useAppPalette } from '../Contexts/ThemeContext';
import { useIsPro } from '../Contexts/subscription';
import {
  editTemplateService,
  EditTemplate,
} from '../services/editTemplateService';
import {
  STARTER_CATEGORIES,
  StarterCategory,
  StarterTemplate,
  listStarters,
} from '../services/starterTemplates';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
  accentOn: '#1A0E00',
};

type Tab = 'starter' | 'mine';

interface TemplatesPanelProps {
  visible: boolean;
  canSave: boolean;
  onSave: (name: string) => Promise<void>;
  onApply: (tpl: EditTemplate) => void;
  onClose: () => void;
}

export default function TemplatesPanel({
  visible,
  canSave,
  onSave,
  onApply,
  onClose,
}: TemplatesPanelProps) {
  const navigation = useNavigation<any>();
  const { isPro, refresh } = useIsPro();
  const __palette = useAppPalette();
  COLORS = {
    ...COLORS,
    background: __palette.background,
    surface: __palette.surface,
    border: __palette.border,
    yellow: __palette.yellow,
    textPrimary: __palette.textPrimary,
    textSecondary: __palette.textSecondary,
    textMuted: __palette.textMuted,
    accentOn: __palette.accentOn,
  };
  styles = __makeStyles();

  const [tab, setTab] = useState<Tab>('starter');
  const [category, setCategory] = useState<StarterCategory | 'All'>('Looks');
  const [mine, setMine] = useState<EditTemplate[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const starters = useMemo(() => listStarters(category), [category]);

  const reloadMine = async () => {
    setMine(await editTemplateService.list());
  };

  useEffect(() => {
    if (visible) {
      reloadMine();
      refresh();
    }
  }, [visible, refresh]);

  if (!visible) return null;

  const applyStarter = (t: StarterTemplate) => {
    if (t.tier === 'pro' && !isPro) {
      Alert.alert(
        'Pro template',
        `"${t.name}" is part of Vydora Pro. Unlock Pro in Settings (dev) for now — Paystack billing comes next.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'See Pro',
            onPress: () => navigation.navigate('proscreen'),
          },
        ]
      );
      return;
    }
    onApply(t.recipe);
    if (t.recipe.coachHint) {
      Alert.alert(`Applied · ${t.name}`, t.recipe.coachHint, [
        { text: 'Got it' },
      ]);
    }
    onClose();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Templates</Text>
          <Text style={styles.subtitle}>
            {isPro ? 'Pro unlocked' : '10 Finished Looks · free'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['starter', 'mine'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'starter' ? 'Starter' : 'My templates'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'starter' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
          >
            {STARTER_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === c && styles.chipTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}
          >
            {starters.map((t) => {
              const locked = t.tier === 'pro' && !isPro;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.88}
                  onPress={() => applyStarter(t)}
                  style={styles.cardWrap}
                >
                  <LinearGradient
                    colors={[t.accent, t.accent2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.card}
                  >
                    {t.previewVideoUrl ? (
                      <StarterPreview uri={t.previewVideoUrl} />
                    ) : null}
                    <View style={styles.cardTop}>
                      <View style={styles.iconBubble}>
                        <Ionicons name={t.icon} size={scale(18)} color="#fff" />
                      </View>
                      {t.tier === 'pro' && (
                        <View style={styles.proBadge}>
                          <Ionicons
                            name={locked ? 'lock-closed' : 'diamond'}
                            size={scale(10)}
                            color="#1A0E00"
                          />
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={styles.cardTag} numberOfLines={2}>
                      {t.tagline}
                    </Text>
                    {locked && <View style={styles.lockScrim} />}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Save this clip’s look (filter, color, effects, speed, text) and reuse
            it anytime.
          </Text>
          <View style={styles.saveRow}>
            <TextInput
              style={styles.input}
              placeholder="Template name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || busy) && styles.saveDisabled]}
              disabled={!canSave || busy}
              onPress={async () => {
                try {
                  setBusy(true);
                  await onSave(name.trim() || 'My template');
                  setName('');
                  await reloadMine();
                } catch (e: any) {
                  Alert.alert(
                    'Save failed',
                    e?.message ?? 'Could not save template.'
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: verticalScale(200) }}>
            {mine.length === 0 ? (
              <Text style={styles.empty}>No saved templates yet.</Text>
            ) : (
              mine.map((t) => (
                <View key={t.id} style={styles.row}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      onApply(t);
                      onClose();
                    }}
                  >
                    <Text style={styles.rowTitle}>{t.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t.look.movieEffectId && t.look.movieEffectId !== 'none'
                        ? t.look.movieEffectId
                        : t.look.effectId ?? t.look.filterId ?? 'look'}{' '}
                      · tap to apply
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={8}
                    onPress={async () => {
                      await editTemplateService.remove(t.id);
                      await reloadMine();
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={scale(16)}
                      color={COLORS.danger}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function StarterPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      p.play();
    } catch {
      /* ignore */
    }
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function __makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.surface,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingHorizontal: scale(14),
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(14),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: verticalScale(8),
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(16),
      fontWeight: '800',
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      marginTop: 2,
      fontWeight: '600',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: COLORS.background,
      borderRadius: scale(10),
      padding: scale(3),
      marginBottom: verticalScale(10),
    },
    tab: {
      flex: 1,
      paddingVertical: verticalScale(7),
      borderRadius: scale(8),
      alignItems: 'center',
    },
    tabActive: { backgroundColor: COLORS.yellow },
    tabText: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(12),
      fontWeight: '700',
    },
    tabTextActive: { color: COLORS.accentOn },
    catRow: { gap: scale(8), paddingBottom: verticalScale(10) },
    chip: {
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    chipActive: {
      borderColor: COLORS.yellow,
      backgroundColor: 'rgba(245,197,24,0.15)',
    },
    chipText: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
    },
    chipTextActive: { color: COLORS.yellow },
    gallery: { gap: scale(10), paddingRight: scale(8) },
    cardWrap: { width: scale(132) },
    card: {
      height: verticalScale(148),
      borderRadius: scale(16),
      padding: scale(12),
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    iconBubble: {
      width: scale(32),
      height: scale(32),
      borderRadius: scale(10),
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: COLORS.yellow,
      paddingHorizontal: scale(6),
      paddingVertical: verticalScale(2),
      borderRadius: scale(8),
    },
    proBadgeText: {
      color: '#1A0E00',
      fontSize: moderateScale(9),
      fontWeight: '900',
    },
    cardName: {
      color: '#FFFFFF',
      fontSize: moderateScale(14),
      fontWeight: '800',
      textShadowColor: 'rgba(0,0,0,0.35)',
      textShadowRadius: 4,
      textShadowOffset: { width: 0, height: 1 },
    },
    cardTag: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: moderateScale(10),
      fontWeight: '600',
      lineHeight: moderateScale(13),
    },
    lockScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
    },
    saveRow: {
      flexDirection: 'row',
      gap: scale(8),
      marginBottom: verticalScale(10),
    },
    input: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: COLORS.border,
      color: COLORS.textPrimary,
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(8),
      fontSize: moderateScale(13),
    },
    saveBtn: {
      backgroundColor: COLORS.yellow,
      borderRadius: scale(8),
      paddingHorizontal: scale(14),
      justifyContent: 'center',
    },
    saveDisabled: { opacity: 0.4 },
    saveBtnText: {
      color: COLORS.accentOn,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
    empty: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: verticalScale(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      gap: scale(10),
    },
    rowTitle: {
      color: COLORS.textPrimary,
      fontSize: moderateScale(13),
      fontWeight: '600',
    },
    rowMeta: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(10),
      marginTop: 2,
    },
  });
}
let styles = __makeStyles();
