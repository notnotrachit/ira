import { Platform } from 'react-native';

import type { PermissionState, SignalSource } from './types';

export function formatPermissionState(state: PermissionState) {
  switch (state) {
    case 'not_determined':
      return 'Not connected';
    case 'unavailable':
      return 'Not available';
    case 'blocked':
      return 'Needs settings';
    case 'granted':
      return 'Connected';
    case 'denied':
      return 'Not allowed';
  }
}

export function getPermissionHint(source: SignalSource, state: PermissionState) {
  if (state === 'granted') {
    return 'Active and contributing to your brief.';
  }

  if (source === 'music' && Platform.OS === 'android') {
    return 'Uses notification access to detect what is currently playing.';
  }

  if (source === 'messages_summary' && Platform.OS === 'android') {
    return 'Uses notification access to summarize recent messages without opening their apps.';
  }

  if (source === 'app_usage' && Platform.OS === 'android') {
    return 'Requires Usage Access from Android system settings.';
  }

  if (source === 'health' && Platform.OS === 'android' && state === 'not_determined') {
    return 'Requires Health Connect and activity access for steps, sleep, and movement context.';
  }

  if (source === 'health' && Platform.OS === 'android' && state === 'blocked') {
    return 'Finish setup in Health Connect, then return here and refresh.';
  }

  if (source === 'health' && Platform.OS === 'ios' && state === 'unavailable') {
    return 'Health access is best tested on a physical iPhone. Simulator support is limited.';
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
    return 'Requests Apple Music access for music-aware suggestions.';
  }

  if (state === 'not_determined') {
    return 'Turn this on to request access.';
  }

  if (state === 'blocked') {
    return 'Open system settings to finish enabling this source.';
  }

  if (state === 'denied') {
    return 'Access was denied. Try again or enable it from system settings.';
  }

  return 'This source is not available on this device.';
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
