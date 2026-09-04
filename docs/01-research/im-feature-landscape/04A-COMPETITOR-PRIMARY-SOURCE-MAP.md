---
title: Phase 4.1 竞品一手资料来源地图
status: COMPLETE
version: v1.0
date: 2026-08-30
---

# Phase 4.1 竞品一手资料来源地图

## 1. 目的与边界

本文为第四阶段后续 Slack、Microsoft Teams、Discord 功能审计建立官方一手资料入口和取证规则，覆盖两条研究线：

1. **完整基础 IM**：会话与频道、关系与身份、消息生产与消费、文件与媒体、搜索与历史、通知、实时音视频、组织与外部协作、权限治理、安全合规、自动化和多端体验；
2. **AI / Agent**：原生 AI、总结与生成、自然语言搜索、会议 AI、个人 Agent、群内 Agent、第三方 Agent / Bot、工作流、工具调用、MCP、数据权限和管理员治理。

本文只回答“后续应从哪里取证、每类来源能证明什么”，**不做三款产品的功能有无判断、成熟度比较或 ClassIn 升级建议**。研究快照日期为 `2026-08-30`；后续引用动态页面时仍须记录实际访问日期和页面更新时间。

## 2. 一手资料与证据质量规则

### 2.1 允许使用的官方域名

| 产品 | 可作为一手证据的官方来源 |
| --- | --- |
| Slack | `slack.com/help`、`slack.com/pricing`、`docs.slack.dev` |
| Microsoft Teams | `support.microsoft.com`、`learn.microsoft.com`、`microsoft.com/microsoft-365` |
| Discord | `support.discord.com`、`support-apps.discord.com`、`support-dev.discord.com`、`docs.discord.com`、`discord.com/blog`、`discord.com/nitro` |

官方域名中的用户论坛、社区帖子和第三方 App 商品详情仍不算产品方事实。例如 Discord Support 的 `/community/posts/` 是用户生成内容，Discord App Directory 的单个第三方 App 描述由开发者自行维护；两者都不能证明 Discord 原生能力。Discord 官方说明也明确指出 App Directory 产品页由各 App 开发者负责准确性与更新，因此只能把目录作为发现入口，不能把第三方描述升级为 Discord 原生事实（[Welcome to the App Directory](https://support-apps.discord.com/hc/en-us/articles/26501737399575-Welcome-to-the-App-Directory)）。

### 2.2 来源优先级

| 等级 | 来源 | 可支持的结论 | 不可单独支持的结论 |
| --- | --- | --- | --- |
| `P1` | 当前用户帮助、管理员文档、服务说明、权限/限制矩阵 | 当前正式能力、操作入口、对象、角色、策略、套餐或平台条件 | 未写明的负向事实；其他版本或其他端的一致性 |
| `P2` | 官方产品 Changelog、Release Notes、Developer Changelog | 发布、逐步推出、预览、弃用和平台变化的时间线 | “已对所有用户 GA”，除非页面明确写明 |
| `P3` | 官方定价页、产品功能页 | 套餐定位、公开售卖能力、产品概览 | 复杂交互、管理员策略、数据边界和异常行为 |
| `P4` | 官方博客、发布会或历史实验公告 | 产品意图、实验范围、历史背景 | 当前仍可用、当前 GA、当前套餐或角色边界 |

每个复杂 Feature 至少采用 `P1` 当前行为页；涉及付费、权限、平台或新发布时，再分别补套餐、管理员、平台或 Changelog 证据。营销页只作为入口线索，不能代替 Help / Learn 的行为说明。

### 2.3 结论生成规则

1. **不以“搜索不到文档”证明功能不存在。** 只有官方明确写明“不支持、已移除、已弃用”或覆盖范围穷尽时，才可形成负向事实；其余标记 `UNKNOWN`。
2. **不把开发能力等同于产品原生能力。** API 能发送消息或 Bot 能执行动作，只能证明平台可扩展性，不能证明普通用户界面内置了同类能力。
3. **不把第三方 Agent 等同于原生 AI。** 后续分别记录 `NATIVE_AI`、`FIRST_PARTY_AGENT`、`THIRD_PARTY_AGENT_APP`、`DEVELOPER_PLATFORM`，避免合并计算。
4. **不把 Preview / Beta / Experiment 写成 GA。** 必须保留官方发布态原词，并补充适用租户、地区、客户端和 rollout 状态。
5. **不从一个客户端外推所有客户端。** 页面若分 Desktop、Web、iOS、Android、VDI 或只写某一端，就按端记录；没有对应说明的端为 `UNKNOWN`。
6. **不从默认策略外推最终可用性。** 管理员可关闭、角色无权限、组织策略覆盖、外部成员受限时，Feature 应记录为“能力存在 + 条件限制”，而不是无条件 `FULL`。
7. **动态套餐页必须双证据。** 先用官方套餐矩阵确认售卖层级，再用具体 Help / Learn 页面确认入口、限制和例外；历史套餐或 add-on 单独记录。

### 2.4 后续逐 Feature 取证字段

| 字段 | 记录要求 |
| --- | --- |
| `product_surface` | Slack workspace / Enterprise org；Teams work-or-school / Free / Education；Discord DM / friend server / Community server 等 |
| `conversation_scope` | 私聊、群聊、频道、Thread、论坛、公告、会议聊天、语音/视频等 |
| `plan_or_license` | 免费、主套餐、附加许可证、历史套餐、个人订阅、Server Boost 等 |
| `role_or_policy` | 普通成员、访客、Owner / Admin / Moderator、外部用户、租户策略、频道策略等 |
| `platform` | Desktop、Web、iOS、Android、Linux、VDI、设备或特定浏览器 |
| `release_state` | GA、Preview、Beta、Experiment、gradual rollout、retired、UNKNOWN |
| `region_or_cloud` | 全球、地区限制、商业云、GCC / GCCH / DoD、21Vianet 等 |
| `source_date` | 访问日期、页面显示更新时间、Changelog 发布日期 |
| `evidence_scope` | 用户行为、管理员治理、套餐、开发者扩展、发布历史中的一种或多种 |

## 3. Slack 官方来源地图

### 3.1 基础 IM：用户与产品行为

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| 用户功能总目录 | [Using Slack](https://slack.com/help/categories/200111606) | Channels、DM、消息格式、消息工具、文件、搜索、音视频、键盘和无障碍；它是基础 IM 逐项展开的主目录。 |
| 频道与会话模型 | [What is a channel?](https://slack.com/help/articles/360017938993-What-is-a-channel) | 公共/私密频道、发现与成员可见性；外部组织协作应继续沿页面链接核对 Slack Connect。 |
| App 与工作流 | [Connect tools & automate tasks](https://slack.com/help/categories/360000047926) | App Marketplace、快捷命令、Workflow Builder、连接器和自动化；需要与原生消息能力分栏。 |
| 用户角色 | [Permissions by role in Slack](https://slack.com/help/articles/201314026-Permissions-by-role-in-Slack) | Owner / Admin、Member、Guest 的消息、文件、频道和管理权限矩阵。 |
| 管理员总目录 | [Workspace administration](https://slack.com/help/categories/200122103) | 成员、频道、权限、外部协作、App、身份安全、数据、分析和 Enterprise 组织治理。 |
| 消息治理示例 | [Manage permissions for message editing and deletion](https://slack.com/help/articles/115004868646-Manage-permissions-for-message-editing-and-deletion) | 编辑/删除策略、Workspace 与 Org 两级覆盖、Owner/Admin 权限差异；后续同类治理能力均按此方式找对应管理员页。 |
| 多端与可访问性 | [Accessibility in Slack](https://slack.com/help/articles/4455747966739-Accessibility-in-Slack) | 键盘、读屏、Reduced Motion、视觉控制、字幕、图片替代文本等基础体验。 |

Slack 的 [Using Slack](https://slack.com/help/categories/200111606) 会持续增加条目，后续审计应按该目录当日结构遍历，而不是只使用本文列出的示例页面。

### 3.2 套餐、限制与平台

| 来源家族 | 官方入口 | 取证用途 |
| --- | --- | --- |
| 套餐总矩阵 | [Slack plans and features](https://slack.com/help/articles/115003205446-Slack-plans-and-features) | Free、Pro、Business+、Enterprise+ 的协作、AI、自动化、安全、合规和管理能力。 |
| 免费版行为变化 | [Feature limitations on the free version of Slack](https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack) | 降级后历史、Huddle、Slack Connect、Guest、Canvas、List、Workflow 和 App 的实际变化。 |
| 免费版硬限制 | [Usage limits for free workspaces](https://slack.com/help/articles/115002422943-Usage-limits-for-free-workspaces) | 消息/文件可见期、保留期和 App 安装上限等量化限制。 |
| 平台要求 | [System requirements for using Slack](https://slack.com/help/articles/115002037526-System-requirements-for-using-Slack) | Desktop、Mobile 和 Web 支持版本，以及部分浏览器对 Huddle 的差异。 |
| 支持生命周期 | [Slack support lifecycle](https://slack.com/help/articles/1500001836081-Slack-support-lifecycle-for-operating-systems-app-versions-and-browsers) | OS、客户端和浏览器退役时间；避免把过期客户端表现记为当前产品缺失。 |

### 3.3 AI / Agent 与治理

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| 原生 AI 能力与套餐 | [Guide to AI features in Slack](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack) | 会话总结、搜索答案、Recap、文件总结、翻译、工作流 AI、Slackbot、Enterprise Search；页面同时声明能力受套餐、角色和管理员限制。 |
| 原生个人 Agent | [How to work with Slackbot](https://slack.com/help/articles/202026038-How-to-work-with-Slackbot) | Slackbot 入口、上下文范围、可访问数据和连接来源。 |
| Agent 使用量 | [Slackbot limits and credit usage](https://slack.com/help/articles/53579676130195-Slackbot-limits-and-credit-usage) | 套餐消息额度、任务/Skill 限制、Flex Credits 和高级能力可能采用的消费模型。 |
| 第三方 / 组织 Agent | [Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | Agent 发现、DM、频道加入、多人会话，以及第三方、内部开发和 Agentforce 的来源区分。 |
| Salesforce Agent | [Use Agentforce in Slack](https://slack.com/help/articles/36218786859667-Use-Agentforce-in-Slack) 与 [Set up and manage Agentforce](https://slack.com/help/articles/36218109305875-Set-up-and-manage-Agentforce-in-Slack) | 用户会话面、频道协作、Salesforce 许可证、账户映射、管理员分配和卸载。 |
| MCP 与工具动作 | [Guide to Model Context Protocol in Slack](https://slack.com/help/articles/48855576908307-Guide-to-the-Slack-MCP-server) | Slack 作为 MCP Server 与 Slackbot 作为 MCP Client 的双向模型、可读写动作和合作方边界。 |
| AI 管理策略 | [Manage access to AI features in Slack](https://slack.com/help/articles/28244420881555-Manage-access-to-AI-features-in-Slack) | Owner / Admin 开关、套餐差异、人员和组织范围控制。 |
| AI 数据边界 | [Security for AI features in Slack](https://slack.com/help/articles/28310650165907-Security-for-AI-features-in-Slack) | 权限继承、数据使用、引用、留存和工作流生成内容的差异。 |

### 3.4 开发者平台与发布状态

| 来源家族 | 官方入口 | 使用边界 |
| --- | --- | --- |
| AI 开发总览 | [AI in Slack overview](https://docs.slack.dev/ai/) | Agent Surface、上下文、流式输出、MCP 与开发模板；只证明平台承载能力。 |
| App Surface | [Surfaces](https://docs.slack.dev/surfaces) 与 [Block Kit](https://docs.slack.dev/block-kit/) | Message、Home、Modal 等 App 承载面和交互组件；不证明 Slack 原生内置同类业务。 |
| 开发者变更 | [Slack Developer Changelog](https://docs.slack.dev/changelog/) | API、SDK、Agent 平台和弃用变化。 |
| 用户产品更新 | [Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes) | 新功能、逐步推出和月度用户侧变化。 |
| 退役记录 | [Slack feature and plan retirements](https://slack.com/help/articles/4426294050451-Slack-feature-and-plan-retirements) | 功能、套餐、客户端和旧集成的退役状态。 |

### 3.5 Slack 已知证据风险

- **套餐名称和权益会迁移。** 现有页面同时出现新套餐、legacy Business+、Enterprise Grid 和旧 Slack AI add-on；必须记录页面所指版本，不能只写“付费版”。[Slack AI 指南](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack) 和 [Slackbot 限制](https://slack.com/help/articles/53579676130195-Slackbot-limits-and-credit-usage) 都包含这类例外。
- **Workspace 与 Enterprise Org 是两级治理。** 同一个消息或 AI 开关可能受 Org Policy 覆盖，必须分别记录 Org Owner/Admin、Workspace Owner/Admin 和普通成员角色（[Permissions by role](https://slack.com/help/articles/201314026-Permissions-by-role-in-Slack)）。
- **Guest、Slack Connect 和内部成员不是同一身份模型。** 免费降级还会改变 Guest 和外部频道能力，需联合角色矩阵和免费版限制页取证（[Feature limitations on Free](https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack)）。
- **AI 原生能力、Slackbot、Agentforce、第三方 Agent 和开发者 Agent Surface 必须分列。** 它们的许可证、数据源、管理员控制和责任主体不同（[Work with AI agents](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)）。
- **Slack 更新页明确包含 gradual rollout。** Changelog 只能证明发布进程，不能自动证明所有租户已获得（[Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes)）。

## 4. Microsoft Teams 官方来源地图

### 4.1 基础 IM：用户与产品行为

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| 用户帮助总入口 | [Microsoft Teams help & learning](https://support.microsoft.com/en-us/teams/) | Chat、Teams & Channels、Notifications、Files、Calls、Meetings、Apps、Accessibility 和 Troubleshooting。 |
| 当前聊天与频道 IA | [Explore the new chat and channels experience](https://support.microsoft.com/en-us/teams/teams-channels/explore-the-new-chat-and-channels-experience-in-microsoft-teams) | Combined / Separate View、Custom Sections、筛选、Quick Views、未读和 Followed Threads。 |
| 团队与频道模型 | [Overview of teams and channels](https://learn.microsoft.com/en-us/microsoftteams/teams-channels-overview) | Team、Standard / Private / Shared Channel、存储、成员和管理员设置；也是三类频道差异的主入口。 |
| 用户角色矩阵 | [Team owner, member, and guest capabilities](https://support.microsoft.com/en-us/teams/teams-channels/team-owner-member-and-guest-capabilities-in-microsoft-teams) | Owner、Member、Guest 的聊天、频道、文件、App 和团队管理能力。 |
| 共享频道角色 | [Shared channel owner and member roles](https://support.microsoft.com/en-us/teams/teams-channels/shared-channel-owner-and-member-roles-in-microsoft-teams) | Team Owner、Channel Owner、Channel Member 以及跨组织协作限制。 |
| 文件与存储归属 | [Teams and SharePoint integration](https://learn.microsoft.com/en-us/sharepoint/teams-connected-sites) | 标准、私密、共享频道的 SharePoint Site 与成员边界；聊天文件还需沿用户帮助页核对 OneDrive 行为。 |
| 外部协作 | [Use guest access and external access](https://learn.microsoft.com/en-us/microsoftteams/communicate-with-users-from-other-organizations) | External Access、Guest Access 的聊天、文件、搜索、会议和身份差异。 |

Teams Support 页面通常在页面顶部写 `Applies To` 并分 Desktop / Mobile；后续必须把这两类信息一并抄入证据记录，不能仅摘操作正文。

### 4.2 管理、套餐、限制与平台

| 来源家族 | 官方入口 | 取证用途 |
| --- | --- | --- |
| Teams 管理员总目录 | [Microsoft Teams admin documentation](https://learn.microsoft.com/en-us/microsoftteams/) | 部署、聊天/频道、会议、外部访问、安全、治理、App 和运营管理。 |
| 管理架构 | [Introduction to Microsoft Teams for admins](https://learn.microsoft.com/en-us/microsoftteams/Teams-overview) | Teams 与 Entra ID、Microsoft 365 Groups、SharePoint、Exchange、OneDrive 等依赖关系。 |
| 消息策略 | [Manage messaging policies in Teams](https://learn.microsoft.com/en-us/microsoftteams/messaging-policies-in-teams) | 编辑/删除、聊天与频道 Feature 开关、策略分配和同步条件。 |
| 策略总览 | [Manage Teams with policies](https://learn.microsoft.com/en-us/microsoftteams/manage-teams-with-policies) | Messaging、Meeting、Calling、App 等策略类型和分配机制。 |
| 外部与访客治理 | [Guest access in Microsoft Teams](https://learn.microsoft.com/en-us/microsoftteams/guest-access) | Guest 配置、许可、审计和 Microsoft Entra / Microsoft 365 联动。 |
| 产品硬限制 | [Limits and specifications for Microsoft Teams](https://learn.microsoft.com/en-us/microsoftteams/limits-specifications-teams) | Team、Channel、Chat、Meeting、文件等人数、数量与容量限制。 |
| 商业套餐 | [Compare Microsoft Teams for business](https://www.microsoft.com/en-US/microsoft-365/microsoft-teams/compare-microsoft-teams-options) | Teams Essentials、Microsoft 365 Business / Enterprise 等商业套餐入口；复杂能力仍需 Learn/Support 复核。 |
| 客户端与平台 | [Teams client system requirements](https://learn.microsoft.com/en-us/microsoftteams/teams-client-system-requirements) | Windows、macOS、Web、Linux/PWA、VDI、iOS 和 Android 支持条件。 |
| Teams Free 独立产品 | [Microsoft Teams Free help](https://support.microsoft.com/en-us/teams/free/microsoft-teams-free-help) 与 [Teams Free subscription comparison](https://support.microsoft.com/en-us/teams/free/get-started/learn-more-about-subscriptions-for-microsoft-teams-free) | 个人版 Chat、Communities、Meetings 和个人订阅差异；不得与 work-or-school 直接合并。 |
| Education 策略 | [Manage Teams policies and policy packages for education](https://learn.microsoft.com/en-us/microsoftteams/policy-packages-edu) | Teacher、Primary Student、Secondary Student 等教育角色的消息、会议、App 安全策略。 |

### 4.3 AI / Agent 与治理

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| Copilot 聊天/频道行为 | [How to use Microsoft Copilot in Teams chats and channels](https://support.microsoft.com/en-us/teams/copilot/how-to-use-microsoft-365-copilot-in-teams-chats-and-channels) | 1:1、群聊、会议聊天、频道 Thread、总结时间范围和不支持内容类型。 |
| Copilot 能力总览 | [FAQ about Copilot in Microsoft Teams](https://support.microsoft.com/en-us/teams/platform/frequently-asked-questions-about-copilot-in-microsoft-teams) | Chat / Channel、Compose、Meeting 等 Teams 内能力线索；每项仍沿链接进入专页。 |
| 群聊 Copilot 发布态 | [Microsoft 365 Copilot in Teams group chats](https://support.microsoft.com/en-us/teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats) | 多人共享 Copilot 的交互、许可和 grounding；页面当前标注 Public Preview，不能作为 GA 证据。 |
| Agent 加入群聊 | [Find and add Copilot agents to group chats](https://support.microsoft.com/en-us/teams/chat-channels/find-and-add-copilot-agents-to-group-chats-in-microsoft-teams) | Agent/Bot 的发现、安装、权限提示和群聊入口。 |
| Copilot 许可证 | [License options for Microsoft Copilot](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-licensing) | Microsoft Copilot、Copilot Chat、前置订阅和 add-on 关系。 |
| 服务与云可用性 | [Microsoft Copilot service description](https://learn.microsoft.com/en-us/office365/servicedescriptions/office-365-platform-service-description/microsoft-365-copilot) | Commercial、GCC、GCCH、DoD 的 Feature Availability 和更新时间。 |
| AI 数据边界 | [Data, Privacy, and Security for Microsoft 365 Copilot](https://learn.microsoft.com/en-us/deployoffice/privacy/microsoft-365-copilot) | Microsoft Graph grounding、现有权限、Prompt/Response、训练和 Agent 数据访问。 |
| Copilot 管理入口 | [Manage Microsoft 365 Copilot scenarios](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-page) | User Access、Data Access、Agents、AI Provider 和其他管理中心跳转。 |
| Teams Agent/App 治理 | [Agent and app management in Teams admin center](https://learn.microsoft.com/en-us/microsoftteams/manage-apps) | 内置、Microsoft、第三方和自定义 Agent/App 的允许、阻止、分配、Release Channel 与外部用户限制。 |
| Microsoft 365 Agent 治理 | [Manage agents for Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/manage) | Agent Builder、Copilot Studio、Agents Toolkit、SharePoint Agent 的分发、许可和管理员控制。 |

### 4.4 开发者平台与发布状态

| 来源家族 | 官方入口 | 使用边界 |
| --- | --- | --- |
| Teams 开发平台 | [Microsoft Teams Platform developer documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/) | Agent、Tab、Message Extension、Meeting App、发布与 Store Validation；只证明平台扩展面。 |
| Agent 模型 | [Agents in Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/agents-in-teams/overview) | Agent 定义、Teams 内交互、工具和 SDK 选择。 |
| Teams SDK | [Teams SDK](https://learn.microsoft.com/en-us/microsoftteams/platform/teams-sdk/) | 消息、Proactive Messaging、Adaptive Cards、MCP、A2A、认证和可观察性。 |
| App 跨频道能力 | [Teams connects shared and private channels](https://learn.microsoft.com/en-us/microsoftteams/platform/build-apps-for-shared-private-channels) | Standard / Private / Shared Channel 的成员、存储、Agent/App 安装与外部用户差异。 |
| 用户产品更新 | [What's new in Microsoft Teams](https://support.microsoft.com/en-us/teams/platform/what-s-new-in-microsoft-teams) | Desktop/Web、iOS、Android、VDI 和设备分栏的用户侧发布记录。 |
| 开发者更新 | [Teams Platform Developer Announcements](https://learn.microsoft.com/en-us/microsoftteams/platform/developer-announcements) | Agent、App、SDK、Preview、GA、Breaking Change 和 Retirement。 |
| Free 独立更新 | [What's new in Microsoft Teams Free](https://support.microsoft.com/en-us/teams/free/get-started/what-s-new-in-microsoft-teams-free) | 个人版独立发布、地区和平台变化。 |

### 4.5 Teams 已知证据风险

- **“Teams”不是一个单一版本。** 至少要区分 work-or-school、Teams Free / personal、Education，以及商业云与政府云；[Teams Free 帮助](https://support.microsoft.com/en-us/teams/free/microsoft-teams-free-help) 和 [Copilot 服务说明](https://learn.microsoft.com/en-us/office365/servicedescriptions/office-365-platform-service-description/microsoft-365-copilot) 都显示了独立范围。
- **Teams Premium、Microsoft 365 Copilot 和 Copilot Chat 不是同一个许可证。** AI Feature 必须按具体许可证和前置订阅核验，不能用“有 Teams 付费版”代替（[Copilot licensing](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-licensing)）。
- **租户策略可能覆盖产品默认值。** Messaging、Meeting、App、External Access 和 Education Policy 都会按用户/组分配，策略变更还可能延迟生效（[Manage Teams with policies](https://learn.microsoft.com/en-us/microsoftteams/manage-teams-with-policies)）。
- **Owner、Member、Guest、External User、Anonymous User、Channel Owner 是不同身份。** 需要联合 [角色矩阵](https://support.microsoft.com/en-us/teams/teams-channels/team-owner-member-and-guest-capabilities-in-microsoft-teams)、[外部协作对比](https://learn.microsoft.com/en-us/microsoftteams/communicate-with-users-from-other-organizations) 和共享频道角色页取证。
- **消息与文件不是同一存储模型。** Team Channel、Private/Shared Channel、Chat 文件可能落在不同 SharePoint/OneDrive 边界，不能从 UI 的同一“文件”入口推断相同权限（[Teams and SharePoint integration](https://learn.microsoft.com/en-us/sharepoint/teams-connected-sites)）。
- **Support 页面会同时包含已正式发布和 Preview 内容。** 例如群聊 Copilot 页面当前明确标注 Public Preview；必须保留发布态（[Copilot in Teams group chats](https://support.microsoft.com/en-us/teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats)）。
- **Release Channel 会影响管理员看到的 Agent/App。** Teams 管理文档明确说明 General Release 租户无法管理仅在 Private/Public Preview Channel 发布的对象（[Manage apps](https://learn.microsoft.com/en-us/microsoftteams/manage-apps)）。

## 5. Discord 官方来源地图

### 5.1 基础 IM：用户与产品行为

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| 用户帮助总入口 | [Discord Help Center](https://support.discord.com/hc/en-us) | Discord Basics、Account、Server、Nitro/Boost、Safety、Announcements 和 Troubleshooting。 |
| 基础 IM 总目录 | [Discord Basics](https://support.discord.com/hc/en-us/categories/115000217151) | Messaging、DM/GDM、文字频道、文件、搜索、语音/视频、Friends、导航与 Features。 |
| 基础概念 | [Beginner's Guide to Discord](https://support.discord.com/hc/en-us/articles/360045138571-Beginner-s-Guide-to-Discord) | Account、Server、Text/Voice Channel、DM、Group DM、Screen Share 和 Profile。 |
| 服务器能力总览 | [Discord Server Setup Guide](https://support.discord.com/hc/en-us/articles/33023827550359-Discord-Server-Setup-Guide) | Friend Server、Community Server、Channel、Thread、Forum、Poll、Invite、Role 和 Moderation。 |
| 服务器管理总目录 | [Server Settings](https://support.discord.com/hc/en-us/categories/200404378) | Server Feature、Role/Permission/Moderation、Integration、Community/Discovery 和 Invite。 |
| 账号与通知 | [Account Settings](https://support.discord.com/hc/en-us/categories/200404358-Account-Settings) | 身份、安全、通知、Profile、Status 和 Connection。 |
| 角色权限 | [Setting Up Permissions FAQ](https://support.discord.com/hc/en-us/articles/206029707-Setting-Up-Permissions-FAQ) | Server、Category、Channel、Role 和 `@everyone` 权限继承。 |
| Community 模型 | [Enabling Your Community Server](https://support.discord.com/hc/en-us/articles/360047132851-Enabling-Your-Community-Server) | Community 前置安全条件、Announcement、Insights、Discovery 和 Onboarding。 |
| 安全治理 | [Safety, Privacy, and Policy](https://support.discord.com/hc/en-us/categories/115000168351-Trust-Safety) 与 [AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ) | 用户/服务器安全、隐私、内容过滤、Spam、角色豁免和管理员/平台限制。 |

### 5.2 订阅、Boost、限制与平台

| 来源家族 | 官方入口 | 取证用途 |
| --- | --- | --- |
| Nitro 套餐 | [What are Nitro & Nitro Basic?](https://support.discord.com/hc/en-us/articles/115000435108-What-are-Nitro-Nitro-Basic) | Base、Nitro Basic、Nitro 的用户权益、上传、消息长度、Server Cap 和客户端购买差异。 |
| 公开 Nitro 产品页 | [Discord Nitro](https://discord.com/nitro) | 当前公开售卖与套餐定位；具体限制仍以 Help Center 为准。 |
| Nitro / Boost 总目录 | [Nitro, Server Boosting, and Shop](https://support.discord.com/hc/en-us/categories/360001025912-Nitro) | 个人订阅、Server Boost、Shop 和促销入口。 |
| Server Boost | [Server Boosting FAQ](https://support.discord.com/hc/en-us/articles/360028038352-Server-Boosting-FAQ) | Level 1–3、额外 Perk、所需 Boost、Server Owner/Admin 管理和 Desktop-only 条件。 |
| 全局硬限制 | [Discord Account Caps, Server Caps, and More](https://support.discord.com/hc/en-us/articles/33694251638295-Discord-Account-Caps-Server-Caps-and-More) | Account、DM、消息、上传、Server、Channel、Role、Thread、Stage 和搜索数量上限。 |
| 平台要求 | [Discord OS/system requirements](https://support.discord.com/hc/en-us/articles/213491697-What-are-the-OS-system-requirements-for-Discord) | Windows、macOS、Linux、Android、iOS、Browser 及不支持环境。 |
| 语音客户端门槛 | [Minimum Client Version Requirements for Voice Chat](https://support.discord.com/hc/en-us/articles/38025123604631-Minimum-Client-Version-Requirements-for-Voice-Chat) | DAVE / E2EE 后语音、视频、Go Live 所需客户端版本与第三方 Bot 影响。 |

Discord 的付费边界有两个正交维度：个人账号的 Nitro/Nitro Basic 与服务器集体贡献的 Boost Level。后续矩阵必须分两列，不能把“服务器获得更高上传上限”误写为每个用户购买了 Nitro；官方总限制表已经分别列出 Account Caps 和 Server Caps（[Discord Account Caps](https://support.discord.com/hc/en-us/articles/33694251638295-Discord-Account-Caps-Server-Caps-and-More)）。

### 5.3 AI / Agent、App 与治理

Discord 当前取证必须先区分“Discord 原生能力”和“在 Discord 上运行的开发者 App”。官方 Apps Center 将 Apps 描述为由开发者社区创建、可包含 Bot、命令和 Activity 的第三方服务（[What Are Apps](https://support-apps.discord.com/hc/en-us/articles/26577510840087-What-Are-Apps)）。因此，后续看到 AI Bot 或自动化 App 时，不得直接计入 Discord 原生 AI。

| 来源家族 | 官方入口 | 后续主要覆盖 |
| --- | --- | --- |
| App 用户总目录 | [Discord Apps Center](https://support-apps.discord.com/hc/en-us) 与 [Apps category](https://support-apps.discord.com/hc/en-us/categories/26498342609175-Apps) | App 发现、安装、命令、Ephemeral Message、Activity、Premium App 和管理。 |
| App 用户行为 | [How to Use Apps](https://support-apps.discord.com/hc/en-us/articles/26593412574359-How-to-Use-Apps) | Server-installed 与 User-installed App、DM/GDM/Channel/Voice Surface、Slash/User/Message Command 和授权。 |
| App 管理治理 | [Moderating Apps on Discord](https://support-apps.discord.com/hc/en-us/articles/26501864012951-Moderating-Apps-on-Discord) | External App、Application Command、Activity、Bot Permission、AutoMod 和数据访问控制。 |
| 历史原生 AI 实验线索 | [Discord is Your Place for AI with Friends](https://discord.com/blog/ai-on-discord-your-place-for-ai-with-friends) | 2023 年 Clyde、AutoMod AI、Conversation Summaries 的有限服务器实验历史；只能作为 `P4 / HISTORICAL_EXPERIMENT`，当前可用性必须另找当前 Help / Changelog 证据。 |
| AI App 生态历史线索 | [Amplify Your Discord Experience with These Awesome AI Apps](https://discord.com/blog/awesome-ai-apps-bots-amplify-your-discord-experience) | 第三方 AI App 使用场景；只证明生态案例，不证明 Discord 自有 AI。 |

### 5.4 开发者平台与发布状态

| 来源家族 | 官方入口 | 使用边界 |
| --- | --- | --- |
| App 平台总览 | [Overview of Discord Apps](https://docs.discord.com/developers/quick-start/overview-of-apps) | Bot、Activity、Social SDK、Guild/User Install、HTTP/Gateway API；只证明可扩展性。 |
| Bot 平台 | [Bots & Companion Apps](https://docs.discord.com/developers/platform/bots) | Event、Command、Moderation、Message、Webhook 和自动化模型。 |
| 原生交互组件 | [Interactions Overview](https://docs.discord.com/developers/interactions/overview) | Slash/User/Message Command、Button、Select、Modal、HTTP/Gateway 接收模式。 |
| 数据与规模限制 | [Gateway](https://docs.discord.com/developers/events/gateway) 与 [Rate Limits](https://docs.discord.com/developers/topics/rate-limits) | Intent、Message Content、验证、事件、分片和请求限制；Agent/Bot 能力不可绕过这些边界。 |
| 开发者政策 | [Developer Policies + Terms](https://support-dev.discord.com/hc/en-us/categories/360000656491-Developer-Policies-Terms) | Developer Policy、Terms、App Directory、Message Content Intent Review 和历史版本。 |
| 用户发布记录 | [Discord Blog](https://discord.com/blog) 中的 Changelog / Patch Notes，以及 [Announcements](https://support.discord.com/hc/en-us/categories/115000193752) | 用户 Feature、Bugfix、逐平台 rollout、地区或安全公告。当前产品更新示例见 [Discord Update: August 11, 2026](https://discord.com/blog/discord-update-august-11-2026-changelog)。 |
| 开发者发布记录 | [Discord Developer Change Log](https://docs.discord.com/developers/change-log) | API、SDK、新字段、Breaking Change、Deprecation 和安全协议时间线。 |

### 5.5 Discord 已知证据风险

- **Friend Server 与 Community Server 能力不同。** Forum、Announcement、Discovery、Onboarding、Insights 等可能受 Community 开关和资格限制，必须记录 Server Type（[Enabling Community](https://support.discord.com/hc/en-us/articles/360047132851-Enabling-Your-Community-Server)）。
- **Role Permission、Channel Override、Server Owner/Admin 和普通成员会形成叠加条件。** App 还具有独立的安装与命令权限，必须分别取证（[Setting Up Permissions](https://support.discord.com/hc/en-us/articles/206029707-Setting-Up-Permissions-FAQ)、[Moderating Apps](https://support-apps.discord.com/hc/en-us/articles/26501864012951-Moderating-Apps-on-Discord)）。
- **Nitro、Nitro Basic、Server Boost Level 和实验性额外 Perk 不是同一套餐轴。** 个人权益和服务器权益必须分开，实验项目继续保留 `EXPERIMENT`（[Server Boosting FAQ](https://support.discord.com/hc/en-us/articles/360028038352-Server-Boosting-FAQ)）。
- **Desktop / Browser / Mobile 的管理入口不对称。** 例如 AutoMod 更新当前仅 Desktop，App Directory 入口和部分 Server 配置也可能限定客户端；每个页面均需记录平台说明（[AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ)）。
- **用户安装 App 与服务器安装 App 的数据和权限不同。** User-installed App 可跨 Server/DM/GDM 使用但权限受限，Server-installed App 可请求 Server 操作权限（[How to Use Apps](https://support-apps.discord.com/hc/en-us/articles/26593412574359-How-to-Use-Apps)）。
- **Bot/App 能力不等于原生 AI。** Discord 的官方开发者平台允许 Bot 监听事件、发消息和自动化，但模型、Agent Runtime 与输出责任可能完全属于第三方（[Bots & Companion Apps](https://docs.discord.com/developers/platform/bots)）。
- **2023 AI 公告是有限实验的历史证据。** 在没有当前 Help、Changelog 或实机证据前，Clyde、AutoMod AI、Conversation Summaries 的现状必须是 `UNKNOWN`，不能从历史博客外推（[AI on Discord](https://discord.com/blog/ai-on-discord-your-place-for-ai-with-friends)）。
- **Changelog 与 Patch Notes 可能仍在逐平台 rollout。** Discord Patch Notes 明确提示修复虽已合并但可能仍在向各平台推出，因此发布记录不能替代客户端覆盖证据（[Discord Patch Notes: May 4, 2026](https://discord.com/blog/discord-patch-notes-may-4-2026)）。

## 6. 后续审计的最小证据包

后续每一项基础 IM Feature 至少收集：

1. 一条当前用户 Help / Support 行为证据；
2. 若有付费差异，一条官方套餐或限制证据；
3. 若有角色/策略差异，一条管理员或权限矩阵证据；
4. 若有平台差异，一条明确写出客户端范围的证据；
5. 若为近期能力、Preview 或可能退役，一条 Changelog / Release Note 证据。

每一项 AI / Agent Feature 在上述基础上再增加：

1. 原生 AI、第一方 Agent、第三方 Agent/App 或开发者平台的类型标签；
2. Grounding 数据范围和用户权限继承证据；
3. 管理员启停、分配、审批和外部用户限制证据；
4. License、用量/额度、Region/Cloud 和 Release State；
5. 如能执行动作，再记录授权、确认、审计/回执、失败恢复和数据写入边界；官方未说明的字段保留 `UNKNOWN`。

## 7. Phase 4.1 来源 Gate

- [x] Slack、Microsoft Teams、Discord 均覆盖用户帮助、管理员治理、套餐/限制、平台、开发者与发布记录；
- [x] 基础 IM 与 AI / Agent 两条证据线已分开；
- [x] 已明确原生能力、第三方 App/Agent 和开发平台不可互相替代；
- [x] 已记录套餐、角色、策略、平台、地区/云和发布态风险；
- [x] 全文只使用产品方官方一手来源；
- [x] 尚未形成竞品功能比较或 ClassIn 产品建议。
