import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { riderLogin } from '../../api';
import useAuthStore from '../../store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const RETRY_MESSAGES = [
  { icon: '🔌', text: 'Connecting to server…' },
  { icon: '⏳', text: 'Server is waking up, please wait…' },
  { icon: '🔄', text: 'Almost there, just a moment…' },
  { icon: '💤', text: 'Still connecting, please be patient…' },
];

const getFriendlyError = (e) => {
  if (e?.code === 'ECONNABORTED' || !e?.response) {
    return { icon: '📡', title: 'Connection Timeout', sub: 'Server is waking up. Tap Retry in a moment.', retry: true };
  }
  const status = e?.response?.status;
  const msg    = e?.response?.data?.error || e?.response?.data?.message || '';

  if (status === 401 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
    return { icon: '🔑', title: 'Wrong Credentials', sub: 'Phone/email or password is incorrect. Please check and try again.', retry: false };
  }
  if (status === 404 || msg.toLowerCase().includes('not found')) {
    return { icon: '👤', title: 'Account Not Found', sub: 'No rider account with this phone or email. Please sign up.', retry: false };
  }
  if (status === 403) {
    return { icon: '⚠️', title: 'Account Issue', sub: msg || 'Your account may be pending approval or not verified.', retry: false };
  }
  if (status === 429) {
    return { icon: '🚫', title: 'Too Many Attempts', sub: 'Please wait a few minutes before trying again.', retry: false };
  }
  if (status >= 500) {
    return { icon: '🛠️', title: 'Server Error', sub: 'Something went wrong on our end. Please try again.', retry: true };
  }
  return { icon: '❌', title: 'Login Failed', sub: msg || 'Something went wrong. Please try again.', retry: true };
};

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [retryIdx,   setRetryIdx]   = useState(0);
  const [showPw,     setShowPw]     = useState(false);
  const [errorBox,   setErrorBox]   = useState(null);

  const { setAuth, refreshRider } = useAuthStore();
  const retryRef = useRef(null);

  const startRetryMessages = () => {
    setRetryIdx(0);
    retryRef.current = setInterval(() => {
      setRetryIdx((i) => Math.min(i + 1, RETRY_MESSAGES.length - 1));
    }, 5000);
  };

  const stopRetryMessages = () => {
    if (retryRef.current) { clearInterval(retryRef.current); retryRef.current = null; }
    setRetryIdx(0);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorBox({ icon: '📝', title: 'Fields Required', sub: 'Please enter your phone/email and password.', retry: false });
      return;
    }
    if (loading) return;

    setErrorBox(null);
    setLoading(true);
    startRetryMessages();

    try {
      const res = await riderLogin({ identifier: identifier.trim(), password });
      const { token, rider } = res.data.data;
      stopRetryMessages();
      setErrorBox(null);
      await setAuth(token, rider);
      await refreshRider();
      Toast.show({ type: 'success', text1: `✅ Welcome back, ${rider?.name?.split(' ')[0]}!` });
    } catch (e) {
      stopRetryMessages();
      setErrorBox(getFriendlyError(e));
    } finally {
      setLoading(false);
      stopRetryMessages();
    }
  };

  const currentMsg = RETRY_MESSAGES[retryIdx];

  return (
    <Screen scroll bg={COLORS.background}>

      {/* ── Hero ── */}
      <View style={S.hero}>
        <View style={S.circle1} />
        <View style={S.circle2} />
        <View style={S.logoBox}>
          <Ionicons name="bicycle" size={38} color={COLORS.white} />
        </View>
        <Text style={S.brand}>Safe Delivery</Text>
        <Text style={S.tagline}>Rider Portal — Liberia</Text>
      </View>

      {/* ── Card ── */}
      <View style={S.card}>
        <View style={S.titleRow}>
          <View style={S.titleAccent} />
          <Text style={S.title}>Welcome back</Text>
        </View>
        <Text style={S.sub}>Sign in to start earning today</Text>

        <Input
          label="Phone or Email"
          placeholder="+231 077 123 4567"
          value={identifier}
          onChangeText={(v) => { setIdentifier(v); setErrorBox(null); }}
          keyboardType="email-address"
          leftIcon={<Ionicons name="person-outline" size={18} color={COLORS.red} />}
          editable={!loading}
        />
        <Input
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={(v) => { setPassword(v); setErrorBox(null); }}
          secureTextEntry={!showPw}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.red} />}
          rightIcon={<Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.gray400} />}
          onRightIconPress={() => setShowPw(!showPw)}
          editable={!loading}
        />

        <TouchableOpacity style={S.forgot} onPress={() => navigation.navigate('ForgotPass')} disabled={loading}>
          <Text style={S.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Connecting / wakeup status */}
        {loading ? (
          <View style={S.statusBox}>
            <Text style={S.statusIcon}>{currentMsg.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.statusText}>{currentMsg.text}</Text>
              {retryIdx >= 1 ? (
                <Text style={S.statusHint}>This happens when server is starting up</Text>
              ) : null}
            </View>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : null}

        {/* Error box */}
        {!loading && errorBox ? (
          <View style={[S.errorBox, errorBox.retry && S.errorBoxWarn]}>
            <Text style={S.errorIcon}>{errorBox.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.errorTitle}>{errorBox.title}</Text>
              <Text style={S.errorSub}>{errorBox.sub}</Text>
            </View>
            {errorBox.retry ? (
              <TouchableOpacity onPress={handleLogin} style={S.retryBtn}>
                <Ionicons name="refresh-outline" size={13} color="#fff" />
                <Text style={S.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Button
          title={loading ? 'Signing in…' : 'Sign In'}
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={S.signInBtn}
        />

        <View style={S.dividerRow}>
          <View style={S.dividerLine} />
          <Text style={S.dividerText}>New to Safe Delivery?</Text>
          <View style={S.dividerLine} />
        </View>

        <TouchableOpacity style={S.signUpBtn} onPress={() => navigation.navigate('Signup')} activeOpacity={0.85} disabled={loading}>
          <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
          <Text style={S.signUpText}>Create Rider Account</Text>
        </TouchableOpacity>
      </View>

      <View style={S.footerNote}>
        <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.gray400} />
        <Text style={S.footerNoteText}>Your data is encrypted and secure</Text>
      </View>

    </Screen>
  );
}

const S = StyleSheet.create({
  hero: {
    backgroundColor: COLORS.primaryDark,
    marginHorizontal: -SIZES.lg,
    marginTop: -SIZES.lg,
    paddingTop: SIZES.xxxl + SIZES.lg,
    paddingBottom: SIZES.xxxl + SIZES.md,
    paddingHorizontal: SIZES.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1:  { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.primary + '40' },
  circle2:  { position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.primary + '25' },
  logoBox:  { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md, ...SHADOWS.lg },
  brand:    { fontSize: SIZES.fontXxxl, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  tagline:  { fontSize: SIZES.fontSm, color: COLORS.white + 'AA', marginTop: 4 },

  card:        { backgroundColor: COLORS.white, borderRadius: SIZES.radiusXl, padding: SIZES.xl, marginTop: -SIZES.xxl, marginHorizontal: SIZES.xs, ...SHADOWS.lg },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.xs, marginTop: SIZES.sm },
  titleAccent: { width: 4, height: 22, borderRadius: 2, backgroundColor: COLORS.primary },
  title:       { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900 },
  sub:         { fontSize: SIZES.fontMd, color: COLORS.gray500, marginBottom: SIZES.xl, marginLeft: SIZES.xs },
  forgot:      { alignSelf: 'flex-end', marginTop: -SIZES.sm, marginBottom: SIZES.lg },
  forgotText:  { fontSize: SIZES.fontSm, color: COLORS.primary, fontWeight: '600' },

  // Connecting status
  statusBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: SIZES.md, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: SIZES.sm },
  statusIcon: { fontSize: 20 },
  statusText: { fontSize: SIZES.fontSm, color: '#1E40AF', fontWeight: '600' },
  statusHint: { fontSize: SIZES.fontXs, color: '#3B82F6', marginTop: 2 },

  // Error box
  errorBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: SIZES.md, borderWidth: 1, borderColor: '#FECACA', marginBottom: SIZES.sm },
  errorBoxWarn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  errorIcon:    { fontSize: 20 },
  errorTitle:   { fontSize: SIZES.fontSm, fontWeight: '800', color: '#991B1B', marginBottom: 2 },
  errorSub:     { fontSize: SIZES.fontXs, color: '#B91C1C', lineHeight: 16 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 2 },
  retryBtnText: { fontSize: SIZES.fontXs, color: '#fff', fontWeight: '700' },

  signInBtn:      { marginBottom: SIZES.lg },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.lg },
  dividerLine:    { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText:    { fontSize: SIZES.fontXs, color: COLORS.gray400, fontWeight: '500' },
  signUpBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.sm, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: SIZES.radiusMd, paddingVertical: SIZES.md, backgroundColor: COLORS.primaryLight },
  signUpText:     { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '700' },
  footerNote:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: SIZES.lg, marginBottom: SIZES.sm },
  footerNoteText: { fontSize: SIZES.fontXs, color: COLORS.gray400 },
});