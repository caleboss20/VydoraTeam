import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { s, ms, vs } from 'react-native-size-matters';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
};

export default function UpgradeToProBanner({ onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.glowWrap}>
      {/* Soft gold backdrop glow — sits behind the card, blurred by low opacity + radius */}
      <View style={styles.glow} pointerEvents="none" />

      {/* Gold gradient ring, achieved by padding a gradient view and nesting a black card inside */}
      <LinearGradient
        colors={['#F2C200', '#FF8A00', '#F2C200']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <View style={styles.banner}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={ms(19)} color="#F2C200" />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>Upgrade to Pro</Text>
            <Text style={styles.subtitle}>
              Unlimited exports, 4K quality & no watermark
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={ms(18)} color="#F2C200" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    marginBottom: vs(14),
  },
  glow: {
    position: 'absolute',
    top: vs(4),
    left: s(4),
    right: s(4),
    bottom: vs(4),
    borderRadius: ms(16),
    backgroundColor: '#F2C200',
    opacity: Platform.OS === 'ios' ? 0.35 : 0.22,
    // iOS renders a real soft blur via shadow; Android falls back to this
    // semi-transparent backdrop since colored shadows aren't supported there.
    shadowColor: '#F2C200',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: ms(18),
    shadowOpacity: 1,
  },
  border: {
    // borderRadius: ms(14),
    // padding: 1.4, // reveals the gradient as a thin ring around the black card
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: ms(13),
    paddingVertical: vs(13),
    paddingHorizontal: s(15),
   
  },
  iconWrap: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(242,194,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#F2C200',
    fontSize: ms(15),
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: ms(11.5),
    marginTop: vs(2),
  },
});