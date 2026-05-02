import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { COLORS, SIZES, SHADOWS } from '../../theme';
import { isValidEmail } from '../../utils/helpers';

export default function SignupScreen({ navigation }) {
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  const handleNext = () => {
    if (!name.trim())          return Toast.show({ type: 'error', text1: 'Enter your full name' });
    if (!phone.trim())         return Toast.show({ type: 'error', text1: 'Enter your phone number' });
    if (!isValidEmail(email))  return Toast.show({ type: 'error', text1: 'Enter a valid email' });
    if (password.length < 6)   return Toast.show({ type: 'error', text1: 'Password must be 6+ characters' });
    if (password !== confirm)  return Toast.show({ type: 'error', text1: 'Passwords do not match' });

    navigation.navigate('Terms', {
      signupData: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
      },
    });
  };

  return (
    <Screen scroll bg={COLORS.background}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Create Account</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="person-add-outline" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Become a Rider</Text>
        <Text style={styles.sub}>Join Safe Delivery and start earning</Text>
      </View>

      {/* ── Progress ── */}
      <View style={styles.progressWrap}>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepDot, step === 1 && styles.stepDotActive]}>
                {step === 1
                  ? <Ionicons name="checkmark" size={10} color={COLORS.white} />
                  : <Text style={styles.stepNum}>{step}</Text>
                }
              </View>
              {step < 5 && <View style={[styles.stepLine, step < 1 && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 1 of 5 — Your details</Text>
      </View>

      {/* ── Form Card ── */}
      <View style={styles.card}>

        <View style={styles.sectionLabel}>
          <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
          <Text style={styles.sectionLabelText}>Personal Information</Text>
        </View>

        <Input
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          leftIcon={<Ionicons name="person-outline" size={18} color={COLORS.red} />}
        />
        <Input
          label="Phone Number"
          placeholder="+231 077 123 4567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Ionicons name="call-outline" size={18} color={COLORS.red} />}
        />
        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.red} />}
        />

        <View style={styles.divider} />

        <View style={styles.sectionLabel}>
          <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} />
          <Text style={styles.sectionLabelText}>Security</Text>
        </View>

        <Input
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.red} />}
        />
        <Input
          label="Confirm Password"
          placeholder="Re-enter password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={COLORS.red} />}
        />

      </View>

      {/* ── Info note ── */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
        <Text style={styles.infoNoteText}>
          You will review Terms and Conditions before proceeding to the next step.
        </Text>
      </View>

      {/* ── CTA ── */}
      <Button
        title="Continue to Terms"
        onPress={handleNext}
        size="lg"
        icon={<Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
        style={styles.ctaBtn}
      />

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already a rider? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  topBarTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.gray700,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  iconBox: {
    width: 64, height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.md,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  sub: {
    fontSize: SIZES.fontMd,
    color: COLORS.gray500,
    marginTop: 4,
  },

  // Progress
  progressWrap: {
    marginBottom: SIZES.xl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray400,
  },
  stepLine: {
    flex: 1, height: 2,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 2,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    ...SHADOWS.sm,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginBottom: SIZES.md,
  },
  sectionLabelText: {
    fontSize: SIZES.fontXs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.lg,
  },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.xs,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  infoNoteText: {
    flex: 1,
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
    lineHeight: 17,
    fontWeight: '500',
  },

  // CTA
  ctaBtn: {
    marginBottom: SIZES.md,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  footerText: { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  link:       { fontSize: SIZES.fontMd, color: COLORS.primary, fontWeight: '600' },
});