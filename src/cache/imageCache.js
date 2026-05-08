/**
 * imageCache.js — Production Image Cache Manager
 *
 * Provides instant image loading via a two-layer cache:
 *   L1: In-memory Map  (fastest — zero I/O)
 *   L2: expo-file-system disk cache (survives re-renders, lost on app reinstall)
 *
 * Usage:
 *   import { getCachedUri } from '../cache/imageCache';
 *   const uri = await getCachedUri('https://example.com/photo.jpg');
 *
 * Integration with <FastImage> wrapper (see components/FastImage.jsx):
 *   <FastImage uri={rider.profilePhoto.url} style={styles.avatar} />
 */

import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_DIR   = FileSystem.cacheDirectory + 'img_cache/';
const MAX_AGE_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 200;                        // LRU eviction limit

// ─── L1: in-memory LRU map ────────────────────────────────────────────────────
const memCache  = new Map();   // url → local file URI
const memAccess = new Map();   // url → last access timestamp

function evictMemoryIfNeeded() {
  if (memCache.size < MAX_ENTRIES) return;
  // Evict the least-recently-used 20 entries
  const sorted = [...memAccess.entries()].sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < 20; i++) {
    const [url] = sorted[i];
    memCache.delete(url);
    memAccess.delete(url);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic filename from URL (no path separators). */
function urlToFilename(url) {
  // Use a simple hash: btoa of the URL, replacing unsafe chars
  const encoded = url.replace(/[^a-zA-Z0-9]/g, '_');
  // Keep max 120 chars + ext
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  return encoded.slice(-100) + '.' + safeExt;
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// ─── Core: get a cached local URI for a remote URL ────────────────────────────
export async function getCachedUri(url) {
  if (!url || typeof url !== 'string') return null;

  // L1 hit
  if (memCache.has(url)) {
    memAccess.set(url, Date.now());
    return memCache.get(url);
  }

  // L2: check disk
  try {
    await ensureCacheDir();
    const filename  = urlToFilename(url);
    const localPath = CACHE_DIR + filename;
    const info      = await FileSystem.getInfoAsync(localPath, { md5: false });

    if (info.exists) {
      const ageMs = Date.now() - (info.modificationTime || 0) * 1000;
      if (ageMs < MAX_AGE_MS) {
        // Disk hit — warm L1
        evictMemoryIfNeeded();
        memCache.set(url, localPath);
        memAccess.set(url, Date.now());
        return localPath;
      }
      // Stale — delete and re-download
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    // Download
    const { uri } = await FileSystem.downloadAsync(url, localPath);
    evictMemoryIfNeeded();
    memCache.set(url, uri);
    memAccess.set(url, Date.now());
    return uri;

  } catch {
    // Any failure → fall back to original URL (network image)
    return url;
  }
}

// ─── Prefetch a batch of URLs (call on app start) ─────────────────────────────
export async function prefetchImages(urls = []) {
  const unique = [...new Set(urls.filter(Boolean))];
  await Promise.allSettled(unique.map((u) => getCachedUri(u)));
}

// ─── Prefetch via RN Image.prefetch (faster for current viewport) ─────────────
export function prefetchForDisplay(urls = []) {
  urls.filter(Boolean).forEach((url) => {
    Image.prefetch(url).catch(() => {});
  });
}

// ─── Clear entire cache (call from a Settings screen if needed) ───────────────
export async function clearImageCache() {
  memCache.clear();
  memAccess.clear();
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch { /* ignore */ }
}