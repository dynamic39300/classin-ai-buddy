---
title: Agent 私聊发现、历史与响应体验设计
status: IMPLEMENTED_USER_ACCEPTED
version: v1.2
date: 2026-08-24
owner: ClassIn AI Native Product Design
---

# Agent 私聊发现、历史与响应体验设计

## 1. 目标与范围

本设计同时覆盖教师和学生的私聊消息中心，解决三个连续问题：先找到当前班级已授权的 Agent，再恢复与该 Agent 的同一条隔离会话，最后以可信但不伪造思维链的状态表达等待过程。

本轮使用固定、脱敏、可重置的 `[模拟]` 数据。真实 Agent Directory、长期记忆、生产留存策略、真实流式 Runtime 和生产授权后台不在范围内。

研究依据见 [Private Agent Conversation Discovery, History and Response States](../../../01-research/source-notes/private-agent-conversation-discovery-history-and-response-states-20260824.md)。Slack、Teams、Discord 和 W3C 的一手资料共同支持：可访问 Agent 要可搜索、Agent 身份要显式、历史会话要可续接、处理中状态要可感知；本方案中的具体排序、分页和模拟时长是 ClassIn 产品判断，不是外部产品事实。

## 2. 锁定交互

### 2.1 私聊目录

- 搜索前先按 `actorRole + classId + private-direct + authorizationVersion` 过滤；无权 Agent 不进入候选、计数或无结果文案。
- 默认范围是“全部”，并提供“班级 Agent N”和“联系人 N”两个单击范围；范围切换不清空查询。
- “全部”中 Agent 分组位于联系人之前。Agent 依次按精确名称、名称前缀、课程/能力命中和稳定配置顺序排序；联系人按最近消息时间排序。
- 同一搜索框匹配 Agent 名称、短名、课程和公开能力关键词，也匹配联系人名称、关系和最近消息摘要。空查询立即恢复当前范围的完整列表。
- 持久列表不是弹出式 Picker：键盘使用 Tab 进入范围按钮和会话行，Enter/Space 打开或切换会话；动态结果以状态文本播报。新建私聊继续使用既有 Combobox Picker，Conversation Header 下不再重复 Agent 身份说明和切换入口。

### 2.2 Agent 身份

Agent 不能只靠颜色与人类区分。以下位置均投影同一稳定 `agentId` 对应的名称和 Sparkles 头像语义：

- 私聊列表行；
- 当前会话 Header；
- Agent 发出的每条消息；
- 等待和失败状态。

人类联系人继续使用姓名首字头像与关系摘要。颜色仅辅助层级，不承担唯一身份信息。

按 D-085，IM 条目不再逐项重复 `[模拟] AI Agent` 或 `[模拟] Agent`。模拟属性由 WorkBuddy Surface 的场景级 `[模拟] 数据` 边界统一说明，并继续保留在 Domain、Receipt、Evaluation 和审计字段中；本规则只降低界面噪音，不改变真实接入 Gate。

### 2.3 会话和历史

- 点击 Agent 打开当前 Actor 的既有隔离 Thread；教师和学生即使引用同一个 Agent，也不共享 `threadId`、消息或草稿。
- 固定 Demo 为每个 Agent/Actor 提供人类与 Agent 交替的可重置历史。当前页先显示最近消息，向上到达顶部或点击“加载更早消息”后 prepend 旧页。
- prepend 后按旧 `scrollHeight` 差值补偿 `scrollTop`，用户视野中的消息不跳动；切换会话后恢复各线程自己的滚动位置。
- 用户正在读历史时，新 Agent 消息不强制贴底，显示“1 条新消息”锚点；用户处于底部时自然跟随新消息。
- 当前 Demo 的历史只存在前端 Scenario 生命周期；刷新重置是明确的模拟行为，不宣称生产持久化完成。

### 2.4 响应状态

显式状态为：

```text
idle
  → replying.understanding
  → replying.composing
  → replied
  ↘ recoverable_failure → retry
```

- 用户消息立即进入当前 Thread；等待占位使用 Agent 自身身份。
- 可见文案依次为“正在理解你的问题”和“正在整理可检查的回复步骤”，配合三点动效；不展示隐藏思维链、百分比或虚假精确 ETA。
- 当前 Mock Adapter 使用确定性约 `1.8s` 总等待，并由 Controller 在中段切换可见阶段，以便稳定演示和测试。
- 人工等待只属于 Mock Adapter。未来真实 Runtime 必须由真实 accepted/processing/streaming/completed 事件驱动，不得再加 sleep。
- 失败保留用户消息并提供重试；重试仍写回原 Thread，不得因切换会话把回复投到新目标。
- Reduced Motion 下取消三点位移动画，但保留状态文字与生命周期。

## 3. Module 与 Interface

| Module / Seam | 拥有的复杂度 | 页面消费的 Interface |
| --- | --- | --- |
| `DirectConversationDirectoryModule` | 授权优先过滤、Agent/联系人搜索、稳定分组与计数 | `project({ role, classId, query, scope, threads })` |
| `AgentDiscoveryModule` | Agent 定义、授权、能力关键词和稳定排序 | 由目录 Module 组合，不由页面复制规则 |
| `MessageWorkspaceStore` | prepend 旧页后的 MessageThread 状态 | `loadOlderMessages(threadId)` |
| `ClassAgentConversationProvider` | 每 Thread 回复状态、阶段计时、失败和重试 | `submit`、`retry`、`getThreadStatus` |
| `ClassAgentConversationAdapter` | 模拟或真实 Runtime 的响应时序和内容 | `submit(request)` |

页面只负责列表、滚动锚点、焦点、ARIA 和状态投影，不拥有授权或回复内容规则。

## 4. 师生矩阵

| 验收项 | 教师 | 学生 |
| --- | --- | --- |
| 当前班级授权 Agent 数量与搜索结果 | 自己可用的 4 个固定 Agent | 自己可用的 4 个固定 Agent |
| Agent 历史 | 仅教师 Thread | 仅学生 Thread |
| 另一角色的 Thread、消息和草稿 | 不可发现 | 不可发现 |
| Agent 身份与模拟边界 | 名称/图标在列表、Header、消息、状态一致；场景级真值保留 | 同左 |
| 等待阶段、完成和失败重试 | 同一状态模型 | 同一状态模型 |

## 5. 验收条件

- “班级 Agent”范围准确显示当前班级授权的 4 个 Agent；搜索“变量”只返回实验探究助手；“联系人”范围不混入 Agent。
- 列表、Header、历史消息和处理中占位均能用文字识别 Agent，不能只靠颜色。
- 教师和学生打开同名 Agent 后只看到各自固定历史；加载更早消息后同时存在人类与 Agent 消息，切换回来仍保留。
- prepend 旧页不改变视觉锚点；读历史时的新消息不抢滚动位置，可用锚点回到底部。
- 提交后先出现理解阶段，再出现整理阶段，最后完成；场景级模拟边界持续存在，失败可重试。
- TypeScript、Lint、Domain/Integration、浏览器可访问性和范围视觉基线全部通过。

## 6. 后续生产 Gate

- 用真实 Directory Adapter 替换固定 Binding 时，仍必须在搜索前完成授权过滤，并验证撤权/版本变化。
- 真实历史需要确定服务端分页游标、删除/保留策略、跨设备同步和审计权限；当前数组分页不能被视为生产存储方案。
- 真实 Runtime 接入 accepted/processing/streaming/completed/failed/cancelled 事件后，再决定是否开放 Stop；没有可取消协议时不展示无效 Stop。
- 任何模型内部推理都不进入 UI、日志或消息事实；只展示对用户有用、可验证的工作阶段。
