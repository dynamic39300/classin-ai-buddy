import type { CapabilityContextManifest } from '@domain/workbuddy/core-context';
import type { WorkBuddyRuntimeFixture } from '@contracts/workbuddy/runtime-fixture';
import type { CoursewareExecutionOutput, CoursewareRunDefinition } from '@domain/workbuddy/course-production';
import type { CoursePackageDefinition } from '@domain/workbuddy/course-package';
import type { PackageActionInput } from '@domain/workbuddy/package-writeback';
import type { CoursewareSaveActionInput } from '@domain/workbuddy/writeback';

export const WORKBUDDY_COURSEWARE_DEFINITION: CoursewareRunDefinition = Object.freeze({
  fixtureVersion: 'workbuddy-m4-course-production-v1', id: 'run-m4-courseware', title: '生成动量守恒模型课件',
  initialBrief: Object.freeze({ durationMinutes: 45, teachingApproach: '实验探究', expectedPages: 18 }),
  plan: Object.freeze([
    Object.freeze({ id: 'step-analyze-goal', title: '理解教学目标', capability: 'goal-interpreter', expectedOutput: '目标与课时约束' }),
    Object.freeze({ id: 'step-design-structure', title: '设计教学结构', capability: 'lesson-structure', expectedOutput: '导入、建模、例题与练习结构' }),
    Object.freeze({ id: 'step-generate-courseware', title: '组装课件初稿', capability: 'courseware-renderer', expectedOutput: '可审阅课件草稿' }),
    Object.freeze({ id: 'step-validate-courseware', title: '检查教学与内容质量', capability: 'courseware-quality-check', expectedOutput: '验证结果与修改建议' }),
  ]),
});

export const WORKBUDDY_COURSEWARE_OUTPUT: CoursewareExecutionOutput = Object.freeze({
  events: Object.freeze([
    Object.freeze({ id: 'event-context', title: '核心上下文已载入', summary: '冻结的教学范围与资源引用已校验。', state: 'completed' }),
    Object.freeze({ id: 'event-plan', title: '任务计划已确认', summary: '教师确认四步执行计划与课件交付物。', state: 'completed' }),
    Object.freeze({ id: 'event-structure', title: '教学结构已生成', summary: '从碰撞实验进入动量守恒模型，再进入例题与练习。', capability: 'lesson-structure', state: 'completed' }),
    Object.freeze({ id: 'event-draft', title: '课件草稿已组装', summary: '[模拟]课件页面与讲解结构已形成。', capability: 'courseware-renderer', state: 'completed' }),
    Object.freeze({ id: 'event-validation', title: '质量检查通过', summary: '目标、结构、术语与练习覆盖检查通过。', capability: 'courseware-quality-check', state: 'completed' }),
  ]),
  artifact: Object.freeze({
    id: 'artifact-courseware-momentum-v1', kind: 'courseware', version: 'v1', title: '动量守恒模型：从碰撞实验到守恒定律',
    pageCount: 18, sourceStepId: 'step-generate-courseware', validationState: 'passed',
    validationSummary: '教学目标、内容结构、术语与课堂练习覆盖检查通过', truthLabel: '[模拟]课件草稿 · 未写入 ClassIn',
  }),
});

export const WORKBUDDY_CAPABILITY_MANIFESTS: readonly CapabilityContextManifest[] = Object.freeze([
  Object.freeze({ capabilityId: 'goal-interpreter', purpose: '解释教学目标与边界', allowedSections: Object.freeze(['actor_organization', 'teaching_scope', 'domain_knowledge'] as const) }),
  Object.freeze({ capabilityId: 'lesson-structure', purpose: '生成符合课程标准的教学结构', allowedSections: Object.freeze(['teaching_scope', 'resources_input', 'domain_knowledge'] as const) }),
  Object.freeze({ capabilityId: 'courseware-renderer', purpose: '组装课件内容与页面', allowedSections: Object.freeze(['teaching_scope', 'resources_input', 'domain_knowledge'] as const) }),
  Object.freeze({ capabilityId: 'courseware-quality-check', purpose: '检查目标、结构和术语覆盖', allowedSections: Object.freeze(['teaching_scope', 'domain_knowledge'] as const) }),
]);

export const WORKBUDDY_COURSEWARE_SAVE_ACTION: CoursewareSaveActionInput = Object.freeze({
  id: 'action-courseware-save-1', artifactId: 'artifact-courseware-momentum-v1', artifactVersion: 'v1',
  target: Object.freeze({ classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-momentum-1-v1', label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量' }),
  difference: '新增一份课件对象，不覆盖现有课程资料', impact: '课程教师可在单元资料中查看，尚未下发给学生',
  permission: 'allowed', risk: 'low', reversible: true, expiresAt: '2026-08-21T10:05:00+08:00', idempotencyKey: 'workbuddy-courseware-save-1',
});

export const WORKBUDDY_COURSE_PACKAGE_DEFINITION: CoursePackageDefinition = Object.freeze({
  id: 'run-m4-course-package', fixtureVersion: 'workbuddy-m4-course-production-v1', title: '动量单元课程方案包',
  artifacts: Object.freeze([
    Object.freeze({ id: 'package-courseware', kind: 'courseware', title: '动量守恒模型课件', dependsOn: Object.freeze([]), state: 'planned', version: 'v1' }),
    Object.freeze({ id: 'package-homework', kind: 'homework', title: '动量守恒分层作业', dependsOn: Object.freeze(['package-courseware']), state: 'planned', version: 'v1' }),
    Object.freeze({ id: 'package-quiz', kind: 'quiz', title: '动量与碰撞随堂测验', dependsOn: Object.freeze(['package-courseware']), state: 'planned', version: 'v1' }),
    Object.freeze({ id: 'package-recording', kind: 'recording-script', title: '碰撞实验录播脚本', dependsOn: Object.freeze(['package-courseware']), state: 'planned', version: 'v1' }),
  ]),
});

export const WORKBUDDY_PACKAGE_ACTION_INPUT: PackageActionInput = Object.freeze({
  id: 'action-package-save-1',
  target: Object.freeze({ classId: 'physics-3', courseId: 'course-momentum', unitId: 'unit-momentum-1', expectedVersion: 'unit-momentum-1-v1', label: '高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量' }),
  difference: '新增教师选中的课程方案包对象，不覆盖现有资料', impact: '课程教师可查看，尚未下发给学生',
  permission: 'allowed', risk: 'medium', reversible: true, expiresAt: '2026-08-21T10:15:00+08:00', idempotencyKey: 'workbuddy-package-save-1',
});

export const WORKBUDDY_PACKAGE_FAILED_ARTIFACT_IDS = Object.freeze(['package-recording']);

export const WORKBUDDY_RUNTIME_FIXTURE: WorkBuddyRuntimeFixture = Object.freeze({
  projectionGeneratedAt: '2026-08-20T10:04:00+08:00',
  snapshot: Object.freeze({ coursewareId: 'context-snapshot-courseware-1', packageId: 'context-snapshot-package-1', replannedCoursewareId: 'context-snapshot-courseware-2', confirmedAt: '2026-08-20T10:00:00+08:00', replannedAt: '2026-08-20T10:20:00+08:00' }),
  approval: Object.freeze({ actorId: 'teacher-wang', coursewareApproveId: 'approval-courseware-save-1', coursewareRejectId: 'approval-courseware-reject-1', coursewareDecidedAt: '2026-08-20T10:05:00+08:00', packageApproveId: 'approval-package-save-1', packageRejectId: 'approval-package-reject-1', packageDecidedAt: '2026-08-20T10:15:00+08:00' }),
  coursewareRecovery: Object.freeze({ actionId: 'action-courseware-save-recovery-1', idempotencyKey: 'workbuddy-courseware-save-recovery-1', fallbackTarget: Object.freeze({ unitId: 'unit-momentum-drafts', label: '高二物理 3 班 / 动量与碰撞 / 教师草稿区' }) }),
  packageRecovery: Object.freeze({
    actionId: 'action-package-save-recovery-1', idempotencyKey: 'workbuddy-package-save-recovery-1',
    retryActionId: 'action-package-save-retry-1', retryIdempotencyKey: 'workbuddy-package-save-retry-1',
    fallbackTarget: Object.freeze({ unitId: 'unit-momentum-drafts', label: '高二物理 3 班 / 动量与碰撞 / 教师草稿区' }),
  }),
  history: Object.freeze({
    coursewareEyebrow: '高二物理 · 动量与碰撞',
    packageSummary: '课件、作业、测验与录播脚本保持独立状态。',
    packageEyebrow: '[模拟]课程方案包',
    relativeTime: '刚刚',
    eventTime: '固定事件',
    currentStepTime: '现在',
  }),
  derivedPackage: Object.freeze({ goal: '基于已审阅课件生成配套作业、测验和录播脚本', recommendedContextItemIds: Object.freeze(['physics-3', 'course-momentum', 'unit-momentum-1', 'my-root-pdf', 'physics-standard-v2']) }),
  replan: Object.freeze({
    selectedContextItemIds: Object.freeze(['physics-1', 'course-physics-1', 'unit-wave-1']),
    reason: '主教学范围从高二物理 3 班调整为高二物理 1 班',
    previousScopeLabel: '高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量',
    nextScopeLabel: '高二物理 1 班 · 机械波基础 · 第一单元 机械波',
  }),
  contextSummaryKinds: Object.freeze(['class', 'course', 'unit']),
});
