import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { s } from "react-native-size-matters";
import { useAppPalette } from "../Contexts/ThemeContext";

export type EditorToolKind = "panel" | "action";
export type EditorToolCategory = "Edit" | "Look" | "Audio" | "Share" | "Action";

export type EditorTool = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  kind: EditorToolKind;
  category: EditorToolCategory;
  /** Extra search keywords (outro, noise, …). */
  aliases?: string[];
  action?: "duplicate" | "delete" | "split";
  /** Small yellow chip under the label (e.g. Auto on Assemble). */
  badge?: string;
};

/** Beginner pin order — everything else lives in Search / More. */
export const BEGINNER_TOOLBAR_LABELS = [
  "Captions",
  "Assemble",
  "Filter",
  "Text",
  "Split",
] as const;

/** Shared catalog — toolbar + ToolSearchModal. */
export const EDITOR_TOOLS: EditorTool[] = [
  {
    icon: "cut-outline",
    label: "Split",
    kind: "action",
    category: "Action",
    action: "split",
    aliases: ["cut", "blade"],
  },
  {
    icon: "flame-outline",
    label: "Filter",
    kind: "panel",
    category: "Look",
    aliases: ["lut", "look", "preset"],
  },
  {
    icon: "color-wand-outline",
    label: "Effects",
    kind: "panel",
    category: "Look",
    aliases: ["motion", "zoom", "blur", "vignette"],
  },
  {
    icon: "sparkles-outline",
    label: "Animate",
    kind: "panel",
    category: "Look",
    aliases: ["text animation", "in", "out", "loop"],
  },
  {
    icon: "film-outline",
    label: "Movie",
    kind: "panel",
    category: "Look",
    aliases: ["cinematic", "flashback"],
  },
  {
    icon: "layers-outline",
    label: "Templates",
    kind: "panel",
    category: "Look",
    aliases: ["starter", "recipe"],
  },
  {
    icon: "color-palette-outline",
    label: "Color",
    kind: "panel",
    category: "Look",
    aliases: ["grade", "brightness", "contrast", "saturation"],
  },
  {
    icon: "git-commit-outline",
    label: "Curves",
    kind: "panel",
    category: "Look",
    aliases: ["rgb", "cube", "lut"],
  },
  {
    icon: "text-outline",
    label: "Text",
    kind: "panel",
    category: "Edit",
    aliases: ["title", "type"],
  },
  {
    icon: "create-outline",
    label: "Edit caption",
    kind: "panel",
    category: "Edit",
    aliases: ["subtitle", "cc", "srt"],
  },
  {
    icon: "diamond-outline",
    label: "Keyframes",
    kind: "panel",
    category: "Edit",
    aliases: ["diamond", "volume key", "opacity key"],
  },
  {
    icon: "git-merge-outline",
    label: "Compound",
    kind: "panel",
    category: "Edit",
    aliases: ["group", "nested"],
  },
  {
    icon: "color-filter-outline",
    label: "Adjust",
    kind: "panel",
    category: "Look",
    aliases: ["adjustment layer"],
  },
  {
    icon: "document-text-outline",
    label: "Sheet",
    kind: "panel",
    category: "Edit",
    aliases: ["title card", "intro", "outro", "blank"],
  },
  {
    icon: "image-outline",
    label: "Flyer",
    kind: "panel",
    category: "Edit",
    aliases: ["poster", "end card", "slate", "notice", "flyer", "image sheet"],
  },
  {
    icon: "people-outline",
    label: "Conference",
    kind: "panel",
    category: "Edit",
    aliases: [
      "summit",
      "intro",
      "guest",
      "speaker",
      "profile",
      "slate",
      "one room",
      "event",
    ],
  },
  {
    icon: "git-branch-outline",
    label: "Assemble",
    kind: "panel",
    category: "Edit",
    aliases: ["reorder", "arrange", "auto movie", "quik", "one tap", "mix", "join", "add videos", "combine"],
    badge: "Mix",
  },
  {
    icon: "chatbubble-ellipses-outline",
    label: "Captions",
    kind: "panel",
    category: "Edit",
    aliases: ["auto caption", "whisper", "transcribe"],
  },
  {
    icon: "flash-outline",
    label: "Rough cut",
    kind: "panel",
    category: "Edit",
    aliases: ["silence", "jump cut"],
  },
  {
    icon: "git-compare-outline",
    label: "Multi-cam",
    kind: "panel",
    category: "Edit",
    aliases: ["multicam", "angle"],
  },
  {
    icon: "images-outline",
    label: "Overlay",
    kind: "panel",
    category: "Edit",
    aliases: ["pip", "picture in picture"],
  },
  {
    icon: "happy-outline",
    label: "Stickers",
    kind: "panel",
    category: "Edit",
    aliases: ["emoji"],
  },
  {
    icon: "easel-outline",
    label: "Canvas",
    kind: "panel",
    category: "Look",
    aliases: ["layout", "background", "overlay", "gradient", "dark"],
  },
  {
    icon: "volume-high-outline",
    label: "Audio",
    kind: "panel",
    category: "Audio",
    aliases: ["noise", "eq", "volume", "gain"],
  },
  {
    icon: "options-outline",
    label: "Mixer",
    kind: "panel",
    category: "Audio",
    aliases: ["fader", "duck", "levels", "denoise", "eq", "enhance"],
  },
  {
    icon: "musical-notes-outline",
    label: "Music",
    kind: "panel",
    category: "Audio",
    aliases: ["soundtrack", "bed", "sfx"],
  },
  {
    icon: "library-outline",
    label: "Stock",
    kind: "panel",
    category: "Edit",
    aliases: ["b-roll", "stock footage"],
  },
  {
    icon: "locate-outline",
    label: "Track",
    kind: "panel",
    category: "Edit",
    aliases: ["motion track", "follow"],
  },
  {
    icon: "mic-outline",
    label: "Voiceover",
    kind: "panel",
    category: "Audio",
    aliases: ["narration", "vo", "mic"],
  },
  {
    icon: "pulse-outline",
    label: "Beats",
    kind: "panel",
    category: "Audio",
    aliases: ["beat cut", "marker", "rhythm"],
  },
  {
    icon: "phone-portrait-outline",
    label: "Shorts",
    kind: "panel",
    category: "Edit",
    aliases: ["reel", "tiktok highlight"],
  },
  {
    icon: "brush-outline",
    label: "Brand kit",
    kind: "panel",
    category: "Look",
    aliases: ["brand", "logo colors"],
  },
  {
    icon: "share-social-outline",
    label: "Publish",
    kind: "panel",
    category: "Share",
    aliases: ["export", "tiktok", "reels", "share"],
  },
  {
    icon: "crop-outline",
    label: "Crop",
    kind: "panel",
    category: "Look",
    aliases: ["ratio", "aspect"],
  },
  {
    icon: "phone-landscape-outline",
    label: "Stabilize",
    kind: "panel",
    category: "Look",
    aliases: ["deshake", "reframe"],
  },
  {
    icon: "speedometer-outline",
    label: "Speed",
    kind: "panel",
    category: "Edit",
    aliases: ["slow motion", "fast", "curve"],
  },
  {
    icon: "copy-outline",
    label: "Duplicate",
    kind: "action",
    category: "Action",
    action: "duplicate",
    aliases: ["copy", "clone"],
  },
  {
    icon: "trash-outline",
    label: "Delete",
    kind: "action",
    category: "Action",
    action: "delete",
    aliases: ["remove", "bin"],
  },
];

const CATEGORIES: Array<EditorToolCategory | "All"> = [
  "All",
  "Edit",
  "Look",
  "Audio",
  "Share",
  "Action",
];

export function filterEditorTools(
  query: string,
  category: EditorToolCategory | "All" = "All"
): EditorTool[] {
  const q = query.trim().toLowerCase();
  return EDITOR_TOOLS.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (!q) return true;
    if (t.label.toLowerCase().includes(q)) return true;
    return (t.aliases ?? []).some((a) => a.toLowerCase().includes(q));
  });
}

interface ToolSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (tool: EditorTool) => void;
}

export function ToolSearchModal({
  visible,
  onClose,
  onPick,
}: ToolSearchModalProps) {
  const p = useAppPalette();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EditorToolCategory | "All">("All");

  const results = useMemo(
    () => filterEditorTools(query, category),
    [query, category]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={modalStyles.sheetWrap}
        >
          <Pressable
            style={[
              modalStyles.sheet,
              {
                backgroundColor: p.surface,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
            onPress={() => {}}
          >
            <View style={modalStyles.handle} />
            <Text style={[modalStyles.title, { color: p.textPrimary }]}>
              More tools
            </Text>
            <View
              style={[
                modalStyles.searchRow,
                { backgroundColor: p.background, borderColor: p.border },
              ]}
            >
              <Ionicons name="search" size={s(18)} color={p.textSecondary} />
              <TextInput
                style={[modalStyles.input, { color: p.textPrimary }]}
                placeholder="Filter, flyer, captions, beats…"
                placeholderTextColor={p.textSecondary}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={s(18)}
                    color={p.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={modalStyles.chips}
            >
              {CATEGORIES.map((c) => {
                const on = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      modalStyles.chip,
                      {
                        borderColor: on ? p.yellow : p.border,
                        backgroundColor: on
                          ? "rgba(245,197,24,0.15)"
                          : "transparent",
                      },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text
                      style={{
                        color: on ? p.yellow : p.textSecondary,
                        fontWeight: "700",
                        fontSize: s(11),
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView
              style={{ maxHeight: s(340) }}
              keyboardShouldPersistTaps="handled"
            >
              {results.length === 0 ? (
                <Text style={[modalStyles.empty, { color: p.textSecondary }]}>
                  No tools match “{query}”.
                </Text>
              ) : (
                results.map((t) => (
                  <TouchableOpacity
                    key={t.label}
                    style={[modalStyles.row, { borderBottomColor: p.border }]}
                    onPress={() => {
                      onPick(t);
                      setQuery("");
                      onClose();
                    }}
                  >
                    <View
                      style={[modalStyles.iconWrap, { backgroundColor: p.iconBg }]}
                    >
                      <Ionicons
                        name={t.icon}
                        size={s(18)}
                        color={p.textPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[modalStyles.rowLabel, { color: p.textPrimary }]}
                      >
                        {t.label}
                      </Text>
                      <Text
                        style={{ color: p.textSecondary, fontSize: s(10) }}
                      >
                        {t.category}
                        {t.aliases?.[0] ? ` · ${t.aliases[0]}` : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={s(16)}
                      color={p.textSecondary}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

interface BottomToolbarProps {
  onSplit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToolPress?: (toolLabel: string) => void;
  onOpenSearch?: () => void;
  /** Viewer: tools visible but gated. */
  readOnly?: boolean;
  onReadOnlyPress?: () => void;
}

export default function BottomToolbar({
  onSplit,
  onDuplicate,
  onDelete,
  onToolPress,
  onOpenSearch,
  readOnly = false,
  onReadOnlyPress,
}: BottomToolbarProps) {
  const insets = useSafeAreaInsets();
  const p = useAppPalette();
  const bottomPad = Math.max(4, Math.min(insets.bottom, 10));

  const pinnedTools = useMemo(() => {
    return BEGINNER_TOOLBAR_LABELS.map((label) =>
      EDITOR_TOOLS.find((t) => t.label === label)
    ).filter(Boolean) as EditorTool[];
  }, []);

  const handlePress = (tool: EditorTool) => {
    if (readOnly) {
      onReadOnlyPress?.();
      return;
    }
    if (tool.action === "duplicate") {
      onDuplicate?.();
      return;
    }
    if (tool.action === "delete") {
      onDelete?.();
      return;
    }
    if (tool.action === "split" || tool.label === "Split") {
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
          opacity: readOnly ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces
          decelerationRate="fast"
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1 }}
        >
          {pinnedTools.map((tool) => {
            const highlight =
              tool.label === "Captions" || tool.label === "Assemble";
            return (
              <TouchableOpacity
                key={tool.label}
                style={styles.tool}
                activeOpacity={0.7}
                onPress={() => handlePress(tool)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: highlight
                        ? "rgba(245,197,24,0.15)"
                        : p.iconBg,
                      borderColor: highlight ? p.yellow : "transparent",
                      borderWidth: highlight ? 1 : 0,
                    },
                  ]}
                >
                  <Ionicons
                    name={tool.icon}
                    size={s(20)}
                    color={highlight ? p.yellow : p.textPrimary}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    { color: highlight ? p.yellow : p.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {tool.label}
                </Text>
                {tool.badge ? (
                  <View
                    style={[styles.badge, { backgroundColor: p.yellow }]}
                  >
                    <Text style={styles.badgeText}>{tool.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.tool}
            activeOpacity={0.7}
            onPress={() =>
              readOnly ? onReadOnlyPress?.() : onOpenSearch?.()
            }
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: "rgba(245,197,24,0.15)",
                  borderColor: p.yellow,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="apps-outline" size={s(20)} color={p.yellow} />
            </View>
            <Text
              style={[styles.label, { color: p.yellow }]}
              numberOfLines={1}
            >
              More
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: s(6),
    zIndex: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scrollContent: {
    paddingHorizontal: s(4),
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
  badge: {
    marginTop: s(2),
    paddingHorizontal: s(5),
    paddingVertical: s(1),
    borderRadius: s(6),
  },
  badgeText: {
    fontSize: s(8),
    fontWeight: "800",
    color: "#0B0D13",
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheetWrap: { width: "100%" },
  sheet: {
    borderTopLeftRadius: s(18),
    borderTopRightRadius: s(18),
    paddingHorizontal: s(16),
    paddingTop: s(8),
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: s(40),
    height: s(4),
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginBottom: s(10),
  },
  title: {
    fontSize: s(16),
    fontWeight: "800",
    marginBottom: s(10),
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    borderWidth: 1,
    borderRadius: s(12),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    marginBottom: s(10),
  },
  input: {
    flex: 1,
    fontSize: s(14),
    padding: 0,
  },
  chips: {
    gap: s(8),
    paddingBottom: s(8),
  },
  chip: {
    paddingHorizontal: s(12),
    paddingVertical: s(6),
    borderRadius: s(16),
    borderWidth: 1,
  },
  empty: {
    textAlign: "center",
    paddingVertical: s(24),
    fontSize: s(13),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    paddingVertical: s(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: s(14),
    fontWeight: "700",
  },
});
