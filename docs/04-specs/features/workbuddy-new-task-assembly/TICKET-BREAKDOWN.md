---
title: TeacherIn 新任务首页任务装配 Ticket Breakdown
status: IMPLEMENTED_READY_FOR_REVIEW
version: v0.5
date: 2026-09-03
source_spec: ./FEATURE-SPEC.md
decision: D-119, D-120, D-121, D-124, D-125, D-126
---

# TeacherIn 新任务首页任务装配 Tickets

## 1. 执行规则

- 实施顺序：`NTA-01 → NTA-02 → NTA-03 → NTA-04 → NTA-05 → NTA-06 → NTA-07 → NTA-08 → NTA-09 → NTA-10 → NTA-11`；
- 当前文件只供 Ticket Review，用户确认前不得修改 `src/`、`tests/`、`public/` 或运行时资产；
- 每个 Ticket 只修改自己的 Write Set；发现需要越界时停止实施并回到 Feature Spec；
- 每个 Ticket 先运行窄验证，再进入下一个 Ticket；不把全量测试代替范围测试；
- UI 只消费 `TaskAssemblyModule` 的 View 与 Result，不复制 Prompt、去重、Undo 或 Snapshot 规则；
- 不将 AgentIn 卡片改造成“添加到任务”，不扩大 D-116 的静态市场范围；
- `classin-mvp`、`standalone-teacher` 和学生端必须保持不变；
- 页面不显示“模拟 / 仿真”标签，固定 Fixture 的真值只留在内部证据；
- NTA-11 完成并通过最终 Review 前，不声明功能完成。

## 2. Ticket 总表

| Ticket | 纵向交付 | 依赖 | 核心验证 | 状态 |
|---|---|---|---|---|
| NTA-01 | 审批状态与实现追踪骨架 | D-119～D-121、已批准 Spec | PRD / Spec / Ticket / 决策互链 | DONE |
| NTA-02 | TaskAssembly Deep Module | 01 | 去重、Prompt 锚定、编辑保护、Undo、Snapshot | DONE |
| NTA-03 | 三类文件来源 Port 与 Demo Adapters | 02 | 三来源、查询、错误、权限与稳定引用 | DONE |
| NTA-04 | Workspace Session v4 与 Provider Interface | 02 | v3 迁移、Namespace 隔离、草稿恢复、本地文件 stale | DONE |
| NTA-05 | WorkspaceComposer 通用材料 Slot | 01 | 既有 Composer DOM / 键盘行为无回归 | DONE |
| NTA-06 | 常用 5 Skill + 4 Agent、加号和材料区 | 02、04、05 | 任务 Skill 迁移、Agent Prompt、材料两行收起 | DONE |
| NTA-07 | 本地文件与两个独立文件选择 Dialog | 03、04、06 | 原生多选、Dialog 搜索 / 多选 / 失败 / Focus | DONE |
| NTA-08 | TaskAssemblySnapshot 与三类 Run 关联 | 02、04、06、07 | 提交阻断、三类 Run Snapshot、失败保留 | DONE |
| NTA-09 | Integration、Session 与 Profile 回归 | 04–08 | ideal-full 完整链路、其他 Profile 不变 | DONE |
| NTA-10 | E2E、a11y 与 Visual Gate | 09 | 真实浏览器旅程、5 张视觉状态、无溢出 | DONE |
| NTA-11 | Standards / Spec Review 与交付记录 | 01–10 | 范围 Gate、双轴 Review、追踪闭环 | DONE_WITH_REPO_BASELINE_NOTES |
| NTA-12 | 页面复审：上方逐级选择器与最新自动 Prompt | D-125、06 | 层级返回、弹层几何、Prompt 覆盖、视觉基线 | DONE |
| NTA-13 | 页面复审：WorkBuddy 式首页版式与横条对齐 | D-126、12 | 统一内容轴、垂直基线、完整标签停靠 | DONE |

## 3. NTA-01 — 审批状态与实现追踪骨架

### 目标

建立 D-119～D-121、已批准 PRD、已批准 Feature Spec、Tickets 和后续实现证据之间的唯一追踪链。

### Write Set

```text
docs/00-project/DECISION-LEDGER.md
docs/00-project/CURRENT-STATUS-AND-NEXT-PLAN.md
docs/04-specs/features/workbuddy-new-task-assembly/README.md
docs/04-specs/features/workbuddy-new-task-assembly/PRODUCT-REQUIREMENTS.md
docs/04-specs/features/workbuddy-new-task-assembly/FEATURE-SPEC.md
docs/04-specs/features/workbuddy-new-task-assembly/TICKET-BREAKDOWN.md
docs/04-specs/features/workbuddy-new-task-assembly/IMPLEMENTATION-TRACEABILITY.md
```

### Tasks

1. 将用户 Ticket Review 结果写回状态；
2. 创建 Requirement → Spec → Ticket → Implementation → Verification 追踪矩阵；
3. 固定本轮包含、明确不包含和每个 Ticket 的 Write Set；
4. 确认 Ticket Review 前没有 Implementation 文件变化。

### Done when

- D-119～D-121、PRD、Spec、Tickets 和 README 状态一致；
- 33 条 PRD Requirement 均映射到至少一个 Ticket；
- 追踪文件存在且没有提前填写虚假 PASS；
- 文档链接、路径和 Markdown 空白检查通过。

### Narrow verification

```bash
git diff --check
rg -n "NTA-PRD-|NTA-0" docs/04-specs/features/workbuddy-new-task-assembly
```

## 4. NTA-02 — TaskAssembly Deep Module

### 目标

以单一纯 Module Interface 隐藏材料去重、选择顺序、文本差异、Agent Prompt 来源锚定、安全删除、撤销和提交 Snapshot。

### Write Set

```text
src/domain/workbuddy/task-assembly.ts
src/domain/workbuddy/task-assembly.test.ts
```

### Tasks

1. 建立 `TaskAssemblySession`、Command、Transition、View、Undo 和 Snapshot union；
2. 实现 Agent / Skill / File 稳定键去重与插入顺序；
3. 实现空白 / 非空 / 多 Agent Prompt 注入；
4. 实现最长公共前后缀差异与 Fragment 范围平移；
5. 编辑或不确定 Fragment 只移除引用并保留文本；未编辑 Fragment 精确删除；
6. 实现 Add / Remove Undo，保护操作后新增的教师文字；
7. 实现非 Ready 材料 Snapshot 阻断和安全 Clear；
8. 冻结返回数据，不导出可变内部集合。

### Done when

- 页面调用方只需学习 Feature Spec 第 2.2 节的四个动作；
- 测试覆盖 Fragment 前 / 内 / 后 / 跨片段编辑、重复选择和多 Agent；
- 测试证明不使用全文 `replaceAll` 误删教师同名文本；
- Snapshot 不包含文件内容，且只收录 Ready 材料；
- Module 无 React、DOM、Router、Storage 或 Toast 依赖。

### Narrow verification

```bash
npx vitest run src/domain/workbuddy/task-assembly.test.ts
npm run typecheck
```

## 5. NTA-03 — 三类文件来源 Port 与 Demo Adapters

### 目标

为本地文件、我的文件和 ClassIn 空间建立稳定来源引用与可替换 Adapter，不把固定 Fixture 或权限分支写进 Dialog。

### Write Set

```text
src/contracts/workbuddy/task-material-source.ts
src/mocks/adapters/task-material-source.ts
src/mocks/adapters/task-material-source.test.ts
```

### Tasks

1. 定义 `TaskMaterialCatalogPort`、查询、FileReference 和显式结果 union；
2. 建立 My Files、ClassIn Space 两组固定、脱敏、稳定 ID Fixture；
3. 实现标题 / 位置查询且保持原始顺序；
4. 覆盖 loaded、empty、permission_denied、recoverable_failure；
5. 建立本地文件元数据验证器，覆盖 supported、unsupported、too_large、read_error；
6. 不同来源同名文件保持不同稳定引用。

### Done when

- 两个目录 Adapter 满足同一 Port；
- Fixture 不作为可变数组导出；
- 每条内部 Fixture 有真值来源，UI View 不显示开发标签；
- Adapter Contract tests 覆盖三类来源的成功与适用失败；
- 不读取生产 API、真实账号或真实学生数据。

### Narrow verification

```bash
npx vitest run src/mocks/adapters/task-material-source.test.ts
npm run typecheck
```

## 6. NTA-04 — Workspace Session v4 与 Provider Interface

### 目标

让新任务 Assembly 由 Workspace Provider 持有、按 Experience Namespace 持久化，并兼容已有 `taskDraft` 调用方。

### Write Set

```text
src/features/ai-agent-workspace/workbuddy-workspace.ts
src/features/ai-agent-workspace/WorkBuddyWorkspaceContext.tsx
src/features/ai-agent-workspace/workbuddy-workspace-session.ts
src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts
src/app/App.tsx
```

### Tasks

1. Workspace Session v3 升级为 v4，增加 Assembly 与 Snapshot Map；
2. 对 v3 的 `draftGoal` 做确定性迁移；
3. 验证重复材料键、非法状态、Fragment 越界和无效 Undo；
4. 本地文件刷新恢复为 `stale/local_file_reselect`，不序列化 `File` / Base64；
5. `taskDraft.goal/setGoal/clear` 兼容投影到 Assembly；
6. Workspace 对页面公开 `taskAssembly` View 与 Command Interface；
7. 在组合根只向 `ideal-full` 注入本轮目录 Adapter，其他 Profile 行为不变。

### Done when

- v3 Session 可无损迁移已有 Context、Run、Receipt 和 `draftGoal`；
- 不可信 v4 Session fail closed，不部分恢复错误 Prompt；
- ideal-full / classin-mvp / standalone-teacher Namespace 不串数据；
- 刷新与页面往返恢复草稿、材料顺序和 Prompt 来源；
- 现有 Workspace Session 测试全部通过。

### Narrow verification

```bash
npx vitest run src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts
npm run typecheck
```

## 7. NTA-05 — WorkspaceComposer 通用材料 Slot

### 目标

为共享 Composer 增加位于目标 Slot 与 textarea 之间的通用材料 Slot，不让 Design System 理解业务类型。

### Write Set

```text
src/design-system/WorkspaceComposer.tsx
src/design-system/WorkspaceComposer.module.css
src/design-system/WorkspaceComposer.test.tsx
```

### Tasks

1. 增加可选 `materials?: ReactNode`；
2. 固定 DOM 顺序：target → materials → textarea → footer；
3. 保持自动增高、Enter 提交、Shift+Enter、IME、禁用和字数规则；
4. 无 materials 时不增加空容器或样式变化；
5. 添加 Material Slot 的 a11y 与布局测试。

### Done when

- Composer Interface 只新增一个通用可选 Slot；
- 既有 IM、Run、新任务 Composer 测试与 DOM 行为不变；
- Slot 内容换行不会撑出 Composer 水平边界；
- Design System 不导入 WorkBuddy Domain / Feature。

### Narrow verification

```bash
npx vitest run src/design-system/WorkspaceComposer.test.tsx
npm run typecheck
npx eslint src/design-system/WorkspaceComposer.tsx
```

## 8. NTA-06 — 常用能力、加号和任务材料区

### 目标

完成不依赖文件 Dialog 的任务首页核心纵向切片：5 Skill + 4 Agent、加号、Agent / Skill 选择器、材料区、Prompt 和 Undo。

### Write Set

```text
src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
src/features/ai-agent-workspace/AiAgentWorkSurface.module.css
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
src/features/ai-agent-workspace/capability-workspace.ts
tests/integration/workbuddy-new-task-assembly.test.tsx
```

### Tasks

1. 固定前四个任务型 Skill、Word 文档与四个 Agent / Prompt Fixture；
2. 移除原 `.shortcuts` 四按钮和空容器；
3. 实现 Composer 上方快捷横条及 Skill / Agent 类型、选中状态、键盘浏览；
4. 实现加号一级 Menu 与 Agent / Skill 搜索 Popover；
5. “更多 Agent”进入现有 AgentIn；Skill 管理进入技能市场；
6. 投影材料标签、两行收起 / 展开、状态和可达移除；
7. 任务型 Skill 切换任务类型并带入原建议，普通 Skill 不改草稿；
8. 投影 Agent Prompt 追加、安全移除与最新一次 Undo；
9. 保持 Core Context 独立且继续使用既有入口。

### Done when

- 首页顺序严格为 5 Skill → 4 Agent；
- 四个旧快捷按钮不存在，四个任务型 Skill 的任务类型与文本行为保留；
- 重复选择不重复材料或 Prompt；
- Agent Prompt 的空白、非空、多 Agent、编辑后移除和 Undo Integration tests 通过；
- 材料超两行可展开 / 收起，页面无水平溢出；
- AgentIn 页面本身未增加任务选择功能。

### Narrow verification

```bash
npx vitest run tests/integration/workbuddy-new-task-assembly.test.tsx
npm run typecheck
npx eslint src/features/ai-agent-workspace/AiAgentWorkSurface.tsx src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
```

## 9. NTA-07 — 本地文件与两个独立文件选择 Dialog

### 目标

完成三类文件入口：本地原生多选，以及参考 WorkBuddy 结构、使用 ClassIn Design System 的“我的文件”和“ClassIn 空间”独立 Dialog。

### Write Set

```text
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
src/features/ai-agent-workspace/TaskFilePickerDialog.tsx
src/features/ai-agent-workspace/TaskFilePickerDialog.module.css
src/features/ai-agent-workspace/WorkBuddyModalDialog.tsx
tests/integration/workbuddy-new-task-assembly.test.tsx
```

### Tasks

1. 文件子菜单只展示本地文件、我的文件、ClassIn 空间；
2. 本地文件使用 hidden file input + `multiple`，投影 reading / ready / failed / cancel；
3. 为 My Files 与 ClassIn Space 分别打开有独立标题和数据源的居中 Dialog；
4. 实现搜索、列表头、多选、已选择状态、空白、权限拒绝和可恢复失败；
5. Dialog 内选择点击“添加（N）”后才批量进入材料；取消不产生变化；
6. 同名跨来源文件显示来源，不误去重；
7. 实现 Focus Trap、Escape、关闭和触发点焦点恢复；
8. 复用现有 Modal Primitive 的适用能力；若其 Interface 不满足，最小扩展而不复制第二套 Modal。

### Done when

- 两个 Dialog 的结构可对应 Notion WorkBuddy 文件选择截图；
- 正常页面使用 ClassIn Token 且无腾讯品牌或窗口 Shell；
- 本地选择不把文件内容写入 Session Storage；
- 搜索、多选、取消、确认、失败、权限和重复状态测试通过；
- 1440×900 与 1024×640 Footer、关闭按钮和全部选择可达。

### Narrow verification

```bash
npx vitest run tests/integration/workbuddy-new-task-assembly.test.tsx
npm run typecheck
npx eslint src/features/ai-agent-workspace/TaskFilePickerDialog.tsx src/features/ai-agent-workspace/WorkBuddyModalDialog.tsx
```

## 10. NTA-08 — TaskAssemblySnapshot 与三类 Run 关联

### 目标

让课程课件、课程方案包和测验活动三类 Run 都引用提交时的稳定 Assembly Snapshot，并在失败时保留新任务现场。

### Write Set

```text
src/domain/workbuddy/course-production.ts
src/domain/workbuddy/course-production.test.ts
src/domain/workbuddy/course-package.ts
src/domain/workbuddy/course-package.test.ts
src/domain/workbuddy/quiz-activity-creation.ts
src/domain/workbuddy/quiz-activity-creation.test.ts
src/features/ai-agent-workspace/workbuddy-courseware-controller.ts
src/features/ai-agent-workspace/workbuddy-package-controller.ts
src/features/ai-agent-workspace/workbuddy-quiz-activity-controller.ts
src/features/ai-agent-workspace/WorkBuddyWorkspaceContext.tsx
src/features/ai-agent-workspace/workbuddy-workspace-session.ts
src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts
src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
tests/integration/workbuddy-new-task-assembly.test.tsx
```

### Tasks

1. 建立统一 `WorkBuddyTaskStartInput`；
2. 三类 Run 增加 `taskAssemblySnapshotId`；
3. 创建前检查草稿、Core Context、Profile 和全部材料 Ready；
4. 将 Assembly Snapshot 存入 Workspace Map，再创建 Run；
5. 历史 Run 确定性迁移为空材料 v1 Snapshot；
6. task type 变化时重新使用正确报价；
7. 阻断发生在点数预占 / Run ID 之前；
8. 创建失败保留 Assembly，成功后 Clear 新草稿但保留已固化 Snapshot。

### Done when

- 三类 Run 都能从稳定 ID 找到提交时 Snapshot；
- `goal`、Prompt 来源和材料引用与提交时页面一致；
- failed / stale / permission-denied / reading 材料都阻断创建；
- 点数不足、证据不一致或创建失败不清草稿；
- 既有 Run 状态机、Approval、Receipt、Evaluation 和业务写回测试通过。

### Narrow verification

```bash
npx vitest run src/domain/workbuddy/course-production.test.ts src/domain/workbuddy/course-package.test.ts src/domain/workbuddy/quiz-activity-creation.test.ts src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts tests/integration/workbuddy-new-task-assembly.test.tsx
npm run typecheck
```

## 11. NTA-09 — Integration、Session 与 Profile 回归

### 目标

通过公开 Interface、可访问名称和页面行为验证 ideal-full 完整链路，并证明其他 Experience 与既有 Capability 没有被本轮扩展。

### Write Set

```text
tests/integration/workbuddy-new-task-assembly.test.tsx
src/features/ai-agent-workspace/workbuddy-experience-profile.test.ts
src/features/ai-agent-workspace/capability-workspace.test.ts
src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts
```

### Tasks

1. 覆盖默认、重复、搜索空结果、多 Agent、Prompt 编辑、Undo 和材料溢出；
2. 覆盖两个 Dialog、三类文件、失败与权限；
3. 覆盖 AgentIn 往返、刷新恢复与 v3 → v4 迁移；
4. 覆盖三类 Run Snapshot；
5. 断言 `classin-mvp`、`standalone-teacher` 没有本轮快捷条 / 加号 / 材料区；
6. 断言 AgentIn、技能市场、我的文件、隐藏 Tools / Schedules 和 Core Context 行为不变。

### Done when

- Integration 不读取私有 React state 或 Module 私有字段；
- Profile / Capability / Session 范围测试全部通过；
- 测试不依赖任意 sleep 或不稳定动画时间；
- 既有旧入口删除只发生于 ideal-full 页面投影。

### Narrow verification

```bash
npx vitest run tests/integration/workbuddy-new-task-assembly.test.tsx src/features/ai-agent-workspace/workbuddy-experience-profile.test.ts src/features/ai-agent-workspace/capability-workspace.test.ts src/features/ai-agent-workspace/workbuddy-workspace-session.test.ts
npm run typecheck
npm run lint
```

## 12. NTA-10 — E2E、a11y 与 Visual Gate

### 目标

用真实 Chromium 证明核心教师旅程、键盘、Dialog、恢复、视觉密度和无溢出满足 PRD / Spec。

### Write Set

```text
tests/e2e/workbuddy-new-task.spec.ts
tests/visual/workbuddy-new-task.visual.spec.ts
tests/visual/workbuddy-new-task.visual.spec.ts-snapshots/*
tests/visual/workbuddy-shell.visual.spec.ts
tests/visual/workbuddy-shell.visual.spec.ts-snapshots/*
tests/visual/workbuddy-capability-surfaces.visual.spec.ts
tests/visual/workbuddy-capability-surfaces.visual.spec.ts-snapshots/*
```

### Tasks

1. 完成任务型 Skill → Agent → 三类文件 → Core Context → Run 的浏览器旅程；
2. 覆盖非空草稿、Prompt 编辑后移除 Agent 和 Undo；
3. 覆盖 AgentIn 往返与刷新恢复；
4. 覆盖材料超过两行的展开、收起和键盘访问；
5. Axe 覆盖默认、加号、Agent 空结果、两个文件 Dialog、满材料和文件失败；
6. Visual：1440×900 默认 / 满材料 / Dialog，1024×640 默认 / Dialog；
7. 更新因删除四个快捷按钮和新 Composer Slot 必然变化的既有范围基线；
8. 几何断言 Work Surface、快捷条、材料区和 Dialog `scrollWidth <= clientWidth`。

### Done when

- 目标 E2E、Axe 和 Visual 用例稳定通过；
- 截图人工复核与 Notion 参考差异只包含已批准的 ClassIn 适配；
- 发送按钮、Dialog Footer、移除和展开操作在两种视口都可达；
- 不批量更新与本 Feature 无关的视觉基线。

### Narrow verification

```bash
npx playwright test tests/e2e/workbuddy-new-task.spec.ts --project=chromium
npx playwright test tests/visual/workbuddy-new-task.visual.spec.ts --project=chromium
```

## 13. NTA-11 — Standards / Spec Review 与交付记录

### 目标

完成 Standards 与 Spec 双轴 Review、全量工程 Gate、实现追踪和剩余风险记录。

### Write Set

```text
docs/00-project/CURRENT-STATUS-AND-NEXT-PLAN.md
docs/04-specs/features/workbuddy-new-task-assembly/README.md
docs/04-specs/features/workbuddy-new-task-assembly/TICKET-BREAKDOWN.md
docs/04-specs/features/workbuddy-new-task-assembly/IMPLEMENTATION-TRACEABILITY.md
docs/04-specs/features/workbuddy-new-task-assembly/IMPLEMENTATION-REVIEW.md
```

### Tasks

1. Standards Review：Module 深度、依赖方向、Session、Design System、a11y、真值与数据边界；
2. Spec Review：逐项核对 33 条 PRD、Feature Spec 和 11 个 Tickets；
3. 运行 typecheck、lint、全量 Vitest、production build；
4. 运行受影响 E2E / Visual 回归；
5. 区分本轮回归与既有基线失败，不静默修改无关文件；
6. 把 Implementation、测试命令、截图、异常和剩余风险写回追踪矩阵。

### Done when

- Standards / Spec 两轴没有未关闭的硬 Finding；
- `npm run check` 与 `npm run build` 通过，或既有阻断有可复现证据且范围检查全绿；
- 33 条 Requirement 全部有实现与验证证据；
- 不把 Mock 结果宣称为生产接入；
- 用户可从一个文档入口定位最终状态和验收路径。

### Full verification

```bash
npm run check
npm run build
npx playwright test tests/e2e/workbuddy-new-task.spec.ts tests/e2e/workbuddy-shell.spec.ts tests/e2e/workbuddy-capability-surfaces.spec.ts --project=chromium
npx playwright test tests/visual/workbuddy-new-task.visual.spec.ts tests/visual/workbuddy-shell.visual.spec.ts tests/visual/workbuddy-capability-surfaces.visual.spec.ts --project=chromium
```

## 14. NTA-12 — 页面复审：上方逐级选择器与最新自动 Prompt

### 目标

把输入器加号改为上方轻量逐级选择器，并在多能力引用时只保留最新自动 Prompt，同时完整保留教师文字和全部材料标签。

### Write Set

```text
src/domain/workbuddy/task-assembly.ts
src/domain/workbuddy/task-assembly.test.ts
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
tests/integration/workbuddy-task-assembly.test.tsx
tests/e2e/workbuddy-task-assembly.spec.ts
tests/visual/workbuddy-task-assembly.visual.spec.ts
tests/visual/workbuddy-task-assembly.visual.spec.ts-snapshots/*
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/workbuddy-new-task-assembly/*
```

### Done when

- 一级只展示文件、Agent、Skill，二级一次只显示一种内容并可返回；
- 浮层底边位于加号上方，1440×900 和 1024×640 不越界；
- 连续选择 Skill、Skill、Agent 后保留三个材料引用，文本只显示最后一个自动 Prompt；
- 教师自行输入或编辑的文字不被自动替换；
- Reduced Motion、键盘焦点、Axe 和视觉基线通过。

## 15. NTA-13 — 页面复审：WorkBuddy 式首页版式与横条对齐

### 目标

参考 WorkBuddy 重排欢迎区、能力横条和 Composer 的位置与尺寸，并消除横条翻页按钮错位及左侧半标签。

### Write Set

```text
src/features/ai-agent-workspace/AiAgentWorkSurface.tsx
src/features/ai-agent-workspace/AiAgentWorkSurface.module.css
src/features/ai-agent-workspace/TaskAssemblyComposer.tsx
src/features/ai-agent-workspace/TaskAssemblyComposer.module.css
tests/e2e/workbuddy-task-assembly.spec.ts
tests/visual/workbuddy-task-assembly.visual.spec.ts-snapshots/*
docs/00-project/DECISION-LEDGER.md
docs/04-specs/features/workbuddy-new-task-assembly/*
```

### Done when

- 欢迎区缩小、居中并与 56rem 内容轴形成稳定层级；
- 能力 Region 与 Composer 左右边界误差不超过 1px；
- 能力横条与按钮组上下边界误差不超过 1px；
- 翻页停在完整标签起点，向左返回归零；
- 1440×900、1024×640 E2E 与视觉基线通过。

## 16. Requirement coverage

| PRD Requirement | Tickets |
|---|---|
| NTA-PRD-001～005 | 04、06、09、10 |
| NTA-PRD-006～011 | 02、06、09、10 |
| NTA-PRD-012～017 | 02、03、06、07、09、10 |
| NTA-PRD-018～024 | 02、04、06、09、10 |
| NTA-PRD-025～029 | 04、08、09、10 |
| NTA-PRD-030 | 06、09、10 |
| NTA-PRD-031 | 03、06、07、11 |
| NTA-PRD-032～033 | 05～07、09～11 |
| NTA-PRD-034～038 | 06、09～11 |
| NTA-PRD-039 | 12 |
| NTA-PRD-040 | 13 |

## 17. Ticket review gate

本 Ticket Breakdown 已于 2026-09-03 通过用户审阅并完成 NTA-01 → NTA-13 实施。范围内功能、浏览器与视觉 Gate 已通过；全仓既有 Lint 与无关视觉基线债务单独记录于 [实现 Review](./IMPLEMENTATION-REVIEW.md)，未被静默修改。当前状态为 `IMPLEMENTED_READY_FOR_REVIEW`。
