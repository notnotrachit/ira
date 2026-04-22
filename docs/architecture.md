# Architecture

## High-level flow

1. React Native app requests contextual signals via Expo Module bridge
2. Native module returns platform-specific data in a shared schema
3. `normalizeSnapshot.ts` cleans and enriches raw data
4. Cached snapshots hydrate the app instantly while fresh reads continue in background
5. `suggestionEngine.ts` ranks contextual suggestions
6. `widgetPayload.ts` derives compact widget-ready state per variant
7. Native widget sync writes payloads to shared storage
8. Android and iOS widgets render the precomputed payload

## Main layers

### App shell

- `App.tsx` — tab navigation (Home, Sources)
- `src/screens/HomeScreen.tsx` — daily brief with pull-to-refresh
- `src/screens/PermissionsScreen.tsx` — source toggles
- `src/screens/OnboardingScreen.tsx` — one-at-a-time permission flow

### Intelligence layer

- `src/modules/intelligence/contextSignals.ts` — bridge wrapper
- `src/modules/intelligence/normalizeSnapshot.ts`
- `src/modules/intelligence/suggestionEngine.ts`
- `src/modules/intelligence/widgetPayload.ts`
- `src/modules/intelligence/storage.ts`
- `src/modules/intelligence/permissionPresentation.ts`
- `src/modules/intelligence/hooks/*`

### Native layer (Expo Module)

All native code lives in `modules/expo-context-signals/`:

- `android/` — Expo Module (Kotlin), widget provider, notification listener
- `ios/` — Expo Module (Swift)
- `ios-widget-extension/` — WidgetKit files (added to Xcode project via config plugin)

### Config plugins

- `plugins/withIraNativeConfig.js` — Android manifest entries, Health Connect queries, minSdk
- `plugins/withIraWidgetExtension.js` — iOS WidgetKit extension target creation

## Data contracts

Key shared models in `src/modules/intelligence/types.ts`:

- `ContextSnapshot` — all cross-app signals
- `ContextualSuggestion` — ranked suggestion with message, score, source, category, deep link
- `WidgetState` — status, unread, preview, actions, suggestion
- `SharedWidgetPayload` — variant data for small/medium/large/lock

## Widget state model

- `ready` — signals available, content rendered
- `empty` — no usable signals
- `denied` — key permissions blocked
- `stale` — snapshot older than 30 minutes
