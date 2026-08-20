---
title: ClassIn WorkBuddy V1 页面与交互详细规格包
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
review_gate: PHASE_3_PASSED
---

# ClassIn WorkBuddy V1 页面与交互详细规格包

## 1. 阶段目标

本包把已确认的产品转换、Core Context 和任务模型落实为可直接制作结构/交互高保真原型的页面级 PRD。它定义目标信息架构、页面地图、工作区布局、完整跳转、组件字段、状态、权限与验收，不开始产品代码。

## 2. 交付物

| 文档 | 作用 | 状态 |
|---|---|---|
| [目标信息架构](../../../02-product/workbuddy-v1-target-blueprint/TARGET-INFORMATION-ARCHITECTURE.md) | ClassIn 一级主导航、AI Agent 扁平二级导航、任务/能力/内容/设置关系 | `REVIEWED_APPROVED` |
| [页面地图与导航](./PAGE-MAP-AND-NAVIGATION.md) | 43 个目标页面/覆盖层、入口、出口和来源映射 | `REVIEWED_APPROVED` |
| [工作区布局规格](./WORK-SURFACE-LAYOUT-SPEC.md) | 1440×900 布局、活动辅助区、全屏与响应规则 | `REVIEWED_APPROVED` |
| [关键流程与跳转](./KEY-FLOWS-AND-TRANSITIONS.md) | 单课件、方案包、Skill Creator、内容改编、定时和写回流程 | `REVIEWED_APPROVED` |
| [页面级 PRD](./PAGE-LEVEL-PRD.md) | 每组页面的目的、区域、字段、动作、状态、跳转和验收 | `REVIEWED_APPROVED` |
| [组件、字段与状态规格](./COMPONENT-FIELD-AND-STATE-SPEC.md) | 原型必须覆盖的组件契约、状态与权限表达 | `REVIEWED_APPROVED` |
| [Phase 3 Review 清单](./PHASE-3-REVIEW-CHECKLIST.md) | 汇总原型前必须确认、影响交互和可保持 OPEN 的事项 | `REVIEWED_APPROVED` |
| [实施规格](./IMPLEMENTATION-SPEC.md) | 把已审阅 PRD 转换为 ClassIn PC 基座中的首个可实施 Shell 切片、测试 Seam 与范围边界 | `READY_FOR_TICKETING` |

## 3. 已锁定输入

- D-010 至 D-022；
- Phase 1 设计基线与视觉规格；
- Phase 2 38/38 映射、Core Context、两类任务模型和扩展性检查；
- 已审阅的 NineClaw 页面/交互还原规格；
- ClassIn PC 业务对象、Shell、课程、任务、空间与洞察设计事实。

## 4. 设计真值标签

| 标签 | 含义 |
|---|---|
| `LOCKED` | 用户已确认的产品决定 |
| `TARGET_SPEC` | 本阶段提出、等待页面设计 Review 的目标规格 |
| `DESIGN_COMPLETION` | 为补齐 NineClaw 未知交互而采用的合理默认处理 |
| `OPEN` | 页面位置已保留，业务绑定或实现仍待决定 |
| `UNKNOWN` | 依赖真实 ClassIn、权限、API 或技术 Spike，不能当成生产事实 |

## 5. Phase 3 完成定义

- 38 个 NineClaw 基线页面/覆盖层全部可追溯到目标 ID；
- ClassIn 新增的 Core Context、业务写回与关联任务页面位置明确；
- 单课件和课程方案包两条链均可从入口走到 Artifact、审批和 Receipt；
- 页面覆盖空、加载、等待、失败、权限、部分成功、恢复和冲突；
- `1440×900` 下唯一主行动可达，右侧活动区不形成持续四栏；
- 页面和组件只编排 Interface，不直接拥有业务事实或拼接 Skill/Tool 参数；
- 用户完成 Phase 3 Review 后，才进入新原型制作。

## 6. Review 顺序

1. 信息架构与页面地图；
2. 两类课程任务和写回关键流程；
3. 工作区布局与右侧活动区；
4. 页面级 PRD；
5. 组件、字段与状态规格。

## 7. Review 结果

2026-08-20，用户完成全部八份文档 Review：除目标信息架构的导航层级外，其余均确认无问题。导航已按用户要求修正为“ClassIn 一级主导航 + NineClaw 式 AI Agent 扁平二级导航”，内部不再建立第三级菜单；Phase 3 Review 通过。M3 功能框架验收后，用户进一步锁定二级导航嵌入同一 ClassIn 左侧栏的 AI Agent 入口下方，右侧 Stage 完整用于 Run、Artifact、Core Context 与执行详情。
