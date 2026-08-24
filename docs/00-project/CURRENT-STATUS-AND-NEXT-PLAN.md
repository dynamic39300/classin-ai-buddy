---
title: ClassIn 教师 WorkBuddy 当前状态与下一阶段计划
status: READY_FOR_VERSION_SEAL
version: v0.3
date: 2026-08-24
---

# 当前状态与下一阶段计划

## 1. 当前完成事实

| 范围 | 工程状态 | 用户 Review Gate |
| --- | --- | --- |
| ClassIn PC 教师/学生产品基座 | 已迁入根 `src/` 单应用并持续可运行 | 已通过既有阶段验收 |
| M4 课程生产与 M4.1 ConversationRun | Goal → Context → Plan → Artifact → Action → Approval → Receipt → Evaluation 已实现 | M4.1 与阶段收尾已确认通过 |
| Evaluation Module | 单课件、方案包对象和 WorkBuddy IM 每次执行均保留关联完整证据链的模拟 EvaluationEvent；失败/重试历史可恢复 | 随阶段一至四收尾通过技术验收 |
| 能力管理页面 | Skills、Tools、Files、Schedules、Settings 已实现；Content 按 D-051 Dormant | 2026-08-24 用户确认五个可见页面验收完成 |
| WorkBuddy IM | 作业催交、课前准备通知、沉浸消息工作台和显式审批发送已实现 | 2026-08-24 用户确认 v0.19 验收完成 |
| 班级多 Agent 渠道 | 公开结构化 `@Agent`、教师/学生隔离私聊、授权重验、目标撤销与可恢复失败已实现 | 随 IM v0.19 验收通过 |
| M5 作业订正 | Feature Spec、ConversationRun PRD 和 Ticket Proposal 已就绪 | 待用户批准进入实施 |

所有当前运行结果均为固定、脱敏、可重置的 `[模拟]` 数据；没有真实 ClassIn API、模型 Runtime、生产授权或长期记忆。

## 2. 周一阶段一到阶段四收尾

1. 阶段一——实现审计与稳定化：硬性 Standards/Spec 缺口已修复；终局双轴复审均 all-clear；静态、单元/集成、关键 E2E 和范围视觉复验已完成。
2. 阶段二——能力页与 IM v0.19 Review Gate：五个可见能力页面及 IM v0.19 已于 2026-08-24 完成用户验收。
3. 阶段三——事实源与 Evaluation 收口：旧 workspace 决策已标为被 D-023 替代；单课件、方案包和 IM 已接入 EvaluationEvent；完整证据链失败关闭，失败/重试历史不被覆盖，也不把执行成功解释为教学效果。
4. 阶段四——三渠道 Case Library 与下一阶段：Case 已分渠道盘点并给出优先级；建议下一条实施 `WB-03 / M5 作业订正`。

## 3. 封存与开启下一阶段

### 3.1 已完成的技术 Gate

- `npm run check`：TypeScript、ESLint、72 个 Vitest 文件 / 490 项测试全部通过；
- `npm run build`：生产构建通过；保留已知的约 1.23 MB 主 JS chunk 提醒；
- 关键浏览器回归：消息工作台与 M4.1 共 41 项 Chromium E2E 全部通过；
- 能力页与 IM 范围视觉：39 项通过、3 项 Dormant Module 按设计跳过；更新并稳定复跑本轮受影响的 2 张 IM 发送证据快照；
- Standards/Spec 双轴终局复审：均无剩余硬 finding；文本、代码与样式 diff whitespace 校验通过。

全仓旧视觉基线仍有独立维护债务：此前全量结果为 51 通过、3 跳过、90 失败，绝大部分是约 1% 的既有像素漂移；M4.1 视觉套件也在首帧出现约 2% 的既有漂移。未静默批量更新这些与本阶段无关的基线，仅更新并复验了本轮直接受影响的范围快照。

### 3.2 产品 Gate 结论

封存所需产品 Gate 已完成：

- 五个可见能力页面完成用户 Review Gate；Content 继续按 D-051 保持 Dormant；
- WorkBuddy IM 与班级多 Agent 渠道 v0.19 完成用户 Review Gate。

当前可在 `codex/workbuddy-m3-shell` 分支提交本轮全部已核验变更并推送远端，形成版本封存。M5 仍处于产品规格 Review Gate；用户批准其 PRD、Feature Spec 与 Ticket 粒度后，再建立新的 `codex/` 开发分支进入实施。
