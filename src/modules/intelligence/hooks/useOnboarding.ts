import { useEffect, useState } from 'react';

import { readOnboardingCompleted, writeOnboardingCompleted } from '../storage';

export function useOnboarding() {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setHasCompleted(await readOnboardingCompleted());
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function finish() {
    await writeOnboardingCompleted(true);
    setHasCompleted(true);
  }

  return { hasCompleted, isLoading, finish };
}
