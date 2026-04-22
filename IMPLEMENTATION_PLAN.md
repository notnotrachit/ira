# Implementation Plan

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Native App                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Home    │  │ Sources  │  │ Settings │  │  Debug   │       │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Screen  │       │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────┬─────┘       │
│       │              │                           │              │
│  ┌────▼──────────────▼───────────────────────────▼─────┐       │
│  │                    App.tsx                           │       │
│  │  useOnboarding · useSourcePreferences · useWidget   │       │
│  └────┬──────────────┬───────────────────────────┬─────┘       │
│       │              │                           │              │
│  ┌────▼────┐   ┌─────▼──────┐   ┌───────────────▼──────┐      │
│  │ useCon- │   │ usePermi-  │   │    useWidget         │      │
│  │ textual │   │ ssions     │   │ buildSharedWidget-   │      │
│  │ Sugges- │   │            │   │ Payload → sync to   │      │
│  │ tions   │   │            │   │ native              │      │
│  └────┬────┘   └────────────┘   └──────────────────────┘      │
│       │                                                        │
│  ┌────▼─────────────────────────────────────────────┐          │
│  │           Intelligence Layer                      │          │
│  │                                                   │          │
│  │  contextSignals.ts ──► normalizeSnapshot.ts       │          │
│  │         │                      │                  │          │
│  │         ▼                      ▼                  │          │
│  │  mockSnapshot.ts      suggestionEngine.ts         │          │
│  │  storage.ts           widgetPayload.ts            │          │
│  │  permissionPresentation.ts                        │          │
│  └──────────┬────────────────────────────────────────┘          │
│             │                                                   │
│             │  NativeModules.ContextSignalsModule                │
│             ▼                                                   │
├─────────────────────────────────────────────────────────────────┤
│                     Native Bridge                               │
├──────────────────────────┬──────────────────────────────────────┤
│       Android            │            iOS                       │
│                          │                                      │
│  ContextSignalsModule.kt │  ContextSignalsModule.m              │
│  ├─ Calendar (ContentR.) │  ├─ Calendar (EventKit)              │
│  ├─ Contacts (ContentR.) │  ├─ Contacts (CNContact)             │
│  ├─ Health (HealthConn.) │  ├─ Health (HealthKit)               │
│  ├─ Music (MediaSession) │  ├─ Music (MediaPlayer)              │
│  ├─ Apps (PackageManager)│  └─ Widget reload (WidgetCenter)     │
│  ├─ Usage (UsageStats)   │                                      │
│  ├─ Messages (Notif.Lst.)│  irawidget.swift (WidgetKit)         │
│  └─ Widget sync (Prefs)  │  ├─ Small / Medium / Large / Lock   │
│                          │  ├─ Daypart-aware fallback           │
│  IraWidgetProvider.kt    │  └─ App Group shared payload         │
│  ├─ RemoteViews          │                                      │
│  ├─ Size-aware rendering │                                      │
│  ├─ Deep link actions    │                                      │
│  └─ Reply via notif.     │                                      │
│                          │                                      │
│  IraWidgetScheduler.kt   │                                      │
│  └─ WorkManager 15min    │                                      │
├──────────────────────────┴──────────────────────────────────────┤
│                    Shared Payload Shape                          │
│  { small, medium, large, lock } → status, unread, preview,     │
│    quickActions, topSuggestion, lastUpdatedAt                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. `useContextualSuggestions` fetches a `ContextSnapshot` via the native bridge (or mock fallback)
2. `normalizeSnapshot` cleans, sorts, enriches, and derives message previews
3. `suggestionEngine` generates ranked `ContextualSuggestion[]` from the snapshot
4. `useWidget` builds a `SharedWidgetPayload` and syncs it to native storage
5. Android `IraWidgetProvider` / iOS WidgetKit read the payload and render

## Modules

| Module | Purpose |
|--------|---------|
| `contextSignals.ts` | JS↔Native bridge wrapper |
| `normalizeSnapshot.ts` | Clean and enrich raw native data |
| `suggestionEngine.ts` | Rule-based contextual ranking |
| `widgetPayload.ts` | Derive widget-ready state per variant |
| `storage.ts` | AsyncStorage caching with TTL |
| `permissionPresentation.ts` | Platform-aware permission copy |
| `useContextualSuggestions` | Snapshot lifecycle, caching, refresh |
| `usePermissions` | Permission state and request flow |
| `useSourcePreferences` | Source toggles synced to permissions |
| `useOnboarding` | Onboarding completion state |
| `useWidget` | Widget payload build and native sync |

## Key Decisions

- **RemoteViews over Jetpack Glance** — faster to validate, more predictable in a greenfield setup
- **Rule-based engine over ML** — deterministic, explainable, appropriate for 72-hour scope
- **Shared payload shape** — widgets consume precomputed data, no render-time logic
- **Platform-honest permissions** — iOS hides unavailable sources instead of showing dead toggles
- **Notification listener for Android messages/music** — single permission covers both signals
