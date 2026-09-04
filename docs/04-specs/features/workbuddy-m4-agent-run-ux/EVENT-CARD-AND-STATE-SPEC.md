---
title: WorkBuddy M4.1 Agent Run 事件、卡片与状态规格
status: REVIEWED_APPROVED
version: v0.2
date: 2026-08-21
---

# WorkBuddy M4.1 Agent Run 事件、卡片与状态规格

## 1. 目的

本文件定义 Conversation Timeline 的可观察事件语言。事件不是动画脚本，也不是模型思维链；它们是教师可以理解、可以恢复、可以采取行动的 Run 事实投影。

## 2. 事件 Envelope

每个事件至少包含：

| 字段 | 说明 |
| --- | --- |
| `eventId` | 稳定唯一 ID |
| `runRef` | 所属 Run |
| `sequence` | Run 内严格递增顺序 |
| `kind` | 事件种类 |
| `state` | 当前可观察状态 |
| `occurredAt` | 业务发生时间 |
| `updatedAt` | 可更新卡片的最近时间 |
| `actor` | teacher / agent / skill / tool / system |
| `stepRef` | 所属计划步骤，可空 |
| `objectRefs` | Snapshot、Artifact、Action、Approval 或 Receipt 引用 |
| `summary` | 教师可理解摘要 |
| `allowedCommands` | 当前允许的教师命令 |

事件内容使用判别联合，不允许同一事件同时处于 `completed` 和 `requires_input` 等矛盾状态。

## 3. 事件种类

| kind | 主体 | 默认表达 | 是否可更新 |
| --- | --- | --- | --- |
| `teacher_goal` | teacher | 教师消息 | 否 |
| `agent_understanding` | agent | 目标理解消息 | 从 streaming 更新为 complete |
| `clarification_request` | agent | 补参说明 + 结构化卡 | 是 |
| `context_proposal` | system | Context 摘要卡 | 是 |
| `context_snapshot` | system | 已确认 Snapshot 摘要 | 否 |
| `plan_proposed` | agent | Plan 卡 | 是 |
| `plan_revised` | agent | 新 Plan + 旧版引用 | 否 |
| `step_progress` | agent | 可更新步骤行 | 是 |
| `capability_call` | skill/tool | 调用卡 | 是 |
| `stage_result` | agent | 阶段结果卡 | 否 |
| `artifact_ready` | system | Artifact 卡 | 否 |
| `artifact_revised` | system | 新版本/Diff 卡 | 否 |
| `action_proposed` | system | ProposedAction 卡 | 是 |
| `approval_recorded` | teacher/system | 审批结果摘要 | 否 |
| `execution_progress` | system | 写回执行状态 | 是 |
| `execution_receipt` | system | Receipt 卡 | 否 |
| `replanning_required` | system | 影响分析卡 | 是 |
| `run_stopped` | system | 停止结果 | 否 |
| `run_summary` | agent | 完成/部分完成总结 | 否 |

## 4. 共通状态

| 状态 | 语义 | 允许的典型命令 |
| --- | --- | --- |
| `queued` | 已创建，等待开始 | cancel |
| `streaming` | 正在形成可见摘要 | stop |
| `running` | 正在执行 | stop, append_constraint |
| `requires_input` | 等待教师补参 | submit_clarification, cancel |
| `requires_confirmation` | 等待教师确认 | approve, revise, cancel |
| `completed` | 本事件完成 | open, inspect |
| `failed_recoverable` | 可恢复失败 | retry, change_strategy, add_input |
| `failed_terminal` | 当前 Run 无法继续 | save_draft, create_related_run |
| `stopping` | 正在停止 | 无重复 stop |
| `stopped` | 已停止 | resume, create_related_run |
| `superseded` | 被新 Snapshot/Plan/版本替代 | inspect_old, compare |
| `skipped` | 经规则或教师决定跳过 | inspect_reason |

`completed` 只描述该事件或步骤完成，不自动代表整个 Run、Artifact 复查或业务写回完成。

## 5. 卡片规格

### 5.1 目标理解消息

显示：

- 任务目标；
- 教学范围；
- 交付物；
- 已知 Context；
- 关键缺口；
- 下一步。

不显示：模型隐藏推理、Token、模型路由、系统 Prompt、原始日志。

### 5.2 结构化补参卡

字段：

- `questionId`、标题、说明；
- 字段类型和选项；
- required/optional；
- 默认值来源；
- 已回答值；
- 校验错误；
- 其他、跳过和提交动作。

状态：

```text
open → validating → submitted
open → cancelled
validating → open(error)
submitted → superseded(replanning)
```

提交后不从 Timeline 消失，冻结为一行“您已确认：教材版本…、课时…”，可展开查看原字段。

### 5.3 Context 摘要卡

显示最多四个高价值对象和 `+N`：班级、课程、单元/主题、关键资料。卡片提供“查看/调整上下文”和“确认并生成计划”。层级冲突时不允许确认，并显示具体问题节点。

### 5.4 Plan 卡

Plan 顶部显示目标摘要和预期交付。步骤行包含：

- 顺序/依赖；
- 教师可理解标题；
- 预期输出；
- 能力名称；
- 是否需要教师确认；
- 预计状态。

计划确认后卡片保留并转为进度容器；不另生成一份内容不同的静态计划。

### 5.5 Capability Call 卡

默认层：

```text
✓ 已调用「教学目标结构化」  8 秒
  形成 3 条课件目标与 1 份结构建议
```

展开层：

- 调用目的；
- 输入项摘要；
- 使用的 Context Projection；
- 输出摘要；
- 状态、耗时和错误；
- 重试/换策略等允许命令。

技术证据层仅在明确入口后显示：Capability ID、版本、调用 ID、Schema 摘要。不得展示 Secret、完整学生敏感信息、绝对路径、环境变量和大段原始 JSON。

### 5.6 Artifact 卡

字段：

- 类型图标、标题；
- Artifact ID 的非技术展示名；
- 版本；
- 来源步骤；
- 验证状态与摘要；
- 打开产出、全局只读预览、下载、使用专业编辑器打开；
- 未读/新版本状态。

Artifact 卡和右侧预览均不承载编辑器或 AI 改写输入。文档修改通过第三方专业编辑器完成；第三方连接未落地时只展示明确的未接入反馈，不产生虚假的 `artifact_revised` 事件。

### 5.7 ProposedAction 卡

字段：

- 动作；
- 目标；
- 差异；
- 影响；
- 来源 Artifact；
- 权限；
- 风险和可逆性；
- 有效期；
- `查看详情 / 修改目标 / 确认执行 / 取消`。

Action 卡状态：

```text
proposed → approved → executing → receipt
proposed → rejected
proposed → expired → renewed proposal
approved → expired before execution
```

### 5.8 Approval 窗口

适用：业务写回、批量对象、不可逆或高风险动作。

窗口必须显示对象级候选和勾选状态。取消只关闭窗口，不拒绝 Action；明确“取消本次操作”才记录 rejected。批准完成后焦点回到 Action 卡，并出现“已确认，正在执行”。

### 5.9 Receipt 卡

成功字段：对象、版本、时间、结果、返回入口。

失败字段：状态、未执行范围、错误说明、恢复方式、是否安全重试。

方案包显示对象级表格：

| 产物 | 结果 | 是否执行 | 恢复 |
| --- | --- | --- | --- |
| 课件 | succeeded | 已执行 | 打开对象 |
| 作业 | failed | 未成功 | 修改后重试 |
| 测验 | not_executed | 未执行 | 重新选择 |
| 录播脚本 | waiting | 等待依赖 | 依赖完成后继续 |

## 6. 事件更新与折叠

- `streaming/running` 事件可以原位更新，完成后冻结；
- 不为每个进度 Token 新增一条消息；
- 同一步骤的连续日志聚合到一个 Process Group；
- 失败和教师确认必须保留独立事件，不能被后续成功覆盖；
- 旧 Plan、Snapshot、Artifact、Action 和 Receipt 进入 superseded 区，但保持原时间顺序；
- 默认折叠已完成的低层调用，当前步骤和待处理事件展开。

## 7. 通知与可访问性

- `aria-live=polite` 只播报高价值状态：需要补充、计划已准备、产物已生成、需要审批、执行完成/失败；
- 高频进度不逐条播报；
- 每秒变化的剩余时间属于视觉进度提示，使用 `aria-hidden` 避免读屏器重复播报；稳定的“正在准备 / 执行中 / 正在执行”状态文字继续进入状态语义；
- 状态图标包含可见文字；
- 折叠卡使用真实 button 和 `aria-expanded`；
- Timeline 使用语义列表，顺序与视觉顺序一致；
- 事件原位更新不能让键盘焦点丢失。

## 8. 恢复与幂等

- 刷新后按 `runRef + cursor` 恢复事件；
- 同一 `eventId` 更新而不是重复追加；
- 同一 `TeacherCommand` 有 command ID；重复提交只返回同一 CommandReceipt；
- Action、Approval 和 Receipt 的归属校验先于缓存重放；
- Event Stream 重连不会重新执行 Tool 或写回动作；
- 确定性 Experience Adapter 与未来真实 Runtime Adapter 必须通过相同事件契约测试。

## 9. 禁止状态

- 补参未提交但 Plan 已进入 confirmed；
- Snapshot 未确认但 Process 已开始；
- Artifact 未生成却出现保存 Action；
- Action 未批准却出现执行中；
- Approval 已拒绝仍产生成功 Receipt；
- Receipt 成功却没有实际对象引用；
- 方案包显示整体完成但仍有 failed/waiting 项；
- Replanning 后旧 Plan 继续显示为当前计划；
- UI 动画结束直接宣告业务完成。

## 10. 验收测试表面

浏览器测试只通过公开 Interface 和可访问文本验证：

1. Goal 后按顺序出现理解、补参、Context、Plan；
2. 确认 Plan 后至少一个步骤经历 running → completed；
3. Capability Call 可展开并看到输入/输出摘要；
4. Artifact 出现在 Timeline 且右侧产出可打开；
5. Approval 前不存在“已保存”；
6. Receipt 到达后才显示实际对象结果；
7. 中途刷新不重复 Tool、Action 或 Receipt；
8. 失败、停止、Replanning 与部分成功各有稳定恢复路径。
