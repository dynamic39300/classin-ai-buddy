---
title: ClassIn IM 真实沟通事实研究
status: ACTIVE_RESEARCH_PHASE_CHARTER
version: v0.7
date: 2026-08-30
decision_grade: clean-room-execution
---

# ClassIn IM 真实沟通事实研究

这是 2026-08-29 正式启动的新研究阶段。当前目标不是证明某个 2.0 方案，也不是立即生成 Feature 清单，而是先建立一份可被共同相信、可复核、可解释边界的 ClassIn IM 真实沟通事实底座。

## 1. 两部分总结构

### 第一部分：事实研究（当前阶段）

回答用户在真实 IM 中：

- 谁与谁在什么关系和场景下沟通；
- 围绕什么对象、事项、任务和问题沟通；
- 一件事情如何发起、补充、推进、打断、重复、结束或悬置；
- 当前 IM 在信息表达、查找、协同、提醒、跟进和结果回收上出现什么摩擦；
- 数据能够证明什么、不能证明什么，以及结论的置信区间和适用边界。

这一部分暂时不讨论“应该采用方案一、二还是三”，不把 AI 能力、Slack Feature 或当前 Demo 结构预写成标签体系。

### 第二部分：能力推导（后续阶段）

只有第一部分通过质量 Gate 后，才分别推导：

1. 哪些需求属于基础 IM 基建，应补齐、简化或明确不做；
2. 哪些需求适合 AI 辅助，介入聊天前、聊天中、聊天后或跨工作流的哪个节点；
3. 哪些行业能力值得借鉴，哪些在 ClassIn 师生场景中属于过度设计；
4. 这些能力如何回看当前 Demo、TeacherIn、公开/私密 Agent 以及未来产品形态。

第二部分不是当前执行范围。

## 2. 当前阶段交付顺序

| 顺序 | 交付物 | 通过条件 |
| --- | --- | --- |
| 1 | 研究方法、数据治理与抽样共识稿 | 研究问题、数据边界、抽样和指标口径经双方确认 |
| 2 | 数据字典与质量审计 | 字段语义、缺失、异常、截断和可修复性可追溯 |
| 3 | 小规模标注实验 | 样本覆盖完整、标注分歧可见、规则可执行 |
| 4 | 标注手册与指标字典定版 | 分子、分母、分析单位、排除项和未知项明确 |
| 5 | 分层扩展分析 | 结论附证据、置信度、反例和适用边界 |
| 6 | 事实洞察报告 | 事实、解释、假设和产品启示分层呈现 |

P1 数据字典与质量审计、P2 抽样方法演进已完成。逐条消息与事项标注 v2.3.3 已封存为历史方法里程碑；Topic Pilot 50 已完成50例人工填写与 v1.2 校准。同一语义 Topic 至少有5条有效发言才纳入；Topic 只保留中性事实，教学关联与求助后置分维度表达。当前可进入 AI 证据回链、有效发言计数和拆解；Codebook 验证前不执行全量语义分类。

## 3. 阶段不变量

1. **原始层不可变**：不覆盖、不静默修正原始工作簿；
2. **未知保持未知**：没有角色、关系、上下文或结果证据时，不从聊天内容猜成事实；
3. **事实与解释分离**：原始观察、人工判断、模型/规则输出和产品假设分别记录；
4. **样本可复现**：记录抽样框、分层、随机种子、排除、丢样和替补；
5. **多种分析单位不混用**：消息、片段、会话、任务、参与者分别计算；
6. **每个比例可复算**：同时声明分子、分母、去重、多标签和缺失处理；
7. **负例与边界例同等重要**：随口表达、模板文本、转发资料和管理群不得被默认为教学任务；
8. **隐私最小化**：真实消息不入仓库，派生样本脱敏、受限、可撤回；
9. **方案盲法**：第一部分不以当前产品方案作为标签或优先级答案；
10. **产品启示延迟**：未经 Gate 的发现只能写作“待验证假设”。

## 4. 与既有材料的隔离关系

- P1–P5 只允许使用原始 Excel、表头注释、用户在本轮确认的基础事实、本轮机械复算结果和版本化方法规则；
- Round 0、旧样本表、IM 1.0 现状审计、竞品、Demo 和产品方案全部隔离，不作为分析或设计模板；
- 隔离材料仅保留历史追溯，直到 P6 才允许重新打开并与净室事实显式映射；
- 详细范围与逐项溯源见 [净室重启与输入溯源](./CLEAN-ROOM-RESTART-AND-INPUT-PROVENANCE.md)。

## 5. 当前工作入口

- [阶段进入日志](./PHASE-ENTRY-LOG.md)
- [净室重启与输入溯源](./CLEAN-ROOM-RESTART-AND-INPUT-PROVENANCE.md)
- [原始元数据与字段语义问题登记](./RAW-METADATA-AND-SEMANTIC-QUESTION-REGISTER.md)
- [正式研究执行计划](./RESEARCH-EXECUTION-PLAN.md)
- [方法与执行决策日志](./METHOD-AND-EXECUTION-DECISION-LOG.md)
- [早期方法共识稿（预设维度已被净室开放编码替代）](./RESEARCH-METHOD-DATA-GOVERNANCE-SAMPLING-CONSENSUS-DRAFT.md)
- [原始工作簿数据字典与质量审计](./DATA-DICTIONARY-AND-QUALITY-AUDIT.md)
- [Data Issue Register](./DATA-ISSUE-REGISTER.md)
- [P1 执行日志](./P1-EXECUTION-LOG.md)
- [P2 抽样与样本保全协议](./P2-SAMPLING-AND-SAMPLE-PRESERVATION-PROTOCOL.md)
- [Topic Pilot 50 人工标注指南 v1.1（当前入口）](./TOPIC-PILOT50-HUMAN-ANNOTATION-GUIDE-V1.md)
- [Topic Pilot 50 人工完成预审（当前 Gate）](./TOPIC-PILOT50-HUMAN-COMPLETION-REVIEW-V1.md)
- [Topic 教学关联与求助校准维度 v1](./TOPIC-CALIBRATION-DIMENSIONS-V1.md)
- [Topic Pilot 50 v1.2 校准包清单（当前 AI 回链输入）](./TOPIC-PILOT50-PACKAGE-V1-2-MANIFEST.md)
- [Topic Pilot 50 v1.1 包清单（当前发放件）](./TOPIC-PILOT50-PACKAGE-V1-1-MANIFEST.md)
- [Topic Pilot 50 v1 包清单（历史基线）](./TOPIC-PILOT50-PACKAGE-V1-MANIFEST.md)
- [逐条消息与事项标注方法里程碑（历史只读）](../../07-history/stage-deliverables/20260830-ClassIn-IM逐条消息与事项标注方法里程碑.md)
- [Pilot-0 开放编码手册](./PILOT0-OPEN-CODING-HANDBOOK.md)
- [Pilot-0 标注操作指南 v2.3（合并结构基础规则）](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3.md)
- [Pilot-0 标注操作指南 v2.3.3（历史方法里程碑）](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-3.md)
- [Pilot-0 标注操作指南 v2.3.2（历史审计版）](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-2.md)
- [Pilot-0 标注操作指南 v2.3.1（角色上下文审计版）](./PILOT0-ANNOTATION-OPERATING-GUIDE-V2-3-1.md)
- [Pilot-0 净室开放编码复核包清单](./PILOT0-CLEAN-ROOM-REVIEW-PACKAGE-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2 复核包清单（证据基线）](./PILOT0-TRACEABLE-REVIEW-PACKAGE-V2-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.1 带示例复核包清单（已被替代）](./PILOT0-TRACEABLE-GUIDED-PACKAGE-V2-1-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.2 分轨标注包清单（历史审计版）](./PILOT0-TRACEABLE-DIRECTION-AWARE-PACKAGE-V2-2-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.3 合并简化审阅包清单（已被 v2.3.1 替代）](./PILOT0-TRACEABLE-UNIFIED-PACKAGE-V2-3-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.3.1 角色上下文增强包清单（已被 v2.3.2 替代）](./PILOT0-TRACEABLE-ROLE-CONTEXT-PACKAGE-V2-3-1-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.3.2 一体化审阅包清单（历史审计版）](./PILOT0-TRACEABLE-USABILITY-PACKAGE-V2-3-2-MANIFEST.md)
- [Pilot-0 可溯源开放编码 v2.3.3 字段精简审阅包清单（历史里程碑）](./PILOT0-TRACEABLE-EVENT-GAP-REMOVED-PACKAGE-V2-3-3-MANIFEST.md)
- [已撤回的中性标注手册 v0.1](./PILOT0-NEUTRAL-ANNOTATION-HANDBOOK.md)
- [P2 执行日志](./P2-EXECUTION-LOG.md)
