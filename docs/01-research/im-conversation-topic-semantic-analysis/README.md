# IM 会话语义主题研究

本目录回答“固定会话窗口里实际聊了什么”，并把 Topic、目录路径和原始消息证据保持可逆连接。当前执行入口与事实结论为：

- [会话语义主题分析方法 V1](./SEMANTIC-TOPIC-ANALYSIS-METHOD-V1.md)
- [v2.3 冻结主题目录](./TAXONOMY-V2-3-FROZEN-TREE-20260903.md)
- [v2.3 冻结与物化记录](./TAXONOMY-V2-3-MATERIALIZATION-RECORD-20260903.md)
- [最终人工审阅与 Taxonomy Gap 全量复核](./FINAL-REVIEW-AND-TAXONOMY-GAP-AUDIT-20260903.md)
- [固定 1000 会话综合事实结论 V1](./SAMPLE1000-COMPREHENSIVE-FACT-SYNTHESIS-V1-20260903.md)

相关但职责不同：

- [会话结构与沟通用途研究](../im-conversation-structure/README.md)：回答会话形态、当前窗口角色关系和用途；
- [172 个未解析会话人工角色裁定](../im-conversation-structure/HUMAN-ROLE-ADJUDICATION-172-20260903.md)：补齐数据库证据不足的窗口角色关系。

## 当前状态

- 固定样本：1000 个窗口、100000 条消息；
- 当前目录：`classin-im-semantic-taxonomy-v2.3-frozen-20260903`；
- 目录结构：85 个节点、61 个可选终点；
- 当前正式 Topic：3342 个，其中 3177 个已归入 v2.3；
- 短候选：721 个，不进入正式主题分布；
- Topic、路径、会话形态、窗口角色关系和消息证据：已连接；
- 综合事实统计 QA：`PASS`；
- 当前进入问题与需求地图阶段，不再重做已冻结的 Topic 事实层。

## 解释边界

- 当前 1000 窗口为未加权抽样，比例不能外推为全平台发生率；
- 会话覆盖率、Topic 实例数和消息占用率是不同指标；
- Topic 高频不等于痛点强度、需求价值或产品优先级；
- 当前窗口角色和用途不等于账号永久身份或群的长期定义；
- 任何 IM／工作流／AI 能力建议必须在下一阶段回到代表性 Case 后单独形成。
