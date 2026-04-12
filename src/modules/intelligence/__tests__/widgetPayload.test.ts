import { createMockSnapshot } from '../mockSnapshot';
import { generateSuggestions } from '../suggestionEngine';
import { buildSharedWidgetPayload } from '../widgetPayload';

describe('buildSharedWidgetPayload', () => {
  it('creates all widget size variants', () => {
    const snapshot = createMockSnapshot();
    const payload = buildSharedWidgetPayload(snapshot, generateSuggestions(snapshot));

    expect(payload.variantData.small.quickActions).toHaveLength(1);
    expect(payload.variantData.medium.quickActions).toHaveLength(2);
    expect(payload.variantData.large.quickActions.length).toBeGreaterThanOrEqual(1);
    expect(payload.variantData.large.quickActions.length).toBeLessThanOrEqual(3);
    expect(payload.variantData.lock.quickActions).toHaveLength(1);
  });

  it('keeps unread count and preview in sync with messages summary', () => {
    const snapshot = createMockSnapshot();
    snapshot.messagesSummary.unreadCount = 11;
    snapshot.messagesSummary.preview = 'Maya: Let us lock the launch plan today.';

    const payload = buildSharedWidgetPayload(snapshot, generateSuggestions(snapshot));

    expect(payload.variantData.large.unreadCount).toBe(11);
    expect(payload.variantData.large.topMessagePreview).toContain('launch plan');
    expect(payload.variantData.small.unreadCount).toBe(11);
    expect(payload.variantData.medium.unreadCount).toBe(11);
  });

  it('prioritizes quick reply on the small widget when unread threads exist', () => {
    const snapshot = createMockSnapshot();
    snapshot.messagesSummary.unreadCount = 4;
    snapshot.messagesSummary.sourceAppPackage = 'com.whatsapp';

    const payload = buildSharedWidgetPayload(snapshot, generateSuggestions(snapshot));

    expect(payload.variantData.small.quickActions[0]).toEqual({
      label: 'Reply',
      deepLink: 'ira-widget://reply-external?package=com.whatsapp',
    });
    expect(payload.variantData.medium.quickActions[0]).toEqual({
      label: 'Reply',
      deepLink: 'ira-widget://reply-external?package=com.whatsapp',
    });
  });

  it('uses a single Walk action for low-step wellness prompts', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-09T18:30:00+05:30').getTime());

    const snapshot = createMockSnapshot();
    snapshot.messagesSummary.unreadCount = 0;
    snapshot.messagesSummary.preview = undefined;
    snapshot.messagesSummary.sourceAppPackage = undefined;
    snapshot.calendarEvents = [];
    snapshot.health.stepsToday = 2400;

    const payload = buildSharedWidgetPayload(snapshot, generateSuggestions(snapshot));

    expect(payload.variantData.medium.quickActions).toEqual([
      { label: 'Walk', deepLink: 'ira-widget://health-external' },
    ]);
    expect(payload.variantData.large.quickActions).toEqual([
      { label: 'Walk', deepLink: 'ira-widget://health-external' },
    ]);

    jest.useRealTimers();
  });
});
