import { CheckCircle2, Circle, ClipboardCheck, FileQuestion, LoaderCircle, PanelRight, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { STANDALONE_TEACHERIN_ROUTES, TEACHERIN_BRAND } from '@contracts/workbuddy/product-brand';
import type { QuizActivitySettings, QuizQuestionType, QuizScoringScheme } from '@domain/workbuddy/quiz-activity-creation';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { CoreContextPanel } from './CoreContextPanel';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import { useWorkBuddyExperience } from './workbuddy-experience-context';
import { workBuddyNewTaskPath } from './workbuddy-experience-profile';
import { QUIZ_GENERATION_STEPS, useQuizActivityExperience } from './use-quiz-activity-experience';
import conversationStyles from './ConversationRunSurface.module.css';
import styles from './QuizActivityConversationRunSurface.module.css';

const QUESTION_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'single-choice': '单选题', 'multiple-choice': '多选题', judgement: '判断题', 'fill-blank': '填空题', 'short-answer': '问答题', comprehensive: '综合题',
});
const SCORING_LABELS: Readonly<Record<QuizScoringScheme, string>> = Object.freeze({ score: '分数制', percentage: '百分比', 'excellent-good': '优良评分', abcd: 'ABCD', unscored: '不评分' });
const AVAILABLE_QUESTION_TYPES = Object.freeze(['single-choice', 'multiple-choice', 'judgement', 'fill-blank', 'short-answer'] as const);

type LocalSupplement = Readonly<{ id: number; text: string }>;

export function QuizActivityConversationRunSurface() {
  const profile = useWorkBuddyExperience();
  const standalone = profile.productBoundary === 'standalone-consumer';
  const workspace = useWorkBuddyWorkspace();
  const quiz = workspace.quizActivity;
  const run = quiz.view?.run;
  const [title, setTitle] = useState(() => run?.settings.title ?? '');
  const [description, setDescription] = useState(() => run?.settings.description ?? '');
  const [startAt, setStartAt] = useState(() => run?.settings.startAt.slice(0, 16) ?? '');
  const [endAt, setEndAt] = useState(() => run?.settings.endAt.slice(0, 16) ?? '');
  const [duration, setDuration] = useState(() => run?.settings.duration.kind === 'unlimited' ? 'unlimited' : String(run?.settings.duration.minutes ?? 40));
  const [customDuration, setCustomDuration] = useState(() => run?.settings.duration.kind === 'custom' ? run.settings.duration.minutes : 30);
  const [scoring, setScoring] = useState<QuizScoringScheme>(() => run?.settings.scoring ?? 'score');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [paperTypes, setPaperTypes] = useState<readonly QuizQuestionType[]>(() => run?.brief.questionTypes ?? AVAILABLE_QUESTION_TYPES);
  const [paperTotalScore, setPaperTotalScore] = useState(() => run?.brief.totalScore ?? 100);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [personalSaveError, setPersonalSaveError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(() => run?.stage === 'awaiting_paper_review');
  const [inspectorMode, setInspectorMode] = useState<'context' | 'output'>(() => run?.stage === 'awaiting_paper_review' ? 'output' : 'context');
  const [composerDraft, setComposerDraft] = useState('');
  const [supplements, setSupplements] = useState<readonly LocalSupplement[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const experience = useQuizActivityExperience(run?.id ?? 'missing-quiz-run', run?.stage ?? null, {
    beginGeneration: quiz.beginGeneration,
    generatePaper: () => {
      quiz.generatePaper();
      setInspectorMode('output');
      setInspectorOpen(true);
    },
    executeDraft: quiz.executeDraft,
  });

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) timeline.scrollTop = timeline.scrollHeight;
  }, [run?.stage, supplements.length]);

  if (!run) return null;
  const contextCount = workspace.context.contextView.includedCount;
  const personalQuizReceipt = run.artifact
    ? workspace.personalContent?.receiptForArtifact(run.artifact.id) ?? null
    : null;
  const activeRunStage = run.stage === 'plan_ready' || run.stage === 'generating' || run.stage === 'creating_draft';
  const runStatusLabel = standalone && personalQuizReceipt ? '已保存到个人内容库'
    : run.stage === 'draft_created' ? '草稿已创建'
    : run.stage === 'awaiting_approval' ? '待你确认'
      : run.stage === 'awaiting_activity_parameters' ? (standalone ? '等待保存' : '等待活动设置')
        : run.stage === 'awaiting_paper_review' ? '等待试卷审阅'
        : run.stage === 'plan_ready' || run.stage === 'generating' ? '生成中'
          : run.stage === 'creating_draft' ? '写入中' : '等待确认';
  const receipt = run.receipt?.status === 'success' ? run.receipt : null;
  const failedReceipt = run.receipt?.status !== 'success' ? run.receipt : null;
  const activitySettings = (): Partial<QuizActivitySettings> => ({
    title,
    description,
    startAt,
    endAt,
    duration: duration === 'unlimited' ? { kind: 'unlimited' } : duration === 'custom' ? { kind: 'custom', minutes: customDuration } : { kind: 'preset', minutes: Number(duration) },
    scoring,
  });
  const confirmPaperBrief = () => {
    if (!paperTypes.length) {
      setBriefError('请至少选择一种题型。');
      return;
    }
    if (!Number.isInteger(paperTotalScore) || paperTotalScore < paperTypes.length) {
      setBriefError(`总分应为不小于 ${paperTypes.length} 的整数。`);
      return;
    }
    setBriefError(null);
    quiz.confirmPaperBrief({ questionCount: paperTypes.length, questionTypes: paperTypes, totalScore: paperTotalScore });
  };
  const togglePaperType = (type: QuizQuestionType, checked: boolean) => {
    setPaperTypes((current) => checked ? Object.freeze([...current, type]) : Object.freeze(current.filter((candidate) => candidate !== type)));
    setBriefError(null);
  };
  const submitSupplement = () => {
    const text = composerDraft.trim();
    if (!text) return;
    setSupplements((current) => Object.freeze([...current, Object.freeze({ id: current.length + 1, text })]));
    setComposerDraft('');
  };
  const savePersonalQuiz = () => {
    if (!run.artifact || !workspace.personalContent) {
      setPersonalSaveError('当前个人内容库不可用，测验试卷未保存。');
      return;
    }
    const result = workspace.personalContent.publish({
      idempotencyKey: `save-${workspace.personalContent.accountId}-${run.id}-${run.artifact.id}-${run.artifact.version}`,
      contentType: 'quiz',
      title: run.artifact.title,
      description: run.artifact.description,
      stage: '高中',
      subject: '物理',
      tags: ['测验', '动量守恒'],
      sourceRunRef: run.id,
      sourceArtifactRef: { id: run.artifact.id, version: run.artifact.version },
      assetFormat: 'teacherin-quiz-json',
      visibility: 'private',
      decidedAt: '2026-08-25T10:55:00+08:00',
    });
    setPersonalSaveError(result.status === 'success' ? null : '内容证据不一致，测验试卷未保存，请重新检查后再试。');
    if (result.status === 'success') quiz.markArtifactSaved();
  };

  return (
    <section className={conversationStyles.page} data-inspector-open={inspectorOpen} aria-labelledby="quiz-run-title">
      <main className={conversationStyles.main}>
        <header className={conversationStyles.header}>
          <div><h1 id="quiz-run-title">{run.artifact?.title ?? (standalone ? '生成测验试卷' : '生成测验并创建活动草稿')}</h1><span className={conversationStyles.runStatus} data-status={activeRunStage ? 'running' : 'idle'} role="status">{activeRunStage ? <LoaderCircle className={conversationStyles.spinner} aria-hidden="true" size={14} /> : <i aria-hidden="true" />}{runStatusLabel}</span></div>
          <div className={conversationStyles.headerActions}>
            <button type="button" aria-pressed={inspectorOpen && inspectorMode === 'context'} onClick={() => { setInspectorMode('context'); setInspectorOpen(true); }}>上下文 · {contextCount}</button>
            <button type="button" aria-pressed={inspectorOpen && inspectorMode === 'output'} disabled={!run.artifact} onClick={() => { setInspectorMode('output'); setInspectorOpen(true); }}>产出 · {run.artifact ? 1 : 0}</button>
            <button type="button" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((current) => !current)}><PanelRight aria-hidden="true" size={15} />{inspectorOpen ? '收起辅助区' : '展开辅助区'}</button>
          </div>
        </header>

        <div className={conversationStyles.timeline} role="feed" aria-label="测验活动任务时间线" ref={timelineRef}>
          <TimelineEvent state="completed" icon={<Sparkles aria-hidden="true" size={16} />} title="已理解测验目标" summary={standalone ? '将依据你确认的教学范围和上传资料生成试卷；当前不会读取或写入 ClassIn 教学活动。' : `${run.target.label} · 将基于当前单元生成试卷，并且只创建教师可见草稿。`} />

          {run.stage === 'needs_parameters' ? (
            <article className={styles.card} data-state="requires_teacher_input" aria-label="确认试卷结构">
              <header><span className={styles.eventMark}><FileQuestion aria-hidden="true" size={16} /></span><div><strong>这份测验准备怎么出题？</strong><p>我先确认题型和总分；题量会根据已选题型自动计算。</p></div></header>
              <form className={styles.briefForm} onSubmit={(event) => { event.preventDefault(); confirmPaperBrief(); }}>
                <div className={styles.confirmationHeader}><span>需要你的确认</span><small>第 1 步，共 4 个教师确认点</small></div>
                <fieldset><legend>选择题型</legend><div className={styles.typeOptions}>{AVAILABLE_QUESTION_TYPES.map((type) => <label key={type}><input type="checkbox" checked={paperTypes.includes(type)} onChange={(event) => togglePaperType(type, event.target.checked)} />{QUESTION_TYPE_LABELS[type]}</label>)}</div></fieldset>
                <div className={styles.briefFields}><label>题目数量<input aria-label="题目数量" readOnly value={paperTypes.length} /></label><label>试卷总分<input aria-label="试卷总分" type="number" min={Math.max(1, paperTypes.length)} step="1" value={paperTotalScore} onChange={(event) => { setPaperTotalScore(Number(event.target.value)); setBriefError(null); }} /></label></div>
                <p className={styles.teacherEditionNote}>教师版将包含每道题的标准答案和逐题解析。</p>
                {briefError ? <p className={styles.formError} role="alert">{briefError}</p> : null}
                <div className={styles.cardActions}><button className={styles.primary} type="submit">确认以上要求并生成</button></div>
              </form>
            </article>
          ) : null}

          {run.stage !== 'needs_parameters' ? <TimelineEvent state="completed" icon={<CheckCircle2 aria-hidden="true" size={16} />} title="试卷结构已确认" summary={`${run.brief.questionCount} 题 · ${run.brief.totalScore} 分 · 教师版包含标准答案与逐题解析。`} /> : null}

          {run.stage === 'plan_ready' ? <TimelineEvent state="running" icon={<LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />} title="正在整理生成方案" summary="正在把测评目标拆成题型、分值、答案与校验步骤。" status /> : null}

          {run.stage === 'generating' ? (
            <article className={styles.progressEvent} data-state="running" role="status" aria-live="polite" aria-label="测验生成进度">
              <header><span className={styles.eventMark}><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} /></span><div><strong>正在生成并校验测验试卷</strong><p>第 {experience.generationStepIndex + 1}/{QUIZ_GENERATION_STEPS.length} 步 · {QUIZ_GENERATION_STEPS[experience.generationStepIndex]?.title}</p></div></header>
              <ol>{QUIZ_GENERATION_STEPS.map((step, index) => <li key={step.id} data-state={index < experience.generationStepIndex ? 'completed' : index === experience.generationStepIndex ? 'running' : 'queued'}>{index < experience.generationStepIndex ? <CheckCircle2 aria-hidden="true" size={15} /> : index === experience.generationStepIndex ? <LoaderCircle className={styles.spinner} aria-hidden="true" size={15} /> : <Circle aria-hidden="true" size={15} />}<span><strong>{step.title}</strong><small>{step.summary}</small></span></li>)}</ol>
            </article>
          ) : null}

          {run.artifact ? <TimelineEvent state="completed" icon={<CheckCircle2 aria-hidden="true" size={16} />} title="测验试卷已生成" summary={`${run.artifact.questions.length} 题 · ${run.artifact.totalScore} 分；答案与解析校验通过。`}><button className={styles.artifactLink} type="button" aria-controls="quiz-run-inspector" aria-expanded={inspectorOpen && inspectorMode === 'output'} onClick={() => { setInspectorMode('output'); setInspectorOpen(true); }}><FileQuestion aria-hidden="true" size={15} />查看生成的测验试卷</button></TimelineEvent> : null}

          {run.stage === 'awaiting_paper_review' ? (
            <article className={styles.card} data-state="requires_teacher_input" aria-label="审阅并确认测验试卷">
              <header><span className={styles.eventMark}><FileQuestion aria-hidden="true" size={16} /></span><div><strong>请先审阅并确认测验试卷</strong><p>{standalone ? '请检查题目、选项、答案和解析；确认后可保存到当前账号的个人内容库。' : '活动设置依赖当前试卷内容。请检查题目、选项、答案和解析，确认后我再继续准备活动参数。'}</p></div></header>
              <div className={styles.confirmationHeader}><span>需要你的确认</span><small>第 2 步，共 4 个教师确认点</small></div>
              <div className={styles.cardActions}>{inspectorOpen && inspectorMode === 'output' ? <span className={styles.reviewOpenStatus}><CheckCircle2 aria-hidden="true" size={15} />试卷已在右侧打开，请完成审阅</span> : <button className={styles.primary} type="button" onClick={() => { setInspectorMode('output'); setInspectorOpen(true); }}>打开试卷审阅</button>}</div>
            </article>
          ) : null}

          {run.paperReview ? <TimelineEvent state="completed" icon={<CheckCircle2 aria-hidden="true" size={16} />} title="试卷内容已确认" summary={`${run.paperReview.artifactRef.version} · 已确认题目、答案与解析，${standalone ? '可保存到个人内容库。' : '可继续设置测验活动。'}`} /> : null}

          {standalone && run.stage === 'awaiting_activity_parameters' && !personalQuizReceipt ? (
            <article className={styles.card} data-state="requires_teacher_input" aria-label="保存测验试卷到个人内容库">
              <header><ShieldCheck aria-hidden="true" size={19} /><div><strong>保存到个人内容库</strong><p>当前仅保存已确认的试卷内容，不创建班级教学活动，也不会写入 ClassIn。</p></div></header>
              <div className={styles.confirmationHeader}><span>需要你的确认</span><small>独立产品内保存</small></div>
              <p>连接 ClassIn 后，才可进一步选择班级、课程与单元，并把这份试卷创建为教师可见的测验活动草稿。</p>
              {personalSaveError ? <p className={styles.formError} role="alert">{personalSaveError}</p> : null}
              <div className={styles.cardActions}><button className={styles.primary} type="button" onClick={savePersonalQuiz}>确认保存试卷</button><Link className={styles.secondary} to={STANDALONE_TEACHERIN_ROUTES.classIn}>了解连接 ClassIn 后的能力</Link></div>
            </article>
          ) : null}

          {standalone && personalQuizReceipt ? (
            <article className={styles.receipt} aria-label="个人测验内容保存回执">
              <CheckCircle2 aria-hidden="true" size={21} /><div><strong>测验试卷已保存到个人内容库</strong><p>已保留试卷、教师版答案与逐题解析，可继续查看或改编。</p><span>对象版本 · {personalQuizReceipt.objectVersion}</span></div>
              <Link className={styles.primary} to={STANDALONE_TEACHERIN_ROUTES.content}>查看内容资源</Link>
            </article>
          ) : null}

          {!standalone && run.stage === 'awaiting_activity_parameters' ? (
            <article className={styles.card} aria-label="测验活动参数">
              <header><ClipboardCheck aria-hidden="true" size={19} /><div><strong>确认测验活动参数</strong><p>班级、课程和单元来自已确认 Context；其余字段可在创建草稿前调整。</p></div></header>
              <div className={styles.confirmationHeader}><span>需要你的确认</span><small>第 3 步，共 4 个教师确认点</small></div>
              <div className={styles.formGrid}>
                <label>活动标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                <label>评分方案<select value={scoring} onChange={(event) => setScoring(event.target.value as QuizScoringScheme)}>{Object.entries(SCORING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className={styles.wide}>活动说明<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                <label>开始时间<input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
                <label>截止时间<input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
                <label>答题限时<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="unlimited">不限时</option>{[10, 40, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} 分钟</option>)}<option value="custom">自定义</option></select></label>
                {duration === 'custom' ? <label>自定义限时（分钟）<input type="number" min="1" step="1" value={customDuration} onChange={(event) => setCustomDuration(Number(event.target.value))} /></label> : null}
                <label>归属位置<input readOnly value={run.target.label} /></label>
              </div>
              {settingsError ? <p className={styles.formError} role="alert">{settingsError}</p> : null}
              <button className={styles.primary} type="button" onClick={() => setSettingsError(quiz.prepareDraft(activitySettings()))}>准备创建草稿</button>
            </article>
          ) : null}

          {!standalone && run.stage === 'awaiting_approval' && run.action ? (
            <article className={styles.approval} aria-label="创建测验活动草稿确认">
              <header><ShieldCheck aria-hidden="true" size={20} /><div><strong>将创建草稿，不会发布</strong><p>{run.action.difference}</p></div></header>
              <div className={styles.confirmationHeader}><span>最终写回确认</span><small>第 4 步，共 4 个教师确认点</small></div>
              <p>{run.action.impact}</p>
              <dl>
                <div><dt>写入目标</dt><dd>{run.action.target.label}</dd></div>
                <div><dt>对象版本</dt><dd>{run.action.target.expectedVersion}</dd></div>
                <div><dt>风险</dt><dd>低风险；仅新增教师可见草稿</dd></div>
                <div><dt>可逆性</dt><dd>{run.action.reversible ? '可撤销，可在发布前删除或继续编辑' : '不可撤销'}</dd></div>
                <div><dt>发布状态</dt><dd>教师可见草稿</dd></div>
              </dl>
              <button className={styles.primary} type="button" onClick={quiz.approveDraft}>确认创建草稿</button>
            </article>
          ) : null}

          {!standalone && run.stage === 'creating_draft' ? <TimelineEvent state="running" icon={<LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />} title="正在创建测验活动草稿" summary="正在校验权限、目标版本和审批证据。" status /> : null}

          {!standalone && failedReceipt ? (
            <article className={styles.failure} role="alert" aria-label="测验活动草稿创建未完成">
              <div>
                <strong>{run.stage === 'permission_denied' ? '当前目标无创建权限' : run.stage === 'version_conflict' ? '目标单元已发生变化' : run.stage === 'evidence_mismatch' ? '执行证据需要人工复查' : run.stage === 'timeout' ? '创建请求超时' : '草稿暂未创建'}</strong>
                <p>{failedReceipt.result}</p>
                <span>测验活动草稿执行回执 · 未将本次结果标记为已创建</span>
              </div>
              {(run.stage === 'recoverable_failure' || run.stage === 'timeout') ? <button className={styles.primary} type="button" onClick={quiz.retryDraft}>安全重试</button> : null}
              {run.stage === 'version_conflict' ? <button className={styles.primary} type="button" onClick={quiz.refreshTarget}>刷新目标并重新确认</button> : null}
              {run.stage === 'permission_denied' ? <Link className={styles.secondary} to={workBuddyNewTaskPath(profile)}>结束并更换授权目标</Link> : null}
              {run.stage === 'evidence_mismatch' ? <Link className={styles.secondary} to={`/teacher/classes/${run.target.classId}?course=${run.target.courseId}&unit=${run.target.unitId}&source=workbuddy-review`}>进入班级课程人工复查</Link> : null}
            </article>
          ) : null}

          {!standalone && receipt ? (
            <article className={styles.receipt} aria-label="测验活动草稿执行回执">
              <CheckCircle2 aria-hidden="true" size={21} /><div><strong>测验活动草稿已创建</strong><p>{receipt.result}</p><span>{receipt.object.label} · 草稿 · {run.artifact?.questions.length} 题 · {run.artifact?.totalScore} 分</span></div>
              <Link className={styles.primary} to={receipt.object.returnUrl}>前往班级课程详情审阅</Link>
            </article>
          ) : null}

          {supplements.map((supplement) => <div className={styles.supplementPair} key={supplement.id}><TimelineEvent state="completed" icon={<UserRound aria-hidden="true" size={16} />} title="你补充了要求" summary={supplement.text} /><TimelineEvent state="completed" icon={<Sparkles aria-hidden="true" size={16} />} title={`${TEACHERIN_BRAND.shortName} 已收到`} summary={`我会把这条补充保留在当前任务对话中；${standalone ? '试卷结构仍可在确认前调整。' : '结构和活动字段仍可在对应确认项中调整。'}`} /></div>)}
        </div>

        <WorkspaceComposer ariaLabel={`向 ${TEACHERIN_BRAND.shortName} 补充要求`} className={conversationStyles.runComposerDock} groupLabel="测验任务补充输入" hint={run.stage === 'generating' ? '试卷生成中，也可以继续补充要求' : '补充要求会保留在当前任务对话中'} maxLength={4_000} countThreshold={3_200} onSubmit={submitSupplement} onValueChange={setComposerDraft} placeholder="补充要求、调整测验或继续追问…" submitLabel="发送补充要求" value={composerDraft} />
      </main>

      <aside className={conversationStyles.inspector} id="quiz-run-inspector" aria-label="任务辅助区" hidden={!inspectorOpen}>
        <div className={conversationStyles.tabs} role="tablist" aria-label="任务辅助区视图"><button type="button" role="tab" aria-selected={inspectorMode === 'context'} onClick={() => setInspectorMode('context')}>上下文</button><button type="button" role="tab" aria-selected={inspectorMode === 'output'} disabled={!run.artifact} onClick={() => setInspectorMode('output')}>产出 · {run.artifact ? 1 : 0}</button></div>
        <div className={styles.contextPanel} hidden={inspectorMode !== 'context'}><CoreContextPanel readOnly onClose={() => setInspectorOpen(false)} /></div>
        <section className={styles.outputPanel} aria-label="测验试卷产出" hidden={inspectorMode !== 'output' || !run.artifact}>
          {run.artifact ? <><header><FileQuestion aria-hidden="true" size={18} /><div><strong>{run.artifact.title}</strong><span>测验试卷</span></div></header><p>{run.artifact.description}</p><div className={styles.paperSummary}><span>{run.artifact.version}</span><strong>{run.artifact.questions.length} 题</strong><strong>{run.artifact.totalScore} 分</strong><span>教师版答案与解析</span></div><ol>{run.artifact.questions.map((question) => <li key={question.id}><div><strong>{QUESTION_TYPE_LABELS[question.type]} · {question.score} 分</strong><span>{question.difficulty === 'easy' ? '易' : '中档'}</span></div><p>{question.prompt}</p>{question.options?.length ? <ul className={styles.options} aria-label={`${QUESTION_TYPE_LABELS[question.type]}选项`}>{question.options.map((option, index) => <li key={option}><span>{String.fromCharCode(65 + index)}.</span><span>{option}</span></li>)}</ul> : null}<details><summary>查看答案与解析</summary><b>答案：{question.answer}</b><p>{question.explanation}</p></details></li>)}</ol></> : null}
        </section>
        {inspectorMode === 'output' && run.stage === 'awaiting_paper_review' ? <section className={styles.reviewAction} aria-label="试卷审阅确认"><div><strong>{standalone ? '确认后才能保存试卷' : '确认后才能设置活动'}</strong><p>{standalone ? '请确认题目、答案和解析可保存为当前账号的个人内容。' : '请确认题目、答案和解析可作为当前测验草稿的内容。'}</p></div><button className={styles.primary} type="button" onClick={() => { quiz.approvePaper(); setInspectorOpen(false); }}>{standalone ? '确认试卷内容，准备保存' : '确认试卷内容，继续设置活动'}</button></section> : null}
        {inspectorMode === 'output' && run.paperReview ? <section className={styles.reviewedState} aria-label="试卷已确认"><CheckCircle2 aria-hidden="true" size={16} /><span>当前 {run.paperReview.artifactRef.version} 已由教师确认</span></section> : null}
      </aside>
    </section>
  );
}

function TimelineEvent({ state, icon, title, summary, status = false, children }: Readonly<{
  state: 'completed' | 'running';
  icon: ReactNode;
  title: string;
  summary: string;
  status?: boolean;
  children?: ReactNode;
}>) {
  return <article className={styles.event} data-state={state} role={status ? 'status' : undefined}><span className={styles.eventMark}>{icon}</span><div><strong>{title}</strong><p>{summary}</p>{children}</div></article>;
}
