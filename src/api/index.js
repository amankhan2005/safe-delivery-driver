import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL  = 'https://safe-delivery-backend.onrender.com/api';
const TOKEN_KEY = 'sd_rider_token';

// ─── In-memory token cache ────────────────────────────────────────────────────
let _cachedToken = null;

export function setMemoryToken(token) { _cachedToken = token; }
export function clearMemoryToken()    { _cachedToken = null;  }

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    let token = _cachedToken;
    if (!token) {
      token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) _cachedToken = token;
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // AsyncStorage read failed — continue without token
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      clearMemoryToken();
      try {
        const { default: useAuthStore } = await import('../store/authStore');
        const { logout } = useAuthStore.getState();
        await logout();
      } catch { /* store not ready yet */ }
    }
    return Promise.reject(error);
  }
);

export const pingBackend = () =>
  api.get('/health', { timeout: 8_000 }).catch(() => {});

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const riderSignup = (formData) =>
  api.post('/auth/rider-signup', formData, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-Capture-Source': 'camera' },
    transformRequest: (data) => data,
  });

export const riderSendPhoneOTP    = (data) => api.post('/auth/rider-send-phone-otp', data);  // NEW
export const riderVerifyPhoneOTP  = (data) => api.post('/auth/rider-verify-phone-otp', data); // payload: {phone, otp}
export const riderVerifyEmailOTP  = (data) => api.post('/auth/rider-verify-email-otp', data);
export const riderResendEmailOTP  = (data) => api.post('/auth/rider-resend-email-otp', data);
export const riderLogin           = (data) => api.post('/auth/rider-login', data);
export const riderForgotPassword  = (data) => api.post('/auth/rider-forgot-password', data);
export const riderResendForgotOTP = (data) => api.post('/auth/rider-resend-forgot-otp', data);
export const riderVerifyResetOTP  = (data) => api.post('/auth/rider-verify-reset-otp', data);
export const riderResetPassword   = (data) => api.post('/auth/rider-reset-password', data);
export const changePassword       = (data) => api.post('/auth/change-password', data);
export const riderChangePassword  = (data) => api.post('/auth/rider-change-password', data);
export const getMe                = ()     => api.get('/auth/me');
export const saveFcmToken         = (data) => api.post('/auth/fcm-token', data);

// ── KYC ───────────────────────────────────────────────────────────────────────
export const kycStep1 = (data) => api.post('/riders/kyc/step1', data);
export const kycStep2 = (formData) =>
  api.post('/riders/kyc/step2', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });
export const kycStep3     = (data) => api.post('/riders/kyc/step3', data);
export const getKycStatus = ()     => api.get('/riders/kyc-status');

// ── RIDER OPS ─────────────────────────────────────────────────────────────────
export const toggleOnline       = ()         => api.post('/riders/toggle-online');
export const getDashboard       = ()         => api.get('/riders/dashboard');
export const updateLocation     = (data)     => api.post('/riders/update-location', data);
export const getEarnings        = (period)   => api.get('/riders/earnings', { params: { period } });
export const getRiderOrders     = ()         => api.get('/riders/orders', {
  headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
});
export const getRiderProfile    = ()         => api.get('/riders/profile');
export const updateRiderProfile = (data)     => api.put('/riders/profile', data);
export const uploadProfilePhoto = (formData) =>
  api.post('/riders/profile/photo', formData, {
    timeout: 120_000,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

// ── ORDERS ────────────────────────────────────────────────────────────────────
export const acceptOrder       = (id)       => api.post(`/orders/${id}/accept`);
export const rejectOrder       = (id)       => api.post(`/orders/${id}/reject`);
export const startTransit      = (id)       => api.post(`/orders/${id}/start-transit`);
export const getOrderById      = (id)       => api.get(`/orders/${id}`);
export const getRiderOrder     = (id)       => api.get(`/orders/${id}`);
export const verifyDeliveryOTP = (id, data) => api.post(`/orders/${id}/verify-otp`, data);
export const cancelOrder       = (id, data) => api.post(`/orders/${id}/cancel`, data);

export const uploadPickupPhoto = (id, formData) =>
  api.post(`/orders/${id}/pickup-photo`, formData, {
    timeout: 120_000,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

export const uploadDropPhoto = (id, formData) =>
  api.post(`/orders/${id}/drop-photo`, formData, {
    timeout: 120_000,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export const getNotifications      = ()   => api.get('/notifications');
export const markNotificationRead  = (id) => api.patch(`/notifications/${id}/read`);

// ── SUPPORT ───────────────────────────────────────────────────────────────────
export const submitInquiry      = (data) => api.post('/inquiry', data);
export const deleteRiderAccount = (data) => api.delete('/auth/rider-delete-account', { data });

export default api;