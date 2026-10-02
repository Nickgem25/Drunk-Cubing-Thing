import { useState, useEffect } from 'react';

// Like useState, but loads from and saves to localStorage under `key`.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial; // missing or corrupted data
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked: app still works, just won't persist
    }
  }, [key, value]);

  return [value, setValue];
}
