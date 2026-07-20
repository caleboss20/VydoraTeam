
import { useMemo } from "react";
import { useTheme, ThemeColors } from "../Contexts/ThemeContext";

import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
interface ExportConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
export function ExportConfirmModal({ visible, onCancel, onConfirm }: ExportConfirmModalProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Export this video?</Text>
          <Text style={styles.subtitle}>
            This will render your edits into a final video file.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>Yes, Export</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}



function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%",
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 24,
    // borderWidth: 1,
    borderColor: c.accent,
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: c.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
  },
  cancelText: {
    color: "#CCCCCC",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: c.accent,
    alignItems: "center",
  },
  confirmText: {
    color: c.background,
    fontWeight: "700",
  },
});
}
