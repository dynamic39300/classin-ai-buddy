---
title: WorkBuddy 测验 Agent Run 统一性审计
status: IMPLEMENTED
version: v1.0
date: 2026-08-24
decision: D-094,D-095
---

# WorkBuddy 测验 Agent Run 统一性审计

## 1. 基准范围

本次以已经验收的“生成单个课件”和“生成课程方案包”Run 为基准，对照测验 Run 的操作流程、状态、页面结构、交互命令和代码所有权。统一标准来自 `ConversationRunSurface`、`PackageConversationRunSurface`、`CourseProductionModule`、`CoursePackageModule`、共享 `WorkspaceComposer` 及仓库前端/工程规范。

## 2. 统一标准

| 维度 | 已验收标准 | 测验对齐结果 |
| --- | --- | --- |
| Run Shell | 紧凑 Header；标题、状态、真值；上下文/产出/辅助区命令稳定 | 复用标准结构与样式，不再复制第二套 Header/Inspector Shell |
| 时间线 | 系统步骤自动推进；只在真实教师决策点停下；首屏只有一个当前下一步 | 结构确认、试卷审阅、活动参数、写回审批为四个教师检查点 |
| Artifact | 生成后先进入待审阅；后续业务动作不得绕过 Artifact 确认 | 新增 `awaiting_paper_review` 与稳定 `paperReview` 证据 |
| 辅助区 | 单一辅助区；上下文/产出 Tab；Artifact 到达后按需或按当前检查点打开 | 试卷生成后自动打开产出；确认后收起并转到活动参数 |
| Composer | 全阶段固定可达，不与时间线争夺滚动容器 | 继续使用共享 `WorkspaceComposer` |
| 写回 | Artifact 已确认后才能形成 ProposedAction；Approval、Adapter 校验、Receipt 独立 | `proposeDraft` 必须验证当前 Artifact 的 `paperReview` |
| 恢复 | 每个状态有唯一允许命令与恢复路径；刷新按稳定 Run 恢复 | Session boundary 校验 review 引用、状态与命令组合 |
| 页面职责 | 页面只投影 ViewModel 和发送命令；业务顺序由 Domain Module 拥有 | 页面不能通过直接显示参数卡绕过试卷确认 Gate |

## 3. 发现与修正

### A-01：Artifact 与活动参数同时出现

旧流程在 Artifact 生成后由体验计时器自动执行 `openActivityParameters`，导致“查看试卷”只是可选链接，而活动参数立即成为更大的视觉焦点。它把有依赖关系的两步误表达成并行操作。

修正：生成完成后停在 `awaiting_paper_review`。主时间线显示“请先审阅试卷”，右侧自动打开完整试卷；教师执行“确认试卷内容，继续设置活动”后，Domain 记录绑定 Artifact ID/version 的审阅证据并进入 `awaiting_activity_parameters`。

### A-02：测验复制 Agent Run 外壳样式

旧测验样式重复定义 Header、主区、时间线、Composer 和 Inspector 的布局规则，容易与课件/方案包继续漂移。

修正：测验直接复用 `ConversationRunSurface.module.css` 的标准 Shell 类，只保留测验卡片、进度和试卷阅读器的业务样式。

### A-03：审阅只存在于文案，没有领域证据

旧 `artifact_ready` 只有 `open-activity-parameters`，没有“谁在何时确认了哪个版本”的稳定状态，`proposeDraft` 也无法证明教师审阅过当前试卷。

修正：新增 `QuizPaperReview`，绑定 `artifactRef/reviewedBy/reviewedAt`；活动参数与 ProposedAction 只能在该证据匹配当前 Artifact 时产生。

## 4. 明确不改变

- 不在 WorkBuddy 内增加完整试题编辑器；课程详情仍承担草稿二次编辑与正式发布。
- 不改变固定、脱敏、可重置的模拟题库和 Adapter。
- 不增加真实模型、真实流式 Runtime 或真实 ClassIn API。
