import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCheck,
  Contact,
  FileText,
  Files,
  Image,
  Link2,
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
  Settings2,
  Smile,
  Sparkles,
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
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import type { AppRole } from '@domain/account/role';
import type {
  AgentMentionEntity,
  ClassAgentDefinition,
  ClassAgentThreadBinding,
} from '@domain/class-agent/class-agent';
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
import type { GuidedExplanationContentReference } from '@domain/workbuddy/guided-explanation';
import type { DirectConversationScope } from '@domain/message/direct-conversation-directory';
import { MESSAGE_CONTACTS, MESSAGE_NOW } from '@mocks/scenarios/messages';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { GuidedExplanationPreviewDialog, WorkBuddyImSidecar, useOptionalWorkBuddyIm, type WorkBuddyImTarget } from '@features/workbuddy-im-assistance';
import {
  AgentMentionPicker,
  projectAgentPickerOptions,
  useOptionalClassAgentConversation,
  type AgentPickerOption,
  type AgentPickerPerson,
} from '@features/class-agent-conversation';
import { MessageWorkspaceResizableLayout } from './MessageWorkspaceResizableLayout';
import { useMessageWorkspaceStore } from './message-workspace-store';
import styles from './MessageWorkspace.module.css';

const CATEGORY_ICONS: Record<MessageCategory, LucideIcon> = {
  direct: MessageCircle,
  class: MessagesSquare,
  system: Bell,
  official: Megaphone,
};

const CATEGORY_ORDER: MessageCategory[] = ['direct', 'class', 'system', 'official'];
const CLASS_AGENT_PENDING_FEEDBACK = '消息已发送，班级 Agent 正在处理你的问题。';
const ATTACHMENT_ACTIONS: ReadonlyArray<{ Icon: LucideIcon; label: string }> = [
  { Icon: Image, label: '照片' },
  { Icon: Camera, label: '拍摄' },
  { Icon: Contact, label: '名片' },
  { Icon: FileText, label: '文件' },
  { Icon: Mic, label: '语音' },
];

type MessageWorkspaceProps = {
  role: AppRole;
  immersive?: boolean;
  onEnterImmersive?: () => void;
  fixedClassId?: string;
  readOnly?: boolean;
  embedded?: boolean;
};

type RenderChatOptions = {
  detachAssistant?: boolean;
};

type AgentPickerState = Readonly<{
  mode: 'mixed-mention' | 'agent-only';
  query: string;
}>;

type PrimaryAgentTarget = Readonly<{
  threadId: string;
  agent: ClassAgentDefinition;
  binding: ClassAgentThreadBinding;
  mention: AgentMentionEntity;
  status: 'ready' | 'stale';
}>;

type AgentTargetUndo = Readonly<{
  threadId: string;
  previousTarget: PrimaryAgentTarget;
  replacementAgentName: string;
  expiresAt: number;
}>;

const CLASS_MENTION_PEOPLE: Record<AppRole, readonly AgentPickerPerson[]> = {
  teacher: [
    { id: 'student-li-ming', name: '李明', description: '学生 · 高二物理 3 班' },
    { id: 'student-zhang-san', name: '张三', description: '学生 · 高二物理 3 班' },
  ],
  'student-family': [
    { id: 'teacher-wang', name: '王老师', description: '物理老师 · 高二物理 3 班' },
    { id: 'student-li-hua', name: '李华', description: '同学 · 高二物理 3 班' },
  ],
};

function getActiveMentionQuery(value: string): string | null {
  const match = value.match(/(?:^|\s)@([^\s@]*)$/u);
  return match?.[1] ?? null;
}

function removeActiveMentionQuery(value: string): string {
  return value.replace(/(?:^|\s)@[^\s@]*$/u, '').trimEnd();
}

function replaceActiveMentionQuery(value: string, label: string): string {
  return value.replace(/(?:^|\s)@[^\s@]*$/u, (match) => `${match.startsWith(' ') ? ' ' : ''}@${label} `);
}

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

function createWorkBuddyTarget(role: AppRole, thread: MessageThread): WorkBuddyImTarget {
  return {
    kind: thread.category === 'direct' ? 'direct' : 'class',
    classId: thread.classId ?? `direct:${thread.id}`,
    classLabel: getMessageThreadTitle(role, thread),
    threadId: thread.id,
    memberCount: thread.memberCount,
    recentMessages: thread.entries.slice(-6).map(({ authorRole, authorName, body }) => Object.freeze({ authorRole, authorName, body })),
  };
}

export function MessageWorkspace({ role, immersive = false, onEnterImmersive, fixedClassId, readOnly = false, embedded = false }: MessageWorkspaceProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, actions } = useMessageWorkspaceStore();
  const workBuddyIm = useOptionalWorkBuddyIm();
  const classAgentConversation = useOptionalClassAgentConversation();
  const { threads, mutedThreadIds } = useMemo(() => state.status === 'ready'
    ? state
    : { threads: [] as ReadonlyArray<MessageThread>, mutedThreadIds: new Set<string>() }, [state]);
  const fixedThread = fixedClassId
    ? threads.find((thread) => thread.category === 'class' && thread.classId === fixedClassId && thread.visibleTo.includes(role)) ?? null
    : null;
  const [query, setQuery] = useState('');
  const [directScope, setDirectScope] = useState<DirectConversationScope>('all');
  const [composerByThread, setComposerByThread] = useState<Readonly<Record<string, string>>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [agentPicker, setAgentPicker] = useState<AgentPickerState | null>(null);
  const [agentPickerActiveIndex, setAgentPickerActiveIndex] = useState(0);
  const [primaryAgentTarget, setPrimaryAgentTarget] = useState<PrimaryAgentTarget | null>(null);
  const [agentTargetUndo, setAgentTargetUndo] = useState<AgentTargetUndo | null>(null);
  const [pendingContactThreadId, setPendingContactThreadId] = useState<string | null>(null);
  const [openExplanation, setOpenExplanation] = useState<GuidedExplanationContentReference | null>(null);
  const [historyLoadingThreadId, setHistoryLoadingThreadId] = useState<string | null>(null);
  const [hasUnreadArrival, setHasUnreadArrival] = useState(false);
  const contactTriggerRef = useRef<HTMLButtonElement | null>(null);
  const listMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contextMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contactDialogRef = useRef<HTMLDialogElement | null>(null);
  const explanationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const immersiveForcedThreadRef = useRef<string | null>(null);
  const agentPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollByThread = useRef(new Map<string, number>());
  const historyHeightAnchorRef = useRef<{ threadId: string; scrollHeight: number } | null>(null);
  const latestEntryIdByThread = useRef(new Map<string, string>());
  const activeTimelineThreadId = useRef<string | null>(null);

  const category = fixedClassId ? 'class' : parseCategory(searchParams.get('category')) ?? 'class';
  const directDirectoryClassId = threads.find((thread) => (
    thread.visibleTo.includes(role) && thread.classAgentBinding?.channel === 'private-direct'
  ))?.classAgentBinding?.classId ?? 'physics-3';
  const directDirectory = useMemo(() => (
    category === 'direct' && classAgentConversation
      ? classAgentConversation.projectDirectDirectory({
        role,
        classId: directDirectoryClassId,
        query,
        scope: directScope,
        threads,
      })
      : null
  ), [category, classAgentConversation, directDirectoryClassId, directScope, query, role, threads]);
  const categoryThreads = useMemo(() => (
    directDirectory
      ? directDirectory.sections.flatMap(({ rows }) => rows.map(({ thread }) => thread))
      : filterMessageThreads(role, threads, category, query)
  ), [category, directDirectory, query, role, threads]);
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
  const composer = selectedId ? composerByThread[selectedId] ?? '' : '';
  const setComposerForThread = (threadId: string, value: SetStateAction<string>) => {
    setComposerByThread((current) => {
      const currentValue = current[threadId] ?? '';
      const nextValue = typeof value === 'function' ? value(currentValue) : value;
      return nextValue === currentValue ? current : Object.freeze({ ...current, [threadId]: nextValue });
    });
  };
  const setComposer = (value: SetStateAction<string>) => {
    if (!selectedId) return;
    setComposerForThread(selectedId, value);
  };
  const latestSelectedEntry = selectedThread?.entries[selectedThread.entries.length - 1] ?? null;
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
  }, [immersive, isHomeArrival, selectedId]);

  useEffect(() => {
    if (!agentTargetUndo) return undefined;
    const timer = window.setTimeout(
      () => setAgentTargetUndo((current) => current === agentTargetUndo ? null : current),
      Math.max(0, agentTargetUndo.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [agentTargetUndo]);

  useLayoutEffect(() => {
    if (!selectedId || !timelineRef.current) {
      activeTimelineThreadId.current = null;
      return;
    }
    if (activeTimelineThreadId.current === selectedId) return;
    activeTimelineThreadId.current = selectedId;
    const timeline = timelineRef.current;
    const saved = timelineScrollByThread.current.get(selectedId);
    timeline.scrollTop = saved ?? timeline.scrollHeight;
    setHasUnreadArrival(false);
    latestEntryIdByThread.current.set(selectedId, latestSelectedEntry?.id ?? '');
  }, [latestSelectedEntry?.id, selectedId]);

  useLayoutEffect(() => {
    if (!selectedId || !timelineRef.current) return;
    const timeline = timelineRef.current;
    const historyAnchor = historyHeightAnchorRef.current;
    if (historyAnchor?.threadId === selectedId) {
      timeline.scrollTop += timeline.scrollHeight - historyAnchor.scrollHeight;
      timelineScrollByThread.current.set(selectedId, timeline.scrollTop);
      historyHeightAnchorRef.current = null;
      setHistoryLoadingThreadId(null);
      return;
    }
    const previousId = latestEntryIdByThread.current.get(selectedId);
    if (!latestSelectedEntry || previousId === latestSelectedEntry.id) return;
    latestEntryIdByThread.current.set(selectedId, latestSelectedEntry.id);
    if (latestSelectedEntry.authorRole === role) {
      timeline.scrollTop = timeline.scrollHeight;
      timelineScrollByThread.current.set(selectedId, timeline.scrollTop);
      return;
    }
    if (latestSelectedEntry.authorRole !== 'class-agent') return;
    const nearBottom = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight <= 128;
    if (nearBottom) {
      timeline.scrollTop = timeline.scrollHeight;
      timelineScrollByThread.current.set(selectedId, timeline.scrollTop);
      setHasUnreadArrival(false);
    } else {
      setHasUnreadArrival(true);
    }
  }, [latestSelectedEntry, role, selectedId, selectedThread?.entries.length]);

  const loadOlderSelectedMessages = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || !selectedThread?.olderEntries?.length || historyLoadingThreadId === selectedThread.id) return;
    historyHeightAnchorRef.current = { threadId: selectedThread.id, scrollHeight: timeline.scrollHeight };
    setHistoryLoadingThreadId(selectedThread.id);
    actions.loadOlderMessages(selectedThread.id);
  }, [actions, historyLoadingThreadId, selectedThread]);

  const handleSelectedTimelineScroll = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || !selectedThread) return;
    timelineScrollByThread.current.set(selectedThread.id, timeline.scrollTop);
    const nearBottom = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight <= 48;
    if (nearBottom) setHasUnreadArrival(false);
    if (timeline.scrollTop <= 24 && selectedThread.olderEntries?.length) loadOlderSelectedMessages();
  }, [loadOlderSelectedMessages, selectedThread]);

  const jumpToLatestSelectedMessage = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || !selectedThread) return;
    timeline.scrollTop = timeline.scrollHeight;
    timelineScrollByThread.current.set(selectedThread.id, timeline.scrollTop);
    setHasUnreadArrival(false);
  }, [selectedThread]);

  const immersiveWorkBuddyThread = immersive
    && workBuddyIm !== null
    && role === 'teacher'
    && selectedThread !== null
    && (selectedThread.category === 'class' || selectedThread.category === 'direct')
    && (selectedThread.category !== 'class' || selectedThread.classId !== undefined)
    && !readOnly
    && !embedded
    ? selectedThread
    : null;

  useLayoutEffect(() => {
    if (!workBuddyIm) return;
    if (immersiveWorkBuddyThread) {
      immersiveForcedThreadRef.current = immersiveWorkBuddyThread.id;
      const alreadyOpenForTarget = workBuddyIm.state.isOpen
        && workBuddyIm.state.target?.threadId === immersiveWorkBuddyThread.id;
      if (!alreadyOpenForTarget) {
        workBuddyIm.actions.open(createWorkBuddyTarget(role, immersiveWorkBuddyThread));
      }
      return;
    }
    if (immersive || !immersiveForcedThreadRef.current) return;
    if (workBuddyIm.state.isOpen && workBuddyIm.state.target?.threadId === immersiveForcedThreadRef.current) {
      workBuddyIm.actions.close();
    }
    immersiveForcedThreadRef.current = null;
  }, [immersive, immersiveWorkBuddyThread, role, workBuddyIm]);
  const contacts = (() => {
    const visibleContacts = MESSAGE_CONTACTS.filter(({ visibleTo }) => visibleTo.includes(role));
    const directBindings = threads
      .filter((thread) => thread.visibleTo.includes(role) && thread.classAgentBinding?.channel === 'private-direct')
      .map((thread) => thread.classAgentBinding)
      .filter((binding): binding is ClassAgentThreadBinding => binding !== undefined);
    const projection = classAgentConversation?.projectAgents({
      role,
      classId: selectedThread?.classId ?? 'physics-3',
      channel: 'private-direct',
      mode: 'direct-agent',
      query: contactQuery,
      bindings: directBindings,
    });
    const visibleAgentIds = new Set(projection?.candidates.map(({ agent }) => agent.id) ?? []);
    const normalized = contactQuery.trim().toLocaleLowerCase();
    return visibleContacts.filter((contact) => {
      if (contact.agentId) return visibleAgentIds.has(contact.agentId);
      return !normalized || `${contact.name} ${contact.relationship}`.toLocaleLowerCase().includes(normalized);
    });
  })();

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
    if (fixedClassId) {
      return (
        <div className={immersive ? styles.focusedImmersivePage : styles.focusedContent} aria-busy="true" aria-label="班级消息正在加载">
          <div className={styles.contentEmpty}><strong>正在加载班级消息</strong></div>
        </div>
      );
    }
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
    setFeedback(null);
    setAgentPicker(null);
    setPrimaryAgentTarget(null);
    setAgentTargetUndo(null);
    setListMenuOpen(false);
    setContextMenuOpen(false);
    setAttachmentOpen(false);
    setHasUnreadArrival(false);
    actions.readThread(role, thread.id);
    setSearchParams({ category: thread.category, thread: thread.id }, { replace: true });
  };

  const changeCategory = (nextCategory: MessageCategory) => {
    const nextThread = filterMessageThreads(role, threads, nextCategory, '')[0] ?? null;
    setQuery('');
    setDirectScope('all');
    setFeedback(null);
    setAgentPicker(null);
    setPrimaryAgentTarget(null);
    setAgentTargetUndo(null);
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

  const sendMessage = () => {
    if (readOnly || !selectedThread || !composer.trim()) return;
    const authorName = role === 'teacher' ? '王老师' : '李明';
    const body = composer.trim();
    const selectedTarget = primaryAgentTarget?.threadId === selectedThread.id ? primaryAgentTarget : null;
    if (selectedTarget?.status === 'stale') {
      setFeedback('该 Agent 的班级授权已更新；正文已保留，请重新选择或移除 Agent。');
      return;
    }
    const currentPublicAgentBindings = selectedThread.classAgentBindings
      ?? (selectedThread.classAgentBinding?.channel === 'public-class' ? [selectedThread.classAgentBinding] : []);
    const publicAgentResult = selectedTarget && classAgentConversation
      ? classAgentConversation.submit({
        currentBindings: currentPublicAgentBindings,
        agentMention: selectedTarget.mention,
        threadId: selectedThread.id,
        requesterRole: role,
        requesterName: authorName,
        body,
        recentMessages: selectedThread.entries.slice(-6).map(({ authorName: messageAuthor, body: messageBody }) => ({
          authorName: messageAuthor,
          body: messageBody,
        })),
      })
      : null;
    const directAgentResult = !selectedTarget && selectedThread.classAgentBinding?.channel === 'private-direct' && classAgentConversation
      ? classAgentConversation.submit({
        currentBindings: [selectedThread.classAgentBinding],
        threadId: selectedThread.id,
        requesterRole: role,
        requesterName: authorName,
        body,
        recentMessages: selectedThread.entries.slice(-6).map(({ authorName: messageAuthor, body: messageBody }) => ({
          authorName: messageAuthor,
          body: messageBody,
        })),
      })
      : null;
    const agentResult = publicAgentResult ?? directAgentResult;
    if (agentResult?.status === 'ignored') {
      setFeedback(agentResult.reason === 'stale-authorization'
        ? '该 Agent 的班级授权已更新，请重新选择后再发送。'
        : agentResult.reason === 'busy'
          ? '当前 Agent 正在回复，请稍后再发送。'
          : '当前 Agent 不可用，请重新选择已授权的 Agent。');
      if (agentResult.reason === 'stale-authorization' || agentResult.reason === 'not-authorized') {
        setPrimaryAgentTarget((current) => current?.threadId === selectedThread.id
          ? Object.freeze({ ...current, status: 'stale' as const })
          : current);
      }
      return;
    }
    const displayBody = selectedTarget ? `@${selectedTarget.agent.name} ${body}` : body;
    actions.appendMessage({
      role,
      authorName,
      threadId: selectedThread.id,
      body: displayBody,
      sentAt: '2026-08-08T14:15:00+08:00',
    });
    setComposer('');
    setAgentPicker(null);
    setPrimaryAgentTarget(null);
    setAgentTargetUndo(null);
    window.requestAnimationFrame(() => {
      if (!timelineRef.current) return;
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
      timelineScrollByThread.current.set(selectedThread.id, timelineRef.current.scrollTop);
    });
    setFeedback(agentResult?.status === 'accepted'
      ? CLASS_AGENT_PENDING_FEEDBACK
      : '消息已在本地 Demo 中发送。');
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

  const toggleDirectMute = () => {
    if (readOnly || !selectedThread || selectedThread.category !== 'direct') return;
    const wasMuted = mutedThreadIds.has(selectedThread.id);
    actions.toggleMute(selectedThread.id);
    setFeedback(wasMuted ? '已关闭消息免打扰。' : '已开启消息免打扰，仅在本地 Demo 中生效。');
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
    setPendingContactThreadId(null);
    window.requestAnimationFrame(() => contactTriggerRef.current?.focus());
  };

  const openContactThread = (targetThreadId: string) => {
    const target = threads.find(({ id }) => id === targetThreadId);
    if (!target) return;
    const switchingAgentThread = selectedThread?.classAgentBinding?.channel === 'private-direct'
      && target.classAgentBinding?.channel === 'private-direct'
      && selectedThread.id !== target.id;
    if (switchingAgentThread && composer.trim() && pendingContactThreadId !== targetThreadId) {
      setPendingContactThreadId(targetThreadId);
      setFeedback('切换后草稿会保留在当前会话；再次选择该 Agent 以确认切换。');
      return;
    }
    setQuery('');
    setPendingContactThreadId(null);
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

  const isWorkBuddyAvailable = (thread: MessageThread) => (
    workBuddyIm !== null
    && role === 'teacher'
    && (thread.category === 'class' || thread.category === 'direct')
    && (thread.category !== 'class' || thread.classId !== undefined)
    && !readOnly
    && !embedded
    && thread.classAgentBinding?.channel !== 'private-direct'
  );

  const isWorkBuddyOpen = (thread: MessageThread) => (
    isWorkBuddyAvailable(thread)
    && workBuddyIm?.state.isOpen === true
    && workBuddyIm.state.target?.threadId === thread.id
  );

  const toggleWorkBuddy = (thread: MessageThread) => {
    if (!workBuddyIm || !isWorkBuddyAvailable(thread)) return;
    if (isWorkBuddyOpen(thread)) workBuddyIm.actions.close();
    else workBuddyIm.actions.open(createWorkBuddyTarget(role, thread));
  };

  const activateWorkBuddy = (thread: MessageThread) => {
    if (!workBuddyIm || !isWorkBuddyAvailable(thread)) return;
    if (!immersive && onEnterImmersive) {
      if (!isWorkBuddyOpen(thread)) workBuddyIm.actions.open(createWorkBuddyTarget(role, thread));
      onEnterImmersive();
      return;
    }
    toggleWorkBuddy(thread);
  };

  const closeWorkBuddy = (thread: MessageThread) => {
    if (!workBuddyIm) return;
    workBuddyIm.actions.close();
    window.requestAnimationFrame(() => {
      const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-workbuddy-trigger]'))
        .find((element) => element.dataset.workbuddyTrigger === thread.id);
      trigger?.focus();
    });
  };

  const locateWorkBuddyMessage = (messageId: string) => {
    window.requestAnimationFrame(() => {
      const message = Array.from(document.querySelectorAll<HTMLElement>('[data-message-id]'))
        .find((element) => element.dataset.messageId === messageId);
      message?.scrollIntoView?.({ block: 'center' });
      message?.focus({ preventScroll: true });
    });
  };

  const insertWorkBuddyDirectReply = (thread: MessageThread, body: string) => {
    const normalizedBody = body.trim();
    if (!workBuddyIm || !normalizedBody) return;
    setComposerForThread(thread.id, normalizedBody);
    setFeedback('回复建议已插入输入框，请确认后发送。');
    if (!immersive) workBuddyIm.actions.close();
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="输入消息"]')?.focus();
    });
  };

  const renderChat = (thread: MessageThread, { detachAssistant = false }: RenderChatOptions = {}) => {
    const pinned = thread.entries.find(({ id }) => id === thread.pinnedMessageId);
    const isMuted = mutedThreadIds.has(thread.id);
    const composerBlocked = readOnly || (isMuted && role === 'student-family');
    const classPath = `/${role === 'teacher' ? 'teacher' : 'student'}/classes/${thread.classId ?? ''}?from=messages`;
    const workBuddyAvailable = isWorkBuddyAvailable(thread);
    const workBuddyOpen = isWorkBuddyOpen(thread);
    const teacherManagementAvailable = role === 'teacher' && (thread.category === 'class' || thread.category === 'direct');
    const conversationMenuAvailable = thread.category === 'class' || teacherManagementAvailable;
    const conversationMenuLabel = teacherManagementAvailable ? '会话管理' : '班级会话操作';
    const subtitle = getMessageThreadSubtitle(role, thread);
    const classAgent = thread.classAgentBinding && classAgentConversation
      ? classAgentConversation.getAgent(thread.classAgentBinding.agentId)
      : null;
    const publicAgentBindings = thread.classAgentBindings
      ?? (thread.classAgentBinding?.channel === 'public-class' ? [thread.classAgentBinding] : []);
    const isPublicClassAgent = publicAgentBindings.length > 0 && classAgentConversation !== null;
    const publicAgentProjection = isPublicClassAgent && classAgentConversation
      ? classAgentConversation.projectAgents({
        role,
        classId: thread.classId ?? publicAgentBindings[0]?.classId ?? '',
        channel: 'public-class',
        mode: agentPicker?.mode ?? 'agent-only',
        query: agentPicker?.query ?? '',
        bindings: publicAgentBindings,
      })
      : null;
    const classAgentStatus = classAgentConversation?.getThreadStatus(thread.id) ?? { status: 'idle' as const };
    const statusAgent = classAgentStatus.status === 'idle'
      ? null
      : classAgentConversation?.getAgent(classAgentStatus.agentId) ?? null;
    const visibleFeedback = feedback === CLASS_AGENT_PENDING_FEEDBACK
      ? classAgentStatus.status === 'replied'
        ? '班级 Agent 已完成模拟回复。'
        : classAgentStatus.status === 'recoverable_failure'
          ? null
          : feedback
      : feedback;
    const openAgentPicker = (mode: AgentPickerState['mode'], query = '') => {
      if (mode === 'agent-only' && document.activeElement instanceof HTMLButtonElement) {
        agentPickerTriggerRef.current = document.activeElement;
      }
      setAgentPicker({ mode, query });
      setAgentPickerActiveIndex(0);
    };
    const focusComposer = () => {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="输入消息"]')?.focus();
      });
    };
    const closeAgentPicker = () => {
      const returnTarget = agentPicker?.mode === 'agent-only' ? agentPickerTriggerRef.current : null;
      setAgentPicker(null);
      window.requestAnimationFrame(() => {
        if (returnTarget) returnTarget.focus();
        else document.querySelector<HTMLTextAreaElement>('textarea[aria-label="输入消息"]')?.focus();
      });
    };
    const selectPublicAgent = (agentId: string) => {
      if (!publicAgentProjection || !classAgentConversation) return;
      const selection = classAgentConversation.selectAgent({
        projection: publicAgentProjection,
        agentId,
        currentBindings: publicAgentBindings,
      });
      if (selection.status !== 'selected' || !selection.mention) {
        setPrimaryAgentTarget(null);
        setAgentPicker(null);
        setFeedback('该 Agent 的班级授权已更新，请重新打开列表。');
        focusComposer();
        return;
      }
      const nextTarget: PrimaryAgentTarget = {
        threadId: thread.id,
        agent: selection.candidate.agent,
        binding: selection.candidate.binding,
        mention: selection.mention,
        status: 'ready',
      };
      const currentTarget = primaryAgentTarget?.threadId === thread.id ? primaryAgentTarget : null;
      if (currentTarget && currentTarget.agent.id !== nextTarget.agent.id) {
        setAgentTargetUndo({
          threadId: thread.id,
          previousTarget: currentTarget,
          replacementAgentName: nextTarget.agent.name,
          expiresAt: Date.now() + 5_000,
        });
        setFeedback(`已切换为 ${nextTarget.agent.name}，可在 5 秒内撤销。`);
      } else {
        setAgentTargetUndo(null);
        setFeedback(null);
      }
      setPrimaryAgentTarget(nextTarget);
      if (agentPicker?.mode === 'mixed-mention') setComposer((current) => removeActiveMentionQuery(current));
      setAgentPicker(null);
      focusComposer();
    };
    const selectMentionPerson = (person: AgentPickerPerson) => {
      setComposer((current) => replaceActiveMentionQuery(current, person.name));
      setAgentPicker(null);
      focusComposer();
    };
    const updateComposer = (value: string) => {
      setComposer(value);
      setAgentTargetUndo(null);
      setPendingContactThreadId(null);
      if (!isPublicClassAgent) return;
      const mentionQuery = getActiveMentionQuery(value);
      if (mentionQuery !== null) openAgentPicker('mixed-mention', mentionQuery);
      else if (agentPicker?.mode === 'mixed-mention') setAgentPicker(null);
    };
    const pickerOptions = publicAgentProjection
      ? projectAgentPickerOptions(publicAgentProjection, CLASS_MENTION_PEOPLE[role])
      : [];
    const choosePickerOption = (option: AgentPickerOption | undefined) => {
      if (!option) return;
      if (option.kind === 'agent') selectPublicAgent(option.agentId);
      else selectMentionPerson(option.person);
    };
    const activeTarget = primaryAgentTarget?.threadId === thread.id ? primaryAgentTarget : null;
    const activeTargetUndo = agentTargetUndo?.threadId === thread.id ? agentTargetUndo : null;
    const undoAgentTargetSwitch = () => {
      if (!activeTargetUndo || activeTargetUndo.expiresAt <= Date.now()) {
        setAgentTargetUndo(null);
        return;
      }
      setPrimaryAgentTarget(activeTargetUndo.previousTarget);
      setAgentTargetUndo(null);
      setFeedback(`已恢复 ${activeTargetUndo.previousTarget.agent.name} 为主响应 Agent。`);
      focusComposer();
    };
    const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'z' && activeTargetUndo) {
        event.preventDefault();
        undoAgentTargetSwitch();
        return;
      }
      if (event.key === 'Backspace' && !composer && activeTarget) {
        event.preventDefault();
        setPrimaryAgentTarget(null);
        setAgentTargetUndo(null);
        setFeedback(`已移除 ${activeTarget.agent.name}，本条消息不会触发班级 Agent。`);
        return;
      }
      if (agentPicker?.mode !== 'mixed-mention') return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setAgentPickerActiveIndex((current) => Math.max(0, Math.min(pickerOptions.length - 1, current + direction)));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setAgentPickerActiveIndex(event.key === 'Home' ? 0 : Math.max(0, pickerOptions.length - 1));
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        const option = pickerOptions[agentPickerActiveIndex] ?? pickerOptions[0];
        if (!option) return;
        event.preventDefault();
        choosePickerOption(option);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setAgentPicker(null);
      }
    };

    return (
      <div className={styles.conversationFrame} data-workbuddy-open={workBuddyOpen && !detachAssistant}>
        <section className={styles.conversation} aria-label={`${getMessageThreadTitle(role, thread)}会话`} data-message-conversation tabIndex={-1}>
        <header className={styles.contentHeader} data-message-header="conversation">
          <div className={styles.contentIdentity}>
            <h2 data-agent={classAgent !== null}>
              {classAgent ? <Sparkles aria-hidden="true" size={14} /> : null}
              <span>{getMessageThreadTitle(role, thread)}</span>
            </h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className={styles.contextActions}>
            {workBuddyAvailable && !immersive ? (
              <button
                className={styles.workBuddyButton}
                data-workbuddy-trigger={thread.id}
                type="button"
                aria-expanded={onEnterImmersive ? false : workBuddyOpen}
                onClick={() => activateWorkBuddy(thread)}
                title={onEnterImmersive ? `打开 ${TEACHBUDDY_BRAND.shortName} 并进入沉浸模式` : `打开 ${TEACHBUDDY_BRAND.shortName}`}
              >
                <Sparkles aria-hidden="true" size={14} />{TEACHBUDDY_BRAND.shortName}
              </button>
            ) : null}
            {thread.category === 'class' && !fixedClassId && !embedded ? (
              <button className={styles.enterClassButton} type="button" onClick={() => navigate(classPath)}>进入班级</button>
            ) : null}
            {conversationMenuAvailable ? (
              <div className={styles.contextMenuHost}>
                <button
                  ref={contextMenuTriggerRef}
                  className={teacherManagementAvailable ? styles.managementButton : undefined}
                  type="button"
                  aria-expanded={contextMenuOpen}
                  aria-label={teacherManagementAvailable ? '管理' : '班级会话操作'}
                  onClick={() => setContextMenuOpen((open) => !open)}
                  title={teacherManagementAvailable ? '管理当前会话' : '班级会话操作'}
                >
                  {teacherManagementAvailable ? <><Settings2 aria-hidden="true" size={14} /><span>管理</span></> : <MoreHorizontal aria-hidden="true" size={17} />}
                </button>
                {contextMenuOpen ? (
                  <div ref={contextMenuRef} className={styles.commandMenu} role="menu" aria-label={conversationMenuLabel} onKeyDown={(event) => { if (event.key === 'Escape') closeContextMenu(); }}>
                    {thread.category === 'class' ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <button type="button" role="menuitem" onClick={() => { setFeedback('联系人资料入口已保留，本 Demo 不读取真实通讯录。'); closeContextMenu(); }}>
                          <Contact aria-hidden="true" size={15} />联系人资料
                        </button>
                        {!readOnly ? <button type="button" role="menuitem" onClick={toggleDirectMute}>
                          {isMuted ? <Volume2 aria-hidden="true" size={15} /> : <VolumeX aria-hidden="true" size={15} />}
                          {isMuted ? '关闭消息免打扰' : '消息免打扰'}
                        </button>
                          : null}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {isPublicClassAgent && publicAgentProjection ? (
          <div className={styles.classAgentContext} data-agent-channel="public-class">
            <span className={styles.classAgentIcon}><Sparkles aria-hidden="true" size={15} /></span>
            <span className={styles.classAgentIdentity}>
              <strong>班级 Agents · {publicAgentProjection.totalAuthorized} 个可用</strong>
              <small>老师已授权 · 当前班级范围 · 群内公开回复</small>
            </span>
            <button type="button" onClick={() => openAgentPicker('agent-only')}>查看 Agents</button>
          </div>
        ) : null}

        {pinned ? (
          <div className={styles.pinnedBanner}>
            <Pin aria-hidden="true" size={14} />
            <span><strong>置顶</strong>{pinned.body}</span>
          </div>
        ) : null}

        <div
          className={styles.timeline}
          aria-label="消息记录"
          aria-live={historyLoadingThreadId === thread.id ? 'off' : 'polite'}
          data-message-timeline
          onScroll={handleSelectedTimelineScroll}
          ref={timelineRef}
          role="log"
          tabIndex={0}
        >
          {thread.classAgentBinding?.channel === 'private-direct' ? (
            <div className={styles.historyControl} role="status">
              {thread.olderEntries?.length ? (
                <button type="button" disabled={historyLoadingThreadId === thread.id} onClick={loadOlderSelectedMessages}>
                  {historyLoadingThreadId === thread.id ? '正在加载更早消息…' : '加载更早消息'}
                </button>
              ) : <span>已显示全部历史消息</span>}
            </div>
          ) : null}
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
            const isClassAgentEntry = entry.authorRole === 'class-agent' && entry.classAgent !== undefined;
            const canRecall = !readOnly && thread.category === 'class' && canRecallClassMessage(role, entry, MESSAGE_NOW);
            const canPin = !readOnly && role === 'teacher' && thread.category === 'class' && entry.kind !== 'retracted';
            return (
              <article className={styles.messageEntry} data-agent={isClassAgentEntry} data-grouped={grouped} data-message-id={entry.id} data-own={own} data-retracted={entry.kind === 'retracted'} key={entry.id} tabIndex={entry.id.startsWith('workbuddy-reminder-') ? -1 : undefined}>
                {!own && !grouped ? <span className={styles.messageAvatar}>{isClassAgentEntry ? <Sparkles aria-hidden="true" size={15} /> : entry.authorName.slice(0, 1)}</span> : null}
                <div>
                  {!grouped ? <span className={styles.messageAuthor}>{own ? '我' : entry.authorName} · {formatEntryTime(entry.sentAt)}</span> : null}
                  <p className={entry.contentReference?.kind === 'guided-explanation' ? styles.messageWithLink : undefined}>
                    <span>{entry.body}</span>
                  {entry.contentReference?.kind === 'guided-explanation' ? (
                    <button className={styles.explanationLink} type="button" onClick={(event) => { explanationTriggerRef.current = event.currentTarget; setOpenExplanation(entry.contentReference ?? null); }}>
                      <Link2 aria-hidden="true" size={14} />{entry.contentReference.linkLabel}
                    </button>
                  ) : null}
                  </p>
                  {entry.classAgent ? <small className={styles.classAgentMessageMeta}>{entry.classAgent.visibilityLabel}</small> : null}
                  {canRecall || canPin ? <div className={styles.messageActions}>
                    {canPin ? <button type="button" onClick={() => togglePin(entry.id)}><Pin aria-hidden="true" size={13} />{thread.pinnedMessageId === entry.id ? '取消置顶' : '置顶'}</button> : null}
                    {canRecall ? <button type="button" onClick={() => recallMessage(entry.id)}><Undo2 aria-hidden="true" size={13} />撤回</button> : null}
                  </div> : null}
                </div>
              </article>
            );
          })}
          {classAgentStatus.status === 'replying' ? (
            <div className={styles.classAgentStatus} data-phase={classAgentStatus.phase} role="status" aria-live="polite">
              <span className={styles.classAgentThinkingAvatar}><Sparkles aria-hidden="true" size={14} /></span>
              <span className={styles.classAgentThinkingCopy}>
                <strong>{statusAgent?.name ?? '班级 Agent'}</strong>
                <small>{classAgentStatus.phase === 'understanding' ? '正在理解你的问题' : '正在整理可检查的回复步骤'}</small>
              </span>
              <span className={styles.classAgentThinkingDots} aria-hidden="true"><i /><i /><i /></span>
            </div>
          ) : null}
          {classAgentStatus.status === 'recoverable_failure' || classAgentStatus.status === 'authorization_failure' ? (
            <div className={styles.classAgentFailure} role="alert">
              <span className={styles.classAgentThinkingAvatar}><Sparkles aria-hidden="true" size={14} /></span>
              <span className={styles.classAgentThinkingCopy}>
                <strong>{statusAgent?.name ?? '班级 Agent'}</strong>
                <small>回复未完成</small>
              </span>
              <span>{classAgentStatus.message}</span>
              {classAgentStatus.status === 'recoverable_failure'
                ? <button type="button" onClick={() => classAgentConversation?.retry(thread.id)}>重试</button>
                : null}
            </div>
          ) : null}
          {hasUnreadArrival ? <button className={styles.newMessageAnchor} type="button" onClick={jumpToLatestSelectedMessage}>1 条新消息</button> : null}
        </div>

        {composerBlocked ? (
          <div className={styles.readOnlyBar} role="status">
            {readOnly ? '当前群聊仅供查看' : '当前群聊已开启全体禁言'}
          </div>
        ) : (
          <WorkspaceComposer
            ariaLabel="输入消息"
            className={styles.composerDock}
            target={activeTarget ? (
              <div className={styles.agentTarget} data-status={activeTarget.status}>
                <span><Sparkles aria-hidden="true" size={14} /></span>
                <span><strong>@{activeTarget.agent.name}</strong><small>{activeTarget.status === 'stale' ? '授权已更新 · 请重新选择或移除' : `主响应 Agent · 群内公开 · ${activeTarget.agent.contextScopeLabel}`}</small></span>
                <span className={styles.agentTargetActions}>
                  {activeTargetUndo ? <button className={styles.agentTargetUndo} type="button" onClick={undoAgentTargetSwitch}>撤销切换</button> : null}
                  <button type="button" onClick={() => { setPrimaryAgentTarget(null); setAgentTargetUndo(null); }} aria-label={`移除${activeTarget.agent.name}`} title="移除 Agent"><X aria-hidden="true" size={14} /></button>
                </span>
              </div>
            ) : null}
            onSubmit={sendMessage}
            onTextareaKeyDown={handleComposerKeyDown}
            onValueChange={updateComposer}
            placeholder="输入消息"
            submitLabel="发送"
            hint={isPublicClassAgent
              ? activeTarget
                ? `将由 ${activeTarget.agent.name} 在群内公开回复`
                : '输入 @ 选择班级 Agent 或成员；也可点击 @Agent 快速选择'
              : classAgent ? '仅你与班级 Agent 可见 · 对话按治理规则留存' : undefined}
            tools={<>
              {agentPicker && publicAgentProjection ? (
                <AgentMentionPicker
                  activeIndex={agentPickerActiveIndex}
                  onActiveIndexChange={setAgentPickerActiveIndex}
                  onClose={closeAgentPicker}
                  onQueryChange={agentPicker.mode === 'agent-only' ? (nextQuery) => { setAgentPicker({ mode: 'agent-only', query: nextQuery }); setAgentPickerActiveIndex(0); } : undefined}
                  onSelectAgent={selectPublicAgent}
                  onSelectPerson={selectMentionPerson}
                  people={CLASS_MENTION_PEOPLE[role]}
                  projection={publicAgentProjection}
                />
              ) : null}
              {isPublicClassAgent ? <button type="button" className={styles.classAgentMentionTool} aria-expanded={agentPicker !== null} onClick={() => openAgentPicker('agent-only')} aria-label="选择班级 Agent" title="选择班级 Agent"><Sparkles aria-hidden="true" size={17} /><span>@Agent</span></button> : null}
              {attachmentOpen ? <div className={styles.attachmentPanel} aria-label="附件与扩展">
                {ATTACHMENT_ACTIONS.map(({ Icon, label }) => <button type="button" key={label} onClick={() => { setAttachmentOpen(false); setFeedback(`${label}入口为 Placeholder，未访问真实设备或文件服务。`); }}><Icon aria-hidden="true" size={17} /><span>{label}</span></button>)}
                <button type="button" onClick={() => { setAttachmentOpen(false); setFeedback('临时教室入口为 Placeholder，未访问真实设备或文件服务。'); }}><Presentation aria-hidden="true" size={17} /><span>临时教室</span></button>
              </div> : null}
              <button type="button" onClick={sendEmoji} aria-label="发送表情" title="发送表情"><Smile aria-hidden="true" size={18} /></button>
              <button type="button" aria-expanded={attachmentOpen} onClick={() => setAttachmentOpen((value) => !value)} aria-label="添加附件" title="添加附件"><Paperclip aria-hidden="true" size={18} /></button>
            </>}
            value={composer}
          />
        )}
        {visibleFeedback ? <p className={styles.feedback} role="status">{visibleFeedback}</p> : null}
        </section>
        {workBuddyOpen && !detachAssistant ? <WorkBuddyImSidecar onClose={() => closeWorkBuddy(thread)} onInsertDirectReply={(body) => insertWorkBuddyDirectReply(thread, body)} onLocateMessage={locateWorkBuddyMessage} /> : null}
      </div>
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
    if (immersive) {
      const assistantAvailable = selectedThread !== null && isWorkBuddyAvailable(selectedThread);
      return (
        <MessageWorkspaceResizableLayout
          assistant={assistantAvailable && selectedThread ? <WorkBuddyImSidecar onInsertDirectReply={(body) => insertWorkBuddyDirectReply(selectedThread, body)} onLocateMessage={locateWorkBuddyMessage} /> : null}
          scope="messages-class"
        >
          {selectedThread ? renderChat(selectedThread, { detachAssistant: true }) : (
            <div className={styles.contentEmpty}>
              <MessagesSquare aria-hidden="true" size={24} />
              <strong>当前班级暂无可用群聊</strong>
            </div>
          )}
        </MessageWorkspaceResizableLayout>
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

  const renderThreadRow = (thread: MessageThread) => {
    const unread = thread.unreadByRole[role] ?? 0;
    const lastEntry = getLastMessageEntry(thread);
    const preview = lastEntry?.body ?? thread.notice?.body[0] ?? '';
    const directAgent = thread.classAgentBinding?.channel === 'private-direct'
      ? classAgentConversation?.getAgent(thread.classAgentBinding.agentId) ?? null
      : null;
    return (
      <button
        type="button"
        aria-current={selectedId === thread.id ? 'true' : undefined}
        className={styles.threadRow}
        data-agent={directAgent !== null}
        data-highlighted={isHomeArrival && selectedId === thread.id}
        data-thread-id={thread.id}
        data-unread={unread > 0}
        key={thread.id}
        onClick={() => selectThread(thread)}
      >
        <span className={styles.threadAvatar} data-agent={directAgent !== null} data-source={thread.category === 'system' || thread.category === 'official'}>
          {thread.category === 'system' || thread.category === 'official' ? (() => {
            const Icon = CATEGORY_ICONS[thread.category];
            return <Icon aria-hidden="true" size={17} />;
          })() : directAgent ? <Sparkles aria-hidden="true" size={16} /> : thread.avatarByRole[role] ?? '?'}
        </span>
        <span className={styles.threadCopy}>
          <span>
            <strong><span>{getMessageThreadTitle(role, thread)}</span></strong>
            <time>{formatMessageListTime(thread.updatedAt, MESSAGE_NOW)}</time>
          </span>
          <small>{preview}</small>
        </span>
        {unread > 0 ? (category === 'direct' || category === 'class' ? <b>{formatUnreadCount(unread)}</b> : <i />) : null}
      </button>
    );
  };

  const threadPanel = (
    <section className={styles.threadPanel} data-direct={category === 'direct'} aria-label={`${MESSAGE_CATEGORY_LABELS[category]}列表`}>
        <div className={styles.categoryTabs} role="group" aria-label="消息分类">
          {CATEGORY_ORDER.map((item) => {
            const count = unreadCounts[item];
            const dotOnly = item === 'system' || item === 'official';
            return (
              <button
                type="button"
                aria-label={MESSAGE_CATEGORY_LABELS[item]}
                aria-pressed={category === item}
                data-short-label={MESSAGE_CATEGORY_LABELS[item].slice(0, 1)}
                key={item}
                onClick={() => changeCategory(item)}
              >
                <span>{MESSAGE_CATEGORY_LABELS[item]}</span>
                {count > 0 ? (dotOnly ? <i aria-hidden="true" /> : <strong aria-hidden="true">{formatUnreadCount(count)}</strong>) : null}
              </button>
            );
          })}
        </div>
        <div className={styles.searchActions}>
          <label className={styles.searchBox}>
            <Search aria-hidden="true" size={15} />
            <span className={styles.srOnly}>{category === 'direct' ? '搜索私聊和班级 Agent' : '搜索当前分类'}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={category === 'direct' ? '搜索姓名、Agent 或能力' : `搜索${MESSAGE_CATEGORY_LABELS[category]}`} />
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
        {category === 'direct' && directDirectory ? (
          <div className={styles.directScopeBar} aria-label="私聊范围">
            <button type="button" aria-pressed={directScope === 'all'} onClick={() => setDirectScope('all')}>全部</button>
            <button type="button" aria-pressed={directScope === 'agents'} onClick={() => setDirectScope('agents')}>
              <Sparkles aria-hidden="true" size={13} />班级 Agent <strong>{directDirectory.totalAuthorizedAgents}</strong>
            </button>
            <button type="button" aria-pressed={directScope === 'people'} onClick={() => setDirectScope('people')}>
              联系人 <strong>{directDirectory.totalPeople}</strong>
            </button>
            {query ? <span role="status">{directDirectory.resultCount} 个结果</span> : null}
          </div>
        ) : null}
        <div className={styles.threadList} data-thread-list>
          {directDirectory
            ? directDirectory.sections.map((section) => (
              <section className={styles.threadSection} aria-labelledby={`direct-section-${section.id}`} key={section.id}>
                <h3 id={`direct-section-${section.id}`}>{section.label}</h3>
                {section.rows.map(({ thread }) => renderThreadRow(thread))}
              </section>
            ))
            : categoryThreads.map(renderThreadRow)}
          {categoryThreads.length === 0 ? (
            <div className={styles.emptyState}>
              {query ? <Search aria-hidden="true" size={20} /> : <MessagesSquare aria-hidden="true" size={20} />}
              <strong>{query ? '没有匹配的私聊或 Agent' : directScope === 'agents' ? '当前没有可用的班级 Agent' : directScope === 'people' ? '当前没有联系人' : `暂无${MESSAGE_CATEGORY_LABELS[category]}`}</strong>
              {query
                ? <button type="button" onClick={() => setQuery('')}>清除搜索</button>
                : directScope === 'agents'
                  ? <button type="button" onClick={() => setDirectScope('all')}>查看全部私聊</button>
                  : directScope === 'people'
                    ? <button type="button" onClick={() => setDirectScope('all')}>查看全部私聊</button>
                : <span>此分类暂时没有消息</span>}
            </div>
          ) : null}
        </div>
    </section>
  );

  const contentWorkspace = (
    <main className={styles.contentWorkspace}>
        {selectedThread && selectedThread.category === category
          ? (selectedThread.category === 'direct' || selectedThread.category === 'class'
            ? renderChat(selectedThread, { detachAssistant: immersive })
            : renderNotice(selectedThread))
          : (
            <div className={styles.contentEmpty}>
              <MessagesSquare aria-hidden="true" size={24} />
              <strong>{targetThreadId ? '目标消息不可用' : categoryHasThreads ? '选择一条消息' : `暂无${MESSAGE_CATEGORY_LABELS[category]}`}</strong>
              <span role={targetThreadId ? 'status' : undefined}>{targetThreadId ? '目标消息在当前视角不可用' : categoryHasThreads ? '内容会在这里展开' : '此分类暂时没有消息'}</span>
            </div>
          )}
    </main>
  );

  const contactDialog = contactOpen ? (
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
            <input autoFocus value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="搜索姓名、Agent 或能力" />
          </label>
          <div className={styles.contactList}>
            {pendingContactThreadId ? <div className={styles.contactSwitchNotice} role="status">切换后草稿会保留在当前会话；再次选择目标 Agent 以确认。</div> : null}
            {contacts.map((contact, index) => (
              <div className={styles.contactOption} key={contact.id}>
                {(index === 0 || Boolean(contacts[index - 1]?.agentId) !== Boolean(contact.agentId)) ? <span className={styles.contactGroupLabel}>{contact.agentId ? '班级 Agent' : '联系人'}</span> : null}
              <button type="button" onClick={() => openContactThread(contact.targetThreadId)}>
                <span>{contact.agentId ? <Sparkles aria-hidden="true" size={15} /> : contact.name.slice(0, 1)}</span>
                <span><strong>{contact.name}</strong><small>{pendingContactThreadId === contact.targetThreadId ? '再次选择以确认切换' : contact.relationship}</small></span>
                <MessageCircle aria-hidden="true" size={17} />
              </button>
              </div>
            ))}
            {contacts.length === 0 ? <div className={styles.contactEmpty} role="status"><strong>没有匹配的对象</strong><span>请尝试名称、学科或能力关键词</span></div> : null}
          </div>
          </div>
    </dialog>
  ) : null;

  const explanationDialog = (
    <GuidedExplanationPreviewDialog
      content={openExplanation}
      onClose={() => setOpenExplanation(null)}
      returnFocusRef={explanationTriggerRef}
    />
  );

  if (immersive) {
    const assistantAvailable = selectedThread !== null && isWorkBuddyAvailable(selectedThread);
    return (
      <>
        <MessageWorkspaceResizableLayout
          assistant={assistantAvailable ? <WorkBuddyImSidecar onInsertDirectReply={(body) => insertWorkBuddyDirectReply(selectedThread, body)} onLocateMessage={locateWorkBuddyMessage} /> : null}
          scope="messages-global"
          wideNavigation={category === 'direct'}
        >
          {threadPanel}
          {contentWorkspace}
        </MessageWorkspaceResizableLayout>
        {contactDialog}
        {explanationDialog}
      </>
    );
  }

  return (
    <div className={styles.page}>
      {threadPanel}
      {contentWorkspace}
      {contactDialog}
      {explanationDialog}
    </div>
  );
}
