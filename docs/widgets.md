# Widgets

## Android

Implementation uses RemoteViews via an Expo Module.

Files (all in `modules/expo-context-signals/android/`):

- `ExpoContextSignalsModule.kt` — bridge + snapshot + widget sync
- `IraWidgetProvider.kt` — widget rendering + deep link actions
- `IraNotificationListenerService.kt` — message/music context
- `res/layout/ira_widget.xml` — widget layout
- `res/xml/ira_widget_info.xml` — widget metadata
- `res/drawable/ira_widget_*.xml` — backgrounds and chips

Behavior:

- Size-aware rendering (small/medium/large based on widget width)
- Unread count as primary metric when messages exist
- Deep linking via `ira://` scheme
- Context-matched quick actions (Reply, Agenda, Walk, Join)
- Notification-driven message summaries
- Widget payload sync via broadcast from JS layer
- Dark theme by default

## iOS

Implementation uses WidgetKit + SwiftUI.

Files (in `modules/expo-context-signals/ios-widget-extension/`):

- `irawidget.swift` — provider, views, live data fetcher
- `irawidgetBundle.swift` — entry point

Added to Xcode project automatically via `plugins/withIraWidgetExtension.js`.

Supported families: `.systemSmall`, `.systemMedium`, `.systemLarge`, `.accessoryRectangular`

Behavior:

- Live data fetching (EventKit, HealthKit, MediaPlayer) directly in the widget extension
- Falls back to app-synced UserDefaults payload when no live data available
- 15-minute timeline refresh
- Daypart-aware fallback content
- Deep linking via `widgetURL`
- iOS cannot expose third-party unread counts; message context uses calendar/music/contact fallbacks

## Shared payload strategy

Both platforms render from the same payload shape:

```
variantData: { small, medium, large, lock }
```

Each variant contains: status, unreadCount, topMessagePreview, quickActions, topSuggestion, lastUpdatedAt.

Actions are context-matched to the top suggestion category:
- wellness → Walk
- reminder → Agenda
- conversation → Reply
- meeting with link → Join
