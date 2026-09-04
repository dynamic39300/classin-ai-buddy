# 阶段 D 20 会话 v2.2.1 盲测运行记录

> 状态：`HUMAN_REVIEW_COMPLETE / EFFECTIVE_LAYER_PASS`  
> 固定窗口：`S1000-0901`—`S1000-0920`  
> 冻结目录：`classin-im-semantic-taxonomy-v2.2.1-frozen-20260902`

## 1. 本轮目的

阶段 D 是在阶段 A+B 人工校准、Taxonomy v2.2.1 冻结之后才首次读取的保留集。本轮只检验冻结方法面对未见会话时能否：

1. 根据完整上下文识别真正成立的 Topic；
2. 遵守常规 5% 门槛和特殊业务例外；
3. 将成立的 Topic 路由到已冻结的可变深度目录终点；
4. 识别刷屏、噪声和单句关键词，避免把它们机械升级为 Topic；
5. 保留 Topic 到原消息、消息 ID、发送者和原 Excel 行的可逆证据链。

本轮不用于修改运行前规则，也不形成 IM／AI 产品优先级。

## 2. 输入隔离

盲测输入脚本只读取 `sample1000_windows.jsonl` 和固定抽样 Manifest，再按预先锁定的 20 个窗口提取原始消息。输入层明确记录：

- `prior_topic_artifacts_read=false`；
- `prior_classification_artifacts_read=false`；
- 20 个窗口、2,000 条消息，无替换、无缺失；
- 原始消息保留 `msgid`、`id`、`raw_excel_row`、`sourceuid`、`strtalker` 和 `user_type`。

冻结输入位于仓库外：

`outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-d20-v221-blind-r1/source/`

## 3. 自动语义分析结果

| 指标 | 结果 |
|---|---:|
| 会话窗口 | 20 |
| 原始消息 | 2,000 |
| 待审 Topic | 71 |
| 常规门槛 Topic | 69 |
| 特殊业务例外 | 2 |
| high 置信 | 57 |
| medium 置信 | 14 |
| 无有效 Topic 窗口 | 1 |
| 数据质量告警 | 2 |

两个特殊业务例外分别是：

- `S1000-0906`：班主任单条提醒指定学生进入课堂；
- `S1000-0912`：家长单条提醒教师漏上课。

`S1000-0917` 没有被强行生成 Topic。该窗口主要由重复数字、重复班级邀请和长文本刷屏组成；第 79 条虽出现“上课”，但缺少明确时间、对象和业务后续，在刷屏上下文中不能仅凭关键词升级为特殊业务主题。

## 4. 需要人工审阅的范围

人工只需逐 Topic 判断四件事：

1. Topic 是否真的成立；
2. Topic 名称和描述是否准确概括完整语义事项；
3. 证据范围是否能支持 Topic，是否存在过选或漏选；
4. v2.2.1 目录终点是否正确，是否发生过拆或漏拆。

审阅页支持：

- 点击 Topic 定位首条证据，原消息显示对应 Topic 色签；
- 选择“认同 / 有问题 / 不确定”；
- 分别修改 Topic 名称和目录终点；
- 填写问题说明；
- 浏览器本地自动保存并导出反馈 JSON。

审阅入口：

`outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-d20-v221-blind-r1/review/stage_d20_blind_topic_review.html`

## 5. 可逆产物

结果目录：

`outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-d20-v221-blind-r1/results/`

包含：

- `stage_d20_blind_semantic_topics.jsonl`：每个 Topic、路径、置信度、证据消息及源字段；
- `stage_d20_review_windows.jsonl`：完整 20 个窗口与 Topic 映射；
- `stage_d20_topic_assignments.csv`：便于表格审查的扁平 assignment；
- `stage_d20_window_summary.csv`：窗口级 Topic 摘要；
- `stage_d20_quality_flags.jsonl`：不应被正常 Topic 掩盖的数据质量问题；
- `stage_d20_qa.json`：结构、终点、证据边界和盲测隔离检查。

机械 QA 为 `PASS`，错误 0、警告 0。页面脚本通过语法检查，关键审阅控件均存在。应用内浏览器安全策略阻止自动打开新的 `file://` 页面，因此未把静态检查写成视觉验收通过；需由人工打开页面完成最终界面复核。

## 6. 人工反馈后的评估

收到阶段 D 反馈后，生成独立裁决层，不覆盖本轮自动结果，并计算：

1. Topic 准入准确性：成立、误提、漏提；
2. 名称／描述准确性；
3. 目录终点准确性；
4. 过拆、需合并、漏拆情况；
5. standard 与特殊业务例外分别的表现；
6. high／medium 置信度与人工错误率的校准关系；
7. 无 Topic 和刷屏窗口的拒识能力。

人工反馈最终为 71/71 个提出 Topic 生效认同，名称修正 0、路径修正 0、有问题 0、不确定 0。其中 69 条来自 JSON 明确认同，2 条依据用户在同轮会话中的“全部审阅完成、基本全部认同”声明补齐，来源独立记录、不改写反馈文件。

完整结论及统计边界见 `STAGE-D20-V2-2-1-FINAL-20260902.md`。由于当前专用页面未捕获逐窗口“未见漏题”，本轮 100% 是 Topic 级接受率，不是召回率。阶段 D 未提供修改 v2.2.1 的反例，可以进入规模化重跑准备。
