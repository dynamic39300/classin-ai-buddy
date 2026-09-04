---
title: IM 内嵌 AI Sidecar 与 Agent Run 渐进披露模式研究
status: research-note
date: 2026-08-23
scope: ClassIn 教师 IM 中 WorkBuddy 私密 Sidecar 的信息架构、执行轨迹、核对与窄屏布局
evidence-policy: 仅引用官方产品/设计文档、官方 GitHub 源码或成熟开源项目的官方文档与源码
---

# IM 内嵌 AI Sidecar 与 Agent Run 渐进披露模式研究

## 1. 问题与证据边界

用户提供的当前评审截图显示：同一个右侧 Sidecar 从作业分组、最终群消息编辑器到发送确认纵向连续堆叠，导致右栏形成很长的滚动文档。此前 v0.2 又把完整 Agent Run 事件加入这一列；若继续以“每个事件都常驻展开的卡片”呈现，问题会进一步加重。

本报告不主张隐藏 WorkBuddy 的业务过程。项目已锁定 D-055：Sidecar 必须以可审计事件呈现教师目标、计划、能力调用、结果和 Artifact，且不能展示隐藏思维链。这里研究的是**怎样压缩投影与切换工作区**，不是改变 Run 的领域状态或权限/审批规则。

### 证据标签

- **FACT**：可由下列一手来源直接验证。
- **CLASSIN INFERENCE**：结合本项目已锁定约束与当前截图得出的设计推论；不是外部产品的原话，也不是新的 LOCKED 决策。
- **OPEN**：需在真实教师可用性测试中验证，当前不能假定正确。

## 2. 一手来源索引

| ID | 来源 | 一手性质 | 本次可用证据 |
| --- | --- | --- | --- |
| SRC-01 | [Fluent 2 Drawer usage](https://fluent2.microsoft.design/components/web/react/core/drawer/usage) | Microsoft 官方设计系统 | Drawer 的 inline/overlay 选择、长内容滚动、sticky header/footer、复杂流程边界与响应式行为 |
| SRC-02 | [VS Code：Use tools with agents](https://code.visualstudio.com/docs/agents/run/tools) | Microsoft 官方产品文档 | 默认折叠工具调用详情；以汇总行展开；工具调用与工作流可分组 |
| SRC-03 | [VS Code Chat 扩展 API](https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.chatParticipantAdditions.d.ts) | Microsoft 官方 GitHub 源码 | 流式工具调用、可折叠 input/output、`hiddenAfterComplete` 展示语义 |
| SRC-04 | [VS Code Chat list renderer](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/widget/chatListRenderer.ts) | Microsoft 官方 GitHub 源码 | 已完成 response part 的折叠计算；执行轨迹与最终回复可分开处理 |
| SRC-05 | [assistant-ui Reasoning](https://www.assistant-ui.com/docs/ui/reasoning) | 成熟开源项目官方文档与实现 | 运行中自动展开并显示最新进度；结束后默认折叠；内容区可限高并滚动 |
| SRC-06 | [assistant-ui ToolGroup](https://www.assistant-ui.com/docs/ui/tool-group) | 成熟开源项目官方文档与实现 | 工具调用计数、运行态汇总、按需展开的工具列表 |
| SRC-07 | [assistant-ui：Tool UI 展示分层](https://github.com/assistant-ui/assistant-ui/blob/main/packages/assistant-stream/CHANGELOG.md) | 成熟开源项目官方 GitHub 维护记录 | 人机确认与生成式结果应独立呈现；常规工具轨迹归入折叠 trace |
| SRC-08 | [Vercel AI SDK UI message contract](https://github.com/vercel/ai/blob/main/packages/ai/src/ui/ui-messages.ts) | 成熟开源项目官方 GitHub 源码 | 工具的输入流、待审批、成功、错误、拒绝是可区分 UI 状态，不应被压为一个模糊 loading |

## 3. 调研事实

### 3.1 Sidecar 是辅助工作面，不应承载长流程的全部常驻内容

- **FACT（SRC-01）**：Fluent 将 Drawer 定义为从布局边缘滑出的“次级内容面”，适用于与主界面相关的补充信息和简单操作；inline Drawer 用于需要同时查看和操作主界面与 Drawer 内容的情形，overlay Drawer 用于需要更强注意力的内容。
- **FACT（SRC-01）**：其明确建议多步骤 Drawer 保持在两到三步；更长或更复杂的流程应考虑更聚焦的容器。Drawer 按 header / body / footer 分区；长内容可让 body 滚动，header/footer 可以 sticky；小视口或 400% 缩放时 header/footer 转为非 sticky，让正文优先。
- **FACT（SRC-01）**：inline Drawer 可由产品定义的断点折叠；在窄宽度下可改为 overlay。Fluent 的导航示例在 640px 以下转 overlay 以节省主内容空间。[SRC-01 的 Nav 响应式说明](https://fluent2.microsoft.design/components/web/react/core/nav/usage)

**CLASSIN INFERENCE**：IM Sidecar 应只保留一个清晰的“当前工作面”。完整 Run 记录和最终编辑/发送确认不能同权、同列、全部展开；否则 Sidecar 从辅助面变成缩窄的长页面，而聊天主上下文也失去可用宽度。

### 3.2 执行中突出“当前一步”，执行完成后压缩历史，是成熟 Agent UI 的共同模式

- **FACT（SRC-02）**：VS Code 的 Agent 工具调用详情默认在聊天中折叠；用户可点击工具摘要行展开，也可通过配置调整分组/折叠行为。
- **FACT（SRC-03）**：VS Code 的 API 支持先 `beginToolInvocation` 呈现流式进度、再 `updateToolInvocation` 更新；`ChatSimpleToolResultData` 明确用于在可折叠区显示工具输入和输出；工具展示还支持 `hiddenAfterComplete`。
- **FACT（SRC-04）**：VS Code 的聊天渲染器存在已完成 response part 的折叠计算。源码将已完成的调用/轨迹与最终面向用户的回复作为可不同处理的内容类型，而不是把所有响应内容永久平铺。
- **FACT（SRC-05）**：assistant-ui 的 Reasoning 容器在流式运行时自动展开并显示最新内容；流结束后回到 `defaultOpen`，默认是折叠。它还为展开内容提供限高、内部滚动和滚动锁定机制。
- **FACT（SRC-06）**：assistant-ui 的 ToolGroup 以“一行标签 + 调用数 + 运行态”作为折叠触发器；单次调用仅在展开后显示。

**CLASSIN INFERENCE**：Run 不应以“4 个永久展开的大卡片 + 每卡完整目的/读取/上下文/结果”展示。默认只需要显示：`当前正在做什么`、`进度（如 3/4）`、一个人能理解的业务摘要，以及“已完成 N 步 / 查看执行记录”的 disclosure。运行中的当前一步可展开；已完成步骤应立即折叠为一行摘要；错误步骤例外，自动保持展开并提供恢复动作。

### 3.3 审批与结果编辑属于人机协作的主工作面；常规工具轨迹应退居次要层

- **FACT（SRC-07）**：assistant-ui 将 Tool UI 分为三类：需要用户处理的人机协作、面向用户的生成式 UI、以及常规前后端工具调用轨迹；该项目的维护记录明确建议前两类独立呈现，常规工具轨迹折入 chain-of-thought trace。
- **FACT（SRC-08）**：Vercel 的 UI 工具契约区分 `input-streaming`、`input-available`、`approval-requested`、`approval-responded`、`output-available`、`output-error` 和 `output-denied`。审批、成功、失败或拒绝均是可投影的明确状态。

**CLASSIN INFERENCE**：教师需要审阅和发送的“群消息草稿”不是 Run log 的最后一张卡，而是 Run 完成后的主内容。运行完成时，Sidecar 的 body 应**转换为“核对与发送”模式**：结果编辑器、作业分组和发送影响说明取得主要空间；上方只保留一条可展开的 Run 摘要。发送确认的风险、对象和教师身份保持可见，但不与执行细节争夺首屏。

### 3.4 逐步展开应表达业务事实，不复制或伪装模型思维

- **FACT（SRC-02）**：VS Code 的产品文档把工具调用作为 Agent 可操作环境的机制，并说明工具输出会进入后续上下文；产品也提供工具批准和权限控制。
- **FACT（SRC-03）**：VS Code API 的 tool invocation 数据是工具名、部分输入、工具专属数据与状态等结构化信息，而不是要求 UI 暴露模型的原始推理文本。

**CLASSIN INFERENCE**：在 ClassIn 中，展开项只展示与教师决策有关的可审计业务事件：例如“定位到高二物理 3 班”“读取 2 份未截止作业”“核对 5 位学员的提交状态”“生成 2 个提醒分组”。不展示 prompt、原始学生敏感数据、工具原始 payload 或隐藏 CoT。这同时保持 D-055、隐私边界和紧凑性。

### 3.5 侧栏的布局应通过固定头尾和一个滚动主体保护主操作

- **FACT（SRC-01）**：Drawer 的 header/body/footer 分区和长内容 sticky header/footer 是官方推荐的布局选择；body 需要显式成为滚动容器以处理超出高度的内容。
- **FACT（SRC-01）**：Drawer 内容应可扫描，不适合长文本；重复 modal/overlay 会打断主上下文，重要确认应谨慎使用。
- **FACT（SRC-05）**：assistant-ui 的可折叠 Reasoning 实现包含滚动位置保护，避免折叠/高度变化使阅读位置跳动。

**CLASSIN INFERENCE**：Sidecar 采用“固定头 + 单一 body 滚动区 + 固定行动区”。不要让 Run 卡、编辑器和确认卡各自建立无界滚动；需要展开明细时用受限高度的 disclosure。教师正在编辑草稿时，禁止 Run 的新事件强制自动滚动抢走焦点；仅在尚未输入编辑内容、且运行仍在进行时，跟随当前步骤。

## 4. 对 ClassIn 的重组方案（供评审，不是已锁定需求）

### 4.1 推荐信息架构：`Run strip → Review workspace`

```text
教师触发任务
  ↓
运行态 Sidecar
  固定头：WorkBuddy · 仅你可见 · 当前班级 · 关闭
  Run strip：正在核对提交状态 · 3/4 · 预计剩余 2 秒
  当前步骤：一句业务目标 + 一行读取摘要（展开可看安全细节）
  历史摘要：✓ 已定位班级与群聊  ✓ 已找到 2 份有效作业
  次级入口：查看执行记录（N 步）
  ↓ 全部完成
核对态 Sidecar（默认）
  固定头：WorkBuddy · 草稿待核对
  折叠摘要：✓ 已完成 4 步 · 用时 7 秒 · 查看执行记录
  主 body：作业分组 / 可编辑群消息 / 修改影响
  固定尾：将以教师身份发送 1 条群消息 → 确认发送
  ↓ 发送后
回执态
  一行完成摘要 + 可定位群消息 + 再次使用/关闭
```

这不是把 Run 删除，而是把它从“常驻日志列”变成“运行中可感知、结束后可回看”的渐进披露层。产物与审批仍由原有显式状态模型拥有。

### 4.2 建议的可见性规则

| 状态 | 默认可见 | 默认折叠 | 例外 |
| --- | --- | --- | --- |
| `generating` | 当前步骤、`当前/总数`、业务化读取摘要、已完成数 | 已完成步骤详情、未开始步骤、完整 Plan | 当前步骤与失败步骤自动展开 |
| `draft_ready` | Artifact、编辑器、发送影响、Run 一行摘要 | 全部能力明细与 Plan | 教师点击“查看执行记录”才展开 |
| `stale_context` / `permission_denied` / `recoverable_failure` | 失败原因、受影响对象、恢复按钮 | 无关成功步骤 | 失败步骤保持展开，不自动切到草稿编辑 |
| `sent` | 回执、目标群、消息定位 | Run 全量记录 | 审计/复盘入口可查看记录 |

### 4.3 分区和动作建议

1. **固定 Header（40–48px）**：只放私密性、班级上下文、关闭/收起。不要在这里放完整 Run 标题、真值说明、进度、多个状态徽章。
2. **Run strip（运行时约 72–104px）**：`正在核对 5 位同学的提交情况` 为主句；`3/4`、spinner 与估时为辅助；使用一条“已完成 2 步”的 disclosure 连接历史。
3. **Review workspace（完成后占据 body）**：先显示可处理的作业分组，再显示可编辑正文；“执行记录”不插在表单中段，而放在结果标题下的二级入口。
4. **固定 Footer**：只有核对/发送相关的主操作；当无 Action、失败或空结果时改为对应恢复动作。发送前仍显示“以王老师身份发送到高二物理 3 班，生成过程对学生不可见”。
5. **详细记录的独立容器**：首次可在 Sidecar disclosure 中展开，限制在约 240–320px 高；若将来有长 Run、重试或多 Artifact，进入“运行记录”独立详情页/浮层，而不是继续向右栏追加卡片。

### 4.4 响应式建议

- **CLASSIN INFERENCE**：桌面宽视口使用 inline Sidecar，但在 IM 主对话、会话列表和 Sidecar 之间设定可用宽度下限；低于下限转为右侧 overlay，并保留当前群聊可恢复访问。
- **CLASSIN INFERENCE**：不要直接照搬 640px。ClassIn 是三列 PC IM，应以“群消息最小可读行长 + 输入框可操作 + Sidecar 最小审阅宽度”的组合为断点依据，并在 `1440×900`、`1024×640` 和浏览器缩放下实测。
- **CLASSIN INFERENCE**：Overlay 态关闭需支持 `Esc`、焦点恢复和未发送编辑草稿保留；当教师已开始编辑时，关闭前应提示草稿会保留还是会丢失。这与 SRC-01 对含输入 Drawer 的关闭提醒一致。

## 5. 可借鉴实现，不等于直接引入依赖

| 项目 | 可借鉴点 | 不应直接照搬的部分 |
| --- | --- | --- |
| [VS Code](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/chat) | Run 事件可流式更新；工具输入/输出可折叠；完成轨迹可压缩；最终回复不应被轨迹淹没 | 开发工具命名、终端输出、模型/代码语义 |
| [assistant-ui ToolGroup](https://www.assistant-ui.com/docs/ui/tool-group) | 一条摘要显示批量调用数与运行态；按需展开单项 | 将“工具”直接暴露为教师术语；ClassIn 应用业务动作名称替代 |
| [assistant-ui Reasoning](https://www.assistant-ui.com/docs/ui/reasoning) | 运行时展开、结束折叠、限高滚动、展开时保持阅读位置 | 展示原始 reasoning 文本；ClassIn 仅呈现业务事件 |
| [Vercel AI SDK UI contract](https://github.com/vercel/ai/blob/main/packages/ai/src/ui/ui-messages.ts) | 按“流式输入—待批准—输出/失败/拒绝”显式建模可投影状态 | 其具体 React/SDK 接口；本项目继续以 `WorkBuddyImRunProjection` 和 Domain Interface 为边界 |

## 6. 建议的下一步验证

这些均为 **OPEN**，需要产品评审与可用性测试，不应仅凭外部模式升级为事实：

1. 做一个不改领域状态的 UI A/B 原型：当前“全量时间线 + 草稿”与推荐的“Run strip → Review workspace”。
2. 用同一催交任务测试教师是否能回答：现在在做什么、基于哪些业务事实、我接下来能否安全发送；并比较完成核对所需滚动和误操作。
3. 验证运行结束自动切换到核对态是否会造成“过程消失”的不信任；若有，优化 Run 摘要文案和查看记录入口，而不是恢复全部常驻展开卡。
4. 以真实三列 IM 宽度确定 overlay 断点和最小 Sidecar 宽度；同时测试窄窗、缩放、键盘导航、屏幕阅读器和草稿编辑中的焦点/自动滚动。

## 7. 结论

外部一手资料支持的不是“少展示执行过程”，而是一个一致的渐进披露原则：**运行时让用户看到正在发生的关键一步；完成后将常规轨迹收束为可展开证据，把空间交给结果、审批和下一步行动。**

对当前 ClassIn IM Sidecar，最合适的候选方向是将完整 Agent Run 从纵向常驻卡片流重构为可压缩的 Run strip，并在 Artifact 生成后切换到以教师核对与发送为主的工作区。该方向能保留 D-055 要求的审计可见性，也更符合 Sidecar 作为主聊天上下文的辅助工作面这一边界。
