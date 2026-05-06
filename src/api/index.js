import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://safe-delivery-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('sd_rider_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) await AsyncStorage.removeItem('sd_rider_token');
    return Promise.reject(error);
  }
);

// Retry wrapper
const withRetry = async (fn, retries = 3, delayMs = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetwork   = !err.response;
      const isServerErr = err.response?.status >= 500;
      const isLast      = i === retries - 1;
      if ((!isNetwork && !isServerErr) || isLast) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
};

export const pingBackend = () =>
  axios.get('https://safe-delivery-backend.onrender.com/health', { timeout: 35000 })
    .catch(() => {});

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const riderSignup           = (data) => withRetry(() => api.post('/auth/rider-signup', data));
export const riderVerifyPhoneOTP   = (data) => withRetry(() => api.post('/auth/rider-verify-phone-otp', data));
export const riderVerifyEmailOTP   = (data) => withRetry(() => api.post('/auth/rider-verify-email-otp', data));
export const riderResendEmailOTP   = (data) => withRetry(() => api.post('/auth/rider-resend-otp', data));
export const riderLogin            = (data) => withRetry(() => api.post('/auth/rider-login', data), 4, 2000);
export const riderForgotPassword   = (data) => withRetry(() => api.post('/auth/rider-forgot-password', data));
export const riderResendForgotOTP  = (data) => withRetry(() => api.post('/auth/rider-resend-forgot-otp', data));
export const riderVerifyResetOTP   = (data) => withRetry(() => api.post('/auth/rider-verify-reset-otp', data));
export const riderResetPassword    = (data) => withRetry(() => api.post('/auth/rider-reset-password', data));
export const riderChangePassword   = (data) => withRetry(() => api.post('/auth/rider-change-password', data));
export const getMe                 = ()     => withRetry(() => api.get('/auth/me'), 3, 2000);
export const saveFcmToken          = (data) => api.post('/auth/fcm-token', data);

// ─── KYC ────────────────────────────────────────────────────────────────────
export const submitKYCStep1 = (data) => api.post('/riders/kyc/step1', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitKYCStep2 = (data) => api.post('/riders/kyc/step2', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitKYCStep3 = (data) => api.post('/riders/kyc/step3', data, { headers: { 'Content-Type': 'multipart/form-data' } });

// ─── RIDER ───────────────────────────────────────────────────────────────────
export const getRiderProfile    = ()         => withRetry(() => api.get('/riders/profile'));
export const updateRiderProfile = (data)     => api.patch('/riders/profile', data);
export const uploadProfilePhoto = (data)     => api.post('/riders/profile/photo', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const toggleOnline       = ()         => api.post('/riders/toggle-online');
export const getRiderOrders     = ()         => api.get('/riders/orders', { headers: { 'Cache-Control': 'no-store' } });
export const getRiderOrder      = (id)       => withRetry(() => api.get(`/riders/orders/${id}`));
export const acceptOrder        = (id)       => api.post(`/riders/orders/${id}/accept`);
export const rejectOrder        = (id)       => api.post(`/riders/orders/${id}/reject`);
export const updateOrderStatus  = (id, data) => api.patch(`/riders/orders/${id}/status`, data);

// ✅ FIXED: period param add kiya — backend /riders/earnings?period=daily|monthly|yearly support karta hai
export const getRiderEarnings   = (period = 'daily') => withRetry(() => api.get(`/riders/earnings?period=${period}`));

// ─── SUPPORT ─────────────────────────────────────────────────────────────────
export const submitInquiry = (data) => api.post('/inquiry', data);

export default api;