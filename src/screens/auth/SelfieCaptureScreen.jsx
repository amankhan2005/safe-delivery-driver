import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Button from '../../components/Button';
import { COLORS, SIZES } from '../../theme';
import { riderSignup } from '../../api';
import { assetToFile, errMsg } from '../../utils/helpers';

export default function SelfieCaptureScreen({ navigation, route }) {
  const { signupData } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [photo,      setPhoto]      = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <View style={styles.permIcon}><Ionicons name="camera-outline" size={56} color={COLORS.primary} /></View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>We need a live selfie to verify your identity.</Text>
        <Button title="Allow Camera" onPress={requestPermission} size="lg" style={{ marginTop: SIZES.xl, alignSelf: 'stretch' }} />
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhoto(result);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not capture photo' });
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!photo) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name',     signupData.name);
      fd.append('phone',    signupData.phone);
      fd.append('email',    signupData.email);
      fd.append('password', signupData.password);
      fd.append('selfie',   assetToFile(photo, 'selfie'));

      // Backend stores temporarily + sends email OTP — does NOT create rider yet
      await riderSignup(fd);

      Toast.show({ type: 'success', text1: 'Verification required!', text2: 'Check email or verify via phone' });

      // No riderId returned — pass phone + email only
      navigation.navigate('VerifyPhone', {
        phone: signupData.phone,
        email: signupData.email,
        name:  signupData.name,
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Signup failed') });
    } finally { setSubmitting(false); }
  };

  if (photo) {
    return (
      <View style={styles.previewWrap}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setPhoto(null)} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Looks good?</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.previewBody}>
          <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="cover" />
          <Text style={styles.previewHint}>Make sure your face is clearly visible.</Text>
        </View>
        <View style={styles.previewActions}>
          <Button title="Retake" variant="outline" size="lg" onPress={() => setPhoto(null)} disabled={submitting} style={{ flex: 1, marginRight: SIZES.sm }} />
          <Button title="Use Photo" size="lg" loading={submitting} onPress={submit} style={{ flex: 1, marginLeft: SIZES.sm }} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take a Selfie</Text>
        <View style={styles.iconBtn} />
      </View>
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={styles.frame} />
        <Text style={styles.frameHint}>Position your face inside the oval</Text>
      </View>
      <View style={styles.bottomBar}>
        <View style={{ width: 60 }} />
        <TouchableOpacity style={styles.shutter} onPress={takePhoto} disabled={busy}>
          <View style={styles.shutterInner}>{busy && <ActivityIndicator color={COLORS.primary} />}</View>
        </TouchableOpacity>
        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  permWrap:    { flex: 1, padding: SIZES.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  permIcon:    { width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.lg },
  permTitle:   { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.sm },
  permText:    { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', lineHeight: 22 },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md, backgroundColor: 'rgba(0,0,0,0.4)' },
  iconBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: SIZES.fontLg, fontWeight: '700' },
  frameWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame:       { width: 240, height: 300, borderRadius: 120, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', borderStyle: 'dashed' },
  frameHint:   { color: COLORS.white, fontSize: SIZES.fontMd, marginTop: SIZES.lg, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: SIZES.md, paddingVertical: 6, borderRadius: SIZES.radiusSm },
  bottomBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.xxl, paddingBottom: 48, paddingTop: SIZES.xl, backgroundColor: 'rgba(0,0,0,0.4)' },
  shutter:     { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner:{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  previewWrap: { flex: 1, backgroundColor: '#111' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingTop: 50, paddingBottom: SIZES.md },
  previewBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SIZES.lg },
  previewImage:{ width: 280, height: 340, borderRadius: 24, borderWidth: 3, borderColor: COLORS.white },
  previewHint: { color: COLORS.gray300, fontSize: SIZES.fontMd, marginTop: SIZES.xl, textAlign: 'center' },
  previewActions: { flexDirection: 'row', paddingHorizontal: SIZES.lg, paddingBottom: 40 },
});