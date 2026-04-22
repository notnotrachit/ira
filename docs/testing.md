# Testing

## Automated tests (34 passing)

### JS tests (`pnpm test`)

| File | Coverage |
|------|----------|
| `suggestionEngine.test.ts` | Rule matching, scoring, message previews |
| `widgetPayload.test.ts` | Variant generation, action matching, unread sync |
| `normalizeSnapshot.test.ts` | Placeholder detection, permission inheritance, app enrichment |
| `contextSignals.test.ts` | Expo Module bridge contract, widget sync serialization |
| `permissionPresentation.test.ts` | State labels, platform-specific hints, action labels |
| `storage.test.ts` | TTL staleness, onboarding persistence |

### Android tests (in module)

- `modules/expo-context-signals/android/src/test/` — widget kicker text, notification listener contract

### Type validation

```bash
pnpm exec tsc --noEmit
```

## Running tests

```bash
pnpm test                    # JS tests
pnpm exec tsc --noEmit       # Type check
```

## Manual QA focus areas

- Onboarding flow: one permission per step, denied → Open settings, granted → auto-advance
- Widget: correct actions match suggestion context, responsive across sizes
- Pull-to-refresh on Home screen
- Permission state updates when returning from settings
- Widget payload syncs on snapshot change
