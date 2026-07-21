import {
  Image,
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Dimensions,
  Animated,
  ViewToken,
  ActivityIndicator,
} from 'react-native'
import React, { useRef, useState, useMemo } from "react"
import { useTheme, ThemeColors } from "../Contexts/ThemeContext";
import { s, vs, ms } from "react-native-size-matters";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../Contexts/Authcontext';
import { useWowPath } from '../Contexts/useWowPath';

type RootStackParamList = {
  home: undefined;
  signin: undefined;
  signup: { resumeWow?: boolean } | undefined;
  projects: undefined;
  editorscreen: { wow?: boolean; initialTool?: string } | undefined;
};
interface Slide {
  id: string;
  title: string;
  description: string;
  image: any;
}
const { width } = Dimensions.get('window');
const slides: Slide[] = [
  {
    id: '1',
    title: 'Make a Reel in 60 Seconds',
    description:
      'Open a demo, add captions, and feel the edit — no setup, no learning curve.',
    image: require("../../../assets/editimage.png"),
  },
  {
    id: '2',
    title: 'Auto Looks & Captions',
    description:
      'One-tap Auto Movie, filters, and karaoke-style captions that already look shareable.',
    image: require("../../../assets/editimage2.png"),
  },
  {
    id: '3',
    title: 'Export & Share Fast',
    description:
      'Ship to Reels, TikTok, or YouTube in seconds. Invite your team to edit live when you’re ready.',
    image: require("../../../assets/editimage3.png"),
  },
];
function Onboarding() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { startWowPath, starting } = useWowPath();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );
  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const goDashboard = async (): Promise<void> => {
    await AsyncStorage.setItem('vydora:onboarding:done', 'true');
    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'projects' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'signin' }],
      });
    }
  };

  const handleNext = async (): Promise<void> => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      return;
    }
    // Final slide — wow path when signed in; signup with resumeWow when not.
    await AsyncStorage.setItem('vydora:onboarding:done', 'true');
    if (user) {
      await startWowPath();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'signup', params: { resumeWow: true } }],
    });
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <Image style={styles.editimage} source={item.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
  const isLast = currentIndex === slides.length - 1;
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onViewableItemsChanged={handleViewableItemsChanged}
        showsHorizontalScrollIndicator={false}
      />
      <View style={styles.dotsWrap}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>
      <Pressable
        style={[styles.cta, starting && styles.ctaDisabled]}
        onPress={handleNext}
        disabled={starting}
      >
        {starting ? (
          <ActivityIndicator color={colors.accentOn} />
        ) : (
          <Text style={styles.ctaText}>
            {isLast ? 'Try a 60-second edit' : 'Continue'}
          </Text>
        )}
      </Pressable>
      {isLast && user ? (
        <Pressable onPress={() => void goDashboard()} disabled={starting}>
          <Text style={styles.skip}>Skip to dashboard</Text>
        </Pressable>
      ) : (
        <View style={styles.skipSpacer} />
      )}
    </SafeAreaView>
  );
};
export default Onboarding;


function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
  },
  // Slide
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  // Image
  editimage: {
    marginTop: s(20),
    width: s(300),
    height: s(400),
  },
  // Title
  title: {
    fontSize: ms(24),
    fontWeight: '800',
    color: c.text,
    textAlign: 'center',
    marginTop: vs(24),
    marginBottom: vs(12),
    lineHeight: ms(32),
  },
  // Description
  description: {
    fontSize: ms(14),
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: ms(22),
    maxWidth: s(300),
  },
  // Dots
  dotsWrap: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: vs(32),
    marginBottom: vs(20),
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: c.border,
  },
  dotActive: {
    backgroundColor: c.accent,
    width: s(24),
  },
  // CTA
  cta: {
    backgroundColor: c.accent,
    borderRadius: s(50),
    paddingVertical: vs(11),
    paddingHorizontal: s(48),
    minWidth: s(220),
    alignItems: 'center',
    marginBottom: vs(10),
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: c.accentOn,
  },
  skip: {
    fontSize: ms(13),
    fontWeight: '600',
    color: c.textMuted,
    marginBottom: vs(24),
  },
  skipSpacer: {
    height: vs(24) + ms(13),
    marginBottom: vs(24),
  },
});
}
