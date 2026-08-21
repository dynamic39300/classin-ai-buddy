---
title: 课程目标到课程对象 Feature Spec
status: D2 feature spec draft
truth: SIMULATED
version: v0.1
date: 2026-08-19
---

# 课程目标到课程对象 Feature Spec

> 本 Spec 由已确认的整体产品方案、四图三表和交互与状态原型综合生成，当前状态为待产品审阅。产品审阅通过后，才进入 `/to-tickets`。

## Problem Statement

教师已经有一个教学目标，但通常还需要在多个地方手工完成目标澄清、课程范围确认、单元和活动设计、评价安排、资源整理以及课程系统录入。这个过程中有三个具体问题：

1. 教学目标、课程结构和课堂活动之间缺少一条可检查的映射关系；
2. AI 生成的内容如果没有审教、版本和教师确认机制，就无法成为可信的课程方案；
3. 保存动作涉及正式课程对象、权限和版本，不能把“模型生成成功”直接当成“业务完成”。

第一条 WorkBuddy 纵向切片需要验证：一个教师能否在统一工作台中，从目标输入开始，经过上下文和依据组织、课程方案包生成、整体/单元/活动审教、意见处理、版本修订、规则校验、最终确认、审批和模拟写回，完成一条可追溯、可恢复的业务闭环。

第一版交付物是**可审教课程方案包**，不是 PPT 文件，也不是 ClassIn 正式发布对象。

## Solution

提供一个由 WorkBuddy 统一工作台承载的课程生产工作流：

```text
目标与约束
→ 目标澄清与成功标准
→ 授权上下文与 Domain Knowledge 依据
→ 可审教课程方案包 v1
→ 整体/单元/活动审教
→ 审教意见处理
→ 人工修改或 AI 定向修订
→ 方案包 v2...
→ 再次审教
→ 规则校验
→ 最终确认稿
→ ProposedAction
→ 教师 Approval
→ 模拟 ClassIn 写回
→ ExecutionReceipt
→ 复查与 EvaluationEvent
```

解决方案由以下能力组成：

- **目标协调**：把教师自然语言目标整理为可观察目标、成功标准和缺口清单；
- **上下文组织**：读取经过授权的教师输入、课程业务事实和固定版本 Domain Knowledge，并生成可追溯的 ContextSnapshot；
- **方案包生成**：产出课程、单元、课时/活动、评价、资源和来源组成的 ArtifactDraft；
- **结构化审教**：允许教师在整体方案、单元和活动三级颗粒度上记录独立意见；
- **版本修订**：支持人工修改和 AI 定向修订，保留版本号、差异和意见处理状态；
- **完整性校验**：在最终确认前检查目标、成功标准、课时、结构、评价、来源和阻断性意见；
- **受控写回**：最终确认后生成待确认动作，经过教师审批和模拟 Adapter 写回；
- **可追溯反馈**：通过执行回执和评价事件记录每一次业务结果。

第一版使用固定、脱敏、可重置的模拟 ClassIn 数据，所有方案包、知识来源和执行回执显示 `[模拟]` 真值标签。

## User Stories

### 目标与范围

1. As a 教师, I want to 从统一 WorkBuddy 工作台选择“把课程目标整理成课程方案”, so that 我不需要先理解内部 Agent、Skill 或数据接口。
2. As a 教师, I want to 用自然语言输入教学目标, so that 我可以从自己的工作语言开始，而不是填写技术表单。
3. As a 教师, I want to 指定年级/学段, so that 课程方案适配正确的学生群体。
4. As a 教师, I want to 指定预计课时或周期, so that 方案中的单元和活动可以落在真实教学安排内。
5. As a 教师, I want to 补充班级特点和额外约束, so that 方案不会只根据抽象教材模板生成。
6. As a 教师, I want to 在目标不完整时看到缺少什么以及为什么需要, so that 我可以补充信息而不是得到一份假装完整的方案。
7. As a 教师, I want to 返回修改目标或退出任务, so that 尚未成熟的意图不会被强行生成。
8. As a 教师, I want to 看到本次任务的机构、课程和班级范围, so that 我知道后续结果会影响什么对象。

### 上下文与依据

9. As a 教师, I want to 查看 WorkBuddy 使用了哪些教师输入, so that 我能确认方案确实基于我的目标。
10. As a 教师, I want to 查看课程、单元和已有结构等业务事实的来源和版本, so that 我能区分系统事实与 AI 推断。
11. As a 教师, I want to 查看课程标准、教学法和评价量表等 Domain Knowledge 的来源, so that 我能判断依据是否适合当前课程。
12. As a 教师, I want to 看到未经授权的资料不会进入方案, so that 方案的来源范围可控。
13. As a 教师, I want to 在上下文存在缺口或冲突时先处理缺口, so that AI 不会用不明来源的内容填补关键事实。
14. As a 产品/教研人员, I want to 为每个 ContextSnapshot 保存来源、版本和真值标签, so that 后续版本和评价可以追溯依据变化。

### 方案包生成

15. As a 教师, I want to 获得课程目标与成功标准的结构化草稿, so that 我可以先确认“要教什么”和“如何判断学会”。
16. As a 教师, I want to 获得课程、单元、课时和活动结构, so that 目标能落到可执行的教学安排。
17. As a 教师, I want to 看到每个单元的目标、课时和活动, so that 我能判断结构是否合理。
18. As a 教师, I want to 看到评价安排, so that 方案不仅有活动，也有判断学习结果的方法。
19. As a 教师, I want to 看到资源建议和来源依据, so that 我能判断实施课程需要什么准备。
20. As a 教师, I want to 看到方案包版本和 `[模拟]` 标签, so that 我不会把 AI 草稿误认为正式课程对象。
21. As a 教师, I want to 先浏览整体安排再进入细节, so that 我可以快速判断方案是否值得继续审教。
22. As a 教师, I want to 回到目标输入修改约束, so that 生成结果不符合意图时不必从头开始。
23. As a 教师, I want to 在页面关闭后恢复当前 WorkBuddy Run, so that 已有目标、依据和方案版本不会丢失。

### 审教与意见

24. As a 教师, I want to 对整份方案提出意见, so that 我可以审查总体目标、结构和节奏。
25. As a 教师, I want to 对单元提出意见, so that 我可以指出某个教学阶段的目标或活动问题。
26. As a 教师, I want to 对具体活动提出意见, so that 我可以定位到可执行的课堂设计问题。
27. As a 教师, I want to 为意见标记阻断性或建议性, so that 系统知道哪些问题必须在最终确认前解决。
28. As a 教师, I want to 为意见写明依据和修改方向, so that AI 或其他教师能理解我的专业判断。
29. As a 教师, I want to 每条意见单独查看状态, so that 我能知道哪些意见仍然开放、已接受、已应用或已验证。
30. As a 教师, I want to 接受当前意见而不改变方案, so that 我可以明确记录“看到了，但暂不修改”。
31. As a 教师, I want to 拒绝不适用的意见, so that 不合理建议不会阻塞方案确认。
32. As a 教师, I want to 延后非阻断性意见, so that 当前课程工作可以继续，同时保留后续处理记录。
33. As a 教师, I want to 在人工修改后生成新版本, so that 我的修改不会覆盖上一版方案。
34. As a 教师, I want to 要求 AI 只处理我指定的意见和范围, so that AI 不会擅自重写整份方案。
35. As a 教师, I want to AI 生成新版本后看到变更原因和差异, so that 我可以判断修改是否真正回应了意见。
36. As a 教师, I want to AI 不能自动把意见标记为已解决, so that “生成了修改”不被误认为“教师认可了修改”。
37. As a 教师, I want to 在新版本中重新验证意见, so that 只有我的专业判断才能把意见标记为 `verified`。
38. As a 教师, I want to 恢复上一版本, so that 不满意的 AI 修订可以被安全撤回。

### 校验、确认与审批

39. As a 教师, I want to 在最终确认前运行课程完整性校验, so that 方案不会因为目标、课时或结构缺口进入保存流程。
40. As a 教师, I want to 看到阻断项与非阻断警告的区别, so that 我知道哪些问题必须处理、哪些问题可以明确保留。
41. As a 教师, I want to 阻断性意见未解决时不能最终确认, so that 业务完成条件不会被绕过。
42. As a 教师, I want to 明确确认当前方案包版本, so that 最终确认稿代表我的决定而不是模型的默认结果。
43. As a 教师, I want to 退回最终确认流程继续修改, so that 我可以在确认前重新审教。
44. As a 教师, I want to 看到保存将影响的课程、单元和活动范围, so that 我知道业务副作用的具体对象。
45. As a 教师, I want to 看到保存动作使用的课程版本、风险和真值标签, so that 我能判断是否可以安全执行。
46. As a 教师, I want to 批准、拒绝或退回保存动作, so that 生成内容不会未经我同意写入课程系统。
47. As a 系统, I want to 让 `ProposedAction` 经过权限策略、领域校验和教师 `Approval`, so that 所有业务写回都具备明确控制点。

### 写回、异常与复查

48. As a 教师, I want to 看到课程、单元和活动逐项执行回执, so that 部分成功不会被显示成整体成功。
49. As a 教师, I want to 在版本冲突时看到当前课程变化, so that 我可以重新准备动作而不会覆盖他人修改。
50. As a 教师, I want to 在权限拒绝时保留方案包, so that 我可以继续编辑或更换保存范围。
51. As a 教师, I want to 在临时失败时重试, so that 我不需要重新输入目标和重新审教。
52. As a 教师, I want to 在部分成功时只处理失败对象, so that 已成功写回的对象不会被重复操作。
53. As a 教师, I want to 在执行完成后查看对象版本和保存结果, so that 我能确认业务系统实际发生了什么。
54. As a 教师, I want to 继续完善已保存的方案, so that 保存不是流程终点，方案仍可进入后续教学工作。
55. As a 产品/教研人员, I want to 记录目标确认、审教轮次、意见处理、审批、回执和教师修改, so that 可以评价真实业务价值。
56. As a 产品/工程人员, I want to 区分真实、模拟、集成模拟和未来能力, so that 原型和测试不会暗示生产集成已完成。

## Implementation Decisions

### 1. 纵向边界

- 本 Feature 覆盖单教师、单机构、单班级课程、单次 WorkBuddy Run。
- 第一版的核心 Artifact 是可审教课程方案包，由目标、成功标准、课程范围、单元、课时/活动、评价、资源、来源、审教意见和版本记录组成。
- 第一版的业务结果是教师最终确认 + 模拟 Adapter 执行回执。
- 课程方案包不是 ClassIn 正式对象；只有经过 `ProposedAction` 和 `Approval` 后，才允许模拟保存为课程、单元和活动草稿。

### 2. 主要模块与职责

- **Domain Module**：拥有课程方案包、目标草稿、审教意见、版本、校验报告和显式状态转换；不依赖 UI、浏览器、Mock 或具体 Adapter。
- **Contracts Module**：拥有外部输入、命令、View Model、执行回执和评价事件的 Zod Schema；所有 Adapter 输出先校验再进入应用层。
- **Application Workflow Module**：协调目标确认、上下文构建、方案生成、审教修订、规则校验、最终确认、审批和写回；不直接创建具体 Adapter。
- **Harness Modules**：分别提供 Context、Runtime、Capabilities、Control 和 Evaluation 的稳定能力接口；教师不需要选择内部 Agent、Skill、MCP 或模型。
- **Mock ClassIn Adapter**：提供固定、脱敏、可重置的读取和写回结果，并覆盖保存成功、冲突、权限拒绝、部分成功和可恢复失败。
- **Workbench Feature**：只消费稳定的 `RunViewModel`、`ArtifactViewModel`、`ContextViewModel`、`ActionViewModel` 和 `EvaluationViewModel`，通过 Command Interface 发送教师意图。

### 3. 主要 Interface 与测试 seam

本 Feature 采用一个最高层的主 seam：**Course Production Workflow Interface**。它接收教师命令，返回稳定的业务 View Model 和结构化事件；下层 Domain、Harness 和 Adapter 通过组合根注入。

主 seam 至少支持以下命令语义：

- `startRun`：创建 Run 并接收目标、范围和前置条件；
- `clarifyGoal`：确认目标、成功标准和缺口；
- `generatePlan`：生成方案包初稿；
- `addReviewComment`：在整体方案、单元或活动位置创建意见；
- `acceptComment` / `rejectComment` / `deferComment`：处理意见；
- `revisePlan`：人工修改或 AI 定向修订并创建新版本；
- `verifyComment`：教师在新版本中验证意见是否解决；
- `validatePlan`：运行完整性规则并返回阻断项与警告；
- `confirmPlan`：标记教师明确确认的最终版本；
- `approveAction` / `rejectAction`：批准或拒绝保存动作；
- `executeAction`：调用模拟 Adapter 并返回逐项执行回执；
- `recover`：从冲突、权限拒绝、部分成功或可恢复失败恢复。

这个 seam 是当前优先确认的工程决策。若产品审阅后需要拆成多个 seam，应先更新本 Spec，再进入 tickets。

### 4. 状态模型

交互与状态原型验证了以下业务状态方向，作为本 Spec 的产品级状态契约：

```text
empty
→ generating
→ review
→ revising
→ revised
→ validating
→ confirmed
→ executing
→ completed
```

异常状态从主链分叉：

```text
validating → review                       （阻断项未清零）
executing → conflict                      （expectedVersion 不匹配）
executing → permission-denied             （目标范围无写回权限）
executing → partial-success              （对象级部分写回）
executing → recoverable-failure          （临时失败，可重试）
```

审教意见状态采用：

```text
open → accepted | applied | rejected | deferred
applied → verified
```

AI 生成新版本只能把指定意见推进到 `applied`，不能直接推进到 `verified`。

### 5. 领域对象

第一版使用以下一等对象和关系：

- `WorkBuddyRun`：一次教师任务的边界、当前状态和恢复标识；
- `GoalIntentDraft`：教师目标、年级、课时、成功标准和缺口；
- `ContextSnapshot`：本次运行读取的来源、版本、授权范围和真值标签；
- `ArtifactDraft`：课程方案包及其版本链；
- `ReviewComment`：绑定方案、单元或活动位置的独立审教意见；
- `ValidationReport`：阻断项、警告和校验时间；
- `ProposedAction`：待写回的对象范围、方案版本、expectedVersion 和风险；
- `Approval`：教师对 ProposedAction 的批准、拒绝或退回事件；
- `ExecutionReceipt`：课程、单元、活动级执行结果、对象版本和错误信息；
- `EvaluationEvent`：关联 Run、Context、方案版本、意见、审批和回执的评价事件。

### 6. 方案包和版本规则

- 初始生成稿只能进入待审教，不能直接保存；
- 人工修改和 AI 定向修改都产生新版本，不覆盖旧版本；
- 每个版本保留来源 ContextSnapshot、修改原因和结构化 Diff；
- 最终确认稿必须有教师明确确认记录；
- 最终确认稿不等于正式发布稿；第一版只模拟保存草稿。

### 7. 审教规则

- 审教颗粒度固定为整体方案、单元、活动三级，第一版不支持 PPT 单页审教；
- 每条意见必须绑定目标类型、目标 ID、严重程度、文本、创建时间和状态；
- 阻断性意见未进入 `verified` 或 `rejected` 时，不能通过最终校验；
- 建议性意见可以保留，但必须在确认前显式展示；
- AI 只处理教师明确选择的意见和范围；
- 教师可以人工修改、要求 AI 定向修改、接受、拒绝、延后或恢复旧版本。

### 8. 规则校验

最终确认前至少校验：

- 目标有可观察描述和成功标准；
- 课程范围、年级和课时完整；
- 单元课时合计与课程课时一致；
- 每个单元有活动；
- 课程目标可以映射到单元、活动和评价；
- 方案包含评价安排和来源依据；
- 不存在未处理的阻断性审教意见；
- Context 中的来源在当前授权范围内；
- 保存时的课程版本仍与 expectedVersion 一致。

### 9. 业务写回与 Adapter

- Application 层只依赖稳定的课程写回 Port，不依赖 Mock ClassIn 的具体实现；
- Adapter 负责读取课程范围、读取当前版本、保存课程/单元/活动草稿、报告冲突和权限结果；
- 写回结果必须支持 `saved`、`partial-success`、`conflict`、`permission-denied` 和 `recoverable-failure`；
- 任何模拟结果都必须带 `[模拟]` 或等价真值标签；
- Adapter 不拥有 WorkBuddy 方案包、审教意见或评价事件。

### 10. UI 与交互

- 默认教师路径：选择任务 → 输入目标 → 查看方案 → 审教 → 确认保存；
- 方案包工作区提供整体方案、单元/活动、依据、审教意见和版本差异的可达入口；
- 页面显示当前状态、下一步动作、真值标签、来源和风险；
- 保存前必须展示对象范围、课程版本、方案版本和可恢复性；
- 所有主要操作有文本名称、键盘焦点和稳定布局；
- 评审模式可以展示 Harness 状态、异常演示和内部 View Model，但默认教师路径隐藏内部技术术语。

## Testing Decisions

### 测试原则

- 优先验证教师可观察的业务行为和状态转换，不测试 React 组件内部实现细节；
- 以主 `Course Production Workflow Interface` 作为最高测试 seam，使用内存 Domain 和固定 Mock ClassIn Adapter；
- 每个命令都验证前置条件、状态变化、输出 View Model 和恢复路径；
- Schema 测试验证外部输入和 Adapter 输出的拒绝/接受边界；
- UI 测试验证关键教师旅程和可达操作，不依赖固定延时或模型私有事件。

### 必须覆盖的行为

- 目标不足时进入 `needs-input`，并保留已有输入；
- 目标完整时可以生成方案包初稿；
- 方案包包含目标、成功标准、课程/单元/活动、评价、资源、来源和版本；
- 整体、单元和活动三级意见可以创建并保持独立状态；
- AI 修订产生新版本，意见只进入 `applied`，不会自动 `verified`；
- 阻断性意见存在时校验失败，意见验证后可以继续；
- 最终确认必须发生在校验通过之后；
- 未审批的 ProposedAction 不能触发写回；
- Adapter 成功、冲突、权限拒绝、部分成功和可恢复失败均能生成结构化回执；
- 版本冲突不会覆盖业务事实，方案包仍可恢复；
- 页面刷新或重新进入可以通过 Run 标识恢复状态；
- EvaluationEvent 能关联目标、Context、方案版本、意见、审批和执行回执。

### 测试模块与 prior art

- Domain：新增状态、不变量、审教意见和校验规则测试；
- Contracts：新增 Zod Schema 解析和拒绝测试；
- Application Workflow：新增主 seam 的端到端命令序列测试；
- Mock Adapter：新增成功、冲突、权限拒绝、部分成功和可恢复失败测试；
- Workbench：新增关键教师旅程的浏览器验收和窄屏/桌面视觉检查；
- Harness：新增 Context、Control 和 Evaluation 事件关联测试。

当前仓库已有 `lint`、`typecheck`、`check:architecture` 和 workspace build 检查，但还没有成熟的业务行为测试或浏览器 E2E prior art。本 Feature 应建立第一套业务工作流测试模式，并保持测试通过后再扩展下一条切片。

## Out of Scope

- 具体 PPT 文件生成、页面级排版、模板系统和多媒体素材制作；
- PPT 单页审教和课件 Artifact 的独立版本链；
- 真实 ClassIn API、认证、限流、正式发布和生产权限系统；
- 真实学生学习判断、成绩、作业提交和消息外发；
- 多教师协作、负责人审批、跨机构批量生产和跨天调度；
- A2A 网络、第三方插件市场和供应商特定 Agent SDK；
- 在产品 Spec 阶段锁定模型、Prompt、数据库、Durable Runtime 或消息协议；
- PRD 专项模板、外部 issue tracker 发布、`to-tickets` 拆票和代码实现；这些动作在本 Spec 通过产品审阅后执行。

## Further Notes

### 当前审阅重点

请优先检查以下内容：

1. `Course Production Workflow Interface` 是否是合适的最高测试 seam；
2. `review → revising → revised → validating → confirmed` 的状态粒度是否足够；
3. 审教意见 `accepted`、`applied`、`verified`、`rejected`、`deferred` 的业务含义是否准确；
4. 规则校验的阻断条件是否完整，是否存在不应阻断的条件；
5. 课程、单元、活动的写回回执是否需要更细的对象级动作；
6. 第一版是否需要把“保存审批”和“模拟执行”拆成两个独立的用户界面步骤；
7. 当前测试范围是否足以支撑下一步 tickets 的垂直切片。

### 相关事实源

- 整体产品方案：七个产品设计层次、四图三表、版本边界和阶段顺序；
- 第一版详细产品设计：教师流程、对象关系、审教规则和验收；
- 交互与状态原型：三条可操作场景和状态转换的可视化验证；
- 纵向切片 Spec：第一版交付物、领域对象、范围和产品验收。

### 下一步

本 Spec 由用户审阅后，再执行：

```text
Feature Spec 审阅通过
→ /to-tickets：拆成垂直 tracer-bullet tickets
→ tickets 批准
→ /implement：按 ticket 实施、验证、代码评审和提交
```
