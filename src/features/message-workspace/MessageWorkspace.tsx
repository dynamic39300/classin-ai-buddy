import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCheck,
  Contact,
  FileText,
  Files,
  Image,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Presentation,
  Search,
  ScanLine,
  SendHorizontal,
  Smile,
  UserRoundPlus,
  UsersRound,
  Undo2,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import {
  canRecallClassMessage,
  countUnreadByCategory,
  filterMessageThreads,
  formatMessageListTime,
  getLastMessageEntry,
  getMessageThreadSubtitle,
  getMessageThreadTitle,
  MESSAGE_CATEGORY_LABELS,
  type MessageCategory,
  type MessageThread,
} from '@domain/message/message';
import { MESSAGE_CONTACTS, MESSAGE_NOW } from '@mocks/scenarios/messages';
import { useMessageWorkspaceStore } from './message-workspace-store';
import styles from './MessageWorkspace.module.css';

const CATEGORY_ICONS: Record<MessageCategory, LucideIcon> = {
  direct: MessageCircle,
  class: MessagesSquare,
  system: Bell,
  official: Megaphone,
};

const CATEGORY_ORDER: MessageCategory[] = ['direct', 'class', 'system', 'official'];
const ATTACHMENT_ACTIONS: ReadonlyArray<{ Icon: LucideIcon; label: string }> = [
  { Icon: Image, label: '照片' },
  { Icon: Camera, label: '拍摄' },
  { Icon: Contact, label: '名片' },
  { Icon: FileText, label: '文件' },
  { Icon: Mic, label: '语音' },
];

type MessageWorkspaceProps = {
  role: AppRole;
  fixedClassId?: string;
  readOnly?: boolean;
  embedded?: boolean;
};

function parseCategory(value: string | null): MessageCategory | null {
  return value === 'direct' || value === 'class' || value === 'system' || value === 'official' ? value : null;
}

function formatEntryTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function MessageWorkspace({ role, fixedClassId, readOnly = false, embedded = false }: MessageWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useMessageWorkspaceStore();
  const { threads, mutedThreadIds } = useMemo(() => state.status === 'ready'
    ? state
    : { threads: [] as ReadonlyArray<MessageThread>, mutedThreadIds: new Set<string>() }, [state]);
  const fixedThread = fixedClassId
    ? threads.find((thread) => thread.category === 'class' && thread.classId === fixedClassId && thread.visibleTo.includes(role)) ?? null
    : null;
  const [query, setQuery] = useState('');
  const [composer, setComposer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const contactTriggerRef = useRef<HTMLButtonElement | null>(null);
  const listMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contextMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contactDialogRef = useRef<HTMLDialogElement | null>(null);

  const category = fixedClassId ? 'class' : parseCategory(searchParams.get('category')) ?? 'class';
  const categoryThreads = useMemo(
    () => filterMessageThreads(role, threads, category, query),
    [category, query, role, threads],
  );
  const categoryHasThreads = useMemo(
    () => filterMessageThreads(role, threads, category, '').length > 0,
    [category, role, threads],
  );
  const unreadCounts = useMemo(() => countUnreadByCategory(role, threads), [role, threads]);
  const targetThreadId = fixedThread?.id ?? searchParams.get('thread');
  const selectedThread = targetThreadId
    ? threads.find(({ id, category: threadCategory, visibleTo }) => id === targetThreadId && threadCategory === category && visibleTo.includes(role)) ?? null
    : filterMessageThreads(role, threads, category, '')[0] ?? null;
  const selectedId = selectedThread?.id ?? null;
  const isHomeArrival = searchParams.get('source') === 'home';

  useLayoutEffect(() => {
    if (!selectedId) return;
    actions.readThread(role, selectedId);
  }, [actions, role, selectedId]);

  useLayoutEffect(() => {
    if (!isHomeArrival || !selectedId) return;
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-thread-id]'))
      .find((element) => element.dataset.threadId === selectedId);
    target?.scrollIntoView?.({ block: 'nearest' });
    target?.focus({ preventScroll: true });
  }, [isHomeArrival, selectedId]);
  const contacts = useMemo(() => {
    const normalized = contactQuery.trim().toLocaleLowerCase();
    return MESSAGE_CONTACTS.filter(({ visibleTo }) => visibleTo.includes(role)).filter(({ name, relationship }) => (
      !normalized || `${name} ${relationship}`.toLocaleLowerCase().includes(normalized)
    ));
  }, [contactQuery, role]);

  useLayoutEffect(() => {
    if (listMenuOpen) listMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [listMenuOpen]);

  useLayoutEffect(() => {
    if (contextMenuOpen) contextMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [contextMenuOpen]);

  useLayoutEffect(() => {
    const dialog = contactDialogRef.current;
    if (!contactOpen || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [contactOpen]);

  if (state.status === 'loading') {
    return (
      <div className={styles.page} aria-busy="true" aria-label="消息正在加载">
        <section className={styles.threadPanel} aria-hidden="true">
          <div className={styles.categoryTabs} />
          <div className={styles.searchActions} />
          <div className={styles.threadList}>
            {Array.from({ length: 6 }, (_, index) => <div className={styles.skeletonRow} key={index} />)}
          </div>
        </section>
        <main className={styles.contentWorkspace}>
          <div className={styles.contentEmpty}><strong>正在加载消息</strong></div>
        </main>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.workspaceBoundary} role="alert">
        <MessagesSquare aria-hidden="true" size={24} />
        <strong>消息暂时无法加载</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  const selectThread = (thread: MessageThread) => {
    setComposer('');
    setFeedback(null);
    setListMenuOpen(false);
    setContextMenuOpen(false);
    setAttachmentOpen(false);
    actions.readThread(role, thread.id);
    setSearchParams({ category: thread.category, thread: thread.id }, { replace: true });
  };

  const changeCategory = (nextCategory: MessageCategory) => {
    const nextThread = filterMessageThreads(role, threads, nextCategory, '')[0] ?? null;
    setQuery('');
    setComposer('');
    setFeedback(null);
    setListMenuOpen(false);
    setContextMenuOpen(false);
    setAttachmentOpen(false);
    if (nextThread) actions.readThread(role, nextThread.id);
    setSearchParams(nextThread
      ? { category: nextCategory, thread: nextThread.id }
      : { category: nextCategory }, { replace: true });
  };

  const closeListMenu = () => {
    setListMenuOpen(false);
    window.requestAnimationFrame(() => listMenuTriggerRef.current?.focus());
  };

  const markCurrentCategoryRead = () => {
    actions.readCategory(role, category);
    closeListMenu();
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly || !selectedThread || !composer.trim()) return;
    const authorName = role === 'teacher' ? '王老师' : '李明';
    actions.appendMessage({
      role,
      authorName,
      threadId: selectedThread.id,
      body: composer,
      sentAt: '2026-08-08T14:15:00+08:00',
    });
    setComposer('');
    setFeedback('消息已在本地 Demo 中发送。');
  };

  const sendEmoji = () => {
    if (readOnly || !selectedThread) return;
    const authorName = role === 'teacher' ? '王老师' : '李明';
    actions.appendMessage({
      role,
      authorName,
      threadId: selectedThread.id,
      body: '🙂',
      sentAt: MESSAGE_NOW.toISOString(),
      kind: 'emoji',
    });
    setFeedback('表情已在本地 Demo 中发送。');
  };

  const togglePin = (targetId: string) => {
    if (readOnly || !selectedThread) return;
    const wasPinned = selectedThread.pinnedMessageId === targetId;
    actions.togglePin(selectedThread.id, targetId);
    setFeedback(wasPinned ? '已取消置顶消息。' : '消息已置顶，仅在本地 Demo 中生效。');
  };

  const recallMessage = (targetId: string) => {
    if (readOnly || !selectedThread) return;
    actions.recallMessage(role, selectedThread.id, targetId, MESSAGE_NOW.toISOString());
    setFeedback('消息已在本地 Demo 中撤回。');
  };

  const toggleMute = () => {
    if (readOnly || !selectedThread) return;
    const wasMuted = mutedThreadIds.has(selectedThread.id);
    actions.toggleMute(selectedThread.id);
    setFeedback(wasMuted ? '已解除全体禁言。' : '已开启全体禁言，仅在本地 Demo 中生效。');
    closeContextMenu();
  };

  const closeContextMenu = () => {
    setContextMenuOpen(false);
    window.requestAnimationFrame(() => contextMenuTriggerRef.current?.focus());
  };

  const closeContacts = () => {
    contactDialogRef.current?.close();
    setContactOpen(false);
    setContactQuery('');
    window.requestAnimationFrame(() => contactTriggerRef.current?.focus());
  };

  const openContactThread = (targetThreadId: string) => {
    const target = threads.find(({ id }) => id === targetThreadId);
    if (!target) return;
    setQuery('');
    selectThread(target);
    closeContacts();
  };

  const trapContactDialogFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hasAttribute('disabled'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const renderChat = (thread: MessageThread) => {
    const pinned = thread.entries.find(({ id }) => id === thread.pinnedMessageId);
    const isMuted = mutedThreadIds.has(thread.id);
    const composerBlocked = readOnly || (isMuted && role === 'student-family');
    const classPath = `/${role === 'teacher' ? 'teacher' : 'student'}/classes/${thread.classId ?? ''}?from=messages`;

    return (
      <section className={styles.conversation} aria-label={`${getMessageThreadTitle(role, thread)}会话`}>
        <header className={styles.contentHeader}>
          <div>
            <h2>{getMessageThreadTitle(role, thread)}</h2>
            <p>{getMessageThreadSubtitle(role, thread)}</p>
          </div>
          <div className={styles.contextActions}>
            {thread.category === 'class' && !fixedClassId && !embedded ? (
              <button className={styles.enterClassButton} type="button" onClick={() => navigate(classPath)}>进入班级</button>
            ) : null}
            {thread.category === 'class' ? (
              <div className={styles.contextMenuHost}>
                <button
                  ref={contextMenuTriggerRef}
                  type="button"
                  aria-expanded={contextMenuOpen}
                  aria-label="班级会话操作"
                  onClick={() => setContextMenuOpen((open) => !open)}
                  title="班级会话操作"
                >
                  <MoreHorizontal aria-hidden="true" size={17} />
                </button>
                {contextMenuOpen ? (
                  <div ref={contextMenuRef} className={styles.commandMenu} role="menu" aria-label="班级会话操作" onKeyDown={(event) => { if (event.key === 'Escape') closeContextMenu(); }}>
                    <button type="button" role="menuitem" onClick={() => { setFeedback('群文件入口已保留，本 Demo 不上传或下载真实文件。'); closeContextMenu(); }}>
                      <Files aria-hidden="true" size={15} />群文件
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setFeedback('成员列表入口已保留，将在班级详情中统一管理。'); closeContextMenu(); }}>
                      <UsersRound aria-hidden="true" size={15} />成员
                    </button>
                    {role === 'teacher' && !readOnly ? (
                      <button type="button" role="menuitem" onClick={toggleMute}>
                        {isMuted ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}
                        {isMuted ? '解除禁言' : '全体禁言'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {pinned ? (
          <div className={styles.pinnedBanner}>
            <Pin aria-hidden="true" size={14} />
            <span><strong>置顶</strong>{pinned.body}</span>
          </div>
        ) : null}

        <div className={styles.timeline} aria-label="消息记录">
          <div className={styles.dateMarker}>今天</div>
          {thread.entries.map((entry, index) => {
            if (entry.kind === 'system') {
              return <p className={styles.systemEntry} key={entry.id}>{entry.body}</p>;
            }
            const previous = thread.entries[index - 1];
            const grouped = previous !== undefined
              && previous.kind !== 'system'
              && previous.authorRole === entry.authorRole
              && previous.authorName === entry.authorName;
            const own = entry.authorRole === role;
            const canRecall = !readOnly && thread.category === 'class' && canRecallClassMessage(role, entry, MESSAGE_NOW);
            const canPin = !readOnly && role === 'teacher' && thread.category === 'class' && entry.kind !== 'retracted';
            return (
              <article className={styles.messageEntry} data-grouped={grouped} data-own={own} data-retracted={entry.kind === 'retracted'} key={entry.id}>
                {!own && !grouped ? <span className={styles.messageAvatar}>{entry.authorName.slice(0, 1)}</span> : null}
                <div>
                  {!grouped ? <span className={styles.messageAuthor}>{own ? '我' : entry.authorName} · {formatEntryTime(entry.sentAt)}</span> : null}
                  <p>{entry.body}</p>
                  {canRecall || canPin ? <div className={styles.messageActions}>
                    {canPin ? <button type="button" onClick={() => togglePin(entry.id)}><Pin aria-hidden="true" size={13} />{thread.pinnedMessageId === entry.id ? '取消置顶' : '置顶'}</button> : null}
                    {canRecall ? <button type="button" onClick={() => recallMessage(entry.id)}><Undo2 aria-hidden="true" size={13} />撤回</button> : null}
                  </div> : null}
                </div>
              </article>
            );
          })}
        </div>

        {composerBlocked ? (
          <div className={styles.readOnlyBar} role="status">
            {readOnly ? '当前群聊仅供查看' : '当前群聊已开启全体禁言'}
          </div>
        ) : (
          <form className={styles.composer} onSubmit={sendMessage}>
            {attachmentOpen ? <div className={styles.attachmentPanel} aria-label="附件与扩展">
              {ATTACHMENT_ACTIONS.map(({ Icon, label }) => <button type="button" key={label} onClick={() => { setAttachmentOpen(false); setFeedback(`${label}入口为 Placeholder，未访问真实设备或文件服务。`); }}><Icon aria-hidden="true" size={17} /><span>{label}</span></button>)}
              <button type="button" onClick={() => { setAttachmentOpen(false); setFeedback('临时教室入口为 Placeholder，未访问真实设备或文件服务。'); }}><Presentation aria-hidden="true" size={17} /><span>临时教室</span></button>
            </div> : null}
            <textarea
              aria-label="输入消息"
              onChange={(event) => setComposer(event.target.value)}
              placeholder="输入消息"
              rows={1}
              value={composer}
            />
            <div className={styles.composerTools}>
              <button type="button" onClick={sendEmoji} aria-label="发送表情" title="发送表情"><Smile aria-hidden="true" size={18} /></button>
              <button type="button" aria-expanded={attachmentOpen} onClick={() => setAttachmentOpen((value) => !value)} aria-label="添加附件" title="添加附件"><Paperclip aria-hidden="true" size={18} /></button>
              <button className={styles.sendButton} type="submit" disabled={!composer.trim()}>
                <SendHorizontal aria-hidden="true" size={16} />发送
              </button>
            </div>
          </form>
        )}
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      </section>
    );
  };

  const renderNotice = (thread: MessageThread) => {
    const notice = thread.notice;
    if (!notice) return null;
    const activateNotice = () => {
      if (!notice.actionTarget) {
        setFeedback(notice.actionFeedback);
        return;
      }
      const prefix = role === 'teacher' ? '/teacher' : '/student';
      const params = new URLSearchParams({ source: 'notification', notification: thread.id });
      const base = `${prefix}/homework/${notice.actionTarget.homeworkId}`;
      if (notice.actionTarget.view === 'correction') params.set('mode', 'correction');
      const suffix = notice.actionTarget.view === 'correction'
        ? '/edit'
        : notice.actionTarget.view === 'result' ? '/result' : '';
      navigate(`${base}${suffix}?${params.toString()}`);
    };
    return (
      <article className={styles.notice} aria-labelledby="notice-title">
        <header className={styles.noticeHeader}>
          <span>{notice.tag}</span>
          <h2 id="notice-title">{getMessageThreadTitle(role, thread)}</h2>
          <p>{getMessageThreadSubtitle(role, thread)} · {formatMessageListTime(thread.updatedAt, MESSAGE_NOW)}</p>
        </header>
        <div className={styles.noticeBody}>
          {notice.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <dl className={styles.noticeMeta}>
          {notice.metadata.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className={styles.noticeAction}>
          <button type="button" onClick={activateNotice}>{notice.actionLabel}</button>
          {thread.category === 'system' ? <span>阅读消息不会改变待办的处理状态</span> : null}
        </div>
        {feedback ? <p className={styles.noticeFeedback} role="status">{feedback}</p> : null}
      </article>
    );
  };

  if (fixedClassId) {
    if (embedded) {
      return selectedThread ? renderChat(selectedThread) : (
        <div className={styles.contentEmpty}>
          <MessagesSquare aria-hidden="true" size={24} />
          <strong>当前班级暂无可用群聊</strong>
        </div>
      );
    }
    const prefix = role === 'teacher' ? '/teacher' : '/student';
    const returnPath = `${prefix}/classes/${fixedClassId}${searchParams.get('from') === 'home' ? '?from=home' : ''}`;
    return (
      <div className={styles.focusedPage}>
        <header className={styles.focusedHeader}>
          <button type="button" onClick={() => navigate(returnPath)}><ArrowLeft aria-hidden="true" size={17} />返回班级</button>
          <span>班级群聊</span>
        </header>
        <main className={styles.focusedContent}>
          {selectedThread ? renderChat(selectedThread) : (
            <div className={styles.contentEmpty}>
              <MessagesSquare aria-hidden="true" size={24} />
              <strong>当前班级暂无可用群聊</strong>
              <button type="button" onClick={() => navigate(returnPath)}>返回班级</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.threadPanel} aria-label={`${MESSAGE_CATEGORY_LABELS[category]}列表`}>
        <div className={styles.categoryTabs} role="group" aria-label="消息分类">
          {CATEGORY_ORDER.map((item) => {
            const count = unreadCounts[item];
            const dotOnly = item === 'system' || item === 'official';
            return (
              <button type="button" aria-label={MESSAGE_CATEGORY_LABELS[item]} aria-pressed={category === item} key={item} onClick={() => changeCategory(item)}>
                <span>{MESSAGE_CATEGORY_LABELS[item]}</span>
                {count > 0 ? (dotOnly ? <i aria-hidden="true" /> : <strong aria-hidden="true">{formatUnreadCount(count)}</strong>) : null}
              </button>
            );
          })}
        </div>
        <div className={styles.searchActions}>
          <label className={styles.searchBox}>
            <Search aria-hidden="true" size={15} />
            <span className={styles.srOnly}>搜索当前分类</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索${MESSAGE_CATEGORY_LABELS[category]}`} />
          </label>
          <div className={styles.threadCommands}>
            {category === 'direct' ? (
              <button
                type="button"
                aria-label="发起私聊"
                onClick={() => {
                  contactTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
                  setContactOpen(true);
                }}
                ref={contactTriggerRef}
                title="发起私聊"
              >
                <UserRoundPlus aria-hidden="true" size={17} />
              </button>
            ) : null}
            <button
              ref={listMenuTriggerRef}
              type="button"
              aria-expanded={listMenuOpen}
              aria-label={`${MESSAGE_CATEGORY_LABELS[category]}列表操作`}
              onClick={() => setListMenuOpen((open) => !open)}
              title="列表操作"
            >
              <MoreHorizontal aria-hidden="true" size={17} />
            </button>
            {listMenuOpen ? (
              <div
                className={styles.commandMenu}
                ref={listMenuRef}
                role="menu"
                aria-label={`${MESSAGE_CATEGORY_LABELS[category]}列表操作`}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeListMenu();
                }}
              >
                <button type="button" role="menuitem" onClick={markCurrentCategoryRead}>
                  <CheckCheck aria-hidden="true" size={15} />全部标为已读
                </button>
                {category === 'direct' ? (
                  <button type="button" role="menuitem" onClick={() => navigate(`/${role === 'teacher' ? 'teacher' : 'student'}/join`)}>
                    <ScanLine aria-hidden="true" size={15} />加入与添加
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.threadList}>
          {categoryThreads.map((thread) => {
            const unread = thread.unreadByRole[role] ?? 0;
            const lastEntry = getLastMessageEntry(thread);
            const preview = lastEntry?.body ?? thread.notice?.body[0] ?? '';
            return (
              <button
                type="button"
                aria-current={selectedId === thread.id ? 'true' : undefined}
                className={styles.threadRow}
                data-highlighted={isHomeArrival && selectedId === thread.id}
                data-thread-id={thread.id}
                data-unread={unread > 0}
                key={thread.id}
                onClick={() => selectThread(thread)}
              >
                <span className={styles.threadAvatar} data-source={thread.category === 'system' || thread.category === 'official'}>
                  {thread.category === 'system' || thread.category === 'official' ? (() => {
                    const Icon = CATEGORY_ICONS[thread.category];
                    return <Icon aria-hidden="true" size={17} />;
                  })() : thread.avatarByRole[role] ?? '?'}
                </span>
                <span className={styles.threadCopy}>
                  <span><strong>{getMessageThreadTitle(role, thread)}</strong><time>{formatMessageListTime(thread.updatedAt, MESSAGE_NOW)}</time></span>
                  <small>{preview}</small>
                </span>
                {unread > 0 ? (category === 'direct' || category === 'class' ? <b>{formatUnreadCount(unread)}</b> : <i />) : null}
              </button>
            );
          })}
          {categoryThreads.length === 0 ? (
            <div className={styles.emptyState}>
              {query ? <Search aria-hidden="true" size={20} /> : <MessagesSquare aria-hidden="true" size={20} />}
              <strong>{query ? '没有匹配的消息' : `暂无${MESSAGE_CATEGORY_LABELS[category]}`}</strong>
              {query
                ? <button type="button" onClick={() => setQuery('')}>清除搜索</button>
                : <span>此分类暂时没有消息</span>}
            </div>
          ) : null}
        </div>
      </section>

      <main className={styles.contentWorkspace}>
        {selectedThread && selectedThread.category === category
          ? (selectedThread.category === 'direct' || selectedThread.category === 'class'
            ? renderChat(selectedThread)
            : renderNotice(selectedThread))
          : (
            <div className={styles.contentEmpty}>
              <MessagesSquare aria-hidden="true" size={24} />
              <strong>{targetThreadId ? '目标消息不可用' : categoryHasThreads ? '选择一条消息' : `暂无${MESSAGE_CATEGORY_LABELS[category]}`}</strong>
              <span role={targetThreadId ? 'status' : undefined}>{targetThreadId ? '目标消息在当前视角不可用' : categoryHasThreads ? '内容会在这里展开' : '此分类暂时没有消息'}</span>
            </div>
          )}
      </main>

      {contactOpen ? (
        <dialog
          aria-labelledby="contact-dialog-title"
          className={styles.contactDialog}
          ref={contactDialogRef}
          onCancel={(event) => {
            event.preventDefault();
            closeContacts();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeContacts();
              return;
            }
            trapContactDialogFocus(event);
          }}
        >
          <div className={styles.contactContent}>
          <header>
            <h2 id="contact-dialog-title">发起私聊</h2>
            <button type="button" onClick={closeContacts} aria-label="关闭联系人"><X aria-hidden="true" size={18} /></button>
          </header>
          <label className={styles.contactSearch}>
            <Search aria-hidden="true" size={15} />
            <span className={styles.srOnly}>搜索联系人</span>
            <input autoFocus value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="搜索姓名或关系" />
          </label>
          <div className={styles.contactList}>
            {contacts.map((contact) => (
              <button type="button" key={contact.id} onClick={() => openContactThread(contact.targetThreadId)}>
                <span>{contact.name.slice(0, 1)}</span>
                <span><strong>{contact.name}</strong><small>{contact.relationship}</small></span>
                <MessageCircle aria-hidden="true" size={17} />
              </button>
            ))}
          </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
