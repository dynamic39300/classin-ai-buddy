# Taxonomy v2.2 阶段 A+B 迁移输入 QA

> 状态：`PASS / CORRECTED_CHRONOLOGY / A_B_ONLY / STAGE_D_UNREAD`  
> 日期：2026-09-02  
> 修正版输入包：`taxonomy-v2-2-frozen-and-ab-migration-v2/source/`

## 1. 发现与处置

第一次迁移输入包直接沿用了 `sample1000_windows.jsonl` 的 Excel 行序。该顺序适合原表溯源，但不保证同一窗口内严格按时间排列。输入 QA 在目录路由开始前发现：A+B 80 个窗口中有 31 个窗口存在时间回跳。

处置如下：

- v1 输入包及其 Pass 1 检查点标为 `SUPERSEDED / DO_NOT_USE_FOR_ANALYSIS`；
- v2 复用原语义分析管线的时间轴契约，按 `timeformat → raw_excel_row` 稳定排序；
- `window_message_index` 表示分析时间序；
- `source_window_message_index` 保留抽样文件原行序，确保可逆；
- 已经开始的 Pass 1 全部从 v2 输入重新通读执行，不复用旧判断。

## 2. 严格验证结果

| 检查 | 结果 |
|---|---:|
| A/B 窗口 | 50 / 30 |
| Topic | 210 / 121，共 331 |
| 原始消息 | 8,000；每窗 100 条 |
| 需调整分析顺序的窗口 | 31 |
| Topic 证据 ID 全部按原表 `id` 解析 | PASS |
| 每窗原行序索引均为 1—100 的可逆排列 | PASS |
| 整窗未跨 shard 拆分 | PASS |
| blind shard 泄露旧 taxonomy / mapping | 0 |
| 阶段 D 读取 | 0 |

另外，将 v2 的 80 个窗口逐条与最初正式语义分析使用的 `semantic-topic-run-cleanroom-v3/prepared-batches` 比对，8,000 个消息 ID 的窗口归属与时间顺序完全一致，差异为 0。

## 3. 源事实不变性

v1 与 v2 的 331 条记录逐项比较后，下列内容完全一致：

- 原 `source_topic`；
- 人工后的 `effective_topic`；
- `human_feedback` 与裁决状态；
- 每个窗口的 100 个原表消息 ID 集合；
- 原表字段、正文、发送者、角色和 `raw_excel_row`。

因此，本次修正只改变模型阅读上下文时的排列，并增加原顺序索引，没有修改任何 Topic、人工裁决或原始消息事实。

## 4. 修正版关键哈希

| 产物 | SHA-256 |
|---|---|
| `source_snapshot_index.jsonl` | `a24d3223502e64fc17f6c804852198cc05ca9e8904fb0e50196e1bebfc78db1b` |
| `source_rich_topics.jsonl` | `de0056634c51545ce5d316ca8a8a6c8135d1e84738cf1228a4a61c48781f173e` |
| `ab_windows_exact.jsonl` | `889aba77a639d6e02da4a10195c9583844bbb03eab3a7a0ea7801023e04b4cec` |
| blind shard 01 | `10090cb0ed0ce6e92be1a9f0c20df57ec34ea2d18ec9767749f756b4949dee68` |
| blind shard 02 | `30776b9c7828ac1770dc9b2e4d72d87ce16fc0f3bd464f42cb8819b07fcf73f6` |
| blind shard 03 | `35b44bc270db9c8afbee31731a25edd062d94bce7383be251d000569586a30fd` |

完整的 31 个重排窗口清单、输入源哈希、字段定义和阶段边界断言保存在修正版输入包的 `manifest.json` 与 `validation.json` 中。
