import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, View,
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../theme';

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',  // primary | outline | ghost | danger | success
  size = 'md',          // sm | md | lg
  icon,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' || variant === 'success' ? COLORS.white : COLORS.primary}
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },

  // Variants
  primary: {
    backgroundColor: COLORS.primary,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 0,
  },
  danger: {
    backgroundColor: COLORS.red,
    borderWidth: 0,
  },
  success: {
    backgroundColor: COLORS.green,
    borderWidth: 0,
  },

  // Sizes
  size_sm: { paddingVertical: 8,  paddingHorizontal: 16, borderRadius: SIZES.radiusSm },
  size_md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: SIZES.radiusMd },
  size_lg: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: SIZES.radiusLg },

  // Labels
  label: { fontWeight: '600' },
  label_primary: { color: COLORS.white },
  label_outline:  { color: COLORS.primary },
  label_ghost:    { color: COLORS.primary },
  label_danger:   { color: COLORS.white },
  label_success:  { color: COLORS.white },

  labelSize_sm: { fontSize: SIZES.fontSm },
  labelSize_md: { fontSize: SIZES.fontMd },
  labelSize_lg: { fontSize: SIZES.fontLg },

  disabled: { opacity: 0.5 },
});
