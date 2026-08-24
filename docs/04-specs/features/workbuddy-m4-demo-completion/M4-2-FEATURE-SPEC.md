---
title: M4.2 IM AI Case Coverage Feature Spec
status: COMPLETE_USER_ACCEPTED
version: v1.7
date: 2026-08-24
decision: D-078, D-085
---

# M4.2 Feature Spec

## 1. Boundary

本 Feature 在现有 IM 三渠道上新增 WB-06，并深化 PA-01/DA-01。页面只编排 Interface；生成、版本、入库、分发、渠道教学策略和证据校验隐藏在 Deep Module 内。

## 2. Domain Model

- `GuidedExplanationArtifact`：`id/version/title/question/summary/steps/finalAnswer/delivery/presentation/truthLabel/sourceRef`。`delivery.body/linkLabel` 是最终发送话术与文字链接；`presentation` 表达交互能力而非文件扩展名。
- `MessageContentReference`：引用被批准的 `artifactId/version`，携带允许在接收端展示的只读 Projection，以及 Run、Context、Action、Approval、Receipt 证据。
- `GuidedTutoringPolicy`：由 `public-class/private-direct` 选择公开短提示或私聊分步辅导；两者共享 `ClassAgentDefinition` 和 capability ID。

## 3. Interfaces and Seams

- `GuidedExplanationModule.prepare/revise/approve`：拥有 Artifact、全量可编辑字段、版本、Action 与 Approval 规则；`revise` 接受标题、导读、题目、步骤标题/正文/检查点和最终答案，规范化后原子地产生新版本；
- `GuidedExplanationAdapter.generate/execute`：生成和消息分发 Seam；Mock 固定、脱敏、可重置；
- `ArtifactLibraryModule.add/list/get`：保存动态 WorkBuddy 产物并按稳定引用去重；
- `MessageWorkspaceActions.appendMessage`：只接受已经 Adapter 验证的 ContentReference；
- `GuidedTutoringModule.replyProjection`：隐藏渠道化回答结构，不由页面写条件分支。
- `DirectConversationDirectoryModule.project`：隐藏私聊授权优先过滤、全部/Agent/联系人范围、能力搜索、稳定分组与计数；页面只消费 Projection。
- `MessageWorkspaceActions.loadOlderMessages`：通过 Message Domain prepend 固定历史页；页面只管理 DOM 滚动锚点和焦点。
- `ClassAgentConversationProvider`：按 Thread 管理 `understanding/composing/completed/recoverable_failure`；Mock Adapter 独占确定性响应时序。

## 4. State Model

```text
ready → generating → needs_input | generation_failure | draft_ready
generation_failure → generating（新建逻辑 Run）
draft_ready → executing_save_and_send → sent
executing_save_and_send → recoverable_failure | permission_denied | evidence_mismatch
recoverable_failure → executing_save_and_send（同一批准动作与幂等键）
permission_denied → close_and_request_permission
evidence_mismatch → close_and_manual_review
```

每次新的生成请求创建唯一稳定 RunRef；同一 Run 内每次 revise 增加 Artifact version 并使旧 Approval 失效。Receipt 必须引用 Run、Context、Artifact、Action、Approval；Evaluation 只在证据匹配时创建。相同幂等键若请求指纹不同必须 fail closed。

## 5. Behavioral Requirements

1. 任务解析检测“讲题/讲解/解题/不会做”等意图并选择 `guided-explanation`，不影响既有任务。
2. 群和私聊上下文都可生成 WB-06；私聊普通 Prompt 仍生成回复建议。
3. 最近学生消息为空或不能形成题目时返回 NeedsInput。
4. 确定性 Artifact 使用完整的数值型动量守恒应用题，讲解包含已知量、正方向、带符号变量、`m_Av_A+m_Bv_B=m_Av'_A+m_Bv'_B`、代入计算、单位/方向校验和 `4.0 m/s，向右` 的完整答案；不得只生成理论概念说明。
5. 保存成功后动态出现在“我的文件”，类型为“交互讲解”；文件名和列表不显示 `H5`，具体格式只属于 Presentation Adapter 内部事实。
6. 群上下文仅能发当前群，私聊仅能发当前线程；作者为教师，ContentReference 保留模拟真值和完整执行证据，但消息 UI 不重复投影逐项模拟标签。
7. 消息卡使用可关闭 Dialog 打开，支持键盘关闭和焦点恢复，不执行任意 HTML。
8. PA-01 为起步提示加自检问题；DA-01 为三个连续步骤加自检问题。两者不出现直接最终结论。
9. 群聊和当前学生 1v1 共用同一 WB-06 Artifact 与审核 Surface。教师可以编辑题目、四步讲解的标题/正文/检查点和完整答案；点击“应用修改”后统一增加一次 Artifact version，更新 Action/ContentReference 草稿并使旧审批失效。审核面存在未应用修改时，“确认保存并发送”不可执行。
10. 教师和学生私聊目录先按当前班级授权过滤，再按名称、课程或能力搜索；默认全部，并可切换 Agent/联系人范围。Agent 身份在列表、Header、消息和状态中以稳定名称和专属图标显式一致。
11. Agent 私聊恢复当前 Actor 的同一隔离 Thread，支持向上加载固定人类+Agent 历史、保持视觉锚点和线程滚动位置；读历史时新消息不强制贴底。
12. 模拟私聊回复先后投影理解和整理阶段，再进入完成或可恢复失败；约 1.8 秒延时只位于 Mock Adapter，不暴露隐藏思维链或虚假 ETA。
13. WB-06 审核面以 `delivery.body` 为首要可编辑交付物，并把 `delivery.linkLabel` 投影为话术内的文字链接；链接在发送前可打开同一 Viewer 预览当前草稿，发送后打开批准版本。
14. 学生消息允许只提供课程/作业/题号与卡点；GuidedExplanation Module 通过 Context Snapshot 解析完整题目。定位不唯一时进入 NeedsInput，不由 UI 或 Mock 静默猜测。
15. IM 中不逐项显示 `[模拟] AI Agent`、`[模拟] Agent` 或 `H5`。稳定身份由名称和专属图标表达，WorkBuddy Surface 保留场景级 `[模拟] 数据` 边界，Domain、Receipt、Evaluation 和审计字段继续保存真值。

## 6. Write Set

本期修改决策/规格、guided-explanation domain/contract/mock、WorkBuddy IM、Message Workspace、文件库投影、Class Agent policy 及对应测试。不修改 M4.1 completed-session composer 语义，不实现真实网络、文件或媒体服务。

## 7. Test Contract

- Domain：格式中立、具体数值/公式/答案、全量字段修订、无效空值回退、no-op 不增版、版本失效、目标策略、证据关联、幂等；
- Integration：群/私聊生成、编辑最终话术及题目/步骤/答案、发送前预览、应用新版本、审核分发、动态“我的文件”、PA/DA 渠道差异与隔离；
- E2E：现实题号提问、教师编辑最终话术、发送前预览、批准、Receipt、切换到学生角色与目标线程、打开同一 Artifact 版本；
- Visual：DraftReview、消息卡、Viewer、窄屏；
- Regression：WB-01/WB-02 和既有 Class Agent 测试保持通过。
- Agent Direct：Domain 覆盖授权/范围/能力搜索与历史 prepend；Integration/E2E 覆盖师生隔离、历史保持、两段处理中状态；Visual/a11y 覆盖列表、Header、状态与 Reduced Motion。
