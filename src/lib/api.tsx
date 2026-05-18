import { useCallback } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';

export function useAuthedFetch() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  return useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const headers: Record<string, string> = {};

      if (init?.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (init?.headers) {
        Object.assign(headers, init.headers as Record<string, string>);
      }

      if (isLoaded && isSignedIn) {
        const token = await getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      return fetch(input, { ...init, headers });
    },
    [getToken, isLoaded, isSignedIn],
  );
}

export default useAuthedFetch;
