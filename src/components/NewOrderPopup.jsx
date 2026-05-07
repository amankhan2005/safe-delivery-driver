import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { COLORS, SIZES, SHADOWS } from '../theme';

const FW = {
  medium:   '500',
  semibold: '600',
  bold:     '700',
  black:    '900',
};

const COUNTDOWN = 15;
const fmt = (val) => `$${(val || 0).toFixed(2)}`;

export default function NewOrderPopup({ order, visible, onAccept, onReject }) {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN);

  const slideY    = useRef(new Animated.Value(600)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const ringAnim  = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const fareScale = useRef(new Animated.Value(0.5)).current;
  const mountedRef = useRef(true);

  const player = useAudioPlayer(require('../../assets/ring.wav'));

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const playSound = async () => {
    try {
      await setAudioModeAsync({
        allowsRecordingIOS:         false,
        playsInSilentModeIOS:       true,
        staysActiveInBackground:    true,
        shouldDuckAndroid:          false,
        playThroughEarpieceAndroid: false,
      });
      player.seekTo(0);
      player.loop   = true;
      player.volume = 1.0;
      player.play();
    } catch (e) {
      console.log('[Ring] Sound error:', e.message);
    }
  };

  const stopSound = () => {
    try {
      if (player) {
        player.pause();
        player.seekTo(0);
      }
    } catch (_) {}
  };

  const slideDown = (cb) => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 600, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,   duration: 250, useNativeDriver: true }),
    ]).start(() => cb?.());
  };

  useEffect(() => {
    if (!visible) {
      stopSound();
      return;
    }

    if (mountedRef.current) setTimeLeft(COUNTDOWN);
    ringAnim.setValue(0);
    slideY.setValue(600);
    opacity.setValue(0);
    iconScale.setValue(0.8);
    fareScale.setValue(0.5);

    Animated.parallel([
      Animated.spring(slideY,    { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity,   { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 8,  useNativeDriver: true }),
      Animated.spring(fareScale, { toValue: 1, tension: 60, friction: 7, delay: 200, useNativeDriver: true }),
    ]).start();

    playSound();

    Animated.timing(ringAnim, {
      toValue:  1,
      duration: COUNTDOWN * 1000,
      easing:   Easing.linear,
      useNativeDriver: false,
    }).start();

    let t = COUNTDOWN;
    const interval = setInterval(() => {
      t -= 1;
      if (mountedRef.current) setTimeLeft(t);
      if (t <= 0) {
        clearInterval(interval);
        stopSound();
        slideDown(() => onReject?.(order));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      stopSound();
    };
  }, [visible, order?._id]);

  const handleAccept = () => { stopSound(); slideDown(() => onAccept?.(order)); };
  const handleReject = () => { stopSound(); slideDown(() => onReject?.(order)); };

  if (!order) return null;

  const urgentColor = timeLeft <= 5 ? '#EF4444' : COLORS.primary;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleReject}>

      <Animated.View style={[S.backdrop, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleReject} />
      </Animated.View>

      <Animated.View style={[S.card, { transform: [{ translateY: slideY }] }]}>

        {/* Header */}
        <LinearGradient colors={['#0A2F9A', '#1B4FD8']} style={S.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={S.timerWrap}>
            <View style={S.timerRing} />
            <View style={S.timerInner}>
              <Text style={[S.timerNum, { color: timeLeft <= 5 ? '#FCA5A5' : '#fff' }]}>{timeLeft}</Text>
              <Text style={S.timerSec}>sec</Text>
            </View>
          </View>

          <View style={S.headerMid}>
            <View style={S.headerTitleRow}>
              <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                <Text style={{ fontSize: 24 }}>🛵</Text>
              </Animated.View>
              <Text style={S.headerTitle}>New Request!</Text>
            </View>
            <Animated.View style={[S.fareBigWrap, { transform: [{ scale: fareScale }] }]}>
              <Text style={S.fareBigLabel}>EARNINGS</Text>
              <Text style={S.fareBigVal}>{fmt(order.fare)}</Text>
              <Text style={S.fareBigMeta}>{order.distanceMiles?.toFixed(1) || '?'} mi away</Text>
            </Animated.View>
          </View>
        </LinearGradient>

        {/* Route */}
        <View style={S.routeBox}>
          <View style={S.routeRow}>
            <View style={[S.routeDot, { backgroundColor: '#22C55E' }]} />
            <View style={S.routeInfo}>
              <Text style={S.routeTag}>PICKUP</Text>
              <Text style={S.routeAddr} numberOfLines={2}>{order.pickup?.address || 'Pickup location'}</Text>
            </View>
          </View>
          <View style={S.routeConn}>
            {[0,1,2].map(i => <View key={i} style={S.dash} />)}
          </View>
          <View style={S.routeRow}>
            <View style={[S.routeDot, { backgroundColor: '#EF4444' }]} />
            <View style={S.routeInfo}>
              <Text style={S.routeTag}>DROP-OFF</Text>
              <Text style={S.routeAddr} numberOfLines={2}>{order.drop?.address || 'Drop location'}</Text>
            </View>
          </View>
        </View>

        {/* Chips */}
        <View style={S.chipRow}>
          <View style={S.chip}>
            <Ionicons name="cube-outline" size={13} color={COLORS.primary} />
            <Text style={S.chipText}>{order.parcelWeight || 'Package'}</Text>
          </View>
          <View style={S.chip}>
            <Ionicons name="cash-outline" size={13} color="#16A34A" />
            <Text style={[S.chipText, { color: '#16A34A' }]}>Cash on Delivery</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={S.actions}>
          <TouchableOpacity style={S.rejectBtn} onPress={handleReject} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color="#EF4444" />
            <Text style={S.rejectText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
            <LinearGradient colors={['#16A34A', '#15803D']} style={S.acceptGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={S.acceptText}>Accept • {fmt(order.fare)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={S.progressBg}>
          <Animated.View style={[S.progressBar, {
            backgroundColor: urgentColor,
            width: ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] }),
          }]} />
        </View>

      </Animated.View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden', ...SHADOWS.lg,
  },
  header:         { padding: SIZES.lg, gap: SIZES.md, flexDirection: 'row', alignItems: 'center' },
  timerWrap:      { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  timerRing:      { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  timerInner:     { alignItems: 'center' },
  timerNum:       { fontSize: 20, fontWeight: FW.black, color: '#fff' },
  timerSec:       { fontSize: 9, fontWeight: FW.bold, color: 'rgba(255,255,255,0.7)', marginTop: -2 },
  headerMid:      { flex: 1, gap: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:    { fontSize: SIZES.fontLg, fontWeight: FW.black, color: '#fff' },
  fareBigWrap:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  fareBigLabel:   { fontSize: 9, fontWeight: FW.bold, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 },
  fareBigVal:     { fontSize: 32, fontWeight: FW.black, color: '#fff', letterSpacing: -0.5 },
  fareBigMeta:    { fontSize: 11, fontWeight: FW.medium, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  routeBox:       { padding: SIZES.lg, backgroundColor: '#F8FAFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
  routeDot:       { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  routeInfo:      { flex: 1 },
  routeTag:       { fontSize: 9, fontWeight: FW.bold, color: '#9CA3AF', letterSpacing: 1, marginBottom: 2 },
  routeAddr:      { fontSize: SIZES.fontSm, fontWeight: FW.semibold, color: '#111827', lineHeight: 18 },
  routeConn:      { flexDirection: 'column', gap: 3, marginLeft: 5, marginVertical: SIZES.sm },
  dash:           { width: 2, height: 5, backgroundColor: '#D1D5DB', borderRadius: 1 },
  chipRow:        { flexDirection: 'row', gap: SIZES.sm, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  chipText:       { fontSize: SIZES.fontXs, fontWeight: FW.semibold, color: COLORS.primary },
  actions:        { flexDirection: 'row', padding: SIZES.lg, gap: SIZES.md, paddingBottom: SIZES.xl },
  rejectBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: '#EF4444', borderRadius: SIZES.radiusMd, paddingVertical: 14, backgroundColor: '#FEF2F2' },
  rejectText:     { fontSize: SIZES.fontMd, fontWeight: FW.black, color: '#EF4444' },
  acceptBtn:      { flex: 2, borderRadius: SIZES.radiusMd, overflow: 'hidden', ...SHADOWS.md },
  acceptGrad:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  acceptText:     { fontSize: SIZES.fontMd, fontWeight: FW.black, color: '#fff' },
  progressBg:     { height: 4, backgroundColor: '#F3F4F6' },
  progressBar:    { height: 4, borderRadius: 2 },
});