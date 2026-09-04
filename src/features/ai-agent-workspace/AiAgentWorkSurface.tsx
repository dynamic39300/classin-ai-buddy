import {
  CheckCircle2,
  CircleAlert,
  CircleEllipsis,
  FileText,
  Paperclip,
  PanelRight,
  Presentation,
  Search,
  Shapes,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { WORKBUDDY_HISTORY_STATUS_LABELS } from '@contracts/workbuddy/workspace';
import { STANDALONE_TEACHERIN_ROUTES, TEACHERIN_BRAND } from '@contracts/workbuddy/product-brand';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { allowsWorkBuddyRunCommand } from '@domain/workbuddy/run-state';
import { AgentInMarketWorkspace } from '@features/agentin-market';
import { getVisibleWorkBuddyCapability, getWorkBuddyCapability } from './capability-registry';
import { getRunStatusProjection } from './run-status-projection';
import { CoreContextPanel } from './CoreContextPanel';
import { ConversationRunSurface } from './ConversationRunSurface';
import { PackageConversationRunSurface } from './PackageConversationRunSurface';
import { QuizActivityConversationRunSurface } from './QuizActivityConversationRunSurface';
import { CapabilityWorkspace } from './CapabilityWorkspace';
import { LEGACY_TASK_SKILL_OPTIONS, type TaskSkillOption } from './capability-workspace';
import { TaskAssemblyComposer } from './TaskAssemblyComposer';
import { TypewriterGreeting } from './TypewriterGreeting';
import { WorkBuddyAvatar } from './WorkBuddyAvatar';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import { useWorkBuddyExperience } from './workbuddy-experience-context';
import { useWorkBuddyTaskAdmission } from './workbuddy-task-admission-context';
import {
  profileAllowsCapability,
  profileAllowsTaskType,
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  workBuddyRunPath,
} from './workbuddy-experience-profile';
import styles from './AiAgentWorkSurface.module.css';
import type { WorkBuddyTaskLayoutContext } from './AiAgentWorkspaceLayout';

export function AiAgentWorkSurface() {
  const profile = useWorkBuddyExperience();
  const location = useLocation();
  const { runId, section } = useParams();
  const { coursewareView } = useWorkBuddyWorkspace().courseware;
  const { packageView } = useWorkBuddyWorkspace().coursePackage;
  const quizRun = useWorkBuddyWorkspace().quizActivity.view?.run;

  if (runId && coursewareView?.run.id === runId) return <ConversationRunSurface />;
  if (runId && packageView?.run.id === runId) return <PackageConversationRunSurface />;
  if (runId && quizRun?.id === runId) return <QuizActivityConversationRunSurface />;
  if (runId) return <RunSkeleton key={runId} runId={runId} />;
  if (section === 'content' && profile.productBoundary === 'classin-integrated') {
    return <Navigate to="/teacher/space/teacherin" replace />;
  }
  if (section === 'agentin' && profileAllowsCapability(profile, 'agentin')) {
    return <AgentInMarketWorkspace />;
  }
  const capability = section && profileAllowsCapability(profile, section)
    ? profile.id === 'standalone-teacher' ? getWorkBuddyCapability(section) : getVisibleWorkBuddyCapability(section)
    : undefined;
  if (capability && capability.id !== 'agentin') return <CapabilityWorkspace key={capability.id} surface={capability.id} />;
  if (section) return <Navigate to={workBuddyNewTaskPath(profile)} replace />;
  if (location.pathname.endsWith('/new')) return <NewTaskSkeleton />;
  return <NewTaskSkeleton />;
}

type NewTaskNavigationState = Readonly<{
  capabilityId?: string;
  capabilityTitle?: string;
  intent?: 'context' | 'context-attached' | 'adapt' | 'schedule' | 'skill-find' | 'skill-create' | 'skill-use';
  prompt?: string;
}>;

function skillFromNavigationState(state: NewTaskNavigationState | null): TaskSkillOption | null {
  if (!state?.capabilityTitle || !state.intent?.startsWith('skill-')) return null;
  return {
    kind: 'skill',
    id: state.capabilityId ?? 'selected-skill',
    title: state.capabilityTitle,
    description: state.intent === 'skill-find'
      ? '帮助查找适合当前目标的 Skill'
      : state.intent === 'skill-create'
        ? '帮助创建一个新的自定义 Skill'
        : '用于当前任务的已安装 Skill',
    source: 'installed',
    taskIntent: null,
  };
}

function NewTaskSkeleton() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useWorkBuddyExperience();
  const unifiedClassInHome = profile.productBoundary === 'classin-integrated';
  const taskAdmission = useWorkBuddyTaskAdmission();
  const [feedback, setFeedback] = useState(() => {
    const state = location.state as NewTaskNavigationState | null;
    return state?.intent === 'context-attached' && state.capabilityTitle
      ? `已将“${state.capabilityTitle}”作为稳定引用加入 Core Context，请确认上下文版本。`
      : '';
  });
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [skillQuery, setSkillQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<TaskSkillOption | null>(() =>
    skillFromNavigationState(location.state as NewTaskNavigationState | null));
  const { contextPanelOpen, setContextPanelOpen } = useOutletContext<WorkBuddyTaskLayoutContext>();
  const handledCapabilityState = useRef<string | null>(null);
  const workspace = useWorkBuddyWorkspace();
  const { goal, setGoal, clear: clearGoal } = workspace.taskDraft;
  const { contextView, taskType, setTaskType } = workspace.context;
  const { createCoursewareTask } = workspace.courseware;
  const { createPackageTask } = workspace.coursePackage;
  const { createTask: createQuizActivityTask } = workspace.quizActivity;
  const contextItems = contextView.items.filter(({ included }) => included);
  const taskTypeAllowed = profileAllowsTaskType(profile, taskType);
  useEffect(() => {
    if (!unifiedClassInHome || contextView.status === 'confirmed') return;
    if (contextView.status === 'needs_attention') {
      workspace.context.applyRecommendedContext();
      return;
    }
    workspace.context.confirmCoreContext();
  }, [contextView.status, unifiedClassInHome, workspace.context]);
  useEffect(() => {
    if (taskTypeAllowed) return;
    const fallbackTaskType = profile.visibleTaskTypes[0];
    if (fallbackTaskType) setTaskType(fallbackTaskType);
  }, [profile.visibleTaskTypes, setTaskType, taskTypeAllowed]);
  useEffect(() => {
    const state = location.state as NewTaskNavigationState | null;
    if (!state?.capabilityTitle) return;
    const stateKey = `${location.key}:${state.intent ?? 'context'}:${state.capabilityTitle}`;
    if (handledCapabilityState.current === stateKey) return;
    handledCapabilityState.current = stateKey;
    if (state.intent?.startsWith('skill-')) {
      if (unifiedClassInHome) {
        const skill = skillFromNavigationState(state);
        if (skill) workspace.taskAssembly.dispatch({ type: 'select-skill', skill });
      }
      if (state.prompt && (state.intent === 'skill-find' || state.intent === 'skill-create' || !goal.trim())) {
        setGoal(state.prompt);
      }
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (state.intent === 'context-attached') {
      return;
    }
    if (goal.trim() && state.intent !== 'context') {
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const intentCopy = state.intent === 'schedule'
      ? `立即执行定时任务“${state.capabilityTitle}”，并按标准 Run 流程生成结果。`
      : state.intent === 'adapt'
        ? `基于“${state.capabilityTitle}”改编一份新的智能课件。`
        : `将“${state.capabilityTitle}”作为当前教学任务的参考 Context。`;
    setGoal(goal.trim() ? `${goal.trim()}\n${intentCopy}` : intentCopy);
    navigate(location.pathname, { replace: true, state: null });
  }, [goal, location, navigate, setGoal, unifiedClassInHome, workspace.taskAssembly]);
  const visibleSkills = LEGACY_TASK_SKILL_OPTIONS.filter((skill) => {
    const needle = skillQuery.trim().toLowerCase();
    return !needle || `${skill.title} ${skill.description}`.toLowerCase().includes(needle);
  });
  const closeSkillPicker = (returnFocus = false) => {
    setSkillPickerOpen(false);
    if (returnFocus) requestAnimationFrame(() => document.getElementById('workbuddy-skill-picker-trigger')?.focus());
  };
  const contextLabels = contextView.status === 'confirmed'
    ? contextItems.filter(({ kind }) => ['organization', 'class', 'course', 'unit', 'learner_scope'].includes(kind)).map(({ label }) => label)
    : [contextItems.find(({ kind }) => kind === 'organization')?.label ?? 'ClassIn 教研中心', '需要选择教学范围'];
  const taskQuote = taskAdmission?.quote(taskType) ?? null;

  const createSelectedRun = (taskAssemblySnapshotId: string | null = null) => taskType === 'course-package'
    ? createPackageTask(goal, taskAssemblySnapshotId)
    : taskType === 'quiz-activity-creation'
      ? createQuizActivityTask(goal, taskAssemblySnapshotId)
      : createCoursewareTask(goal, taskAssemblySnapshotId);

  const submitTask = (withTaskAssemblySnapshot: boolean) => {
    if (!taskTypeAllowed) return;
    let taskAssemblySnapshotId: string | null = null;
    if (withTaskAssemblySnapshot) {
      const createdAt = new Date().toISOString();
      const snapshotResult = workspace.taskAssembly.createSnapshot({
        id: `task-assembly-${taskType}-${Date.now()}`,
        createdAt,
      });
      if (!snapshotResult.ok) {
        setFeedback(snapshotResult.reason === 'material_not_ready'
          ? '仍有文件尚未就绪，请移除或重新选择后再创建任务。'
          : snapshotResult.reason === 'invalid_provenance'
            ? 'Agent 推荐 Prompt 的来源状态异常，请重新选择该 Agent。'
            : '请先描述要完成的教学任务。');
        return;
      }
      taskAssemblySnapshotId = snapshotResult.snapshot.id;
    }
    const createRun = () => createSelectedRun(taskAssemblySnapshotId);
    const admissionResult = taskAdmission?.start({ taskType, goal, createRun });
    if (admissionResult && !admissionResult.ok) {
      setFeedback(admissionResult.reason === 'insufficient_credits'
        ? 'AI 点数不足，请先前往“AI 点数”或“会员方案”补充点数。'
        : admissionResult.reason === 'evidence_mismatch'
          ? '任务请求与已绑定的点数记录不一致，请重新创建任务。'
          : '任务尚未创建，已释放预占的 AI 点数，请检查教学上下文后重试。');
      return;
    }
    const runId = admissionResult?.runId ?? createRun();
    if (runId) {
      clearGoal();
      navigate(workBuddyRunPath(profile, runId));
    }
  };

  return (
    <section className={styles.newTaskPage} aria-labelledby="workbuddy-new-task-title">
      <div className={styles.newTaskLayout} data-panel-open={contextPanelOpen}>
      <section className={styles.newTaskMain}>
      <section className={styles.composerShell}>
        <div className={styles.welcomeHeader}>
          <WorkBuddyAvatar size="standard" />
          <div>
            <span className={styles.eyebrow}>{TEACHERIN_BRAND.shortName}</span>
            <h1 id="workbuddy-new-task-title"><TypewriterGreeting text="老师好，有什么能帮您的？" /></h1>
          </div>
        </div>
        {!unifiedClassInHome ? <p className={styles.lead}>告诉我您想完成的教学工作，我会结合已授权的教学上下文，生成可检查、可修改的结果。</p> : null}

        {unifiedClassInHome ? (
          <TaskAssemblyComposer
            assembly={workspace.taskAssembly}
            canSubmit={contextView.status === 'confirmed' && taskTypeAllowed}
            contextItemCount={contextItems.length}
            contextPanelOpen={contextPanelOpen}
            onFeedback={setFeedback}
            onSubmit={() => submitTask(true)}
            onTaskTypeChange={setTaskType}
            onToggleContext={() => setContextPanelOpen((open) => !open)}
            profile={profile}
            showContextEntry={false}
            taskMaterialCatalogs={workspace.taskMaterialCatalogs}
          />
        ) : (
        <WorkspaceComposer
          ariaLabel="描述教学任务"
          canSubmit={contextView.status === 'confirmed' && taskTypeAllowed}
          className={styles.goalComposerDock}
          mode="task"
          onSubmit={() => submitTask(false)}
          onValueChange={setGoal}
          placeholder="例如：为高一（3）班生成一份函数单调性课件，包含概念讲解、例题和课堂练习"
          submitLabel="创建任务"
          tools={<div className={styles.composerTools}>
              <button type="button" aria-label="添加附件" onClick={() => setFeedback('请从“我的文件”中选择要加入当前任务的资料。')}><Paperclip aria-hidden="true" size={16} /></button>
              <div
                className={styles.skillPickerAnchor}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSkillPickerOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') closeSkillPicker(true);
                }}
              >
                <button
                  id="workbuddy-skill-picker-trigger"
                  type="button"
                  aria-label="选择技能"
                  aria-haspopup="dialog"
                  aria-expanded={skillPickerOpen}
                  onClick={() => setSkillPickerOpen((open) => !open)}
                >
                  <Shapes aria-hidden="true" size={15} />技能
                </button>
                {skillPickerOpen ? (
                  <section className={styles.skillPicker} role="dialog" aria-label="选择技能">
                    <label className={styles.skillPickerSearch}>
                      <Search aria-hidden="true" size={15} />
                      <input
                        autoFocus
                        aria-label="搜索技能"
                        placeholder="搜索技能"
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                      />
                    </label>
                    <div className={styles.skillPickerList}>
                      {visibleSkills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          aria-pressed={selectedSkill?.id === skill.id}
                          onClick={() => {
                            setSelectedSkill(skill);
                            closeSkillPicker(true);
                            setSkillQuery('');
                            setFeedback(`已选择 ${skill.title}，创建任务前仍可移除。`);
                          }}
                        >
                          <span className={styles.skillPickerGlyph}><Shapes aria-hidden="true" size={15} /></span>
                          <span><strong>{skill.title}</strong><small>{skill.description}</small></span>
                          <em>{skill.source === 'official' ? '官方' : '已安装'}</em>
                        </button>
                      ))}
                      {!visibleSkills.length ? <p className={styles.skillPickerEmpty}>没有匹配的已安装 Skill</p> : null}
                    </div>
                    <Link className={styles.skillMarketLink} to={workBuddyCapabilityPath(profile, 'skills')} onClick={() => closeSkillPicker()}>
                      <Shapes aria-hidden="true" size={15} />打开技能市场
                    </Link>
                  </section>
                ) : null}
              </div>
              {selectedSkill ? (
                <span className={styles.selectedSkillChip}>
                  <Shapes aria-hidden="true" size={13} />
                  {selectedSkill.title}
                  <button
                    type="button"
                    aria-label={`移除已选技能 ${selectedSkill.title}`}
                    onClick={() => {
                      setSelectedSkill(null);
                      setFeedback('已移除所选 Skill。');
                    }}
                  >
                    <X aria-hidden="true" size={12} />
                  </button>
                </span>
              ) : null}
              <button type="button" aria-expanded={contextPanelOpen} aria-controls="workbuddy-core-context-panel" onClick={() => setContextPanelOpen((open) => !open)}><UsersRound aria-hidden="true" size={15} />核心上下文 · {contextItems.length}</button>
            </div>}
          value={goal}
        />
        )}

        {taskQuote ? (
          <div className={styles.taskQuote} aria-label="本次任务 AI 点数报价">
            <span>本次任务</span>
            <strong>{taskQuote.amount} AI 点数</strong>
            <Link to={STANDALONE_TEACHERIN_ROUTES.credits}>查看余额</Link>
          </div>
        ) : null}

        {!unifiedClassInHome ? <div role="group" aria-label="核心上下文摘要">
          <div className={styles.contextSummary} role="group" aria-label="已选择上下文">
            {contextLabels.slice(0, 4).map((label) => <span key={label}><UsersRound aria-hidden="true" size={14} />{label}</span>)}
            {contextLabels.length > 4 ? <span>+{contextLabels.length - 4}</span> : null}
          </div>
        </div> : null}

        {!unifiedClassInHome ? <div className={styles.shortcuts} aria-label="快捷任务">
          {profileAllowsTaskType(profile, 'single-courseware') ? <button type="button" onClick={() => { setTaskType('single-courseware'); setGoal('为高一（3）班生成一份函数单调性智能课件，包含概念讲解、例题和课堂练习'); }}>生成单个课件</button> : null}
          {profileAllowsTaskType(profile, 'course-package') ? <button type="button" onClick={() => { setTaskType('course-package'); setGoal('从函数单调性课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包'); }}>生成课程方案包</button> : null}
          {profileAllowsTaskType(profile, 'quiz-activity-creation') ? <button type="button" onClick={() => { setTaskType('quiz-activity-creation'); setGoal(profile.productBoundary === 'standalone-consumer' ? '基于我确认的教学范围和上传资料，生成一份动量守恒诊断测验并保存到个人内容库' : '为高二物理 3 班当前单元生成一份动量守恒诊断测验，并创建为教学活动草稿'); }}>{profile.productBoundary === 'standalone-consumer' ? '生成测验试卷' : '生成测验并创建活动草稿'}</button> : null}
          <button type="button" onClick={() => setGoal('分析高一（3）班最近一次作业，归纳共性问题并给出教学建议')}>分析班级学情</button>
        </div> : null}
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : !unifiedClassInHome ? <span className={styles.feedback} aria-hidden="true" /> : null}
      </section>
      </section>
      <CoreContextPanel id="workbuddy-core-context-panel" hidden={unifiedClassInHome || !contextPanelOpen} onClose={() => setContextPanelOpen(false)} />
      </div>
    </section>
  );
}

function RunSkeleton({ runId }: { runId: string }) {
  const profile = useWorkBuddyExperience();
  const { getRun } = useWorkBuddyWorkspace().history;
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
        <Link className={styles.returnLink} to={workBuddyNewTaskPath(profile)}>返回新建任务</Link>
      </section>
    );
  }

  const statusProjection = getRunStatusProjection(item.runState);
  const composerCommand = allowsWorkBuddyRunCommand(item.runState, 'supplement')
    ? 'supplement'
    : allowsWorkBuddyRunCommand(item.runState, 'revise') ? 'revise' : null;
  const isCompletedFollowUp = item.runState.status === 'completed' && composerCommand === 'supplement';

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
            <span data-status={item.runState.status}>{WORKBUDDY_HISTORY_STATUS_LABELS[item.runState.status]}</span>
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
          <WorkspaceComposer
            ariaLabel={isCompletedFollowUp ? '继续追问当前任务' : composerCommand === 'supplement' ? '向 Agent 补充要求' : '修改任务要求'}
            className={styles.runComposerDock}
            groupLabel="任务补充输入"
            hint={isCompletedFollowUp ? '追问会记录在当前任务中' : composerCommand === 'supplement' ? '补充内容会记录在当前任务中' : '修改内容会记录到当前任务'}
            onSubmit={() => {
              setSupplements((current) => [...current, supplement.trim()]);
              setFeedback(isCompletedFollowUp
                ? '追问已记录到当前任务。'
                : composerCommand === 'supplement'
                ? '补充要求已记录到当前任务。'
                : '修改要求已记录到当前任务。');
              setSupplement('');
            }}
            onValueChange={setSupplement}
            placeholder={isCompletedFollowUp ? '继续追问、补充修改或发起关联任务…' : composerCommand === 'supplement' ? '补充要求或调整当前任务…' : '修改要求后可重新确认或重试…'}
            submitLabel={isCompletedFollowUp ? '发送追问' : composerCommand === 'supplement' ? '发送补充要求' : '保存修改要求'}
            value={supplement}
          />
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
              <small>{item.artifact.eyebrow.replace(/\[模拟\]\s*/gu, '')}</small>
              <h2>{item.artifact.heading}</h2>
              <p>{item.artifact.summary}</p>
              <div className={styles.chartPlaceholder} aria-label="函数图像预览"><span /></div>
            </div>
            <p>当前任务产物 · {item.artifact.version}</p>
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
