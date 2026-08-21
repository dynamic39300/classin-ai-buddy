import { CheckCircle2, ChevronDown, Download, Expand, FileText, LoaderCircle, PanelRight, Pencil, Save, ShieldCheck, Sparkles, WandSparkles, X } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CoursewareArtifactDraft } from '@domain/workbuddy/course-production';
import { CoreContextPanel } from './CoreContextPanel';
import {
  advanceCoursewareExperience,
  createCoursewareExperience,
  projectCoursewareExperienceEvents,
  startCoursewareExperience,
  type CoursewareExperienceEvent,
} from './conversation-run-experience';
import { projectCoursewareConversationRun } from './conversation-run-projection';
import type { CoursewareRunView } from './workbuddy-course-production-view';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './ConversationRunSurface.module.css';

type InspectorMode = 'context' | 'output';

export function ConversationRunSurface() {
  const {
    coursewareView,
    updateCoursewareTaskBrief,
    confirmCoursewareTaskBrief,
    reviseCoursewareTaskBrief,
    executeCoursewareTaskPlan,
    approveCoursewareArtifact,
    reviseCoursewareArtifact,
    proposeCoursewareSave,
    approveCoursewareSave,
    rejectCoursewareSave,
    executeApprovedCoursewareSave,
  } = useWorkBuddyWorkspace().courseware;
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(() => coursewareView?.run.artifact ? 'output' : 'context');
  const [lesson, setLesson] = useState('lesson-1');
  const [otherLesson, setOtherLesson] = useState('');
  const [duration, setDuration] = useState('45');
  const [textbook, setTextbook] = useState('人教版');
  const [style, setStyle] = useState('简约探究');
  const [experience, setExperience] = useState(() => createCoursewareExperience([]));
  const [newEventCount, setNewEventCount] = useState(0);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [executingAction, setExecutingAction] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const previousEventCountRef = useRef(0);
  const executionCommittedRef = useRef(false);
  const approvalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const projection = useMemo(
    () => coursewareView ? projectCoursewareConversationRun(coursewareView) : null,
    [coursewareView],
  );
  const experienceEvents = useMemo(
    () => coursewareView ? projectCoursewareExperienceEvents(experience, coursewareView.run.plan, coursewareView.projections) : [],
    [coursewareView, experience],
  );

  useEffect(() => {
    if (experience.status !== 'running') return undefined;
    const timeout = window.setTimeout(() => {
      const next = advanceCoursewareExperience(experience, coursewareView?.run.plan.length ?? 0);
      setExperience(next);
      if (next.status === 'completed' && !executionCommittedRef.current) {
        executionCommittedRef.current = true;
        setInspectorMode('output');
        executeCoursewareTaskPlan();
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [coursewareView?.run.plan.length, executeCoursewareTaskPlan, experience]);

  const visibleEventCount = (projection?.events.length ?? 0) + experienceEvents.length;
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

  const renderExperienceEvents = experience.status !== 'idle';
  const closeApprovalDialog = () => {
    setApprovalDialogOpen(false);
    requestAnimationFrame(() => approvalTriggerRef.current?.isConnected && approvalTriggerRef.current.focus());
  };

  return (
    <section className={styles.page} data-inspector-open={inspectorOpen} aria-labelledby="conversation-run-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="conversation-run-title">{projection.title}</h1><span>{coursewareView.run.statusLabel}</span></div>
          <button type="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((open) => !open)}>
            <PanelRight aria-hidden="true" size={16} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}
          </button>
        </header>

        <div className={styles.timeline} role="feed" aria-label="Agent 任务时间线" ref={timelineRef} onScroll={(scrollEvent) => {
          const timeline = scrollEvent.currentTarget;
          followingRef.current = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 40;
          if (followingRef.current) setNewEventCount(0);
        }}>
          {projection.events.map((event) => {
            if (renderExperienceEvents && (event.kind === 'process' || event.kind === 'capability_call')) return null;
            return <Fragment key={event.id}>
            <article className={styles.event} data-kind={event.kind} data-state={event.state} aria-posinset={event.sequence} aria-setsize={projection.events.length} key={event.id}>
              <span className={styles.eventMark}><Sparkles aria-hidden="true" size={15} /></span>
              <div className={styles.eventBody}>
                <strong>{event.title}</strong><p>{event.summary}</p>
                {event.kind === 'clarification_request' ? (
                  <form className={styles.clarification} onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    updateCoursewareTaskBrief({
                      durationMinutes: Number(duration),
                      teachingApproach: `${style} · ${lesson === 'lesson-1' ? '第1课时' : lesson === 'lesson-2' ? '第2课时' : '第3课时'} · ${textbook}`,
                    });
                    confirmCoursewareTaskBrief();
                  }}>
                    <div className={styles.confirmationHeader}><span>需要您的确认</span><small>第 1 步，共 4 步</small></div>
                    <fieldset><legend>课时安排</legend>
                      <label><input type="radio" name="lesson" value="lesson-1" checked={lesson === 'lesson-1'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 1 课时（新授入门）</label>
                      <label><input type="radio" name="lesson" value="lesson-2" checked={lesson === 'lesson-2'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 2 课时（进阶探究）</label>
                      <label><input type="radio" name="lesson" value="lesson-3" checked={lesson === 'lesson-3'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />第 3 课时（综合应用）</label>
                      <label><input type="radio" name="lesson" value="other" checked={lesson === 'other'} onChange={(changeEvent) => setLesson(changeEvent.target.value)} />其他</label>
                      {lesson === 'other' ? <input aria-label="其他课时安排" value={otherLesson} placeholder="请输入课时安排" onChange={(changeEvent) => setOtherLesson(changeEvent.target.value)} /> : null}
                    </fieldset>
                    <div className={styles.fieldGrid}>
                      <label>课件时长<select aria-label="课件时长" value={duration} onChange={(changeEvent) => setDuration(changeEvent.target.value)}><option value="40">40 分钟</option><option value="45">45 分钟</option><option value="90">90 分钟</option></select></label>
                      <label>教材版本<select aria-label="教材版本" value={textbook} onChange={(changeEvent) => setTextbook(changeEvent.target.value)}><option>人教版</option><option>北师大版</option><option>校本教材</option></select></label>
                      <label>课件风格<select aria-label="课件风格" value={style} onChange={(changeEvent) => setStyle(changeEvent.target.value)}><option>简约探究</option><option>图像引导</option><option>板书演绎</option></select></label>
                    </div>
                    <div className={styles.cardActions}><button type="button" onClick={confirmCoursewareTaskBrief}>跳过</button><button className={styles.primary} type="submit">提交确认</button></div>
                  </form>
                ) : null}
                {event.kind === 'plan' ? (
                  <section className={styles.plan} aria-label="智能课件执行计划">
                    <ol>{coursewareView.run.plan.map((step) => <li key={step.id}><span>{step.title}</span><small>{step.capabilitySummary}</small><em>预期：{step.expectedOutput}</em></li>)}</ol>
                    <p>等待点：教师确认计划</p>
                    {coursewareView.run.stage === 'awaiting_plan_confirmation' && experience.status === 'idle' ? <div className={styles.cardActions}><button type="button" onClick={reviseCoursewareTaskBrief}>返回修改</button><button className={styles.primary} type="button" onClick={() => setExperience((current) => startCoursewareExperience(current))}>开始执行计划</button></div> : null}
                  </section>
                ) : null}
                {event.kind === 'artifact' ? <button className={styles.artifactLink} type="button" onClick={() => { setInspectorOpen(true); setInspectorMode('output'); }}><FileText aria-hidden="true" size={15} />打开智能课件产出</button> : null}
                {event.kind === 'proposed_action' && coursewareView.action ? <CoursewareActionCard
                  action={coursewareView.action}
                  executing={executingAction}
                  onOpenApproval={(trigger) => { approvalTriggerRef.current = trigger; setApprovalDialogOpen(true); }}
                  onReject={rejectCoursewareSave}
                  onExecute={() => {
                    setExecutingAction(true);
                    window.setTimeout(() => {
                      executeApprovedCoursewareSave();
                      setExecutingAction(false);
                    }, 500);
                  }}
                /> : null}
                {event.kind === 'receipt' && coursewareView.receipt ? <CoursewareReceiptCard receipt={coursewareView.receipt} /> : null}
              </div>
            </article>
            {event.kind === 'plan' ? experienceEvents.map((experienceEvent) => <CapabilityCallCard event={experienceEvent} key={experienceEvent.id} />) : null}
            </Fragment>;
          })}
          {newEventCount > 0 ? <button className={styles.newEvents} type="button" onClick={() => {
            followingRef.current = true;
            setNewEventCount(0);
            timelineRef.current?.scrollTo({ top: timelineRef.current.scrollHeight, behavior: 'smooth' });
          }}>新增 {newEventCount} 条</button> : null}
        </div>
      </section>

      {inspectorOpen ? (
        <aside className={styles.inspector} aria-label="任务辅助区">
          <div className={styles.tabs} role="tablist" aria-label="任务辅助区视图">
            <button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => setInspectorMode('context')}>上下文</button>
            <button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={!coursewareView.run.artifact} onClick={() => setInspectorMode('output')}>产出</button>
          </div>
          {inspectorMode === 'context' ? <CoreContextPanel readOnly mode="courseware" onClose={() => setInspectorOpen(false)} /> : coursewareView.run.artifact ? (
            <CoursewareOutput
              artifact={coursewareView.run.artifact}
              artifactHistory={coursewareView.run.artifactHistory}
              reviewStatus={coursewareView.run.reviewStatus}
              hasAction={Boolean(coursewareView.action)}
              hasReceipt={Boolean(coursewareView.receipt)}
              onRevise={reviseCoursewareArtifact}
              onApproveArtifact={approveCoursewareArtifact}
              onProposeSave={proposeCoursewareSave}
            />
          ) : <section className={styles.emptyOutput}><strong>产出将在生成后显示</strong><p>任务过程继续保留在左侧时间线。</p></section>}
        </aside>
      ) : null}
      {approvalDialogOpen && coursewareView.action ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeApprovalDialog();
      }}><section className={styles.approvalDialog} role="dialog" aria-modal="true" aria-labelledby="approval-dialog-title" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); closeApprovalDialog(); }
      }}>
        <header><ShieldCheck aria-hidden="true" size={18} /><div><span>教师确认</span><h2 id="approval-dialog-title">确认保存到 ClassIn</h2></div></header>
        <p>{coursewareView.action.target.label}</p>
        <dl><div><dt>来源</dt><dd>来源课件 {coursewareView.action.artifactRef.version}</dd></div><div><dt>变更</dt><dd>{coursewareView.action.difference}</dd></div><div><dt>影响</dt><dd>{coursewareView.action.impact}</dd></div><div><dt>版本</dt><dd>{coursewareView.action.target.expectedVersion}</dd></div></dl>
        <footer><button type="button" autoFocus onClick={closeApprovalDialog}>返回检查</button><button className={styles.primary} type="button" onClick={() => { approveCoursewareSave(); setApprovalDialogOpen(false); }}>批准保存</button></footer>
      </section></div> : null}
    </section>
  );
}

function CapabilityCallCard({ event }: Readonly<{ event: CoursewareExperienceEvent }>) {
  const [expanded, setExpanded] = useState(event.state === 'running');
  const isExpanded = event.state === 'running' || expanded;
  const statusLabel = event.state === 'running' ? '运行中' : event.state === 'completed' ? '已完成' : '等待执行';
  return (
    <article className={styles.event} data-kind="capability_call" data-state={event.state} aria-label={`${event.title} · ${statusLabel}`}>
      <span className={styles.eventMark}>{event.state === 'running' ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={15} /> : event.state === 'completed' ? <CheckCircle2 aria-hidden="true" size={15} /> : <Sparkles aria-hidden="true" size={15} />}</span>
      <div className={styles.eventBody}>
        <div className={styles.callHeading}><div><strong>{event.title}</strong><p>{event.capabilityLabel} · {event.purpose}</p></div><span data-state={event.state}>{statusLabel}</span></div>
        <div className={styles.callResult}><span>预期产出</span><strong>{event.outputSummary}</strong><small>{event.elapsedLabel}</small></div>
        <button className={styles.evidenceToggle} type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => !current)}>查看技术证据 <ChevronDown aria-hidden="true" size={14} /></button>
        {isExpanded ? <dl className={styles.evidence}>
          <div><dt>输入</dt><dd>{event.inputSummary}</dd></div>
          <div><dt>上下文投影</dt><dd>{event.contextLabels.length ? event.contextLabels.join(' · ') : '仅使用该能力所需的最小上下文'}{event.excludedSensitiveCount ? ` · 已排除 ${event.excludedSensitiveCount} 项敏感信息` : ''}</dd></div>
          <div><dt>能力标识</dt><dd>{event.capabilityId}</dd></div>
        </dl> : null}
      </div>
    </article>
  );
}

function CoursewareOutput({
  artifact, artifactHistory, reviewStatus, hasAction, hasReceipt, onRevise, onApproveArtifact, onProposeSave,
}: Readonly<{
  artifact: CoursewareArtifactDraft;
  artifactHistory: readonly CoursewareArtifactDraft[];
  reviewStatus: 'pending' | 'approved' | 'not_available';
  hasAction: boolean;
  hasReceipt: boolean;
  onRevise: (input: Readonly<{ instruction: string; changes: readonly string[] }>) => void;
  onApproveArtifact: () => void;
  onProposeSave: () => void;
}>) {
  const [editing, setEditing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState('第 6 页 · 碰撞案例');
  const [instruction, setInstruction] = useState('把第 6 页案例改成更贴近生活的冰壶碰撞，并增加一页易错点辨析。');
  const [toolStatus, setToolStatus] = useState('');
  return (
    <section className={styles.output} role="region" aria-label="智能课件产出" data-focus={focused}>
      <header><div><span>{editing ? '编辑中' : '智能课件'}</span><h2>{artifact.title}</h2></div><div className={styles.outputTools}>
        {editing ? <><button type="button" onClick={() => { setEditing(false); setToolStatus(`课件 ${artifact.version} 草稿已保存；未写入 ClassIn。`); }}><Save aria-hidden="true" size={14} />保存草稿</button><button type="button" onClick={() => setEditing(false)}><X aria-hidden="true" size={14} />退出编辑</button></> : <>
          <button type="button" aria-pressed={focused} onClick={() => setFocused((current) => !current)}><Expand aria-hidden="true" size={14} />{focused ? '退出聚焦' : '聚焦预览'}</button>
          <button type="button" onClick={() => setToolStatus('当前课件草稿将在完成 ClassIn 保存后提供下载。')}><Download aria-hidden="true" size={14} />下载</button>
          <button type="button" onClick={() => { setEditing(true); setToolStatus(''); }}><Pencil aria-hidden="true" size={14} />编辑课件</button>
        </>}
      </div><div className={styles.outputMeta}>{artifactHistory.map(({ version }) => <span data-current={version === artifact.version} key={version}>{version}</span>)}<span>{artifact.pageCount} 页</span></div></header>
      <div className={styles.slidePreview} aria-label="课件页面预览">
        <span>01 / {artifact.pageCount}</span>
        <div className={styles.slideCanvas} data-editing={editing}><small>高中物理 · 动量与碰撞</small><h3>从碰撞实验理解动量守恒</h3><p>观察现象 · 建立模型 · 验证规律</p><div className={styles.collisionDiagram}><i /><b>m₁v₁ + m₂v₂</b><i /></div>{editing ? <button className={styles.selectedBlock} type="button" aria-pressed={selectedBlock === '第 6 页 · 碰撞案例'} onClick={() => setSelectedBlock('第 6 页 · 碰撞案例')}>第 6 页 · 碰撞案例</button> : null}</div>
      </div>
      {editing ? <section className={styles.aiEditor} aria-label="AI 修改课件"><div><WandSparkles aria-hidden="true" size={16} /><strong>AI 修改</strong><span>已选择：{selectedBlock}</span></div><label>修改要求<textarea aria-label="AI 修改要求" value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label><button type="button" disabled={!instruction.trim()} onClick={() => {
        onRevise({ instruction, changes: ['替换第 6 页案例', '新增易错点辨析页', '其他页面保持不变'] });
        setToolStatus('AI 修改已生成新的课件版本；请保存草稿并重新复查。');
      }}>应用 AI 修改</button></section> : null}
      {artifact.changeSummary ? <section className={styles.changeSummary} aria-label={`${artifact.version} 修改摘要`}><strong>{artifact.version} 修改摘要</strong><ul>{artifact.changeSummary.map((change) => <li key={change}>{change}</li>)}</ul></section> : null}
      <dl className={styles.outputFacts}><div><dt>来源步骤</dt><dd>{artifact.sourceStepId}</dd></div><div><dt>质量检查</dt><dd>{artifact.validationSummary}</dd></div><div><dt>当前状态</dt><dd>课件草稿 · 未写入 ClassIn</dd></div></dl>
      {toolStatus ? <p className={styles.toolStatus} role="status">{toolStatus}</p> : null}
      <footer className={styles.outputActions}>{reviewStatus === 'pending' ? <button className={styles.primary} type="button" onClick={onApproveArtifact}>确认课件可用于后续任务</button> : reviewStatus === 'approved' && !hasAction && !hasReceipt ? <button className={styles.primary} type="button" onClick={onProposeSave}>保存到 ClassIn</button> : hasReceipt ? <span>执行回执已返回任务时间线</span> : hasAction ? <span>保存流程已进入任务时间线</span> : null}</footer>
    </section>
  );
}

function CoursewareActionCard({ action, executing, onOpenApproval, onReject, onExecute }: Readonly<{
  action: NonNullable<CoursewareRunView['action']>;
  executing: boolean;
  onOpenApproval: (trigger: HTMLButtonElement) => void;
  onReject: () => void;
  onExecute: () => void;
}>) {
  const expiryLabel = `${action.expiresAt.slice(5, 7)}月${action.expiresAt.slice(8, 10)}日 ${action.expiresAt.slice(11, 16)} 前`;
  return <section className={styles.actionCard} aria-label="ClassIn 保存提案">
    <dl><div><dt>目标位置</dt><dd>{action.target.label}</dd></div><div><dt>变更内容</dt><dd>{action.difference}</dd></div><div><dt>写入判断</dt><dd>{action.risk === 'low' ? '低风险' : action.risk === 'medium' ? '中风险' : '高风险'} · {action.permission === 'allowed' ? '允许写入' : '无写入权限'} · {action.reversible ? '可撤销' : '不可撤销'}</dd></div><div><dt>目标版本</dt><dd>{action.target.expectedVersion}</dd></div><div><dt>确认有效期</dt><dd>{expiryLabel}</dd></div></dl>
    {executing ? <p className={styles.executionStatus} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={14} />正在执行</p> : action.status === 'approved' ? <p className={styles.executionStatus}>已批准 · 尚未执行</p> : null}
    <div className={styles.cardActions}>{action.status === 'proposed' ? <><button type="button" onClick={onReject}>取消保存</button><button className={styles.primary} type="button" onClick={(event) => onOpenApproval(event.currentTarget)}>确认执行</button></> : action.status === 'approved' && !executing ? <button className={styles.primary} type="button" onClick={onExecute}>执行已批准动作</button> : null}</div>
  </section>;
}

function CoursewareReceiptCard({ receipt }: Readonly<{
  receipt: NonNullable<CoursewareRunView['receipt']>;
}>) {
  if (receipt.status !== 'success') return <section className={styles.receiptCard}><strong>保存动作需要处理</strong><p>{receipt.result}</p></section>;
  return <section className={styles.receiptCard} aria-label="ClassIn 执行回执"><div><CheckCircle2 aria-hidden="true" size={18} /><strong>{receipt.result}</strong></div><p>只有执行回执能证明 ClassIn 已接受本次保存。</p><dl><div><dt>课程对象</dt><dd>{receipt.object.label}</dd></div><div><dt>对象版本</dt><dd>{receipt.object.version}</dd></div><div><dt>执行时间</dt><dd>{receipt.executedAt}</dd></div></dl><Link to={receipt.object.returnUrl}>打开 ClassIn 课程对象</Link></section>;
}
