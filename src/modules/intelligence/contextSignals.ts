import {
  Linking,
  PermissionsAndroid,
  Platform,
  type Permission,
} from 'react-native';

import ExpoContextSignals from 'expo-context-signals';
import { createMockSnapshot } from './mockSnapshot';
import { normalizeContextSnapshot } from './normalizeSnapshot';
import type { ContextSnapshot, PermissionState, SharedWidgetPayload, SignalSource } from './types';

export async function getContextSnapshot(): Promise<ContextSnapshot> {
  try {
    const snapshot = await ExpoContextSignals.getContextSnapshot() as unknown as ContextSnapshot;
    return normalizeContextSnapshot(snapshot);
  } catch {
    return normalizeContextSnapshot(createMockSnapshot());
  }
}

export async function syncWidgetPayload(payload: SharedWidgetPayload): Promise<boolean> {
  try {
    return await ExpoContextSignals.syncWidgetPayload(JSON.stringify(payload));
  } catch {
    return false;
  }
}

function mapAndroidPermissionResult(result: string): PermissionState {
  switch (result) {
    case PermissionsAndroid.RESULTS.GRANTED:
      return 'granted';
    case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
      return 'blocked';
    case PermissionsAndroid.RESULTS.DENIED:
    default:
      return 'denied';
  }
}

function getAndroidPermission(source: string): Permission | null {
  switch (source) {
    case 'calendar':
      return PermissionsAndroid.PERMISSIONS.READ_CALENDAR;
    case 'contacts':
      return PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
    case 'health_activity': {
      const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
      return perm ?? null;
    }
    default:
      return null;
  }
}

export async function requestContextPermission(source: SignalSource | 'health_activity' | 'health_connect'): Promise<PermissionState> {
  if (Platform.OS === 'android') {
    // health_activity = Android ACTIVITY_RECOGNITION runtime permission
    if (source === 'health_activity') {
      const perm = getAndroidPermission('health_activity');
      if (!perm) return 'unavailable';
      ExpoContextSignals.markPermissionRequested(perm);
      const result = await PermissionsAndroid.request(perm);
      return mapAndroidPermissionResult(result);
    }

    // health_connect = delegate to native module which opens Health Connect
    if (source === 'health_connect') {
      return (await ExpoContextSignals.requestPermission('health')) as PermissionState;
    }

    // Standard Android runtime permissions (calendar, contacts)
    const perm = getAndroidPermission(source);
    if (perm) {
      ExpoContextSignals.markPermissionRequested(perm);
      const result = await PermissionsAndroid.request(perm);
      return mapAndroidPermissionResult(result);
    }

    // Everything else (health, music, app_usage, messages_summary) → native module
    return (await ExpoContextSignals.requestPermission(source)) as PermissionState;
  }

  // iOS — all permissions handled by native module
  return (await ExpoContextSignals.requestPermission(source as string)) as PermissionState;
}

export async function openSystemSettings() {
  await Linking.openSettings();
}
