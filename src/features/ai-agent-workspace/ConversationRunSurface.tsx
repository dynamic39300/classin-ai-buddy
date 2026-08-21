import { CheckCircle2, ChevronDown, Download, Expand, FileText, LoaderCircle, PanelRight, Pencil, Save, ShieldCheck, Sparkles, WandSparkles, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { WritebackScenario } from '@contracts/workbuddy/classin-writeback';
import type { ConversationRunEvent, ConversationRunProgress } from '@contracts/workbuddy/conversation-run';
import type { CoursewareArtifactDraft } from '@domain/workbuddy/course-production';
import { CoreContextPanel } from './CoreContextPanel';
import { WorkBuddyModalDialog } from './WorkBuddyModalDialog';
import type { CoursewareExperienceState } from './conversation-run-experience';
import type { CoursewareRunView } from './workbuddy-course-production-view';
import { useConversationRun } from './use-conversation-run';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './ConversationRunSurface.module.css';

function projectExperience(progress: ConversationRunProgress): CoursewareExperienceState {
  if (progress.status === 'running') return Object.freeze({ status: 'running', activeIndex: progress.activeIndex, completedCount: progress.completedCount });
  if (progress.status === 'stopped') return Object.freeze({ status: 'stopped', completedCount: progress.completedCount });
  if (progress.status === 'completed') return Object.freeze({ status: 'completed', completedCount: progress.completedCount });
  return Object.freeze({ status: 'idle' });
}

function versionLabel(version: string): string {
  const match = version.match(/-v(\d+)$/);
  return match ? `v${match[1]}` : '当前版本';
}

function targetVersionLabel(label: string, version: string): string {
  return `${label.split(' / ').at(-1) ?? '课程对象'} · ${versionLabel(version)}`;
}

export function ConversationRunSurface() {
  const workspace = useWorkBuddyWorkspace();
  const { coursewareView, replanScope, writebackScenario } = workspace.courseware;
  const contextCount = workspace.context.coursewareContextView?.includedCount ?? workspace.context.contextView.includedCount;
  const runRef = coursewareView?.run.id ?? 'missing-courseware-run';
  const { projection, dispatch } = useConversationRun(runRef);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recoveryReviewMode = searchParams.get('review') === 'recovery';
  const [lesson, setLesson] = useState('lesson-1');
  const [otherLesson, setOtherLesson] = useState('');
  const [duration, setDuration] = useState('45');
  const [textbook, setTextbook] = useState('人教版');
  const [style, setStyle] = useState('简约探究');
  const [newEventCount, setNewEventCount] = useState(0);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const previousEventCountRef = useRef(0);
  const experience = projection ? projectExperience(projection.presentation.progress) : Object.freeze({ status: 'idle' as const });
  const visibleEventCount = (projection?.events.length ?? 0) + Number(projection?.presentation.replanPending);
  useLayoutEffect(() => {
    const addedCount = Math.max(0, visibleEventCount - previousEventCountRef.current);
    previousEventCountRef.current = visibleEventCount;
    const timeline = timelineRef.current;
    if (!timeline || addedCount === 0) return;
    if (followingRef.current) {
      timeline.scrollTop = timeline.scrollHeight;
      setNewEventCount(0);
      return;
    }
    setNewEventCount((current) => current + addedCount);
  }, [visibleEventCount]);

  if (!coursewareView || !projection) return null;

  const runStatusLabel = experience.status === 'running'
    ? '执行中'
    : experience.status === 'stopped' ? '已停止' : coursewareView.run.statusLabel;
  const closeApprovalDialog = () => setApprovalDialogOpen(false);
  const { inspectorOpen, inspectorMode, composerDraft, executingAction, replanPending } = projection.presentation;
  const executeAction = () => dispatch({ type: 'execute_action' });

  return (
    <section className={styles.page} data-inspector-open={inspectorOpen} aria-labelledby="conversation-run-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="conversation-run-title">{projection.title}</h1><span>{runStatusLabel}</span><small className={styles.truthMarker} aria-label="当前为固定体验数据">[模拟] 体验环境</small></div>
          <div className={styles.headerActions}>{recoveryReviewMode ? <label className={styles.recoveryHarness}>恢复路径验收<select aria-label="恢复路径验收场景" value={writebackScenario} onChange={(event) => dispatch({ type: 'set_scenario', scenario: event.target.value as WritebackScenario })}><option value="success">正常保存</option><option value="permission_denied">无写入权限</option><option value="version_conflict">目标版本已更新</option><option value="recoverable_failure">服务暂时不可用</option><option value="timeout">执行等待超时</option></select></label> : null}<button type="button" aria-pressed={inspectorOpen && inspectorMode === 'context'} onClick={() => dispatch({ type: 'set_inspector', open: true, mode: 'context' })}>上下文 · {contextCount}</button><button type="button" aria-pressed={inspectorOpen && inspectorMode === 'output'} disabled={!coursewareView.run.artifact} onClick={() => dispatch({ type: 'set_inspector', open: true, mode: 'output' })}>产出 · {projection.presentation.outputCount}{projection.presentation.unreadOutputCount ? ` · ${projection.presentation.unreadOutputCount} 新` : ''}</button><button type="button" aria-pressed={inspectorOpen} onClick={() => dispatch({ type: 'set_inspector', open: !inspectorOpen })}>
            <PanelRight aria-hidden="true" size={16} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}
          </button></div>
        </header>

        <div className={styles.timeline} role="feed" aria-label="Agent 任务时间线" ref={timelineRef} onScroll={(scrollEvent) => {
          const timeline = scrollEvent.currentTarget;
          followingRef.current = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 40;
          if (followingRef.current) setNewEventCount(0);
        }}>
          {projection.events.map((event) => {
            if (event.kind === 'capability_call') return <CapabilityCallCard event={event} key={event.id} />;
            return (
            <article className={styles.event} data-kind={event.kind} data-state={event.state} aria-posinset={event.sequence} aria-setsize={projection.events.length} key={event.id}>
              <span className={styles.eventMark}><Sparkles aria-hidden="true" size={15} /></span>
              <div className={styles.eventBody}>
                <strong>{event.title}</strong><p>{event.summary}</p>
                {event.kind === 'clarification_request' ? (
                  <form className={styles.clarification} onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    dispatch({
                      type: 'submit_clarification',
                      durationMinutes: Number(duration),
                      teachingApproach: `${style} · ${lesson === 'lesson-1' ? '第1课时' : lesson === 'lesson-2' ? '第2课时' : lesson === 'lesson-3' ? '第3课时' : otherLesson.trim()} · ${textbook}`,
                    });
                  }}>
                    <div className={styles.confirmationHeader}><span>需要您的确认</span><small>第 1 步，共 4 步</small></div>
                    <fieldset><legend>课时安排</legend>
                      <label><input type="radio" name="lesson" value="lesson-1" checked={lesson === 'lesson-1'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 1 课时（新授入门）</label>
                      <label><input type="radio" name="lesson" value="lesson-2" checked={lesson === 'lesson-2'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 2 课时（进阶探究）</label>
                      <label><input type="radio" name="lesson" value="lesson-3" checked={lesson === 'lesson-3'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 3 课时（综合应用）</label>
                      <label><input type="radio" name="lesson" value="other" checked={lesson === 'other'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />其他</label>
                      {lesson === 'other' ? <input required aria-label="其他课时安排" value={otherLesson} placeholder="请输入课时安排" onChange={(changeEvent) => setOtherLesson(changeEvent.target.value)} /> : null}
                    </fieldset>
                    <div className={styles.fieldGrid}>
                      <label>课件时长<select aria-label="课件时长" value={duration} onChange={(changeEvent) => setDuration(changeEvent.target.value)}><option value="40">40 分钟</option><option value="45">45 分钟</option><option value="90">90 分钟</option></select></label>
                      <label>教材版本<select aria-label="教材版本" value={textbook} onChange={(changeEvent) => setTextbook(changeEvent.target.value)}><option>人教版</option><option>北师大版</option><option>校本教材</option></select></label>
                      <label>课件风格<select aria-label="课件风格" value={style} onChange={(changeEvent) => setStyle(changeEvent.target.value)}><option>简约探究</option><option>图像引导</option><option>板书演绎</option></select></label>
                    </div>
                    <div className={styles.cardActions}>{event.allowedCommands.includes('cancel') ? <button type="button" onClick={() => dispatch({ type: 'cancel' })}>取消任务</button> : null}{event.allowedCommands.includes('confirm_clarification') ? <button type="button" onClick={() => dispatch({ type: 'confirm_clarification' })}>跳过</button> : null}{event.allowedCommands.includes('submit_clarification') ? <button className={styles.primary} type="submit">提交确认</button> : null}</div>
                  </form>
                ) : null}
                {event.kind === 'plan' && event.state !== 'superseded' ? (
                  <section className={styles.plan} aria-label="智能课件执行计划">
                    <ol>{coursewareView.run.plan.map((step) => <li key={step.id}><span>{step.title}</span><small>{step.capabilitySummary}</small><em>预期：{step.expectedOutput}</em></li>)}</ol>
                    <p>等待点：教师确认计划</p>
                    {event.allowedCommands.length && experience.status === 'idle' ? <div className={styles.cardActions}>{event.allowedCommands.includes('cancel') ? <button type="button" onClick={() => dispatch({ type: 'cancel' })}>取消任务</button> : null}{event.allowedCommands.includes('revise_plan') ? <button type="button" onClick={() => dispatch({ type: 'revise_plan' })}>返回修改</button> : null}{event.allowedCommands.includes('start_plan') ? <button className={styles.primary} type="button" onClick={() => dispatch({ type: 'start_plan' })}>开始执行计划</button> : null}</div> : null}
                  </section>
                ) : null}
                {event.kind === 'artifact' && event.state !== 'superseded' ? <button className={styles.artifactLink} type="button" onClick={() => dispatch({ type: 'set_inspector', open: true, mode: 'output' })}><FileText aria-hidden="true" size={15} />打开智能课件产出</button> : null}
                {event.kind === 'proposed_action' && coursewareView.action?.id === event.id ? <CoursewareActionCard
                  action={coursewareView.action}
                  allowedCommands={event.allowedCommands}
                  executing={executingAction}
                  blockedByReceipt={Boolean(coursewareView.receipt)}
                  onOpenApproval={() => setApprovalDialogOpen(true)}
                  onReject={() => dispatch({ type: 'reject_action' })}
                  onExecute={executeAction}
                /> : null}
                {event.kind === 'receipt' && coursewareView.receipt?.id === event.id ? <CoursewareReceiptCard receipt={coursewareView.receipt} allowedCommands={event.allowedCommands} onRecover={() => dispatch({ type: 'recover_action' })} onRetry={executeAction} /> : null}
              </div>
            </article>
            );
          })}
          {newEventCount > 0 ? <button className={styles.newEvents} type="button" onClick={() => {
            followingRef.current = true;
            setNewEventCount(0);
            timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: 'smooth' });
          }}>新增 {newEventCount} 条</button> : null}
          {replanPending ? <article className={styles.event} data-kind="system" data-state="requires_teacher_input">
            <span className={styles.eventMark}><ShieldCheck aria-hidden="true" size={15} /></span>
            <div className={styles.eventBody}><strong>教学范围变化需要重新规划</strong><p>这会生成新的核心上下文快照与执行计划，旧计划、过程和产物会保留为历史证据。</p><dl className={styles.impactList}><div><dt>当前范围</dt><dd>{replanScope.previousLabel}</dd></div><div><dt>新范围</dt><dd>{replanScope.nextLabel}</dd></div><div><dt>受影响步骤</dt><dd>目标理解、教学结构、课件组装、质量检查</dd></div><div><dt>保留内容</dt><dd>旧 ContextSnapshot、Plan、过程、Artifact、Action 与 Receipt</dd></div></dl><div className={styles.cardActions}><button type="button" onClick={() => dispatch({ type: 'dismiss_replan' })}>保留当前范围</button><button className={styles.primary} type="button" onClick={() => dispatch({ type: 'confirm_replan' })}>确认并重新规划</button></div></div>
          </article> : null}
        </div>
        <div className={styles.runComposer} role="group" aria-label="任务补充输入">
          <textarea aria-label="向 Agent 补充要求" value={composerDraft} placeholder="补充要求、调整任务或继续追问…" onChange={(event) => dispatch({ type: 'set_composer_draft', text: event.target.value })} />
          <div><span>{experience.status === 'running' ? '任务执行中，可补充未开始步骤' : experience.status === 'stopped' ? '任务已停止，可继续执行' : '补充内容会记录在当前任务中'}</span>
            {experience.status === 'running' ? <button type="button" onClick={() => dispatch({ type: 'stop' })}>停止执行</button> : null}
            {experience.status === 'stopped' ? <button type="button" onClick={() => dispatch({ type: 'resume' })}>继续执行</button> : null}
            <button className={styles.primary} type="button" aria-label="发送补充要求" disabled={!composerDraft.trim()} onClick={() => {
              const message = composerDraft.trim();
              dispatch({ type: 'supplement', text: message, materialScopeChange: /主教学范围|二次函数|改为高一（2）班/.test(message) });
            }}>发送</button>
          </div>
        </div>
      </section>

        <aside className={styles.inspector} aria-label="任务辅助区" hidden={!inspectorOpen}>
          <div className={styles.tabs} role="tablist" aria-label="任务辅助区视图">
            <button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => dispatch({ type: 'set_inspector', mode: 'context' })}>上下文</button>
            <button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={!coursewareView.run.artifact} onClick={() => dispatch({ type: 'set_inspector', mode: 'output' })}>产出 · {projection.presentation.outputCount}{projection.presentation.unreadOutputCount ? ` · ${projection.presentation.unreadOutputCount} 新` : ''}</button>
          </div>
          <div hidden={inspectorMode !== 'context'}><CoreContextPanel readOnly mode="courseware" inspectorState={{ expandedIds: projection.presentation.contextExpandedIds, query: projection.presentation.contextQuery, scrollTop: projection.presentation.contextScrollTop }} onInspectorStateChange={(patch) => dispatch({ type: 'set_context_inspector_state', ...patch })} onClose={() => dispatch({ type: 'set_inspector', open: false })} /></div>
          <div hidden={inspectorMode !== 'output'}>{coursewareView.run.artifact ? (
            <CoursewareOutput
              artifact={coursewareView.run.artifact}
              artifactHistory={coursewareView.run.artifactHistory}
              sourceStepLabel={coursewareView.run.plan.find(({ id }) => id === coursewareView.run.artifact?.sourceStepId)?.title ?? '组装课件初稿'}
              inspectorState={{
                focused: projection.presentation.artifactFocused,
                editing: projection.presentation.artifactEditing,
                editDraft: projection.presentation.artifactEditDraft,
                selectedBlock: projection.presentation.artifactSelectedBlock,
                previewPage: projection.presentation.artifactPreviewPage,
                scrollTop: projection.presentation.artifactScrollTop,
              }}
              onInspectorStateChange={(patch) => dispatch({ type: 'set_artifact_inspector_state', ...patch })}
              reviewStatus={coursewareView.run.reviewStatus}
              hasAction={Boolean(coursewareView.action)}
              hasReceipt={Boolean(coursewareView.receipt)}
              derivedPackageRunRef={coursewareView.run.derivedPackageRunRef}
              onRevise={(input) => dispatch({ type: 'revise_artifact', instruction: input.instruction, changes: input.changes })}
              onApproveArtifact={() => dispatch({ type: 'approve_artifact' })}
              onProposeSave={() => dispatch({ type: 'propose_action' })}
              onDerivePackage={() => {
                const result = dispatch({ type: 'derive_package' });
                if (result.resultRef) navigate(`/teacher/ai-agent/runs/${result.resultRef}`);
              }}
            />
          ) : <section className={styles.emptyOutput}><strong>产出将在生成后显示</strong><p>任务过程继续保留在左侧时间线。</p></section>}</div>
        </aside>
      {approvalDialogOpen && coursewareView.action ? <WorkBuddyModalDialog className={styles.approvalDialog} labelledBy="approval-dialog-title" onClose={closeApprovalDialog}><section>
        <header><ShieldCheck aria-hidden="true" size={18} /><div><span>教师确认</span><h2 id="approval-dialog-title">确认保存到 ClassIn</h2></div></header>
        <p>{coursewareView.action.target.label}</p>
        <dl><div><dt>来源</dt><dd>来源课件 {coursewareView.action.artifactRef.version}</dd></div><div><dt>变更</dt><dd>{coursewareView.action.difference}</dd></div><div><dt>影响</dt><dd>{coursewareView.action.impact}</dd></div><div><dt>版本</dt><dd>{targetVersionLabel(coursewareView.action.target.label, coursewareView.action.target.expectedVersion)}</dd></div></dl>
        <footer><button type="button" autoFocus onClick={closeApprovalDialog}>返回检查</button><button className={styles.primary} type="button" onClick={() => { dispatch({ type: 'approve_action' }); setApprovalDialogOpen(false); }}>批准保存</button></footer>
      </section></WorkBuddyModalDialog> : null}
    </section>
  );
}

function CapabilityCallCard({ event }: Readonly<{ event: ConversationRunEvent }>) {
  const [expanded, setExpanded] = useState(event.state === 'running');
  const isExpanded = event.state === 'running' || expanded;
  const statusLabel = event.state === 'running' ? '运行中' : event.state === 'completed' ? '已完成' : '等待执行';
  const detail = event.detail;
  return (
    <article className={styles.event} data-kind="capability_call" data-state={event.state} aria-label={`${event.title} · ${statusLabel}`}>
      <span className={styles.eventMark}>{event.state === 'running' ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={15} /> : event.state === 'completed' ? <CheckCircle2 aria-hidden="true" size={15} /> : <Sparkles aria-hidden="true" size={15} />}</span>
      <div className={styles.eventBody}>
        <div className={styles.callHeading}><div><strong>{event.title}</strong><p>{detail?.capabilityLabel ?? '智能课件能力'} · {detail?.purpose ?? event.summary}</p></div><span data-state={event.state}>{statusLabel}</span></div>
        <div className={styles.callResult}><span>预期产出</span><strong>{detail?.outputSummary ?? event.summary}</strong><small>{detail?.elapsedLabel ?? statusLabel}</small></div>
        <button className={styles.evidenceToggle} type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => !current)}>查看技术证据 <ChevronDown aria-hidden="true" size={14} /></button>
        {isExpanded ? <dl className={styles.evidence}>
          <div><dt>输入</dt><dd>{detail?.inputSummary ?? '已确认的任务输入'}</dd></div>
          <div><dt>上下文投影</dt><dd>{detail?.contextLabels.length ? detail.contextLabels.join(' · ') : '仅使用该能力所需的最小上下文'}{detail?.excludedSensitiveCount ? ` · 已排除 ${detail.excludedSensitiveCount} 项敏感信息` : ''}</dd></div>
          <div><dt>能力标识</dt><dd>{event.objectRefs.find(({ type }) => type === 'capability')?.id ?? '未标记'}</dd></div>
        </dl> : null}
      </div>
    </article>
  );
}

function CoursewareOutput({
  artifact, artifactHistory, sourceStepLabel, inspectorState, reviewStatus, hasAction, hasReceipt, derivedPackageRunRef,
  onRevise, onApproveArtifact, onProposeSave, onDerivePackage, onInspectorStateChange,
}: Readonly<{
  artifact: CoursewareArtifactDraft;
  artifactHistory: readonly CoursewareArtifactDraft[];
  sourceStepLabel: string;
  inspectorState: Readonly<{ focused: boolean; editing: boolean; editDraft: string; selectedBlock: string; previewPage: number; scrollTop: number }>;
  reviewStatus: 'pending' | 'approved' | 'not_available';
  hasAction: boolean;
  hasReceipt: boolean;
  derivedPackageRunRef: string | null;
  onRevise: (input: Readonly<{ instruction: string; changes: readonly string[] }>) => void;
  onApproveArtifact: () => void;
  onProposeSave: () => void;
  onDerivePackage: () => void;
  onInspectorStateChange: (patch: Readonly<{ focused?: boolean; editing?: boolean; editDraft?: string; selectedBlock?: string; previewPage?: number; scrollTop?: number }>) => void;
}>) {
  const { editing, focused, selectedBlock, editDraft: instruction, previewPage, scrollTop } = inspectorState;
  const [toolStatus, setToolStatus] = useState('');
  const outputRef = useRef<HTMLElement>(null);
  const focusTriggerRef = useRef<HTMLButtonElement>(null);
  const wasFocusedRef = useRef(false);
  useLayoutEffect(() => {
    if (focused) {
      wasFocusedRef.current = true;
      outputRef.current?.focus();
    } else if (wasFocusedRef.current) {
      wasFocusedRef.current = false;
      focusTriggerRef.current?.focus();
    }
  }, [focused]);
  useLayoutEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = scrollTop;
  }, [scrollTop]);
  return (
    <section ref={outputRef} tabIndex={focused ? -1 : undefined} className={styles.output} role="region" aria-label="智能课件产出" data-focus={focused} onKeyDown={(event) => { if (event.key === 'Escape' && focused) onInspectorStateChange({ focused: false }); }} onScroll={(event) => onInspectorStateChange({ scrollTop: event.currentTarget.scrollTop })}>
      <header><div><span>{editing ? '编辑中' : '智能课件'}</span><h2>{artifact.title}</h2></div><div className={styles.outputTools}>
        {editing ? <><button type="button" onClick={() => { onInspectorStateChange({ editing: false }); setToolStatus(`课件 ${artifact.version} 草稿已保存；未写入 ClassIn。`); }}><Save aria-hidden="true" size={14} />保存草稿</button><button type="button" onClick={() => onInspectorStateChange({ editing: false })}><X aria-hidden="true" size={14} />退出编辑</button></> : <>
          <button ref={focusTriggerRef} type="button" aria-pressed={focused} onClick={() => onInspectorStateChange({ focused: !focused })}><Expand aria-hidden="true" size={14} />{focused ? '退出聚焦' : '聚焦预览'}</button>
          <button type="button" onClick={() => setToolStatus('当前课件草稿将在完成 ClassIn 保存后提供下载。')}><Download aria-hidden="true" size={14} />下载</button>
          <button type="button" onClick={() => { onInspectorStateChange({ editing: true }); setToolStatus(''); }}><Pencil aria-hidden="true" size={14} />编辑课件</button>
        </>}
      </div><div className={styles.outputMeta}>{artifactHistory.map(({ version }) => <span data-current={version === artifact.version} key={version}>{version}</span>)}<span>{artifact.pageCount} 页</span></div></header>
      <div className={styles.slidePreview} aria-label="课件页面预览">
        <span>{String(previewPage).padStart(2, '0')} / {artifact.pageCount}</span>
        <div className={styles.slideCanvas} data-editing={editing}><small>高中数学 · 函数的性质</small><h3>从图像变化理解函数单调性</h3><p>观察图像 · 描述变化 · 形成定义</p><div className={styles.collisionDiagram}><i /><b>x₁ &lt; x₂ ⇒ f(x₁) &lt; f(x₂)</b><i /></div>{editing ? <button className={styles.selectedBlock} type="button" aria-pressed={selectedBlock === '第 6 页 · 图像辨析'} onClick={() => onInspectorStateChange({ selectedBlock: '第 6 页 · 图像辨析' })}>第 6 页 · 图像辨析</button> : null}</div>
      </div>
      {editing ? <section className={styles.aiEditor} aria-label="AI 修改课件"><div><WandSparkles aria-hidden="true" size={16} /><strong>AI 修改</strong><span>已选择：{selectedBlock}</span></div><label>修改要求<textarea aria-label="AI 修改要求" value={instruction} onChange={(event) => onInspectorStateChange({ editDraft: event.target.value })} /></label><button type="button" disabled={!instruction.trim()} onClick={() => {
        onRevise({ instruction, changes: ['替换第 6 页案例', '新增易错点辨析页', '其他页面保持不变'] });
        setToolStatus('AI 修改已生成新的课件版本；请保存草稿并重新复查。');
      }}>应用 AI 修改</button></section> : null}
      {artifact.changeSummary ? <section className={styles.changeSummary} aria-label={`${artifact.version} 修改摘要`}><strong>{artifact.version} 修改摘要</strong><ul>{artifact.changeSummary.map((change) => <li key={change}>{change}</li>)}</ul></section> : null}
      <dl className={styles.outputFacts}><div><dt>来源步骤</dt><dd>{sourceStepLabel}</dd></div><div><dt>质量检查</dt><dd>{artifact.validationSummary}</dd></div><div><dt>当前状态</dt><dd>课件草稿 · 未写入 ClassIn</dd></div></dl>
      {toolStatus ? <p className={styles.toolStatus} role="status">{toolStatus}</p> : null}
      <footer className={styles.outputActions}>
        {reviewStatus === 'pending' ? <button className={styles.primary} type="button" onClick={onApproveArtifact}>确认课件可用于后续任务</button> : null}
        {reviewStatus === 'approved' && !hasAction && !hasReceipt ? <button className={styles.primary} type="button" onClick={onProposeSave}>保存到 ClassIn</button> : null}
        {reviewStatus === 'approved' && derivedPackageRunRef ? <Link to={`/teacher/ai-agent/runs/${derivedPackageRunRef}`}>打开已派生课程方案包</Link> : null}
        {reviewStatus === 'approved' && !derivedPackageRunRef ? <button type="button" onClick={onDerivePackage}>基于此课件生成课程方案包</button> : null}
        {hasReceipt ? <span>执行回执已返回任务时间线</span> : hasAction ? <span>保存流程已进入任务时间线</span> : null}
      </footer>
    </section>
  );
}

function CoursewareActionCard({ action, allowedCommands, executing, blockedByReceipt, onOpenApproval, onReject, onExecute }: Readonly<{
  action: NonNullable<CoursewareRunView['action']>;
  allowedCommands: ConversationRunEvent['allowedCommands'];
  executing: boolean;
  blockedByReceipt: boolean;
  onOpenApproval: (trigger: HTMLButtonElement) => void;
  onReject: () => void;
  onExecute: () => void;
}>) {
  const expiryLabel = `${action.expiresAt.slice(5, 7)}月${action.expiresAt.slice(8, 10)}日 ${action.expiresAt.slice(11, 16)} 前`;
  return <section className={styles.actionCard} aria-label="ClassIn 保存提案">
    <dl><div><dt>目标位置</dt><dd>{action.target.label}</dd></div><div><dt>变更内容</dt><dd>{action.difference}</dd></div><div><dt>写入判断</dt><dd>{action.risk === 'low' ? '低风险' : action.risk === 'medium' ? '中风险' : '高风险'} · {action.permission === 'allowed' ? '允许写入' : '无写入权限'} · {action.reversible ? '可撤销' : '不可撤销'}</dd></div><div><dt>目标版本</dt><dd>{targetVersionLabel(action.target.label, action.target.expectedVersion)}</dd></div><div><dt>确认有效期</dt><dd>{expiryLabel}</dd></div></dl>
    {executing ? <p className={styles.executionStatus} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={14} />正在执行</p> : blockedByReceipt ? <p className={styles.executionStatus}>已执行 · 结果见下方回执</p> : action.status === 'approved' ? <p className={styles.executionStatus}>已批准 · 尚未执行</p> : null}
    <div className={styles.cardActions}>{allowedCommands.includes('approve_action') ? <><button type="button" onClick={onReject}>取消保存</button><button className={styles.primary} type="button" onClick={(event) => onOpenApproval(event.currentTarget)}>确认执行</button></> : allowedCommands.includes('execute_action') && !executing && !blockedByReceipt ? <button className={styles.primary} type="button" onClick={onExecute}>执行已批准动作</button> : null}</div>
  </section>;
}

function CoursewareReceiptCard({ receipt, allowedCommands, onRecover, onRetry }: Readonly<{
  receipt: NonNullable<CoursewareRunView['receipt']>;
  allowedCommands: ConversationRunEvent['allowedCommands'];
  onRecover: () => void;
  onRetry: () => void;
}>) {
  if (receipt.status !== 'success') {
    const title = receipt.status === 'permission_denied' ? '保存位置没有写入权限' : receipt.status === 'version_conflict' ? '目标版本已经更新' : receipt.status === 'timeout' ? '执行等待超时' : '保存服务暂时不可用';
    const recovery = receipt.status === 'permission_denied' ? '改用教师草稿区并重新确认' : receipt.status === 'version_conflict' ? '采用当前版本并重新确认' : '使用同一审批安全重试';
    return <section className={styles.receiptCard} data-state="failed" aria-label="ClassIn 执行回执"><span className={styles.truthMarker}>{receipt.truthLabel}</span><strong>{title}</strong><p>{receipt.result.replace('[模拟]', '')}</p><dl><div><dt>未执行范围</dt><dd>所选课程单元</dd></div><div><dt>恢复方式</dt><dd>{recovery}</dd></div>{receipt.status === 'version_conflict' ? <div><dt>版本比较</dt><dd>{versionLabel(receipt.expectedVersion)} → {versionLabel(receipt.currentVersion)}</dd></div> : null}</dl>{allowedCommands.includes('recover_action') || allowedCommands.includes('execute_action') ? <button className={styles.recoveryButton} type="button" onClick={allowedCommands.includes('recover_action') ? onRecover : onRetry}>{recovery}</button> : null}</section>;
  }
  return <section className={styles.receiptCard} aria-label="ClassIn 执行回执"><span className={styles.truthMarker}>{receipt.truthLabel}</span><div><CheckCircle2 aria-hidden="true" size={18} /><strong>{receipt.result.replace('[模拟]', '')}</strong></div><p>只有执行回执能证明 ClassIn 已接受本次保存。</p><dl><div><dt>课程对象</dt><dd>{receipt.object.label}</dd></div><div><dt>对象版本</dt><dd>{receipt.object.version}</dd></div><div><dt>执行时间</dt><dd>{receipt.executedAt}</dd></div></dl><Link to={receipt.object.returnUrl}>打开 ClassIn 课程对象</Link></section>;
}
