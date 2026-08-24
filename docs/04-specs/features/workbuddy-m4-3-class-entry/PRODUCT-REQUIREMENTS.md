---
title: M4.3 ClassIn 站内 WorkBuddy MVP 入口 PRD
status: APPROVED_FOR_IMPLEMENTATION
version: v1.2
date: 2026-08-24
decision: D-098
---

# M4.3 ClassIn 站内 WorkBuddy MVP 入口 PRD

## 1. 背景与目标

M4.2 已完成终局 WorkBuddy 的一级导航体验与代表性任务闭环。M4.3 在班级课程详情增加首发 MVP 的真实入口：老师从具体教学现场打开“我的教学助理”，进入独立的 WorkBuddy MVP。初始工程先完成终局方案搬迁，再根据本轮验收形成第一版 MVP 导航裁剪。

本阶段同时保留 Demo 中的终局入口和 MVP 入口，用于对照验证；真实 MVP 发布配置可隐藏终局一级入口。两个入口都代表“老师自己的 WorkBuddy”，但属于两个独立产品 Experience，不共享任务数据，避免未来 MVP 删除能力后仍暴露终局历史。

## 2. 用户 Job

> 我在班级课程详情处理教学工作时，希望直接打开自己的教学助理；它能理解我来自哪个班级，也能在授权范围内处理其他班级任务。完成工作后，我可以回到原来的班级课程现场。

## 3. 产品模型

```text
Teacher 1 → 1 WorkBuddy product relationship
WorkBuddy Core → IdealWorkBuddy Product Module + ClassInMvpWorkBuddy Product Module
Experience 1 → 1 isolated Workspace Data Space
Workspace Data Space 1 → N Runs / Drafts / Artifacts / Receipts
Run 1 → 1 stable ContextSnapshot
```

- `ideal-full` 与 `classin-mvp` 分别拥有独立 Product Module、导航身份、能力配置和数据空间；只复用更低层的 Design System、Domain、通用 Surface、Adapter Interface 和业务领域事实。
- 两个 Experience 继续复用相同任务闭环；`classin-mvp` 第一版导航只保留“我的任务、技能市场、工具连接、我的文件”，裁剪只修改 MVP Profile。
- MVP 删除某类任务后，该类终局历史在 MVP 中完全隐藏，不提供只读入口；由于数据空间隔离，不依赖 UI 过滤防止泄漏。
- 每个 Experience 内，一位老师的 WorkBuddy 可访问老师已授权的全部班级。班级入口只提供 Launch Context，不构成班级数据孤岛。
- ClassIn 已创建的课程、测验草稿、作业等仍由 ClassIn Domain 拥有，是两个 Experience 都可能读取的业务事实；这不等于共享 WorkBuddy 私有历史。

## 4. 班级详情双模块

| 模块 | 所有者与范围 | 作用 |
| --- | --- | --- |
| AI 应用 | 当前班级；老师授权；班级成员可用 | 展示当前班级已授权的 Agent 与应用入口，保持现有行为 |
| 我的教学助理 | 当前老师；仅老师可见 | 打开 `classin-mvp` WorkBuddy；不属于班级共享 Agent |

“我的教学助理”必须是独立 Section，显示 `WorkBuddy`、`仅你可见` 和“打开 WorkBuddy”。它不能混入“AI 应用”列表，也不能使用“授权给班级”或“班级成员可用”的文案。

## 5. 核心旅程

```text
老师进入 A 班课程详情
  → 区分“AI 应用”与“我的教学助理”
  → 打开独立、全屏的 MVP WorkBuddy 页面
  → 使用页面自己的 WorkBuddy 左侧导航、任务工作台和能力页
  → A 班成为本次 Launch Context 的软提示
  → 可创建 A 班或其他已授权班级任务
  → 返回 A 班课程详情
```

从 B 班再次进入时，打开同一个 `classin-mvp` 数据空间；MVP 内 A 班历史保留，B 班只替换入口提示和返回目标。终局 `ideal-full` 的历史始终不会出现在 MVP 中。

## 6. Experience 与页面要求

- Demo 同时保留 `/teacher/ai-agent/*` 终局入口和班级详情 MVP 入口。
- 两套 Experience 独立装配各自的 WorkBuddy Shell、配置和数据空间；底层通用 Surface 与设计系统可以复用，但产品 Module 不互相代理。
- `classin-mvp` 使用独立全屏页面，不挂载 ClassIn 原主导航，也不向原主导航新增“我的教学助理”等一级入口；页面可见名称统一为 `WorkBuddy`。
- MVP 页内导航承载“我的任务、技能市场、工具连接、我的文件”，不显示分组说明文案；“定时任务、设置”在 MVP 隐藏，但终局继续保留。
- “我的任务”只替换原“新建任务”的左栏文案，仍进入既有 `/new` 任务工作台；历史任务、已打开任务与新增任务继续由既有 Task Bar 和任务选择器承载。
- `仅你可见`、来源班级和返回命令位于左栏导航下方，不固定沉底。
- 两套 Experience 使用不同 Route Base、Profile ID 和 Session Namespace。
- `classin-mvp` 保留既有任务闭环以及 Skills、Tools、Files；Schedules、Settings 只从 MVP 展示面隐藏，不删除终局实现。
- MVP 页面提供“返回 {班级名称}”命令；返回不清空 MVP Session。
- 后续能力裁剪必须通过 Profile 投影完成，不删除终局 Module，也不让隐藏任务可通过 URL 或历史搜索进入。
- 学生页面、学生导航和班级共享 Agent 列表不得出现教师 WorkBuddy 入口。

## 7. 上下文与写回

- Launch Context 记录来源 `classId/className`，可包含当前 `courseId/courseName` 和受控页面选择。
- Launch Context 只参与意图和检索优先级，不自动创建 Run，不覆盖已确认的 ContextSnapshot。
- 老师明确选择其他班级时，MVP 可以访问其授权范围内目标；歧义通过对话澄清。
- 发送、创建、修改或发布前，Approval 必须展示最终班级、课程、单元、对象版本和影响，不能用入口班级替代领域校验。
- 返回目标由本次 Launch Portal 决定，不随当前打开任务的 Context 改变。

## 8. 数据隔离

- `ideal-full` 与 `classin-mvp` 使用独立的 Workspace Session、Conversation Runtime、任务历史、草稿、Artifact 索引和 WorkBuddy Receipt 缓存。
- 两个 Profile 即使出现相同 Run ID，也不能从另一个 Namespace 恢复或打开。
- MVP Route 必须按 MVP Profile 过滤任务类型和能力；非法或已删除类型 fail closed 到 MVP 新任务页。
- Adapter 契约与实现可以复用，但幂等记录必须包含 Experience Namespace，避免相同演示 ID 跨 Experience 命中旧 Receipt。
- ClassIn Domain 写回是共享业务事实：例如 MVP 创建的测验草稿会出现在班级课程详情；终局 WorkBuddy 可在获得授权后读取该 ClassIn 对象，但不会获得 MVP Run 历史。

## 9. 需求 ID

- `M43-PRD-001`：班级详情保留“AI 应用”并新增独立“我的教学助理”。
- `M43-PRD-002`：AI 应用继续表达班级授权、成员可用 Agent，不改变既有行为。
- `M43-PRD-003`：MVP WorkBuddy 入口仅教师可见，明确为教师私密教学助理。
- `M43-PRD-004`：点击入口打开独立全屏 WorkBuddy，任务闭环沿用已搬迁的终局实现。
- `M43-PRD-005`：Demo 同时保留终局一级入口与 MVP 入口；发布配置可独立决定是否显示终局入口。
- `M43-PRD-006`：两个 Experience 共享实现但使用独立 Profile、Route 和 Data Space。
- `M43-PRD-007`：终局历史、草稿、Run、Artifact 和 Receipt 不进入 MVP；MVP 数据也不进入终局。
- `M43-PRD-008`：未来 MVP 删除任务类型后，该类型及其终局历史在 MVP 完全隐藏并不可由 URL 访问。
- `M43-PRD-009`：MVP 内 A/B 班入口共享同一 MVP Workspace；重入不改写已有 Run ContextSnapshot。
- `M43-PRD-010`：Launch Context 只提供来源班级/课程优先级，不构成能力或数据边界。
- `M43-PRD-011`：业务写回前显示实际目标并经 Action、Approval、领域校验和 Receipt。
- `M43-PRD-012`：返回命令回到原班级课程详情，且不清空 MVP Session。
- `M43-PRD-013`：非法 Launch Context、Profile 或跨 Namespace Run 失败关闭。
- `M43-PRD-014`：1440×900 与紧凑视口无溢出；键盘和屏幕阅读器可完成进入、导航与返回。
- `M43-PRD-015`：模拟结果继续使用统一真值标签，不宣称生产接入。
- `M43-PRD-016`：MVP 使用独立全屏 WorkBuddy Shell；原 ClassIn 主导航不挂载、不新增 MVP 入口，返回命令稳定回到来源班级。
- `M43-PRD-017`：左栏“我的任务”只是原“新建任务”的显示名称调整，目标仍为 `/new`，页面内容和任务流程不变。
- `M43-PRD-018`：MVP 左栏只显示“我的任务、技能市场、工具连接、我的文件”，隐藏分组文案、定时任务和设置；入口上下文紧跟导航。

## 10. 范围外

本期不实际删减 MVP 能力，不接真实全业务 Context Resolver/权限服务，不建设跨设备同步，不启动 M4.4–M10。MVP 历史迁移、终局/MVP 数据合并和隐藏任务只读查看明确不做。

## 11. 验收标准

- 班级详情能清楚区分共享 AI 应用与私密 WorkBuddy，并打开完整 MVP 工作区。
- Demo 中终局与 MVP 入口都可使用，视觉与操作规范一致。
- MVP 页面只显示其自身 WorkBuddy 导航，不显示 ClassIn“老师视角主导航”或新增的“我的教学助理”一级菜单。
- 在终局修改/创建的任务不会出现在 MVP；在 MVP 创建的任务不会出现在终局。
- 从 A 班进入 MVP、返回后仍回 A 班；从 B 班进入仍看到 MVP 自己的历史，不看到终局历史。
- 学生侧没有 WorkBuddy 入口。
- Module、Integration、E2E、a11y、视觉、静态检查和 production build 通过。
