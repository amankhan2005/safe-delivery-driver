import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../theme';

export default function OTPInput({ value = '', onChange, length = 4, autoFocus = true }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus) setTimeout(() => refs.current[0]?.focus(), 150);
  }, [autoFocus]);

  const handleChange = (text, idx) => {
    const digit = (text || '').replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[idx] = digit;
    while (arr.length < length) arr.push('');
    const next = arr.slice(0, length).join('');
    onChange?.(next);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, idx) => (
        <TextInput
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          value={value[idx] || ''}
          onChangeText={(t) => handleChange(t, idx)}
          onKeyPress={(e) => handleKey(e, idx)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          style={[styles.cell, value[idx] ? styles.filled : null]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: SIZES.lg },
  cell: {
    flex: 1, marginHorizontal: 5, height: 58,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white,
    textAlign: 'center', fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900,
  },
  filled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
});
