/**
 * Conference slate MVP — blank canvas + timed text + guest profiles + music fades.
 * Built for summit intros / outros (Pan-African AI style motion graphics).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useAppPalette } from '../Contexts/ThemeContext';
import { TextAnimationType, TitleCardSettings, VideoClip } from '../types';
import { TEXT_ANIM_IN_PRESETS } from '../services/textAnimPresets';

let COLORS: Record<string, string> = {
  background: '#151821',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  border: '#2A2A2E',
  danger: '#E85D5D',
};

const SLATE_COLORS = [
  '#0B1A33',
  '#0A1628',
  '#000000',
  '#111827',
  '#1E3A5F',
  '#4C1D95',
  '#FFFFFF',
  '#F5C518',
];

const TEXT_COLORS = [
  '#FFFFFF',
  '#22D3EE',
  '#E879F9',
  '#F5C518',
  '#93C5FD',
  '#000000',
];

type Where = 'start' | 'before' | 'after' | 'end';
type Tab = 'slate' | 'text' | 'guests' | 'music';

export type ConferenceTimedText = {
  text: string;
  startMs: number;
  durationMs: number;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  animationIn: TextAnimationType;
};

export type ConferenceGuest = {
  uri: string;
  name: string;
  role?: string;
  startMs: number;
  durationMs: number;
  x: number;
  y: number;
  animationIn: TextAnimationType;
};

interface ConferencePanelProps {
  visible: boolean;
  clips: VideoClip[];
  selectedClipId?: string | null;
  hasMusic: boolean;
  onCreateSlate: (
    card: TitleCardSettings,
    durationMs: number,
    where: Where
  ) => string | null;
  onAddTimedText: (
    clipId: string,
    layer: ConferenceTimedText
  ) => void;
  onAddGuest: (guest: ConferenceGuest) => void;
  onApplyMusicFades: (fadeInMs: number, fadeOutMs: number) => void;
  onSelectClip: (clipId: string) => void;
  onClose: () => void;
}

export default function ConferencePanel({
  visible,
  clips,
  selectedClipId,
  hasMusic,
  onCreateSlate,
  onAddTimedText,
  onAddGuest,
  onApplyMusicFades,
  onSelectClip,
  onClose,
}: ConferencePanelProps) {
  const p = useAppPalette();
  COLORS = {
    ...COLORS,
    background: p.background,
    border: p.border,
    yellow: p.yellow,
    textPrimary: p.textPrimary,
    textSecondary: p.textSecondary,
    danger: p.danger,
  };
  styles = makeStyles();

  const [tab, setTab] = useState<Tab>('slate');
  const [bg, setBg] = useState('#0B1A33');
  const [slateDur, setSlateDur] = useState(12);
  const [where, setWhere] = useState<Where>('start');
  const [title, setTitle] = useState('PAN AFRICAN AI & INNOVATION');
  const [subtitle, setSubtitle] = useState('SUMMIT · ACCRA');

  const [lineText, setLineText] = useState('BE IN THE ROOM');
  const [lineColor, setLineColor] = useState('#FFFFFF');
  const [lineAnim, setLineAnim] = useState<TextAnimationType>('fade');
  const [lineStartSec, setLineStartSec] = useState(1);
  const [lineY, setLineY] = useState(0.42);
  const [lineSize, setLineSize] = useState(28);

  const [guestName, setGuestName] = useState('');
  const [guestRole, setGuestRole] = useState('Speaker');
  const [guestUri, setGuestUri] = useState<string | null>(null);
  const [guestStartSec, setGuestStartSec] = useState(3);
  const [guestAnim, setGuestAnim] = useState<TextAnimationType>('slideUp');
  const [guestX, setGuestX] = useState(0.5);

  const [fadeInSec, setFadeInSec] = useState(2);
  const [fadeOutSec, setFadeOutSec] = useState(2.5);

  if (!visible) return null;

  const slateClips = clips.filter(
    (c) => c.kind === 'title' || c.kind === 'flyer'
  );
  const targetClipId =
    (selectedClipId &&
      clips.find((c) => c.id === selectedClipId)?.kind === 'title' &&
      selectedClipId) ||
    slateClips[0]?.id ||
    null;

  const createSlate = () => {
    const id = onCreateSlate(
      {
        backgroundColor: bg,
        title: title.trim() || 'Conference',
        subtitle: subtitle.trim() || undefined,
        textColor: ['#FFFFFF', '#F5C518'].includes(bg.toUpperCase())
          ? '#0B0D13'
          : '#FFFFFF',
        fontSize: 36,
        animationIn: 'fade',
      },
      Math.round(slateDur * 1000),
      where
    );
    if (id) {
      onSelectClip(id);
      setTab('text');
      Alert.alert(
        'Slate ready',
        'Add timed text lines and guest profiles. Music fades are under Music.'
      );
    }
  };

  const addTextLine = () => {
    if (!targetClipId) {
      Alert.alert('Create a slate first', 'Use the Slate tab to add a blank screen.');
      return;
    }
    if (!lineText.trim()) return;
    onAddTimedText(targetClipId, {
      text: lineText.trim(),
      startMs: Math.round(lineStartSec * 1000),
      durationMs: Math.max(1500, Math.round((slateDur - lineStartSec) * 1000)),
      x: 0.5,
      y: lineY,
      color: lineColor,
      fontSize: lineSize,
      animationIn: lineAnim,
    });
    Alert.alert('Text added', `"${lineText.trim()}" at ${lineStartSec.toFixed(1)}s`);
  };

  const pickGuest = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setGuestUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Photo', e?.message ?? 'Could not open gallery.');
    }
  };

  const addGuest = () => {
    if (!guestUri) {
      Alert.alert('Pick a photo', 'Guest profile needs a headshot.');
      return;
    }
    if (!guestName.trim()) {
      Alert.alert('Name required', 'Add the speaker / guest name.');
      return;
    }
    onAddGuest({
      uri: guestUri,
      name: guestName.trim(),
      role: guestRole.trim() || undefined,
      startMs: Math.round(guestStartSec * 1000),
      durationMs: 5000,
      x: guestX,
      y: 0.62,
      animationIn: guestAnim,
    });
    setGuestUri(null);
    setGuestName('');
    setGuestStartSec((s) => s + 1.2);
    setGuestX((x) => (x < 0.35 ? 0.5 : x < 0.65 ? 0.78 : 0.22));
    Alert.alert('Guest added', 'They fade/slide in at the time you set.');
  };

  const applySummitPreset = () => {
    const id = onCreateSlate(
      {
        backgroundColor: '#0B1A33',
        title: 'ONE ROOM',
        subtitle: 'Executive Roundtable',
        textColor: '#FFFFFF',
        fontSize: 40,
        animationIn: 'fade',
      },
      14000,
      'start'
    );
    if (!id) return;
    onSelectClip(id);
    const lines: ConferenceTimedText[] = [
      {
        text: 'PAN AFRICAN',
        startMs: 400,
        durationMs: 12000,
        x: 0.5,
        y: 0.28,
        color: '#FFFFFF',
        fontSize: 18,
        animationIn: 'fade',
      },
      {
        text: 'AI & INNOVATION',
        startMs: 900,
        durationMs: 11500,
        x: 0.5,
        y: 0.36,
        color: '#22D3EE',
        fontSize: 32,
        animationIn: 'slideUp',
      },
      {
        text: 'SUMMIT',
        startMs: 1400,
        durationMs: 11000,
        x: 0.5,
        y: 0.44,
        color: '#E879F9',
        fontSize: 22,
        animationIn: 'fade',
      },
      {
        text: '22-23 SEPTEMBER 2026',
        startMs: 2200,
        durationMs: 10000,
        x: 0.5,
        y: 0.54,
        color: '#FFFFFF',
        fontSize: 16,
        animationIn: 'fade',
      },
      {
        text: 'KEMPINSKI HOTEL, ACCRA',
        startMs: 2800,
        durationMs: 9500,
        x: 0.5,
        y: 0.6,
        color: '#93C5FD',
        fontSize: 13,
        animationIn: 'fade',
      },
      {
        text: 'BE IN THE ROOM',
        startMs: 3800,
        durationMs: 8500,
        x: 0.5,
        y: 0.72,
        color: '#FFFFFF',
        fontSize: 26,
        animationIn: 'pop',
      },
    ];
    lines.forEach((l) => onAddTimedText(id, l));
    onApplyMusicFades(2000, 2500);
    setTab('guests');
    Alert.alert(
      'Summit intro built',
      'Timed lines are on the slate. Add guest photos next, then Music → pick a bed (fades already applied).'
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Conference</Text>
          <Text style={styles.sub}>
            Blank slate · timed text · guest profiles · music fades
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(
          [
            ['slate', 'Slate'],
            ['text', 'Text'],
            ['guests', 'Guests'],
            ['music', 'Music'],
          ] as const
        ).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && styles.tabOn]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ maxHeight: verticalScale(300) }}>
        {tab === 'slate' && (
          <>
            <TouchableOpacity style={styles.presetBtn} onPress={applySummitPreset}>
              <Ionicons name="sparkles" size={scale(16)} color="#111" />
              <Text style={styles.presetText}>1-tap summit intro preset</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Background</Text>
            <View style={styles.row}>
              {SLATE_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    bg === c && styles.swatchOn,
                  ]}
                  onPress={() => setBg(c)}
                />
              ))}
            </View>
            <Text style={styles.label}>Main title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={COLORS.textSecondary}
              placeholder="Event title"
            />
            <Text style={styles.label}>Subtitle</Text>
            <TextInput
              style={styles.input}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholderTextColor={COLORS.textSecondary}
              placeholder="City · tagline"
            />
            <Text style={styles.label}>Duration · {slateDur}s</Text>
            <Slider
              minimumValue={6}
              maximumValue={30}
              step={1}
              value={slateDur}
              onValueChange={setSlateDur}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Place</Text>
            <View style={styles.row}>
              {(['start', 'before', 'after', 'end'] as Where[]).map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chip, where === w && styles.chipOn]}
                  onPress={() => setWhere(w)}
                >
                  <Text
                    style={[styles.chipText, where === w && styles.chipTextOn]}
                  >
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primary} onPress={createSlate}>
              <Text style={styles.primaryText}>Create blank slate</Text>
            </TouchableOpacity>
            {slateClips.length > 0 && (
              <Text style={styles.hint}>
                {slateClips.length} slate(s) on timeline — select one to add
                text.
              </Text>
            )}
          </>
        )}

        {tab === 'text' && (
          <>
            <Text style={styles.hint}>
              Each line appears at its own time with its own animation & color —
              like professional conference openers.
            </Text>
            <TextInput
              style={styles.input}
              value={lineText}
              onChangeText={setLineText}
              placeholderTextColor={COLORS.textSecondary}
              placeholder="Line of text"
            />
            <Text style={styles.label}>Appear at · {lineStartSec.toFixed(1)}s</Text>
            <Slider
              minimumValue={0}
              maximumValue={Math.max(1, slateDur - 1)}
              step={0.1}
              value={lineStartSec}
              onValueChange={setLineStartSec}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Vertical position · {lineY.toFixed(2)}</Text>
            <Slider
              minimumValue={0.12}
              maximumValue={0.88}
              value={lineY}
              onValueChange={setLineY}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Size · {lineSize}</Text>
            <Slider
              minimumValue={14}
              maximumValue={48}
              step={1}
              value={lineSize}
              onValueChange={setLineSize}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.row}>
              {TEXT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    lineColor === c && styles.swatchOn,
                  ]}
                  onPress={() => setLineColor(c)}
                />
              ))}
            </View>
            <Text style={styles.label}>Entrance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {TEXT_ANIM_IN_PRESETS.slice(0, 12).map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chip, lineAnim === a.id && styles.chipOn]}
                    onPress={() => setLineAnim(a.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        lineAnim === a.id && styles.chipTextOn,
                      ]}
                    >
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.primary} onPress={addTextLine}>
              <Text style={styles.primaryText}>Add timed text</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === 'guests' && (
          <>
            <Text style={styles.hint}>
              Guest photos enter at different times with fade / slide — classic
              conference roll call.
            </Text>
            <TouchableOpacity style={styles.pick} onPress={pickGuest}>
              {guestUri ? (
                <Image source={{ uri: guestUri }} style={styles.avatar} />
              ) : (
                <>
                  <Ionicons
                    name="person-circle-outline"
                    size={scale(36)}
                    color={COLORS.yellow}
                  />
                  <Text style={styles.pickText}>Pick headshot</Text>
                </>
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Guest name"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={guestRole}
              onChangeText={setGuestRole}
              placeholder="Role (Keynote, Moderator…)"
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={styles.label}>
              Enter at · {guestStartSec.toFixed(1)}s
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={20}
              step={0.1}
              value={guestStartSec}
              onValueChange={setGuestStartSec}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Horizontal · {guestX.toFixed(2)}</Text>
            <Slider
              minimumValue={0.2}
              maximumValue={0.8}
              value={guestX}
              onValueChange={setGuestX}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Entrance</Text>
            <View style={styles.row}>
              {(['fade', 'slideUp', 'pop', 'zoom'] as TextAnimationType[]).map(
                (a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, guestAnim === a && styles.chipOn]}
                    onPress={() => setGuestAnim(a)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        guestAnim === a && styles.chipTextOn,
                      ]}
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            <TouchableOpacity style={styles.primary} onPress={addGuest}>
              <Text style={styles.primaryText}>Add guest profile</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === 'music' && (
          <>
            <Text style={styles.hint}>
              Smooth conference beds: long fade-in / fade-out under the slate.
              Pick a track in Music first if you haven’t.
            </Text>
            <Text style={styles.label}>Fade in · {fadeInSec.toFixed(1)}s</Text>
            <Slider
              minimumValue={0}
              maximumValue={6}
              step={0.1}
              value={fadeInSec}
              onValueChange={setFadeInSec}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <Text style={styles.label}>Fade out · {fadeOutSec.toFixed(1)}s</Text>
            <Slider
              minimumValue={0}
              maximumValue={6}
              step={0.1}
              value={fadeOutSec}
              onValueChange={setFadeOutSec}
              minimumTrackTintColor={COLORS.yellow}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.yellow}
            />
            <View style={styles.row}>
              {[
                { label: 'Soft', in: 2, out: 2.5 },
                { label: 'Cinematic', in: 3.5, out: 4 },
                { label: 'Snap', in: 0.4, out: 0.8 },
              ].map((pset) => (
                <TouchableOpacity
                  key={pset.label}
                  style={styles.chip}
                  onPress={() => {
                    setFadeInSec(pset.in);
                    setFadeOutSec(pset.out);
                  }}
                >
                  <Text style={styles.chipText}>{pset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primary, !hasMusic && { opacity: 0.5 }]}
              onPress={() => {
                if (!hasMusic) {
                  Alert.alert(
                    'Add music first',
                    'Open Music, pick a track, then apply fades here.'
                  );
                  return;
                }
                onApplyMusicFades(
                  Math.round(fadeInSec * 1000),
                  Math.round(fadeOutSec * 1000)
                );
                Alert.alert('Fades applied', 'Preview playhead to hear the bed.');
              }}
            >
              <Text style={styles.primaryText}>Apply music fades</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      padding: scale(14),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(8),
    },
    title: {
      color: COLORS.textPrimary,
      fontWeight: '800',
      fontSize: moderateScale(15),
    },
    sub: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginTop: 2,
    },
    tabs: { gap: scale(8), marginBottom: verticalScale(8) },
    tab: {
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(6),
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabOn: {
      borderColor: COLORS.yellow,
      backgroundColor: 'rgba(245,197,24,0.15)',
    },
    tabText: {
      color: COLORS.textSecondary,
      fontWeight: '700',
      fontSize: moderateScale(12),
    },
    tabTextOn: { color: COLORS.yellow },
    label: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      fontWeight: '600',
      marginTop: verticalScale(8),
      marginBottom: verticalScale(4),
    },
    hint: {
      color: COLORS.textSecondary,
      fontSize: moderateScale(11),
      marginBottom: verticalScale(8),
      lineHeight: moderateScale(15),
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: scale(10),
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(8),
      color: COLORS.textPrimary,
      marginBottom: verticalScale(6),
      fontSize: moderateScale(13),
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
    swatch: {
      width: scale(28),
      height: scale(28),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    swatchOn: { borderColor: COLORS.yellow, borderWidth: 2 },
    chip: {
      paddingHorizontal: scale(10),
      paddingVertical: verticalScale(6),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    chipOn: {
      borderColor: COLORS.yellow,
      backgroundColor: 'rgba(245,197,24,0.12)',
    },
    chipText: {
      color: COLORS.textSecondary,
      fontWeight: '700',
      fontSize: moderateScale(11),
      textTransform: 'capitalize',
    },
    chipTextOn: { color: COLORS.yellow },
    primary: {
      backgroundColor: COLORS.yellow,
      borderRadius: scale(12),
      paddingVertical: verticalScale(12),
      alignItems: 'center',
      marginTop: verticalScale(10),
    },
    primaryText: { color: '#111', fontWeight: '800', fontSize: moderateScale(14) },
    presetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scale(8),
      backgroundColor: COLORS.yellow,
      borderRadius: scale(12),
      paddingVertical: verticalScale(10),
      marginBottom: verticalScale(8),
    },
    presetText: { color: '#111', fontWeight: '800', fontSize: moderateScale(13) },
    pick: {
      height: verticalScale(88),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: verticalScale(8),
    },
    pickText: {
      color: COLORS.textSecondary,
      marginTop: 4,
      fontWeight: '600',
    },
    avatar: {
      width: scale(72),
      height: scale(72),
      borderRadius: scale(36),
    },
  });
}
let styles = makeStyles();
