---
title: WorkBuddy IM + Multi-Agent Channel Framework Implementation Review
status: V20_USER_ACCEPTED
version: v0.20
date: 2026-08-24
---

# WorkBuddy IM + Multi-Agent Channel Framework Implementation Review

> M4.2-12 补充结论：WB-06 已统一为“可编辑最终发送话术 + 可预览文字链接”，学生只需提供作业题号和卡点，完整题目由受治理 Context 定位。IM 条目不再重复显示模拟身份和 H5 格式标签；场景级真值、Domain、Receipt、Evaluation 与审计证据保持不变。
>
> v0.20 结论继续有效：教师/学生 Agent 私聊目录、授权优先搜索、稳定身份、角色隔离历史、向上分页、阅读锚点和两阶段响应已经实现。Picker、首次发送与撤权后重试共用权威授权校验。

## 1. Outcome

“未截止作业催交”纵向切片已经在可运行 ClassIn PC Demo 中完成：教师在当前班级群旁打开私密 WorkBuddy，要求先进入一条可观察的 Agent Run；系统展示目标理解、分层计划、四步能力调用和阶段结果，再生成按作业分组的未提交名单。教师编辑并显式确认后，由模拟 ClassIn Adapter 以教师身份向当前群写入一条消息并返回 ExecutionReceipt。

本轮收尾进一步补齐独立 EvaluationEvent：成功与失败回执都关联 Run、ContextSnapshot、ArtifactDraft、ProposedAction、Approval 和 ExecutionReceipt；事件只记录教师采纳与执行结果，并在界面明确说明不代表教学效果。

在此基础上，本轮进一步完成了同一班级多个 Agent 的公开群聊与隔离私聊渠道骨架：教师和学生可以在已授权班级群中输入 `@` 从 Agent / 成员混合列表选择，也可点击 `@Agent` 进入仅 Agent 搜索；选中后 Composer 持续展示唯一主响应 Agent、群内公开范围和可移除目标。教师和学生也分别拥有四个 Agent 的独立私聊，可按名称、学科或能力定位并在 Agent 之间切换，会话无需 `@`，仅当前参与者可见，任一角色不能发现另一角色的 Agent 私聊。

本次只声明渠道框架和一个确定性示例完成，不声明完整教学 Case Library、真实 Agent Runtime、生产授权或治理后台完成。

### Multi-Agent v0.19 补充行为

- 公共群聊的 typed `@` 与 `@Agent` 按钮共用同一授权目录、搜索、排序、选择和可见范围规则。
- typed `@` 同时投影班级 Agent 与普通成员；选择成员只插入普通 Mention 文本，不会触发 Agent。
- Agent 选择结果是带 `agentId / classId / authorizationId / authorizationVersion` 的结构化目标；手工输入相同文字不会触发回复。
- 发送前再次核验授权版本；授权变化时阻止发送并要求重选，不在消息流留下无响应的伪成功消息。
- 公共群一条消息首版只允许一个主响应 Agent；再次选择会替换目标，降低重复回复和责任不清。
- 私聊目录按 Agent 与联系人分组；Agent 支持名称、别名、班级和能力搜索，每个角色进入自己的独立线程。

## 2. Product Behavior

- 标准 Shell 的入口在教师可交互的班级群与 1v1 私聊 Header 显示；学生端、通知详情和只读态不显示。
- Sidecar 持续显示“仅你可见”、当前班级与“体验数据”。
- 教师原始要求是 Run Timeline 的第一条稳定事件；目标理解、执行计划和四个能力调用按阶段动态出现。
- 四个步骤分别为定位班级与群聊、查询未截止作业、核对学员提交状态、生成分组提醒；运行态自动展开执行信息，完成后保留能力、读取范围、上下文和阶段结果。
- 当前步骤、总步骤与剩余时间来自同一 Run Progress；全部能力完成后才出现 Artifact 和核对结果。
- Timeline 只展示可审计的任务计划、工具调用与业务结果，不展示模型隐藏推理。
- 当前固定事实下生成两个分组：
  - `动量守恒作业 A 组`：李明、周悦；
  - `机械波错题订正`：王小明、张然、赵英、周悦。
- 已退回、已提交和已批改均视为提交过；草稿、未开始与已截止作业不进入名单。
- 教师可移除学生、移除作业分组或编辑最终正文；修改产生新的 Draft version 和 Action。
- Run 完成后不再把“核对结果、正文、发送确认”拆成三个同权区块，而是进入一个明确标记“待你审阅 / 未发送”的成果面；老师可以区分 Agent 已生成和沟通任务尚未完成。
- 成果面进一步压缩为四层：首行只显示待审状态与成果标题，第二行只显示目标群及身份/可见范围标签，核心区集中核对名单与编辑正文，末行只显示最新状态核验与确认发送。
- 待办 Header 使用对比更明确的琥珀语义，核心审阅区保持白底、轻边界和最大面积；草稿版本、单消息数量及重复帮助文案退出默认界面，但底层换版和精确审批仍保留。
- WorkBuddy 浮层现在是唯一完整外层 Surface；待审 Artifact、影响摘要和核心区不再重复闭合描边、圆角与阴影，四层结构改由暖色状态带、留白、浅色事实 Well 和排版对齐表达。
- 作业之间取消默认横线，使用一致标题结构和组间距区分；正文 Textarea 保留唯一内部完整边界和 Focus Ring，继续明确表达可编辑性。
- Footer 回到正常文档流，避免在较矮视口覆盖正文；Body 发生滚动时只使用一层轻微顶部 shadow，不同时绘制 border-top。
- 成果面同区展示目标班级、王老师身份、30 位群成员可见、2 项作业和 5 位唯一学生；单消息数量和重复说明不再占用默认界面。
- 正文默认直接可编辑，显示可编辑、编辑中、有修改或已保存；即使老师编辑后不先失焦，发送命令也会先生成最新 Draft version 与 Action，再建立 Approval。
- 单群单消息不额外叠加通用确认 Modal；唯一主动作明确写出目标班级，未经确认不写入群聊。
- 成果面出现时定位到其 Header 而不抢夺输入焦点；老师先看到待审状态和影响范围，再向下核对名单、正文与发送动作。
- Adapter 在执行前重新读取事实；版本变化、权限拒绝和可恢复失败不会产生伪成功消息。
- 同一幂等键重复执行只返回原 Receipt，不产生第二条消息。
- 标准 Shell 不渲染 Sidecar，只保留 WorkBuddy 单一入口；该入口直接重进三栏沉浸工作区。沉浸态 Sidecar 常驻，不渲染关闭按钮或 Escape 关闭监听。
- 教师从一级“消息”进入时，ClassIn Sidebar / Topbar 以同源布局过渡退出，消息工作区扩展为最多三栏；WorkBuddy 继续使用同一完整 Run Surface。
- 顶部持续表达“消息 / 沉浸工作区”和退出去向；显式退出或 `Esc Esc` 只恢复标准 Shell，不执行历史返回，并短时提示 WorkBuddy 已同步收起及再次打开的去向。
- 退出与再次进入不会重建 Message Workspace；当前会话、Composer 草稿、动态 Run、Artifact 与审批状态保持。
- 1024px 紧凑窗口把 WorkBuddy 转为 520px 内的 Overlay；文件预览被约束为 Focus Surface，不形成第四栏。
- WorkBuddy 底部固定任务输入区在 Ready、Generating、Draft、Sent 和 Failure 状态持续可达，不随长 Timeline 滚走。
- Ready 输入发起新任务；Generating 输入形成“你补充了要求”的私密教师消息事件，不进入公开聊天 Composer。
- Capability Timeline 改为在步骤真正启动时渐进出现；Plan 继续展示四步全貌，避免预先铺满四个等待卡片。
- Run Header 持续显示旋转标识、当前步骤、已进行秒数与预计剩余秒数；当前 Capability 同时使用运行态高亮、旋转与扫光。
- 班级课程详情的“班级群聊”已从 Dialog 触发改为 `/teacher/classes/:classId/chat` 页面级导航；原 Dialog 渲染代码保持 Dormant，没有可见触发入口。
- 单班级路由复用同一个沉浸 Shell、Chat Composer、WorkBuddy 与完整 Run，只移除已无必要的会话分类和会话列表，宽屏最多形成群聊 + WorkBuddy 两栏。
- 顶部 UI Bar 显示“班级群聊 / 当前班级 / 返回班级”；显式返回与 `Esc Esc` 都执行同一退出意图，并准确返回班级详情。
- `from=home` 来源在进入群聊和返回班级时透传；返回不依赖浏览器历史栈。
- 固定班级容器已按可用高度完整伸展，Chat Composer 与 WorkBuddy Composer 均固定在视口底部，不留下无意义空白。
- WorkBuddy 不再以贴边满高白栏与聊天等权竞争：Message Workspace 提供浅灰辅助托盘，Sidecar 作为四周内缩的白色工作台浮在其上，并以克制描边、阴影和安全边距表达辅助属性。
- Header 与 Context Bar 收紧为同一信息带；Run 保留完整事件语义，只降低 Run Header 的卡片重量，不建立另一套压缩版流程。
- WorkBuddy Composer 成为面板内独立 Dock；长 Run 只滚动 Body，任务输入始终可达。1024px 下沿用相同 Surface，转为距视口边缘 12px 的 Overlay。
- Shell 与 Surface 进入/退出统一使用 320ms ease-out；内容以克制的透明度和微量缩放缓冲布局换帧，退出引导在标准 Shell 完成后再出现。Reduced Motion 下取消空间动画。容器使用 `overflow: clip` 阻止焦点恢复导致隐藏父容器偏移，从而稳定保持四周安全间距。
- 左侧装饰细条已经移除，浮层仅以托盘、内缩、边界与阴影表达辅助层级。
- WorkBuddy 输入框从单行按真实 `scrollHeight` 自动增长，达到 10rem（默认字号约 7 行）后固定并开启内部滚动；单次输入上限为 4,000 字符，3,200 字符后才显示计数。
- 沉浸消息中心把会话列表与当前聊天合并为一个 8px 圆角通信主 Surface；内部保持 280px 列表与 1px 分隔。单班入口复用同款主 Surface，但不渲染会话列表。
- WorkBuddy 继续作为独立辅助 Surface；宽屏中间提供唯一的 12px Window Splitter 命中区，常态无装饰线，Hover、Focus 与拖动时才显示 1px 反馈。
- 分隔器支持 Pointer、方向键 8px、Shift 32px、Home/End 和双击复位，并暴露 ARIA 名称、当前/最小/最大值与控制关系；Enter 不再折叠沉浸态 WorkBuddy。
- WorkBuddy 宽度遵循 384px 最小、34vw / 520px 默认上限、640px / 45% / 主 Surface 最小宽度共同形成的最大值；低于 1184px 自动转 Overlay且 separator 不可达。
- 消息中心与单班入口分别保存本机宽度；拖拽结束后才写入。布局切换不会清空消息 Composer、WorkBuddy 私密 Composer、Run、Artifact 或审批状态。
- 发送成功后的 ExecutionReceipt 已收敛为紧凑成功状态条，只显示消息数量、王老师到目标班级、模拟真值标签和查看群消息动作；重复结果说明与三行字段表退出默认界面。
- 会话分类栏与私聊/班级 Conversation Header 统一为 2.5rem 高度，左右底边形成连续水平线；姓名、角色/关系或成员摘要收进同一行，并保持摘要为低权重文字。
- 教师私聊、学生私聊、消息中心班级群聊和单班级入口复用同一 Header；系统通知与官方公告继续使用详情文档标题，不做错误压缩。
- 教师从消息中心或单班级入口进入沉浸态时，只要当前对象是可交互的班级群或 1v1 私聊，WorkBuddy 无需二次点击即默认显示；切换会话只更新其当前上下文。
- 沉浸态 Conversation Header 不再渲染 WorkBuddy Toggle，Sidecar 不显示关闭按钮，Window Splitter 不拥有折叠命令。退出沉浸只恢复标准 Shell 的按需可见性，不清空 Run、Artifact、Target 或私密 Composer。
- 退出提示“WorkBuddy 已收起”与 Sidecar 卸载形成同一事实契约：即使 WorkBuddy 在进入沉浸前已经打开，退出后标准 Shell 也先收起 Surface，再显示回执；Run、Artifact、Target 与私密 Composer 仍保留。
- 低于 1184px 时同一常驻规则降级为安全边距内的 Overlay；学生、只读、通知和官方公告仍不暴露 WorkBuddy。
- 教师与学生在已授权班级群中复用同一个 `ClassAgentDefinition`；群内只有显式 `@班级 Agent` 才触发公开回复，普通群消息不误触发。
- 群聊 Header 和消息正文同时表达 Agent 身份、当前班级上下文、公开可见范围和“体验数据”真值标签；公开回复进入班级群消息流，群成员看到同一结果。
- 教师和学生分别拥有与同一班级 Agent 的私聊入口；私聊无需 `@`，Header 明确展示仅当前参与者可见，Agent 能力配置不因角色或渠道被复制、改名或私自覆写。
- 教师私聊列表只包含教师自己的 Agent 会话，不展示、搜索或跳转到学生 Agent 私聊；学生会话与教师会话使用不同 Conversation Id 和独立消息历史。
- 公开班级群继续保留教师私密 WorkBuddy Sidecar，两类 Agent 不混为同一会话；与班级 Agent 的私聊不再嵌套 WorkBuddy，避免 Agent 中再打开 Agent 的歧义。
- Agent 回复过程显示确定性的“正在回复”状态；模拟可恢复失败明确提示失败原因并提供重试，同一用户消息不会被伪装为已成功完成。
- 最新 Agent 回复自动滚动到聊天可视区域，完成后状态从生成中切换为已完成；键盘、焦点和严重级别可访问性检查均保持通过。

## 3. Architecture Review

```text
MessageWorkspace (page composition)
  → MessageWorkspaceResizableLayout (UI layout module)
    → width constraints + Window Splitter + local preference
  → WorkBuddyIm Provider Interface
    → WorkBuddyImRunProjection + ExperienceScheduler
    → HomeworkReminderModule
      → ClassInHomeworkReminderAdapter (read seam)
      → ProposedAction + Approval
      → ClassInMessage writeback through same Adapter (write seam)
      → ExecutionReceipt
  → WorkBuddyReviewArtifact (human review UI module)
    → controlled body + impact projection + approve-and-send command
  → ClassAgentConversation Interface
    → ClassAgentConversationController (feature state + async projection)
    → ClassAgentConversationAdapter (channel seam)
      → shared ClassAgentDefinition + CapabilityManifest
      → public-mention policy / private-direct policy
      → deterministic simulated reply or recoverable failure
```

- `HomeworkReminderModule` 隐藏筛选、分组、正文、版本、审批与事实版本规则，页面不持有业务判断。
- `WorkBuddyImRunProjection` 复用终局 Conversation Run 的事件种类、事件状态与 Progress 契约；Sidecar 只负责投影，不自行推导步骤状态。
- `ExperienceScheduler` 是时间 Seam：浏览器使用可感知的确定性节奏，测试使用即时 Scheduler，不以脆弱的真实计时验证顺序。
- Adapter 由 App Composition 注入当前 Homework Store 和 Message Store；未来真实 ClassIn API 在同一 Interface 后替换。
- 原有普通消息发送与 WorkBuddy 审批发送仍是两条命令路径；AI 产物不能绕过 ProposedAction / Approval。
- `WorkBuddyReviewArtifact` 只拥有本地编辑反馈和 UI 投影，不拥有 Approval 或写回；Provider 负责把当前可见正文精确换版并交给 Domain/Adapter 链路。
- `MessageWorkspaceShellContext` 只拥有 `standard / entering / immersive / exiting` 与进退命令；会话、Composer 和 Run 状态继续由原 Feature / Provider 拥有。
- 当前模拟 Adapter 同时承担 read/write 是首条纵向切片的局部取舍；生产接入时可在 Interface 内部分拆远程读写客户端，不需要改变页面命令。
- `ClassAgentDefinition`、渠道策略和回复结果位于 Domain/Contract；页面只提交当前 Conversation、消息与 Actor，不自行判断公开/私聊授权。
- `ClassAgentConversationAdapter` 是模拟与真实 Runtime 的替换 Seam；当前固定 Adapter 只返回脱敏、可重置的 `SIMULATED` 示例，未来真实模型、内容安全、审计和留存接入不要求重写消息页面。
- Message Store 只保存经过 Contract 投影的 Agent 消息及其身份元数据；教师/学生私聊隔离由 Scenario Binding 和 Adapter 双重校验，不依赖 UI 隐藏来代替权限边界。

## 4. Verification

| Check | Result |
| --- | --- |
| `npm run check` | PASS：TypeScript、ESLint、70 test files、470 tests |
| `npm run build` | PASS：Vite production build 完成；保留既有 bundle size warning |
| WorkBuddy Domain / Run Projection / Adapter / Integration targeted | PASS：Run 顺序、四步状态、失败无 Artifact 与完整业务闭环 |
| `tests/e2e/message-workspace.spec.ts` | PASS：14 Chromium tests；覆盖会话 Header 像素对齐、教师/学生聊天、常驻 WorkBuddy、Live Clock、Run 中补充要求、自适应输入、沉浸进退、审批发送、Splitter 与 a11y |
| WorkBuddy visual | PASS：1440×900、1280×800 三栏和 1024×640 Overlay，无横向溢出 |
| Class-context Integration | PASS：18 条 Teacher Class Workspace 集成测试，覆盖页面路由与 `from=home` 来源 |
| Message + Single-class focused E2E | PASS：15 条 Chromium tests；覆盖班级群/1v1 默认显示、会话切换、无 Toggle/关闭/折叠命令、紧凑 Overlay、显式返回、`Esc Esc`、焦点与 a11y |
| Class-context visual | PASS：`teacher-class-chat-immersive-1440x900` 串行视觉基线，无横向溢出且双栏撑满视口 |
| Floating Assistant visual contract | PASS：Sidecar 四周安全间距、8px 圆角、非空阴影与 Composer Dock 内缩均有自动断言；4 个 scoped snapshots 通过 |
| Auto-growing Composer contract | PASS：短文本、多行、3,201 字符、10rem 高度封顶、Overflow 与字符计数均通过浏览器断言 |
| Human Review Artifact | PASS：Integration 验证未失焦正文精确发送；focused E2E/a11y 验证待审状态、影响摘要、编辑器、发送与回执；3 个 scoped visual 通过 |
| Compact Four-layer Artifact | PASS：1440×900 首屏完整呈现四层与发送动作；1280×800 和 1024×640 沿用 Sidecar 独立滚动且无横向溢出；3 个 scoped visual 通过 |
| Border-light Review Canvas | PASS_SCOPED：TypeScript、ESLint、Integration、focused E2E/a11y、Build 与 3 个视觉结构契约通过；Review Artifact/Core 无边框和阴影，Textarea 保留边界 |
| Compact Execution Receipt | PASS：Integration、focused E2E/a11y、Build、全仓 Check 与新增视觉契约通过；回执高度不超过 136px，无边框和阴影 |
| Aligned Conversation Header | PASS：Integration、measured E2E/a11y、Build、全仓 Check 与 3 个 scoped visual 通过；左右底边误差不超过 1px |
| Single-class Header reuse | PASS：单班级沉浸群聊、WorkBuddy 默认显示与返回班级路由的 focused E2E 通过 |
| Immersive exit consistency | PASS：Integration 覆盖 WorkBuddy 预先打开后进入/退出；消息中心 E2E 覆盖按钮与 `Esc Esc` 退出、提示与 Sidecar 互斥、仅真实 WorkBuddy Session 显示引导、桌面/紧凑宽度视口正中心、原会话/Run/Composer 状态重开、约 6 秒停留、悬停/键盘焦点暂停、显式关闭、同页“不再显示”、整页刷新恢复及 a11y；独立 1440×900 视觉基线通过 |
| Shared Class Agent Domain / Adapter / Integration | PASS：5 个 focused test files、33 tests；覆盖同一 Agent 定义、公开 `@` Gate、教师/学生独立私聊、隐私拒绝、失败与重试 |
| Shared Class Agent E2E + a11y | PASS：6 条 Chromium tests；覆盖教师/学生公开群聊、教师/学生私聊隔离、WorkBuddy IM 回归及 serious/critical axe 检查 |
| Shared Class Agent visual | PASS：3 个 1440×900 scoped snapshots；公开群聊保留 WorkBuddy，教师/学生私聊身份和可见性清晰，无横向溢出 |
| Agent Direct Experience v0.20 | PASS：纳入 M4.2 最终 `npm run check` 84 files / 555 tests；教师/学生关键 Chromium E2E/a11y 通过；教师、学生与 processing 3 个 scoped visual 基线通过；双轴 Review PASS；用户验收通过 |

视觉基线：

- `tests/visual/workbuddy-im-assistance.visual.spec.ts-snapshots/workbuddy-im-reminder-draft-1440x900-chromium-darwin.png`
- `tests/visual/workbuddy-im-assistance.visual.spec.ts-snapshots/workbuddy-im-three-pane-1280x800-chromium-darwin.png`
- `tests/visual/workbuddy-im-assistance.visual.spec.ts-snapshots/workbuddy-im-reminder-draft-1024x640-chromium-darwin.png`
- `tests/visual/workbuddy-im-assistance.visual.spec.ts-snapshots/workbuddy-im-sent-receipt-1440x900-chromium-darwin.png`
- `tests/visual/workbuddy-im-assistance.visual.spec.ts-snapshots/workbuddy-im-sent-receipt-384px-1440x900-chromium-darwin.png`
- `tests/visual/app-shell.visual.spec.ts-snapshots/teacher-direct-message-header-1440x900-chromium-darwin.png`
- `tests/visual/app-shell.visual.spec.ts-snapshots/teacher-workbuddy-exit-guidance-1440x900-chromium-darwin.png`
- `tests/visual/app-shell.visual.spec.ts-snapshots/teacher-class-agent-public-reply-1440x900-chromium-darwin.png`
- `tests/visual/app-shell.visual.spec.ts-snapshots/teacher-class-agent-direct-1440x900-chromium-darwin.png`
- `tests/visual/app-shell.visual.spec.ts-snapshots/student-class-agent-direct-1440x900-chromium-darwin.png`

## 5. Requirement Verdict

`IM-PRD-001`—`IM-PRD-059` 保持既有 `PASS`；`IM-PRD-060`—`IM-PRD-063` 保持 `PASS_SCOPED`；`IM-PRD-064`—`IM-PRD-078` 保持 `PASS`。`IM-PRD-079`—`IM-PRD-088` 已覆盖同一班级 Agent 的共享定义、公开 `@` 触发、教师/学生群聊入口、教师/学生隔离私聊、隐私边界、身份与真值标签、进行中反馈、可恢复失败和自动化证据，判定为 `PASS_SCOPED`：渠道骨架达到本轮定义，完整教学 Case Library 与生产治理不在本次完成声明内。用户于 2026-08-24 完成 v0.19 实机评审并确认验收通过。

`IM-PRD-101`—`IM-PRD-108` 已覆盖授权优先目录与搜索、稳定 Agent 身份、角色隔离历史与向上分页、阅读位置/新消息锚点、理解/整理/完成/失败状态，以及 Picker、发送和重试的权威授权重验，判定为 `PASS`；用户于 2026-08-24 完成 v0.20 页面验收。

## 6. Known Limits and Risks

- 生成是确定性 Domain 逻辑，不是模型或真实 Skill；只验证数据到草稿的产品闭环。
- 当前 1.2 秒任务理解与每步 1.4 秒执行节奏是 Demo 的 Experience Scheduler，不代表生产模型或 API 延迟。
- 作业、提交、成员和消息均为固定模拟对象；未验证生产 API 的权限、延迟、并发和版本协议。
- 模拟班级只有 5 名学生，尚未验证 30—50 人名单在 Sidecar 中的折叠、搜索和批量编辑体验。
- 当前正文是纯文本 `@姓名`；生产 IM 必须使用稳定成员 ID 构造真实 Mention entity，不能依靠名字解析。
- 权限拒绝、事实变化和服务失败已经建模并有 Adapter 证据，但 Demo 没有暴露调试场景开关给普通用户。
- Sidecar 只保留当前内存 Session；刷新浏览器后不会恢复，尚未进入“我的文件”或全局 WorkBuddy Run 历史。
- 班级 Agent 当前只覆盖固定授权班级和一个确定性方向判断示例；完整教学 Case Library、跨课程授权配置和能力市场组合尚未实现。
- 私聊隔离已经在 Domain、Adapter、Scenario 和 UI 入口中验证，但尚无生产身份服务、服务端 ACL、监护/机构治理后台、审计检索或数据保留协议，不能把 Demo 隔离推导为生产合规完成。
- Agent 回复使用固定 Experience Scheduler 与模拟失败，不代表真实模型延迟、流式输出、内容安全策略或生产可用性。
- 当前已开放主通信 Surface 与 WorkBuddy 之间的单一拖拽分隔器，并分别保存消息中心/单班入口的本机宽度；会话列表宽度、布局预设和跨设备偏好同步仍未开放。
- 当前补充要求作为可审计教师消息进入模拟 Run，但不会触发真实模型重规划；接入真实 Harness 后必须由 Runtime 决定继续、重规划或澄清。
- 4,000 字符与 3,200 阈值是基于成熟消息产品公开范围得出的 MVP 参数，不是行业统一标准；上线后需要用脱敏长度分布和触顶率复核。当前原生 `maxLength` 采用浏览器字符串长度口径，emoji / 组合字符与服务端口径仍需在生产协议中统一。
- 原班级聊天 Dialog 仍以 Dormant 代码保留，只为避免破坏性删除；如果后续确认没有兼容调用，应单独建立清理票据，不能与本轮入口迁移混做。
- 仓库全量旧视觉套件在并行运行时有 43 条与本次范围无关的历史快照出现约 1% 字体栅格差异，另有 1 条既有学生资源用例无法定位旧入口；本轮只新增并串行通过 scoped visual，不批量覆盖无关基线。
- 本轮全仓 `npm run check` 为 70 个测试文件、470 条测试全部通过；生产构建仍保留既有大 Chunk warning，不属于本次渠道骨架变更。

## 7. User Review Outcome and Next Step

用户于 2026-08-24 完成 v0.19 的四类入口与三种渠道骨架实机验收，验收范围包括：

1. 教师和学生在班级群中是否能自然理解“只有显式 `@班级 Agent` 才公开触发”；
2. 教师/学生与同一 Agent 私聊时，身份连续性和“仅当前参与者可见”是否足够明确；
3. 公开班级 Agent 与教师私密 WorkBuddy 同屏时，二者职责、可见范围和输入目标是否不会混淆；
4. 回复进行中、完成、失败和重试反馈是否平滑，最新结果是否始终可见；
5. 教师侧是否完全无法发现学生 Agent 私聊，同时不影响教师进入自己的 Agent 私聊。

`IM-CHANNEL-CASE-LIBRARY` 已建立并完成三渠道 Case 盘点。根据 D-077，下一阶段改为 M4.2“IM AI 入口地图与业务 Case 矩阵”，先补齐角色、渠道、入口、AI 身份与 L1/L2/L3 能力覆盖；M5–M10 暂停，`WB-03` 规格作为可恢复资产保留。
