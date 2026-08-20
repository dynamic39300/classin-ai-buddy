export type WorkBuddyRunCommand = 'supplement' | 'stop' | 'confirm' | 'revise' | 'retry' | 'review-artifact';

export type WorkBuddyRunState =
  | { status: 'running'; allowedCommands: readonly ('supplement' | 'stop')[]; recovery: 'stop-or-wait' }
  | { status: 'waiting'; allowedCommands: readonly ('confirm' | 'revise')[]; recovery: 'confirm-or-revise' }
  | { status: 'completed'; allowedCommands: readonly ['review-artifact']; recovery: null }
  | { status: 'failed'; allowedCommands: readonly ('retry' | 'revise')[]; recovery: 'retry-or-revise' };

export function allowsWorkBuddyRunCommand(state: WorkBuddyRunState, command: WorkBuddyRunCommand) {
  return (state.allowedCommands as readonly WorkBuddyRunCommand[]).includes(command);
}
