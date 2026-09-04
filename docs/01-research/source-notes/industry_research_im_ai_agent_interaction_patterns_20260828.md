---
title: IM 与沟通场景中的 AI Agent 交互模式行业研究
status: RESEARCH_BASELINE
version: v1.0
date: 2026-08-28
scope: team-chat-meeting-community-education-agent-native
evidence: first-party-official-sources-only
---

# IM 与沟通场景中的 AI Agent 交互模式行业研究

> 本文为 ClassIn IM 2.0 多方案推演提供外部证据，不是产品决策或 Feature Spec。研究只采用截至 2026-08-28 可访问的官方产品文档、帮助中心、开发文档和官方发布材料，不把二手报道、Notion 中的竞品描述或营销推断写成产品事实。

## 0. 结论摘要

行业里并不存在一个已经完整解决“AI 如何进入人类群聊”的标准答案。相反，代表性产品正在形成五条相对清晰的路径：

1. **私人辅助层**：AI 阅读用户有权访问的会话，在私密界面提供总结、搜索、草稿和行动建议；只有用户主动分享后才进入公共会话。Slack 的 AI 总结与搜索是典型做法。
2. **显式召唤的公共参与者**：Agent 先被添加为会话成员，再通过 `@Agent` 进入群聊、频道或会议聊天；身份、上下文边界和移除入口可见。Slack Agents 与 Teams Channel Agent 属于这一路径。
3. **受治理的会议促进者**：主持人显式开启 AI，AI持续理解现场，自动形成笔记、议程、行动项和结果；敏感动作通过“接受同步”、主持人开关或访问策略控制。Teams Facilitator 与 Zoom AI Companion 提供了成熟证据。
4. **静默观察、教师掌控的学习助手**：学生分别与 AI 对话，AI 在后台为老师生成班级趋势、误区、求助与风险信号；老师查看完整上下文并决定干预。SchoolAI 的 Space + Mission Control 最接近这一模式。
5. **从对话转向可追踪委托**：Agent 不只回复，而是获得一个显式任务 Session，展示进行中、等待输入、完成和结果；人类仍保留所有权。Linear 的 Agent Delegate 是清晰范例，MuleRun 则展示跨应用执行、记忆、日志和审批门的工作空间方向。

对 ClassIn 最重要的判断是：

- `VERIFIED`：主流产品普遍把**私密 AI 辅助**与**公开 Agent 发言**分成不同表面；公开参与通常需要添加、`@`、主持人开启或显式工作流触发。
- `VERIFIED`：高风险场景正在采用“上下文权限一致、输出先预览、动作再审批、结果留痕、人工可接管”的组合，而不是只靠一段系统提示词约束 Agent。
- `INFERENCE`：ClassIn 方案一不应只增加 `@Agent`，而应补齐“私密理解 → 建议 → 教师确认 → 公开动作 → 结果回执”的完整治理链。
- `INFERENCE`：真正有机会形成方案三的行业空白，是**从自然师生聊天中静默识别高频教学信号，由老师治理 AI 的介入方式，并把沟通转化为可收口、可验证的学习行动**。现有团队 IM 擅长沟通和任务协作，教育 AI 擅长个体 AI 对话与教师看板，但尚未看到一手证据证明某个产品已把两者在真实师生 IM 中完整结合。
- `UNKNOWN`：当前没有真实、脱敏的 ClassIn 师生聊天语料，因此不能声称“共性问题、作业订正或个别答疑”中的任何一个已经被验证为最高频切入点。第一步应先做话题与任务研究。

## 1. 研究问题与证据规则

### 1.1 研究问题

本文集中回答：

1. AI 在单聊、群聊、频道、Thread、会议与课堂对话中如何被触发？
2. 被动回答、静默理解、主动建议、公开介入和执行动作分别怎样落地？
3. 身份、可见性、权限、审批、引用、记忆、通知、总结和人工接管如何设计？
4. 哪些模式可直接增强方案一 `AI Enhanced IM`？
5. 哪些组合足以构成与方案一、方案二都有实质差异的方案三？

### 1.2 证据标签

- `VERIFIED`：官方来源明确说明的现有产品行为。
- `VERIFIED · PREVIEW`：官方说明存在，但处于 Public Preview、Alpha、实验或 Coming Soon。
- `VERIFIED · HISTORICAL`：官方历史实验，只能证明曾经探索过，不能视为当前能力。
- `INFERENCE`：基于多个事实形成的产品判断。
- `UNKNOWN`：官方材料不足，不能确认。

所有来源的统一访问日期为 **2026-08-28**；如果官方页面给出了发布日期、更新时间或预览状态，本文另行注明。

### 1.3 代表性案例范围

为避免堆砌功能，本文收敛为八个代表性案例：

| 类别 | 代表案例 | 选择原因 |
|---|---|---|
| 团队 IM | Slack | 私密 AI 总结/搜索与公共 Agent 频道参与并存 |
| 团队 IM、频道与会议 | Microsoft Teams | 权限安全分享、Channel Agent、Facilitator 三种表面完整 |
| 会议与 Team Chat | Zoom | 会议问答、总结、动作转换和主持人治理成熟 |
| 社区与 IM 基础结构 | Discord | Channel、Thread、Forum、Reaction 与 App 权限结构清晰 |
| 教育 AI | SchoolAI | 学生独立 AI 会话、教师实时洞察和干预控制形成双端投影 |
| Agent-native 协作 | Linear | Agent 身份、委托、所有权和 Session 状态明确 |
| AI 客服对话 | Intercom Fin | 主动触发、结果确认、暂停审批和人工接管规则成熟 |
| AI 原生工作空间 | 阿里云 MuleRun | 跨渠道、四层记忆、日志、审批门和跨应用执行 |

## 2. 八个代表性案例

## 2.1 Slack：私人 AI、公共 Agent 与专属任务空间分层

### 已验证事实

- `VERIFIED`：Slack 原生 AI 可以总结 Channel、DM 和 Thread；自然语言搜索答案带来源引用，并且只使用当前用户有权访问的 Slack 内容。[Slack AI 功能指南](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack)、[Slack AI 安全说明](https://slack.com/help/articles/28310650165907-Security-for-AI-features-in-Slack)（访问：2026-08-28）。
- `VERIFIED`：AI 搜索/总结的默认结果是个人可见的临时结果；用户可在检查后主动分享有价值的答案到 Channel 或 DM。[Slack AI 功能指南](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack)（访问：2026-08-28）。
- `VERIFIED`：Slack Agents 可以在一对一会话或分屏中使用；Agent 加入 Channel 后，用户通过 `@Agent` 触发。Channel 中的 Agent 互动可以设计为公开或仅发起者可见，成员可从 Channel 移除 Agent。[Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)（访问：2026-08-28）。
- `VERIFIED`：Slack 将 Code Channel 定义为团队与 Agent 协作的专属临时空间，创建时选择 Public/Private，并在 Agents & tools 中展示任务是否正在工作或等待关注。[Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)（访问：2026-08-28）。
- `VERIFIED`：第三方 Agent 能访问什么数据、执行什么动作取决于 App scopes；管理员可以启用安装审批，Agent 默认只能访问与其直接对话的数据，加入其他会话后才获得该会话范围的数据。[Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)（访问：2026-08-28）。

### 模式判断

- `INFERENCE`：Slack 的关键不是“把 AI 放进聊天框”，而是把三种工作明确分层：个人理解用私密 AI、公共讨论用被添加且被 `@` 的 Agent、长任务用独立任务空间。
- `INFERENCE`：这能直接映射到 ClassIn：老师私密 TeacherIn、班级可见 Agent、一次教学行动 Run 不应混成同一消息身份与同一可见范围。
- `UNKNOWN`：Slack 官方页面说明 Agentforce 可建议并采取动作，但未在本轮证据中给出所有动作的逐项审批规则，不能据此假定“任何 Channel 动作都有统一审批门”。

## 2.2 Microsoft Teams：公共回答前做权限交集检查

### 已验证事实

- `VERIFIED · PREVIEW`：Copilot 可以通过“添加 Agents and bots”或首次 `@Copilot` 加入 1:1/Group Chat，并作为参与者发送欢迎消息。提问者需要 Copilot 许可；没有许可的群成员仍可阅读其他人发起的公开回答。[Teams group chats 中使用 Copilot](https://support.microsoft.com/en-US/Teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats)（访问：2026-08-28，页面标注 Public Preview）。
- `VERIFIED · PREVIEW`：当 Copilot 的回答只使用 Web 或所有群成员都能访问的知识源时，回答可直接公开；若回答引用了并非所有成员都有权限的内容，只有提问者先看到预览，并选择 Approve/Reject 是否向群内公开。[Teams group chats 中使用 Copilot](https://support.microsoft.com/en-US/Teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats)（访问：2026-08-28）。
- `VERIFIED · PREVIEW`：Channel Agent 以所在 Channel 的名称和图标形成上下文身份，通过 `@` 参与；它可基于 Channel、相关会议和扩展知识源回答、生成状态报告、安排会议和管理任务。当前仍有“一个 Channel 一个 Agent、不支持 Private Channel/外部参与者”等限制。[Teams Agents FAQ](https://support.microsoft.com/en-us/teams/platform/frequently-asked-questions-about-agents-in-microsoft-teams)（访问：2026-08-28，Channel Agent 标注 Public Preview）。
- `VERIFIED`：Facilitator 由会议组织者在排期或会议中显式开启；它生成实时笔记、总结决策与开放问题、读取议程并管理计时，也可以在 Meeting Chat 中被 `@`。内部参会者能看到实时更新，外部参会者不能访问会议笔记。[Facilitator in Microsoft Teams meetings](https://support.microsoft.com/en-US/teams/copilot/facilitator-in-microsoft-teams-meetings)（访问：2026-08-28）。
- `VERIFIED · PREVIEW`：Facilitator 自动捕获任务后，用户需要点击 **Accept to sync** 才同步到 Planner；被明确请求创建/编辑的任务可直接同步。生成的会议笔记存入可由参会者继续编辑的 Loop 页面。[Facilitator in Microsoft Teams meetings](https://support.microsoft.com/en-US/teams/copilot/facilitator-in-microsoft-teams-meetings)（访问：2026-08-28，部分任务能力标注 Public Preview）。

### 模式判断

- `INFERENCE`：Teams 给 ClassIn 最有价值的不是 Channel 结构本身，而是**公共回答的权限交集门**：Agent 可以基于老师的私有上下文生成，但在公开前必须检查学生是否有权看到来源；不满足时先给老师私密预览。
- `INFERENCE`：Channel Agent 的“上下文身份”可映射为班级 Agent——它属于特定班级/课程，而不是一个能跨所有班级无边界读取的万能账号。
- `INFERENCE`：Facilitator 表明主动 AI 不等于频繁插话；实时笔记、议程进度、行动项和结束后的可编辑结果，往往比公共语言回复更有价值。

## 2.3 Zoom：AI 在会议中可见、可请求、可停止、可转为动作

### 已验证事实

- `VERIFIED`：参会者可以在私人的 AI Companion Panel 中询问当前会议；回答可引用会议语音转写，也可在权限允许时使用个人 Zoom 数据或外部数据。回答菜单可将结果发送到 Chat、创建 Task 或创建 Doc。[Asking in-meeting questions with AI Companion](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057748)（访问：2026-08-28）。
- `VERIFIED`：Meeting Summary 由 Host 开启，也可以由参会者发起“请求 Host 开启”；AI 启用时所有参会者看到状态指示。Host 可以停止 AI，并选择删除关联 Transcript/Summary 资产。[Using Meeting Summary with AI Companion](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0058013)（访问：2026-08-28）。
- `VERIFIED`：管理员可以限定 Summary 自动分享给 Host、Host/Co-host、内部 Invitees 或全部 Invitees；还可以禁止外部分享、设置 IP 访问、保留期和自动删除。[Enabling or disabling meeting summary](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960)（访问：2026-08-28）。
- `VERIFIED`：当 Zoom AI Companion 作为第三方会议机器人进入 Google Meet 或 Teams 时，会议中会显示带 Zoom/AI 标志、Owner 名称和 Transcribing 状态的参与者 Tile，并通过 Chat 通知其存在与目的。[Using AI Companion in third-party meetings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0080354)（访问：2026-08-28）。
- `VERIFIED`：Zoom 官方在 2025-03-17 发布的 Agentic AI 说明中，明确把会议、Chat、Email 中检测到的 Action Items 转为 Tasks，并支持安排跟进会议或从会议生成文档。[Zoom agentic AI announcement](https://news.zoom.com/enterprise-connect-2025/)（发布：2025-03-17；访问：2026-08-28）。

### 模式判断

- `INFERENCE`：Zoom 的成熟点是“私人询问 → 主动分享 → 结构化动作”的渐进链，而不是让 AI 默认在公共 Chat 里回答所有问题。
- `INFERENCE`：ClassIn 可以复用“AI 正在观察/总结”的可见状态、教师开关和作用范围，而不能让后台分析处于无提示的无限监听状态。
- `INFERENCE`：把一条 AI 结果转为临时教室、待办、微练习或教师私聊跟进，比单纯复制回复更接近 ClassIn 业务价值。

## 2.4 Discord：为 Agent 提供可组合的 IM 原语，但不是现成的 AI 方案

### 已验证事实

- `VERIFIED`：Discord Forum Channel 将讨论组织成独立 Post，支持 Guidelines、Tags、搜索、列表/画廊布局、关闭/重开和角色权限；Discord 明确区分“Forum 是 Channel 类型，Thread 是 Message 类型”。[Forum Channels FAQ](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ)（更新：2024-10-24；访问：2026-08-28）。
- `VERIFIED`：Thread 允许在 Channel 内建立更聚焦的子讨论，并分别设置“全部消息/仅提及/无通知”。[Threads FAQ](https://support.discord.com/hc/en-us/articles/4403205878423-Threads-FAQ)（访问：2026-08-28）。
- `VERIFIED`：Reaction 是附着在单条消息上的轻量反馈，可查看参与者并单独配置通知。[Reactions and Super Reactions FAQ](https://support.discord.com/hc/en-us/articles/12102061808663-Reactions-and-Super-Reactions-FAQ)（更新：2025-12-11；访问：2026-08-28）。
- `VERIFIED`：Discord Apps 可以通过 Slash Command、Message Command、User Command、Button、Select 和 Modal 被显式触发；触发范围可配置为 Server、Bot DM 或 Private Channel，回复可以是仅触发者可见的 Ephemeral Message。[Discord Interactions & Commands](https://docs.discord.com/developers/platform/interactions)、[Application Commands](https://docs.discord.com/developers/interactions/application-commands)（访问：2026-08-28）。
- `VERIFIED`：App Command 权限可以按 User、Role、Channel 控制，Thread 继承 Parent Channel 权限；App/Bot 的 scopes 与 permissions 决定它能访问的数据和能执行的动作。[Application Commands](https://docs.discord.com/developers/interactions/application-commands)、[Building your first Discord Bot](https://docs.discord.com/developers/quick-start/getting-started)（访问：2026-08-28）。
- `VERIFIED · HISTORICAL`：Discord 2023 年官方博客曾将 Clyde、AI AutoMod 和 Conversation Summaries 描述为有限 Server 中的公开实验；Clyde 通过 `@Clyde` 触发，只读取直接发给它或它创建的 Thread 中的消息。[Discord is Your Place for AI with Friends](https://discord.com/blog/ai-on-discord-your-place-for-ai-with-friends)（发布：2023；访问：2026-08-28）。

### 模式判断与边界

- `INFERENCE`：Discord 最值得借鉴的是**对象层次与触发原语**：群聊不是一条无限 Feed，而可以由 Channel、Forum Post、Thread、Reaction、Command 和 Ephemeral Response 组合。
- `INFERENCE`：对 ClassIn 而言，Thread/Topic 能承接“一个问题”，Reaction 能承接低成本反馈，Ephemeral Response 能承接老师私密预览；这些是方案一需要补的 IM 表达能力，但本身不构成 Agent 价值。
- `UNKNOWN`：本轮未找到截至 2026-08-28 的官方材料证明 2023 Clyde 生成式 AI 实验仍作为当前通用能力提供。因此本文不把 Clyde 当作当前竞品，只把它作为历史交互实验。

## 2.5 SchoolAI：学生私聊 AI，老师看班级信号与完整上下文

### 已验证事实

- `VERIFIED`：老师创建一个 Space，定义目标、年级、标准、提示与 AI 行为；学生分别通过 Chat 与个人助手 Dot 互动。老师可先以学生身份 Preview，再通过链接、二维码或 LMS 启动给学生。[Getting Started with Spaces](https://help.schoolai.com/en/articles/15538519-getting-started-with-spaces)（访问：2026-08-28，官方页面更新于 2026-08-27）。
- `VERIFIED`：Mission Control 实时呈现学生进度、学习结果、情绪/参与信号、误区、需要帮助和安全提醒；老师可以钻取到单个学生的完整 Chat，而不只是看 AI 摘要。[Your Guide to Mission Control](https://help.schoolai.com/en/articles/15243484-your-guide-to-mission-control)、[Student Insights Dashboard](https://help.schoolai.com/en/articles/16192386-student-insights-dashboard)（访问：2026-08-28）。
- `VERIFIED`：老师可以 Pause 或 End Session；暂停会暂时停止学生继续获得响应，结束后 Session Data 仍保留供查看。[Create and use Spaces](https://help.schoolai.com/en/articles/10270295-create-and-use-spaces-with-the-space-creator)（访问：2026-08-28）。
- `VERIFIED`：Student Insights 的聊天与洞察只对该学生的任课老师和组织管理员开放；Alert 带严重级别、时间、原因和可能的后续建议，但官方明确说明 Sidekick 只暴露信号，后续动作由老师决定。[Student Insights Dashboard](https://help.schoolai.com/en/articles/16192386-student-insights-dashboard)（访问：2026-08-28）。
- `VERIFIED · COMING SOON`：Smart Groups 的 Next Steps 将基于掌握度、误区、情绪等分组生成后续 Worksheet/Space 建议，并由老师点击生成、编辑和分发。[Next Steps for Smart Groups](https://help.schoolai.com/en/articles/16558402-what-s-new-in-mission-control-next-steps-for-smart-groups)（访问：2026-08-28，页面标注 Coming Soon）。

### 模式判断

- `INFERENCE`：SchoolAI 最接近方案二的“双重投影”：学生看到个性化 AI 会话，老师看到班级层趋势、风险和下一步；双方不需要共享同一界面。
- `INFERENCE`：它也揭示一个关键空白：Space 是老师预先创建并发起的 AI 活动，而不是从老师—学生私聊与班级自然群聊中持续长出来。ClassIn 的差异化机会正是在原有 IM 内发现信号，而不是要求老师先切换到另一个 AI 活动系统。
- `INFERENCE`：情绪、误区和安全标签必须只在教师私密面呈现，且可回看原始证据；不能把未经教师确认的学生标签公开写进班级群。

## 2.6 Linear：Agent 是 Delegate，不接管人的责任

### 已验证事实

- `VERIFIED`：Linear 将 Agent 建模为可识别的 App User，由 Workspace Admin 安装，并在安装时选择可以访问的 Team。Agent 可以被 `@`、被委托 Issue、创建/回复 Comment 和参与 Project/Document。[Linear AI Agents](https://linear.app/docs/agents-in-linear)（访问：2026-08-28）。
- `VERIFIED`：Issue 委托给 Agent 后，原 Human Assignee 仍是 Owner，Agent 是 Delegate/Contributor；人类责任不因 Agent 执行而转移。[Linear AI Agents](https://linear.app/docs/agents-in-linear)、[Assign and delegate issues](https://linear.app/docs/assigning-issues)（访问：2026-08-28）。
- `VERIFIED · DEVELOPER PREVIEW`：Agent 被 `@` 或被委托后创建 Agent Session；Session State 对用户可见，Agent 通过 Activity 更新状态，并应快速确认已经开始处理。[Linear Agents Developer Guide](https://linear.app/developers/agents)（访问：2026-08-28，Developer Preview）。
- `VERIFIED`：Agent 的 Mention、Assign、Customer Read/Write 等能力由不同 scope 控制；App Agent 不能请求 Admin scope，管理员可修改或撤销 Team Access。[Linear Agents Developer Guide](https://linear.app/developers/agents)（访问：2026-08-28）。

### 模式判断

- `INFERENCE`：Linear 为 ClassIn 提供了比“Agent 发了一条消息”更好的责任模型：老师始终是教学 Owner，Agent 只是受托执行者；公开页面应显示 Agent 在做什么、是否等待老师、产出了什么。
- `INFERENCE`：ClassIn 的临时教室、微活动、个性化跟进、资料生成等动作都应该拥有可恢复的 Agent Session，而不是把“正在处理”藏在一个气泡 Loading 中。
- `INFERENCE`：这一模式适合增强方案一的 Action Card，也可成为方案三“从聊天生成教学 Case”的状态骨架。

## 2.7 Intercom Fin：暂停审批与永久人工接管是不同状态

### 已验证事实

- `VERIFIED`：Fin 可以由“打开新会话”或“发送第一条消息”等工作流触发，并可按 Audience 分支配置不同体验；它能在交接前收集更多信息、处理 Follow-up，并以确认解决、无响应或交接等 Outcome 结束。[Use Fin AI Agent in Workflows](https://www.intercom.com/help/en/articles/10032299-use-fin-ai-agent-in-workflows)（访问：2026-08-28）。
- `VERIFIED`：Fin 可根据用户明确要求人工、负面反馈或多轮未解决等信号触发 Handoff。一个 Human Teammate 发送面向客户的回复后，Fin 停止继续回答。[Use Fin AI Agent in Workflows](https://www.intercom.com/help/en/articles/10032299-use-fin-ai-agent-in-workflows)（访问：2026-08-28）。
- `VERIFIED`：Intercom 明确警告，不应使用会在每条客户消息上重复触发 Fin 的工作流，否则即使人工已经接管，Agent 仍可能不断插入对话。[Use Fin AI Agent in Workflows](https://www.intercom.com/help/en/articles/10032299-use-fin-ai-agent-in-workflows)（访问：2026-08-28）。
- `VERIFIED`：Fin 的 Human-in-the-loop 可以让 Agent 暂停、等待 Teammate 填写 Approve/Deny/Reason 等字段后继续；如果 Teammate 选择 Take over，则流程停止、Fin 不再恢复；超时则按规则 Escalate。[Human-in-the-loop approvals for Fin Procedures](https://www.intercom.com/help/en/articles/14468561-human-in-the-loop-approvals-for-fin-procedures)（访问：2026-08-28）。

### 模式判断

- `INFERENCE`：教育中的“教师确认”至少应拆成两类：
  - **临时审批**：老师回答一个判断，Agent 继续执行；
  - **完全接管**：老师进入师生对话，Agent 立即停止公开发言。
- `INFERENCE`：这比一个笼统的“人工审核开关”更适合 ClassIn，因为老师有时只想批准一张练习卡，有时需要亲自处理学生的敏感或复杂问题。
- `INFERENCE`：Agent 主动介入必须具备防重入规则；“每条消息都触发”会造成抢话和信任崩溃。

## 2.8 阿里云 MuleRun：可借鉴 Agent 工作空间，不足以证明 IM 交互

### 已验证事实

- `VERIFIED`：阿里云官方将 MuleRun 定义为 AI 原生智能工作空间，官方页面列出 SMS、电话、邮件以及 Web/iOS 等触达渠道。[MuleRun 官方产品页](https://www.aliyun.com/product/mulerun)（访问：2026-08-28）。
- `VERIFIED`：官方页面列出四层记忆：会话记忆、用户记忆、工作区记忆、知识网络；并列出实时任务日志、敏感操作审批门和硬件隔离沙箱。[MuleRun 官方产品页](https://www.aliyun.com/product/mulerun)（访问：2026-08-28）。
- `VERIFIED`：官方页面描述 MuleRun 可主动推荐行动、知识/Skill 与工作流优化；用户以自然语言描述需求后，系统理解意图、拆解任务、调用多个智能体，并可通过浏览器自动化、桌面软件和持久工作站完成跨应用任务。[MuleRun 官方产品页](https://www.aliyun.com/product/mulerun)（访问：2026-08-28）。

### 模式判断与证据边界

- `INFERENCE`：MuleRun 对 ClassIn 的价值在底层治理与执行形态：记忆分层、实时日志、审批门、沙箱与跨应用动作，能够支持 TeacherIn 从回复走向受控执行。
- `UNKNOWN`：官方产品页没有说明 MuleRun 是否作为一个成员进入群聊、如何读取群历史、何时主动发言、是否支持 Thread、如何显示 Agent 身份、群成员权限交集或人工接管。因此，MuleRun **不能作为“IM 群聊 Agent 体验已经验证”的证据**。
- `INFERENCE`：MuleRun 更适合作为方案一/方案三的 Harness 与 Agent Workspace 参照，而不是前台师生互动界面的直接竞品。

## 3. 行业交互模式矩阵

| 模式 | 代表证据 | 触发 | 默认可见性 | 上下文 | 输出/动作 | 人工控制 | 对 ClassIn 的意义 |
|---|---|---|---|---|---|---|---|
| 私密 Catch-up | Slack AI | 点总结/自然语言搜索 | 个人 | 用户有权访问的 Channel/DM/Thread | 总结、答案、引用 | 用户检查后分享 | 先帮助老师理解，不打扰群聊 |
| 私密会议问答 | Zoom AI Panel | 用户打开并提问 | 个人 | 当前会议及授权数据 | 答案、转 Chat、Task、Doc | 主动分享 | 私密洞察可一键转为教学动作 |
| 显式公共 Agent | Slack Agent | 添加到 Channel + `@` | 公共或私密交互 | 加入的会话与 App scopes | 回答、任务 | 可移除、管理员审批 App | 班级 Agent 应有成员身份和移除入口 |
| 权限安全公开 | Teams Group Copilot | 添加/`@` | 公共；冲突时先私密预览 | 提问者可访问的数据 | 回答、Artifact | Approve/Reject 分享 | 老师私有来源不能直接泄漏给学生 |
| 上下文 Agent | Teams Channel Agent | Channel 内创建 + `@` | Channel | Channel、会议、扩展知识 | 答案、状态、会议、任务 | Team/外部边界 | Agent 应属于具体班级/课程 |
| 会议促进者 | Teams Facilitator | Host 预先或会中开启 | 参会者共享 | 会议语音、议程、笔记 | 实时笔记、计时、任务、文档 | 关闭、Accept to sync、共编 | 主动性优先作用在结构和进度，而非抢话 |
| 社区命令/私密回复 | Discord Apps | `/`、消息菜单、按钮、Modal | 公共或 Ephemeral | 当前 Server/DM/Channel 权限 | 结构化命令和组件 | Role/User/Channel 权限 | Composer 可同时承载公开与私密 Agent 动作 |
| 教师静默观察 | SchoolAI Mission Control | 学生与 Dot 互动后后台分析 | 教师私密 | 每个学生完整对话与班级聚合 | 误区、求助、情绪、风险 | Pause/End、教师决定后续 | 最接近“聊天信号 → 教师注意力队列” |
| Agent 委托 | Linear Delegate | `@` 或委托 Issue | 团队可见状态 | Issue/Comment/Guidance | 长任务、Comment、贡献 | 人类保持 Owner、撤销权限 | 教学动作需要 Session 与责任所有者 |
| AI 处理/人工接管 | Intercom Fin | 首条消息/工作流/信号 | 对话内 | 对话和配置内容 | 回答、追问、Procedure | Pause for review、Take over、Timeout | 区分批准继续与老师永久接管 |
| 跨应用执行 | MuleRun | 自然语言任务/主动建议 | 工作空间 | 四层记忆与企业资产 | 多 Agent、浏览器/桌面动作 | 日志、敏感动作审批、沙箱 | Agent 行动层参照，不等同群聊体验 |

## 4. 五级 AI 介入模型

行业案例可以被统一为一个从低干扰到高干扰的介入梯度：

| Level | 行为 | 是否公开 | 典型触发 | 风险 | ClassIn 建议 |
|---:|---|---:|---|---|---|
| L0 | 静默理解、分类、聚合 | 否 | 后台信号 | 隐私、误判 | 允许，但要明确数据范围、保留期和教师可见证据 |
| L1 | 私密总结、草稿、提醒和下一步建议 | 否 | 老师打开/系统推荐 | 建议过载 | **默认主动性的主战场** |
| L2 | 用户显式调用后的私人回答/动作预览 | 否 | Composer 命令、`@` 私密模式 | 来源权限 | 答案带引用；动作先预览 |
| L3 | 经授权的公开发言或结构化活动 | 是 | `@Agent`、教师批准、Session 开启 | 抢话、错误扩散 | Mention-only 为默认；公开输出显示来源与责任人 |
| L4 | 跨系统执行、主动跟进与持续编排 | 部分 | 委托/策略触发 | 业务副作用 | ProposedAction → Approval → ExecutionReceipt；可暂停/撤销/接管 |

`INFERENCE`：ClassIn 不应把“AI 主动性”简化为 L3 自动发言。教育价值最高、风险最低的组合通常是 **L0 发现 → L1 私密建议 → 教师选择 L2/L3/L4**。

## 5. 十个治理设计结论

### 5.1 身份：Agent 必须是可识别的参与者或明确的私人工具

- `VERIFIED`：Slack、Teams、Linear 都让公共 Agent 具有名称、图标、成员或 App User 身份。
- `INFERENCE`：ClassIn 应至少区分“TeacherIn 私密搭档”“班级 Agent”“自动化系统消息”；不能用同一头像和消息身份混合私密推理、公开建议与系统结果。

### 5.2 可见性：Private by default，Public by deliberate action

- `VERIFIED`：Slack AI 与 Zoom AI Panel 先在个人表面生成；Teams 在来源权限不一致时先给提问者预览；Discord 支持 Ephemeral 回复。
- `INFERENCE`：老师基于学生隐私、机构资料或其他私聊生成的内容，必须先停在老师私密面。

### 5.3 权限：公开输出权限应取“所有可见者的交集”

- `VERIFIED`：Teams Group Copilot 在群成员不共享来源权限时不直接公开完整答案。
- `INFERENCE`：ClassIn 的公开答案不仅检查发起者权限，还要检查每位可见学生是否有权看到引用材料、其他学生事实和教师私密上下文。

### 5.4 触发：Mention-only 是公共会话的安全默认

- `VERIFIED`：Slack Agent、Teams Channel Agent 与 Discord 2023 Clyde 实验均采用显式 `@`；Discord Apps 更进一步使用命令和组件。
- `INFERENCE`：班级群公开 Agent 默认仅响应 `@` 或教师批准的 Action。主动监听先转化为教师私密信号，不直接转化为公开插话。

### 5.5 引用：AI 结论应能回到消息、文件或教学证据

- `VERIFIED`：Slack AI Search 的答案附来源，用户可回到相应消息或文件核对。[Guide to AI features in Slack](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack)（访问：2026-08-28）。
- `INFERENCE`：ClassIn “8 名学生在问同一问题”必须能展开看到相关消息和聚类依据，并允许老师排除误归类。

### 5.6 记忆：至少拆分会话、个人、班级/工作区和正式知识

- `VERIFIED`：MuleRun 官方列出会话、用户、工作区和知识网络四层记忆；Slack/Teams/Linear 则通过会话、Channel/Team、Issue/Guidance 限定上下文。
- `INFERENCE`：学生私聊事实、AI 推断、教师确认结论和机构规则必须分层，分别具备来源、权限、有效期和删除规则。

### 5.7 审批：批准一次动作和人工永久接管不是同一个状态

- `VERIFIED`：Intercom Fin 区分 Human-in-loop 后继续与 Take over 后 Agent 永久退出；Teams 区分任务建议与 Accept to sync。
- `INFERENCE`：ClassIn 状态至少需要 `SUGGESTED / AWAITING_APPROVAL / EXECUTING / WAITING_FOR_TEACHER / TAKEN_OVER / COMPLETED / FAILED / EXPIRED`。

### 5.8 通知：只有需要人决策或高风险信号才应中断

- `VERIFIED`：SchoolAI 把学习洞察集中在 Mission Control，只对风险 Alert 强化提示；Linear Session 通过状态表明是否需要关注。
- `INFERENCE`：不应为每次聚类、每条总结或每个 Agent 回复制造红点。通知应围绕“需要老师判断、学生等待帮助、动作失败或风险升级”。

### 5.9 总结：总结只是中间产物，下一步与收口才是价值

- `VERIFIED`：Teams/Zoom 把总结连接到 Task、Doc、Planner 或后续 Meeting；SchoolAI 把洞察连接到老师干预和 Next Steps。
- `INFERENCE`：ClassIn 总结卡必须回答“需要老师做什么、对象是谁、何时完成、结果如何确认”，而不是只生成更短的聊天记录。

### 5.10 人工接管：接管后 Agent 要真正停止

- `VERIFIED`：Intercom 明确以客户可见的 Human Reply 或 Take over 结束 Fin Session，并警告重复触发会造成 Agent 插入人工对话。
- `INFERENCE`：老师亲自回复某个敏感问题后，该 Case 中的班级 Agent 应进入 `TAKEN_OVER`，除非老师显式重新委托。

## 6. 如何增强方案一：AI Enhanced IM

以下不是重新设计方案二，而是对当前“传统 IM + TeacherIn + `@Agent`”的增强建议。

### 6.1 P0：构成可信 AI IM 的必要能力

| 增强项 | 产品表达 | 行业依据 | 预期价值 |
|---|---|---|---|
| 私密/公开双表面 | 同一消息可“让 TeacherIn 私下分析”或“公开 `@班级Agent`” | Slack、Zoom、Teams | 防止私密上下文泄露，降低群内噪声 |
| Agent 成员身份 | 班级资料中显示 Agent、能力范围、数据范围、移除/暂停入口 | Slack、Teams、Linear | 建立可见身份和边界 |
| Mention-only 默认 | 学生与老师公开 `@Agent` 才回答；不默认逐条插话 | Slack、Teams、Discord | 保持人类对话主导 |
| 权限安全分享门 | 引用私聊/教师资料时只给老师预览；公开前检查受众权限 | Teams Group Copilot | 防止跨学生、跨角色泄露 |
| 来源与证据抽屉 | 总结、共性问题、学生信号可展开到原消息/文件 | Slack AI | 让老师校验，不把推断当事实 |
| 行动审批卡 | `建议 → 预览 → 修改 → 批准 → 执行 → 回执` | Teams、Intercom、MuleRun | Agent 从说话升级为受控行动 |
| Human Takeover | 老师一键接管，Agent 停止；可显式重新委托 | Intercom Fin | 避免抢话和责任模糊 |
| Agent Session 状态 | 复杂任务显示正在处理、等待输入、待审批、完成/失败 | Linear、Slack Code Channel | 支持长任务、恢复和追责 |

### 6.2 P1：让聊天从信息流变成可组织的学习沟通

1. **Topic/Thread**：将单条问题或讨论拆成可跟进的 Topic，避免群聊中多个问题互相覆盖。依据是 Discord Forum/Thread 和 Slack Thread。
2. **轻量 Reaction**：支持“我也有这个问题”“已理解”“需要再讲”等教学语义 Reaction，不只复制社交 Emoji。
3. **私人 Catch-up**：老师进入群或私聊后可以获得“未处理问题、待回复学生、关键决定和建议动作”，答案带来源。
4. **对话转动作**：选中消息可生成微练习、临时教室、资料、待办或个别跟进草稿；默认只生成 ProposedAction。
5. **教师注意力队列**：跨单聊和班级群聚合“等待回复、多人重复、可能误解、情绪/安全风险、已执行待复查”。

### 6.3 P2：只应作为实验的主动公开 Agent

`INFERENCE`：公开主动发言应最后验证，且满足全部条件：

- 当前班级/Session 已明确开启 Facilitator Mode；
- 触发原因可解释；
- 内容来源对全部成员可见；
- 不包含对单个学生的未确认标签；
- 发言能推动一个明确学习目标；
- 老师随时暂停/接管；
- 有频率上限和“保持安静”模式；
- 结果能够被评价，而不是只统计 Agent 回复数量。

## 7. 机会空白

### 7.1 已经被行业较好解决的部分

- 会话/Thread 总结与基于权限的检索；
- Agent 作为明确成员被添加和 `@`；
- Meeting 中的 AI 笔记、议程、任务和 Recap；
- App/Agent 的 scopes、Channel/Team 权限和管理员安装；
- AI 任务 Session、进度状态与人类所有权；
- 客服对话中的 Handoff、Timeout、Takeover 和 Outcome；
- 学生独立 AI 对话的教师监看、安全提醒和班级洞察。

### 7.2 尚未看到完整解法的组合

`INFERENCE`：在本轮官方证据中，没有一个产品同时做到：

1. 从**既有老师—学生单聊与班级自然群聊**连续发现教学话题；
2. 跨多条会话聚合共性问题，又不泄露个体隐私；
3. 先向老师提供可验证的私密洞察；
4. 由老师选择私聊回复、群内讲解、微活动、临时教室或继续观察；
5. Agent 执行后收集学生响应并形成学习结果；
6. 结果回到班级、课程或学生跟进记录，而不是停留在聊天摘要。

这正是 ClassIn 的领域优势：已有师生关系、班级群、课程、课堂、文件和临时教室，不需要从空白工作协作平台重新构造教学事实。

## 8. 三个方案三候选

## 8.1 候选 3A：Teacher Attention Radar——教师教学沟通雷达

### 核心形态

IM 仍是老师与学生的自然沟通界面，AI 默认不作为群成员发言，而是在后台把单聊与群聊中的信号组织成老师的私密注意力队列：

```text
自然师生聊天
→ AI 静默识别问题/重复/等待/风险
→ 老师私密雷达（带原消息证据）
→ 老师选择忽略、回复、群讲、建活动或跟进
→ Agent 生成并执行受控动作
→ 结果回到雷达复查
```

### 与方案一、方案二的实质差异

- 不以 `@Agent` 为核心触发，方案一的群内 Agent 只是可选出口；
- 不重构完整 Learning Space/Loop 页面，区别于方案二；
- 核心产品对象是**教师注意力与干预队列**。

### 行业证据组合

- Slack/Zoom 的私人 AI 层；
- SchoolAI 的 Mission Control；
- Intercom 的信号升级与人工接管；
- Teams 的公开权限门。

### 优势与风险

- 优势：贴合现有 IM、高频打开、学生端几乎无需重构、能直接减轻老师漏看和重复回复负担。
- 风险：后台分析范围和学生知情必须透明；误聚类会降低信任；如果只做“摘要列表”而没有行动与复查，会退化为通知中心。

## 8.2 候选 3B：Class Agent Session——可开启的班级 AI 促进会话

### 核心形态

班级 Agent 是班级资料中的明确成员，默认 Mention-only。老师可以针对一个时段/问题开启 Facilitator Session：

```text
老师开启“讨论促进 / 答疑 / 复习检查”
→ 确认目标、时长、可读取范围、可做动作
→ Agent 在独立 Thread/Topic 中主持
→ 必要时提问、聚合、计时、发布微活动
→ 老师可随时暂停或接管
→ Session 生成可编辑总结、未解决点与后续动作
```

### 与方案一、方案二的实质差异

- 比方案一的即时 `@Agent` 多了明确目标、状态、结束条件和 Session 结果；
- 比方案二更保留传统班级 IM，AI 只在被开启的局部时段成为促进者；
- 核心产品对象是**有边界的 Agent Session**。

### 行业证据组合

- Teams Facilitator 与 Channel Agent；
- Zoom Host 开启/停止和 Meeting Summary；
- Discord Thread/Forum；
- Linear Agent Session。

### 优势与风险

- 优势：体验有新鲜感，学生能直接感知 AI；适合班级共性问题、课后讨论收口和微活动。
- 风险：公开 Agent 最容易抢走教师角色、制造噪声或放大错误；需要严格频率、范围、教师接管和权限交集规则。

## 8.3 候选 3C：Conversation-to-Learning Case——从聊天生成学习 Case

### 核心形态

当一个私聊问题或多名学生的相似消息值得持续跟进时，老师把它提升为一个 Learning Case：

```text
一条或一组相关消息
→ AI 建议建立 Case
→ 老师确认问题、对象和目标
→ 选择个别答疑 / 班级讲解 / 微练习 / 作业订正
→ Agent Session 执行并等待学生响应
→ 老师收口
→ Case 留下证据、结果和复用材料
```

Case 最少包含：来源消息、参与者、Owner、问题、状态、下一步、Agent 活动、审批、学生响应、结果与未解决项。

### 与方案一、方案二的实质差异

- 比方案一多了跨消息的持续对象和完成状态，不再“一问一答即结束”；
- 比方案二更窄、更 IM-native：只把高价值聊天提升为 Case，不重做整个学习操作系统；
- 核心产品对象是**从聊天生长出的学习 Case**。

### 行业证据组合

- Discord Forum Post/Thread 的话题对象；
- Linear 的 Human Owner + Agent Delegate + Session；
- Intercom 的 Outcome/Handoff；
- SchoolAI 的学习证据与 Next Steps；
- MuleRun 的审批、日志和跨应用执行。

### 优势与风险

- 优势：最容易同时兼容现有 IM 和 Learning Loop 思想；可以从一个高频场景做纵向切片，并形成可度量结果。
- 风险：如果 Case 创建过多，会把聊天变成工单系统；需要 AI 建议、老师确认和自动归并/过期机制。

## 8.4 推荐判断

`INFERENCE`：三个候选不是简单功能包，而是三种不同北极星：

| 候选 | 北极星对象 | AI 默认角色 | 最适合验证的问题 |
|---|---|---|---|
| 3A 教学沟通雷达 | 教师注意力 | 静默观察者与私密副驾驶 | 老师是否更快发现值得处理的信息 |
| 3B 班级 Agent Session | 有边界的促进会话 | 可见的班级促进者 | AI 能否提高班级讨论参与和收口质量 |
| 3C Learning Case | 可完成的学习问题 | 受托执行者 | 沟通能否转化为学习行动与可验证结果 |

当前最值得优先比较的是 **3A 与 3C**：3A 能最快利用真实 IM 话题，3C 能检验是否产生学习闭环。3B 适合在信任、权限和话题证据更充分后做高风险高创新实验。

## 9. 从真实 IM 话题确定首个切入点

### 9.1 目前不能直接做出的结论

`UNKNOWN`：现有 1.0 截图和功能说明证明了入口、角色与消息能力，但没有真实聊天语料，不能确认以下场景的频率排序：

- 知识点提问与共性困惑；
- 作业要求、提交、批改与订正；
- 课程时间、上课入口、请假和运营咨询；
- 文件/资料获取；
- 学习进度与个别反馈；
- 情绪、动力、同伴关系与安全风险；
- 课后总结和下一步安排。

### 9.2 建议的话题研究样本

分别抽取脱敏、经授权的：

1. 老师—学生 1:1 会话；
2. 老师—班级群会话；
3. 课前、课中、课后不同阶段；
4. 不同学科、班型与年龄段；
5. 有结果与无结果的对话片段。

### 9.3 每段对话的标注维度

| 维度 | 例子 |
|---|---|
| 用户意图 | 提问、澄清、提交、催办、反馈、求助、情绪表达 |
| 教学阶段 | 课前、课中、课后、作业、考试、日常运营 |
| 参与范围 | 个体、多人相似、全班共同 |
| 老师处理成本 | 是否需要查资料、重复回复、跨系统操作、持续跟进 |
| 学习影响 | 是否阻断学习、是否涉及共性误区、是否需要及时反馈 |
| AI 可辅助点 | 总结、聚类、草稿、检索、生成活动、执行、跟进 |
| 风险 | 隐私、评价、情绪、安全、错误答案、越权 |
| 收口方式 | 已回答、已理解、已完成活动、仍待跟进、转人工 |
| 可验证证据 | 回复时长、覆盖人数、参与率、订正结果、教师确认 |

### 9.4 场景优先级公式

`INFERENCE`：可用下式作为第一轮排序，而不是只按消息数量：

```text
机会得分
= 发生频率
× 教师重复成本
× 对学习连续性的影响
× AI 可形成闭环的程度
× 结果可验证性
÷ 隐私与误判风险
```

首个验证场景应同时满足：高频、老师当前处理成本高、AI 有清晰增益、老师可控、学生收益可验证，而不是选择最炫目的 Agent 行为。

## 10. 不应照搬的设计

1. **不复制“每条消息都可能触发 Agent”**：Intercom 官方已明确警告重复触发会导致 Agent 插入人工对话。
2. **不把历史实验当成熟模式**：Discord Clyde 只按 2023 有限实验记录，不能证明类似自动群聊 Agent 适合教育班级长期运行。
3. **不让 AI 以老师本人身份无提示发消息**：自动化可以帮助老师，但公开消息必须区分老师亲发、老师审批后由 Agent 发、系统自动通知。
4. **不默认公开老师私密 Context**：Teams 的权限预览说明“发起者能看”不等于“群成员都能看”。
5. **不把学生情绪/误区标签公开**：SchoolAI 将这些信息放在教师 Dashboard，并允许回看原始 Chat。
6. **不以更多 Agent 回复作为成功指标**：会议和教育产品的价值落在决策、行动项、完成度、掌握与后续干预。
7. **不让用户选择内部模型、Skill 和多 Agent 拓扑**：MuleRun 的多 Agent 是执行方式；ClassIn 教师入口仍应是统一 TeacherIn 和任务语言。
8. **不把所有高频话题都转成 Case**：只有需要跨消息跟进、有 Owner、有结束条件的问题才升级为结构化对象。

## 11. 建议的下一步

1. 先做真实 IM 话题研究，输出“单聊/群聊话题—频率—老师成本—AI 机会—风险—结果”的矩阵。
2. 方案一补齐 P0 治理能力，并用一个真实对话片段验证“私密分析 → 教师确认 → 公开动作 → 回执”。
3. 独立制作 3A 与 3C 的低成本概念原型，不在当前 Demo 上直接缝补：
   - 3A 原型只验证教师是否更快找到重要问题；
   - 3C 原型只验证一个聊天问题是否能完成并留下学习证据。
4. 在同一真实任务上对比：
   - 1.0 人工聊天；
   - 方案一 AI Enhanced IM；
   - 方案二 Learning Loop；
   - 方案三候选 3A/3C。
5. 评价指标至少包含：老师发现时间、重复回复减少、处理完成率、学生等待时长、参与覆盖、问题是否真正解决、教师接管率、错误/越权率和主观信任。

## 12. 官方来源登记

| ID | 官方来源 | 状态/证据日期 | 主要用途 |
|---|---|---|---|
| S1 | [Guide to AI features in Slack](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack) | 访问 2026-08-28 | 总结、搜索、引用、分享 |
| S2 | [Security for AI features in Slack](https://slack.com/help/articles/28310650165907-Security-for-AI-features-in-Slack) | 访问 2026-08-28 | 权限一致性、临时结果 |
| S3 | [Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | 访问 2026-08-28 | DM、Channel、@、Code Channel、scopes |
| M1 | [Copilot in Teams group chats](https://support.microsoft.com/en-US/Teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats) | Public Preview；访问 2026-08-28 | 群成员身份、权限预览、Approve/Reject |
| M2 | [Teams Agents FAQ](https://support.microsoft.com/en-us/teams/platform/frequently-asked-questions-about-agents-in-microsoft-teams) | Channel Agent Public Preview；访问 2026-08-28 | Channel Agent、限制、知识源 |
| M3 | [Facilitator in Teams meetings](https://support.microsoft.com/en-US/teams/copilot/facilitator-in-microsoft-teams-meetings) | 部分能力 Public Preview；访问 2026-08-28 | 主持、笔记、任务、接管 |
| Z1 | [Asking in-meeting questions](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057748) | 访问 2026-08-28 | 私密问答、转 Chat/Task/Doc |
| Z2 | [Using Meeting Summary](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0058013) | 访问 2026-08-28 | Host 开启/停止、请求与状态 |
| Z3 | [Enabling Meeting Summary](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960) | 访问 2026-08-28 | 分享受众、外部限制、保留 |
| Z4 | [AI Companion in third-party meetings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0080354) | 访问 2026-08-28 | AI 参与者透明度 |
| Z5 | [Zoom agentic AI announcement](https://news.zoom.com/enterprise-connect-2025/) | 发布 2025-03-17；访问 2026-08-28 | Action Item 到 Task/Doc/Meeting |
| D1 | [Forum Channels FAQ](https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ) | 更新 2024-10-24；访问 2026-08-28 | Forum、Post、Tag、搜索、权限 |
| D2 | [Threads FAQ](https://support.discord.com/hc/en-us/articles/4403205878423-Threads-FAQ) | 访问 2026-08-28 | Thread 与通知 |
| D3 | [Reactions FAQ](https://support.discord.com/hc/en-us/articles/12102061808663-Reactions-and-Super-Reactions-FAQ) | 更新 2025-12-11；访问 2026-08-28 | Reaction 与通知 |
| D4 | [Discord Interactions](https://docs.discord.com/developers/platform/interactions) | 访问 2026-08-28 | Commands、Components、Modal |
| D5 | [Discord Application Commands](https://docs.discord.com/developers/interactions/application-commands) | 访问 2026-08-28 | Server/DM/Private、细粒度权限 |
| D6 | [Discord AI with Friends](https://discord.com/blog/ai-on-discord-your-place-for-ai-with-friends) | 2023 历史有限实验；访问 2026-08-28 | Clyde/AutoMod/Summary 历史边界 |
| E1 | [Getting Started with SchoolAI Spaces](https://help.schoolai.com/en/articles/15538519-getting-started-with-spaces) | 更新 2026-08-27；访问 2026-08-28 | 学生 AI Chat、教师定义与 Preview |
| E2 | [Mission Control](https://help.schoolai.com/en/articles/15243484-your-guide-to-mission-control) | 访问 2026-08-28 | 班级趋势、误区、求助、证据 |
| E3 | [Student Insights Dashboard](https://help.schoolai.com/en/articles/16192386-student-insights-dashboard) | 访问 2026-08-28 | 完整 Chat、Alert、教师权限、后续由人决定 |
| E4 | [Create and use Spaces](https://help.schoolai.com/en/articles/10270295-create-and-use-spaces-with-the-space-creator) | 访问 2026-08-28 | Pause/End、Session 数据 |
| E5 | [Next Steps for Smart Groups](https://help.schoolai.com/en/articles/16558402-what-s-new-in-mission-control-next-steps-for-smart-groups) | Coming Soon；访问 2026-08-28 | 洞察到后续活动 |
| L1 | [Linear AI Agents](https://linear.app/docs/agents-in-linear) | 访问 2026-08-28 | App User、Delegate、Human Owner |
| L2 | [Assign and delegate issues](https://linear.app/docs/assigning-issues) | 访问 2026-08-28 | 人类责任与 Agent 贡献 |
| L3 | [Linear Agents Developer Guide](https://linear.app/developers/agents) | Developer Preview；访问 2026-08-28 | Scope、Session、Activity State |
| I1 | [Use Fin in Workflows](https://www.intercom.com/help/en/articles/10032299-use-fin-ai-agent-in-workflows) | 访问 2026-08-28 | 触发、Outcome、Handoff、防重入 |
| I2 | [Human-in-the-loop approvals](https://www.intercom.com/help/en/articles/14468561-human-in-the-loop-approvals-for-fin-procedures) | 访问 2026-08-28 | 暂停审批、Takeover、Timeout |
| A1 | [MuleRun 官方产品页](https://www.aliyun.com/product/mulerun) | 访问 2026-08-28 | 多渠道、记忆、日志、审批、主动建议、执行 |

## 13. 研究边界与待验证项

- 本文研究的是官方公布的产品行为，不对未公开的模型、Prompt、数据管线或 Harness 作技术反推。
- Public Preview、Developer Preview、Coming Soon 和历史实验均已标注，不应直接作为生产承诺。
- 官方产品页可能随产品更新变化；进入 Feature Spec 前需要再次验证关键能力状态。
- MuleRun 的官方材料不足以还原群聊/单聊 Agent 细节；如果它进入正式竞品比较，需要补充官方演示、帮助文档或实际授权体验。
- Discord 的当前价值主要是 IM/社区原语与 App 平台；2023 Clyde 只保留为历史实验，不视为当前能力。
- 本轮未研究 ClassIn 真实聊天语料、未进行用户访谈，也未验证老师/学生对主动 AI 的接受阈值。
- “行业尚无完整组合”是基于本轮八个代表性官方案例的研究判断，不是对所有产品的穷尽性证明。
