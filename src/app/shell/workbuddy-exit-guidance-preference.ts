export const WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY = 'classin.message-workspace.hide-workbuddy-exit-guidance';

let reloadResetHandled = false;

function readNavigationType(): PerformanceNavigationTiming['type'] | null {
  if (typeof performance === 'undefined') return null;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type ?? null;
}

export function resetWorkBuddyExitGuidanceOnFullPageReload(
  navigationType: PerformanceNavigationTiming['type'] | null = readNavigationType(),
): void {
  if (reloadResetHandled) return;
  reloadResetHandled = true;
  if (navigationType !== 'reload' || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY);
  } catch {
    // Guidance preferences are optional and must never block message work.
  }
}

export function readWorkBuddyExitGuidanceSuppressed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeWorkBuddyExitGuidanceSuppressed(suppressed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (suppressed) {
      window.localStorage.setItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY, 'true');
    } else {
      window.localStorage.removeItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY);
    }
  } catch {
    // Guidance preferences are optional and must never block message work.
  }
}
