import { Platform } from 'react-native';

import type { PermissionState, SignalSource } from './types';

export function formatPermissionState(state: PermissionState) {
  switch (state) {
    case 'not_determined':
      return 'Not determined';
    case 'unavailable':
      return 'Unavailable';
    case 'blocked':
      return 'Needs settings access';
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Denied';
  }
}

export function getPermissionHint(source: SignalSource, state: PermissionState) {
  if (state === 'granted') {
    return 'Connected and ready to shape contextual suggestions';
  }

  if (source === 'music' && Platform.OS === 'android') {
    return 'Uses notification access to read the currently playing song from active media sessions';
  }

  if (source === 'messages_summary' && Platform.OS === 'android') {
    return 'Uses notification access to summarize recent message notifications without opening their apps';
  }

  if (source === 'app_usage' && Platform.OS === 'android') {
    return 'Requires Usage Access from Android system settings';
  }

  if (source === 'health' && Platform.OS === 'android' && state === 'not_determined') {
    return 'Requires Health Connect and physical activity access. Ira will request steps, sleep, and movement context on Android.';
  }

  if (source === 'health' && Platform.OS === 'android' && state === 'blocked') {
    return 'Finish Health Connect setup in the Health Connect app permissions screen, then return to Ira and refresh.';
  }

  if (source === 'health' && Platform.OS === 'ios' && state === 'unavailable') {
    return 'HealthKit is best tested on a physical iPhone; Simulator support is limited';
  }

  if (source === 'installed_apps' && Platform.OS === 'ios') {
    return 'iOS restricts installed app enumeration for third-party apps';
  }

  if (source === 'app_usage' && Platform.OS === 'ios') {
    return 'iOS does not expose broad cross-app usage patterns to third-party apps';
  }

  if (source === 'messages_summary' && Platform.OS === 'ios') {
    return 'iOS does not allow third-party apps to read unread messages from other apps';
  }

  if (source === 'music' && Platform.OS === 'ios') {
    return 'Requests Apple Music library access for music-aware suggestions';
  }

  if (state === 'not_determined') {
    return 'Turn this on to request permission';
  }

  if (state === 'blocked') {
    return 'Open system settings to finish enabling this source';
  }

  if (state === 'denied') {
    return 'Access was denied. Try again or enable it from system settings';
  }

  return 'This source is not available on the current platform';
}

export function getPermissionActionLabel(source: SignalSource, state: PermissionState) {
  if (state === 'granted') {
    return 'Refresh';
  }

  if (state === 'blocked') {
    if ((source === 'music' || source === 'messages_summary') && Platform.OS === 'android') {
      return 'Open notification access';
    }

    if (source === 'app_usage' && Platform.OS === 'android') {
      return 'Open usage access';
    }

    return 'Open settings';
  }

  if (state === 'unavailable') {
    return 'Unavailable';
  }

  return 'Enable';
}
