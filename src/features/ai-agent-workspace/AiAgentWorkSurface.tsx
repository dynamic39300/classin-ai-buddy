import {
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  CircleEllipsis,
  FileText,
  Paperclip,
  PanelRight,
  Presentation,
  Shapes,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { WORKBUDDY_HISTORY_STATUS_LABELS } from '@contracts/workbuddy/workspace';
import { allowsWorkBuddyRunCommand } from '@domain/workbuddy/run-state';
import { getWorkBuddyCapability } from './capability-registry';
import { getRunStatusProjection } from './run-status-projection';
import { CoreContextPanel } from './CoreContextPanel';
import { CoursewareRunSurface } from './CoursewareRunSurface';
import { PackageRunSurface } from './PackageRunSurface';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './AiAgentWorkSurface.module.css';

export function AiAgentWorkSurface() {
  const location = useLocation();
  const { runId, section } = useParams();
  const { coursewareView, packageView } = useWorkBuddyWorkspace();

  if (runId && coursewareView?.run.id === runId) return <CoursewareRunSurface />;
  if (runId && packageView?.run.id === runId) return <PackageRunSurface />;
  if (runId) return <RunSkeleton key={runId} runId={runId} />;
  if (section && getWorkBuddyCapability(section)) return <CapabilityPlaceholder section={section} />;
  if (location.pathname.endsWith('/new')) return <NewTaskSkeleton />;
  return <NewTaskSkeleton />;
}

function NewTaskSkeleton() {
  const [goal, setGoal] = useState('');
  const [feedback, setFeedback] = useState('');
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const navigate = useNavigate();
  const contextButtonRef = useRef<HTMLButtonElement | null>(null);
  const { contextView, taskType, setTaskType, createCoursewareTask, createPackageTask } = useWorkBuddyWorkspace();
  const contextItems = contextView.items.filter(({ included }) => included);
  const contextLabels = contextView.status === 'confirmed'
    ? contextItems.filter(({ kind }) => ['organization', 'class', 'course', 'unit', 'learner_scope'].includes(kind)).map(({ label }) => label)
    : [contextItems.find(({ kind }) => kind === 'organization')?.label ?? 'ClassIn 教研中心', '需要选择教学范围'];

  const closeContextPanel = () => {
    setContextPanelOpen(false);
    requestAnimationFrame(() => contextButtonRef.current?.focus());
  };

  return (
    <section className={styles.newTaskPage} aria-labelledby="workbuddy-new-task-title">
      <div className={styles.newTaskLayout} data-panel-open={contextPanelOpen}>
      <section className={styles.newTaskMain}>
      <section className={styles.composerShell}>
        <span className={styles.eyebrow}><Sparkles aria-hidden="true" size={15} />教师 WorkBuddy</span>
        <h1 id="workbuddy-new-task-title">今天想完成什么教学任务？</h1>
        <p className={styles.lead}>描述目标即可。AI Agent 会检查教学上下文、拆解任务并交付可复查的产物。</p>

        <div className={styles.goalComposer}>
          <textarea
            aria-label="描述教学任务"
            value={goal}
            placeholder="例如：为高一（3）班生成一份函数单调性课件，包含概念讲解、例题和课堂练习"
            onChange={(event) => setGoal(event.target.value)}
          />
          <div className={styles.composerFooter}>
            <div className={styles.composerTools}>
              <button type="button" aria-label="添加附件" onClick={() => setFeedback('附件入口为本地 Demo，尚未上传真实文件。')}><Paperclip aria-hidden="true" size={16} /></button>
              <button ref={contextButtonRef} type="button" aria-pressed={contextPanelOpen} onClick={() => setContextPanelOpen(true)}><UsersRound aria-hidden="true" size={15} />核心上下文 · {contextItems.length}</button>
            </div>
            <button className={styles.sendButton} type="button" disabled={!goal.trim() || contextView.status !== 'confirmed'} onClick={() => {
              const runId = taskType === 'course-package' ? createPackageTask(goal) : createCoursewareTask(goal);
              if (runId) navigate(`/teacher/ai-agent/runs/${runId}`);
            }}>
              <ArrowUp aria-hidden="true" size={16} />
              <span className={styles.srOnly}>创建任务</span>
            </button>
          </div>
        </div>

        <div className={styles.contextSummary} role="group" aria-label="核心上下文摘要">
          {contextLabels.map((label) => <span key={label}><UsersRound aria-hidden="true" size={14} />{label}</span>)}
        </div>

        <div className={styles.shortcuts} aria-label="快捷任务">
          <button type="button" onClick={() => { setTaskType('single-courseware'); setGoal('为高二物理 3 班设计一份动量守恒模型课件，从碰撞实验进入守恒定律'); }}>生成单个课件</button>
          <button type="button" onClick={() => { setTaskType('course-package'); setGoal('从动量单元课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包'); }}>生成课程方案包</button>
          <button type="button" onClick={() => setGoal('分析高一（3）班最近一次作业，归纳共性问题并给出教学建议')}>分析班级学情</button>
        </div>
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : <span className={styles.feedback} aria-hidden="true" />}
      </section>
      </section>
      {contextPanelOpen ? <CoreContextPanel onClose={closeContextPanel} /> : null}
      </div>
    </section>
  );
}

function RunSkeleton({ runId }: { runId: string }) {
  const { getRun } = useWorkBuddyWorkspace();
  const [panelOpen, setPanelOpen] = useState(true);
  const [artifactFocused, setArtifactFocused] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [supplement, setSupplement] = useState('');
  const [supplements, setSupplements] = useState<readonly string[]>([]);
  const artifactActionRef = useRef<HTMLButtonElement | null>(null);
  const panelToggleRef = useRef<HTMLButtonElement | null>(null);
  const item = getRun(runId);

  if (!item) {
    return (
      <section className={styles.placeholderPage} aria-labelledby="workbuddy-missing-run-title">
        <span className={styles.placeholderIcon}><FileText aria-hidden="true" size={22} /></span>
        <h1 id="workbuddy-missing-run-title">找不到这个任务</h1>
        <p>该任务不存在、已被移除，或不属于当前组织。系统不会用其他任务内容替代它。</p>
        <Link className={styles.returnLink} to="/teacher/ai-agent/new">返回新建任务</Link>
      </section>
    );
  }

  const statusProjection = getRunStatusProjection(item.runState);
  const composerCommand = allowsWorkBuddyRunCommand(item.runState, 'supplement')
    ? 'supplement'
    : allowsWorkBuddyRunCommand(item.runState, 'revise') ? 'revise' : null;

  const focusArtifact = () => {
    setPanelOpen(true);
    setArtifactFocused(true);
    setFeedback(statusProjection.actionFeedback);
    requestAnimationFrame(() => artifactActionRef.current?.focus());
  };

  return (
    <section className={styles.runPage} aria-labelledby="workbuddy-run-title">
      <section className={styles.runMain}>
        <header className={styles.runHeader}>
          <div>
            <h1 id="workbuddy-run-title">{item.title}</h1>
            <span data-status={item.runState.status}>{WORKBUDDY_HISTORY_STATUS_LABELS[item.runState.status]} · 本地模拟</span>
          </div>
          <button ref={panelToggleRef} type="button" aria-pressed={panelOpen} onClick={() => {
            if (panelOpen) {
              setPanelOpen(false);
              setArtifactFocused(false);
              setFeedback('Artifact 面板已关闭。');
            } else {
              setPanelOpen(true);
              setFeedback('Artifact 面板已打开。');
              requestAnimationFrame(() => artifactActionRef.current?.focus());
            }
          }}><PanelRight aria-hidden="true" size={16} />{panelOpen ? '关闭产物' : '查看产物'}</button>
        </header>

        <div className={styles.timeline}>
          <div className={styles.runContext}>
            <span>目标</span>
            <p>{item.goal}</p>
            <div className={styles.contextSummary}>
              {item.contextLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>
          {item.steps.map((step) => {
            const StepIcon = step.state === 'completed' ? CheckCircle2 : step.state === 'failed' ? CircleAlert : step.state === 'waiting' ? CircleEllipsis : Sparkles;
            return (
              <article className={styles.timelineEvent} data-state={step.state} key={`${step.title}-${step.time}`}>
                <span className={styles.eventIcon}><StepIcon aria-hidden="true" size={16} /></span>
                <div><strong>{step.title}</strong><p>{step.summary}</p></div>
                <time>{step.time}</time>
              </article>
            );
          })}
          <div className={styles.statusCommand}>
            <span>{statusProjection.recoveryLabel}</span>
            <button type="button" onClick={() => {
              if (item.runState.status === 'completed') focusArtifact();
              else setFeedback(statusProjection.actionFeedback);
            }}>{statusProjection.actionLabel}</button>
          </div>
          {supplements.length ? (
            <section className={styles.localSupplements} aria-label="本地补充要求记录">
              <strong>本地补充记录</strong>
              <ul>{supplements.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul>
            </section>
          ) : null}
        </div>

        {composerCommand ? (
          <div className={styles.runComposer}>
            <input
              aria-label={composerCommand === 'supplement' ? '向 Agent 补充要求' : '修改任务要求'}
              placeholder={composerCommand === 'supplement' ? '补充要求或调整当前任务…' : '修改要求后可重新确认或重试…'}
              value={supplement}
              onChange={(event) => setSupplement(event.target.value)}
            />
            <button type="button" aria-label={composerCommand === 'supplement' ? '发送补充要求' : '保存修改要求'} disabled={!supplement.trim()} onClick={() => {
              setSupplements((current) => [...current, supplement.trim()]);
              setFeedback(composerCommand === 'supplement'
                ? '补充要求已保存到当前本地 Demo 会话，尚未连接真实 Agent。'
                : '修改要求已保存到当前本地 Demo 会话，尚未连接真实 Agent。');
              setSupplement('');
            }}><ArrowUp aria-hidden="true" size={15} /></button>
          </div>
        ) : null}
        {feedback ? <p className={styles.runFeedback} role="status">{feedback}</p> : null}
      </section>

      {panelOpen ? (
        <aside className={styles.activePanel} data-expanded={artifactFocused} aria-label="当前任务产物" onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (artifactFocused) {
              setArtifactFocused(false);
              setFeedback('Artifact Focus 已退出。');
            } else {
              setPanelOpen(false);
              requestAnimationFrame(() => panelToggleRef.current?.focus());
            }
          }
        }}>
          <header><div><Presentation aria-hidden="true" size={17} /><strong>{item.artifact.title}</strong></div><span>{item.artifact.version}</span></header>
          <div className={styles.artifactPreview}>
            <span>{item.artifact.progress}</span>
            <div className={styles.slidePreview}>
              <small>{item.artifact.eyebrow}</small>
              <h2>{item.artifact.heading}</h2>
              <p>{item.artifact.summary}</p>
              <div className={styles.chartPlaceholder} aria-label="函数图像预览"><span /></div>
            </div>
            <p>{item.artifact.truthLabel}</p>
          </div>
          <footer><button ref={artifactActionRef} type="button" aria-pressed={artifactFocused} onClick={() => {
            setArtifactFocused((current) => !current);
            setFeedback(artifactFocused ? 'Artifact Focus 已退出。' : 'Artifact Focus：已展开当前产物的本地预览。');
          }}>{artifactFocused ? '退出聚焦' : '展开查看'}</button><button type="button" disabled>保存到 ClassIn</button></footer>
        </aside>
      ) : null}
    </section>
  );
}

function CapabilityPlaceholder({ section }: { section: string }) {
  const capability = getWorkBuddyCapability(section);
  const copy = capability ? { title: capability.id === 'settings' ? 'AI Agent 设置' : capability.label, description: capability.description } : { title: 'AI Agent', description: '该页面尚未进入当前实施范围。' };
  return (
    <section className={styles.placeholderPage} aria-labelledby="workbuddy-placeholder-title">
      <span className={styles.placeholderIcon}><Shapes aria-hidden="true" size={22} /></span>
      <h1 id="workbuddy-placeholder-title">{copy.title}</h1>
      <p>{copy.description}</p>
      <span className={styles.truthLabel}>M3 结构占位 · 将按已审阅 PRD 在 Phase 4 实现</span>
    </section>
  );
}
