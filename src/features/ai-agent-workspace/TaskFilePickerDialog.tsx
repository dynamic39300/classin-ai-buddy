import { FileText, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TaskFileCatalogSource, TaskMaterialCatalogPort } from '@contracts/workbuddy/task-material-source';
import { taskMaterialKey, type TaskFileReference } from '@domain/workbuddy/task-assembly';
import { WorkBuddyModalDialog } from './WorkBuddyModalDialog';
import styles from './TaskFilePickerDialog.module.css';

type TaskFilePickerDialogProps = Readonly<{
  source: TaskFileCatalogSource;
  port: TaskMaterialCatalogPort;
  selectedKeys: ReadonlySet<string>;
  onAdd: (files: readonly TaskFileReference[]) => void;
  onClose: () => void;
}>;

const SOURCE_COPY = Object.freeze({
  'my-files': Object.freeze({ title: '从我的文件添加', subtitle: '选择要作为本次任务材料的文件。' }),
  'classin-space': Object.freeze({ title: '从 ClassIn 空间添加', subtitle: '选择已授权空间中的教学资料。' }),
});

function formatSize(sizeBytes: number | null): string {
  if (sizeBytes === null) return '大小未知';
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TaskFilePickerDialog({ source, port, selectedKeys, onAdd, onClose }: TaskFilePickerDialogProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<Readonly<{
    query: string;
    result: Awaited<ReturnType<TaskMaterialCatalogPort['list']>>;
  }> | null>(null);
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const copy = SOURCE_COPY[source];
  const titleId = `task-file-picker-${source}-title`;

  useEffect(() => {
    let active = true;
    port.list({ source, query }).then((next) => { if (active) setResponse({ query, result: next }); });
    return () => { active = false; };
  }, [port, query, source]);

  const result = response?.query === query ? response.result : null;
  const items = result?.outcome === 'loaded' ? result.items : [];
  const pendingFiles = items.filter((item) => pendingKeys.has(taskMaterialKey(item)));

  return (
    <WorkBuddyModalDialog className={styles.dialog} labelledBy={titleId} onClose={onClose}>
      <section className={styles.panel}>
        <header>
          <div><h2 id={titleId}>{copy.title}</h2><p>{copy.subtitle}</p></div>
          <button type="button" aria-label="关闭文件选择" onClick={onClose}><X aria-hidden="true" size={18} /></button>
        </header>
        <label className={styles.search}>
          <Search aria-hidden="true" size={16} />
          <input autoFocus aria-label={`搜索${source === 'my-files' ? '我的文件' : 'ClassIn 空间'}`} placeholder="搜索文件名或位置" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className={styles.list} aria-busy={!result}>
          {!result ? <p className={styles.state}>正在加载文件…</p> : null}
          {result?.outcome === 'permission_denied' ? <div className={styles.state} role="alert"><strong>无法访问此文件来源</strong><span>{result.message}</span></div> : null}
          {result?.outcome === 'recoverable_failure' ? <div className={styles.state} role="alert"><strong>文件加载失败</strong><span>{result.message}</span><button type="button" onClick={() => { setResponse(null); port.list({ source, query }).then((next) => setResponse({ query, result: next })); }}>重试</button></div> : null}
          {result?.outcome === 'loaded' && !items.length ? <p className={styles.state}>没有匹配的文件</p> : null}
          {items.map((file) => {
            const key = taskMaterialKey(file);
            const alreadySelected = selectedKeys.has(key);
            const checked = alreadySelected || pendingKeys.has(key);
            return (
              <label className={styles.fileRow} data-disabled={alreadySelected} key={key}>
                <input
                  checked={checked}
                  disabled={alreadySelected}
                  type="checkbox"
                  onChange={(event) => setPendingKeys((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(key); else next.delete(key);
                    return next;
                  })}
                />
                <span className={styles.fileIcon}><FileText aria-hidden="true" size={18} /></span>
                <span className={styles.fileCopy}><strong>{file.title}</strong><small>{file.locationLabel}</small></span>
                <span className={styles.fileMeta}><small>{formatSize(file.sizeBytes)}</small><small>{alreadySelected ? '已添加' : file.version ?? '本地版本'}</small></span>
              </label>
            );
          })}
        </div>
        <footer>
          <span>已选择 {pendingFiles.length} 项</span>
          <div><button type="button" onClick={onClose}>取消</button><button className={styles.primary} type="button" disabled={!pendingFiles.length} onClick={() => { onAdd(pendingFiles); onClose(); }}>添加到任务</button></div>
        </footer>
      </section>
    </WorkBuddyModalDialog>
  );
}
