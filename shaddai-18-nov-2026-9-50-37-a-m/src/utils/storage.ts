/**
 * Safe LocalStorage & IndexedDB cache utilities for Shaddai Papelería.
 * Prevents QuotaExceededError and DOMException crashes when product images
 * or catalog data exceed browser localStorage's ~5MB limit.
 */

const MAX_LOCALSTORAGE_BYTES = 1_500_000; // 1.5 MB soft cap per key to keep localStorage fast & quota-safe

function isLargeDataUrl(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith('data:image/') && val.length > 2048;
}

/**
 * Produces a lightweight copy of any cache payload by stripping large inline
 * base64 images (`data:image/...`) while preserving all structured data,
 * prices, variants, orders, materials, clients, settings, and http(s) URLs.
 */
function createSlimCacheCopy<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => createSlimCacheCopy(item))
      .filter((item) => !isLargeDataUrl(item)) as unknown as T;
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (isLargeDataUrl(v)) {
      // Omit heavy inline base64 image from localStorage fallback copy
      result[k] = k === 'bannerUrl' ? '' : undefined;
      continue;
    }
    if (k === 'images' && Array.isArray(v)) {
      result[k] = v.filter((img) => typeof img === 'string' && !isLargeDataUrl(img));
      continue;
    }
    result[k] = createSlimCacheCopy(v);
  }

  return result as T;
}

export const safeLocalStorage = {
  getItem<T>(key: string, fallback: T): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallback;
      }
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[safeLocalStorage] Failed to read key "${key}":`, err);
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      const serialized = JSON.stringify(value);

      // Avoid blowing up the 5MB localStorage quota with multi-MB base64 images.
      // Full data (including images) is persisted in Firestore & IndexedDB.
      if (serialized.length > MAX_LOCALSTORAGE_BYTES) {
        const slimSerialized = JSON.stringify(createSlimCacheCopy(value));
        window.localStorage.setItem(key, slimSerialized);
        return true;
      }

      window.localStorage.setItem(key, serialized);
      return true;
    } catch {
      // QuotaExceededError or write restriction: clean legacy keys (never delete active cart)
      try {
        const legacyKeys = ['shaddai_app_data_v2', 'shaddai_app_data_v1'];
        legacyKeys.forEach((k) => {
          if (k !== key) window.localStorage.removeItem(k);
        });
        if (key !== 'shaddai_app_data_v3') {
          const appCache = window.localStorage.getItem('shaddai_app_data_v3');
          if (appCache && appCache.length > MAX_LOCALSTORAGE_BYTES) {
            window.localStorage.removeItem('shaddai_app_data_v3');
          }
        }

        // Retry with slimmed payload (without inline base64 images)
        const slimSerialized = JSON.stringify(createSlimCacheCopy(value));
        window.localStorage.setItem(key, slimSerialized);
        return true;
      } catch {
        // Still full (e.g. browser storage restricted or saturated): clear this cache key cleanly
        // rather than throwing or emitting a runtime console.error, since Firestore + IndexedDB hold the data.
        try {
          if (key === 'shaddai_app_data_v3') {
            window.localStorage.removeItem(key);
          }
        } catch {
          // ignore
        }
        console.warn(`[safeLocalStorage] LocalStorage quota reached for "${key}". Using IndexedDB/Cloud persistence.`);
        return false;
      }
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`[safeLocalStorage] Failed to remove key "${key}":`, err);
    }
  },
};

// ---------------- IndexedDB high-capacity local cache ----------------

const IDB_NAME = 'shaddai_local_cache_v1';
const IDB_STORE = 'kv';

function openCacheDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export const indexedDbCache = {
  async getItem<T>(key: string): Promise<T | null> {
    const db = await openCacheDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },

  async setItem<T>(key: string, value: T): Promise<boolean> {
    const db = await openCacheDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },
};
