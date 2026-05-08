/**
 * utils/crashPrevention.js — Global Crash Prevention Utilities
 *
 * Install in App.js:
 *   import { setupGlobalErrorHandlers } from './src/utils/crashPrevention';
 *   setupGlobalErrorHandlers(); // call before anything else
 *
 * Also exports safe wrappers for common crash sources.
 */

import { Platform } from 'react-native';

// ─── Global unhandled promise rejection handler ────────────────────────────────
// Without this, unhandled rejections silently crash the JS thread on Android release.
export function setupGlobalErrorHandlers() {
  // Unhandled promise rejections
  const originalHandler = global.Promise;
  if (typeof global.HermesInternal !== 'undefined') {
    // Hermes (used in release builds) surfaces unhandled rejections differently
    global.__DEV__ === false && (global.ErrorUtils?.setGlobalHandler?.((err, isFatal) => {
      // Log to your crash reporting service (Sentry, Bugsnag, etc.)
      console.error('[GlobalError]', err?.message ?? err, 'fatal:', isFatal);
      // Don't rethrow — prevents crash dialog on Android release
    }));
  }

  // Fallback for unhandled promise rejections (Node-style)
  if (global.HermesInternal) {
    // Already handled by ErrorUtils above in Hermes
  } else {
    // JSC (older Expo SDK)
    process.on?.('unhandledRejection', (reason) => {
      console.error('[UnhandledRejection]', reason);
    });
  }
}

// ─── Safe async wrapper ────────────────────────────────────────────────────────
/**
 * Wraps an async function so it never throws to the caller.
 * Usage: const result = await safeAsync(() => someAsyncOp(), fallbackValue);
 */
export async function safeAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    console.warn('[safeAsync]', e?.message ?? e);
    return fallback;
  }
}

// ─── Safe image URI validator ──────────────────────────────────────────────────
/**
 * Returns the URI if it looks valid, otherwise null.
 * Prevents "Invalid URI" crashes in <Image> on Android release.
 */
export function safeImageUri(uri) {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  if (uri.startsWith('file://') || uri.startsWith('/')) return uri;
  if (uri.startsWith('content://') || uri.startsWith('ph://')) return uri;
  if (uri.startsWith('data:image/')) return uri;
  return null;
}

// ─── Safe map coordinate validator ────────────────────────────────────────────
/**
 * Returns true if lat/lng are valid numbers in range.
 * react-native-maps crashes if coordinates are NaN or out of range.
 */
export function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' && !isNaN(lat) && lat >= -90  && lat <= 90  &&
    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
  );
}

export function safeCoord(lat, lng, fallback = { latitude: 0, longitude: 0 }) {
  if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
  return fallback;
}

// ─── Safe phone call ──────────────────────────────────────────────────────────
import { Linking } from 'react-native';

export async function safeCall(phone) {
  if (!phone) return;
  const url = `tel:${phone.replace(/\s/g, '')}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  } catch { /* permission denied or no dialer — ignore */ }
}

// ─── Safe navigation ──────────────────────────────────────────────────────────
/**
 * Navigates defensively — catches "no navigator" errors that crash on Android
 * when called after the component unmounts.
 */
export function safeNavigate(navigation, screen, params) {
  try {
    navigation?.navigate(screen, params);
  } catch (e) {
    console.warn('[safeNavigate]', e?.message);
  }
}

// ─── Mounted ref guard for setState ───────────────────────────────────────────
/**
 * Returns a setter that only calls setState if the component is still mounted.
 * Prevents "Can't perform a React state update on an unmounted component".
 *
 * Usage:
 *   const mountedRef = useMountedRef();
 *   const safeSet = useSafeSet(mountedRef);
 *   safeSet(setLoading)(false);  // no-op if unmounted
 */
import { useRef, useEffect } from 'react';

export function useMountedRef() {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => { ref.current = false; };
  }, []);
  return ref;
}

export function useSafeSet(mountedRef) {
  return (setter) => (...args) => {
    if (mountedRef.current) setter(...args);
  };
}