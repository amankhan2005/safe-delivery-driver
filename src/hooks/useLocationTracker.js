import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateLocation } from '../api';

const MIN_UPDATE_GAP_MS = 8000;

export default function useLocationTracker(enabled, intervalMs = 20000) {
  const timerRef    = useRef(null);
  const lastSentRef = useRef(0);
  const mountedRef  = useRef(true);
  const permGranted = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const stop = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    if (!enabled) { stop(); return; }

    const send = async () => {
      if (!mountedRef.current || !permGranted.current) return;
      const now = Date.now();
      if (now - lastSentRef.current < MIN_UPDATE_GAP_MS) return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mountedRef.current) return;
        if (loc?.coords) {
          lastSentRef.current = Date.now();
          await updateLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch { /* silent */ }
    };

    const start = async () => {
      try {
        if (!permGranted.current) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (!mountedRef.current) return;
          permGranted.current = status === 'granted';
        }
        if (!permGranted.current) return;
        await send();
        if (mountedRef.current) {
          timerRef.current = setInterval(send, Math.max(intervalMs, 15000));
        }
      } catch { /* silent */ }
    };

    start();
    return stop;
  }, [enabled, intervalMs]);
}