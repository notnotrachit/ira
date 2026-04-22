jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

describe('permissionPresentation', () => {
  beforeEach(() => jest.resetModules());

  async function loadModule(platform: string) {
    jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
    return import('../permissionPresentation');
  }

  describe('formatPermissionState', () => {
    it('maps all states to human-readable labels', async () => {
      const { formatPermissionState } = await loadModule('ios');
      expect(formatPermissionState('granted')).toBe('Connected');
      expect(formatPermissionState('not_determined')).toBe('Not connected');
      expect(formatPermissionState('blocked')).toBe('Needs settings');
      expect(formatPermissionState('denied')).toBe('Not allowed');
      expect(formatPermissionState('unavailable')).toBe('Not available');
    });
  });

  describe('getPermissionHint', () => {
    it('returns a connected message when granted', async () => {
      const { getPermissionHint } = await loadModule('ios');
      expect(getPermissionHint('calendar', 'granted')).toContain('Active');
    });

    it('returns Android-specific hint for music notification access', async () => {
      const { getPermissionHint } = await loadModule('android');
      expect(getPermissionHint('music', 'not_determined')).toContain('notification access');
    });

    it('returns Android-specific hint for messages_summary', async () => {
      const { getPermissionHint } = await loadModule('android');
      expect(getPermissionHint('messages_summary', 'not_determined')).toContain('notification access');
    });

    it('returns iOS-specific hint for installed_apps', async () => {
      const { getPermissionHint } = await loadModule('ios');
      expect(getPermissionHint('installed_apps', 'unavailable')).toContain('iOS');
    });

    it('returns iOS-specific hint for app_usage', async () => {
      const { getPermissionHint } = await loadModule('ios');
      expect(getPermissionHint('app_usage', 'unavailable')).toContain('iOS');
    });

    it('returns a settings hint for blocked state', async () => {
      const { getPermissionHint } = await loadModule('ios');
      expect(getPermissionHint('calendar', 'blocked')).toContain('settings');
    });

    it('returns a generic hint for denied state', async () => {
      const { getPermissionHint } = await loadModule('ios');
      expect(getPermissionHint('calendar', 'denied')).toContain('denied');
    });
  });

  describe('getPermissionActionLabel', () => {
    it('returns Refresh when granted', async () => {
      const { getPermissionActionLabel } = await loadModule('ios');
      expect(getPermissionActionLabel('calendar', 'granted')).toBe('Refresh');
    });

    it('returns Open settings when blocked', async () => {
      const { getPermissionActionLabel } = await loadModule('ios');
      expect(getPermissionActionLabel('calendar', 'blocked')).toBe('Open settings');
    });

    it('returns Unavailable for unavailable state', async () => {
      const { getPermissionActionLabel } = await loadModule('ios');
      expect(getPermissionActionLabel('installed_apps', 'unavailable')).toBe('Unavailable');
    });

    it('returns Enable for not_determined', async () => {
      const { getPermissionActionLabel } = await loadModule('ios');
      expect(getPermissionActionLabel('calendar', 'not_determined')).toBe('Enable');
    });

    it('returns Open notification access for blocked music on Android', async () => {
      const { getPermissionActionLabel } = await loadModule('android');
      expect(getPermissionActionLabel('music', 'blocked')).toBe('Open notification access');
    });

    it('returns Open usage access for blocked app_usage on Android', async () => {
      const { getPermissionActionLabel } = await loadModule('android');
      expect(getPermissionActionLabel('app_usage', 'blocked')).toBe('Open usage access');
    });
  });
});
