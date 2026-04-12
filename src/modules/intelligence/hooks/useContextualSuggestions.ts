import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getContextSnapshot } from '../contextSignals';
import { generateSuggestions } from '../suggestionEngine';
import { isSnapshotStale, readCachedSnapshot, writeCachedSnapshot } from '../storage';
import type { ContextSnapshot, ContextualSuggestion } from '../types';

export function useContextualSuggestions() {
  const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const lastRefreshAtRef = useRef(0);

  const refresh = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    const now = Date.now();
    const shouldThrottle = !options?.force && now - lastRefreshAtRef.current < 15_000;
    if (shouldThrottle) {
      return;
    }

    lastRefreshAtRef.current = now;

    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
      const nextSnapshot = await getContextSnapshot();
      setSnapshot(nextSnapshot);
      await writeCachedSnapshot(nextSnapshot);
    } finally {
      if (!options?.silent) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const cachedSnapshot = await readCachedSnapshot();
        if (isMounted && cachedSnapshot) {
          setSnapshot(cachedSnapshot);
        }

        await refresh({ silent: Boolean(cachedSnapshot), force: true });
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refresh({ silent: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  const suggestions = useMemo<ContextualSuggestion[]>(() => {
    if (!snapshot) {
      return [];
    }

    return generateSuggestions(snapshot);
  }, [snapshot]);

  return {
    snapshot,
    suggestions,
    refresh,
    isRefreshing: isRefreshing || isHydrating,
    isStale: snapshot ? isSnapshotStale(snapshot) : true,
    lastUpdatedAt: snapshot ? new Date(snapshot.generatedAt).toLocaleTimeString() : 'Never',
  };
}
