import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation';
import useAuthStore from './src/store/authStore';
import NewOrderPopup from './src/components/NewOrderPopup';
import { acceptOrder, rejectOrder, getRiderOrders } from './src/api';
import useOrderStore from './src/store/orderStore';

function RiderNotificationManager() {
  const rider              = useAuthStore((s) => s.rider);
  const setActiveOrder     = useOrderStore((s) => s.setActiveOrder);
  const setAvailableOrders = useOrderStore((s) => s.setAvailableOrders);

  const [popupOrder,   setPopupOrder]   = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const pollRef  = useRef(null);
  const shownIds = useRef(new Set());
  const popupRef = useRef(false);

  useEffect(() => {
    popupRef.current = popupVisible;
  }, [popupVisible]);

  useEffect(() => {
    // Rider login nahi hai to poll mat karo
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

        // Sirf searching orders dikhao — isOnline backend se check hoga
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
  }, [rider?._id]); // ← isOnline nahi, _id use karo

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
    try {
      if (order?._id) await rejectOrder(order._id);
    } catch (_) {}
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <AppNavigator />
      <RiderNotificationManager />
      <Toast position="top" topOffset={60} visibilityTime={3500} />
    </GestureHandlerRootView>
  );
}