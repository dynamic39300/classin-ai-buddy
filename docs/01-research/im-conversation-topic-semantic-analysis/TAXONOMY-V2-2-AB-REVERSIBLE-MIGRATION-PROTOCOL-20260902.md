# Taxonomy v2.2：阶段 A+B Topic 可逆迁移协议

> 状态：`PROTOCOL_FROZEN / A_B_ONLY / STAGE_D_UNREAD / PREVIEW_ONLY / SOURCE_IMMUTABLE`  
> 日期：2026-09-02  
> 对象：阶段 A+B 的 80 个已抽样会话窗口、8,000 条可见原始消息和 331 个 `effective_topic`  
> 目的：在不覆盖任何历史裁决的前提下，生成从旧有效路径到 Taxonomy v2.2 的逐 Topic 语义适用性扫描和可逆迁移预览。  
> 禁止事项：不得读取阶段 D 内容；不得用关键词命中代替语义裁决；不得改写 A/B 原始模型结果、人工反馈或派生裁决；不得把迁移预览称为最终金标或最终分布。

## 1. 第一性原理

本次迁移不是按目录名称做字符串替换，也不是把旧节点机械搬到新节点。它需要回答：

> 在完整的 100 条会话窗口上下文中，这个已经提取出的 Topic 实际表达了什么事项；按照 v2.2 的定义、纳入、排除和相邻边界，它是否能稳定落入一个可选择的终点节点？

迁移必须继续遵守以下顺序：

```text
完整原始会话上下文
→ 已有 Topic 及其精确证据
→ 不带旧路径的语义重建
→ 不带旧路径的 v2.2 规则路由
→ 与批准的结构映射做确定性比较
→ 独立验证
→ 迁移预览
→ 人工裁决
→ 另行生成 v2.2 生效层
```

旧路径只能在语义路由完成后用于比较，不能作为模型选择新路径的提示。关键词只能用于查找消息，不能裁决 Topic 是否成立、边界、目标路径、资格或权重。

## 2. 已核验的输入事实

| 项目 | 结果 |
|---|---:|
| A+B 会话窗口 | 80 |
| 阶段 A Topic | 210 |
| 阶段 B Topic | 121 |
| Topic 合计 | 331 |
| 唯一 `topic_instance_id` | 331 |
| `standard` | 259 |
| `special_business` | 6 |
| `short_candidate` | 66 |
| 当前有效路径为空 | 61，全部为 `short_candidate` |
| 已接受／已修正 | 308 / 16 |
| 部分修正仍待决／待决／未审 | 4 / 2 / 1 |

证据连接已经做过只读不变性检查：

- 331 个 Topic 的全部 `evidence_message_ids` 均能在相应的 100 条窗口中按原表 `id` 找到；
- 缺失证据 ID、跨窗口错接、Topic 内重复证据 ID和正文不可用数量均为 0；
- 每条 Topic 的证据 ID 数等于 `source_topic.effective_message_count`；
- 331 个 `topic_instance_id` 均唯一。

上述检查只证明证据引用完整，不证明 Topic 名称、边界和分类自动正确。

### 2.1 七条源裁决隔离项

A+B 中仍有 7 条源人工裁决未完成：

- `partially_corrected_unresolved`：4 条；
- `unresolved`：2 条；
- `unreviewed`：1 条。

这 7 条仍须进入适用性扫描，以免丢失问题，但无论模型输出何种建议，都必须满足：

```text
source_publishable = false
requires_human = true
```

“源裁决未完成”是历史裁决完整性状态，不等同于 `context_insufficient`。例如，缺少拆分后的证据边界、缺少目标资格或尚未完成人工审批，都不意味着原文一定无法理解。

## 3. 唯一允许的输入

### 3.1 Topic 裁决层

只读取：

- 阶段 A：`human-calibration/stage-a-first50-final-v1/topic_adjudications.jsonl`；
- 阶段 B：`human-calibration/stage-b-next30-final-v1/topic_adjudications.jsonl`。

字段权威顺序：

1. `effective_topic`：当前有效名称、描述、资格、特殊业务信息和旧有效路径的冻结快照；
2. `source_topic`：证据消息 ID、有效消息数、窗口占比和源记录哈希；
3. `human_feedback`、`adjudication_status`、`unresolved_codes`：人工意图和源裁决门禁；
4. `source_topic` 中被人工覆盖的名称、描述和路径只作历史追溯，不能覆盖 `effective_topic`。

对未决记录，`effective_topic` 只是当前可执行快照，不代表已经成为金标。

### 3.2 A+B 原始窗口

为确保阶段 D 从数据读取层就被隔离，只读取：

- `batches/sample1000_batch_001.jsonl` 全 50 行，即 `S1000-0001`—`S1000-0050`；
- `batches/sample1000_batch_003.jsonl` 前 30 行，即 `S1000-0101`—`S1000-0130`。

禁止以“先加载全部 1,000 窗口、再在模型调用时过滤”的方式执行。输入准备程序必须在第 30 行后停止读取 `batch_003`，并断言没有 C/D 窗口进入任何中间文件、日志或模型提示。

### 3.3 消息连接键

Topic 证据与原始消息使用以下复合条件连接：

```text
topic.window_id == raw_window.sample_id
AND
source_topic.evidence_message_ids[] == raw_message.id
```

原始 `id` 来自窗口消息 `raw_values[3]`，对应原表字段 `id（会话消息id）`。迁移输入还应只读投影：

- `window_message_index`：按 `timeformat` 排序后的分析序号；
- `source_window_message_index`：原始抽样文件中的稳定行序号，只用于可逆溯源；
- `raw_excel_row`；
- `strtalker`；
- `user_type`；
- `sourceuid`；
- `replymsgid`；
- `from_unixtime`；
- 正文 `body.status / body.text`。

`strtalker`、`user_type` 和 `sourceuid` 是上下文证据，但不能凭角色字段机械决定 Topic 路径。

### 3.4 Taxonomy v2.2 机器规则卡

迁移开始前必须冻结一个机器可读 v2.2 快照并记录 SHA-256。每个可选择终点至少包含：

- `taxonomy_version`；
- `node_id`、`parent_id`、`level`、`node_name`；
- `node_type`、`is_terminal`、`evidence_status`；
- 规范定义；
- 纳入规则；
- 排除规则；
- 与相邻节点的裁决规则；
- A+B 正例锚点；
- A+B 反例或边界锚点。

只有节点名称、没有边界规则的目录不得进入迁移。模型只能选择 `is_terminal=true` 的节点；可变深度下终点可以位于 L2 或 L3。

## 4. 执行流程

### 4.1 Step 0：冻结输入和运行清单

生成 `RUN-MANIFEST.json`，固定：

- 数据集 ID；
- A/B 裁决文件及哈希；
- 两份原始窗口输入范围及哈希；
- v2.2 规则卡版本及哈希；
- 提示协议版本、模型标识和参数；
- 执行代码版本；
- 输出 Schema 版本；
- 阶段 D 未读取声明。

任何输入哈希变化均应 fail closed，不得继续沿用旧迁移结果。

### 4.2 Step 1：按会话窗口建立迁移单元

执行单位是 80 个完整会话窗口，而不是 331 次孤立的 Topic 调用。原始抽样文件按 Excel 行序保存，不保证窗口内严格时间有序；迁移输入必须复用原语义分析管线的时间轴契约，先按 `timeformat`、再按 `raw_excel_row` 稳定排序，同时保留 `source_window_message_index`，不得静默改写或丢弃原行序。每个迁移单元包含：

- 完整、按时间序排列的 100 条消息；
- 该窗口的全部 Topic；
- 每条 Topic 的有效名称、描述和证据 ID；
- 原始发送者、角色、回复与时间字段。

这样可以同时识别转场、跨消息指代、工具只是媒介、不同 Topic 之间的重叠，以及一个源 Topic 是否混入多个事项。A+B 每个窗口当前有 1—10 个 Topic，适合按窗口独立执行。

### 4.3 Step 2：Pass 1——盲语义重建

第一遍模型可见完整上下文和 Topic 证据，但不可见：

- 旧 taxonomy 路径；
- v1→v2.2 结构映射；
- v2.2 目标节点。

模型只生成简洁、可审计的语义框架，不生成隐含推理链：

- `core_object`：核心对象或事项；
- `communicative_action`：参与者实际在做什么；
- `goal_or_issue`：希望推进的目标、问题或状态；
- `business_context`：学习、教学、课程服务、技术、社交或其他实际语境；
- `tool_is_medium_or_goal`：软件、课程、公开课、文件等是沟通媒介还是实际处理目标；
- `boundary_state`：`coherent / possible_split / context_insufficient`；
- `grounding_note`：引用证据事实的简短说明。

模型必须先通读 100 条消息，再处理窗口内各 Topic；禁止把 Topic 名称中的名词当作分类答案。
`possible_split` 的单位是不同语义主题，不是同类事项涉及的不同人员、日期、重复事件、
原因或处理步骤；共享同一核心对象与沟通目标的多次实例保持 `coherent`，不得重新退回
逐消息或逐事件标注。

### 4.4 Step 3：Pass 2——盲 v2.2 路由

第二遍模型可见：

- 完整 100 条上下文；
- Pass 1 语义框架；
- v2.2 的完整结构和规则卡。

它仍不可见旧路径或批准的旧新映射。每个可理解且边界完整的 Topic 必须：

1. 选择一个 `is_terminal=true` 的目标节点，或明确选择 `taxonomy_gap / context_insufficient`；
2. 记录匹配到的纳入规则；
3. 对最容易混淆的至少一个相邻节点给出排除理由；
4. 引用决定性证据消息 ID；
5. 输出简短、可核查的裁决理由。

如完整语义只能通过两个或更多独立事项表达，转入 `split` 子流程。模型不得为了提高覆盖率选择“最近的”宽泛节点。

### 4.5 Step 4：确定性比较并生成 `direct_fit / remap`

只有在盲路由完成后，程序才加载人工批准的 v1→v2.2 结构映射：

- 路由结果等于旧路径的批准结构继承节点：`direct_fit`；
- 路由结果不等于结构继承节点，Topic 自身仍完整：`remap`；
- 旧有效路径为空、但语义唯一适配某个 v2.2 终点：`direct_fit`，同时标记 `operation=new_assignment`。

结构改名或多旧节点合入一个新节点不应误记为语义错误；使用 `operation=rename_merge` 与真正的 `semantic_move` 区分。

### 4.6 Step 5：Pass 3——独立验证

独立验证器重新读取：

- 完整原文和精确证据；
- 拟议目标节点规则；
- 最强相邻候选节点规则。

验证器不读取首轮裁决理由，只判断：

```text
support / contradict / uncertain
```

模型路由和验证器不一致时不得自动决胜，记录分歧并进入人工队列。

### 4.7 Step 6：机械汇总、证据对账和人工包

全部窗口完成后：

1. 合并 331 条父级预览记录；
2. 对 `split` 生成 1→N 子提案；
3. 生成消息—迁移提案关系表；
4. 执行所有不变性和 Schema 校验；
5. 生成问题队列、CSV 与 HTML 审阅包；
6. 只计算带有“preview”标签的候选分布，不覆盖既有统计。

## 5. 五类互斥迁移结果

### 5.1 `direct_fit`：直接适配

适用条件：

- Topic 是一个语义完整事项；
- 它唯一适配一个 v2.2 终点；
- 目标是旧路径的批准结构继承节点，或旧路径为空但能够首次稳定分配。

允许的操作：

- `identity`：节点语义与路径保持一致；
- `rename_merge`：仅因批准的节点改名、压平或合并发生结构变化；
- `new_assignment`：原来未给路径的短候选获得候选路径。

`new_assignment` 不改变其 `short_candidate` 资格，也不使其进入正式统计。

### 5.2 `remap`：需改路径

适用条件：

- Topic 名称、描述和证据边界仍成立；
- 盲语义路由指向一个确定终点；
- 该终点不是旧路径的批准结构继承节点。

其 `operation=semantic_move`。迁移只改变候选路径，不得顺带修改 Topic 名称、描述、资格或证据。

### 5.3 `split`：需拆 Topic

只有完整上下文支持至少两个独立对象、目标或事项时才使用。要求：

- 至少产生两个子提案；
- 子提案只允许使用父 Topic 原有证据 ID 的子集；
- 不得从完整窗口中静默补入新证据；
- 允许一条真正承载两个事项的桥接消息进入多个子项，但必须标明重叠理由；
- 父证据集合必须能由“全部子项证据的并集 + residual 证据及排除理由”100% 对账；
- 每个子项重新计算证据数、窗口占比和资格。

父 Topic 即使原为 `standard`，拆分后各子项仍可能变成 `short_candidate`。不得为了保留正式资格而把本应拆开的事项继续合并。

拆分阶段只生成临时 `child_proposal_id`，不得在人工批准前创建新的正式 `topic_instance_id`。

### 5.4 `taxonomy_gap`：目录缺口

适用条件：Topic 语义清楚、边界成立，但没有任何活跃 v2.2 终点同时满足纳入和排除规则。

- `target_terminal_node_id=null`；
- 可列出邻近候选节点及其不适配原因；
- 不得强行塞入上层分组或宽泛兜底节点。

### 5.5 `context_insufficient`：上下文不足

适用条件：因指代缺失、附件载荷不可见、截窗边界、语言无法可靠理解、单向上下文或其他证据限制，无法稳定判断 Topic 语义或路径。

- `target_terminal_node_id=null`；
- 必须记录缺少什么信息；
- 不能因为节点边界难选就滥用该值。

`taxonomy_gap` 表示“事实清楚但树没有位置”；`context_insufficient` 表示“事实本身尚不能可靠确定”。

### 5.6 迁移范围外的边界警报

本协议不自动重做全部 Topic 提取。如果扫描发现两个既有 Topic 可能应合并，或源证据可能遗漏，分别记录：

- `possible_merge_with_topic_instance_id`；
- `source_evidence_quality_alert`。

这些只是问题警报，不得在本次 taxonomy 迁移中静默合并 Topic 或扩张证据集合。

## 6. 输出 Schema

### 6.1 `ab_topic_migration_preview.jsonl`

每个源 `topic_instance_id` 恰好一行，共 331 行。

```json
{
  "schema_version": "classin-im-taxonomy-migration-preview/v1",
  "run_id": "...",
  "dataset_id": "im-semantic-d06e6ffb2918",
  "taxonomy_from_version": "...",
  "taxonomy_to_version": "classin-im-semantic-taxonomy-v2.2",
  "research_phase": "A",
  "window_id": "S1000-0001",
  "sample_index": 1,
  "topic_instance_id": "STI-...",
  "source_review": {
    "adjudication_status": "accepted",
    "unresolved_codes": [],
    "source_publishable": true
  },
  "source_snapshot": {
    "effective_name": "...",
    "effective_description": "...",
    "qualification": "standard",
    "special_business_type": "none",
    "special_reason": "...",
    "old_path_names": ["..."],
    "source_row_sha256": "...",
    "effective_message_count": 6,
    "message_share": 0.06,
    "evidence_message_ids": ["..."]
  },
  "semantic_frame": {
    "core_object": "...",
    "communicative_action": "...",
    "goal_or_issue": "...",
    "business_context": "...",
    "tool_is_medium_or_goal": "medium",
    "boundary_state": "coherent",
    "grounding_note": "..."
  },
  "migration": {
    "outcome": "direct_fit",
    "operation": "rename_merge",
    "target_terminal_node_id": "L3-...",
    "target_path_ids": ["L1-...", "L2-...", "L3-..."],
    "target_path_names": ["...", "...", "..."],
    "target_evidence_status": "evidence_backed",
    "matched_rule_ids": ["..."],
    "rejected_alternatives": [
      {"node_id": "L3-...", "reason": "..."}
    ],
    "decisive_evidence_message_ids": ["..."],
    "rationale": "..."
  },
  "assurance": {
    "router_confidence": "high",
    "verifier_decision": "support",
    "verifier_reason": "...",
    "deterministic_confidence": "high",
    "requires_human": false,
    "publishable": false,
    "quality_alerts": [],
    "record_sha256": "..."
  }
}
```

`publishable` 在 preview 阶段默认始终为 `false`；它只能在后续人工裁决生成的独立生效层中变为 true。

### 6.2 `ab_split_child_proposals.jsonl`

只为 `split` 输出子项：

- `parent_topic_instance_id`；
- `child_proposal_id`，格式为 `parent::SPLIT-01`；
- `proposed_name`、`proposed_description`；
- `target_terminal_node_id`、目标路径 ID 和名称；
- `evidence_message_ids`；
- `evidence_count`、`message_share`；
- `proposed_qualification`；
- `overlap_evidence_ids` 与重叠理由；
- `rationale`；
- `requires_human=true`。

### 6.3 `ab_migration_evidence_map.jsonl`

每行表示一条源消息与一个迁移父项或拆分子提案的关系：

- `window_id`；
- `parent_topic_instance_id`；
- `child_proposal_id`，非拆分时为空；
- `message_id`；
- `window_message_index`；
- `raw_excel_row`；
- `sourceuid`、`strtalker`、`user_type`；
- `replymsgid`、`from_unixtime`；
- `body_status`、`body_text`、`body_sha256`；
- `assignment_type`：`source_preserved / split_child / residual`；
- `assignment_reason`。

原始数据已脱敏，审阅产物可以保留原表中的这些真实字段，以便人工从 Topic 还原到具体会话和消息。

### 6.4 其他输出

- `ab_taxonomy_gap_register.jsonl`：目录缺口及相邻节点冲突；
- `ab_migration_review.csv`：人工筛选用扁平表；
- `ClassIn_IM_Taxonomy_v2.2_AB迁移审阅台.html`：会话原文、主题、证据高亮、旧新路径和裁决操作；
- `ab_migration_qa.json`：所有输入、输出、不变性、证据和路径检查；
- `RUN-MANIFEST.json`：文件、提示、模型、代码和输出哈希。

## 7. 置信度与人工队列

模型自报置信度只作诊断，最终 `deterministic_confidence` 由以下信号组合生成：

- 源人工裁决是否完整；
- Topic 边界是否完整；
- 是否唯一匹配一个终点；
- 是否落入 provisional 节点；
- 是否存在强相邻候选；
- 路由器与独立验证器是否一致；
- 是否涉及跨 L1 移动；
- 是否存在附件、指代、语言或截窗限制。

必须 100% 进入人工队列的项目：

1. 7 条源裁决未完成项；
2. 全部 `split`、`taxonomy_gap`、`context_insufficient`；
3. 路由器与验证器分歧；
4. `deterministic_confidence=low/medium`；
5. 进入 provisional 节点；
6. 跨 L1 的 `remap`；
7. 触发重点混淆边界；
8. 出现 `possible_merge` 或源证据质量警报。

高置信 `direct_fit` 也必须按阶段、会话形态、资格、终点节点和证据量分层抽查。每个有迁入实例的终点至少抽查一条；不能只抽总体的随机 10%。

## 8. 重点混淆边界

以下相邻关系必须形成独立 QA 切片：

1. 正式测评、考试与成绩 vs 日常学习表现与反馈；
2. 课程内容范围与教学进度 vs 教学方法、课堂规范与质量改进；
3. 课程改期／取消／补课 vs 到课／请假／缺勤 vs 教室与课堂接入 vs 技术故障与连接排查；
4. 数字工具是沟通媒介 vs 数字工具本身是待解决目标；
5. 按具体内容分类的闲聊 vs 日常寒暄与关系维系 vs 玩笑、梗与语言游戏；
6. 饮食、作息与生活事务 vs 健康、旅行、社交和课程安排；
7. 学员课程权益、费用与退款 vs 教师课酬、薪资与奖励；
8. 学生论文／研究学习 vs 独立的专业研究或发表活动。

每个混淆切片至少报告：源 Topic 数、结果分布、验证分歧、人工复核数和典型正反实例。

## 9. 机械质量门禁

### 9.1 输入门禁

- Topic 总数必须为 331，A=210、B=121；
- 唯一窗口必须为 80；
- `topic_instance_id` 必须全部唯一；
- 仅允许固定 A/B 窗口范围；C/D 记录数必须为 0；
- 输入哈希必须匹配封存 Manifest；
- 每个 Topic 至少一个证据 ID；
- 证据 ID 必须存在于同一窗口，且计数一致；
- 原文不得被摘要替换或修改。

### 9.2 Taxonomy 门禁

- 节点 ID 唯一；
- 每个非 L1 节点的父节点存在；
- 节点层级与路径长度一致；
- 只有终点节点可被选择；
- 可选择路径长度只能为 2 或 3；
- 一个分组节点存在子节点时，Topic 不得停在分组；
- 所有终点的定义、纳入、排除和相邻边界规则非空。

### 9.3 输出门禁

- 父级预览恰好 331 行，每条只有一个互斥 `outcome`；
- `direct_fit / remap` 恰好有一个有效终点；
- `taxonomy_gap / context_insufficient` 的目标节点必须为空；
- `split` 至少有两个子提案；
- 非 `split` 不得修改名称、描述、资格或证据；
- `split` 不得增加证据，父证据必须 100% 对账；
- `short_candidate` 获得候选路径后仍不得进入正式统计；
- 源裁决文件和原始窗口文件在运行前后的字节哈希一致；
- 每条输出都能回到 `window_id → topic_instance_id → message_id → raw_excel_row`。

任一 Fatal 门禁失败，整个运行标记为失败，不得只删除问题记录后继续统计。

## 10. 结果解释边界

迁移预览可以回答：

- 当前 v2.2 对 A+B 已见 Topic 的覆盖情况；
- 哪些 Topic 可以直接适配，哪些需要移动或拆分；
- 哪些节点仍有真实目录缺口；
- 哪些边界在完整上下文下仍容易冲突；
- 每个拟议目标可以回溯到哪些 Topic、会话和消息。

迁移预览不能回答：

- v2.2 已经通过未见样本验证；
- 331 条全部已经成为金标；
- 新目录的实例数就是线上总体分布；
- 模型自报高置信等于迁移正确；
- 某个高频目录必然需要 IM 或 AI 产品能力。

人工清空所有阻塞项后，应生成独立的 `v2.2 effective assignment` 层及其 Manifest。该生效层继续引用而不是覆盖 A/B 历史结果。完成生效层和统计复算以后，才进入下一批人工验证；阶段 D 在此之前继续保持未见。
