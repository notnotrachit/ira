import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { appColors } from '../theme/appTheme';

export function PageLayout({
  eyebrow,
  title,
  subtitle,
  headerAside,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  headerAside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerAside ? <View style={styles.headerAside}>{headerAside}</View> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export const pageStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: appColors.surface,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 18,
    gap: 12,
  },
  softCard: {
    borderRadius: 22,
    backgroundColor: appColors.surfaceStrong,
    padding: 16,
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: appColors.surfaceStrong,
    padding: 14,
    gap: 6,
  },
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerAside: {
    alignSelf: 'stretch',
  },
  eyebrow: {
    color: appColors.accentStrong,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: appColors.textPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    color: appColors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: appColors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: appColors.textSecondary,
    lineHeight: 20,
  },
});
