 
 

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, pingBackend } from '../api';

const TOKEN_KEY = 'sd_rider_token';
const RIDER_KEY = 'sd_rider_cache'; // NEW: cached rider object

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true only for a definitive server rejection (HTTP 401 / 403). */
function isAuthError(err) {
  const status = err?.response?.status;
  return status === 401 || status === 403;
}

async function readStorage(key) {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

async function writeStorage(key, value) {
  try { await AsyncStorage.setItem(key, value); } catch { /* non-fatal */ }
}

async function removeStorage(key) {
  try { await AsyncStorage.removeItem(key); } catch { /* non-fatal */ }
}

// ─── store ────────────────────────────────────────────────────────────────────

const useAuthStore = create((set, get) => ({
  token:       null,
  rider:       null,
  loading:     true,   // true until init() finishes
  isHydrated:  false,  // true once AsyncStorage has been read (even if network hasn't responded)

  // ── INIT ──────────────────────────────────────────────────────────────────
  init: async () => {
    // Guard: only run once
    if (get().isHydrated) return;

    // Hard deadline — if everything hangs, unblock the UI after 30 s
    const timeout = setTimeout(() => {
      if (get().loading) {
        set({ loading: false });
      }
    }, 30_000);

    try {
      // 1. Wake the backend in parallel (Render free tier cold boot)
      pingBackend().catch(() => {});

      // 2. Read token from disk
      const token = await readStorage(TOKEN_KEY);

      if (!token) {
        // No token → show login immediately
        clearTimeout(timeout);
        set({ token: null, rider: null, loading: false, isHydrated: true });
        return;
      }

      // 3. Token exists → paint UI with CACHED rider immediately so the user
      //    sees their name/avatar while the network request runs
      const cachedRaw = await readStorage(RIDER_KEY);
      let cachedRider = null;
      if (cachedRaw) {
        try { cachedRider = JSON.parse(cachedRaw); } catch { /* corrupt cache — ignore */ }
      }

      // Mark as hydrated so the nav can render the main app right away
      set({ token, rider: cachedRider, loading: false, isHydrated: true });
      clearTimeout(timeout);

      // 4. Verify token with server in the background
      //    Only logout on a hard 401/403 — NOT on network errors
      try {
        const res   = await getMe();
        const data  = res?.data?.data;
        const rider = data?.user ?? data?.rider ?? null;

        if (rider) {
          set({ rider });
          await writeStorage(RIDER_KEY, JSON.stringify(rider));
        }
      } catch (err) {
        if (isAuthError(err)) {
          // Server said "invalid token" — clear everything
          await removeStorage(TOKEN_KEY);
          await removeStorage(RIDER_KEY);
          set({ token: null, rider: null });
        }
        // Network errors: keep the cached rider and stay logged in
      }

    } catch {
      // Unexpected error reading AsyncStorage — clear everything to be safe
      clearTimeout(timeout);
      await removeStorage(TOKEN_KEY);
      await removeStorage(RIDER_KEY);
      set({ token: null, rider: null, loading: false, isHydrated: true });
    }
  },

  // ── SET AUTH (called after successful login) ───────────────────────────────
  setAuth: async (token, rider) => {
    await writeStorage(TOKEN_KEY, token);
    if (rider) await writeStorage(RIDER_KEY, JSON.stringify(rider));
    set({ token, rider });
  },

  // ── SETTERS ───────────────────────────────────────────────────────────────
  setRider: async (rider) => {
    set({ rider });
    if (rider) await writeStorage(RIDER_KEY, JSON.stringify(rider));
  },

  patchRider: async (patch) => {
    const current = get().rider;
    if (!current) return;
    const updated = { ...current, ...patch };
    set({ rider: updated });
    await writeStorage(RIDER_KEY, JSON.stringify(updated));
  },

  // ── REFRESH RIDER FROM SERVER ──────────────────────────────────────────────
  refreshRider: async () => {
    try {
      const res   = await getMe();
      const data  = res?.data?.data;
      const rider = data?.user ?? data?.rider ?? null;
      if (rider) {
        set({ rider });
        await writeStorage(RIDER_KEY, JSON.stringify(rider));
      }
      return rider;
    } catch {
      return get().rider; // return cached on failure
    }
  },

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  logout: async () => {
    await removeStorage(TOKEN_KEY);
    await removeStorage(RIDER_KEY);
    set({ token: null, rider: null });
  },
}));

export default useAuthStore;