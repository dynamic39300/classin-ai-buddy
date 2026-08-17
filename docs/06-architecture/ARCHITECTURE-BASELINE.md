---
title: WorkBuddy 全局架构低分辨率基线
status: LOCKED
version: v0.1
---

# WorkBuddy 全局架构低分辨率基线

## 五个 Harness 深模块

1. 上下文引擎；
2. 目标与任务运行时；
3. 能力与业务工具系统；
4. 教师控制与执行系统；
5. 评价与持续学习系统。

## 共享技术基座

身份与租户策略、Durable 状态与事件、模型与 Prompt Gateway、Capability Registry、Artifact Workspace、Observability 与 Evaluation、UI 状态投影、配置与插件治理。

## 事实所有权

WorkBuddy 拥有 Run、Plan、ContextSnapshot 引用、ArtifactDraft、ProposedAction、Approval、ExecutionReceipt 和评价事件。ClassIn 拥有课程、课堂、作业、消息、正式发布状态、教师身份和组织权限。Domain Knowledge 系统拥有课程标准、教学法、机构规范和量规版本。

## 契约

六类稳定契约是 Intent、Context、Artifact、Capability、Action、Evaluation。底层 SDK Session、Graph Checkpoint、Workflow History 和 A2A Task ID 都是 Provider 实现引用，不升级为产品事实。

## 运行组合

Agent Loop 处理短程模型与工具循环；状态图处理可观察分支和人工中断；Durable Workflow 只承担跨时间等待、定时器、重试和可靠副作用；MCP 是 Agent-to-Tool Adapter；A2A 只用于真正独立、有生命周期和完成契约的专业子 Agent。

## 首条切片的架构证明

“课程目标到课程对象”必须覆盖目标、上下文、Artifact、Capability、Approval、Action、ExecutionReceipt 和 Evaluation。它验证的是架构责任和契约广度，不宣称生产成熟度或真实 ClassIn 集成完成。

