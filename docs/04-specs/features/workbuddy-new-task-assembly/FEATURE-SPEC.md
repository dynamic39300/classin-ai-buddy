---
title: TeacherIn 新任务首页任务装配 Feature Spec
status: IMPLEMENTED_READY_FOR_REVIEW
version: v0.6
date: 2026-09-03
source_prd: ./PRODUCT-REQUIREMENTS.md
decision: D-119, D-120, D-121, D-124, D-125, D-126
experience_profile: ideal-full
change_note: v0.5 记录 WorkBuddy 参考下的居中内容轴、欢迎区缩放与能力横条完整停靠规则
---

# TeacherIn 新任务首页任务装配 Feature Spec

## 1. Boundary

本 Feature 在教师端 `ideal-full` TeacherIn 新任务页增加 Agent、Skill 和文件的统一任务装配能力。Feature 负责固定常用项、材料选择、去重、排序、文件状态、Agent Prompt 来源追踪、安全移除、撤销、草稿恢复和提交快照；页面只投影 ViewModel 并发送 Command。

本 Feature 不拥有 Core Context、AgentIn 市场、技能市场、文件原始业务对象、Agent Runtime 或后续 Run 状态机。它通过稳定引用消费这些能力，不把文件名、Agent 名或 Skill 名拼成无来源文本。

### 1.1 In scope

- `ideal-full` 的 `/teacher/ai-agent/new`；
- 5 个常用 Skill、4 个常用 Agent；
- 移除原输入器下方四个任务快捷按钮，把其任务意图迁为前四个常用 Skill；
- 输入器加号菜单：添加文件、Agent、Skill；
- Agent / Skill 搜索短选择器；
- 本地文件、我的文件、ClassIn 空间三类文件来源；
- “我的文件”和“ClassIn 空间”独立选择 Dialog；
- 输入器底部工具栏统一任务材料区；
- 多材料、两行收起、展开和移除；Domain 继续保留 Undo Transition，但 `ideal-full` 本轮不投影文字型 Undo 条；
- Agent 推荐 Prompt 的来源锚定、编辑识别和安全删除；
- 完整页面往返及刷新后的草稿恢复；
- 创建 Run 时固化 `TaskAssemblySnapshot`；
- Module、Integration、E2E、a11y 和 Visual 验收。

### 1.2 Out of scope

- `classin-mvp`、`standalone-teacher` 和学生端；
- AgentIn 卡片直接添加、Agent DIY、收藏、授权和发布；
- Skill 安装、启用 / 停用和版本升级；
- 真实上传、云盘、ClassIn 空间、生产权限或内容解析接口；
- 模型、模式、连接器、MCP 和内部多 Agent 拓扑；
- 改写 Core Context、任务 Run、Approval、Receipt 或 Evaluation 的既有状态机；
- 新建全局 Analytics Adapter；PRD 事件保留为后续产品数据契约，本 Demo 通过 Module 返回的领域结果与测试验证行为。

## 2. Module and dependency direction

```text
app / WorkBuddyWorkspaceProvider
  → ai-agent-workspace NewTask page
    → task-assembly Module
      → pure text reconciliation + material state + undo
      → TaskMaterialCatalogPort
        ├─ BrowserLocalFileAdapter
        ├─ DemoMyFilesAdapter
        └─ DemoClassInSpaceAdapter
    → WorkspaceComposer footer tools（plus → material lane → submit）

task-assembly Module
  → no React / DOM / router / toast

AgentIn / Skill market / Files pages
  → navigation only
  → no import of task-assembly Implementation
```

### 2.1 Module placement

```text
src/domain/workbuddy/task-assembly.ts
src/domain/workbuddy/task-assembly.test.ts
src/contracts/workbuddy/task-material-source.ts
src/mocks/adapters/task-material-source.ts
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
src/features/ai-agent-workspace/TaskFilePickerDialog.tsx
src/features/ai-agent-workspace/TaskFilePickerDialog.module.css
src/features/ai-agent-workspace/WorkBuddyModalDialog.tsx
```

`task-assembly` 位于 Domain：其复杂度来自材料不变量、Prompt 来源与撤销语义，不依赖当前页面。Agent / Skill 固定目录和三类 Demo 文件记录可以留在 Feature / Mock 层，经稳定引用进入 Domain。

### 2.2 Deep Module

删除 `TaskAssemblyModule` 后，Prompt 删除保护、去重、材料顺序、Undo、会话校验和 Snapshot 规则会重新散落到页面、Workspace Provider 和各 Run 创建器，因此该 Module 具备实际 Depth 与 Locality。

外部 Interface 保持为四个纯动作：

```ts
type TaskAssemblyModule = Readonly<{
  create(initial?: TaskAssemblySession): TaskAssemblySession;
  dispatch(session: TaskAssemblySession, command: TaskAssemblyCommand): TaskAssemblyTransition;
  project(session: TaskAssemblySession): TaskAssemblyView;
  createSnapshot(session: TaskAssemblySession, input: SnapshotInput): TaskAssemblySnapshotResult;
}>;

const taskAssemblyModule: TaskAssemblyModule;
```

Workspace Provider 持有 `TaskAssemblySession`，并用 `transition.session` 完成 React 更新；Module 自身不持有可变状态。页面与测试只通过这个 Interface 操作。文本差异计算、Prompt 锚点移动、去重键、Undo 记录和会话迁移都隐藏在 Implementation 内。

## 3. Domain model

### 3.1 Stable references

```ts
type TaskMaterialReference =
  | Readonly<{
      kind: 'agent';
      id: string;
      title: string;
      avatarAsset: string | null;
      source: 'agentin';
      recommendedPrompt: string;
    }>
  | Readonly<{
      kind: 'skill';
      id: string;
      title: string;
      description: string;
      source: 'official' | 'installed';
      taskIntent: TaskSkillIntent | null;
    }>
  | Readonly<{
      kind: 'file';
      id: string;
      title: string;
      source: 'local' | 'my-files' | 'classin-space';
      mimeType: string;
      sizeBytes: number | null;
      version: string | null;
      locationLabel: string;
    }>;

type TaskSkillIntent = Readonly<{
  taskType: WorkBuddyTaskType;
  suggestedGoal: string;
}>;

type AgentReference = Extract<TaskMaterialReference, { kind: 'agent' }>;
type SkillReference = Extract<TaskMaterialReference, { kind: 'skill' }>;
type FileReference = Extract<TaskMaterialReference, { kind: 'file' }>;
```

去重键固定为 `${kind}:${source}:${id}`。不同来源的同名文件不重复合并；相同稳定引用不允许出现第二次。

### 3.2 Material state

```ts
type TaskMaterialState =
  | Readonly<{ status: 'ready' }>
  | Readonly<{ status: 'reading'; progress: number | null }>
  | Readonly<{ status: 'failed'; reason: 'unsupported' | 'read_error' | 'too_large' }>
  | Readonly<{ status: 'permission_denied' }>
  | Readonly<{ status: 'stale'; reason: 'local_file_reselect' | 'source_changed' }>
  | Readonly<{ status: 'cancelled' }>;

type SelectedTaskMaterial = Readonly<{
  reference: TaskMaterialReference;
  state: TaskMaterialState;
  selectionOrder: number;
}>;
```

不使用 `isReady/isFailed/isStale` 等可矛盾布尔组合。只有 `ready` 材料可以进入提交 Snapshot。

### 3.3 Prompt provenance

```ts
type AgentPromptFragment = Readonly<{
  id: string;
  agentId: string;
  originalTemplate: string;
  range: Readonly<{ start: number; end: number }>;
  editState: 'untouched' | 'edited' | 'uncertain';
}>;
```

`range` 是当前草稿中的半开区间 `[start, end)`，不是页面 DOM Selection。它由 Module 随文本编辑移动或降级；页面不得直接修改。

### 3.4 Session and snapshot

```ts
type TaskAssemblyUndoEntry = Readonly<{
  id: string;
  operation: 'add-material' | 'remove-material';
  targetKey: string;
  createdOrder: number;
  recoveryPayload: unknown; // 只由 Module 校验与解释，页面不得读取
}>;

type TaskAssemblySession = Readonly<{
  version: 1;
  text: string;
  caret: number;
  materials: readonly SelectedTaskMaterial[];
  promptFragments: readonly AgentPromptFragment[];
  expanded: boolean;
  undoEntries: readonly TaskAssemblyUndoEntry[];
}>;

type TaskAssemblySnapshot = Readonly<{
  id: string;
  version: 'task-assembly-v1';
  createdAt: string;
  goal: string;
  materials: readonly TaskMaterialReference[];
  agentPromptProvenance: readonly Readonly<{
    agentId: string;
    originalTemplate: string;
    finalText: string;
    editState: 'untouched' | 'edited' | 'uncertain';
  }>[];
}>;

type SnapshotInput = Readonly<{
  id: string;
  createdAt: string;
}>;

type TaskAssemblySnapshotResult =
  | Readonly<{ ok: true; snapshot: TaskAssemblySnapshot }>
  | Readonly<{
      ok: false;
      reason: 'empty_goal' | 'material_not_ready' | 'invalid_provenance';
      materialKey: string | null;
    }>;
```

Snapshot 不保存本地浏览器 `File` 对象或文件内容，只保存稳定、可审计的元数据引用。Run 继续引用独立的 `ContextSnapshot`；两者不能互相替代。

## 4. Command Interface

```ts
type TaskAssemblyCommand =
  | Readonly<{ type: 'replace-text'; value: string; caret: number }>
  | Readonly<{ type: 'select-agent'; agent: AgentReference }>
  | Readonly<{ type: 'select-skill'; skill: SkillReference }>
  | Readonly<{ type: 'add-file'; file: FileReference; state: TaskMaterialState }>
  | Readonly<{ type: 'update-file-state'; key: string; state: TaskMaterialState }>
  | Readonly<{ type: 'remove-material'; key: string }>
  | Readonly<{ type: 'undo'; undoId: string }>
  | Readonly<{ type: 'set-expanded'; expanded: boolean }>
  | Readonly<{ type: 'clear' }>;

type TaskAssemblyResult =
  | Readonly<{ outcome: 'changed'; undoId: string | null; effect: TaskAssemblyEffect }>
  | Readonly<{ outcome: 'unchanged'; reason: 'duplicate' | 'missing' | 'undo_expired' }>
  | Readonly<{ outcome: 'blocked'; reason: 'invalid_command' | 'unsafe_session' }>;

type TaskAssemblyTransition = Readonly<{
  session: TaskAssemblySession;
  result: TaskAssemblyResult;
}>;

type TaskAssemblyEffect =
  | Readonly<{ kind: 'material-added'; key: string; promptChanged: boolean }>
  | Readonly<{ kind: 'material-removed'; key: string; promptPreserved: boolean }>
  | Readonly<{ kind: 'text-changed' }>
  | Readonly<{ kind: 'file-state-changed'; key: string }>
  | Readonly<{ kind: 'undo-applied'; key: string }>
  | Readonly<{ kind: 'layout-changed' }>
  | Readonly<{ kind: 'cleared' }>;
```

### 4.1 Command invariants

- `dispatch` 同步、纯函数且确定性；不访问 DOM、Storage 或异步文件源；
- `select-agent`、`select-skill` 和 `add-file` 在同一去重键已存在时返回 `duplicate`；
- `replace-text` 的 `caret` 必须在 `0..value.length`；非法命令不修改当前状态；
- `remove-material` 只影响目标材料及其明确关联 Prompt；
- `clear` 清空草稿、材料、Prompt 来源和 Undo，不清空 Core Context；
- `create` 校验并冻结恢复的 Session；转换结果不泄漏可变内部数组；
- `createSnapshot` 只在文本有效、材料全部 Ready 且来源关系可验证时成功。

## 5. Text reconciliation and Agent Prompt contract

### 5.1 Selecting an Agent

```text
empty text
  → prompt = recommendedPrompt
  → fragment.range = full prompt

non-empty text
  → remove the previous untouched automatic Agent / task-Skill prompt
  → preserve teacher-authored and edited text
  → append separator "\n"
  → append recommendedPrompt
  → fragment.range = appended prompt only
```

- 同一 Agent 已选择时不重复注入；
- 多 Agent / Skill 的材料引用按选择顺序保留，但自动 Prompt 只保留最新一段；
- 旧自动 Prompt 只有在仍可识别且未经教师编辑时才被替换；无法安全识别的文字按教师文字保留；
- 最新选择为 Agent 时只为该 Agent 建立 `AgentPromptFragment`；最新选择为任务型 Skill 时清除旧 Agent Fragment，但不删除 Agent 材料引用；
- 自动注入返回 `undoId`；Undo 等价于对目标 Agent 执行安全移除，不覆盖之后新增的教师文字；
- 推荐 Prompt 保持普通可编辑文本，不使用不可编辑占位符。

### 5.2 Reconciling text edits

`replace-text` 使用前后文本的最长公共前缀与最长公共后缀计算最小变化区间：

1. 变化完全位于某 Prompt 片段之前：平移其 `range`；
2. 变化完全位于某 Prompt 片段之后：片段不变；
3. 变化与片段相交：更新可确定的区间并将其标为 `edited`；
4. 一次变化跨越多个片段、删除边界分隔或无法唯一归属：受影响片段标为 `uncertain`；
5. 教师在所有 Prompt 片段外输入的文本不生成伪 Fragment。

该算法必须隐藏在 Module Implementation，并通过 Interface 行为测试。页面不得比较字符串模板来判断教师是否编辑。

### 5.3 Removing an Agent

- `untouched`：移除材料，并精确删除其锚定 Prompt 与由该注入动作拥有的一个相邻换行；
- `edited` 或 `uncertain`：只移除材料，保留现有文本；
- 删除后重新计算其余 Fragment 范围；
- 若关联 Fragment 缺失，fail safe 为只移除材料；
- 不允许对全文执行 `replaceAll(originalTemplate, '')`。

### 5.4 Undo

- 每次添加 / 移除材料继续生成独立 `undoId`，供 Domain 恢复与未来 Surface 使用；`ideal-full` 当前不在 Composer 下方投影文字型 Undo 条；
- Undo 记录包含目标稳定键、原顺序、Prompt 来源及安全恢复策略；
- 若教师在操作后修改无关文本，Undo 仍只恢复 / 移除目标引用；
- 若恢复原 Prompt 会覆盖教师编辑，保留教师文字并只恢复 Agent 引用；
- 页面往返后 Undo 记录随 `TaskAssemblySession` 保留；Run 创建或显式 Clear 后全部过期。

## 6. Skill contract and task-intent migration

### 6.1 Fixed common Skills

| id | label | taskIntent |
|---|---|---|
| `skill-single-courseware` | 生成单个课件 | `single-courseware` + 原快捷入口建议文本 |
| `skill-course-package` | 生成课程方案包 | `course-package` + 原快捷入口建议文本 |
| `skill-quiz-activity` | 生成测验 | `quiz-activity-creation` + 当前集成版建议文本 |
| `skill-class-insight` | 分析班级学情 | `single-courseware` + 原学情分析建议文本 |
| `skill-word-document` | Word 文档 | `null` |

前四项承担原快捷按钮的任务意图；页面不再渲染 `.shortcuts` 区域。第五项只是普通 Skill。

固定 `suggestedGoal` 保持当前集成版快捷入口的行为：

| id | suggestedGoal |
|---|---|
| `skill-single-courseware` | 为高一（3）班生成一份函数单调性智能课件，包含概念讲解、例题和课堂练习 |
| `skill-course-package` | 从函数单调性课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包 |
| `skill-quiz-activity` | 为高二物理 3 班当前单元生成一份动量守恒诊断测验，并创建为教学活动草稿 |
| `skill-class-insight` | 分析高一（3）班最近一次作业，归纳共性问题并给出教学建议 |

### 6.2 Task Skill selection

- 所有 Skill 都进入任务材料区；
- `taskIntent = null` 的普通 Skill 不改草稿、不改 `taskType`；
- 选择任务型 Skill 时，Workspace 接收其 `taskType`；
- 若草稿为空，填入 `suggestedGoal`；若草稿包含旧的未经编辑自动 Prompt，先替换旧 Prompt；教师文字保留，并在其后放入新的 `suggestedGoal`；
- 任务型 Skill 建议属于教师可编辑任务草稿，但不使用 Agent Prompt 的自动删除语义；移除 Skill 不删除任何草稿文字；
- 再选择另一个任务型 Skill 可以更新 `taskType` 并替换旧的未经编辑自动 Prompt，但不删除既有教师文字；材料标签继续累计；
- Profile 不允许目标 `taskType` 时，该 Skill 不出现在常用条或选择器中。

### 6.3 Fixed common Agents and Prompt templates

| Agent | recommendedPrompt |
|---|---|
| 每日名言 | 请结合当前课程主题，推荐一句适合学生的每日名言，并解释其含义与课堂使用方式。 |
| 成语溯源与应用专家 | 请结合当前课程内容，选择一个相关成语，说明出处、含义，并设计一个适合学生的应用练习。 |
| 地理百科大全 | 请围绕当前教学主题补充准确的地理背景、关键概念和适合学生理解的案例。 |
| 孔子 | 请从孔子及儒家思想的角度解读当前主题，并给出适合课堂讨论的问题。 |

这些 Prompt 是固定 Demo Fixture，不代表线上 AgentIn 已配置相同 Prompt。其来源在内部标记为 `design-fixture-d120`，不得写成 `ONLINE_FACT`。

## 7. File source Seam and Adapters

### 7.1 Port

```ts
type TaskMaterialCatalogPort = Readonly<{
  list(input: Readonly<{
    source: 'my-files' | 'classin-space';
    query: string;
  }>): Promise<TaskFileCatalogResult>;
}>;

type TaskFileCatalogResult =
  | Readonly<{ outcome: 'loaded'; items: readonly FileReference[] }>
  | Readonly<{ outcome: 'permission_denied' }>
  | Readonly<{ outcome: 'recoverable_failure'; message: string }>;
```

`DemoMyFilesAdapter` 与 `DemoClassInSpaceAdapter` 都满足该 Port，因此它是一个真实 Seam。两者使用固定、脱敏、可重置 Fixture；未来生产 Adapter 可替换，而 Dialog 不改变调用方式。

### 7.2 Local file Adapter

本地文件由浏览器 `<input type="file" multiple>` 承担独立 Adapter 角色：

- `accept` 不假定只允许单一格式；实际支持格式清单在 Mock 校验器内固定；
- 选择后先以 `reading` 加入，再确定性转成 `ready` 或 `failed`；
- 当前 SPA 会话可以持有非序列化的 `File` Handle，但它不进入 Domain Session；
- 页面刷新恢复时，本地文件元数据保留但状态变为 `stale/local_file_reselect`，要求重新选择或移除；
- 不把文件内容或 Base64 写入 `sessionStorage`。

### 7.3 Independent file Dialogs

“我的文件”和“ClassIn 空间”分别打开独立居中 Dialog：

```text
Dialog
  ├─ 标题 + 关闭
  ├─ 搜索框
  ├─ 表格 / 列表头
  │   ├─ 选择框
  │   ├─ 名称
  │   ├─ 所有者 / 位置
  │   ├─ 最近更新
  │   └─ 大小 / 类型
  ├─ loading / empty / error / permission state
  └─ 取消 + 添加（N）
```

- 布局、遮罩、搜索、复选、多选和 Footer 结构参考 Notion 中腾讯 WorkBuddy 文件选择截图；
- 颜色、字体、间距、圆角、Focus 与按钮使用当前 ClassIn Design System；
- Dialog 内临时勾选不等于任务材料，点击“添加（N）”后才批量 Dispatch；
- 关闭 / 取消不修改材料；
- 同一来源、同一文件已在材料区时，列表显示已选择且不能重复添加；
- Dialog 关闭后焦点回到触发源。

## 8. View Interface

```ts
type TaskMaterialView = Readonly<{
  key: string;
  kind: 'agent' | 'skill' | 'file';
  title: string;
  sourceLabel: string;
  status: TaskMaterialState['status'];
  statusLabel: string;
  canRemove: boolean;
  canRetry: boolean;
}>;

type TaskAssemblyBlockingIssue = Readonly<{
  reason: 'material_not_ready' | 'permission_denied' | 'stale_reference';
  materialKey: string;
  message: string;
}>;

type TaskAssemblyView = Readonly<{
  text: string;
  caret: number;
  materials: readonly TaskMaterialView[];
  expanded: boolean;
  canSubmitMaterials: boolean;
  blockingIssue: TaskAssemblyBlockingIssue | null;
  latestUndo: Readonly<{ id: string; label: string }> | null;
}>;
```

“两行”是布局判断，Domain 不读取像素。Feature 页面使用实际容器 ResizeObserver 判断是否溢出两行，并在收起态通过 CSS 与测量结果投影隐藏数量；材料拥有关系和选择数量不随收起变化。

页面不得把收起理解为 `materials.slice(...)` 后丢弃其余材料，也不得以 DOM 是否存在判断提交内容。

## 9. UI projection

### 9.1 Page layout

```text
Welcome header（不显示解释性 Lead）
Common capability strip: 5 Skills → 4 Agents（无可见标题）
WorkspaceComposer
  ├─ textarea
  └─ footer
      ├─ plus menu
      ├─ material lane（有材料时，紧随 plus）
      └─ submit
Blocking feedback（仅错误、权限与不可提交状态）
```

原输入器下方四个 `.shortcuts` 按钮全部移除，不留空白容器。

### 9.2 WorkspaceComposer Interface change

设计系统增加通用、可选 Slot，而不理解 Agent / Skill / File：

```ts
type WorkspaceComposerProps = Readonly<{
  // existing props...
  materials?: ReactNode;
}>;
```

`materials` 通用 Slot 继续固定渲染在 textarea 之前、现有 `target` 之后，既有 IM / Run Composer 未传该属性时 DOM 与视觉保持不变。D-128 后，`ideal-full` 的 Task Assembly 不再使用该顶部 Slot，而是把同一材料 View 投影在 `tools` 内的加号之后；不删除通用 Interface，也不通过 `target` 冒充材料区。

### 9.3 Common capability strip

- 位于 Composer 上方；
- 与 Composer 共用 56rem 最大宽度和完全一致的左右边界；
- 固定顺序为第 6.1 节 5 个 Skill，再接 Agent：每日名言、成语溯源与应用专家、地理百科大全、孔子；
- Skill 与 Agent 有不同图标和文本类型提示；
- `aria-pressed` 表达已选；重复点击不反选、不重复注入，而是提示已选择；移除只能从材料标签执行；
- 宽度不足时在条内横向滚动，并提供左右浏览按钮；页面本身不横向滚动；
- 横条和左右浏览按钮使用同一个两列 Grid；按钮组以负外边距和 Surface 渐变轻量覆盖横条右侧，但自身上下边界与横条误差不超过 1px；
- 翻页按约 72% 可视宽度寻找下一停靠点，并落在可达能力按钮的 `offsetLeft`；向左返回最终归零，禁止停在会使左侧首项被截断的任意像素位置；
- 页面不投影可见的“常用 Agent 和 Skill”标题，但 Section 保留同名 `aria-label`；
- 无个性化、最近使用或线上推荐声明。

### 9.4 Plus menu and pickers

- 加号在输入器上方开启轻量一级浮层，只显示添加文件、Agent、Skill；
- 文件项进入三来源二级视图；Agent / Skill 进入带搜索的二级视图；一级和二级不同时呈现；
- 二级视图顶部提供“返回添加任务材料”，回到一级时清空搜索词；
- 鼠标点击与键盘 Enter / Space 都可开启；Escape 关闭整个浮层并把焦点还给加号；
- 选择 Agent / Skill 后关闭二级 Popover，一级 Menu 同步关闭，焦点回到加号；
- Agent 底部“更多 Agent”导航至 `/teacher/ai-agent/agentin`；Skill 底部进入现有技能市场；
- 页面跳转前 Workspace Provider 已保存 Assembly Session；返回 `/new` 后恢复。

### 9.5 Material lane

- 仅 `materials.length > 0` 时出现；Section 保留“任务材料”可访问名称，但不投影可见标题与数量；
- Material Lane 位于 Composer 底部工具栏，顺序固定为加号在左、标签紧随其后、提交按钮在最右；Prompt 正文上方不再投影标签；
- Material Lane 不使用分隔线；加号、标签与提交按钮沿同一工具栏轴线对齐，并保留 `space-2xs` 间距；
- 标签按选择顺序显示；Agent、Skill、三类文件均有类型 / 来源语义；
- 默认两行，超出后显示“展开全部（N）”；展开后显示“收起”；
- `reading` 显示读取中并可取消；失败、权限拒绝、失效显示原因和重试 / 移除；
- 移除按钮始终可由键盘和触摸到达，不以 Hover 作为唯一入口；
- 正常选择、重复选择、移除或 Agent Prompt 注入不在 Composer 下方显示成功说明；Domain Undo 记录仍生成，但本轮不投影文字型 Undo 状态；
- 文件格式错误、权限拒绝、来源不可用与提交阻断继续使用简短 `role=status` / `role=alert` 信息。

### 9.6 Core Context

- `ideal-full` 新任务首页不投影 Core Context 按钮、摘要或 Panel；布局层同样不投影任务栏的上下文 Toggle；
- 首次进入若 Context 为 `needs_attention`，依次应用固定演示建议并确认；内部创建条件仍以 `contextView.status === 'confirmed'` 为准，不绕过 ContextSnapshot；
- Core Context Domain、Panel、按钮实现与其他 Experience 的既有入口继续保留，`classin-mvp` 仍可显式选择与确认；
- 它不进入任务材料区，也不由 `TaskAssemblyModule.clear` 清除；
- 创建任务条件是：原有 Context / Profile 条件通过、草稿非空、所有被提交材料均 `ready`。

## 10. Navigation and session contract

### 10.1 Workspace session

`WorkBuddyWorkspaceSession` 从 v3 升级到 v4，并增加：

```ts
taskAssembly: TaskAssemblySession;
taskAssemblySnapshotsById: Readonly<Record<string, TaskAssemblySnapshot>>;
```

- v3 允许确定性迁移为 v4：`draftGoal` 进入空材料 Assembly，其他已有字段不变；
- 无法验证的 v4 Assembly 使整个 Workspace Session fail closed，不部分恢复不可信 Prompt 范围；
- `workspaceNamespace` 继续隔离三套 Experience；本 Feature 只在 `ideal-full` 渲染，但迁移不得破坏其他 Profile 的现有 Session；
- 保存时不序列化本地 `File` 对象；恢复本地文件引用时改为 `stale`；
- `taskDraft.goal` 的兼容 Interface 在迁移期投影 `taskAssembly.text`，避免一次性破坏全部 Run 创建调用方。

### 10.2 Navigation state

- 当前 Capability 页面回到新任务的 `NewTaskNavigationState` 继续支持既有 Intent；
- 新的任务装配不依赖把完整材料塞进 `location.state`；稳定草稿由 Workspace Session 拥有；
- AgentIn 仍是浏览市场，本轮不把其卡片改成“添加到任务”；“更多 Agent”跳转后，教师通过浏览器返回或新任务导航返回原草稿；
- “我的文件”和“ClassIn 空间”选择发生在独立 Dialog，不借完整页面导航完成选择。

## 11. Task creation and Run snapshot contract

### 11.1 Start request

新任务页面不再分别把裸 `goal` 交给 Run 创建器，改为先生成统一输入：

```ts
type WorkBuddyTaskStartInput = Readonly<{
  taskType: WorkBuddyTaskType;
  goal: string;
  contextSnapshotId: string;
  taskAssemblySnapshot: TaskAssemblySnapshot;
}>;
```

`taskAssemblySnapshot.goal` 必须与顶层 `goal` 一致。Snapshot 中只包含 `ready` 材料；存在非 Ready 材料时不能创建 Snapshot。

### 11.2 Run linkage

- `SingleCoursewareRun`、`CoursePackageRun`、`QuizActivityCreationRun` 增加 `taskAssemblySnapshotId`；
- Workspace Session 的 `taskAssemblySnapshotsById` 保存 Snapshot，和 `snapshotsById` 的 Core Context Snapshot 正交；
- 历史 Run 恢复时必须同时找到两类 Snapshot；旧 Run 没有该字段时按版本迁移到“无材料、goal 为原 Run goal”的 v1 Snapshot；
- Run 页面首版不新增材料 Inspector，但技术证据和后续能力可以通过稳定 ID 读取；
- 创建失败保留 Assembly；创建成功后清空新任务 Assembly，但不删除已固化 Snapshot。

### 11.3 Admission and failure

- `taskAdmission.start` 的报价仍由 `taskType` 决定，不按材料数量改价；
- 点数不足、证据不一致或 Run 创建失败时，材料、草稿、Prompt 来源和 Core Context 均保持；
- 若选择任务型 Skill 改变 `taskType`，创建前必须使用新的任务类型重新获取报价；
- 非 Ready 材料的阻断优先于创建器调用，不产生预占或 Run ID。

## 12. State transitions

### 12.1 Material lifecycle

```text
not_selected
  ├─ select Agent / Skill / cloud file → ready
  └─ select local file → reading
                           ├─ parse ok → ready
                           ├─ unsupported / error → failed
                           └─ cancel → cancelled

ready
  ├─ permission changes → permission_denied / stale
  └─ remove → removed_undoable
               └─ undo → previous state and order
```

### 12.2 Prompt lifecycle

```text
Agent selected
  → untouched
      ├─ edit intersects range → edited
      ├─ ambiguous cross-range edit → uncertain
      ├─ select another Agent / task Skill → replace anchored text
      └─ remove Agent → delete anchored text

edited / uncertain
  └─ remove Agent → preserve text, remove reference only
```

### 12.3 Picker lifecycle

```text
closed
  → plus menu above composer
      ├─ Agent view ↔ back → search / empty / select → closed
      ├─ Skill view ↔ back → search / empty / select → closed
      └─ file sources view ↔ back
          ├─ local → native picker → closed
          ├─ my-files → dialog loading / loaded / empty / error → confirm / cancel
          └─ classin-space → dialog loading / loaded / empty / error → confirm / cancel
```

## 13. Accessibility contract

- 快捷条使用有名称的 Region / Group；每项朗读类型、名称与已选状态；
- 加号使用 `aria-haspopup="dialog"`；浮层具有随当前层级变化的可访问名称，一级菜单项和二级返回按钮均可键盘操作；
- Agent / Skill 搜索输入有显式名称，结果数变化用 `aria-live="polite"`；
- 文件选择使用语义 Dialog、标题引用、Modal Focus Trap、Escape 关闭和触发点焦点恢复；
- 文件列表使用可访问表格或等价 Grid，复选框名称包含文件名；
- 材料区有名称；移除按钮名称包含类型和标题；状态变化可朗读但不抢焦点；
- 展开 / 收起按钮表达 `aria-expanded` 和控制目标；
- 任务输入 textarea 与既有 Enter / Shift+Enter / IME 行为不变；
- Reduced Motion 下不使用横条滚动动画或标签位移动画；
- Axe 在默认、菜单、Agent 空结果、文件 Dialog、材料溢出和失败状态无 serious / critical 问题。

## 14. Responsive and visual contract

- 主验收：1440×900；补充：1024×640；
- `ideal-full` 主内容最大宽度为 56rem；欢迎区使用 standard Avatar、1.75rem 标题并整体居中，页面顶部留白使用 `clamp(4.5rem, 11vh, 6.5rem)`；
- 选择浮层从加号锚点向上打开，底边与输入器工具栏保留 `space-sm` 间距；一级宽度约 300px，二级约 344px，结果列表独立滚动，不能越出目标视口；
- 欢迎区、能力横条与 Composer 使用既有间距 Token 建立分段留白；移除说明文案后不得把三个区域紧密堆叠；
- 快捷条只在自身容器横向滚动，浏览器页面与 Work Surface 不出现水平滚动；
- Composer 底部材料区默认两行，正文 textarea 至少保留一行可编辑高度；单行材料标签中心与加号中心误差不超过 1px；
- Dialog 在 1440×900 使用接近参考图的大尺寸居中面板；在 1024×640 内缩并让列表主体独立纵向滚动，Footer 始终可达；
- 不复制腾讯品牌、Shell、积分、模型选择、运营元素或系统窗口装饰；
- 复用 `tokens.css` 与现有 Composer；Feature CSS 只允许语义化局部变量；
- 不使用截图作为页面背景，不添加参考图之外的渐变 Hero 或玻璃态。

## 15. Test contract

### 15.1 Domain Module tests

1. Agent / Skill / File 稳定键去重并保持选择顺序；
2. 空与非空草稿选择 Agent 的 Prompt 注入；
3. 多材料引用保留、最新自动 Prompt 替换、教师文字保留和最新 Agent Fragment；
4. Fragment 前、内、后以及跨 Fragment 编辑的范围平移与状态；
5. 未编辑、已编辑、uncertain Prompt 的安全移除；
6. Remove / Undo 不覆盖之后新增的教师文字；
7. 任务型 Skill 的任务意图不使用 Agent 删除语义；
8. 普通 Skill 不修改文本；
9. 文件状态转换和非 Ready Snapshot 阻断；
10. Session export / restore、非法范围 fail closed 和本地文件 stale 恢复；
11. Snapshot 保留 ready 材料与 Prompt 来源，不包含浏览器 File 内容；
12. Clear 清 Assembly 但不触碰外部 Core Context。

### 15.2 Adapter contract tests

1. My Files / ClassIn Space 返回稳定、脱敏、不可变列表；
2. 查询匹配标题和位置，不改变 Fixture 原顺序；
3. loaded / empty / permission_denied / recoverable_failure；
4. 不同来源的同名文件保留不同稳定 ID；
5. 本地文件 supported / unsupported / read_error 状态。

### 15.3 Integration tests

1. 仅 `ideal-full` 渲染 5 Skill + 4 Agent 和统一加号；
2. 原四个快捷任务按钮不存在；前四个 Skill 保留任务类型与建议文本；
3. Agent / Skill 选择器搜索、空结果、多选、去重与管理跳转；
4. 两个独立文件 Dialog 的打开、搜索、多选、取消和确认；
5. 材料两行收起、展开、移除、失败与 Undo；
6. Agent / 任务型 Skill Prompt 最新覆盖、教师文字保留、编辑后保留和未编辑时移除；
7. AgentIn 往返和刷新恢复草稿；
8. 非 Ready 文件阻断提交，创建失败保留现场；
9. 三类 Run 创建都固化 Assembly Snapshot；
10. `ideal-full` 隐藏 Core Context 入口并自动确认固定演示上下文；`classin-mvp` 的显式 Context Panel、任务报价、AgentIn、技能市场、文件页和 Run 无回归；
11. `classin-mvp`、`standalone-teacher` 不出现本轮 UI。

### 15.6 Review adjustment tests

1. `ideal-full` 不显示欢迎说明、常用能力可见标题、Core Context 入口与摘要；
2. 课件和课程方案包 Skill 选中后，无需上下文操作即可启用“创建任务”；
3. `classin-mvp` 仍可打开 Context Panel、选择 TeacherIn 资源并冻结版本；
4. 浏览键与横条同轴、覆盖横条右侧且能驱动 `scrollLeft`；标题到能力条、能力条到 Composer 的几何留白达到验收阈值；
5. 1440×900 与 1024×640 视觉基线均无聚集、遮挡或横向溢出。
6. 单个 Agent 选择态无可见材料标题、数量、分隔线、成功说明或文字型 Undo 条；标签与正文之间保持独立留白，错误状态仍可见。
7. 一级浮层位于输入器上方且只含三个入口；进入 Skill / Agent / 文件后一次只投影一个二级视图，可返回一级；Reduced Motion 下层级动画关闭。
8. 连续选择 Skill、Skill、Agent 后保留全部材料标签，文本区只保留最新 Agent 自动 Prompt；教师已有文字继续保留。
9. 单个材料选择态下，加号与材料标签垂直中心误差不超过 1px；标签位于加号右侧、提交按钮左侧，且三者无重叠。
9. 欢迎区整体居中；能力 Region 与 Composer Frame 左右边界误差不超过 1px，横条与按钮组上下边界误差不超过 1px；翻页后 `scrollLeft` 与某一完整标签起点误差不超过 1px。

### 15.4 Session and route tests

1. Workspace Session v3 → v4 确定性迁移；
2. 三套 Namespace 不串草稿；
3. 非法 Fragment range、重复材料键或非法状态使 Session fail closed；
4. 旧 Run 获得空材料兼容 Snapshot；
5. `/teacher/ai-agent/agentin` 返回 `/teacher/ai-agent/new` 后 Assembly 保持；
6. Capability `location.state` 的既有 Skill / Context Intent 兼容。

### 15.5 E2E / a11y / visual

1. 教师进入新任务页，选择任务型 Skill、Agent、本地 / 我的文件 / ClassIn 空间材料并创建任务；
2. 非空草稿选择 Agent 后教师原文不丢失；连续选择多个 Agent / Skill 时不叠加自动 Prompt；编辑 Prompt 再移除 Agent，文字保留；
3. 材料超两行时收起 / 展开和键盘路径；
4. 两类文件 Dialog 截图与 Notion 参考结构对照；
5. 浏览 AgentIn 后返回，草稿和材料仍在；
6. 默认、加号、Agent 空结果、文件 Dialog、满材料、文件失败六类 Axe Gate；
7. 1440×900 默认 / 满材料 / Dialog 三张 Visual，1024×640 默认 / Dialog 两张 Visual；
8. 所有目标视口 `scrollWidth <= clientWidth`，Composer、Dialog Footer 和发送按钮可达。

## 16. Requirement traceability

| PRD | Spec |
|---|---|
| 001–005 | Boundary、固定目录、Profile Gate、UI 9.3 |
| 006–011 | Skill / Agent Contract、Picker 9.4 |
| 012–017 | File Seam、Material State、Material Lane |
| 018–024 | Text Reconciliation、Prompt Lifecycle、Undo |
| 025–029 | Session、Navigation、Task Start / Snapshot |
| 030 | Skill Task-intent Migration、移除 `.shortcuts` |
| 031 | Adapter Fixture 内部证据与页面真值分离 |
| 032–033 | Accessibility、Responsive、Visual/Test Gate |

## 17. Write Set

进入 Tickets 后只允许从以下候选集合拆分精确 Write Set；当前 Spec 不授权修改：

```text
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/workbuddy-new-task-assembly/*

src/contracts/workbuddy/task-material-source.ts
src/domain/workbuddy/task-assembly.ts
src/domain/workbuddy/task-assembly.test.ts
src/mocks/adapters/task-material-source.ts
src/mocks/adapters/task-material-source.test.ts

src/app/App.tsx

src/design-system/WorkspaceComposer.tsx
src/design-system/WorkspaceComposer.module.css
src/design-system/WorkspaceComposer.test.tsx

src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
src/features/ai-agent-workspace/AiAgentWorkSurface.module.css
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
src/features/ai-agent-workspace/TaskFilePickerDialog.tsx
src/features/ai-agent-workspace/workbuddy-workspace.ts
src/features/ai-agent-workspace/WorkBuddyWorkspaceContext.tsx
src/features/ai-agent-workspace/workbuddy-workspace-session.ts
src/features/ai-agent-workspace/capability-workspace.ts

src/domain/workbuddy/course-production.ts
src/domain/workbuddy/course-package.ts
src/domain/workbuddy/quiz-activity-creation.ts
src/features/ai-agent-workspace/workbuddy-courseware-controller.ts
src/features/ai-agent-workspace/workbuddy-package-controller.ts
src/features/ai-agent-workspace/workbuddy-quiz-activity-controller.ts

tests/e2e/workbuddy-new-task.spec.ts
tests/integration/workbuddy-new-task-assembly.test.tsx
tests/visual/workbuddy-new-task.visual.spec.ts
tests/visual/workbuddy-new-task.visual.spec.ts-snapshots/*
tests/visual/workbuddy-shell.visual.spec.ts
tests/visual/workbuddy-shell.visual.spec.ts-snapshots/*
tests/visual/workbuddy-capability-surfaces.visual.spec.ts
tests/visual/workbuddy-capability-surfaces.visual.spec.ts-snapshots/*
```

若 Tickets 发现必须修改列表外文件，先回到 Spec 记录原因、依赖和验证范围，不直接扩大 Implementation。

## 18. Spec review gate

本 Feature Spec 已于 2026-09-03 通过用户审阅，状态为 `REVIEWED_APPROVED`。当前进入 `To Tickets`：

- 允许创建并审阅 `TICKET-BREAKDOWN.md`；
- 不修改 `src/`、`tests/`、`public/` 或运行时资产；
- 不把候选类型名视为已经存在的代码；
- Ticket Review 完成前不进入 Implementation。

Tickets 必须对 Session v4、Domain Module、文件 Adapter、Composer Slot、Run Snapshot、UI/E2E/Visual 分别建立精确 Write Set、依赖和验证命令。
