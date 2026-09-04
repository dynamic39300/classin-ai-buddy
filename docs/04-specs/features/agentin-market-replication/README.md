---
title: AgentIn 市场现状复刻规格索引
status: IMPLEMENTATION_REVIEW_READY
version: v0.1
date: 2026-09-03
---

# AgentIn 市场现状复刻规格索引

本目录定义把当前线上 AgentIn 市场首页以静态高保真页面接入 ClassIn TeacherIn Demo 的范围。它只复刻用户提供的 Notion 页面及五张截图中可观察到的事实，不把未展示的 Agent 详情、创建、授权或班级添加流程补写为已经存在的页面。

## 文档

- [现状研究与证据清单](./CURRENT-STATE-RESEARCH.md)：入口、页面结构、内容、可观察状态和证据边界；
- [产品需求文档](./PRODUCT-REQUIREMENTS.md)：已审阅的 Demo 接入方式、页面级需求、响应式规则和验收标准；
- [Feature Spec](./FEATURE-SPEC.md)：已审阅的 Module、Interface、状态、路由和测试契约；
- [Ticket Breakdown](./TICKET-BREAKDOWN.md)：已审阅的纵向 Ticket、依赖、Write Set 与完成条件；
- [Implementation Traceability](./IMPLEMENTATION-TRACEABILITY.md)：当前实施状态、验证证据与线上事实/适配差异；
- `IMPLEMENTATION-TRACEABILITY.md`：进入 Implementation 并完成实现后，补充代码、测试和视觉验收映射。

## 事实分层

1. `ONLINE_FACT`：Notion 文字和截图直接可见的线上 AgentIn 事实；
2. `USER_REQUIREMENT`：用户本次明确要求的 TeacherIn 二级导航接入与静态复刻；
3. `DEMO_ADAPTATION`：为适配当前教师端 Demo、路由和可用宽度而做的实现决定；
4. `UNKNOWN`：没有截图或文字证据，暂不实现、不推断。

## 当前范围

- 目标入口：教师端首页 TeacherIn 二级导航中的 `AgentIn`；
- 目标路由：`/teacher/ai-agent/agentin`；
- 目标页面：AgentIn 首页市场的完整可滚动静态 Surface；
- 不改变：现有“技能市场”、工具连接、文件、定时任务及 Agent Run 的实现；根据 D-117，当前 `ideal-full` 导航暂不发布“工具连接”和“定时任务”，直达路由继续保留；
- 不实现：Agent 详情、收藏写入、创建 Agent、添加到班级、权限授权、搜索后端和真实市场数据。

## 阶段门禁

```text
Current-state research
  → PRD review and approval
    → To Spec: Feature Spec
      → To Tickets: ticket breakdown and write sets
        → Implementation
          → Verification and traceability
```

PRD、Feature Spec 与 Ticket Breakdown 均已通过用户审阅。AGIN-01→07 已完成，AGIN-08 已完成实现范围的 Standards/Spec Review、全量测试和构建；全仓 `npm run check` 仍受并行数据分析工具脚本的既有 Lint 错误阻断，详见 Implementation Traceability。
