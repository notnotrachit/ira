# Architecture

## High-level flow

1. React Native app requests or reads contextual signals
2. Native bridges return platform-specific data in a shared schema
3. `normalizeSnapshot.ts` cleans and enriches raw native data
4. Cached snapshots hydrate the app instantly while fresh reads continue in the background
5. `suggestionEngine.ts` ranks contextual suggestions
6. `widgetPayload.ts` derives compact widget-ready state
7. Native widget sync writes payloads to shared storage
8. Android and iOS widgets render the precomputed payload

## Main layers

### App shell

- `App.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/PermissionsScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/DebugScreen.tsx`

### Intelligence layer

- `src/modules/intelligence/contextSignals.ts`
- `src/modules/intelligence/mockSnapshot.ts`
- `src/modules/intelligence/suggestionEngine.ts`
- `src/modules/intelligence/widgetPayload.ts`
- `src/modules/intelligence/hooks/*`

### Android native layer

- `ContextSignalsModule.kt`
- `ContextSignalsPackage.kt`
- `IraWidgetProvider.kt`
- `IraWidgetScheduler.kt`
- `IraWidgetRefreshWorker.kt`

### iOS native layer

- `ios/ira/ContextSignalsModule.m`
- `ios/irawidget/irawidget.swift`
- `ios/irawidget/irawidgetBundle.swift`

## Data contracts

Key shared models live in `src/modules/intelligence/types.ts`:

- `ContextSnapshot`
- `ContextualSuggestion`
- `WidgetState`
- `SharedWidgetPayload`

The widget payload intentionally avoids heavy render-time logic. Widgets consume a precomputed payload with:

- status
- unread count
- preview
- quick actions
- top suggestion
- last updated time

## Widget state model

The widget layer supports:

- `ready`
- `empty`
- `denied`
- `stale`

This allows graceful fallback on both platforms without failing the widget entirely.
