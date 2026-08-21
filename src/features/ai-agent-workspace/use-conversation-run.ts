import { useCallback, useEffect, useReducer } from 'react';
import type { ConversationRunCommandInput, ConversationRunCommandReceipt } from '@contracts/workbuddy/conversation-run';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';

export function useConversationRun(runRef: string) {
  const module = useWorkBuddyWorkspace().conversationRun;
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);

  useEffect(() => module.subscribe(runRef, null, () => refresh()), [module, runRef]);

  const dispatch = useCallback((input: ConversationRunCommandInput): ConversationRunCommandReceipt => {
    return module.dispatch(runRef, {
      ...input,
      id: `${runRef}:teacher-command:${window.crypto.randomUUID()}`,
    });
  }, [module, runRef]);

  return Object.freeze({ projection: module.open(runRef), dispatch });
}
