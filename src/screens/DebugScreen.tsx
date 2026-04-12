import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { PageLayout, pageStyles } from '../components/PageLayout';
import type { ContextSnapshot, ContextualSuggestion, WidgetState } from '../modules/intelligence/types';
import { appColors } from '../theme/appTheme';

export function DebugScreen({
  snapshot,
  suggestions,
  widget,
}: {
  snapshot: ContextSnapshot | null;
  suggestions: ContextualSuggestion[];
  widget: WidgetState;
}) {
  return (
    <PageLayout
      eyebrow="Debug"
      title="Inspect the pipeline"
      subtitle="Use this screen to verify the exact snapshot, ranking output, and widget payload being generated."
    >
      <DebugCard title="Raw snapshot" value={snapshot ? JSON.stringify(snapshot, null, 2) : 'No snapshot loaded'} />
      <DebugCard title="Suggestions" value={JSON.stringify(suggestions, null, 2)} />
      <DebugCard title="Widget payload" value={JSON.stringify(widget, null, 2)} />
    </PageLayout>
  );
}

function DebugCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={pageStyles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.code}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: appColors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  code: {
    color: appColors.textSecondary,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
});
