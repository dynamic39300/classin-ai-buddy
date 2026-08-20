import { Bot, CheckCircle2, CircleAlert, CircleEllipsis, LoaderCircle, MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { WORKBUDDY_HISTORY_STATUS_LABELS, type WorkBuddyRunViewModel } from '@contracts/workbuddy/workspace';
import { WORKBUDDY_CAPABILITIES } from './capability-registry';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './AgentSecondaryNav.module.css';

function sortHistory(items: readonly WorkBuddyRunViewModel[]) {
  return [...items].sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)));
}

const STATUS_ICONS = {
  running: LoaderCircle,
  waiting: CircleEllipsis,
  completed: CheckCircle2,
  failed: CircleAlert,
} as const;

export function AgentSecondaryNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { runs, renameRun, togglePinRun, removeRun } = useWorkBuddyWorkspace();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const moreButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeRunId = location.pathname.match(/\/runs\/([^/]+)/)?.[1];
  const visibleHistory = useMemo(() => sortHistory(runs), [runs]);

  useEffect(() => {
    if (openMenuId) firstMenuItemRef.current?.focus();
  }, [openMenuId]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  const closeMenuAndRestoreFocus = (runId: string) => {
    setOpenMenuId(null);
    requestAnimationFrame(() => moreButtonRefs.current.get(runId)?.focus());
  };

  const beginRename = (item: WorkBuddyRunViewModel) => {
    setRenameDraft(item.title);
    setRenamingId(item.id);
    setOpenMenuId(null);
  };

  const finishRename = (item: WorkBuddyRunViewModel, restoreFocus = false) => {
    const nextTitle = renameDraft.trim();
    if (nextTitle && nextTitle !== item.title) {
      renameRun(item.id, nextTitle);
      setFeedback('任务已在当前原型会话中重命名。');
    }
    setRenamingId(null);
    if (restoreFocus) requestAnimationFrame(() => moreButtonRefs.current.get(item.id)?.focus());
  };

  const cancelRename = (runId: string) => {
    setRenamingId(null);
    requestAnimationFrame(() => moreButtonRefs.current.get(runId)?.focus());
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>, item: WorkBuddyRunViewModel) => {
    if (event.key === 'Enter') finishRename(item, true);
    if (event.key === 'Escape') cancelRename(item.id);
  };

  const togglePin = (runId: string) => {
    togglePinRun(runId);
    setFeedback('任务置顶状态已在当前原型会话中更新。');
    closeMenuAndRestoreFocus(runId);
  };

  const remove = (runId: string) => {
    removeRun(runId);
    setFeedback('任务已从当前原型会话的历史中移除。');
    setOpenMenuId(null);
    if (activeRunId === runId) navigate('/teacher/ai-agent/new');
  };

  const resourceCapabilities = WORKBUDDY_CAPABILITIES.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = WORKBUDDY_CAPABILITIES.filter(({ placement }) => placement === 'system');

  return (
    <aside className={styles.panel} aria-label="AI Agent 二级导航">
      <div className={styles.panelHeader}>
        <span className={styles.agentMark}><Bot aria-hidden="true" size={16} /></span>
        <strong>AI Agent</strong>
        <span className={styles.prototypeTag}>本地 Demo</span>
      </div>

      <NavLink className={styles.newTask} to="/teacher/ai-agent/new"><Plus aria-hidden="true" size={16} />新建任务</NavLink>

      <section className={styles.historySection} aria-labelledby="agent-history-title">
        <div className={styles.sectionHeading}>
          <span id="agent-history-title">近期任务</span>
          <span className={styles.headingActions}>
            <button type="button" aria-label="搜索任务" onClick={() => setFeedback('任务搜索将在 Phase 4 接入。')}><Search aria-hidden="true" size={14} /></button>
            <button type="button" onClick={() => setFeedback('当前已显示全部本地任务。')}>全部</button>
          </span>
        </div>
        <div className={styles.historyList} role="list" aria-label="近期任务列表">
          {visibleHistory.map((item) => {
            const StatusIcon = STATUS_ICONS[item.runState.status];
            return (
            <div className={styles.historyRow} data-active={activeRunId === item.id} key={item.id} role="listitem">
              {renamingId === item.id ? (
                <input ref={renameInputRef} className={styles.renameInput} aria-label="重命名任务" value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => finishRename(item)} onKeyDown={(event) => handleRenameKeyDown(event, item)} />
              ) : (
                <NavLink className={styles.historyLink} to={`/teacher/ai-agent/runs/${item.id}`} title={item.title}>
                  <span className={styles.historyTitle}>{item.title}</span>
                  <span className={styles.historyMeta}>
                    <StatusIcon className={styles.statusIcon} data-status={item.runState.status} aria-label={WORKBUDDY_HISTORY_STATUS_LABELS[item.runState.status]} size={12} />
                    <span className={styles.historyTime}>{item.relativeTime}</span>
                  </span>
                </NavLink>
              )}
              <button ref={(element) => { if (element) moreButtonRefs.current.set(item.id, element); else moreButtonRefs.current.delete(item.id); }} className={styles.moreButton} type="button" aria-label={`${item.title}更多操作`} aria-expanded={openMenuId === item.id} onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)}>
                <MoreHorizontal aria-hidden="true" size={15} />
              </button>
              {openMenuId === item.id ? (
                <div className={styles.historyMenu} role="menu" onKeyDown={(event) => {
                  if (event.key === 'Escape') { event.preventDefault(); closeMenuAndRestoreFocus(item.id); }
                }}>
                  <button ref={firstMenuItemRef} type="button" role="menuitem" onClick={() => beginRename(item)}>重命名</button>
                  <button type="button" role="menuitem" onClick={() => togglePin(item.id)}>{item.pinned ? '取消置顶' : '置顶'}</button>
                  <button type="button" role="menuitem" onClick={() => remove(item.id)}>删除</button>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      </section>

      <section className={styles.capabilitySection} aria-labelledby="agent-capability-title">
        <div className={styles.sectionHeading} id="agent-capability-title">能力与资源</div>
        <nav className={styles.flatLinks} aria-label="AI Agent 能力与资源">
          {resourceCapabilities.map(({ id, label, icon: Icon }) => <NavLink key={id} to={`/teacher/ai-agent/${id}`}><Icon aria-hidden="true" size={16} /><span>{label}</span></NavLink>)}
        </nav>
      </section>

      <nav className={styles.bottomLinks} aria-label="AI Agent 自动化与设置">
        {systemCapabilities.map(({ id, label, icon: Icon }) => <NavLink key={id} to={`/teacher/ai-agent/${id}`}><Icon aria-hidden="true" size={16} /><span>{label}</span></NavLink>)}
      </nav>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : <span className={styles.feedback} aria-hidden="true" />}
    </aside>
  );
}
