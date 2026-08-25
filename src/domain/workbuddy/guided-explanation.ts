export type GuidedExplanationStep = Readonly<{
  id: string;
  title: string;
  body: string;
  checkpoint?: string;
}>;

export type GuidedExplanationArtifact = Readonly<{
  id: string;
  version: number;
  runRef: string;
  contextSnapshotId: string;
  title: string;
  question: string;
  summary: string;
  steps: readonly GuidedExplanationStep[];
  finalAnswer: string;
  delivery: Readonly<{
    body: string;
    linkLabel: string;
  }>;
  presentation: Readonly<{ kind: 'interactive'; preferredAdapter: 'html-h5' }>;
  sourceRef: Readonly<{ threadId: string; messageExcerpt: string }>;
  generatedAt: string;
  truthLabel: '[模拟] TeachBuddy 交互讲题内容';
}>;

export type GuidedExplanationRevision = Readonly<{
  messageBody?: string;
  title?: string;
  summary?: string;
  question?: string;
  steps?: readonly GuidedExplanationStep[];
  finalAnswer?: string;
}>;

export type GuidedExplanationArtifactRef = Readonly<{ id: string; version: number }>;

export type GuidedExplanationContentDraft = Readonly<{
  kind: 'guided-explanation';
  artifactRef: Readonly<{ id: string; version: string }>;
  title: string;
  summary: string;
  question: string;
  steps: readonly GuidedExplanationStep[];
  finalAnswer: string;
  linkLabel: string;
  presentation: 'interactive-html';
  truthLabel: '[模拟]';
}>;

export type GuidedExplanationContentReference = GuidedExplanationContentDraft & Readonly<{
  evidence: Readonly<{
    runRef: string;
    contextSnapshotId: string;
    artifactRef: GuidedExplanationArtifactRef;
    actionId: string;
    approvalId: string;
    receiptId: string;
  }>;
}>;

export type SendGuidedExplanationAction = Readonly<{
  id: string;
  kind: 'send-guided-explanation';
  runRef: string;
  status: 'proposed' | 'approved';
  contextSnapshotId: string;
  artifactRef: GuidedExplanationArtifactRef;
  target: Readonly<{ classId: string; threadId: string; kind: 'class' | 'direct'; label: string }>;
  actor: Readonly<{ teacherId: string; teacherName: string }>;
  body: string;
  content: GuidedExplanationContentDraft;
  permission: 'allowed';
  idempotencyKey: string;
}>;

export type GuidedExplanationApproval = Readonly<{
  id: string;
  actionId: string;
  decision: 'approved';
  artifactRef: GuidedExplanationArtifactRef;
  decidedBy: string;
  decidedAt: string;
}>;

type GuidedExplanationReceiptBase = Readonly<{
  id: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
  runRef: string;
  contextSnapshotId: string;
  artifactRef: GuidedExplanationArtifactRef;
  executedAt: string;
  truthLabel: '[模拟] ClassIn 讲题内容分发回执';
}>;

export type GuidedExplanationReceipt =
  | GuidedExplanationReceiptBase & Readonly<{ status: 'success'; artifactSaved: true; message: Readonly<{ id: string; threadId: string; authorName: string }>; result: string }>
  | GuidedExplanationReceiptBase & Readonly<{ status: 'permission_denied'; result: string; recovery: 'request-permission' }>
  | GuidedExplanationReceiptBase & Readonly<{ status: 'recoverable_failure'; result: string; recovery: 'retry' }>;

export type PrepareGuidedExplanationInput = Readonly<{
  runRef: string;
  classId: string;
  classLabel: string;
  threadId: string;
  targetKind: 'class' | 'direct';
  targetLabel: string;
  teacherId: string;
  teacherName: string;
  question: string;
  generatedAt: string;
}>;

function normalizedQuestion(value: string): string {
  return value.trim().replace(/^[^，。！？：]{1,12}[，：]\s*/u, '').slice(0, 180);
}

function looksLikeQuestion(value: string): boolean {
  return /[？?]|第\s*\d+\s*题|怎么|为什么|如何|不会|求解|判断/u.test(value);
}

export function prepareGuidedExplanation(input: PrepareGuidedExplanationInput): Readonly<{
  artifact: GuidedExplanationArtifact;
  action: SendGuidedExplanationAction;
}> | null {
  const question = normalizedQuestion(input.question);
  if (!question || !looksLikeQuestion(question)) return null;
  const runRef = input.runRef;
  const contextSnapshotId = `context-guided-explanation-${runRef}`;
  const resolvedQuestion = '质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰。碰后 A 以 1.0 m/s 向左反弹，忽略外力，求小球 B 碰后的速度大小和方向。';
  const delivery = Object.freeze({
    body: input.targetKind === 'class'
      ? '同学们，今天动量守恒练习单第 5 题的完整解法已经整理好了。请打开分步讲解，按顺序核对正方向、动量守恒列式和计算过程。'
      : `${input.targetLabel}，今天动量守恒练习单第 5 题的完整解法我已经整理好了。请打开分步讲解，按顺序核对正方向、动量守恒列式和计算过程。`,
    linkLabel: '查看分步讲解',
  });
  const artifact: GuidedExplanationArtifact = Object.freeze({
    id: `artifact-${runRef}`,
    version: 1,
    runRef,
    contextSnapshotId,
    title: '小球正碰：用动量守恒求碰后速度',
    question: resolvedQuestion,
    summary: '把向右规定为正方向，给反弹速度加负号，再用动量守恒计算并核验碰后速度。',
    steps: Object.freeze([
      Object.freeze({ id: 'read', title: '提取已知量并标注方向', body: "小球 A：m_A = 0.20 kg，碰前 v_A = +5.0 m/s，碰后向左反弹，所以 v'_A = -1.0 m/s。小球 B：m_B = 0.30 kg，碰前静止，所以 v_B = 0。", checkpoint: "为什么碰后 A 的速度 v'_A 要写成 -1.0 m/s？" }),
      Object.freeze({ id: 'equation', title: '建立动量守恒方程', body: "忽略外力，A、B 组成的系统动量守恒：m_Av_A + m_Bv_B = m_Av'_A + m_Bv'_B。未知量是碰后 B 的速度 v'_B。", checkpoint: '方程两边是否分别对应碰撞前和碰撞后的总动量？' }),
      Object.freeze({ id: 'calculate', title: "代入数值求 v'_B", body: "0.20×5.0 + 0.30×0 = 0.20×(-1.0) + 0.30×v'_B。移项得 0.30×v'_B = 1.20，因此 v'_B = 1.20÷0.30 = 4.0 m/s。", checkpoint: '质量使用 kg、速度使用 m/s 后，结果单位是否为 m/s？' }),
      Object.freeze({ id: 'check', title: '解释方向并验算', body: "v'_B = +4.0 m/s，正号表示 B 向右运动。验算：碰前总动量为 0.20×5.0 = 1.00 kg·m/s；碰后为 0.20×(-1.0)+0.30×4.0 = 1.00 kg·m/s，前后一致。", checkpoint: '最终答案是否同时写出了速度大小和方向？' }),
    ]),
    finalAnswer: "取向右为正方向，由动量守恒：\nm_Av_A + m_Bv_B = m_Av'_A + m_Bv'_B\n0.20×5.0 + 0 = 0.20×(-1.0) + 0.30×v'_B\n解得 v'_B = 4.0 m/s。结果为正，说明小球 B 碰撞后以 4.0 m/s 的速度向右运动。",
    delivery,
    presentation: Object.freeze({ kind: 'interactive', preferredAdapter: 'html-h5' }),
    sourceRef: Object.freeze({ threadId: input.threadId, messageExcerpt: question }),
    generatedAt: input.generatedAt,
    truthLabel: '[模拟] TeachBuddy 交互讲题内容',
  });
  const content: GuidedExplanationContentDraft = Object.freeze({
    kind: 'guided-explanation', artifactRef: Object.freeze({ id: artifact.id, version: `v${artifact.version}` }),
    title: artifact.title, summary: artifact.summary, question: artifact.question, steps: artifact.steps,
    finalAnswer: artifact.finalAnswer, linkLabel: artifact.delivery.linkLabel, presentation: 'interactive-html', truthLabel: '[模拟]',
  });
  const action: SendGuidedExplanationAction = Object.freeze({
    id: `action-guided-explanation-${runRef}-v1`, kind: 'send-guided-explanation', runRef,
    status: 'proposed', contextSnapshotId, artifactRef: Object.freeze({ id: artifact.id, version: 1 }),
    target: Object.freeze({ classId: input.classId, threadId: input.threadId, kind: input.targetKind, label: input.targetLabel }),
    actor: Object.freeze({ teacherId: input.teacherId, teacherName: input.teacherName }),
    body: artifact.delivery.body,
    content, permission: 'allowed', idempotencyKey: `guided-explanation:${runRef}:${artifact.id}:v1`,
  });
  return Object.freeze({ artifact, action });
}

export function reviseGuidedExplanation(
  current: Readonly<{ artifact: GuidedExplanationArtifact; action: SendGuidedExplanationAction }>,
  revision: GuidedExplanationRevision,
) {
  const revisedSteps = revision.steps
    ? Object.freeze(current.artifact.steps.map((currentStep) => {
      const proposed = revision.steps?.find(({ id }) => id === currentStep.id);
      if (!proposed) return currentStep;
      const checkpoint = Object.prototype.hasOwnProperty.call(proposed, 'checkpoint')
        ? proposed.checkpoint?.trim() || undefined
        : currentStep.checkpoint;
      return Object.freeze({
        id: currentStep.id,
        title: proposed.title.trim() || currentStep.title,
        body: proposed.body.trim() || currentStep.body,
        checkpoint,
      });
    }))
    : current.artifact.steps;
  const editable = Object.freeze({
    messageBody: revision.messageBody?.trim() || current.artifact.delivery.body,
    title: revision.title?.trim() || current.artifact.title,
    summary: revision.summary?.trim() || current.artifact.summary,
    question: revision.question?.trim() || current.artifact.question,
    steps: revisedSteps,
    finalAnswer: revision.finalAnswer?.trim() || current.artifact.finalAnswer,
  });
  const noChange = editable.title === current.artifact.title
    && editable.messageBody === current.artifact.delivery.body
    && editable.summary === current.artifact.summary
    && editable.question === current.artifact.question
    && editable.finalAnswer === current.artifact.finalAnswer
    && JSON.stringify(editable.steps) === JSON.stringify(current.artifact.steps);
  if (noChange) return current;
  const version = current.artifact.version + 1;
  const artifact = Object.freeze({
    ...current.artifact,
    title: editable.title,
    summary: editable.summary,
    question: editable.question,
    steps: editable.steps,
    finalAnswer: editable.finalAnswer,
    delivery: Object.freeze({ ...current.artifact.delivery, body: editable.messageBody }),
    version,
  });
  const content = Object.freeze({
    ...current.action.content,
    artifactRef: Object.freeze({ id: artifact.id, version: `v${version}` }),
    title: artifact.title,
    summary: artifact.summary,
    question: artifact.question,
    steps: artifact.steps,
    finalAnswer: artifact.finalAnswer,
  });
  const action = Object.freeze({ ...current.action, id: `action-guided-explanation-${current.action.runRef}-v${version}`, status: 'proposed' as const, artifactRef: Object.freeze({ id: artifact.id, version }), body: artifact.delivery.body, content, idempotencyKey: `guided-explanation:${current.action.runRef}:${artifact.id}:v${version}` });
  return Object.freeze({ artifact, action });
}

export function approveGuidedExplanation(
  current: Readonly<{ artifact: GuidedExplanationArtifact; action: SendGuidedExplanationAction }>,
  teacherId: string,
  decidedAt: string,
) {
  const { action, artifact } = current;
  if (
    action.actor.teacherId !== teacherId
    || action.permission !== 'allowed'
    || action.artifactRef.id !== artifact.id
    || action.artifactRef.version !== artifact.version
  ) return null;
  const approvedAction = Object.freeze({ ...action, status: 'approved' as const });
  const approval: GuidedExplanationApproval = Object.freeze({ id: `approval-${approvedAction.id}`, actionId: approvedAction.id, decision: 'approved', artifactRef: approvedAction.artifactRef, decidedBy: teacherId, decidedAt });
  return Object.freeze({ action: approvedAction, approval });
}

export function isVerifiedGuidedExplanationContentReference(reference: GuidedExplanationContentReference): boolean {
  return reference.evidence.runRef.length > 0
    && reference.evidence.contextSnapshotId.length > 0
    && reference.evidence.actionId.length > 0
    && reference.evidence.approvalId.length > 0
    && reference.evidence.receiptId.length > 0
    && reference.evidence.artifactRef.id === reference.artifactRef.id
    && `v${reference.evidence.artifactRef.version}` === reference.artifactRef.version;
}

export const GuidedExplanationModule = Object.freeze({ prepare: prepareGuidedExplanation, revise: reviseGuidedExplanation, approve: approveGuidedExplanation, isVerifiedContentReference: isVerifiedGuidedExplanationContentReference });
