---
title: WorkBuddy IM 人机协作 Feature Spec
status: MULTI_AGENT_DISCOVERY_V19_IMPLEMENTED
triage: active
version: v0.19
date: 2026-08-24
---

# WorkBuddy IM 人机协作 Feature Spec

## 1. Feature Boundary

本 Feature 验证 WorkBuddy 与班级 Agent 在 ClassIn IM 中的三种不同协作渠道。三种场景共享班级、成员、作业与消息等 ClassIn 事实，但拥有不同的可见性、身份、审批和隐私规则，必须分别验收。

| 场景 | 发起者与渠道 | AI 可见性 | 最终消息身份 | 本期状态 |
| --- | --- | --- | --- | --- |
| 1. 教师私密 WorkBuddy | 教师在当前班级群旁打开私密 Sidecar | 仅教师可见；学生不可搜索、查看或 `@` | 教师审批后，以教师身份一次性进入当前群 | 本轮实现 |
| 2. 群内公开班级 Agent | 教师或学生在班级群中 `@` 已授权 Agent | 群成员可见 | Agent 身份 | 本轮实现渠道骨架 |
| 3. 教师/学生与 Agent 私聊 | 教师和学生分别与场景二中的同一个 Agent 私聊 | 仅各自会话参与者可见；不同用户线程互相隔离，后台按治理规则留存 | Agent 身份 | 本轮实现渠道骨架 |

场景二、三复用同一个 Agent，以排除能力差异，专门验证公开群聊与私聊渠道在上下文、权限、可见性和治理上的差异。本轮只完成两种渠道的身份、入口、触发、可见性、模拟回复与真值标签骨架；完整教学 Case Library 在骨架验收后单独盘点和排期。

## 2. Scenario 1: 作业催交纵向切片

教师在当前班级群旁打开 WorkBuddy 私密窗口，输入或选择参考任务：

> 请找出当前班级群里还没截止的作业中，哪些学员还没有提交；按作业分组 `@` 学员，并生成提醒话术。

系统读取当前班级、有效作业、收件学生和提交状态，生成一条按作业分组的群消息草稿。教师可以审阅、编辑、取消某个作业分组或个别学生，随后显式确认发送。发送动作一次完成，群内只出现一条由教师本人发出的消息，不显示 WorkBuddy 身份或内部生成过程。

```text
ClassIn class / homework / submission / member facts (read)
  → ContextSnapshot
  → WorkBuddyRun
  → HomeworkReminderArtifactDraft
  → SendClassMessageProposedAction
  → Teacher Approval
  → ClassIn message writeback
  → ExecutionReceipt
```

### 2.1 Scenario 1B: 本周教学计划课前准备通知

教师在同一私密 WorkBuddy Sidecar 中选择第二条模拟任务，或输入：

> 你帮我看看本周的教学计划，然后看看我们是不是可以让孩子们提前做好准备，给孩子们形成一条通知消息，以便我一键发给他们。

系统从 Read Seam 读取当前班级本周的固定模拟教学计划，按课次提炼学生可执行的课前准备事项，并生成一条全班通知草稿。该任务与作业催交任务共享当前班级、教师身份、Conversation Run、审批和消息写回规则，但拥有独立的 ContextSnapshot、ArtifactDraft、事实版本与 Run Plan。教师可以修改正文；未经确认不得进入公开群聊。

```text
ClassIn weekly teaching plan facts (read)
  → ContextSnapshot
  → WorkBuddyRun
  → WeeklyPreparationNoticeArtifactDraft
  → SendClassMessageProposedAction
  → Teacher Approval
  → ClassIn message writeback
  → ExecutionReceipt
```

### 2.2 Scenarios 2 and 3: 同一班级 Agent 的双渠道骨架

本轮新增一个固定、脱敏、可重置的班级 Agent 定义 `class-agent-physics-3`。群聊与学生私聊只引用该定义，不复制名称、能力或上下文配置。

| 规则 | 班级群公开渠道 | 学生私聊渠道 |
| --- | --- | --- |
| 入口 | 高二物理 3 班群聊中的 `@班级 Agent` | 教师和学生私聊列表中的同一班级 Agent |
| 触发 | 教师或学生消息必须包含该 Agent 的 `@mention` | 当前用户发送普通消息即可 |
| 回复位置 | 当前班级群，所有群成员可见 | 当前用户与 Agent 的独立私聊，仅参与者可见 |
| 回复身份 | 班级 Agent，不冒充教师或学生 | 同一个班级 Agent |
| 上下文投影 | 已授权班级、课程主题与当前公开消息片段 | 同一能力配置与已授权课程范围；不读取其他学生私聊 |
| 教师可见性 | 可见公开群消息 | 可见自己的 Agent 私聊；默认不可查看或搜索学生 Agent 私聊 |
| 当前实现 | 固定模拟回复、回复中状态、失败可恢复、`SIMULATED` 标签 | 固定模拟回复、回复中状态、失败可恢复、`SIMULATED` 标签 |

渠道逻辑隐藏在一个 Deep Module 后：页面只提交 `thread + viewer role + message`，由模块解析 Agent、校验触发规则、选择渠道策略并返回带 Agent 身份、可见范围与真值标签的回复。Mock Adapter 只实现该 Interface，未来真实 Runtime 不改变页面和消息模型。

## 3. Domain Invariants

- WorkBuddy Sidecar 只在教师端可交互的班级群与 1v1 私聊可用；学生端、通知、系统/官方公告和只读嵌入态不暴露入口或辅助区。
- WorkBuddy 的生成过程与草稿不进入公开聊天记录；未经教师确认不得产生群消息。
- “未提交”依据 ClassIn 提交事实判断：目标学生没有提交记录，或只有 `draft` 记录；`submitted`、`returned`、`resubmitted` 与 `graded` 均视为已经提交过。
- 只纳入当前时刻状态为 `active` 的已发布作业；草稿、计划中和已截止作业不得进入提醒草稿。
- 草稿按作业分组，每个学生在同一作业分组中至多出现一次；删除空分组后再生成消息正文。
- 提交状态可能在生成与发送之间改变。执行前必须重新读取事实；存在差异时停止发送并要求教师刷新、重新确认。
- ProposedAction 只能指向当前班级对应的当前群聊，actor 固定为当前教师，风险为中等且不可静默执行。
- Approval 必须引用当前 Action ID、草稿版本和教师身份；执行 Adapter 拒绝失配、过期或重复副作用。
- ExecutionReceipt 必须记录目标群聊、消息 ID、教师身份、已发送正文、执行时间、幂等键和真值标签。
- 当前数据与发送均为固定、脱敏、可重置的 `SIMULATED` 体验，不暗示生产数据或真实 IM API 已接入。
- Sidecar Ready 状态固定展示两条模拟任务：作业催交和本周教学计划课前准备通知。选择任务只预填对应 Prompt，不自动读取事实或发送消息。
- 教学计划通知只读取当前班级同一周的计划项；每个计划项包含课次时间、主题和学生准备事项，不推断学生个人状态。
- 场景二、三必须引用同一 `ClassAgentDefinition` 与 `CapabilityManifest`；渠道不得复制或私自覆写 Agent 名称、课程范围和能力配置。
- 公开群聊只有显式 `@` 当前已授权 Agent 才触发回复；回复以 Agent 身份进入同一群聊并对群成员可见，不需要教师审批，也不得伪装成 WorkBuddy 或教师消息。
- Agent 私聊允许教师和学生分别进入各自线程；无需 `@` 即可触发同一 Agent。学生线程不得出现在教师会话列表、联系人搜索或教师消息检索中，教师线程也不得向学生暴露。
- 学生私聊不得读取其他学生私聊；当前后台留存仅以治理标签表达，不在 Demo 中提供教师读取入口或暗示真实生产审计已接入。
- Agent 回复必须带稳定 Agent ID、渠道、可见范围和 `SIMULATED` 真值标签；运行中与失败状态不得伪造已回复。

## 4. State Model

```text
closed
  → ready
  → generating
  → draft_ready
  → sending
  → sent

generating → empty | recoverable_failure
draft_ready → stale_context | rejected
sending → stale_context | permission_denied | recoverable_failure
```

- `ready`：解释当前上下文与参考任务，不自动读取或发送。
- `generating`：读取 ClassIn 事实并生成 ContextSnapshot 和草稿。
- `empty`：没有未截止作业，或所有目标学生都已提交；不创建 Action。
- `draft_ready`：允许编辑正文、取消分组/学生；任何修改产生新草稿版本和新 Action。
- `stale_context`：发送前发现作业或提交事实变化，保留旧草稿供比较，但禁止继续执行。
- `sent`：显示 Receipt，并允许定位到群内刚发送的教师消息。
- `recoverable_failure`：保留草稿和审批证据，允许使用同一幂等键重试；不伪造成功。

`draft_ready` 在界面中投影为 `Approval Artifact / 待审阅成果面`。编辑器的 `可编辑 / 编辑中 / 已修改 / 已保存` 只是该 Surface 的瞬时 UI 反馈，不增加一套领域状态；发送命令必须先把当前未失焦正文修订为最新 ArtifactDraft，再用新版本 ProposedAction 创建 Approval。`sending` 同时表达发送前事实复核与消息写回，直至 Adapter 返回 ExecutionReceipt 才能进入 `sent`。

### 4.1 Sidecar Conversation Run

`generating` 不再投影为单一 Loading State，而是投影为轻量 Conversation Run：

```text
teacher_message(completed)
  → goal_understood(running → completed)
  → plan(completed)
  → capability_call[定位班级](queued → running → completed)
  → capability_call[查询作业](queued → running → completed)
  → capability_call[核对提交](queued → running → completed)
  → capability_call[生成提醒](queued → running → completed)
  → artifact(completed_pending_review)
```

IM Run 必须复用 `ConversationRunEvent`、`ConversationRunEventDetail` 与 `ConversationRunProgress` 的语义。Sidecar 可以使用更紧凑的卡片排版，但不得创造另一套事件状态或把工具日志、模型隐藏思考当成 Run 事件。

确定性体验节奏：目标理解 `1.2s`，每个 Capability `1.4s`，完整生成约 `6.8s`。每个 Capability 至少有一次可见 `running`，Reduced Motion 只关闭旋转与扫光，不改变事件顺序。自动化通过注入即时 Scheduler 运行，不依赖真实墙钟。

## 5. Module and Interfaces

`HomeworkReminderModule` 是本切片的 Deep Module。页面只消费状态 Projection，并发送 `open / generate / edit / toggle / approve-and-send / retry / close` 命令。

- `ClassInHomeworkReminderAdapter`：在 Read Seam 提供当前班级、有效作业、目标学生、提交记录和事实版本；未来真实 ClassIn API 与当前模拟数据通过同一 Interface 替换。
- `ClassInMessageWritebackAdapter`：在 Write Seam 校验 Action、Approval、当前事实版本和幂等键，并返回 Receipt；页面不得直接追加 WorkBuddy 生成的公开消息。
- `HomeworkReminderModule`：拥有 ContextSnapshot、ArtifactDraft、ProposedAction、Approval、ExecutionReceipt、分组规则、正文渲染、版本更新和显式状态迁移。
- `WorkBuddyImRunProjection`：拥有 Run Ref、教师 Goal、Plan、事件顺序和单一 Progress；UI 只消费 Projection，不自行推测当前步骤。
- `WorkBuddyImExperienceScheduler`：是确定性动态体验的时间 Seam；浏览器 Adapter 使用真实计时，自动化 Adapter 即时推进同一事件顺序。
- `MessageWorkspace`：只负责把当前教师、班级和群聊引用传入 Sidecar，展示 Projection，并在成功后根据 Receipt 刷新当前群消息。

## 6. Interaction and Layout

- 班级群 Header 为教师提供低噪的 `WorkBuddy` 按钮；按钮文案明确，而不是只用无语义图标。
- 打开后，群聊与 Sidecar 并排；Sidecar 是私密工作区，不创建新的消息会话，也不进入群成员列表。
- Sidecar 顶部持续显示“仅你可见”和当前班级上下文；模拟真值标签可见但不抢主操作。
- 首屏提供参考任务按钮和可编辑指令输入。生成后优先呈现结构化作业分组，再呈现最终可编辑消息正文。
- `发送到班级群` 是唯一主要动作；动作前明确展示目标群、王老师身份和群成员可见范围。
- 标准 Shell 关闭 Sidecar 不删除已生成草稿；切换到其他班级时不得把草稿误投到新群，必须建立新的 ContextSnapshot。沉浸态 Sidecar 不提供关闭命令。
- 紧凑宽度下 Sidecar 转为右侧 Overlay；群聊主区仍可访问。标准 Shell Overlay 支持关闭和焦点恢复，沉浸态 Overlay 持续显示并通过退出沉浸回到标准 Shell。

### 6.1 Message Workspace Shell Mode

`MessageWorkspaceShell` 是 App Shell 与消息 Feature 之间的布局 Interface，只拥有 `standard / entering / immersive / exiting` 显示状态和 `enter / exit` 命令。它不得拥有会话选择、Composer、Conversation Run、Artifact 或 Approval 状态。

- 教师一级消息路由 `/teacher/messages` 首次进入时切换为 `entering → immersive`；班级详情内的嵌入聊天不自动沉浸。
- `entering / immersive` 隐藏全局 Sidebar 与 Topbar，并从指针、键盘和辅助技术可达树中移除；消息工作区最多三栏。
- `exit` 执行 `immersive → exiting → standard`，不改变当前 URL、query 中的会话引用或 Feature Provider 实例。
- 显式退出按钮是主退出方式；非编辑状态连续两次 `Esc` 可以退出。输入框、菜单、Dialog 或 Overlay 存在时，单次 `Esc` 先交给局部 Surface。
- 切换 Shell Mode 不允许 remount `MessageWorkspace`；Composer 草稿、当前会话、Run 和滚动状态由原 Feature 实例继续拥有。
- `prefers-reduced-motion: reduce` 下取消位移动画但保留相同状态迁移、焦点与可达性结果。

### 6.2 Persistent WorkBuddy Composer and Live Run Feedback

- WorkBuddy Sidecar 固定为 `Header / Context / Scrollable Run Body / Composer` 四区；Composer 不随 Timeline 滚走。
- Ready 提交创建新 Run；Generating 提交追加 `teacher_message` 补充事件；Draft / Sent / Failure 提交创建新的模拟 Run。`sending` 状态禁止新输入，避免两个副作用并发。
- `WorkBuddyImRunProjection` 持有稳定 `startedAt`；UI Clock 只投影 `elapsedSeconds`，步骤剩余时间继续使用 `progress.stepEndsAt`，不得维护第二份业务进度。
- Header、当前 Capability 与 Plan 当前步骤复用终局 `LoaderCircle`、运行态高亮和状态文案；Reduced Motion 关闭旋转、脉冲与扫光但不改变语义。

### 6.3 Class-context Immersive Message Workspace

`/teacher/classes/:classId/chat` 与 `/teacher/messages` 共享同一个 `MessageWorkspaceShell` Interface。路由差异只决定工作区的 Context Lock 和退出目标，不复制 Chat、WorkBuddy 或 Run 状态。

- 班级详情“班级群聊”通过页面导航进入 `/teacher/classes/:classId/chat`，不设置 `dialog=chat`，也不挂载聊天 Dialog。
- Class-context 路由直接进入 `entering → immersive`；全局 Sidebar 与 Topbar 的隐藏、动效、可访问性和 Reduced Motion 行为与消息中心一致。
- 外层 `ImmersiveMessageWorkspaceFrame` 接受位置标题、上下文标签、退出文案和确定性 `onExit`；双击 `Esc` 与退出按钮调用同一个退出命令。
- `fixedClassId` 锁定唯一班级线程并跳过会话分类和列表；聊天与 WorkBuddy 继续由同一个 `MessageWorkspace` 实例渲染，宽屏最多两栏。
- “返回班级”执行 `exiting`，完成同源退出动效后导航到 `/teacher/classes/:classId`；仅当入口含 `from=home` 时透传该来源。不得依赖浏览器历史栈推断返回目标。
- 原 `dialog=chat` 渲染代码保留为 Dormant 兼容面，但没有可见入口；不得维护独立状态或新增功能。

### 6.4 Floating Assistant Workbench

本节只改变 `MessageWorkspace` 与 `WorkBuddyImSidecar` 的视觉组合，不改变 Provider、Run Projection、Artifact、Approval 或 Receipt Interface。

- 标准 Shell 中，`conversationFrame[data-workbuddy-open=true]` 仍是辅助区托盘：聊天 Surface 保持白色，WorkBuddy 所在轨道使用中性浅灰，二者之间以留白而非硬分割线建立主次。沉浸态改由 §6.6 的 `MessageWorkspaceResizableLayout` 编排独立辅助 Surface。
- `WorkBuddyImSidecar` 在宽屏轨道中保留上、右、下与左侧安全间距，使用现有 `radius-overlay`、中性边界和低强度阴影；不增加品牌或状态装饰细线。
- Header 和 Context 保持稳定尺寸；Context 使用紧凑白底行，不再形成贯穿辅助区的重灰横带。
- Run Header 从大面积灰卡调整为紧凑状态块；Timeline 继续以垂直事件语言呈现，只有当前运行步骤使用强调 Surface。
- Composer 使用面板内缩 Dock，依靠完整边界、`focus-within` 与轻微顶部阴影表达持续输入能力；Textarea 本身不再重复绘制第二圈重边框。
- 打开时使用 `translateX + opacity` 的 180ms Surface 进入反馈，不改变布局语义；Reduced Motion 关闭该动效及既有循环动效。
- 小于现有三栏阈值时，Sidecar 采用四周安全边距的 Overlay；不得贴满视口，也不得遮断关闭动作或聊天主输入。

### 6.5 Auto-growing WorkBuddy Composer

本节只改变私密 WorkBuddy Composer 的输入投影，不改变任务命令、Run 或审批 Interface。

该输入与公开群聊 Composer 共同实现 `docs/03-design/WORKSPACE-COMPOSER-STANDARD.md`。两者只共享 Design System Module；公开消息发送目标与 WorkBuddy 私密 Run 命令仍由各自 Feature 拥有。

- Controlled Textarea 每次内容变化后先恢复 `height:auto`，再用 `min(scrollHeight, computed max-height)` 得到下一高度；不得用字符数估算行数。
- 默认 `min-height: 2.5rem`、`max-height: min(10rem, 28dvh)`；常规 PC 视口上限为 10rem，极矮视口继续为 Run Body 留出空间。未达到上限时 `overflow-y:hidden`；`scrollHeight > max-height` 后切换 `overflow-y:auto` 并保持 Dock 外框稳定。
- 内容变化以及 Textarea 宽度变化时都重新测量；宽度监听只在实际宽度变化时触发，避免高度变化造成 ResizeObserver 循环。
- Textarea 原生 `maxLength=4000`；`length >= 3200` 时在发送动作旁显示计数。字符上限是单次任务输入治理，不用于决定可见高度。
- 提交后清空 Controlled Draft，同一 Layout Effect 将高度恢复到最小值；Enter、Shift+Enter 与 IME 契约沿用现有实现。
- 自动增长不使用高度动画，避免逐键输入时产生布局迟滞；Run Body 继续占用剩余空间并独立滚动。

### 6.6 Resizable Message Workspace Layout

`MessageWorkspaceResizableLayout` 是沉浸消息的 UI Layout Module。其 Interface 只接收 `scope / communication content / assistant content / collapse command`，Implementation 隐藏宽度约束、Pointer 与键盘输入、ResizeObserver 和本机偏好。它不得持有会话、Run、Artifact、Approval 或 Composer 状态。

- `messages-global` 的通信主 Surface 组合 280px 会话列表和弹性聊天正文；`messages-class` 只组合当前群聊。两个入口复用同一 Layout Module，但分别保存宽度偏好。
- 宽屏 Grid 只包含 `communication surface / 12px separator hit target / WorkBuddy tray`。通信主 Surface 使用现有 8px 圆角、细边界和轻阴影；其内部列表与聊天只保留 1px 分隔。
- WorkBuddy 最小 384px，默认按容器宽度的 34% 且不超过 520px，最大不超过 640px、可用宽度 45%和通信主 Surface 最小宽度共同形成的上限。
- Pointer 拖动期间通过 Layout CSS 变量即时投影宽度，不重建 Run；松手后才提交偏好。方向键每次 8px，Shift + 方向键每次 32px，Home/End 到边界，双击回到默认；沉浸态 Enter 不改变 WorkBuddy 可见性。
- 低于 1184px 继续使用 Overlay 并从可达树移除 separator；低于 896px 时全局会话列表降为 Compact。内容通过 `min-width:0`、折行、局部滚动和内部单列响应，不缩放字体或删减 Run 事件。
- 布局偏好写入可失败的本机存储；读取、写入或 ResizeObserver 不可用时回到确定性默认布局，不能阻塞消息任务。

### 6.7 Human Review Gate and Approval Artifact

`WorkBuddyReviewArtifact` 是 `draft_ready` 的唯一交互投影。它接收当前 Preparation 和 Target，只发出 `remove student / remove group / restore checklist / edit body / approve-and-send` 命令，不拥有 Approval、消息写回或业务事实。

- Header 使用警示但不制造错误感的状态，持续表达“待你审阅”“群消息草稿已生成”和“确认前不会发送”；Agent Run 的完成态继续保留，但不能替代该人工待办状态。
- 影响摘要在正文前展示目标群、教师身份和全群可见范围；作业数和唯一学生数进入核心审阅区。数据必须来自 Target、ArtifactDraft 与 ProposedAction，不解析可见文案或硬编码老师姓名。
- 作业分组是审阅范围，不使用多层卡片嵌套；移除学生或分组继续通过 Domain revision 生成新版本，并同步更新正文、Action 和 Conversation Artifact Event。
- 名单范围首次生成时，ArtifactDraft 保存同一 ContextSnapshot 下的不可变原始分组。只有当前名单与该原始分组不同时，名单标题旁才出现次级动作“还原名单”；点击后生成新的 Draft 版本，恢复原始分组并重新生成正文、ProposedAction 与 Conversation Artifact Event。该动作不重新读取最新业务事实、不触发发送，也不因仅修改正文而出现。
- 正文使用 Controlled Textarea。输入时只维护本地编辑反馈，失焦时修订草稿；点击发送时允许把尚未失焦的当前正文作为 revision 传给 Provider，保证 Approval 精确绑定本次可见内容。
- Action Footer 与成果面保持连续，说明发送前会重新核验最新提交状态，并提供唯一主动作 `确认并发送至「班级名称」`。384px 宽度可使用较短但仍明确目标类型的文案，不能让按钮文字横向溢出。
- 单群单消息不显示通用确认 Modal。`sending` 禁用重复发送；`sent` 原位转 ExecutionReceipt 并提供群消息定位，失败则保留 Preparation 和恢复动作。
- 成果面出现时允许滚动到待办位置，但不得自动聚焦正文或发送按钮；状态通知使用 `aria-live`，编辑器必须提供可访问名称、状态说明、错误说明和清晰焦点。
- Surface 固定为四层。状态层使用单行标题与标签；影响层使用单行目标和身份、可见范围标签；核心审阅层占据最大面积并同时容纳名单与正文；操作层只保留最新事实核验和发送命令。
- 作业数和唯一学生数作为核心审阅层的紧凑标签展示。草稿版本、单消息数量及“可以直接修改”等重复帮助文案不进入默认投影；这些删除只降低界面噪声，不删除 ArtifactDraft、版本或 ProposedAction 事实。
- 琥珀色只标识待教师处理，标题与边界提高对比；正文编辑 Surface 保持白色和清晰焦点，不用整卡高饱和底色干扰长文本阅读。
- WorkBuddy Sidecar 保留唯一完整外轮廓和低阶阴影；Review Artifact 自身改为连续 Canvas，不再拥有完整边框、圆角或阴影。暖色状态带是唯一强语义平面。
- 影响摘要、核心区和 Footer 不使用永久分隔线。名单事实落在一个无描边浅色 Well 中，重复作业通过稳定间距和相同排版结构分组；必要的删除 Chips 继续保留填充形状和可见操作。
- Textarea 是 Artifact 内唯一默认完整描边的编辑控件。Footer 默认只依靠留白和背景；Sidecar Body 的 `data-scrolled` 为真时才显示顶部 overflow shadow，不能同时绘制 border-top。
- 沉浸消息页的会话列表、消息正文、通知、联系人、Sidecar Body 与长文本编辑器保留原生滚动能力，但滚动条 Thumb 默认透明；鼠标进入对应滚动区或键盘焦点进入其中时才显示轻量 Thumb，Track 始终透明，不常驻制造额外视觉分隔。

### 6.8 Compact Execution Receipt

`sent` 继续由真实 `ExecutionReceipt` 驱动，但 UI 只投影老师完成任务后需要复核的最小信息。该投影是持久成功回执，不是第二个 Review Artifact。

- 使用单一紧凑状态条表达 `发送成功 / 1 条班级群消息`，并在同一摘要中显示 `教师 → 目标班级`。
- `truthLabel` 继续可见，明确当前为模拟 ClassIn 群消息执行回执；消息 ID、正文、执行时间和幂等键继续留在 Receipt，不因默认 UI 收敛而删除。
- `result` 说明和 `发送身份 / 目标 / 回执` 三行定义列表不进入默认投影，因为它们与摘要及真值标签重复。
- 唯一动作使用紧凑次级按钮“查看群消息”，通过 Receipt message ID 定位左侧公开群消息；Toast 不能替代该回执。
- Surface 使用成功色轻背景、无完整描边和无额外阴影。宽屏采用图标、摘要、动作的紧凑布局；384px 下允许动作换行，但不得截断关键事实或产生横向滚动。

### 6.9 Aligned Conversation Header

`MessageWorkspace` 的聊天 Header 是私聊、班级群聊和固定班级入口的唯一共用投影。它只消费 `titleByRole` 与 `subtitleByRole`，不在页面内重新推导教师角色或班级成员事实。

- `categoryTabs` 与 `contentHeader` 使用同一个 2.5rem Block Size，并各自保留底部细分隔，使左右边界在同一 Y 坐标连续对齐。
- Header 身份区使用单行 Flex / Baseline 布局：`h2` 为主标题，`p` 为右侧次级摘要。摘要内容保持既有角色视角数据，不新增 Badge、背景或第二层容器。
- 标题区必须 `min-width: 0`；标题和摘要均允许单行省略。操作区固定不收缩，名称或摘要不得把 WorkBuddy、进入班级、管理或沉浸按钮挤出可达范围。
- 同一组件覆盖教师和学生私聊、消息中心班级群聊、固定班级群聊；System / Official Notice 继续使用独立 `noticeHeader`，因为它们是详情文档而不是实时会话。

### 6.10 Teacher Conversation Management Entry

教师可交互会话共用 Conversation Header 右侧的显式“管理”入口，入口可见性只由教师角色与会话可交互性决定，不因消息中心、单班级入口、标准 / 沉浸 Shell 或 `fixedClassId` 改变。

- 班级群聊菜单提供群文件、成员和全体禁言；私聊菜单提供联系人资料与消息免打扰。菜单项由会话类型投影，不把群治理动作错误带入 1v1 会话。
- 教师群聊和私聊都使用文字按钮“管理”，不以只显示省略号的图标入口替代；打开菜单时暴露准确的 `aria-expanded` 和菜单语义，关闭后焦点回到触发入口。
- 学生端不显示教师管理入口；学生已有的会话操作继续遵循原权限边界。System / Official Notice 不属于可交互聊天 Header，不复用该入口。
- 消息免打扰是当前模拟会话状态，切换后在菜单内提供可观察反馈；群成员、文件与联系人资料保持演示入口，不伪装成生产治理能力。

### 6.11 Teacher Direct-message WorkBuddy

教师 1v1 会话与班级群聊复用 WorkBuddy Surface 和 Composer，但通过 `WorkBuddyImTarget.kind` 明确分流业务能力。

- Direct Target 使用当前会话名称和最近消息作为本地模拟上下文；Ready 文案、参考任务和生成结果都表达“回复辅助”，不声称读取班级作业事实。
- Direct Run 只生成 `direct-draft-ready` 回复建议。正文可编辑，“插入回复框”只更新教师公开聊天 Composer，仍需教师手动发送，不创建班级群 `ProposedAction / Approval / ExecutionReceipt`。
- Class Target 继续保留 ContextSnapshot、Agent Run、Artifact、审批、事实复核与教师身份写回，不因 Direct 分流降低原有 Gate。
- 学生、只读与嵌入态继续不可用；入口和 Surface 复用同一可访问名称与焦点规则。

### 6.12 Persistent WorkBuddy in Immersive Shell

WorkBuddy 的沉浸态可见性由 `MessageWorkspace` 的 Shell Policy 派生，不成为 Provider 中第二份业务状态。当前实时会话满足教师可用条件时，进入沉浸态必须调用同一 `open(target)` Interface；切换目标时只更新 Target。进入沉浸时始终登记当前 Target 为沉浸目标，退出时关闭 Surface 但保留 Run 数据，不以“此前是否已打开”作为关闭条件。

- 沉浸态 `assistant` 对可用实时会话始终非空；消息中心形成“会话列表 + 聊天 + WorkBuddy”，单班级入口形成“聊天 + WorkBuddy”。
- Conversation Header 在沉浸态不渲染 WorkBuddy Toggle；`WorkBuddyImSidecar` 以 non-dismissible 投影隐藏关闭按钮且不注册 Escape 关闭监听。
- `MessageWorkspaceResizableLayout` 继续提供 Pointer、方向键、Home/End 和双击复位，不再用 Enter 折叠 WorkBuddy。Splitter 只拥有宽度偏好，不拥有辅助区可见性。
- 退出沉浸时统一调用 `close()` 恢复标准 Shell 的按需状态；提示“WorkBuddy 已收起”出现时 Sidecar 必须已经卸载。`close()` 只改变 `isOpen`，不得清空 Target、Run、Artifact、Receipt 或 Composer。
- 1024px 等紧凑宽度继续使用默认可见 Overlay；关闭 WorkBuddy 的替代路径是退出沉浸，而不是在 Overlay 内制造第二套显示开关。
- 标准 Shell 不渲染独立“进入沉浸模式”按钮，也不把 WorkBuddy 内联为第四栏；WorkBuddy 按钮直接调用 `open(target)` 与 `enterImmersive()`，恢复同一三栏现场。
- 退出动作同时触发一条短时、非阻塞状态提示，解释 WorkBuddy 已随沉浸模式收起及再次打开的结果；Reduced Motion 下保留文字并取消位移动画。

### 6.13 Multi-Agent Discovery and Primary Target

`AgentDiscoveryModule` 是教师/学生公共群聊和 Agent 单聊入口共用的 Deep Module。其 Interface 接收 Actor、Class、Channel、Query 与授权快照，只返回可投影候选或结构化选择结果；Implementation 隐藏权限过滤、字段匹配、稳定排序、消歧和 Authorization Version 校验。

- 公共 Thread 保存多个 `ClassAgentThreadBinding`；Direct Thread 继续只绑定一个 Agent 与一个 Actor Role。候选过滤先于搜索，未授权对象不进入 Projection。
- 输入 `@` 打开 `mixed-mention`，焦点留在 Composer；点击 `@Agent`、Context Bar 或 Direct 切换入口打开带自动聚焦 Combobox 的 `agent-only` / `direct-agent` Surface。
- Agent Candidate 显示名称、文字 `Agent` 类型和一行课程/能力差异；同名时增加短名或课程范围，不允许静默选错。
- `WorkspaceComposer` 新增可选 Target Slot。选择 Agent 后把活动查询片段从正文移除，在 Target Lane 投影结构化 `AgentMentionEntity`；发送显示 `@名称`，触发只读取 Entity。
- 一条公开消息最多一个 Primary Agent Target。替换仅改变 Target，正文保持；发送前 Definition、Binding、Authorization ID 与 Version 必须再次匹配。
- 新建私聊 Surface 将 Agent 与联系人分组；Agent 查询同时匹配名称、短名、课程和公开 Capability。选中后导航到当前 Actor 的既有隔离线程；当前 Agent Thread 的 Header 可用同一 Surface 切换 Agent。
- Discovery、Target 与 Reply 各自拥有显式状态，不复用一个 `isAgentOpen`。目录失败、无结果、stale Target 和回复失败分别恢复。
- 当前固定 Adapter 提供四个可重置体验 Agent；不声明真实 Directory、授权或模型 Runtime。

## 7. Acceptance Criteria

- [ ] 学生端、只读和嵌入态看不到 WorkBuddy；教师可交互私聊与班级群聊均可使用同一 WorkBuddy Surface。
- [ ] 教师在 `高一 3 班物理群` 打开 Sidecar 后能看见当前班级、私密性与模拟标签。
- [ ] 触发参考任务后，草稿只包含尚未截止的已发布作业，并按作业分组列出未提交学生。
- [ ] Ready 状态同时展示两条模拟任务；选择“根据本周教学计划生成课前准备通知”后，Composer 填入对应 Prompt。
- [ ] 教学计划任务依次展示班级定位、计划读取、准备事项提炼和通知生成四步 Run，并生成包含本周课次与准备事项的一条可编辑群通知。
- [ ] 教学计划通知未经教师确认不进入群聊；确认后只新增一条教师身份消息，并显示模拟执行回执。
- [ ] 教师可以删除一个学生或作业分组；正文、草稿版本和 ProposedAction 同步更新。
- [ ] 名单发生删除后显示“还原名单”；点击后恢复本次草稿最初生成的名单，并同步重建正文、草稿版本和 ProposedAction。
- [ ] 未经教师确认，群聊时间线没有新增消息。
- [ ] 确认页明确发送目标、教师身份和“一条群消息”；成功后群内新增一条教师消息。
- [ ] WorkBuddy 名称、头像或内部步骤不进入公开消息。
- [ ] 所有人都已提交和没有有效作业时进入可理解的空状态。
- [ ] 读取失败、权限拒绝、事实变化、发送失败和重复确认具有显式状态与恢复路径。
- [ ] 教师原始要求、目标理解、四步 Plan 和四个 Capability Call 按顺序进入私密 Timeline。
- [ ] 每个 Capability 至少经历一次可观察的 `running`，当前步骤与预计剩余时间来自同一 Progress。
- [ ] Capability 展开信息显示目的、输入 Context、输出摘要与能力名称，不显示隐藏思维链或原始敏感数据。
- [ ] Artifact 只在全部 Capability 完成后出现；读取失败时当前调用进入 failed，后续调用保持 queued。
- [ ] Integration、E2E、视觉和可访问性测试只通过公开 Interface 验收，不读取 React 私有状态。
- [ ] 教师点击一级“消息”后进入沉浸式工作区，全局 Sidebar 与 Topbar 不再可见或可聚焦。
- [ ] 教师实时会话进入沉浸态后 WorkBuddy 默认常驻，最多三栏，并继续渲染同一完整 Conversation Run，不出现压缩投影。
- [ ] 显式退出和 `Esc Esc` 均只恢复标准 Shell，URL、当前会话、Composer 草稿与 Run 状态保持。
- [ ] 标准 Shell 只通过 WorkBuddy Header 入口再次进入三栏沉浸，不出现重复“进入沉浸模式”按钮或四栏布局；沉浸态进入后 WorkBuddy 常驻。Reduced Motion、紧凑宽度、焦点恢复与 Overlay 优先级通过浏览器验收。
- [ ] WorkBuddy 固定输入区在 Run 滚动时仍可操作；Ready 发起任务，Generating 补充要求形成私密教师事件。
- [ ] 运行中可观察旋转标识、`进行中`、当前步骤、已进行秒数与预计剩余秒数；完成后不再增长。
- [ ] 班级详情“班级群聊”进入单班级沉浸路由，不出现聊天 Dialog，也不出现会话列表。
- [ ] 单班级沉浸页复用群聊 Composer、WorkBuddy 和完整 Run，宽屏最多两栏，紧凑宽度仍按同一 Overlay 契约运行。
- [ ] 顶部 UI Bar 明确显示当前班级；按钮与 `Esc Esc` 均先退出沉浸再回到准确班级详情，`from=home` 来源不丢失。
- [ ] 宽屏 WorkBuddy 显示为浅灰托盘内的内缩浮层；聊天仍为主 Surface，辅助面板没有满高硬分割线。
- [ ] Header、Run Timeline、Artifact、审批和固定 Composer 的信息及命令不因视觉升级丢失。
- [ ] WorkBuddy 无左侧装饰细条；Textarea 从单行增长到 10rem 后内部滚动，最大 4,000 字符且仅在达到 3,200 字符后显示计数。
- [ ] Composer Dock 在滚动、生成、草稿、发送和失败状态持续可达，焦点边界达到 WCAG 2.2 AA。
- [ ] 沉浸消息页各滚动区默认不显示 Scrollbar Thumb；Hover 或键盘焦点进入对应区域时显示，滚轮、触控板和键盘滚动能力不受影响。
- [ ] 1280px 宽屏浮层和 1024px Overlay 均保留安全边距、无横向溢出；Reduced Motion 关闭进入动画但不改变状态。
- [ ] 沉浸消息中心的会话列表与聊天正文形成一个通信主 Surface，单班入口形成同款无列表主 Surface；WorkBuddy 继续为独立辅助 Surface。
- [ ] 1440px 和 1280px 的分隔器支持 Pointer、方向键、Shift + 方向键、Home/End 与双击复位，ARIA 名称、数值和控制关系完整；Enter 不折叠 WorkBuddy。
- [ ] WorkBuddy 宽度不能小于 384px或超过当前最大值；拖动时正文与 Run 正常折行，无页面横向溢出、文本误选或宽度补间动画。
- [ ] 发送成功后显示紧凑持久回执，包含成功状态、消息数量、发送教师、目标班级、真值标签和“查看群消息”动作，不重复结果说明或字段表。
- [ ] 紧凑回执在 384px WorkBuddy 宽度下自然换行、无横向溢出，并可通过 `role=status` 被辅助技术识别。
- [ ] 消息分类栏与 Conversation Header 底边误差不超过 1px；名称和角色/关系/成员摘要位于同一行，教师、学生、班级及固定班级入口共用同一实现。
- [ ] 1024px 使用 Overlay且 separator 不可见/不可聚焦；宽窄往返恢复 clamp 后的本机偏好，不丢会话、Run、草稿、审批、Composer、滚动或焦点。
- [ ] Run 完成后出现一个明确的“待你审阅”成果面；老师可区分“Agent 已生成”和“消息尚未发送”。
- [ ] 成果面同区展示目标群、教师身份、全群可见、作业数和唯一学生数，正文持续表达可编辑状态。
- [ ] 教师不失焦直接点击确认时，当前可见正文形成新版本并作为实际发送正文；空正文禁止发送。
- [ ] 单群单消息不额外弹出确认 Modal；主动作明确包含目标班级，发送中不可重复触发。
- [ ] 成功后原位显示 Receipt 并可定位群消息；事实过期、权限拒绝和可恢复失败均保留草稿且不显示成功。
- [ ] 教师从 1v1、消息中心班级群或单班级群聊进入沉浸态时，无需点击入口即可看到 WorkBuddy；切换实时会话后辅助区持续存在并更新当前上下文。
- [ ] 沉浸态没有 WorkBuddy Toggle、关闭按钮或 Splitter 折叠命令；退出沉浸恢复标准 Shell 按需逻辑，既有 Run、Artifact 和 Composer 不丢失。
- [ ] 退出沉浸时出现短时非阻塞提示，明确 WorkBuddy 已收起且再次打开会进入沉浸工作区；提示不拦截后续消息操作。
- [ ] 1024px WorkBuddy 默认以 Overlay 可见，学生、只读、嵌入和通知详情仍不可发现教师 WorkBuddy。
- [ ] 384px WorkBuddy 宽度下成果面无横向溢出、CTA 不截断，键盘焦点和状态通知可访问。
- [ ] 待审成果面稳定呈现四层，状态、发送影响和核验发送各为单行，核心审阅区获得最大面积与最高视觉权重。
- [ ] 目标群、教师身份和成员可见范围在第二层一眼可扫；作业数和唯一学生数在核心审阅区以紧凑标签显示。
- [ ] 默认界面不显示草稿版本、单消息数量和重复编辑帮助文案，但草稿换版、精确审批与空正文校验继续生效。
- [x] 成功或失败 ExecutionReceipt 后生成独立 EvaluationEvent，完整关联 Run、ContextSnapshot、Artifact、Action、Approval 和 Receipt，并明确“执行成功不代表教学效果”。

## 8. Channel Skeleton Acceptance: Scenarios 2 and 3

- [x] 教师或学生在高二物理 3 班群内显式 `@班级 Agent` 后，看到同一 Agent 以自身身份公开回复；普通群消息不触发 Agent。
- [x] 教师和学生私聊列表都存在同一 Agent，发送普通消息即可获得回复；标题、头像、能力说明与群内 Agent 来自同一 Agent 定义。
- [x] 教师端不能查看、搜索或通过联系人入口进入学生与 Agent 的私聊，只能进入自己的独立线程；群内回复仍对教师可见。
- [x] 两种渠道都显示当前可见范围、回复中状态与 `SIMULATED` 真值标签，并在失败时保留用户消息、允许重试。
- [x] 页面不拥有渠道判断、回复模板或 Agent 配置；这些逻辑位于共享 Class Agent Module 与 Mock Adapter 后。
- [x] 场景一通过不能推导场景二、三完成；两种渠道分别形成可验证的权限、可见性和消息身份证据。

完整教学 Case Library、真实 Agent Runtime、生产治理后台、长期记忆和真实 ClassIn 授权仍需后续独立验收。

## 9. Out of Scope

- 真实 Agent Runtime、真实 ClassIn 作业/IM API、模型输出或生产权限系统。
- 自动替教师发送、定时群发、逐个私聊催交或学生回复追踪。
- 机构/教师配置 Agent 上下文权限。
- 场景二、三的完整教学 Case Library、真实模型生成、生产 Agent 授权与治理后台。
- 将班级 WorkBuddy 建模为独立 Agent 身份；课程详情未来入口只预装同一 WorkBuddy 的班级上下文。
