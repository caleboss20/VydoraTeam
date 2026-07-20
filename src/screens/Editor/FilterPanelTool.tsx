import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { VideoFilter } from '../types';
import { useAppPalette } from '../Contexts/ThemeContext';

let COLORS: Record<string, string> = {
  background: '#0B0D13',
  surface: '#151821',
  border: '#222633',
  yellow: '#e7e55c',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
};
interface FilterToolPanelProps {
  visible: boolean;
  filters: VideoFilter[];
  selectedFilterId?: string;
  onSelectFilter: (filterId: string) => void;
  onClose: () => void;
  clipUri: string;        // source video, panel generates its own preview frame
  frameTimeMs?: number;   // optional, defaults to 0
}
export default function FilterToolPanel({
  visible,
  filters,
  selectedFilterId,
  onSelectFilter,
  onClose,
  clipUri,
  frameTimeMs = 0,
}: FilterToolPanelProps) {
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

  const [frameUri, setFrameUri] = useState<string | null>(null);
  const [frameError, setFrameError] = useState(false);
  useEffect(() => {
    if (!visible || !clipUri) return;
    let cancelled = false;
    setFrameError(false);
    const generateFrame = async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(clipUri, {
          time: frameTimeMs,
        });
        if (!cancelled) setFrameUri(uri);
      } catch (e) {
        console.log('Filter preview thumbnail failed', e);
        if (!cancelled) setFrameError(true);
      }
    };
    generateFrame();
    return () => {
      cancelled = true;
    };
  }, [visible, clipUri, frameTimeMs]);
  if (!visible) return null;
  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="checkmark" size={scale(22)} color={COLORS.yellow} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filters.map((filter) => {
            const isSelected = selectedFilterId
              ? selectedFilterId === filter.id
              : filter.id === 'none';
            return (
              <TouchableOpacity
                key={filter.id}
                style={styles.filterItem}
                onPress={() => onSelectFilter(filter.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.thumbnailBox,
                    isSelected && styles.thumbnailBoxActive,
                  ]}
                >
                  {frameUri && !frameError ? (
                    <Image
                      source={{ uri: frameUri }}
                      style={styles.thumbnailImage}
                    />
                  ) : (
                    <View style={styles.thumbnailFallback} />
                  )}
                  {/* Tint overlay representing the filter look */}
                  {filter.tintOpacity > 0 && (
                    <View
                      style={[
                        styles.tintOverlay,
                        {
                          backgroundColor: filter.tintColor,
                          opacity: filter.tintOpacity,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.filterName,
                    isSelected && styles.filterNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {filter.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
function __makeStyles() {
  return StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    paddingBottom: verticalScale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  body: {
    paddingTop: verticalScale(14),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  filterItem: {
    alignItems: 'center',
    width: scale(64),
  },
  thumbnailBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(10),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: COLORS.surface,
  },
  thumbnailBoxActive: {
    borderColor: COLORS.yellow,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
  },
  tintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterName: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(10),
    marginTop: verticalScale(6),
    textAlign: 'center',
  },
  filterNameActive: {
    color: COLORS.yellow,
    fontWeight: '600',
  },
});
}
let styles = __makeStyles();
