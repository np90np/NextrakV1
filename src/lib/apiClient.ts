import { useCallback } from 'react';
import useAuthedFetch from './api';

export function useApi() {
  const authedFetch = useAuthedFetch();

  const request = useCallback(
    async (method: string, path: string, body?: any) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const init: RequestInit = { method, headers };
      if (body !== undefined) init.body = JSON.stringify(body);
      const res = await authedFetch(path, init);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return res.json();
      return res.text();
    },
    [authedFetch]
  );

  return {
    get: (path: string) => request('GET', path),
    post: (path: string, body?: any) => request('POST', path, body),
    put: (path: string, body?: any) => request('PUT', path, body),
    del: (path: string) => request('DELETE', path),
  };
}

export default useApi;
