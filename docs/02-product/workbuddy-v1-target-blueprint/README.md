---
title: ClassIn WorkBuddy V1 目标产品转换包
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
review_gate: PHASE_2_PASSED
---

# ClassIn WorkBuddy V1 目标产品转换包

## 1. 阶段目标

本阶段把已冻结的 NineClaw 页面与交互规格转换成 ClassIn 教师 WorkBuddy 的目标产品骨架，同时补齐 Core Context 和两类课程生产任务模型。

它解决四个问题：

1. NineClaw 每个已知页面和功能在 ClassIn 中是否都有去向；
2. ClassIn 的教师、机构、班级、课程、单元、活动、成员、资源和证据如何进入 Agent Run；
3. “生成单个课件”和“生成课程方案包”如何独立成立并相互衔接；
4. 当前页面与产品对象是否能承载未来全量 AI 能力，而不提前展开全量设计。

## 2. 交付物

| 文档 | 回答的问题 | 状态 |
|---|---|---|
| `NINECLAW-CLASSIN-PARITY-MATRIX.md` | NineClaw 已知页面、覆盖层和功能如何完整映射到 ClassIn | `REVIEWED_APPROVED` |
| `AGENT-TASK-TYPE-MODEL.md` | 单课件与课程方案包两类任务如何独立和衔接 | `REVIEWED_APPROVED` |
| `ARCHITECTURE-EXTENSIBILITY-CHECK.md` | 当前结构是否避免硬编码为单课件，并能容纳未来能力 | `REVIEWED_APPROVED` |
| `../../04-specs/features/workbuddy-core-context/FEATURE-SPEC.md` | Core Context 的对象、来源、选择、UI、状态、权限与 Interface | `REVIEWED_APPROVED` |

## 3. 事实来源

- 当前项目 `DECISION-LEDGER.md` 中 D-001 至 D-022；
- `../nineclaw-replication-spec/` 的已审阅 NineClaw 规格；
- `../../03-design/workbuddy-v1/` 的已审阅 WorkBuddy 设计基线；
- `classin-pc-optimizer` 的 ClassIn Product DNA、移动端 Feature 全集、PC Feature 对齐矩阵以及班级、课程表、待办、空间和教学洞察 Feature Spec；
- 当前项目 `CONTEXT.md` 的领域语言。

## 4. 本阶段边界

- 完成产品与 Interface 规格，不开始产品代码；
- 不删除 NineClaw 已知功能；
- 不研究九章爱学；
- 不展开所有 ClassIn AI 能力的详细页面，只做承载能力检查；
- 不把真实 ClassIn API、生产权限或数据刷新规则伪装成已经存在；
- 不在本阶段完成所有页面级 PRD和像素稿，它们属于 Phase 3。

## 5. Phase 2 Review 建议顺序

1. 先审 Core Context Feature Spec；
2. 再审两类 Agent 任务模型；
3. 检查 NineClaw 页面映射是否有功能被弱化或遗漏；
4. 最后确认架构扩展性检查的 `PASS / OPEN / UNKNOWN` 边界。

## 6. Review 结果

2026-08-20，用户确认本包及 Core Context Feature Spec 全部清晰、无修改意见。Phase 2 Review 通过，允许进入完整目标信息架构、页面地图与页面级 PRD。
