import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen  from '../../components/Screen';
import Input   from '../../components/Input';
import Button  from '../../components/Button';
import OTPInput from '../../components/OTPInput';
import { riderForgotPassword, riderResendForgotOTP, riderVerifyResetOTP } from '../../api';
import { COLORS, SIZES, SHADOWS } from '../../theme';
import { errMsg } from '../../utils/helpers';

export default function ForgotPasswordScreen({ navigation }) {
  const [step,      setStep]     = useState(1);
  const [email,     setEmail]    = useState('');
  const [otp,       setOtp]      = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading,   setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown,  setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleSend = async () => {
    if (!email.trim()) return Toast.show({ type: 'error', text1: 'Enter your email address' });
    setLoading(true);
    try {
      await riderForgotPassword({ email: email.trim().toLowerCase() });
      setCooldown(60);
      setStep(2);
      Toast.show({ type: 'success', text1: 'OTP sent to your email' });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Failed to send OTP') });
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length !== 4) return Toast.show({ type: 'error', text1: 'Enter 4-digit OTP' });
    setLoading(true);
    try {
      const res = await riderVerifyResetOTP({ email: email.trim().toLowerCase(), otp });
      setResetToken(res.data.data.resetToken);
      setStep(3);
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Invalid OTP') });
    } finally { setLoading(false); }
  };

  return (
    <Screen scroll bg={COLORS.background}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Forgot Password</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.iconBox}>
        <Ionicons name="mail-outline" size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{step === 1 ? 'Reset Password' : step === 2 ? 'Enter OTP' : 'New Password'}</Text>
      <Text style={styles.sub}>
        {step === 1 ? "Enter your email address and we'll send a reset code."
          : step === 2 ? `Enter the code sent to ${email}.`
          : 'Set your new password below.'}
      </Text>

      {step === 1 && (
        <View style={styles.card}>
          <Input label="Email Address" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.gray400} />} style={{ marginTop: SIZES.lg }} />
          <Button title="Send OTP" onPress={handleSend} loading={loading} size="lg" style={{ marginTop: SIZES.xl }} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <OTPInput value={otp} onChange={setOtp} length={4} />
          <Button title="Verify OTP" onPress={handleVerify} loading={loading} disabled={otp.length !== 4} size="lg" style={{ marginTop: SIZES.xl }} />
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            {cooldown > 0
              ? <Text style={styles.timer}>Resend in {cooldown}s</Text>
              : (
                <TouchableOpacity onPress={async () => {
                  setResending(true);
                  try {
                    await riderResendForgotOTP({ email: email.trim().toLowerCase() });
                    setCooldown(60);
                    Toast.show({ type: 'success', text1: 'OTP sent again' });
                  } catch (e) {
                    Toast.show({ type: 'error', text1: errMsg(e) });
                  } finally { setResending(false); }
                }} disabled={resending}>
                  <Text style={styles.link}>{resending ? 'Sending...' : 'Resend'}</Text>
                </TouchableOpacity>
              )
            }
          </View>
        </View>
      )}

      {step === 3 && (
        <ResetStep resetToken={resetToken} navigation={navigation} />
      )}
    </Screen>
  );
}

function ResetStep({ resetToken, navigation }) {
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const { riderResetPassword } = require('../../api');

  const handleReset = async () => {
    if (newPass.length < 6) return Toast.show({ type: 'error', text1: 'Password must be 6+ characters' });
    if (newPass !== confirm)  return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    setLoading(true);
    try {
      await riderResetPassword({ resetToken, newPassword: newPass });
      Toast.show({ type: 'success', text1: 'Password reset! Please login.' });
      navigation.navigate('Login');
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Reset failed') });
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.card}>
      <Input label="New Password" placeholder="At least 6 characters" value={newPass} onChangeText={setNewPass} secureTextEntry leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray400} />} style={{ marginTop: SIZES.lg }} />
      <Input label="Confirm Password" placeholder="Re-enter password" value={confirm} onChangeText={setConfirm} secureTextEntry leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={COLORS.gray400} />} />
      <Button title="Reset Password" onPress={handleReset} loading={loading} size="lg" style={{ marginTop: SIZES.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.lg },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  topBarTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray700 },
  iconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SIZES.md, ...SHADOWS.sm },
  title: { fontSize: SIZES.fontXxl, fontWeight: '800', color: COLORS.gray900, textAlign: 'center' },
  sub: { fontSize: SIZES.fontMd, color: COLORS.gray500, marginTop: 4, textAlign: 'center', lineHeight: 22, marginBottom: SIZES.xl },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusXl, padding: SIZES.lg, ...SHADOWS.sm },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.lg },
  resendLabel: { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  link: { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '700' },
  timer: { fontSize: SIZES.fontMd, color: COLORS.gray400, fontWeight: '600' },
});