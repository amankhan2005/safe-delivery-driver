import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import { kycStep3 } from '../../api';
import useAuthStore from '../../store/authStore';
import { SIZES } from '../../theme';
import { errMsg } from '../../utils/helpers';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND       = '#244BB3';
const BRAND_DARK  = '#1A3585';
const BRAND_MID   = '#3D60C8';
const BRAND_LIGHT = '#EEF2FF';

// ─── Vehicles (unchanged) ─────────────────────────────────────────────────────
const VEHICLES = [
  { type: 'motorcycle', label: 'Motorcycle', icon: 'bicycle-outline',   iconActive: 'bicycle' },
  { type: 'bicycle',    label: 'Bicycle',    icon: 'bicycle',           iconActive: 'bicycle' },
  { type: 'car',        label: 'Car',        icon: 'car-outline',       iconActive: 'car' },
];

// ─── Vehicle type card ────────────────────────────────────────────────────────
function VehicleCard({ v, active, onPress, index }) {
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, marginHorizontal: 4, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
        {active ? (
          <LinearGradient
            colors={[BRAND_MID, BRAND]}
            style={styles.vehicleCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.vehicleIconActive}>
              <Ionicons name={v.iconActive} size={24} color={BRAND} />
            </View>
            <Text style={styles.vehicleLabelActive}>{v.label}</Text>
            <View style={styles.vehicleCheckDot}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.vehicleCardInactive}>
            <View style={styles.vehicleIconInactive}>
              <Ionicons name={v.icon} size={24} color={BRAND} />
            </View>
            <Text style={styles.vehicleLabelInactive}>{v.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function KYCStep3Screen({ navigation }) {
  const [type,    setType]    = useState(null);
  const [plate,   setPlate]   = useState('');
  const [model,   setModel]   = useState('');
  const [color,   setColor]   = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshRider } = useAuthStore();

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
    if (!type)
      return Toast.show({ type: 'error', text1: 'Select your vehicle type' });
    if (!plate.trim() || !model.trim() || !color.trim())
      return Toast.show({ type: 'error', text1: 'Fill all vehicle fields' });
    setLoading(true);
    try {
      await kycStep3({ type, plate: plate.trim().toUpperCase(), model: model.trim(), color: color.trim() });
      await refreshRider();
      navigation.navigate('KYCPending');
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not submit') });
    } finally { setLoading(false); }
  };

  const allFilled = type && plate.trim() && model.trim() && color.trim();

  return (
    <View style={styles.root}>
      {/* Blue gradient header */}
      <LinearGradient
        colors={[BRAND, BRAND_MID]}
        style={styles.headerBand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.decCircle1} />
        <View style={styles.decCircle2} />

        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Step pill */}
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP 3 OF 3</Text>
        </View>

        {/* Icon */}
        <View style={styles.headerIconBox}>
          <Ionicons name="car-sport-outline" size={34} color="#fff" />
        </View>

        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <Text style={styles.headerSub}>Tell us about the vehicle{'\n'}you'll deliver with.</Text>
      </LinearGradient>

      {/* White scrollable card */}
      <Animated.ScrollView
        style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress — all 3 filled */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.progressSegWrap}>
              <View style={[styles.progressSeg, styles.progressSegActive]} />
            </View>
          ))}
        </View>
        <Text style={styles.progressLabel}>Final step — almost there!</Text>

        {/* Section: Vehicle type */}
        <View style={styles.sectionHdr}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Vehicle Type</Text>
        </View>

        <View style={styles.vehicleRow}>
          {VEHICLES.map((v, i) => (
            <VehicleCard
              key={v.type}
              v={v}
              active={type === v.type}
              onPress={() => setType(v.type)}
              index={i}
            />
          ))}
        </View>

        {/* Section: Vehicle details */}
        <View style={[styles.sectionHdr, { marginTop: 8 }]}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
        </View>

        <Input
          label="License Plate"
          placeholder="e.g. LR-1234"
          value={plate}
          onChangeText={setPlate}
          autoCapitalize="characters"
          leftIcon={<Ionicons name="pricetag-outline" size={18} color={BRAND} />}
        />
        <Input
          label="Model"
          placeholder="e.g. Honda CG 125"
          value={model}
          onChangeText={setModel}
          leftIcon={<Ionicons name="construct-outline" size={18} color={BRAND} />}
        />
        <Input
          label="Color"
          placeholder="e.g. Red"
          value={color}
          onChangeText={setColor}
          leftIcon={<Ionicons name="color-palette-outline" size={18} color={BRAND} />}
        />

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={BRAND} style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={styles.infoText}>
            Your vehicle details are verified against your documents for safety compliance.
          </Text>
        </View>

        {/* Submit CTA */}
        <TouchableOpacity
          style={[styles.submitBtn, (!allFilled || loading) && styles.submitBtnDisabled]}
          onPress={submit}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={allFilled ? [BRAND_MID, BRAND, BRAND_DARK] : ['#9EB0D8', '#8AA0CC']}
            style={styles.submitBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {!loading && (
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.submitBtnText}>
              {loading ? 'Submitting…' : 'Submit for Review'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },

  // Header
  headerBand: {
    paddingTop: 56, paddingBottom: 60,
    paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -50,
  },
  decCircle2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -30,
  },
  backBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 18,
  },
  stepPillText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  headerIconBox: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.72)',
    textAlign: 'center', marginTop: 6, lineHeight: 20,
  },

  // White card
  card: {
    flex: 1, marginTop: -28,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 6,
  },
  cardContent: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 44 },

  // Progress
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  progressSegWrap: {
    flex: 1, height: 5, backgroundColor: '#E8ECF5', borderRadius: 3, overflow: 'hidden',
  },
  progressSeg: { height: '100%', backgroundColor: '#E8ECF5', borderRadius: 3 },
  progressSegActive: { backgroundColor: BRAND },
  progressLabel: { fontSize: 12, color: BRAND, fontWeight: '600', marginBottom: 24 },

  // Section headers
  sectionHdr: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionDot: {
    width: 4, height: 16, borderRadius: 2,
    backgroundColor: BRAND, marginRight: 8,
  },
  sectionTitle: { fontSize: 13.5, fontWeight: '700', color: '#1E293B', letterSpacing: 0.2 },

  // Vehicle cards
  vehicleRow: { flexDirection: 'row', marginBottom: 8 },
  vehicleCard: {
    paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', position: 'relative',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  vehicleCardInactive: {
    paddingVertical: 18, borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  vehicleIconActive: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  vehicleIconInactive: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  vehicleLabelActive: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  vehicleLabelInactive: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
  vehicleCheckDot: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: BRAND_LIGHT, borderRadius: 12,
    padding: 12, marginTop: 4, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 12.5, color: BRAND_DARK, lineHeight: 18 },

  // Submit button
  submitBtn: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  submitBtnDisabled: { shadowOpacity: 0.1 },
  submitBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15.5, letterSpacing: 0.2 },
});