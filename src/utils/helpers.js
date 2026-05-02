import { Platform } from 'react-native';

export const fmtCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
};

export const fmtDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export const fmtDateTime = (dateStr) => {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const fmtAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(dateStr);
};

// Rider-perspective status labels
export const fmtStatus = (status) => {
  const map = {
    searching:  'Available',
    assigned:   'Heading to Pickup',
    picked_up:  'Parcel Picked Up',
    in_transit: 'In Transit',
    delivered:  'Delivered',
    cancelled:  'Cancelled',
  };
  return map[status] || status;
};

export const statusColor = (status) => {
  const map = {
    searching:  '#F59E0B',
    assigned:   '#1B4FD8',
    picked_up:  '#06B6D4',
    in_transit: '#8B5CF6',
    delivered:  '#22C55E',
    cancelled:  '#E8212B',
  };
  return map[status] || '#9CA3AF';
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('231')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+231${digits.slice(1)}`;
  if (digits.length === 8 || digits.length === 9) return `+231${digits}`;
  return `+${digits}`;
};

export const isValidEmail = (e) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

export const vehicleLabel = (type) =>
  ({ motorcycle: 'Motorcycle', bicycle: 'Bicycle', car: 'Car' }[type] || type || '\u2014');

export const maskPhone = (phone) => {
  if (!phone) return '';
  const s = String(phone);
  if (s.length < 4) return s;
  return s.slice(0, -4).replace(/\d/g, '*') + s.slice(-4);
};

export const errMsg = (e, fallback = 'Something went wrong') =>
  e?.response?.data?.message ||
  e?.response?.data?.error   ||
  e?.message                 ||
  fallback;

// Build RN-compatible file object from Expo image picker / camera asset
export const assetToFile = (asset, fieldName = 'photo') => {
  if (!asset?.uri) return null;
  const ext  = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
  const mime = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
  return {
    uri:  Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
    name: asset.fileName || `${fieldName}_${Date.now()}.${ext}`,
    type: mime,
  };
};
