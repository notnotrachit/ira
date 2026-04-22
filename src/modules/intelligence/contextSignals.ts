import {
  Linking,
  PermissionsAndroid,
  Platform,
  type Permission,
} from 'react-native';

import ExpoContextSignals from 'expo-context-signals';
import { initialize, requestPermission as requestHCPermission, readRecords, getGrantedPermissions } from 'react-native-health-connect';
import { createMockSnapshot } from './mockSnapshot';
import { normalizeContextSnapshot } from './normalizeSnapshot';
import type { ContextSnapshot, PermissionState, SharedWidgetPayload, SignalSource } from './types';

async function readHealthFromHC(): Promise<{ stepsToday?: number; sleepHoursLastNight?: number; avgDailyStepsLastWeek?: number }> {
  if (Platform.OS !== 'android') return {};
  try {
    const ok = await initialize();
    if (!ok) return {};

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString();
    const sleepStart = new Date(now.getTime() - 30 * 3600000).toISOString();
    const nowIso = now.toISOString();

    const [stepsResult, weeklyResult, sleepResult] = await Promise.all([
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: startOfDay, endTime: nowIso } }).catch(() => ({ records: [] })),
      readRecords('Steps', { timeRangeFilter: { operator: 'between', startTime: weekAgo, endTime: nowIso } }).catch(() => ({ records: [] })),
      readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: sleepStart, endTime: nowIso } }).catch(() => ({ records: [] })),
    ]);

    const stepsToday = stepsResult.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0) || undefined;
    const weeklySteps = weeklyResult.records.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
    const avgDailyStepsLastWeek = weeklySteps > 0 ? weeklySteps / 7 : undefined;
    const sleepMs = sleepResult.records.reduce((sum: number, r: any) => {
      const start = new Date(r.startTime).getTime();
      const end = new Date(r.endTime).getTime();
      return sum + (end - start);
    }, 0);
    const sleepHoursLastNight = sleepMs > 0 ? sleepMs / 3600000 : undefined;

    return { stepsToday, sleepHoursLastNight, avgDailyStepsLastWeek };
  } catch {
    return {};
  }
}

async function getHealthPermState(): Promise<PermissionState> {
  if (Platform.OS !== 'android') return 'not_determined';
  try {
    const ok = await initialize();
    if (!ok) return 'unavailable';
    const granted = await getGrantedPermissions();
    const hasSteps = granted.some((p: any) => p.recordType === 'Steps');
    const hasSleep = granted.some((p: any) => p.recordType === 'SleepSession');
    return hasSteps && hasSleep ? 'granted' : 'not_determined';
  } catch {
    return 'unavailable';
  }
}

export async function getContextSnapshot(): Promise<ContextSnapshot> {
  try {
    const snapshot = await ExpoContextSignals.getContextSnapshot() as unknown as ContextSnapshot;

    // Merge health data from react-native-health-connect on Android
    if (Platform.OS === 'android') {
      const [healthData, healthPerm] = await Promise.all([readHealthFromHC(), getHealthPermState()]);
      snapshot.health = { ...snapshot.health, ...healthData };
      snapshot.permissions = { ...snapshot.permissions, health: healthPerm };
    }

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

    // health_connect = use react-native-health-connect JS API
    if (source === 'health_connect') {
      try {
        await initialize();
        const granted = await requestHCPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'SleepSession' },
        ]);
        const hasSteps = granted.some((p: any) => p.recordType === 'Steps');
        const hasSleep = granted.some((p: any) => p.recordType === 'SleepSession');
        return hasSteps && hasSleep ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }

    // health = same as health_connect on Android (Sources tab uses plain 'health')
    if (source === 'health') {
      return requestContextPermission('health_connect');
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
