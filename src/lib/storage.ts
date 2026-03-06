// Storage utility to handle Safari ITP and other browser restrictions
class StorageManager {
  private dbName = 'HyperAppStorage';
  private storeName = 'keyValueStore';
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  // Check if localStorage is available and not blocked
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Initialize IndexedDB
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to sessionStorage');
        reject(new Error('IndexedDB not available'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    try {
      this.db = await this.dbPromise;
      return this.db;
    } catch (error) {
      this.dbPromise = null;
      throw error;
    }
  }

  // IndexedDB operations
  private async idbGet(key: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.warn('IndexedDB get failed for key:', key);
          resolve(null);
        };
      });
    } catch (error) {
      console.warn('IndexedDB get error:', error);
      return null;
    }
  }

  private async idbSet(key: string, value: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('IndexedDB set failed for key:', key);
          reject(new Error('Failed to store data'));
        };
      });
    } catch (error) {
      console.warn('IndexedDB set error:', error);
      throw error;
    }
  }

  private async idbRemove(key: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('IndexedDB remove failed for key:', key);
        };
      });
    } catch (error) {
      console.warn('IndexedDB remove error:', error);
    }
  }

  // SessionStorage fallback
  private sessionGet(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      console.warn('sessionStorage get failed:', e);
      return null;
    }
  }

  private sessionSet(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('sessionStorage set failed:', e);
    }
  }

  private sessionRemove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('sessionStorage remove failed:', e);
    }
  }

  // Public API
  async get(key: string): Promise<string | null> {
    // Try localStorage first
    if (this.isLocalStorageAvailable()) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage get failed, trying alternatives');
      }
    }

    // Try IndexedDB
    try {
      const value = await this.idbGet(key);
      if (value !== null) {
        return value;
      }
    } catch (e) {
      console.warn('IndexedDB get failed, trying sessionStorage');
    }

    // Fallback to sessionStorage
    try {
      return this.sessionGet(key);
    } catch (e) {
      console.warn('All storage methods failed for key:', key);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    let stored = false;

    // Try localStorage first
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
        stored = true;
      } catch (e) {
        console.warn('localStorage set failed, trying alternatives');
      }
    }

    // Try IndexedDB as backup
    if (!stored) {
      try {
        await this.idbSet(key, value);
        stored = true;
      } catch (e) {
        // IndexedDB failed, continue to sessionStorage
      }
    }

    // Fallback to sessionStorage
    if (!stored) {
      this.sessionSet(key, value);
    }
  }

  async remove(key: string): Promise<void> {
    // Try all storage methods
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage remove failed');
      }
    }

    try {
      await this.idbRemove(key);
    } catch (e) {
      // IndexedDB remove failed
    }

    this.sessionRemove(key);
  }

  // Utility method to check if any storage is available
  isStorageAvailable(): boolean {
    return this.isLocalStorageAvailable() ||
           (typeof indexedDB !== 'undefined') ||
           (typeof sessionStorage !== 'undefined');
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Convenience functions for common use cases
export const safeLocalStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage access blocked:', e);
      return null;
    }
  },

  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage access blocked:', e);
      return false;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage access blocked:', e);
    }
  },
};
