import { useState, useCallback } from 'react';

interface UseSearchHistoryOptions {
  storageKey: string;
  maxHistory?: number;
}

interface UseSearchHistoryReturn<T> {
  history: T[];
  saveHistory: (values: T) => void;
  clearHistory: () => void;
  removeHistoryItem: (index: number) => void;
}

export function useSearchHistory<T extends Record<string, unknown>>(
  options: UseSearchHistoryOptions
): UseSearchHistoryReturn<T> {
  const { storageKey, maxHistory = 10 } = options;

  const [history, setHistory] = useState<T[]>(() => {
    try {
      const savedHistory = localStorage.getItem(storageKey);
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
      console.error(`Failed to parse search history from ${storageKey}`, e);
      return [];
    }
  });

  const saveHistory = useCallback(
    (values: T) => {
      const cleanedValues = Object.fromEntries(
        Object.entries(values).filter(
          ([, v]) => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
        )
      ) as T;

      if (Object.keys(cleanedValues).length === 0) return;

      const newHistory = [
        cleanedValues,
        ...history.filter((h) => JSON.stringify(h) !== JSON.stringify(cleanedValues))
      ].slice(0, maxHistory);

      setHistory(newHistory);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    },
    [history, maxHistory, storageKey]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const removeHistoryItem = useCallback(
    (index: number) => {
      const newHistory = history.filter((_, i) => i !== index);
      setHistory(newHistory);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    },
    [history, storageKey]
  );

  return { history, saveHistory, clearHistory, removeHistoryItem };
}
