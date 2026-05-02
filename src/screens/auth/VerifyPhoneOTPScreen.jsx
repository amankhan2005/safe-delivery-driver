import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen   from '../../components/Screen';
import Button   from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import { riderVerifyPhoneOTP, riderResendOTP } from '../../api';
import useAuthStore from '../../store/authStore';
import { COLORS, SIZES } from '../../theme';
import { errMsg, maskPhone } from '../../utils/helpers';

export default function VerifyPhoneOTPScreen({ navigation, route }) {
  const { riderId, phone } = route.params || {};
  const [otp,       setOtp]       = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown,  setCooldown]  = useState(60);
  const { setAuth, refreshRider } = useAuthStore();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (otp.length !== 4) return Toast.show({ type: 'error', text1: 'Enter the 4-digit code' });
    setVerifying(true);
    try {
      const res = await riderVerifyPhoneOTP({ riderId, otp });
      const { token, rider } = res.data.data;
      await setAuth(token, rider);
      await refreshRider();
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Invalid OTP') });
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !phone) return;
    setResending(true);
    try {
      await riderResendOTP({ phone });
      setCooldown(60);
      Toast.show({ type: 'success', text1: 'OTP sent again' });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not resend') });
    } finally { setResending(false); }
  };

  return (
    <Screen scroll bg={COLORS.white}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: SIZES.xl }}>
        <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
      </TouchableOpacity>
      <View style={styles.iconBox}><Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.primary} /></View>
      <Text style={styles.title}>Verify Your Phone</Text>
      <Text style={styles.sub}>We sent a 4-digit code to{' '}<Text style={styles.phone}>{maskPhone(phone)}</Text></Text>
      <OTPInput value={otp} onChange={setOtp} length={4} />
      <Button title="Verify" onPress={handleVerify} loading={verifying} disabled={otp.length !== 4} size="lg" style={{ marginTop: SIZES.lg }} />
      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn't receive it? </Text>
        {cooldown > 0 ? (
          <Text style={styles.timer}>Resend in {cooldown}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={styles.link}>{resending ? 'Sending...' : 'Resend'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox:    { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: SIZES.xl },
  title:      { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, textAlign: 'center' },
  sub:        { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm, lineHeight: 22 },
  phone:      { color: COLORS.gray900, fontWeight: '700' },
  resendRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.xl },
  resendText: { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  link:       { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '700' },
  timer:      { fontSize: SIZES.fontMd, color: COLORS.gray400, fontWeight: '600' },
});
