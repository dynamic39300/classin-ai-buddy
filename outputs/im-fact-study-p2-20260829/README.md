# ClassIn IM Pilot-0 内容盲样本清单

本目录只保存不含真实 ID 与消息正文的公开结构清单。

| 文件 | 状态 | 说明 |
| --- | --- | --- |
| `pilot0_public_sample_manifest_v1.json` | 被替代、保留轨迹 | 初次确定性选择；五个核心位置存在合法但不理想的随机不均衡 |
| `pilot0_public_sample_manifest_v1_1.json` | 当前 | 保持24个会话不变，并将五个20行核心位置平衡为5/5/5/4/5 |

真实 `clusterid` 映射只保存在仓库外的受限目录，不进入本目录。样本只按渠道、窗口内观察角色、发送者数、时间跨度和数据质量等结构特征选择，没有读取语义主题。Pilot-0 不是概率样本，禁止用于主题或需求发生率估计。

该清单经净室输入审计后可继续使用；它不继承 Round 0 标签、案例或结论。

抽样协议：[P2 抽样与样本保全协议](../../docs/01-research/im-real-communication-fact-study/P2-SAMPLING-AND-SAMPLE-PRESERVATION-PROTOCOL.md)。

受限行级数据和 A/B 开放编码工作簿不进入仓库。v2 是保留原表字段原值的证据基线；当前人工发放的是区分 DIR1 单方可见边界轨和标准互动轨的 v2.2。路径、指纹与 QA 见 [Pilot 0 可溯源开放编码 v2.2 分轨标注包清单](../../docs/01-research/im-real-communication-fact-study/PILOT0-TRACEABLE-DIRECTION-AWARE-PACKAGE-V2-2-MANIFEST.md)。化名 v1、空白 v2 与未分轨 v2.1 仅保留审计轨迹。
