/**
 * Custom hook for API data fetching with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook for fetching data from an API endpoint
 *
 * @param fetcher - Async function that returns the data
 * @param deps - Dependencies array for re-fetching
 * @returns ApiState with data, loading, error, and refetch function
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { data, loading, error, refetch };
}

/**
 * Hook for fetching sites list
 */
export function useSites() {
  const { masterApi } = require('../api/client');
  return useApi(() => masterApi.getSites(), []);
}
