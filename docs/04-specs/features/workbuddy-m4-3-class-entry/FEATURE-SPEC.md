---
title: M4.3 ClassIn 站内 WorkBuddy MVP 入口 Feature Spec
status: IMPLEMENTED_READY_FOR_REVIEW
version: v1.3
date: 2026-09-04
source_prd: ./PRODUCT-REQUIREMENTS.md
---

# M4.3 Feature Spec

## 0. D-130 / D-131 shell-preserving content convergence addendum

- `ClassMvpWorkBuddyLayout` 继续解析班级与课程事实并提供 `classin-mvp` Profile，由顶层独立 Route 和 `ClassMvpWorkBuddyShell` 承载；
- 左侧继续由 `ClassMvpWorkBuddyShell` 投影原品牌、导航版式、Launch Context 和 Return Target，不挂载 `AppShell` 或 `AgentSecondaryNav`；
- `classin-mvp.navigationCapabilityIds` 与当前统一 TeacherIn 发布顺序一致：`skills / agentin / files`；可用能力与 `ideal-full` 同源，但 Session Namespace 不合并；
- `AiAgentWorkSurface` 对 `ideal-full` 与 `classin-mvp` 两个 `classin-integrated` Profile 投影同一个 Task Assembly 首页；
- `ClassInWorkBuddyBridge` 为两个 ClassIn Integrated Namespace 提供相同三来源 Task Material Adapter，但 Session 和 Snapshot 仍按 Namespace 隔离；
- `ClassMvpWorkBuddyShell` 继续作为可见组合根，只根据 Profile 更新菜单内容。

下文记录 v1.2 历史架构；与本 Addendum 冲突时以本节为准。

## 1. Boundary

本 Feature 建立独立的 `IdealWorkBuddyExperienceModule` 与 `ClassInMvpWorkBuddyExperienceModule`。共享的 Profile Contract 只提供类型与路径语法；MVP Module 独立拥有 Launch Context 的 ClassIn 事实解析。两个产品 Module 可以复用底层 Surface，但分别拥有 Shell 装配、导航身份、配置、路由与数据空间。

禁止复制任务页面、能力页面、Domain 或 Adapter 契约；禁止让两个 Experience 读取同一 Workspace/Runtime Session Key；禁止只在 UI 隐藏终局历史。

## 2. Experience Profile

```ts
type WorkBuddyExperienceProfileId = 'ideal-full' | 'classin-mvp';

type WorkBuddyExperienceProjection = Readonly<{
  id: WorkBuddyExperienceProfileId;
  basePath: string;
  sessionNamespace: string;
  visibleTaskTypes: readonly WorkBuddyTaskType[];
  visibleCapabilityIds: readonly WorkBuddyCapabilityId[];
  returnTarget: { label: string; to: string } | null;
}>;
```

两个 Product Module 分别创建自己的 Profile；共享 Route parser/path builder 只处理语法。`ClassInMvpWorkBuddyExperienceModule.resolve(classId, courseId, authorizedClasses)` 隐藏 Launch Context 校验和 fail-closed 规则。

- `ideal-full.basePath = /teacher/ai-agent`；
- `classin-mvp.basePath = /teacher/classes/:classId/workbuddy`；
- 两者的任务类型相同；`ideal-full` 保留完整能力，`classin-mvp.visibleCapabilityIds = ['skills', 'tools', 'files']`；
- 两者必须持有独立、不可变的任务与能力配置副本；首版值相等不代表共享配置引用；
- Namespace 至少区分 `ideal-full` 与 `classin-mvp`，不包含入口 classId；
- MVP 后续删减时只改变 MVP Product Module 的 allowlist，不改变终局 Product Module 或底层 Domain。

## 3. Data Space Seam

`WorkBuddyWorkspaceProvider` 接收稳定 `workspaceNamespace`。所有 WorkBuddy 私有存储必须由该 Namespace 派生：

```text
workspace session
conversation runtime and command receipts
teacher-in draft receipts
history mutations / future artifact indexes
adapter idempotency scope
```

Provider 在 Profile 切换时以 Namespace 为 key 重建并从对应存储恢复。相同 Run ID 在另一个 Namespace 不构成可访问证据。ClassIn Domain Store 不进入此隔离层。

## 4. Launch Context

```ts
type WorkBuddyLaunchContext = Readonly<{
  kind: 'class-detail';
  classId: string;
  className: string;
  courseId?: string;
  courseName?: string;
}>;
```

班级名称、课程名称和返回路径必须从当前授权 Class Workspace 事实生成；不接受任意 URL。Launch Context 与 Run ContextSnapshot 分离，只作为当前入口提示和返回依据。

## 5. Route and navigation Interface

Profile Module 提供：`newTaskPath(profile)`、`runPath(profile, runId)`、`capabilityPath(profile, capabilityId)` 和 `parseWorkspacePath(pathname)`。

WorkBuddy 页面只能调用这些构造器，不能硬编码 `/teacher/ai-agent`。终局 AppShell 与 MVP Standalone Shell 分别消费各自 Profile；MVP 中不存在或已隐藏的 section/run 必须重定向到该 Profile 的新任务页。

## 6. UI Projection

### 6.1 Class detail rail

- `AI` 更名为 `AI 应用`，保留现有三个入口和行为，增加“班级成员可用”语义。
- 下方新增独立 `TeacherIn` Section，展示 TeacherIn 身份、`AI 教学搭档 · 仅你可见`、价值说明和“打开 TeacherIn”。
- 两个 Section 分别展开/收起；学生页面无入口。

### 6.2 MVP workspace

- MVP Route 位于 ClassIn `AppShell` 之外，使用独立全屏 `ClassMvpWorkBuddyShell`；进入后不挂载“老师视角主导航”。
- Standalone Shell 的可见页面名为 `TeacherIn`，独立 `TeacherIn 导航` 依次承载“我的任务、技能市场、工具连接、我的文件”，不渲染可见分组标题。
- 左栏“我的任务”链接到 `/new`，只改变显示名称；不得新增任务目录页或改变 `AiAgentWorkSurface` 的新任务内容。历史任务继续由共享 `WorkBuddyTaskBar` 承载。
- Schedules 与 Settings 不在 MVP allowlist；直接访问对应 MVP URL 重定向 `/new`。终局 Profile 与页面保持不变。
- 使用共享 `AiAgentWorkspaceLayout`、`WorkBuddyTaskBar` 与 Work Surface，但不复用终局的产品 Shell 装配。
- 全局“TeacherIn”继续只指向终局 `/teacher/ai-agent`；原 ClassIn 主导航不得新增第二个 TeacherIn 一级入口，也不能被 MVP 重写或高亮。
- 左侧导航、Task Bar、能力页和 Run 内所有链接均停留在 MVP basePath。
- Standalone Shell 持续提供“返回 {className}”命令，包含能力页在内的所有子路由均可返回。
- 页面不显示“阉割版”或内部 Profile 术语。
- `仅你可见`、来源班级和返回命令位于导航之后的同一左栏区块，不能使用沉底布局。

## 7. State and recovery

```text
class_detail --open--> classin-mvp-standalone(namespace=mvp, launch=A)
classin-mvp --switch task/capability--> classin-mvp(same namespace/launch)
classin-mvp --reload--> classin-mvp(restored namespace, route-derived launch)
classin-mvp --return--> class_detail(A)
ideal-full <X> classin-mvp private session data
```

- 从 B 班进入只替换 MVP Launch Context，不切换 MVP Namespace；
- 非法班级或学生访问 fail closed 到教师班级列表/角色主页；
- Storage 不可用时以空的对应 Experience 启动，不回退读取另一个 Namespace；
- Profile 不允许的任务和能力没有菜单、搜索结果或直接 URL 表面。

## 8. Accessibility and responsive contract

- 右栏 Section Header 使用 `aria-expanded`；入口和返回命令有完整名称。
- 导航后焦点进入标记为 `TeacherIn` 的独立主区域；返回后由班级详情页面标题接管。
- 独立页面的导航命名为 `TeacherIn 导航`，原“老师视角主导航”不存在且不会被隐藏后留在可访问树中。
- 1440×900 完整显示双模块；1024×640 右栏可独立滚动，入口、返回和 Task Bar 可达。
- Reduced Motion 不改变信息结构。

## 9. Test contract

1. Module：两个 Profile 路由构造/解析、能力 allowlist、非法 class、跨 Profile URL；
2. Session：Workspace、Conversation Runtime、Receipt 使用不同 Namespace，绝不 fallback；
3. Integration：班级详情双模块、默认进入原新建任务工作台、进入独立 Shell/返回、所有内部链接保持 MVP basePath，且 MVP DOM 无 ClassIn 主导航；
4. Isolation：终局创建/修改任务不投影到 MVP，MVP 数据不投影到终局；
5. E2E/a11y：A/B 班进入、键盘导航、学生不可发现；
6. Visual：班级详情双模块、MVP 全展开页面、1440×900 与 1024×640；
7. Regression：既有终局 WorkBuddy E2E 与完整能力导航保持不变，证明 MVP 裁剪不影响终局。

## 10. Write Set

- 本规格目录、决策账、路线与当前状态；
- `src/app/router/`、`src/app/shell/`、组合根；
- `src/features/class-workspace/`；
- `src/features/ai-agent-workspace/`；
- 对应 Module、Integration、E2E、a11y、Visual tests。

不修改 WorkBuddy Domain 状态机、IM Case、Class Agent 授权语义、真实 Adapter 或 M4.4–M10。
