/**
 * Safe LocalStorage utility for Shaddai Papelería
 * Prevents QuotaExceededError and DOMException crashes in mobile browsers.
 */

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
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err: any) {
      console.warn(`[safeLocalStorage] Quota or write error on key "${key}":`, err?.message || err);

      // If quota exceeded, try cleaning temporary/less critical keys
      try {
        const keysToClean = ['shaddai_cart_v3', 'shaddai_app_data_v2', 'shaddai_app_data_v1'];
        keysToClean.forEach((k) => {
          if (k !== key) window.localStorage.removeItem(k);
        });
        // Retry once
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryErr) {
        console.error('[safeLocalStorage] Storage full even after cleanup. Skipping local write.', retryErr);
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
