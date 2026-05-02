import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen   from '../../components/Screen';
import Input    from '../../components/Input';
import Button   from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import { riderForgotPassword, riderResendForgotOTP, riderVerifyResetOTP } from '../../api';
import { COLORS, SIZES } from '../../theme';
import { errMsg } from '../../utils/helpers';

export default function ForgotPasswordScreen({ navigation }) {
  const [step,      setStep]      = useState(1);
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!phone.trim()) return Toast.show({ type: 'error', text1: 'Enter your phone number' });
    setLoading(true);
    try {
      await riderForgotPassword({ phone: phone.trim() });
      setStep(2); setCooldown(60);
      Toast.show({ type: 'success', text1: 'OTP sent' });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not send OTP') });
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) return Toast.show({ type: 'error', text1: 'Enter the 4-digit code' });
    setLoading(true);
    try {
      const res = await riderVerifyResetOTP({ phone: phone.trim(), otp });
      const resetToken = res?.data?.data?.resetToken;
      if (!resetToken) throw new Error('No reset token');
      navigation.navigate('ResetPass', { resetToken });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Invalid OTP') });
    } finally { setLoading(false); }
  };

  return (
    <Screen scroll bg={COLORS.white}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: SIZES.lg }}>
        <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
      </TouchableOpacity>
      <View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} /></View>
      <Text style={styles.title}>{step === 1 ? 'Forgot Password' : 'Verify Code'}</Text>
      <Text style={styles.sub}>{step === 1 ? "Enter your phone number and we'll send a code." : `Enter the code sent to ${phone}.`}</Text>

      {step === 1 && (
        <>
          <Input label="Phone Number" placeholder="+231 077 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" leftIcon={<Ionicons name="call-outline" size={18} color={COLORS.gray400} />} style={{ marginTop: SIZES.lg }} />
          <Button title="Send Code" onPress={sendOtp} loading={loading} size="lg" />
        </>
      )}
      {step === 2 && (
        <>
          <OTPInput value={otp} onChange={setOtp} length={4} />
          <Button title="Verify Code" onPress={verifyOtp} loading={loading} disabled={otp.length !== 4} size="lg" />
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't get it? </Text>
            {cooldown > 0 ? (
              <Text style={styles.timer}>Resend in {cooldown}s</Text>
            ) : (
              <TouchableOpacity onPress={async () => { setResending(true); try { await riderResendForgotOTP({ phone: phone.trim() }); setCooldown(60); Toast.show({ type: 'success', text1: 'OTP sent again' }); } catch (e) { Toast.show({ type: 'error', text1: errMsg(e) }); } finally { setResending(false); } }} disabled={resending}>
                <Text style={styles.link}>{resending ? 'Sending...' : 'Resend'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox:    { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: SIZES.lg },
  title:      { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, textAlign: 'center' },
  sub:        { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm, lineHeight: 22, marginBottom: SIZES.lg },
  resendRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.xl },
  resendText: { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  link:       { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '700' },
  timer:      { fontSize: SIZES.fontMd, color: COLORS.gray400, fontWeight: '600' },
});
