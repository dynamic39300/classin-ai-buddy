import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleEllipsis,
  LoaderCircle,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WORKBUDDY_HISTORY_STATUS_LABELS, type WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './WorkBuddyTaskBar.module.css';

const NEW_TASK_ID = 'new';

const STATUS_ICONS = {
  running: LoaderCircle,
  waiting: CircleEllipsis,
  completed: CheckCircle2,
  failed: CircleAlert,
} as const;

function getActiveTaskId(pathname: string): string | null {
  const runId = pathname.match(/\/runs\/([^/]+)/)?.[1];
  if (runId) return runId;
  return pathname.endsWith('/new') || pathname === '/teacher/ai-agent' ? NEW_TASK_ID : null;
}

function taskRoute(taskId: string) {
  return taskId === NEW_TASK_ID ? '/teacher/ai-agent/new' : `/teacher/ai-agent/runs/${taskId}`;
}

function sortTasks(items: readonly WorkBuddyRunViewModel[]) {
  return [...items].sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)));
}

export function WorkBuddyTaskBar({ contextPanel }: Readonly<{
  contextPanel?: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>;
}>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { runs, renameRun, togglePinRun, removeRun } = useWorkBuddyWorkspace().history;
  const activeTaskId = getActiveTaskId(location.pathname);
  const [openTaskIds, setOpenTaskIds] = useState<readonly string[]>(() => runs.slice(0, 3).map(({ id }) => id));
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameOrigin, setRenameOrigin] = useState<'selector' | 'tab' | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [selectorLeft, setSelectorLeft] = useState<number | null>(null);
  const taskBarRef = useRef<HTMLElement | null>(null);
  const tabViewportRef = useRef<HTMLElement | null>(null);
  const selectorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectorRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const tabRenameTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const contextPanelToggleRef = useRef<HTMLButtonElement | null>(null);
  const previousContextPanelOpen = useRef(contextPanel?.open);

  useEffect(() => {
    if (selectorOpen) searchRef.current?.focus();
  }, [selectorOpen]);

  useLayoutEffect(() => {
    if (!selectorOpen) return;

    const positionSelector = () => {
      const taskBar = taskBarRef.current;
      const tabViewport = tabViewportRef.current;
      const trigger = selectorTriggerRef.current;
      const selector = selectorRef.current;
      if (!taskBar || !tabViewport || !trigger || !selector) return;

      const taskBarBox = taskBar.getBoundingClientRect();
      const triggerBox = trigger.getBoundingClientRect();
      const viewportStyle = getComputedStyle(tabViewport);
      const edgeInset = Number.parseFloat(viewportStyle.paddingLeft) || 0;
      const preferredLeft = triggerBox.left - taskBarBox.left;
      const maximumLeft = Math.max(
        edgeInset,
        taskBarBox.width - selector.offsetWidth - edgeInset,
      );
      const nextLeft = Math.min(
        Math.max(preferredLeft, edgeInset),
        maximumLeft,
      );
      setSelectorLeft((current) => current === nextLeft ? current : nextLeft);
    };

    positionSelector();
    const tabViewport = tabViewportRef.current;
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(positionSelector);
    if (taskBarRef.current) observer?.observe(taskBarRef.current);
    if (selectorTriggerRef.current) observer?.observe(selectorTriggerRef.current);
    if (selectorRef.current) observer?.observe(selectorRef.current);
    tabViewport?.addEventListener('scroll', positionSelector, { passive: true });
    window.addEventListener('resize', positionSelector);
    return () => {
      observer?.disconnect();
      tabViewport?.removeEventListener('scroll', positionSelector);
      window.removeEventListener('resize', positionSelector);
    };
  }, [activeTaskId, selectorOpen]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    if (contextPanel && previousContextPanelOpen.current && !contextPanel.open) {
      requestAnimationFrame(() => contextPanelToggleRef.current?.focus());
    }
    previousContextPanelOpen.current = contextPanel?.open;
  }, [contextPanel]);

  const runById = useMemo(() => new Map(runs.map((run) => [run.id, run])), [runs]);
  const availableOpenTaskIds = openTaskIds.filter((id) => id === NEW_TASK_ID || runById.has(id));
  const visibleOpenTaskIds = activeTaskId && (activeTaskId === NEW_TASK_ID || runById.has(activeTaskId)) && !availableOpenTaskIds.includes(activeTaskId)
    ? [...availableOpenTaskIds, activeTaskId]
    : availableOpenTaskIds;
  const openTabs = visibleOpenTaskIds.flatMap((id) => {
    if (id === NEW_TASK_ID) return [{ id, title: '新建任务' }];
    const run = runById.get(id);
    return run ? [{ id, title: run.title }] : [];
  });
  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return sortTasks(runs).filter(({ title, goal }) => !normalized || `${title} ${goal}`.toLocaleLowerCase().includes(normalized));
  }, [query, runs]);

  const openTask = (taskId: string) => {
    setOpenTaskIds((current) => {
      const preservedActive = activeTaskId && !current.includes(activeTaskId) ? [...current, activeTaskId] : current;
      return preservedActive.includes(taskId) ? preservedActive : [...preservedActive, taskId];
    });
    setSelectorOpen(false);
    setOpenMenuId(null);
    setRenamingId(null);
    setRenameOrigin(null);
    navigate(taskRoute(taskId));
  };

  const switchCurrentTask = (taskId: string) => {
    setOpenTaskIds((current) => {
      const withActive = activeTaskId && !current.includes(activeTaskId) ? [...current, activeTaskId] : [...current];
      if (!activeTaskId || activeTaskId === taskId) return withActive;
      const withoutTarget = withActive.filter((id) => id !== taskId);
      const activeIndex = withoutTarget.indexOf(activeTaskId);
      if (activeIndex < 0) return withoutTarget.includes(taskId) ? withoutTarget : [...withoutTarget, taskId];
      withoutTarget[activeIndex] = taskId;
      return withoutTarget;
    });
    setSelectorOpen(false);
    setOpenMenuId(null);
    setRenamingId(null);
    setRenameOrigin(null);
    navigate(taskRoute(taskId));
  };

  const closeSelector = (restoreFocus = true) => {
    setSelectorOpen(false);
    setOpenMenuId(null);
    setRenamingId(null);
    setRenameOrigin(null);
    if (restoreFocus) requestAnimationFrame(() => selectorTriggerRef.current?.focus());
  };

  const closeTab = (taskId: string) => {
    if (renamingId === taskId) {
      setRenamingId(null);
      setRenameOrigin(null);
    }
    const currentIndex = visibleOpenTaskIds.indexOf(taskId);
    const remaining = visibleOpenTaskIds.filter((id) => id !== taskId);
    setOpenTaskIds(remaining);
    if (activeTaskId !== taskId) return;
    const fallback = remaining[Math.min(currentIndex, remaining.length - 1)];
    if (fallback) navigate(taskRoute(fallback));
    else {
      setOpenTaskIds([NEW_TASK_ID]);
      navigate(taskRoute(NEW_TASK_ID));
    }
  };

  const beginRename = (run: WorkBuddyRunViewModel, origin: 'selector' | 'tab' = 'selector') => {
    setRenameDraft(run.title);
    setRenamingId(run.id);
    setRenameOrigin(origin);
    setOpenMenuId(null);
  };

  const finishRename = (run: WorkBuddyRunViewModel) => {
    const nextTitle = renameDraft.trim();
    if (nextTitle && nextTitle !== run.title) renameRun(run.id, nextTitle);
    const restoreTabId = renameOrigin === 'tab' ? run.id : null;
    setRenamingId(null);
    setRenameOrigin(null);
    if (restoreTabId) requestAnimationFrame(() => tabRenameTriggerRefs.current.get(restoreTabId)?.focus());
  };

  const cancelRename = () => {
    const restoreTabId = renameOrigin === 'tab' ? renamingId : null;
    setRenamingId(null);
    setRenameOrigin(null);
    if (restoreTabId) requestAnimationFrame(() => tabRenameTriggerRefs.current.get(restoreTabId)?.focus());
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, run: WorkBuddyRunViewModel) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRename(run);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  return (
    <header ref={taskBarRef} className={styles.taskBar} aria-label="Work Buddy 任务导航">
      <nav ref={tabViewportRef} className={styles.tabViewport} aria-label="已打开的 Work Buddy 任务">
        {openTabs.map((tab) => {
          const active = tab.id === activeTaskId;
          const run = tab.id === NEW_TASK_ID ? undefined : runById.get(tab.id);
          const renamingInTab = Boolean(run && renamingId === run.id && renameOrigin === 'tab');
          return (
            <div className={styles.tabShell} data-active={active} data-renaming={renamingInTab || undefined} key={tab.id}>
              {renamingInTab && run ? (
                <input
                  ref={renameInputRef}
                  className={styles.tabRenameInput}
                  aria-label={`重命名任务：${run.title}`}
                  value={renameDraft}
                  maxLength={80}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={() => finishRename(run)}
                  onKeyDown={(event) => handleRenameKeyDown(event, run)}
                />
              ) : (
                <button
                  className={styles.tab}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={active ? selectorOpen : undefined}
                  aria-haspopup={active ? 'dialog' : undefined}
                  title={tab.title}
                  ref={active ? selectorTriggerRef : undefined}
                  onClick={() => {
                    if (active) setSelectorOpen((current) => !current);
                    else openTask(tab.id);
                  }}
                >
                  <span>{tab.title}</span>
                  {active ? <ChevronDown className={styles.tabChevron} aria-hidden="true" size={14} /> : null}
                </button>
              )}
              <div className={styles.tabActions}>
                {run && !renamingInTab ? (
                  <button
                    ref={(element) => {
                      if (element) tabRenameTriggerRefs.current.set(run.id, element);
                      else tabRenameTriggerRefs.current.delete(run.id);
                    }}
                    className={styles.renameTab}
                    type="button"
                    aria-label={`重命名任务：${run.title}`}
                    title="编辑标题"
                    onClick={() => beginRename(run, 'tab')}
                  >
                    <Pencil aria-hidden="true" size={13} />
                  </button>
                ) : null}
                <button className={styles.closeTab} type="button" aria-label={`关闭任务：${tab.title}`} title="关闭标签" onClick={() => closeTab(tab.id)}>
                  <X aria-hidden="true" size={13} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          className={styles.newTaskButton}
          type="button"
          aria-label="添加新任务"
          title="新建任务"
          onClick={() => openTask(NEW_TASK_ID)}
        >
          <Plus aria-hidden="true" size={17} />
        </button>
      </nav>
      {contextPanel ? (
        <div className={styles.taskBarActions}>
          <button
            ref={contextPanelToggleRef}
            className={styles.contextPanelToggle}
            type="button"
            aria-label={contextPanel.open ? '收起核心上下文' : '展开核心上下文'}
            aria-controls="workbuddy-core-context-panel"
            aria-expanded={contextPanel.open}
            title={contextPanel.open ? '收起核心上下文' : '展开核心上下文'}
            data-active={contextPanel.open || undefined}
            onClick={() => contextPanel.onOpenChange(!contextPanel.open)}
          >
            <PanelRight aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}

      {selectorOpen ? (
        <>
          <button className={styles.scrim} type="button" aria-label="关闭全部任务选择器" onClick={() => closeSelector()} />
          <section ref={selectorRef} className={styles.selector} style={selectorLeft === null ? undefined : { left: selectorLeft }} role="dialog" aria-label="全部任务选择器" onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              if (openMenuId) setOpenMenuId(null);
              else closeSelector();
            }
          }}>
            <div className={styles.searchField}>
              <Search aria-hidden="true" size={15} />
              <input ref={searchRef} aria-label="搜索全部任务" placeholder="搜索任务" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <button className={styles.selectorNewTask} type="button" onClick={() => switchCurrentTask(NEW_TASK_ID)}>
              <Plus aria-hidden="true" size={16} />
              <span>新建任务</span>
            </button>
            <div className={styles.selectorHeading}>
              <span>全部任务</span>
              <span>{visibleTasks.length}</span>
            </div>
            <div className={styles.taskList} role="list" aria-label="全部任务列表">
              {visibleTasks.map((run) => {
                const StatusIcon = STATUS_ICONS[run.runState.status];
                const opened = visibleOpenTaskIds.includes(run.id);
                return (
                  <div className={styles.taskRow} data-current={activeTaskId === run.id} key={run.id} role="listitem">
                    {renamingId === run.id ? (
                      <input
                        ref={renameInputRef}
                        className={styles.renameInput}
                        aria-label="重命名任务"
                        value={renameDraft}
                        maxLength={80}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={() => finishRename(run)}
                        onKeyDown={(event) => handleRenameKeyDown(event, run)}
                      />
                    ) : (
                      <button className={styles.taskChoice} type="button" onClick={() => switchCurrentTask(run.id)} title={run.title}>
                        <StatusIcon className={styles.statusIcon} data-status={run.runState.status} aria-label={WORKBUDDY_HISTORY_STATUS_LABELS[run.runState.status]} size={14} />
                        <span className={styles.taskTitle}>{run.title}</span>
                        {opened ? <span className={styles.openedLabel}>已打开</span> : null}
                        <span className={styles.taskTime}>{run.relativeTime}</span>
                      </button>
                    )}
                    <button className={styles.moreButton} type="button" aria-label={`${run.title}更多操作`} aria-expanded={openMenuId === run.id} onClick={() => setOpenMenuId((current) => current === run.id ? null : run.id)}>
                      <MoreHorizontal aria-hidden="true" size={15} />
                    </button>
                    {openMenuId === run.id ? (
                      <div className={styles.taskMenu} role="menu">
                        <button type="button" role="menuitem" onClick={() => beginRename(run)}>重命名</button>
                        <button type="button" role="menuitem" onClick={() => { togglePinRun(run.id); setOpenMenuId(null); }}>{run.pinned ? '取消置顶' : '置顶'}</button>
                        <button type="button" role="menuitem" onClick={() => {
                          removeRun(run.id);
                          setOpenMenuId(null);
                          closeTab(run.id);
                        }}>删除</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {visibleTasks.length === 0 ? <p className={styles.empty}>没有匹配的任务</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </header>
  );
}
