import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  appendLocalMessage,
  markCategoryRead,
  markThreadRead,
  recallClassMessage,
  togglePinnedMessage,
  type MessageThread,
} from '@domain/message/message';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import {
  MessageWorkspaceContext,
  type MessageWorkspaceActions,
  type MessageWorkspaceState,
} from './message-workspace-store';

const INITIAL_MUTED_THREAD_IDS = new Set(
  MESSAGE_THREADS
    .filter(({ category, classId }) => category === 'class' && classId === 'english-2')
    .map(({ id }) => id),
);

export type MessageWorkspaceScenario =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    threads: ReadonlyArray<MessageThread>;
    mutedThreadIds?: ReadonlySet<string>;
  };

type MessageWorkspaceProviderProps = {
  children: ReactNode;
  scenario?: MessageWorkspaceScenario;
};

const DEFAULT_SCENARIO: MessageWorkspaceScenario = {
  status: 'ready',
  threads: MESSAGE_THREADS,
  mutedThreadIds: INITIAL_MUTED_THREAD_IDS,
};

export function MessageWorkspaceProvider({ children, scenario = DEFAULT_SCENARIO }: MessageWorkspaceProviderProps) {
  const [threads, setThreads] = useState<ReadonlyArray<MessageThread>>(
    () => scenario.status === 'ready' ? scenario.threads : [],
  );
  const [mutedThreadIds, setMutedThreadIds] = useState<ReadonlySet<string>>(
    () => scenario.status === 'ready' ? scenario.mutedThreadIds ?? new Set<string>() : new Set<string>(),
  );

  const readThread = useCallback<MessageWorkspaceActions['readThread']>((role, threadId) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? markThreadRead(role, thread) : thread
    )));
  }, []);

  const readCategory = useCallback<MessageWorkspaceActions['readCategory']>((role, category) => {
    setThreads((current) => markCategoryRead(role, current, category));
  }, []);

  const appendMessage = useCallback<MessageWorkspaceActions['appendMessage']>((options) => {
    setThreads((current) => current.map((thread) => thread.id === options.threadId
      ? appendLocalMessage(
        options.role,
        options.authorName,
        thread,
        options.body,
        options.sentAt,
        options.kind,
      )
      : thread));
  }, []);

  const togglePin = useCallback<MessageWorkspaceActions['togglePin']>((threadId, messageId) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? togglePinnedMessage(thread, messageId) : thread
    )));
  }, []);

  const recallMessage = useCallback<MessageWorkspaceActions['recallMessage']>((role, threadId, messageId, recalledAt) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? recallClassMessage(role, thread, messageId, recalledAt) : thread
    )));
  }, []);

  const toggleMute = useCallback<MessageWorkspaceActions['toggleMute']>((threadId) => {
    setMutedThreadIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const state = useMemo<MessageWorkspaceState>(() => {
    if (scenario.status === 'loading') return { status: 'loading' };
    if (scenario.status === 'error') return { status: 'error', message: scenario.message };
    return { status: 'ready', threads, mutedThreadIds };
  }, [mutedThreadIds, scenario, threads]);
  const actions = useMemo<MessageWorkspaceActions>(() => ({
    readThread,
    readCategory,
    appendMessage,
    togglePin,
    recallMessage,
    toggleMute,
  }), [appendMessage, readCategory, readThread, recallMessage, toggleMute, togglePin]);

  return <MessageWorkspaceContext.Provider value={{ state, actions }}>{children}</MessageWorkspaceContext.Provider>;
}
