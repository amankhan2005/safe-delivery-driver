import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Image, Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOrderById, uploadPickupPhoto, startTransit, uploadDropPhoto, verifyDeliveryOTP } from '../../api';
import useOrderStore from '../../store/orderStore';
import Button   from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import { fmtCurrency, fmtStatus, statusColor, errMsg, assetToFile } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const TIMELINE = ['assigned', 'picked_up', 'in_transit', 'delivered'];
const TIMELINE_LABELS = {
  assigned:   'Heading to Pickup',
  picked_up:  'Parcel Picked Up',
  in_transit: 'On the Way',
  delivered:  'Delivered',
};

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
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const res = await getOrderById(orderId);
      const fresh = res?.data?.data?.order;
      if (fresh) {
        setOrder(fresh);
        if (['assigned', 'picked_up', 'in_transit'].includes(fresh.status)) setActiveOrder(fresh);
        else clearActiveOrder();
      }
    } catch (e) {
      if (!silent) Toast.show({ type: 'error', text1: errMsg(e, 'Could not load order') });
    } finally { setLoading(false); }
  }, [orderId, setActiveOrder, clearActiveOrder]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const onPhotoTaken = async (asset) => {
    setCameraOpen(false);
    if (!asset) return;
    setActionBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', assetToFile(asset, cameraMode));
      if (cameraMode === 'pickup') {
        await uploadPickupPhoto(orderId, fd);
        Toast.show({ type: 'success', text1: 'Pickup confirmed!' });
      } else {
        await uploadDropPhoto(orderId, fd);
        Toast.show({ type: 'success', text1: 'Drop photo saved' });
      }
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Upload failed') });
    } finally { setActionBusy(false); setCameraMode(null); }
  };

  const handleStartTransit = async () => {
    setActionBusy(true);
    try {
      await startTransit(orderId);
      Toast.show({ type: 'success', text1: 'Transit started' });
      await load();
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally { setActionBusy(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) return Toast.show({ type: 'error', text1: 'Enter the 4-digit code' });
    setActionBusy(true);
    try {
      await verifyDeliveryOTP(orderId, { otp });
      Toast.show({ type: 'success', text1: 'Delivered! Payment collected.' });
      setOtpOpen(false); setOtp('');
      await load();
      setTimeout(() => { clearActiveOrder(); navigation.navigate('Tabs'); }, 1500);
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Invalid OTP') });
    } finally { setActionBusy(false); }
  };

  const call  = (phone) => { if (phone) Linking.openURL(`tel:${phone}`).catch(() => {}); };
  const openMap = (lat, lng, label) => {
    if (!lat || !lng) return;
    const url = Platform.select({
      ios:     `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
    });
    Linking.openURL(url).catch(() => Toast.show({ type: 'error', text1: 'Cannot open maps' }));
  };

  if (loading || !order) {
    return <SafeAreaView style={styles.center} edges={['top']}><ActivityIndicator color={COLORS.primary} size="large" /></SafeAreaView>;
  }

  if (order.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.cancelWrap} edges={['top']}>
        <Ionicons name="close-circle" size={56} color={COLORS.red} />
        <Text style={styles.cancelTitle}>Order Cancelled</Text>
        <Text style={styles.cancelText}>{order.cancellationReason || 'The customer cancelled this order.'}</Text>
        <Button title="Back to Home" onPress={() => { clearActiveOrder(); navigation.navigate('Tabs'); }} size="lg" style={{ alignSelf: 'stretch', marginTop: SIZES.xl }} />
      </SafeAreaView>
    );
  }

  const color     = statusColor(order.status);
  const stepIndex = TIMELINE.indexOf(order.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('Tabs')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Active Delivery</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: color + '14', borderLeftColor: color }]}>
          <Ionicons name="navigate" size={18} color={color} />
          <Text style={[styles.statusText, { color }]}>{fmtStatus(order.status)}</Text>
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CUSTOMER</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatar}><Ionicons name="person" size={20} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{order.customerId?.name || 'Customer'}</Text>
              <Text style={styles.custPhone}>{order.customerId?.phone || ''}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => call(order.customerId?.phone)}>
              <Ionicons name="call" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pickup */}
        <LocationCard label="PICKUP" dot={COLORS.green} address={order.pickup?.address}
          contact={order.pickup?.contactName} phone={order.pickup?.contactPhone}
          onCall={() => call(order.pickup?.contactPhone)}
          onNav={() => openMap(order.pickup?.lat, order.pickup?.lng, 'Pickup')} />

        {/* Drop */}
        <LocationCard label="DROP" dot={COLORS.red} address={order.drop?.address}
          contact={order.drop?.contactName} phone={order.drop?.contactPhone}
          onCall={() => call(order.drop?.contactPhone)}
          onNav={() => openMap(order.drop?.lat, order.drop?.lng, 'Drop')} />

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ORDER</Text>
          <Row icon="cube-outline"   label="Weight"   value={order.parcelWeight} />
          <Row icon="map-outline"    label="Distance" value={`${order.distanceMiles?.toFixed(1)} miles`} />
          <Row icon="cash-outline"   label="Fare"     value={fmtCurrency(order.fare)} hi />
          {order.notes ? <View style={styles.notes}><Ionicons name="document-text-outline" size={14} color={COLORS.gray500} /><Text style={styles.notesText}>{order.notes}</Text></View> : null}
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROGRESS</Text>
          {TIMELINE.map((s, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex && order.status !== 'delivered';
            return (
              <View key={s} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCur]}>
                    {done && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                  {i < TIMELINE.length - 1 && <View style={[styles.tlLine, done && styles.tlLineDone]} />}
                </View>
                <Text style={[styles.tlLabel, done && styles.tlLabelDone]}>{TIMELINE_LABELS[s]}</Text>
              </View>
            );
          })}
        </View>

        {/* Photos */}
        {(order.pickupPhoto?.url || order.dropPhoto?.url) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PROOF PHOTOS</Text>
            <View style={styles.photoRow}>
              {order.pickupPhoto?.url ? <PhotoBox uri={order.pickupPhoto.url} cap="Pickup" /> : null}
              {order.dropPhoto?.url   ? <PhotoBox uri={order.dropPhoto.url}   cap="Drop"   /> : null}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        {order.status === 'assigned' && (
          <Button title="I've Picked Up the Parcel" onPress={() => { setCameraMode('pickup'); setCameraOpen(true); }} size="lg" loading={actionBusy} icon={<Ionicons name="camera" size={18} color={COLORS.white} />} />
        )}
        {order.status === 'picked_up' && (
          <Button title="Start Delivery" onPress={handleStartTransit} size="lg" loading={actionBusy} icon={<Ionicons name="navigate" size={18} color={COLORS.white} />} />
        )}
        {order.status === 'in_transit' && !order.dropPhoto?.url && (
          <Button title="Reached — Take Drop Photo" onPress={() => { setCameraMode('drop'); setCameraOpen(true); }} size="lg" loading={actionBusy} icon={<Ionicons name="camera" size={18} color={COLORS.white} />} />
        )}
        {order.status === 'in_transit' && order.dropPhoto?.url && (
          <Button title="Enter Delivery OTP" onPress={() => setOtpOpen(true)} size="lg" variant="success" loading={actionBusy} icon={<Ionicons name="keypad" size={18} color={COLORS.white} />} />
        )}
        {order.status === 'delivered' && (
          <Button title="Back to Home" onPress={() => { clearActiveOrder(); navigation.navigate('Tabs'); }} size="lg" variant="success" icon={<Ionicons name="checkmark-circle" size={18} color={COLORS.white} />} />
        )}
      </View>

      {/* Camera modal */}
      <CameraModal visible={cameraOpen} mode={cameraMode} onClose={() => setCameraOpen(false)} onCapture={onPhotoTaken} />

      {/* OTP modal */}
      <Modal visible={otpOpen} transparent animationType="slide" onRequestClose={() => setOtpOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Delivery Code</Text>
            <Text style={styles.modalSub}>Ask the customer for the 4-digit code in their app.</Text>
            <OTPInput value={otp} onChange={setOtp} length={4} />
            <Button title="Confirm Delivery" onPress={handleVerifyOTP} loading={actionBusy} disabled={otp.length !== 4} size="lg" variant="success" />
            <Button title="Cancel" onPress={() => { setOtpOpen(false); setOtp(''); }} variant="ghost" size="md" style={{ marginTop: SIZES.sm }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LocationCard({ label, dot, address, contact, phone, onCall, onNav }) {
  return (
    <View style={styles.card}>
      <View style={styles.locHead}><View style={[styles.locDot, { backgroundColor: dot }]} /><Text style={styles.cardLabel}>{label}</Text></View>
      <Text style={styles.locAddr}>{address}</Text>
      {contact ? <Text style={styles.locContact}>{contact}{phone ? ` \u00b7 ${phone}` : ''}</Text> : null}
      <View style={styles.locActions}>
        <TouchableOpacity style={styles.locBtn} onPress={onNav}><Ionicons name="navigate-outline" size={16} color={COLORS.primary} /><Text style={styles.locBtnText}>Navigate</Text></TouchableOpacity>
        {phone ? <TouchableOpacity style={styles.locBtn} onPress={onCall}><Ionicons name="call-outline" size={16} color={COLORS.primary} /><Text style={styles.locBtnText}>Call</Text></TouchableOpacity> : null}
      </View>
    </View>
  );
}

function Row({ icon, label, value, hi }) {
  return (
    <View style={styles.row}><Ionicons name={icon} size={16} color={COLORS.gray500} /><Text style={styles.rowLabel}>{label}</Text><Text style={[styles.rowVal, hi && styles.rowValHi]}>{value}</Text></View>
  );
}

function PhotoBox({ uri, cap }) {
  return (
    <View style={styles.photoBox}>
      <Image source={{ uri }} style={styles.photoImg} />
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
      const result = await camRef.current.takePictureAsync({ quality: 0.7 });
      onCapture(result);
    } catch { Toast.show({ type: 'error', text1: 'Could not take photo' }); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!permission ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
        ) : !permission.granted ? (
          <View style={{ flex: 1, padding: SIZES.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white }}>
            <Ionicons name="camera-outline" size={56} color={COLORS.primary} />
            <Text style={{ fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg }}>Camera permission needed</Text>
            <Button title="Allow Camera" onPress={requestPermission} size="lg" style={{ marginTop: SIZES.lg }} />
            <Button title="Cancel" onPress={onClose} variant="ghost" size="md" style={{ marginTop: SIZES.sm }} />
          </View>
        ) : (
          <>
            <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
            <View style={styles.camTop}>
              <TouchableOpacity onPress={onClose} style={styles.camCloseBtn} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.camTitle}>{mode === 'pickup' ? 'Photo of the Parcel' : 'Photo at Drop Location'}</Text>
              <View style={styles.camCloseBtn} />
            </View>
            <View style={styles.camBottom}>
              <TouchableOpacity style={styles.shutter} onPress={take} disabled={busy} activeOpacity={0.7}>
                <View style={styles.shutterInner}>{busy && <ActivityIndicator color={COLORS.primary} />}</View>
              </TouchableOpacity>
              <Text style={styles.shutterHint}>Tap to capture</Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  cancelWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.xl, backgroundColor: COLORS.background },
  cancelTitle: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg },
  cancelText:  { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm },

  navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md },
  backBtn:   { width: 40, height: 40, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  navTitle:  { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SIZES.lg, marginBottom: SIZES.md, padding: SIZES.md, borderRadius: SIZES.radiusMd, borderLeftWidth: 4 },
  statusText:   { marginLeft: SIZES.sm, fontWeight: '700', fontSize: SIZES.fontMd },

  card:        { backgroundColor: COLORS.white, marginHorizontal: SIZES.lg, padding: SIZES.lg, borderRadius: SIZES.radiusLg, marginBottom: SIZES.md, ...SHADOWS.sm },
  cardLabel:   { fontSize: SIZES.fontXs, fontWeight: '700', color: COLORS.gray500, letterSpacing: 1.2, marginBottom: SIZES.sm },

  customerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  custName:    { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray900 },
  custPhone:   { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 2 },
  callBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },

  locHead:     { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.sm },
  locDot:      { width: 10, height: 10, borderRadius: 5, marginRight: SIZES.sm },
  locAddr:     { fontSize: SIZES.fontMd, color: COLORS.gray900, fontWeight: '600' },
  locContact:  { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 4 },
  locActions:  { flexDirection: 'row', marginTop: SIZES.md },
  locBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radiusSm, marginRight: SIZES.sm },
  locBtnText:  { color: COLORS.primary, fontWeight: '600', marginLeft: 4, fontSize: SIZES.fontSm },

  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowLabel:    { flex: 1, marginLeft: SIZES.sm, fontSize: SIZES.fontMd, color: COLORS.gray500 },
  rowVal:      { fontSize: SIZES.fontMd, color: COLORS.gray900, fontWeight: '600' },
  rowValHi:    { color: COLORS.primary, fontSize: SIZES.fontLg, fontWeight: '700' },
  notes:       { flexDirection: 'row', backgroundColor: COLORS.gray50, padding: SIZES.md, borderRadius: SIZES.radiusSm, marginTop: SIZES.sm },
  notesText:   { flex: 1, marginLeft: 8, fontSize: SIZES.fontSm, color: COLORS.gray700 },

  tlRow:       { flexDirection: 'row', minHeight: 44 },
  tlLeft:      { alignItems: 'center', width: 28 },
  tlDot:       { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center' },
  tlDotDone:   { backgroundColor: COLORS.green },
  tlDotCur:    { backgroundColor: COLORS.primary },
  tlLine:      { width: 2, flex: 1, backgroundColor: COLORS.gray200, marginVertical: 2 },
  tlLineDone:  { backgroundColor: COLORS.green },
  tlLabel:     { marginLeft: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.gray500, paddingTop: 2 },
  tlLabelDone: { color: COLORS.gray900, fontWeight: '600' },

  photoRow:  { flexDirection: 'row' },
  photoBox:  { flex: 1, marginRight: SIZES.sm },
  photoImg:  { width: '100%', height: 120, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.gray100 },
  photoCap:  { fontSize: SIZES.fontXs, color: COLORS.gray500, marginTop: 4, textAlign: 'center' },

  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white, paddingHorizontal: SIZES.lg, paddingTop: SIZES.md, paddingBottom: Platform.OS === 'ios' ? 30 : SIZES.lg, borderTopWidth: 1, borderTopColor: COLORS.border },

  camTop:       { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md, backgroundColor: 'rgba(0,0,0,0.4)' },
  camCloseBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  camTitle:     { color: COLORS.white, fontWeight: '700', fontSize: SIZES.fontMd },
  camBottom:    { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 50, paddingTop: SIZES.xl, backgroundColor: 'rgba(0,0,0,0.4)' },
  shutter:      { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterHint:  { color: COLORS.white, marginTop: SIZES.md, fontSize: SIZES.fontSm },

  modalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.xl, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200, alignSelf: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.gray900, textAlign: 'center' },
  modalSub:   { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm },
});
