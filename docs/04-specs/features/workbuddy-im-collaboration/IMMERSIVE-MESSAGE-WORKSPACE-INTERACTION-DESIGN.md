---
title: ClassIn 消息沉浸式 WorkBuddy 工作区交互设计
status: IMPLEMENTED_PENDING_USER_REVIEW
version: v0.4
date: 2026-08-23
owner: ClassIn AI Native Product Design
---

# ClassIn 消息沉浸式 WorkBuddy 工作区交互设计

## 1. 设计结论

本方案把“消息沉浸”定义为同一个 `MessageWorkspace` 的 Shell 显示模式，不是新页面、新产品或第二套 WorkBuddy。教师从一级导航点击“消息”后，ClassIn 全局导航与 Topbar 连续退出，消息工作区扩展到应用窗口，最多并列三栏：

1. 会话列表；
2. 当前消息对话；
3. WorkBuddy 私密 Agent 工作台。

WorkBuddy 使用与终局页面相同的 Conversation Run、Artifact、Approval 与 Receipt Surface；进入、退出、调整栏宽或打开文件都不得改变 Run 语义、重启任务或制造“侧栏压缩版”。

第一版主路径选择**直接进入全屏沉浸**。Icon Rail 不在沉浸态常驻，避免与三栏一起形成第四个视觉纵列。退出沉浸后恢复完整 ClassIn Shell，仍停留在消息一级导航和原会话。

## 2. 目标与非目标

### 2.1 目标

- 点击一级“消息”后，用户能感知空间连续展开，而不是误以为跳到另一个产品；
- 沉浸态始终能回答“我在 ClassIn 的消息模块、当前是哪一个会话、如何退出”；
- 退出只改变 Shell，原会话、Run、草稿、审批、滚动和栏宽原位恢复；
- 教师可交互的班级群或 1v1 私聊进入沉浸态后，WorkBuddy 默认并持续显示，宽屏最多三栏，紧凑宽度转常驻 Overlay；
- 文件预览、版本比较和关键确认不得生成第四栏；
- 普通动效、减少动态、键盘和屏幕阅读器路径都能进退自如。

### 2.2 非目标

- 不在本方案中压缩、删减或重新定义 Agent Run 事件；
- 不把 WorkBuddy 最终消息交给群聊输入框继续编辑；
- 不使用浏览器 Fullscreen API，不占用操作系统全屏语义；
- 不把“退出沉浸”实现为 `history.back()`；
- 不在本轮确定生产级跨设备布局偏好同步或草稿长期持久化策略。

## 3. 信息架构与状态

### 3.1 沉浸工作区

```text
┌────────────────────────────────────── Message Workspace ──────────────────────────────────────┐
│  C  消息                                                               [退出沉浸模式]             │
├──────────────────┬──────────────────────────────────┬─────────────────────────────────────────┤
│ 会话列表          │ 当前群聊                          │ WorkBuddy · 仅你可见                    │
│ 私聊 / 班级 / ... │ 消息正文                          │ 完整 Agent Run                          │
│ 搜索与选择        │ 群输入框                          │ Artifact / Approval / Receipt           │
└──────────────────┴──────────────────────────────────┴─────────────────────────────────────────┘
```

- 教师进入可交互实时会话：WorkBuddy 作为第三个辅助 Surface 自动出现，当前 conversation 不变；
- 教师切换班级群或 1v1：WorkBuddy 持续显示，只更新当前 Context/Target，不重建 Run；
- 沉浸态不提供 WorkBuddy Toggle、Sidecar 关闭按钮或 Splitter 折叠命令；
- 文件或复杂 Artifact：使用覆盖消息中部和 WorkBuddy 区域的 Focus Overlay，不新增第四栏；
- Modal 仅用于短确认、授权或风险说明。

### 3.2 显式布局状态

```text
standard
  → entering_immersive
  → immersive
  → exiting_immersive
  → standard

panelMode
  = workbuddy_required
  | focus_overlay
```

`shellMode` 和 `panelMode` 是 UI 状态。`workbuddy_required` 由教师、实时会话和沉浸态共同投影，不写入 Run 业务状态；`conversationId`、`WorkBuddyRun`、`ArtifactDraft`、`Approval` 与 `ExecutionReceipt` 不随它们重新创建。

## 4. 从一级“消息”进入沉浸模式

### 4.1 主路径

教师从任意 ClassIn 一级模块点击左侧导航“消息”：

1. **入口确认，0–60ms**
   - “消息”导航项立即显示选中底纹与状态轨道；
   - 先给出点击反馈，再开始大范围布局变化；
   - 记录触发元素、当前来源 Route 和减少动态偏好。
2. **消息现场准备，0–100ms**
   - 进入 `/teacher/messages`；
   - 若 URL 已带 `category` 与 `thread`，恢复指定会话；否则恢复上次会话；再否则选择当前分类第一条可用会话；
   - 数据准备超过 300ms 时，进入带“消息”位置标题的稳定 Skeleton，不用动画遮盖加载。
3. **Shell 连续展开，100–300ms**
   - ClassIn Sidebar 向左收束并退出；
   - Topbar 高度收束为 0；
   - 原 Workbench 外框 margin、圆角与阴影同步消失；
   - Message Workspace 从原 Stage 边界向窗口边缘扩展；
   - 三栏作为一个整体随容器展开，不逐栏飞入、不缩放内容。
4. **沉浸完成**
   - 顶部稳定显示 `ClassIn 标识 + 消息`；
   - 焦点进入当前选中会话或当前会话标题；
   - `aria-live` 只播报一次：“已进入消息沉浸工作区”；
   - 首次使用时在“退出沉浸模式”旁显示一次非阻塞提示，约 3–4 秒后消失。

### 4.2 已在消息标准布局时

- 标准消息页只保留 Conversation Header 的 WorkBuddy 入口，不提供重复的“进入沉浸模式”动作；
- 点击 WorkBuddy 恢复当前会话 Target 并进入沉浸；只要当前是教师可交互的班级群或 1v1，WorkBuddy 自动成为常驻第三栏；
- 标准页入口与沉浸态常驻是同一 Sidecar 的两种 Shell Policy，不复制 Run Surface，也不互相清空状态。

### 4.3 Deep Link 与通知入口

- 从首页卡片、作业详情或系统通知进入指定消息时，仍打开同一个沉浸 Message Workspace；
- 因没有可见的导航项作为动效起点，直接显示稳定位置栏并使用轻量 opacity 过渡，不伪造从左侧导航飞出的动画；
- URL 中的 `source` 只服务真实业务返回，不参与“退出沉浸”。

## 5. 沉浸态的位置感

### 5.1 顶部位置栏

顶部栏高度建议为 44–52px，只承担 Workspace 级信息：

- 左侧：ClassIn 标识与 `消息`；
- 右侧：`退出沉浸模式`；宽度恢复不额外占用顶栏，通过双击分隔器回到默认值；
- 当前群名由消息正文栏 Header 表达；
- WorkBuddy 的私密性、Run 状态由 WorkBuddy Header 表达；
- 不在顶部重复三栏内部标题或塞入工具、真值标签和任务详情。

### 5.2 退出文案

统一使用：

- `退出沉浸模式`：恢复 ClassIn 标准 Shell，仍在当前消息；
- 沉浸态不提供 `收起 WorkBuddy`；需要恢复两栏时统一使用 `退出沉浸模式` 返回标准 Shell；
- `返回 WorkBuddy`：关闭文件 Focus Overlay；
- `返回班级`：从班级上下文消息 Route 导航回班级；
- 浏览器 / 应用 Back：遵循真实历史。

禁止使用“返回 ClassIn”，因为沉浸态仍属于 ClassIn。

## 6. 从沉浸模式退出

### 6.1 显式按钮

教师点击顶部 `退出沉浸模式`：

1. 捕获当前会话、各栏宽度、消息与 Run 的 scroll anchor、WorkBuddy Target、草稿和焦点位置；
2. 进入 `exiting_immersive`，禁止重复点击但不阻塞正在运行的 Agent；
3. 以进入时的反向同源动效恢复 Sidebar、Topbar、Workbench margin、圆角与阴影；
4. 路由仍为当前 `/teacher/messages?...`，消息一级导航保持选中；
5. WorkBuddy 恢复标准 Shell 的按需可见性，Run、Target、Artifact 与 Composer 状态保持；
6. 焦点落到标准布局中的当前会话标题或选中会话行；
7. `aria-live` 播报一次：“已退出沉浸模式，仍在消息”。

### 6.2 键盘退出

第一版建议采用 `Esc Esc`，借鉴 VS Code Zen Mode，避免与输入法、菜单、编辑器和文件预览的单次 Escape 冲突。

优先级：

1. Modal / Focus Overlay 打开：第一次 `Esc` 关闭最上层 Surface；
2. 菜单、Popover 或下拉框打开：第一次 `Esc` 只关闭该控件；
3. 文本输入或输入法组合中：`Esc` 不退出 Workspace；
4. Workspace 空闲：`Esc Esc` 退出沉浸；
5. 显式按钮始终可用，不要求用户记忆快捷键。

`Esc` 单击还是双击属于可用性测试项；在没有证据前不得牺牲输入安全。

### 6.3 退出沉浸与离开消息

| 意图 | 行为 | 是否改 Route | 落点 |
| --- | --- | --- | --- |
| 退出沉浸 | `exitImmersive()` | 否 | 标准 Shell、消息 Tab、原会话 |
| 离开消息 | 点击一级导航 | 是 | 目标 ClassIn Module |
| 返回历史 | 浏览器 / 应用 Back | 是 | 真实上一 Route |
| 返回班级 | 班级消息中的业务按钮 | 是 | 对应班级详情 |

## 7. 状态与恢复契约

标准 / 沉浸往返不得触发重新请求、重新生成或清理：

| 所有者 | 必须保留 |
| --- | --- |
| Message Workspace | category、conversationId、选中会话、会话列表滚动、消息 ID 锚点、是否贴底、新消息计数、未发送输入 |
| WorkBuddy Surface | Target、Run ID、完整事件、展开项、内部滚动锚点、错误与恢复状态；沉浸可见性由 Shell Policy 投影 |
| Artifact / Approval | 草稿版本、教师修改、字段校验、发送目标、审批阶段、Receipt |
| Layout | 三栏宽度、会话列表是否收起、最近 Shell 偏好 |
| Focus | 进入前触发元素、沉浸态最后合理焦点、Overlay 触发元素 |

新消息到达时：

- 用户位于底部且没有编辑中焦点，消息流可以继续贴底；
- 用户阅读历史或编辑 WorkBuddy，显示“有 N 条新消息”，不强制滚动；
- 布局切换后使用 message ID / Run event ID 恢复，不只记录像素位置。

## 8. 栏宽与响应策略

三栏是最大并列数量，不是每个尺寸都必须同时展示。

### 8.1 宽视口候选

- 会话列表与当前消息共同进入一个通信主 Surface；会话列表首期固定 280px，内部只使用 1px 分隔，不开放第二条拖拽线；
- 当前消息随主 Surface 弹性变化；消息中心主 Surface 最小 704px，单班入口最小 576px；
- WorkBuddy 最小 384px，默认 `clamp(384px, 34vw, 520px)`，最大不超过 640px、可用宽度 45%和主 Surface 最小宽度形成的当前上限；
- 两个 Surface 之间使用 12px pointer 命中区，常态视觉线保持透明，Hover / Focus / Drag 时显示 1px 反馈；
- 拖拽宽度作为本机 UI 偏好保存；消息中心和单班入口分别保存，并提供 separator 双击复位；
- 分隔器遵循 Window Splitter 键盘和 ARIA 契约；布局偏好不进入会话或 WorkBuddyRun 状态。

### 8.2 宽度不足

按以下顺序减少并列区域，不压缩 Agent 内部语义：

1. 可用宽度低于 1184px 时，WorkBuddy 进入覆盖当前群聊的 Focus Surface，separator 不再可见或可聚焦；
2. 可用宽度低于 896px 时，会话列表降为 72px Compact，保留当前群聊与完整 WorkBuddy Overlay；
3. 最窄尺寸仍保持 WorkBuddy Overlay 默认可见，不增加关闭命令；用户通过退出沉浸恢复标准消息布局；
4. 文件 Overlay 覆盖现有中右区域，不新增第四栏。

响应式变化必须是显式 `panelMode`，不能只依赖 CSS 偷偷隐藏区域。

## 9. 动效规范

- 标准时长：160–220ms；路由或数据准备不计入动效；
- Easing：快速响应、平缓落定的 ease-out；进入与退出使用同一运动轴；
- 锚点：`消息`位置标识和当前群标题保持稳定或只随容器平移；
- 禁止：页面整体缩放、三栏依次飞入、白屏 Crossfade、长距离弹簧、进入后再次自动滚动；
- 动画期间不禁用当前 Run，不伪造 Loading；
- `prefers-reduced-motion: reduce` 下直接切换几何布局，仅保留必要状态反馈；
- 若加载超过 300ms，显示普通 Skeleton，不以延长动画掩盖等待。

## 10. 文件与确认 Surface

- 文件快速预览：可用非模态 Focus Overlay；
- 文档 / 课件逐页阅读、版本比较：覆盖消息中部和 WorkBuddy 区域的聚焦工作面；
- 发送、授权、危险写回确认：短 Modal，展示对象、影响、身份和取消；
- Overlay 关闭后焦点回到原触发控件，Run 与消息位置不变；
- 完整消息工作区不是 Modal，不设置 `aria-modal`，也不建立虚假的焦点圈定。

## 11. 异常与边界

- 进入动效中再次点击“消息”：忽略重复触发，不排队第二次切换；
- 退出时 Agent 正在运行：Run 继续，退出后仍能看到实时状态；
- 退出时有未发送群消息或 WorkBuddy 草稿：保留，不弹确认；只有真正离开消息且策略要求清理时再处理；
- 权限失效或目标会话删除：完成 Shell 切换后呈现稳定错误状态，不回退首页；
- 应用重启是否恢复沉浸：默认先恢复上次消息和布局宽度，是否自动恢复沉浸保持 `OPEN`；
- 多窗口同步、跨设备偏好和生产持久化不由本交互文档假定。

## 12. 验收场景

### 场景 A：从首页进入并退出

1. 教师在首页点击一级“消息”；
2. 入口先选中，消息工作区连续展开为全窗口；
3. 教师能指出自己仍在“消息 / 高二物理 3 班”；
4. 点击 `退出沉浸模式`；
5. ClassIn 导航恢复，消息仍选中，原群、滚动和草稿保持。

### 场景 B：运行中的 WorkBuddy 往返

1. WorkBuddy 执行到第 3/4 步；
2. 退出沉浸，再重新进入；
3. Run 不重启、不丢事件、不改变 Artifact；
4. 原展开项和滚动锚点恢复。

### 场景 C：Escape 优先级

1. 分别在输入法候选、菜单、文件 Overlay、草稿编辑和 Workspace 空闲状态按 `Esc`；
2. 只关闭最内层有效 Surface；
3. 不意外退出、不丢输入；
4. 空闲时 `Esc Esc` 可退出沉浸。

### 场景 D：窄宽与减少动态

1. 在 1024×640、200% 缩放和 `prefers-reduced-motion` 下进入；
2. 系统减少并列区域，而不是删减 Run；
3. 所有主要操作可达、无横向溢出；
4. 退出与焦点恢复清晰。

## 13. 第一版实施范围

本轮已实现并验证：

1. 一级消息入口进入全屏沉浸；
2. 全局 Sidebar / Topbar 连续退出和恢复；
3. 教师实时会话进入沉浸后默认显示 WorkBuddy，切换会话只更新上下文，退出后恢复标准 Shell 按需逻辑；
4. 显式退出、`Esc Esc` 与焦点恢复；
5. 原会话、Run、草稿和滚动状态保持；
6. 文件继续遵循 Focus Overlay 规则；当前催交切片没有文件 Artifact，不虚构第四栏或无效预览入口；
7. 普通动效与 Reduced Motion 下的同一状态结果；
8. 1440×900、1280×800、1024×640 三个关键视口；
9. 会话列表与聊天正文的一体化主 Surface、WorkBuddy 独立辅助 Surface，以及二者之间唯一的可访问分隔器；
10. global/class 两类宽度偏好、min/max、双击复位和窄宽 Overlay 降级。

不在第一版原型中实现新的 Agent 能力、真实 ClassIn API、跨设备布局同步或生产持久化。

## 14. 已确认实施判断

本轮确认并按以下判断实施：

1. 点击一级消息后直接进入完全隐藏全局导航的沉浸模式；
2. 顶部退出动作采用 `退出沉浸模式`，退出后仍在消息 Tab / 原会话；
3. 键盘采用 `Esc Esc`，单次 `Esc` 优先交给输入和局部 Surface；
4. 每次从其他模块点击一级消息默认进入沉浸；退出后的标准消息页只通过 WorkBuddy 入口再次进入三栏沉浸，不提供重复的“进入沉浸模式”动作；
5. WorkBuddy 宽屏栏宽为 448—520px，紧凑宽度转为最大 520px 的 Overlay。
6. 沉浸态不显示 WorkBuddy Toggle、关闭按钮或 Splitter 折叠命令；退出时显示非阻塞提示，说明仍停留在当前会话；Reduced Motion 下不执行位移动画。

## 15. 研究依据

本方案基于以下一手资料及本项目事实：

- [一级导航进入消息沉浸式三栏工作区的交互模式研究](../../../01-research/source-notes/immersive-message-workspace-interaction-patterns-20260823.md)
- [IM 内嵌 AI Sidecar 与 Agent Run 渐进披露模式研究](../../../01-research/source-notes/im-ai-sidecar-interaction-patterns-20260823.md)（仅保留 Drawer / Overlay 和审计证据；其压缩 Run 建议已被本方案明确否决）
- `D-052`—`D-056`、`D-069`：教师私密 WorkBuddy、作业催交切片、渠道分轨、统一 Conversation Run、沉浸 Shell Mode 与沉浸态 WorkBuddy 常驻策略。

外部案例只作为交互证据，不自动成为新的 LOCKED 决策。用户已确认直接沉浸方向与教师实时会话常驻 WorkBuddy，分别锁定为 `D-056` 与 `D-069`；本方案当前状态为 `IMPLEMENTED_PENDING_USER_REVIEW`。
