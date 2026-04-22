import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  DarkTheme as NavigationDarkTheme,
  NavigationContainer,
  getStateFromPath,
} from '@react-navigation/native';
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabIcon,
} from '@react-navigation/bottom-tabs/unstable';
import { ActivityIndicator, PaperProvider, Surface, Text } from 'react-native-paper';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { useContextualSuggestions } from './src/modules/intelligence/hooks/useContextualSuggestions';
import { useOnboarding } from './src/modules/intelligence/hooks/useOnboarding';
import { usePermissions } from './src/modules/intelligence/hooks/usePermissions';
import { useSourcePreferences } from './src/modules/intelligence/hooks/useSourcePreferences';
import { useWidget } from './src/modules/intelligence/hooks/useWidget';
import { appColors, appTheme } from './src/theme/appTheme';

type TabParamList = {
  Home: undefined;
  Sources: undefined;
};

const Tab = createNativeBottomTabNavigator<TabParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <ErrorBoundary>
          <IraApp />
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const navigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    background: appColors.background,
    card: appColors.surface,
    primary: appColors.accent,
    text: appColors.textPrimary,
    border: appColors.border,
    notification: appColors.danger,
  },
};

const linking = {
  prefixes: ['ira://'],
  getStateFromPath(path: string, options: Parameters<typeof getStateFromPath>[1]) {
    const normalizedPath =
      path === 'chat' || path === 'calendar' || path === 'health' ? 'home' : path === 'permissions' ? 'sources' : path;
    return getStateFromPath(normalizedPath, options);
  },
  config: {
    screens: { Home: 'home', Sources: 'sources' },
  },
};

const tabIcons: Record<keyof TabParamList, {
  ios: ({ focused }: { focused: boolean }) => NativeBottomTabIcon;
  android: ReturnType<typeof require>;
}> = {
  Home: {
    ios: ({ focused }) => ({ type: 'sfSymbol' as const, name: focused ? 'house.fill' as const : 'house' as const }),
    android: require('./assets/tabs/home.png'),
  },
  Sources: {
    ios: ({ focused }) => ({ type: 'sfSymbol' as const, name: focused ? 'shield.fill' as const : 'shield' as const }),
    android: require('./assets/tabs/access.png'),
  },
};

function IraApp() {
  const { hasCompleted: hasCompletedOnboarding, isLoading: isOnboardingLoading, finish: finishOnboarding } = useOnboarding();
  const { snapshot, suggestions, refresh, isRefreshing } = useContextualSuggestions();
  const { permissions, requestPermission, openSettings, isPermissionRequestable } = usePermissions(snapshot, refresh);
  const { sourceEnabled, enabledSuggestions, handleSourceToggle } = useSourcePreferences(
    permissions, suggestions, requestPermission, openSettings, isPermissionRequestable, isOnboardingLoading,
  );
  useWidget(snapshot, suggestions);

  if (isOnboardingLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <BackgroundDecor />
        <Surface style={styles.loadingCard} elevation={2}>
          <Text variant="labelLarge" style={styles.loadingEyebrow}>Ira</Text>
          <Text variant="headlineMedium" style={styles.loadingTitle}>Setting up your daily brief</Text>
          <Text variant="bodyLarge" style={styles.loadingSubtitle}>Restoring preferences and loading the signals that shape your brief.</Text>
          <ActivityIndicator animating color={appTheme.colors.primary} style={styles.loadingSpinner} />
        </Surface>
      </SafeAreaView>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <BackgroundDecor />
        <OnboardingScreen
          permissions={permissions}
          onRequestPermission={requestPermission}
          onOpenSettings={openSettings}
          onFinish={finishOnboarding}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <BackgroundDecor />
      <View style={styles.screenBody}>
        <NavigationContainer theme={navigationTheme} linking={linking}>
          <Tab.Navigator
            backBehavior="history"
            screenOptions={({ route }) => ({
              headerShown: false,
              lazy: false,
              tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
              tabBarActiveTintColor: appColors.white,
              tabBarInactiveTintColor: appColors.textTertiary,
              tabBarActiveIndicatorColor: appColors.accent,
              tabBarStyle: { backgroundColor: Platform.OS === 'android' ? appColors.navBackground : 'transparent' },
              tabBarBlurEffect: 'systemUltraThinMaterial',
              tabBarMinimizeBehavior: 'onScrollDown',
              tabBarIcon: Platform.OS === 'ios'
                ? tabIcons[route.name].ios
                : { type: 'image', source: tabIcons[route.name].android },
            })}
          >
            <Tab.Screen name="Home" options={{ title: 'Home' }}>
              {() => <HomeScreen suggestions={enabledSuggestions} onRefresh={() => { void refresh({ force: true }); }} isRefreshing={isRefreshing} />}
            </Tab.Screen>
            <Tab.Screen name="Sources" options={{ title: 'Sources' }}>
              {() => (
                <PermissionsScreen
                  permissions={permissions}
                  sourceEnabled={sourceEnabled}
                  onToggleSource={handleSourceToggle}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );
}

function BackgroundDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.orbPrimary} />
      <View style={styles.orbSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appColors.background },
  screenBody: { flex: 1 },
  loadingScreen: { flex: 1, backgroundColor: appColors.background, justifyContent: 'center', paddingHorizontal: 20 },
  loadingCard: { borderRadius: 30, backgroundColor: appColors.surface, padding: 24, borderWidth: 1, borderColor: appColors.border },
  loadingEyebrow: { color: appColors.accentStrong, textTransform: 'uppercase', letterSpacing: 1.6 },
  loadingTitle: { color: appColors.textPrimary, marginTop: 8, fontWeight: '700' },
  loadingSubtitle: { color: appColors.textSecondary, marginTop: 8, lineHeight: 22 },
  loadingSpinner: { marginTop: 22 },
  orbPrimary: { position: 'absolute', top: -70, right: -40, width: 220, height: 220, borderRadius: 999, backgroundColor: 'rgba(124, 140, 255, 0.14)' },
  orbSecondary: { position: 'absolute', left: -60, top: 180, width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(57, 194, 154, 0.08)' },
});
