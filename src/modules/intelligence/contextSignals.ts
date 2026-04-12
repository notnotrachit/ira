import {
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type Permission,
} from 'react-native';

import { createMockSnapshot } from './mockSnapshot';
import { normalizeContextSnapshot } from './normalizeSnapshot';
import type { ContextSnapshot, PermissionState, SharedWidgetPayload, SignalSource } from './types';

type NativeContextSignalsModule = {
  getContextSnapshot?: () => Promise<ContextSnapshot>;
  syncWidgetPayload?: (payload: string) => Promise<boolean>;
  requestPermission?: (source: SignalSource) => Promise<PermissionState>;
};

const nativeModule = NativeModules.ContextSignalsModule as NativeContextSignalsModule | undefined;

export async function getContextSnapshot(): Promise<ContextSnapshot> {
  if (nativeModule?.getContextSnapshot) {
    const snapshot = await nativeModule.getContextSnapshot();
    return normalizeContextSnapshot(snapshot);
  }

  // This fallback keeps the JS app testable before native modules land.
  return normalizeContextSnapshot(createMockSnapshot());
}

export async function syncWidgetPayload(payload: SharedWidgetPayload): Promise<boolean> {
  if (!nativeModule?.syncWidgetPayload) {
    return false;
  }

  return nativeModule.syncWidgetPayload(JSON.stringify(payload));
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

function getAndroidPermission(source: SignalSource): Permission | null {
  switch (source) {
    case 'calendar':
      return PermissionsAndroid.PERMISSIONS.READ_CALENDAR;
    case 'contacts':
      return PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
    default:
      return null;
  }
}

async function requestAndroidActivityRecognitionPermission() {
  const permission = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
  if (!permission) {
    return 'unavailable' as PermissionState;
  }

  try {
    const result = await PermissionsAndroid.request(permission);
    return mapAndroidPermissionResult(result);
  } catch {
    return 'denied' as PermissionState;
  }
}

export async function requestContextPermission(source: SignalSource): Promise<PermissionState> {
  if (Platform.OS === 'android') {
    if (source === 'health') {
      await requestAndroidActivityRecognitionPermission();
    }

    if (
      (source === 'health' ||
        source === 'app_usage' ||
        source === 'music' ||
        source === 'messages_summary') &&
      nativeModule?.requestPermission
    ) {
      return nativeModule.requestPermission(source);
    }

    const permission = getAndroidPermission(source);
    if (!permission) {
      return 'unavailable';
    }

    const result = await PermissionsAndroid.request(permission);
    return mapAndroidPermissionResult(result);
  }

  if (nativeModule?.requestPermission) {
    return nativeModule.requestPermission(source);
  }

  return 'unavailable';
}

export async function openSystemSettings() {
  await Linking.openSettings();
}
