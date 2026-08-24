---
title: WorkBuddy IM 人机协作 Implementation Traceability
status: MULTI_AGENT_DISCOVERY_V19_PASS
version: v0.19
date: 2026-08-24
---

# Implementation Traceability

本表记录教师 WorkBuddy 与同一班级 Agent 三种渠道的实现和自动化证据。渠道骨架已经完成，产品体验仍等待用户实机评审；完整教学 Case Library 保持后续独立范围。

| Requirement | Spec Section | Ticket | Implementation | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| IM-PRD-001—003 | Feature Spec §1、§6 | IM-005 | `MessageWorkspace` + `WorkBuddyImSidecar` | Integration + E2E + 2 visual sizes | PASS |
| IM-PRD-004—005 | Feature Spec §2—§5 | IM-002、IM-003 | `HomeworkReminderModule` + Read Adapter | 4 Domain + Adapter contract tests | PASS |
| IM-PRD-006—007 | Feature Spec §4、§7 | IM-002、IM-004、IM-005 | Empty / generating / read-failure projections | Domain + Integration | PASS |
| IM-PRD-008—009 | Feature Spec §3—§6 | IM-002、IM-004、IM-005 | Draft revision commands, student/group removal and body editing | Domain + Integration | PASS |
| IM-PRD-010—012 | Feature Spec §2—§7 | IM-003—IM-005 | Approval + teacher message writeback | Adapter + Integration + E2E | PASS |
| IM-PRD-013—015 | Feature Spec §3—§7 | IM-003—IM-006 | Revalidation, idempotency, permission and retry recovery | Adapter + Integration + E2E | PASS |
| IM-PRD-016—020 | Feature Spec §4.1、§5、§7 | IM-008 | Sidecar Conversation Run Projection、Experience Scheduler 与 Timeline | Projection + Integration + E2E + Visual | PASS |
| IM-PRD-021—027 | Feature Spec §6.1、§7 | IM-009 | Message Workspace Shell Mode、Immersive Frame 与三栏响应式布局 | Static + E2E + a11y + 3 visual sizes | PASS |
| IM-PRD-028—030 | Feature Spec §6.2、§7 | IM-010 | Persistent WorkBuddy Composer、Supplement Event、Live Run Clock 与 Motion | Domain + E2E + a11y + 3 visual sizes | PASS |
| IM-PRD-031—034 | Feature Spec §6.3、§7 | IM-011 | Class-context Route、可配置 Immersive Frame、固定班级双栏与确定性返回 | Integration + 20 relevant E2E + a11y + scoped visual | PASS |
| IM-PRD-035—038 | Feature Spec §6.4、§7 | IM-012 | Floating Assistant Surface、辅助托盘、固定 Composer Dock 与响应式 Overlay | Static + 21 relevant E2E + a11y + 4 scoped visual | PASS |
| IM-PRD-039—042 | Feature Spec §6.5、§7 | IM-013 | Auto-growing Textarea、4,000 字符治理、阈值计数与 Overflow Projection | Static + focused E2E + 4 scoped visual | PASS |
| IM-PRD-043—048 | Feature Spec §6.6、§7 | IM-014 | Unified Communication Surface、Resizable Layout Module、Window Splitter、global/class 偏好与 Overlay 降级 | Unit + 23 relevant E2E + a11y + 4 scoped visual | PASS |
| IM-PRD-049—055 | Feature Spec §4、§6.7、§7 | IM-015 | `WorkBuddyReviewArtifact`、Controlled Draft Editor、精确版本 `approveAndSend`、影响摘要与原位 Receipt | Integration + focused E2E/a11y + 3 scoped visual | PASS |
| IM-PRD-099—100 | Feature Spec §7 | Monday closeout | `EvaluationModule` + `appendWorkBuddyImEvaluationEvent` | Domain + Integration + ConversationRun evidence-chain assertions | PASS |
| IM-PRD-056—059 | Feature Spec §6.7、§7 | IM-016 | 四层 Review Artifact、单行状态/影响/Footer、突出核心审阅区与琥珀待办语义 | Integration + focused E2E/a11y + 3 scoped visual | PASS |
| IM-PRD-060—063 | Feature Spec §6.7、§7 | IM-017 | 单一 Review Canvas、暖色状态带、无框影响/核心、浅色事实 Well、Textarea 唯一边界与滚动 shadow | Type/Lint + Integration + focused E2E/a11y + 3 visual structure contracts | PASS_SCOPED |
| IM-PRD-064—066 | Feature Spec §6.8、§7 | IM-018 | `sent` 紧凑成功回执条、教师到班级摘要、真值标签与消息定位 | Full check + Integration + focused E2E/a11y + compact visual contract | PASS |
| IM-PRD-067—069 | Feature Spec §6.9、§7 | IM-019 | 共用 2.5rem Conversation Header、单行 Identity、教师/学生/班级复用 | Full check + Integration + measured E2E/a11y + 3 scoped visual baselines | PASS |
| IM-PRD-070—071 | Feature Spec §6.10、§7 | IM-020 | 教师群聊/私聊共用“管理”入口，会话类型化菜单与学生权限隔离 | Type/Lint + Integration + 26 relevant E2E/a11y + 9 scoped visual checks | PASS |
| IM-PRD-072—074 | Feature Spec §6.11、§7 | IM-021 | 教师私聊 WorkBuddy 入口、对话上下文回复建议与手动插入 Gate | Type/Lint + Integration + 27 relevant E2E/a11y + 2 direct-message visual baselines | PASS |
| IM-PRD-075—078 | Feature Spec §6.12、§7 | IM-022 | 沉浸 Shell 常驻 Policy、标准 Shell 单一 WorkBuddy 入口、无四栏回退、原子退出引导、持续会话上下文与紧凑 Overlay | Type/Lint + 预先打开回归 Integration + 提示/Sidecar 互斥 E2E/a11y + scoped visual checks | PASS |
| IM-PRD-079、085—087 | Feature Spec §2.2、§3、§5 | IM-023 | `ClassAgentDefinition`、渠道策略、mention 解析、显式回复状态与 `ClassAgentConversationAdapter` | Domain + Adapter contract + Integration | PASS |
| IM-PRD-080—082 | Feature Spec §2.2、§6、§8 | IM-024 | 教师/学生公开 `@班级 Agent`、Agent 身份消息、可见范围、加载/恢复状态与模拟标签 | Integration + E2E/a11y + 1440×900 visual | PASS |
| IM-PRD-083—087 | Feature Spec §2.2、§3、§8 | IM-025 | 教师/学生各自独立的同一 Agent 私聊、无需 mention、联系人和线程隔离 | Integration + E2E/a11y + 2 visual baselines | PASS |
| IM-PRD-088 | Feature Spec §1、§8 | IM-026 | 教师 WorkBuddy 群聊/1v1 回归与两类 Agent 渠道联合验收 | 33 focused tests + 6 E2E/a11y regressions + 3 visual baselines | PASS |
| IM-PRD-089、091、094、096 | Feature Spec §2.2、§3、§6.13 | IM-027 | `AgentDiscoveryModule`、四个固定 Agent、授权 Binding Snapshot、稳定搜索排序、结构化 `AgentMentionEntity` 与发送前 stale 校验 | 4 Discovery Domain + 5 Channel Policy tests | PASS |
| IM-PRD-090、092—094、097 | Feature Spec §6.13、§8 | IM-028 | typed `@` mixed Picker、`@Agent` Agent-only Picker、Composer Target Lane、唯一主响应 Agent 与公开回复反馈 | 9 Integration + focused E2E/a11y + picker/public-reply visual | PASS |
| IM-PRD-091、095—098 | Feature Spec §3、§6.13、§8 | IM-029 | 教师/学生 Agent Direct Directory、能力搜索、分组联系人、四 Agent 隔离线程和 Header 切换入口 | Integration + direct-switch E2E + 2 direct visual baselines | PASS |
| IM-PRD-089—098 | Feature Spec §1、§8 | IM-030 | 师生公共群聊与私聊多 Agent 联合回归、WorkBuddy 并存、真值与权限边界 | Type/Lint + 480 Vitest + focused Playwright/axe + 5 scoped visual baselines | PASS |

## 代码证据

- Domain：`src/domain/workbuddy/im-homework-reminder.ts`
- Run Projection：`src/domain/workbuddy/im-conversation-run.ts`
- Interfaces：`src/contracts/workbuddy/im-homework-reminder.ts`
- Run Interfaces：`src/contracts/workbuddy/im-conversation-run.ts`
- 模拟 Adapter：`src/mocks/adapters/workbuddy-im-homework-reminder.ts`
- Feature Controller：`src/features/workbuddy-im-assistance/WorkBuddyImProvider.tsx`
- Experience Scheduler：`src/features/workbuddy-im-assistance/workbuddy-im-experience.ts`
- UI：`src/features/workbuddy-im-assistance/WorkBuddyImRunTimeline.tsx`、`src/features/workbuddy-im-assistance/WorkBuddyReviewArtifact.tsx`、`src/features/workbuddy-im-assistance/WorkBuddyImSidecar.tsx`、`src/features/message-workspace/MessageWorkspace.tsx`
- Interactive Run：`appendWorkBuddyImSupplement`、固定 `runComposer`、渐进 Capability Timeline 与 `startedAt` Live Clock
- App Composition：`src/app/App.tsx`
- Immersive Shell：`src/app/shell/MessageWorkspaceShellContext.tsx`、`src/app/shell/ImmersiveMessageWorkspaceFrame.tsx`、`src/app/shell/AppShell.tsx`
- Class-context Entry：`src/features/class-workspace/TeacherClassWorkspace.tsx`、`src/pages/teacher/TeacherClassChatPage.tsx`、`MessageWorkspace` 的 `fixedClassId + immersive` 投影
- Floating Assistant Workbench：`WorkBuddyImSidecar.module.css` 的 inset Surface / Composer Dock 与 `MessageWorkspace.module.css` 的 tray / responsive Overlay；`data-surface="floating-assistant"` 提供稳定视觉契约
- Auto-growing Composer：`WorkBuddyImSidecar.tsx` 的 `resizeComposer` / 长度治理与 `WorkBuddyImSidecar.module.css` 的 2.5rem—10rem 高度契约；Surface 不再渲染装饰伪元素
- Resizable Message Layout：`MessageWorkspaceResizableLayout.tsx`、`message-workspace-layout.ts` 与 CSS Module；页面只传入 scope、通信内容、辅助内容和收起命令，min/max、Pointer、键盘、ResizeObserver 与可失败偏好隐藏在 Layout Module 内
- Persistent Private Composer：WorkBuddy Composer draft 由 `WorkBuddyImProvider` 持有，Sidecar 因标准/沉浸 Surface 位置变化重挂载时仍保持输入内容
- Human Review Gate：`WorkBuddyReviewArtifact` 把单行待审状态、单行影响摘要、重点名单/Controlled Editor 与单行发送动作组织为四层 Surface；Provider 在发送前把未失焦正文修订为最新 Draft/Action，再生成 Approval
- Border-light Review Canvas：`WorkBuddyImSidecar.module.css` 只保留 Sidecar 外层 Surface 与 Textarea 控件边界；`data-review-layer` 支持视觉结构契约，Body `data-scrolled` 只控制 Footer overflow shadow，不进入业务状态
- Compact Execution Receipt：`WorkBuddyImSidecar` 的 `sent` Projection 只消费 Receipt 既有字段；CSS 使用无描边、无阴影的成功状态平面，并在窄宽把定位动作换到摘要下方
- Aligned Conversation Header：`MessageWorkspace` 使用唯一 `contentHeader / contentIdentity` 投影私聊和班级会话；`data-message-header=conversation` 提供稳定像素契约，不复制业务状态
- Persistent Immersive WorkBuddy：`MessageWorkspace` 从当前教师实时会话投影 `immersiveWorkBuddyThread`，沉浸进入自动打开、会话切换只更新 Target，退出只恢复标准 Shell 可见性；`WorkBuddyImSidecar` 的 `data-dismissible=false` 与 `MessageWorkspaceResizableLayout` 的宽度-only Separator 把常驻规则固定在 Shell UI Policy，而非 Run 状态
- Unified Immersive Entry：标准 Shell 的 Conversation Header 只保留一个 WorkBuddy 动作；该动作先恢复当前 Target，再调用 `enterImmersive()`，不在全局 Sidebar 旁渲染第四栏。`ImmersiveMessageWorkspaceFrame` 在退出后提供短时、非阻塞状态提示，并在 Reduced Motion 下关闭过渡动画。
- Class Agent Domain / Interface：`src/domain/class-agent/class-agent.ts`、`src/contracts/class-agent/class-agent-conversation.ts`；同一 Agent 定义和渠道不变量不进入页面条件分支。
- Class Agent Adapter / Scenario：`src/mocks/scenarios/class-agent.ts`、`src/mocks/adapters/class-agent/class-agent-conversation.ts`；固定、脱敏、可重置，支持成功、可恢复失败和一次失败后重试。
- Class Agent Controller / UI：`src/features/class-agent-conversation/`、`src/features/message-workspace/MessageWorkspace.tsx`；页面只提交消息意图并投影身份、范围、真值和显式状态。
- Multi-Agent Discovery Deep Module：`src/domain/class-agent/agent-discovery.ts` 隐藏角色/班级/渠道授权过滤、关键词匹配、稳定排序与选择时再校验；页面只消费 Projection 与 Selection，不自行拼接权限判断。
- Multi-Agent Picker / Primary Target：`AgentMentionPicker.tsx` 与 `WorkspaceComposer` Target Slot 共用同一 Projection；typed `@` 与 `@Agent` 两个入口共享 Agent 数据和搜索语义，发送使用结构化 `AgentMentionEntity`，普通文字 `@` 不触发 Agent。
- Agent Direct Directory：固定 Agent Direct Threads 按 Actor 隔离；联系人目录和 Header“切换 Agent”共用 `direct-agent` Projection，可按名称、别名、班级和能力搜索。
- Evaluation Module：`src/domain/workbuddy/evaluation.ts` 校验执行证据链并记录采纳信号；`appendWorkBuddyImEvaluationEvent` 只把稳定事件投影进私密 Timeline，不改变 ClassIn 消息事实。

## 测试证据

- Domain / Adapter：`src/domain/workbuddy/im-homework-reminder.test.ts`、`src/mocks/adapters/workbuddy-im-homework-reminder.test.ts`
- Run Projection：`src/domain/workbuddy/im-conversation-run.test.ts`
- Integration：`tests/integration/workbuddy-im-assistance.test.tsx`
- E2E / a11y：`tests/e2e/message-workspace.spec.ts`
- Visual：`tests/visual/workbuddy-im-assistance.visual.spec.ts`
- Class-context Verification：`tests/integration/teacher-class-workspace.test.tsx`、`tests/e2e/class-workspace.spec.ts`、`tests/visual/app-shell.visual.spec.ts` 与 `teacher-class-chat-immersive-1440x900` 基线
- Floating Workbench Verification：`tests/visual/workbuddy-im-assistance.visual.spec.ts` 校验四周安全间距、圆角、阴影与 Composer 内缩，并覆盖 1440×900、1280×800 和 1024×640
- Composer Verification：`tests/e2e/message-workspace.spec.ts` 校验短文本增长、多行增长、10rem 封顶、内部滚动、4,000 `maxlength` 与 3,201 字符计数
- Resizable Layout Verification：纯函数测试覆盖默认宽度与 global/class min/max；E2E 覆盖 Pointer、方向键、Shift、Home/End、Enter、双击复位、本机偏好、私密 Composer 保持和 1024px Overlay 无 separator
- Unified Surface Visual：1440×900、1280×800 与 1024×640 消息中心，以及 1440×900 单班入口均校验通信主 Surface、独立 WorkBuddy Surface、圆角、阴影、安全边距和无横向溢出
- Compact Receipt Verification：Integration 验证摘要、真值标签和定位动作；focused E2E/a11y 验证真实发送链；Visual 契约约束默认回执高度不超过 136px、无边框和无阴影，并在 384px 面板宽度下保持内容与动作可达
- Conversation Header Verification：Integration 验证标题与摘要相邻结构；E2E 直接测量分类栏和 Header 底边误差不超过 1px、Identity 为横向 Flex 且摘要位于名称右侧；教师班级、学生私聊与教师私聊视觉基线通过
- Teacher Management Verification：Integration 验证群聊/私聊菜单分流和消息免打扰状态；E2E 覆盖消息中心班级群、消息中心 1v1 与班级详情沉浸群聊，并确认学生视角无教师“管理”入口；三类入口视觉基线通过
- Direct WorkBuddy Verification：Integration 验证私聊回复建议只插入 Composer、不产生消息；E2E 覆盖私聊入口、辅助 Surface、回复建议与插入闭环，并保持学生端不可见；`teacher-direct-message-header-1440x900` 与 `teacher-direct-message-workbuddy-1440x900` 视觉基线通过
- Persistent Immersive Verification：Integration 覆盖教师班级群/1v1 自动显示、不可关闭和会话切换上下文更新；Message 与单班级 focused E2E 覆盖无 Toggle、无关闭按钮、Enter 不折叠、退出/重进状态保持、1024px 常驻 Overlay；3 个 App Shell 与 9 个 WorkBuddy IM scoped visual 通过
- Unified Entry Verification：focused E2E 覆盖标准 Shell 无重复“进入沉浸模式”按钮、无 Sidecar 第四栏、WorkBuddy 单一入口重进三栏沉浸、退出引导可感知且消息与 WorkBuddy 草稿保持；MutationObserver 回归断言覆盖全部退出过渡帧，禁止“已收起”提示与 Sidecar 同时存在，几何断言约束提示不遮挡 WorkBuddy / 管理操作；App Shell 视觉基线校验提示结束后的标准 Header 稳态。
- Class Agent Verification：`src/domain/class-agent/class-agent.test.ts`、`src/mocks/adapters/class-agent/class-agent-conversation.test.ts` 和 `tests/integration/class-agent-conversation.test.tsx` 覆盖 mention / 非 mention、师生私聊隔离、失败重试、完成反馈和同一 Agent 定义。
- Four-entry Browser Verification：`tests/e2e/message-workspace.spec.ts` 覆盖师生公开 mention、双方独立私聊、隐藏对方线程、教师 WorkBuddy 群聊/1v1 回归和学生不可发现；axe 无 serious / critical violation。
- Class Agent Visual：`teacher-class-agent-public-reply-1440x900`、`teacher-class-agent-direct-1440x900`、`student-class-agent-direct-1440x900` 均无横向溢出、遮挡或不可达操作。
- Multi-Agent Verification：`agent-discovery.test.ts` 覆盖角色/渠道过滤、名称/别名/班级/能力匹配与授权版本变化；Integration 覆盖按钮 Picker、typed `@` 键盘选择、成员 Mention 与失败重试；E2E 覆盖师生公开选择、Direct Agent 切换和线程隔离；`teacher-multi-agent-picker-1440x900` 与公开/私聊基线通过。
- Research Basis：`docs/01-research/source-notes/workbuddy-composer-autogrow-patterns-20260823.md` 汇总 MUI、assistant-ui、Slack、Discord、GOV.UK 与 VS Code 一手依据，并区分 FACT / CLASSIN INFERENCE / OPEN
- Resizable Research Basis：`docs/01-research/source-notes/immersive-workspace-resizable-panels-20260823.md` 汇总 W3C、Apple、VS Code、GitHub 与 resizable panels 官方证据，并区分 FACT / CLASSIN INFERENCE / OPEN
- Human Review Research Basis：`docs/01-research/source-notes/workbuddy-human-review-send-artifact-patterns-20260823.md` 汇总 Microsoft、Slack、Gmail、GOV.UK、GitHub、OpenAI Agents SDK、assistant-ui 与 W3C 一手依据，并区分 FACT / CLASSIN INFERENCE / OPEN

## Implementation 真值

- 数据：固定、脱敏、可重置的本地 Scenario。
- WorkBuddy 生成：确定性 Domain Module，不调用真实模型。
- ClassIn 读取与写回：模拟 Adapter，不调用生产 API。
- UI：可运行 ClassIn PC Demo 中的真实 React Surface。
