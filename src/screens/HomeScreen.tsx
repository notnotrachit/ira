import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { SectionHeader, PageLayout, pageStyles } from '../components/PageLayout';
import type { ContextualSuggestion, WidgetState } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

export function HomeScreen({
  widget,
  suggestions,
  lastUpdatedAt,
  isRefreshing,
  isStale,
  onRefresh,
}: {
  widget: WidgetState;
  suggestions: ContextualSuggestion[];
  lastUpdatedAt: string;
  isRefreshing: boolean;
  isStale: boolean;
  onRefresh: () => Promise<void>;
}) {
  const topSuggestion = suggestions[0];

  return (
    <PageLayout
      eyebrow="Today"
      title="Your daily brief"
      subtitle="A clean summary of what matters now, with the widget kept in sync from the same ranked context."
      headerAside={
        <Pressable
          onPress={() => {
            void onRefresh();
          }}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}
        >
          <MaterialCommunityIcons
            name={isRefreshing ? 'loading' : 'refresh'}
            size={18}
            color={appColors.white}
          />
          <Text style={styles.refreshButtonText}>{isRefreshing ? 'Syncing' : 'Refresh'}</Text>
        </Pressable>
      }
    >
      <View style={pageStyles.metricRow}>
        <MetricCard label="Suggestions" value={`${suggestions.length}`} icon="lightning-bolt-outline" />
        <MetricCard label="Updated" value={lastUpdatedAt} icon="clock-outline" subtle={isStale} />
        <MetricCard label="Widget" value={widget.status} icon="view-dashboard-outline" />
      </View>

      <View style={pageStyles.card}>
        <Text style={styles.cardEyebrow}>Now</Text>
        <Text style={styles.cardTitle}>{topSuggestion ? topSuggestion.message : 'Nothing urgent at the moment.'}</Text>
        <Text style={styles.cardMeta}>
          {topSuggestion
            ? `${formatCategory(topSuggestion.category)} · ${topSuggestion.relevanceScore.toFixed(2)}`
            : 'Ira keeps this calm unless there is a real reason to interrupt.'}
        </Text>
      </View>

      <SectionHeader
        title="Widget"
        subtitle="This is the same state the homescreen widget is reading right now."
      />
      <View style={pageStyles.card}>
        <View style={styles.widgetHeader}>
          <Text style={styles.widgetLabel}>Homescreen widget</Text>
          <View style={[styles.statusPill, statusPillStyle(widget.status)]}>
            <Text style={[styles.statusPillText, statusTextStyle(widget.status)]}>{widget.status}</Text>
          </View>
        </View>
        <Text style={styles.widgetPreview}>
          {widget.topSuggestion?.message ?? widget.topMessagePreview ?? 'Quiet for now.'}
        </Text>
        {widget.quickActions.length > 0 ? (
          <View style={styles.quickActionsRow}>
            {widget.quickActions.slice(0, 2).map((action) => (
              <View key={action.deepLink} style={styles.quickActionChip}>
                <Text style={styles.quickActionText}>{action.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <SectionHeader
        title="Suggestions"
        subtitle="Ranked by urgency, timing, and signal quality."
      />
      <View style={styles.listColumn}>
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => (
            <View key={suggestion.id} style={pageStyles.card}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionCategory}>{formatCategory(suggestion.category)}</Text>
                <Text style={styles.suggestionScore}>{suggestion.relevanceScore.toFixed(2)}</Text>
              </View>
              <Text style={styles.suggestionText}>{suggestion.message}</Text>
              <Text style={styles.suggestionMeta}>Source: {formatSourceName(suggestion.source)}</Text>
            </View>
          ))
        ) : (
          <View style={pageStyles.card}>
            <Text style={styles.emptyTitle}>Quiet for now</Text>
            <Text style={styles.emptyText}>
              Once calendar, health, or message context becomes relevant, Ira will surface it here.
            </Text>
          </View>
        )}
      </View>

    </PageLayout>
  );
}

function MetricCard({
  label,
  value,
  icon,
  subtle,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  subtle?: boolean;
}) {
  return (
    <View style={[pageStyles.metricCard, subtle && styles.metricCardSubtle]}>
      <MaterialCommunityIcons name={icon} size={18} color={subtle ? appColors.warning : appColors.accentStrong} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatSourceName(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function statusPillStyle(status: WidgetState['status']) {
  switch (status) {
    case 'ready':
      return { backgroundColor: appColors.successSoft };
    case 'stale':
      return { backgroundColor: appColors.warningSoft };
    case 'denied':
      return { backgroundColor: appColors.dangerSoft };
    default:
      return { backgroundColor: appColors.surfaceStrong };
  }
}

function statusTextStyle(status: WidgetState['status']) {
  switch (status) {
    case 'ready':
      return { color: appColors.success };
    case 'stale':
      return { color: appColors.warning };
    case 'denied':
      return { color: appColors.danger };
    default:
      return { color: appColors.textSecondary };
  }
}

const styles = StyleSheet.create({
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: appColors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  refreshButtonText: {
    color: appColors.white,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.92,
  },
  metricCardSubtle: {
    backgroundColor: appColors.surfaceAccent,
  },
  metricLabel: {
    color: appColors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  metricValue: {
    color: appColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  cardEyebrow: {
    color: appColors.accentStrong,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    color: appColors.textPrimary,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
  },
  cardMeta: {
    color: appColors.textSecondary,
    lineHeight: 20,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetLabel: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  widgetPreview: {
    color: appColors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionChip: {
    borderRadius: 999,
    backgroundColor: appColors.surfaceStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionText: {
    color: appColors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  listColumn: {
    gap: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionCategory: {
    color: appColors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionScore: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionText: {
    color: appColors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },
  suggestionMeta: {
    color: appColors.textSecondary,
    fontSize: 12,
  },
  emptyTitle: {
    color: appColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: appColors.textSecondary,
    lineHeight: 21,
  },
});
