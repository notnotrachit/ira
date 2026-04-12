import type {
  AppSignal,
  ContextSnapshot,
  MessagesSummary,
  MusicSignal,
  PermissionState,
} from './types';

const placeholderPreviewPatterns = [
  /native bridge is active/i,
  /widget timelines can now pull shared context/i,
  /widgets can now consume shared context/i,
];

function isMeaningfulText(value?: string | null) {
  if (!value) {
    return false;
  }

  return !placeholderPreviewPatterns.some((pattern) => pattern.test(value));
}

function formatRelativeMeeting(startTime?: string) {
  if (!startTime) {
    return null;
  }

  const minutes = Math.round((new Date(startTime).getTime() - Date.now()) / 60000);
  if (minutes > 0 && minutes <= 90) {
    return `Next up in ${minutes} min`;
  }

  return null;
}

function deriveMessagePreview(snapshot: ContextSnapshot) {
  const nextEvent = snapshot.calendarEvents[0];
  const nextContact = snapshot.frequentContacts[0];
  const activeApp = snapshot.usagePatterns[0];
  const playingMusic = snapshot.music.track
    ? [snapshot.music.track, snapshot.music.artist].filter(Boolean).join(' — ')
    : null;

  if (nextEvent) {
    const timing = formatRelativeMeeting(nextEvent.startTime);
    const location = nextEvent.location ? ` · ${nextEvent.location}` : '';
    return `${timing ?? 'Next meeting'}: ${nextEvent.title}${location}`;
  }

  if (playingMusic && snapshot.music.isPlaying) {
    return `Now playing ${playingMusic}`;
  }

  if (nextContact) {
    return `Reach out to ${nextContact.displayName} while the thread is still fresh.`;
  }

  if (activeApp) {
    return `Most active app today: ${activeApp.appId.split('.').pop()} · ${activeApp.minutesToday} min`;
  }

  return 'Your context is ready. Open Ira to review the latest signals and suggestions.';
}

function deriveMessagesSummary(snapshot: ContextSnapshot): MessagesSummary {
  const unreadCount = Math.max(0, snapshot.messagesSummary.unreadCount ?? 0);
  const sourceAppPackage = snapshot.messagesSummary.sourceAppPackage?.trim() || undefined;

  if (unreadCount > 0 && isMeaningfulText(snapshot.messagesSummary.preview)) {
    return {
      unreadCount,
      preview: snapshot.messagesSummary.preview,
      sourceAppPackage,
    };
  }

  return {
    unreadCount,
    preview: deriveMessagePreview(snapshot),
    sourceAppPackage,
  };
}

function enrichInstalledApps(
  installedApps: AppSignal[],
  usagePatterns: ContextSnapshot['usagePatterns']
) {
  return installedApps.map((app) => {
    const usage = usagePatterns.find((item) => item.appId === app.packageOrBundleId);
    if (!usage) {
      return app;
    }

    return {
      ...app,
      usageScore: Math.min(1, Math.max(0.1, usage.minutesToday / 120)),
    };
  });
}

function resolveMessagePermission(
  current: PermissionState,
  musicPermission: PermissionState,
  platformMessagesAvailable: boolean
) {
  if (!platformMessagesAvailable) {
    return 'unavailable' as const;
  }

  if (current === 'granted' || current === 'denied' || current === 'blocked') {
    return current;
  }

  return musicPermission;
}

function normalizeMusicSignal(music: MusicSignal) {
  return {
    track: music.track?.trim() || undefined,
    artist: music.artist?.trim() || undefined,
    appPackage: music.appPackage?.trim() || undefined,
    isPlaying: music.isPlaying,
  };
}

export function normalizeContextSnapshot(snapshot: ContextSnapshot): ContextSnapshot {
  const calendarEvents = [...snapshot.calendarEvents].sort(
    (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
  );
  const usagePatterns = [...snapshot.usagePatterns].sort((left, right) => right.minutesToday - left.minutesToday);
  const installedApps = enrichInstalledApps(snapshot.installedApps, usagePatterns);
  const platformMessagesAvailable = snapshot.permissions.messages_summary !== 'unavailable';

  const normalizedSnapshot: ContextSnapshot = {
    ...snapshot,
    calendarEvents,
    frequentContacts: [...snapshot.frequentContacts].sort(
      (left, right) => right.interactionScore - left.interactionScore
    ),
    usagePatterns,
    installedApps,
    music: normalizeMusicSignal(snapshot.music),
    permissions: {
      ...snapshot.permissions,
      messages_summary: resolveMessagePermission(
        snapshot.permissions.messages_summary,
        snapshot.permissions.music,
        platformMessagesAvailable
      ),
    },
  };

  return {
    ...normalizedSnapshot,
    messagesSummary: deriveMessagesSummary(normalizedSnapshot),
  };
}
