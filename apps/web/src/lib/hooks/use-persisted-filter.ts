"use client";

import { useState, useEffect, useCallback } from "react";

export function usePersistedFilter(
  key: string,
  defaultValue: boolean
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      setValue(JSON.parse(stored));
    }
  }, [key]);

  const setPersistedValue = useCallback(
    (newValue: boolean) => {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    [key]
  );

  return [value, setPersistedValue];
}
