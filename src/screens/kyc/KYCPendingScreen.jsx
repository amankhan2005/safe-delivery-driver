import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Animated, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/Screen';
import useAuthStore from '../../store/authStore';
import { SIZES } from '../../theme';

const BRAND = '#244BB3';
const BRAND_DARK = '#1A3585';
const BRAND_LIGHT = '#EEF2FF';
const BRAND_MID = '#3D60C8';

const { width } = Dimensions.get('window');

const CONFIGS = {
  pending: {
    gradient: [BRAND, BRAND_DARK],
    accentColor: '#F59E0B',
    accentLight: 'rgba(245,158,11,0.15)',
    icon: 'hourglass-outline',
    badge: 'UNDER REVIEW',
    title: 'Application\nUnder Review',
    sub: 'Our team is carefully reviewing your documents. This usually takes 24–48 hours.',
    showPulse: true,
  },
  rejected: {
    gradient: [BRAND, BRAND_DARK],
    accentColor: '#EF4444',
    accentLight: 'rgba(239,68,68,0.15)',
    icon: 'close-circle-outline',
    badge: 'NOT APPROVED',
    title: 'Application\nRejected',
    sub: 'Your application was not approved. Please contact support for assistance and next steps.',
    showPulse: false,
  },
  banned: {
    gradient: [BRAND, BRAND_DARK],
    accentColor: '#EF4444',
    accentLight: 'rgba(239,68,68,0.15)',
    icon: 'ban-outline',
    badge: 'SUSPENDED',
    title: 'Account\nSuspended',
    sub: 'Your account has been suspended. Contact support if you believe this is a mistake.',
    showPulse: false,
  },
};

// Animated pulsing ring for pending state
function PulseRing({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.45, duration: 1400, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// Floating decorative circle
function FloatDot({ style }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -10, duration: 2200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY }] }]} />;
}

export default function KYCPendingScreen() {
  const rider        = useAuthStore((s) => s.rider);
  const refreshRider = useAuthStore((s) => s.refreshRider);
  const logout       = useAuthStore((s) => s.logout);

  // Entrance animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const id = setInterval(refreshRider, 30000);
    return () => clearInterval(id);
  }, [refreshRider]);

  const status = rider?.status || 'pending';
  const cfg    = CONFIGS[status] || CONFIGS.pending;

  return (
    <View style={styles.root}>
      {/* Full-screen blue gradient background */}
      <LinearGradient colors={[BRAND, BRAND_DARK, '#101D4A']} style={StyleSheet.absoluteFill} />

      {/* Decorative floating dots */}
      <FloatDot style={[styles.dot, { width: 180, height: 180, borderRadius: 90, top: -50, right: -60, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      <FloatDot style={[styles.dot, { width: 120, height: 120, borderRadius: 60, bottom: 120, left: -40, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
      <View style={[styles.dot, { width: 60, height: 60, borderRadius: 30, top: '35%', left: 20, backgroundColor: 'rgba(255,255,255,0.06)' }]} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: cfg.accentLight, borderColor: cfg.accentColor + '55' }]}>
          <View style={[styles.badgeDot, { backgroundColor: cfg.accentColor }]} />
          <Text style={[styles.badgeText, { color: cfg.accentColor }]}>{cfg.badge}</Text>
        </View>

        {/* Icon area */}
        <View style={styles.iconWrap}>
          {cfg.showPulse && <PulseRing color={cfg.accentColor} />}
          <View style={[styles.iconBox, { backgroundColor: cfg.accentLight, borderColor: cfg.accentColor + '40' }]}>
            <Ionicons name={cfg.icon} size={46} color={cfg.accentColor} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{cfg.title}</Text>

        {/* Subtitle card */}
        <View style={styles.subCard}>
          <Text style={styles.sub}>{cfg.sub}</Text>
        </View>

        {/* Auto-check pill — pending only */}
        {status === 'pending' && (
          <View style={styles.pill}>
            <ActivityIndicator size="small" color="#F59E0B" />
            <Text style={styles.pillText}>Auto-checking every 30s</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <TouchableOpacity style={styles.refreshBtn} onPress={refreshRider} activeOpacity={0.82}>
          <Ionicons name="refresh-outline" size={18} color={BRAND} style={{ marginRight: 8 }} />
          <Text style={styles.refreshText}>Refresh Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
  content: {
    width: width - 40,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 36,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  // Icon
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    width: 100,
    height: 100,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },

  // Text
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  // Sub card
  subCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 20,
    width: '100%',
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 8,
  },
  pillText: {
    color: '#F59E0B',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 13,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 24,
  },

  // Buttons
  refreshBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  refreshText: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
    fontSize: 14,
  },
});