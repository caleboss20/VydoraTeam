import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { s, ms, vs } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ⬇️ Drop in as many hero images as you want — they'll rotate automatically.
// Local:  require('../../assets/images/pro-bg-1.jpg')
// Remote: { uri: 'https://your-cdn.com/pro-bg-1.jpg' }
const HERO_IMAGES = [
  require('../../../assets/lady4.jpg'),
  require('../../../assets/lady1.jpg'),
    require('../../../assets/lady5.jpg'),
      require('../../../assets/lady6.jpg'),
        require('../../../assets/lady2.jpg'),
  require('../../../assets/lady7.jpg'),
    require('../../../assets/lady3.jpg'),
];

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

type PlanId = 'yearlyTrial' | 'yearlyDiscount' | 'monthly';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PREVIEW_DURATION_SEC = 15; // swap for real video duration once wired to an actual player
const TICK_MS = 100;

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const IMAGE_ROTATE_MS = 5000; // change image every 5s
const FADE_MS = 500;

export default function ProScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearlyDiscount');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [imageIndex, setImageIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Rotate hero image every 30s with a smooth crossfade
  useEffect(() => {
    const rotateInterval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, IMAGE_ROTATE_MS);

    return () => clearInterval(rotateInterval);
  }, [fadeAnim]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + TICK_MS / 1000 / PREVIEW_DURATION_SEC;
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }, TICK_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (progress >= 1) {
      // restart from the beginning once it's reached the end
      setProgress(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const currentSeconds = progress * PREVIEW_DURATION_SEC;

  return (
    <View style={styles.container}>
      <AnimatedImageBackground
        source={HERO_IMAGES[imageIndex]}
        style={[styles.hero, { opacity: fadeAnim }]}
        resizeMode="cover"
      >
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + vs(10) }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="close" size={ms(20)} color="#fff" />
        </TouchableOpacity>

        {/* Play button — signals this is a video, not a photo */}
        <View style={styles.playBtnWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.playBtnPlaying]}
            onPress={togglePlay}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={ms(26)}
              color="#fff"
              style={!isPlaying && { marginLeft: s(3) }}
            />
          </TouchableOpacity>
        </View>

        {/* Before/Original preview bubble */}
        <View style={styles.previewBubble}>
          <ImageBackground
            source={HERO_IMAGES[imageIndex]}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>0:15</Text>
          </View>
          <Text style={styles.previewLabel}>Original</Text>
        </View>

        {/* Bottom gradient overlay + copy */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', '#000']}
          style={styles.heroOverlay}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brand}>Vydora</Text>
            <Text style={styles.brandPro}>Pro</Text>
          </View>
          <Text style={styles.headline}>One tap for cinematic edits!</Text>

          <View style={styles.scrubberRow}>
            <View style={styles.scrubberTrack}>
              <View
                style={[styles.scrubberFill, { width: `${progress * 100}%` }]}
              />
              <View
                style={[
                  styles.scrubberThumb,
                  { left: `${progress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.scrubberTime}>
              {formatTime(currentSeconds)} / {formatTime(PREVIEW_DURATION_SEC)}
            </Text>
          </View>
        </LinearGradient>
      </AnimatedImageBackground>

      {/* Bottom sheet */}
      <View
        style={[styles.sheet, { paddingBottom: vs(16) + insets.bottom }]}
      >
        <View style={styles.plansRow}>
          {/* Yearly - Free Trial */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearlyTrial' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearlyTrial')}
          >
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planMain}>Free Trial</Text>
            <Text style={styles.planSub}>Pay after trial</Text>
          </TouchableOpacity>

          {/* Yearly - Discount */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardWithBadge,
              selectedPlan === 'yearlyDiscount' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearlyDiscount')}
          >
            <LinearGradient
              colors={['#F2C200', '#FF8A00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>50% OFF</Text>
            </LinearGradient>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planMain}>$38.98</Text>
            <Text style={styles.planSub}>$0.74 / Week</Text>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planMain}>$8.49</Text>
            <Text style={styles.planSub}>$2.12 / Week</Text>
          </TouchableOpacity>
        </View>

        {/* Continue button */}
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient
            colors={['#F2C200', '#FF8A00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtn}
          >
            <Text style={styles.continueText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.renewText}>
          Subscription renews automatically every year. Cancel anytime.
        </Text>

        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerLink}>Vydora Inc.</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerLink}>Restore</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  hero: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  closeBtn: {
    position: 'absolute',
    right: s(16),
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  playBtnWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnPlaying: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  previewBubble: {
    position: 'absolute',
    right: s(20),
    top: vs(200),
    alignItems: 'center',
  },
  previewImage: {
    width: ms(110),
    height: ms(110),
    borderRadius: ms(55),
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  previewLabel: {
    color: '#fff',
    fontSize: ms(11),
    marginTop: vs(4),
    fontWeight: '600',
  },
  durationBadge: {
    position: 'absolute',
    bottom: vs(6),
    right: s(6),
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: s(5),
    paddingVertical: vs(1.5),
    borderRadius: ms(4),
  },
  durationText: {
    color: '#fff',
    fontSize: ms(9),
    fontWeight: '600',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: s(20),
    paddingBottom: vs(18),
    paddingTop: vs(80),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brand: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '700',
  },
  brandPro: {
    color: '#F2C200',
    fontSize: ms(20),
    fontWeight: '700',
    fontStyle: 'italic',
    marginLeft: s(4),
  },
  headline: {
    color: '#fff',
    fontSize: ms(24),
    fontWeight: '700',
    marginTop: vs(6),
    lineHeight: ms(30),
  },
  scrubberRow: {
    marginTop: vs(14),
  },
  scrubberTrack: {
    height: vs(3),
    borderRadius: vs(1.5),
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '22%',
    borderRadius: vs(1.5),
    backgroundColor: '#F2C200',
  },
  scrubberThumb: {
    position: 'absolute',
    left: '22%',
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: '#F2C200',
    marginLeft: -ms(5),
  },
  scrubberTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(10),
    marginTop: vs(6),
  },
  sheet: {
    backgroundColor: '#000',
    paddingHorizontal: s(16),
    paddingTop: vs(18),
    paddingBottom: vs(24),
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: ms(12),
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingVertical: vs(16),
    marginHorizontal: s(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCardSelected: {
    borderColor: '#F2C200',
  },
  planCardWithBadge: {
    position: 'relative',
    paddingTop: vs(22),
  },
  badge: {
    position: 'absolute',
    top: -vs(11),
    paddingHorizontal: s(10),
    paddingVertical: vs(3),
    borderRadius: ms(10),
  },
  badgeText: {
    color: '#1A1A1A',
    fontSize: ms(10),
    fontWeight: '700',
  },
  planTitle: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '600',
    marginBottom: vs(6),
  },
  planMain: {
    color: '#fff',
    fontSize: ms(15),
    fontWeight: '700',
  },
  planSub: {
    color: '#888',
    fontSize: ms(10),
    marginTop: vs(3),
  },
  continueBtn: {
    marginTop: vs(20),
    borderRadius: ms(12),
    paddingVertical: vs(12),
    alignItems: 'center',
  },
  continueText: {
    color: '#1A1A1A',
    fontSize: ms(16),
    fontWeight: '700',
  },
  renewText: {
    color: '#777',
    fontSize: ms(11),
    textAlign: 'center',
    marginTop: vs(12),
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: vs(16),
  },
  footerLink: {
    color: '#666',
    fontSize: ms(11),
  },
  footerDivider: {
    color: '#444',
    fontSize: ms(11),
    marginHorizontal: s(8),
  },
});