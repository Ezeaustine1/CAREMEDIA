/**
 * High-Capacity IndexedDB + Memory Media Vault for CAREMEDIA
 * Allows the Studio Admin to upload 100+ high-resolution photographs and videos
 * without hitting localStorage 5MB limits or Firestore 2000-character URL limits.
 */

const DB_NAME = 'caremedia_studio_vault_v1';
const STORE_NAME = 'media_assets';
const DB_VERSION = 1;

// In-memory cache for instant synchronous rendering
const memoryCache = new Map<string, string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Hydrate all stored media assets into memoryCache on startup
export async function hydrateMediaVault(): Promise<void> {
  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        const keys = keysReq.result as string[];
        const vals = valsReq.result as Array<string | Blob>;
        keys.forEach((k, idx) => {
          const val = vals[idx];
          if (typeof val === 'string') {
            memoryCache.set(k, val);
          } else if (val instanceof Blob) {
            const objUrl = URL.createObjectURL(val);
            memoryCache.set(k, objUrl);
          }
        });
        notifyListeners();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // Fallback silently if IndexedDB is restricted
  }
}

// Start hydration immediately on module load
hydrateMediaVault();

export function subscribeMediaVault(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function storeMediaInVault(
  dataOrBlob: string | Blob,
  prefix = 'media'
): Promise<string> {
  const vaultId = `vault://${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  if (typeof dataOrBlob === 'string') {
    memoryCache.set(vaultId, dataOrBlob);
  } else {
    const objectUrl = URL.createObjectURL(dataOrBlob);
    memoryCache.set(vaultId, objectUrl);
  }
  notifyListeners();

  try {
    const db = await openVaultDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(dataOrBlob, vaultId);
  } catch {
    // Kept in memoryCache for the session if IDB fails
  }

  return vaultId;
}

export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('vault://')) {
    return memoryCache.get(url) || '';
  }
  return url;
}

// Process an uploaded image file while preserving its full natural aspect ratio
export async function processUploadedImageFile(
  file: File,
  maxDimension = 1400
): Promise<{ vaultUrl: string; previewUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = async () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const vaultUrl = await storeMediaInVault(dataUrl, 'img');
        resolve({ vaultUrl, previewUrl: dataUrl, width, height });
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Process an uploaded video file into the IndexedDB vault and generate a thumbnail frame
export async function processUploadedVideoFile(
  file: File
): Promise<{ videoVaultUrl: string; thumbVaultUrl: string }> {
  const videoVaultUrl = await storeMediaInVault(file, 'vid');

  // Attempt to capture a thumbnail frame from the video
  const thumbVaultUrl = await new Promise<string>((resolve) => {
    const video = document.createElement('video');
    const tempUrl = URL.createObjectURL(file);
    video.src = tempUrl;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 1;

    const cleanup = () => {
      URL.revokeObjectURL(tempUrl);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve('');
    }, 3500);

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) * 0.25);
    };

    video.onseeked = async () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 960;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const savedThumb = await storeMediaInVault(dataUrl, 'vthumb');
          cleanup();
          resolve(savedThumb);
          return;
        }
      } catch {
        // ignore thumbnail extraction error
      }
      cleanup();
      resolve('');
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve('');
    };
  });

  return { videoVaultUrl, thumbVaultUrl };
}
