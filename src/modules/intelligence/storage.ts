import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContextSnapshot, SignalSource } from './types';

const SNAPSHOT_STORAGE_KEY = 'ira.context_snapshot.v2';
const SOURCE_PREFS_STORAGE_KEY = 'ira.source_preferences.v1';
const ONBOARDING_STORAGE_KEY = 'ira.onboarding.completed.v2';

export const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export const defaultSourcePreferences: Record<SignalSource, boolean> = {
  calendar: true,
  contacts: true,
  health: true,
  music: false,
  installed_apps: true,
  app_usage: false,
  messages_summary: true,
};

export async function readCachedSnapshot() {
  const raw = await AsyncStorage.getItem(SNAPSHOT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ContextSnapshot;
  } catch {
    return null;
  }
}

export async function writeCachedSnapshot(snapshot: ContextSnapshot) {
  await AsyncStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function isSnapshotStale(snapshot: ContextSnapshot, ttlMs = SNAPSHOT_TTL_MS) {
  return Date.now() - new Date(snapshot.generatedAt).getTime() > ttlMs;
}

export async function readSourcePreferences() {
  const raw = await AsyncStorage.getItem(SOURCE_PREFS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return {
      ...defaultSourcePreferences,
      ...(JSON.parse(raw) as Partial<Record<SignalSource, boolean>>),
    };
  } catch {
    return null;
  }
}

export async function writeSourcePreferences(preferences: Record<SignalSource, boolean>) {
  await AsyncStorage.setItem(SOURCE_PREFS_STORAGE_KEY, JSON.stringify(preferences));
}

export async function readOnboardingCompleted() {
  const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return raw === 'true';
}

export async function writeOnboardingCompleted(value: boolean) {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, value ? 'true' : 'false');
}

