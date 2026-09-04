# IM 数据分析工具状态

本目录中的四个脚本来自 2026-08-28 的预研 Round 0，完整原样快照见 [Round 0 封存包](../../docs/07-history/stage-deliverables/im-data-prestudy-round-0-20260828/README.md)。

当前使用边界：

- `profile_im_chat_xlsx.py` 的只读结构扫描能力可在正式研究中复用，但输出必须绑定数据指纹和审计版本；
- `analyze_im_chat_xlsx.py`、`sample_im_messages_for_validation.py` 与 `calibrate_im_topics_and_export_review.py` 中的主题规则、Episode 切分、候选样本和比例口径仅代表 Round 0；
- 在 [研究方法共识稿](../../docs/01-research/im-real-communication-fact-study/RESEARCH-METHOD-DATA-GOVERNANCE-SAMPLING-CONSENSUS-DRAFT.md) 通过审阅前，不用这些脚本继续扩大语义统计或推导产品优先级；
- 真实消息或自由文本输出不得提交到仓库。

后续若复用机械能力，应建立新的正式阶段脚本版本，并保留输入指纹、参数、随机种子、排除日志和派生数据清单；不要直接覆盖 Round 0 行为。

