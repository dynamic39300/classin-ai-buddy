import { CheckCircle2, FileText, PanelRight, Presentation, ShieldCheck, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import { CoreContextPanel } from './CoreContextPanel';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './CoursewareRunSurface.module.css';

const RISK_LABELS = { low: '低', medium: '中', high: '高' } as const;

export function CoursewareRunSurface() {
  const {
    coursewareView,
    updateCoursewareTaskBrief,
    confirmCoursewareTaskBrief,
    reviseCoursewareTaskBrief,
    executeCoursewareTaskPlan,
    proposeCoursewareSave,
    approveCoursewareSave,
    rejectCoursewareSave,
    executeApprovedCoursewareSave,
    recoverCoursewareSave,
    writebackScenario,
    setWritebackScenario,
    derivePackageFromCourseware,
    activeCoursewarePanel: activePanel,
    setActiveCoursewarePanel: setActivePanel,
    replanScope,
    replanCoursewareToWaveContext,
  } = useWorkBuddyWorkspace();
  const navigate = useNavigate();
  const lastPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const artifactPanelTriggerRef = useRef<HTMLButtonElement | null>(null);

  if (!coursewareView) return null;
  const { run, action: coursewareAction, receipt: coursewareReceipt, projections: coursewareProjections } = coursewareView;
  const artifact = run.artifact;
  const openPanel = (panel: Parameters<typeof setActivePanel>[0], trigger: HTMLButtonElement) => {
    lastPanelTriggerRef.current = trigger;
    setActivePanel(panel);
  };
  const closePanel = () => {
    setActivePanel('none');
    requestAnimationFrame(() => {
      const trigger = lastPanelTriggerRef.current?.isConnected ? lastPanelTriggerRef.current : artifactPanelTriggerRef.current;
      trigger?.focus();
    });
  };

  return (
    <section className={styles.page} data-panel-open={activePanel !== 'none'} aria-labelledby="m4-courseware-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="m4-courseware-title">{run.title}</h1><span>{run.statusLabel} · [模拟]</span></div>
          <nav aria-label="任务辅助面板">
            <button type="button" aria-pressed={activePanel === 'core_context'} onClick={(event) => openPanel('core_context', event.currentTarget)}>核心上下文</button>
            <button type="button" aria-pressed={activePanel === 'replan'} onClick={(event) => openPanel('replan', event.currentTarget)}>调整教学范围</button>
            <button type="button" aria-pressed={activePanel === 'process_detail'} disabled={!run.events.length} onClick={(event) => openPanel('process_detail', event.currentTarget)}>执行详情</button>
            <button ref={artifactPanelTriggerRef} type="button" aria-pressed={activePanel === 'artifact'} disabled={!artifact} onClick={(event) => openPanel('artifact', event.currentTarget)}><PanelRight aria-hidden="true" size={15} />查看产物</button>
          </nav>
        </header>

        <div className={styles.content}>
          <section className={styles.goalCard}>
            <span>任务目标</span><p>{run.goal}</p>
            <small>已确认核心上下文</small><details><summary>技术证据</summary><code>{run.contextSnapshotId}</code></details>
          </section>

          {run.showBrief ? (
            <section className={styles.stageCard} aria-labelledby="courseware-brief-title">
              <span className={styles.stageIcon}><Sparkles aria-hidden="true" size={17} /></span>
              <div className={styles.stageBody}>
                <h2 id="courseware-brief-title">补齐任务信息</h2>
                <p>{run.revision > 1 ? `已从新核心上下文复用：${replanScope.nextLabel}` : `已从核心上下文复用：${replanScope.previousLabel}`}</p>
                {run.supersededEvidence.length ? <section className={styles.supersededEvidence} aria-label="历史版本证据"><strong>调整前的证据已保留</strong><details><summary>查看技术证据</summary>{run.supersededEvidence.map((evidence) => <p key={evidence.snapshotId}>{evidence.snapshotId} · {evidence.artifact?.id} · {evidence.actionId ?? '无保存提案'} · {evidence.receiptId ?? '无执行回执'}</p>)}</details></section> : null}
                <div className={styles.fields}>
                  <label>课时长度<select aria-label="课时长度" value={run.brief.durationMinutes} onChange={(event) => updateCoursewareTaskBrief({ durationMinutes: Number(event.target.value) })}><option value={40}>40 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option></select></label>
                  <label>教学方式<select aria-label="教学方式" value={run.brief.teachingApproach} onChange={(event) => updateCoursewareTaskBrief({ teachingApproach: event.target.value })}><option>实验探究</option><option>概念讲解</option><option>问题驱动</option></select></label>
                  <label>预计页数<input aria-label="预计页数" type="number" min={6} max={40} value={run.brief.expectedPages} onChange={(event) => updateCoursewareTaskBrief({ expectedPages: Number(event.target.value) })} /></label>
                </div>
                <div className={styles.actions}><button className={styles.primary} type="button" onClick={confirmCoursewareTaskBrief}>确认任务信息</button></div>
              </div>
            </section>
          ) : null}

          {run.showPlan ? (
            <section className={styles.stageCard} aria-labelledby="courseware-plan-title">
              <span className={styles.stageIcon}><FileText aria-hidden="true" size={17} /></span>
              <div className={styles.stageBody}>
                <h2 id="courseware-plan-title">执行计划</h2>
                <p>预期产物：{run.brief.expectedPages} 页课件初稿</p>
                <ol className={styles.planList}>{run.plan.map((step) => <li key={step.id}><div><strong>{step.title}</strong><span>{step.expectedOutput}</span></div></li>)}</ol>
                <p className={styles.waitingPoint}>等待点：教师确认计划</p>
                <div className={styles.actions}><button type="button" onClick={reviseCoursewareTaskBrief}>返回修改</button><button className={styles.primary} type="button" onClick={() => { executeCoursewareTaskPlan(); setActivePanel('artifact'); }}>确认计划并执行</button></div>
              </div>
            </section>
          ) : null}

          {run.showArtifact ? (
            <section className={styles.process} aria-labelledby="courseware-complete-title">
              <div className={styles.completeHeading}><CheckCircle2 aria-hidden="true" size={20} /><div><h2 id="courseware-complete-title">课件初稿已生成</h2><p>产物已完成固定质量检查，等待教师复查；尚未写入 ClassIn。</p></div></div>
              <div className={styles.events}>{run.events.map((event) => <article key={event.id}><span><CheckCircle2 aria-hidden="true" size={15} /></span><div><strong>{event.title}</strong><p>{event.summary}</p></div></article>)}</div>
            </section>
          ) : null}
        </div>
      </section>

      {activePanel === 'artifact' && artifact ? (
        <aside className={styles.panel} aria-label="当前任务产物">
          <header><div><Presentation aria-hidden="true" size={17} /><strong>{artifact.title}</strong></div><button type="button" onClick={closePanel}>关闭</button></header>
          <div className={styles.artifactBody}>
            <div className={styles.metadata}><span>{artifact.version}</span><span>{artifact.pageCount} 页</span><span>质量检查通过</span></div><details><summary>技术证据</summary><code>{artifact.id}</code><span>{artifact.validationState}</span></details>
            <div className={styles.slide}><small>高二物理 · 动量与碰撞</small><h2>从碰撞实验到动量守恒</h2><p>观察现象 → 选择系统 → 建立模型 → 验证守恒条件</p><div><span /><span /></div></div>
            <p>{artifact.validationSummary}</p>
            <strong className={styles.truthLabel}>{artifact.truthLabel}</strong>
            <label className={styles.scenarioPicker}>[模拟]写回场景<select aria-label="模拟写回场景" value={writebackScenario} onChange={(event) => setWritebackScenario(event.target.value as WritebackScenario)}><option value="success">成功</option><option value="permission_denied">权限拒绝</option><option value="version_conflict">版本冲突</option><option value="recoverable_failure">临时失败后可重试</option><option value="timeout">超时后可重试</option></select></label>
          </div>
          <footer><button type="button" onClick={() => { const runId = derivePackageFromCourseware(); if (runId) navigate(`/teacher/ai-agent/runs/${runId}`); }}>基于此课件生成课程方案包</button><button type="button" onClick={() => { proposeCoursewareSave(); setActivePanel('action'); }}>保存到 ClassIn</button></footer>
        </aside>
      ) : null}

      {activePanel === 'action' && coursewareAction ? (
        <aside className={styles.panel} aria-label="保存审批">
          <header><div><ShieldCheck aria-hidden="true" size={17} /><strong>保存审批</strong></div><button type="button" onClick={() => setActivePanel('artifact')}>返回产物</button></header>
          <div className={styles.approvalBody}>
            <span className={styles.objectType}>保存提案</span>
            <h2>保存课件到 ClassIn</h2>
            <p>目标：{coursewareAction.target.label}</p>
            <dl>
              <div><dt>变更</dt><dd>{coursewareAction.difference}</dd></div>
              <div><dt>影响</dt><dd>{coursewareAction.impact}</dd></div>
              <div><dt>目标版本</dt><dd>{coursewareAction.target.expectedVersion}</dd></div>
              <div><dt>来源版本</dt><dd>{coursewareAction.artifactRef.version}<details><summary>技术证据</summary><code>{coursewareAction.artifactRef.id}</code></details></dd></div>
              <div><dt>风险与权限</dt><dd>风险：{RISK_LABELS[coursewareAction.risk]} · 可逆：{coursewareAction.reversible ? '是' : '否'} · 权限：{coursewareAction.permission === 'allowed' ? '允许写入' : '禁止写入'}</dd></div>
              <div><dt>审批有效期</dt><dd>{coursewareAction.expiresAt}</dd></div>
            </dl>
            {coursewareAction.status === 'approved' ? <p className={styles.approvedStatus} role="status">已批准 · 尚未执行</p> : null}
            {coursewareAction.status === 'rejected' ? <p className={styles.rejectedStatus} role="status">已拒绝 · 未执行任何写入</p> : null}
          </div>
          <footer>
            {coursewareAction.status === 'proposed' ? <><button type="button" onClick={rejectCoursewareSave}>拒绝</button><button className={styles.primaryPanelAction} type="button" onClick={approveCoursewareSave}>批准保存</button></> : null}
            {coursewareAction.status === 'approved' ? <button className={styles.primaryPanelAction} type="button" onClick={() => { executeApprovedCoursewareSave(); setActivePanel('receipt'); }}>执行已批准动作</button> : null}
          </footer>
        </aside>
      ) : null}

      {activePanel === 'replan' ? (
        <aside className={styles.panel} aria-label="重新规划影响">
          <header><strong>调整教学范围</strong><button type="button" onClick={closePanel}>取消</button></header>
          <div className={styles.approvalBody}>
            <span className={styles.objectType}>教学范围调整</span>
            <h2>切换到新的班级与课程范围</h2>
            <p>确认前不会修改当前任务。确认后将生成新的上下文版本与计划，旧证据不会被覆盖。</p>
            <dl><div><dt>移除范围</dt><dd>{replanScope.previousLabel}</dd></div><div><dt>新增范围</dt><dd>{replanScope.nextLabel}</dd></div><div><dt>受影响步骤</dt><dd>目标理解、教学结构、课件组装、质量检查</dd></div><div><dt>受影响对象</dt><dd>当前课件、保存提案与执行回执</dd></div></dl>
          </div>
          <footer><button type="button" onClick={closePanel}>保留当前范围</button><button className={styles.primaryPanelAction} type="button" onClick={() => { replanCoursewareToWaveContext(); requestAnimationFrame(() => lastPanelTriggerRef.current?.focus()); }}>确认并重新规划</button></footer>
        </aside>
      ) : null}

      {activePanel === 'receipt' && coursewareReceipt ? (
        <aside className={styles.panel} aria-label="执行回执">
          <header><div><CheckCircle2 aria-hidden="true" size={17} /><strong>执行回执</strong></div><button type="button" onClick={() => setActivePanel('artifact')}>返回产物</button></header>
          <div className={styles.receiptBody}>
            {coursewareReceipt.status === 'success' ? <>
              <span className={styles.successMark}><CheckCircle2 aria-hidden="true" size={22} /></span>
              <h2>保存成功</h2>
              <p>只有这份回执证明[模拟]写回接口已接受并执行本次动作。</p>
              <dl>
                <div><dt>ClassIn 对象</dt><dd>{coursewareReceipt.object.label}<details><summary>技术证据</summary><code>{coursewareReceipt.object.id}</code></details></dd></div>
                <div><dt>对象版本</dt><dd>{coursewareReceipt.object.version}</dd></div>
                <div><dt>执行时间</dt><dd>{coursewareReceipt.executedAt}</dd></div>
                <div><dt>结果</dt><dd>{coursewareReceipt.result}</dd></div>
              </dl><details><summary>技术证据</summary><code>{coursewareReceipt.id} · {coursewareReceipt.actionId} · {coursewareReceipt.approvalId}</code></details>
              <Link className={styles.returnLink} to={coursewareReceipt.object.returnUrl}>返回 ClassIn 课程对象</Link>
            </> : <>
              <span className={styles.failureMark}>!</span>
              <h2>{coursewareReceipt.status === 'permission_denied' ? '权限拒绝' : coursewareReceipt.status === 'version_conflict' ? '版本冲突' : coursewareReceipt.status === 'timeout' ? '执行超时' : '临时失败'}</h2>
              <p>{coursewareReceipt.result}</p>
              <dl>
                <div><dt>未执行范围</dt><dd>未执行目标：{coursewareReceipt.unexecutedTarget}</dd></div>
                {coursewareReceipt.status === 'version_conflict' ? <div><dt>版本比较</dt><dd>expected：{coursewareReceipt.expectedVersion} · current：{coursewareReceipt.currentVersion}</dd></div> : null}
                <div><dt>恢复方式</dt><dd>{coursewareReceipt.status === 'permission_denied' ? '选择其他可写入位置' : coursewareReceipt.status === 'version_conflict' ? '比较版本并重新确认，禁止静默覆盖' : '已保留 Approval 与 idempotencyKey'}</dd></div>
              </dl>
              {coursewareReceipt.status === 'permission_denied' || coursewareReceipt.status === 'version_conflict' ? <button className={styles.retryButton} type="button" onClick={recoverCoursewareSave}>{coursewareReceipt.status === 'permission_denied' ? '改用教师草稿区并重新确认' : '采用当前版本并重新确认'}</button> : null}
              {coursewareReceipt.status === 'recoverable_failure' || coursewareReceipt.status === 'timeout' ? <button className={styles.retryButton} type="button" onClick={executeApprovedCoursewareSave}>安全重试</button> : null}
            </>}
          </div>
        </aside>
      ) : null}

      {activePanel === 'process_detail' ? (
        <aside className={styles.panel} aria-label="执行详情">
          <header><strong>执行详情</strong><button type="button" onClick={closePanel}>关闭</button></header>
          <div className={styles.processDetail}>
            <h2>最小 ContextProjection</h2>
            <p>以下字段是固定 Capability Manifest 为本次步骤声明的最小输入；完整 Snapshot 未下发。</p>
            {coursewareProjections.map((projection) => <section key={projection.capabilityId} aria-label={`${projection.capabilityId} ContextProjection`}><h3>{projection.capabilityId}</h3><p>{projection.purpose} · {projection.snapshotId} · 生成于 {projection.generatedAt}</p><ul>{projection.items.map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.section} · {item.sensitivity} · {item.sourceVersion}</span></li>)}</ul><small>敏感项裁剪：{projection.excludedSensitiveCount}</small></section>)}
            <h2>能力追踪</h2>
            <ul>{run.events.filter(({ capability }) => capability).map((event) => <li key={event.id}><strong>{event.capability}</strong><span>{event.title} · [模拟]输出</span></li>)}</ul>
          </div>
        </aside>
      ) : null}

      {activePanel === 'core_context' ? <CoreContextPanel readOnly mode="courseware" onClose={closePanel} /> : null}
    </section>
  );
}
