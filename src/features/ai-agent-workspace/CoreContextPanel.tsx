import { Check, ChevronDown, ChevronRight, Database, RotateCcw, Search, X } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CORE_CONTEXT_SECTIONS, type CoreContextSection } from '@domain/workbuddy/core-context';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './CoreContextPanel.module.css';

const SECTION_LABELS: Record<CoreContextSection, string> = {
  actor_organization: '教师与组织',
  teaching_scope: '教学范围',
  learner_scope: '学习者范围',
  time_schedule: '时间与日程',
  resources_input: '资源与教师输入',
  teaching_evidence: '教学证据',
  domain_knowledge: 'Domain Knowledge',
};

type ContextInspectorState = Readonly<{ expandedIds: readonly string[] | null; query: string; scrollTop: number }>;
type ContextInspectorPatch = Readonly<{ expandedIds?: readonly string[]; query?: string; scrollTop?: number }>;

export function CoreContextPanel({ id, hidden, onClose, readOnly = false, mode = 'draft', inspectorState, onInspectorStateChange }: {
  id?: string;
  hidden?: boolean;
  onClose: () => void;
  readOnly?: boolean;
  mode?: 'draft' | 'courseware';
  inspectorState?: ContextInspectorState;
  onInspectorStateChange?: (patch: ContextInspectorPatch) => void;
}) {
  const {
    contextView,
    coursewareContextView,
    applyRecommendedContext,
    toggleCoreContextItem,
    confirmCoreContext,
    resetCoreContext,
  } = useWorkBuddyWorkspace().context;
  const view = mode === 'courseware' ? coursewareContextView ?? contextView : contextView;
  const status = view.status === 'confirmed' ? '上下文已冻结' : view.status === 'ready_to_confirm' ? '可以确认上下文' : '需要补充教学范围';
  const parentIds = useMemo(() => new Set(view.items.flatMap((item) => item.parentId ? [item.parentId] : [])), [view.items]);
  const [localExpandedIds, setLocalExpandedIds] = useState<ReadonlySet<string>>(() => parentIds);
  const [localQuery, setLocalQuery] = useState('');
  const [activeTreeItemId, setActiveTreeItemId] = useState(view.items[0]?.id ?? '');
  const bodyRef = useRef<HTMLDivElement>(null);
  const expandedIds = inspectorState?.expandedIds === null
    ? parentIds
    : inspectorState?.expandedIds ? new Set(inspectorState.expandedIds) : localExpandedIds;
  const query = inspectorState?.query ?? localQuery;
  const byId = useMemo(() => new Map(view.items.map((item) => [item.id, item])), [view.items]);
  const isVisible = (item: (typeof view.items)[number]) => {
    if (query.trim()) return item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    let parentId = item.parentId;
    while (parentId) {
      if (!expandedIds.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  };
  const itemLevel = (item: (typeof view.items)[number]) => {
    let level = 1;
    let parentId = item.parentId;
    while (parentId) { level += 1; parentId = byId.get(parentId)?.parentId; }
    return level;
  };
  const visibleItems = view.items.filter(isVisible);
  const effectiveActiveTreeItemId = visibleItems.some(({ id }) => id === activeTreeItemId)
    ? activeTreeItemId
    : visibleItems[0]?.id ?? '';
  const updateExpandedIds = (next: ReadonlySet<string>) => {
    if (onInspectorStateChange) onInspectorStateChange({ expandedIds: [...next] });
    else setLocalExpandedIds(next);
  };
  const focusTreeItem = (itemId: string) => {
    setActiveTreeItemId(itemId);
    document.getElementById(`context-treeitem-${itemId}`)?.focus();
  };
  const handleTreeKey = (event: KeyboardEvent<HTMLElement>, item: (typeof view.items)[number]) => {
    if (event.target !== event.currentTarget) return;
    const index = visibleItems.findIndex(({ id }) => id === item.id);
    const hasChildren = parentIds.has(item.id);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (hasChildren && !expandedIds.has(item.id)) updateExpandedIds(new Set(expandedIds).add(item.id));
      else if (hasChildren) {
        const child = visibleItems.find(({ parentId }) => parentId === item.id);
        if (child) focusTreeItem(child.id);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (hasChildren && expandedIds.has(item.id)) {
        const next = new Set(expandedIds); next.delete(item.id); updateExpandedIds(next);
      } else if (item.parentId) focusTreeItem(item.parentId);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const targetIndex = event.key === 'ArrowDown' ? Math.min(visibleItems.length - 1, index + 1)
        : event.key === 'ArrowUp' ? Math.max(0, index - 1)
          : event.key === 'Home' ? 0 : visibleItems.length - 1;
      const target = visibleItems[targetIndex];
      if (target) focusTreeItem(target.id);
    } else if (event.key === ' ' && !readOnly && !item.locked && (item.selectable || item.included)) {
      event.preventDefault();
      toggleCoreContextItem(item.id);
    }
  };

  const persistedScrollTop = inspectorState?.scrollTop;
  useLayoutEffect(() => {
    if (bodyRef.current && persistedScrollTop !== undefined) bodyRef.current.scrollTop = persistedScrollTop;
  }, [persistedScrollTop]);

  return (
    <aside id={id} hidden={hidden} className={styles.panel} aria-label="核心上下文" onKeyDown={(event) => {
      if (event.key === 'Escape') onClose();
    }}>
      <header className={styles.header}>
        <div>
          <strong>核心上下文 · {view.includedCount}</strong>
          <span>本次任务快照</span>
        </div>
        <button type="button" aria-label="关闭核心上下文" onClick={onClose}><X aria-hidden="true" size={16} /></button>
      </header>

      <div className={styles.body} ref={bodyRef} onScroll={(event) => onInspectorStateChange?.({ scrollTop: event.currentTarget.scrollTop })}>
        <div className={styles.statusCard} data-ready={view.status === 'ready_to_confirm'}>
          <span>{status}</span>
          <small>{view.snapshotVersion ? '已确认版本' : '选择教学对象后确认'}</small>
        </div>

        {!readOnly ? <button className={styles.recommendation} type="button" onClick={applyRecommendedContext}>
          <Database aria-hidden="true" size={16} />
          <span><strong>应用函数单调性课程建议</strong><small>高一（3）班 · 高中数学 · 函数的性质</small></span>
        </button> : null}

        <label className={styles.search}><Search aria-hidden="true" size={14} /><span className={styles.srOnly}>搜索上下文</span><input aria-label="搜索上下文" value={query} placeholder="搜索班级、课程、单元或资源" onChange={(event) => onInspectorStateChange ? onInspectorStateChange({ query: event.target.value }) : setLocalQuery(event.target.value)} /></label>

        <div role="tree" aria-label="教学上下文对象">
        {CORE_CONTEXT_SECTIONS.map((section) => (
          <section className={styles.contextSection} role="group" aria-label={SECTION_LABELS[section]} key={section}>
            <div className={styles.itemList} role="presentation">
              {view.items.filter((item) => item.section === section && isVisible(item)).map((item) => (
                  <article id={`context-treeitem-${item.id}`} className={styles.contextItem} role="treeitem" aria-level={itemLevel(item)} aria-expanded={parentIds.has(item.id) ? expandedIds.has(item.id) : undefined} aria-selected={item.included} tabIndex={effectiveActiveTreeItemId === item.id ? 0 : -1} onFocus={() => setActiveTreeItemId(item.id)} onKeyDown={(event) => handleTreeKey(event, item)} data-included={item.included} style={{ '--context-depth': itemLevel(item) - 1 } as CSSProperties} key={item.id}>
                    {parentIds.has(item.id) ? <button className={styles.expandButton} type="button" tabIndex={-1} aria-label={`${expandedIds.has(item.id) ? '收起' : '展开'}${item.label}`} onClick={() => {
                      const next = new Set(expandedIds);
                      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                      updateExpandedIds(next);
                    }}>{expandedIds.has(item.id) ? <ChevronDown aria-hidden="true" size={13} /> : <ChevronRight aria-hidden="true" size={13} />}</button> : <span className={styles.depthSpacer} />}
                    <span className={styles.itemState} role="img" aria-label={item.included ? '已纳入' : '建议项'}>{item.included ? <Check aria-hidden="true" size={13} /> : <span aria-hidden="true" />}</span>
                    <div>
                      <strong>{item.label}</strong>
                    </div>
                    {!readOnly && !item.locked ? <button type="button" tabIndex={-1} disabled={!item.selectable && !item.included} onClick={() => toggleCoreContextItem(item.id)}>{item.included ? '排除' : '选择'}</button> : null}
                  </article>
              ))}
            </div>
          </section>
        ))}
        </div>

        <p className={styles.sensitiveNote}>学生姓名默认不进入普通课程生产任务；每项能力只取得完成当前步骤所需的最小上下文。</p>
      </div>

      {!readOnly ? <footer className={styles.footer}>
        <button type="button" onClick={resetCoreContext}><RotateCcw aria-hidden="true" size={14} />重新选择</button>
        <button className={styles.confirmButton} type="button" disabled={view.status !== 'ready_to_confirm'} onClick={confirmCoreContext}>确认上下文版本</button>
      </footer> : null}
    </aside>
  );
}
