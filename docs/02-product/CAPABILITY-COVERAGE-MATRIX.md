---
title: 教师 WorkBuddy 全量能力覆盖矩阵
status: D1 baseline
truth: SIMULATED
---

# 教师 WorkBuddy 全量能力覆盖矩阵

本矩阵把终局能力地图映射到教师可识别的任务、产物与 Harness。它用于约束原型覆盖范围和后续纵向切片，不表示真实 ClassIn 已提供以下全部接口。除非标记为 `REAL`，当前均为 `SIMULATED`、`INTEGRATION-SIMULATED` 或 `FUTURE`。

| 能力 ID | 能力域 | 教师任务 | 入口 | 主要 Artifact | Harness Module | 产品逻辑 | 业务规则 | Domain Knowledge | 业务数据/API | 异常状态 | 建设阶段 | 真值 | 当前高保真 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EDU-01 | 教研与课程设计 | 把教学目标澄清为可执行的课程对象 | WorkBuddy 对话 / 新建目标 | 课程目标、单元结构、活动草稿 | Context + Runtime + Capability | 目标拆解、范围确认、成功标准 | 年级、课时、难度约束 | 课程设计模板、学科知识 | 课程/教师范围读取 | 信息缺口、目标冲突 | D1 | SIMULATED | 是 |
| EDU-02 | 教研与课程设计 | 生成并比较多个教学方案 | 课程对象侧栏 | 方案集合、取舍记录 | Capability + Evaluation | 候选生成、评分、选择 | 机构模板和审核门槛 | 教学法、学科资源 | 模板/资源 API | 证据不足、方案不可行 | D2 | FUTURE | 否 |
| PREP-01 | 备课与课堂准备 | 形成课前教案、课件和活动清单 | 课程对象 / 课前准备 | 教案、课件提纲、材料包 | Context + Capability | 从课程对象派生备课产物 | 课时、资源版权、班级差异 | 备课规范、内容资源 | 课程结构、资源库 | 资源缺失、版权待确认 | D2 | INTEGRATION-SIMULATED | 否 |
| PREP-02 | 备课与课堂准备 | 检查课堂准备完整性 | 准备检查 | 准备清单、风险项 | Control + Evaluation | 规则校验与待办编排 | 发布前检查项 | 课堂流程规范 | 课表、教室、材料状态 | 权限拒绝、依赖未完成 | D2 | FUTURE | 否 |
| CLASS-01 | 课堂教学与实时支持 | 获取课堂中可执行的提示 | 课堂侧栏 / 实时 Agent | 实时提示、教师下一步 | Context + Runtime | 事件触发、低打扰提示 | 课堂权限和延迟门槛 | 课堂策略、互动模式 | 课堂事件流 | 延迟、数据缺失、教师静音 | D3 | FUTURE | 否 |
| CLASS-02 | 课堂教学与实时支持 | 调整活动节奏和分组 | 课堂控制面板 | 调整建议、拟议动作 | Capability + Control | 提议动作、教师审批、执行 | 不越权代替教师操作 | 分组策略、课堂规则 | 学生参与/课堂状态 | 部分执行、回滚 | D3 | FUTURE | 否 |
| ASSESS-01 | 作业、评价与反馈 | 生成作业与评价标准 | 课程对象 / 作业入口 | 作业草稿、Rubric | Capability + Evaluation | 目标到任务和标准 | 学段、题型、评分规则 | 评价理论、题库 | 作业、提交、评分 API | 规则校验失败 | D2 | INTEGRATION-SIMULATED | 否 |
| ASSESS-02 | 作业、评价与反馈 | 生成个性化反馈草稿 | 作业批阅 | 反馈草稿、修改差异 | Context + Capability + Control | 证据引用、教师确认后发送 | 不直接外发学生消息 | 反馈语气、机构政策 | 提交、评分、历史反馈 | 敏感内容、审批拒绝 | D3 | FUTURE | 否 |
| LEARN-01 | 学情诊断与个性化干预 | 识别学习困难并提出干预 | 学情面板 | 诊断摘要、干预计划 | Context + Evaluation | 事实与推断分层、证据链 | 不把推断当事实 | 学习科学、干预策略 | 出勤、作业、课堂事件 | 样本不足、结论冲突 | D3 | FUTURE | 否 |
| LEARN-02 | 学情诊断与个性化干预 | 追踪干预效果 | 干预计划 | 复盘事件、下一轮目标 | Runtime + Evaluation | 目标-行动-结果闭环 | 评价周期和隐私边界 | 评估方法 | 学情趋势 API | 无法归因、数据延迟 | D4 | FUTURE | 否 |
| SERVICE-01 | 课后服务与教师事务 | 生成学生/家长沟通草稿 | 课后服务 | 沟通草稿、发送前审批 | Context + Capability + Control | 基于证据生成、人工审批 | 消息外发前必须确认 | 沟通规范、敏感词策略 | 学生、家长、消息 API | 权限、敏感内容、发送失败 | D3 | FUTURE | 否 |
| SERVICE-02 | 课后服务与教师事务 | 汇总待办与复盘 | WorkBuddy 首页 / 每日简报 | 待办、复盘摘要、下一步 | Runtime + Evaluation | 跨能力域聚合与排序 | 不覆盖正式业务状态 | 工作流规范 | 课程、作业、消息、日程 | 数据过期、部分成功 | D4 | FUTURE | 否 |

## 读法与约束

- `产品逻辑` 由 WorkBuddy 的用例与策略拥有；`业务规则` 由 ClassIn/机构领域拥有；`Domain Knowledge` 由知识与内容治理拥有；`业务数据/API` 由 Adapter 拥有。四者不能合并成一个“Prompt 上下文”。
- 每个能力至少应有一个 `ContextSnapshot`、一个可审阅的 Artifact 或 ProposedAction，以及一条可追溯的 EvaluationEvent。
- D1 只对 `EDU-01` 做结构高保真。其他能力通过入口、信息架构、状态和代表性卡片表达，不假装已经完成业务实现。
- 所有模拟数据均可重置；页面中以 `[模拟]` 或 `SIMULATED` 显示真值等级。
