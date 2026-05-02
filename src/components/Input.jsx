import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../theme';

export default function Input({
  label,
  error,
  secureTextEntry,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  ...props
}) {
  const [focused, setFocused]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[
        styles.inputRow,
        focused && styles.focused,
        error  && styles.error,
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>{leftIcon}</View>
        )}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={COLORS.gray400}
          secureTextEntry={isPassword && !showPass}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPass(!showPass)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.gray400}
            />
          </TouchableOpacity>
        )}

        {!isPassword && rightIcon && (
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SIZES.lg },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    minHeight: 52,
  },
  focused:    { borderColor: COLORS.primary },
  error:      { borderColor: COLORS.red },
  input: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: COLORS.gray900,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  leftIcon:  { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
  errorText: {
    fontSize: SIZES.fontXs,
    color: COLORS.red,
    marginTop: 4,
  },
});
