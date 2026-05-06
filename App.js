import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation';
import useAuthStore from './src/store/authStore';
import NewOrderPopup from './src/components/NewOrderPopup';
import { acceptOrder, rejectOrder, getRiderOrders } from './src/api';
import useOrderStore from './src/store/orderStore';
import { pingBackend } from './src/api';

// Keep splash visible until app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Wake up backend on startup
pingBackend();

// ── Error Boundary ────────────────────────────────────────────────────────────
import { View, Text, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, i) { console.error('[ErrorBoundary]', e, i); }
  render() {
    if (this.state.hasError) return (
      <View style={EB.c}>
        <Text style={EB.t}>Something went wrong</Text>
        <Text style={EB.s}>Please restart the app</Text>
      </View>
    );
    return this.props.children;
  }
}
const EB = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },
  t: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  s: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});

// ── Rider Notification Manager ────────────────────────────────────────────────
function RiderNotificationManager() {
  const rider              = useAuthStore((s) => s.rider);
  const setActiveOrder     = useOrderStore((s) => s.setActiveOrder);
  const setAvailableOrders = useOrderStore((s) => s.setAvailableOrders);

  const [popupOrder,   setPopupOrder]   = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const pollRef  = useRef(null);
  const shownIds = useRef(new Set());
  const popupRef = useRef(false);

  useEffect(() => { popupRef.current = popupVisible; }, [popupVisible]);

  useEffect(() => {
    if (!rider?._id) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    const poll = async () => {
      if (popupRef.current) return;
      try {
        const res = await getRiderOrders();
        const all = res?.data?.data?.orders || [];
        const searching = all.filter(o => o.status === 'searching');
        if (searching.length > 0) {
          const newOrder = searching[0];
          if (!shownIds.current.has(newOrder._id)) {
            shownIds.current.add(newOrder._id);
            setPopupOrder(newOrder);
            setPopupVisible(true);
            popupRef.current = true;
          }
        }
      } catch (_) {}
    };

    poll();
    pollRef.current = setInterval(poll, 15000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [rider?._id]);

  const handleAccept = async (order) => {
    setPopupVisible(false);
    popupRef.current = false;
    try {
      const res = await acceptOrder(order._id);
      const accepted = res?.data?.data?.order;
      if (accepted) setActiveOrder(accepted);
      setAvailableOrders([]);
      Toast.show({ type: 'success', text1: '✅ Order accepted!', text2: 'Head to pickup location' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not accept', text2: 'Order may have been taken' });
    }
  };

  const handleReject = async (order) => {
    setPopupVisible(false);
    popupRef.current = false;
    setTimeout(() => { shownIds.current.delete(order?._id); }, 30000);
    try { if (order?._id) await rejectOrder(order._id); } catch (_) {}
  };

  return (
    <NewOrderPopup
      order={popupOrder}
      visible={popupVisible}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const onReady = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <AppNavigator onReady={onReady} />
          <RiderNotificationManager />
          <Toast position="top" topOffset={60} visibilityTime={3500} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}