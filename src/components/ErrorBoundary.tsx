import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { appColors } from '../theme/appTheme';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error('[Ira] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Something went wrong</Text>
        <Text style={styles.message}>Ira hit an unexpected error. Restart the app to continue.</Text>
        {__DEV__ && this.state.error && (
          <Text style={styles.detail}>{this.state.error.message}</Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appColors.background, justifyContent: 'center', padding: 24, gap: 12 },
  eyebrow: { color: appColors.danger, fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  message: { color: appColors.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  detail: { color: appColors.textTertiary, fontSize: 12, fontFamily: 'Courier' },
});
