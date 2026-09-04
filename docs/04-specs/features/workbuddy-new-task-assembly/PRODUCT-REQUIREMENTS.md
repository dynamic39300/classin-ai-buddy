---
title: TeacherIn 新任务首页 Agent、Skill 与文件装配升级 PRD
status: IMPLEMENTED_READY_FOR_REVIEW
version: v0.6
date: 2026-09-03
decision: D-119, D-120, D-124, D-125, D-126, D-128
owner: ClassIn TeacherIn
experience_profile: ideal-full
---

# TeacherIn 新任务首页 Agent、Skill 与文件装配升级 PRD

## 1. 产品目标

在 `ideal-full` 教师端 TeacherIn 的“新建任务”页，为教师提供一套靠近聊天输入框、随时可选且可移除的任务装配能力：教师既可以直接用自然语言发起任务，也可以按需引用 Agent、Skill 和文件，并在提交前清楚看见本次任务将使用的材料。

本次升级不把 TeacherIn 改造成需要教师先理解内部 Agent、Skill 或模型的工具配置台。TeacherIn 仍是统一的 AI 教学搭档；Agent、Skill 和文件只是本次任务的可选增强上下文。

### 1.1 预期用户价值

- 降低从 AgentIn、技能市场和文件页寻找资源后再回到任务页的操作成本；
- 让教师知道“本次任务引用了什么”，避免资源被隐式加入；
- 选择 Agent 后立即得到可编辑的推荐 Prompt，降低从能力发现到任务表达的门槛；
- 在教师已有输入时保护原文，不因选择或移除 Agent 丢失教师意图；
- 为后续 Run 的可追溯 ContextSnapshot 提供结构化输入，而不是只把资源名称拼进 Prompt。

### 1.2 成功定义

教师能够在同一任务输入器中完成“直接描述任务 → 可选引用 Agent / Skill / 文件 → 检查与编辑 Prompt → 创建任务”，且整个过程可恢复、可撤销、无隐式覆盖。`ideal-full` 演示路径自动准备固定、已授权的教学上下文，不要求教师在首页额外操作 Core Context。

## 2. 事实、决策与证据边界

| 层 | 当前内容 |
|---|---|
| `SOURCE_FACT` | 腾讯 WorkBuddy 参考页展示了输入器附近的常用 Agent / Skill 横条、加号两级菜单、Agent / Skill 搜索短列表、完整管理页跳转、选中标签，以及选择 Agent 后自动代入 Prompt |
| `CURRENT_DEMO_FACT` | TeacherIn 新任务页已有自然语言输入、单个 Skill 选择、可移除 Skill 标签、Core Context、四个教学任务快捷入口，以及独立的技能市场、AgentIn、我的文件页面；附件入口尚无真实选择闭环 |
| `LOCKED_DECISION` | D-119、D-125 已锁定 5 Skill + 4 Agent、Agent 命名与 AgentIn 跳转、三类文件来源、选择数量无上限、统一任务材料区，以及“材料可多选、最新自动 Prompt 替换上一个、教师文字不丢失”的合并 / 移除规则 |
| `DEMO_FIXTURE` | 本 PRD 提议复用当前静态 Skill 与 AgentIn 推荐数据作为首版展示内容；它们不是线上使用频率、推荐质量或产品优先级的事实 |
| `OUT_OF_SCOPE` | 腾讯产品 Shell、模型切换、模式、连接器、外部知识库、Agent DIY / 发布 / 授权、真实生产接口 |

研究证据见：[腾讯 WorkBuddy 任务首页、专家、技能与文件装配交互研究](../../../01-research/source-notes/tencent_workbuddy_task_home_interaction_reference_20260903.md)。

## 3. 用户与核心任务

### 3.1 主要用户

- 当前 `ideal-full` Experience 中的 ClassIn 教师；
- 学生端、班级独立 `classin-mvp` 与独立 C 端 `standalone-teacher` 不在本轮范围。

### 3.2 用户 Job

> 我正在 TeacherIn 里描述一个教学任务，希望能在不离开当前草稿的情况下，快速加入合适的 Agent、Skill 和教学资料；选择 Agent 时获得可编辑的表达建议，同时始终保留我已经写好的内容，并在创建任务前知道系统会使用哪些材料。

### 3.3 核心原则

1. **自然语言优先**：不选择任何 Agent、Skill 或文件，也能创建任务。
2. **显式装配**：只有教师主动选择的资源才进入任务材料区。
3. **教师原文优先**：任何自动 Prompt 不得覆盖教师已有输入。
4. **可撤销**：选择、移除和自动 Prompt 变更都必须有可理解的恢复方式。
5. **结构化引用**：Agent、Skill、文件和 Core Context 各自保留稳定身份与来源，不退化为纯文本。
6. **产品边界清晰**：选择 Agent 是引用专业能力，不是替换 TeacherIn 主 Agent。

## 4. 范围

### 4.1 本轮包含

1. 仅升级 `/teacher/ai-agent/new` 的 `ideal-full` 新任务首页；
2. 在输入器上方展示常用能力快捷条：前 5 个 Skill，后 4 个 Agent；
3. 点击快捷项后，直接将对应能力加入当前任务材料区；
4. 输入器提供统一加号入口，首版只包含“添加文件”“Agent”“Skill”；
5. Agent 和 Skill 短选择器支持搜索、空结果、滚动列表、选择、移除和进入完整页面；
6. “更多 Agent”进入 `/teacher/ai-agent/agentin`；Skill 管理入口进入现有技能市场；
7. 文件来源只包含本地文件、我的文件和 ClassIn 空间；
8. 所有已选 Agent、Skill 和文件统一显示在输入框底部工具栏的“任务材料区”，位于加号右侧、提交按钮左侧；
9. Agent、Skill 和文件选择数量不设产品上限；
10. 实现 Agent / 任务型 Skill 推荐 Prompt 的填入、最新自动 Prompt 替换、教师编辑识别、移除保护和撤销领域能力；
11. 从 AgentIn、技能市场或文件选择页返回时，保留任务草稿、已选材料与 Core Context；
12. 创建任务时，将本次 Agent、Skill、文件和 Core Context 固化为 Run 的结构化输入快照；
13. 移除当前输入器下方独立的四个教学任务快捷按钮，并把“生成单个课件、生成课程方案包、生成测验、分析班级学情”转化为常用 Skill，在输入器上方统一展示。
14. 收敛 `ideal-full` 首页首屏：隐藏欢迎说明、常用能力可见标题、Core Context 入口与摘要；保留语义化可访问名称；课件与课程方案包 Skill 自动使用演示上下文。
15. 左右浏览按钮与能力项位于同一水平带右侧，并以轻量渐变遮盖表达横向可浏览；欢迎区、能力带与输入器保持舒适留白。
16. 已选材料只投影为输入框底部工具栏内、紧随加号的轻量标签带，不显示“任务材料 / N 项”标题或分隔线；Prompt 正文区不再承载材料标签；正常添加、重复选择和移除不在输入框下方重复显示成功说明或文字型 Undo 条。
17. 加号选择器在输入器上方打开；一级只展示文件、Agent、Skill，二级按需展示文件来源或 Agent / Skill 搜索列表，并提供返回一级的清晰入口。
18. 欢迎区、能力横条和 Composer 使用统一的 56rem 内容轴；欢迎区缩小并居中，能力横条与 Composer 左右边界对齐。翻页按钮与标签同高、同基线，翻页后停靠在完整标签起点。

### 4.2 本轮不包含

- 不扩展到 `classin-mvp`、`standalone-teacher` 或学生端；
- 不要求教师选择 Agent 或 Skill 才能开始任务；
- 不暴露模型、MCP、多 Agent 编排图、内部路由或工具执行拓扑；
- 不加入“模式”“连接器”、TeacherIn、班级群文件、腾讯文档或第三方知识库；
- 不实现 Agent 创建、DIY、收藏写入、发布、班级添加、授权或真实市场推荐；
- 不实现真实生产上传、云盘或 ClassIn 空间后端；首版可使用固定、可重置的 Demo Adapter，但正常页面不显示“模拟 / 仿真”标签；
- 不修改 AgentIn、技能市场和我的文件页面的既有主体功能，除非为了返回草稿建立必要的导航 Seam；
- 不删除当前已隐藏的工具连接、定时任务入口或其代码。

## 5. 信息架构与主流程

```text
TeacherIn / 新建任务
  ├─ 常用能力快捷条
  │   ├─ 5 个 Skill → 加入任务材料区
  │   └─ 4 个 Agent → 加入任务材料区 + 代入推荐 Prompt
  └─ 任务输入器
      ├─ 可编辑任务草稿
      ├─ 底部工具栏
      │   ├─ 加号
      │   └─ 任务材料区（Agent / Skill / 文件）
      ├─ 加号选择器
      │   ├─ 添加文件
      │   │   ├─ 本地文件
      │   │   ├─ 我的文件
      │   │   └─ ClassIn 空间
      │   ├─ Agent → 搜索 / 常用 Agent / 更多 Agent
      │   └─ Skill → 搜索 / 已安装 Skill / 管理 Skill
      ├─ 演示上下文（自动准备，不显示操作入口）
      └─ 创建任务
          → 固化任务材料与 ContextSnapshot
          → 创建 TeacherIn Run
```

### 5.1 主成功路径

1. 教师进入新任务页，看到空白输入器和常用能力快捷条；
2. 教师可以直接输入，也可以先选择一个或多个 Agent / Skill；
3. 已选能力立即进入任务材料区；Agent 的推荐 Prompt 按第 9 节规则进入草稿；
4. 教师可通过加号继续选择文件、Agent 或 Skill；
5. 教师检查材料并修改草稿；系统已经自动准备当前演示所需的教学上下文；
6. 点击创建任务，系统把当前材料引用与 Context 固化到新 Run；
7. Run 创建成功后进入既有任务运行流程。

### 5.2 完整页面往返

```text
新任务草稿
  → 更多 Agent / 管理 Skill / 从我的文件选择
  → 对应完整页面或选择面板
  → 浏览 / 管理后返回；文件选择视图可带回已选文件
  → 恢复同一新任务草稿、材料、Core Context 和输入焦点语境
```

完整页面跳转不能隐式提交任务，也不能清空尚未创建的草稿。

## 6. 首页常用能力快捷条

### 6.1 内容与顺序

- 固定展示 9 个常用项：前 5 个 Skill，后 4 个 Agent；
- 5 与 4 只是首页展示数量，不是选择上限；
- Skill 与 Agent 必须通过图标、类型标识或可访问名称被区分，不能只依赖颜色；
- 首版使用固定 Demo Fixture，避免把未验证的算法结果表达为“个性化推荐”。

首版建议复用当前数据：

| 类型 | 建议固定顺序 | 说明 |
|---|---|---|
| Skill | 生成单个课件、生成课程方案包、生成测验、分析班级学情、Word 文档 | 前四项承接原快捷任务，第五项复用现有通用 Skill；仅为 Demo 固定数据 |
| Agent | 每日名言、成语溯源与应用专家、地理百科大全、孔子 | 复用当前 AgentIn 推荐卡片；仅为 Demo 固定数据 |

上述固定内容已在 PRD Review 中确认；它们是首版 Demo Fixture，不代表真实使用频率或线上推荐算法。

### 6.2 交互

- 点击未选 Skill：加入任务材料区。普通 Skill 不自动改写 Prompt；由原快捷任务迁入的四个任务型 Skill 继续带入原任务类型和可编辑任务建议，以保留原快捷入口能力；
- 点击未选 Agent：加入任务材料区，并按第 9 节注入推荐 Prompt；
- 点击已选项：不重复添加；快捷项展示已选状态，并将焦点或视线引导到对应材料标签；
- 横向空间不足时允许横向浏览或分页箭头，但页面本身不得产生横向滚动；
- 左右浏览按钮与能力项同处一行并固定覆盖在横条右侧；渐变遮盖只用于提示横向可浏览，不得遮住按钮焦点、截断当前可操作项或造成不可达内容；
- 页面不显示“常用 Agent 和 Skill”文字标题，但 Region 保留同名可访问名称；欢迎区、能力条和输入器之间使用 Design Token 建立温和、舒适的垂直节奏；
- 键盘用户可依次访问全部 9 项，并能识别类型与选中状态。

## 7. 统一加号与选择器

### 7.1 一级菜单

加号菜单首版只展示：

1. 添加文件；
2. Agent；
3. Skill。

不出现参考产品中的“模式”和“连接器”。打开后加号进入明确的开启状态；再次点击、按 `Escape`、点击浮层外部或完成选择均可关闭。关闭后焦点回到加号或合理的下一操作点。

### 7.2 Agent 短选择器

- 标题与入口统一使用 `Agent`，不使用“专家”；
- 包含搜索框、常用 Agent 列表、无结果状态和底部“更多 Agent”；
- 搜索至少按 Agent 名称和简介过滤当前固定数据；
- 选择后不关闭教师草稿，不重复加入相同 Agent；
- “更多 Agent”进入现有 AgentIn 页面；返回时恢复当前草稿；
- Agent 列表项应说明它是任务引用，不使用“切换主 Agent”或相似文案。

### 7.3 Skill 短选择器

- 包含搜索框、已安装 Skill 列表、无结果状态和底部管理入口；
- 支持选择多个 Skill；同一 Skill 不重复加入；
- 普通 Skill 不自动注入 Prompt；“生成单个课件、生成课程方案包、生成测验、分析班级学情”四个任务型 Skill 继续承担原快捷入口的任务类型选择与可编辑任务建议；
- 管理入口进入现有技能市场，并保留当前新任务现场。

### 7.4 文件来源菜单

只展示以下三类来源：

| 来源 | 首版交互 | 进入任务材料区前的最低信息 |
|---|---|---|
| 本地文件 | 打开操作系统文件选择器，可多选 | 文件名、类型、大小、读取状态、稳定临时引用 |
| 我的文件 | 打开 TeacherIn“我的文件”选择视图，支持搜索与多选 | 文件 ID、名称、类型、更新时间、所有者 / 可用范围 |
| ClassIn 空间 | 打开 ClassIn 空间选择视图，支持搜索与多选 | 对象 ID、名称、空间位置、类型、更新时间、授权范围 |

本轮不在选择器中加入第四种来源。若文件无权限、格式不可读取或来源已经失效，必须明确告诉教师并允许移除、重试或重新选择，不能静默忽略。

## 8. 任务材料区

### 8.1 位置与结构

- 位于输入器内部的底部工具栏，紧随左侧加号并位于右侧提交按钮之前；
- 只有存在已选材料时才显示标签容器，不为零材料保留空白占位，也不显示“任务材料 / N 项”可见标题；
- Agent、Skill、文件使用同一材料区，但保留清晰的类型图标、名称、来源和状态；
- 标签带与加号处在同一工具栏轴线，正文区域只保留 Prompt，不增加分隔线；
- 标签视觉参考腾讯 WorkBuddy 的已选状态，最终使用当前 ClassIn Design System 的 Token、圆角、焦点和移除规则；
- Core Context 不并入任务材料区。它仍是 ClassIn 业务目标与权限上下文；`ideal-full` 首页只隐藏入口与摘要并自动准备演示上下文，底层 Panel、ContextSnapshot 与其他 Experience 的既有入口均保留。

### 8.2 数量与布局

- Agent、Skill 和文件均不设产品数量上限；
- 不因标签过多压缩正文输入区到不可用高度；
- 不让整个页面产生横向滚动；
- 默认建议材料区最多展示两行标签，超出后显示“展开全部（N）”，展开后可查看全部并“收起”；
- 收起只影响视觉，不卸载或取消任何材料；
- 所有隐藏材料必须可由键盘展开后访问。

“两行后收起”是本 PRD 的推荐显示策略，不是数量限制，需在 PRD Review 中确认。

### 8.3 排序与去重

- 默认按教师首次选择顺序展示，不按类型自动重排；
- 同一类型、同一稳定 ID 只允许出现一次；
- 不同来源但同名文件不自动合并，必须显示来源以避免误删；
- 移除材料后，其余项目保持相对顺序；撤销后恢复到原位置。

### 8.4 材料标签状态

| 类型 | 状态 |
|---|---|
| Agent | ready、prompt-added、prompt-edited、removed-undoable |
| Skill | ready、unavailable、removed-undoable |
| 本地文件 | reading、ready、failed、cancelled、removed-undoable |
| 云端文件 / 空间对象 | ready、permission-denied、stale、removed-undoable |

移除不能只依赖 Hover 出现的 `X`；Hover、键盘 Focus 和触摸 / 常驻操作均需可达。

## 9. Agent 推荐 Prompt 规则

### 9.1 选择 Agent

每个 Agent 有一段稳定的推荐 Prompt 模板，并保留 Agent 来源。选择时：

| 当前草稿 | 行为 |
|---|---|
| 空白 | 直接填入该 Agent 的推荐 Prompt，并保持可编辑 |
| 已有教师文字 | 完整保留教师原文，在末尾新增换行，再追加该 Agent 的推荐 Prompt |
| 已有可识别且未经编辑的 Agent / 任务型 Skill 自动 Prompt | 删除旧自动 Prompt，只保留最新一次选择的推荐 Prompt；材料标签继续累计 |
| 已有教师文字或已编辑的旧 Prompt | 完整保留为教师文字，在末尾新增换行，再放入最新推荐 Prompt |
| 已存在同一 Agent | 不重复添加材料，也不重复追加 Prompt |

每次选择后只允许存在一个仍受系统管理的自动 Prompt。Domain 继续生成 Undo 记录，但当前 `ideal-full` 页面不投影文字型 Undo；任何恢复行为都不得覆盖教师在此之后继续输入的无关文字。

### 9.2 教师编辑识别

- 每个自动 Prompt 片段需要保留 `agentId`、原始模板、当前文本范围或等价来源关系，以及是否被教师修改；
- 教师在自动片段内增删或改写后，该片段进入 `prompt-edited`；
- 教师在片段之外写的新内容始终属于教师原文；
- 产品界面不必暴露内部范围数据，但应让“已按你的编辑保留内容”等结果可理解。

### 9.3 移除 Agent

| Prompt 状态 | 移除 Agent 后 |
|---|---|
| 自动片段未被教师修改 | 同时移除该 Agent 的关联 Prompt 片段 |
| 自动片段已被教师修改 | 只移除 Agent 材料标签，保留教师编辑后的文字 |
| 无关联 Prompt | 只移除 Agent 材料标签 |

移除后提供撤销：

- 未编辑片段：撤销恢复 Agent 与原 Prompt 片段；
- 已编辑片段：撤销只恢复 Agent 引用，不重复插入已保留文字；
- 多 Agent / Skill 场景的材料引用互不删除；文本区只维护最新自动 Prompt，较早且未经编辑的自动 Prompt 已在后续选择时被替换。

### 9.4 冲突保护

- 如果无法安全判断 Prompt 片段是否被修改，默认保留文本，只移除 Agent 引用；
- 不允许用字符串全局替换删除内容，避免误删教师写出的同样句子；
- 页面刷新或完整页面往返后，Prompt 来源与编辑状态仍需保留在同一草稿会话中。

## 10. 草稿、导航与 Run 快照

### 10.1 新任务草稿

同一 `ideal-full` 新任务现场至少保存：

- 教师输入文本；
- Agent / Skill / 文件的稳定引用、顺序与状态；
- Agent Prompt 来源与编辑状态；
- 自动准备的 Core Context 引用；
- 当前返回目标和必要的输入焦点语境。

从 AgentIn、技能市场或我的文件返回不能清空这些数据。教师显式“新建空白任务”或完成既有重置动作时，才按统一确认规则清空。

### 10.2 创建任务

- Agent、Skill 和文件是可选项；`ideal-full` 的 Core Context 由演示逻辑自动准备，创建条件仍要求其内部状态已经确认；
- 仍在 `reading`、`failed`、`permission-denied` 或 `stale` 的材料不能被静默提交；
- 若无效材料不影响任务继续，必须由教师明确移除或确认不使用，不能后台自动丢弃；
- 创建成功时，把最终草稿、材料引用、Agent Prompt 来源和 Core Context 固化到 Run 的输入快照；
- Run 创建后继续使用既有运行、恢复、审批与 Receipt 机制，本 PRD 不改变后续 Run 状态机。

## 11. 状态与恢复矩阵

| 场景 | 必须表现 |
|---|---|
| 首次进入 | 空白输入器、5 Skill + 4 Agent 快捷条、无材料区占位 |
| 打开加号 | 一级菜单出现，焦点受控；可关闭并恢复焦点 |
| Agent / Skill 搜索 | 动态过滤；无结果时保留稳定容器并给出明确文案 |
| 重复选择 | 不增加重复标签，不重复注入 Prompt；不额外显示成功说明 |
| 本地文件读取中 | 标签显示进度或读取状态，可取消 |
| 文件读取失败 | 标签显示原因与重试 / 移除；不伪装成功 |
| 云端权限变化 | 标记不可用，创建前要求处理 |
| 材料很多 | 自动换行并收起；可展开全部，不挤压正文为不可用 |
| Agent Prompt 自动加入 | 光标位置、来源和撤销入口可理解，教师原文保持不变 |
| 教师修改 Agent Prompt | 标记为已编辑；移除 Agent 时文本保留 |
| 从完整页面返回 | 草稿、材料、Core Context 和顺序保持 |
| 创建失败 | 保留全部草稿与材料，允许修正后重试 |
| 创建成功 | 进入既有 Run；快照中的材料与提交时一致 |

## 12. 概念数据语义

本节只约束产品语义，不锁定 TypeScript 类型或实现文件。

```text
TaskAssemblyDraft
  ├─ text
  ├─ materials[]
  │   ├─ AgentReference
  │   ├─ SkillReference
  │   └─ FileReference
  ├─ agentPromptFragments[]
  └─ coreContextDraft

TaskMaterialReference
  ├─ stableId
  ├─ kind: agent | skill | file
  ├─ source
  ├─ displayName
  ├─ selectionOrder
  ├─ availabilityState
  └─ provenance

AgentPromptFragment
  ├─ agentId
  ├─ originalTemplate
  ├─ currentContent / equivalent anchored reference
  ├─ editState: untouched | edited | uncertain
  └─ undoMetadata
```

后续 Feature Spec 必须决定这些语义由哪个 Deep Module 拥有，并通过 Interface 向页面提供命令和 ViewModel；页面不能自行用字符串比较和多个布尔值拼装 Prompt 删除逻辑。

## 13. 权限、安全与真值

- 文件和 ClassIn 空间对象只展示当前教师有权引用的内容；
- 选择时有权限不等于提交时仍有权限，创建 Run 前需重新校验可用性；
- 文件显示名称不能代替稳定 ID；同名资源必须可区分来源；
- 不在 Prompt 文本中嵌入用户不可见的资源内容或权限声明；
- Demo 可使用固定、脱敏、可重置的数据与 Adapter；内部保留 `truthLabel`、来源和 Receipt 证据；
- 遵循 D-109，正常产品页面不出现“模拟 / 仿真”开发标签，也不把未接入能力伪装成生产完成；
- 不把 Agent、Skill 或文件选择写入无治理长期记忆。

## 14. 可访问性与视觉要求

- 使用现有 `WorkspaceComposer`、Design Token、字体、圆角、阴影和 Focus 规则，不新建第二套输入器；
- 任务材料区、加号菜单、两级选择器和快捷条支持完整键盘操作；
- 类型、选中、失败和不可用状态不只依赖颜色；
- 搜索框有可访问名称，列表项可朗读类型、名称和选中状态；
- 移除按钮有完整名称，例如“移除 Agent 孔子”；
- 打开浮层后焦点进入合理首项，关闭后恢复；
- 1440×900 主验收窗口无横向滚动、遮挡、焦点丢失和不可达操作；
- 材料展开后允许页面或输入器按既有规则纵向增长，但正文输入区域必须保持可编辑。

## 15. 产品度量与验证

首版事件用于判断交互是否降低任务装配成本，不把固定 Demo 数据误解释成真实使用频率：

| 事件 | 关键字段 |
|---|---|
| `task_assembly_quick_item_selected` | kind、itemId、position、alreadySelected |
| `task_assembly_menu_opened` | entry、draftHasText、materialCount |
| `task_assembly_picker_searched` | kind、queryLength、resultCount |
| `task_material_added` | kind、source、selectionMethod、materialCount |
| `task_material_removed` | kind、source、promptEditState、undoOffered |
| `task_material_remove_undone` | kind、restoredPrompt |
| `agent_prompt_injected` | agentId、draftWasEmpty、mergeMode |
| `agent_prompt_edited` | agentId |
| `task_assembly_full_page_opened` | destination、materialCount、draftHasText |
| `task_assembly_returned` | destination、draftRestored、materialsRestored |
| `task_creation_attempted` | agentCount、skillCount、fileCount、invalidMaterialCount |

产品评审重点：

1. 教师是否能预判点击 Skill 与 Agent 后的结果；
2. 非空草稿是否在 Agent 注入和移除后保持完整；
3. 多材料时是否仍能流畅编辑任务；
4. 从 AgentIn / 技能市场 / 我的文件往返是否无信息损失；
5. 教师是否理解 Agent 是本次任务引用，而非更换 TeacherIn；
6. 哪些入口被使用、哪些入口造成困惑；不能只用点击量证明产品价值。

## 16. 需求 ID

- `NTA-PRD-001`：只在 `ideal-full` `/teacher/ai-agent/new` 提供本轮任务装配升级。
- `NTA-PRD-002`：TeacherIn 保持统一主 Agent，Agent / Skill / 文件均为可选增强。
- `NTA-PRD-003`：首页常用能力按 5 个 Skill 后接 4 个 Agent 展示。
- `NTA-PRD-004`：5 与 4 是快捷展示数量，不是任务选择上限。
- `NTA-PRD-005`：Skill 与 Agent 通过可见与可访问语义明确区分。
- `NTA-PRD-006`：点击快捷 Skill 加入材料，不自动改写 Prompt。
- `NTA-PRD-007`：点击快捷 Agent 加入材料并按统一规则注入推荐 Prompt。
- `NTA-PRD-008`：加号首版只包含添加文件、Agent、Skill。
- `NTA-PRD-009`：Agent 选择器支持搜索、空结果、多选、去重和“更多 Agent”。
- `NTA-PRD-010`：“更多 Agent”进入 `/teacher/ai-agent/agentin`。
- `NTA-PRD-011`：Skill 选择器支持搜索、空结果、多选、去重和管理入口。
- `NTA-PRD-012`：文件来源只包含本地文件、我的文件和 ClassIn 空间。
- `NTA-PRD-013`：三类来源支持在当前任务中选择多个文件，并保留稳定来源。
- `NTA-PRD-014`：Agent、Skill 和文件统一进入输入框底部工具栏的任务材料区，顺序为加号在前、材料紧随、提交按钮在后。
- `NTA-PRD-015`：Agent、Skill 和文件均不设产品选择数量上限。
- `NTA-PRD-016`：材料很多时可换行、收起和展开，且不产生页面横向滚动。
- `NTA-PRD-017`：同类型、同稳定 ID 的材料不可重复加入。
- `NTA-PRD-018`：空白草稿选择 Agent 时直接填入可编辑推荐 Prompt。
- `NTA-PRD-019`：非空草稿选择 Agent 时保留教师文字，并在其后放入推荐 Prompt。
- `NTA-PRD-020`：连续选择多个 Agent / 任务型 Skill 时，材料引用继续累计，最新自动 Prompt 替换上一个未经编辑的自动 Prompt；教师已编辑内容不被替换。
- `NTA-PRD-021`：自动 Prompt 注入支持安全撤销，不删除后续教师文字。
- `NTA-PRD-022`：移除 Agent 时只自动删除未经教师修改的关联 Prompt。
- `NTA-PRD-023`：已被教师编辑或无法安全判断的 Prompt 文本在移除 Agent 后保留。
- `NTA-PRD-024`：移除材料支持撤销，多 Agent 场景只影响目标 Agent。
- `NTA-PRD-025`：从 AgentIn、技能市场和文件页面返回时恢复同一任务现场。
- `NTA-PRD-026`：Core Context 保持独立，不与文件 / Agent / Skill 标签混合。
- `NTA-PRD-027`：无效、失败或权限变化的材料不能被静默提交或丢弃。
- `NTA-PRD-028`：Run 创建时固化最终文本、材料引用、Prompt 来源和 Core Context。
- `NTA-PRD-029`：创建失败保留全部草稿和材料，允许修正后重试。
- `NTA-PRD-030`：现有四个教学任务快捷按钮不再单独展示，其任务意图由输入器上方的四个常用 Skill 承接。
- `NTA-PRD-031`：正常产品页面遵循 D-109，不显示开发真值标签；内部证据继续保留。
- `NTA-PRD-032`：1440×900 无横向滚动、遮挡、不可达操作或焦点丢失。
- `NTA-PRD-033`：快捷条、菜单、选择器、材料区和移除 / 撤销均可键盘操作。
- `NTA-PRD-034`：`ideal-full` 首页隐藏欢迎说明、常用能力可见标题、Core Context 入口与摘要，但不删除底层上下文能力。
- `NTA-PRD-035`：选择“生成单个课件”或“生成课程方案包”Skill 后，无需手动选择 Core Context 即可创建任务；Run 仍固化演示 ContextSnapshot。
- `NTA-PRD-036`：左右浏览按钮与能力条同轴并轻量覆盖右侧，1440×900 与 1024×640 下均保持舒适间距、无页面横向溢出和不可达操作。
- `NTA-PRD-037`：已选材料区不显示可见标题、数量或分隔线；只保留有充足内边距的标签及其移除操作。
- `NTA-PRD-038`：正常添加、重复选择与移除不在 Composer 下方显示描述性成功消息或文字型 Undo 条；错误、权限、文件不可用与提交阻断信息仍必须显示。
- `NTA-PRD-039`：加号选择器在输入器上方以轻量浮层呈现，一级与二级一次只显示一层，二级具有明确返回入口，并在 1440×900 与 1024×640 内保持可达。
- `NTA-PRD-040`：欢迎区、能力横条与 Composer 形成统一居中内容轴；横条和翻页按钮是一个连续组件，边界、垂直基线与完整标签停靠通过几何测试。

## 17. 验收标准

1. 教师不选择任何 Agent、Skill 或文件，也能按既有规则创建任务；
2. 首页准确展示 5 个 Skill 和 4 个 Agent，顺序与类型清晰；
3. 快捷项与加号选择器使用同一选择状态，不出现重复材料或重复 Prompt；
4. 加号菜单只含添加文件、Agent、Skill，并能通过鼠标和键盘完整使用；
5. 三类文件来源均可完成选择、取消、失败反馈、移除和重试的适用状态；
6. Agent、Skill、文件都能同时存在于任务材料区，数量增加时布局仍可用；
7. 空白、非空、多 Agent / Skill 和重复选择四种 Prompt 场景符合第 9 节；多标签保留但文本区不叠加自动 Prompt；
8. 教师修改 Agent Prompt 后移除 Agent，修改后的文字不丢失；未修改片段可随 Agent 安全移除；
9. 撤销不会覆盖教师在操作之后输入的无关内容；
10. 从 AgentIn、技能市场或我的文件返回后，草稿、材料、顺序与 Core Context 完整恢复；
11. 文件读取失败、权限拒绝或来源失效不会被静默提交；
12. 创建成功后的 Run 输入快照与提交时可见材料一致；创建失败保留现场；
13. 原四个任务快捷按钮不再显示；对应四个 Skill 能进入材料区并带入原任务类型与任务建议，其余二级导航、AgentIn、技能市场、我的文件和 Run 流程无回归；
14. `ideal-full` 首页不出现欢迎说明、常用能力可见标题、Core Context 入口或摘要；选择课件 / 课程方案包 Skill 后创建按钮可直接使用；其他 Experience 的上下文能力无回归；
15. 能力条浏览键同轴覆盖在右侧，欢迎区、能力带与输入区不紧凑聚集；1440×900 和 1024×640 均无页面横向滚动、遮挡、不可达操作或焦点丢失；
16. TypeScript、ESLint、单元测试、适用的浏览器 E2E、可访问性和视觉验收通过。
17. 单个 Agent 选中后，输入器底部工具栏只显示一个清晰标签；标签不与标题、数量、分隔线混杂，输入器下方没有重复成功说明；错误恢复信息仍可见。
18. 加号浮层位于输入器上方；一级只显示三类入口，进入 Agent / Skill / 文件后一次只显示对应二级内容，并可返回一级；层级切换在 Reduced Motion 下无动画。
19. 1440×900 与 1024×640 下，欢迎区不过度放大，能力横条与 Composer 左右边界一致；翻页按钮和标签上下边界误差不超过 1px，向右或向左翻页后不出现被截断的左侧半标签。
20. 单个 Agent / Skill 选中后，材料标签位于加号右侧、提交按钮左侧，与加号垂直中心误差不超过 1px，正文区域不出现材料标签。

## 18. PRD 审阅结论

用户于 2026-09-03 完成 PRD Review，并确认：

1. 首页采用本 PRD 第 6.1 节列出的固定 5 个 Skill 与 4 个 Agent；
2. 任务材料区默认最多展示两行，超出后提供“展开全部 / 收起”；
3. “我的文件”和“ClassIn 空间”均使用独立选择弹窗，页面结构与交互密度参考 Notion 中的腾讯 WorkBuddy 文件选择设计，并使用当前 ClassIn Design System；
4. 不保留输入器下方原有四个教学任务快捷按钮；四个任务意图转化为常用 Skill，统一放在聊天输入器上方。

## 19. 2026-09-03 页面评审调整

用户在实现页面评审中进一步确认：移除首屏解释性文字和“常用 Agent 和 Skill”可见标题；把左右浏览按钮放进能力横条右侧形成轻量遮盖；`ideal-full` 隐藏 Core Context 入口与摘要但保留代码；课件与课程方案包通过自动演示上下文直接创建；整体间距参考 WorkBuddy 的温和、舒适节奏。随后确认已选 Agent 区不应让标题、标签和线条混杂，并要求移除 Composer 下方冗余的成功描述。本调整不扩展到其他 Experience，也不删除 Context Domain、Panel、Snapshot 或 Domain Undo 记录。

除上述修订外，PRD 其余内容全部通过审阅。

## 19. 交付门禁

本 PRD 当前状态为 `REVIEWED_APPROVED`。后续严格按以下顺序推进：

1. 用户已完成 PRD 审阅；
2. `To Spec`：把确认后的需求转成 Feature Spec，明确 Module、Interface、状态机、草稿持久化、导航 Seam、Adapter 与测试契约；
3. `Spec Review`：用户确认 Feature Spec（当前阶段）；
4. `To Tickets`：拆分可验证 Ticket、Write Set、依赖和验收命令；
5. `Ticket Review`：用户确认实施边界；
6. `Implementation`：只按已确认 Ticket 修改代码和测试；
7. `Verify / Record`：完成静态、单测、E2E、可访问性与视觉验收，并写回事实源。

在用户确认 Feature Spec 前，不进入 Tickets 或代码实现。
