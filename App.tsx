import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
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

import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useContextualSuggestions } from './src/modules/intelligence/hooks/useContextualSuggestions';
import { usePermissions } from './src/modules/intelligence/hooks/usePermissions';
import { useWidget } from './src/modules/intelligence/hooks/useWidget';
import { formatPermissionState, getPermissionHint } from './src/modules/intelligence/permissionPresentation';
import {
  defaultSourcePreferences,
  readOnboardingCompleted,
  readSourcePreferences,
  writeOnboardingCompleted,
  writeSourcePreferences,
} from './src/modules/intelligence/storage';
import type { PermissionState, SignalSource } from './src/modules/intelligence/types';
import { appColors, appTheme } from './src/theme/appTheme';

type TabParamList = {
  Home: undefined;
  Access: undefined;
  Settings: undefined;
};

const Tab = createNativeBottomTabNavigator<TabParamList>();

const sourceLabels: Record<SignalSource, string> = {
  calendar: 'Calendar',
  contacts: 'Contacts',
  health: 'Health',
  music: 'Music',
  installed_apps: 'Installed apps',
  app_usage: 'App usage',
  messages_summary: 'Messages',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <IraApp />
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
      path === 'chat' || path === 'calendar' || path === 'health' ? 'home' : path === 'permissions' ? 'access' : path;

    return getStateFromPath(normalizedPath, options);
  },
  config: {
    screens: {
      Home: 'home',
      Access: 'access',
      Settings: 'settings',
    },
  },
};

const tabIcons: Record<keyof TabParamList, {
  ios: ({ focused }: { focused: boolean }) => NativeBottomTabIcon;
  android: ReturnType<typeof require>;
}> = {
  Home: {
    ios: ({ focused }: { focused: boolean }) => ({
      type: 'sfSymbol' as const,
      name: focused ? ('house.fill' as const) : ('house' as const),
    }),
    android: require('./assets/tabs/home.png'),
  },
  Access: {
    ios: ({ focused }: { focused: boolean }) => ({
      type: 'sfSymbol' as const,
      name: focused ? ('shield.fill' as const) : ('shield' as const),
    }),
    android: require('./assets/tabs/access.png'),
  },
  Settings: {
    ios: ({ focused }: { focused: boolean }) => ({
      type: 'sfSymbol' as const,
      name: focused ? ('slider.horizontal.3' as const) : ('slider.horizontal.3' as const),
    }),
    android: require('./assets/tabs/settings.png'),
  },
};

function IraApp() {
  const [sourceEnabled, setSourceEnabled] =
    useState<Record<SignalSource, boolean>>(defaultSourcePreferences);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const previousPermissionsRef = useRef<Record<SignalSource, PermissionState>>({
    calendar: 'not_determined',
    contacts: 'not_determined',
    health: 'not_determined',
    music: 'not_determined',
    installed_apps: 'not_determined',
    app_usage: 'not_determined',
    messages_summary: 'not_determined',
  });

  const { snapshot, suggestions, refresh, isRefreshing, isStale, lastUpdatedAt } =
    useContextualSuggestions();
  const { permissions, requestPermission, openSettings, isPermissionRequestable } = usePermissions(
    snapshot,
    refresh
  );

  useEffect(() => {
    void (async () => {
      try {
        const [onboardingCompleted, savedSourcePreferences] = await Promise.all([
          readOnboardingCompleted(),
          readSourcePreferences(),
        ]);

        setHasCompletedOnboarding(onboardingCompleted);
        if (savedSourcePreferences) {
          setSourceEnabled(savedSourcePreferences);
        }
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    void writeSourcePreferences(sourceEnabled);
  }, [isBootstrapping, sourceEnabled]);

  useEffect(() => {
    const previousPermissions = previousPermissionsRef.current;

    setSourceEnabled((current) => ({
      ...current,
      calendar:
        permissions.calendar === 'granted'
          ? previousPermissions.calendar === 'granted'
            ? current.calendar
            : true
          : false,
      contacts:
        permissions.contacts === 'granted'
          ? previousPermissions.contacts === 'granted'
            ? current.contacts
            : true
          : false,
      health:
        permissions.health === 'granted'
          ? previousPermissions.health === 'granted'
            ? current.health
            : true
          : false,
      music:
        permissions.music === 'granted'
          ? previousPermissions.music === 'granted'
            ? current.music
            : true
          : false,
      installed_apps:
        permissions.installed_apps === 'granted'
          ? previousPermissions.installed_apps === 'granted'
            ? current.installed_apps
            : true
          : false,
      app_usage:
        permissions.app_usage === 'granted'
          ? previousPermissions.app_usage === 'granted'
            ? current.app_usage
            : true
          : false,
      messages_summary:
        permissions.messages_summary === 'granted'
          ? previousPermissions.messages_summary === 'granted'
            ? current.messages_summary
            : true
          : false,
    }));

    previousPermissionsRef.current = permissions;
  }, [permissions]);

  const enabledSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) => {
        if (suggestion.source === 'multi_source') {
          return true;
        }

        return sourceEnabled[suggestion.source];
      }),
    [sourceEnabled, suggestions]
  );

  const { widget } = useWidget(snapshot, enabledSuggestions);

  function toggleSource(source: SignalSource) {
    setSourceEnabled((current) => ({
      ...current,
      [source]: !current[source],
    }));
  }

  async function finishOnboarding() {
    await writeOnboardingCompleted(true);
    setHasCompletedOnboarding(true);
  }

  async function handleSourceToggle(source: SignalSource) {
    const nextEnabled = !sourceEnabled[source];

    if (!nextEnabled) {
      toggleSource(source);
      return;
    }

    const permissionState = permissions[source];
    if (permissionState === 'granted' || permissionState === 'unavailable') {
      toggleSource(source);
      return;
    }

    if (!isPermissionRequestable(source)) {
      Alert.alert(
        'Unavailable on this platform',
        `${sourceLabels[source]} cannot be requested on this platform in a standard third-party app.`
      );
      return;
    }

    if (permissionState === 'blocked') {
      await openSettings();
      return;
    }

    const result = await requestPermission(source);
    if (source === 'health' && (result === 'not_determined' || result === 'blocked')) {
      Alert.alert(
        'Finish Health Connect setup',
        'Ira opened the Health Connect permissions screen. Enable Steps and Sleep there, then return to Ira and tap Refresh.'
      );
      return;
    }

    if (result === 'granted') {
      toggleSource(source);
      return;
    }

    Alert.alert(
      'Permission update',
      `${sourceLabels[source]} is ${formatPermissionState(result)}.\n\n${getPermissionHint(source, result)}`
    );
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <BackgroundDecor />
        <Surface style={styles.loadingCard} elevation={2}>
          <Text variant="labelLarge" style={styles.loadingEyebrow}>
            Ira
          </Text>
          <Text variant="headlineMedium" style={styles.loadingTitle}>
            Setting up your daily brief
          </Text>
          <Text variant="bodyLarge" style={styles.loadingSubtitle}>
            Restoring preferences, loading context, and preparing widgets.
          </Text>
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
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '700',
              },
              tabBarActiveTintColor: appColors.white,
              tabBarInactiveTintColor: appColors.textTertiary,
              tabBarActiveIndicatorColor: appColors.accent,
              tabBarStyle: {
                backgroundColor: Platform.OS === 'android' ? appColors.navBackground : 'transparent',
              },
              tabBarBlurEffect: 'systemUltraThinMaterial',
              tabBarMinimizeBehavior: 'onScrollDown',
              tabBarIcon:
                Platform.OS === 'ios'
                  ? tabIcons[route.name].ios
                  : {
                      type: 'image',
                      source: tabIcons[route.name].android,
                    },
            })}
          >
            <Tab.Screen name="Home" options={{ title: 'Home' }}>
              {() => (
                <HomeScreen
                  widget={widget}
                  suggestions={enabledSuggestions}
                  lastUpdatedAt={lastUpdatedAt}
                  isRefreshing={isRefreshing}
                  isStale={isStale}
                  onRefresh={refresh}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Access" options={{ title: 'Access' }}>
              {() => (
                <PermissionsScreen
                  permissions={permissions}
                  onRequestPermission={requestPermission}
                  onOpenSettings={openSettings}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Settings" options={{ title: 'Settings' }}>
              {() => (
                <SettingsScreen
                  permissions={permissions}
                  sourceEnabled={sourceEnabled}
                  sourceLabels={sourceLabels}
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
  safeArea: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  screenBody: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: appColors.background,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    borderRadius: 30,
    backgroundColor: appColors.surface,
    padding: 24,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  loadingEyebrow: {
    color: appColors.accentStrong,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  loadingTitle: {
    color: appColors.textPrimary,
    marginTop: 8,
    fontWeight: '700',
  },
  loadingSubtitle: {
    color: appColors.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  loadingSpinner: {
    marginTop: 22,
  },
  orbPrimary: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 140, 255, 0.14)',
  },
  orbSecondary: {
    position: 'absolute',
    left: -60,
    top: 180,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(57, 194, 154, 0.08)',
  },
});
