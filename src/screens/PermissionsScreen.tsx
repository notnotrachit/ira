import { Platform, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Switch, Text } from 'react-native-paper';

import { PageLayout, pageStyles } from '../components/PageLayout';
import { getPermissionHint } from '../modules/intelligence/permissionPresentation';
import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

const sourceCards: {
  source: SignalSource;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { source: 'calendar', title: 'Calendar', description: 'See what is next and when it matters.', icon: 'calendar-clock-outline' },
  { source: 'contacts', title: 'Contacts', description: 'Add relationship context to conversations.', icon: 'account-group-outline' },
  { source: 'health', title: 'Health', description: 'Surface movement and recovery nudges.', icon: 'heart-pulse' },
  { source: 'music', title: 'Music', description: 'Use now-playing context for focus and movement.', icon: 'music-note-outline' },
  { source: 'app_usage', title: 'Usage patterns', description: 'Understand routines and timing across apps.', icon: 'chart-timeline-variant' },
  { source: 'messages_summary', title: 'Messages', description: 'Spot moments where catching up matters.', icon: 'message-badge-outline' },
];

export function PermissionsScreen({
  permissions,
  sourceEnabled,
  onToggleSource,
}: {
  permissions: Record<SignalSource, PermissionState>;
  sourceEnabled: Record<SignalSource, boolean>;
  onToggleSource: (source: SignalSource) => Promise<void> | void;
}) {
  const visibleSources = sourceCards.filter((card) => permissions[card.source] !== 'unavailable');

  return (
    <PageLayout
      eyebrow="Sources"
      title="Choose your sources"
      subtitle="Only turn on the signals you actually want Ira to use."
    >
      <View style={styles.column}>
        {visibleSources.map((card) => (
          <View key={card.source} style={pageStyles.card}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={card.icon} size={20} color={appColors.accentStrong} />
            </View>

            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.description}</Text>
            <Text style={styles.cardHint}>{getPermissionHint(card.source, permissions[card.source])}</Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{sourceEnabled[card.source] ? 'On' : 'Off'}</Text>
              <Switch
                value={sourceEnabled[card.source]}
                disabled={permissions[card.source] === 'unavailable'}
                onValueChange={() => {
                  void onToggleSource(card.source);
                }}
                color={Platform.OS === 'android' ? appColors.accent : undefined}
              />
            </View>
          </View>
        ))}
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.accentSoft,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    color: appColors.textPrimary,
    fontWeight: '700',
  },
});
