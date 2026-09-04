---
title: ClassIn IM Pilot 0 可溯源开放编码 v2.3 合并简化审阅包清单
status: SUPERSEDED_BY_V2_3_1_ROLE_CONTEXT_REVIEW
version: v2.3
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Pilot 0 可溯源开放编码 v2.3 合并简化审阅包清单

> **版本通知（2026-08-30）**：v2.3 工作簿仍是不变的合并结构基线；当前审阅工作簿为 [v2.3.2 一体化审阅包](./PILOT0-TRACEABLE-USABILITY-PACKAGE-V2-3-2-MANIFEST.md)。

## 1. 版本定位

v2.3 曾用于表格与方法可用性审阅，并替代 v2.2 作为入口。当前入口已升级为 v2.3.2；v2.3 继续作为不变的合并结构与证据审计基线。它不改变样本或原始消息证据，只调整人工填写结构与字段口径。

当前不启动正式 A/B 标注；等真实 IM 聊天现场与上下文恢复充分后再填写。

## 2. 文件、位置与指纹

受限目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-fact-study-pilot0-20260829/traceable-open-coding-v2-3-unified/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3_标注员A_合并简化受限版.xlsx` | `90a156e718b97e9ff9aedecb9b9f1df65e270d19ef74070806c4dbd18349e8c7` | 已被 v2.3.1 替代；审计保留 A |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3_标注员B_合并简化受限版.xlsx` | `6227c4f0acba63d763e0d496a443856c4c63b910b0acdc8813182714cddbe796` | 已被 v2.3.1 替代；审计保留 B |
| `pilot0_unified_manifest_v2_3.json` | `ba7caaf0807ee4b604a18f8a9e5d6aa9b7c3b79fd3d5bb87b25e3e99d5a5b5b6` | 机器生成清单 |

生成脚本：[augment_pilot0_workbooks_unified_v2_3.mjs](../../../tools/im_fact_study/augment_pilot0_workbooks_unified_v2_3.mjs)

脚本 SHA-256：`a39af96c70f1fb9f5036d618ea16873dee8fec47b1caee81c5ae483c23afeb25`

操作说明：[标注操作指南 v2.3](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3.md)

## 3. 工作簿结构

| 工作表 | 用途 |
| --- | --- |
| `00_使用与溯源说明` | 当前状态、分轨和填写路径 |
| `00A_填写示例` | 虚构逐条、“尽快”和合并事项示例 |
| `00B_字段速查` | 每个枚举值的适用条件、Good case 和 Bad case |
| `01_样本与会话映射` | 样本、轨道和原表会话定位 |
| `02_原表字段索引` | 原表字段值回查 |
| `03_逐条开放编码` | 消息层与事项层合并填写 |
| `05_样本总结` | 标准轨的样本级判断 |
| `06_字段问题` | 规则歧义与待澄清项 |
| `07_样本保全` | 样本损失、替换和排除检查 |
| `08_单方可见汇总` | DIR1 边界轨的可见事实与缺口 |

v2.2 的 `04_事项汇总` 已删除。事项数量由 `03` 中实际使用的 `E1/E2/E3…` 决定，不再预置五个事项，也不设事项上限。

## 4. QA 结果

| 检查 | 结果 |
| --- | --- |
| 样本 | A/B 各24个，不变 |
| 正式可见记录 | A/B 各670条，不变 |
| 标准核心行 | 440条，标注区全空 |
| 单方简化核心行 | 40条，标注区全空 |
| 上下文 | 170条标准上下文 + 20条单方上下文 |
| `03` 原始证据 | A:N 与对应 v2.2 逐单元格一致 |
| `02` 原表索引 | 正式记录 A:Z 与对应 v2.2 逐单元格一致 |
| A/B 原始证据 | 完全一致 |
| 标识精度 | `id`、`msgid`、`sourceuid`、`replymsgid` 仍按文本保存 |
| 下拉校验 | `03` 9组，包括时效4值和事项状态6值 |
| 事项预填 | AD:AG 全空；不存在预设 E1–E5 行 |
| 公式结果 | 新增公式无错误；8个 `HYPERLINK` 缓存提示与 v2.2 证据基线一致，公式本身未改 |
| 视觉验收 | 说明、字段速查、虚构示例、合并编码正文与表头、样本总结和单方汇总共9个视图通过 |
| 临时 `.inspect.ndjson` | 0 |

## 5. 已知边界

- 这仍是 Pilot 0 方法样本，不支持主题或需求发生率估计；
- 完整对话现场恢复之前，不正式填写、不进入 Codebook；
- DIR1 仍只能表达“窗口内单方可见”，不能推断对方实际未回复；
- 工作簿含原始 Excel 已有的脱敏字段值，只能在受限研究目录使用。
