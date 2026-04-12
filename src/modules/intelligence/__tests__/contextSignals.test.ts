const openSettingsMock = jest.fn();
const requestMock = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    ContextSignalsModule: {
      getContextSnapshot: jest.fn(async () => ({
        generatedAt: '2026-04-09T00:00:00.000Z',
        permissions: {
          calendar: 'granted',
          contacts: 'granted',
          health: 'granted',
          music: 'not_determined',
          installed_apps: 'granted',
          app_usage: 'denied',
          messages_summary: 'granted',
        },
        calendarEvents: [],
        health: {},
        frequentContacts: [],
        installedApps: [],
        music: {},
        usagePatterns: [],
        messagesSummary: { unreadCount: 0 },
      })),
      syncWidgetPayload: jest.fn(async (_payload: string) => true),
      requestPermission: jest.fn(async (_source: string) => 'granted'),
    },
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      READ_CALENDAR: 'READ_CALENDAR',
      READ_CONTACTS: 'READ_CONTACTS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    request: requestMock,
  },
  Platform: {
    OS: 'ios',
  },
  Linking: {
    openSettings: openSettingsMock,
  },
}));

describe('contextSignals bridge contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('uses the native snapshot module when available', async () => {
    const { getContextSnapshot } = await import('../contextSignals');

    const snapshot = await getContextSnapshot();

    expect(snapshot.permissions.calendar).toBe('granted');
    expect(snapshot.messagesSummary.unreadCount).toBe(0);
  });

  it('serializes widget payload before syncing to native', async () => {
    const { syncWidgetPayload } = await import('../contextSignals');
    const { NativeModules } = jest.requireMock('react-native');

    await syncWidgetPayload({
      variantData: {
        small: {
          status: 'ready',
          unreadCount: 1,
          topMessagePreview: 'hello',
          quickActions: [],
          topSuggestion: undefined,
          lastUpdatedAt: 'now',
          theme: 'system',
        },
        medium: {
          status: 'ready',
          unreadCount: 1,
          topMessagePreview: 'hello',
          quickActions: [],
          topSuggestion: undefined,
          lastUpdatedAt: 'now',
          theme: 'system',
        },
        large: {
          status: 'ready',
          unreadCount: 1,
          topMessagePreview: 'hello',
          quickActions: [],
          topSuggestion: undefined,
          lastUpdatedAt: 'now',
          theme: 'system',
        },
        lock: {
          status: 'ready',
          unreadCount: 1,
          topMessagePreview: 'hello',
          quickActions: [],
          topSuggestion: undefined,
          lastUpdatedAt: 'now',
          theme: 'system',
        },
      },
      generatedAt: '2026-04-09T00:00:00.000Z',
    });

    expect(NativeModules.ContextSignalsModule.syncWidgetPayload).toHaveBeenCalledWith(
      expect.stringContaining('generatedAt')
    );
  });

  it('delegates iOS permission requests to the native module', async () => {
    const { requestContextPermission } = await import('../contextSignals');
    const { NativeModules } = jest.requireMock('react-native');

    const result = await requestContextPermission('health');

    expect(result).toBe('granted');
    expect(NativeModules.ContextSignalsModule.requestPermission).toHaveBeenCalledWith('health');
  });

  it('opens system settings through Linking', async () => {
    const { openSystemSettings } = await import('../contextSignals');

    await openSystemSettings();

    expect(openSettingsMock).toHaveBeenCalled();
  });
});
