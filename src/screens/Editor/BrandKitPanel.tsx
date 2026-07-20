/**
 * Brand kit panel — edit colors / caption style, Save, opt-in Apply.
 * Pure client; nothing is pushed to the project until Apply is tapped.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Slider from '@react-native-community/slider';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  BrandKit,
  brandKitService,
  defaultBrandKit,
} from '../services/brandKitService';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

interface BrandKitPanelProps {
  visible: boolean;
  /** Persist kit (parent may also sync UI state). */
  onSave: (kit: BrandKit) => void | Promise<void>;
  /** Opt-in apply to the open project. */
  onApply: (kit: BrandKit) => void | Promise<void>;
  onClose: () => void;
  /** Seed the form when opening (optional). */
  initialKit?: BrandKit | null;
}

export default function BrandKitPanel({
  visible,
  onSave,
  onApply,
  onClose,
  initialKit,
}: BrandKitPanelProps) {
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
  };
  styles = __makeStyles();

  const [kit, setKit] = useState<BrandKit>(() => defaultBrandKit(initialKit ?? undefined));
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      if (initialKit) {
        setKit(defaultBrandKit(initialKit));
        return;
      }
      const listed = await brandKitService.list();
      if (cancelled) return;
      if (listed.length > 0) setKit(defaultBrandKit(listed[0]));
      else setKit(defaultBrandKit());
    })();
    setMessage(null);
    setError(null);
    return () => {
      cancelled = true;
    };
  }, [visible, initialKit]);

  if (!visible) return null;

  const patch = (partial: Partial<BrandKit>) => setKit((k) => ({ ...k, ...partial }));
  const patchCaption = (partial: Partial<BrandKit['captionStyle']>) =>
    setKit((k) => ({ ...k, captionStyle: { ...k.captionStyle, ...partial } }));

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      const saved = await brandKitService.save(kit);
      setKit(saved);
      await onSave(saved);
      setMessage('Kit saved.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save kit.');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (applying) return;
    try {
      setApplying(true);
      setError(null);
      await onApply(kit);
      setMessage('Applied to project.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not apply kit.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Brand kit</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Colors and caption style stay on this device until you tap Apply.
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.scroll}
      >
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={kit.name}
          onChangeText={(name) => patch({ name })}
          placeholder="My brand"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Primary color</Text>
        <TextInput
          style={styles.input}
          value={kit.primaryColor}
          onChangeText={(primaryColor) => patch({ primaryColor })}
          autoCapitalize="characters"
          placeholder="#F5C518"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Accent color</Text>
        <TextInput
          style={styles.input}
          value={kit.accentColor}
          onChangeText={(accentColor) => patch({ accentColor })}
          autoCapitalize="characters"
          placeholder="#FFFFFF"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Font family</Text>
        <TextInput
          style={styles.input}
          value={kit.fontFamily}
          onChangeText={(fontFamily) => patch({ fontFamily })}
          placeholder="System"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Caption color</Text>
        <TextInput
          style={styles.input}
          value={kit.captionStyle.color}
          onChangeText={(color) => patchCaption({ color })}
          placeholder="#FFFFFF"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Caption background</Text>
        <TextInput
          style={styles.input}
          value={kit.captionStyle.backgroundColor}
          onChangeText={(backgroundColor) => patchCaption({ backgroundColor })}
          placeholder="#000000"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.sliderLabel}>
          Caption size {Math.round(kit.captionStyle.fontSize)}
        </Text>
        <Slider
          minimumValue={16}
          maximumValue={48}
          step={1}
          value={kit.captionStyle.fontSize}
          onValueChange={(fontSize) => patchCaption({ fontSize })}
          minimumTrackTintColor={COLORS.textSecondary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />

        <Text style={styles.sliderLabel}>
          Caption bg opacity {Math.round(kit.captionStyle.backgroundOpacity * 100)}%
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          value={kit.captionStyle.backgroundOpacity}
          onValueChange={(backgroundOpacity) => patchCaption({ backgroundOpacity })}
          minimumTrackTintColor={COLORS.textSecondary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />

        <Text style={styles.sliderLabel}>
          Caption Y {Math.round(kit.captionStyle.y * 100)}%
        </Text>
        <Slider
          minimumValue={0.1}
          maximumValue={0.95}
          step={0.01}
          value={kit.captionStyle.y}
          onValueChange={(y) => patchCaption({ y })}
          minimumTrackTintColor={COLORS.textSecondary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.yellow}
        />

        <Text style={styles.label}>Intro text (optional)</Text>
        <TextInput
          style={styles.input}
          value={kit.introText ?? ''}
          onChangeText={(introText) => patch({ introText })}
          placeholder="Welcome…"
          placeholderTextColor={COLORS.textSecondary}
        />

        <Text style={styles.label}>Outro text (optional)</Text>
        <TextInput
          style={styles.input}
          value={kit.outroText ?? ''}
          onChangeText={(outroText) => patch({ outroText })}
          placeholder="Thanks for watching"
          placeholderTextColor={COLORS.textSecondary}
        />
      </ScrollView>

      {(saving || applying) && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.yellow} />
          <Text style={styles.loadingText}>{saving ? 'Saving…' : 'Applying…'}</Text>
        </View>
      )}

      {!saving && !applying && (
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSave}>
            <Ionicons name="save-outline" size={scale(16)} color={COLORS.textPrimary} />
            <Text style={styles.secondaryBtnText}>Save kit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleApply}>
            <Ionicons name="color-palette" size={scale(16)} color={COLORS.background} />
            <Text style={styles.primaryBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {message && !saving && !applying && <Text style={styles.success}>{message}</Text>}
      {error && !saving && !applying && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
    maxHeight: verticalScale(420),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  title: { color: COLORS.textPrimary, fontSize: moderateScale(15), fontWeight: '700' },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(10),
    lineHeight: moderateScale(16),
  },
  scroll: { maxHeight: verticalScale(280) },
  label: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(4),
    marginTop: verticalScale(8),
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(9),
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(2),
  },
  btnRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(12),
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: COLORS.yellow,
    paddingVertical: verticalScale(11),
    borderRadius: scale(12),
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: verticalScale(11),
    borderRadius: scale(12),
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  loadingRow: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(12),
  },
  success: {
    marginTop: verticalScale(8),
    color: '#34D399',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  error: {
    marginTop: verticalScale(8),
    color: COLORS.danger,
    fontSize: moderateScale(12),
  },
});
}
let styles = __makeStyles();

