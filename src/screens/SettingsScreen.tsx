import { Platform, StyleSheet, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { PageLayout, pageStyles } from '../components/PageLayout';
import { formatPermissionState, getPermissionHint } from '../modules/intelligence/permissionPresentation';
import type { PermissionState, SignalSource } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

export function SettingsScreen({
  permissions,
  sourceEnabled,
  sourceLabels,
  onToggleSource,
}: {
  permissions: Record<SignalSource, PermissionState>;
  sourceEnabled: Record<SignalSource, boolean>;
  sourceLabels: Record<SignalSource, string>;
  onToggleSource: (source: SignalSource) => Promise<void> | void;
}) {
  const sourceOrder: SignalSource[] = [
    'calendar',
    'contacts',
    'health',
    'installed_apps',
    'app_usage',
    'music',
    'messages_summary',
  ];
  const visibleSources = sourceOrder.filter((source) => permissions[source] !== 'unavailable');

  const activeCount = visibleSources.filter((source) => sourceEnabled[source]).length;
  const grantedCount = visibleSources.filter((source) => permissions[source] === 'granted').length;

  return (
    <PageLayout
      eyebrow="Settings"
      title="Tune the brief"
      subtitle="These controls sit on top of system permissions, so you can stay selective even after granting access."
    >
      <View style={pageStyles.metricRow}>
        <View style={pageStyles.metricCard}>
          <Text style={styles.metricLabel}>Enabled</Text>
          <Text style={styles.metricValue}>{activeCount}/{visibleSources.length}</Text>
        </View>
        <View style={pageStyles.metricCard}>
          <Text style={styles.metricLabel}>Granted</Text>
          <Text style={styles.metricValue}>{grantedCount}/{visibleSources.length}</Text>
        </View>
      </View>

      <View style={styles.cardColumn}>
        {visibleSources.map((source) => (
          <View key={source} style={pageStyles.card}>
            <View style={styles.rowTop}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{sourceLabels[source]}</Text>
                <Text style={styles.rowMeta}>{formatPermissionState(permissions[source])}</Text>
              </View>
              <Switch
                value={sourceEnabled[source]}
                disabled={permissions[source] === 'unavailable'}
                onValueChange={() => {
                  void onToggleSource(source);
                }}
                color={Platform.OS === 'android' ? appColors.accent : undefined}
              />
            </View>
            <Text style={styles.rowHint}>{getPermissionHint(source, permissions[source])}</Text>
          </View>
        ))}
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  metricLabel: {
    color: appColors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: appColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  cardColumn: {
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rowHint: {
    color: appColors.textTertiary,
    lineHeight: 19,
  },
});
