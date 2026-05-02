import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { riderLogin } from '../../api';
import useAuthStore from '../../store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../theme';
import { errMsg } from '../../utils/helpers';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const { setAuth, refreshRider }   = useAuthStore();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      return Toast.show({ type: 'error', text1: 'Please fill all fields' });
    }
    setLoading(true);
    try {
      const res = await riderLogin({ identifier: identifier.trim(), password });
      const { token, rider } = res.data.data;
      await setAuth(token, rider);
      await refreshRider();
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Login failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll bg={COLORS.background}>

      {/* ── Hero ── */}
      <View style={styles.hero}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.logoBox}>
          <Ionicons name="bicycle" size={38} color={COLORS.white} />
        </View>
        <Text style={styles.brand}>Safe Delivery</Text>
        <Text style={styles.tagline}>Rider Portal — Liberia</Text>
      </View>

      {/* ── Card ── */}
      <View style={styles.card}>

        <View style={styles.titleRow}>
          <View style={styles.titleAccent} />
          <Text style={styles.title}>Welcome back</Text>
        </View>
        <Text style={styles.sub}>Sign in to start earning today</Text>

        <Input
          label="Phone or Email"
          placeholder="+231 077 123 4567"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          leftIcon={<Ionicons name="person-outline" size={18} color={COLORS.red} />}
        />
        <Input
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.red} />}
        />

        <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate('ForgotPass')}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={styles.signInBtn}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>New to Safe Delivery?</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.signUpBtn}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
          <Text style={styles.signUpText}>Create Rider Account</Text>
        </TouchableOpacity>

      </View>

      <View style={styles.footerNote}>
        <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.gray400} />
        <Text style={styles.footerNoteText}>Your data is encrypted and secure</Text>
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({

  // Hero
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
  circle1: {
    position: 'absolute', top: -40, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: COLORS.primary + '40',
  },
  circle2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary + '25',
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.md,
    ...SHADOWS.lg,
  },
  brand: {
    fontSize: SIZES.fontXxxl,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: SIZES.fontSm,
    color: COLORS.white + 'AA',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.xl,
    marginTop: -SIZES.xxl,
    marginHorizontal: SIZES.xs,
    ...SHADOWS.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  titleAccent: {
    width: 4, height: 22, borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  sub: {
    fontSize: SIZES.fontMd,
    color: COLORS.gray500,
    marginBottom: SIZES.xl,
    marginLeft: SIZES.xs,
  },

  forgot: {
    alignSelf: 'flex-end',
    marginTop: -SIZES.sm,
    marginBottom: SIZES.lg,
  },
  forgotText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '600',
  },

  signInBtn: {
    marginBottom: SIZES.lg,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  dividerLine: {
    flex: 1, height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: SIZES.fontXs,
    color: COLORS.gray400,
    fontWeight: '500',
  },

  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.primaryLight,
  },
  signUpText: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '700',
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  footerNoteText: {
    fontSize: SIZES.fontXs,
    color: COLORS.gray400,
  },
});