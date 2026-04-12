import { useMemo } from 'react';

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

export function usePermissions(
  snapshot: ContextSnapshot | null,
  refresh?: () => Promise<void>
) {
  const permissions = useMemo(
    () => snapshot?.permissions ?? defaultPermissions,
    [snapshot]
  );

  async function requestPermission(source: SignalSource) {
    const result = await requestContextPermission(source);
    if (refresh) {
      await refresh();
    }
    return result;
  }

  function isPermissionRequestable(source: SignalSource) {
    const state = permissions[source];
    if (state === 'granted' || state === 'denied' || state === 'blocked' || state === 'not_determined') {
      return true;
    }

    return false;
  }

  return {
    permissions,
    requestPermission,
    openSettings: openSystemSettings,
    isPermissionRequestable,
  };
}
