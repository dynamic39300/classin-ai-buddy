import type { AppRole } from '@domain/account/role';

export type MessageCategory = 'direct' | 'class' | 'system' | 'official';
export type MessageAuthorRole = AppRole | 'system' | 'official';

export type MessageEntry = {
  id: string;
  authorRole: MessageAuthorRole;
  authorName: string;
  body: string;
  sentAt: string;
  kind: 'text' | 'emoji' | 'system' | 'retracted';
  retractedAt?: string;
};

export type MessageNotice = {
  tag: string;
  body: string[];
  actionLabel: string;
  actionFeedback: string;
  actionTarget?: {
    kind: 'homework';
    homeworkId: string;
    view: 'detail' | 'correction' | 'result';
  };
  metadata: Array<{ label: string; value: string }>;
};

export type MessageThread = {
  id: string;
  category: MessageCategory;
  visibleTo: readonly AppRole[];
  titleByRole: Partial<Record<AppRole, string>>;
  subtitleByRole: Partial<Record<AppRole, string>>;
  avatarByRole: Partial<Record<AppRole, string>>;
  updatedAt: string;
  unreadByRole: Partial<Record<AppRole, number>>;
  classId?: string;
  peerId?: string;
  entries: MessageEntry[];
  notice?: MessageNotice;
  pinnedMessageId?: string | null;
};

export type MessageContact = {
  id: string;
  name: string;
  relationship: string;
  visibleTo: readonly AppRole[];
  targetThreadId: string;
};

export const MESSAGE_CATEGORY_LABELS: Record<MessageCategory, string> = {
  direct: '私聊',
  class: '班级消息',
  system: '系统通知',
  official: '官方公告',
};

const CATEGORY_ORDER: MessageCategory[] = ['direct', 'class', 'system', 'official'];

export function getMessageThreadTitle(role: AppRole, thread: MessageThread): string {
  return thread.titleByRole[role] ?? '消息';
}

export function getMessageThreadSubtitle(role: AppRole, thread: MessageThread): string {
  return thread.subtitleByRole[role] ?? '';
}

export function getVisibleMessageThreads(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): MessageThread[] {
  return threads.filter(({ visibleTo }) => visibleTo.includes(role));
}

export function findClassMessageThreadId(
  role: AppRole,
  classId: string,
  threads: ReadonlyArray<MessageThread>,
): string | null {
  return getVisibleMessageThreads(role, threads)
    .find((thread) => thread.category === 'class' && thread.classId === classId)?.id ?? null;
}

export function findDirectMessageThreadId(
  role: AppRole,
  peerId: string,
  threads: ReadonlyArray<MessageThread>,
): string | null {
  return getVisibleMessageThreads(role, threads)
    .find((thread) => thread.category === 'direct' && thread.peerId === peerId)?.id ?? null;
}

export function getLastMessageEntry(thread: MessageThread): MessageEntry | undefined {
  return thread.entries.at(-1);
}

export function filterMessageThreads(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
  category: MessageCategory,
  query: string,
): MessageThread[] {
  const normalized = query.trim().toLocaleLowerCase();
  return getVisibleMessageThreads(role, threads)
    .filter((thread) => thread.category === category)
    .filter((thread) => {
      if (!normalized) return true;
      const searchable = [
        getMessageThreadTitle(role, thread),
        getMessageThreadSubtitle(role, thread),
        getLastMessageEntry(thread)?.body ?? '',
        thread.notice?.body.join(' ') ?? '',
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(normalized);
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function countUnreadByCategory(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): Record<MessageCategory, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<MessageCategory, number>;
  for (const thread of getVisibleMessageThreads(role, threads)) {
    counts[thread.category] += thread.unreadByRole[role] ?? 0;
  }
  return counts;
}

export function countUnreadMessages(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): number {
  return Object.values(countUnreadByCategory(role, threads))
    .reduce((total, count) => total + count, 0);
}

export function markThreadRead(role: AppRole, thread: MessageThread): MessageThread {
  if ((thread.unreadByRole[role] ?? 0) === 0) return thread;
  return {
    ...thread,
    unreadByRole: { ...thread.unreadByRole, [role]: 0 },
  };
}

export function markCategoryRead(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
  category: MessageCategory,
): MessageThread[] {
  return threads.map((thread) => (
    thread.category === category && thread.visibleTo.includes(role)
      ? markThreadRead(role, thread)
      : thread
  ));
}

export function isWritableMessageThread(thread: MessageThread): boolean {
  return thread.category === 'direct' || thread.category === 'class';
}

export function appendLocalMessage(
  role: AppRole,
  authorName: string,
  thread: MessageThread,
  body: string,
  sentAt: string,
  kind: 'text' | 'emoji' = 'text',
): MessageThread {
  const content = body.trim();
  if (!content || !isWritableMessageThread(thread)) return thread;
  return {
    ...thread,
    updatedAt: sentAt,
    unreadByRole: { ...thread.unreadByRole, [role]: 0 },
    entries: [
      ...thread.entries,
      {
        id: `local-${role}-${thread.entries.length + 1}`,
        authorRole: role,
        authorName,
        body: content,
        sentAt,
        kind,
      },
    ],
  };
}

export function togglePinnedMessage(
  thread: MessageThread,
  messageId: string,
): MessageThread {
  if (thread.category !== 'class' || !thread.entries.some(({ id, kind }) => id === messageId && kind !== 'retracted' && kind !== 'system')) return thread;
  return {
    ...thread,
    pinnedMessageId: thread.pinnedMessageId === messageId ? null : messageId,
  };
}

export function canRecallClassMessage(role: AppRole, entry: MessageEntry, now: Date): boolean {
  if (entry.authorRole !== role || entry.kind === 'system' || entry.kind === 'retracted') return false;
  if (role === 'teacher') return true;
  const sentAt = new Date(entry.sentAt).getTime();
  return Number.isFinite(sentAt) && now.getTime() - sentAt < 24 * 60 * 60 * 1000;
}

export function recallClassMessage(
  role: AppRole,
  thread: MessageThread,
  messageId: string,
  recalledAt: string,
): MessageThread {
  if (thread.category !== 'class') return thread;
  const now = new Date(recalledAt);
  const target = thread.entries.find(({ id }) => id === messageId);
  if (!target || !canRecallClassMessage(role, target, now)) return thread;
  return {
    ...thread,
    pinnedMessageId: thread.pinnedMessageId === messageId ? null : thread.pinnedMessageId,
    entries: thread.entries.map((entry) => entry.id === messageId
      ? { ...entry, body: '消息已撤回', kind: 'retracted', retractedAt: recalledAt }
      : entry),
  };
}

export function formatMessageListTime(iso: string, now: Date): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const clock = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  const sameDay = value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
  if (sameDay) return clock;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = value.getFullYear() === yesterday.getFullYear()
    && value.getMonth() === yesterday.getMonth()
    && value.getDate() === yesterday.getDate();
  if (isYesterday) return '昨天';
  return `${value.getMonth() + 1}/${value.getDate()}`;
}
