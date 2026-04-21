import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { PageLayout, pageStyles, SectionHeader } from '../components/PageLayout';
import { appColors } from '../theme/appTheme';

export function SettingsScreen() {
  return (
    <PageLayout
      eyebrow="Settings"
      title="About the experience"
      subtitle="A quick explanation of how Ira behaves, without repeating source or permission controls."
    >
      <SectionHeader title="Widget behavior" subtitle="What the homescreen widget optimizes for." />
      <View style={pageStyles.card}>
        <SettingLine title="Quiet by default" body="The widget stays minimal unless there is a clear reason to show something actionable." />
        <SettingLine title="External actions" body="Health, calendar, and reply actions open the relevant app whenever the platform allows it." />
        <SettingLine title="Background refresh" body="Refresh timing is managed by iOS and Android, so updates are periodic rather than instant." />
      </View>

      <SectionHeader title="Privacy" subtitle="How context is handled." />
      <View style={pageStyles.card}>
        <SettingLine title="Permission-led" body="Ira only uses sources you explicitly connect." />
        <SettingLine title="On-device first" body="Signals are normalized locally and synced into widget payloads on the device." />
        <SettingLine title="Source control" body="You can turn individual sources on or off from the Sources tab at any time." />
      </View>

      <SectionHeader title="Design intent" subtitle="How the app is meant to feel." />
      <View style={pageStyles.card}>
        <Text style={styles.statement}>
          Ira should feel calm, legible, and useful at a glance — more like a good system surface than a dashboard.
        </Text>
      </View>
    </PageLayout>
  );
}

function SettingLine({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.lineItem}>
      <Text style={styles.lineTitle}>{title}</Text>
      <Text style={styles.lineBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lineItem: {
    gap: 4,
  },
  lineTitle: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  lineBody: {
    color: appColors.textSecondary,
    lineHeight: 21,
  },
  statement: {
    color: appColors.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
  },
});
