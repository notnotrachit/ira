# Permissions

## UX strategy

Progressive one-at-a-time onboarding:

1. Intro screen explains the app
2. Each permission requested individually with clear justification
3. Shows "✓ Allowed" on grant, auto-advances
4. Shows "Open settings" when denied (system won't re-prompt)
5. Sources with custom settings (notification access, usage, Health Connect) open the correct settings screen
6. Skip button on every step
7. Summary screen at the end

## Android permissions

| Source | Permission type | How requested |
|--------|----------------|---------------|
| Calendar | `READ_CALENDAR` | Runtime prompt |
| Contacts | `READ_CONTACTS` | Runtime prompt |
| Physical Activity | `ACTIVITY_RECOGNITION` | Runtime prompt |
| Health Connect | Steps + Sleep | `react-native-health-connect` JS API |
| Notification access | NotificationListenerService | Opens system settings |
| Usage patterns | `PACKAGE_USAGE_STATS` | Opens usage access settings |

## iOS permissions

| Source | Framework | How requested |
|--------|-----------|---------------|
| Calendar | EventKit | Runtime prompt |
| Contacts | Contacts | Runtime prompt |
| Health | HealthKit | Runtime prompt |
| Music | MediaPlayer | Runtime prompt |

`installed_apps`, `app_usage`, and `messages_summary` are `unavailable` on iOS — hidden from UI.

## Permission states

- `granted` — active and contributing
- `denied` — user denied, needs settings
- `blocked` — permanently blocked or needs external setup
- `unavailable` — not supported on this platform
- `not_determined` — not yet requested

## Denied permission handling

JS-side `usePermissions` hook tracks local overrides from request results. When the native snapshot returns `not_determined` after a denial (Android limitation), the local override preserves the `denied` state so the UI correctly shows "Open settings".

## Sources tab

Shows all available sources with toggles. Platform-specific labels:
- Android: "Notification access" (not "Music") with bell icon
- Health split into "Physical Activity" + "Health Connect" on Android, single "Health" on iOS
- Unavailable sources hidden automatically
