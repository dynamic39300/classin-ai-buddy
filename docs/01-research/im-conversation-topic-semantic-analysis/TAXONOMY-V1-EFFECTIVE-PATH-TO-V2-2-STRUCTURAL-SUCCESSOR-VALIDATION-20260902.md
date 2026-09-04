# v1 effective path → Taxonomy v2.2 结构继承基线验证报告

> 状态：`VALIDATION_PASS / A_B_ONLY / STAGE_D_UNREAD / COMPARISON_BASELINE_ONLY`  
> 日期：2026-09-02  
> 主文件：[TAXONOMY-V1-EFFECTIVE-PATH-TO-V2-2-STRUCTURAL-SUCCESSOR-20260902.csv](./TAXONOMY-V1-EFFECTIVE-PATH-TO-V2-2-STRUCTURAL-SUCCESSOR-20260902.csv)

## 1. 这个文件做什么、不做什么

该 CSV 只回答：在盲语义路由已经独立完成后，旧人工有效路径与 v2.2 路由结果之间是什么结构关系，从而机械生成 `direct_fit / remap` 的比较标签。

它不用于：

- 根据旧路径预选、提示或限制模型的 v2.2 目标；
- 用关键词替代完整 100 条消息上下文；
- 自动覆盖 A/B 人工裁决；
- 决定 `split / taxonomy_gap / context_insufficient`；
- 读取或推断阶段 D。

`allowed_neighbor_terminal_node_ids` 是审计用的高风险相邻节点清单，不是路由白名单。盲路由可以得到清单之外的终点，但必须给出完整规则与证据理由。

## 2. 机械比较约定

| `successor_mode` | 含义 | 盲路由后的机械比较 |
|---|---|---|
| `exact` | 旧节点与一个 v2.2 终点语义连续 | 命中默认终点为 `direct_fit / identity`；否则为 `remap / semantic_move` |
| `merge` | 多个旧节点合入同一 v2.2 终点 | 命中默认终点为 `direct_fit / rename_merge`；否则为 `remap / semantic_move` |
| `boundary_review` | 旧范围被拆分、收窄或混合了不同判断轴 | 有默认终点且命中时可记 `direct_fit`，但必须人工复核；命中其他终点为 `remap`；无默认终点时任何已分配终点均为 `remap` |
| `deactivated` | 旧宽泛节点退出活跃树 | 任何已分配终点均为 `remap` 并人工复核；不得继承旧兜底语义 |
| `none` | 源人工有效路径为空 | 有稳定目标时为 `direct_fit / new_assignment` 并人工复核；否则保持相应未分配状态 |

语义路由的结果优先于结构基线。所谓“默认终点”只是结构继承关系，不是对具体 Topic 的答案。

## 3. 验证结果

| 检查 | 结果 |
|---|---:|
| A+B 源 Topic | 331 |
| 阶段 A / B Topic | 210 / 121 |
| 非空旧路径覆盖的 Topic | 270 |
| 空路径 Topic | 61 |
| 不同非空旧路径 | 58 |
| CSV 行数 | 59（58 条非空路径 + 1 条空路径哨兵） |
| v2.2 活跃节点 / 可选终点 | 84 / 60 |
| v2.2 终点规则卡 | 60 |
| 未知或非终点目标引用 | 0 |
| 漏映射、重复映射或多余旧路径 | 0 |
| 阶段 D 读取 | 0 |

模式分布：

- `exact`：21 条；
- `merge`：4 条；
- `boundary_review`：32 条；
- `deactivated`：1 条；
- `none`：1 条空路径哨兵。

## 4. 路径边界摘要

以下旧路径禁止机械宣称“一一精确继承”，已全部标为 `boundary_review`：

- **学习评价**：`测评与考试反馈` 在正式考试成绩、练习估分、日常表现与备考之间分流；`学习计划与资源` 需把计划与资源对象分开。
- **教学设计**：`教学反馈与质量` 按评价对象分流；`教学方法与课堂活动` 按教师方法、课堂参与规范和教学质量分流；`教材与课程进度` 按资源、内容进度和教学方法分流。
- **课程运营**：到课／缺勤、时段／排班、课程变更、学员费用、教师课酬、教师事务和宽泛行政不能按因果链合并，必须按当前主要待解决事项裁决。
- **技术与媒介**：应用、设备、课堂工具、文件、联系人和账号只有在数字操作本身是目标时才进入数字域；工具只是媒介时按真实事项归类。
- **闲聊与日常**：`轻松闲聊与玩笑`、`日常生活与饮食` 需区分具体生活对象、寒暄关系维系与玩笑本身；原“其他/待细分”已停用。
- **校园与研究**：学校仅为背景时不能归校园；研究需区分学习／指导目的与当前未启用的独立专业研究节点。
- **原因与影响**：天气、健康、故障、扣薪、退款、补课等不因同时出现而自动夺取主路径；若成为独立持续事项，应拆 Topic 后分别路由。

## 5. 输入哈希

| 输入 | SHA-256 |
|---|---|
| 阶段 A `topic_adjudications.jsonl` | `b1eefb66c6738fe250e925d6bae6f88d63882bf07311c806de2e637a0c190f80` |
| 阶段 B `topic_adjudications.jsonl` | `c27a6afbda921d82871a3144122252303371162593cc668c6d3a519fd18a7668` |
| v2.2 active nodes | `9d9f11238a3fc4337f1a50d94e15484c4ea8e966725c3657d5fdc236dc7d5c00` |
| v2.2 rule cards | `58e02f478d268142b771f6c2721d9efb9f672db8a288ae764933706ffbc0eb5f` |
| 结构继承 CSV | `c748302f2fc754e5117bd8a79e15d2f8ace8d4e454849a15512e71cb19ecb4e2` |

## 6. 可复现验证

```bash
/Users/eeo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  tools/im_semantic_topic_v1/validate_v1_effective_path_to_v22_successor.py \
  --mapping docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V1-EFFECTIVE-PATH-TO-V2-2-STRUCTURAL-SUCCESSOR-20260902.csv \
  --taxonomy docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-ACTIVE-NODES-20260902.json \
  --rule-cards docs/01-research/im-conversation-topic-semantic-analysis/TAXONOMY-V2-2-RULE-CARDS-20260902.json \
  --stage-a-topics /Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-a-first50-final-v1/topic_adjudications.jsonl \
  --stage-b-topics /Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-b-next30-final-v1/topic_adjudications.jsonl
```

当前运行结果为 `status=pass`；五项关键检查均为 `true`：源哈希冻结、全部有效路径恰好覆盖一次、全部目标为活跃终点、规则卡与终点一一对应、指定高混淆旧路径全部进入 `boundary_review`。
