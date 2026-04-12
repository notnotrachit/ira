# Widgets

## Android

Implementation uses:

- `RemoteViews`
- `AppWidgetProvider`
- shared payload sync through `ContextSignalsModule.syncWidgetPayload`
- periodic refresh via `WorkManager`

Files:

- `android/app/src/main/java/com/ira/app/widgets/IraWidgetProvider.kt`
- `android/app/src/main/java/com/ira/app/widgets/IraWidgetScheduler.kt`
- `android/app/src/main/java/com/ira/app/widgets/IraWidgetRefreshWorker.kt`
- `android/app/src/main/res/layout/ira_widget.xml`
- `android/app/src/main/res/xml/ira_widget_info.xml`

Supported behavior:

- size-aware rendering for small, medium, and large layouts using widget width
- unread count is rendered as the primary metric when message context exists
- deep linking via `ira://...`
- quick actions
- stateful fallback rendering
- periodic refresh
- notification-driven message summaries when notification access is granted
- calmer visual hierarchy with a single primary metric, secondary context, and optional insight panel only when needed
- small and medium variants prioritize a quick reply action when unread messages exist
- low-step wellness prompts collapse to a single `Walk` action
- Android health actions target Google Fit directly and fall back to its Play Store listing when needed

## iOS

Implementation uses:

- WidgetKit
- SwiftUI
- App Group shared payload storage
- timeline refresh plus daypart-based fallback

Files:

- `ios/irawidget/irawidget.swift`
- `ios/irawidget/irawidgetBundle.swift`

Supported families:

- `.systemSmall`
- `.systemMedium`
- `.systemLarge`
- `.accessoryRectangular`

Supported behavior:

- deep linking with `widgetURL`
- shared payload decoding
- fallback widget content when no payload exists
- 15-minute refresh cadence
- daypart-aware preview content
- widget timeline reload when the app syncs a new payload
- “simple by default, informational when needed” layouts across small, medium, large, and lock-screen variants
- small, medium, and large layouts surface an unread summary when message context is present in the shared payload
- iOS does not expose third-party unread counts, so these summaries rely on the app-provided payload rather than direct cross-app message reads

## Shared payload strategy

Both platforms render from the same conceptual payload shape:

- `variantData.small`
- `variantData.medium`
- `variantData.large`
- `variantData.lock`

This keeps widget logic minimal and moves ranking/computation into the app layer.

Current payload shaping also includes:

- size-aware primary actions so compact widgets favor a single high-intent action
- a single wellness CTA for step-related prompts instead of duplicate health shortcuts
- shared unread count and preview fields used across both widget implementations
