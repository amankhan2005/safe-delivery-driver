/**
 * FastImage.jsx — Crash-Safe Cached Image Component
 *
 * Drop-in replacement for <Image source={{ uri }} />.
 * Features:
 *   • Reads from local disk cache (via imageCache.js) — instant on re-render
 *   • Progressive: shows placeholder/fallback while loading
 *   • Crash-safe: invalid URI, null, undefined all handled gracefully
 *   • Optimised for FlatList: stable component, no unnecessary re-renders
 *   • Supports initials avatar fallback (e.g. for rider profile photos)
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Image, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getCachedUri } from '../cache/imageCache';

// ─── FastImage ────────────────────────────────────────────────────────────────
const FastImage = memo(function FastImage({
  uri,
  style,
  resizeMode = 'cover',
  fallbackInitial,       // e.g. "J" — shows letter avatar if image fails
  fallbackBg = '#3B82F6',
  showLoader = false,    // show spinner while resolving cache
  onLoad,
  onError,
  ...props
}) {
  const [localUri,  setLocalUri]  = useState(null);
  const [error,     setError]     = useState(false);
  const [loading,   setLoading]   = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Resolve URI → local cached path
  useEffect(() => {
    setError(false);
    setLoading(true);
    setLocalUri(null);

    if (!uri || typeof uri !== 'string') {
      if (mountedRef.current) { setError(true); setLoading(false); }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const cached = await getCachedUri(uri);
        if (!cancelled && mountedRef.current) {
          setLocalUri(cached || uri);
          setLoading(false);
        }
      } catch {
        if (!cancelled && mountedRef.current) {
          setLocalUri(uri); // fallback to network
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [uri]);

  // Show loader while resolving
  if (loading && showLoader) {
    return (
      <View style={[style, styles.center]}>
        <ActivityIndicator size="small" color={fallbackBg} />
      </View>
    );
  }

  // Show fallback avatar if image failed or URI is missing
  if (error || !localUri) {
    if (fallbackInitial) {
      return (
        <View style={[style, styles.center, { backgroundColor: fallbackBg }]}>
          <Text style={[styles.initial, { fontSize: (style?.width ?? 40) * 0.4 }]}>
            {String(fallbackInitial).charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    }
    return <View style={[style, { backgroundColor: '#E5E7EB' }]} />;
  }

  return (
    <Image
      source={{ uri: localUri }}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={() => {
        if (mountedRef.current) setError(true);
        onError?.();
      }}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  center:  { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});

export default FastImage;