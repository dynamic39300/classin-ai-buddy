---
title: 课程目标到课程对象第一版产品设计附图
status: D1 product design baseline
truth: SIMULATED
version: v0.1
date: 2026-08-19
---

# 课程目标到课程对象第一版产品设计附图

主文档：[课程目标到课程对象第一版产品设计](./PRODUCT-DESIGN.md)

## D1. 第一版业务闭环图

第一版的交付终点是可审教课程方案包，不是 PPT 文件。

```mermaid
flowchart LR
  A[教师目标与约束] --> B[范围与成功标准确认]
  B --> C[授权上下文与知识依据]
  C --> D[可审教课程方案包初稿]
  D --> E[教师整体审教]
  E --> F[单元/活动审教]
  F --> G[审教意见]
  G --> H{处理方式}
  H -->|人工修改| I[方案包新版本]
  H -->|AI 定向修改| I
  H -->|接受/拒绝意见| J[意见状态更新]
  I --> K[再次审教]
  K --> G
  J --> L{阻断性问题是否清零}
  L -->|否| G
  L -->|是| M[规则校验]
  M -->|不通过| G
  M -->|通过| N[最终确认稿]
  N --> O[待确认保存动作]
  O --> P[教师审批]
  P --> Q[保存课程/单元/活动草稿]
  Q --> R[执行回执]
  R --> S[复查与评价事件]
```

## D2. 教师体验与状态图

```mermaid
stateDiagram-v2
  [*] --> 空白
  空白 --> 需要补充: 提交目标
  空白 --> 生成中: 输入满足最低条件
  需要补充 --> 生成中: 补充范围/目标/课时
  生成中 --> 待审教: 方案包初稿完成
  生成中 --> 可恢复失败: 读取或生成失败
  可恢复失败 --> 生成中: 重试或调整范围
  待审教 --> 审教中: 开始整体审教
  审教中 --> 待修订: 提交审教意见
  审教中 --> 待最终确认: 没有新增阻断问题
  待修订 --> 编辑中: 人工修改
  待修订 --> 修订中: 要求 AI 定向修改
  编辑中 --> 待再次审教: 保存新版本
  修订中 --> 待再次审教: 生成新版本
  待再次审教 --> 审教中: 查看差异并再次审教
  待最终确认 --> 待校验: 发起最终确认
  待校验 --> 待最终确认: 阻断项未清零
  待校验 --> 已确认: 规则通过且教师确认
  已确认 --> 待审批: 准备保存
  待审批 --> 执行中: 教师批准
  待审批 --> 待审教: 退回修订
  执行中 --> 已完成: 全部保存成功
  执行中 --> 部分成功: 部分对象成功
  执行中 --> 可恢复失败: 临时失败
  部分成功 --> 待复查: 查看逐项回执
  已完成 --> 待复查: 查看回执和后续工作
  待复查 --> [*]
```

## D3. 对象与证据关系图

```mermaid
flowchart TB
  T[教师目标/约束] --> I[GoalIntentDraft]
  Scope[机构/教师/班级课程范围] --> C[ContextSnapshot]
  Knowledge[课程标准/教学法/机构规范] --> C
  Course[课程/单元/活动正式事实] --> C
  I --> P[课程方案包生成与修订]
  C --> P
  P --> A1[ArtifactDraft v1 可审教课程方案包]
  A1 --> Review[ReviewComment 审教意见]
  Review --> A2[ArtifactDraft v2... 修订版本]
  A2 --> Diff[版本差异与意见处理状态]
  Diff --> Confirm[最终确认稿]
  Confirm --> Action[ProposedAction]
  Action --> Policy[策略/权限/领域校验]
  Policy --> Adapter[ClassIn Adapter]
  Adapter --> Receipt[ExecutionReceipt]
  Receipt --> Formal[课程/单元/活动草稿]
  Receipt --> Eval[EvaluationEvent]
  Eval --> Next[复查提示与下一轮调整]
```

第一版不包含 `PPT 课件 Artifact`。第二版新增一条派生关系：`最终确认课程方案包版本 → PPT 课件 Artifact 初稿`，并保留来源版本引用。

## D4. 页面与信息架构图

```mermaid
flowchart TB
  Shell[统一 WorkBuddy 工作台]
  Shell --> Goal[目标与范围区]
  Shell --> Evidence[上下文与依据区]
  Shell --> Plan[计划与进度区]
  Shell --> Package[课程方案包工作区]
  Package --> Overview[整体方案视图]
  Package --> Units[单元与课时/活动视图]
  Package --> Review[审教意见区]
  Package --> Versions[版本与差异区]
  Shell --> Validation[规则校验与风险区]
  Shell --> Control[最终确认与保存区]
  Shell --> Receipt[回执与复查区]
```

页面职责：

- 对话区域负责目标协调和补充信息；
- 方案包工作区负责阅读、编辑和审教；
- 依据区域负责来源、版本和缺口；
- 版本区域负责差异和意见处理；
- 控制区域负责最终确认、审批和写回风险；
- 回执区域负责真实执行结果和后续复查。
