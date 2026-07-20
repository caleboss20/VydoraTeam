import React, { useEffect, useMemo, useRef } from "react";
import { useTheme, ThemeColors } from "../Contexts/ThemeContext";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const BAR_WIDTH = 260;
const BAR_HEIGHT = 28;

function buildWaveEdge(amplitude: number, wavelength: number) {
  let d = `M0,0`;
  const steps = 600;
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * BAR_HEIGHT;
    const x = Math.sin((y / wavelength) * 2 * Math.PI) * amplitude;
    d += ` L${x},${y}`;
  }
  d += ` L${amplitude + 4},${BAR_HEIGHT} L${amplitude + 4},0 Z`;
  return d;
}

function WaveProgressBar({ progress, isDone }: { progress: number; isDone: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fillWidthAnim = useRef(new Animated.Value(0)).current;
  const waveBob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillWidthAnim, {
      toValue: (progress / 100) * BAR_WIDTH,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveBob, { toValue: 4, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(waveBob, { toValue: -4, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const waveEdgeD = buildWaveEdge(5, BAR_HEIGHT / 1.4);

  return (
    <View style={styles.track}>
      <Animated.View style={{ width: fillWidthAnim, height: BAR_HEIGHT, overflow: "hidden" }}>
        <View style={{ width: BAR_WIDTH, height: BAR_HEIGHT, backgroundColor: colors.accent }} />
        {!isDone && (
          <Svg width={20} height={BAR_HEIGHT} style={{ position: "absolute", right: -10, top: 0 }}>
            <AnimatedPath d={waveEdgeD} fill={colors.accent} transform={[{ translateY: waveBob }]} />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}

interface ExportProgressSheetProps {
  visible: boolean;
  progress: number;
  quote: string;
  isDone: boolean;
  onClose: () => void;
}

export function ExportProgressSheet({ visible, progress, quote, isDone, onClose }: ExportProgressSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isDone ? "Export complete" : "Exporting..."}</Text>
          <WaveProgressBar progress={progress} isDone={isDone} />
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, alignItems: "center" },
    title: { color: c.text, fontSize: 18, fontWeight: "600", marginBottom: 16 },
    track: { width: BAR_WIDTH, height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: c.border, overflow: "hidden", marginBottom: 12 },
    percent: { color: c.accent, fontSize: 24, fontWeight: "700" },
    quote: { color: c.textSecondary, fontSize: 13, textAlign: "center", marginTop: 12 },
    doneAction: { color: c.accent, fontSize: 16, fontWeight: "600", marginTop: 20 },
  });
}
