---
title: 一级导航进入消息沉浸式三栏工作区的交互模式研究
status: research-note
date: 2026-08-23
scope: 从 ClassIn 一级“消息”入口进入沉浸式三栏工作区，以及原位退出、恢复与可访问性
evidence-policy: 仅引用官方产品文档、官方设计系统、官方 GitHub 源码与 W3C 规范；产品推论均单独标注
---

# 一级导航进入消息沉浸式三栏工作区的交互模式研究

## 1. 问题、边界与证据标签

本研究服务于一个明确的交互问题：教师从 ClassIn 的一级导航点击“消息”后，如何自然进入一个最多三栏（会话列表、当前群聊、教师私密 WorkBuddy 聊天窗）的沉浸式工作区；退出后又如何让用户**仍留在消息 Tab 与原群聊现场**，而不是误以为“返回了另一个产品”或被送回首页。

这不是把 WorkBuddy Run 另做成压缩版，也不是设计浏览器历史的替代品。当前项目的 D-052～D-055 仍约束私密性、教师确认写回和可审计 Run；本研究只讨论承载它们的 Shell、导航和恢复交互。较早的 IM Sidecar 研究建议在窄右栏中渐进披露 Run；它与本研究的“给予完整 Run 更大工作区”的方向存在产品层冲突，不能在未评审前同时作为实现准则。

- **FACT**：由下文一手来源直接支持的事实。
- **CLASSIN INFERENCE**：将事实与本项目已锁定约束结合后的设计推论，不是外部产品的原话，也不是新 LOCKED 决策。
- **OPEN**：需要原型或教师测试验证，当前不得假定为事实。

## 2. 一手来源索引

| ID | 一手来源 | 本次可验证内容 |
| --- | --- | --- |
| SRC-01 | [VS Code: Use the Chat view](https://code.visualstudio.com/docs/agents/run/chat-view) | Chat 默认位于 Secondary Side Bar；可从标题栏/快捷键打开；可新建 Chat Editor 以获得空间，亦可新窗口 |
| SRC-02 | [VS Code: Custom layout](https://code.visualstudio.com/docs/configure/custom-layout) | 双侧栏、显示/隐藏控制、拖放布局、跨会话记住布局、全屏/Zen Mode、布局重置 |
| SRC-03 | [VS Code Windows shortcuts（官方 PDF）](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf) | Zen Mode 的 `Ctrl+K Z` 与 `Esc Esc` 退出；编辑区布局快捷键 |
| SRC-04 | [VS Code 官方源码：secondarySidebar 扩展点](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/browser/viewsExtensionPoint.ts) | `secondarySidebar` 是 Workbench 的正式视图容器，而非一次性浮层 |
| SRC-05 | [Slack: Use split view](https://slack.com/help/articles/47144721728275-Use-split-view-in-Slack) | 会话或文件可从侧栏上下文菜单进入并排 Split View |
| SRC-06 | [Slack: keyboard shortcuts and commands](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts-and-commands) | 右栏可显式隐藏；桌面端支持应用全屏；可用键盘调整左侧栏宽度 |
| SRC-07 | [Notion: Database views, filters, sorts & groups](https://www.notion.com/help/views-filters-and-sorts) | 同一对象可按 Side peek / Center peek / Full page 三种容器打开；Side peek 右侧打开而左侧来源仍可交互 |
| SRC-08 | [Notion: Intro to databases](https://www.notion.com/help/intro-to-databases) | Peek 页面可用左上角 expand 进入完整页面；对象仍是同一页面，而不是复制一个详情版本 |
| SRC-09 | [Notion: Keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts) | 支持前进/后退以及 peek 内前后条目导航快捷键 |
| SRC-10 | [Microsoft Teams: Multitask during a meeting](https://support.microsoft.com/en-US/teams/meetings/multitask-during-a-microsoft-teams-meeting) | Chat、Notes、Copilot 等侧窗可 Pop out 为独立窗口，官方将其目标描述为减少上下文切换 |
| SRC-11 | [Microsoft Teams: summarize shared files in chats](https://support.microsoft.com/en-us/office/summarize-shared-files-in-teams-chats-29e56340-4467-413f-af64-4233204b4a61) | 在当前 chat 的文件预览中触发 Copilot，结果在 Copilot side pane 打开 |
| SRC-12 | [W3C APG: Modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 弹层打开时焦点进入其中、`Escape` 关闭、关闭后通常回到触发元素；复杂内容的初始焦点原则 |
| SRC-13 | [W3C WCAG Technique C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html) | 交互触发的动画应响应 `prefers-reduced-motion` |
| SRC-14 | [VS Code: Webview API accessibility](https://code.visualstudio.com/api/extension-guides/webview) | 产品把用户的减少动态偏好暴露为 `vscode-reduce-motion` 类，供内容适配 |

## 3. 行业模式：同一工作对象，按注意力密度换容器

### 3.1 入口不是“打开一个新产品”，而是把当前工作对象放到更适合的容器

- **FACT（SRC-01）**：VS Code 的 Chat view 默认与编辑器并置在 Secondary Side Bar；用户可从 Chat 菜单、命令或快捷键打开它。需要更多空间时，用户从同一 Chat 的 `New Chat` 菜单创建 `New Chat Editor`；官方将其定位为“给聊天更多空间或并排比较会话”。
- **FACT（SRC-02）**：VS Code 的 Primary / Secondary Side Bar 可以显式显示或隐藏，且用户拖放后的 view/panel 布局会跨会话记住；需要时可用 `View: Reset View Locations` 回到默认位置。
- **FACT（SRC-05）**：Slack 让用户从会话列表对任意频道或私信执行 `Open in split view`，从而同屏阅读两个会话或文件，而不是要求用户在二者间往返。
- **FACT（SRC-07、SRC-08）**：Notion 对同一数据库页面提供 Side peek、Center peek、Full page；Side peek 保持左侧数据库可交互，peek 内的 expand 再把**同一页**升到 full page。

**CLASSIN INFERENCE**：ClassIn 应把“消息沉浸”建模为同一个 `MessageWorkspace` 的 `shellMode`，而不是新路由下的“WorkBuddy 页面”，更不能建立与普通消息页不同的 Run 投影。必要的状态是布局状态，而非业务状态：

```text
MessageWorkspace(route: /teacher/messages/:conversationId)
  ├─ shellMode = standard        // ClassIn 全局导航完整
  ├─ shellMode = immersive       // 全局导航退出；最多三栏
  └─ panelMode = workbuddy-open | workbuddy-hidden

WorkBuddyRun / ArtifactDraft / Approval / Receipt  // 不因 shellMode 改变
```

这样“退出沉浸”只是 `immersive → standard`；`conversationId`、当前群、Run 和草稿并未离开。浏览器/应用的 Back 则是另一条导航语义，不能混用。

### 3.2 触发要有一条主路径，也要允许用户回到熟悉的布局

- **FACT（SRC-01）**：VS Code 在标题栏提供 Chat 入口，在默认侧栏与 Editor tab 两种内部布局之间提供明确命令；并不把“获得更多空间”伪装为页面后退。
- **FACT（SRC-02）**：VS Code 将 `Full Screen`（窗口铺满显示器）和 `Zen Mode`（隐藏除编辑区外 UI）命名为不同模式，并分别提供可见的 Layout Control / Command。
- **FACT（SRC-06）**：Slack 把隐藏右侧栏和进入应用全屏分成两个明确操作。
- **FACT（SRC-10）**：Teams 将“在侧窗打开”和“Open in new window”分开，后者是扩展工作空间而不是关闭当前会话。

**CLASSIN INFERENCE（推荐进入路径）**：

1. 教师在一级导航点击 `消息`；路由进入或恢复最近一次 `conversationId`，随后直接将 **ClassIn 全局主导航收起为 Icon Rail**，并进入 `MessageWorkspace / immersive`。这不是浏览器 Fullscreen API，也不是另开页。
2. 进入后最多呈现三栏：会话列表 / 当前群聊 / WorkBuddy 私密聊天窗。若教师尚未打开 WorkBuddy，则第三栏不占位；会话与正文各自扩展，右上角保留 `打开 WorkBuddy`。
3. 标题栏用恒定的位置标识：`消息  /  高二物理 3 班`；若 WorkBuddy 打开，加上私密标识 `仅你可见`。它既是位置感锚点，也成为退出后应恢复的目标。
4. 首次进入时可在 Icon Rail 上方或标题栏短暂呈现一次非阻塞提示：`已进入消息工作区 · Esc 显示主导航`。仅首次或用户切换后显示，不能每次打断输入。
5. 如果业务希望保留传统入口，一级导航项的次级菜单可提供 `在标准布局打开`；默认值与上次用户选择应记住。不要把“用户更偏好宽工作区”强制推广为所有 Module 的全屏偏好。

**OPEN**：默认直接沉浸，还是先在标准 Shell 打开再由用户点“进入专注消息”，需用教师任务完成率验证。当前对话已经明显偏向“从消息入口直接进入沉浸”，因此原型优先验证该默认，但仍需提供可逆的标准布局入口。

## 4. 进退设计：区分“退出布局”与“离开消息”

### 4.1 退出动作的命名与落点

- **FACT（SRC-02、SRC-03）**：VS Code 将退出 Zen Mode 定义为退出一种布局状态（`Esc Esc`），而非返回前一个业务对象；Chat、侧栏和 Editor 仍是同一个 Workbench 的对象。
- **FACT（SRC-07、SRC-08）**：Notion 的 peek 与 full page 都是同一对象的不同打开容器；扩展后并不意味着原列表对象被销毁。
- **FACT（SRC-09）**：Notion 将前进/后退作为独立快捷键机制；这说明历史导航和容器切换可以、也应当分开。

**CLASSIN INFERENCE（规范）**：沉浸页顶部左侧采用图标按钮加 Tooltip / 可访问名称 `退出沉浸模式`，不要叫“返回 ClassIn”。点击后的稳定落点是：

```text
ClassIn 标准 Shell
  └─ 一级导航：消息（仍选中）
       └─ 会话：高二物理 3 班（仍选中）
            └─ WorkBuddy：仍开/仍收起，保持离开前状态
```

标题可在退出动效后短暂保持 `消息 / 高二物理 3 班`，让恢复的导航与当前内容形成因果关系。用户若要离开消息，仍点击一级导航；用户若要回到上一会话或上一个 URL，仍使用应用 Back / 浏览器 Back。**退出沉浸不得 `history.back()`。**

| 用户意图 | 入口与文案 | 作用域 | 结果 |
| --- | --- | --- | --- |
| 退出沉浸 | `退出沉浸模式`、`Esc` | Shell | 显示主导航，停留当前消息与会话 |
| 隐藏第三栏 | `收起 WorkBuddy` | Panel | 只释放 WorkBuddy 栏；消息不离开 |
| 离开消息 | 一级导航项 | Route | 进入所选业务 Module；消息现场按恢复策略保留 |
| 回到上一历史位置 | 应用 Back / 浏览器 Back | History | 遵循真实导航历史，可能离开消息 |

### 4.2 快捷键优先级与焦点

- **FACT（SRC-03）**：VS Code 以 `Esc Esc` 退出 Zen Mode，避免与编辑器内其他单次 `Esc` 行为直接冲突。
- **FACT（SRC-12）**：当容器是 modal dialog，焦点打开时必须移入容器、`Escape` 应关闭，关闭后通常回到触发元素；复杂长内容应优先聚焦标题/开头等可理解的静态锚点，而不是使开头滚出视野的任意按钮。
- **FACT（SRC-06）**：Slack 提供键盘调整左栏宽度、隐藏右栏等直接布局操作；布局不是只允许鼠标处理的能力。

**CLASSIN INFERENCE（建议映射）**：

| 条件 | `Esc` 的优先级 | 退出后的焦点 |
| --- | --- | --- |
| 文件预览或确认 Modal 打开 | 先关闭该 Modal | 回到打开预览/确认的触发控件 |
| WorkBuddy 正在编辑多行草稿 | 不退出沉浸；只让编辑器处理自身 Escape 行为 | 保持编辑器与插入点 |
| WorkBuddy 含输入但非编辑状态 | 第一次 `Esc` 仅把焦点移到 Workspace 标题/退出控件；第二次才退出，或采用 `Esc Esc` | 标题栏 `退出沉浸模式` |
| 其他沉浸工作区 | `Esc` 或 `Esc Esc` 退出（最终选择需可用性测试） | 标准 Shell 内的当前会话标题，而不是一级导航图标 |

此处不应把完整三栏工作区误标为 `aria-modal`：它是应用的同级 Shell 状态，背景导航只是被隐藏，不能产生“后台被遮罩且不可操作”的假 Modal 语义。仅文件预览、危险确认才使用 modal 模式与 SRC-12 的焦点圈定规则。

**OPEN**：`Esc` 是否必须采用双击。它与消息输入、候选菜单、文件预览的单击 `Esc` 冲突风险高；建议先在原型实现“组件先消费，空闲 Workspace 用 `Esc Esc` 退出”，再进行键盘可用性测试。

## 5. 原位恢复：不丢失状态，也不让“恢复”变成不可见魔法

- **FACT（SRC-02）**：VS Code 会跨会话记住用户对 views/panels 的布局，且提供 Reset View Locations 作为显式回到默认的出路。
- **FACT（SRC-08）**：Notion 先在 peek 中查看、再 expand 成完整页面，说明“来源上下文”和“对象本身”可同时连续存在。
- **FACT（SRC-10）**：Teams 的 Pop out 允许 Chat、Notes、Copilot 同时保持打开与调整尺寸，目的就是减少在任务之间切换。

**CLASSIN INFERENCE（恢复契约）**：退出沉浸或标准/沉浸往返必须是 layout-only transition，并显式保存下列本地 UI 状态；不触发新 Run、重新读群历史、重新生成草稿或刷新审批。

| 状态所有者 | 切换时必须保留 | 何时可改变 |
| --- | --- | --- |
| Message Workspace | `conversationId`、消息正文滚动锚点 / “新消息”位置、会话列表选中项和滚动位置 | 用户主动切换会话或定位消息 |
| WorkBuddy Surface | 开/关状态、Run ID、展开事件、内部滚动位置、输入焦点前位置 | 用户收起/打开或明确重置 |
| Artifact / Approval | 未发送编辑草稿、字段校验、审批阶段、回执 | 教师明确编辑、确认、取消或策略拒绝 |
| Shell Preference | 最后一次标准/沉浸偏好、三栏宽度 | 用户拖拽/切换；应提供“恢复默认布局” |

**CLASSIN INFERENCE（滚动与新消息规则）**：

- 教师正在阅读历史消息或编辑 WorkBuddy 草稿时，新群消息只出现“有 N 条新消息”锚点，不能把消息正文或私密 Run 自动滚到最新处。
- 教师位于底部且没有编辑中焦点时，才可随新消息保持贴底；这种“是否贴底”必须独立记录，不能仅靠 `scrollTop` 猜测。
- 三栏切换的 DOM 重排后，用消息 ID / Run event ID 作为 scroll anchor 恢复，避免仅按像素恢复而在新内容插入后跳到错误位置。
- 未发送草稿离开消息 Module 时的跨路由保留期限、持久化位置和退出前提示，属于业务数据治理，不能仅以 UI 偏好决定。

**OPEN**：用户是否希望 WorkBuddy 在退出沉浸后仍展开。推荐默认“保持原样”，但需实测：若标准 Shell 宽度不足，恢复后改为 Icon Rail + inline third pane、还是自动收起并用 Toast 说明，必须由窄宽场景验证决定。

## 6. 动效与可访问性：用连续性表达空间变化，不用动效掩盖路由跳转

- **FACT（SRC-02）**：VS Code 的布局控制将 Full Screen、Zen Mode 与 Side Bar visibility 明确为可切换的 Workbench 模式。
- **FACT（SRC-13）**：WCAG 的 C39 建议用户可通过 `prefers-reduced-motion` 抑制由交互触发的非必要动画。
- **FACT（SRC-14）**：VS Code 也会把用户的减少动态偏好下发给其 Webview 内容，以适配窗口中的动画。

**CLASSIN INFERENCE（动效规范候选）**：

1. 点击 `消息` 后，先完成路由 / 会话数据准备，再做 160–220ms 的 Shell transition：主导航文字与底板收束为 Icon Rail，内容区同步扩展；不使用全屏白闪、缩放到屏幕中心或让三个栏位逐一飞入。
2. 退出时为反向同源动效：Icon Rail/主导航从原侧出现，三栏按相同分隔线重排，当前群标题始终不移动或仅随容器平移。这个锚点比复杂动效更能说明“还是同一个消息现场”。
3. `prefers-reduced-motion: reduce` 下取消位移与尺寸补间，直接切换布局，仅保留必要的 opacity 或即时状态文案；屏幕阅读器只宣布一次“已进入/已退出沉浸消息工作区”，不为每列重排重复播报。
4. 若切换耗时超过约 300ms，不再称为“布局切换”；显示普通加载骨架或进度，并保留可感知的当前会话名称。动画绝不能掩盖数据重新载入。

## 7. 三栏与窄视口的布局策略

### 7.1 宽视口：三栏是上限，不是必须常驻的模板

- **FACT（SRC-01、SRC-02）**：VS Code 的默认 Chat side-by-side、可切换 Chat Editor，以及可记忆的双侧栏证明同一工作流可在不同空间密度下变换容器。
- **FACT（SRC-05）**：Slack Split View 的目的也是并排信息，避免两个对象被迫轮换。
- **FACT（SRC-07）**：Notion Side peek 的核心是同时维持来源与详情的可操作性，而非强制所有区域永久显示。

**CLASSIN INFERENCE（宽视口）**：

```text
┌──────────────────────────────────────── immersive Message Workspace ───────────────────────────────────────┐
│  [← 退出沉浸模式]   消息 / 高二物理 3 班                         [收起 WorkBuddy] [布局选项]               │
├───────────────┬───────────────────────────────────┬────────────────────────────────────────────────────────┤
│ 会话列表       │ 当前群聊                            │ WorkBuddy · 仅你可见                                      │
│ 可折叠         │ 消息正文 + 群输入框                  │ 完整 Conversation Run / Artifact / Approval / Receipt     │
└───────────────┴───────────────────────────────────┴────────────────────────────────────────────────────────┘
```

- 三栏间用可拖拽分隔线；最小宽度由“可读消息行长、群输入最小可操作宽度、Agent 审阅/审批最小宽度”的实测结果定义，不能从手机 640px 经验直接套用。
- WorkBuddy 打开时允许会话列表收起为图标/窄列表，但**不再显示第四栏**。文件预览、版本对比等复杂内容以覆盖消息中部的 Focus Overlay 打开，关闭后回到同一个 Run。
- WorkBuddy 关闭时，消息正文获得空间；会话列表和消息正文仍维持两栏，第三栏不显示空白占位。

### 7.2 窄视口 / 放大：减少并列层级，不压缩 Agent 内容

**CLASSIN INFERENCE（响应优先级）**：

1. 先收起会话列表为可召回抽屉或 icon rail；当前群聊天和 WorkBuddy 仍并列。
2. 再把 WorkBuddy 改为覆盖消息正文的非模态 Focus Surface（保留返回当前群的可见按钮），而不是把完整 Run 变成“压缩版卡片”。
3. 只有在最窄尺寸才采用单栏切换：`当前群聊` 与 `WorkBuddy` 作为两个明确可回退的工作面；切换前保留两者滚动锚点和未发送草稿。
4. 若使用 Overlay，它与“消息沉浸 Shell”不同：Overlay 必须有可见关闭/返回动作和焦点恢复；如果后台不可交互才使用 modal 语义。

**OPEN（建议验收矩阵）**：至少在 `1440×900`、`1280×800`、`1024×640`、200%/400% 浏览器缩放、Windows/macOS 键盘与减少动态偏好下验证。验收指标不是“能塞下三栏”，而是教师能否看清当前群、找到退出、编辑草稿并回到同一位置。

## 8. 面向 ClassIn 的整合方案（候选，不是新的锁定决策）

### 8.1 建议的交互闭环

```text
一级导航「消息」
  └─ 打开/恢复最近消息会话
       └─ Shell 收束为 Icon Rail + Message Workspace（最多三栏）
            ├─ 打开 WorkBuddy：第三栏出现，不改变当前 conversationId
            ├─ 收起 WorkBuddy：仅移除第三栏
            ├─ 打开文件：Focus Overlay，关闭后回到同一 Run
            └─ 退出沉浸：恢复标准 Shell，仍在「消息 / 原会话」

浏览器 Back / 应用 Back ─────────────── 真实路由历史；不复用为「退出沉浸」
```

### 8.2 对当前实现/Spec 的明确推论

1. **单一 Agent Surface**：D-055 的可观察事件语言继续生效，但 Run 的完整信息只实现一次；侧栏、沉浸三栏和未来终局页复用同一个 Conversation Run Module。变化仅在 Shell 的容器和可用宽度。
2. **显式布局状态，而非隐式 CSS**：为 `shellMode`、`panelMode`、`selectedConversation`、各栏宽度和 scroll anchors 建立可测试状态接口。不要用“宽度小于某数就偷偷隐藏”的 CSS 作为唯一状态机。
3. **退出不改路由**：`exitImmersive()` 不执行浏览器回退，不清理选中群、Run、草稿或审批；只改变 Shell。路由离开时才触发消息 Workspace 的既定保存/清理策略。
4. **不要用“返回 ClassIn”**：它错误暗示沉浸模式离开了 ClassIn。统一文案是 `退出沉浸模式`；文件层使用 `返回 WorkBuddy`；离开 Module 才是一级导航名称。
5. **完整性优先于三栏死守**：当窗口不足，减少同时可见的 Shell 区域，不减少 Agent 过程、Artifact、确认或回执的语义。
6. **布局可恢复也可重置**：学习 VS Code 的原则，保留教师明确的宽度与模式选择，并为调试/迷失提供 `恢复默认消息布局`。这不会改变任何业务数据。

## 9. 待验证问题与建议原型任务

以下全为 **OPEN**，在教师测试或产品评审前不能升级为事实。

| 验证问题 | 最小原型任务 | 成功信号 |
| --- | --- | --- |
| 直接进入沉浸是否使人知道自己仍在消息 Tab？ | 从课程、作业等任一一级模块点击 `消息`，找出当前班群并说明所在位置 | 能说出“消息 / 班群”，不把它称为 WorkBuddy 独立页 |
| 退出语义是否清楚？ | 在三栏中编辑群消息草稿后点击退出，再复述自己到了哪里 | 仍能看到消息 Tab 和原群；不期待回首页 |
| `Esc` 是否安全？ | 分别在输入法候选、草稿编辑、文件预览、空闲工作区按 Escape | 不意外退出编辑或丢失内容；退出路径可预测 |
| 原位恢复是否可信？ | 滚动到群历史，展开 Run 明细并修改草稿，沉浸/标准来回三次 | 会话、滚动锚点、展开项、草稿、审批均保持 |
| 窄宽是否仍可完成？ | `1024×640` / 200% 缩放下查看作业证据、编辑并确认发送 | 不出现第四栏、横向溢出或唯一操作不可达 |
| 动效是否解释而非干扰？ | 在普通/减少动态两种偏好下往返 | 普通偏好能感知连续性；减少动态没有不必要位移 |

## 10. 结论

一手资料共同支持的不是“把消息页做成另一套全屏产品”，而是三个稳定原则：**同一对象可按注意力与空间在侧栏、并排和完整工作面之间切换；布局切换、历史导航与新窗口是不同动作；用户的布局偏好、焦点与来源上下文需要被保留或提供明确的重置出口。**

因此，ClassIn 的最佳候选是：从一级“消息”入口进入一个仍属于消息 Tab 的沉浸式 `MessageWorkspace`；它以最多三栏容纳会话、当前群和私密 WorkBuddy，必要时减少 Shell 区域而不压缩 Agent 语义；`退出沉浸模式` 恢复 ClassIn 标准 Shell 并原位留在当前会话。浏览器 Back 继续服务真实路由历史，不能承担布局退出。
