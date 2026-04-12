export type SignalSource =
  | 'calendar'
  | 'contacts'
  | 'health'
  | 'music'
  | 'installed_apps'
  | 'app_usage'
  | 'messages_summary';

export type PermissionState =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'not_determined';

export interface CalendarEventSignal {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface HealthSignal {
  stepsToday?: number;
  sleepHoursLastNight?: number;
  avgDailyStepsLastWeek?: number;
}

export interface ContactSignal {
  id: string;
  displayName: string;
  interactionScore: number;
}

export interface AppSignal {
  packageOrBundleId: string;
  name: string;
  category?: string;
  usageScore?: number;
}

export interface MessagesSummary {
  unreadCount: number;
  preview?: string;
  sourceAppPackage?: string;
}

export interface MusicSignal {
  track?: string;
  artist?: string;
  appPackage?: string;
  isPlaying?: boolean;
}

export interface ContextSnapshot {
  generatedAt: string;
  permissions: Record<SignalSource, PermissionState>;
  calendarEvents: CalendarEventSignal[];
  health: HealthSignal;
  frequentContacts: ContactSignal[];
  installedApps: AppSignal[];
  music: MusicSignal;
  usagePatterns: {
    appId: string;
    minutesToday: number;
    lastUsedAt: string;
  }[];
  messagesSummary: MessagesSummary;
}

export interface ContextualSuggestion {
  id: string;
  message: string;
  relevanceScore: number;
  source: SignalSource | 'multi_source';
  category: 'conversation' | 'reminder' | 'wellness' | 'prompt' | 'presence';
  deepLink?: string;
  expiresAt?: string;
  debugReasons?: string[];
}

export interface WidgetAction {
  label: string;
  deepLink: string;
}

export type WidgetStatus = 'ready' | 'empty' | 'denied' | 'stale';

export interface WidgetState {
  status: WidgetStatus;
  unreadCount?: number;
  topMessagePreview?: string;
  quickActions: WidgetAction[];
  topSuggestion?: ContextualSuggestion;
  lastUpdatedAt: string;
  theme: 'light' | 'dark' | 'system';
  debugReasons?: string[];
}

export interface SharedWidgetPayload {
  variantData: {
    small: WidgetState;
    medium: WidgetState;
    large: WidgetState;
    lock: WidgetState;
  };
  generatedAt: string;
}
