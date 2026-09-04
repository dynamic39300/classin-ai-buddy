---
title: ClassIn IM 真实沟通研究 P1 执行日志
status: ACTIVE_EXECUTION_LOG
version: v0.1
date: 2026-08-29
---

# ClassIn IM 真实沟通研究 P1 执行日志

## 输入

- 文件指纹：`a28f4c3125326c2e0f9086f8c0f67104671b94b2992a0173f4c34f90690fee6c`；
- 执行方式：只读、流式扫描；
- 输出边界：聚合统计与结构分类，不输出消息正文或标识符。

## 执行记录

| 版本 | 状态 | 变化 | 结果 |
| --- | --- | --- | --- |
| v1.0 | `SUPERSEDED_AUDIT_TRAIL` | 首轮20字段、缺失、固定窗口、ID和内容结构扫描 | 发现 `msgid` 全局不唯一；原样保留，不作为正式回复完整性结果 |
| v1.1 | `SUPERSEDED_AUDIT_TRAIL` | 回复引用改为 `clusterid + msgid` 同会话解析；增加角色组合、群规模、JSON键和时间方向 | 确认12,711个显式回复在同窗口未解析；确认383个窗口仅教职工发言 |
| v1.2 | `CURRENT` | 增加 `timetag` 契约检查、JSON content/strTalker一致性和target结构分渠道检查 | 形成 P1 当前数据字典与质量审计基线 |

### v1.0 方法修正说明

首轮曾用全局 `msgid` 集合检查 `replymsgid`。扫描结果显示：

- 全表 819,700 行只有 38,427 个不同 `msgid`；
- `clusterid + msgid` 才是 819,700 行唯一；
- 因此跨会话全局匹配会造成假解析。

v1.1 起已改为同一 `clusterid` 内解析，并保留 v1.0 输出作为可审计错误轨迹，不覆盖、不删除。

## 文件指纹

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `classin_im_p1_structural_audit_v1.json` | `5be3b9c2c4838eeb8e2628d692c0ba165ac936ef195c9762767f2558fcdbc750` | 被 v1.1 替代 |
| `classin_im_p1_structural_audit_v1_1.json` | `6d69e589b01ef421e40118e63d3d560bc10d940f9c0357ad43d796bc3d963b9d` | 被 v1.2 替代 |
| `classin_im_p1_structural_audit_v1_2.json` | `3cbc63552a6fcb0ac1e8835a5f62a4ebb8dbec01887ace9a5356715f9ae4abf3` | 当前 |
| `audit_im_workbook_v1.py` | `b058af428ad95a4a465eedb80f77dd65c048b8ecb6ffe3696fc96e0bf723dbca` | 当前执行脚本 |

说明：脚本指纹对应 v1.2 执行完成时版本。后续脚本修改需新增版本和指纹，不能用旧指纹描述新行为。

## 当前 Gate

- P1 技术扫描：完成；
- P1 数据问题登记：完成初版；
- 平台总体抽样框：未通过；
- 可开展的方法验证型小规模试标：有条件通过；
- 可发布平台主题比例或产品优先级：未通过。

