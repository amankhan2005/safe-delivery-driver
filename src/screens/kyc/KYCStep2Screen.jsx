import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/Screen';
import { kycStep2 } from '../../api';
import useAuthStore from '../../store/authStore';
import { SIZES, SHADOWS } from '../../theme';
import { assetToFile, errMsg } from '../../utils/helpers';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BRAND      = '#244BB3';
const BRAND_DARK = '#1A3585';
const BRAND_MID  = '#3D60C8';
const BRAND_LIGHT= '#EEF2FF';

const { width } = Dimensions.get('window');

// ─── Docs config (unchanged) ──────────────────────────────────────────────────
const DOCS = [
  { key: 'govtIdFront', label: 'Government ID',        sublabel: 'Front side', icon: 'id-card-outline',        iconFilled: 'id-card' },
  { key: 'govtIdBack',  label: 'Government ID',        sublabel: 'Back side',  icon: 'id-card-outline',        iconFilled: 'id-card' },
  { key: 'license',     label: 'Driving License',      sublabel: 'Full document', icon: 'document-text-outline', iconFilled: 'document-text' },
  { key: 'rcBook',      label: 'Vehicle Registration', sublabel: 'RC Book',    icon: 'car-outline',             iconFilled: 'car' },
];

// ─── Single doc upload card ───────────────────────────────────────────────────
function DocCard({ doc, asset, busy, onPress, index }) {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const uploaded = !!asset;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={busy}
        activeOpacity={0.88}
        style={[styles.docCard, uploaded && styles.docCardDone]}
      >
        {/* Left: thumb or icon */}
        {uploaded ? (
          <Image source={{ uri: asset.uri }} style={styles.thumb} />
        ) : (
          <View style={styles.docIconWrap}>
            <Ionicons name={doc.icon} size={22} color={BRAND} />
          </View>
        )}

        {/* Middle: text */}
        <View style={styles.docBody}>
          <Text style={styles.docLabel}>{doc.label}</Text>
          <Text style={[styles.docSub, uploaded && styles.docSubDone]}>
            {uploaded ? `${doc.sublabel} · Tap to replace` : `${doc.sublabel} · Tap to upload`}
          </Text>
        </View>

        {/* Right: status */}
        {uploaded ? (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </View>
        ) : (
          <View style={styles.uploadChip}>
            <Ionicons name="cloud-upload-outline" size={14} color={BRAND} />
            <Text style={styles.uploadChipText}>Upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function KYCStep2Screen({ navigation }) {
  const [files,      setFiles]      = useState({});
  const [busyKey,    setBusyKey]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const pick = async (key) => {
    setBusyKey(key);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Toast.show({ type: 'error', text1: 'Photo access denied' }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setFiles((f) => ({ ...f, [key]: result.assets[0] }));
      }
    } catch { Toast.show({ type: 'error', text1: 'Could not pick image' }); }
    finally { setBusyKey(null); }
  };

  const allReady = DOCS.every((d) => files[d.key]);
  const doneCount = Object.keys(files).length;

  const submit = async () => {
    if (!allReady) return Toast.show({ type: 'error', text1: 'Upload all 4 documents' });
    setSubmitting(true);
    try {
      const fd = new FormData();
      DOCS.forEach((d) => fd.append(d.key, assetToFile(files[d.key], d.key)));
      await kycStep2(fd);
      await refreshRider();
      navigation.navigate('KYCStep3');
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Upload failed') });
    } finally { setSubmitting(false); }
  };

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
          <Text style={styles.stepPillText}>STEP 2 OF 3</Text>
        </View>

        {/* Icon */}
        <View style={styles.headerIconBox}>
          <Ionicons name="documents-outline" size={34} color="#fff" />
        </View>

        <Text style={styles.headerTitle}>Upload Documents</Text>
        <Text style={styles.headerSub}>Clear photos help us approve{'\n'}your application faster.</Text>
      </LinearGradient>

      {/* White card */}
      <Animated.ScrollView
        style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.progressSegWrap}>
              <View style={[styles.progressSeg, n <= 2 && styles.progressSegActive]} />
            </View>
          ))}
        </View>
        <Text style={styles.progressLabel}>2 of 3 completed</Text>

        {/* Upload counter */}
        <View style={styles.counterRow}>
          <View style={styles.counterPill}>
            <Ionicons name="checkmark-circle" size={15} color={doneCount === 4 ? '#10B981' : BRAND} style={{ marginRight: 5 }} />
            <Text style={[styles.counterText, doneCount === 4 && styles.counterTextDone]}>
              {doneCount} of 4 documents uploaded
            </Text>
          </View>
        </View>

        {/* Doc cards */}
        {DOCS.map((d, i) => (
          <DocCard
            key={d.key}
            doc={d}
            asset={files[d.key]}
            busy={busyKey === d.key}
            onPress={() => pick(d.key)}
            index={i}
          />
        ))}

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={BRAND} style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={styles.infoText}>
            All documents are encrypted and used only for identity verification.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.submitBtn, (!allReady || submitting) && styles.submitBtnDisabled]}
          onPress={submit}
          activeOpacity={0.85}
          disabled={!allReady || submitting}
        >
          <LinearGradient
            colors={allReady ? [BRAND_MID, BRAND, BRAND_DARK] : ['#9EB0D8', '#8AA0CC']}
            style={styles.submitBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {!submitting && <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />}
            <Text style={styles.submitBtnText}>
              {submitting ? 'Uploading…' : allReady ? 'Continue to Step 3' : `Upload Documents (${doneCount}/4)`}
            </Text>
            {!submitting && allReady && (
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            )}
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
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
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
  cardContent: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },

  // Progress
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  progressSegWrap: {
    flex: 1, height: 5,
    backgroundColor: '#E8ECF5', borderRadius: 3, overflow: 'hidden',
  },
  progressSeg: { height: '100%', backgroundColor: '#E8ECF5', borderRadius: 3 },
  progressSegActive: { backgroundColor: BRAND },
  progressLabel: { fontSize: 12, color: BRAND, fontWeight: '600', marginBottom: 20 },

  // Counter
  counterRow: { marginBottom: 16 },
  counterPill: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: BRAND_LIGHT,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  counterText: { fontSize: 12.5, color: BRAND, fontWeight: '600' },
  counterTextDone: { color: '#10B981' },

  // Doc card
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#244BB3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  docCardDone: { borderColor: '#10B981', backgroundColor: '#F0FDF8' },
  docIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#E8ECF5' },
  docBody: { flex: 1, marginHorizontal: 12 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  docSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  docSubDone: { color: '#10B981' },
  checkBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND_LIGHT,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    gap: 4,
  },
  uploadChipText: { fontSize: 12, color: BRAND, fontWeight: '600' },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: BRAND_LIGHT, borderRadius: 12,
    padding: 12, marginTop: 4, marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 12.5, color: BRAND_DARK, lineHeight: 18 },

  // Submit btn
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