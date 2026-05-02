import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import Screen from '../../components/Screen';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { riderResetPassword } from '../../api';
import { COLORS, SIZES } from '../../theme';
import { errMsg } from '../../utils/helpers';

export default function ResetPasswordScreen({ navigation, route }) {
  const { resetToken } = route.params || {};
  const [pass,    setPass]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pass.length < 6)      return Toast.show({ type: 'error', text1: 'Password must be 6+ characters' });
    if (pass !== confirm)     return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    setLoading(true);
    try {
      await riderResetPassword({ resetToken, newPassword: pass });
      Toast.show({ type: 'success', text1: 'Password reset!', text2: 'Sign in with your new password' });
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not reset password') });
    } finally { setLoading(false); }
  };

  return (
    <Screen scroll bg={COLORS.white}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: SIZES.lg }}>
        <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
      </TouchableOpacity>
      <View style={styles.iconBox}><Ionicons name="key-outline" size={32} color={COLORS.primary} /></View>
      <Text style={styles.title}>New Password</Text>
      <Text style={styles.sub}>Choose a strong password you'll remember.</Text>
      <Input label="New Password"      placeholder="At least 6 characters" value={pass}    onChangeText={setPass}    secureTextEntry leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray400} />} style={{ marginTop: SIZES.lg }} />
      <Input label="Confirm Password"  placeholder="Re-enter password"      value={confirm} onChangeText={setConfirm} secureTextEntry leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray400} />} />
      <Button title="Reset Password" onPress={submit} loading={loading} size="lg" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: SIZES.lg },
  title:   { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900, textAlign: 'center' },
  sub:     { fontSize: SIZES.fontMd, color: COLORS.gray500, textAlign: 'center', marginTop: SIZES.sm, marginBottom: SIZES.lg },
});
