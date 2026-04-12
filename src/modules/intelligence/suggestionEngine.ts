import type { ContextSnapshot, ContextualSuggestion } from './types';

function clampScore(score: number) {
  return Math.max(0, Math.min(1, score));
}

function minutesUntil(dateIso: string) {
  return (new Date(dateIso).getTime() - Date.now()) / (60 * 1000);
}

function pushSuggestion(
  list: ContextualSuggestion[],
  suggestion: ContextualSuggestion | null | undefined
) {
  if (!suggestion) {
    return;
  }

  if (list.some((item) => item.id === suggestion.id)) {
    return;
  }

  list.push(suggestion);
}

export function generateSuggestions(snapshot: ContextSnapshot): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  const nextEvent = snapshot.calendarEvents[0];
  const topUsage = snapshot.usagePatterns[0];
  const stepsToday = snapshot.health.stepsToday ?? 0;
  const sleepHours = snapshot.health.sleepHoursLastNight ?? 0;
  const avgDailyStepsLastWeek = snapshot.health.avgDailyStepsLastWeek ?? 0;
  const hour = new Date().getHours();

  if (nextEvent) {
    const minutes = minutesUntil(nextEvent.startTime);
    if (minutes > 0 && minutes <= 45) {
      pushSuggestion(suggestions, {
        id: 'meeting-prep',
        message: `Your next meeting, ${nextEvent.title}, starts in ${Math.round(minutes)} minutes. Open the agenda and send a quick prep message.`,
        relevanceScore: clampScore(0.94 - minutes / 100),
        source: 'calendar',
        category: 'reminder',
        deepLink: 'ira://calendar',
        debugReasons: ['upcoming event detected', 'high urgency due to start time'],
      });
    } else if (minutes > 45 && minutes <= 120) {
      pushSuggestion(suggestions, {
        id: 'meeting-buffer',
        message: `You have a useful window before ${nextEvent.title}. Clear one priority reply now so the next meeting starts clean.`,
        relevanceScore: clampScore(0.68 - minutes / 500),
        source: 'calendar',
        category: 'presence',
        deepLink: 'ira://calendar',
        debugReasons: ['calendar buffer detected'],
      });
    }
  }

  if (stepsToday > 0 && stepsToday < 4000) {
    const sleepBoost = sleepHours > 0 && sleepHours < 6.5 ? 0.1 : 0;
    pushSuggestion(suggestions, {
      id: 'wellness-walk',
      message:
        hour >= 17
          ? 'Your step count is still light for the day. Maybe it is time for a short evening walk.'
          : 'You are still under 4k steps today. A 10-minute walk now could help you reset before the next block of work.',
      relevanceScore: clampScore(0.68 + sleepBoost),
      source: 'health',
      category: 'wellness',
      deepLink: 'ira://health',
      debugReasons: ['low step count', 'sleep score suggests lower energy'],
    });
  }

  if (hour < 11 && stepsToday < 1200 && avgDailyStepsLastWeek > 0 && avgDailyStepsLastWeek < 5500) {
    pushSuggestion(suggestions, {
      id: 'weekly-activity-nudge',
      message: 'Your step count has been light this week. A short walk this morning could help you feel more active today.',
      relevanceScore: 0.73,
      source: 'health',
      category: 'wellness',
      deepLink: 'ira://health',
      debugReasons: ['low weekly average steps', 'new day with low current step count'],
    });
  }

  if (stepsToday >= 7000 && snapshot.music.isPlaying) {
    pushSuggestion(suggestions, {
      id: 'workout-detected',
      message: 'Looks like you are having a nice workout. Keep the momentum going.',
      relevanceScore: 0.71,
      source: 'health',
      category: 'wellness',
      deepLink: 'ira://health',
      debugReasons: ['high step count', 'music playback suggests active movement'],
    });
  }

  if (sleepHours > 0 && sleepHours < 6) {
    pushSuggestion(suggestions, {
      id: 'sleep-recovery',
      message: 'Sleep was light last night. Consider protecting the next 20 minutes for focus instead of reacting to every thread.',
      relevanceScore: 0.63,
      source: 'health',
      category: 'wellness',
      deepLink: 'ira://health',
      debugReasons: ['sleep hours below threshold'],
    });
  }

  if (snapshot.messagesSummary.unreadCount > 0) {
    const preview = snapshot.messagesSummary.preview?.trim();
    const conversationMessage = preview
      ? `Unread messages are waiting. Start with this thread: ${preview}`
      : 'Unread messages are waiting. Clear one thread while the context is still fresh.';

    pushSuggestion(suggestions, {
      id: 'messages-catch-up',
      message: conversationMessage,
      relevanceScore: 0.74,
      source: 'messages_summary',
      category: 'conversation',
      deepLink: 'ira://chat',
      debugReasons: ['unread message summary available', 'uses actual preview instead of inferred contact'],
    });
  }

  if (snapshot.music.isPlaying && snapshot.music.track) {
    const musicMessage = snapshot.music.artist
      ? `${snapshot.music.track} by ${snapshot.music.artist} is playing. Use it as a focus anchor and clear one important task now.`
      : `${snapshot.music.track} is playing. This could be a good moment to settle into a focused block.`;

    pushSuggestion(suggestions, {
      id: 'music-focus',
      message: musicMessage,
      relevanceScore: 0.57,
      source: 'music',
      category: 'presence',
      deepLink: 'ira://chat',
      debugReasons: ['active playback detected'],
    });
  }

  if (topUsage && topUsage.minutesToday >= 75) {
    pushSuggestion(suggestions, {
      id: 'usage-reset',
      message: `You have already spent ${topUsage.minutesToday} minutes in ${topUsage.appId.split('.').pop()}. Take a quick reset before opening the same app again.`,
      relevanceScore: clampScore(0.44 + Math.min(topUsage.minutesToday / 240, 0.18)),
      source: 'app_usage',
      category: 'prompt',
      deepLink: 'ira://home',
      debugReasons: ['high foreground time detected'],
    });
  }

  if (snapshot.permissions.music !== 'granted') {
    pushSuggestion(suggestions, {
      id: 'permission-music',
      message: 'Enable music access to let Ira surface context-aware listening suggestions around workouts and focus sessions.',
      relevanceScore: 0.34,
      source: 'music',
      category: 'prompt',
      deepLink: 'ira://permissions',
      debugReasons: ['permission not granted'],
    });
  }

  if (
    snapshot.permissions.messages_summary === 'not_determined' ||
    snapshot.permissions.messages_summary === 'denied'
  ) {
    pushSuggestion(suggestions, {
      id: 'permission-messages',
      message: 'Enable message summaries to let Ira spot recent unread threads and surface faster catch-up prompts.',
      relevanceScore: 0.32,
      source: 'messages_summary',
      category: 'prompt',
      deepLink: 'ira://permissions',
      debugReasons: ['message summary permission unavailable'],
    });
  }

  return suggestions.sort((left, right) => right.relevanceScore - left.relevanceScore);
}
