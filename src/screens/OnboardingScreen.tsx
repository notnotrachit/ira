import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import {
  formatPermissionState,
  getPermissionActionLabel,
  getPermissionHint,
} from '../modules/intelligence/permissionPresentation';
import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

const recommendedSources: SignalSource[] = ['calendar', 'contacts', 'health', 'music'];

export function OnboardingScreen({
  permissions,
  onRequestPermission,
  onOpenSettings,
  onFinish,
}: {
  permissions: Record<SignalSource, PermissionState>;
  onRequestPermission: (source: SignalSource) => Promise<PermissionState>;
  onOpenSettings: () => Promise<void>;
  onFinish: () => Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  const completionCount = useMemo(
    () => recommendedSources.filter((source) => permissions[source] === 'granted').length,
    [permissions]
  );

  async function handlePermission(source: SignalSource) {
    if (permissions[source] === 'blocked') {
      await onOpenSettings();
      return;
    }

    await onRequestPermission(source);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Ira</Text>
        <Text style={styles.title}>A calmer way to see what matters next.</Text>
        <Text style={styles.subtitle}>
          Start with a few useful sources. Ira turns them into one clear brief instead of a noisy feed.
        </Text>
        <Text style={styles.progressText}>{completionCount} of 4 recommended sources connected</Text>
      </View>

      <View style={styles.stepperRow}>
        {[0, 1, 2].map((step) => (
          <View key={step} style={[styles.stepDot, step <= stepIndex && styles.stepDotActive]} />
        ))}
      </View>

      {stepIndex === 0 ? (
        <View style={styles.card}>
          <FeatureRow
            icon="text-box-outline"
            title="One clear brief"
            body="The app leads with the single thing most worth your attention right now."
          />
          <FeatureRow
            icon="shield-check-outline"
            title="Only ask when useful"
            body="Each permission request is tied to a visible benefit, and you can say no."
          />
          <FeatureRow
            icon="tune-variant"
            title="Easy to tune later"
            body="You can change what Ira uses at any time from Access and Settings."
          />

          <FooterActions
            primaryLabel="Continue"
            onPrimary={() => setStepIndex(1)}
            secondaryLabel="Skip intro"
            onSecondary={() => setStepIndex(2)}
          />
        </View>
      ) : null}

      {stepIndex === 1 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recommended setup</Text>
          <Text style={styles.sectionSubtitle}>
            Start with the sources that make the biggest difference on day one.
          </Text>

          {recommendedSources.map((source) => (
            <View key={source} style={styles.permissionCard}>
              <View style={styles.permissionTopRow}>
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionTitle}>{formatSourceName(source)}</Text>
                  <Text style={styles.permissionValue}>{formatPermissionState(permissions[source])}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    void handlePermission(source);
                  }}
                  style={({ pressed }) => [styles.inlineButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.inlineButtonText}>
                    {getPermissionActionLabel(source, permissions[source])}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.permissionHint}>{getPermissionHint(source, permissions[source])}</Text>
            </View>
          ))}

          <FooterActions
            primaryLabel="Continue"
            onPrimary={() => setStepIndex(2)}
            secondaryLabel="Back"
            onSecondary={() => setStepIndex(0)}
          />
        </View>
      ) : null}

      {stepIndex === 2 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>You’re ready to start.</Text>
          <Text style={styles.sectionSubtitle}>
            You can refine permissions and turn sources on or off later from Access and Settings.
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>What you’ll see</Text>
            <Text style={styles.summaryBody}>A single top brief on Home</Text>
            <Text style={styles.summaryBody}>Extra suggestions only when there is something else worth seeing</Text>
            <Text style={styles.summaryBody}>Graceful fallbacks when a source is off or unavailable</Text>
          </View>

          <FooterActions
            primaryLabel="Open Ira"
            onPrimary={() => {
              void onFinish();
            }}
            secondaryLabel="Back"
            onSecondary={() => setStepIndex(1)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={appColors.accentStrong} />
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

function FooterActions({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <View style={styles.footerRowBetween}>
      <Pressable onPress={onSecondary} style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]}>
        <Text style={styles.ghostButtonText}>{secondaryLabel}</Text>
      </Pressable>
      <Pressable onPress={onPrimary} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
        <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
      </Pressable>
    </View>
  );
}

function formatSourceName(source: SignalSource) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    borderRadius: 32,
    backgroundColor: appColors.surface,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    color: appColors.accentStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  title: {
    color: appColors.textPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    color: appColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  progressText: {
    color: appColors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 34,
    height: 5,
    borderRadius: 999,
    backgroundColor: appColors.surfaceStrong,
  },
  stepDotActive: {
    backgroundColor: appColors.accent,
  },
  card: {
    borderRadius: 28,
    backgroundColor: appColors.surface,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 18,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.accentSoft,
  },
  featureCopy: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: appColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  featureBody: {
    color: appColors.textSecondary,
    lineHeight: 21,
  },
  sectionTitle: {
    color: appColors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: appColors.textSecondary,
    lineHeight: 21,
  },
  permissionCard: {
    borderRadius: 22,
    backgroundColor: appColors.surfaceStrong,
    padding: 16,
    gap: 8,
  },
  permissionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  permissionCopy: {
    flex: 1,
    gap: 3,
  },
  permissionTitle: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  permissionValue: {
    color: appColors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
  },
  permissionHint: {
    color: appColors.textSecondary,
    lineHeight: 19,
    fontSize: 13,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: appColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineButtonText: {
    color: appColors.white,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: appColors.surfaceStrong,
    padding: 16,
    gap: 8,
  },
  summaryTitle: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryBody: {
    color: appColors.textSecondary,
    lineHeight: 20,
  },
  footerRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: appColors.accent,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: appColors.white,
    fontWeight: '700',
  },
  ghostButton: {
    minWidth: 96,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
  },
  ghostButtonText: {
    color: appColors.textPrimary,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.92,
  },
});
