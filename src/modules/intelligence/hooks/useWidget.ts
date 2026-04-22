import { useEffect, useMemo } from 'react';

import { syncWidgetPayload } from '../contextSignals';
import { buildSharedWidgetPayload } from '../widgetPayload';
import type { ContextSnapshot, ContextualSuggestion } from '../types';

export function useWidget(
  snapshot: ContextSnapshot | null,
  suggestions: ContextualSuggestion[]
) {
  const payload = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return buildSharedWidgetPayload(snapshot, suggestions);
  }, [snapshot, suggestions]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    if (__DEV__) {
      console.info(
        '[Ira][Widget]',
        JSON.stringify({
          status: payload.variantData.large.status,
          preview: payload.variantData.large.topMessagePreview,
          suggestion: payload.variantData.large.topSuggestion?.message,
          actions: payload.variantData.large.quickActions.map((action) => action.label),
          reasons: payload.variantData.large.debugReasons,
          messageSourceAppPackage: snapshot?.messagesSummary.sourceAppPackage,
        })
      );
    }

    void syncWidgetPayload(payload);
  }, [payload]);

  return {
    payload,
    widget: payload?.variantData.large ?? {
      status: 'empty',
      unreadCount: 0,
      topMessagePreview: 'Open Ira to sync your latest context and prepare the widget.',
      quickActions: [{ label: 'Open app', deepLink: 'ira://home' }],
      topSuggestion: undefined,
      lastUpdatedAt: 'Never',
      theme: 'system' as const,
    },
  };
}
