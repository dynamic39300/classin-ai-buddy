---
title: ClassIn IM Pilot 0 v2.3.3 字段精简审阅包清单
status: ARCHIVED_METHOD_MILESTONE_PACKAGE
version: v2.3.3
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Pilot 0 v2.3.3 字段精简审阅包清单

## 1. 版本定位

v2.3.3 基于 v2.3.2，只做一项方法精简：删除事项层“事项关键缺口/备注”。新请求尚未出现结果时使用 `事项可见状态=未看到`；窗口截断、附件不可见等证据限制统一进入消息层“证据边界/推断警报”。

本包已封存为阶段方法里程碑，不再作为当前人工填写入口。当前入口改为 Topic Pilot 50；本包仅供审计与方法演进追溯。

## 2. 文件、位置与指纹

受限目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-fact-study-pilot0-20260829/traceable-open-coding-v2-3-3-event-gap-removed/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.3_标注员A_事项缺口已删除受限版.xlsx` | `475a6d2b6225da273bd1a424856c040e20a4249a5d1c3152b7637f536992002e` | 历史审阅版 A |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.3_标注员B_事项缺口已删除受限版.xlsx` | `efc4bfd4ae051568dd4f303856ebc8ddc1dadba5cfaa872a3a749c48e6a11ef8` | 历史未填写基线 B |
| `pilot0_event_gap_removed_manifest_v2_3_3.json` | `e4711710d2259d1fd66837e31dcbf7e017e45b147c476f2ec52bf9493ec97c77` | 机器生成与 QA 清单 |

生成脚本：[remove_pilot0_event_gap_v2_3_3.py](../../../tools/im_fact_study/remove_pilot0_event_gap_v2_3_3.py)

脚本 SHA-256：`54fe203bbefafcb2bfef234e01ff1eecd2f049c638ed43f95f974f916673cc0b`

操作说明：[v2.3.3 字段精简审阅操作指南](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-3.md)

## 3. 结构变化

| 工作表 | v2.3.3 行为 |
| --- | --- |
| `00A_填写示例` | 删除事项缺口列和旧缺失上下文示例；事项示例只保留三个实际字段 |
| `03_逐条开放编码` | 物理删除原 AG 列；事项层保留 AD:AF；样本层由 AH:AR 左移到 AG:AQ |
| `00B_字段速查` | 删除事项缺口说明行 |
| `05_样本总结` | 242个只读镜像公式重连到 AG:AQ；仍无人工下拉框 |

## 4. 验证结果

- v2.3.2 的 `03` 第8–677行 A:AF 值逐单元格保持不变；
- v2.3.2 的11个样本层字段及已有值逐单元格左移后保持不变；
- A/B 各22个标准样本总结行，四类样本层下拉均重连成功；
- `05` 各有242个镜像公式，并全部指向新的 AG:AQ；
- A/B 工作簿中不再存在可填写的事项缺口字段；
- 4个关键页面已完成渲染和视觉检查，无字段覆盖或不可达区域。

## 5. 边界

- v2.3.3 不改变样本、原始消息、发言人、角色或既有人工标注值；
- 删除字段不等于把“未完成”改写成“完成”；可见状态仍按证据记录；
- 当前不能据此生成主题、比例、需求排名或产品设计结论；
- 真实 IM 现场与上下文未恢复充分前，不启动正式 A/B 标注。
