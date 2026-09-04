---
title: ClassIn IM Topic Pilot 50 v1.2 校准包清单
status: QA_PASSED_READY_FOR_AI_EVIDENCE_MAPPING
version: v1.2
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Topic Pilot 50 v1.2 校准包清单

## 1. 当前工作簿

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-topic-pilot50-20260830/v1-human-topic-annotation/ClassIn_IM_Topic_Pilot50_人工Topic标注_v1.2_校准版.xlsx`

SHA-256：`2b9717d4f0de42bb58176e278ed1200681022e0280151dcfe42f4380bf55b91a`

原 v1 工作簿 SHA-256 `c3fcd4c296edd0fdcc58cf6650ebf2895da276495f58865392540479bb8f5993` 保留不覆写。v1.2 是人工 Topic 的可追溯校准派生层。

## 2. 校准内容

- 修正 `TP50-B3-DIR-04/05/06` 三处可确认 Topic 串位；
- 删除 `TP50-B1-GRP-02` 中只有3条有效发言的微信/QQ扩列 Topic；
- 原文中124处“无教学诉求”、1处“无明确教学诉求”和1处“无具体教学内容讨论”已从 Topic 中清除；
- 8处“无进一步求助”和2处“未提出求助”改为只表达可见证据的“未见…求助”；
- 输出仍为50个已填 Case、183条 Topic；
- `04_问题与校准` 记录5条变更，`03` 只保留 J 列 Topic。

## 3. 证据不变性与 QA

- `01_案例目录`、`02_案例消息`、`06_原表字段索引` 逐单元格与原 v1 一致；
- `03` A:I 只读列与原 v1 一致；
- 50个 Topic 单元格非空，T 编号连续；
- 含混的否定句在输出中计数为0；
- QA 状态：`PASS`，failures 为空。

Manifest SHA-256：`c4bf222077aa9a3a3c6f5e4a4fb7524f9a5fbbf86ef549eb67713951292c1792`  
QA SHA-256：`5646aae4d11a7b58c797414f29a316df2f354426efe2c905bab96f1a4110e580`

生成脚本：[calibrate_topic_pilot50_v1_2.py](../../../tools/im_fact_study/calibrate_topic_pilot50_v1_2.py)  
QA 脚本：[validate_topic_pilot50_v1_2.py](../../../tools/im_fact_study/validate_topic_pilot50_v1_2.py)

## 4. 下一阶段边界

v1.2 可作为 AI 证据回链和结构化拆解的输入，但仍不直接发布 Topic 发生率、产品优先级或 IM/AI 能力结论。
