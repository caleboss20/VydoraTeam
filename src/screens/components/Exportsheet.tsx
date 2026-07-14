import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
interface ExportProgressSheetProps {
  visible: boolean;
  progress: number;
  quote: string;
  isDone: boolean;
  onClose: () => void;
}
export function ExportProgressSheet({
  visible,
  progress,
  quote,
  isDone,
  onClose,
}: ExportProgressSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isDone ? "Export complete" : "Exporting..."}</Text>
          <View style={styles.waveContainer}>
            <View style={[styles.waveFillPlaceholder, { height: `${progress}%` }]} />
          </View>
          <Text style={styles.percent}>{Math.round(progress)}%</Text>
          <Text style={styles.quote}>{quote}</Text>
          {isDone && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneAction}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  waveContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0D0D0D",
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  waveFillPlaceholder: {
    backgroundColor: "#B8860B",
    width: "100%",
  },
  percent: {
    color: "#B8860B",
    fontSize: 24,
    fontWeight: "700",
  },
  quote: {
    color: "#AAAAAA",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  doneAction: {
    color: "#B8860B",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
});