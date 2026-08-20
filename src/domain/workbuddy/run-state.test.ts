import { describe, expect, it } from 'vitest';
import { allowsWorkBuddyRunCommand, type WorkBuddyRunState } from './run-state';

const states: readonly WorkBuddyRunState[] = [
  { status: 'running', allowedCommands: ['supplement', 'stop'], recovery: 'stop-or-wait' },
  { status: 'waiting', allowedCommands: ['confirm', 'revise'], recovery: 'confirm-or-revise' },
  { status: 'completed', allowedCommands: ['review-artifact'], recovery: null },
  { status: 'failed', allowedCommands: ['retry', 'revise'], recovery: 'retry-or-revise' },
];

describe('WorkBuddy Run command policy', () => {
  it('keeps supplement, revise and review commands bound to their declared states', () => {
    expect(states.map((state) => allowsWorkBuddyRunCommand(state, 'supplement'))).toEqual([true, false, false, false]);
    expect(states.map((state) => allowsWorkBuddyRunCommand(state, 'revise'))).toEqual([false, true, false, true]);
    expect(states.map((state) => allowsWorkBuddyRunCommand(state, 'review-artifact'))).toEqual([false, false, true, false]);
  });
});
