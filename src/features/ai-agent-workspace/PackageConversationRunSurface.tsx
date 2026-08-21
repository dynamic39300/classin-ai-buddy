import { Boxes, CheckCircle2, CircleAlert, CircleEllipsis, FileText, LoaderCircle, PanelRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { PackageArtifact, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import { CoreContextPanel } from './CoreContextPanel';
import {
  advancePackageExperience,
  createPackageExperience,
  projectPackageExperienceArtifacts,
  startPackageExperience,
} from './package-run-experience';
import type { PackageRunView } from './workbuddy-course-production-view';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import conversationStyles from './ConversationRunSurface.module.css';
import styles from './PackageConversationRunSurface.module.css';

type InspectorMode = 'context' | 'output';

const KIND_LABELS = { courseware: '课件', homework: '作业', quiz: '测验', 'recording-script': '录播脚本' } as const;
const RESULT_LABELS = { succeeded: '已执行', failed: '执行失败', not_executed: '未执行', waiting: '等待依赖' } as const;

export function PackageConversationRunSurface() {
  const workspace = useWorkBuddyWorkspace();
  const {
    packageView, beginPackageGeneration, completePackageGeneration, setPackageItemIncluded, proposePackageSave,
    approvePackageSave, rejectPackageSave, executeApprovedPackageSave, retryFailedPackageItems,
    packageWritebackScenario, setPackageWritebackScenario, activePackageArtifactId, setActivePackageArtifactId,
  } = workspace.coursePackage;
  const [searchParams] = useSearchParams();
  const recoveryReviewMode = searchParams.get('review') === 'package-partial';
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(() => packageView?.run.showArtifacts ? 'output' : 'context');
  const [experience, setExperience] = useState(createPackageExperience);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lessonCount, setLessonCount] = useState('2');
  const [homeworkCount, setHomeworkCount] = useState('12');
  const [quizMinutes, setQuizMinutes] = useState('15');
  const [recordingMinutes, setRecordingMinutes] = useState('8');
  const executionCommittedRef = useRef(false);

  const run = packageView?.run;
  const experienceArtifacts = useMemo(
    () => run ? projectPackageExperienceArtifacts(experience, run.artifacts) : [],
    [experience, run],
  );

  useEffect(() => {
    if (experience.status !== 'running') return undefined;
    const timeout = window.setTimeout(() => {
      const next = advancePackageExperience(experience);
      setExperience(next);
      if (next.status === 'completed' && !executionCommittedRef.current) {
        executionCommittedRef.current = true;
        completePackageGeneration();
        setInspectorMode('output');
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [completePackageGeneration, experience]);

  if (!packageView || !run) return null;

  const activeArtifact = run.artifacts.find(({ id }) => id === activePackageArtifactId) ?? run.artifacts[0];
  const receiptHistory = packageView.receiptHistory.length
    ? packageView.receiptHistory
    : packageView.receipt ? [packageView.receipt] : [];
  const executeAction = () => {
    setExecuting(true);
    window.setTimeout(() => {
      executeApprovedPackageSave();
      setExecuting(false);
    }, 500);
  };

  return <section className={conversationStyles.page} data-inspector-open={inspectorOpen} aria-labelledby="package-conversation-title">
    <section className={conversationStyles.main}>
      <header className={conversationStyles.header}>
        <div><h1 id="package-conversation-title">{run.title}</h1><span>{run.statusLabel}</span></div>
        <div className={conversationStyles.headerActions}>{recoveryReviewMode ? <label className={conversationStyles.recoveryHarness}>部分成功验收<select aria-label="课程方案包恢复场景" value={packageWritebackScenario} onChange={(event) => setPackageWritebackScenario(event.target.value as PackageWritebackScenario)}><option value="success">全部成功</option><option value="partial_success">部分成功</option></select></label> : null}<button type="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((current) => !current)}><PanelRight aria-hidden="true" size={15} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}</button></div>
      </header>

      <div className={conversationStyles.timeline} role="feed" aria-label="Agent 任务时间线">
        <TimelineEvent icon={<Sparkles aria-hidden="true" size={15} />} title="课程方案包目标" summary={run.goal} />
        <TimelineEvent icon={<Boxes aria-hidden="true" size={15} />} title="已理解你的交付目标" summary="我会围绕同一课程目标生成课件、作业、测验和录播脚本，并保留每项产物的独立状态。" />
        {run.sourceArtifactRef ? <TimelineEvent icon={<FileText aria-hidden="true" size={15} />} title={`来源课件 · ${run.sourceArtifactRef.version}`} summary="这是一条独立方案包任务；来源课件只作为锁定引用，不会继承隐藏上下文。"><Link className={styles.inlineLink} to={`/teacher/ai-agent/runs/${run.parentRunRef}`}>返回源课件任务</Link></TimelineEvent> : null}
        {run.showContextConfirmation ? <TimelineEvent state="requires_teacher_input" icon={<ShieldCheck aria-hidden="true" size={15} />} title="需要确认独立核心上下文" summary="请在右侧确认班级、课程、单元和资料；本任务不会隐式复用另一条 Run 的 ContextSnapshot。" /> : <TimelineEvent icon={<ShieldCheck aria-hidden="true" size={15} />} title="独立核心上下文已确认" summary="本次方案包使用自己的 ContextSnapshot，四类产物共享课程目标但不共享写回状态。" />}

        {run.showPackageConfiguration ? <article className={conversationStyles.event} data-kind="plan" data-state="requires_teacher_input">
          <span className={conversationStyles.eventMark}><Boxes aria-hidden="true" size={15} /></span>
          <div className={conversationStyles.eventBody}><strong>课程方案包执行计划</strong><p>先形成共享课程目标和课件结构，再并行生成配套产物。</p>
            <div className={styles.packageFields}><label>课程课时<select aria-label="课程课时" value={lessonCount} onChange={(event) => setLessonCount(event.target.value)}><option value="1">1 课时</option><option value="2">2 课时</option><option value="3">3 课时</option></select></label><label>作业题量<input aria-label="作业题量" type="number" value={homeworkCount} onChange={(event) => setHomeworkCount(event.target.value)} /></label><label>测验时长<select aria-label="测验时长" value={quizMinutes} onChange={(event) => setQuizMinutes(event.target.value)}><option value="10">10 分钟</option><option value="15">15 分钟</option><option value="20">20 分钟</option></select></label><label>录播时长<select aria-label="录播时长" value={recordingMinutes} onChange={(event) => setRecordingMinutes(event.target.value)}><option value="5">5 分钟</option><option value="8">8 分钟</option><option value="12">12 分钟</option></select></label></div>
            <div className={styles.artifactGraph} role="group" aria-label="课程方案包产物范围">{run.artifacts.map((artifact) => <label key={artifact.id} data-excluded={artifact.state === 'excluded'}><input type="checkbox" checked={artifact.state !== 'excluded'} onChange={(event) => setPackageItemIncluded(artifact.id, event.target.checked)} /><span><strong>{artifact.title}</strong><small>{KIND_LABELS[artifact.kind]} · {artifact.dependsOn.length ? `依赖 ${artifact.dependsOn.length} 项上游产物` : '根产物'}</small></span></label>)}</div>
            <div className={conversationStyles.cardActions}><button className={conversationStyles.primary} type="button" onClick={() => { beginPackageGeneration(); setExperience((current) => startPackageExperience(current)); setInspectorMode('output'); }}>确认范围并开始生成</button></div>
          </div>
        </article> : null}

        {run.showGeneration || experience.status !== 'idle' ? <article className={conversationStyles.event} data-kind="process" data-state={experience.status === 'completed' ? 'completed' : 'running'}>
          <span className={conversationStyles.eventMark}>{experience.status === 'completed' ? <CheckCircle2 aria-hidden="true" size={15} /> : <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={15} />}</span>
          <div className={conversationStyles.eventBody}><strong>课程方案包生成进度</strong><p>{experienceArtifacts.filter(({ state }) => state === 'completed').length}/{experienceArtifacts.filter(({ state }) => state !== 'excluded').length} 项完成</p><div className={styles.progressList}>{experienceArtifacts.map((artifact) => <div data-state={artifact.state} key={artifact.id}>{artifact.state === 'completed' ? <CheckCircle2 aria-hidden="true" size={14} /> : artifact.state === 'running' ? <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={14} /> : <CircleEllipsis aria-hidden="true" size={14} />}<span>{artifact.title}</span><small>{artifact.state === 'completed' ? '已完成，可预览' : artifact.state === 'running' ? '生成中' : artifact.state === 'excluded' ? '已排除' : '等待依赖'}</small></div>)}</div></div>
        </article> : null}

        {run.showArtifacts ? <TimelineEvent icon={<CheckCircle2 aria-hidden="true" size={15} />} title="课程方案包已生成" summary={`${run.artifacts.filter(({ state }) => state !== 'excluded').length} 项产物已形成，可在右侧逐项预览、排除或选择写回。`} /> : null}
        {packageView.action ? <PackageActionEvent packageView={packageView} executing={executing} onSetIncluded={setPackageItemIncluded} onOpenApproval={() => setApprovalDialogOpen(true)} onReject={rejectPackageSave} onExecute={executeAction} /> : null}
        {receiptHistory.map((receipt, index) => <PackageReceiptEvent key={`${receipt.actionId}:${receipt.id}`} receipt={receipt} artifacts={run.artifacts} sequence={index + 1} onRetry={retryFailedPackageItems} />)}
      </div>
    </section>

    {inspectorOpen ? <aside className={conversationStyles.inspector} aria-label="任务辅助区">
      <div className={conversationStyles.tabs} role="tablist" aria-label="任务辅助区视图"><button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => setInspectorMode('context')}>上下文</button><button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={!run.showGeneration && !run.showArtifacts} onClick={() => setInspectorMode('output')}>产出</button></div>
      {inspectorMode === 'context' ? <CoreContextPanel readOnly={!run.showContextConfirmation} onClose={() => setInspectorOpen(false)} /> : <PackageOutputDirectory
        artifacts={run.artifacts}
        experienceArtifacts={experience.status === 'idle' ? null : experienceArtifacts}
        activeArtifact={activeArtifact}
        action={packageView.action}
        receipt={packageView.receipt}
        retryPrepared={packageView.receipt?.status === 'partial_success' && packageView.retryableArtifactIds.length === 0 && packageView.canProposeSave}
        canProposeSave={packageView.canProposeSave}
        onSelect={setActivePackageArtifactId}
        onSetIncluded={setPackageItemIncluded}
        onPropose={proposePackageSave}
      />}
    </aside> : null}

    {approvalDialogOpen && packageView.action ? <div className={conversationStyles.dialogBackdrop} role="presentation"><section className={conversationStyles.approvalDialog} role="dialog" aria-modal="true" aria-labelledby="package-approval-title" onKeyDown={(event) => { if (event.key === 'Escape') setApprovalDialogOpen(false); }}><header><ShieldCheck aria-hidden="true" size={18} /><div><span>教师确认</span><h2 id="package-approval-title">确认保存课程方案包</h2></div></header><p>{packageView.action.target.label}</p><dl><div><dt>本次对象</dt><dd>{packageView.action.artifactRefs.length} 项</dd></div><div><dt>变更</dt><dd>{packageView.action.difference}</dd></div><div><dt>影响</dt><dd>{packageView.action.impact}</dd></div></dl><footer><button type="button" autoFocus onClick={() => setApprovalDialogOpen(false)}>返回检查</button><button className={conversationStyles.primary} type="button" onClick={() => { approvePackageSave(); setApprovalDialogOpen(false); }}>批准保存</button></footer></section></div> : null}
  </section>;
}

function TimelineEvent({ title, summary, icon, state = 'completed', children }: Readonly<{ title: string; summary: string; icon: ReactNode; state?: 'completed' | 'requires_teacher_input'; children?: ReactNode }>) {
  return <article className={conversationStyles.event} data-kind="process" data-state={state}><span className={conversationStyles.eventMark}>{icon}</span><div className={conversationStyles.eventBody}><strong>{title}</strong><p>{summary}</p>{children}</div></article>;
}

function PackageOutputDirectory({ artifacts, experienceArtifacts, activeArtifact, action, receipt, retryPrepared, canProposeSave, onSelect, onSetIncluded, onPropose }: Readonly<{
  artifacts: readonly PackageArtifact[];
  experienceArtifacts: ReturnType<typeof projectPackageExperienceArtifacts> | null;
  activeArtifact: PackageArtifact | undefined;
  action: PackageRunView['action'];
  receipt: PackageRunView['receipt'];
  retryPrepared: boolean;
  canProposeSave: boolean;
  onSelect: (artifactId: string) => void;
  onSetIncluded: (artifactId: string, included: boolean) => void;
  onPropose: () => void;
}>) {
  const stateById = new Map(experienceArtifacts?.map(({ id, state }) => [id, state]) ?? []);
  return <section className={styles.outputDirectory} role="region" aria-label="课程方案包产出"><header><span>课程方案包</span><h2>{artifacts.filter(({ state }) => state !== 'excluded').length} 项产出</h2></header><div className={styles.outputList}>{artifacts.map((artifact) => { const experienceState = stateById.get(artifact.id); const label = experienceState ?? (artifact.state === 'ready' || artifact.state === 'approved' || artifact.state === 'written_back' ? 'completed' : artifact.state); return <div data-state={label} key={artifact.id}><button type="button" aria-pressed={activeArtifact?.id === artifact.id} onClick={() => onSelect(artifact.id)}><span>{artifact.title}</span><small>{label === 'completed' ? '可预览' : label === 'running' ? '生成中' : label === 'failed' ? '需处理' : label === 'excluded' ? '已排除' : '等待'}</small></button>{['ready', 'excluded'].includes(artifact.state) && !action ? <input aria-label={`选择写回：${artifact.title}`} type="checkbox" checked={artifact.state !== 'excluded'} onChange={(event) => onSetIncluded(artifact.id, event.target.checked)} /> : null}</div>; })}</div>{activeArtifact ? <section className={styles.packagePreview} aria-label="当前方案包产物预览"><span>{KIND_LABELS[activeArtifact.kind]} · {activeArtifact.version}</span><h3>{activeArtifact.title}</h3><p>{activeArtifact.kind === 'courseware' ? '18 页课件 · 概念讲解、实验建模、例题与课堂练习' : activeArtifact.kind === 'homework' ? '12 道分层作业 · 基础、进阶与探究任务' : activeArtifact.kind === 'quiz' ? '15 分钟随堂测验 · 单选、判断与简答' : '8 分钟录播脚本 · 情境导入、概念讲解与总结'}</p><small>独立产物版本 · 未写入 ClassIn</small></section> : null}<footer>{!action && !receipt && canProposeSave ? <button className={conversationStyles.primary} type="button" onClick={onPropose}>保存所选产物到 ClassIn</button> : retryPrepared ? <button className={conversationStyles.primary} type="button" onClick={onPropose}>生成失败项重试提案</button> : action ? <span>保存流程已进入任务时间线</span> : receipt ? <span>执行结果已返回任务时间线</span> : null}</footer></section>;
}

function PackageActionEvent({ packageView, executing, onSetIncluded, onOpenApproval, onReject, onExecute }: Readonly<{
  packageView: PackageRunView;
  executing: boolean;
  onSetIncluded: (artifactId: string, included: boolean) => void;
  onOpenApproval: () => void;
  onReject: () => void;
  onExecute: () => void;
}>) {
  const action = packageView.action!;
  return <article className={conversationStyles.event} data-kind="proposed_action" data-state="requires_teacher_input"><span className={conversationStyles.eventMark}><ShieldCheck aria-hidden="true" size={15} /></span><div className={conversationStyles.eventBody}><strong>{action.id.includes('retry') ? '重试失败项保存提案' : '保存课程方案包到 ClassIn'}</strong><p>{action.target.label}</p><section className={styles.packageAction}><div>{packageView.run.artifacts.map((artifact) => <label key={artifact.id}><input type="checkbox" checked={action.artifactRefs.some(({ id }) => id === artifact.id)} disabled={action.status !== 'proposed' || !['ready', 'excluded'].includes(artifact.state)} onChange={(event) => onSetIncluded(artifact.id, event.target.checked)} /><span>{artifact.title}</span><small>{artifact.state === 'written_back' ? '已成功，不重复执行' : artifact.state === 'waiting' ? '等待依赖' : artifact.state === 'failed' ? '需先修复' : artifact.state === 'excluded' ? '本次不保存' : artifact.version}</small></label>)}</div><dl><div><dt>变更</dt><dd>{action.difference}</dd></div><div><dt>权限与风险</dt><dd>{action.permission === 'allowed' ? '允许写入' : '无权限'} · {action.risk === 'medium' ? '中风险' : action.risk === 'low' ? '低风险' : '高风险'} · {action.reversible ? '可撤销' : '不可撤销'}</dd></div></dl>{executing ? <p role="status"><LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={14} />正在执行对象级写回</p> : action.status === 'approved' ? <p>已批准 · 尚未执行</p> : null}<div className={conversationStyles.cardActions}>{action.status === 'proposed' ? <><button type="button" onClick={onReject}>取消保存</button><button className={conversationStyles.primary} type="button" onClick={onOpenApproval}>确认执行</button></> : action.status === 'approved' && !executing && !packageView.receipt ? <button className={conversationStyles.primary} type="button" onClick={onExecute}>执行已批准方案包</button> : null}</div></section></div></article>;
}

function PackageReceiptEvent({ receipt, artifacts, sequence, onRetry }: Readonly<{ receipt: PackageExecutionReceipt; artifacts: readonly PackageArtifact[]; sequence: number; onRetry: () => void }>) {
  const title = receipt.status === 'success' ? '课程方案包执行完成' : receipt.status === 'partial_success' ? '课程方案包部分成功' : '课程方案包写回需要处理';
  return <article className={conversationStyles.event} data-kind="receipt" data-state={receipt.status === 'success' ? 'completed' : 'failed'}><span className={conversationStyles.eventMark}>{receipt.status === 'success' ? <CheckCircle2 aria-hidden="true" size={15} /> : <CircleAlert aria-hidden="true" size={15} />}</span><div className={conversationStyles.eventBody}><strong>{title}</strong><p>第 {sequence} 次执行结果 · {receipt.result.replace('[模拟]', '')}</p><div className={styles.receiptItems}>{receipt.items.map((item) => <div data-result={item.result} key={item.artifactId}><span>{artifacts.find(({ id }) => id === item.artifactId)?.title ?? '课程产物'}</span><strong>{item.result === 'not_executed' && artifacts.find(({ id }) => id === item.artifactId)?.state === 'written_back' ? '已成功，本次未重复执行' : RESULT_LABELS[item.result]}</strong></div>)}</div>{receipt.status === 'partial_success' ? <button className={styles.retryButton} type="button" onClick={onRetry}>修改并重试失败项</button> : null}</div></article>;
}
