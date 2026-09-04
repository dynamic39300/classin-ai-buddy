---
title: ClassIn IM Pilot-0 中性标注手册
status: SUPERSEDED_DO_NOT_USE
version: v0.1
date: 2026-08-29
---

# ClassIn IM Pilot-0 中性标注手册

> **撤回通知（2026-08-29，2026-08-30 更新）**：本手册虽然禁止直接显示 Round 0 标签，但仍预先给出了主题、任务与群用途分类，不满足“从零开放编码”的净室要求。它仅保留为方法修正审计轨迹，不得用于标注、建表或培训。当前有效入口为 [Topic Pilot 50](./TOPIC-PILOT50-HUMAN-ANNOTATION-GUIDE-V1.md)。

## 1. Pilot-0 只验证判断方法

标注者要回答的是“文本和可见上下文实际表达了什么”，不是“应该做什么产品”。标注界面不得出现 Round 0 主题、方案一/二/三、AI Feature、优先级或机会评分。

### 四条硬规则

1. **没有证据就选未知**，不从措辞、头像、姓名或学科内容猜身份；
2. **回复不等于解决**，只有明确结果证据才标结束；
3. **表达不等于任务**，“今天题目真难”默认是表达，除非上下文出现明确求助或行动；
4. **发言者构成不等于群成员或群用途**，仅教师发言不能自动判为管理群。

## 2. 标注层级

| 层级 | 对象 | 主要字段 |
| --- | --- | --- |
| 样本级 | 一个导出窗口中的固定核心片段与上下文 | 上下文充分性、关系证据、群用途、数据异常 |
| 消息级 | 核心20行中的每条消息 | 表层行为、对象、请求、任务存在性、置信度 |
| 事件级 | 核心片段中围绕同一事项的连续沟通 | 生命周期、责任、摩擦、结果证据 |

上下文行只用于理解，不进入消息级统计；若上下文行启动或结束了事件，应把核心消息标记为 `context_partial`。

## 3. 样本级字段

### 3.1 上下文充分性 `context_sufficiency`

| 值 | 定义 |
| --- | --- |
| `sufficient` | 仅凭当前片段可以稳定判断核心消息的表层行为与主要对象 |
| `partial` | 大部分可判断，但至少一个关键事件缺开头、对象或结尾 |
| `insufficient` | 多数核心消息依赖不可见上下文，不能稳定标注 |

### 3.2 参与关系 `relationship_evidence`

| 值 | 使用条件 |
| --- | --- |
| `direct_relationship_unknown` | 所有单聊默认值；没有独立字段不能升级 |
| `group_roles_observed` | 群聊只记录窗口内导出角色，不推断成员全貌 |
| `relationship_explicit_in_text` | 文本中明确说出关系，但仍记录为文本证据，不替代系统事实 |
| `cannot_determine` | 其他情况 |

### 3.3 群用途 `group_purpose`

群聊必填，单聊为 `not_applicable`：

| 值 | 最小证据 |
| --- | --- |
| `teaching_learning_class` | 多条内容围绕具体学生、班级教学、课堂、作业或学习反馈，并有师生互动证据 |
| `teaching_operations_management` | 多条内容围绕排课、教务、教师协调、班务运营等，且交谈对象/责任明显是教职工协作 |
| `learner_peer_communication` | 核心以学生间交流为主，未观察到教职工协作 |
| `mixed` | 两类以上用途都具有清晰、持续证据 |
| `other` | 明确属于其他用途 |
| `cannot_determine` | 证据不足、上下文截断或仅凭发言角色无法判断 |

仅教师/班主任发言是“需要重点检查”的样本条件，不是 `teaching_operations_management` 的充分条件。

## 4. 消息级字段

### 4.1 表层沟通行为 `surface_act_primary`

每条核心消息选择一个主行为；必要时填一个次行为。

| 值 | 定义 | 例子 |
| --- | --- | --- |
| `inform` | 告知事实、状态或安排 | “明天下午三点上课” |
| `ask_information` | 请求信息或解释 | “作业什么时候交？” |
| `request_action` | 要求对方执行行动 | “请把文件发到群里” |
| `submit_or_share` | 提交答案、材料、文件或内容 | “这是我的作业” |
| `confirm_or_ack` | 确认、收到、同意或拒绝 | “收到” |
| `correct_or_clarify` | 更正、澄清或补充 | “不是周三，是周四” |
| `remind_or_follow_up` | 催办、提醒、追问进度 | “还有谁没交？” |
| `feedback_or_evaluate` | 对表现、结果或质量给出反馈 | “第二题思路对了” |
| `express_feeling_or_opinion` | 表达感受、态度、吐槽 | “今天题目真难” |
| `social_or_relational` | 问候、感谢、鼓励、维系关系 | “老师辛苦了” |
| `share_content_without_request` | 粘贴长文、资料、链接但没有明确请求 | 转发文章 |
| `attention_call` | “在吗”“老师”等呼叫注意 | 尚未形成具体任务 |
| `other` | 明确行为但不在以上类别 |
| `cannot_determine` | 内容缺失、纯符号或上下文不足 |

### 4.2 沟通对象 `object_tags`

可多选，但只标文本或上下文明确出现的对象：

- `course_or_class`
- `schedule_or_entry`
- `assignment`
- `assessment_or_score`
- `knowledge_or_question`
- `material_or_file`
- `attendance_or_leave`
- `learning_progress`
- `people_or_relationship`
- `account_or_technical`
- `payment_or_commercial`
- `teaching_operations`
- `other_object`
- `no_clear_object`
- `cannot_determine`

对象标签不等于需求标签。“题目”可以是 `knowledge_or_question`，但若只是感叹，不代表求助或学习任务。

### 4.3 明确请求 `explicit_request`

| 值 | 定义 |
| --- | --- |
| `yes_information` | 明确请求信息、解释或答案 |
| `yes_action` | 明确请求对方完成行动 |
| `yes_both` | 同时包含信息与行动请求 |
| `no` | 没有明确请求 |
| `cannot_determine` | 文本不完整或依赖不可见上下文 |

疑问号不是充分条件；反问、感叹和引用题目可能没有请求。

### 4.4 任务存在性 `task_presence`

| 值 | 定义 |
| --- | --- |
| `explicit_task` | 有明确待完成事项、责任或预期结果 |
| `task_in_progress` | 正在补充、执行、确认或跟进已知事项 |
| `possible_task_needs_context` | 可能涉及任务，但当前证据不足 |
| `expression_only` | 只有感受/意见，没有行动请求或待办 |
| `social_only` | 只有关系互动 |
| `no_task` | 明确没有任务，且不属于表达/社交专类 |
| `cannot_determine` | 内容缺失或无法理解 |

## 5. 事件级字段

核心20行内，围绕同一对象与预期结果的连续消息可分配本地 `event_id`。不要跨样本合并。

### 5.1 生命周期 `lifecycle_stage`

- `initiation`
- `clarification`
- `commitment_or_assignment`
- `execution_evidence`
- `result_or_feedback`
- `closure`
- `suspended_or_unresolved`
- `not_applicable`
- `cannot_determine`

### 5.2 结果证据 `outcome_evidence`

| 值 | 证据要求 |
| --- | --- |
| `explicitly_completed` | 明确说已完成、已收到目标结果或可验证产物出现 |
| `explicitly_not_completed` | 明确说未完成、失败或仍阻塞 |
| `partial_progress` | 有中间进展但没有最终结果 |
| `reply_only_no_result` | 有回应，但没有解决/完成证据 |
| `no_outcome_visible` | 核心和上下文均未出现结果 |
| `context_insufficient` | 结果可能在窗口外，不能判断 |

### 5.3 可观察摩擦 `friction_tags`

只能标片段中直接观察到的行为：

- `missing_information`
- `repeated_question_or_notice`
- `follow_up_or_chasing`
- `contradiction_or_correction`
- `misunderstanding`
- `search_or_retrieval_difficulty`
- `cross_page_or_external_channel`
- `access_or_technical_failure`
- `responsibility_unclear`
- `emotional_tension`
- `no_observed_friction`
- `cannot_determine`

“回复很晚”必须有可比较时间与情境证据；不能只因跨天就推断延迟或体验差。

## 6. 敏感性与置信度

### 6.1 敏感性 `sensitivity_tags`

- `identity_or_contact`
- `academic_record`
- `health_or_leave_reason`
- `family_or_financial`
- `account_or_security`
- `conflict_or_discipline`
- `other_sensitive`
- `none_observed`

标注表中只记类别，不复制敏感内容。

### 6.2 置信度 `annotation_confidence`

| 值 | 定义 |
| --- | --- |
| `high` | 文本直接表达，无需推断 |
| `medium` | 结合可见上下文可判断，但存在另一合理解释 |
| `low` | 证据弱，只能暂定 |
| `cannot_determine` | 不给猜测性标签 |

## 7. 必须统一处理的边界例

| Case | 正确处理 | 禁止处理 |
| --- | --- | --- |
| “今天题目真难” | `express_feeling_or_opinion`；有上下文时可标对象；`explicit_request=no` | 自动标为求助、学习任务或AI解题需求 |
| “老师在吗” | `attention_call`；若后续有问题可归入同一事件 | 单独标为知识答疑 |
| “收到” | `confirm_or_ack`，通常是任务进行中或社交确认 | 当作问题已解决 |
| 一段课程模板/小说 | `share_content_without_request`；标长文本 | 因学科词多而拆成多个教学需求 |
| 教师群里讨论请假 | 先判断是教职工排班还是学生请假；证据不足选未知 | 看见“请假”就标学生考勤需求 |
| 仅教师发言 | 记录观察角色；根据内容判断群用途 | 自动判教学管理群 |
| 表情/“哈哈” | `express`或`social`；无任务 | 自动标反馈激励需求 |
| 显式回复引用 | 记录回复关系 | 自动标理解、解决或学习发生 |

## 8. 双人标注与仲裁

1. 标注者 A/B 使用独立工作表，不能看到彼此结果；
2. 先完成样本级判断，再做核心20行消息级标注，最后切分事件；
3. 旧规则标签与产品方案不进入工作簿；
4. 对 `group_purpose`、`surface_act_primary`、`explicit_request`、`task_presence`、`outcome_evidence` 分字段计算一致性；
5. 分歧表保留 A、B 原值、仲裁值、分歧原因和是否修改手册；
6. 仲裁不是删除分歧，而是形成下一版规则证据。

## 9. Pilot-0 质量 Gate

- 24/24 样本均有读取、损失或撤回状态；
- 核心480行没有静默丢失；
- ≥90%的样本达到 `sufficient` 或 `partial`；
- 主字段原始一致率目标≥80%，同时报告 Cohen's kappa；样本小导致 kappa 不稳定时不单独以阈值裁决；
- 所有单聊保持关系未知，除非有独立字段证据；
- 所有低置信或上下文不足项可以合法选择未知；
- 若一个核心概念在仲裁后仍无法形成稳定边界，P3正式样本中移除或重构该字段。
