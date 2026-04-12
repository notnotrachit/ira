import { createMockSnapshot } from '../mockSnapshot';
import { normalizeContextSnapshot } from '../normalizeSnapshot';

describe('normalizeContextSnapshot', () => {
  it('replaces placeholder message previews with a derived context summary', () => {
    const snapshot = createMockSnapshot();
    snapshot.messagesSummary.preview = 'Native bridge is active. Widgets can now consume shared context.';

    const normalized = normalizeContextSnapshot(snapshot);

    expect(normalized.messagesSummary.preview).toContain('Next up');
  });

  it('inherits Android message-summary access from notification access when available', () => {
    const snapshot = createMockSnapshot();
    snapshot.permissions.music = 'granted';
    snapshot.permissions.messages_summary = 'not_determined';

    const normalized = normalizeContextSnapshot(snapshot);

    expect(normalized.permissions.messages_summary).toBe('granted');
  });

  it('preserves source app package for message actions', () => {
    const snapshot = createMockSnapshot();
    snapshot.messagesSummary.sourceAppPackage = 'com.whatsapp';

    const normalized = normalizeContextSnapshot(snapshot);

    expect(normalized.messagesSummary.sourceAppPackage).toBe('com.whatsapp');
  });

  it('enriches installed apps with usage-derived scoring when usage data exists', () => {
    const snapshot = createMockSnapshot();
    snapshot.installedApps = [
      {
        packageOrBundleId: 'com.google.android.calendar',
        name: 'Calendar',
      },
    ];
    snapshot.usagePatterns = [
      {
        appId: 'com.google.android.calendar',
        minutesToday: 96,
        lastUsedAt: new Date().toISOString(),
      },
    ];

    const normalized = normalizeContextSnapshot(snapshot);

    expect(normalized.installedApps[0].usageScore).toBeGreaterThan(0.7);
  });
});
