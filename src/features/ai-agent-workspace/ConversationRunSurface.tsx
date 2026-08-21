import { PanelRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CoreContextPanel } from './CoreContextPanel';
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
  const projection = useMemo(
    () => coursewareView ? projectCoursewareConversationRun(coursewareView) : null,
    [coursewareView],
  );
  if (!coursewareView || !projection) return null;

  return (
    <section className={styles.page} data-inspector-open={inspectorOpen} aria-labelledby="conversation-run-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="conversation-run-title">{projection.title}</h1><span>{coursewareView.run.statusLabel} · 体验运行</span></div>
          <button type="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((open) => !open)}>
            <PanelRight aria-hidden="true" size={16} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}
          </button>
        </header>

        <div className={styles.timeline} role="feed" aria-label="Agent 任务时间线">
          {projection.events.map((event) => (
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
                    {coursewareView.run.stage === 'awaiting_plan_confirmation' ? <div className={styles.cardActions}><button type="button" onClick={reviseCoursewareTaskBrief}>返回修改</button><button className={styles.primary} type="button" onClick={executeCoursewareTaskPlan}>开始执行计划</button></div> : null}
                  </section>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {inspectorOpen ? (
        <aside className={styles.inspector} aria-label="任务辅助区">
          <div className={styles.tabs} role="tablist" aria-label="任务辅助区视图">
            <button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => setInspectorMode('context')}>上下文</button>
            <button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={!coursewareView.run.artifact} onClick={() => setInspectorMode('output')}>产出</button>
          </div>
          {inspectorMode === 'context' ? <CoreContextPanel readOnly mode="courseware" onClose={() => setInspectorOpen(false)} /> : (
            <section className={styles.emptyOutput}><strong>产出将在生成后显示</strong><p>任务过程继续保留在左侧时间线。</p></section>
          )}
        </aside>
      ) : null}
    </section>
  );
}
