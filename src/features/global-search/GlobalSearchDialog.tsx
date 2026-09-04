import {
  ChevronRight,
  MessageSquareText,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import type { AppRole } from '@domain/account/role';
import { resolveProductTarget } from '@domain/navigation/product-target';
import {
  searchDocuments,
  type SearchCategory,
  type SearchDocument,
  type SearchDocumentType,
} from '@domain/search/search';
import styles from './GlobalSearchDialog.module.css';

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  all: '全部',
  class: '班级',
  'open-course': '公开课',
  task: '任务/待办',
  schedule: '日程',
  message: '消息',
};

const RESULT_LABELS: Record<SearchDocumentType, string> = {
  class: '班级',
  'open-course': '公开课',
  task: '任务/待办',
  schedule: '日程',
  message: '消息',
};

type GlobalSearchDialogProps = {
  role: AppRole;
  open: boolean;
  documents: ReadonlyArray<SearchDocument>;
  onClose: () => void;
};

export function GlobalSearchDialog({ role, open, documents, onClose }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const results = useMemo(
    () => searchDocuments(documents, query, category, query ? 30 : 8),
    [category, documents, query],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  const close = () => {
    setQuery('');
    setCategory('all');
    onClose();
  };

  const openResult = (document: SearchDocument) => {
    const destination = resolveProductTarget(role, document.target);
    if (!destination) return;
    close();
    navigate(destination);
  };

  if (!open) return null;

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="global-search-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.currentTarget === event.target) close(); }}
    >
      <div className={styles.surface}>
        <header className={styles.searchHeader}>
          <Search aria-hidden="true" size={19} />
          <label>
            <span className={styles.srOnly} id="global-search-title">全局搜索</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索班级、公开课、任务、日程或消息"
            />
          </label>
          <button type="button" onClick={close} aria-label="关闭全局搜索" title="关闭">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.categories} role="tablist" aria-label="搜索分类">
          {(Object.keys(CATEGORY_LABELS) as SearchCategory[]).map((value) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === value}
              key={value}
              onClick={() => setCategory(value)}
            >
              {CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>

        <section className={styles.results} aria-live="polite" aria-label="搜索结果">
          <div className={styles.resultSummary}>
            <span>{query ? `“${query}”` : '建议结果'}</span>
            <strong>{results.length} 项</strong>
          </div>
          {results.map((document) => {
            return (
              <button className={styles.result} type="button" key={document.id} onClick={() => openResult(document)}>
                <span className={styles.resultIcon}>{document.teachingObjectKind
                  ? <TeachingObjectIcon kind={document.teachingObjectKind} size={17} />
                  : <MessageSquareText aria-hidden="true" size={17} />}</span>
                <span className={styles.resultCopy}>
                  <span><strong>{document.title}</strong><small>{RESULT_LABELS[document.type]}</small></span>
                  <span>{document.context}</span>
                </span>
                <ChevronRight aria-hidden="true" size={16} />
              </button>
            );
          })}
          {results.length === 0 ? (
            <div className={styles.empty}>
              <Search aria-hidden="true" size={22} />
              <strong>没有匹配结果</strong>
              <span>调整关键词或切换搜索分类</span>
              <button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>清除搜索</button>
            </div>
          ) : null}
        </section>
      </div>
    </dialog>
  );
}
