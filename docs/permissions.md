# Permissions

## UX strategy

The app uses a progressive permission model:

1. explain value first
2. request only the sources needed for visible features
3. degrade gracefully if denied
4. allow source-level toggles even after permission grant
5. provide a direct settings escape hatch

## Current requests

### Android

- `READ_CALENDAR`
- `READ_CONTACTS`
- notification listener access for music context and message summaries

App usage is modeled but not requested inline yet because it typically requires settings-based access.

### iOS

- calendar via `EventKit`
- contacts via `Contacts`
- health via `HealthKit`
- music via `MediaPlayer`

`installed_apps`, `app_usage`, and `messages_summary` are intentionally unavailable on iOS because the platform does not expose those signals to third-party apps in a general-purpose way.

## App screens

- `PermissionsScreen`: request entry point and source rationale. On iOS, sources whose permission state resolves to `unavailable` are hidden instead of shown as dead-end cards.
- `SettingsScreen`: source toggles and system settings shortcut. On iOS, only requestable sources are listed.

## Permission states

Supported permission state values:

- `granted`
- `denied`
- `blocked`
- `unavailable`
- `not_determined`

These states feed both the permission UI and widget fallback behavior.

## Platform notes

- Android uses notification-listener access to derive message summaries and music context.
- Android app usage remains modeled in the intelligence layer, but access still depends on settings-based usage stats access rather than an inline runtime prompt.
- iOS widget and suggestion fallbacks are expected for unavailable sources; the UI now avoids prompting for them.
