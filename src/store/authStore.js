import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../api';

const TOKEN_KEY = 'sd_rider_token';

const useAuthStore = create((set) => ({
  token:   null,
  rider:   null,
  loading: true,

  init: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        set({ token });
        const res = await getMe();
        const data = res.data.data;
        // Backend getMe returns { user: req.user } — works for both User and Rider models
        const rider = data.user || data.rider || null;
        set({ rider, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
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
      const res = await getMe();
      const data = res.data.data;
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
