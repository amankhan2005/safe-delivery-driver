// import axios from 'axios';

// import AsyncStorage from '@react-native-async-storage/async-storage';

// // ─── CONFIG ───────────────────────────────────────────────────────────────────
// const DEV_MODE = true; // ← true = local, false = production

// const LOCAL_URL      = 'http://192.168.29.123:5000/api';
// const PRODUCTION_URL = 'https://safe-delivery-backend.onrender.com/api';

// const BASE_URL  = DEV_MODE ? LOCAL_URL : PRODUCTION_URL;
// const TOKEN_KEY = 'sd_rider_token';

// const api = axios.create({
//   baseURL: BASE_URL,
//   timeout: 20000,
//   headers: { 'Content-Type': 'application/json' },
// });

// api.interceptors.request.use(async (config) => {
//   const token = await AsyncStorage.getItem(TOKEN_KEY);
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (res) => res,
//   async (error) => {
//     if (error.response?.status === 401) await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
//     return Promise.reject(error);
//   }
// );

// // ── AUTH ──────────────────────────────────────────────────────────
// export const riderSignup = (formData) =>
//   api.post('/auth/rider-signup', formData, {
//     headers: { 'Content-Type': 'multipart/form-data', 'X-Capture-Source': 'camera' },
//     transformRequest: (data) => data,
//   });

// export const riderVerifyPhoneOTP  = (data) => api.post('/auth/rider-verify-phone-otp', data);
// export const riderVerifyEmailOTP  = (data) => api.post('/auth/rider-verify-email-otp', data);
// export const riderResendEmailOTP  = (data) => api.post('/auth/rider-resend-email-otp', data);
// export const riderLogin           = (data) => api.post('/auth/rider-login', data);
// export const riderForgotPassword  = (data) => api.post('/auth/rider-forgot-password', data);
// export const riderResendForgotOTP = (data) => api.post('/auth/rider-resend-forgot-otp', data);
// export const riderVerifyResetOTP  = (data) => api.post('/auth/rider-verify-reset-otp', data);
// export const riderResetPassword   = (data) => api.post('/auth/rider-reset-password', data);
// export const changePassword       = (data) => api.post('/auth/change-password', data);
// export const riderChangePassword  = (data) => api.post('/auth/rider-change-password', data);
// export const getMe                = ()     => api.get('/auth/me');
// export const saveFcmToken         = (data) => api.post('/auth/fcm-token', data);

// // ── KYC ───────────────────────────────────────────────────────────
// export const kycStep1 = (data) => api.post('/riders/kyc/step1', data);
// export const kycStep2 = (formData) =>
//   api.post('/riders/kyc/step2', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     transformRequest: (data) => data,
//   });
// export const kycStep3     = (data) => api.post('/riders/kyc/step3', data);
// export const getKycStatus = ()     => api.get('/riders/kyc-status');

// // ── RIDER OPS ─────────────────────────────────────────────────────
// export const toggleOnline       = ()         => api.post('/riders/toggle-online');
// export const getDashboard       = ()         => api.get('/riders/dashboard');
// export const updateLocation     = (data)     => api.post('/riders/update-location', data);
// export const getEarnings        = (period)   => api.get('/riders/earnings', { params: { period } });
// export const getRiderOrders     = ()         => api.get('/riders/orders', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
// export const getRiderProfile    = ()         => api.get('/riders/profile');
// export const updateRiderProfile = (data)     => api.put('/riders/profile', data);
// export const uploadProfilePhoto = (formData) =>
//   api.post('/riders/profile/photo', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     transformRequest: (data) => data,
//   });

// // ── ORDERS ────────────────────────────────────────────────────────
// export const acceptOrder       = (id)       => api.post(`/orders/${id}/accept`);
// export const rejectOrder       = (id)       => api.post(`/orders/${id}/reject`);
// export const startTransit      = (id)       => api.post(`/orders/${id}/start-transit`);
// export const getOrderById      = (id)       => api.get(`/orders/${id}`);
// export const getRiderOrder     = (id)       => api.get(`/orders/${id}`);
// export const verifyDeliveryOTP = (id, data) => api.post(`/orders/${id}/verify-otp`, data);
// export const cancelOrder       = (id, data) => api.post(`/orders/${id}/cancel`, data);

// export const uploadPickupPhoto = (id, formData) =>
//   api.post(`/orders/${id}/pickup-photo`, formData, {
//     timeout: 120000,
//     headers: { 'Content-Type': 'multipart/form-data' },
//     transformRequest: (data) => data,
//   });

// export const uploadDropPhoto = (id, formData) =>
//   api.post(`/orders/${id}/drop-photo`, formData, {
//     timeout: 120000,
//     headers: { 'Content-Type': 'multipart/form-data' },
//     transformRequest: (data) => data,
//   });

// // ── NOTIFICATIONS ─────────────────────────────────────────────────
// export const getNotifications       = ()   => api.get('/notifications');
 

// // ── SUPPORT ───────────────────────────────────────────────────────
// export const submitInquiry      = (data) => api.post('/inquiry', data);
// export const deleteRiderAccount = (data) => api.delete('/auth/rider-delete-account', { data });

// export default api;

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL  = 'https://safe-delivery-backend.onrender.com/api';
const TOKEN_KEY = 'sd_rider_token';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────────
export const riderSignup = (formData) =>
  api.post('/auth/rider-signup', formData, {
    headers: { 'Content-Type': 'multipart/form-data', 'X-Capture-Source': 'camera' },
    transformRequest: (data) => data,
  });

export const riderVerifyPhoneOTP  = (data) => api.post('/auth/rider-verify-phone-otp', data);
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

// ── KYC ───────────────────────────────────────────────────────────
export const kycStep1 = (data) => api.post('/riders/kyc/step1', data);
export const kycStep2 = (formData) =>
  api.post('/riders/kyc/step2', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });
export const kycStep3     = (data) => api.post('/riders/kyc/step3', data);
export const getKycStatus = ()     => api.get('/riders/kyc-status');

// ── RIDER OPS ─────────────────────────────────────────────────────
export const toggleOnline       = ()         => api.post('/riders/toggle-online');
export const getDashboard       = ()         => api.get('/riders/dashboard');
export const updateLocation     = (data)     => api.post('/riders/update-location', data);
export const getEarnings        = (period)   => api.get('/riders/earnings', { params: { period } });
export const getRiderOrders     = ()         => api.get('/riders/orders', { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
export const getRiderProfile    = ()         => api.get('/riders/profile');
export const updateRiderProfile = (data)     => api.put('/riders/profile', data);
export const uploadProfilePhoto = (formData) =>
  api.post('/riders/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

// ── ORDERS ────────────────────────────────────────────────────────
export const acceptOrder       = (id)       => api.post(`/orders/${id}/accept`);
export const rejectOrder       = (id)       => api.post(`/orders/${id}/reject`);
export const startTransit      = (id)       => api.post(`/orders/${id}/start-transit`);
export const getOrderById      = (id)       => api.get(`/orders/${id}`);
export const getRiderOrder     = (id)       => api.get(`/orders/${id}`);
export const verifyDeliveryOTP = (id, data) => api.post(`/orders/${id}/verify-otp`, data);
export const cancelOrder       = (id, data) => api.post(`/orders/${id}/cancel`, data);

export const uploadPickupPhoto = (id, formData) =>
  api.post(`/orders/${id}/pickup-photo`, formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

export const uploadDropPhoto = (id, formData) =>
  api.post(`/orders/${id}/drop-photo`, formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (data) => data,
  });

// ── NOTIFICATIONS ─────────────────────────────────────────────────
export const getNotifications       = ()   => api.get('/notifications');
 

// ── SUPPORT ───────────────────────────────────────────────────────
export const submitInquiry      = (data) => api.post('/inquiry', data);
export const deleteRiderAccount = (data) => api.delete('/auth/rider-delete-account', { data });

export default api;