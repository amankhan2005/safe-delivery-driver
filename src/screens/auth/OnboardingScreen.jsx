import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'rocket-outline',
    bg: ['#0B1F4B', '#1B4FD8'],
    title: 'Earn on\nYour Time',
    sub: 'Go online when you want. Accept deliveries that fit your day.',
  },
  {
    id: '2',
    icon: 'shield-checkmark-outline',
    bg: ['#14532D', '#16A34A'],
    title: 'Verified\nDeliveries',
    sub: 'Every order has photo proof and a delivery code — no disputes.',
  },
  {
    id: '3',
    icon: 'wallet-outline',
    bg: ['#78350F', '#D97706'],
    title: 'Get Paid\nDaily',
    sub: 'Cash collected on delivery. Track every dollar in real time.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const listRef  = useRef(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      navigation.navigate('Login');
    }
  };

  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start();

  const renderItem = ({ item }) => (
    <LinearGradient colors={item.bg} style={styles.slide} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={76} color="rgba(255,255,255,0.95)" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSub}>{item.sub}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            onPress={next}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={['#1B4FD8', '#0B1F4B']}
              style={styles.ctaInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>
                {index === SLIDES.length - 1 ? "Let's Ride" : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Already a rider? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.bottomLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.white },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.xxxl },
  bgCircle1: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bgCircle2: {
    position: 'absolute', bottom: 40, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconWrap: {
    width: 152, height: 152, borderRadius: 76,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  textWrap:   { alignItems: 'center' },
  slideTitle: {
    fontSize: 36, fontWeight: '900',
    color: COLORS.white, textAlign: 'center',
    lineHeight: 42, letterSpacing: -0.5,
    marginBottom: SIZES.lg,
  },
  slideSub: {
    fontSize: SIZES.fontLg, color: 'rgba(255,255,255,0.82)',
    textAlign: 'center', lineHeight: 26, fontWeight: '500',
  },
  bottom: {
    backgroundColor: COLORS.white,
    padding: SIZES.xxl, paddingTop: SIZES.xl, paddingBottom: SIZES.xxxl,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32,
    ...SHADOWS.md,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: SIZES.xxl },
  dot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gray200 },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  ctaWrap:  { borderRadius: SIZES.radiusLg, overflow: 'hidden' },
  ctaInner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingVertical: 17,
  },
  ctaText:    { fontSize: SIZES.fontXl, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  bottomRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.lg },
  bottomText: { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  bottomLink: { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '700' },
});
