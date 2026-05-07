import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Image, Modal, AppState,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import {
  getRiderOrder, uploadPickupPhoto, startTransit,
  uploadDropPhoto, verifyDeliveryOTP,
} from '../../api';
import useOrderStore from '../../store/orderStore';
import Button   from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import Screen   from '../../components/Screen';
import { fmtCurrency, fmtStatus, statusColor, errMsg } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const TIMELINE = ['assigned', 'picked_up', 'in_transit', 'delivered'];
const TIMELINE_LABELS = {
  assigned:   'Heading to Pickup',
  picked_up:  'Parcel Picked Up',
  in_transit: 'On the Way',
  delivered:  'Delivered',
};

const POLL_MS = 12_000;

export default function ActiveOrderScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const setActiveOrder   = useOrderStore((s) => s.setActiveOrder);
  const clearActiveOrder = useOrderStore((s) => s.clearActiveOrder);

  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [otpOpen,    setOtpOpen]    = useState(false);
  const [otp,        setOtp]        = useState('');

  const pollRef     = useRef(null);
  const mountedRef  = useRef(true);
  const busyRef     = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    mountedRef.current = true;
    busyRef.current    = false;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        load(true);
      }
    });
    return () => sub.remove();
  }, []);

  if (!orderId) { navigation.goBack(); return null; }

  // ── Load order ────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    try {
      const res   = await getRiderOrder(orderId);
      const fresh = res?.data?.data?.order;
      if (!mountedRef.current) return;
      if (fresh) {
        setOrder(fresh);
        if (['assigned', 'picked_up', 'in_transit'].includes(fresh.status)) {
          setActiveOrder(fresh);
        } else if (fresh.status === 'delivered' || fresh.status === 'cancelled') {
          clearActiveOrder();
        }
      }
    } catch (e) {
      if (!mountedRef.current) return;
      if (!silent) Toast.show({ type: 'error', text1: errMsg(e, 'Could not load order') });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [orderId, setActiveOrder, clearActiveOrder]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [load]);

  useEffect(() => {
    if (order?.status === 'delivered' || order?.status === 'cancelled') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [order?.status]);

  // ── Photo Upload ──────────────────────────────────────────────────────────
  const onPhotoTaken = useCallback(async (asset) => {
    setCameraOpen(false);
    if (!asset?.uri || busyRef.current) return;

    const mode = cameraMode;
    busyRef.current = true;
    setActionBusy(true);

    Toast.show({
      type:           'info',
      text1:          '📤 Uploading Photo',
      text2:          'Please wait...',
      visibilityTime: 60_000,
      autoHide:       false,
    });

    try {
      const uri = asset.uri;
      const normalizedUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

      const formData = new FormData();
      formData.append('photo', {
        uri:  normalizedUri,
        name: `delivery_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      if (mode === 'pickup') {
        await uploadPickupPhoto(orderId, formData);
        Toast.hide();
        Toast.show({
          type:  'success',
          text1: '✅ Pickup Confirmed',
          text2: 'Tap Start Delivery to proceed.',
        });
      } else {
        await uploadDropPhoto(orderId, formData);
        Toast.hide();
        Toast.show({
          type:  'success',
          text1: '✅ Drop Photo Saved',
          text2: 'Enter the OTP to complete delivery.',
        });
      }

      await load();
    } catch (e) {
      Toast.hide();
      console.warn('[Upload] Failed:', {
        code:    e?.code,
        status:  e?.response?.status,
        message: e?.message,
        data:    e?.response?.data,
      });
      Toast.show({
        type:           'error',
        text1:          !e.response ? '❌ Connection Error' : '❌ Upload Failed',
        text2:          !e.response
                          ? 'Network error. Check your connection and try again.'
                          : (e?.response?.data?.error || 'Upload failed. Please try again.'),
        visibilityTime: 8000,
      });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) { setActionBusy(false); setCameraMode(null); }
    }
  }, [cameraMode, orderId, load]);

  // ── Start Transit ─────────────────────────────────────────────────────────
  const handleStartTransit = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setActionBusy(true);

    Toast.show({
      type:           'info',
      text1:          '🚀 Starting Delivery…',
      text2:          'Please wait.',
      visibilityTime: 30_000,
      autoHide:       false,
    });

    try {
      await startTransit(orderId);
      Toast.hide();
      Toast.show({
        type:  'success',
        text1: '✅ Delivery Started',
        text2: 'Head to the drop location.',
      });
      await load();
    } catch (e) {
      Toast.hide();
      Toast.show({
        type:           'error',
        text1:          '❌ Action Failed',
        text2:          errMsg(e, 'Could not start delivery. Please try again.'),
        visibilityTime: 5000,
      });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setActionBusy(false);
    }
  }, [orderId, load]);

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOTP = useCallback(async () => {
    if (otp.length !== 4) {
      return Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter the 4-digit code.' });
    }
    if (busyRef.current) return;

    busyRef.current = true;
    setActionBusy(true);

    Toast.show({
      type:           'info',
      text1:          '🔑 Verifying OTP…',
      text2:          'Please wait.',
      visibilityTime: 30_000,
      autoHide:       false,
    });

    try {
      await verifyDeliveryOTP(orderId, { otp });
      Toast.hide();
      Toast.show({
        type:  'success',
        text1: '🎉 Delivery Complete!',
        text2: 'Payment collected. Well done.',
      });
      if (mountedRef.current) { setOtpOpen(false); setOtp(''); }
      clearActiveOrder();
      await load();
      setTimeout(() => {
        if (mountedRef.current) navigation.navigate('Tabs');
      }, 1200);
    } catch (e) {
      Toast.hide();
      Toast.show({
        type:           'error',
        text1:          '❌ Verification Failed',
        text2:          errMsg(e, 'Invalid OTP. Ask the customer for the correct code.'),
        visibilityTime: 5000,
      });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setActionBusy(false);
    }
  }, [otp, orderId, clearActiveOrder, load, navigation]);

  const call = (phone) => phone && Linking.openURL(`tel:${phone}`).catch(() => {});

  const openMap = (lat, lng, label) => {
    if (!lat || !lng) return;
    const url = Platform.select({
      ios:     `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
    });
    Linking.openURL(url).catch(() =>
      Toast.show({ type: 'error', text1: 'Cannot open maps' })
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !order) {
    return (
      <Screen pad={false} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </Screen>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (order.status === 'cancelled') {
    return (
      <Screen pad={false} edges={['top']}>
        <View style={styles.cancelWrap}>
          <Ionicons name="close-circle-outline" size={56} color={COLORS.red} />
          <Text style={styles.cancelTitle}>Order Cancelled</Text>
          <Text style={styles.cancelText}>
            {order.cancellationReason || 'This order was cancelled.'}
          </Text>
          <Button
            title="Return to Home"
            onPress={() => { clearActiveOrder(); navigation.navigate('Tabs'); }}
            size="lg"
            style={{ alignSelf: 'stretch', marginTop: SIZES.xl }}
          />
        </View>
      </Screen>
    );
  }

  const color     = statusColor(order.status);
  const stepIndex = TIMELINE.indexOf(order.status);

  return (
    <Screen scroll pad={false} edges={['top']} noKeyboard
      scrollProps={{ showsVerticalScrollIndicator: false }}>

      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('Tabs')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Active Delivery</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: color + '14', borderLeftColor: color }]}>
        <Ionicons name="radio-button-on" size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>{fmtStatus(order.status)}</Text>
      </View>

      {/* Customer Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CUSTOMER</Text>
        <View style={styles.customerRow}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.custName}>{order.customerId?.name || 'Customer'}</Text>
            <Text style={styles.custPhone}>{order.customerId?.phone || ''}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => call(order.customerId?.phone)}>
            <Ionicons name="call-outline" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Cards */}
      <LocationCard
        label="PICKUP"
        dot={COLORS.green}
        address={order.pickup?.address}
        contact={order.pickup?.contactName}
        phone={order.pickup?.contactPhone}
        onCall={() => call(order.pickup?.contactPhone)}
        onNav={() => openMap(order.pickup?.lat, order.pickup?.lng, 'Pickup')}
      />
      <LocationCard
        label="DROP OFF"
        dot={COLORS.red}
        address={order.drop?.address}
        contact={order.drop?.contactName}
        phone={order.drop?.contactPhone}
        onCall={() => call(order.drop?.contactPhone)}
        onNav={() => openMap(order.drop?.lat, order.drop?.lng, 'Drop')}
      />

      {/* Order Details */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>ORDER DETAILS</Text>
        <Row icon="cube-outline"        label="Weight"   value={order.parcelWeight || '—'} />
        <Row icon="map-outline"         label="Distance" value={`${(order.distanceMiles || 0).toFixed(1)} mi`} />
        <Row icon="cash-outline"        label="Fare"     value={fmtCurrency(order.fare)} hi />
        {order.notes ? (
          <View style={styles.notes}>
            <Ionicons name="document-text-outline" size={14} color={COLORS.gray500} />
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Progress Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>DELIVERY PROGRESS</Text>
        {TIMELINE.map((st, i) => {
          const done    = i <= stepIndex;
          const current = i === stepIndex && order.status !== 'delivered';
          return (
            <View key={st} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCur]}>
                  {done && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                </View>
                {i < TIMELINE.length - 1 && (
                  <View style={[styles.tlLine, done && styles.tlLineDone]} />
                )}
              </View>
              <Text style={[styles.tlLabel, done && styles.tlLabelDone]}>
                {TIMELINE_LABELS[st]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Proof Photos */}
      {(order.pickupPhoto?.url || order.dropPhoto?.url) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROOF OF DELIVERY</Text>
          <View style={styles.photoRow}>
            {order.pickupPhoto?.url ? <PhotoBox uri={order.pickupPhoto.url} cap="Pickup" /> : null}
            {order.dropPhoto?.url   ? <PhotoBox uri={order.dropPhoto.url}   cap="Drop"   /> : null}
          </View>
        </View>
      )}

      <View style={{ height: 120 }} />

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {order.status === 'assigned' && (
          <Button
            title="Confirm Pickup — Take Photo"
            size="lg"
            loading={actionBusy}
            icon={<Ionicons name="camera-outline" size={18} color={COLORS.white} />}
            onPress={() => {
              if (!actionBusy) { setCameraMode('pickup'); setCameraOpen(true); }
            }}
          />
        )}
        {order.status === 'picked_up' && (
          <Button
            title="Start Delivery"
            size="lg"
            loading={actionBusy}
            icon={<Ionicons name="navigate-outline" size={18} color={COLORS.white} />}
            onPress={handleStartTransit}
          />
        )}
        {order.status === 'in_transit' && !order.dropPhoto?.url && (
          <Button
            title="Arrived — Take Drop Photo"
            size="lg"
            loading={actionBusy}
            icon={<Ionicons name="camera-outline" size={18} color={COLORS.white} />}
            onPress={() => {
              if (!actionBusy) { setCameraMode('drop'); setCameraOpen(true); }
            }}
          />
        )}
        {order.status === 'in_transit' && order.dropPhoto?.url && (
          <Button
            title="Enter Delivery OTP"
            size="lg"
            variant="success"
            loading={actionBusy}
            icon={<Ionicons name="keypad-outline" size={18} color={COLORS.white} />}
            onPress={() => !actionBusy && setOtpOpen(true)}
          />
        )}
        {order.status === 'delivered' && (
          <Button
            title="Return to Home"
            size="lg"
            variant="success"
            icon={<Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />}
            onPress={() => { clearActiveOrder(); navigation.navigate('Tabs'); }}
          />
        )}
      </View>

      {/* Camera Modal */}
      <CameraModal
        visible={cameraOpen}
        mode={cameraMode}
        onClose={() => { setCameraOpen(false); setCameraMode(null); }}
        onCapture={onPhotoTaken}
      />

      {/* OTP Modal */}
      <Modal
        visible={otpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { setOtpOpen(false); setOtp(''); }}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Ionicons
              name="keypad-outline" size={32} color={COLORS.primary}
              style={{ alignSelf: 'center', marginBottom: SIZES.sm }}
            />
            <Text style={styles.modalTitle}>Delivery Confirmation</Text>
            <Text style={styles.modalSub}>
              Ask the customer for the 4-digit OTP shown in their app.
            </Text>
            <OTPInput value={otp} onChange={setOtp} length={4} />
            <Button
              title={actionBusy ? 'Verifying…' : 'Confirm Delivery'}
              onPress={handleVerifyOTP}
              loading={actionBusy}
              disabled={otp.length !== 4 || actionBusy}
              size="lg"
              variant="success"
            />
            <Button
              title="Cancel"
              onPress={() => { setOtpOpen(false); setOtp(''); }}
              variant="ghost"
              size="md"
              style={{ marginTop: SIZES.sm }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LocationCard({ label, dot, address, contact, phone, onCall, onNav }) {
  return (
    <View style={styles.card}>
      <View style={styles.locHead}>
        <View style={[styles.locDot, { backgroundColor: dot }]} />
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.locAddr}>{address}</Text>
      {contact ? (
        <Text style={styles.locContact}>{contact}{phone ? ` · ${phone}` : ''}</Text>
      ) : null}
      <View style={styles.locActions}>
        <TouchableOpacity style={styles.locBtn} onPress={onNav}>
          <Ionicons name="navigate-outline" size={15} color={COLORS.primary} />
          <Text style={styles.locBtnText}>Navigate</Text>
        </TouchableOpacity>
        {phone ? (
          <TouchableOpacity style={styles.locBtn} onPress={onCall}>
            <Ionicons name="call-outline" size={15} color={COLORS.primary} />
            <Text style={styles.locBtnText}>Call</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Row({ icon, label, value, hi }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={COLORS.gray500} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowVal, hi && styles.rowValHi]}>{value}</Text>
    </View>
  );
}

function PhotoBox({ uri, cap }) {
  return (
    <View style={styles.photoBox}>
      <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
      <Text style={styles.photoCap}>{cap}</Text>
    </View>
  );
}

function CameraModal({ visible, mode, onClose, onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const camRef = useRef(null);

  if (!visible) return null;

  const take = async () => {
    if (!camRef.current || busy) return;
    setBusy(true);
    try {
      const result = await camRef.current.takePictureAsync({
        quality:        0.85,
        skipProcessing: true,
      });
      onCapture(result);
    } catch {
      Toast.show({ type: 'error', text1: 'Camera Error', text2: 'Could not capture photo. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionWrap}>
            <Ionicons name="camera-outline" size={52} color={COLORS.primary} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSub}>
              Camera permission is required to capture proof of pickup and delivery.
            </Text>
            <Button title="Grant Permission" onPress={requestPermission} size="lg"
              style={{ marginTop: SIZES.lg }} />
            <Button title="Cancel" onPress={onClose} variant="ghost" size="md"
              style={{ marginTop: SIZES.sm }} />
          </View>
        ) : (
          <>
            <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
            <View style={styles.camTop}>
              <TouchableOpacity onPress={onClose} style={styles.camCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={26} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.camTitle}>
                {mode === 'pickup' ? 'Photograph the Parcel' : 'Photograph the Drop Location'}
              </Text>
              <View style={styles.camCloseBtn} />
            </View>
            <View style={styles.camBottom}>
              <TouchableOpacity
                style={styles.shutter}
                onPress={take}
                disabled={busy}
                activeOpacity={0.75}
              >
                <View style={styles.shutterInner}>
                  {busy
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <Ionicons name="camera" size={28} color={COLORS.primary} />
                  }
                </View>
              </TouchableOpacity>
              <Text style={styles.shutterHint}>
                {busy ? 'Processing…' : 'Tap to capture'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cancelWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.xl },
  cancelTitle:     { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg },
  cancelText:      { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm },
  permissionWrap:  { flex: 1, padding: SIZES.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  permissionTitle: { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg, textAlign: 'center' },
  permissionSub:   { fontSize: SIZES.fontMd, color: COLORS.gray500, marginTop: SIZES.sm, textAlign: 'center', lineHeight: 22 },
  navHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md },
  backBtn:         { width: 40, height: 40, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  navTitle:        { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900 },
  statusBanner:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: SIZES.lg, marginBottom: SIZES.md, padding: SIZES.md, borderRadius: SIZES.radiusMd, borderLeftWidth: 4, gap: SIZES.sm },
  statusText:      { fontWeight: '700', fontSize: SIZES.fontMd },
  card:            { backgroundColor: COLORS.white, marginHorizontal: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.radiusLg, marginBottom: SIZES.md, ...SHADOWS.sm },
  cardLabel:       { fontSize: SIZES.fontXs, fontWeight: '700', color: COLORS.gray500, letterSpacing: 1.2, marginBottom: SIZES.sm },
  customerRow:     { flexDirection: 'row', alignItems: 'center' },
  avatar:          { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  custName:        { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray900 },
  custPhone:       { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 2 },
  callBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  locHead:         { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.sm },
  locDot:          { width: 10, height: 10, borderRadius: 5, marginRight: SIZES.sm },
  locAddr:         { fontSize: SIZES.fontMd, color: COLORS.gray900, fontWeight: '600', lineHeight: 20 },
  locContact:      { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 4 },
  locActions:      { flexDirection: 'row', marginTop: SIZES.md, gap: SIZES.sm },
  locBtn:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radiusSm, gap: 4 },
  locBtnText:      { color: COLORS.primary, fontWeight: '600', fontSize: SIZES.fontSm },
  row:             { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowLabel:        { flex: 1, marginLeft: SIZES.sm, fontSize: SIZES.fontMd, color: COLORS.gray500 },
  rowVal:          { fontSize: SIZES.fontMd, color: COLORS.gray900, fontWeight: '600' },
  rowValHi:        { color: COLORS.primary, fontSize: SIZES.fontLg, fontWeight: '700' },
  notes:           { flexDirection: 'row', backgroundColor: COLORS.gray50, padding: SIZES.md, borderRadius: SIZES.radiusSm, marginTop: SIZES.sm, gap: 8 },
  notesText:       { flex: 1, fontSize: SIZES.fontSm, color: COLORS.gray700 },
  tlRow:           { flexDirection: 'row', minHeight: 44 },
  tlLeft:          { alignItems: 'center', width: 28 },
  tlDot:           { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center' },
  tlDotDone:       { backgroundColor: COLORS.green },
  tlDotCur:        { backgroundColor: COLORS.primary },
  tlLine:          { width: 2, flex: 1, backgroundColor: COLORS.gray200, marginVertical: 2 },
  tlLineDone:      { backgroundColor: COLORS.green },
  tlLabel:         { marginLeft: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.gray500, paddingTop: 2 },
  tlLabelDone:     { color: COLORS.gray900, fontWeight: '600' },
  photoRow:        { flexDirection: 'row', gap: SIZES.sm },
  photoBox:        { flex: 1 },
  photoImg:        { width: '100%', height: 120, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.gray100 },
  photoCap:        { fontSize: SIZES.fontXs, color: COLORS.gray500, marginTop: 4, textAlign: 'center' },
  actionBar:       { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white, paddingHorizontal: SIZES.lg, paddingTop: SIZES.md, paddingBottom: Platform.OS === 'ios' ? 30 : SIZES.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  camTop:          { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md, backgroundColor: 'rgba(0,0,0,0.5)' },
  camCloseBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  camTitle:        { color: COLORS.white, fontWeight: '600', fontSize: SIZES.fontMd, flex: 1, textAlign: 'center' },
  camBottom:       { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 50, paddingTop: SIZES.xl, backgroundColor: 'rgba(0,0,0,0.5)' },
  shutter:         { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner:    { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterHint:     { color: 'rgba(255,255,255,0.85)', marginTop: SIZES.md, fontSize: SIZES.fontSm, fontWeight: '500' },
  modalBg:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.xl, paddingBottom: 40 },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200, alignSelf: 'center', marginBottom: SIZES.lg },
  modalTitle:      { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.gray900, textAlign: 'center' },
  modalSub:        { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm, marginBottom: SIZES.lg, lineHeight: 22 },
});