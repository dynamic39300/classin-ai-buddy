---
title: WorkBuddy Quiz Activity Draft Creation Feature Spec
status: IMPLEMENTED
version: v1.4
date: 2026-08-24
source_prd: ./PRODUCT-REQUIREMENTS.md
---

# Feature Spec

## 1. Boundary

新增 `QuizActivityCreationModule`，隐藏试卷结构、参数规范化、状态转换、版本、Action/Approval/Receipt/Evaluation 关联。页面只发送命令并消费稳定 ViewModel。ClassIn `ClassActivityModule` 拥有草稿、编辑和发布规则。

## 2. Domain Model

- `QuizPaperArtifact`：`id/version/title/description/questions/totalScore/validation/truthLabel`。
- `QuizPaperReview`：`artifactRef/status/reviewedBy/reviewedAt`，只允许确认当前 Artifact 版本。
- `QuizQuestion`：`id/type/prompt/options/answer/explanation/difficulty/score`。
- `QuizActivitySettings`：`title/description/startAt/endAt/duration/scoring/classId/courseId/unitId`。
- `CreateQuizActivityDraftAction`：只允许 `kind=create-quiz-activity-draft`。
- `QuizActivityDraftReceipt`：成功对象固定 `publication=draft`，包含详情 URL；失败为关联 union。
- `ClassActivity.publication`：`draft | published`，与进行状态 `pending/upcoming/active/completed` 正交。

## 3. Interfaces and Seams

### 3.1 QuizActivityCreationModule Interface

```text
create(goal, contextSnapshot)
updatePaperBrief(patch)
generatePaper()
updateActivitySettings(patch)
proposeDraft()
approveDraft()
executeDraft()
recover(command)
project()
```

Implementation 独占命令合法性、默认值、规范化、版本与证据关联；UI 不复制业务判断。

### 3.2 Adapter Seam

`QuizActivityDraftAdapter.execute(action, approval) → QuizActivityDraftReceipt`

Adapter 校验完整载荷、教师审批、目标版本、权限和幂等请求指纹；Mock 将成功草稿投影到共享 Class Workspace Store。未来真实 ClassIn Adapter 替换该实现。

### 3.3 ClassIn Activity Seam

`ClassActivityModule.createDraft/editDraft/publish/getVisibleActivities`。发布不属于 WorkBuddy Module；必须由课程详情调用。

## 4. State Model

```text
needs_parameters
  → plan_ready
  → generating
  → awaiting_paper_review
  → awaiting_activity_parameters
  → awaiting_approval
  → creating_draft
  → draft_created

creating_draft
  → permission_denied | version_conflict | recoverable_failure | timeout | evidence_mismatch
```

每个状态定义唯一允许命令。`awaiting_paper_review` 只允许审阅/确认当前试卷；未确认前不能进入活动参数。修改试卷或活动设置必须使旧审阅证据、Action/Approval 失效并产生新版本/新幂等键。

## 5. Validation

- Context 同时包含一个 class、一个 course、一个 unit，且父子关系一致；
- 题数 `1..200`，分值均为正，总分等于题目分值之和；
- 选择题有选项且答案属于选项；判断题答案为布尔语义；所有题目必须有解析；
- `endAt > startAt`；自定义限时必须为正整数；
- 目标对象与 ContextSnapshot、Action 目标完全一致；
- Approval 必须批准当前 Action；Receipt 必须引用同一 Action/Approval/幂等键。

## 6. UI Projection

- New Task：第三个快捷入口“生成测验并创建活动草稿”；
- Run Timeline：目标理解、对话式试卷结构确认、生成结果与产出入口、活动参数卡、草稿审批、执行回执；
- Run Experience：结构确认后由 Feature Experience Seam 确定性推进 `plan_ready → generating → awaiting_paper_review`；页面逐步投影分析目标、组织题型、答案解析与校验，不为系统自有步骤提供多余按钮；试卷审阅属于教师检查点，不由计时器自动越过；
- 恢复：刷新只从持久化 Domain stage 重新绑定体验节奏，不跳过参数、Approval 或失败恢复；真实 Runtime Adapter 不继承 Demo 的人工时序；
- Clarification：教师勾选当前固定题库支持的题型并填写总分；题量由题型数派生，Mock 生成器按确认范围筛题并重新分配整数分值；
- Composer：使用共享 `WorkspaceComposer`，在所有 Run 阶段固定可达；补充消息与 WorkBuddy 回应进入当前时间线；
- Artifact Inspector：Artifact 为空时不挂载；生成完成后由时间线链接或 Header 的 `产出 · 1` 打开，提供试卷摘要、题目、教师版答案与解析及显式收起命令；
- Review Gate：进入 `awaiting_paper_review` 时自动打开产出；主时间线只提示先审阅，活动参数不渲染；Inspector 提供“确认试卷内容，继续设置活动”，成功后记录 `QuizPaperReview`、收起辅助区并进入活动参数；
- Run Shell：Header 左侧投影任务标题、运行状态和场景级真值，右侧依次提供 `上下文 · n`、`产出 · n` 和带文字的辅助区开关；辅助区使用“上下文/产出”Tab，产出为空时入口禁用，版本号只进入 Artifact 摘要，不承担展开或收起命令；
- Action 卡主提示：“将创建草稿，不会发布”；唯一主动作“确认创建草稿”；
- Receipt：状态“草稿已创建”，CTA“前往班级课程详情审阅”；
- Class Detail：活动行显示“草稿”，提供“编辑测验”和“发布”；发布后标签变“已发布”。

## 7. Test Contract

既有 M4 用户已确认的公开 Seam 继续复用：

1. Domain Module：结构/分值/时间校验、状态命令、证据与 draft-only 不变量；
2. Adapter contract：成功、幂等、载荷冲突、权限、版本冲突、超时、可恢复失败；
3. Integration：一级入口、参数卡、审批、共享 Store 草稿、详情编辑/发布、学生可见性；
4. E2E：教师完整旅程和发布前后角色可见性；
5. Visual/a11y：1440×900 Run、草稿回执、课程详情与键盘路径。
6. Dynamic Run：Integration 断言生成步骤发生可见推进，E2E 断言生成中 reload 后继续，并且不存在“开始生成试卷 / 继续设置测验活动”按钮。
7. Conversation and output：Integration 覆盖题型/总分修改实际改变 Artifact、Composer 提交与回应；E2E 覆盖生成前无 Inspector、生成后链接展开及收起；Visual 覆盖确认面、生成中与打开产出的审批状态。
8. Standard shell：Integration/E2E 断言 `产出 · 0` 禁用、Artifact 后 `产出 · 1` 可达、上下文/产出 Tab 可切换，并只能通过 Header 的文字命令收起辅助区。
9. Paper review gate：Domain 断言未确认试卷不能进入参数或 ProposedAction；Session fail-close 校验 review 引用；Integration/E2E 断言生成后自动打开试卷且参数不存在，确认后才出现参数。

测试只通过公开 Interface、可访问名称与可见状态断言，不读取私有 React 状态。

## 8. Write Set

- 本目录与 `DECISION-LEDGER.md`；
- `src/domain/workbuddy/quiz-activity-creation*`；
- `src/contracts/workbuddy/quiz-activity-draft*`；
- `src/mocks/adapters/` 与固定 Scenario；
- `src/domain/class/`、`src/features/class-workspace/`；
- `src/features/ai-agent-workspace/`、组合根；
- 对应 Domain、Adapter、Integration、E2E、Visual tests。

不修改 IM Case、M5–M10、真实网络或生产 API。
