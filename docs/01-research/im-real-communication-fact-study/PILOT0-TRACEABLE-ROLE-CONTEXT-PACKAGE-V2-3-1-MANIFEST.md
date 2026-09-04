---
title: ClassIn IM Pilot 0 v2.3.1 可溯源角色上下文增强包清单
status: SUPERSEDED_BY_V2_3_2_USABILITY_REVIEW
version: v2.3.1
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Pilot 0 v2.3.1 可溯源角色上下文增强包清单

> **版本通知（2026-08-30）**：v2.3.1 继续作为角色上下文与证据基线；逐条方法已封存，当前入口为 [Topic Pilot 50](./TOPIC-PILOT50-HUMAN-ANNOTATION-GUIDE-V1.md)。

## 1. 版本定位

v2.3.1 在 v2.3 原始证据、消息编码、事项首行和样本总结结构上，增加 `strtalker`、`user_type`、`sourceuid`、`identity` 和 `msgdata.strTalker` 的角色上下文口径与机械汇总。

当前只审阅表格和方法；真实 IM 聊天现场与上下文充分恢复前，不启动正式 A/B 标注。

## 2. 文件和指纹

受限目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-fact-study-pilot0-20260829/traceable-open-coding-v2-3-1-role-context/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.1_标注员A_角色上下文增强受限版.xlsx` | `09940d6d4068342212beb24fde7cc1c0bc47130441e329b164e0477c95c75ee9` | 当前审阅版 A |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.1_标注员B_角色上下文增强受限版.xlsx` | `6901cf95c1d92a2cfd5862cface117f86f2eb91ef0aa36ed282dfde253d3f3ea` | 当前审阅版 B；后续独立标注保留 |
| `pilot0_role_context_manifest_v2_3_1.json` | `029a446dfe296bcbdb52db8298fa9cd3804ae1e5ca17bda1abe5a9c7e7ef5645` | 机器生成清单 |

生成脚本：[augment_pilot0_workbooks_role_context_v2_3_1.mjs](../../../tools/im_fact_study/augment_pilot0_workbooks_role_context_v2_3_1.mjs)

脚本 SHA-256：`04ccd5415a0ad17e7e25b20dfe593a7eafcd6e89eb9c3f740589fdb75d3ed002`

操作指南：[v2.3.1 角色上下文增强指南](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-1.md)

## 3. 新增展示

| 工作表 | 新增内容 |
| --- | --- |
| `00_使用与溯源说明` | 发言人显示名与当前消息角色的使用边界 |
| `00B_字段速查` | `strtalker`、`user_type`、`identity`、`msgdata.strTalker` 和角色多值的正反例 |
| `01_样本与会话映射` | M:O 预填可见发言人结构、角色构成与多值/校验提示 |
| `03_逐条开放编码` | J:L 表头明确主显示名、校验字段和当前消息角色 |
| `05_样本总结` | N:P 同屏显示当前样本的发言人与角色背景 |

群聊发言人较多时，样本概览展示发言量最高的前8位，并提示其余人数；完整逐条名单仍在 `03` 保留。

## 4. QA 结果

| 检查 | 结果 |
| --- | --- |
| 工作表和样本 | A/B 各10张工作表、24个样本，不变 |
| `03` 逐条值 | 第8–677行 A:AG 与对应 v2.3 逐单元格一致 |
| `02` 原表索引 | 正式记录 A:Z 与对应 v2.3 一致 |
| `01` 原有映射 | A:L 与对应 v2.3 一致 |
| `05` 原有总结/标注 | A:M 与对应 v2.3 一致 |
| 正式标注区 | 440条标准核心、40条单方核心仍全空 |
| Pilot `strtalker` | A/B 均 670/670 非空 |
| Pilot `user_type` | A/B 均 670/670 非空；学生265、其他230、班主任163、教师12 |
| Pilot `msgdata.strTalker` | A/B 均 647/670 非空；缺失时保留 `strtalker` |
| 样本级角色汇总 | 24/24 完整，A/B 一致 |
| 公式缓存状态 | 与 v2.3 完全一致，没有新错误 |
| 视觉验收 | 使用说明、样本角色概览、逐条角色表头、样本总结与字段速查5个视图通过 |
| `.inspect.ndjson` 临时边车 | 0 |

## 5. 已知边界

- 样本级汇总只描述当前 Pilot 可见窗口，不代表完整会话总体；
- `user_type=其他` 仍是未细分的原表类别，不得从消息内容强行补成具体身份；
- 同一 `sourceuid` 多个 `user_type` 只记录为数据现象，等导出口径或业务定义确认；
- 工作簿含原始 Excel 已有的脱敏字段值，只能在受限研究目录使用。
