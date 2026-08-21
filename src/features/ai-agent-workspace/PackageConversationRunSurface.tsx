import { Boxes, CheckCircle2, CircleAlert, CircleEllipsis, FileText, LoaderCircle, PanelRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PackageWritebackScenario } from '@contracts/workbuddy/package-writeback';
import type { ConversationRunEvent, ConversationRunEventState, ConversationRunPackageConfiguration } from '@contracts/workbuddy/conversation-run';
import type { PackageArtifact, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import { CoreContextPanel } from './CoreContextPanel';
import { WorkBuddyModalDialog } from './WorkBuddyModalDialog';
import { useConversationRun } from './use-conversation-run';
import type { PackageRunView } from './workbuddy-course-production-view';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import conversationStyles from './ConversationRunSurface.module.css';
import styles from './PackageConversationRunSurface.module.css';

const KIND_LABELS = { courseware: '课件', homework: '作业', quiz: '测验', 'recording-script': '录播脚本' } as const;
const RESULT_LABELS = { succeeded: '已执行', failed: '执行失败', not_executed: '未执行', waiting: '等待依赖' } as const;

export function PackageConversationRunSurface() {
  const workspace = useWorkBuddyWorkspace();
  const { packageView, packageWritebackScenario, activePackageArtifactId } = workspace.coursePackage;
  const contextCount = workspace.context.contextView.includedCount;
  const runRef = packageView?.run.id ?? 'missing-package-run';
  const { projection, dispatch } = useConversationRun(runRef);
  const [searchParams] = useSearchParams();
  const recoveryReviewMode = searchParams.get('review') === 'package-partial';
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  const run = packageView?.run;
  if (!packageView || !run || !projection) return null;
  const progress = projection.presentation.progress;
  const packageConfiguration = projection.presentation.packageConfiguration;
  const updatePackageConfiguration = (patch: Partial<ConversationRunPackageConfiguration>) => dispatch({
    type: 'set_package_configuration',
    configuration: { ...packageConfiguration, ...patch },
  });
  const eventByArtifactId = new Map(projection.events.flatMap((event) => event.objectRefs
    .filter(({ type }) => type === 'artifact')
    .map(({ id }) => [id, event] as const)));
  const experienceArtifacts = run.artifacts.map((artifact) => {
    const event = eventByArtifactId.get(artifact.id);
    const state = artifact.state === 'excluded' ? 'excluded' as const
      : event?.state === 'completed' ? 'completed' as const
        : event?.state === 'running' ? 'running' as const : 'waiting' as const;
    return Object.freeze({ id: artifact.id, state });
  });
  const { inspectorOpen, inspectorMode, composerDraft, executingAction: executing } = projection.presentation;

  const activeArtifact = run.artifacts.find(({ id }) => id === activePackageArtifactId) ?? run.artifacts[0];
  const receiptHistory = packageView.receiptHistory.length
    ? packageView.receiptHistory
    : packageView.receipt ? [packageView.receipt] : [];
  const executeAction = () => dispatch({ type: 'execute_action' });
  const canStop = projection.events.some(({ allowedCommands }) => allowedCommands.includes('stop'));
  const canResume = projection.events.some(({ allowedCommands }) => allowedCommands.includes('resume'));
  const statusLabel = progress.status === 'running' ? '生成中' : progress.status === 'stopped' ? '已停止' : progress.status === 'cancelled' ? '已取消' : run.statusLabel;

  return <section className={conversationStyles.page} data-inspector-open={inspectorOpen} aria-labelledby="package-conversation-title">
    <section className={conversationStyles.main}>
      <header className={conversationStyles.header}>
        <div><h1 id="package-conversation-title">{run.title}</h1><span>{statusLabel}</span><small className={conversationStyles.truthMarker} aria-label="当前为固定体验数据">[模拟] 体验环境</small></div>
        <div className={conversationStyles.headerActions}>{recoveryReviewMode ? <label className={conversationStyles.recoveryHarness}>部分成功验收<select aria-label="课程方案包恢复场景" value={packageWritebackScenario} onChange={(event) => dispatch({ type: 'set_scenario', scenario: event.target.value as PackageWritebackScenario })}><option value="success">全部成功</option><option value="partial_success">部分成功</option></select></label> : null}<button type="button" aria-pressed={inspectorOpen && inspectorMode === 'context'} onClick={() => dispatch({ type: 'set_inspector', open: true, mode: 'context' })}>上下文 · {contextCount}</button><button type="button" aria-pressed={inspectorOpen && inspectorMode === 'output'} disabled={projection.presentation.outputCount === 0 && !run.showArtifacts} onClick={() => dispatch({ type: 'set_inspector', open: true, mode: 'output' })}>产出 · {projection.presentation.outputCount}{projection.presentation.unreadOutputCount ? ` · ${projection.presentation.unreadOutputCount} 新` : ''}</button><button type="button" aria-pressed={inspectorOpen} onClick={() => dispatch({ type: 'set_inspector', open: !inspectorOpen })}><PanelRight aria-hidden="true" size={15} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}</button></div>
      </header>

      <div className={conversationStyles.timeline} role="feed" aria-label="Agent 任务时间线">
        {projection.events.map((event) => {
          if (event.kind === 'plan' && run.showPackageConfiguration) return <PackagePlanEvent key={event.id} run={run} event={event} configuration={packageConfiguration} onConfigurationChange={updatePackageConfiguration} onSetIncluded={(artifactId, included) => dispatch({ type: 'set_package_item_included', artifactId, included })} onCancel={() => dispatch({ type: 'cancel' })} onBegin={() => dispatch({ type: 'begin_package', configuration: packageConfiguration })} />;
          if (event.id === `${run.id}:package-progress`) return <PackageProgressEvent key={event.id} event={event} progressStatus={progress.status} artifacts={run.artifacts} experienceArtifacts={experienceArtifacts} />;
          if (event.kind === 'proposed_action' && packageView.action?.id === event.id) return <PackageActionEvent key={event.id} event={event} packageView={packageView} executing={executing} onSetIncluded={(artifactId, included) => dispatch({ type: 'set_package_item_included', artifactId, included })} onOpenApproval={() => setApprovalDialogOpen(true)} onReject={() => dispatch({ type: 'reject_action' })} onExecute={executeAction} />;
          if (event.kind === 'receipt') {
            const receipt = receiptHistory.find(({ id }) => id === event.id);
            if (receipt) return <PackageReceiptEvent key={event.id} event={event} receipt={receipt} artifacts={run.artifacts} sequence={receiptHistory.indexOf(receipt) + 1} onRetry={() => dispatch({ type: 'retry_failed' })} />;
          }
          const sourceLink = event.id === `${run.id}:source-artifact` && run.parentRunRef
            ? <Link className={styles.inlineLink} to={`/teacher/ai-agent/runs/${run.parentRunRef}`}>返回源课件任务</Link>
            : null;
          return <TimelineEvent key={event.id} icon={iconForEvent(event)} state={event.state} title={event.title} summary={event.summary}>{sourceLink}</TimelineEvent>;
        })}
      </div>
      <div className={conversationStyles.runComposer} role="group" aria-label="任务补充输入">
        <textarea aria-label="向 Agent 补充要求" value={composerDraft} disabled={progress.status === 'cancelled'} placeholder="补充要求、调整方案包或继续追问…" onChange={(event) => dispatch({ type: 'set_composer_draft', text: event.target.value })} />
        <div><span>{canStop ? '方案包生成中，可补充未开始产物' : canResume ? '任务已停止，可从当前位置继续' : progress.status === 'cancelled' ? '任务已取消，可新建任务重新开始' : '补充内容会记录在当前任务中'}</span>
          {canStop ? <button type="button" onClick={() => dispatch({ type: 'stop' })}>停止执行</button> : null}
          {canResume ? <button type="button" onClick={() => dispatch({ type: 'resume' })}>继续执行</button> : null}
          <button className={conversationStyles.primary} type="button" aria-label="发送补充要求" disabled={progress.status === 'cancelled' || !composerDraft.trim()} onClick={() => dispatch({ type: 'supplement', text: composerDraft.trim() })}>发送</button>
        </div>
      </div>
    </section>

    <aside className={conversationStyles.inspector} aria-label="任务辅助区" hidden={!inspectorOpen}>
      <div className={conversationStyles.tabs} role="tablist" aria-label="任务辅助区视图"><button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => dispatch({ type: 'set_inspector', mode: 'context' })}>上下文</button><button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={projection.presentation.outputCount === 0 && !run.showArtifacts} onClick={() => dispatch({ type: 'set_inspector', mode: 'output' })}>产出 · {projection.presentation.outputCount}{projection.presentation.unreadOutputCount ? ` · ${projection.presentation.unreadOutputCount} 新` : ''}</button></div>
      <div hidden={inspectorMode !== 'context'}><CoreContextPanel readOnly={!run.showContextConfirmation} inspectorState={{ expandedIds: projection.presentation.contextExpandedIds, query: projection.presentation.contextQuery, scrollTop: projection.presentation.contextScrollTop }} onInspectorStateChange={(patch) => dispatch({ type: 'set_context_inspector_state', ...patch })} onClose={() => dispatch({ type: 'set_inspector', open: false })} /></div>
      <div hidden={inspectorMode !== 'output'}><PackageOutputDirectory
        artifacts={run.artifacts}
        experienceArtifacts={progress.status === 'idle' || progress.status === 'organizing' ? null : experienceArtifacts}
        activeArtifact={activeArtifact}
        action={packageView.action}
        receipt={packageView.receipt}
        retryPrepared={packageView.receipt?.status === 'partial_success' && packageView.retryableArtifactIds.length === 0 && packageView.canProposeSave}
        canProposeSave={packageView.canProposeSave}
        configuration={packageConfiguration}
        outputCount={projection.presentation.outputCount}
        inspectorState={{
          editingArtifactId: projection.presentation.packageEditingArtifactId,
          editDraft: projection.presentation.packageEditDraft,
          scrollTop: projection.presentation.artifactScrollTop,
        }}
        onInspectorStateChange={(patch) => dispatch({ type: 'set_artifact_inspector_state', ...patch })}
        onSelect={(artifactId) => dispatch({ type: 'select_package_artifact', artifactId })}
        onSetIncluded={(artifactId, included) => dispatch({ type: 'set_package_item_included', artifactId, included })}
        onPropose={() => dispatch({ type: 'propose_action' })}
        onRevise={(artifactId, instruction) => dispatch({ type: 'revise_package_artifact', artifactId, instruction })}
      /></div>
    </aside>

    {approvalDialogOpen && packageView.action ? <WorkBuddyModalDialog className={conversationStyles.approvalDialog} labelledBy="package-approval-title" onClose={() => setApprovalDialogOpen(false)}><section><header><ShieldCheck aria-hidden="true" size={18} /><div><span>教师确认</span><h2 id="package-approval-title">确认保存课程方案包</h2></div></header><p>{packageView.action.target.label}</p><dl><div><dt>本次对象</dt><dd>{packageView.action.artifactRefs.length} 项</dd></div><div><dt>变更</dt><dd>{packageView.action.difference}</dd></div><div><dt>影响</dt><dd>{packageView.action.impact}</dd></div></dl><ul aria-label="本次批准的课程产物">{run.artifacts.map((artifact) => { const selected = packageView.action?.artifactRefs.some(({ id, version }) => id === artifact.id && version === artifact.version) ?? false; return <li key={artifact.id}><span>{artifact.title}</span><small>{selected ? `已选择 · ${artifact.version}` : artifact.state === 'written_back' ? '已成功，不重复执行' : '本次不执行'}</small></li>; })}</ul><footer><button type="button" autoFocus onClick={() => setApprovalDialogOpen(false)}>返回检查</button><button className={conversationStyles.primary} type="button" onClick={() => { dispatch({ type: 'approve_action' }); setApprovalDialogOpen(false); }}>批准保存</button></footer></section></WorkBuddyModalDialog> : null}
  </section>;
}

function iconForEvent(event: ConversationRunEvent): ReactNode {
  if (event.kind === 'teacher_message' || event.kind === 'goal_understood') return <Sparkles aria-hidden="true" size={15} />;
  if (event.kind === 'context_confirmed' || event.kind === 'clarification_request' || event.kind === 'approval') return <ShieldCheck aria-hidden="true" size={15} />;
  if (event.kind === 'artifact' || event.id.endsWith(':source-artifact')) return <FileText aria-hidden="true" size={15} />;
  if (event.state === 'failed') return <CircleAlert aria-hidden="true" size={15} />;
  if (event.state === 'running') return <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={15} />;
  return <CheckCircle2 aria-hidden="true" size={15} />;
}

function PackagePlanEvent({ run, event, configuration, onConfigurationChange, onSetIncluded, onCancel, onBegin }: Readonly<{
  run: PackageRunView['run']; event: ConversationRunEvent; configuration: ConversationRunPackageConfiguration;
  onConfigurationChange: (patch: Partial<ConversationRunPackageConfiguration>) => void;
  onSetIncluded: (artifactId: string, included: boolean) => void; onCancel: () => void; onBegin: () => void;
}>) {
  return <article className={conversationStyles.event} data-kind={event.kind} data-state={event.state}>
    <span className={conversationStyles.eventMark}><Boxes aria-hidden="true" size={15} /></span>
    <div className={conversationStyles.eventBody}><strong>{event.title}</strong><p>{event.summary}</p>
      <div className={styles.packageFields}><label>课程课时<select aria-label="课程课时" value={configuration.lessonCount} onChange={(changeEvent) => onConfigurationChange({ lessonCount: Number(changeEvent.target.value) })}><option value="1">1 课时</option><option value="2">2 课时</option><option value="3">3 课时</option></select></label><label>作业题量<input aria-label="作业题量" type="number" min="1" max="50" value={configuration.homeworkCount} onChange={(changeEvent) => onConfigurationChange({ homeworkCount: Number(changeEvent.target.value) })} /></label><label>测验时长<select aria-label="测验时长" value={configuration.quizMinutes} onChange={(changeEvent) => onConfigurationChange({ quizMinutes: Number(changeEvent.target.value) })}><option value="10">10 分钟</option><option value="15">15 分钟</option><option value="20">20 分钟</option></select></label><label>录播时长<select aria-label="录播时长" value={configuration.recordingMinutes} onChange={(changeEvent) => onConfigurationChange({ recordingMinutes: Number(changeEvent.target.value) })}><option value="5">5 分钟</option><option value="8">8 分钟</option><option value="12">12 分钟</option></select></label></div>
      <div className={styles.artifactGraph} role="group" aria-label="课程方案包产物范围">{run.artifacts.map((artifact) => <label key={artifact.id} data-excluded={artifact.state === 'excluded'}><input type="checkbox" disabled={!event.allowedCommands.includes('set_package_item_included')} checked={artifact.state !== 'excluded'} onChange={(changeEvent) => onSetIncluded(artifact.id, changeEvent.target.checked)} /><span><strong>{artifact.title}</strong><small>{KIND_LABELS[artifact.kind]} · {artifact.dependsOn.length ? `依赖 ${artifact.dependsOn.length} 项上游产物` : '根产物'}</small></span></label>)}</div>
      <div className={conversationStyles.cardActions}>{event.allowedCommands.includes('cancel') ? <button type="button" onClick={onCancel}>取消任务</button> : null}{event.allowedCommands.includes('begin_package') ? <button className={conversationStyles.primary} type="button" onClick={onBegin}>确认范围并开始生成</button> : null}</div>
    </div>
  </article>;
}

function TimelineEvent({ title, summary, icon, state = 'completed', children }: Readonly<{ title: string; summary: string; icon: ReactNode; state?: ConversationRunEventState; children?: ReactNode }>) {
  return <article className={conversationStyles.event} data-kind="process" data-state={state}><span className={conversationStyles.eventMark}>{icon}</span><div className={conversationStyles.eventBody}><strong>{title}</strong><p>{summary}</p>{children}</div></article>;
}

function PackageProgressEvent({ event, progressStatus, artifacts, experienceArtifacts }: Readonly<{
  event: ConversationRunEvent;
  progressStatus: 'organizing' | 'idle' | 'running' | 'stopped' | 'cancelled' | 'completed';
  artifacts: readonly PackageArtifact[];
  experienceArtifacts: readonly Readonly<{ id: string; state: 'waiting' | 'running' | 'completed' | 'excluded' }>[];
}>) {
  const stateById = new Map(experienceArtifacts.map(({ id, state }) => [id, state]));
  return <article className={conversationStyles.event} data-kind={event.kind} data-state={event.state}><span className={conversationStyles.eventMark}>{event.state === 'completed' ? <CheckCircle2 aria-hidden="true" size={15} /> : event.state === 'stopped' ? <CircleEllipsis aria-hidden="true" size={15} /> : <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={15} />}</span><div className={conversationStyles.eventBody}><strong>{event.title}</strong><p>{experienceArtifacts.filter(({ state }) => state === 'completed').length}/{experienceArtifacts.filter(({ state }) => state !== 'excluded').length} 项完成{progressStatus === 'stopped' ? ' · 已停止' : ''}</p><div className={styles.progressList}>{artifacts.map((artifact) => { const state = stateById.get(artifact.id) ?? 'waiting'; return <div data-state={state} key={artifact.id}>{state === 'completed' ? <CheckCircle2 aria-hidden="true" size={14} /> : state === 'running' && progressStatus !== 'stopped' ? <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={14} /> : <CircleEllipsis aria-hidden="true" size={14} />}<span>{artifact.title}</span><small>{state === 'completed' ? '已完成，可预览' : state === 'running' && progressStatus === 'stopped' ? '已停止' : state === 'running' ? '生成中' : state === 'excluded' ? '已排除' : '等待依赖'}</small></div>; })}</div></div></article>;
}

function PackageOutputDirectory({ artifacts, experienceArtifacts, activeArtifact, action, receipt, retryPrepared, canProposeSave, configuration, outputCount, inspectorState, onSelect, onSetIncluded, onPropose, onRevise, onInspectorStateChange }: Readonly<{
  artifacts: readonly PackageArtifact[];
  experienceArtifacts: readonly Readonly<{ id: string; state: 'waiting' | 'running' | 'completed' | 'excluded' }>[] | null;
  activeArtifact: PackageArtifact | undefined;
  action: PackageRunView['action'];
  receipt: PackageRunView['receipt'];
  retryPrepared: boolean;
  canProposeSave: boolean;
  configuration: ConversationRunPackageConfiguration;
  outputCount: number;
  inspectorState: Readonly<{ editingArtifactId: string | null; editDraft: string; scrollTop: number }>;
  onSelect: (artifactId: string) => void;
  onSetIncluded: (artifactId: string, included: boolean) => void;
  onPropose: () => void;
  onRevise: (artifactId: string, instruction: string) => void;
  onInspectorStateChange: (patch: Readonly<{ packageEditingArtifactId?: string | null; packageEditDraft?: string; scrollTop?: number }>) => void;
}>) {
  const stateById = new Map(experienceArtifacts?.map(({ id, state }) => [id, state]) ?? []);
  const { editingArtifactId, editDraft: instruction, scrollTop } = inspectorState;
  const outputRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = scrollTop;
  }, [scrollTop]);
  return <section ref={outputRef} className={styles.outputDirectory} role="region" aria-label="课程方案包产出" onScroll={(event) => onInspectorStateChange({ scrollTop: event.currentTarget.scrollTop })}><header><span>课程方案包</span><h2>{outputCount} 项产出</h2></header><div className={styles.outputList}>{artifacts.map((artifact) => { const experienceState = stateById.get(artifact.id); const label = experienceState ?? (artifact.state === 'ready' || artifact.state === 'approved' || artifact.state === 'written_back' ? 'completed' : artifact.state); return <div data-state={label} key={artifact.id}><button type="button" aria-pressed={activeArtifact?.id === artifact.id} onClick={() => onSelect(artifact.id)}><span>{artifact.title}</span><small>{label === 'completed' ? '可预览' : label === 'running' ? '生成中' : label === 'failed' ? '需处理' : label === 'excluded' ? '已排除' : '等待'}</small></button>{['ready', 'excluded'].includes(artifact.state) && !action ? <input aria-label={`选择写回：${artifact.title}`} type="checkbox" checked={artifact.state !== 'excluded'} onChange={(event) => onSetIncluded(artifact.id, event.target.checked)} /> : null}</div>; })}</div>{activeArtifact ? <section className={styles.packagePreview} aria-label="当前方案包产物预览"><span>{KIND_LABELS[activeArtifact.kind]} · {activeArtifact.version}</span><h3>{activeArtifact.title}</h3><p>{activeArtifact.kind === 'courseware' ? `${configuration.lessonCount} 课时 · 18 页课件 · 概念讲解、图像辨析、例题与课堂练习` : activeArtifact.kind === 'homework' ? `${configuration.homeworkCount} 道分层作业 · 基础、进阶与探究任务` : activeArtifact.kind === 'quiz' ? `${configuration.quizMinutes} 分钟随堂测验 · 单选、判断与简答` : `${configuration.recordingMinutes} 分钟录播脚本 · 情境导入、概念讲解与总结`}</p><small>独立产物版本 · 未写入 ClassIn</small>{activeArtifact.state === 'ready' && !action && !receipt ? editingArtifactId === activeArtifact.id ? <div className={styles.itemEditor}><label>修改要求<textarea aria-label={`修改${activeArtifact.title}`} value={instruction} onChange={(event) => onInspectorStateChange({ packageEditDraft: event.target.value })} /></label><div><button type="button" onClick={() => onInspectorStateChange({ packageEditingArtifactId: null })}>取消</button><button type="button" disabled={!instruction.trim()} onClick={() => { onRevise(activeArtifact.id, instruction.trim()); onInspectorStateChange({ packageEditingArtifactId: null }); }}>应用修改并生成新版本</button></div></div> : <button type="button" onClick={() => onInspectorStateChange({ packageEditingArtifactId: activeArtifact.id })}>修改此产物</button> : null}</section> : null}<footer>{!action && !receipt && canProposeSave ? <button className={conversationStyles.primary} type="button" onClick={onPropose}>保存所选产物到 ClassIn</button> : retryPrepared ? <button className={conversationStyles.primary} type="button" onClick={onPropose}>生成失败项重试提案</button> : action ? <span>保存流程已进入任务时间线</span> : receipt ? <span>执行结果已返回任务时间线</span> : null}</footer></section>;
}

function PackageActionEvent({ event, packageView, executing, onSetIncluded, onOpenApproval, onReject, onExecute }: Readonly<{
  event: ConversationRunEvent;
  packageView: PackageRunView;
  executing: boolean;
  onSetIncluded: (artifactId: string, included: boolean) => void;
  onOpenApproval: () => void;
  onReject: () => void;
  onExecute: () => void;
}>) {
  const action = packageView.action!;
  return <article className={conversationStyles.event} data-kind="proposed_action" data-state="requires_teacher_input"><span className={conversationStyles.eventMark}><ShieldCheck aria-hidden="true" size={15} /></span><div className={conversationStyles.eventBody}><strong>{action.id.includes('retry') ? '重试失败项保存提案' : '保存课程方案包到 ClassIn'}</strong><p>{action.target.label}</p><section className={styles.packageAction}><div>{packageView.run.artifacts.map((artifact) => <label key={artifact.id}><input type="checkbox" checked={action.artifactRefs.some(({ id }) => id === artifact.id)} disabled={!event.allowedCommands.includes('set_package_item_included') || !['ready', 'excluded'].includes(artifact.state)} onChange={(event) => onSetIncluded(artifact.id, event.target.checked)} /><span>{artifact.title}</span><small>{artifact.state === 'written_back' ? '已成功，不重复执行' : artifact.state === 'waiting' ? '等待依赖' : artifact.state === 'failed' ? '需先修复' : artifact.state === 'excluded' ? '本次不保存' : artifact.version}</small></label>)}</div><dl><div><dt>变更</dt><dd>{action.difference}</dd></div><div><dt>权限与风险</dt><dd>{action.permission === 'allowed' ? '允许写入' : '无权限'} · {action.risk === 'medium' ? '中风险' : action.risk === 'low' ? '低风险' : '高风险'} · {action.reversible ? '可撤销' : '不可撤销'}</dd></div></dl>{executing ? <p role="status"><LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={14} />正在执行对象级写回</p> : packageView.receipt ? <p>已执行 · 结果见下方回执</p> : action.status === 'approved' ? <p>已批准 · 尚未执行</p> : null}<div className={conversationStyles.cardActions}>{event.allowedCommands.includes('approve_action') ? <><button type="button" onClick={onReject}>取消保存</button><button className={conversationStyles.primary} type="button" onClick={onOpenApproval}>确认执行</button></> : event.allowedCommands.includes('execute_action') && !executing ? <button className={conversationStyles.primary} type="button" onClick={onExecute}>执行已批准方案包</button> : null}</div></section></div></article>;
}

function PackageReceiptEvent({ event, receipt, artifacts, sequence, onRetry }: Readonly<{ event: ConversationRunEvent; receipt: PackageExecutionReceipt; artifacts: readonly PackageArtifact[]; sequence: number; onRetry: () => void }>) {
  const title = receipt.status === 'success' ? '课程方案包执行完成' : receipt.status === 'partial_success' ? '课程方案包部分成功' : '课程方案包写回需要处理';
  return <article className={conversationStyles.event} data-kind="receipt" data-state={receipt.status === 'success' ? 'completed' : 'failed'}><span className={conversationStyles.eventMark}>{receipt.status === 'success' ? <CheckCircle2 aria-hidden="true" size={15} /> : <CircleAlert aria-hidden="true" size={15} />}</span><div className={conversationStyles.eventBody}><span className={conversationStyles.truthMarker}>{receipt.truthLabel}</span><strong>{title}</strong><p>第 {sequence} 次执行结果 · {receipt.result.replace('[模拟]', '')}</p><div className={styles.receiptItems}>{receipt.items.map((item) => <div data-result={item.result} key={item.artifactId}><span>{artifacts.find(({ id }) => id === item.artifactId)?.title ?? '课程产物'}</span><strong>{item.result === 'not_executed' && artifacts.find(({ id }) => id === item.artifactId)?.state === 'written_back' ? '已成功，本次未重复执行' : RESULT_LABELS[item.result]}</strong></div>)}</div>{event.allowedCommands.includes('retry_failed') ? <button className={styles.retryButton} type="button" onClick={onRetry}>修改并重试失败项</button> : null}</div></article>;
}
