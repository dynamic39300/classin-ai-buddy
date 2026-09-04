---
title: ClassIn IM 数据预研 Round 0 快照清单
status: ARCHIVED_MANIFEST
version: v1.0
date: 2026-08-29
---

# ClassIn IM 数据预研 Round 0 快照清单

## 1. 仓库内不可变快照

| 路径 | 字节 | 内容 | 敏感等级 |
| --- | ---: | --- | --- |
| `snapshots/research/classin_im_chat_scenario_discovery_framework_20260828.md` | 13,484 | Round 0 场景与 AI 机会研究框架 | 内部研究 |
| `snapshots/research/classin_im_chat_content_sample_analysis_20260828.md` | 25,293 | Round 0 聚合分析与口径校准 | 内部研究、无聊天原文 |
| `snapshots/product/IM-AI-AGENT-V2-CONSENSUS-AND-INNOVATION-DIRECTION.md` | 28,562 | 当时的产品共识与创新方向假设 | 内部产品 |
| `snapshots/product/IM-AI-AGENT-V2-THREE-OPTION-PORTFOLIO.md` | 21,467 | 当时的三方案组合假设 | 内部产品 |
| `snapshots/tools/profile_im_chat_xlsx.py` | 8,589 | 工作簿结构扫描脚本 | 内部工具 |
| `snapshots/tools/analyze_im_chat_xlsx.py` | 31,931 | 规则式聚合分析脚本 | 内部工具 |
| `snapshots/tools/sample_im_messages_for_validation.py` | 3,888 | 人工校验样本导出脚本 | 内部工具 |
| `snapshots/tools/calibrate_im_topics_and_export_review.py` | 21,443 | 口径校准与复核工作簿导出脚本 | 内部工具 |
| `snapshots/outputs/ClassIn_IM_2026-08_单聊群聊抽样分析.xlsx` | 38,965 | 首轮匿名聚合工作簿 | 内部聚合数据 |

这些文件是封存时的原样副本，不随现行文档后续修订而更新。完整指纹见 [CHECKSUMS.sha256](./CHECKSUMS.sha256)。

## 2. 外部受限数据登记

| 类型 | 原始位置 | 字节 | SHA-256 | 入仓库 |
| --- | --- | ---: | --- | --- |
| 原始聊天数据 | `/Users/eeo/Desktop/202608-Classin-IM数据内容分析/2026年8月IM单聊&群聊内容抽样数据.xlsx` | 137,770,992 | `a28f4c3125326c2e0f9086f8c0f67104671b94b2992a0173f4c34f90690fee6c` | 否 |
| 人工复核工作簿 | `/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-manual-review-20260828/ClassIn_IM_主题统计校准与人工复核_脱敏版.xlsx` | 642,677 | `924a507cabbcbb1837fa69b704b92db212b73400736667d19a68c1fea29da4df` | 否 |

说明：文件名中的“脱敏版”不等于可以公开传播。人工复核文件仍含自由文本上下文，按受限研究数据处理。

## 3. 完整性规则

- 校验仓库快照：在仓库根目录执行 `shasum -a 256 -c docs/07-history/stage-deliverables/im-data-prestudy-round-0-20260828/CHECKSUMS.sha256`；
- 外部受限数据指纹仅用于确认研究所指向的具体输入版本，不代表仓库对该文件进行托管；
- 若外部文件位置变化，以 SHA-256 识别版本；
- 若需要更正封存说明，新增版本记录，不修改 `snapshots/` 内文件。

