/**
 * Zyrix App — useApi Hook
 * Shared hook for API calls with loading, error, retry, and refresh.
 */

import { useState, useEffect, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  retry: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [trigger, ...deps]);

  useEffect(() => {
    execute();
  }, [execute]);

  const refresh = useCallback(() => setTrigger((t: number) => t + 1), []);
  const retry = refresh;

  return { data, loading, error, refresh, retry };
}

export default useApi;
