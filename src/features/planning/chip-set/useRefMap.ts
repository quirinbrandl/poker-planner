import { useMemo, useRef } from 'react';

/** Refs to many rendered rows by key (row inputs, chip buttons), for moving focus. */
export function useRefMap<T>() {
  const map = useRef(new Map<string, T>());
  return useMemo(
    () => ({
      get: (key: string): T | undefined => map.current.get(key),
      /** A ref callback that keeps `key` pointing at the mounted instance. */
      register: (key: string) => (instance: T | null) => {
        if (instance) map.current.set(key, instance);
        else map.current.delete(key);
      },
    }),
    [],
  );
}

export type RefMap<T> = ReturnType<typeof useRefMap<T>>;
