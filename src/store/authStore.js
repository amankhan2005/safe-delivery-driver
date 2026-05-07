import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, pingBackend } from '../api';

const TOKEN_KEY = 'sd_rider_token';

const useAuthStore = create((set) => ({
  token:   null,
  rider:   null,
  loading: true,

  init: async () => {
     const timeout = setTimeout(() => {
      set((s) => s.loading ? { loading: false } : s);
    }, 15000);

    try {
      
      pingBackend().catch(() => {});

      const token = await AsyncStorage.getItem(TOKEN_KEY);

      if (token) {
        set({ token });
        try {
           await new Promise((r) => setTimeout(r, 2000));

          const res   = await getMe();
          const data  = res.data.data;
          const rider = data.user || data.rider || null;
          clearTimeout(timeout);
          set({ rider, loading: false });
        } catch {
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