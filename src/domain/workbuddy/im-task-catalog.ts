import type { WorkBuddyImRunPlanStep, WorkBuddyImTaskId } from '@contracts/workbuddy/im-conversation-run';

export type WorkBuddyImTaskDefinition = Readonly<{
  id: WorkBuddyImTaskId;
  label: string;
  suggestionTitle: string;
  prompt: string;
  runTitle: string;
  understandingSummary: string;
  planSummary: string;
  plan: readonly WorkBuddyImRunPlanStep[];
}>;

const CLASS_CONTEXT_STEP: WorkBuddyImRunPlanStep = Object.freeze({
  id: 'resolve-class-context',
  title: '定位当前班级与群聊',
  capabilityId: 'class-context-resolver',
  capabilityLabel: 'ClassIn 班级上下文',
  purpose: '确认任务只作用于当前教师正在查看的班级群',
  inputSummary: '当前消息会话、教师身份与班级引用',
  expectedOutput: '稳定的班级与目标群聊引用',
  contextLabels: Object.freeze(['当前群聊', '教师身份']),
});

const HOMEWORK_PLAN: readonly WorkBuddyImRunPlanStep[] = Object.freeze([
  CLASS_CONTEXT_STEP,
  Object.freeze({ id: 'query-active-homework', title: '查询未截止作业', capabilityId: 'classin-homework-query', capabilityLabel: 'ClassIn 作业查询', purpose: '找出当前班级已经开始且尚未截止的正式作业', inputSummary: '班级引用、作业发布时间、开始时间与截止时间', expectedOutput: '有效作业清单与截止时间', contextLabels: Object.freeze(['班级作业', '发布时间', '截止时间']) }),
  Object.freeze({ id: 'check-submission-status', title: '核对学员提交状态', capabilityId: 'classin-submission-reader', capabilityLabel: 'ClassIn 提交状态查询', purpose: '按作业核对目标学员是否已经提交过', inputSummary: '有效作业、接收学员与最新提交状态', expectedOutput: '按作业去重的未提交学员名单', contextLabels: Object.freeze(['接收学员', '提交状态']) }),
  Object.freeze({ id: 'compose-reminder', title: '生成分组提醒草稿', capabilityId: 'workbuddy-reminder-composer', capabilityLabel: 'TeacherIn 分组提醒生成', purpose: '把未提交事实整理成教师可审阅的一条群消息', inputSummary: '作业分组、学员显示名、截止时间与教师沟通要求', expectedOutput: '一条按作业分组的可编辑提醒草稿', contextLabels: Object.freeze(['作业分组', '学员显示名', '教师要求']) }),
]);

const WEEKLY_PLAN: readonly WorkBuddyImRunPlanStep[] = Object.freeze([
  CLASS_CONTEXT_STEP,
  Object.freeze({ id: 'read-weekly-teaching-plan', title: '读取本周教学计划', capabilityId: 'classin-teaching-plan-reader', capabilityLabel: 'ClassIn 教学计划读取', purpose: '读取当前班级本周已经安排的课次和教学主题', inputSummary: '班级引用、当前周与课程教学计划', expectedOutput: '本周课次、时间和主题清单', contextLabels: Object.freeze(['本周计划', '课程进度']) }),
  Object.freeze({ id: 'derive-student-preparation', title: '提炼课前准备事项', capabilityId: 'workbuddy-preparation-planner', capabilityLabel: 'TeacherIn 课前准备提炼', purpose: '把教学安排转成学生能够提前完成的具体准备事项', inputSummary: '课次主题、教材范围与教师教学目标', expectedOutput: '按课次整理的学生准备事项', contextLabels: Object.freeze(['教学主题', '教材范围', '教学目标']) }),
  Object.freeze({ id: 'compose-weekly-notice', title: '生成班级通知草稿', capabilityId: 'workbuddy-class-notice-composer', capabilityLabel: 'TeacherIn 班级通知生成', purpose: '把本周准备事项整理成教师可审阅的一条群通知', inputSummary: '课次安排、准备事项与教师沟通要求', expectedOutput: '一条可编辑的课前准备通知草稿', contextLabels: Object.freeze(['本周课次', '准备事项', '教师要求']) }),
]);

const GUIDED_EXPLANATION_PLAN: readonly WorkBuddyImRunPlanStep[] = Object.freeze([
  CLASS_CONTEXT_STEP,
  Object.freeze({ id: 'read-question-context', title: '读取题目与学生卡点', capabilityId: 'classin-message-context-reader', capabilityLabel: 'ClassIn 消息上下文', purpose: '只读取当前线程最近的学生问题', inputSummary: '当前线程与最近消息', expectedOutput: '题目与需要讲解的卡点', contextLabels: Object.freeze(['当前线程', '最近学生消息']) }),
  Object.freeze({ id: 'compose-guided-explanation', title: '生成分步讲解', capabilityId: 'workbuddy-guided-explanation', capabilityLabel: 'TeacherIn 讲题生成', purpose: '把题目组织成学生可学习的步骤、检查点和答案', inputSummary: '题目、课程范围与教师要求', expectedOutput: '格式中立的讲题 Artifact', contextLabels: Object.freeze(['题目', '教学步骤', '答案策略']) }),
  Object.freeze({ id: 'prepare-interactive-view', title: '准备交互讲解', capabilityId: 'workbuddy-html-presentation', capabilityLabel: '交互内容投影', purpose: '为首个 Demo 生成可打开的 HTML/H5 投影', inputSummary: '讲题 Artifact 与展示策略', expectedOutput: '待教师审核的交互讲解', contextLabels: Object.freeze(['Artifact 版本', '展示适配器']) }),
]);

export const WORKBUDDY_IM_TASKS = Object.freeze([
  Object.freeze({
    id: 'homework-reminder',
    label: '作业催交',
    suggestionTitle: '核对未截止作业并提醒未提交学员',
    prompt: '请找出当前班级群里还没截止的作业中，哪些学员还没有提交；按作业分组 @ 学员并生成提醒。',
    runTitle: '作业催交',
    understandingSummary: '我会先锁定当前班级，再查询未截止作业、核对学员提交状态，最后生成一条按作业分组的提醒草稿供你审阅。',
    planSummary: '班级定位 → 有效作业查询 → 提交状态核对 → 分组提醒生成',
    plan: HOMEWORK_PLAN,
  }),
  Object.freeze({
    id: 'weekly-preparation-notice',
    label: '课前准备',
    suggestionTitle: '根据本周教学计划生成课前准备通知',
    prompt: '你帮我看看本周的教学计划，然后看看我们是不是可以让孩子们提前做好准备，给孩子们形成一条通知消息，以便我一键发给他们。',
    runTitle: '本周课前准备通知',
    understandingSummary: '我会先锁定当前班级，读取本周教学计划，提炼孩子们可以提前完成的准备事项，最后生成一条班级通知草稿供你审阅。',
    planSummary: '班级定位 → 教学计划读取 → 准备事项提炼 → 班级通知生成',
    plan: WEEKLY_PLAN,
  }),
  Object.freeze({
    id: 'guided-explanation',
    label: '单题讲解',
    suggestionTitle: '生成可打开的分步讲题内容',
    prompt: '结合当前消息里的题目，生成一份可打开的分步讲解内容；我审核后再发送。',
    runTitle: '单题交互讲解',
    understandingSummary: '我会读取当前线程中的学生问题，整理可教学的解题步骤与检查点，并生成一份可打开的交互讲解供你审核。',
    planSummary: '上下文定位 → 题目读取 → 分步讲解生成 → 交互投影准备',
    plan: GUIDED_EXPLANATION_PLAN,
  }),
] as const satisfies readonly WorkBuddyImTaskDefinition[]);

export function getWorkBuddyImTaskDefinition(taskId: WorkBuddyImTaskId): WorkBuddyImTaskDefinition {
  return WORKBUDDY_IM_TASKS.find(({ id }) => id === taskId) ?? WORKBUDDY_IM_TASKS[0];
}

export function resolveWorkBuddyImTask(goal: string): WorkBuddyImTaskDefinition {
  const normalized = goal.trim();
  if (/讲题|讲解|解题|不会做|不会解|推导/.test(normalized)) return getWorkBuddyImTaskDefinition('guided-explanation');
  if (/教学计划|提前.*准备|课前准备/.test(normalized)) return getWorkBuddyImTaskDefinition('weekly-preparation-notice');
  return getWorkBuddyImTaskDefinition('homework-reminder');
}
