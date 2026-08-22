import {
  ArrowUp,
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
import { allowsWorkBuddyRunCommand } from '@domain/workbuddy/run-state';
import { getVisibleWorkBuddyCapability } from './capability-registry';
import { getRunStatusProjection } from './run-status-projection';
import { CoreContextPanel } from './CoreContextPanel';
import { ConversationRunSurface } from './ConversationRunSurface';
import { PackageConversationRunSurface } from './PackageConversationRunSurface';
import { CapabilityWorkspace } from './CapabilityWorkspace';
import { TASK_SKILL_OPTIONS, type TaskSkillOption } from './capability-workspace';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './AiAgentWorkSurface.module.css';
import type { WorkBuddyTaskLayoutContext } from './AiAgentWorkspaceLayout';

export function AiAgentWorkSurface() {
  const location = useLocation();
  const { runId, section } = useParams();
  const { coursewareView } = useWorkBuddyWorkspace().courseware;
  const { packageView } = useWorkBuddyWorkspace().coursePackage;

  if (runId && coursewareView?.run.id === runId) return <ConversationRunSurface />;
  if (runId && packageView?.run.id === runId) return <PackageConversationRunSurface />;
  if (runId) return <RunSkeleton key={runId} runId={runId} />;
  if (section === 'content') return <Navigate to="/teacher/space/teacherin" replace />;
  const capability = section ? getVisibleWorkBuddyCapability(section) : undefined;
  if (capability) return <CapabilityWorkspace key={capability.id} surface={capability.id} />;
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
    id: state.capabilityId ?? 'selected-skill',
    title: state.capabilityTitle,
    description: state.intent === 'skill-find'
      ? '帮助查找适合当前目标的 Skill'
      : state.intent === 'skill-create'
        ? '帮助创建一个新的自定义 Skill'
        : '用于当前任务的已安装 Skill',
    source: '官方',
  };
}

function NewTaskSkeleton() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const { goal, setGoal, clear: clearGoal } = useWorkBuddyWorkspace().taskDraft;
  const { contextView, taskType, setTaskType } = useWorkBuddyWorkspace().context;
  const { createCoursewareTask } = useWorkBuddyWorkspace().courseware;
  const { createPackageTask } = useWorkBuddyWorkspace().coursePackage;
  const contextItems = contextView.items.filter(({ included }) => included);
  useEffect(() => {
    const state = location.state as NewTaskNavigationState | null;
    if (!state?.capabilityTitle) return;
    const stateKey = `${location.key}:${state.intent ?? 'context'}:${state.capabilityTitle}`;
    if (handledCapabilityState.current === stateKey) return;
    handledCapabilityState.current = stateKey;
    if (state.intent?.startsWith('skill-')) {
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
  }, [goal, location, navigate, setGoal]);
  const visibleSkills = TASK_SKILL_OPTIONS.filter((skill) => {
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

  return (
    <section className={styles.newTaskPage} aria-labelledby="workbuddy-new-task-title">
      <div className={styles.newTaskLayout} data-panel-open={contextPanelOpen}>
      <section className={styles.newTaskMain}>
      <section className={styles.composerShell}>
        <span className={styles.eyebrow}><Sparkles aria-hidden="true" size={15} />Work Buddy</span>
        <h1 id="workbuddy-new-task-title">今天想完成什么教学任务？</h1>
        <p className={styles.lead}>描述目标即可。Work Buddy 会检查教学上下文、拆解任务并交付可复查的产物。</p>

        <div className={styles.goalComposer}>
          <textarea
            aria-label="描述教学任务"
            value={goal}
            placeholder="例如：为高一（3）班生成一份函数单调性课件，包含概念讲解、例题和课堂练习"
            onChange={(event) => setGoal(event.target.value)}
          />
          <div className={styles.composerFooter}>
            <div className={styles.composerTools}>
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
                            setFeedback(`[模拟] 已选择 ${skill.title}，创建任务前仍可移除。`);
                          }}
                        >
                          <span className={styles.skillPickerGlyph}><Shapes aria-hidden="true" size={15} /></span>
                          <span><strong>{skill.title}</strong><small>{skill.description}</small></span>
                          <em>{skill.source}</em>
                        </button>
                      ))}
                      {!visibleSkills.length ? <p className={styles.skillPickerEmpty}>没有匹配的已安装 Skill</p> : null}
                    </div>
                    <Link className={styles.skillMarketLink} to="/teacher/ai-agent/skills" onClick={() => closeSkillPicker()}>
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
            </div>
            <button className={styles.sendButton} type="button" disabled={!goal.trim() || contextView.status !== 'confirmed'} onClick={() => {
              const runId = taskType === 'course-package' ? createPackageTask(goal) : createCoursewareTask(goal);
              if (runId) {
                clearGoal();
                navigate(`/teacher/ai-agent/runs/${runId}`);
              }
            }}>
              <ArrowUp aria-hidden="true" size={16} />
              <span className={styles.srOnly}>创建任务</span>
            </button>
          </div>
        </div>

        <div role="group" aria-label="核心上下文摘要">
          <div className={styles.contextSummary} role="group" aria-label="已选择上下文">
            {contextLabels.slice(0, 4).map((label) => <span key={label}><UsersRound aria-hidden="true" size={14} />{label}</span>)}
            {contextLabels.length > 4 ? <span>+{contextLabels.length - 4}</span> : null}
          </div>
        </div>

        <div className={styles.shortcuts} aria-label="快捷任务">
          <button type="button" onClick={() => { setTaskType('single-courseware'); setGoal('为高一（3）班生成一份函数单调性智能课件，包含概念讲解、例题和课堂练习'); }}>生成单个课件</button>
          <button type="button" onClick={() => { setTaskType('course-package'); setGoal('从函数单调性课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包'); }}>生成课程方案包</button>
          <button type="button" onClick={() => setGoal('分析高一（3）班最近一次作业，归纳共性问题并给出教学建议')}>分析班级学情</button>
        </div>
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : <span className={styles.feedback} aria-hidden="true" />}
      </section>
      </section>
      <CoreContextPanel id="workbuddy-core-context-panel" hidden={!contextPanelOpen} onClose={() => setContextPanelOpen(false)} />
      </div>
    </section>
  );
}

function RunSkeleton({ runId }: { runId: string }) {
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
                ? '补充要求已记录到当前任务。'
                : '修改要求已记录到当前任务。');
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
