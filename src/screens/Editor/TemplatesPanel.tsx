/**
 * Save / reuse edit style templates (compound look packs).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useAppPalette } from '../Contexts/ThemeContext';
import {
  editTemplateService,
  EditTemplate,
} from '../services/editTemplateService';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  danger: '#E85D5D',
};

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

  const [items, setItems] = useState<EditTemplate[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setItems(await editTemplateService.list());
  };

  useEffect(() => {
    if (visible) reload();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Templates</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Save this clip’s look (filter, color, effects, speed) and reuse it.
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
              await reload();
            } catch (e: any) {
              Alert.alert('Save failed', e?.message ?? 'Could not save template.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: verticalScale(180) }}>
        {items.length === 0 ? (
          <Text style={styles.empty}>No templates yet.</Text>
        ) : (
          items.map((t) => (
            <View key={t.id} style={styles.row}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => onApply(t)}>
                <Text style={styles.rowTitle}>{t.name}</Text>
                <Text style={styles.rowMeta}>
                  {t.look.movieEffectId && t.look.movieEffectId !== 'none'
                    ? t.look.movieEffectId
                    : t.look.effectId ?? 'look'}{' '}
                  · tap to apply
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={8}
                onPress={async () => {
                  await editTemplateService.remove(t.id);
                  await reload();
                }}
              >
                <Ionicons name="trash-outline" size={scale(16)} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginVertical: verticalScale(8),
  },
  saveRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(10) },
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
  saveBtnText: { color: '#0B0D13', fontWeight: '700', fontSize: moderateScale(12) },
  empty: { color: COLORS.textSecondary, fontSize: moderateScale(12) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: scale(10),
  },
  rowTitle: { color: COLORS.textPrimary, fontSize: moderateScale(13), fontWeight: '600' },
  rowMeta: { color: COLORS.textSecondary, fontSize: moderateScale(10), marginTop: 2 },
});
}
let styles = __makeStyles();

