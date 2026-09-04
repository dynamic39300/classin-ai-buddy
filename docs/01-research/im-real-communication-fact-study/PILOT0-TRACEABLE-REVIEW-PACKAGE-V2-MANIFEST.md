---
title: ClassIn IM Pilot 0 可溯源开放编码 v2 复核包清单
status: RETAINED_AS_ARCHIVED_EVIDENCE_BASELINE
version: v2.0
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Pilot 0 可溯源开放编码 v2 复核包清单

> **版本更新（2026-08-30）**：v2.0 的正式证据保持不变，逐条方法已整体封存。当前入口为 [Topic Pilot 50](./TOPIC-PILOT50-HUMAN-ANNOTATION-GUIDE-V1.md)；本清单只作为历史证据基线与审计轨迹保留。

## 1. “真实字段”的定义

本包中的“真实”仅指 **原始 Excel 当前已经存在的字段和值**，包括原表行号、`clusterid`、`id`、`msgid`、`sourceuid`、`strtalker`、`replymsgid` 和正文等。它不表示外部真人身份，也不授权外部反查、补充或重识别。

唯一原始证据源：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/2026年8月IM单聊&群聊内容抽样数据.xlsx`

SHA-256：`a28f4c3125326c2e0f9086f8c0f67104671b94b2992a0173f4c34f90690fee6c`

第一次分析的过程文件、标签、Case 和结论没有进入 v2。生成链为：

```text
原始 Excel
  -> 本轮内容盲结构抽样 v1.1
  -> 从原表逐行提取真实字段值 v2.0
  -> A/B 两份独立可溯源开放编码工作簿
```

## 2. 当前文件

受限目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-fact-study-pilot0-20260829/traceable-open-coding-v2/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2_标注员A_受限版.xlsx` | `34124ddf191f9dba8f74528f612e58ac10461419957706d2bea5a6bfdfef862d` | v2.2 的 A 证据基线，不再直接发放 |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2_标注员B_受限版.xlsx` | `26b9dfa6aa40a8e96266f6a323e1d85dafab4571e5c4f79004456594dd0080fc` | v2.2 的 B 证据基线，不再直接发放 |
| `restricted_traceable_review_data_v2.json` | `cb154f1c68b4fe6dc71a0c728a132de4f33c597278552f04f542f8b889de4020` | 当前，仓库外机器中间件 |
| `pilot0_traceable_open_coding_manifest_v2.json` | `4b2aa75434a45a6bc598af8cc4338b74e74512e7e1c5cda166e4b0048f2635b9` | 当前机器清单 |

## 3. 工作簿结构

每位标注者获得一份独立工作簿，包含8个工作表：

1. `00_使用与溯源说明`：原始证据源、净室声明和回查规则；
2. `01_样本与会话映射`：`sample_id` 与原表 `clusterid` 的对应；
3. `02_原表字段索引`：670条可见记录的常用原表字段原值；
4. `03_逐条开放编码`：回查键、昵称、正文和核心开放编码区；
5. `04_事项汇总`：以 `sample_id + clusterid` 汇总连续事项；
6. `05_样本总结`：自由主题与事实/解释分层；
7. `06_字段问题`：无法从原表直接证明的业务语义；
8. `07_样本保全`：原表行号范围、样本损失和版本指纹。

## 4. 精确溯源与完整性 QA

| 检查 | 结果 |
| --- | --- |
| 原表逐行复核 | 670/670 条找到同一 `source_excel_row` |
| 原表字段逐项比较 | 差异字段数 0 |
| 标识精度保护 | `clusterid`、`id`、`msgid`、`sourceuid`、`replymsgid` 等按文本写入 |
| 样本数 | A/B 各24 |
| 原表字段索引 | A/B 各670行 |
| 核心消息 | A/B 各480行 |
| 只读上下文 | A/B 各190行 |
| 原表行号/clusterid/id/msgid/sourceuid | A/B 各670/670非空 |
| 原表昵称 | A/B 各670/670可用（`strtalker` 或 `msgdata.strTalker`） |
| A/B原表索引与证据列 | 完全一致 |
| A/B核心标注区 | 全部为空 |
| 样本损失 | 0 |
| 公式错误 | 0 |
| 旧预设标签出现在非正文区域 | 0 |
| 视觉验收 | 8/8 工作表完成 |

## 5. 版本关系

- `clean-room-open-coding-v1/`：化名/自动脱敏版，状态 `SUPERSEDED_BY_TRACEABLE_V2`，只保留审计轨迹；
- `traceable-open-coding-v2/`：证据基线，保留审计；
- `traceable-open-coding-v2-1-guided/`：未分轨版本，已停止发放；
- `traceable-open-coding-v2-2-direction-aware/`：历史分轨审计包；
- `traceable-open-coding-v2-3-2-usability-review/`：当前方法与可用性审阅包；
- 更早借用旧表视觉语言的工作簿仍在 `invalidated-cleanroom-reset-20260829/`，状态 `DO_NOT_USE`。

## 6. 下一 Gate

本工作簿不再发放。后续人工标注使用 Topic Pilot 50；人工结果返回并通过盲测前，不生成 Codebook、主题比例、需求排序或产品映射。
