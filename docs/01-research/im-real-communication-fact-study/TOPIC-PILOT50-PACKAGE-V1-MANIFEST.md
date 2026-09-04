---
title: ClassIn IM Topic Pilot 50 v1 包清单
status: SUPERSEDED_BY_V1_1_RETAINED_AS_BATCH1_BASELINE
version: v1
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Topic Pilot 50 v1 包清单

> 历史基线：v1 已由 v1.1 仅 Topic 列版替代。本文与 v1 文件继续保留，用于追溯第一批人工标注之前的原始发放结构，不再继续填写。当前入口见 [v1.1 包清单](./TOPIC-PILOT50-PACKAGE-V1-1-MANIFEST.md)。

## 1. 受限目录

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-topic-pilot50-20260830/v1-human-topic-annotation/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Topic_Pilot50_人工Topic标注_v1.xlsx` | `b0407e965239b90e9b27b400734fd7aff2a2450171d919be3613cb655aa195d0` | 已含第一批用户填写，历史只读 |
| `topic_pilot50_manifest_v1.json` | `93a31bd1db72fd20867ff8c9347831e4b0dfefde12426ed554c275a29767b936` | 抽样、案例与证据清单 |
| `topic_pilot50_qa_v1.json` | `57b18ca4bb825f63ff22213b695a1fd2d4581d02f0180fe5ee30c0c458ca643c` | QA PASS |
| `previews/` | 不适用 | 关键工作表视觉验收图 |

v1 最初空白发放件的 SHA-256 为 `b6214e6805a5f6a1c9288979e58fc348a5b256a823fd51bc54d586d68e60b47a`；用户在同一文件中完成第一批后，当前保留件的指纹更新为上表值。

生成脚本：[build_topic_pilot50_v1.py](../../../tools/im_fact_study/build_topic_pilot50_v1.py)  
QA 脚本：[validate_topic_pilot50_v1.py](../../../tools/im_fact_study/validate_topic_pilot50_v1.py)

## 2. 内容与结构

- 50个独立 `clusterid`，每例100条，共5,000条原始消息；
- 25单聊、25群聊；第一批10、第二批20、第三批20；
- 工作簿共7个工作表；唯一常规人工入口为 `03_Topic人工标注` 的 J:M；
- `strtalker`、`user_type`、`sourceuid`、正文、原表行号和消息 ID 保留为受限只读证据；
- 旧逐条消息/事项工作簿不参与新抽样或 Topic 判断。

## 3. 抽样质量控制

- 内容盲抽样：只使用聊天类型、可见发送者数、可见角色、群规模字段、文本完整度和可见时间跨度；
- 45个双方/多人互动案例，5个单发送者边界案例；
- 第一批为结构较清楚的互动案例；边界案例分散在第二、三批；
- 排除标注者已见的旧试填 `clusterid 27324211`；
- 原表最小—最大行只用于定位，群聊记录在原表中可能非连续。

## 4. QA 结果

- 50/50 案例各100条；批次、聊天类型和边界配额符合设计；
- 5,000/5,000 行按原表 Excel 行号逐字段回查，差异0；
- 所有人工 Topic 单元格为空，状态均为“未开始”；
- 工作簿默认打开 `03_Topic人工标注`，状态下拉和案例消息链接存在；
- 原始审计列默认隐藏但未删除；关键页面已完成视觉检查。

## 5. 结论边界

本包只用于人工 Topic 发现、规则磨合和方法验证，不具备总体发生率估计资格，也不直接生成 IM/AI 产品判断。
