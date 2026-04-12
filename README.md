# Ira Cross-App Intelligence

React Native prototype for a cross-app intelligence engine with Android and iOS home-screen widgets, native context bridges, permission-aware onboarding, and a rule-based suggestion engine.

## What is implemented

- Android home-screen widget with `RemoteViews`
- iOS WidgetKit extension with small, medium, large, and accessory rectangular support
- Native context bridge on Android and iOS
- Rule-based contextual suggestion engine
- Progressive permission UI and settings/source controls
- Shared widget payload generation and sync
- Snapshot normalization plus on-device caching with TTL
- Android periodic widget refresh via `WorkManager`
- iOS widget timeline refresh with daypart-aware fallback behavior
- Android notification-based message summaries for widget and suggestion context
- iOS HealthKit steps/sleep reads plus Apple Music now-playing context where available
- Widget variants that surface unread context when available:
  - Android small: unread count plus quick chat entry
  - Android medium: unread count, preview, and actions
  - Android large: preview, actions, and contextual suggestion
  - iOS small, medium, and large: unread count summary when message context exists
- Health step nudges collapse to a single `Walk` action, and Android routes that action to Google Fit
- iOS permission UI hides sources that are not requestable on iOS instead of rendering unavailable toggles
- Debug screen component for raw signals, suggestions, and widget payloads
- Jest tests for suggestion engine, widget payload builder, snapshot normalization, and JS/native bridge contracts

## Project structure

- `App.tsx`: app shell and screen switching
- `src/screens/`: home, permissions, settings, and debug screens
- `src/modules/intelligence/`: types, hooks, engine, bridge wrapper, tests
- `android/app/src/main/java/com/ira/app/intelligence/`: Android native module bridge
- `android/app/src/main/java/com/ira/app/widgets/`: Android widget provider, scheduler, worker
- `ios/ira/ContextSignalsModule.m`: iOS native module bridge
- `ios/irawidget/`: WidgetKit extension

## Starter commands

Use the generated starter commands:

- `pnpm start`
- `pnpm android`
- `pnpm ios`
- `pnpm test`

For direct validation used during implementation:

- `pnpm exec tsc --noEmit`
- `pnpm exec jest --runInBand`
- `pnpm exec expo run:android --no-install --no-bundler`
- `pnpm exec expo run:ios -d "iPhone 16 Plus" --no-install --no-bundler`

## Implementation docs

- `IMPLEMENTATION_PLAN.md`
- `docs/architecture.md`
- `docs/widgets.md`
- `docs/permissions.md`
- `docs/testing.md`
- `docs/tradeoffs.md`

## Current limitations

- iOS does not expose installed apps or broad app usage patterns the way Android does
- iOS still cannot expose unread message counts from other apps, so message summaries fall back to privacy-preserving contextual copy
- Android widget uses `RemoteViews`; migrating to `Jetpack Glance` would improve expressiveness
- Native tests currently focus on JS/native contracts and payload logic rather than full widget/UI automation
- Android native assembly is currently blocked by a React Native Gradle settings plugin resolution issue in `android/settings.gradle`
