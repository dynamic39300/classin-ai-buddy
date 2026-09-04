---
title: ClassIn IM Pilot 0 v2.3.2 一体化审阅包清单
status: SUPERSEDED_BY_V2_3_3
version: v2.3.2
date: 2026-08-30
classification: restricted-source-value-research-data
---

# ClassIn IM Pilot 0 v2.3.2 一体化审阅包清单

> **版本通知（2026-08-30）**：本包保留审计轨迹；逐条方法已封存，当前入口为 [Topic Pilot 50](./TOPIC-PILOT50-HUMAN-ANNOTATION-GUIDE-V1.md)。

## 1. 版本定位

v2.3.2 基于 v2.3.1 的角色上下文与逐条证据，只调整标注界面和字段口径：

- `00A` 主要填写标题直接列出取值、Good case 和 Bad case；
- 样本总结合并进 `03` 的唯一紫色核心行；
- `05` 改为公式驱动的只读集中复核页；
- “推断警报”明确为证据边界提醒；
- “本条是否回应前文”删除 `不适用`；
- “时效要求”删除 `无法判断`，将 `无`改为可观察口径 `未见时效`；
- “结果证据”区分 `未看到` 与 `无法判断`。

当前仍只审阅方法与表格可用性；正式标注尚未开始。

## 2. 文件、位置与指纹

受限目录：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-fact-study-pilot0-20260829/traceable-open-coding-v2-3-2-usability-review/`

| 文件 | SHA-256 | 状态 |
| --- | --- | --- |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.2_标注员A_一体化审阅受限版.xlsx` | `13eb5577876ef9a7959c4c76ea4642ef5cfc60446c36e28f7345321e66f5eec8` | 当前审阅版 A |
| `ClassIn_IM_Pilot0_可溯源开放编码_v2.3.2_标注员B_一体化审阅受限版.xlsx` | `832425ad68dbe31c3986a7f726e13938570cc80e67f065b153b4b0ed254df5c7` | 当前审阅版 B；后续独立标注保留 |
| `pilot0_usability_manifest_v2_3_2.json` | `61f85b007cdc3bdbe67855c60f0433ca6a772a1b0eccc7664e68dd6ced6a29ce` | 机器生成清单 |

生成脚本：[augment_pilot0_workbooks_review_usability_v2_3_2.mjs](../../../tools/im_fact_study/augment_pilot0_workbooks_review_usability_v2_3_2.mjs)

脚本 SHA-256：`7fcfa22dd1a06fbaec36845cb4aa86100882641f8386aba104a00f933ee8c98c`

操作说明：[v2.3.2 一体化审阅操作指南](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-2.md)

## 3. 结构变化

| 工作表 | v2.3.2 行为 |
| --- | --- |
| `00A_填写示例` | 主要标题内嵌完整取值或推荐写法、Good case、Bad case |
| `03_逐条开放编码` | 黄色消息层、绿色事项层、紫色样本层集中在一页 |
| `05_样本总结` | 22个标准样本 × 11字段，共242个公式镜像；无人工下拉框 |
| `00B_字段速查` | 补充简化后的回应、时效、结果证据与证据边界规则 |

## 4. 验证结果

- v2.3.1 的 `03` 第8–677行 A:AG 值保持不变；
- `02_原表字段索引` 保持不变；
- 22个标准样本各生成且只生成1个紫色样本总结行；
- 样本总结人工字段保持空白，净室异常默认值仍为 `无`；
- `05` 生成242个镜像公式，且数据验证数量为0；
- `时效要求` 下拉为 `明确时限/模糊时效/未见时效`；
- `本条是否回应前文` 下拉为 `是/否/无法判断`；
- 消息层和事项层结果取值均为 `完成/受阻/仅有进展/未看到/无法判断`；
- A/B 证据、派生角色背景、紫色样本行与镜像公式一致；
- 5个关键页面预览完成视觉检查，无字段覆盖或不可达区域。

## 5. 边界

- v2.3.2 不改变样本、原始消息、发言人、角色或既有人工标注值；
- 新增 AH:AR 仅承载未来的样本层人工输入；
- `05` 的公式不构成语义分析结果；
- 当前不能据此生成主题、比例、需求排名或产品设计结论；
- 真实 IM 现场与上下文未恢复充分前，不启动正式 A/B 标注。
