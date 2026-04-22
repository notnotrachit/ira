import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { formatPermissionState, getPermissionHint } from '../permissionPresentation';
import {
  defaultSourcePreferences,
  readSourcePreferences,
  writeSourcePreferences,
} from '../storage';
import type { ContextualSuggestion, PermissionState, SignalSource } from '../types';

const allSources: SignalSource[] = [
  'calendar', 'contacts', 'health', 'music',
  'installed_apps', 'app_usage', 'messages_summary',
];

function formatSourceName(source: SignalSource) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useSourcePreferences(
  permissions: Record<SignalSource, PermissionState>,
  suggestions: ContextualSuggestion[],
  requestPermission: (source: SignalSource | 'health_activity' | 'health_connect') => Promise<PermissionState>,
  openSettings: () => Promise<void>,
  isPermissionRequestable: (source: SignalSource) => boolean,
  isBootstrapping: boolean,
) {
  const [sourceEnabled, setSourceEnabled] =
    useState<Record<SignalSource, boolean>>(defaultSourcePreferences);
  const previousPermissionsRef = useRef<Record<SignalSource, PermissionState>>(
    Object.fromEntries(allSources.map((s) => [s, 'not_determined'])) as Record<SignalSource, PermissionState>
  );

  // Hydrate saved preferences
  useEffect(() => {
    void (async () => {
      const saved = await readSourcePreferences();
      if (saved) setSourceEnabled(saved);
    })();
  }, []);

  // Persist on change (skip during bootstrap)
  useEffect(() => {
    if (isBootstrapping) return;
    void writeSourcePreferences(sourceEnabled);
  }, [isBootstrapping, sourceEnabled]);

  // Sync permission grants → source toggles
  useEffect(() => {
    const prev = previousPermissionsRef.current;
    setSourceEnabled((current) => {
      const next = { ...current };
      for (const source of allSources) {
        if (permissions[source] === 'granted') {
          next[source] = prev[source] === 'granted' ? current[source] : true;
        } else {
          next[source] = false;
        }
      }
      return next;
    });
    previousPermissionsRef.current = permissions;
  }, [permissions]);

  const enabledSuggestions = useMemo(
    () => suggestions.filter((s) => s.source === 'multi_source' || sourceEnabled[s.source]),
    [sourceEnabled, suggestions],
  );

  async function handleSourceToggle(source: SignalSource) {
    const nextEnabled = !sourceEnabled[source];
    if (!nextEnabled) {
      setSourceEnabled((c) => ({ ...c, [source]: false }));
      return;
    }

    const state = permissions[source];
    if (state === 'granted' || state === 'unavailable') {
      setSourceEnabled((c) => ({ ...c, [source]: true }));
      return;
    }

    if (!isPermissionRequestable(source)) {
      Alert.alert('Unavailable on this platform', `${formatSourceName(source)} cannot be requested on this platform.`);
      return;
    }

    if (state === 'blocked') {
      await openSettings();
      return;
    }

    const result = await requestPermission(source);
    if (source === 'health' && (result === 'not_determined' || result === 'blocked')) {
      Alert.alert('Finish Health Connect setup', 'Enable Steps and Sleep in Health Connect, then return to Ira and tap Refresh.');
      return;
    }

    if (result === 'granted') {
      setSourceEnabled((c) => ({ ...c, [source]: true }));
      return;
    }

    Alert.alert('Permission update', `${formatSourceName(source)} is ${formatPermissionState(result)}.\n\n${getPermissionHint(source, result)}`);
  }

  return { sourceEnabled, enabledSuggestions, handleSourceToggle };
}
