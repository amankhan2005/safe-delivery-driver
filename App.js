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

SplashScreen.preventAutoHideAsync().catch(() => {});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error.message, info.componentStack); }
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

// ─── POLLING INTERVAL ─────────────────────────────────────────────────────────
// KEY FIX: Increased from 15s to 20s.
//
// Socket.IO now uses WebSocket-first transport (changed in socketService.js),
// which means the app receives real-time order updates instantly WITHOUT polling.
// This polling is now only a fallback for cases where the WebSocket is not
// connected (e.g. app just woke from background, WebSocket handshake in progress).
//
// 20s is a good balance:
//   - Fast enough to catch any missed WebSocket events within 20s
//   - Slow enough to not overload Render's single free-tier worker
//   - Matches Socket.IO's pingInterval (25s) — the two won't collide
const POLL_INTERVAL_MS = 20_000;

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
      // Polling errors are non-critical — silent
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

    // Poll immediately on mount, then every POLL_INTERVAL_MS
    pollOrders();
    pollRef.current = setInterval(pollOrders, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [rider?._id, pollOrders, setActiveOrder, setAvailableOrders]);

  // Re-poll when app comes back to foreground (after ≥5s in background)
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
        text2: e?.response?.data?.message || 'Order may have been taken',
      });
    }
  }, [setActiveOrder, setAvailableOrders]);

  const handleReject = useCallback(async (order) => {
    setPopupVisible(false);
    visibleRef.current = false;
    // Prevent this order from showing again for 45s (avoid re-popup loop)
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