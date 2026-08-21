---
title: 课程目标到课程对象第一版产品设计附表
status: D1 product design baseline
truth: SIMULATED
version: v0.1
date: 2026-08-19
---

# 课程目标到课程对象第一版产品设计附表

主文档：[课程目标到课程对象第一版产品设计](./PRODUCT-DESIGN.md)

## T1. AI 编排步骤表

| 步骤 ID | 业务步骤 | 输入事实/证据 | Skill / Tool / 规则 | 输出/版本 | 教师控制点 | 校验与降级 |
| --- | --- | --- | --- | --- | --- | --- |
| STEP-01 | 输入目标与范围 | 原始目标、年级、课时、班级课程范围 | 必填检查、目标澄清 Skill | `GoalIntentDraft` 或 `needs-input` | 补充或修改目标 | 缺目标/范围则停留在 `needs-input` |
| STEP-02 | 构建依据 | 教师身份、课程结构、课程标准、教学法、机构规范 | Context 读取、Knowledge 检索 | `ContextSnapshot` | 查看来源和授权范围 | 未授权资料不进入方案包 |
| STEP-03 | 生成方案包初稿 | 已确认目标、课时、课程结构和知识引用 | 课程结构生成 Skill | `ArtifactDraft v1` | 查看整体方案 | 目标覆盖、课时和结构完整性检查 |
| STEP-04 | 整体方案审教 | `ArtifactDraft v1`、来源、成功标准 | 审教工作区 | `ReviewComment[]` | 标记问题、严重程度和位置 | 关键问题必须说明依据 |
| STEP-05 | 单元/活动审教 | 当前方案版本、目标映射、评价安排 | 结构化审教规则 | 补充意见、意见状态 | 可按单元/活动定位 | 不支持 PPT 单页审教 |
| STEP-06 | 处理审教意见 | 未解决意见、教师选择的处理方式 | 人工编辑或方案包修订 Skill | `ArtifactDraft v2...`、Diff | 选择人工修改或 AI 定向修改 | AI 只处理指定范围，失败保留原版本 |
| STEP-07 | 再次审教 | 修订版本、差异、意见处理状态 | 版本比较、意见校验 | 已验证/未解决意见 | 重新确认是否解决 | 新版本不能自动关闭意见 |
| STEP-08 | 规则校验 | 当前方案包、目标、课时、来源和意见 | 课程完整性规则 | `ValidationReport` | 查看阻断项并返回修订 | 阻断项存在则不能最终确认 |
| STEP-09 | 最终确认 | 通过校验的方案包、未解决非阻断项 | 教师确认流程 | `FinalConfirmedArtifact` | 明确确认最终版本 | 最终确认稿不等于正式发布稿 |
| STEP-10 | 准备保存动作 | 最终确认稿、目标对象、expectedVersion | ProposedAction 生成、权限策略 | `ProposedAction`、风险和差异 | 查看范围、版本和风险 | 版本变化或权限不足则阻止执行 |
| STEP-11 | 审批与模拟写回 | ProposedAction、教师 Approval | 审批、领域校验、Mock Adapter | `ExecutionReceipt` | 批准、拒绝或退回 | saved/conflict/partial/permission-denied/recoverable-failure |
| STEP-12 | 结果复查 | 回执、教师操作、方案版本 | Evaluation 记录 | `EvaluationEvent`、复查提示 | 查看保存结果和后续工作 | 不把生成成功当业务成功 |

## T2. 对象、权限与动作表

| ID | 对象/动作 | 类型 | 事实所有者 | WorkBuddy 权限 | 教师权限 | 审教/确认 | 副作用 | 写回/回执 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OBJ-01 | 教师目标 | 教师输入/任务事实 | 教师 + WorkBuddy Run | 读取、整理、版本化 | 编辑、确认 | 目标确认 | 否 | 无 |
| OBJ-02 | 课程范围 | 业务事实 | ClassIn 领域 | 受授权读取 | 选择可用范围 | 开始前确认 | 否 | 读取回执 |
| OBJ-03 | 课程/单元/活动 | 正式业务对象 | ClassIn 领域 | 只读投影、提出草稿动作 | 依领域权限编辑正式对象 | 保存前确认 | 是 | ClassIn Adapter 回执 |
| OBJ-04 | ContextSnapshot | WorkBuddy 引用 | Context Engine | 创建、查看来源和版本 | 查看授权范围 | 不需要逐项审批 | 否 | 无 |
| OBJ-05 | 可审教课程方案包 | ArtifactDraft | WorkBuddy Artifact Module | 创建、编辑、比较、恢复 | 编辑和审教 | 最终确认前可修改 | 否 | 方案包版本事件 |
| OBJ-06 | ReviewComment | 教师审教记录 | WorkBuddy Artifact Module | 记录、关联版本、统计状态 | 创建、修改、接受、拒绝、延后 | 教师明确处理 | 否 | 评价事件 |
| OBJ-07 | 方案包修订版本 | ArtifactDraft version | WorkBuddy Artifact Module | 创建差异、保留来源 | 选择版本、恢复旧版本 | 再次审教 | 否 | 版本事件 |
| OBJ-08 | 规则校验报告 | 判断/约束结果 | Product Rule + Domain Rule | 展示阻断项和警告 | 查看、修订后重跑 | 最终确认前必须通过阻断项 | 否 | 校验事件 |
| OBJ-09 | 最终确认稿 | ArtifactDraft 状态 | WorkBuddy Artifact Module | 标记确认状态 | 明确确认或退回 | 必须教师确认 | 否 | ConfirmationEvent |
| OBJ-10 | ProposedAction | 待确认动作 | WorkBuddy Control | 生成、展示范围/风险/版本 | 查看、批准、拒绝 | 必须审批 | 是 | 待执行动作 |
| OBJ-11 | Approval | 控制事件 | WorkBuddy Control | 记录审批范围和时间 | 批准、拒绝、撤回 | 教师审批 | 允许执行 | 审批事件 |
| OBJ-12 | ExecutionReceipt | 执行证据 | ClassIn Adapter + Control | 展示逐项结果 | 查看、处理失败项 | 不由模型决定 | 已发生 | saved/conflict/partial/permission-denied |
| OBJ-13 | PPT 课件 Artifact | 第二版产物 | WorkBuddy Artifact Module | 第二版才创建 | 第二版审教 | 第二版确认 | 第二版另行定义 | 第二版课件回执 |

## T3. 状态、异常与评价表

| ID | 状态/异常 | 进入条件 | 教师看到什么 | 可执行操作 | 下一状态 | 业务验收指标 | 真值 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| STATE-01 | 空白 | 尚未输入目标 | 任务说明和开始入口 | 开始、退出 | 需要补充/生成中 | 开始率 | SIMULATED |
| STATE-02 | 需要补充 | 目标、范围或课时不足 | 缺少什么、为什么需要 | 补充、取消 | 生成中/空白 | 缺口澄清完成率 | SIMULATED |
| STATE-03 | 生成中 | 输入已确认 | 当前步骤和预计下一步 | 等待、取消 | 待审教/可恢复失败 | 生成完成率、延迟 | SIMULATED |
| STATE-04 | 待审教 | 方案包初稿生成 | 方案包结构、依据和版本 | 开始审教、返回目标 | 审教中 | 初稿打开率 | SIMULATED |
| STATE-05 | 审教中 | 教师查看方案包 | 整体/单元/活动定位和审教入口 | 标记意见、编辑 | 待修订/待最终确认 | 审教覆盖率 | SIMULATED |
| STATE-06 | 待修订 | 存在意见 | 意见位置、严重程度、处理状态 | 人工修改、AI 定向修改、接受/拒绝 | 编辑中/修订中 | 意见处理率 | SIMULATED |
| STATE-07 | 待再次审教 | 新版本完成 | 版本差异和未解决意见 | 再次审教、恢复旧版 | 审教中 | 审教轮次、修改距离 | SIMULATED |
| STATE-08 | 待最终确认 | 阻断项清零 | 校验结果、非阻断警告和最终确认按钮 | 确认、退回 | 待校验/已确认 | 最终确认率 | SIMULATED |
| STATE-09 | 可恢复失败 | 生成、读取或修订失败 | 失败原因和保留内容 | 重试、缩小范围、继续编辑 | 生成中/编辑中 | 恢复成功率 | SIMULATED |
| STATE-10 | 待审批 | 最终确认稿就绪 | 保存对象、版本、风险、模拟标签 | 批准、拒绝、退回 | 执行中/待审教 | 审批完成率 | SIMULATED |
| STATE-11 | 执行中 | Approval 已通过 | 保存进度和对象范围 | 等待、取消（若支持） | 已完成/部分成功/失败 | 执行延迟 | SIMULATED |
| STATE-12 | 版本冲突 | expectedVersion 不匹配 | 当前版本变化和不覆盖说明 | 查看差异、重新生成动作 | 待审教/待审批 | 冲突正确拦截率 | SIMULATED |
| STATE-13 | 权限拒绝 | Adapter 拒绝范围 | 无法保存原因和替代范围 | 继续编辑、换范围 | 待审教/结束 | 权限误报率 | SIMULATED |
| STATE-14 | 部分成功 | 部分对象写回成功 | 逐项成功/失败回执 | 继续处理失败项 | 待复查 | 部分结果正确展示率 | SIMULATED |
| STATE-15 | 已完成待复查 | 执行成功 | 回执、对象版本和后续提示 | 查看、继续完善 | 复查完成 | 回执可追溯率 | SIMULATED |

### 指标定义

- `意见解决率`：进入新版本后被教师标记为 `verified` 的意见数 / 本轮有效意见数；
- `修改距离`：教师人工修改和 AI 修订相对于上一版本的结构化差异量；
- `最终确认率`：进入审教的方案包中被教师明确确认的比例；
- `方案后续使用率`：最终确认方案包在后续课程、活动或第二版 PPT 生产中被继续使用的比例；
- `业务成功`：至少同时具备教师最终确认和 Adapter 执行回执，不以模型返回成功替代。
