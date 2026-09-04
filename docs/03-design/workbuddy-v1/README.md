---
title: ClassIn WorkBuddy V1 设计基线包
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
review_gate: PHASE_1_PASSED
---

# ClassIn WorkBuddy V1 设计基线包

## 1. 用途

本目录是 ClassIn 教师 WorkBuddy 第一版目标产品设计的统一设计入口。它把三类来源合成一套可评审的设计基线：

1. ClassIn PC 的业务对象、角色语义、桌面交互和视觉规范；
2. Linear 的桌面工作台设计基因；
3. NineClaw 的 Agent 任务、执行过程和产物闭环。

本阶段只建立设计原则、采纳边界和 Golden Samples，不开始页面级 PRD、Core Context 字段设计或产品代码实现。

## 2. 文件导航

| 文件 | 作用 | 当前状态 |
|---|---|---|
| `DESIGN-FOUNDATION.md` | WorkBuddy 的总体 UI/UX 与视觉方向 | `REVIEWED_APPROVED` |
| `SOURCE-ADOPTION-MATRIX.md` | 逐项记录来源、成熟度和采纳状态 | `REVIEWED_APPROVED` |
| `LINEAR-DESIGN-GENES.md` | Linear 设计基因及 WorkBuddy 转译 | `REVIEWED_APPROVED` |
| `INTERACTION-PATTERNS.md` | 工作台、任务、过程、产物和反馈的交互语法 | `REVIEWED_APPROVED` |
| `TOKENS-AND-COMPONENT-RULES.md` | Token 与基础组件候选规则 | `REVIEWED_APPROVED` |
| `golden-samples/README.md` | 代表性视觉和交互证据索引 | `REVIEWED_APPROVED` |
| `source-materials/README.md` | 从 `classin-pc-optimizer` 搬入的来源快照说明 | `READY` |

## 3. 本阶段不产出的内容

- 不重新研究九章爱学 Web AI 工具矩阵；
- 不删减 NineClaw 已知功能；
- 不提前定义 Core Context 的具体业务字段和取数规则；
- 不开始完整页面地图、页面状态矩阵和工程实现；
- 不把候选 Token 自动升级为最终品牌视觉规范。

Core Context 的业务对象、信息来源和选择逻辑将在阶段 2 中，基于 `classin-pc-optimizer` 的产品事实、Feature Spec、截图与对象结构专项梳理。

## 4. Phase 1 Review 结果

2026-08-20 用户完成 Review 并确认：

1. 采用 ClassIn 共享 Shell 下的专属 Agent Work Surface；
2. ClassIn PC 一级主导航提供 `AI Agent` 入口，AI Agent 打开对标 NineClaw 的扁平二级导航面板；
3. 二级面板默认显示 6 条近期任务，更多任务在任务 Section 内滚动，不形成第三级菜单；
4. 右侧辅助区按当前意图切换 Artifact、Core Context 和执行详情；
5. 执行过程采用教师摘要、能力追踪和高级技术详情三层表达；
6. 字体、品牌色、Token 和圆角候选可升级为锁定设计规格。

Phase 1 已通过，可以进入 NineClaw → ClassIn 转化、Core Context 详细规格与架构扩展性检查。
