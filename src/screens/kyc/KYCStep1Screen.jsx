import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { kycStep1 } from '../../api';
import useAuthStore from '../../store/authStore';
import { SIZES } from '../../theme';
import { errMsg } from '../../utils/helpers';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND       = '#244BB3';
const BRAND_DARK  = '#1A3585';
const BRAND_LIGHT = '#EEF2FF';
const BRAND_MID   = '#3D60C8';

// ─── Validation (unchanged) ───────────────────────────────────────────────────
function isValidDob(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, reason: 'Use YYYY-MM-DD format (e.g. 1995-06-15)' };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { ok: false, reason: 'Invalid date' };
  const [y, m, day] = s.split('-').map(Number);
  if (d.getUTCFullYear() !== y || d.getUTCMonth() + 1 !== m || d.getUTCDate() !== day)
    return { ok: false, reason: 'Invalid date' };
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < day)) age--;
  if (age < 18) return { ok: false, reason: 'You must be at least 18 years old' };
  if (age > 85) return { ok: false, reason: 'Please enter a valid date of birth' };
  return { ok: true };
}

const { width } = Dimensions.get('window');

export default function KYCStep1Screen({ navigation }) {
  const [dob,     setDob]     = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshRider, logout } = useAuthStore();

  // Entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Logic unchanged ──────────────────────────────────────────────────────────
  const submit = async () => {
    const check = isValidDob(dob);
    if (!check.ok) return Toast.show({ type: 'error', text1: check.reason });
    setLoading(true);
    try {
      await kycStep1({ dob });
      await refreshRider();
      navigation.navigate('KYCStep2');
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not save') });
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      {/* Blue gradient header band */}
      <LinearGradient
        colors={[BRAND, BRAND_MID]}
        style={styles.headerBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Step label */}
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP 1 OF 3</Text>
        </View>

        {/* Icon */}
        <View style={styles.iconBox}>
          <Ionicons name="calendar-outline" size={34} color="#fff" />
        </View>

        {/* Title inside header */}
        <Text style={styles.headerTitle}>Date of Birth</Text>
        <Text style={styles.headerSub}>You must be at least 18 years old{'\n'}to become a rider.</Text>
      </LinearGradient>

      {/* White content card */}
      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.progressSegWrap}>
              <View style={[styles.progressSeg, n === 1 && styles.progressSegActive]} />
            </View>
          ))}
        </View>
        <Text style={styles.progressLabel}>1 of 3 completed</Text>

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputHint}>Enter your date of birth</Text>
          <Input
            label=""
            placeholder="YYYY-MM-DD  (e.g. 1995-06-15)"
            value={dob}
            onChangeText={setDob}
            keyboardType="numbers-and-punctuation"
            leftIcon={<Ionicons name="calendar-outline" size={18} color={BRAND} />}
          />
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={BRAND} style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={styles.infoText}>Your date of birth is used for identity verification only and is kept secure.</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.continueBtn, loading && { opacity: 0.75 }]}
          onPress={submit}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={[BRAND_MID, BRAND, BRAND_DARK]}
            style={styles.continueBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.continueBtnText}>
              {loading ? 'Saving…' : 'Continue'}
            </Text>
            {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },

  // ── Header band ──────────────────────────────────────────────────────────────
  headerBand: {
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  decCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -60,
  },
  decCircle2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 10,
    left: -30,
  },
  logoutBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 13,
  },
  stepPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 18,
  },
  stepPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  // ── White card ───────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  progressSegWrap: {
    flex: 1,
    height: 5,
    backgroundColor: '#E8ECF5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressSeg: {
    height: '100%',
    backgroundColor: '#E8ECF5',
    borderRadius: 3,
  },
  progressSegActive: {
    backgroundColor: BRAND,
  },
  progressLabel: {
    fontSize: 12,
    color: BRAND,
    fontWeight: '600',
    marginBottom: 24,
  },

  // Input section
  inputSection: {
    marginBottom: 16,
  },
  inputHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BRAND_LIGHT,
    borderRadius: 12,
    padding: 12,
    marginBottom: 28,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: BRAND_DARK,
    lineHeight: 18,
  },

  // Continue button
  continueBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});