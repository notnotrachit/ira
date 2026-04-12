import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { PageLayout, pageStyles } from '../components/PageLayout';
import {
  formatPermissionState,
  getPermissionActionLabel,
  getPermissionHint,
} from '../modules/intelligence/permissionPresentation';
import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

const permissionCards: {
  source: SignalSource;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { source: 'calendar', title: 'Calendar', description: 'Helps Ira spot what is next and when it matters.', icon: 'calendar-clock-outline' },
  { source: 'contacts', title: 'Contacts', description: 'Lets Ira understand who matters most in your day-to-day communication.', icon: 'account-group-outline' },
  { source: 'health', title: 'Health', description: 'Powers movement and recovery nudges from steps and sleep context.', icon: 'heart-pulse' },
  { source: 'music', title: 'Music', description: 'Adds now-playing context for focus and movement moments.', icon: 'music-note-outline' },
  { source: 'app_usage', title: 'Usage patterns', description: 'Helps Ira understand routines and timing across active apps.', icon: 'chart-timeline-variant' },
  { source: 'messages_summary', title: 'Messages', description: 'Surfaces catch-up moments where platform access is available.', icon: 'message-badge-outline' },
];

export function PermissionsScreen({
  permissions,
  onRequestPermission,
  onOpenSettings,
}: {
  permissions: Record<SignalSource, PermissionState>;
  onRequestPermission: (source: SignalSource) => Promise<PermissionState>;
  onOpenSettings: () => Promise<void>;
}) {
  const visiblePermissionCards = permissionCards.filter((card) => permissions[card.source] !== 'unavailable');

  async function handlePermission(source: SignalSource) {
    const state = permissions[source];
    if (state === 'blocked') {
      await onOpenSettings();
      return;
    }

    const result = await onRequestPermission(source);
    Alert.alert('Permission update', `${formatPermissionState(result)}\n\n${getPermissionHint(source, result)}`);
  }

  return (
    <PageLayout
      eyebrow="Access"
      title="Choose what Ira can use"
      subtitle="Each source is requested only when it improves something visible in the app or widget."
    >
      <View style={pageStyles.card}>
        <Text style={styles.heroTitle}>Progressive by design</Text>
        <Text style={styles.heroText}>
          Ira should feel useful before it asks for more. Permissions are scoped, explainable, and safe to decline.
        </Text>
      </View>

      <View style={styles.cardColumn}>
        {visiblePermissionCards.map((card) => {
          const state = permissions[card.source];
          const palette = getStatePalette(state);

          return (
            <View key={card.source} style={pageStyles.card}>
              <View style={styles.rowTop}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={card.icon} size={20} color={appColors.accentStrong} />
                </View>
                <View style={[styles.statePill, { backgroundColor: palette.backgroundColor }]}>
                  <Text style={[styles.statePillText, { color: palette.color }]}>{formatPermissionState(state)}</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.description}</Text>
              <Text style={styles.cardHint}>{getPermissionHint(card.source, state)}</Text>

              <Pressable
                onPress={() => {
                  void handlePermission(card.source);
                }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.actionButtonText}>{getPermissionActionLabel(card.source, state)}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </PageLayout>
  );
}

function getStatePalette(state: PermissionState) {
  switch (state) {
    case 'granted':
      return { backgroundColor: appColors.successSoft, color: appColors.success };
    case 'denied':
    case 'blocked':
      return { backgroundColor: appColors.dangerSoft, color: appColors.danger };
    case 'unavailable':
      return { backgroundColor: appColors.surfaceStrong, color: appColors.textTertiary };
    default:
      return { backgroundColor: appColors.warningSoft, color: appColors.warning };
  }
}

const styles = StyleSheet.create({
  heroTitle: {
    color: appColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  heroText: {
    color: appColors.textSecondary,
    lineHeight: 22,
  },
  cardColumn: {
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.accentSoft,
  },
  statePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: appColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    color: appColors.textSecondary,
    lineHeight: 21,
  },
  cardHint: {
    color: appColors.textTertiary,
    lineHeight: 19,
  },
  actionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: appColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  actionButtonText: {
    color: appColors.white,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.92,
  },
});
