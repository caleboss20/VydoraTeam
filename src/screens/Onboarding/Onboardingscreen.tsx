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
} from 'react-native'
import React, { useRef, useState } from 'react'
import { s, vs, ms } from "react-native-size-matters";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
type RootStackParamList = {
  home: undefined;
  signin: undefined;
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
    title: 'Edit Your Videos Together, In Real Time',
    description: 'Work with your team on the same timeline simultaneously. See every change as it happens.',
    image: require("../../../assets/editimage.png"),
  },
  {
    id: '2',
    title: 'Share & Comment Instantly',
    description: 'Pin feedback directly on timeline segments. Tag teammates and resolve notes fast.',
    image: require("../../../assets/editimage2.png"),
  },
  {
    id: '3',
    title: 'Export In Seconds',
    description: 'Finish editing and ship your video instantly. Share directly to any platform.',
    image: require("../../../assets/editimage3.png"),
  },
];
function Onboarding() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
  const handleNext = async (): Promise<void> => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // mark onboarding as done so splash never shows it again
      await AsyncStorage.setItem('vydora:onboarding:done', 'true');
      navigation.navigate('signin');
    }
  };
  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <Image style={styles.editimage} source={item.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
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
      <Pressable style={styles.cta} onPress={handleNext}>
        <Text style={styles.ctaText}>
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};
export default Onboarding;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: vs(24),
    marginBottom: vs(12),
    lineHeight: ms(32),
  },
  // Description
  description: {
    fontSize: ms(14),
    color: 'rgba(255,255,255,0.65)',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#F5A623',
    width: s(24),
  },
  // CTA
  cta: {
    backgroundColor: '#F5C518',
    borderRadius: s(50),
    paddingVertical: vs(11),
    paddingHorizontal: s(110),
    alignItems: 'center',
    marginBottom: vs(32),
  },
  ctaText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#13151c',
  },
});


