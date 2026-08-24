---
title: WorkBuddy IM 人机协作 Ticket Breakdown
status: MULTI_AGENT_DISCOVERY_V19_COMPLETED
version: v0.19
date: 2026-08-24
---

# Ticket Breakdown

## 执行顺序

```text
IM-001 产品与规格冻结
  → IM-002 Domain Module
  → IM-003 Adapter Seams
  → IM-004 Feature Controller
  → IM-005 Teacher Sidecar
  → IM-006 Integration / E2E / Visual
  → IM-007 Implementation Review
  → IM-008 Sidecar Conversation Run Experience v0.2
  → IM-009 Immersive Message Workspace v0.3
  → IM-010 Persistent Composer and Live Run Feedback v0.4
  → IM-011 Class-context Immersive Chat v0.5
  → IM-012 Floating Assistant Workbench v0.6
  → IM-013 Auto-growing Composer v0.7
  → IM-014 Unified Surfaces and Resizable Workspace v0.8
  → IM-015 Human Review Gate and Approval Artifact v0.9
  → IM-016 Compact Four-layer Review Artifact v0.10
  → IM-017 Border-light Review Canvas v0.11
  → IM-018 Compact Execution Receipt v0.12
  → IM-019 Aligned Conversation Header v0.13
  → IM-020 Teacher Conversation Management v0.14
  → IM-021 Teacher Direct-message WorkBuddy v0.15
  → IM-022 Persistent Immersive WorkBuddy + Unified Entry v0.17
  → IM-023 Shared Class Agent Domain and Conversation Adapter v0.18
  → IM-024 Public Class Agent Mention Channel v0.18
  → IM-025 Isolated Teacher and Student Agent Direct Channels v0.18
  → IM-026 Four-entry Regression and Acceptance v0.18
  → IM-027 Agent Discovery Domain and Authorization Projection v0.19
  → IM-028 Public Picker and Composer Primary Target v0.19
  → IM-029 Teacher/Student Direct Agent Discovery v0.19
  → IM-030 Multi-Agent Regression and Acceptance v0.19
```

## IM-001 产品与规格冻结

- 需求：`IM-PRD-001`—`IM-PRD-015`
- Write Set：本目录 PRD、Feature Spec、Tickets、Traceability；Decision Ledger。
- 完成条件：三场景边界、第一切片、身份、隐私、空/错/恢复状态和非目标均有唯一事实源。
- 当前状态：`COMPLETED`

## IM-002 作业催交 Domain Module

- 需求：`IM-PRD-004`—`IM-PRD-009`、`IM-PRD-013`—`IM-PRD-014`
- Write Set：`src/domain/workbuddy/im-homework-reminder.ts` 及同目录测试。
- 交付：ContextSnapshot、ArtifactDraft、分组规则、正文渲染、版本修订、ProposedAction、Approval 和 Receipt 类型。
- 完成条件：有效作业筛选、未提交判断、去重、空状态、编辑换版、审批过期均有单元测试。
- 当前状态：`COMPLETED`

## IM-003 ClassIn Read / Write Adapter Seams

- 需求：`IM-PRD-004`、`IM-PRD-011`—`IM-PRD-015`
- Write Set：`src/contracts/workbuddy/im-homework-reminder.ts`、`src/mocks/adapters/workbuddy-im-homework-reminder.ts` 及契约测试；必要的 Message append Interface 扩展。
- 交付：ClassIn 作业事实读取和教师群消息写回的稳定 Interface；固定模拟 Adapter。
- 完成条件：成功、事实变化、权限拒绝、一次失败后重试和幂等重复确认均通过同一 Interface 测试。
- 当前状态：`COMPLETED`

## IM-004 Feature Controller / Provider

- 需求：`IM-PRD-006`—`IM-PRD-015`
- Write Set：`src/features/workbuddy-im-assistance/`。
- 交付：页面无关的状态 Projection 与 `open / close / generate / edit / toggle / approve-and-send / retry / refresh` 命令。
- 完成条件：显式覆盖 ready、generating、empty、draft-ready、sending、sent、stale、permission-denied、recoverable-failure；切换班级不复用错误快照。
- 当前状态：`COMPLETED`

## IM-005 Teacher IM Sidecar

- 需求：`IM-PRD-001`—`IM-PRD-003`、`IM-PRD-007`—`IM-PRD-012`、`IM-PRD-015`
- Write Set：`src/features/message-workspace/MessageWorkspace.tsx`、CSS Module、Sidecar 组件及集成测试。
- 交付：教师班级群 Header 入口、私密 Sidecar、参考任务、结构化草稿、正文编辑、确认影响和 Receipt。
- 完成条件：学生/私聊/只读状态无入口；宽屏共边、紧凑宽度 Overlay；Esc、焦点恢复和语义标签可用。
- 当前状态：`COMPLETED`

## IM-006 自动化与视觉验收

- 需求：全部场景一需求。
- Write Set：`tests/integration/`、`tests/e2e/`、`tests/visual/` 及必要快照。
- 交付：领域/Adapter 契约、组件集成、浏览器纵向闭环、学生不可见、可访问性和视觉证据。
- 完成条件：typecheck、lint、unit、integration、E2E、a11y、目标视觉尺寸全部通过；无溢出、遮挡和不可达操作。
- 当前状态：`COMPLETED`

## IM-007 Implementation Review

- 需求：全部场景一需求。
- Write Set：本目录 `IMPLEMENTATION-TRACEABILITY.md` 与后续 `IMPLEMENTATION-REVIEW.md`。
- 交付：需求—Spec—Ticket—代码—测试映射、实机截图、已知风险、后续场景二/三入口条件。
- 完成条件：每个 `IM-PRD-*` 有 `PASS / PARTIAL / DEFERRED` 结果和证据；不把模拟实现表述为生产就绪。
- 当前状态：`COMPLETED`

## 后续 Epic（不在本轮 Write Set）

- `IM-CHANNEL-CASE-LIBRARY`：盘点教师 WorkBuddy、公开班级 Agent、教师 Agent 私聊和学生 Agent 私聊的业务 Case List。
- 每个进入开发的 Case 继续按 PRD、权限/治理 Spec、Ticket、Implementation 和 Acceptance 独立推进；不得把本轮确定性方向判断示例扩写为完整教学能力。

## IM-008 Sidecar Conversation Run Experience v0.2

- 需求：`IM-PRD-016`—`IM-PRD-020`
- Write Set：IM PRD/Spec/Traceability、`src/features/workbuddy-im-assistance/`、相关 integration/E2E/visual tests。
- 交付：复用 Conversation Run 事件与 Progress 契约的 Sidecar Timeline；教师 Goal、目标理解、四步 Plan、Capability Call、阶段结果和 Artifact 动态出现。
- 完成条件：浏览器体验至少观察到一次目标理解 `running` 和四个 Capability 的 `running → completed`；即时 Scheduler 下顺序测试稳定；失败不产生 Artifact；宽屏与 Overlay 均无溢出。
- 当前状态：`COMPLETED`

## IM-009 Immersive Message Workspace v0.3

- 需求：`IM-PRD-021`—`IM-PRD-027`
- Write Set：App Shell 的消息显示模式 Interface、教师一级消息页面、`MessageWorkspace` 布局样式、相关 E2E / Visual 测试与本目录追踪文档。
- 交付：一级消息入口的直接沉浸、完整三栏 WorkBuddy 工作区、原位退出/再次进入、`Esc Esc`、状态与焦点恢复、紧凑宽度和 Reduced Motion 行为。
- 完成条件：Shell Mode 不拥有或重建业务状态；隐藏导航不可聚焦；退出后 URL / 会话 / 草稿 / Run 保持；WorkBuddy 仍为唯一完整 Run Surface；静态、E2E、a11y 与视觉验收通过。
- 当前状态：`COMPLETED`

## IM-010 Persistent Composer and Live Run Feedback v0.4

- 需求：`IM-PRD-028`—`IM-PRD-030`
- Write Set：IM Run Projection / Provider、WorkBuddy Sidecar / Timeline / CSS、相关 E2E / Visual 与本目录追踪文档。
- 交付：固定任务输入区、Run 中补充教师消息、旋转与扫光状态、已进行秒数、步骤预计剩余秒数和 Reduced Motion 语义。
- 完成条件：输入与 Run 状态不随 Body 滚动丢失；补充消息保持私密；计时停止于完成；静态、E2E、a11y 与视觉验收通过。
- 当前状态：`COMPLETED`

## IM-011 Class-context Immersive Chat v0.5

- 需求：`IM-PRD-031`—`IM-PRD-034`
- Write Set：可配置沉浸 Frame、App Shell 消息路由识别、教师班级聊天页、班级详情入口、`MessageWorkspace` 固定班级布局、相关 Integration / E2E / Visual 和本目录追踪文档。
- 交付：班级详情到单班级沉浸群聊的页面级导航；无会话列表的 Chat + WorkBuddy 双栏；确定性“返回班级”与来源保留；Dormant 原 Dialog 代码保留。
- 完成条件：入口不再打开 Dialog；直接路由和页面点击均进入沉浸；无全局导航与会话列表；聊天、WorkBuddy 和 Run 可操作；退出返回正确班级；静态、E2E、a11y 与视觉验收通过。
- 当前状态：`COMPLETED`

## IM-012 Floating Assistant Workbench v0.6

- 需求：`IM-PRD-035`—`IM-PRD-038`
- Write Set：`WorkBuddyImSidecar` CSS/必要语义属性、`MessageWorkspace` 辅助轨道 CSS、相关 E2E / Visual 与本目录追踪文档。
- 交付：浅灰辅助托盘、四周内缩浮层、紧凑 Context / Run Header、固定输入 Dock、宽屏与 Overlay 视觉契约。
- 明确不改变：Run Event、计时、Artifact、审批、消息写回、Provider、Adapter、路由和公开/私密边界。
- 完成条件：1440px 与 1280px 显示内缩浮层；1024px 显示带安全边距 Overlay；固定 Composer 与完整 Run 可操作；Reduced Motion、a11y、静态、E2E 与 scoped visual 通过。
- 当前状态：`COMPLETED`

## IM-013 Auto-growing Composer v0.7

- 需求：`IM-PRD-039`—`IM-PRD-042`
- Write Set：`WorkBuddyImSidecar` / CSS、消息 E2E、scoped visual、决策与 IM 交付文档。
- 交付：移除左侧装饰条；Textarea 从单行自动增长到 10rem 后内部滚动；4,000 字符上限与 80% 阈值计数。
- 明确不改变：Run、Artifact、审批、消息写回、Enter / Shift+Enter / IME、Sidecar 宽度和响应式 Overlay。
- 完成条件：短文本、换行文本和 3,201 字符长文本的高度、滚动与计数契约通过 E2E；4 个 scoped visual 无回归；静态、构建与 a11y 通过。
- 当前状态：`COMPLETED`

## IM-014 Unified Surfaces and Resizable Workspace v0.8

- 需求：`IM-PRD-043`—`IM-PRD-048`
- Write Set：IM PRD/Spec/Decision/Traceability、`MessageWorkspace`、独立 Layout Module、CSS、范围内 unit/E2E/visual。
- 交付：会话列表与聊天的统一通信主 Surface；独立 WorkBuddy 辅助 Surface；一条符合 Window Splitter 语义的可拖拽分隔器；global/class 本机偏好；1184px Overlay 与 896px Compact 降级。
- 明确不改变：会话与 Run 业务状态、Agent 事件、Artifact、审批、消息写回、WorkBuddy Composer、路由和公开/私密边界。
- 完成条件：min/max、Pointer、键盘、双击复位、偏好、宽窄往返、A11y 和目标视觉尺寸通过；无溢出、遮挡、文本误选或状态丢失。
- 当前状态：`COMPLETED`

## IM-015 Human Review Gate and Approval Artifact v0.9

- 需求：`IM-PRD-049`—`IM-PRD-055`
- Write Set：IM PRD/Spec/Decision/Traceability、`WorkBuddyReviewArtifact`、`WorkBuddyImProvider` 的精确版本发送命令、必要的 Target 展示事实、范围内 Integration/E2E/Visual。
- 交付：统一“待你审阅”成果面；直接可编辑正文与编辑反馈；目标、身份、可见范围和数量影响摘要；显式单次发送动作；发送中与原位 Receipt 投影。
- 明确不改变：Run 事件语义与节奏、沉浸 Shell、可拖拽布局、公开班级 Agent、学生 Agent、TeacherIn 与生产消息 API。
- 完成条件：未失焦正文仍绑定最新草稿版本；单群单消息无额外 Modal；384px 无溢出；静态、领域/集成、E2E、A11y 与目标视觉验收通过。
- 当前状态：`COMPLETED`

## IM-016 Compact Four-layer Review Artifact v0.10

- 需求：`IM-PRD-056`—`IM-PRD-059`
- Write Set：IM PRD/Spec/Decision/Traceability、`WorkBuddyReviewArtifact`、对应 CSS、Integration/E2E/Visual。
- 交付：前两层各一行、重点核心审阅区、单行发送 Footer，以及更高识别度的琥珀待办语义。
- 明确不改变：ArtifactDraft 版本、ProposedAction、Approval、发送前事实复核、Receipt、Run、布局和公开/私密边界。
- 完成条件：384px 无横向溢出；核心审阅区在视觉和面积上占主导；编辑、移除、最新版本发送及辅助技术语义保持；静态、E2E、A11y 与目标视觉验收通过。
- 当前状态：`COMPLETED`

## IM-017 Border-light Review Canvas v0.11

- 需求：`IM-PRD-060`—`IM-PRD-063`
- Write Set：IM PRD/Spec/Decision/Traceability、`WorkBuddyImSidecar`、Review Artifact CSS、范围内 Integration/E2E/Visual。
- 交付：唯一 WorkBuddy 外壳、暖色状态带、无框影响摘要、浅色名单 Well、唯一 Textarea 控件边界与滚动条件 Footer shadow。
- 明确不改变：四层信息架构、ArtifactDraft、ProposedAction、Approval、发送前事实复核、Receipt、Run、布局及公开/私密边界。
- 完成条件：默认态不出现卡片套卡片；视觉断言验证 Review Artifact 与 Core 无完整边框、Textarea 有边界；三个目标视口无溢出且编辑发送闭环通过。
- 当前状态：`COMPLETED_SCOPED`；本轮验证通过，共享工作区另有未完成的 `WorkspaceComposer` 变更阻断全仓绿灯。

## IM-018 Compact Execution Receipt v0.12

- 需求：`IM-PRD-064`—`IM-PRD-066`
- Write Set：IM PRD/Spec/Decision/Traceability、`WorkBuddyImSidecar` 的 sent Projection 与 CSS、范围内 Integration/E2E/Visual。
- 交付：低重量成功状态条、消息数量、教师到班级摘要、模拟真值标签和“查看群消息”动作。
- 明确不改变：ExecutionReceipt 领域字段、消息写回、教师身份、目标班级、幂等、事实复核、Run、Review Artifact、Composer 和公开/私密边界。
- 完成条件：删除重复结果段与三行字段表；384px 无横向溢出；回执保持可访问状态语义和定位能力；Integration、focused E2E/a11y、静态与新增视觉契约通过。
- 当前状态：`COMPLETED`

## IM-019 Aligned Conversation Header v0.13

- 需求：`IM-PRD-067`—`IM-PRD-069`
- Write Set：IM PRD/Spec/Decision/Traceability、`MessageWorkspace` Conversation Header JSX/CSS、范围内 Integration/E2E/Visual。
- 交付：分类栏与会话 Header 同高同基线、标题与角色摘要单行、教师/学生/班级入口一致投影。
- 明确不改变：MessageThread 数据、通知详情、消息列表、Run、WorkBuddy、Composer、路由与公开/私密边界。
- 完成条件：浏览器测量左右底边误差不超过 1px；姓名与摘要为单行横向布局；目标会话类型无溢出、操作仍可达，Integration、E2E/a11y、Build 与视觉基线通过。
- 当前状态：`COMPLETED`

## IM-020 Teacher Conversation Management v0.14

- 需求：`IM-PRD-070`—`IM-PRD-071`
- Write Set：IM PRD/Spec/Decision/Traceability、`MessageWorkspace` Conversation Header 管理入口与菜单、范围内 Integration/E2E/Visual。
- 交付：教师群聊与私聊持续可见的文字“管理”入口、按会话类型分流的菜单动作、学生权限隔离和消息免打扰反馈。
- 明确不改变：MessageThread 领域事实、WorkBuddy、Run、Composer、系统通知/官方公告、公开/私密边界和生产权限声明。
- 完成条件：消息中心群聊、消息中心 1v1 和单班级沉浸群聊均显示教师管理入口；菜单内容按会话类型准确分流；学生端无该入口；Integration、E2E/a11y 与视觉基线通过。
- 当前状态：`COMPLETED`

## IM-021 Teacher Direct-message WorkBuddy v0.15

- 需求：`IM-PRD-072`—`IM-PRD-074`
- Write Set：IM PRD/Spec/Decision/Traceability、`WorkBuddyImTarget`、Provider Direct 分流、`MessageWorkspace`、Sidecar、范围内 Integration/E2E/Visual。
- 交付：教师私聊 WorkBuddy 入口、当前对话上下文、可编辑回复建议及“插入回复框”人工发送 Gate。
- 明确不改变：班级群 ContextSnapshot、Artifact、审批、Receipt、学生权限和生产消息能力声明。
- 完成条件：教师标准/沉浸私聊可用；建议只进入 Composer、不自动发送；班级群链路无回归；Integration、E2E/a11y 与视觉基线通过。
- 当前状态：`COMPLETED`

## IM-022 Persistent Immersive WorkBuddy + Unified Entry v0.17

- 需求：`IM-PRD-075`—`IM-PRD-078`
- Write Set：IM PRD/Spec/Decision/Traceability、`MessageWorkspace` 可见性策略、`WorkBuddyImSidecar` dismissible 投影、Resizable Layout 折叠命令、范围内 Integration/E2E/Visual。
- 交付：教师沉浸实时会话自动打开并常驻的 WorkBuddy、会话切换上下文更新、无 Toggle/关闭/折叠命令、标准 Shell 的单一 WorkBuddy 重进入口、无四栏回退、退出引导，以及紧凑宽度默认 Overlay。
- 明确不改变：标准 Shell 按需开关、Provider Run 状态机、班级/私聊能力分流、宽度拖拽、学生/只读/嵌入权限和通知详情。
- 完成条件：1v1、消息中心群聊和单班级群聊均无需点击即可看到 WorkBuddy；切换会话持续显示；退出后标准模式恢复按需状态且 Run/Composer 保持；即使 WorkBuddy 进入前已打开，退出提示也不得与仍挂载的 Sidecar 共存；静态、Integration、E2E/a11y、Build 和目标视觉通过。
- 当前状态：`COMPLETED`

## IM-023 Shared Class Agent Domain and Conversation Adapter v0.18

- 需求：`IM-PRD-079`、`IM-PRD-085`—`IM-PRD-087`
- Write Set：`src/domain/class-agent/`、`src/contracts/class-agent/`、`src/mocks/adapters/class-agent/`、对应单元与契约测试。
- 交付：唯一 `ClassAgentDefinition`、渠道策略、mention 解析、结构化回复、显式回复状态与可替换 Conversation Adapter。
- 明确不改变：WorkBuddyRun、Artifact、Approval、ClassIn 消息写回和完整教学 Case Library。
- 完成条件：公开群聊 mention / 非 mention、教师私聊、学生私聊、未授权线程、可恢复失败和稳定 Agent 身份均有纯领域或 Adapter 测试。
- 当前状态：`COMPLETED`

## IM-024 Public Class Agent Mention Channel v0.18

- 需求：`IM-PRD-080`—`IM-PRD-082`、`IM-PRD-085`—`IM-PRD-087`
- Write Set：共享消息 Store / Provider、`MessageWorkspace`、`MessageWorkspace.module.css`、固定消息 Scenario 与范围内 Integration/E2E。
- 交付：教师/学生群聊的 `@班级 Agent` 插入入口、公开触发、Agent 身份消息、回复中状态、可见范围与模拟标签。
- 明确不改变：普通群消息、教师 WorkBuddy 私密生成与审批链、其他未授权班级。
- 完成条件：两种角色显式 mention 均公开回复；普通群消息无 Agent 回复；固定班级入口和消息中心复用同一实现；键盘与屏幕阅读器可操作。
- 当前状态：`COMPLETED`

## IM-025 Isolated Teacher and Student Agent Direct Channels v0.18

- 需求：`IM-PRD-083`—`IM-PRD-087`
- Write Set：固定消息 / 联系人 Scenario、`MessageWorkspace`、共享 Class Agent Feature Controller、Integration/E2E。
- 交付：教师与学生各自独立的同一 Agent 私聊入口、无需 mention 的回复、隐私说明和搜索/列表隔离。
- 明确不改变：教师与学生之间的现有 1v1、教师查看学生消息的权限、生产留存后台。
- 完成条件：教师和学生都能进入自己的 Agent 私聊；双方看到相同 Agent 定义但不同线程；教师端无法发现学生 Agent 私聊；切换线程时回复不串线。
- 当前状态：`COMPLETED`

## IM-026 Four-entry Regression and Acceptance v0.18

- 需求：`IM-PRD-079`—`IM-PRD-088`
- Write Set：IM PRD/Spec/Tickets/Traceability/Review、Domain/Adapter/Integration/E2E/a11y/Visual 测试与必要快照。
- 交付：教师 WorkBuddy 群聊、教师 WorkBuddy 1v1、公开班级 Agent 群聊、教师/学生隔离 Agent 私聊的需求—实现—证据映射。
- 明确不改变：完整业务 Case List、真实 Agent Runtime、生产权限、长期记忆和治理后台。
- 完成条件：`npm run typecheck`、`npm run lint`、范围内 Vitest、Playwright E2E、axe 与 1440×900 视觉验收通过；所有模拟能力有真值标签，无溢出、遮挡或身份串线。
- 当前状态：`COMPLETED`

## IM-027 Agent Discovery Domain and Authorization Projection v0.19

- 需求：`IM-PRD-089`、`IM-PRD-091`、`IM-PRD-094`、`IM-PRD-096`
- Write Set：`src/domain/class-agent/`、Class Agent Store/Provider、固定 Agent Scenario 与纯领域测试。
- 交付：多 Agent Definition、授权 Binding Snapshot、`AgentDiscoveryModule.project/select`、稳定搜索排序、结构化 Mention Entity 与 stale 校验。
- 明确不改变：真实授权后台、模型 Runtime、WorkBuddy Run 与完整 Case Library。
- 完成条件：角色/渠道过滤、名称/短名/课程/能力匹配、稳定排序、重名、撤权和普通文字不触发均有领域测试。
- 当前状态：`COMPLETED`

## IM-028 Public Picker and Composer Primary Target v0.19

- 需求：`IM-PRD-090`、`IM-PRD-092`—`IM-PRD-094`、`IM-PRD-097`
- Write Set：`WorkspaceComposer` Target Slot、Class Agent Picker、`MessageWorkspace` 公共群聊编排、样式与 Integration/E2E。
- 交付：typed `@` mixed Picker、按钮 Agent-only Picker、Target Lane、唯一 Agent 替换/删除、结构化发送与公开持续反馈。
- 明确不改变：人员 Mention 的生产协议、富文本编辑器、多个 Agent 并发和消息 Runtime。
- 完成条件：教师/学生、鼠标/键盘/IME、普通文字、替换、空正文、失败恢复和 1024/1440 视觉均通过。
- 当前状态：`COMPLETED`

## IM-029 Teacher/Student Direct Agent Discovery v0.19

- 需求：`IM-PRD-091`、`IM-PRD-095`—`IM-PRD-098`
- Write Set：固定 Direct Threads/Contacts、消息搜索/新建对话 Surface、Agent Thread Header 切换与 Integration/E2E。
- 交付：师生相同 Agent 目录、分组搜索、按能力定位、Actor 隔离线程导航和 Agent 间切换。
- 明确不改变：教师查看学生 Agent 私聊、跨线程草稿迁移和生产留存后台。
- 完成条件：师生均能按名称/能力进入自己的四个 Agent 线程，无法发现对方线程，切换不串线。
- 当前状态：`COMPLETED`

## IM-030 Multi-Agent Regression and Acceptance v0.19

- 需求：`IM-PRD-089`—`IM-PRD-098`
- Write Set：Traceability、Review、Domain/Integration/E2E/a11y/Visual 与必要快照。
- 交付：四入口多 Agent 需求—实现—证据闭环及 WorkBuddy 回归。
- 明确不改变：完整业务 Case Library、真实 Runtime、生产 Directory 和治理后台。
- 完成条件：静态检查、范围内 Vitest、Playwright、axe 与目标视觉通过；所有模拟能力有真值标签。
- 当前状态：`COMPLETED`
