import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { PageLayout, SectionHeader, pageStyles } from '../components/PageLayout';
import type { ContextualSuggestion } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

export function HomeScreen({
  suggestions,
}: {
  suggestions: ContextualSuggestion[];
}) {
  const topSuggestion = suggestions[0];
  const remainingSuggestions = topSuggestion
    ? suggestions.filter((suggestion) => suggestion.id !== topSuggestion.id)
    : suggestions;

  return (
    <PageLayout
      eyebrow="Today"
      title="Your daily brief"
      subtitle="The most important thing first. If anything else matters, it appears below."
    >
      <View style={pageStyles.card}>
        <Text style={styles.cardEyebrow}>Now</Text>
        <Text style={styles.cardTitle}>{topSuggestion ? topSuggestion.message : 'Nothing urgent at the moment.'}</Text>
        <Text style={styles.cardMeta}>
          {topSuggestion
            ? `${formatCategory(topSuggestion.category)} from ${formatSourceName(topSuggestion.source)}`
            : 'Ira keeps this calm unless there is a real reason to interrupt.'}
        </Text>
      </View>

      {remainingSuggestions.length > 0 ? (
        <>
          <SectionHeader title="Up next" subtitle="Additional context after the current brief." />
          <View style={styles.listColumn}>
            {remainingSuggestions.map((suggestion) => (
              <View key={suggestion.id} style={pageStyles.card}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionCategory}>{formatCategory(suggestion.category)}</Text>
                  <Text style={styles.suggestionSource}>{formatSourceName(suggestion.source)}</Text>
                </View>
                <Text style={styles.suggestionText}>{suggestion.message}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </PageLayout>
  );
}

function formatSourceName(source: string) {
  return source.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

const styles = StyleSheet.create({
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
  suggestionSource: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionText: {
    color: appColors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },
});
