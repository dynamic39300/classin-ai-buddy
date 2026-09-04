import { createContext, useContext } from 'react';
import type { AppRole } from '@domain/account/role';
import type {
  ClassAgentMessageMetadata,
  MessageAuthorRole,
  MessageCategory,
  MessageThread,
} from '@domain/message/message';
import type { GuidedExplanationContentReference } from '@domain/workbuddy/guided-explanation';

export type MessageWorkspaceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    threads: ReadonlyArray<MessageThread>;
    mutedThreadIds: ReadonlySet<string>;
  };

export type MessageWorkspaceActions = {
  readThread: (role: AppRole, threadId: string) => void;
  readCategory: (role: AppRole, category: MessageCategory) => void;
  loadOlderMessages: (threadId: string) => void;
  appendMessage: (options: {
    role: AppRole;
    authorName: string;
    threadId: string;
    body: string;
    sentAt: string;
    kind?: 'text' | 'emoji';
    messageId?: string;
    authorRole?: MessageAuthorRole;
    classAgent?: ClassAgentMessageMetadata;
    contentReference?: GuidedExplanationContentReference;
  }) => void;
  togglePin: (threadId: string, messageId: string) => void;
  recallMessage: (role: AppRole, threadId: string, messageId: string, recalledAt: string) => void;
  toggleMute: (threadId: string) => void;
};

export type MessageWorkspaceStore = {
  state: MessageWorkspaceState;
  actions: MessageWorkspaceActions;
};

export const MessageWorkspaceContext = createContext<MessageWorkspaceStore | null>(null);

export function useMessageWorkspaceStore(): MessageWorkspaceStore {
  const store = useContext(MessageWorkspaceContext);
  if (!store) throw new Error('useMessageWorkspaceStore must be used within MessageWorkspaceProvider');
  return store;
}

export function useMessageThreads(): ReadonlyArray<MessageThread> {
  const { state } = useMessageWorkspaceStore();
  return state.status === 'ready' ? state.threads : [];
}
