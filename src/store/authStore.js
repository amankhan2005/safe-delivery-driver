import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../api';

const TOKEN_KEY = 'sd_rider_token';

const useAuthStore = create((set) => ({
  token:   null,
  rider:   null,
  loading: true,

  // KEY FIX: add 10s timeout so splash never gets stuck forever
  init: async () => {
    const timeout = setTimeout(() => {
      // Force loading=false after 10s even if API hangs
      set((s) => s.loading ? { loading: false } : s);
    }, 10000);

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        set({ token });
        try {
          const res  = await getMe();
          const data = res.data.data;
          const rider = data.user || data.rider || null;
          clearTimeout(timeout);
          set({ rider, loading: false });
        } catch {
          // /me failed — clear token, go to auth
          await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
          clearTimeout(timeout);
          set({ token: null, rider: null, loading: false });
        }
      } else {
        clearTimeout(timeout);
        set({ loading: false });
      }
    } catch {
      clearTimeout(timeout);
      await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      set({ token: null, rider: null, loading: false });
    }
  },

  setAuth: async (token, rider) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    set({ token, rider });
  },

  setRider: (rider) => set({ rider }),

  patchRider: (patch) =>
    set((s) => ({ rider: s.rider ? { ...s.rider, ...patch } : s.rider })),

  refreshRider: async () => {
    try {
      const res   = await getMe();
      const data  = res.data.data;
      const rider = data.user || data.rider || null;
      if (rider) set({ rider });
      return rider;
    } catch {
      return null;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    set({ token: null, rider: null });
  },
}));

export default useAuthStore;