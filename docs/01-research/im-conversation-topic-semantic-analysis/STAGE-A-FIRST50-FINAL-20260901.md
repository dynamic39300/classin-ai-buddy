# ClassIn IM 语义主题研究：阶段 A 前 50 会话最终校准记录

> 状态：`CALIBRATION_COMPLETE_WITH_EXPLICIT_EXCEPTIONS`。阶段 A 已完成规则发现与校准，可以进入阶段 B 的顺序 30 窗口验证；本状态不是完整金标、准确率结论或盲测通过。

## 1. 输入

- 数据集：`im-semantic-d06e6ffb2918`；
- 第一轮反馈：`im-topic-review-feedback-v4`，SHA-256 `c6d730ad1e3c7041a8c965b21ef34be2b4840355d68712657446c85b59642310`；
- 第二轮反馈：`im-topic-review-feedback-v5`，SHA-256 `76c5fdb0ba09b5e28d15bb017b2ae0b48b24355e4c7c12532b2d592588e1ee79`；
- 人工补充复核 MD：SHA-256 `e480afa20cae1da69e9c65b075a4cf7662add6ce4222eec066fa567d198d950d`；
- 自动结果、两轮反馈、人工 MD 与派生裁决层分别保存，未覆盖原值。

## 2. 最终事实

| 项目 | 结果 |
|---|---:|
| 窗口 | 50 |
| 源 Topic | 210 |
| 有 decision | 209 |
| 认同 | 192 |
| 有问题 | 17 |
| 未审 | 1 |
| 完整结构化或可接受裁决 | accepted 192、corrected 11 |
| 部分修正／待决 | 4 |
| 无结构化修正 | 2 |
| 场景标签 | 50 / 50 |
| 显式 Topic 例外 | 7 |

第二轮输入通过 dataset、阶段、窗口、ID、原值快照、taxonomy 叶、场景 namespace 与输入不变性检查，Fatal error 为 0。验证状态为 `pass_with_unresolved`。

`192 / 209 = 91.9%` 只表示已审 Topic 卡片认同比例，不是模型 Precision、Recall 或准确率。

## 3. 阶段 A 冻结的候选规则

1. 分类先判断真实沟通目的、对象与动作，不能由课程、软件、账号、论文、角色称谓等表层词决定。
2. 软件若是编程课程的教学对象，属于编程学习语境；软件仅为授课／沟通工具时，登录、连接和权限才属于数字技术支持。
3. 导师辅导学生撰写、修改和投稿论文属于学习任务语境；独立研究项目和职业发表属于学术研究。当前 taxonomy 对论文辅导缺少稳定叶节点。
4. 明确共同扮演前提、角色分工或持续情节才是角色扮演；家庭称谓作为昵称、亲切表达或调侃时属于轻松闲聊。
5. 分类路径、Topic 准入资格和产品重要性分别判断。备注式 short→formal 意图不能静默改成 `standard`；保留源资格并进入短业务动作候选。
6. “需拆分”只有给出替代 Topic 和证据边界后才可执行。
7. 人工场景最终值不由模型质检覆盖；与 Codebook 冲突的窗口需标记并暂不用于规则归纳。

候选规则已写入：

- `TOPIC-CALIBRATION-CODEBOOK-V1-1-DRAFT.md`，状态 `CANDIDATE_FROZEN_FOR_STAGE_B_20260901`；
- `SCENE-LABEL-CODEBOOK-V1-1-DRAFT.md`，状态 `CANDIDATE_FROZEN_FOR_STAGE_B_20260901`。

## 4. 七个显式例外

- `S1000-0006 / STI-fa70...`：拆分方向已确认，缺少替代 Topic 与证据；
- `S1000-0008 / STI-30ffd...`：公开课是视频／社交媒介，缺少目标路径或合并决定；
- `S1000-0026 / STI-9b98...`：人工要求 formal，但当前证据不足 5%，暂作短业务动作候选；
- `S1000-0034 / STI-7f5f...`：学习任务轴已确认，taxonomy 缺少明确叶；
- `S1000-0036 / STI-c471...`：problem 无问题说明或修正；
- `S1000-0039 / STI-a433...`：人工要求 formal，但当前证据不足 5%，暂作短业务动作候选；
- `S1000-0045 / STI-ed5f...`：仍未审。

这些例外不阻止阶段 B 开始，但必须排除出阶段 A 的无争议金标集和相关准确率分母。

## 5. 下一阶段边界

- 阶段 B：固定 `S1000-0101`—`S1000-0130`，共 30 个自然顺序窗口；
- 阶段 D holdout：固定 `S1000-0901`—`S1000-0920`，规则冻结前保持未见；
- B 需要重点验证论文辅导、编程课程软件实践、tool-as-medium、短业务资格和场景 Codebook 冲突；
- 根据 D 修改规则时，D 立即失去 holdout 身份。

详细机器可读裁决与含人工复核文字的报告保存在仓库外：

`/Users/eeo/Desktop/202608-Classin-IM数据内容分析/outputs/classin-im-semantic-topic-sample1000-20260901/human-calibration/stage-a-first50-final-v1/`
