---
title: ClassIn IM Topic Pilot 50 v1.1 包清单
status: QA_PASSED_READY_FOR_BATCH2
version: v1.1
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Topic Pilot 50 v1.1 包清单

## 1. 当前发放件

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-topic-pilot50-20260830/v1-human-topic-annotation/ClassIn_IM_Topic_Pilot50_人工Topic标注_v1.1_仅Topic列.xlsx`

SHA-256：`099469b2a4f06197edd0d3e08a18d35e64ffda735f93e31681a26846ff5f6333`

唯一人工填写区域是 `03_Topic人工标注!J5:J54`。K/L/M 三个原人工字段已物理删除，不再要求人工追溯 ID、写不确定说明或维护状态。

## 2. 迁移与保全

- 输入为用户已填写第一批的 v1，SHA-256 `b0407e965239b90e9b27b400734fd7aff2a2450171d919be3613cb655aa195d0`；
- 第一批10个 Topic 单元格原样保留，Topic 值集 SHA-256 `d0c72a0939dfd3dc649fd77c03ba0dc5f1fc17f547770bdcc498581fbf963adc`；
- 第二、三批40个 Topic 单元格保持空白；
- `01_案例目录`、`02_案例消息`、`06_原表字段索引` 与 v1 证据逐单元格一致；
- v1 不覆盖、不删除，作为阶段基线保留。

## 3. 当前方法口径

- 同一语义 Topic 至少有5条有效发言才纳入人工 Topic；
- 纯表情、重复发送、无语义符号和同句拆分片段不机械累加；
- 少于5条的短暂表达不算 Topic 漏标；
- 发言数表达聊天窗口内的对话显著度，不直接表达严重性、业务价值或产品优先级。

## 4. QA

Manifest：`topic_pilot50_manifest_v1_1.json`  
SHA-256：`c10d19c8a4dcf771817a9ab6c72b4ddd7da85d1f8581e30e447354f0a8ac07e6`  
QA 文件：`topic_pilot50_qa_v1_1.json`  
SHA-256：`e7a291faed458346588c96025e80f781c2e58199d33e5d17cf1371dadbb6cf65`  
结果：`PASS`

已验证证据表、`03` 的只读列和 Topic 值不变，工作簿只保留 J 列人工输入，并完成三个关键页面的视觉验收。

生成脚本：[simplify_topic_pilot50_v1_1.py](../../../tools/im_fact_study/simplify_topic_pilot50_v1_1.py)  
QA 脚本：[validate_topic_pilot50_v1_1.py](../../../tools/im_fact_study/validate_topic_pilot50_v1_1.py)

## 5. 边界

本v1.1只是 Topic 方法磨合与人工标注包，不用于直接发布主题发生率、需求排名或产品结论。
