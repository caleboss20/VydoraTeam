import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { s } from "react-native-size-matters";
import { useAppPalette } from "../Contexts/ThemeContext";

type Tool = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action?: "duplicate" | "delete";
};

const tools: Tool[] = [
  { icon: "cut-outline", label: "Split" },
  { icon: "flame-outline", label: "Filter" },
  { icon: "color-wand-outline", label: "Effects" },
  { icon: "film-outline", label: "Movie" },
  { icon: "layers-outline", label: "Templates" },
  { icon: "color-palette-outline", label: "Color" },
  { icon: "text-outline", label: "Text" },
  { icon: "document-text-outline", label: "Sheet" },
  { icon: "git-branch-outline", label: "Assemble" },
  { icon: "sparkles-outline", label: "Captions" },
  { icon: "flash-outline", label: "Rough cut" },
  { icon: "git-compare-outline", label: "Multi-cam" },
  { icon: "images-outline", label: "Overlay" },
  { icon: "easel-outline", label: "Canvas" },
  { icon: "volume-high-outline", label: "Audio" },
  { icon: "musical-notes-outline", label: "Music" },
  { icon: "albums-outline", label: "Stock" },
  { icon: "locate-outline", label: "Track" },
  { icon: "mic-outline", label: "Voiceover" },
  { icon: "pulse-outline", label: "Beats" },
  { icon: "phone-portrait-outline", label: "Shorts" },
  { icon: "brush-outline", label: "Brand kit" },
  { icon: "crop-outline", label: "Crop" },
  { icon: "phone-landscape-outline", label: "Stabilize" },
  { icon: "speedometer-outline", label: "Speed" },
  { icon: "copy-outline", label: "Duplicate", action: "duplicate" },
  { icon: "trash-outline", label: "Delete", action: "delete" },
];

interface BottomToolbarProps {
  onSplit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToolPress?: (toolLabel: string) => void;
}

export default function BottomToolbar({
  onSplit,
  onDuplicate,
  onDelete,
  onToolPress,
}: BottomToolbarProps) {
  const insets = useSafeAreaInsets();
  const p = useAppPalette();
  const bottomPad = Math.max(4, Math.min(insets.bottom, 10));

  const handlePress = (tool: Tool) => {
    if (tool.action === "duplicate") {
      onDuplicate?.();
      return;
    }
    if (tool.action === "delete") {
      onDelete?.();
      return;
    }
    if (tool.label === "Split") {
      onSplit?.();
      return;
    }
    onToolPress?.(tool.label);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: bottomPad,
          backgroundColor: p.background,
          borderTopColor: p.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        indicatorStyle="white"
        bounces
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.label}
            style={styles.tool}
            activeOpacity={0.7}
            onPress={() => handlePress(tool)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <View style={[styles.iconWrap, { backgroundColor: p.iconBg }]}>
              <Ionicons name={tool.icon} size={s(20)} color={p.textPrimary} />
            </View>
            <Text
              style={[styles.label, { color: p.textSecondary }]}
              numberOfLines={1}
            >
              {tool.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: s(6),
    zIndex: 20,
  },
  scrollContent: {
    paddingHorizontal: s(8),
    alignItems: "flex-start",
    gap: s(2),
  },
  tool: {
    width: s(58),
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: s(2),
  },
  iconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(2),
  },
  label: {
    fontSize: s(9),
    fontWeight: "600",
    textAlign: "center",
  },
});
