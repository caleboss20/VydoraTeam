import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";
import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import { createAudioPlayer } from "expo-audio";
import { BackgroundMusic } from "../types";
const COLORS = {
  background: "#151821",
  yellow: "#F5C518",
  textPrimary: "#FFFFFF",
  textSecondary: "#8F9BB3",
  border: "#2A2A2E",
};
interface MusicToolPanelProps {
  visible: boolean;
  backgroundMusic?: BackgroundMusic;
  onPick: (uri: string, durationMs: number) => void;
  onVolumeChange: (volume: number) => void;
  onRemove: () => void;
  onClose: () => void;
}
export default function MusicToolPanel({
  visible,
  backgroundMusic,
  onPick,
  onVolumeChange,
  onRemove,
  onClose,
}: MusicToolPanelProps) {
  const handlePickMusic = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const tempPlayer = createAudioPlayer(uri);
    setTimeout(() => {
      const durationMs = (tempPlayer.duration ?? 0) * 1000;
      onPick(uri, durationMs);
      tempPlayer.remove();
    }, 300);
  };
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Music</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={scale(22)} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          {!backgroundMusic ? (
            <TouchableOpacity style={styles.pickBtn} onPress={handlePickMusic}>
              <Ionicons name="add-circle-outline" size={scale(20)} color={COLORS.yellow} />
              <Text style={styles.pickBtnText}>Add music from device</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.musicInfo}>
              <View style={styles.musicRow}>
                <Ionicons name="musical-notes" size={scale(18)} color={COLORS.yellow} />
                <Text style={styles.musicLabel} numberOfLines={1}>
                  Background track added
                </Text>
                <TouchableOpacity onPress={onRemove}>
                  <Ionicons name="trash-outline" size={scale(18)} color="#E85D5D" />
                </TouchableOpacity>
              </View>
              <Text style={styles.sliderLabel}>
                Volume: {Math.round((backgroundMusic.volume ?? 1) * 100)}%
              </Text>
              <Slider
                minimumValue={0}
                maximumValue={1}
                value={backgroundMusic.volume ?? 1}
                onValueChange={onVolumeChange}
                minimumTrackTintColor={COLORS.yellow}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.yellow}
              />
              <TouchableOpacity style={styles.pickBtn} onPress={handlePickMusic}>
                <Ionicons name="swap-horizontal-outline" size={scale(18)} color={COLORS.yellow} />
                <Text style={styles.pickBtnText}>Replace track</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: scale(20),
    minHeight: verticalScale(220),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    backgroundColor: "rgba(245,197,24,0.1)",
    borderRadius: scale(12),
    marginTop: verticalScale(8),
  },
  pickBtnText: {
    color: COLORS.yellow,
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  musicInfo: {
    gap: verticalScale(4),
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(8),
  },
  musicLabel: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(13),
    flex: 1,
  },
  sliderLabel: {
    color: COLORS.textSecondary,
    fontSize: moderateScale(11),
    marginBottom: verticalScale(4),
  },
});