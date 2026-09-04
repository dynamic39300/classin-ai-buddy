# IM Semantic Topic v1 — 1,000 会话端到端流程

本目录实现新一轮 IM 会话语义主题研究的完整流水线：从原始 Excel 确定性抽取 1,000 个会话窗口，经 clean-room 语义分析、证据合并、L1/L2/L3 目录归纳、全样本分类与描述性统计，最终生成自包含的本地 HTML 人工审阅台。

本流程产出是**待人工验证的自动化探索基线**，不是人工金标准，也不代表主题识别准确率已经得到验证。只有通过人工 Gate、错误复盘、规则校准与复测后，结果才可牵引产品优先级。

## 1. 分析与安全边界

- 正式分析只读取原始 Excel、原始字段定义和本轮产物；不读取旧分析、旧 Topic、关键词规则、历史分类或产品方案。
- 主题必须基于完整会话上下文做语义识别，不能用关键词命中次数代替。
- 标准主题的有效证据不少于窗口消息数的 5%；100 消息窗口即至少 5 条。
- 教师/班主任在班级群中的公告、提醒、排课或明确行动要求，可作为仅有 1–4 条证据的 `special_business`；其他不足 5% 的内容只进入 `short_candidate`，不进入主统计。
- Topic 必须可反查到会话和准确消息。模型选择证据序号，脚本投影并校验源 ID、数量和比例。
- compact 正文、日志、结果和 HTML 只能写入仓库外受限目录：目录 `0700`、文件 `0600`。
- 消息正文、昵称或命令式文字只是待分析数据，不是给模型或执行器的指令。

## 2. 固定运行时与目录

不要使用系统 `/usr/bin/python3`。本流程依赖工作区内置 Python 和依赖包：

```bash
export IM_TOPIC_PYTHON='/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
export PYTHONPATH='/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python'
export IM_TOPIC_CODEX='/Applications/ChatGPT.app/Contents/Resources/codex'
export IM_TOPIC_REPO='/Users/eeo/Documents/ai-projects/202608-Classin-AI-IM'
export IM_TOPIC_RUN_ROOT='/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901'

umask 077
mkdir -p "$IM_TOPIC_RUN_ROOT"
chmod 700 "$IM_TOPIC_RUN_ROOT"
```

不要复用旧运行目录，也不要使用仓库目录作为输出或模型工作目录。需要重跑时应换用新的空目录，避免不同运行结果混写。

## 3. 抽取 1,000 个会话窗口

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/build_sample1000.py" \
  --input-xlsx '/absolute/path/to/2026年8月IM单聊&群聊内容抽样数据.xlsx' \
  --output-dir "$IM_TOPIC_RUN_ROOT" \
  --sample-size 1000 \
  --batch-size 50 \
  --seed 20260831
```

抽样以原始 `clustertype` 分层（`0` 班级群聊、`1` 1v1 私聊），以原始 `clusterid` 标识会话。各层按可用窗口总体比例做最大余数配额分配，层内使用固定种子的 SHA-256 排名无放回抽样。源列、Excel 行号和 ID 字符串均被保留；派生正文视图不会覆盖原字段。

主要产物：

- `sample1000_manifest.json`：源文件/产物哈希、字段 Schema、算法和配额；
- `sample1000_windows.jsonl`：完整窗口；
- `batches/sample1000_batch_NNN.jsonl`：默认 20 批，每批 50 窗口；
- `sample1000_exclusions.jsonl`：不可用行或窗口；
- `sample1000_qa.json`：数量、唯一性、回读、分层和哈希 QA。

抽样器不判断主题、角色或业务价值。正式进入模型前必须先核对 manifest 与 QA。

## 4. clean-room prepare 与语义提取

```bash
export IM_TOPIC_EXTRACT_RUN="$IM_TOPIC_RUN_ROOT/semantic-topic-run-cleanroom-v3"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/run_semantic_topic_batches.py" \
  --batches-dir "$IM_TOPIC_RUN_ROOT/batches" \
  --manifest "$IM_TOPIC_RUN_ROOT/sample1000_manifest.json" \
  --output-dir "$IM_TOPIC_EXTRACT_RUN" \
  --windows-per-model-batch 5 \
  --prepare-only
```

prepare 必须先证明 1,000 窗口、100,000 消息完整，且会话按原始时间升序排列，同一时间用原始 Excel 行号稳定打破平局。通过后，在同一正式目录执行提取：

```bash
PYTHONUNBUFFERED=1 "$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/run_semantic_topic_batches.py" \
  --batches-dir "$IM_TOPIC_RUN_ROOT/batches" \
  --manifest "$IM_TOPIC_RUN_ROOT/sample1000_manifest.json" \
  --output-dir "$IM_TOPIC_EXTRACT_RUN" \
  --windows-per-model-batch 5 \
  --model gpt-5.6-terra \
  --reasoning medium \
  --concurrency 8 \
  --retries 2 \
  --timeout-seconds 1800 \
  --codex-bin "$IM_TOPIC_CODEX"
```

默认模型工作目录为 `$IM_TOPIC_EXTRACT_RUN/model-workdir`。它必须在正式运行目录内、从空目录开始并保持 `0700`，不能指向仓库。每次 5 个窗口时，1,000 窗口应生成约 200 个模型批次。全部结果还须通过 JSON Schema、上下文和文件权限检查。

## 5. 合并 Topic 与可逆证据

```bash
export IM_TOPIC_MERGED="$IM_TOPIC_RUN_ROOT/merged"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/merge_topic_batches.py" \
  --windows "$IM_TOPIC_EXTRACT_RUN/prepared-batches" \
  --manifest "$IM_TOPIC_RUN_ROOT/sample1000_manifest.json" \
  --batch-results-dir "$IM_TOPIC_EXTRACT_RUN" \
  --output-dir "$IM_TOPIC_MERGED" \
  --expected-analysis-version 'semantic-topic-v1-20260901-chronological-indices-only'
```

输出包括 `topics.jsonl`、`message_topic_map.jsonl`、覆盖零 Topic 窗口的 `window_analysis.jsonl` 和 `merge_topics_qa.json`。merge 会重新校验证据序号/ID、数量、占比、门槛、窗口覆盖和 manifest 一致性。QA 未通过不得进入下游。

## 6. A/B/C 归纳目录，D holdout 分类

固定阶段为 A=`1–100`、B=`101–300`、C=`301–900`、D=`901–1000`。L1/L2/L3 目录只由 A/B/C 的正式 Topic 归纳；`short_candidate` 不参与。目录冻结后，A/B/C/D 的全部正式 Topic 都会被分类到唯一 L3，D 只执行冻结目录上的 holdout classification。

```bash
export IM_TOPIC_TAX_RUN="$IM_TOPIC_RUN_ROOT/taxonomy-classification-run-v2"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/run_taxonomy_and_classification.py" \
  --topics "$IM_TOPIC_MERGED/topics.jsonl" \
  --output-dir "$IM_TOPIC_TAX_RUN" \
  --taxonomy-phases A B C \
  --taxonomy-chunk-size 200 \
  --classification-batch-size 80 \
  --model gpt-5.6-terra \
  --reasoning medium \
  --concurrency 3 \
  --retries 2 \
  --timeout-seconds 1800 \
  --codex-bin "$IM_TOPIC_CODEX"
```

该阶段也使用 `$IM_TOPIC_TAX_RUN/model-workdir` 作为仓库外空工作目录。主要输出为 `taxonomy/taxonomy.json`、`classification/results/*.classification.json`、`taxonomy_classification_qa.json` 和 `run_context.json`。

D 只是自动化 holdout，不是独立人工金标盲测集；D 上的自动分类表现不能表述为准确率。

## 7. 应用归类并生成描述性统计

```bash
export IM_TOPIC_FINAL="$IM_TOPIC_RUN_ROOT/final"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/apply_classification_and_stats.py" \
  --windows "$IM_TOPIC_EXTRACT_RUN/prepared-batches" \
  --manifest "$IM_TOPIC_RUN_ROOT/sample1000_manifest.json" \
  --topics "$IM_TOPIC_MERGED/topics.jsonl" \
  --assignments "$IM_TOPIC_TAX_RUN/classification/results" \
  --taxonomy "$IM_TOPIC_TAX_RUN/taxonomy/taxonomy.json" \
  --output-dir "$IM_TOPIC_FINAL"
```

输出包括 `classified_topics.jsonl`、`taxonomy_flat.jsonl/.csv`、`topic_stats.json`、`topic_stats_by_path.csv` 和 `classification_stats_qa.json`。统计覆盖窗口、Topic instance、消息占用、重叠和证据比例；它们是未加权的固定 1,000 窗口样本描述，不能外推为线上总体发生率。

## 8. 生成 HTML 人工审阅台

```bash
mkdir -p "$IM_TOPIC_RUN_ROOT/review"
chmod 700 "$IM_TOPIC_RUN_ROOT/review"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/build_review_queues.py" \
  --topics "$IM_TOPIC_FINAL/classified_topics.jsonl" \
  --accepted-to-current "$IM_TOPIC_RUN_ROOT/validation-v221-scale-r1/d20_accepted_to_current.json" \
  --current-to-accepted "$IM_TOPIC_RUN_ROOT/validation-v221-scale-r1/d20_current_to_accepted.json" \
  --output "$IM_TOPIC_RUN_ROOT/review/review_queues.json"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/build_review_html.py" \
  --windows "$IM_TOPIC_EXTRACT_RUN/prepared-batches" \
  --topics "$IM_TOPIC_FINAL/classified_topics.jsonl" \
  --window-analysis "$IM_TOPIC_MERGED/window_analysis.jsonl" \
  --taxonomy "$IM_TOPIC_TAX_RUN/taxonomy/taxonomy.json" \
  --stats "$IM_TOPIC_FINAL/topic_stats.json" \
  --review-queues "$IM_TOPIC_RUN_ROOT/review/review_queues.json" \
  --output "$IM_TOPIC_RUN_ROOT/review/ClassIn_IM_1000会话语义主题审阅台.html"
```

`review_queues.json` 只保存对既有 `window_id` 和 `topic_instance_id` 的引用，不改变 Topic、冻结目录、统计或反馈。默认的“最小复核包 · 20 Topic”由 9 个 D20 本轮差异 Topic、7 个按研究阶段与置信度分层抽取的 Taxonomy Gap、2 个上下文不足和 2 个建议拒绝组成；它是有限时间下的方向性 Gate，不是代表性准确率样本。另保留 D20 可能漏题窗口、Taxonomy Gap 分层样本／顺序前 20／全量等专用队列，便于按问题类型扩大复核。

审阅台展示完整会话、多 Topic 证据高亮、三层路径、Topic 类型、阶段和窗口覆盖信息。右栏固定的“本会话主题导航”可按全部／正式／短候选、L1/L2/L3 目录筛选，并可直接跳到某个 Topic。左侧选中目录后会持续展示完整目录路径、稳定的 Topic instance 总量、去重会话总量及附加筛选后的当前会话数；摘要默认收为一行，需要时再展开统计说明和操作。下方一行对应一个会话，因此 Topic instance 数与会话数不是同一统计口径。概览页 A/B/C/D 阶段按钮只联动一级目录表，按阶段重新计算正式 Topic 实例、阶段内会话覆盖和阶段内去重证据消息占用；再次点击当前阶段恢复全量，顶部样本总量保持不变。

左侧“人工审阅任务”下拉框会把会话范围切换到所选任务，并显示 Topic／会话进度；任务目标 Topic 在右栏优先显示并标记“本任务目标”。选择 D20 可能漏题队列时，复核单位改为完整会话，不会伪造一个当前 Topic 卡。任务队列只改变导航范围，不改变数据集 ID，因此同一全量运行已经保存的人工反馈仍可继续使用。

会话消息卡采用紧凑布局：正文位于左侧，回复引用与证据 Topic 标签位于同一内容行右侧；中栏变窄时自动回落到正文下方。该布局只改变显示密度，不改变消息、证据关系或 Topic 定位行为。

左侧会话队列在标题与 `window_id` 相同时只显示一次 ID，卡片元信息压缩为单行；点击当前页下方会话只更新选中态，不重建列表，审阅状态引起的必要重绘也会恢复原滚动位置。改变筛选或翻页仍按预期回到列表顶部。

人工审阅分四层：Topic 卡复核名称、描述和证据边界；复核 Topic 所属 L1/L2/L3；独立复核 Topic 的 `standard`／`special_business`／`short_candidate` 准入资格；会话级完整性复核判断整个窗口是否漏题。名称或描述有误时可直接填写人工修正文本，分类有误时通过冻结目录的三级联动选择建议路径，准入资格错误则使用独立资格修正控件。所有修正都保存原值快照与人工建议，只进入人工反馈与后续派生裁决层，不改写模型 Topic、冻结目录或既有统计。特殊业务资格必须填写类型和理由，或显式标记为待决。

会话级卡片还提供独立于 Topic 目录的“语义沟通场景”人工标注。页面只读展示原始会话形态、当前窗口可见发送者数量和原始角色消息分布，并明确这些信息不代表完整群成员构成；审阅者按群聊或 1v1 使用不同的一键预设，派生层保存 `scene_label`、`inferred_role_relation`、`interaction_mode` 和选填 `scene_note`。它只标注当前 `window_id`，不覆盖系统容器属性，也不把单个 100 条窗口外推成永久群类型。

反馈导出格式为 `im-topic-review-feedback-v5`，继续兼容导入 v2 / v3 / v4。v5 对分类修正、准入修正和场景三元组分别执行字段白名单与原值快照校验，非法输入 fail closed。只要窗口内仍有 Topic 未做 decision，“未见漏题”就不可作为完成结论；从旧版本导入的窗口判断会被保留，但只计为部分完成并显示剩余数量。Topic、窗口和场景备注在输入时同步进入内存，立即导出不会漏掉 debounce 尚未落盘的最后编辑。

修改审阅台生成器后，运行合成浏览器回归：

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/smoke_test_review_html.py"
```

测试会在临时受限目录生成不含真实聊天内容的小型审阅台，并验证右栏导航、目录摘要默认折叠与状态保持、左侧会话点击后滚动位置稳定、会话卡 ID 去重与紧凑布局、A/B/C/D 阶段统计联动、消息卡紧凑布局、Topic 跳转、证据高亮、会话切换、零 Topic、三级分类联动、文字／分类／准入修正的可逆性、特殊业务待决、窗口完整性门禁、v2–v4 旧反馈兼容、非法 v5 拒绝导入、保存后卡片不跳位、统计口径和文件权限。

HTML 含脱敏后的真实证据，仍属于受限研究物料，不应复制进仓库或公开分享。

## 9. 将人工反馈封装为派生裁决层

审阅反馈不能覆盖模型结果。每一批人工反馈都用独立目录生成 `im-topic-human-adjudication-v2` 派生层：

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/adjudicate_review_feedback.py" \
  --feedback '/absolute/path/to/review-feedback.json' \
  --topics "$IM_TOPIC_FINAL/classified_topics.jsonl" \
  --windows "$IM_TOPIC_EXTRACT_RUN/prepared-batches" \
  --window-analysis "$IM_TOPIC_MERGED/window_analysis.jsonl" \
  --taxonomy "$IM_TOPIC_TAX_RUN/taxonomy/taxonomy.json" \
  --expected-dataset-id 'im-semantic-d06e6ffb2918' \
  --expected-phase A \
  --expected-window-count 50 \
  --output-dir "$IM_TOPIC_RUN_ROOT/human-calibration/stage-a-first50-v1"
```

裁决器兼容 v4 / v5 反馈，并验证数据集、阶段、窗口范围、原值快照、taxonomy 叶节点、场景三元组和准入资格修正。confirmed 准入建议只写入人工 `effective_topic`；待决特殊业务、缺少结构化修正、未审 Topic 或未标场景进入 `unresolved.json`，不会被猜测补齐。`source_manifest.json` 保存全部输入哈希，`validation.json` 必须至少为 `pass_with_unresolved` 且 fatal error 为 0，才可作为下一轮校准输入。

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/smoke_test_adjudicate_review_feedback.py"
```

## 10. 完成条件与解释边界

正式交付人工复核前，抽样、prepare、提取、merge、taxonomy/classification 和 stats QA 必须全部通过；1,000 窗口、100,000 消息须保持可追溯且无静默丢失；A/B/C 与 D 的边界须由运行上下文证明；HTML 还要通过分页、筛选、高亮、零 Topic 和多 Topic 的视觉验收；执行记录须包含 superseded 运行、正式哈希、未决问题和人工 Gate 状态。

自动 QA 只能证明结构、数量、隔离和可逆性等机器契约成立，不能证明语义主题正确。人工复核、分歧记录、规则修订和复测完成前，输出只能称为“待人工验证的自动化主题分析基线”。

## 11. Taxonomy v2.2.1 全量重跑

阶段 A/B 校准和阶段 D20 盲测完成后，使用新的空目录重跑全部 1,000 个固定窗口。当前提取运行标识为
`semantic-topic-v2.2.1-scale-20260902-contextual-qualification`；它重新读取原始窗口，不复用旧 Topic。

提取与合并完成后，不再归纳新目录，而是把全部正式 Topic 路由到冻结的可变深度目录：

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/run_fixed_v221_classification.py" \
  --topics "$IM_TOPIC_RUN_ROOT/merged-v221-scale-r1/topics.jsonl" \
  --taxonomy "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json" \
  --rule-cards "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-RULE-CARDS-20260902.json" \
  --output-dir "$IM_TOPIC_RUN_ROOT/classification-v221-scale-r1" \
  --batch-size 50 \
  --model gpt-5.6-terra \
  --reasoning medium \
  --concurrency 6 \
  --retries 2 \
  --timeout-seconds 1800 \
  --codex-bin "$IM_TOPIC_CODEX"
```

分类器只允许模型返回冻结终点 ID 或显式的 `taxonomy_gap`、`context_insufficient`、
`reject_as_topic`。脚本确定性展开二级或三级终点路径，不允许模型改写目录文字。非 `assigned`
结果保留在审计层、不进入目录频次统计，也不能被当成已有目录命中。

`apply_classification_and_stats.py` 同时兼容原三层目录与 v2.2.1 扁平可变深度目录。生成全量
HTML 时，`build_review_html.py` 会将冻结扁平目录转换成审阅树；分类修正控件支持“二级即终点”
和三级终点，并继续提供逐窗口“未见漏题 / 疑似漏题 / 不确定”的完整性复核。

统计阶段还会生成 `non_assigned_formal_topics.csv`，集中保留未强制归类的正式 Topic、会话、
证据序号、结果、置信度和理由，供人工判断真实目录缺口、上下文不足与 Topic 准入误判。

如需把独立全量重跑与已接受的 D20 结果做可逆回归检查：

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/compare_d20_regression.py" \
  --accepted "$IM_TOPIC_RUN_ROOT/human-calibration/stage-d20-v221-blind-r1/results/stage_d20_blind_semantic_topics.jsonl" \
  --current "$IM_TOPIC_RUN_ROOT/final-v221-scale-r1/classified_topics.jsonl" \
  --windows "$IM_TOPIC_RUN_ROOT/human-calibration/stage-d20-v221-blind-r1/results/stage_d20_review_windows.jsonl" \
  --output-dir "$IM_TOPIC_RUN_ROOT/validation-v221-scale-r1"
```

该脚本用同一窗口内的证据消息序号计算 overlap coefficient、F1 和 Jaccard，并同时显示目录
终点是否一致。Topic 可能合理合并或拆分，因此输出只是可复核的一致性信号，不是 Precision、
Recall 或自动发布门禁。

## 12. 最终人工裁决、Gap 审计与 v2.3 物化

最终审阅反馈先经过 `final_review_adjudication.py` 生成不覆盖全量源结果的有效裁决层。随后用
`run_taxonomy_gap_audit.py` 重新读取每个 Gap 所在窗口的完整上下文，完成 Topic 成立、拆分、
既有终点承接和真实缺口判断；`reconcile_gap_audit.py` 再把模型复核与明确人工反馈对齐。人工
裁决和模型结果冲突时不能静默互相覆盖。

只有达到跨独立会话复现、互斥边界明确并通过人工 Gate 的候选，才能构建新版本：

```bash
export IM_TOPIC_V23_ROOT="$IM_TOPIC_RUN_ROOT/human-calibration/taxonomy-v23-materialized-v1"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/build_v23_taxonomy.py" \
  --human-gate-confirmed \
  --active-nodes "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json" \
  --rule-cards "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-RULE-CARDS-20260902.json" \
  --gap-clusters "$IM_TOPIC_RUN_ROOT/human-calibration/taxonomy-gap-audit-v1/reconciled/reconciled_gap_clusters.json" \
  --topics "$IM_TOPIC_RUN_ROOT/human-calibration/final-review-adjudication-v1/effective_topics.jsonl" \
  --output-dir "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis"

"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/materialize_v23_migration.py" \
  --human-gate-confirmed \
  --effective-topics-v221 "$IM_TOPIC_RUN_ROOT/human-calibration/final-review-adjudication-v1/effective_topics.jsonl" \
  --taxonomy-v221 "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json" \
  --taxonomy-v23 "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-3-ACTIVE-NODES-20260903.json" \
  --gap-clusters "$IM_TOPIC_RUN_ROOT/human-calibration/taxonomy-gap-audit-v1/reconciled/reconciled_gap_clusters.json" \
  --output-dir "$IM_TOPIC_V23_ROOT"
```

分别对 `assignments-v221-effective/` 和 `assignments/` 运行
`apply_classification_and_stats.py`，产出同口径基线与新版本统计。最后执行不可变性交付校验：

```bash
"$IM_TOPIC_PYTHON" "$IM_TOPIC_REPO/tools/im_semantic_topic_v1/finalize_v23_delivery.py" \
  --effective-topics-v221 "$IM_TOPIC_RUN_ROOT/human-calibration/final-review-adjudication-v1/effective_topics.jsonl" \
  --taxonomy-v221 "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-1-ACTIVE-NODES-20260902.json" \
  --taxonomy-v23 "$IM_TOPIC_REPO/docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-3-ACTIVE-NODES-20260903.json" \
  --migration-root "$IM_TOPIC_V23_ROOT"
```

交付器必须证明：证据与 Topic 内容未变、只有批准清单中的路径改变、目录结构只包含声明的增量、
新旧两套统计 QA 均通过。任一检查失败即返回非零状态，不能把新版本设为默认统计口径。
