import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type PermissionKey = SignalSource | 'health_activity' | 'health_connect';

interface SourceStep {
  permissionKey: PermissionKey;
  source: SignalSource;
  title: string;
  why: string;
  icon: IconName;
  androidTitle?: string;
  androidWhy?: string;
  androidIcon?: IconName;
  androidOnly?: boolean;
}

const sourceSteps: SourceStep[] = [
  { permissionKey: 'calendar', source: 'calendar', title: 'Calendar', why: 'See upcoming meetings and get timely prep reminders.', icon: 'calendar-clock-outline' },
  { permissionKey: 'contacts', source: 'contacts', title: 'Contacts', why: 'Add relationship context so suggestions feel personal.', icon: 'account-group-outline' },
  { permissionKey: 'health_activity', source: 'health', title: 'Physical Activity', why: 'Track steps and movement to power wellness nudges.', icon: 'run', androidOnly: true },
  { permissionKey: 'health_connect', source: 'health', title: 'Health Connect', why: 'Read steps and sleep data for recovery and activity insights.', icon: 'heart-pulse', androidOnly: true },
  { permissionKey: 'health', source: 'health', title: 'Health', why: 'Surface step counts and sleep-based wellness nudges.', icon: 'heart-pulse' },
  {
    permissionKey: 'music',
    source: 'music',
    title: 'Music',
    why: 'Detect what is playing to suggest focus or movement moments.',
    icon: 'music-note-outline',
    androidTitle: 'Notification access',
    androidWhy: 'Read notifications to detect now-playing music and summarize unread messages.',
    androidIcon: 'bell-outline' as IconName,
  },
  {
    permissionKey: 'app_usage',
    source: 'app_usage',
    title: 'Usage patterns',
    why: 'Understand routines and timing across apps.',
    icon: 'chart-timeline-variant',
    androidOnly: true,
  },
];

function stepTitle(s: SourceStep) {
  return Platform.OS === 'android' && s.androidTitle ? s.androidTitle : s.title;
}
function stepWhy(s: SourceStep) {
  return Platform.OS === 'android' && s.androidWhy ? s.androidWhy : s.why;
}
function stepIcon(s: SourceStep) {
  return Platform.OS === 'android' && s.androidIcon ? s.androidIcon : s.icon;
}

export function OnboardingScreen({
  permissions,
  onRequestPermission,
  onOpenSettings,
  onFinish,
}: {
  permissions: Record<SignalSource, PermissionState>;
  onRequestPermission: (source: SignalSource | 'health_activity' | 'health_connect') => Promise<PermissionState>;
  onOpenSettings: () => Promise<void>;
  onFinish: () => Promise<void>;
}) {
  const isAndroid = Platform.OS === 'android';
  const visibleSteps = sourceSteps.filter((s) => {
    // Hide unavailable sources
    if (permissions[s.source] === 'unavailable') return false;
    // Android-only steps only on Android
    if (s.androidOnly && !isAndroid) return false;
    // The generic 'health' step only on iOS (Android uses the split steps)
    if (s.permissionKey === 'health' && isAndroid) return false;
    return true;
  });
  const totalSteps = visibleSteps.length + 2;
  const [step, setStep] = useState(0);

  const isIntro = step === 0;
  const isDone = step === totalSteps - 1;
  const sourceIndex = step - 1;
  const currentSource = !isIntro && !isDone ? visibleSteps[sourceIndex] : null;

  // Sources where the native module opens a specific settings screen instead of the generic app settings
  const nativeSettingsSources: Set<PermissionKey> = new Set(['app_usage', 'music', 'messages_summary', 'health_connect']);

  async function handleAllow() {
    if (!currentSource) return;
    const key = currentSource.permissionKey;
    const state = permissions[currentSource.source];

    if (state === 'granted') { setStep((s) => s + 1); return; }

    // For sources with custom settings intents, always go through requestPermission
    // (the native module opens the right settings screen)
    if (nativeSettingsSources.has(key)) {
      const result = await onRequestPermission(key);
      if (result === 'granted') setTimeout(() => setStep((s) => s + 1), 400);
      return;
    }

    // For standard runtime permissions, denied means system won't show prompt again
    if (state === 'denied' || state === 'blocked') { await onOpenSettings(); return; }

    const result = await onRequestPermission(key);
    if (result === 'granted') setTimeout(() => setStep((s) => s + 1), 400);
  }

  const isGranted = currentSource ? permissions[currentSource.source] === 'granted' : false;
  const needsSettings = currentSource
    ? permissions[currentSource.source] === 'blocked' || permissions[currentSource.source] === 'denied'
    : false;

  return (
    <View style={styles.screen}>
      {/* Progress */}
      <View style={styles.stepperRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
        ))}
      </View>

      {/* Center content */}
      <View style={styles.center}>
        {isIntro && (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>Ira</Text>
            <Text style={styles.title}>A calmer way to{'\n'}see what matters.</Text>
            <Text style={styles.body}>
              Ira needs a few permissions to build your brief.{'\n'}You will be asked one at a time.
            </Text>
            <View style={styles.features}>
              <Feature icon="text-box-outline" text="One clear brief, not a noisy feed" />
              <Feature icon="shield-check-outline" text="Each permission asked individually" />
              <Feature icon="tune-variant" text="Change anything later from Sources" />
            </View>
          </View>
        )}

        {currentSource && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name={stepIcon(currentSource)} size={32} color={appColors.accentStrong} />
            </View>
            <Text style={styles.sourceTitle}>{stepTitle(currentSource)}</Text>
            <Text style={styles.body}>{stepWhy(currentSource)}</Text>

            {isGranted ? (
              <View style={styles.grantedPill}>
                <MaterialCommunityIcons name="check-circle" size={20} color={appColors.success} />
                <Text style={styles.grantedLabel}>Allowed</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => { void handleAllow(); }}
                style={({ pressed }) => [styles.allowBtn, pressed && styles.pressed]}
              >
                <Text style={styles.allowBtnText}>{needsSettings ? 'Open settings' : 'Allow'}</Text>
              </Pressable>
            )}

            {needsSettings && (
              <Text style={styles.hint}>Tap to open settings and enable this permission.</Text>
            )}
          </View>
        )}

        {isDone && (
          <View style={styles.card}>
            <Text style={styles.title}>You're all set.</Text>
            <Text style={styles.body}>Change permissions anytime from Sources.</Text>
            <View style={styles.summaryCol}>
              {visibleSteps.map((s) => {
                const granted = permissions[s.source] === 'granted';
                return (
                  <View key={s.source} style={styles.summaryRow}>
                    <MaterialCommunityIcons
                      name={granted ? 'check-circle' : 'minus-circle-outline'}
                      size={18}
                      color={granted ? appColors.success : appColors.textTertiary}
                    />
                    <Text style={[styles.summaryText, !granted && styles.summaryDim]}>{stepTitle(s)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {isIntro && (
          <>
            <Pressable onPress={() => setStep(totalSteps - 1)} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
              <Text style={styles.ghostText}>Skip all</Text>
            </Pressable>
            <Pressable onPress={() => setStep(1)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>Get started</Text>
            </Pressable>
          </>
        )}
        {currentSource && (
          <Pressable onPress={() => setStep((s) => s + 1)} style={({ pressed }) => [styles.primary, styles.fullWidth, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{isGranted ? 'Continue' : 'Skip'}</Text>
          </Pressable>
        )}
        {isDone && (
          <Pressable onPress={() => { void onFinish(); }} style={({ pressed }) => [styles.primary, styles.fullWidth, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Open Ira</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons name={icon} size={18} color={appColors.accent} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  stepperRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 12 },
  stepDot: { width: 24, height: 4, borderRadius: 999, backgroundColor: appColors.surfaceStrong },
  stepDotActive: { backgroundColor: appColors.accent },

  center: { flex: 1, justifyContent: 'center' },
  card: { borderRadius: 28, backgroundColor: appColors.surface, borderWidth: 1, borderColor: appColors.border, padding: 24, gap: 14, alignItems: 'center' },

  eyebrow: { color: appColors.accentStrong, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.6, fontSize: 13 },
  title: { color: appColors.textPrimary, fontSize: 26, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  body: { color: appColors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },

  features: { gap: 10, marginTop: 4, alignSelf: 'stretch' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: appColors.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },

  iconCircle: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: appColors.accentSoft },
  sourceTitle: { color: appColors.textPrimary, fontSize: 24, fontWeight: '700', textAlign: 'center' },

  allowBtn: { borderRadius: 999, backgroundColor: appColors.accent, paddingHorizontal: 32, paddingVertical: 14 },
  allowBtnText: { color: appColors.white, fontWeight: '700', fontSize: 16 },

  grantedPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: appColors.successSoft, paddingHorizontal: 20, paddingVertical: 10 },
  grantedLabel: { color: appColors.success, fontWeight: '700', fontSize: 15 },

  hint: { color: appColors.textTertiary, fontSize: 13, textAlign: 'center' },

  summaryCol: { gap: 10, alignSelf: 'stretch' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { color: appColors.textPrimary, fontSize: 16, fontWeight: '600' },
  summaryDim: { color: appColors.textTertiary },

  bottomBar: { flexDirection: 'row', gap: 12, paddingBottom: 24, paddingTop: 8 },
  ghost: { minWidth: 90, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, borderWidth: 1, borderColor: appColors.borderStrong },
  ghostText: { color: appColors.textPrimary, fontWeight: '700' },
  primary: { flex: 1, alignItems: 'center', backgroundColor: appColors.accent, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999 },
  primaryText: { color: appColors.white, fontWeight: '700' },
  fullWidth: { flex: 1 },
  pressed: { opacity: 0.9 },
});
