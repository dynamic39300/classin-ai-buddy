---
title: WorkBuddy AI 群消息草稿的人审、编辑与发送交互研究
status: research-note
date: 2026-08-23
scope: ClassIn 教师 WorkBuddy 右侧辅助工作台中，AI 生成最终群消息草稿后的 Human-in-the-loop 审阅、编辑、显式确认、发送与回执体验
evidence-policy: 仅引用官方产品帮助、官方设计系统、W3C 规范和开源项目官方仓库；ClassIn 方案单独标注为推论
---

# WorkBuddy AI 群消息草稿的人审、编辑与发送交互研究

## 1. 结论先行

**CLASSIN INFERENCE**：截图中的业务链路是正确的，但“最终群消息”“发送前可继续编辑”、正文输入框、发送影响说明和主按钮目前被拆成了几个近似同权重的区块。老师能够完成任务，却不容易在第一眼识别出：**这里出现了一个新的待办，需要我审阅；正文可直接修改；只有我确认后才会以我的身份进入班级群。**

建议把它重构为一个独立的 **Approval Artifact / 待审阅成果面**，而不是普通 Run 结果或一段更大的 Textarea：

```text
┌─ 待审阅成果 ────────────────────────────────────────┐
│ [待你审阅]                                          │
│ 群消息草稿已生成                                     │
│ 请检查名单和措辞；确认前不会发送。                    │
│                                                     │
│ 发送至：高二物理 3 班 · 30 位成员可见                │
│ 身份：王老师              数量：1 条群消息            │
│                                                     │
│ 群消息正文                         [可编辑] [已保存]  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 同学们好……                                      │ │
│ │ 【动量守恒作业 A 组】……                          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ 发送前将重新核验作业提交状态                         │
│ [重新生成/取消]        [确认并发送至「高二物理 3 班」] │
└─────────────────────────────────────────────────────┘
```

核心原则：

1. **把“待老师审阅”提升为状态和主标题，而不是说明文字。** 使用独立 Surface、状态徽标、清晰标题和简短下一步说明建立视觉锚点。
2. **把可编辑性做成显式控件语言。** 正文上方提供永久可见的“群消息正文 · 可编辑”标签，正文直接以内联编辑器呈现；不要只依赖光标、Textarea 边框或 Hover 后的铅笔图标。
3. **把发送影响与主动作放在同一个审批 Footer。** 持续说明目标群、教师身份、可见范围、消息数量；主按钮使用对象明确的动宾文案，而不是泛化的“确认”或“继续”。
4. **不为当前单群、单消息场景再叠一层二次确认 Modal。** 这张成果面本身就是确认面。只有目标发生变化、跨多个群、批量外发或存在其他高风险异常时，才升级为额外确认。
5. **发送不是按钮点击后的瞬时视觉切换，而是完整状态迁移。** `待审阅 → 核验中 → 发送中 → 已发送回执`；上下文过期和可恢复失败是独立阻断状态。

这些是面向 ClassIn 的产品推论。行业一手来源支持“AI 产物先成为草稿、用户可修改、显式接受/发送、完成后提供回执”，但并不规定 ClassIn 必须采用某种颜色、圆角或具体尺寸。

## 2. 证据标签与来源

- **FACT**：一手来源可以直接核验的事实。
- **CLASSIN INFERENCE**：结合行业事实、当前截图和仓库已锁定业务规则得出的候选方案。
- **OPEN**：需要真实教师测试、ClassIn 生产接口或治理规则进一步确认。

| ID | 一手来源 | 本次使用的证据 |
| --- | --- | --- |
| SRC-01 | [Microsoft Support：Draft an email message with Copilot in Outlook](https://support.microsoft.com/en-us/outlook/copilot-pages/draft-an-email-message-with-copilot-in-outlook) | Copilot 先生成候选稿；用户可修改、重试、调整语气，选择 Keep 后仍可编辑，最后显式 Send |
| SRC-02 | [Microsoft Support：Draft and send email using Microsoft 365 Copilot Chat](https://support.microsoft.com/en-gb/topic/draft-and-send-email-using-microsoft-365-copilot-chat-b311f2f8-61ff-484f-9ecf-bda16471cea5) | Copilot Chat 将收件人、主题、正文作为可编辑邮件草稿，并提供直接 Send 或 Open 到 Outlook 深度编辑 |
| SRC-03 | [Slack Help：Use AI to write or edit content in a canvas](https://slack.com/help/articles/44415275664275-Use-AI-to-write-or-edit-content-in-a-canvas) | AI 新生成内容以蓝色高亮；用户审阅来源后选择 Keep / Discard，也可继续提出修改；保存与分享分离 |
| SRC-04 | [Gmail Help：Draft emails with Gemini in Gmail](https://support.google.com/mail/answer/13955415) | Gemini 生成的是邮件 draft；用户可在原编辑面继续修改、缩短、改变语气并查看来源 |
| SRC-05 | [GOV.UK Design System：Check answers](https://design-system.service.gov.uk/patterns/check-answers/) | 提交前检查页用标题明确告诉用户要检查；提供 Change；说明交易尚未完成；按钮应明确表达将执行的动作 |
| SRC-06 | [GOV.UK Design System：Confirmation pages](https://design-system.service.gov.uk/patterns/confirmation-pages/) | 交易完成后必须明确确认完成、提供参考信息并说明接下来会发生什么，形成可追溯回执 |
| SRC-07 | [Slack Help：Send and read messages](https://slack.com/help/articles/201457107-Send-and-read-messages-in-Slack-Send-and-read-messages-in-Slack) | 未发送内容自动保存为草稿；发送按钮对应当前明确会话，草稿、已发送和定时消息可回看 |
| SRC-08 | [Slack Help：Edit or delete messages](https://slack.com/help/articles/202395258-Edit-or-delete-messages) | Slack 桌面端在条件满足时允许 15 秒内 Unsend，正文返回输入框修改后重发；删除使用再次确认 |
| SRC-09 | [GitHub Docs：Using GitHub Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review) | Copilot 的评审只留下 Comment，不代替人的 Approve；应用 AI suggestion 也不会自动 commit |
| SRC-10 | [OpenAI Agents SDK：Human-in-the-loop](https://github.com/openai/openai-agents-python/blob/main/docs/human_in_the_loop.md) | 敏感工具调用可以暂停 Run，以 interruption 暴露待审批项；批准/拒绝后才恢复；决定绑定具体 call ID |
| SRC-11 | [assistant-ui 官方仓库](https://github.com/assistant-ui/assistant-ui) 与 [官方 Changelog](https://github.com/assistant-ui/assistant-ui/blob/main/packages/assistant-stream/CHANGELOG.md) | 该开源框架支持 inline human approvals；其展示模型把要求用户响应的 human tool 作为 standalone UI，而不是折进普通执行 trace |
| SRC-12 | [W3C WAI：User notifications](https://www.w3.org/WAI/tutorials/forms/notifications/) | 提交成功或失败都应提供简洁明确反馈；输入错误应与对应字段关联 |
| SRC-13 | [W3C：Understanding SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | 不移动焦点的状态变化应可由辅助技术识别并播报；正常成功状态可使用 `role=status` / polite live region |
| SRC-14 | [W3C APG：Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | 按钮必须有可访问名称、支持 Enter/Space；动作后焦点应根据结果留在当前上下文或进入新上下文 |
| SRC-15 | [W3C APG：Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/) | 控件名称应简洁、唯一并以动词优先，便于读屏用户快速区分动作 |
| SRC-16 | [WCAG 2.2：Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | 指针目标至少应能容纳 24×24 CSS px，或满足相邻目标间距例外 |

## 3. FACT：成熟产品和规范共同呈现的模式

### 3.1 AI 产物保持“草稿”身份，人的确认才跨越发布边界

- **FACT（SRC-01）**：Outlook 的 Copilot 先展示候选稿，并提供 Keep、Discard、Retry、长短和语气调整；选择 Keep 后，用户仍可继续编辑，最后再点击 Send。
- **FACT（SRC-02）**：Microsoft 365 Copilot Chat 中，邮件响应直接表现为包含收件人、主题和正文的可编辑 draft；用户可在当前界面 Send，也可 Open 到 Outlook 深度编辑。
- **FACT（SRC-04）**：Gemini in Gmail 把生成内容放入 Gmail 的 draft 编辑路径，用户可继续编辑或用 AI refine；AI 没有绕过正常发送 Composer。
- **FACT（SRC-09）**：GitHub Copilot 的 review 明确不能替代人的 Approve；即便用户采纳 suggestion，也不会自动 commit。
- **FACT（SRC-10）**：OpenAI Agents SDK 的 HITL 机制会暂停 Run，待人对具体 tool call 批准或拒绝后才恢复执行。

**CLASSIN INFERENCE**：WorkBuddy 的最终群消息不能看起来像普通 AI 回复或已完成结果。它应具有明确的 `draft_ready / awaiting_teacher_review` 身份；“Run 已完成”只表示草稿生成完，不等于班级沟通任务已完成。只有 `Approval + ExecutionReceipt` 才能把任务标记为已发送。

### 3.2 待人响应的成果应独立突出，不应折进运行轨迹

- **FACT（SRC-03）**：Slack Canvas 把 AI 新加入的内容高亮为蓝色，并要求用户 Keep 或 Discard；内容来源可以单独查看。
- **FACT（SRC-05）**：GOV.UK 的检查页要求用页面标题直接告诉用户需要检查，否则用户可能错过最终提交按钮；同时要说明确认前交易仍未完成。
- **FACT（SRC-11）**：assistant-ui 的官方展示模型把要求用户响应的 human tool 固定为 `standalone`，而普通、例行的工具 trace 默认保持 inline。

**CLASSIN INFERENCE**：最终草稿应从 Run Timeline 中“长出来”，但完成生成后成为一张独立、可聚焦的待审阅成果面。可在 Run 完成时自动滚动至该 Surface，并使用一次克制的进入强调；不需要持续脉冲、闪烁或红框。Run 过程继续完整保留在上方，不能为了强调成果而删除执行证据。

### 3.3 “可编辑”必须是可见能力，而不是靠用户试出来

- **FACT（SRC-01、SRC-02）**：Microsoft 在文档中明确把生成结果叫 editable draft，并把后续人工修改作为正式流程步骤。
- **FACT（SRC-05）**：GOV.UK Check answers 在每个可变区旁提供明确 Change 动作，而且返回修改时保留用户已输入内容。
- **FACT（SRC-12）**：W3C 要求输入控件有清楚标签；错误反馈应靠近并关联到对应字段。

**CLASSIN INFERENCE**：当前“发送前可继续编辑”位于标题处仍偏说明性。应补齐以下持久线索：

1. 编辑器可见标签：`群消息正文`；
2. 邻近状态：`可编辑`，聚焦后变为 `编辑中`，失焦保存后变为 `已保存`；
3. 文本区域使用正常 I-beam、清晰 focus ring 和足够内边距；
4. 正文改变后生成新草稿版本并使旧 Approval 失效；
5. 若 @ 提及、作业分组是结构化实体，视觉上可高亮，但不能让老师误以为纯文本显示就是最终实际收件范围。

### 3.4 主按钮必须同时表达动作、对象和后果

- **FACT（SRC-05）**：GOV.UK 要求提交按钮清楚显示它真正执行的动作，示例使用 `Accept and send`，并在按钮前说明确认含义。
- **FACT（SRC-15）**：W3C APG 建议可访问名称动词优先、简洁且在同类控件之间保持唯一。
- **FACT（SRC-14）**：按钮必须支持 Enter/Space，并在不可用时表达 disabled 状态。

**CLASSIN INFERENCE**：推荐按钮文案优先级：

1. 宽度足够：`确认并发送至「高二物理 3 班」`；
2. 紧凑宽度：`确认并发送到班级群`，但按钮邻近必须持续显示目标群名称；
3. 发送中：`正在核验并发送…`；
4. 失败重试：`重新核验并发送`。

不建议使用 `确认`、`完成`、`采用`、`下一步` 或只放纸飞机图标。它们没有说明是否会立即产生一条对学生可见的群消息。

### 3.5 成功必须变成回执，而不只是 Toast

- **FACT（SRC-06）**：GOV.UK Confirmation page 要求告诉用户交易已完成、提供参考信息，并解释接下来会发生什么。
- **FACT（SRC-12、SRC-13）**：W3C 要求成功或失败状态清晰，并让不移动焦点的动态状态可以被辅助技术感知。
- **FACT（SRC-07）**：Slack 允许用户回看草稿和已发送消息，并能跳到对应会话。

**CLASSIN INFERENCE**：发送成功后，待审阅 Surface 原位转为不可再次执行的 `ExecutionReceipt`：

- `已发送到「高二物理 3 班」`；
- `王老师 · 1 条群消息 · 14:32`；
- 可选消息 ID / 模拟真值标签；
- `查看群消息`动作，将左侧聊天滚动到并短暂高亮该消息；
- 同一个 ProposedAction 不允许再次发送。

Toast 可以作为跨区即时提示，但不能代替持久回执，因为老师可能错过短暂提示，也需要在 WorkBuddy 中追溯执行结果。

## 4. CLASSIN INFERENCE：推荐的信息架构与视觉层级

### 4.1 从“几个连续区块”改为“一张待审阅成果面”

当前截图内的正文编辑区和发送确认卡之间间距较大、外观相近，老师需要自行推断二者属于同一次审批。建议用一个外层 `article/section` 把四层信息合并：

| 层级 | 内容 | 视觉职责 |
| --- | --- | --- |
| L1 状态锚点 | `待你审阅` + `群消息草稿已生成` | 第一眼说明出现了教师待办；使用文字、图标和色彩三重线索 |
| L2 影响摘要 | 目标群、教师身份、成员可见性、消息数量 | 发送前不需要读完整正文也能判断“发给谁、以谁、影响多大” |
| L3 可编辑正文 | `群消息正文 · 可编辑/编辑中/已保存` + Editor | 老师检查名单、@、日期和措辞；编辑能力不依赖发现隐藏入口 |
| L4 审批动作 | 核验说明、次级动作、明确主按钮 | 把“人工确认”变成唯一主决策，并让发送后果紧邻按钮 |

建议使用现有 WorkBuddy 浮层中的一张强调 Surface：较强于普通阶段结果、弱于错误 Alert。`待你审阅` 不应使用绿色成功样式，因为业务尚未完成；也不使用红色，因为这不是错误。候选是项目已有的暖色注意 Token，搭配高对比标题和 `待你审阅` 文字。最终颜色需进入现有 Design Token，而不是硬编码一种新品牌色。

### 4.2 文案建议

```text
[待你审阅]
群消息草稿已生成
请检查学生名单、作业分组和提醒措辞。确认前不会发送。

发送至  高二物理 3 班 · 30 位成员可见
身份    王老师
数量    1 条群消息

群消息正文 · 可编辑                            已保存
```

主动作前的安全说明：

```text
发送前将重新核验作业提交状态；确认后会以你的身份立即发送到当前班级群。
```

动作：

```text
次级：重新生成       主按钮：确认并发送至「高二物理 3 班」
```

`重新生成` 会产生新版本并使当前确认失效；如果希望保留人工编辑，不应默认用重新生成覆盖，需先明确是“基于当前内容调整”还是“重新开始”。`取消`可以放入低权重菜单，不与发送形成两个同权重按钮。

### 4.3 编辑模式

推荐默认即为可编辑草稿，而不是先读模式、再点“编辑”切模式：

- 单击正文直接定位光标；`Enter` 插入换行，不发送；避免与群聊 Composer 的 Enter-to-send 规则混淆。
- AI 或老师改写时保留当前值，不在失焦或状态变化时丢失。
- 修改后显示 `有修改`，完成本地版本提交后显示 `已保存`；保存状态不等于已发送。
- 发送前校验空正文、超长文本、失效 @ 提及和结构化名单与正文不一致；错误就近呈现并将焦点移到首个问题。
- 不建议一期加入富文本工具栏；当前场景的主要编辑是姓名、分组、截止时间和语气，过多格式控件会分散审阅注意力。

## 5. CLASSIN INFERENCE：状态机与防误触

| 状态 | 主视觉 | 编辑 | 主动作 | 关键约束 |
| --- | --- | --- | --- | --- |
| `draft_ready` | 暖色 `待你审阅` | 可编辑 | `确认并发送至…` | 未确认不得产生公开消息 |
| `editing` | `编辑中` / `有修改` | 可编辑 | 可用；点击时提交当前版本 | 新版本使旧 Approval 失效 |
| `preflight_checking` | Spinner + `正在核验最新提交状态` | 暂停编辑 | disabled | 重新读取作业与提交事实 |
| `stale_context` | Warning + `提交情况已变化` | 保留旧稿供比较 | `刷新名单并更新草稿` | 阻止旧名单发送 |
| `sending` | `正在发送到高二物理 3 班…` | 只读 | disabled | 单一幂等命令，禁止双击重复副作用 |
| `sent` | 绿色 `已发送` Receipt | 只读历史版本 | `查看群消息` | 展示目标、身份、时间和消息 ID |
| `recoverable_failure` | Error + 可理解原因 | 保留 | `重新核验并发送` | 同一幂等键重试，不伪造成功 |
| `permission_denied` | Error + 权限原因 | 保留 | 无发送按钮 | 不用“系统错误”掩盖权限边界 |

具体防误触建议：

1. 只有正文非空、目标群未变化、结构化名单有效、教师有发送权限且当前没有请求在飞行时才启用发送。
2. 点击后立即进入 `preflight_checking`，按钮原位变为带文字的进度状态；不要只显示 Spinner。
3. 发送命令绑定 `Action ID + Draft Version + Teacher ID + Conversation ID`；按钮节流只能改善 UI，不能替代幂等执行。
4. 正常的当前班级单消息不再弹确认 Modal。额外 Modal 只在目标群与当前上下文不一致、一次发多个群、可见范围扩大或其他异常风险下触发。
5. 发送成功后主按钮消失，转为 Receipt 和 `查看群消息`，避免产生“是不是没点上”的重复发送。
6. **OPEN**：只有 ClassIn 生产消息接口支持可验证撤回时，才提供 `撤回` / `Undo`。Slack 的 15 秒 Unsend 是可参考事实，但不能在 Demo 中伪造可恢复能力。

## 6. 可访问性要求

以下规则既适用于视觉改造，也应进入后续验收：

1. `待你审阅`、`可编辑`、`正在核验`、`已发送`必须有文字，不仅依靠颜色和图标。
2. 草稿成果面使用可命名的 `section/article`，标题为 `群消息草稿待审阅`；Run 完成时可以把焦点移到该标题，或提供一次 polite status 告知“草稿已生成，等待审阅”，但不能两者同时造成重复播报。
3. Editor 使用真实 `<textarea>` 或语义等价控件，具备可见 `<label>`：`群消息正文`；`可编辑`是补充状态，不替代字段名称。
4. 主按钮使用真实 `<button>`，支持 Enter/Space；可访问名称包含动作和目标，例如 `确认并发送至高二物理3班`。
5. 发送中可使用 `aria-disabled=true` 并保留焦点，状态通过 `role=status` / `aria-live=polite`播报；成功后焦点可留在回执区域的 `查看群消息`，不应跳到页面顶部。
6. 失败和上下文过期信息与相应操作关联；错误摘要把焦点带到可修复问题，且不清空老师编辑过的正文。
7. 所有图标按钮至少满足 24×24 CSS px 的目标或等效间距；焦点环持续可见，不能因圆角或 `overflow:hidden` 被裁掉。
8. 避免用 `Ctrl/Cmd + Enter` 作为一期默认发送捷径；如果未来加入，必须显式提示、可配置并验证中文输入法合成期间不误触。

## 7. 推荐交互序列

```text
Agent Run 完成草稿生成
  → 播报“群消息草稿已生成，等待审阅”
  → 视图滚动到独立 Approval Artifact
  → 老师阅读影响摘要和正文
  → 老师直接编辑（可选）
  → 点击“确认并发送至「高二物理 3 班」”
  → 发送前事实复核
      ├─ 事实变化：阻断旧稿，展示差异并刷新
      └─ 事实未变：创建 Approval，执行一次群消息写回
  → Artifact 原位转为 ExecutionReceipt
  → 左侧群聊出现一条王老师消息并短暂高亮
  → “查看群消息”可再次定位到该消息
```

这条链路保持 D-052、D-053 已锁定的身份和私密边界：WorkBuddy 不进入公开消息；AI 草稿、Run 和审批只对教师可见；群内只出现老师确认后的一条老师消息。

## 8. 不推荐的方案

1. **只把红框区域加粗或加深边框。** 只能制造视觉重量，不能表达待办状态、可编辑性和发送后果。
2. **把“编辑”藏在 Hover 或 `…` 菜单。** 对主任务能力可发现性不足，也不利于触控和键盘用户。
3. **用绿色“生成完成”作为成果主状态。** 容易让老师认为任务已经完成；应该区分 `草稿生成完成` 与 `消息已发送`。
4. **正常发送前再弹一个通用“确定吗？”Modal。** 造成重复确认，Modal 里若不重新展示正文、目标和身份，反而降低判断质量。
5. **按钮只写“确认并发送”。** 当前截图有明确群上下文，但可拖动、切会话和未来多目标能力会让隐含对象变得危险；尽可能把目标写进按钮或紧邻区域。
6. **发送后只显示短暂 Toast。** 缺少可追溯回执，老师无法确认消息落到了哪个群，也无法快速回看。
7. **直接把 AI 内容复制到左侧群聊 Composer。** 这会混淆老师自己正在编辑的普通消息草稿，也让 WorkBuddy 的 ProposedAction / Approval / Receipt 链路失去清晰边界。

## 9. OPEN

1. 老师是否需要在最终草稿中直接增删结构化学生 Chip，还是只编辑文本；两者不同步会造成事实层与表现层分裂，需要用真实任务测试。
2. 当前班级有 30 位成员，但草稿中的 @ 对象只有未交学生；发送影响摘要应显示“30 位成员可见”还是“提醒 6 位学生”，建议同时显示“全群可见 / @6 人”，需验证教师理解。
3. 主按钮写入完整班级名在 384px WorkBuddy 最窄宽度下是否过长；需要验证两行按钮、紧凑文案或让群名放在邻近摘要中的优先级。
4. 是否支持发送后撤回、编辑已发送消息或 15 秒 Undo，取决于生产 IM API、治理、审计和学生端同步能力；在接口事实确认前只提供持久 Receipt 和定位。
5. Agent 生成的 @ 文本如何映射为 ClassIn 的真实 Mention Entity、成员离班或昵称变化如何在发送前处理，必须由领域 Adapter 明确，不能只依赖字符串。
6. 待审阅 Surface 的注意 Token、自动滚动和焦点策略，需要在 1440×900、1280×800、384px WorkBuddy 最窄宽度和 200% 缩放下做视觉与键盘验证。
7. 真实教师是否偏好默认可编辑，还是先读后点编辑；行业邮件产品更偏向可编辑 draft，但班级批量沟通的审阅风险更高，应做至少 5–8 位教师的任务型可用性测试后锁定。

## 10. 最终判断

行业成熟方案并不是“把 AI 结果做得更像一段高亮文本”，而是把它包装成一个有状态、有对象、有编辑能力、有明确后果、有回执的 **Human Review Gate**：

- Outlook / Gmail 证明：AI 先交付可编辑草稿，人保留最终 Send；
- Slack Canvas 证明：AI 新内容需要突出、审阅、Keep/Discard，保存和分享应分开；
- GOV.UK Check answers 证明：提交前要明确告诉用户“现在请检查”，允许修改，并用动作具体的按钮完成交易；
- OpenAI Agents SDK 与 assistant-ui 证明：待人批准是独立状态 / standalone surface，而不是普通工具轨迹；
- W3C 证明：编辑控件、动作按钮、动态状态和成功/失败回执必须具有清晰语义并可被键盘和辅助技术操作。

因此，ClassIn 下一版最值得做的不是增加更多提示，而是把当前红框区域统一成“**待你审阅的群消息草稿**”，让老师沿着一条非常明确的视线完成：**看影响 → 读正文 → 直接修改 → 明确确认 → 得到回执 → 回到左侧群消息。**
