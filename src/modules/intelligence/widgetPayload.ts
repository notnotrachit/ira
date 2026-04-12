import type {
  CalendarEventSignal,
  ContextSnapshot,
  ContextualSuggestion,
  SharedWidgetPayload,
  WidgetState,
  WidgetStatus,
} from './types';

const STALE_AFTER_MS = 30 * 60 * 1000;
type WidgetVariant = 'small' | 'medium' | 'large' | 'lock';

function isMeetingLink(value?: string) {
  if (!value) {
    return false;
  }

  return /(https?:\/\/|meet\.google\.com|zoom\.us|teams\.microsoft\.com)/i.test(value);
}

function getMeetingLink(event?: CalendarEventSignal) {
  if (!event?.location) {
    return undefined;
  }

  const match = event.location.match(/https?:\/\/\S+/i);
  if (match?.[0]) {
    return match[0];
  }

  if (isMeetingLink(event.location)) {
    return `https://${event.location.replace(/^https?:\/\//i, '')}`;
  }

  return undefined;
}

function currentHour() {
  return new Date().getHours();
}

function hasUpcomingEvent(snapshot: ContextSnapshot) {
  return snapshot.calendarEvents.length > 0;
}

function hasWellnessPrompt(suggestions: ContextualSuggestion[]) {
  return suggestions.some((suggestion) => suggestion.category === 'wellness');
}

function hasActionableSuggestion(suggestions: ContextualSuggestion[]) {
  return suggestions.length > 0;
}

function resolveHealthDeepLink(snapshot: ContextSnapshot) {
  if (snapshot.permissions.installed_apps === 'unavailable') {
    return 'x-apple-health://';
  }

  return 'ira-widget://health-external';
}

function resolveCalendarDeepLink(snapshot: ContextSnapshot) {
  if (snapshot.permissions.installed_apps === 'unavailable') {
    return 'calshow:';
  }

  return 'ira-widget://calendar-external';
}

function resolveMessagesDeepLink(snapshot: ContextSnapshot) {
  if (snapshot.permissions.installed_apps === 'unavailable') {
    return 'sms:';
  }

  if (snapshot.messagesSummary.sourceAppPackage) {
    return `ira-widget://reply-external?package=${encodeURIComponent(snapshot.messagesSummary.sourceAppPackage)}`;
  }

  return 'ira://chat';
}

function minutesUntil(dateIso?: string) {
  if (!dateIso) {
    return null;
  }

  return Math.round((new Date(dateIso).getTime() - Date.now()) / 60000);
}

function daypartLabel() {
  const hour = currentHour();

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
}

function derivePrimaryAction(
  snapshot: ContextSnapshot,
  suggestions: ContextualSuggestion[],
  variant: WidgetVariant
) {
  const topSuggestion = suggestions[0];
  const nextEvent = snapshot.calendarEvents[0];
  const meetingLink = getMeetingLink(nextEvent);

  if ((variant === 'small' || variant === 'medium') && snapshot.messagesSummary.unreadCount > 0) {
    return { label: 'Reply', deepLink: resolveMessagesDeepLink(snapshot) };
  }

  if (meetingLink) {
    return { label: 'Join', deepLink: meetingLink };
  }

  if (snapshot.messagesSummary.unreadCount > 0) {
    return { label: 'Reply', deepLink: resolveMessagesDeepLink(snapshot) };
  }

  if (topSuggestion?.deepLink) {
    if (topSuggestion.category === 'wellness') {
      return { label: 'Health', deepLink: resolveHealthDeepLink(snapshot) };
    }

    if (topSuggestion.category === 'reminder' || hasUpcomingEvent(snapshot)) {
      return { label: 'Agenda', deepLink: resolveCalendarDeepLink(snapshot) };
    }
  }

  if (hasUpcomingEvent(snapshot)) {
    return { label: 'Agenda', deepLink: resolveCalendarDeepLink(snapshot) };
  }

  return undefined;
}

function resolveStatus(snapshot: ContextSnapshot): WidgetStatus {
  const age = Date.now() - new Date(snapshot.generatedAt).getTime();
  const deniedSources = ['calendar', 'contacts', 'health'].every((source) => {
    const state = snapshot.permissions[source as keyof typeof snapshot.permissions];
    return state === 'denied' || state === 'blocked';
  });

  const hasUsableSignals =
    snapshot.messagesSummary.unreadCount > 0 ||
    snapshot.calendarEvents.length > 0 ||
    typeof snapshot.health.stepsToday === 'number' ||
    typeof snapshot.health.sleepHoursLastNight === 'number' ||
    Boolean(snapshot.music.isPlaying && snapshot.music.track) ||
    snapshot.usagePatterns.length > 0;

  if (age > STALE_AFTER_MS) {
    return 'stale';
  }

  if (deniedSources) {
    return 'denied';
  }

  if (!hasUsableSignals) {
    return 'empty';
  }

  return 'ready';
}

function buildQuickActions(
  variant: WidgetVariant,
  status: WidgetStatus,
  snapshot: ContextSnapshot,
  suggestions: ContextualSuggestion[]
) {
  if (status === 'denied' || status === 'empty') {
    return [];
  }

  if (status === 'stale') {
    return [];
  }

  const primaryAction = derivePrimaryAction(snapshot, suggestions, variant);
  const nextEvent = snapshot.calendarEvents[0];
  const evening = currentHour() >= 17;

  const actions = [
    primaryAction,
    snapshot.messagesSummary.unreadCount > 0
      ? { label: 'Reply', deepLink: resolveMessagesDeepLink(snapshot) }
      : undefined,
    hasWellnessPrompt(suggestions) ? { label: 'Health', deepLink: resolveHealthDeepLink(snapshot) } : undefined,
  ].filter(Boolean) as { label: string; deepLink: string }[];

  if (
    nextEvent &&
    getMeetingLink(nextEvent) &&
    !(snapshot.messagesSummary.unreadCount > 0 && (variant === 'small' || variant === 'medium'))
  ) {
    return [
      { label: 'Join', deepLink: getMeetingLink(nextEvent) ?? 'ira://calendar' },
      { label: 'Agenda', deepLink: resolveCalendarDeepLink(snapshot) },
    ];
  }

  if (evening && snapshot.messagesSummary.unreadCount === 0 && (snapshot.health.stepsToday ?? 0) < 5000) {
    return [{ label: 'Walk', deepLink: resolveHealthDeepLink(snapshot) }];
  }

  return actions.filter(
    (action, index, array) => array.findIndex((item) => item.label === action.label) === index
  );
}

function buildPreview(snapshot: ContextSnapshot, status: WidgetStatus) {
  const nextEvent = snapshot.calendarEvents[0];
  const eventMinutes = minutesUntil(nextEvent?.startTime);

  if (status === 'ready') {
    if (snapshot.messagesSummary.unreadCount > 0 && snapshot.messagesSummary.preview) {
      return snapshot.messagesSummary.preview;
    }

    if (nextEvent && eventMinutes !== null && eventMinutes > 0 && eventMinutes <= 30) {
      return nextEvent.location
        ? `${nextEvent.title} starts in ${eventMinutes} min · ${nextEvent.location}`
        : `${nextEvent.title} starts in ${eventMinutes} min`;
    }

    if (nextEvent) {
      return nextEvent.location
        ? `${nextEvent.title} · ${nextEvent.location}`
        : nextEvent.title;
    }

    const stepsToday = snapshot.health.stepsToday ?? 0;
    if (stepsToday > 7000 && snapshot.music.isPlaying) {
      return 'Looks like you are having a nice workout.';
    }

    if (currentHour() >= 17 && stepsToday > 0 && stepsToday < 5000) {
      return 'Maybe it is time for a short evening walk.';
    }

    switch (daypartLabel()) {
      case 'morning':
        return 'A quiet start so far.';
      case 'afternoon':
        return 'Nothing urgent right now.';
      default:
        return 'A calm evening at the moment.';
    }
  }

  const defaultPreviewByStatus: Record<WidgetStatus, string> = {
    ready: snapshot.messagesSummary.preview ?? 'Nothing urgent right now.',
    empty: 'Quiet for now.',
    denied: 'Ira needs access before it can surface anything useful here.',
    stale: 'This glance is a little behind.',
  };

  return defaultPreviewByStatus[status];
}

function collectWidgetReasons(
  snapshot: ContextSnapshot,
  status: WidgetStatus,
  topSuggestion: ContextualSuggestion | undefined,
  quickActions: { label: string; deepLink: string }[]
) {
  const reasons = [
    `status=${status}`,
    `unread=${snapshot.messagesSummary.unreadCount}`,
    `calendarEvents=${snapshot.calendarEvents.length}`,
    `steps=${snapshot.health.stepsToday ?? 'none'}`,
    `sleep=${snapshot.health.sleepHoursLastNight ?? 'none'}`,
    `musicPlaying=${snapshot.music.isPlaying ?? false}`,
    `musicTrack=${snapshot.music.track ?? 'none'}`,
    `permissions=calendar:${snapshot.permissions.calendar}|contacts:${snapshot.permissions.contacts}|health:${snapshot.permissions.health}|music:${snapshot.permissions.music}`,
    `topSuggestion=${topSuggestion?.id ?? 'none'}`,
    `actions=${quickActions.map((action) => action.label).join('|') || 'none'}`,
  ];

  return reasons;
}

function buildWidgetState(
  snapshot: ContextSnapshot,
  suggestions: ContextualSuggestion[],
  variant: WidgetVariant,
  quickActionsCount: number
): WidgetState {
  const status = resolveStatus(snapshot);
  const actionableSuggestions = suggestions.filter((suggestion) => suggestion.relevanceScore >= 0.52);
  const showSuggestion = hasActionableSuggestion(actionableSuggestions) && status === 'ready';
  const topSuggestion = showSuggestion ? actionableSuggestions[0] : undefined;
  const quickActions = buildQuickActions(variant, status, snapshot, actionableSuggestions).slice(
    0,
    quickActionsCount
  );

  return {
    status,
    unreadCount: status === 'ready' ? snapshot.messagesSummary.unreadCount : 0,
    topMessagePreview: buildPreview(snapshot, status),
    quickActions,
    topSuggestion,
    lastUpdatedAt: new Date(snapshot.generatedAt).toLocaleTimeString(),
    theme: 'system',
    debugReasons: collectWidgetReasons(snapshot, status, topSuggestion, quickActions),
  };
}

export function buildSharedWidgetPayload(
  snapshot: ContextSnapshot,
  suggestions: ContextualSuggestion[]
): SharedWidgetPayload {
  return {
    variantData: {
      small: buildWidgetState(snapshot, suggestions, 'small', 1),
      medium: buildWidgetState(snapshot, suggestions, 'medium', 2),
      large: buildWidgetState(snapshot, suggestions, 'large', 3),
      lock: buildWidgetState(snapshot, suggestions, 'lock', 1),
    },
    generatedAt: snapshot.generatedAt,
  };
}
