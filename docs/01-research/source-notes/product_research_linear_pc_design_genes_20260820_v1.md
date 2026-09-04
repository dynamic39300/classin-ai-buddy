# Linear PC 端设计基因研究：面向 ClassIn WorkBuddy

**文档版本**：`v1`
**研究日期**：2026-08-20
**研究对象**：Linear Web / Desktop 当前公开产品形态与一手实机证据
**用途**：为 ClassIn 教师 WorkBuddy PC 端设计基线提供设计语言输入，不作为 Linear 业务模型或内部实现架构说明
**证据状态**：官方资料校准至 2026-08-20；本地实机材料采集于 2026-08-09 至 2026-08-12

## 1. 结论

Linear 值得迁移的不是“灰白配色、圆角和少边框”这一层表象，而是一套压低界面噪声、维持工作现场并让复杂度按意图出现的桌面工作台语法：

1. 稳定但退居背景的 App Shell；
2. 统一的 Header、Navigation、View Controls 和对象操作语法；
3. 面向高频处理的连续列表、就地详情和可切换工作面板；
4. 点击、键盘、右键菜单和命令面板共享同一动作模型；
5. 默认只暴露扫描与决策所需信息，高阶控制按意图渐进披露；
6. 颜色用于状态、语义和焦点，而非装饰页面；
7. 用户操作现场、草稿、筛选和多任务上下文得到持续保留；
8. Agent 同时具有全局目的地、快捷唤起、对象内协作和后台任务形态；
9. Agent 使用既有业务对象与权限，不另建一套脱离业务的数据世界；
10. AI 生成内容通过进度、作者归属、差异高亮、版本历史和可恢复机制增强可审阅性。

对 ClassIn WorkBuddy 的核心启示是：**采用 Linear 的信息层级、连续工作表面与 Agent 容器语法，但由 ClassIn PC Shell、教师业务对象、Core Context 和教育安全规则重新定义内容。** 不能把 NineClaw 仅仅套上一层 Linear 皮肤。

## 2. 证据方法与边界

本文使用四类标签：

- `FACT`：Linear 官方资料明确说明，或 Linear 实机截图直接可见；
- `INFERENCE`：由多个可见事实组合形成的设计判断；
- `ADAPTATION`：面向 ClassIn WorkBuddy 的迁移建议，不是 Linear 事实；
- `UNKNOWN`：当前一手证据不能证明的机制或精确参数。

### 2.1 官方一手资料

| 来源 | 时间/状态 | 用途 |
|---|---|---|
| [UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh) | 2026-03-12 | 当前 UI 方向：一致性、可扫描性、专注度、侧栏降噪 |
| [Linear Agent](https://linear.app/docs/linear-agent) | 2026-08-20 读取 | 当前 Agent 入口、上下文、历史、多会话、Skill、权限与 Guidance |
| [Introducing Linear Agent](https://linear.app/changelog/2026-03-24-introducing-linear-agent) | 2026-03-24 | Agent、Skills、Automations 的正式产品发布说明 |
| [Text attribution and agent-assisted editing](https://linear.app/changelog/2026-07-23-agent-assisted-editing) | 2026-07-23 | AI 修改归属、差异审阅和版本恢复 |
| [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) | 2024-03-28 | Shell、层级、密度、主题、字体及设计验证方法 |
| [Personalized sidebar](https://linear.app/changelog/2024-12-18-personalized-sidebar) | 2024-12-18 | 侧栏重排、隐藏、未读呈现和设置 IA |
| [Peek preview](https://linear.app/docs/peek) | 2026-08-20 读取 | 列表/看板中的临时详情预览 |
| [Display options](https://linear.app/docs/display-options) | 2026-08-20 读取 | 视图布局、分组、排序、可见字段和偏好保存 |
| [Search](https://linear.app/docs/search) | 2026-08-20 读取 | 全局搜索、视图内搜索、对象类型前缀与最近记录 |
| [Preferences](https://linear.app/docs/account-preferences) | 2026-08-20 读取 | 字号、指针、链接下划线、主题、提交偏好 |
| [Select issues](https://linear.app/docs/select-issues) | 2026-08-20 读取 | Hover、Focus、Selection、批量动作和多输入方式 |
| [Create issues](https://linear.app/docs/creating-issues) | 2026-08-20 读取 | Modal/Full-screen 两种容器、草稿保留与键盘可达性 |

### 2.2 本地一手实机视觉证据

以下材料是在 Linear macOS App 中实际采集的界面，不是二手文章：

- Linear macOS App 1.32.1，2026-08-09：`/Users/eeo/Documents/claudecode/classin-pc-optimizer/docs/01-research/phase-2-case-library/products/linear/assets/`；
- Issue 列表到详情连续流程：`/Users/eeo/Documents/claudecode/classin-pc-optimizer/docs/01-research/phase-2-case-library/flows/linear-issue-list-detail/assets/`；
- Agent 完整页、Skill 菜单、Skill 创建页和浮动面板，2026-08-12：`/Users/eeo/Documents/claudecode/classin-pc-optimizer/reference/classin-ai相关能力调研/关于ai能力的调研/参考Linear/`。

截图中的红框为材料整理者标注，不属于 Linear 产品视觉。

### 2.3 证据限制

- 2026-08-12 Agent 截图未记录精确客户端版本；其功能内容已通过当前官方 Agent 文档交叉验证。
- 2024 官方设计文章中的 Inter / Inter Display 和主题生成机制是历史上一手说明；2026 UI Refresh 没有再次公布全部 Token，因此不能把它们当作当前精确设计规范。
- 官方资料没有公开完整的间距、字号、圆角、阴影、动效时长、Breakpoint 或 Focus Ring Token。
- 未获得 Linear 当前完整无障碍声明，不能推断其达到某一 WCAG 等级。

## 3. App Shell 与导航基因

### 3.1 稳定 Shell，主工作区优先

`FACT`：Linear 2026 UI Refresh 明确统一了 Projects、Issues、Reviews 和 Documents 的 Header、Navigation 与 View Controls，并将导航侧栏调暗，以突出主内容。2024 官方设计过程把控制主视图的全局 Chrome 概括为“倒 L 形”结构，由左侧栏和顶部区域形成稳定方向。[来源](https://linear.app/changelog/2026-03-12-ui-refresh)、[来源](https://linear.app/now/how-we-redesigned-the-linear-ui)

`FACT`：本地 `LPD-01`、`LPD-04`、`LPD-10`、`LPD-11a` 显示，Inbox、My Issues 和 Search 切换时全局侧栏持续存在，而主工作区按任务使用列表、列表+详情或全宽结果区。

`INFERENCE`：Linear 的一致性来自稳定的空间关系和操作语法，不是要求每个一级页面使用相同列数。Shell 提供方向，但不与当前任务争夺视觉注意力。

`ADAPTATION`：ClassIn 应保留既有 PC 一级导航、身份和机构环境；WorkBuddy 作为一级入口进入专属 Agent 工作表面。Agent 内部允许随任务在对话、过程、产物和沉浸式编辑之间改变布局，不机械继承所有 ClassIn 旧页面模板。

### 3.2 侧栏支持熟练用户个性化，但默认结构清楚

`FACT`：Linear 侧栏支持重排、隐藏低频项、用数字或圆点表达未读，并把低频入口收进 More；Favorites 可保存不同类型对象和视图。[来源](https://linear.app/changelog/2024-12-18-personalized-sidebar)、[来源](https://linear.app/docs/favorites)

`FACT`：本地 `LPD-03b`、`LPD-03c` 显示分组可展开/收起；`LPD-02a`、`LPD-02b` 显示 Hover 状态和 Tooltip；`LPD-04` 显示未读数量贴近入口。

`INFERENCE`：侧栏不是完整信息架构树的永久展开，而是稳定入口与个人快捷方式的组合。高频对象靠 Favorites 与最近访问缩短路径。

`ADAPTATION`：教师侧默认结构应比研发工具更稳定，避免要求教师自行配置后才可用；可以允许置顶班级、课程、近期任务和 WorkBuddy 会话，但不应把全部 AI 能力变成侧栏菜单。

## 4. 连续工作表面：列表、详情、面板与浮层

### 4.1 列表保持，详情就地展开

`FACT`：本地 `LPD-07a` 和 `LNR-05` 至 `LNR-09` 显示，从通知或 Issue 列表打开详情时，来源列表仍保留在同一工作区；处理后返回可恢复筛选与结果现场。

`FACT`：Linear 的 Peek 允许在列表或看板聚焦项上用 Space 临时打开详情，并可用上下方向键连续预览相邻对象；Esc 关闭。[来源](https://linear.app/docs/peek)

`INFERENCE`：Linear 针对不同认知深度提供多个容器级别：扫描列表、临时 Peek、同屏详情、完整页面。容器升级，而不是每次都跳转到新页面。

`ADAPTATION`：WorkBuddy 可使用同一语法组织：历史任务列表 → 任务详情；产物目录 → 就地预览；教师需深度编辑时再进入扩展编辑区或全屏。Core Context 也应支持摘要 Chip → 详情面板 → 业务对象原页三级深入。

### 4.2 Modal、Panel 与 Full-screen 按任务深度切换

`FACT`：Linear 创建 Issue 同时支持快捷键打开 Modal 和 Full-screen；用户导航离开时临时草稿保留，主动关闭时可保存为跨设备草稿。[来源](https://linear.app/docs/creating-issues)

`FACT`：本地 Agent 截图 `iShot_2026-08-12_22.59.04.png` 显示右下角 Agent 入口可打开浮动 Chat，面板提供最小化、放大和关闭；`iShot_2026-08-12_22.58.13.png` 显示同一能力也有侧栏一级入口和完整 New Chat 页面。

`INFERENCE`：容器选择跟随任务深度：快速协作不离开现场，复杂任务进入完整工作台；用户不需要学习两套 Agent 心智模型。

`ADAPTATION`：ClassIn WorkBuddy V1 应以完整工作台为主；课程、班级、作业等页面中的轻量入口可把当前业务对象自动带入任务，再允许放大到完整工作台并保持同一会话和 Context Snapshot。

### 4.3 页面不是卡片墙

`FACT`：本地 `LNR-SUP-15`、`LNR-SUP-17`、`LNR-SUP-19` 显示详情主轴主要依靠标题、描述、字段位置、留白和局部底色建立，而不是把每个 Section 包成独立卡片。边界集中在真正需要容器语义的列表栏、输入框、菜单、Dialog 和 Toast。

`INFERENCE`：Linear 的整体感依赖严格对齐、重复节奏和信息层级；“少边框”是结果，不是方法。

`ADAPTATION`：WorkBuddy 的任务过程不应把每个 Agent 消息、工具调用、阶段结果全部做成同权重卡片。应形成一条主叙事轴，工具调用和技术详情可展开，产物使用稳定的对象型视图。

## 5. 命令、搜索与多输入方式

### 5.1 一个动作模型，多种入口

`FACT`：Linear 对选中对象的动作可由鼠标、键盘、右键菜单或 `Cmd/Ctrl + K` 命令面板执行；Hover 可揭示复选框，方向键或 J/K 可移动焦点，批量选择后出现批量动作。[来源](https://linear.app/docs/select-issues)

`FACT`：官方将命令面板描述为核心组件，并按当前聚焦对象和视图对命令分组和排序。[来源](https://linear.app/changelog/2019-12-18-new-command-menu)

`INFERENCE`：快捷键不是额外能力，而是与可见控件共享同一动作语义；上下文决定命令优先级，使大量能力不必永久占据页面。

`ADAPTATION`：教师主流程必须可通过显式按钮完成；命令面板和快捷键作为熟练层。Hover、右键或快捷键不能成为发布、审批、恢复失败等关键动作的唯一入口。

### 5.2 全局搜索与视图内过滤分工

`FACT`：Linear `/` 搜索跨 Workspace 的 Issue、Project 和 Document；`Cmd/Ctrl + F` 在当前列表、看板或 Inbox 内做临时过滤；Recent Issues 和对象类型前缀帮助快速缩小范围。[来源](https://linear.app/docs/search)

`INFERENCE`：全局“找对象”与当前工作区“缩小集合”是两种不同交互，不应共用一个含糊的搜索状态。

`ADAPTATION`：ClassIn WorkBuddy 中应区分：

- 全局业务对象搜索：班级、课程、课节、学生、资源、作业；
- 当前任务/历史记录过滤；
- Agent 输入中的显式上下文引用；
- 对产物正文或过程记录的局部查找。

## 6. 信息密度与渐进披露

`FACT`：Linear 2024 与 2026 两次官方 UI 说明都强调扫描、层级、密度、一致性与降低视觉噪声。Display Options 把布局、分组、排序和可见字段放入一个按需控制面板，并允许保存个人偏好或 Workspace 默认值。[来源](https://linear.app/changelog/2026-03-12-ui-refresh)、[来源](https://linear.app/docs/display-options)

`FACT`：本地 Inbox 证据 `LPD-04` 至 `LPD-06b` 显示，默认行只保留类型、标题、摘要、时间和未读信号；Filter、Ordering 和行级完整动作在用户表达意图后出现。`LNR-SUP-21` 至 `LNR-SUP-25` 显示次要操作在 Hover 或 More 菜单中出现。

`INFERENCE`：Linear 的简洁来自“控制复杂度出现的时机”，并不代表功能少。高密度建立在字段选择稳定、行节奏一致和次级控制延迟出现之上。

`ADAPTATION`：WorkBuddy 默认应优先展示：教师目标、Core Context 摘要、当前阶段、关键输入输出、需教师决策的事项和产物状态。Skill 名称、工具参数、技术日志、原始 JSON 等过程信息保留但进入可展开层，满足完整还原与可追踪性而不压过主任务。

## 7. 视觉语言：排版、颜色、表面与动效

### 7.1 排版

`FACT`：Linear 2024 官方设计文章记录，当时标题使用 Inter Display、正文继续使用 Inter；同时对侧栏和 Tab 中的标签、图标、按钮做了严格的横纵对齐。[来源](https://linear.app/now/how-we-redesigned-the-linear-ui)

`FACT`：本地实机截图可观察到紧凑行高、有限的字号层级、稳定的左对齐和低字重跨度，但截图不能证明精确字体或 Token。

`INFERENCE`：其“精致”主要来自排版纪律、对齐和重复节奏，而不是夸张的字号或装饰字体。

`ADAPTATION`：WorkBuddy 使用 ClassIn PC 已采纳的中英文字体栈和 Token；借鉴 Linear 的标题/正文层级、紧凑扫描节奏和数字对齐，不复制未经确认的字号。

### 7.2 颜色与表面

`FACT`：2026 UI Refresh 把侧栏变得更暗/更弱，让内容区突出；2024 官方设计说明以 Base、Accent、Contrast 生成表面、文字、图标和控件别名，并允许高对比主题。Linear 支持浅色、深色和自定义主题。[来源](https://linear.app/changelog/2026-03-12-ui-refresh)、[来源](https://linear.app/now/how-we-redesigned-the-linear-ui)、[来源](https://linear.app/docs/account-preferences)

`FACT`：本地截图显示大面积中性色，颜色主要落在状态、优先级、Label、头像、未读与操作反馈；Hover/Selected 多使用低对比底色。

`INFERENCE`：颜色首先表达状态与焦点，表面差异表达空间层级；品牌色不是页面填充色。

`ADAPTATION`：继续采用 ClassIn PC 的中性白灰和单一语义强调色。绿色只用于真实 ClassIn 状态、主要动作或明确焦点，不能用绿色蒙版制造“品牌感”；AI 也不应自动获得高饱和渐变专属色。

### 7.3 动效

`FACT`：官方资料证明 Linear 对侧栏展开、Agent 思考展开、未读数字和菜单等状态使用动画，并持续修复抖动、焦点和面板越界问题；但没有公开统一的时长或缓动 Token。[来源](https://linear.app/changelog)

`INFERENCE`：动效服务于空间连续性、状态变化和减少跳变，不承担装饰性叙事。

`ADAPTATION`：WorkBuddy 的动效重点应是面板展开、阶段切换、产物出现、后台任务更新和成功/失败反馈；具体时长继续使用 ClassIn PC 规范，不从 Linear 截图反推。

## 8. 状态、恢复与可访问性

### 8.1 状态区分与可恢复性

`FACT`：本地 `LPD-05a`、`LNR-02` 显示 Hover；`LNR-SUP-16` 显示 Selected；`LPD-08b` 显示删除 Toast + Undo；`LPD-09a`、`LNR-09` 显示返回后保留筛选现场。Linear Issue 草稿在导航离开后继续保留，主动关闭时可保存为长期草稿。[来源](https://linear.app/docs/creating-issues)

`INFERENCE`：Linear 把低风险动作设计为“即时生效 + 明确反馈 + 短时恢复”，同时尽量保存用户尚未完成的工作。

`ADAPTATION`：WorkBuddy 可对低风险界面动作使用 Undo；但创建、发布或修改 ClassIn 业务对象必须进入 ProposedAction、教师确认、执行与 ExecutionReceipt，不应照搬无确认的即时写回。

### 8.2 可访问性证据

`FACT`：Linear Preferences 支持调整字号、使用 Pointer Cursor、给链接加下划线、选择浅色/深色/系统主题；2024 主题系统支持提高对比度；多数高频视图提供键盘导航和命令入口。[来源](https://linear.app/docs/account-preferences)、[来源](https://linear.app/now/how-we-redesigned-the-linear-ui)、[来源](https://linear.app/docs/select-issues)

`UNKNOWN`：现有官方资料不足以证明完整屏幕阅读器语义、Focus 顺序、Reduced Motion 策略或某一 WCAG 等级。

`ADAPTATION`：ClassIn 不应把 Linear 的键盘效率等同为完整无障碍。WorkBuddy 仍需独立验收 Focus-visible、键盘顺序、对比度、图标文本替代、缩放、动态内容播报和 Reduced Motion。

## 9. AI / Agent 交互基因

### 9.1 一个 Agent，多种入口和容器

`FACT`：Linear Agent 可通过专属 Chat、`Cmd/Ctrl + J` 或业务对象评论中的 `@Linear` 进入；专属 Chat 能展示工作进度、保留历史，并支持多个并行打开的 Chat Tab，Tab 显示未读或工作中状态。[来源](https://linear.app/docs/linear-agent)

`FACT`：本地截图显示 Agent 是侧栏一级入口，也有右下角常驻入口；浮动 Chat 可最小化、放大、关闭，并与完整页使用同类输入、Skill、附件和任务建议。

`INFERENCE`：Linear 将 Agent 设计成一个连续身份，而不是多个互不关联的 AI 工具。入口随当前工作位置变化，任务身份和交互语言保持一致。

`ADAPTATION`：ClassIn 教师只面对统一 WorkBuddy。完整工作台负责复杂任务；课程、班级、作业页中的行内或浮层入口负责带入当前上下文，之后可升级到完整工作台。

### 9.2 Agent 建立在现有业务对象与权限上

`FACT`：Linear Agent 使用 Team、Initiative、Project、Milestone、Cycle、Issue、Comment、Activity 和 Document 等既有 Workspace 数据，并只能引用或修改当前用户有权访问的内容。[来源](https://linear.app/docs/linear-agent)

`FACT`：本地浮窗截图的输入提示允许 `@` 引用 Issue、Project 或 Document；官方文档还说明 `@Linear` 可直接存在于 Issue、Document、Update、Project 和 Initiative 描述的编辑现场。[来源](https://linear.app/docs/linear-agent)

`INFERENCE`：Agent 上下文不是另一个“AI 文件库”，而是现有业务对象的可见引用和权限继承；对象内入口天然带入局部上下文。

`ADAPTATION`：WorkBuddy 的 Core Context 应对应 ClassIn 教师、机构、课程、班级、课节、学生、教材、资源、作业与历史活动；界面需要显示上下文来源、范围、更新时间、权限与本次任务快照。Domain Knowledge 则以课程标准、学科知识、教学法和机构规则等受治理知识层补充。

### 9.3 从对话沉淀 Skill，再升级为自动化

`FACT`：Linear 支持把有效对话保存为个人或团队 Skill，通过 Slash Command 或 Skill 菜单调用，也允许 Agent 在上下文匹配时自动使用；团队 Skill 有独立管理权限。Loops 将共享 Skill 扩展为事件或时间触发的后台工作流。[来源](https://linear.app/docs/linear-agent)、[来源](https://linear.app/changelog/2026-03-24-introducing-linear-agent)

`FACT`：本地 `iShot_2026-08-12_22.58.20.png` 显示 Skill 菜单靠近输入区，并可直接 Create skill；`iShot_2026-08-12_22.58.26.png` 显示当时可见创建字段为名称与 Instructions。

`INFERENCE`：可复用能力从真实任务中沉淀，而不是要求用户先进入“AI 工具市场”选择工具；个人经验成熟后再进入团队治理和自动触发。

`ADAPTATION`：WorkBuddy 保留 NineClaw 的 Skill 完整能力，同时将普通教师的默认路径放在目标和任务模板上。Skill 细节可在执行详情中保留；个人 Skill、机构 Skill、自动任务分别承担试验、标准化和持续运行。

### 9.4 Progress、归属、审阅和恢复

`FACT`：官方说明专属 Agent Chat 展示 Agent 工作进度。2026-07-23 更新进一步让 Agent 修改文本单独高亮、显示作者归属，并允许从版本历史恢复检查点。[来源](https://linear.app/docs/linear-agent)、[来源](https://linear.app/changelog/2026-07-23-agent-assisted-editing)

`INFERENCE`：Linear 正在把“AI 回答”转化为可审阅的业务变化：用户既能看到它正在工作，也能识别哪些内容由 Agent 产生，并在错误时恢复。

`ADAPTATION`：WorkBuddy 应比文本编辑更进一步，对工具调用、阶段性输入输出、ArtifactDraft、ProposedAction、Approval 和 ExecutionReceipt 建立明确状态。教师默认看到业务进展，展开后看到 Skill/Tool 详情；任何正式 ClassIn 写回必须可确认和追溯。

### 9.5 Guidance 是分层规则，不是聊天记忆的替代词

`FACT`：Linear Guidance 可在 Workspace、Team 与个人范围配置，用于约束标题、字段、输出结构和响应风格；不同范围有不同编辑权限。[来源](https://linear.app/docs/linear-agent)

`INFERENCE`：稳定规则与单次对话上下文被分开治理。Guidance 更接近显式的组织/团队/个人规则层，而不是模糊的长期记忆。

`ADAPTATION`：WorkBuddy 可映射为机构教学规则、学科/年级规则和教师个人偏好，并与单次 Context Snapshot 分开呈现。学生事实、教师推断和组织规则不能混入无治理的长期记忆。

## 10. 证据—设计基因—WorkBuddy 适配矩阵

| 一手证据 | 可确认事实 | 提炼出的设计基因 | WorkBuddy 适配建议 | 置信度 |
|---|---|---|---|---|
| 2026 UI Refresh | Header、导航、视图控制统一；侧栏降噪 | 稳定 Chrome，主内容优先 | ClassIn Shell + 专属 Agent Work Surface | 高 |
| 2024 官方重设计文章 | 倒 L Chrome；列表、看板、Split、Full-screen 经全状态压力测试 | 一致关系，不固定页面模板 | 按任务改变对话/过程/产物布局 | 高 |
| Personalized Sidebar + 本地 LPD | 侧栏可折叠、重排、隐藏并保存快捷对象 | 默认清楚，熟练层可个性化 | 允许置顶课程/班级/任务，AI 能力不铺满侧栏 | 高 |
| Peek + 本地 LNR | 列表保持；临时预览、同屏详情、完整页逐级深入 | 容器随认知深度升级 | 任务列表→详情；Context Chip→面板→对象原页 | 高 |
| Display Options | 布局、分组、排序、字段按需出现并可保存 | 复杂度渐进披露 | 默认教师视图克制，高级配置进面板 | 高 |
| Search | 全局对象搜索与视图内搜索分离 | “找对象”与“缩小集合”分工 | 业务对象、任务历史、正文查找分别设计 | 高 |
| Select Issues + Command Menu | 鼠标、键盘、右键和命令面板共享动作 | 一个动作模型，多种输入方式 | 主流程显式可见，快捷层服务熟练用户 | 高 |
| 本地 Inbox/List 截图 | 行级默认字段克制，Hover/More 才出现次级动作 | 高密度来自选择纪律 | 过程主轴显示业务信息，技术日志可展开 | 高 |
| 2024 主题系统 + 2026 UI Refresh | 中性色表面、Accent/Contrast 语义、内容区突出 | 颜色表达状态，表面表达层级 | 沿用 ClassIn Token，不复制 Linear 色值 | 中高 |
| Preferences | 字号、指针、下划线、主题、提交偏好可调 | 效率和可读性允许个体适配 | 教师端提供必要显示偏好；无障碍独立验收 | 高 |
| Linear Agent Docs | 专属 Chat、对象内 @Linear、进度、历史、多 Chat Tab | 一个 Agent，多容器连续工作 | WorkBuddy 完整工作台 + 业务页就地入口 | 高 |
| Agent Docs + 本地 Agent 截图 | Agent 基于既有对象、权限和显式引用 | 上下文属于业务世界 | Core Context 显示对象来源、权限和快照 | 高 |
| Skills / Loops / Guidance | 对话沉淀 Skill，团队治理，事件/定时触发，分层规则 | 从一次任务到可复用流程 | 保留 Skill，分个人/机构/自动任务治理 | 高 |
| 2026-07-23 Changelog | AI 修改单独高亮、作者可见、版本可恢复 | AI 变化必须可审阅和恢复 | 产物差异、审批、写回回执与恢复入口 | 高 |
| 本地 Agent 浮窗 | 浮窗可最小化、放大、关闭，输入支持 Skill/附件/@对象 | 不离开现场也能启动 Agent | 从当前课程对象发起并升级为完整任务 | 中高 |

## 11. 建议纳入 WorkBuddy 设计基线的 12 条原则

1. **Shell 退居背景，任务成为视觉主角。**
2. **统一页面关系与动作语法，不统一所有页面列数。**
3. **扫描、预览、处理、深度编辑使用不同容器深度。**
4. **返回时恢复任务现场、筛选、滚动、草稿和未完成输入。**
5. **默认只显示教师判断下一步所需信息。**
6. **保留完整能力，通过渐进披露控制出现时机。**
7. **显式按钮完成主流程，快捷键和命令面板提供加速层。**
8. **颜色表达真实状态和焦点，不用大面积品牌色装饰。**
9. **一个 WorkBuddy 身份覆盖完整页、浮层和业务对象内入口。**
10. **Core Context 引用 ClassIn 真实对象并继承权限。**
11. **Skill 从成功任务沉淀，在个人、机构和自动运行范围分层治理。**
12. **Agent 的过程、归属、差异、审批、写回和恢复必须可见。**

## 12. 不应直接复制的部分

- 不复制 Linear 的 Workspace / Team / Project / Issue 层级到教育场景；应使用 ClassIn 自有领域对象。
- 不把所有页面固定为三栏；课程表、内容编辑、课堂数据和 Agent 任务需要不同布局。
- 不把 Hover、右键或快捷键作为关键动作唯一入口。
- 不把教师消息、班级会话和系统通知全部压成 Issue Inbox。
- 不根据截图反推精确 Token、字体、圆角、阴影或动效参数。
- 不把低风险 Undo 逻辑直接用于课程、作业、成绩或发布状态写回。
- 不把 Skill 菜单或底层工具暴露等同于“Agent 能力完整”；完整闭环仍需上下文、计划、执行、产物、审批和回执。
- 不把 Linear 的视觉简洁误解为减少功能；真正需要迁移的是信息选择、状态纪律和渐进披露。

## 13. 仍需在设计阶段验证的 UNKNOWN

| 未知项 | WorkBuddy 处理方式 |
|---|---|
| Linear 当前精确字体和全部视觉 Token | 由 ClassIn PC Design System 接管 |
| Linear 当前统一动效时长与缓动 | 使用 ClassIn 动效规则并做原型验收 |
| Linear 完整 Focus、屏幕阅读器和 Reduced Motion 实现 | 按 ClassIn 无障碍规范独立设计和测试 |
| Agent 浮窗放大后是否始终与完整页共享同一会话状态 | WorkBuddy Spec 明确锁定会话连续性 |
| Linear 如何可视化完整上下文裁剪、版本和失效 | WorkBuddy Core Context Spec 独立定义 |
| Agent 每类写操作的确认、撤销与审计策略 | WorkBuddy 使用 ProposedAction / Approval / ExecutionReceipt |
| Skill 自动选择的解释与禁用机制 | WorkBuddy 在任务详情中提供使用原因和控制入口 |
| 高密度布局在中文教育术语下的真实可读性 | 使用 1440×900 Golden Screen 和中文内容压力测试 |

## 14. 对下一阶段的直接输入

这份研究可直接支持 `WorkBuddy V1 Design Foundation`，但不能单独形成最终 UI。下一阶段应将其与两类事实源合并：

1. **ClassIn PC 设计规范与真实业务页面**：决定平台一致性、中文密度、Token、组件和教师既有习惯；
2. **NineClaw 已审阅还原规格**：决定任务、过程、Skill/Tool、产物和历史闭环。

融合时建议使用如下优先关系：

```text
ClassIn PC：Shell、品牌、组件、中文密度
Linear：层级、连续表面、渐进披露、Agent 容器语法
NineClaw：功能完整度、任务执行过程、配套管理能力
WorkBuddy 决策：Core Context、教育领域事实、审批与写回边界
```

最终目标不是“Linear 风格的 NineClaw”，而是一个继承 ClassIn 业务世界、具备 NineClaw 完整任务能力，并以 Linear 式低噪连续工作台表达的教师 WorkBuddy。
