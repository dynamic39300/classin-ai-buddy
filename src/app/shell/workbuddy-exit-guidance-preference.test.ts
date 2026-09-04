import { beforeEach, describe, expect, it } from 'vitest';
import {
  readWorkBuddyExitGuidanceSuppressed,
  resetWorkBuddyExitGuidanceOnFullPageReload,
  WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY,
  writeWorkBuddyExitGuidanceSuppressed,
} from './workbuddy-exit-guidance-preference';

describe('WorkBuddy exit guidance preference', () => {
  beforeEach(() => window.localStorage.clear());

  it('clears the preference once when the document was fully reloaded', () => {
    window.localStorage.setItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY, 'true');
    resetWorkBuddyExitGuidanceOnFullPageReload('reload');
    expect(readWorkBuddyExitGuidanceSuppressed()).toBe(false);
  });

  it('defaults to showing the guidance', () => {
    expect(readWorkBuddyExitGuidanceSuppressed()).toBe(false);
  });

  it('persists and clears the suppression preference', () => {
    writeWorkBuddyExitGuidanceSuppressed(true);
    expect(window.localStorage.getItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY)).toBe('true');
    expect(readWorkBuddyExitGuidanceSuppressed()).toBe(true);

    writeWorkBuddyExitGuidanceSuppressed(false);
    expect(window.localStorage.getItem(WORKBUDDY_EXIT_GUIDANCE_PREFERENCE_KEY)).toBeNull();
    expect(readWorkBuddyExitGuidanceSuppressed()).toBe(false);
  });
});
