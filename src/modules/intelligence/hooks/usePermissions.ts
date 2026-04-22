import { useCallback, useMemo, useRef } from 'react';

import { openSystemSettings, requestContextPermission } from '../contextSignals';
import type { ContextSnapshot, PermissionState, SignalSource } from '../types';

const defaultPermissions: Record<SignalSource, PermissionState> = {
  calendar: 'not_determined',
  contacts: 'not_determined',
  health: 'not_determined',
  music: 'not_determined',
  installed_apps: 'not_determined',
  app_usage: 'not_determined',
  messages_summary: 'not_determined',
};

// Maps extended permission keys back to the SignalSource they affect
function sourceForKey(key: SignalSource | 'health_activity' | 'health_connect'): SignalSource {
  if (key === 'health_activity' || key === 'health_connect') return 'health';
  return key;
}

export function usePermissions(
  snapshot: ContextSnapshot | null,
  refresh?: () => Promise<void>
) {
  // Local overrides from actual request results — these take priority over
  // the snapshot because the native module can't always distinguish
  // "not_determined" from "denied" after a first denial on Android.
  const overridesRef = useRef<Partial<Record<SignalSource, PermissionState>>>({});

  const permissions = useMemo(() => {
    const base = snapshot?.permissions ?? defaultPermissions;
    const merged = { ...base };
    for (const [key, value] of Object.entries(overridesRef.current)) {
      const source = key as SignalSource;
      // Only keep the override if it's "worse" than what the snapshot says.
      // If the snapshot says granted (user enabled in settings), trust that.
      if (base[source] === 'granted') {
        delete overridesRef.current[source];
      } else if (value) {
        merged[source] = value;
      }
    }
    return merged;
  }, [snapshot]);

  const requestPermission = useCallback(async (key: SignalSource | 'health_activity' | 'health_connect') => {
    const result = await requestContextPermission(key);
    const source = sourceForKey(key);

    // Store the result locally so it survives the next snapshot refresh
    if (result === 'denied' || result === 'blocked') {
      overridesRef.current[source] = result;
    } else if (result === 'granted') {
      delete overridesRef.current[source];
    }

    if (refresh) {
      await refresh();
    }
    return result;
  }, [refresh]);

  function isPermissionRequestable(source: SignalSource) {
    const state = permissions[source];
    return state !== 'unavailable';
  }

  return {
    permissions,
    requestPermission,
    openSettings: openSystemSettings,
    isPermissionRequestable,
  };
}
