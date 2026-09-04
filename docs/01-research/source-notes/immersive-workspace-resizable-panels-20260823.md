---
title: 沉浸式消息工作台 Surface 分组与可拖拽分栏研究
status: research-note
date: 2026-08-23
scope: ClassIn 教师沉浸式 MessageWorkspace 中“会话列表 + 当前聊天”的主工作台分组，以及主工作台与 WorkBuddy 辅助工作台之间的可拖拽宽度
evidence-policy: 仅引用 W3C 规范、官方产品/设计文档与开源组件官方仓库；ClassIn 数值与交互方案单独标注为推论
---

# 沉浸式消息工作台 Surface 分组与可拖拽分栏研究

## 1. 结论先行

**CLASSIN INFERENCE**：当前沉浸式页面适合形成两个、而不是三个视觉 Surface：

```text
沉浸式中性 Canvas
┌────────────── 通信主工作台（一个 Surface）──────────────┐  ║  ┌──── WorkBuddy 辅助工作台 ────┐
│ 会话列表（导航） │ 当前聊天（主要内容）                  │  ║  │ Run / Artifact / 审批 / 输入 │
└──────────────────────────────────────────────────────┘  ║  └──────────────────────────────┘
                                                           可拖拽分隔器
```

- 把“会话列表 + 当前聊天”包在**一个白色、圆角、轻描边的通信主工作台**中是合理的。二者属于同一消息对象的导航—详情关系，不应各自再做独立浮卡。
- WorkBuddy 继续是单独的内嵌悬浮辅助工作台，符合 D-059。主消息面与 AI 辅助面形成清晰的一主一辅，而不是三个同权重的卡片。
- MVP 只让“通信主工作台 ↔ WorkBuddy”这一处分隔器可拖拽；内部“会话列表 ↔ 当前聊天”先保持稳定宽度。这样能解决教师在聊天阅读和 Run 审阅之间的空间分配问题，又不会同时引入两套宽度偏好和两个高频拖拽点。
- 宽度变化只改变布局，不改变 `MessageWorkspace`、`WorkBuddyRun`、草稿、审批、滚动锚点或焦点状态。内容通过换行、内部滚动和窄宽布局自适应；低于可读阈值后应切换为现有 Overlay，而不是继续压窄完整 Agent Run。

这些是面向 ClassIn 的产品推论；行业规范支持的是“分栏可调、设置最小/最大尺寸、窄宽减少栏位、提供可访问分隔器和恢复机制”，并不规定页面必须使用圆角浮层。

## 2. 证据标签与一手来源

- **FACT**：来源可直接验证的行业事实。
- **CLASSIN INFERENCE**：将行业事实、仓库锁定决策和当前实现结合后的候选方案，不是外部来源的原话。
- **OPEN**：仍需浏览器、可访问性或教师可用性测试验证。

| ID | 一手来源 | 本次使用的证据 |
| --- | --- | --- |
| SRC-01 | [W3C APG Window Splitter Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | 可移动分隔器的角色、数值、键盘、标签与控制关系 |
| SRC-02 | [Apple HIG: Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) | 侧栏—内容—可选检查器的多栏关系；macOS 可拖拽；最小/最大宽度；隐藏/恢复；细分隔线 |
| SRC-03 | [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | 窄宽时优先隐藏 tertiary / inspector，而不是把所有栏强行压缩 |
| SRC-04 | [VS Code: Custom Layout](https://code.visualstudio.com/docs/configure/custom-layout) | Primary / Secondary Side Bar、显隐、跨会话记忆、重置、拖放和键盘布局能力 |
| SRC-05 | [VS Code: Use the Chat view](https://code.visualstudio.com/docs/agents/run/chat-view) | AI Chat 与主编辑区并置；可切换侧栏、Editor tab 或独立窗口；会话列表可 compact / side-by-side |
| SRC-06 | [GitHub Docs: Copilot Quickstart](https://docs.github.com/en/copilot/get-started/quickstart?tool=vscode) | Copilot Chat 作为 IDE 右侧辅助窗口，持续保留输入和响应 |
| SRC-07 | [react-resizable-panels 官方仓库](https://github.com/bvaughn/react-resizable-panels) | Panel 的 min/max/default/collapsible；Separator；完成拖动后保存；命中区域；双击恢复默认 |
| SRC-08 | [Microsoft NavigationView](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/navigationview) | 随窗口宽度在 expanded / compact / minimal 间自适应的官方桌面布局模式 |

## 3. FACT：行业规范和成熟工作台说明了什么

### 3.1 多栏布局首先表达对象关系，不是装饰性卡片排列

- **FACT（SRC-02）**：Apple 将 split view 定义为多个相邻 pane；常见结构是 leading pane 承载导航，secondary pane 承载所选内容，可选 tertiary pane 承载详情或补充功能。其 Keynote 例子同时使用 navigator、主画布和 inspector。
- **FACT（SRC-02）**：Apple 要求持续高亮通向详情的当前选择，帮助用户理解各 pane 的关系；在 macOS，分隔线可以拖动调整 pane 尺寸。
- **FACT（SRC-04）**：VS Code 的 Primary Side Bar、编辑区和 Secondary Side Bar 属于同一个 Workbench；Secondary Side Bar 的价值是同时看到两类视图，官方例图把 Copilot Chat 放在编辑器另一侧。
- **FACT（SRC-05）**：VS Code Chat 在同一窗口中可用侧栏、Editor tab、独立窗口三种承载；侧栏适合与主任务并置，Editor tab 用于获得更多空间。Chat 内部的 sessions list 还能在 compact 与 side-by-side 之间切换。
- **FACT（SRC-06）**：GitHub 官方 Copilot 指引同样把 Chat 窗口放在 IDE 右侧，用户在底部持续输入、在窗口中阅读响应。

**CLASSIN INFERENCE**：ClassIn 的会话列表与当前聊天是“导航—详情”关系，应作为一个通信主工作台；WorkBuddy 是“围绕当前聊天完成私密任务”的 inspector / auxiliary workspace，应保持单独 Surface。圆角只应用于这两个外层 Surface，内部不再继续卡片化。

### 3.2 可拖拽必须有上下限、显隐与恢复路径

- **FACT（SRC-02）**：Apple 明确要求为可调整 pane 设置合理的默认、最小和最大尺寸；尺寸不能小到让 divider 难以发现。辅助 pane 可以隐藏，但必须提供工具栏、菜单或快捷键等多种恢复方式。Apple 推荐 macOS 优先使用 1pt 的细 divider。
- **FACT（SRC-03）**：复杂 split view 在变窄时，优先隐藏 tertiary column（如 inspector），并尽量延迟切换到 compact layout。
- **FACT（SRC-04）**：VS Code 的两侧栏可以显式显示/隐藏，用户调整后的 view / panel 布局跨会话保留，并提供 Reset View Locations 回到默认。
- **FACT（SRC-07）**：`react-resizable-panels` 支持 `defaultSize`、`minSize`、`maxSize`、`collapsible` 和 `collapsedSize`；可选择按相对比例或像素保留面板尺寸。官方建议在 pointer 释放后的 `onLayoutChanged` 保存布局，而不是在每次 pointer move 时写存储；Separator 默认可双击回到 Panel 的默认尺寸。
- **FACT（SRC-07）**：该组件将视觉分隔器和 resize hit target 分开治理，并明确指出粗粒度输入设备需要更大的命中区域。

**CLASSIN INFERENCE**：当前 D-059 的“浅灰托盘 + 内缩白色 WorkBuddy”可继续保留；拖拽发生在两个 Surface 中间的空隙中。视觉线保持克制，真实命中区做宽，不能为了“极简”只留下 1px 的可操作范围。

### 3.3 键盘与语义不能只做鼠标拖动

- **FACT（SRC-01）**：W3C APG 把可移动分隔器定义为 focusable `role="separator"`，要求 `aria-valuenow`、`aria-valuemin`、`aria-valuemax`，并通过 `aria-labelledby` / `aria-label` 命名、用 `aria-controls` 指向被控制的 primary pane。
- **FACT（SRC-01）**：垂直分隔器用 `Left Arrow` / `Right Arrow` 移动；`Enter` 折叠或恢复 primary pane；`Home` / `End` 可选地移动到最小/最大；`F6` 可选地在 panes 间循环。
- **FACT（SRC-01）**：W3C 同时注明该模式尚未完成带 ARIA 1.1 功能示例的最终评审，因此仅有属性并不等于完成无障碍验收，仍需实际读屏测试。
- **FACT（SRC-07）**：成熟开源组件的 Separator 会输出 `role="separator"` 和必要 WAI-ARIA 属性，并明确推荐使用 Separator 改善键盘可访问性。

## 4. CLASSIN INFERENCE：推荐布局规格

### 4.1 Surface 视觉分组

```text
Immersive UI Bar（仍是页面级，不包进任何卡片）
└─ neutral Canvas：12px 内边距
   ├─ Communication Surface
   │  ├─ Conversation List：17.5rem / 280px，MVP 固定
   │  ├─ 1px 内部分隔线
   │  └─ Current Conversation：弹性宽度
   ├─ 12px resizable gap / hit target
   └─ WorkBuddy Surface：可调宽度
```

建议视觉约束：

1. 通信主工作台使用项目现有 `8px` Overlay 圆角、1px 细描边和非常轻的面板阴影；`overflow: clip/hidden` 让会话列表和聊天正文共享外轮廓。
2. 会话列表与聊天正文之间只保留 1px 内部分隔，不各自增加外圆角和阴影。
3. WorkBuddy 继续使用 D-059 已锁定的白色内嵌悬浮 Surface。两个 Surface 的圆角、边界和阴影来自同一套 ClassIn Token，但 WorkBuddy 外围的浅灰托盘仍表达“辅助区”。
4. 两个 Surface 之间保留 12px 中性 Canvas 间距；分隔线处 hover / focus 才出现语义绿或中性高对比反馈，常态不出现装饰色条。
5. 班级详情入口没有会话列表时，Communication Surface 只包含当前班级群聊，仍与消息中心共用同一种外层 Surface 和分隔器。

该方案同时满足项目自身“页面 Section 不自动卡片化”的规则：只有两个工作台级 Surface，不形成卡片墙或卡片套卡片。

### 4.2 宽度、默认值与断点

以下数值不是行业统一标准，而是基于当前 `17.5rem` 会话列表、D-018 的 `1440×900` 基线、现有 WorkBuddy `28rem–32.5rem` 和 `74rem` Overlay 断点得出的候选：

| 区域 / 规则 | 推荐值 | 目的 |
| --- | --- | --- |
| 沉浸 Canvas 外边距 | `12px` | 让两个 Surface 与窗口边缘分离，又不过度浪费空间 |
| 两个 Surface 间距 / pointer 命中区 | `12px`；视觉线 `1px` | 保持轻量外观，同时鼠标可抓取 |
| 会话列表 | `280px` 固定；`<896px` 沿用当前 `72px` compact | 保持会话扫描稳定；本轮不引入第二个可调分隔器 |
| 通信主工作台最小宽度（含会话列表） | `704px / 44rem` | 为 280px 会话列表后保留约 424px 可用聊天宽度 |
| 单班群聊主工作台最小宽度 | `576px / 36rem` | 无会话列表时，聊天正文仍有可读空间 |
| WorkBuddy 最小宽度 | `384px / 24rem` | Run 步骤、审批、草稿与 Composer 不退化成窄卡片 |
| WorkBuddy 默认宽度 | `clamp(384px, 34vw, 520px)` | 1440px 下约 490px；与当前 28–32.5rem 范围连续 |
| WorkBuddy 最大宽度 | `min(640px, 45% 可用工作区)` | 宽屏允许细看 Run，又不吞没主聊天 |
| 并排分栏启用 | 可用宽度 `>=1184px / 74rem` | 与现有 Overlay 断点保持一致，减少规则分叉 |
| `<1184px` | WorkBuddy 进入保留边距的 Overlay；禁用 splitter | 优先保留完整 Run，不把两栏都压到不可读 |
| `<896px / 56rem` | 会话列表降为 72px compact；WorkBuddy 仍为 Overlay | 与当前 MessageWorkspace 响应顺序一致 |

恢复已保存宽度时必须重新执行 `min/max` clamp。窗口由宽变窄时，先压缩弹性聊天区；达到通信主工作台最小宽度后切 Overlay，不能继续缩小 WorkBuddy 或让正文横向溢出。

### 4.3 拖拽与键盘交互

建议把 WorkBuddy 作为 APG 中被控制的 primary pane；separator 可访问名称为 `调整 WorkBuddy 宽度`：

| 输入 | 行为 |
| --- | --- |
| Pointer drag | 连续改变宽度；使用 `col-resize`；拖动期间不做宽度 transition、不选择正文文本 |
| `Left Arrow` | 分隔器向左 8px，WorkBuddy 变宽 |
| `Right Arrow` | 分隔器向右 8px，WorkBuddy 变窄 |
| `Shift + Arrow` | 每次 32px，用于快速调整（ClassIn 增补） |
| `Home` | WorkBuddy 回到 384px 最小宽度 |
| `End` | WorkBuddy 到当前窗口允许的最大宽度 |
| `Enter` | 折叠 / 恢复 WorkBuddy；显式关闭按钮仍保留 |
| 双击 separator | 恢复当前入口的默认宽度 |

separator 应持续可聚焦，提供可见 focus ring，并同步 `aria-valuenow/min/max`；数值可表达 WorkBuddy 宽度占可用 Group 的百分比，`aria-valuetext` 可补充当前像素值。Overlay 模式下 separator 不渲染或 disabled，不能留下一个无效键盘控件。

### 4.4 内容自适应规则

1. 两个 pane 的 grid/flex child 均需 `min-width: 0`；标题、Run 步骤、草稿正文和长 URL 应允许换行或 `overflow-wrap: anywhere`，不能反向撑大 pane。
2. 宽度变化后，消息气泡、Run 时间线和 Composer 只做正常重排；不缩放字体，不改变内容语义，不关闭已展开步骤。
3. WorkBuddy 内部的双列字段、审批摘要或操作区，在自身宽度低于约 `440px` 时堆叠为单列；表格/代码等不可折行内容使用自身横向滚动或 Focus Overlay，不拉宽整个 pane。
4. 拖动期间不使用补间动画。只有双击恢复默认宽度时可用极短过渡，并尊重 `prefers-reduced-motion`；更保守的实现是所有 resize 都即时完成。
5. DOM 不应因每个 pointer move 重建 Run。实现可由专门 Panel Module 或 CSS 变量承载瞬时宽度，业务页面只消费稳定的 Layout Interface。

### 4.5 持久化策略

**CLASSIN INFERENCE**：布局偏好是 UI 状态，不属于 WorkBuddy 业务状态。建议：

- 分别保存 `messages-global` 与 `messages-class` 两种布局，因为前者包含会话列表，后者不包含；不按每个班级保存，避免偏好碎片化。
- MVP 保存 `workBuddyWidthPx` 与 `workBuddyOpen`；只在 pointer/keyboard 调整结束后提交存储，不在每次 pointer move 写 `localStorage`。
- 恢复时按当前可用宽度重新 clamp；若窗口小于 1184px，只记住宽度但显示 Overlay，回到宽屏后再恢复。
- 提供 `恢复默认消息布局`，并让 separator 双击恢复默认宽度。未来如需跨设备同步，再把稳定偏好迁到用户设置 Adapter；不要写入 Run、课程、班级或聊天记录。
- 宽度调整、沉浸退出、WorkBuddy Overlay 切换不得清空 Composer、Run 展开状态、草稿或滚动锚点。

## 5. 为什么不建议 MVP 同时拖动“会话列表 ↔ 聊天”

- **CLASSIN INFERENCE**：当前教师的空间矛盾发生在“公开聊天阅读”与“私密 Agent 任务”之间；会话列表的 280px 已是稳定导航列，并可在 896px 下 compact。让内部 divider 同时可拖，会新增一套 min/max、持久化、键盘与响应式冲突，但尚无证据证明教师需要频繁改变会话列表宽度。
- **FACT（SRC-05）**：VS Code Chat 的会话列表已经提供 compact / side-by-side 两种离散模式，这说明内部列表不一定需要连续无级缩放。
- **OPEN**：如果真实使用发现机构名、班级名经常截断，或教师频繁需要浏览长会话标题，可在二期验证 `240–360px` 的可调范围；在此之前先保持单一高价值 splitter。

## 6. 验收矩阵

以下为 **CLASSIN INFERENCE** 的建议验收项：

| 场景 | 通过条件 |
| --- | --- |
| 1440×900 默认 | 会话列表 280px、WorkBuddy 约 490px；当前聊天不拥挤；两个 Surface 主辅清楚 |
| 拖到最小 / 最大 | 不越过 384px / 当前 max；消息和 Run 正常换行；无横向页面滚动 |
| 1280×800 | 仍可并排；若主工作台触及最小值则按 clamp 处理，不遮挡输入和审批 |
| <1184px | WorkBuddy 转为 Overlay；separator 消失/禁用；Run 语义和 Composer 保持完整 |
| 键盘 | Tab 可聚焦 separator；方向键、Home/End、Enter 和双击恢复可预测；focus ring 可见 |
| 读屏 | separator 有名称、当前值和被控制 pane；折叠/恢复有状态反馈 |
| 宽窄往返 | 已保存宽度被 clamp 后恢复；Run、草稿、滚动锚点和焦点现场不丢失 |
| Reduced Motion | 拖拽即时；不出现宽度扫动或弹性过冲；功能与状态文案不减少 |

## 7. OPEN

1. `704px` 通信主工作台与 `384px` WorkBuddy 是否足以完成“查看未交名单—审阅生成文案—回看群消息”的双窗口任务，需要在 1280 和 1440 两档做教师可用性测试。
2. WorkBuddy 最大宽度应止于 600px 还是 640px，需要用复杂 Artifact/审批任务验证；当前催交场景可能低估后续内容密度。
3. `Enter` 折叠是否与教师对 separator 的预期一致。APG 推荐该模式，但产品已有显式关闭按钮，若测试中造成误触，可保留箭头/Home/End并将 Enter 仅用于恢复或移除折叠能力。
4. W3C APG 明确说明 Window Splitter 模式仍缺少完成评审的功能示例；上线前必须用 Windows + NVDA、macOS + VoiceOver 和 200%/400% 缩放做实际验收，不能只依赖 ARIA 属性快照测试。
5. 如果宽度调整成为高频行为，二期再验证 layout preset（如 `聊天优先 / 均衡 / WorkBuddy 优先`）是否比精细拖拽更易发现；当前不应同时加入预设和双 splitter。

## 8. 最终判断

行业一手证据支持用户的两个方向，但应加上明确边界：

1. **左侧两栏可以、也应该打包为一个通信主工作台 Surface**；这是导航—详情的一体化，不是把两个栏目各自卡片化。
2. **中间聊天与右侧 WorkBuddy 可以拖动宽度**；但要把它实现为一个有 min/max、键盘、持久化、重置和响应降级的 Window Splitter，而不是只在 CSS 上加一条可拉动线。
3. **MVP 只做主工作台与 WorkBuddy 的一处分隔器**。会话列表先保持固定宽度；窄宽时按“WorkBuddy Overlay → 会话列表 compact”的既有顺序降级，完整 Agent Run 只实现一套。
