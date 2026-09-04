# Taxonomy v2.2 阶段 A+B 模型遍历接口

> 状态：`FROZEN_EXECUTION_INTERFACE / A_B_ONLY / STAGE_D_UNREAD / PREVIEW_ONLY`  
> 日期：2026-09-02  
> 适用对象：331 个阶段 A+B Topic 的 Pass 1、Pass 2 与 Pass 3 中间产物

## 1. 共同约束

- 一个窗口先完整通读按 `timeformat → raw_excel_row` 排序的 100 条消息，再判断窗口内每个 Topic；
- Topic 证据连接键为原表 `id`，不是 `msgid`；
- 旧目录路径、旧新结构继承基线不得进入 Pass 1 或 Pass 2；
- 模型只输出简洁裁决及可核查理由，不输出思维链；
- 任何结果都是迁移预览，不覆盖 A/B 人工源裁决；
- 阶段 D 不读取、不载入、不推断。

## 2. Pass 1：盲语义重建

Pass 1 只回答该 Topic 在当前完整窗口中实际表达什么，不做目录选择。每行包含：

```text
schema_version = classin-im-taxonomy-v2.2-ab-pass1/v1
shard_id
research_phase
window_id
sample_index
topic_instance_id
semantic_frame:
  core_object
  communicative_action
  goal_or_issue
  business_context
  tool_is_medium_or_goal = medium | goal | both | not_applicable | uncertain
  boundary_state = coherent | possible_split | context_insufficient
  grounding_note
decisive_evidence_message_ids[]
pass1_confidence = high | medium | low
quality_alerts[]
```

`decisive_evidence_message_ids` 必须是源 Topic 证据 ID 的非空子集。`possible_split`
仅表示源 Topic 混合了两个以上**语义主题**：其核心对象或沟通目标不同，拆开后仍会形成
不同的会话主题。以下情况本身不构成拆分理由：同类问题发生在不同人员、日期或多次事件；
同一目标下出现多个原因、步骤、案例或处理进展；措辞较宽泛。若拟议子项仍落入同一终点
节点且其核心诉求相同，默认判为 `coherent`；不得重新退回逐事件标注。

## 3. Pass 2：v2.2 盲目录路由

Pass 2 可见修正版完整窗口、Pass 1 语义框架和冻结的 v2.2 活跃节点；仍不可见旧路径或结构继承 CSV。按顺序执行：

1. 判断源 Topic 是一个连贯事项、需拆分、目录缺口还是上下文不足；
2. 连贯事项只选择 `is_terminal=true` 的 L2/L3 终点；
3. 同时核对目标节点的定义、纳入、排除和相邻边界；
4. 工具、天气、健康、扣薪、退款、补课等只作为原因或媒介时，不得夺取主要事项路径；
5. 至少给出一个最强相邻候选及其排除理由。

每行接口：

```text
schema_version = classin-im-taxonomy-v2.2-ab-pass2/v1
shard_id
research_phase
window_id
sample_index
topic_instance_id
routing:
  status = assigned | split | taxonomy_gap | context_insufficient
  target_terminal_node_id = string | null
  target_path_ids[]
  target_path_names[]
  target_evidence_status = string | null
  matched_rule_ids[]
  rejected_alternatives[] = {node_id, reason}
  decisive_evidence_message_ids[]
  rationale
  split_children[]
  residual_evidence[]
router_confidence = high | medium | low
quality_alerts[]
```

规则卡当前以数组顺序存储，`matched_rule_ids` 使用稳定合成格式：`{node_id}::include::{两位序号}`，例如 `L3-073::include::01`。

### 3.1 assigned

- 目标必须是活跃可选择终点；
- 路径、节点名和 `target_evidence_status` 必须与冻结快照精确一致；
- `decisive_evidence_message_ids` 必须是源证据非空子集；
- `matched_rule_ids` 至少一项；
- `rejected_alternatives` 至少一项。

### 3.2 split

- 只有 Pass 1 为 `possible_split` 时可选；
- 拆分单位是不同语义主题，不是不同人员、日期、单次事件、原因或处理步骤；
- 至少两个 `split_children`，ID 为 `{topic_instance_id}::SPLIT-01..N`；
- 每个子项有独立名称、描述、证据、路由与理由；
- 子项证据加 `residual_evidence` 必须完整覆盖源证据；
- 证据如被多个子项共享，必须在各子项 `overlap_evidence_ids` 和 `overlap_reason` 中显式声明；
- 100 条窗口中证据数达到 5 条为 `standard`；低于 5 条只能是 `short_candidate`，或满足既定规则的 `special_business`。

`split_children` 使用下列扁平接口；禁止另建嵌套 `routing` 对象或改用
`child_topic_instance_id / name / description / qualification` 等别名：

```text
child_proposal_id
proposed_name
proposed_description
routing_status = assigned | taxonomy_gap | context_insufficient
target_terminal_node_id = string | null
target_path_ids[]
target_path_names[]
evidence_message_ids[]
evidence_count
message_share
proposed_qualification = standard | special_business | short_candidate
overlap_evidence_ids[]
overlap_reason
rationale
```

### 3.3 taxonomy_gap / context_insufficient

两者都不填目标路径。前者表示事项清楚但冻结目录无稳定位置；后者表示当前可见上下文不足以确认事项。不能用宽泛兜底节点掩盖目录缺口。

## 4. 结构比较：模型路由之后才执行

Pass 2 完成后，程序才加载旧路径与结构继承 CSV，机械生成：

- `direct_fit / identity`；
- `direct_fit / rename_merge`；
- `direct_fit / new_assignment`；
- `remap / semantic_move`；
- `split / one_to_many`；
- `taxonomy_gap / unassigned`；
- `context_insufficient / unassigned`。

结构基线只描述旧节点与新节点关系，不得反向改写语义路由。

## 5. Pass 3：交叉独立复核

复核者不得复核自己在 Pass 2 中路由的 shard。复核输入只提供原窗口、源 Topic 证据、目标提案、最强相邻候选和 v2.2 规则卡，不提供路由者的详细理由或旧路径。每行输出：

```text
schema_version = classin-im-taxonomy-v2.2-ab-pass3/v1
reviewer_shard_id
source_shard_id
research_phase
window_id
sample_index
topic_instance_id
proposed_status
proposed_target_node_ids[]
verifier_decision = support | contradict | uncertain
strongest_alternative_node_id = string | null
verifier_reason
quality_alerts[]
```

`contradict` 和 `uncertain` 不自动覆盖 Pass 2，只强制进入人工复核。最终确定性等级由程序结合源裁决状态、路由置信度、复核结论、目录证据状态、是否跨 L1、是否拆分／缺口和质量警报派生。
