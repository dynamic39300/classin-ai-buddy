import type { WorkBuddyImExperienceScheduler } from '@contracts/workbuddy/im-conversation-run';

export const WORKBUDDY_IM_RUN_TIMING = Object.freeze({
  organizingMs: 1_200,
  capabilityMs: 1_400,
});

export function createBrowserWorkBuddyImExperienceScheduler(): WorkBuddyImExperienceScheduler {
  return Object.freeze({
    now: () => Date.now(),
    wait: (durationMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, durationMs)),
  });
}

export function createImmediateWorkBuddyImExperienceScheduler(): WorkBuddyImExperienceScheduler {
  let elapsedMs = 0;
  return Object.freeze({
    now: () => elapsedMs,
    wait: async (durationMs: number) => {
      elapsedMs += durationMs;
      await Promise.resolve();
    },
  });
}
