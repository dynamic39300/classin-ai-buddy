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
const KIND_LABELS = { courseware: '课件', homework: '作业', quiz: '测验', 'recording-script': '录播脚本' } as const;
const RESULT_LABELS = { succeeded: '执行成功', failed: '执行失败', not_executed: '未执行', waiting: '已存在，不重复执行' } as const;
const RISK_LABELS = { low: '低', medium: '中', high: '高' } as const;

export function PackageRunSurface() {
  const {
    packageView, beginPackageGeneration, completePackageGeneration, setPackageItemIncluded, proposePackageSave, approvePackageSave, rejectPackageSave,
    executeApprovedPackageSave, recoverPackageSave, retryPackageItem, packageWritebackScenario, setPackageWritebackScenario,
    activePackagePanel: panel, setActivePackagePanel: setPanel,
    activePackageArtifactId, setActivePackageArtifactId,
  } = useWorkBuddyWorkspace();
  const lastPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const navigatorPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const generatePackageTriggerRef = useRef<HTMLButtonElement | null>(null);
  if (!packageView) return null;
  const { run, action, receipt, contextConfirmed } = packageView;
  const activeArtifact = run.artifacts.find(({ id }) => id === activePackageArtifactId) ?? run.artifacts[0];
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
        <div><h1 id="package-run-title">{run.title}</h1><span>{run.statusLabel} · [模拟]</span></div>
        {run.showArtifacts ? <button ref={navigatorPanelTriggerRef} type="button" onClick={(event) => openPanel('navigator', event.currentTarget)}>方案包导航</button> : null}
      </header>
      <div className={styles.content}>
        <section className={styles.goal}>
          <span>课程目标</span><p>{run.goal}</p><small>{run.contextSnapshotId ? '已确认独立核心上下文' : '等待确认独立核心上下文'}</small>
          {run.sourceArtifactRef ? <div className={styles.sourceRefs}><span>来源：已审阅课件 · {run.sourceArtifactRef.version}</span><Link to={`/teacher/ai-agent/runs/${run.parentRunRef}`}>返回源课件任务</Link><details><summary>技术证据</summary><code>parentRunRef · {run.parentRunRef}</code><code>sourceArtifactRef · {run.sourceArtifactRef.id} · {run.sourceArtifactRef.version}</code></details></div> : null}
        </section>

        {run.showContextConfirmation ? <section className={styles.configure}>
          <Boxes aria-hidden="true" size={22} /><div><h2>确认派生任务的独立核心上下文</h2><p>已显式带入源课件引用与建议的班级、课程、单元；学习者范围、课堂时间和教学证据未继承。请重新确认后再生成。</p><button type="button" onClick={(event) => openPanel('core_context', event.currentTarget)}>检查并确认核心上下文</button></div>
        </section> : null}

        {run.showPackageConfiguration ? <section className={styles.configure}>
          <Boxes aria-hidden="true" size={22} /><div><h2>确认课程方案包范围</h2><p>{run.sourceArtifactRef ? '独立核心上下文已确认；源课件只作为明确引用。' : '四类课程对象共享课程目标，但保持独立产物状态和写回结果。'}</p><ul>{run.artifacts.map((item) => <li key={item.id}><CheckCircle2 aria-hidden="true" size={15} /><span><strong>{item.title}</strong><small>{KIND_LABELS[item.kind]} · {item.dependsOn.length ? '依赖课件结构' : '根产物'}</small></span></li>)}</ul><button ref={generatePackageTriggerRef} type="button" disabled={!contextConfirmed} onClick={beginPackageGeneration}>确认产物清单并开始生成</button></div>
        </section> : null}

        {run.showGeneration ? <section className={styles.configure}><Boxes aria-hidden="true" size={22} /><div><h2>正在生成课程方案包</h2><p>四项产物均进入可审计的生成中状态；[模拟]场景由显式命令完成，不使用随机计时。</p><ul>{run.artifacts.map((item) => <li key={item.id}><RefreshCw aria-hidden="true" size={15} /><span><strong>{item.title}</strong><small>{STATE_LABELS[item.state]}</small></span></li>)}</ul><button ref={generatePackageTriggerRef} type="button" onClick={(event) => { completePackageGeneration(); openPanel('navigator', event.currentTarget); }}>完成[模拟]生成</button></div></section> : null}

        {run.showArtifacts ? <section className={styles.graph}><h2>课程方案包产物</h2><p>课件是根产物；作业、测验和录播脚本引用课件结构。单项失败不会抹掉其他产物。</p>{run.artifacts.map((item) => <article data-state={item.state} key={item.id}><span>{item.state === 'failed' ? <CircleAlert aria-hidden="true" size={16} /> : <FileText aria-hidden="true" size={16} />}</span><div><strong>{item.title}</strong><p>{KIND_LABELS[item.kind]} · {item.version} · {STATE_LABELS[item.state]}</p></div><span>{item.dependsOn.length ? '引用课件' : '根产物'}</span></article>)}</section> : null}
      </div>
    </section>

    {panel === 'core_context' ? <CoreContextPanel onClose={closePanel} /> : null}

    {panel === 'navigator' ? <aside className={styles.panel} aria-label="课程方案包导航">
      <header><strong>方案包导航</strong><button type="button" onClick={closePanel}>关闭</button></header>
      <div className={styles.panelBody}>{run.artifacts.map((item) => <button className={styles.artifactRow} type="button" aria-pressed={activeArtifact?.id === item.id} key={item.id} onClick={() => setActivePackageArtifactId(item.id)}><span>{item.title}</span><small>{STATE_LABELS[item.state]}</small></button>)}{activeArtifact ? <section aria-label="活动产物预览"><h2>{activeArtifact.title}</h2><p>{KIND_LABELS[activeArtifact.kind]} · {activeArtifact.version} · {STATE_LABELS[activeArtifact.state]}</p><p>[模拟]产物预览；每项保持独立复查和写回状态。</p></section> : null}<label>[模拟]写回场景<select aria-label="课程方案包模拟写回场景" value={packageWritebackScenario} onChange={(event) => setPackageWritebackScenario(event.target.value as PackageWritebackScenario)}><option value="partial_success">部分成功</option><option value="success">全部成功</option><option value="permission_denied">权限拒绝</option><option value="version_conflict">版本冲突</option><option value="recoverable_failure">临时失败</option><option value="timeout">超时</option></select></label></div>
      <footer>{run.artifacts.some(({ state }) => state === 'failed') ? <button type="button" onClick={() => retryPackageItem('package-recording')}><RefreshCw aria-hidden="true" size={14} />重试失败项</button> : null}<button className={styles.primary} type="button" onClick={() => { proposePackageSave(); setPanel('approval'); }}>生成批量写回提案</button></footer>
    </aside> : null}

    {panel === 'approval' && action ? <aside className={styles.panel} aria-label="课程方案包审批">
      <header><div><ShieldCheck aria-hidden="true" size={16} /><strong>课程方案包审批</strong></div><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header>
      <div className={styles.panelBody}>
        <span>保存提案</span><p>目标：{action.target.label}</p><p>{action.difference}</p>
        {run.artifacts.map((item) => <label className={styles.approvalItem} key={item.id}><input type="checkbox" checked={item.state === 'ready' || item.state === 'approved'} disabled={action.status !== 'proposed' || item.state === 'failed' || item.state === 'written_back'} onChange={(event) => setPackageItemIncluded(item.id, event.target.checked)} /><span><strong>{item.title}</strong><small>{item.state === 'failed' ? '失败项本次 not_executed' : item.state === 'written_back' ? '已成功，不重复执行' : STATE_LABELS[item.state]}</small></span></label>)}
        <dl><div><dt>影响</dt><dd>{action.impact}</dd></div><div><dt>目标版本</dt><dd>{action.target.expectedVersion}</dd></div><div><dt>权限</dt><dd>{action.permission === 'allowed' ? '允许写入' : '禁止写入'}</dd></div><div><dt>风险 / 可逆</dt><dd>{RISK_LABELS[action.risk]} / {action.reversible ? '是' : '否'}</dd></div><div><dt>来源产物版本</dt><dd>{action.artifactRefs.map(({ id, version }) => `${run.artifacts.find((item) => item.id === id)?.title ?? '课程产物'} · ${version}`).join('；')}</dd></div><div><dt>审批有效期</dt><dd>{action.expiresAt}</dd></div></dl><details><summary>技术证据</summary><code>{action.id} · {action.idempotencyKey}</code></details>
        {action.status === 'approved' ? <p role="status">已批准 · 尚未执行</p> : null}{action.status === 'rejected' ? <p role="status">已拒绝 · 未执行</p> : null}
      </div>
      <footer>{action.status === 'proposed' ? <><button type="button" onClick={rejectPackageSave}>拒绝</button><button className={styles.primary} type="button" onClick={approvePackageSave}>批准写回</button></> : null}{action.status === 'approved' ? <button className={styles.primary} type="button" onClick={() => { executeApprovedPackageSave(); setPanel('receipt'); }}>执行已批准方案包</button> : null}</footer>
    </aside> : null}

    {panel === 'receipt' && receipt ? <aside className={styles.panel} aria-label="课程方案包执行回执">
      <header><strong>{receipt.status === 'partial_success' ? '部分成功' : receipt.status === 'success' ? '写回完成' : '写回未执行'}</strong><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header>
      <div className={styles.panelBody}><p>{receipt.result}</p>{receipt.status === 'version_conflict' ? <p>目标版本：{receipt.expectedVersion}；当前版本：{receipt.currentVersion}</p> : null}{receipt.items.map((item) => <article className={styles.resultRow} key={item.artifactId}><strong>{run.artifacts.find(({ id }) => id === item.artifactId)?.title ?? '课程产物'}</strong><span data-result={item.result}>{RESULT_LABELS[item.result]}</span>{item.objectId ? <details><summary>技术证据</summary><code>{item.objectId}</code></details> : null}</article>)}<p>{receipt.truthLabel}</p><details><summary>技术证据</summary><code>{receipt.id}</code></details></div>
      <footer>{receipt.status === 'partial_success' ? <button className={styles.primary} type="button" onClick={() => { retryPackageItem('package-recording'); setPackageWritebackScenario('success'); setPanel('navigator'); }}>重试失败项</button> : null}{receipt.status === 'permission_denied' || receipt.status === 'version_conflict' ? <button className={styles.primary} type="button" onClick={recoverPackageSave}>{receipt.status === 'permission_denied' ? '改用教师草稿区并重新确认' : '采用当前版本并重新确认'}</button> : null}{receipt.status === 'recoverable_failure' || receipt.status === 'timeout' ? <button className={styles.primary} type="button" onClick={executeApprovedPackageSave}>安全重试</button> : null}</footer>
    </aside> : null}
  </section>;
}
