---
title: WorkBuddy M4.1 对话式 Agent Run Review 清单
status: REVIEWED_APPROVED
version: v0.2
date: 2026-08-21
---

# WorkBuddy M4.1 对话式 Agent Run Review 清单

## 1. 已由用户确认并锁定

| ID | 决定 | 状态 |
| --- | --- | --- |
| C-01 | 当前阶段模拟 Agent Run 体验，尚未接入真实 Agent；未来通过 Adapter 替换 | `LOCKED / D-027` |
| C-02 | 单课件和课程方案包都在一个 Agent 对话窗口中完成完整闭环 | `LOCKED / D-025` |
| C-03 | NineClaw V05 的智能课件任务为唯一内容主线；V04/V06 只补充产物交互，教学动画和课后练习文案统一改写为智能课件语义；目标录屏可见交互事实按逐帧基线 100% 覆盖 | `LOCKED / D-028` |
| C-04 | Core Context 右侧默认展开、可收起，并改为结构化业务对象树 | `LOCKED / D-026` |
| C-05 | 上下文与产出共用右侧活动区并动态切换 | `LOCKED / D-026` |
| C-06 | M4 领域模型、审批写回和 Receipt 技术方案保持不变 | `LOCKED / D-025` |

## 2. 请优先 Review 的主流程

### R-01｜单课件 Storyboard

检查 [A00–A20](./COURSEWARE-AND-PACKAGE-STORYBOARD.md#3-storyboard-a生成单个课件)：

- Agent 的目标理解是否像真实教师协作，而不是系统说明；
- 补参字段与顺序是否符合生成课件的实际操作；
- Plan 是否足够具体但不过度展示内部实现；
- Process 的 Skill/Tool 粒度是否可理解；
- Artifact 修改、采用、保存和 Receipt 是否符合教师心智。

### R-02｜课程方案包 Storyboard

检查 [B00–B09](./COURSEWARE-AND-PACKAGE-STORYBOARD.md#4-storyboard-b直接生成课程方案包)：

- 四类产物和依赖是否合理；
- 并行过程是否清晰；
- 是否允许边生成边查看；
- 逐项复查、批量审批和部分成功是否自然；
- 直接创建与从课件派生是否都需要保留。

### R-03｜Context 树

检查 [信息架构](./CORE-CONTEXT-TREE-AND-COMPOSER-SPEC.md#3-信息架构)：

- `班级 → 课程 → 计划/单元 → 活动 → 资源` 是否符合 ClassIn 对象关系；
- 课程教学计划和学生学习计划的层级是否正确；
- “我的空间”需要哪些一级目录；
- 普通课件任务的学习者范围应该显示到什么粒度。

### R-04｜Context 选择语义

当前默认设计为“选择父对象不自动勾选整棵子树”。请确认：

- 选择班级只带班级事实；
- 选择课程只带课程事实；
- 文件与活动资源逐项选择；
- 选择下级对象时自动添加必要祖先引用；
- Composer 最多显示四个 Chip 和 `+N`。

### R-05｜右侧区自动切换

当前默认：Artifact 到达时，只有在教师没有未应用 Context 修改、没有正在操作树、没有补参/审批窗口时才自动切到产出；否则只显示未读状态。请确认这一抢占规则是否符合预期。

## 3. 进入 To Spec 前必须明确的 P0

| ID | 问题 | 当前建议 | 状态 |
| --- | --- | --- | --- |
| P0-01 | 低风险 Action 是否也弹审批窗口 | 单对象低风险可卡片内确认；多对象/高风险使用窗口 | `APPROVED_DEFAULT` |
| P0-02 | 单课件补参字段是否固定为课时、时长、风格、教材版本 | 作为确定性体验场景固定字段；真实 Agent 后按缺口动态生成 | `APPROVED_DEFAULT` |
| P0-03 | 课程方案包主验收走全成功还是部分成功 | 主链先全成功；另一个可控分支验证部分成功和重试 | `APPROVED_DEFAULT` |
| P0-04 | 执行中追加普通要求如何生效 | 不影响已完成步骤则应用到未开始步骤；重大变化进入 Replanning | `APPROVED_DEFAULT` |
| P0-05 | Artifact 到达是否自动打开右栏 | 满足空闲条件时自动切换，否则只提示未读 | `APPROVED_DEFAULT` |

NineClaw 复刻完整度不再作为待确认项。进入 To Spec 前需另外验收逐帧对照表：目标事件覆盖率必须为 100%，三段素材必须共享同一智能课件叙事、Context 和 Artifact 身份；所有 `ADAPTED` 项必须具有允许的差异类型和具体原因。

## 4. 可以在 To Spec 中采用默认值的 P1

| ID | 项目 | 默认值 |
| --- | --- | --- |
| P1-01 | Agent 首次响应延迟 | 150–500ms 后进入“正在整理”，600–1200ms 产出理解摘要；测试使用可控 Clock |
| P1-02 | 完成调用折叠 | 已完成低层调用默认折叠，当前和失败调用展开 |
| P1-03 | Timeline 自动跟随 | 用户在底部才跟随；上滚后显示更新数量 |
| P1-04 | Context Chip 数量 | 4 个高价值对象 + `+N` |
| P1-05 | 右侧区宽度 | 默认 360px，范围 344–440px |
| P1-06 | 默认右侧视图 | 新任务和无 Artifact Run 为上下文；有 Artifact 的历史 Run 恢复上次模式 |
| P1-07 | Process 技术详情 | 教师摘要默认可见；参数/Projection 按需展开；原始命令默认不显示 |

## 5. 明确不在本 Review 中确认

以下事项由独立导航会话或后续真值文案专题处理，不因本规格包被静默锁定：

- AI Agent 导航结构、文案、视觉和密度；
- 历史任务最终保留 3 条还是其他数量；
- 导航中哪些能力入口常驻、折叠或改名；
- 是否从 WorkBuddy 主路径移除全部“模拟/Demo”文案，以及统一真实性说明的最终名称；
- 是否清理 ClassIn PC 其他业务页面中的 Demo 文案；
- 真实 Agent、文件生成和 ClassIn 生产 Adapter 的接入日期。

## 6. 文档一致性检查

Review 时请确认以下文档之间没有冲突：

- [体验差异与范围](./UX-DELTA-AND-SCOPE.md)：不改变 M4 领域语义；
- [对话式 Run PRD](./CONVERSATION-RUN-PRD.md)：完整生命周期；
- [事件与状态](./EVENT-CARD-AND-STATE-SPEC.md)：事件、卡片、命令和禁止状态；
- [Context 树](./CORE-CONTEXT-TREE-AND-COMPOSER-SPEC.md)：对象层级、勾选、Chip、Snapshot；
- [右侧活动区](./ACTIVE-INSPECTOR-SPEC.md)：Context/产出切换；
- [Storyboard](./COURSEWARE-AND-PACKAGE-STORYBOARD.md)：逐帧产品体验。
- [体验差异与范围](./UX-DELTA-AND-SCOPE.md#6-nineclaw-证据采用)：100% 复刻口径、逐帧字段与允许差异类型。

## 7. Review 结果填写

| 文档 | 结论 | 修改意见 | 用户确认日期 |
| --- | --- | --- | --- |
| UX Delta | 通过 | 无 | 2026-08-21 |
| Conversation Run PRD | 通过 | 无 | 2026-08-21 |
| Event/Card/State | 通过 | 无 | 2026-08-21 |
| Core Context Tree | 通过 | 无 | 2026-08-21 |
| Active Inspector | 通过 | 无 | 2026-08-21 |
| Storyboard | 通过 | 无 | 2026-08-21 |

## 8. Review Gate

本 Review Gate 已于 2026-08-21 通过。后续流程为：

1. 产品与交互文档状态已更新为 `REVIEWED_APPROVED`；
2. 使用 To Spec 把 PRD 转为可验收 Feature Spec；
3. 使用 To Tickets 按单课件、方案包、Context/Inspector、恢复与 Review Gate 拆纵向票；
4. 用户确认 Tickets 后才进入 Implementation；
5. Implementation 必须保留 M4 现有领域测试，并新增动态 Conversation Run E2E 和视觉关键帧。
