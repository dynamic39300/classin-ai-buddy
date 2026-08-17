---
title: 课程目标到课程对象纵向切片 Spec
status: D0-D1
truth: SIMULATED
---

# 课程目标到课程对象纵向切片

## 用户目标

林老师输入八年级英语四周叙事写作单元目标，WorkBuddy 帮她澄清范围、形成计划、生成课程对象草稿、审阅修改、执行模拟保存并查看回执。

## 范围

包含：目标输入、范围与成功标准、上下文授权、计划、课程/单元/活动草稿、来源、差异、规则校验、审批、模拟写回、冲突、部分成功、恢复和评价事件。

不包含：真实 ClassIn API、正式发布、真实学生判断、消息外发、A2A 网络、第三方插件市场和跨天生产调度。

## 一等对象

`WorkBuddyRun`、`ContextSnapshot`、`ArtifactDraft`、`CapabilityManifest`、`ProposedAction`、`Approval`、`ExecutionReceipt`、`EvaluationEvent`。

## Interface 与 Adapter

模拟 ClassIn Adapter 和未来真实 ClassIn Adapter 共享领域 Interface。Interface 至少支持读取范围、读取已有课程结构、保存草稿、报告版本冲突、部分失败和返回稳定回执。Adapter 不拥有 WorkBuddy 计划或 ArtifactDraft。

## 架构拆解入口

当前切片的端到端六件套见：[课程目标到课程对象六件套拆解](../../../06-architecture/COURSE-PRODUCTION-SIX-PART-DECOMPOSITION.md)。该文档明确端到端链路、四类输入、事实所有权、Module / Interface / Adapter、状态机、场景矩阵和当前代码追踪；其中“当前实现”和“目标形状”分开标注，不把模拟 UI 状态当作生产能力。

## 验收

- 教师能从目标输入走到课程对象草稿；
- 每个产物显示来源、版本和 `[模拟]` 标签；
- 教师能修改、比较差异、批准或拒绝；
- 保存动作先显示对象范围、风险和版本；
- 冲突和部分成功不会被汇报为整体成功；
- 页面关闭后可恢复 Run；
- 评价事件能关联教师修改、审批和模拟回执。
