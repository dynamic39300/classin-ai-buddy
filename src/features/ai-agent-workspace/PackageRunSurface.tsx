import { Boxes, CheckCircle2, CircleAlert, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import { CoreContextPanel } from './CoreContextPanel';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './PackageRunSurface.module.css';

const STATE_LABELS = {
  planned: '计划中', generating: '生成中', ready: '可复查', failed: '生成失败', excluded: '已排除', approved: '已批准', written_back: '已写回',
} as const;
const RESULT_LABELS = { succeeded: 'succeeded', failed: 'failed', not_executed: 'not_executed', waiting: 'waiting' } as const;

export function PackageRunSurface() {
  const {
    packageView, generatePackage, setPackageItemIncluded, proposePackageSave, approvePackageSave, rejectPackageSave,
    executeApprovedPackageSave, retryPackageItem, packageWritebackScenario, setPackageWritebackScenario,
    activePackagePanel: panel, setActivePackagePanel: setPanel,
  } = useWorkBuddyWorkspace();
  const lastPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const navigatorPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const generatePackageTriggerRef = useRef<HTMLButtonElement | null>(null);
  if (!packageView) return null;
  const { run, action, receipt, contextConfirmed } = packageView;
  const openPanel = (next: Parameters<typeof setPanel>[0], trigger: HTMLButtonElement) => {
    lastPanelTriggerRef.current = trigger;
    setPanel(next);
  };
  const closePanel = () => {
    setPanel('none');
    requestAnimationFrame(() => {
      const trigger = lastPanelTriggerRef.current?.isConnected
        ? lastPanelTriggerRef.current
        : navigatorPanelTriggerRef.current ?? generatePackageTriggerRef.current;
      trigger?.focus();
    });
  };

  return <section className={styles.page} data-panel-open={panel !== 'none'} aria-labelledby="package-run-title">
    <section className={styles.main}>
      <header>
        <div><h1 id="package-run-title">{run.title}</h1><span>{run.stage === 'awaiting_context' ? '待确认 Context' : run.stage === 'configuring' ? '确认范围' : run.stage === 'partial_success' ? '部分成功' : run.stage === 'completed' ? '已完成' : '完成待复查'} · 固定 Mock</span></div>
        {run.stage !== 'awaiting_context' && run.stage !== 'configuring' ? <button ref={navigatorPanelTriggerRef} type="button" onClick={(event) => openPanel('navigator', event.currentTarget)}>方案包导航</button> : null}
      </header>
      <div className={styles.content}>
        <section className={styles.goal}>
          <span>课程目标</span><p>{run.goal}</p><small>独立 Task Type · course-package · {run.contextSnapshotId ?? '等待独立 ContextSnapshot'}</small>
          {run.sourceArtifactRef ? <div className={styles.sourceRefs}><span>parentRunRef · {run.parentRunRef}</span><span>sourceArtifactRef · {run.sourceArtifactRef.id} · {run.sourceArtifactRef.version}</span><Link to={`/teacher/ai-agent/runs/${run.parentRunRef}`}>返回源课件 Run</Link></div> : null}
        </section>

        {run.stage === 'awaiting_context' ? <section className={styles.configure}>
          <Boxes aria-hidden="true" size={22} /><div><h2>确认派生任务的独立 Core Context</h2><p>已显式带入源课件引用与建议的班级、课程、单元；学习者范围、课堂时间和教学证据未继承。请重新确认后再生成。</p><button type="button" onClick={(event) => openPanel('core_context', event.currentTarget)}>检查并确认 Core Context</button></div>
        </section> : null}

        {run.stage === 'configuring' ? <section className={styles.configure}>
          <Boxes aria-hidden="true" size={22} /><div><h2>确认课程方案包范围</h2><p>{run.sourceArtifactRef ? '独立 ContextSnapshot 已确认；源课件只作为显式 sourceArtifactRef。' : '四类课程对象共享课程目标，但保持独立产物状态和写回结果。'}</p><ul>{run.artifacts.map((item) => <li key={item.id}><CheckCircle2 aria-hidden="true" size={15} /><span><strong>{item.title}</strong><small>{item.kind} · {item.dependsOn.length ? `依赖 ${item.dependsOn.join(', ')}` : '根产物'}</small></span></li>)}</ul><button ref={generatePackageTriggerRef} type="button" disabled={!contextConfirmed} onClick={(event) => { generatePackage(); openPanel('navigator', event.currentTarget); }}>确认产物清单并生成</button></div>
        </section> : null}

        {!['awaiting_context', 'configuring'].includes(run.stage) ? <section className={styles.graph}><h2>Artifact Graph</h2><p>课件是根产物；作业、测验和录播脚本引用课件结构。单项失败不会抹掉其他产物。</p>{run.artifacts.map((item) => <article data-state={item.state} key={item.id}><span>{item.state === 'failed' ? <CircleAlert aria-hidden="true" size={16} /> : <FileText aria-hidden="true" size={16} />}</span><div><strong>{item.title}</strong><p>{item.kind} · {item.version} · {STATE_LABELS[item.state]}</p></div>{item.dependsOn.length ? <code>← {item.dependsOn[0]}</code> : <code>root</code>}</article>)}</section> : null}
      </div>
    </section>

    {panel === 'core_context' ? <CoreContextPanel onClose={closePanel} /> : null}

    {panel === 'navigator' ? <aside className={styles.panel} aria-label="课程方案包导航">
      <header><strong>Package Navigator</strong><button type="button" onClick={closePanel}>关闭</button></header>
      <div className={styles.panelBody}>{run.artifacts.map((item) => <button className={styles.artifactRow} type="button" key={item.id}><span>{item.title}</span><small>{STATE_LABELS[item.state]}</small></button>)}<p>固定 Mock Artifact Graph · 每个产物独立复查和写回。</p><label>Mock 写回场景<select aria-label="课程方案包 Mock 写回场景" value={packageWritebackScenario} onChange={(event) => setPackageWritebackScenario(event.target.value as PackageWritebackScenario)}><option value="partial_success">部分成功</option><option value="success">全部成功</option><option value="permission_denied">权限拒绝</option><option value="version_conflict">版本冲突</option><option value="recoverable_failure">临时失败</option><option value="timeout">超时</option></select></label></div>
      <footer>{run.artifacts.some(({ state }) => state === 'failed') ? <button type="button" onClick={() => retryPackageItem('package-recording')}><RefreshCw aria-hidden="true" size={14} />重试失败项</button> : null}<button className={styles.primary} type="button" onClick={() => { proposePackageSave(); setPanel('approval'); }}>生成批量写回提案</button></footer>
    </aside> : null}

    {panel === 'approval' && action ? <aside className={styles.panel} aria-label="课程方案包审批">
      <header><div><ShieldCheck aria-hidden="true" size={16} /><strong>课程方案包审批</strong></div><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header>
      <div className={styles.panelBody}>
        <span>ProposedAction · {action.id}</span><p>目标：{action.target.label}</p><p>{action.difference}</p>
        {run.artifacts.map((item) => <label className={styles.approvalItem} key={item.id}><input type="checkbox" checked={item.state === 'ready' || item.state === 'approved'} disabled={action.status !== 'proposed' || item.state === 'failed' || item.state === 'written_back'} onChange={(event) => setPackageItemIncluded(item.id, event.target.checked)} /><span><strong>{item.title}</strong><small>{item.state === 'failed' ? '失败项本次 not_executed' : item.state === 'written_back' ? '已成功，不重复执行' : STATE_LABELS[item.state]}</small></span></label>)}
        <dl><div><dt>影响</dt><dd>{action.impact}</dd></div><div><dt>风险 / 可逆</dt><dd>{action.risk} / {action.reversible ? '是' : '否'}</dd></div><div><dt>幂等键</dt><dd>{action.idempotencyKey}</dd></div></dl>
        {action.status === 'approved' ? <p role="status">已批准 · 尚未执行</p> : null}{action.status === 'rejected' ? <p role="status">已拒绝 · 未执行</p> : null}
      </div>
      <footer>{action.status === 'proposed' ? <><button type="button" onClick={rejectPackageSave}>拒绝</button><button className={styles.primary} type="button" onClick={approvePackageSave}>批准写回</button></> : null}{action.status === 'approved' ? <button className={styles.primary} type="button" onClick={() => { executeApprovedPackageSave(); setPanel('receipt'); }}>执行已批准方案包</button> : null}</footer>
    </aside> : null}

    {panel === 'receipt' && receipt ? <aside className={styles.panel} aria-label="课程方案包 ExecutionReceipt">
      <header><strong>{receipt.status === 'partial_success' ? '部分成功' : receipt.status === 'success' ? '写回完成' : '写回未执行'}</strong><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header>
      <div className={styles.panelBody}><code>{receipt.id}</code><p>{receipt.result}</p>{receipt.items.map((item) => <article className={styles.resultRow} key={item.artifactId}><strong>{item.artifactId}</strong><span data-result={item.result}>{RESULT_LABELS[item.result]}</span>{item.objectId ? <small>{item.objectId}</small> : null}</article>)}<p>{receipt.truthLabel}</p></div>
      <footer>{receipt.status === 'partial_success' ? <button className={styles.primary} type="button" onClick={() => { retryPackageItem('package-recording'); setPackageWritebackScenario('success'); setPanel('navigator'); }}>重试失败项</button> : null}{receipt.status === 'permission_denied' || receipt.status === 'version_conflict' ? <button className={styles.primary} type="button" onClick={() => { setPackageWritebackScenario('success'); proposePackageSave(); setPanel('approval'); }}>调整目标后重新确认</button> : null}{receipt.status === 'recoverable_failure' || receipt.status === 'timeout' ? <button className={styles.primary} type="button" onClick={executeApprovedPackageSave}>安全重试</button> : null}</footer>
    </aside> : null}
  </section>;
}
