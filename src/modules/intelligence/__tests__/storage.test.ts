jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    },
  };
});

import { isSnapshotStale, readOnboardingCompleted, writeOnboardingCompleted, SNAPSHOT_TTL_MS } from '../storage';
import type { ContextSnapshot } from '../types';

describe('storage', () => {
  describe('isSnapshotStale', () => {
    it('returns false for a fresh snapshot', () => {
      const snapshot = { generatedAt: new Date().toISOString() } as ContextSnapshot;
      expect(isSnapshotStale(snapshot)).toBe(false);
    });

    it('returns true for an old snapshot', () => {
      const old = new Date(Date.now() - SNAPSHOT_TTL_MS - 1000).toISOString();
      expect(isSnapshotStale({ generatedAt: old } as ContextSnapshot)).toBe(true);
    });

    it('respects custom TTL', () => {
      const snapshot = { generatedAt: new Date(Date.now() - 5000).toISOString() } as ContextSnapshot;
      expect(isSnapshotStale(snapshot, 3000)).toBe(true);
      expect(isSnapshotStale(snapshot, 10000)).toBe(false);
    });
  });

  describe('onboarding persistence', () => {
    it('round-trips onboarding state', async () => {
      await writeOnboardingCompleted(true);
      expect(await readOnboardingCompleted()).toBe(true);
    });
  });
});
