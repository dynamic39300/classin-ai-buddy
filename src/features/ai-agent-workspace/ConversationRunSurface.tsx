import { CheckCircle2, ChevronDown, FileText, LoaderCircle, PanelRight, Sparkles } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CoreContextPanel } from './CoreContextPanel';
import {
  advanceCoursewareExperience,
  createCoursewareExperience,
  projectCoursewareExperienceEvents,
  startCoursewareExperience,
  type CoursewareExperienceEvent,
} from './conversation-run-experience';
import { projectCoursewareConversationRun } from './conversation-run-projection';
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
  } = useWorkBuddyWorkspace().courseware;
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('context');
  const [lesson, setLesson] = useState('lesson-1');
  const [otherLesson, setOtherLesson] = useState('');
  const [duration, setDuration] = useState('45');
  const [textbook, setTextbook] = useState('人教版');
  const [style, setStyle] = useState('简约探究');
  const [experience, setExperience] = useState(() => createCoursewareExperience([]));
  const [newEventCount, setNewEventCount] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const previousEventCountRef = useRef(0);
  const executionCommittedRef = useRef(false);
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

  return (
    <section className={styles.page} data-inspector-open={inspectorOpen} aria-labelledby="conversation-run-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="conversation-run-title">{projection.title}</h1><span>{coursewareView.run.statusLabel} · 体验运行</span></div>
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
            <CoursewareOutput artifact={coursewareView.run.artifact} />
          ) : <section className={styles.emptyOutput}><strong>产出将在生成后显示</strong><p>任务过程继续保留在左侧时间线。</p></section>}
        </aside>
      ) : null}
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

function CoursewareOutput({ artifact }: Readonly<{ artifact: NonNullable<ReturnType<typeof useWorkBuddyWorkspace>['courseware']['coursewareView']>['run']['artifact'] }>) {
  if (!artifact) return null;
  return (
    <section className={styles.output} role="region" aria-label="智能课件产出">
      <header><div><span>智能课件</span><h2>{artifact.title}</h2></div><div className={styles.outputMeta}><span>{artifact.version}</span><span>{artifact.pageCount} 页</span></div></header>
      <div className={styles.slidePreview} aria-label="课件页面预览">
        <span>01 / {artifact.pageCount}</span>
        <div className={styles.slideCanvas}><small>高中物理 · 动量与碰撞</small><h3>从碰撞实验理解动量守恒</h3><p>观察现象 · 建立模型 · 验证规律</p><div className={styles.collisionDiagram}><i /><b>m₁v₁ + m₂v₂</b><i /></div></div>
      </div>
      <dl className={styles.outputFacts}><div><dt>来源步骤</dt><dd>{artifact.sourceStepId}</dd></div><div><dt>质量检查</dt><dd>{artifact.validationSummary}</dd></div><div><dt>当前状态</dt><dd>课件草稿 · 未写入 ClassIn</dd></div></dl>
    </section>
  );
}
