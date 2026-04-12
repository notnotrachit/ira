# Testing

## Automated tests

Current automated coverage includes:

- suggestion engine rules
- widget payload derivation, including unread-first compact variants and single-action health nudges
- snapshot normalization and fallback logic
- JS/native bridge contract wrappers

Files:

- `src/modules/intelligence/__tests__/suggestionEngine.test.ts`
- `src/modules/intelligence/__tests__/widgetPayload.test.ts`
- `src/modules/intelligence/__tests__/normalizeSnapshot.test.ts`
- `src/modules/intelligence/__tests__/contextSignals.test.ts`
- `android/app/src/test/java/com/ira/app/intelligence/ContextSignalPermissionStateResolverTest.kt`
- `android/app/src/test/java/com/ira/app/widgets/AndroidWidgetPayloadFactoryTest.kt`
- `ios/iraTests/ContextSignalsModuleTests.m`

Run tests with:

- `pnpm test`
- `pnpm exec jest --runInBand`
- `cd android && ./gradlew app:testDebugUnitTest`
- `xcodebuild test -workspace ios/ira.xcworkspace -scheme ira -destination 'id=<simulator-id>'`

## Type validation

- `pnpm exec tsc --noEmit`

## Native validation

Native validation commands used during implementation:

- `pnpm exec expo run:android --no-install --no-bundler`
- `pnpm exec expo run:ios -d "iPhone 16 Plus" --no-install --no-bundler`

Current known issue:

- Android native assembly is presently blocked by Gradle failing to resolve `com.facebook.react.settings` from `android/settings.gradle`

## Manual QA focus areas

- app launches on both platforms
- permission requests return expected states
- widget payload sync succeeds
- widgets show fallback states correctly
- widget deep links open the app
- debug screen reflects the same snapshot used by ranking logic
