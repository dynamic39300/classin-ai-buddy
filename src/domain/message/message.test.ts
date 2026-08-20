import { describe, expect, it } from 'vitest';
import {
  appendLocalMessage,
  canRecallClassMessage,
  countUnreadByCategory,
  countUnreadMessages,
  filterMessageThreads,
  getMessageThreadTitle,
  getVisibleMessageThreads,
  markCategoryRead,
  markThreadRead,
  recallClassMessage,
  togglePinnedMessage,
  type MessageThread,
} from './message';

function makeThread(overrides: Partial<MessageThread> = {}): MessageThread {
  return {
    id: 'thread-1',
    category: 'direct',
    visibleTo: ['teacher', 'student-family'],
    titleByRole: { teacher: '李明', 'student-family': '王老师' },
    subtitleByRole: { teacher: '学生', 'student-family': '老师' },
    avatarByRole: { teacher: '李', 'student-family': '王' },
    updatedAt: '2026-08-08T10:00:00+08:00',
    unreadByRole: { teacher: 2, 'student-family': 1 },
    entries: [{ id: 'm1', authorRole: 'student-family', authorName: '李明', body: '作业问题', sentAt: '2026-08-08T10:00:00+08:00', kind: 'text' }],
    ...overrides,
  };
}

describe('message visibility and classification', () => {
  it('keeps role-specific threads isolated and titles role-aware', () => {
    const teacherOnly = makeThread({ id: 'teacher-only', visibleTo: ['teacher'] });
    expect(getVisibleMessageThreads('student-family', [teacherOnly])).toHaveLength(0);
    expect(getMessageThreadTitle('teacher', makeThread())).toBe('李明');
    expect(getMessageThreadTitle('student-family', makeThread())).toBe('王老师');
  });

  it('filters inside one category using title, context and latest content', () => {
    const thread = makeThread();
    expect(filterMessageThreads('teacher', [thread], 'direct', '作业')).toHaveLength(1);
    expect(filterMessageThreads('teacher', [thread], 'class', '')).toHaveLength(0);
  });

  it('counts unread per role and category', () => {
    expect(countUnreadByCategory('teacher', [makeThread()])).toMatchObject({ direct: 2, class: 0 });
  });

  it('counts all unread messages for one role without leaking the other role', () => {
    const classThread = makeThread({
      id: 'class-1',
      category: 'class',
      classId: 'class-1',
      unreadByRole: { teacher: 3, 'student-family': 7 },
    });

    expect(countUnreadMessages('teacher', [makeThread(), classThread])).toBe(5);
    expect(countUnreadMessages('student-family', [makeThread(), classThread])).toBe(8);
  });
});

describe('message mutations', () => {
  it('marks only the current role read', () => {
    const next = markThreadRead('teacher', makeThread());
    expect(next.unreadByRole.teacher).toBe(0);
    expect(next.unreadByRole['student-family']).toBe(1);
  });

  it('marks only the selected category read', () => {
    const direct = makeThread();
    const classThread = makeThread({ id: 'class-1', category: 'class', classId: 'class-1' });
    const next = markCategoryRead('teacher', [direct, classThread], 'direct');
    expect(next[0]?.unreadByRole.teacher).toBe(0);
    expect(next[1]?.unreadByRole.teacher).toBe(2);
  });

  it('appends trimmed local messages only to writable threads', () => {
    const next = appendLocalMessage('teacher', '王老师', makeThread(), '  收到  ', '2026-08-08T10:05:00+08:00');
    expect(next.entries.at(-1)?.body).toBe('收到');
    expect(appendLocalMessage('teacher', '王老师', makeThread(), '  ', '2026-08-08T10:05:00+08:00')).toBeDefined();
    expect(appendLocalMessage('teacher', '王老师', makeThread({ category: 'system' }), '收到', '2026-08-08T10:05:00+08:00').entries).toHaveLength(1);
    expect(appendLocalMessage('teacher', '王老师', makeThread(), '🙂', '2026-08-08T10:05:00+08:00', 'emoji').entries.at(-1)?.kind).toBe('emoji');
  });

  it('pins one valid class message and toggles it off', () => {
    const thread = makeThread({ category: 'class', classId: 'class-1' });
    const pinned = togglePinnedMessage(thread, 'm1');
    expect(pinned.pinnedMessageId).toBe('m1');
    expect(togglePinnedMessage(pinned, 'm1').pinnedMessageId).toBeNull();
    expect(togglePinnedMessage(makeThread(), 'missing').pinnedMessageId).toBeUndefined();
  });

  it('applies role and 24-hour recall rules and clears a recalled pin', () => {
    const oldStudent = { id: 'old', authorRole: 'student-family' as const, authorName: '李明', body: '旧消息', sentAt: '2026-08-07T14:15:00+08:00', kind: 'text' as const };
    const recentStudent = { ...oldStudent, id: 'recent', sentAt: '2026-08-08T14:14:00+08:00' };
    const oldTeacher = { ...oldStudent, id: 'teacher-old', authorRole: 'teacher' as const };
    const now = new Date('2026-08-08T14:15:00+08:00');
    expect(canRecallClassMessage('student-family', oldStudent, now)).toBe(false);
    expect(canRecallClassMessage('student-family', recentStudent, now)).toBe(true);
    expect(canRecallClassMessage('teacher', oldTeacher, now)).toBe(true);

    const thread = makeThread({ category: 'class', entries: [recentStudent], pinnedMessageId: recentStudent.id });
    const recalled = recallClassMessage('student-family', thread, recentStudent.id, now.toISOString());
    expect(recalled.entries[0]).toMatchObject({ kind: 'retracted', body: '消息已撤回' });
    expect(recalled.pinnedMessageId).toBeNull();
  });
});
