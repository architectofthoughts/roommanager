import { useSyncExternalStore } from 'react';

export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint - 1}px)`;

  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onStoreChange);
      return () => mediaQuery.removeEventListener('change', onStoreChange);
    },
    () => typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
    () => false
  );
}
