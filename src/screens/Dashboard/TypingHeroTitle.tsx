/**
 * ChatGPT-style typewriter headline for the dashboard.
 * Types a phrase, holds, wipes RTL (deletes from the end), then cycles.
 * Yellow → white gradient shimmer over the typed text.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { ms, vs, s } from "react-native-size-matters";

const PHRASES = [
  "Let's get started",
  "Let's collaborate",
  "Let's build something",
  "Create your next reel",
  "Caption it in seconds",
  "Export and share",
];

type Props = {
  isDark?: boolean;
};

export default function TypingHeroTitle({ isDark = true }: Props) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "wiping">("typing");
  const shimmer = useRef(new Animated.Value(0)).current;
  const full = PHRASES[phraseIndex];

  // Gradient shimmer loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // Type / wipe cycle
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (phase === "typing") {
      if (displayed.length < full.length) {
        timer = setTimeout(() => {
          setDisplayed(full.slice(0, displayed.length + 1));
        }, 42 + (displayed.endsWith(" ") ? 30 : 0));
      } else {
        timer = setTimeout(() => setPhase("hold"), 1400);
      }
    } else if (phase === "hold") {
      timer = setTimeout(() => setPhase("wiping"), 400);
    } else if (phase === "wiping") {
      if (displayed.length > 0) {
        timer = setTimeout(() => {
          setDisplayed((prev) => prev.slice(0, -1));
        }, 22);
      } else {
        timer = setTimeout(() => {
          setPhraseIndex((i) => (i + 1) % PHRASES.length);
          setPhase("typing");
        }, 280);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, displayed, full]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 80],
  });

  const maskElement = useMemo(
    () => (
      <View style={styles.maskWrap}>
        <Text style={styles.title}>{displayed || " "}</Text>
        <Text style={styles.cursor}>{phase !== "hold" ? "|" : " "}</Text>
      </View>
    ),
    [displayed, phase]
  );

  return (
    <View style={styles.row}>
      <MaskedView style={styles.masked} maskElement={maskElement}>
        <View style={styles.gradientHost}>
          <Animated.View
            style={[
              styles.shimmerSlide,
              { transform: [{ translateX }] },
            ]}
          >
            <LinearGradient
              colors={
                isDark
                  ? ["#FFFFFF", "#F5C518", "#FFFFFF", "#F5C518", "#FFFFFF"]
                  : ["#111111", "#E5B800", "#111111", "#E5B800", "#111111"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientFill}
            />
          </Animated.View>
        </View>
      </MaskedView>
      <View style={styles.chevron}>
        <Text style={styles.chevronGlyph}>›</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: vs(14),
    marginTop: vs(2),
    minHeight: vs(36),
  },
  masked: {
    flexShrink: 1,
    height: vs(34),
  },
  maskWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  title: {
    fontSize: ms(26),
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#fff",
  },
  cursor: {
    fontSize: ms(24),
    fontWeight: "300",
    color: "#fff",
    marginLeft: 1,
    opacity: 0.85,
  },
  gradientHost: {
    height: vs(34),
    width: s(280),
    overflow: "hidden",
    justifyContent: "center",
  },
  shimmerSlide: {
    width: "200%",
    height: "100%",
  },
  gradientFill: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  chevron: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: "rgba(128,128,128,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronGlyph: {
    color: "#9A9AA0",
    fontSize: ms(16),
    fontWeight: "700",
    marginTop: -2,
  },
});
