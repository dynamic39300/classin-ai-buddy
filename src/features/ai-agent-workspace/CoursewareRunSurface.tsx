import { CheckCircle2, FileText, PanelRight, Presentation, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { CoreContextPanel } from './CoreContextPanel';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './CoursewareRunSurface.module.css';

type ActivePanel = 'artifact' | 'core_context' | 'process_detail' | 'none';

export function CoursewareRunSurface() {
  const {
    coursewareRun: run,
    coursewareProjection,
    updateCoursewareTaskBrief,
    confirmCoursewareTaskBrief,
    reviseCoursewareTaskBrief,
    executeCoursewareTaskPlan,
  } = useWorkBuddyWorkspace();
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');

  if (!run) return null;
  const artifact = run.artifact;

  return (
    <section className={styles.page} data-panel-open={activePanel !== 'none'} aria-labelledby="m4-courseware-title">
      <section className={styles.main}>
        <header className={styles.header}>
          <div><h1 id="m4-courseware-title">{run.title}</h1><span>{run.stage === 'needs_information' ? '需要补充' : run.stage === 'awaiting_plan_confirmation' ? '待确认计划' : '完成待复查'} · 固定 Mock</span></div>
          <nav aria-label="任务辅助面板">
            <button type="button" aria-pressed={activePanel === 'core_context'} onClick={() => setActivePanel('core_context')}>核心上下文</button>
            <button type="button" aria-pressed={activePanel === 'process_detail'} disabled={!run.events.length} onClick={() => setActivePanel('process_detail')}>执行详情</button>
            <button type="button" aria-pressed={activePanel === 'artifact'} disabled={!artifact} onClick={() => setActivePanel('artifact')}><PanelRight aria-hidden="true" size={15} />查看产物</button>
          </nav>
        </header>

        <div className={styles.content}>
          <section className={styles.goalCard}>
            <span>任务目标</span><p>{run.goal}</p>
            <small>ContextSnapshot · {run.contextSnapshotId}</small>
          </section>

          {run.stage === 'needs_information' ? (
            <section className={styles.stageCard} aria-labelledby="courseware-brief-title">
              <span className={styles.stageIcon}><Sparkles aria-hidden="true" size={17} /></span>
              <div className={styles.stageBody}>
                <h2 id="courseware-brief-title">补齐任务信息</h2>
                <p>已从 ContextSnapshot 复用：高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量</p>
                <div className={styles.fields}>
                  <label>课时长度<select aria-label="课时长度" value={run.brief.durationMinutes} onChange={(event) => updateCoursewareTaskBrief({ durationMinutes: Number(event.target.value) })}><option value={40}>40 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option></select></label>
                  <label>教学方式<select aria-label="教学方式" value={run.brief.teachingApproach} onChange={(event) => updateCoursewareTaskBrief({ teachingApproach: event.target.value })}><option>实验探究</option><option>概念讲解</option><option>问题驱动</option></select></label>
                  <label>预计页数<input aria-label="预计页数" type="number" min={6} max={40} value={run.brief.expectedPages} onChange={(event) => updateCoursewareTaskBrief({ expectedPages: Number(event.target.value) })} /></label>
                </div>
                <div className={styles.actions}><button className={styles.primary} type="button" onClick={confirmCoursewareTaskBrief}>确认任务信息</button></div>
              </div>
            </section>
          ) : null}

          {run.stage === 'awaiting_plan_confirmation' ? (
            <section className={styles.stageCard} aria-labelledby="courseware-plan-title">
              <span className={styles.stageIcon}><FileText aria-hidden="true" size={17} /></span>
              <div className={styles.stageBody}>
                <h2 id="courseware-plan-title">执行计划</h2>
                <p>预期产物：{run.brief.expectedPages} 页课件初稿</p>
                <ol className={styles.planList}>{run.plan.map((step) => <li key={step.id}><div><strong>{step.title}</strong><span>{step.expectedOutput}</span></div><code>{step.capability}</code></li>)}</ol>
                <p className={styles.waitingPoint}>等待点：教师确认计划</p>
                <div className={styles.actions}><button type="button" onClick={reviseCoursewareTaskBrief}>返回修改</button><button className={styles.primary} type="button" onClick={() => { executeCoursewareTaskPlan(); setActivePanel('artifact'); }}>确认计划并执行</button></div>
              </div>
            </section>
          ) : null}

          {run.stage === 'artifact_ready' ? (
            <section className={styles.process} aria-labelledby="courseware-complete-title">
              <div className={styles.completeHeading}><CheckCircle2 aria-hidden="true" size={20} /><div><h2 id="courseware-complete-title">课件初稿已生成</h2><p>产物已完成固定质量检查，等待教师复查；尚未写入 ClassIn。</p></div></div>
              <div className={styles.events}>{run.events.map((event) => <article key={event.id}><span><CheckCircle2 aria-hidden="true" size={15} /></span><div><strong>{event.title}</strong><p>{event.summary}</p>{event.capability ? <code>{event.capability}</code> : null}</div></article>)}</div>
            </section>
          ) : null}
        </div>
      </section>

      {activePanel === 'artifact' && artifact ? (
        <aside className={styles.panel} aria-label="当前任务产物">
          <header><div><Presentation aria-hidden="true" size={17} /><strong>{artifact.title}</strong></div><button type="button" onClick={() => setActivePanel('none')}>关闭</button></header>
          <div className={styles.artifactBody}>
            <div className={styles.metadata}><code>{artifact.id}</code><span>{artifact.version}</span><span>{artifact.pageCount} 页</span><span>{artifact.validationState}</span></div>
            <div className={styles.slide}><small>高二物理 · 动量与碰撞</small><h2>从碰撞实验到动量守恒</h2><p>观察现象 → 选择系统 → 建立模型 → 验证守恒条件</p><div><span /><span /></div></div>
            <p>{artifact.validationSummary}</p>
            <strong className={styles.truthLabel}>{artifact.truthLabel}</strong>
          </div>
          <footer><button type="button" disabled>保存到 ClassIn</button></footer>
        </aside>
      ) : null}

      {activePanel === 'process_detail' ? (
        <aside className={styles.panel} aria-label="执行详情">
          <header><strong>执行详情</strong><button type="button" onClick={() => setActivePanel('none')}>关闭</button></header>
          <div className={styles.processDetail}>
            <h2>最小 ContextProjection</h2>
            <p>以下字段是固定 Capability Manifest 为本次步骤声明的最小输入；完整 Snapshot 未下发。</p>
            <ul>{coursewareProjection?.items.map((item) => <li key={item.id}><strong>{item.label}</strong><span>{item.section} · {item.sensitivity}</span></li>)}</ul>
            <h2>能力追踪</h2>
            <ul>{run.events.filter(({ capability }) => capability).map((event) => <li key={event.id}><strong>{event.capability}</strong><span>{event.title} · 固定 Mock 输出</span></li>)}</ul>
          </div>
        </aside>
      ) : null}

      {activePanel === 'core_context' ? <CoreContextPanel readOnly onClose={() => setActivePanel('none')} /> : null}
    </section>
  );
}
