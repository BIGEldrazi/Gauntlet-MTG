/**
 * Storage adapter using localStorage.
 * Provides a window.storage-compatible API for the gauntlet app.
 * If window.storage already exists (e.g., from a hosting platform), it will be used instead.
 */
const localStorageAdapter = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },

  async set(key, value) {
    localStorage.setItem(key, value);
  },

  async delete(key) {
    localStorage.removeItem(key);
  },

  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return { keys };
  },
};

export function initStorage() {
  if (!window.storage) {
    window.storage = localStorageAdapter;
  }
}
