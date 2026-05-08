/**
 * App.js — Production-Fixed Entry Point
 *
 * FIXES vs original:
 *   1. Global error handler installed first (catches unhandled rejections on Android release)
 *   2. Image cache preload on startup (profile photos load instantly)
 *   3. SplashScreen hidden after isHydrated (not after loading — faster)
 *   4. All interval/timer leaks already handled in RiderNotificationManager
 *   5. ErrorBoundary preserved
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from './src/navigation';
import useAuthStore from './src/store/authStore';
import useOrderStore from './src/store/orderStore';
import NewOrderPopup from './src/components/NewOrderPopup';
import { acceptOrder, rejectOrder, getRiderOrders } from './src/api';
import { setupGlobalErrorHandlers } from './src/utils/crashPrevention';
import { prefetchImages } from './src/cache/imageCache';

// ─── Install global error handlers FIRST (before any async code) ──────────────
setupGlobalErrorHandlers();

SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error?.message, info?.componentStack); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Polling interval (20 s fallback, real-time via WebSocket first) ──────────
const POLL_INTERVAL_MS = 20_000;

// ─── Rider Notification Manager ───────────────────────────────────────────────
function RiderNotificationManager() {
  const rider              = useAuthStore((s) => s.rider);
  const setActiveOrder     = useOrderStore((s) => s.setActiveOrder);
  const setAvailableOrders = useOrderStore((s) => s.setAvailableOrders);

  const [popupOrder,   setPopupOrder]   = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const pollRef        = useRef(null);
  const shownIds       = useRef(new Set());
  const visibleRef     = useRef(false);
  const inFlightRef    = useRef(false);
  const mountedRef     = useRef(true);
  const appStateRef    = useRef(AppState.currentState);
  const backgroundedAt = useRef(null);

  useEffect(() => { visibleRef.current = popupVisible; }, [popupVisible]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, []);

  const pollOrders = useCallback(async () => {
    if (!mountedRef.current)  return;
    if (inFlightRef.current)  return;
    if (visibleRef.current)   return;
    if (!rider?._id)          return;

    inFlightRef.current = true;
    try {
      const res = await getRiderOrders();
      if (!mountedRef.current) return;

      const all             = res?.data?.data?.orders ?? [];
      const activeOrder     = all.find((o) => ['assigned', 'picked_up', 'in_transit'].includes(o.status));
      const searchingOrders = all.filter((o) => o.status === 'searching');

      if (activeOrder) {
        setActiveOrder(activeOrder);
        setAvailableOrders([]);
      } else {
        setActiveOrder(null);
        setAvailableOrders(searchingOrders);
      }

      if (searchingOrders.length > 0 && !activeOrder && !visibleRef.current) {
        const order = searchingOrders[0];
        if (!shownIds.current.has(order._id)) {
          shownIds.current.add(order._id);
          if (mountedRef.current) {
            setPopupOrder(order);
            setPopupVisible(true);
            visibleRef.current = true;
          }
        }
      }
    } catch {
      // Polling errors are non-critical
    } finally {
      inFlightRef.current = false;
    }
  }, [rider?._id, setActiveOrder, setAvailableOrders]);

  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    if (!rider?._id) {
      shownIds.current.clear();
      if (mountedRef.current) {
        setPopupVisible(false);
        visibleRef.current = false;
        setActiveOrder(null);
        setAvailableOrders([]);
      }
      return;
    }

    pollOrders();
    pollRef.current = setInterval(pollOrders, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [rider?._id, pollOrders, setActiveOrder, setAvailableOrders]);

  // Re-poll when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev.match(/inactive|background/) && next === 'active') {
        const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
        backgroundedAt.current = null;
        if (away > 5000 && rider?._id) pollOrders();
      } else if (next.match(/inactive|background/)) {
        backgroundedAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [rider?._id, pollOrders]);

  const handleAccept = useCallback(async (order) => {
    setPopupVisible(false);
    visibleRef.current = false;
    try {
      const res      = await acceptOrder(order._id);
      const accepted = res?.data?.data?.order;
      if (accepted && mountedRef.current) {
        setActiveOrder(accepted);
        setAvailableOrders([]);
      }
      Toast.show({ type: 'success', text1: '✅ Order accepted!', text2: 'Head to pickup' });
    } catch (e) {
      Toast.show({
        type:  'error',
        text1: 'Could not accept',
        text2: e?.response?.data?.message ?? 'Order may have been taken',
      });
    }
  }, [setActiveOrder, setAvailableOrders]);

  const handleReject = useCallback(async (order) => {
    setPopupVisible(false);
    visibleRef.current = false;
    const tid = setTimeout(() => {
      if (mountedRef.current) shownIds.current.delete(order?._id);
    }, 45_000);
    try {
      if (order?._id) await rejectOrder(order._id);
    } catch {
    } finally {
      if (!mountedRef.current) clearTimeout(tid);
    }
  }, []);

  return (
    <NewOrderPopup
      order={popupOrder}
      visible={popupVisible}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}

// ─── Image preloader (warms up cache on startup) ──────────────────────────────
function ImagePreloader() {
  const rider = useAuthStore((s) => s.rider);

  useEffect(() => {
    if (!rider) return;
    const urls = [
      rider?.profilePhoto?.url,
      rider?.selfiePhoto?.url,
    ].filter(Boolean);
    if (urls.length > 0) prefetchImages(urls);
  }, [rider?._id]);

  return null;
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const onReady = useCallback(async () => {
    try { await SplashScreen.hideAsync(); } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" translucent={false} />
          <AppNavigator onReady={onReady} />
          <RiderNotificationManager />
          <ImagePreloader />
          <Toast
            position="top"
            topOffset={Platform.OS === 'android' ? 48 : 60}
            visibilityTime={3500}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 32 },
  errorTitle:     { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  errorSubtitle:  { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});