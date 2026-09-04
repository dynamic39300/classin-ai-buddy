# ClassIn IM 语义主题研究：1,000 会话执行记录

> 状态：自动化分析与交付物生成已完成，人工复核 Gate 待开始。本文件只记录本轮新方法的过程事实、校验状态和仓库外产物位置，不包含任何原始消息正文、昵称、用户 ID、会话 ID 或消息 ID。标记为 `PENDING` 的内容不得理解为已经完成。

## 1. 范围与解释边界

- 研究单位：固定长度的会话窗口；本轮目标为 1,000 个窗口。
- 样本消息数：100,000 条。
- 分层结果：780 个班级群聊窗口，220 个 1v1 私聊窗口。
- 目标：基于完整上下文语义识别 Topic，建立可回溯的 L1/L2/L3 目录，并提供完整人工复核现场。
- clean-room：正式模型运行只接收原始数据派生的本轮 compact 会话和本轮 Schema/提示，不读取旧分析、旧 Topic、旧分类或产品方案。
- 结果性质：自动化探索基线，不是人工 gold label，不代表已验证准确率，也不能直接外推线上总体比例。

## 2. 固定抽样事实

| 项目 | 记录 |
|---|---|
| 输出根目录 | `/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901` |
| 样本规模 | 1,000 个窗口 |
| 消息规模 | 100,000 条 |
| 班级群聊 | 780 个窗口 |
| 1v1 私聊 | 220 个窗口 |
| 固定种子 | `20260831` |
| 原始数据文件 SHA-256 | `a28f4c3125326c2e0f9086f8c0f67104671b94b2992a0173f4c34f90690fee6c` |
| 抽样选择摘要 | `6fe62e771bffc9fce74ff428462e080281c34e86c52e6737a4b7cecd523370c3` |
| manifest 文件 SHA-256 | `eceda9bde708ae9e2cdc73d5879509587c8357573e38cd3e25f2cc09d1945e0f` |
| 抽样 QA | 已通过 14 项数量、唯一性、回读和一致性检查 |

阶段固定为 A=`1–100`、B=`101–300`、C=`301–900`、D=`901–1000`。A/B/C 用于目录归纳；目录冻结后对 A/B/C/D 的全部正式 Topic 分类。D 仅是冻结目录上的自动化 holdout，不是人工金标盲测集。

## 3. 已废弃运行：不得进入正式下游

### 3.1 `superseded-semantic-topic-run-row-order`

- 状态：`SUPERSEDED`。
- 原因：模型输入沿用原始 Excel 行顺序，而不是按原始时间字段形成的会话时间序。
- 回溯结果：1,000 个窗口中有 425 个窗口的原始行序与时间顺序不一致。
- 处理：运行已停止并封存；任何结果不得进入 merge、目录归纳、统计或 HTML。

### 3.2 `superseded-semantic-topic-run-repo-cwd`

- 状态：`SUPERSEDED`。
- 原因：会话虽已按时间排序，但模型进程工作目录仍为仓库根目录，存在自动加载仓库上下文、破坏严格 clean-room 隔离的可能。
- 处理：运行已停止并封存；任何结果不得进入正式下游。

### 3.3 `superseded-semantic-topic-run-redundant-evidence`

- 状态：`SUPERSEDED`。
- 原因：模型被要求同时抄写证据序号、消息 ID、条数和占比，首批出现可复现的冗余字段错位；严格门禁正确拒绝了错误结果。
- 处理：运行在首批监控阶段主动停止；正式契约改为模型只选择时间排序后的规范消息序号，其余证据字段由程序确定性投影。

### 3.4 `superseded-semantic-topic-run-context-drift`

- 状态：`SUPERSEDED`，未启动模型分析。
- 原因：prepare 完成后 runner 最终字段契约继续加固，`run_context` 检测到代码与字段契约哈希变化并按预期拒绝启动。
- 处理：该目录只有 compact 准备产物，不得进入下游；正式运行从新的空目录重新 prepare。

### 3.5 `superseded-taxonomy-run-unsupported-schema`

- 状态：`SUPERSEDED`，目录归纳未启动语义生成。
- 原因：响应格式预检不支持 JSON Schema 的 `uniqueItems` 关键字。
- 处理：移除接口不支持的关键字，数组唯一性继续由本地确定性校验执行；随后从新的 `taxonomy-classification-run-v2` 目录完整重跑。该旧目录不得进入分类、统计或审阅页面。

以上五个运行只作为过程审计证据保留，不构成研究发现，也不用于评价模型表现。

## 4. 正式 clean-room 运行

正式提取目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901/semantic-topic-run-cleanroom-v3`

| 阶段 | 预期产物位置 | 状态 |
|---|---|---|
| compact prepare | `semantic-topic-run-cleanroom-v3/prepared-batches/` | `COMPLETE` |
| 隔离工作目录 | `semantic-topic-run-cleanroom-v3/model-workdir/` | `COMPLETE` |
| 语义主题批次结果 | `semantic-topic-run-cleanroom-v3/` | `COMPLETE` |
| Topic 与证据合并 | `merged/` | `COMPLETE` |
| A/B/C 目录归纳与全量分类 | `taxonomy-classification-run-v2/` | `COMPLETE` |
| 归类后 Topic 与统计 | `final/` | `COMPLETE` |
| 本地人工审阅台 | `review/ClassIn_IM_1000会话语义主题审阅台.html` | `COMPLETE` |

模型工作目录必须位于正式运行目录内、保持空白起点且权限为 `0700`，不能指向仓库。模型输入按原始时间升序排列；同一时间使用原始 Excel 行号稳定打破平局。原始行序只保留用于追溯。

正式提取使用 `gpt-5.6-terra`、`medium` 推理强度，每批 5 个窗口，共 200 批。全部 200 批完成，最终失败数为 0；其中 197 批首次成功，3 批第二次成功。模型只返回规范消息序号，准确消息 ID、证据条数与比例均由程序从冻结 compact 输入确定性投影。

## 5. 验证清单

### 5.1 已确认

- [x] 固定抽样为 1,000 个窗口、100,000 条消息。
- [x] 分层数量为 780 个班级群聊、220 个 1v1 私聊。
- [x] 固定种子、源文件摘要和抽样选择摘要已记录。
- [x] 五个不满足正式条件或未启动的运行目录均标记为 `SUPERSEDED`，并禁止流入下游。
- [x] 正式运行使用仓库外受限输出目录。

### 5.2 已确认：prepare 与语义提取

- [x] compact 输入恰好覆盖 1,000 个窗口和 100,000 条消息。
- [x] 时间排序、原始行号稳定 tie-break、窗口内索引均无违规；425 个源行序不同的窗口已规范化。
- [x] `model-workdir` 位于正式运行目录内，起始为空且权限为 `0700`。
- [x] 200 个模型批次完整完成，无缺失、重复或混入 superseded 结果。
- [x] 全部批次通过 JSON Schema、输入/输出上下文和文件权限检查。

### 5.3 已确认：合并、目录、分类与统计

- [x] Topic 证据序号与准确源消息一一对应，证据数量和比例由程序重新计算。
- [x] `standard` 满足 5% 门槛；`special_business` 仅允许班级群中的 1–4 条特殊业务证据；`short_candidate` 排除在主统计与 assignment 之外。
- [x] `topics.jsonl`、`message_topic_map.jsonl` 与 `window_analysis.jsonl` 关系一致，包括零 Topic 窗口。
- [x] L1/L2/L3 目录只使用 A/B/C 的 3,101 个正式 Topic 归纳。
- [x] A/B/C/D 的 3,422 个正式 Topic 在冻结目录中恰好归到一个 L3；D 的 321 个正式 Topic 未参与目录归纳。
- [x] 描述性统计明确为未加权的 1,000 窗口样本统计，不写成线上总体发生率。
- [x] 所有关键正式产物的 SHA-256 和 QA 摘要已写回本记录。

### 5.4 HTML 机器验收完成，人工 Gate `IN_PROGRESS`

- [x] HTML 已生成且静态结构检查通过；筛选、分页、高亮、本地反馈、导出、零 Topic 和多 Topic 场景已通过合成数据视觉回归。
- [x] 页面包含完整 1,000 窗口、100,000 条消息、Topic 路径、证据映射与窗口覆盖信息。
- [x] 人工反馈保存在本地并可导出，不会自动覆盖模型输出。
- [x] 用户已在本机浏览器对真实数据 HTML 完成阶段 A 前 50 窗口的两轮人工审阅，并导出 v4、v5 反馈；自动浏览器仍不以合成回归冒充真实语义验收。
- [x] 已按顺序方案完成阶段 A 前 50 个窗口的第一轮人工审阅，而非只选择模型高置信案例。
- [x] 已封存原反馈并生成不覆盖模型结果的 Topic／Window 人工裁决层。
- [x] 已记录卡片认同、有问题、分类／文字修正、会话完整性与场景标签；未得到结构化裁决的内容独立进入 unresolved 队列。
- [x] 已完成阶段 A 第二轮定向复核并形成最终校准结论；无法无损执行的 7 个 Topic 作为显式例外封存，不伪装为认同或完整金标。
- [x] 已完成阶段 B 顺序 30 窗口的人工迁移复核；阶段 D 在 v2.2.1 规则冻结前始终保持未见，冻结后才启动盲测。

人工 Gate 当前状态：`STAGE_D20_HUMAN_REVIEW_COMPLETE / EFFECTIVE_LAYER_PASS`。阶段 A 校准、阶段 B 顺序 30 窗口复核和 v2.2.1 冻结均已完成；阶段 D 的 20 个固定 holdout 已在冻结后首次读取、完成盲测分析及人工复核。

阶段 A+B 的共同结论已封存在 `STAGE-AB-INTERIM-SYNTHESIS-20260902.md`。人工明确提出红、橙、紫三个优先区域存在重复定义或边界不清；其他 L1/L2 结构问题仅作为后续待验证假设。在启动阶段 D 前，已通过 `TAXONOMY-REFACTOR-CHECKPOINT-AFTER-AB-20260902.md` 和 `TAXONOMY-V1-PRIORITY-ISSUE-REGISTER-AFTER-AB-20260902.md` 完成实例级审计，并冻结 v2.2.1；阶段 D 在冻结前保持未见。

### 5.5 阶段 A 前 50 会话人工校准

- 原窗口 Topic 共 210 个：`standard=164`、`special_business=5`、`short_candidate=41`；
- 第二轮 v5 反馈中有 decision 的 Topic 为 209 个：认同 192、有问题 17，另有 1 个 Topic 未审；
- 15 个 Topic 有分类问题，4 个有名称／描述问题，1 个新增需拆分；
- 裁决层为 accepted 192、corrected 11、partially corrected / unresolved 4、unresolved 2、unreviewed 1；
- 7 个 Topic 作为显式例外保留；50 个窗口全部有场景标签，其中 49 个满足新版 Topic 完整性门槛；
- 已审 Topic 共有 3,597 组正式 evidence index 与 message ID，结构对应全部合法；本轮未形成逐消息人工证据金标，因此不计算语义证据 Precision / Recall；
- 模型自报 high 置信的 Topic 中仍有 8.0% 被标“有问题”，下一批不能只审低置信。

第一轮历史记录见 `STAGE-A-FIRST50-CALIBRATION-20260901.md`，两轮最终结论见 `STAGE-A-FIRST50-FINAL-20260901.md`；阶段 B 候选规则见 `TOPIC-CALIBRATION-CODEBOOK-V1-1-DRAFT.md`，场景标签边界见 `SCENE-LABEL-CODEBOOK-V1-1-DRAFT.md`。详细 ID、两轮人工输入、MD 补充证据和最终裁决层保存在仓库外的 `human-calibration/stage-a-first50-final-v1/`。

### 5.6 阶段 B 顺序 30 会话迁移复核

- 固定审阅 `S1000-0101`—`S1000-0130`，共 30 个自然顺序窗口，未因内容或结果替换；
- 源 Topic 共 121 个：`standard=95`、`special_business=1`、`short_candidate=25`；121 个全部有人工 decision；
- 116 个认同、5 个有问题；5 个问题全部有结构化修正，涉及 taxonomy path 5 处、名称 1 处；
- 30 个窗口全部被人工判断为未见漏题并完成场景标签；机器裁决 `pass`、Fatal error 0、unresolved 0；
- 两条论文辅导 Topic 的当前 L3 是人工明确声明的临时映射；3 个场景标签存在显式证据不足备注，均单列为研究标记，不进入无争议金标；
- 阶段 B 进一步支持“沟通目的优先、业务动作准确、教学语境优先、个人经历不等于公共议题”等阶段 A 规则，但审阅对象仍是校准前自动基线，因此不能表述为规则应用后的准确率提升。

阶段 B 最终记录见 `STAGE-B-NEXT30-FINAL-20260902.md`；详细裁决层保存在仓库外的 `human-calibration/stage-b-next30-final-v1/`。

### 5.7 Taxonomy v2.2 A+B 迁移人工复核

- [x] v2.2 冻结目录上的 A+B 331 个源 Topic 已生成可逆迁移预览、独立交叉复核和 P0—P3 人工队列；
- [x] 用户已导出 330 条唯一人工审核记录：认同 315、有问题 15、不确定 0；导出遗漏 1 条，不能静默视为认同；
- [x] 15 条修正被解释为：5 条使用现有节点改路由、1 条保持终点但补充“续课”规则表达、9 条 `reject_as_topic`；
- [x] 三个 `taxonomy_gap` 候选均被人工否决为无需成立的 Topic，当前没有人工证据支持新增目录节点；
- [x] 审阅控件已增加“不应识别为 Topic”和“目录定义或命名需调整”，反馈导出会显式记录未审数量与 Topic ID；
- [x] 用户明确授权接受漏审项 `S1000-0028 / STI-ae54d04719092288ce48` 的当前判断；生效层保留该授权来源，不伪装为反馈文件原有记录。
- [x] 已生成 331/331 的 A+B 生效裁决层：308 个单终点 Topic、13 个拆分父 Topic、340 条终点 assignment、9 个 `reject_as_topic`、1 个 `deferred_context_insufficient`；机械 QA `PASS`。
- [x] 已冻结 v2.2.1 最小规则修订：结构与 ID 不变，只补充 L3-017 的“续课”表达及 taxonomy 路由前的 Topic 成立门禁；冻结完成后才首次读取阶段 D。
- [x] 已从原始窗口独立提取 `S1000-0901`—`S1000-0920`，共 20 个窗口、2,000 条消息；输入 Manifest 明确记录未读取任何既有 Topic 或分类产物。
- [x] 阶段 D 盲测生成 71 个待审 Topic：69 个常规门槛、2 个特殊业务例外；57 个 high、14 个 medium；`S1000-0917` 因刷屏与不可恢复语义保持为零 Topic，并生成 2 条质量告警。
- [x] 阶段 D 可逆结果、扁平 CSV、质量告警、机械 QA 和独立 HTML 审阅页已生成；机械 QA `PASS`，人工语义复核已完成。
- [x] 阶段 D 71 个提出 Topic 已全部进入人工生效层：JSON 明确认同 69，当前会话补充确认 2；名称修正 0、路径修正 0、有问题 0、不确定 0，最终 QA `PASS`。
- [x] 明确限制：阶段 D 的 100% 为已提出 Topic 的人工接受率；专用页面没有逐窗口“未见漏题”字段，因此不计算召回率或漏题率。

详细结论见 `TAXONOMY-V2-2-AB-HUMAN-MIGRATION-REVIEW-20260902.md`、`STAGE-D20-V2-2-1-BLIND-RUN-20260902.md` 与 `STAGE-D20-V2-2-1-FINAL-20260902.md`。当前 Gate 为 `AB_EFFECTIVE_LAYER_PASS / TAXONOMY_V2_2_1_FROZEN / STAGE_D20_EFFECTIVE_LAYER_PASS`。

## 6. 正式结果与校验值

以下内容只来自正式 clean-room 运行及其 QA 产物，没有从 superseded 运行复制：

| 项目 | 结果 |
|---|---|
| 正式分析版本 | `semantic-topic-v1-20260901-chronological-indices-only` |
| 正式提取运行上下文 SHA-256 | `7eb71879d470c05410a9f1b62db17e973962766546b45266e95fd97d381ccedb` |
| 正式完成批次数 / 预期批次数 | `200 / 200`，最终失败 `0` |
| merge QA | `merged/merge_topics_qa.json`，`PASS`，SHA-256 `f0f791849655b7c48cdf48bde79956a2a1925fdbcb96d66586dcbf4750fbec45` |
| Topic instance | 共 `4,095`：`standard=3,299`、`special_business=123`、`short_candidate=673` |
| 正式 Topic | `3,422`；短候选 `673` 条不进入目录 assignment 与主统计 |
| 可逆消息—Topic 映射 | `68,779` 条；1,000 个窗口完整覆盖，无缺失窗口 |
| taxonomy | `classin-im-semantic-topic-taxonomy-v1-20260901`；L1=`10`、L2=`20`、L3=`70`；SHA-256 `f6bed7ac01ee93f4fd1e3931d936882b7fec8b9d5890a499d0466c35e8ca1b66` |
| taxonomy/classification QA | `taxonomy-classification-run-v2/taxonomy_classification_qa.json`，`PASS`，SHA-256 `d13903c676588a01a85c2caf20daef51aed6c3f3df8b87ac6e03da58741404ab` |
| classification/stats QA | `final/classification_stats_qa.json`，`PASS`，SHA-256 `0d9b772000f904bc79361d1cbc99383d4f2c20a0e5db33ce6d3acb30f9cd12da` |
| 描述性统计 | `final/topic_stats.json`，SHA-256 `462e4176076685c44b1bc2e2a329eea2025045395657ede7a478392227d78150` |
| HTML 审阅台 | `review/ClassIn_IM_1000会话语义主题审阅台.html`，SHA-256 `f22f37e2c23100a032037a77d93a5320b6e3df6c3e80d0650d3528b4d22f5213`；保留既有固定 Topic 导航、原位保存、文字／L1-L3 分类修正、目录与阶段筛选、紧凑消息和窗口级语义场景标注。反馈格式升级为 v5：新增与分类路径相互独立的 Topic 准入资格修正，可表达 standard、short candidate、special business 之间的人工建议；特殊业务要求类型与理由或显式待决；只要仍有 Topic 未判，会话“未见漏题”就不计为完成。导入继续兼容 v2–v4，非法 v5 准入或场景输入 fail closed，人工建议不覆盖模型原值与既有统计。已通过合成浏览器回归、真实 1,000 会话重新生成及权限／哈希校验；应用内浏览器对 `file://` 的自动刷新受安全策略限制，用户需手动刷新当前页或重新打开文件 |

阶段 A 前 50 窗口的人工校准已完成并带 7 个显式例外；阶段 B 顺序 30 窗口已完成复核并带 taxonomy／场景研究标记；阶段 D 20 个 holdout 已完成盲测分析和人工复核，71 个提出 Topic 全部认同。55 个旧基线 Topic 使用了冻结目录中的兜底节点，其中 47 个来自 A/B/C；这属于需要重点人工检查的可审计信号，不应被解释为识别正确。

## 7. 描述性统计边界

- 正式 Topic 覆盖 65,817 条去重消息，占固定样本 100,000 条消息的 `65.817%`；这是“至少被一个正式 Topic 证据引用”的样本占用率，不是教学相关率、需求率或产品机会率。
- 正式 Topic 共形成 66,829 条消息—Topic 链接；1,006 条消息同时属于多个正式 Topic。多标签链接数不能直接当作独立消息数相加。
- 每个正式 Topic 在其 100 条窗口中的证据占比中位数为 `14%`。`special_business` 的 1–4 条特殊例外独立保留，不与标准 5% 门槛混为一类。
- 所有比例均为未加权固定样本描述。人工语义复核完成前，目录名称、归类和排序只用于组织审阅，不用于决定 IM 或 AI 产品优先级。

在以上事项完成前，本轮输出只能称为“待人工验证的自动化主题分析基线”。

## 8. Taxonomy v2.2.1 冻结后的独立全量重跑

2026-09-02—2026-09-03 已在新的仓库外空目录中，对同一固定 1,000 窗口重新执行上下文语义提取，并把正式 Topic 路由到冻结的 Taxonomy v2.2.1。该运行不复用本文件第 6 节旧基线的 Topic 或分类结果。

- 提取：200/200 批完成，最终失败 0；
- 合并：1,000 窗口、100,000 消息完整，缺失与重复均为 0；
- 候选 Topic：4,063，其中 `standard=3,214`、`special_business=128`、`short_candidate=721`；
- 正式 Topic 路由：`assigned=3,172`、`taxonomy_gap=119`、`context_insufficient=14`、`reject_as_topic=37`；
- merge、固定目录路由和统计 QA 均为 `PASS`；
- 已生成新的全量审阅台、170 条非归类正式 Topic 清单和 D20 独立重跑对照。

D20 对照显示独立重跑仍存在 Topic 合并、拆分或漏识别波动，不能把先前 D20 的 Topic 级 100% 接受率外推为本轮全量准确率或召回率。完整运行事实、统计口径、哈希、产物位置和下一道人工 Gate 见 `FULL-SAMPLE1000-V2-2-1-RUN-20260903.md`。
