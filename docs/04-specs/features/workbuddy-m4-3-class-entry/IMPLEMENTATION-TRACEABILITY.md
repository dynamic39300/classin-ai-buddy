---
title: M4.3 Implementation Traceability
status: IMPLEMENTED_READY_FOR_REVIEW
version: v1.2
date: 2026-09-04
---

# M4.3 Implementation Traceability

| Requirement | Implementation evidence | Verification evidence |
| --- | --- | --- |
| D-130 保留独立 Shell、更新导航内容 | `TeacherRoutes.tsx`、`ClassMvpWorkBuddyLayout.tsx`、`ClassMvpWorkBuddyShell.tsx`、`classin-mvp-workbuddy-experience.ts` | class entry E2E + 1440/1024 Visual |
| D-131 同源“我的任务”正文 | `AiAgentWorkSurface.tsx`、`AiAgentWorkspaceLayout.tsx`、`TaskAssemblyComposer.tsx`、`App.tsx` | Task Assembly E2E + 1440/1024 Visual |
| D-130 保留 Route / Context / Namespace | class-scoped path builders、`resolveClassMvpWorkBuddyExperience`、`workspaceNamespace=classin-mvp` | Profile/Session unit + URL assertions |

以下矩阵为 v1.1 历史实现证据；其中独立 Shell 与旧导航条目由上表替代。

| Requirement | Implementation evidence | Verification evidence |
| --- | --- | --- |
| M43-PRD-001～003 双模块与教师私密入口 | `TeacherClassWorkspace.tsx`、`TeacherClassWorkspace.module.css` | `teacher-class-workspace.test.tsx`、`class-workspace.spec.ts`、班级详情视觉基线 |
| M43-PRD-004～006 双 Product Module 与任务闭环复用 | `ideal-workbuddy-experience.ts`、`classin-mvp-workbuddy-experience.ts`、两套 Route Layout、底层共享 `AiAgentWorkspaceLayout`/Surfaces | Product Module tests、独立 MVP Shell E2E、终局 WorkBuddy 回归视觉 |
| M43-PRD-007～008 数据隔离与未来完全隐藏 | `workspaceNamespace`、三类 namespaced session、按 Profile 重建 Provider | Workspace Session 与 Conversation Runtime isolation tests；真实浏览器终局/MVP 草稿往返 |
| M43-PRD-009～010 跨班 MVP 与 Launch Context | MVP Namespace 不含 classId；Profile 保存受校验 class/course 与返回目标 | Profile Module tests、A 班进入/返回 E2E；B 班沿同一 Namespace 的结构契约 |
| M43-PRD-011 写回证据链不变 | 复用现有 Action/Approval/Receipt Domain；Quiz Adapter 增加 Experience idempotency scope | Adapter scope test；既有测验完整 E2E 回归通过 |
| M43-PRD-012 返回原班级 | `ClassMvpWorkBuddyShell` 的持久 Profile return command | MVP E2E、1440×900/1024×640 视觉 |
| M43-PRD-013 fail closed | Route wrapper 校验教师可见 Class；Profile parser 拒绝非法 Route；Namespace 不 fallback | Profile/Session Module tests |
| M43-PRD-014～015 可访问性、响应式与真值 | 复用共享 Shell/Composer/Surface；入口使用语义按钮与展开状态 | axe E2E、关键视口视觉、131 项全量 E2E |
| M43-PRD-016 独立全屏 Shell 与原导航隔离 | `TeacherRoutes.tsx` 将 MVP Route 移出 `AppShell`；`ClassMvpWorkBuddyShell.tsx` 独立投影品牌、能力与返回 | E2E 断言无“老师视角主导航”、`TeacherIn 导航` 可操作；双视口视觉 |
| M43-PRD-017～018 我的任务命名与首轮裁剪 | MVP `visibleCapabilityIds`、Standalone Shell 导航及中部入口上下文 | E2E 断言“我的任务”仍打开原新建任务页、四个保留入口连续排列、Schedules/Settings 与分组文案不可见；双视口视觉 |

实现遵循一个共享 WorkBuddy Core、两个独立 Product Module、两个配置和两个数据空间的 Seam。没有复制底层 Surface 或 Domain 状态机，也没有让任一 Product Module 代理另一个入口。
