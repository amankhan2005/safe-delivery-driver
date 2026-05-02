import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { updateLocation } from '../api';

export default function useLocationTracker(enabled, intervalMs = 20000) {
  const timerRef   = useRef(null);
  const lastRef    = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const send = async () => {
      try {
        const now = Date.now();
        if (now - lastRef.current < intervalMs / 2) return;
        lastRef.current = now;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          await updateLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch { /* silent */ }
    };

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        await send();
        timerRef.current = setInterval(send, intervalMs);
      } catch { /* silent */ }
    };

    const stop = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    if (enabled) start();
    else stop();

    return () => { cancelled = true; stop(); };
  }, [enabled, intervalMs]);
}
