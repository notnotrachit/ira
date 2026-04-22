import { Platform, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Switch, Text } from 'react-native-paper';

import { PageLayout, pageStyles } from '../components/PageLayout';
import { getPermissionHint } from '../modules/intelligence/permissionPresentation';
import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const sourceCards: {
  source: SignalSource;
  title: string;
  description: string;
  icon: IconName;
  androidTitle?: string;
  androidDescription?: string;
  androidIcon?: IconName;
  androidOnly?: boolean;
  iosOnly?: boolean;
}[] = [
  { source: 'calendar', title: 'Calendar', description: 'See what is next and when it matters.', icon: 'calendar-clock-outline' },
  { source: 'contacts', title: 'Contacts', description: 'Add relationship context to conversations.', icon: 'account-group-outline' },
  { source: 'health', title: 'Physical Activity', description: 'Track steps and movement patterns.', icon: 'run', androidOnly: true },
  { source: 'health', title: 'Health Connect', description: 'Read steps and sleep from Health Connect.', icon: 'heart-pulse', androidOnly: true },
  { source: 'health', title: 'Health', description: 'Surface movement and recovery nudges.', icon: 'heart-pulse', iosOnly: true },
  { source: 'music', title: 'Music', description: 'Use now-playing context for focus and movement.', icon: 'music-note-outline', androidTitle: 'Notification access', androidDescription: 'Read notifications for music and message context.', androidIcon: 'bell-outline' as IconName },
  { source: 'app_usage', title: 'Usage patterns', description: 'Understand routines and timing across apps.', icon: 'chart-timeline-variant' },
  { source: 'installed_apps', title: 'Installed apps', description: 'Categorize apps to improve suggestion context.', icon: 'apps' },
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
  const isAndroid = Platform.OS === 'android';
  const visibleSources = sourceCards.filter((card) => {
    if (permissions[card.source] === 'unavailable') return false;
    if (card.androidOnly && !isAndroid) return false;
    if (card.iosOnly && isAndroid) return false;
    return true;
  });

  return (
    <PageLayout
      eyebrow="Sources"
      title="Choose your sources"
      subtitle="Only turn on the signals you actually want Ira to use."
    >
      <View style={styles.column}>
        {visibleSources.map((card, index) => {
          const title = isAndroid && card.androidTitle ? card.androidTitle : card.title;
          const description = isAndroid && card.androidDescription ? card.androidDescription : card.description;
          const icon = isAndroid && card.androidIcon ? card.androidIcon : card.icon;
          return (
            <View key={`${card.source}-${index}`} style={pageStyles.card}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={icon} size={20} color={appColors.accentStrong} />
            </View>

            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardBody}>{description}</Text>
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
          );
        })}
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
