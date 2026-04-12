import type { ContextSnapshot } from './types';

export function createMockSnapshot(): ContextSnapshot {
  const now = new Date();
  const meetingStart = new Date(now.getTime() + 25 * 60 * 1000);
  const meetingEnd = new Date(now.getTime() + 55 * 60 * 1000);

  return {
    generatedAt: now.toISOString(),
    permissions: {
      calendar: 'granted',
      contacts: 'granted',
      health: 'granted',
      music: 'not_determined',
      installed_apps: 'granted',
      app_usage: 'denied',
      messages_summary: 'granted',
    },
    calendarEvents: [
      {
        id: 'event-1',
        title: 'Growth sync with design',
        startTime: meetingStart.toISOString(),
        endTime: meetingEnd.toISOString(),
        location: 'Google Meet',
      },
    ],
    health: {
      sleepHoursLastNight: 5.8,
      stepsToday: 3120,
      avgDailyStepsLastWeek: 4280,
    },
    frequentContacts: [
      {
        id: 'contact-1',
        displayName: 'Aarav',
        interactionScore: 0.92,
      },
      {
        id: 'contact-2',
        displayName: 'Maya',
        interactionScore: 0.77,
      },
    ],
    installedApps: [
      {
        packageOrBundleId: 'com.spotify.music',
        name: 'Spotify',
        category: 'music',
        usageScore: 0.73,
      },
      {
        packageOrBundleId: 'com.google.android.calendar',
        name: 'Calendar',
        category: 'productivity',
        usageScore: 0.82,
      },
    ],
    music: {
      track: 'Golden Hour',
      artist: 'JVKE',
      appPackage: 'com.spotify.music',
      isPlaying: true,
    },
    usagePatterns: [
      {
        appId: 'com.google.android.calendar',
        minutesToday: 14,
        lastUsedAt: new Date(now.getTime() - 18 * 60 * 1000).toISOString(),
      },
    ],
    messagesSummary: {
      unreadCount: 7,
      preview: 'Aarav: Are we still aligned on the product walkthrough?',
      sourceAppPackage: 'com.whatsapp',
    },
  };
}
