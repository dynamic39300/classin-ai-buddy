---
title: WorkBuddy V1 组件、字段与状态规格
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
---

# WorkBuddy V1 组件、字段与状态规格

## 1. 组件设计约束

- 页面只组合组件 Interface，不直接读取业务 API 或 Skill/Tool 原始参数；
- 每个对象组件同时表达 `identity + state + source + primary action`；
- 真实业务事实、教师确认、AI 推断、Domain Knowledge 和 Mock 真值不得只靠颜色区分；
- Compact 列表与 Comfortable 内容面分别使用，不让所有信息卡片化；
- 组件均覆盖 rest、hover、focus-visible、pressed、selected、disabled、loading、error。

## 2. Shell 与导航组件

### 2.1 `ClassInAppShell`

| 输入 | 内容 |
|---|---|
| actor | 教师显示名、头像、当前视角 |
| organization | 当前组织、成员身份、切换能力 |
| primaryRoute | 当前一级菜单 |
| notificationSummary | 全局通知与等待动作摘要 |
| collapsed | 展开/收起 |

事件：`navigatePrimary`、`toggleCollapsed`、`openAccountMenu`、`requestOrganizationSwitch`。

### 2.2 `AgentSecondaryNav`

这是对标 NineClaw 的独立二级导航面板。字段：新建任务、历史 Section、Skills、Tools、内容、定时任务、文件、设置、内部滚动位置。Section 标题只分组，所有目的地保持同一导航层级，不渲染第三级菜单。

### 2.3 `TaskHistoryRow`

| 字段 | 规则 |
|---|---|
| title | 单行省略；完整标题 Tooltip/可访问名 |
| relativeTime | 默认右侧显示 |
| state | 等待教师、执行中、失败、完成等文字/图标 |
| pinned | 独立标记，不与 selected 混用 |
| menu | Hover、Focus、selected 可见；始终键盘可达 |
| truth | 仅必要时显示模拟/未来标签 |

事件：`openRun`、`rename`、`togglePin`、`delete`。

## 3. 新任务组件

### 3.1 `GoalComposer`

字段：text、attachments、resourceRefs、taskType、contextProposal、selectedSkill、selectedModel、submitState。

交互：

- 支持多行输入，达到 6 行后内部滚动；
- 有可提交目标时发送启用；
- 运行中变体把发送与停止分开表达；
- 附件/资源解析失败显示在对应 Chip，不把整个 Composer 标红；
- 提交失败保留全部字段和焦点。

### 3.2 `TaskTypeShortcut`

显示名称、结果示例、所需 Context 摘要和是否 Beta/未来。选择后预填意图，不直接绕过提交创建 Run。

### 3.3 `ResourceChip`

字段：名称、来源、格式、解析状态、权限、移除动作。敏感本地路径只显示安全名称；高级详情按权限查看脱敏路径。

### 3.4 `SkillChip` / `ModelChip`

分别表达本 Run 的显式偏好。关闭只移除选择，不卸载 Skill/模型配置。

## 4. Core Context 组件

### 4.1 `ContextSummary`

最多四个高价值 Chip：组织、班级/课程、单元/活动、学习者范围；其他项显示 `+N`。缺必需项显示“需要补充”，不是错误红色。

### 4.2 `ContextSection`

字段：sectionType、includedCount、attentionCount、summary、expanded、items。支持摘要、展开和单一滚动，不嵌套无限 Accordion。

### 4.3 `ContextItemRow`

| 字段 | 必需 |
|---|---|
| objectType / objectName | 是 |
| sourceType / sourceRef | 是 |
| included | 是 |
| version / updatedAt | 是，适用时 |
| permission | 是 |
| sensitivity | 是 |
| reason | 建议/加入原因 |
| actions | 查看来源、替换、排除、刷新中适用项 |

### 4.4 `LearnerScopePicker`

模式：全班、已有分组、指定学习者。显示人数摘要、搜索、角色/active 状态和个体敏感数据原因。名单可见不代表全部下发模型。

### 4.5 `ContextImpactReview`

主班级/课程变化时显示：将移除对象、受影响步骤、Artifact、Action、旧 Snapshot 和新计划。动作：返回修改、确认并重新规划。

## 5. Run 与过程组件

### 5.1 `RunHeader`

字段：title、taskType、runState、sourceEntry、organization、snapshotState、artifactSummary、activePanelMode。

动作：打开 Context、Artifact、执行详情、更多操作。任务状态变化不能引起 Header 高度跳动。

### 5.2 `Timeline`

统一事件接口：

```text
eventId
eventType
occurredAt
actor/source
summary
state
relatedStepId
relatedArtifactRefs
actions
detailRef
```

时间线按事件发生顺序稳定呈现；重试创建 attempt，不覆盖失败事件。

### 5.3 `PlanView` / `PlanStepRow`

字段：stepId、title、purpose、state、attempts、inputSummary、outputSummary、capabilities、duration、dependencies。

动作：展开、查看详情、重试、换策略、跳过（策略允许时）。计划修改后旧步骤标 `superseded` 并保留原因。

### 5.4 `ProcessEvent`

三层内容：

1. 教师摘要：正在做什么、状态、结果/下一步；
2. 能力追踪：Skill/Tool、作用、输入输出摘要、耗时、Context 使用；
3. 技术详情：参数、命令、路径、日志、错误码，默认折叠和脱敏。

学生信息、Secret、Token、环境变量、私有路径和大段 JSON 默认不出现于前两层。

### 5.5 `ClarificationCard`

字段：title、reason、questions、required、answers、sourceHints、validation、submitState。提交后变为只读答案摘要，可通过“修改”触发影响分析。

### 5.6 `DecisionCard`

用于计划确认、补充、失败恢复和中途选择。必须明确：需要教师做什么、选择影响、默认不执行时会怎样。等待状态不使用错误样式。

### 5.7 `RecoveryCard`

字段：失败对象、可读原因、已保留内容、未执行内容、recoverability、重试/换策略/跳过/停止。技术错误码进入详情层。

## 6. Artifact 组件

### 6.1 `ArtifactRow/Card`

字段：artifactId、type、title、state、version、updatedAt、sourceStep、dependencyState、validationSummary、primaryAction。

生成成功与预览成功是不同状态；保存到 WorkBuddy 与写回 ClassIn 也是不同状态。

### 6.2 `ArtifactPanel`

输入：selectedArtifact、artifactGraph、previewCapability、editCapability、activeVersion。

动作：预览、编辑、AI 修改、比较、下载、Focus、提出业务动作。关闭不清空 selection。

### 6.3 `PackageNavigator`

按 planned/generating/review/approved/failed/excluded 分组或筛选，显示依赖与当前项。单课件任务不渲染空 PackageNavigator。

### 6.4 `ArtifactEditor`

状态：clean、dirty、saving、saved、save_failed、conflict。字段：baselineVersion、draftVersion、selection、undo/redo 能力、lastSavedAt。

退出 dirty 状态必须保护草稿。AI 修改绑定 baselineVersion，旧请求不能覆盖新版本。

### 6.5 `AIRevisionPanel`

字段：scope、instruction、contextRefs、baselineVersion、generationState、diff、decision。动作：取消、接受、拒绝、继续修改。

### 6.6 `VersionCompare`

显示版本元数据、来源、修改人/AI、差异和当前版本。恢复旧版创建新版本，不抹掉历史。

## 7. 业务动作组件

### 7.1 `ProposedActionCard`

| 字段 | 说明 |
|---|---|
| actionType | 创建/修改/发布/发送/保存等稳定类型 |
| targetObject | ClassIn 正式对象引用 |
| changeSet | 当前值、建议值和差异 |
| sourceArtifact | 来源版本 |
| impact | 影响范围与副作用 |
| policy | 权限、风险和必需审批 |
| reversibility | 可撤销与期限 |
| expiry | 审批过期时间，适用时 |

动作：批准、拒绝、修改、查看目标。批准不等于执行成功。

### 7.2 `ApprovalBatch`

允许按教师选择批量批准，但每项可展开、取消选择并看到不同风险。不同组织、不同高风险级别或互斥动作不可混入同一无差别确认。

### 7.3 `ExecutionReceiptCard`

字段：receiptId、actionRef、actualObjectRef、result、executedAt、serverVersion、failure、undo、returnLink。状态用文字表达 succeeded/partially_succeeded/failed/not_executed。

### 7.4 `PartialSuccessSummary`

统计成功、失败、未执行和等待依赖；每组提供直接动作。整体不能只显示“已完成”或“失败”。

## 8. 能力管理组件

### 8.1 `CapabilityCard`

适用于 Skill/Tool；字段：名称、说明、来源、版本、适用任务、权限摘要、供给/安装/启用/连接状态、主动作。

`available`、`installed`、`enabled`、`selectedForRun`、`connected` 是不同维度。

### 8.2 `CapabilityDetail`

显示作用、输入输出、Context 类别、敏感范围、外部访问、副作用、版本、治理来源和变更记录。权限必须在安装/启用前可见。

### 8.3 `McpConfigurationForm`

字段：name、description、transport、command/url、args、environment、timeout、permissionScope。表单与 JSON 双向切换必须无损或明确提示不可逆格式化。

Secret 用独立安全字段；复制/日志不包含明文。状态：dirty、validating、testing、test_failed、saving、saved、save_failed、conflict。

## 9. 内容、定时与文件组件

### 9.1 `ContentFilterBar` / `ContentCard`

Filter：query、contentType、stage、subject、textbook、grade、sort。返回详情恢复全部值与滚动。

Card：封面、类型、标题、作者、来源、授权、收藏/获取状态。图片失败显示占位，不改变对象状态。

### 9.2 `PublishWizard`

四步使用一个草稿对象；Step 切换不重复上传。每步字段错误、上传状态和完成度可见；关闭保护草稿。

### 9.3 `ScheduleRuleForm`

字段：目标模板、Task Type、时区、周期、开始/结束、Context 规则、能力策略、通知、重叠策略、审批策略。提供未来三次触发预览。

### 9.4 `FileReferenceRow`

字段：名称、来源、类型、版本、权限、关联 Run/对象、解析状态。动作：预览、作为 Context、定位来源、回到 Run。

## 10. 生命周期状态矩阵

### 10.1 Run

| 状态 | 页面反馈 | 主要动作 | 必须保留 |
|---|---|---|---|
| draft | 可编辑目标 | 发送/放弃 | 输入草稿 |
| needs_context | 缺必需项 | 补充/调整 | 已有目标与资源 |
| planning | 正在形成计划 | 停止/追加约束 | Snapshot |
| awaiting_plan_confirmation | 计划与影响 | 确认/修改/停止 | 计划版本 |
| executing | 当前步骤与进度 | 追加约束/停止/查看 | 全部事件 |
| awaiting_input | 高可见问题 | 回答/停止 | 已完成步骤 |
| awaiting_approval | 动作与影响 | 批准/拒绝/修改 | Artifact/Action |
| replanning | 新旧约束影响 | 等待/停止 | 新旧计划/Snapshot |
| recoverable_failed | 原因与恢复 | 重试/换策略/停止 | 失败 attempt |
| stopped | 已停止与保留项 | 继续/查看 | 已有事件/产物 |
| partially_completed | 逐项结果 | 重试/排除/审阅 | 成功与失败项 |
| completed_pending_review | 产物可审阅 | 审阅/修改/写回 | 当前 Artifact |
| completed | 总结与 Receipt | 查看/派生新 Run | 完整记录 |
| terminal_failed | 无可行恢复 | 复制/重新开始 | 失败证据 |
| superseded | 被关联/新版本替代 | 查看来源/当前 | 历史证据 |

### 10.2 Context

`empty → proposing → needs_attention → ready_to_confirm → snapshotting → ready`，并支持 `partial / stale / permission_changed / unavailable`。每个异常状态均提供替换、刷新、继续旧 Snapshot 或停止中适用动作。

### 10.3 Artifact

`planned → generating → ready_for_review → revising → approved → action_proposed → written_back`；异常为 `blocked_by_dependency / preview_failed / recoverable_failed / save_failed / conflict / excluded / superseded`。

### 10.4 ProposedAction / Approval / Receipt

`draft → policy_checking → awaiting_approval → approved/rejected/expired → executing → succeeded/partially_succeeded/failed → undo_available/undo_expired`。

### 10.5 Skill/Tool

供给：available；安装：installing/installed/install_failed/updating/deleting；启用：enabled/disabled/policy_blocked；连接：unconfigured/testing/connected/auth_failed/endpoint_failed。维度不可压成一个 `isActive`。

## 11. 页面共通状态

| 状态 | 表达 | 动作 |
|---|---|---|
| initial_loading | 骨架匹配最终结构 | 等待/取消适用时 |
| empty_first_use | 价值说明 + 明确第一步 | 创建/导入 |
| empty_filtered | 当前筛选无结果 | 清除/调整筛选 |
| partial | 可用内容 + 缺失说明 | 重试缺失部分 |
| recoverable_error | 安全原因 + 保留内容 | 重试/替代 |
| offline/unavailable | 受影响范围 | 稍后重试/离线查看 |
| permission_denied | 缺少权限和未执行内容 | 请求权限/返回 |
| session_expired | 不丢本地草稿 | 重新登录 |
| submitting | 防重复 + 进度 | 取消适用时 |
| success | 具体成功对象与下一步 | 查看/撤销 |
| stale/conflict | 新旧版本与影响 | 刷新/保留/比较 |

## 12. 权限与敏感数据矩阵

| 数据/动作 | 默认可见 | 默认可下发能力 | 必需保护 |
|---|---|---|---|
| 教师/组织范围 | 是 | 任务必要摘要 | Tenant 隔离 |
| 班级/课程/单元 | 有权限时 | 任务需要引用 | 来源/版本 |
| 班级人数聚合 | 是 | 适用任务可用 | 不含姓名 |
| 学生姓名/昵称 | 展开且有权限 | 默认否 | 明确选择与原因 |
| 个体学习证据 | 默认不展开 | 默认否 | student_sensitive 策略 |
| Domain Knowledge | 适用范围可见 | 按任务投影 | 版本/所有者 |
| Secret/Token | 否 | 仅安全 Adapter | 不回显/不进日志 |
| 原始路径/命令 | 高级详情脱敏 | 仅沙箱/策略允许 | 危险动作审批 |
| ClassIn 写回 | ProposedAction 可见 | 不由模型直接执行 | Approval + Receipt |

## 13. 埋点与评价事件

产品原型可用固定模拟事件表达，未来实现至少记录：

- task_type_selected、run_created、context_proposal_reviewed、context_changed；
- clarification_submitted、plan_confirmed/modified；
- step_started/completed/failed/retried；
- artifact_opened/edited/ai_revised/approved；
- action_proposed/approved/rejected/executed/partially_succeeded；
- recovery_used、run_stopped/resumed/completed；
- teacher_rating、artifact_adoption、undo_used。

评价数据不反向成为业务事实；学生敏感字段不进入无治理分析事件。

## 14. 原型组件验收

1. 每个核心组件至少展示默认、loading、error、disabled 和 focus-visible；
2. Run、Context、Artifact、Action 状态互不混用；
3. `installed / enabled / selected / connected` 可独立演示；
4. 所有等待教师状态有明确行动，不只显示转圈；
5. 失败展示已保留内容和恢复动作；
6. Context Projection 可查但完整 Snapshot 不直接暴露给 Skill/Tool；
7. Partial Success 能逐项操作；
8. 真值和数据来源不只靠颜色表达。
