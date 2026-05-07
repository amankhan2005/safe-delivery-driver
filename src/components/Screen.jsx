import React from 'react';
import {
  View, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../theme';

export default function Screen({
  children,
  scroll        = false,
  pad           = true,
  style,
  bg            = COLORS.background,
  refreshControl,
  scrollProps   = {},
}) {
  const insets = useSafeAreaInsets();

  // Android: gesture/button nav bar bottom padding
  const androidBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 16) : 0;

  const content = (
    <View
      style={[
        styles.inner,
        pad && styles.pad,
        !scroll && Platform.OS === 'android' && { paddingBottom: androidBottom },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg }]}
      edges={Platform.OS === 'android' ? ['top'] : ['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scroll,
              Platform.OS === 'android' && { paddingBottom: androidBottom + 8 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            refreshControl={refreshControl}
            {...scrollProps}
          >
            {content}
          </ScrollView>
        ) : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  flex:   { flex: 1 },
  inner:  { flex: 1 },
  pad:    { padding: SIZES.lg },
  scroll: { flexGrow: 1 },
});