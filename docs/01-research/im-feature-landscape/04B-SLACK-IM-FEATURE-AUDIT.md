---
title: Slack 基础 IM 与 AI/Agent（人工智能/代理）功能深度审计
status: PHASE_4_2_COMPLETE_USER_REVIEWED
version: v0.3
date: 2026-08-30
research_program: ClassIn IM 功能全景与竞品研究 / Phase 4.2
---

# Slack 基础 IM 与 AI/Agent（人工智能/代理）功能深度审计

> 研究快照：2026-08-30（Asia/Shanghai）  
> 状态：`PHASE_4_2_COMPLETE_USER_REVIEWED`  
> 范围：Slack 单一竞品；仅 Slack 官方一手公开资料及匿名化登录 Workspace（工作区）的只读可见证据  
> 非范围：Teams、Discord；ClassIn 升级优先级；任何 `LOCKED` 产品决策

## 0. 结论先行

Slack 当前不是只以“频道 + 消息”组织产品，而是形成四层相互咬合的系统：以频道、私信、Thread（消息列）和 Huddle（抱团）为协作骨架；以 Canvas（画板）、Lists（列表）、Later（留待以后处理）、Activity（活动）和 Workflow Builder（工作流程构建器）承接工作；以 Apps（应用）、Agents & tools（代理与工具）、Slack Connect（外部组织协作）和开发平台连接外部系统；以 Slack AI、Slackbot（私人 AI 代理）、第三方 Agent（代理）、Slack Code（多人代理编码空间）与 Enterprise Search（企业搜索）叠加智能层。官方产品总页把它概括为“协作 / 项目管理 / 集成 / 智能”四个支柱，并用“整个工作日只需一个操作系统”定位产品；这是营销定位，本文中的具体能力均另回到 Help、管理员文档或开发者文档验证。[S01]

当前公开套餐为 `Free / Pro / Business+ / Enterprise+`。关键商业边界不是单一的消息数量，而是逐层开放历史和群体协作、结构化工作、自动化、AI、治理与企业知识检索：

- Free（免费版）保留 90 天可见/可搜索历史（超过 1 年的数据永久删除）、最多 10 个 App（应用）；Huddle（抱团）和 Slack Connect（外部组织协作）只支持 1:1；Canvas（画板）仅限频道/DM（私信）内的轻量使用，Lists（列表）、自定义分区、用户模板、Workflow Builder（工作流程构建器）等不包含。[S02][S03][S04]
- Pro（专业版）开放无限历史、完整 Huddle（抱团）/Slack Connect（外部组织协作）、Canvas（画板）、Lists（列表）、自定义分区、模板、Workflow Builder（工作流程构建器），以及对话/消息列摘要、Huddle notes（抱团笔记）和 AI assistant apps（AI 助理应用）。[S02][S05]
- Business+（企业增强版）把高级 AI 作为主要付费墙：recap（要点回顾）、文件摘要、翻译、AI 搜索答案、消息解释、Canvas AI（画板 AI）、AI 生成工作流程/AI 步骤、Slackbot；并加入数据驻留、全消息导出、频道管理与更强分析。[S02][S05]
- Enterprise+（企业旗舰版）独占 Enterprise Search（企业搜索），并进一步加入 DLP（数据丢失防护）、信息屏障、法定保留、Discovery API（电子数据发现接口）、审计日志、自定义角色、内容标记等深治理能力。[S02]

在真实匿名 Workspace 的套餐页和 UI 上，Free 基础套餐、当前 Pro 试用及四列套餐逐项 `包括/不包括` 与公开矩阵一致；这使套餐结论达到 `WORKSPACE_VISIBLE + OFFICIAL_HELP`。但顶部 Slackbot 按钮打开后同时出现“立即升级”和“基础版 Slackbot”选项，因此它是 Free/Pro 的有限预览/基础入口，不是 Pro 正式包含完整 Slackbot 的证据。[S-W01][S05][S54]

教育专项没有证明课程、作业、测验、成绩或学习分析等教育原生对象。官方教育方案页呈现的是通用 Slack 能力的场景包装，加上符合条件教育机构的 Pro 或 Business+ 85% 商业折扣；16 岁以下不得使用 Slack。教育原生功能结论为 `NOT_PROVEN`。[S58][S59]

## 1. 研究方法、证据规则与边界

### 1.1 证据规则

| 标记 | 含义 |
|---|---|
| `OFFICIAL_BEHAVIOR` | Slack Help/管理员文档明确描述入口、行为、状态或限制 |
| `OFFICIAL_PLATFORM` | `docs.slack.dev` 的平台契约或开发能力 |
| `OFFICIAL_PLAN` | 公开定价/套餐 Help 的当前权益 |
| `OFFICIAL_RELEASE` | Slack 更新、退役或 rollout 文档 |
| `WORKSPACE_VISIBLE` | 2026-08-30 在匿名化登录 Workspace 只读观察到；不记录 Workspace、成员、频道或消息身份数据 |
| `MARKETING_ONLY` | 官方营销页只证明定位或场景，不单独证明产品行为 |
| `CONFLICT` | 官方页面之间或同页内部存在冲突，不能静默选一 |
| `NOT_PROVEN` | 在本轮允许的一手来源中没有得到足够正/负证据，不等同于“不存在” |

支持态使用 `FULL / PARTIAL / NOT_AVAILABLE / NOT_PROVEN / NOT_APPLICABLE`；发布态使用 `GA / PREVIEW / BETA_OR_EXPERIMENT / COMING_SOON / HISTORICAL / UNKNOWN_RELEASE_STATE`。若某 Feature（功能）为套餐内 GA，但当前 Workspace（工作区）只见升级入口，仍按官方套餐判定正式权益，并把入口状态单独记录。

### 1.2 审计单元

每个 Feature（功能）尽量拆为一个可触发、可观察结果的原子能力。表格字段统一为：入口/触发、对象与角色、结果/状态、支持与发布态、套餐/平台/地区/管理员限制、证据、边界。一个入口中若含多个独立结果会拆成多行；同一能力的桌面/移动差异保留在限制字段中。

### 1.3 框架调整（Slack-specific delta）

既有 B01—B19、A01—A14 足以作为索引，但 Slack 2026 的事实要求新增三个交叉视角，而不新增与框架竞争的顶层编号：

1. `S-X01 Personal work / attention orchestration（个人工作/注意力编排）`：Today（今日工作台，暂译）、Activity（活动）、Later（留待以后处理）、提醒、VIP、专注、草稿/定时消息、侧栏分区、分屏和窗口共同构成个人工作编排层，跨 B04/B10/B13/A10。若只把它们当作零散控件，会漏掉 Slack 从“通信流”转成“个人工作台”的结构变化。
2. `S-X02 Multi-player agent workspace（多人代理工作空间）`：Agents & tools（代理与工具）、频道中的 Agent（代理）、Slack Code 临时代码频道、Artifacts（成果物）、人工停止/审阅构成多人—代理协作层，跨 B03/B14/A05/A08/A09/A11/A12/A14。
3. `S-X03 Persistence classes（持久性分层）`：消息历史、AI 摘要/搜索答案、Slackbot 会话、Slackbot memory（记忆）、Canvas/List artifact（画板/列表成果物）、自动任务分别有不同的保留与权限语义，不能把“AI 记得”作为一个布尔 Feature（功能），跨 B09/B11/B17/A01/A02/A06/A07/A09/A12/A13。

### 1.4 中英文术语治理规则与核心映射

本文保留英文原名作为跨语言检索键，同时在首次出现、章节标题和每一条原子 Feature（功能）名称中增加中文。中文分成三类，不能混写：

| 类型 | 含义 | 写法 |
|---|---|---|
| `OFFICIAL_ZH` | Slack 简体中文客户端或帮助中心明确使用的名称 | `Huddle（抱团）` |
| `OFFICIAL_BRAND + EXPLANATORY_ZH` | 官方继续保留英文品牌名，括号内为功能解释 | `Slack Connect（外部组织协作）` |
| `EXPLANATORY_ZH` | 本研究拆出的原子能力，不是 Slack 独立产品名 | `Per-recipient read receipt（逐收件人已读回执）` |
| `TEMP_ZH` | 新功能或 Preview 暂无稳定中文名 | `Today（今日工作台，暂译）` |

核心产品术语采用以下统一映射；具体原子能力仍在 B01—B19、A01—A14 表中逐项双语化。

| 英文原名 | 本文中文名 | 类型 | 一手依据与备注 |
|---|---|---|---|
| Workspace | 工作区 | `OFFICIAL_ZH` | 中文客户端与登录/管理帮助 [S07][S-W01] |
| Home | 主页 | `OFFICIAL_ZH` | 中文客户端顶层入口 [S-W01] |
| Admin | 管理员 | `OFFICIAL_ZH` | 中文客户端顶层入口 [S-W01] |
| Profile | 个人资料 | `OFFICIAL_ZH` | 中文个人资料与状态帮助 [S19] |
| Directory | 目录/成员目录 | `OFFICIAL_ZH` | 中文客户端入口 [S-W01] |
| Guest | 访客 | `OFFICIAL_ZH` | 中文角色帮助 [S57] |
| Channel | 频道 | `OFFICIAL_ZH` | 中文频道帮助 [S08] |
| Direct message / DM | 私信 | `OFFICIAL_ZH` | 中文私信帮助 [S10] |
| Thread | 消息列 | `OFFICIAL_ZH` | 中文帮助正文与客户端入口 [S27][S-W01]；官方译名较生硬，因此保留英文原词 |
| Huddle | 抱团 | `OFFICIAL_ZH` | [中文 Huddle 帮助](https://slack.com/intl/zh-cn/help/articles/4402059015315-在-Slack-中使用抱团) [S27] |
| Canvas | 画板 | `OFFICIAL_ZH` | [中文 Canvas 帮助](https://slack.com/intl/zh-cn/help/articles/203950418-在-Slack-中使用画板) [S24] |
| List / Lists | 列表 | `OFFICIAL_ZH` | [中文 Lists 帮助](https://slack.com/intl/zh-cn/help/articles/27452748828179-在-Slack-中使用列表) [S25] |
| Clip / Clips | 剪辑 | `OFFICIAL_ZH` | [中文 Clips 帮助](https://slack.com/intl/zh-cn/help/articles/4406235165587-在-Slack-中录制音频和视频剪辑) [S30] |
| Activity | 活动 | `OFFICIAL_ZH` | [中文 Activity 帮助](https://slack.com/intl/zh-cn/help/articles/19693583638803-在-活动-视图中完成你的工作) [S13] |
| Later | 留待以后处理 | `OFFICIAL_ZH` | [中文 Later 帮助](https://slack.com/intl/zh-cn/help/articles/360042650274-保存消息和文件留待以后处理) [S14] |
| Starred | 已加星标 | `OFFICIAL_ZH` | 中文客户端/帮助 [S21][S-W01] |
| Drafts & sent | 草稿和已发送 | `OFFICIAL_ZH` | 中文客户端消息视图 [S12][S-W01] |
| Workflow Builder | 工作流程构建器 | `OFFICIAL_ZH` | [中文 Workflow Builder 指南](https://slack.com/intl/zh-cn/help/articles/360035692513-Slack-工作流程构建器指南) [S36] |
| Agents & tools | 代理与工具 | `OFFICIAL_ZH` | 中文客户端顶层入口 [S-W01] |
| AI agent | AI 代理 | `OFFICIAL_ZH` | [中文 AI Agent 帮助](https://slack.com/intl/zh-cn/help/articles/33076000248851-在-Slack-中与-AI-代理协作) [S41] |
| Slackbot | Slackbot（私人 AI 代理） | `OFFICIAL_BRAND + EXPLANATORY_ZH` | 品牌名保留；官方将新版定位为私人 AI 代理 [S42][S54] |
| Enterprise Search | 企业搜索功能 | `OFFICIAL_ZH` | [中文 Enterprise Search 帮助](https://slack.com/intl/zh-cn/help/articles/39044407124755-设置和管理-Slack-企业搜索功能) [S49] |
| Recap | 要点回顾 | `OFFICIAL_ZH` | 中文套餐矩阵与 AI 指南 [S05][S-W01] |
| Slack Connect | Slack Connect（外部组织协作） | `OFFICIAL_BRAND + EXPLANATORY_ZH` | 官方保留品牌名；括号说明功能边界 [S09] |
| Slack Code | Slack Code（多人代理编码空间） | `OFFICIAL_BRAND + EXPLANATORY_ZH` | 官方保留品牌名；当前为渐进发布能力 [S53] |
| Today | Today（今日工作台，暂译） | `TEMP_ZH` | 官方中文材料仍保留 Today；Beta 且停止接收新参与者 [S47A] |
| Interactive surface | 交互式操作台 | `EXPLANATORY_ZH` | 开发/AI 对象释义，不作为稳定中文品牌名 [S46A] |
| Skill | 技能 | `OFFICIAL_ZH` | Slackbot 技能目录和管理帮助 [S55A] |
| MCP | MCP（模型上下文协议） | `OFFICIAL_BRAND + EXPLANATORY_ZH` | 缩写保留，括号展开协议含义 [S44A][S45A] |

## 2. Slack 官方产品信息架构与核心优势

| Slack 官方支柱 | 官方强调对象 | 在本审计的映射 | 证据等级 |
|---|---|---|---|
| 协作 | Channels（频道）、Slack Connect（外部组织协作）、Huddles（抱团）、Clips（剪辑）、Messaging（消息）、Enterprise（企业能力） | B03/B06/B08/B10/B12/B15/B16/B19 | `MARKETING_ONLY` 定位；行为回 Help 验证 [S01] |
| 项目管理 | Canvas（画板）、Lists（列表）、File sharing（文件分享）、Templates（模板） | B11/B13；A09 | 同上 [S01] |
| 集成 | 2,600+ Apps（应用）、Workflow Builder（工作流程构建器）、Salesforce | B13/B14/B16；A08/A14 | “2,600+”为营销动态数字，不作稳定容量契约 [S01] |
| 智能 | Slack AI、Agentforce、Enterprise Search（企业搜索）、Slackbot（私人 AI 代理） | A01—A14 | 功能、套餐、发布态分别回 AI Guide、Help 和开发文档 [S05][S41][S42][S49] |

中文“使用 Slack”帮助目录把 AI 放在首个一级家族，并同时把频道、DM（私信）、消息格式/工具、文件/Canvas（画板）/Lists（列表）、搜索、音视频和辅助功能作为一级知识家族；2026 年目录又出现 Today（今日工作台，暂译）、Slackbot memory（记忆）、MCP（模型上下文协议）、Skills（技能）、interactive surface（交互式操作台）等内容。这是当前产品注意力从传统 IM 向 AI 工作层移动的官方信息架构证据，但目录标题本身不证明具体套餐或 GA（正式可用）状态。[S06]

匿名 Workspace（工作区）UI 的顶层可见 `Home（主页） / DMs（私信） / Activity（活动） / Files（文件） / Agents & tools（代理与工具） / Admin（管理员）`；Home（主页）侧栏可见 Threads（消息列）、Huddles（抱团）、Directory（目录）、Starred（已加星标）、Channels（频道）、DM（私信）、Agents & Apps（代理与应用）。`Agents & tools（代理与工具）` 为统一自动化中心，含 All agents（所有代理）、Workflows（工作流程）、Apps（应用）；AgentExchange（代理市场）、工作流程模板和 App Marketplace（应用市场）都在该中心汇合。[S-W01]

## 3. 当前套餐、容量与付费墙

### 3.1 当前公开套餐矩阵

| 能力族 | Free | Pro | Business+ | Enterprise+ | 证据与边界 |
|---|---|---|---|---|---|
| 消息与文件历史 | 最近 90 天可见/可搜索；超过 1 年永久删除 | 无限 | 无限 | 无限 | [S02][S03][S04]；组织自定义保留另见 B16/B17 |
| App（应用）/集成 | 最多 10 个 | 无限 | 无限 | 无限 | [S02][S03]；`paid-vs-free` 同页“3 个工具”冲突见 C-01 |
| Huddle（抱团） | 1:1 | 最多 50 人（最多 25 个视频） | 同 Pro | 同 Pro | [S02][S27]；第三方接入另受批准 |
| Slack Connect（外部组织协作） | 仅 1:1 | 完整外部协作 | 同 Pro | 同 Pro + 企业治理 | [S02][S09] |
| Canvas（画板）/Lists（列表） | 频道/DM（私信）Canvas 的有限使用；Lists 不含；降级后只读 | 完整 Canvas/Lists | 同 Pro | 同 Pro | [S02][S24][S25] |
| 自定义/共享侧栏分区、用户模板 | 不含 | 包含 | 包含 | 包含 | [S02][S16][S17] |
| Workflow Builder（工作流程构建器） | 不含；已发布流程在降级后停止 | 包含 | 含 AI、条件分支等高级项 | 同 Business+ | [S02][S03][S36][S48] |
| 对话/线程摘要 | 不含 | 包含 | 包含 | 包含 | [S02][S05] |
| Huddle notes（抱团笔记） | 不含 | 包含 | 包含 | 包含 | [S02][S05][S28] |
| AI assistant apps（AI 助理应用） | 不含 | 包含 | 包含 | 包含 | [S02][S41]；具体第三方许可/收费另算 |
| 高级 AI | 不含 | 不含 | recap、文件摘要、翻译、AI 搜索、工作流 AI、消息解释、Canvas AI、Slackbot 等 | 同 Business+ | [S02][S05] |
| Enterprise Search（企业搜索） | 不含 | 不含 | 不含 | 包含 | [S02][S49] |
| 数据驻留、全消息导出 | 不含 | 不含 | 包含 | 包含 | [S02][S39] |
| DLP、信息屏障、法定保留、Discovery、审计日志、自定义角色等 | 不含 | 不含 | 多数不含 | 包含 | [S02][S39][S40]；个别为 add-on/依部署而定 |

### 3.2 当前、旧版与预览必须分开

- 2025-06 起，Pro 以上纳入 conversation/thread summaries 与 Huddle notes；Business+ 纳入高级 AI；Enterprise+ 独占 enterprise search。旧 Slack AI add-on 已不再在网站销售。[S60]
- Legacy Business+、Enterprise Grid/Select、GovSlack legacy 与 Slack AI add-on 已宣布在 2027-03-01 退役或不可续订。旧 Workspace 不能只按显示的套餐名推断 AI 权益，必须结合 AI feature access 和迁移状态。[S61]
- Free/Pro 的 Slackbot 可出现有限预览或基础版入口；Business+ 才是当前矩阵中的完整正式权益。Slackbot 本身还有消息/credit 使用限制，见 A06/A13。[S05][S54][S-W01]
- Workspace 套餐是整体升级，不能只升级单个个人；Free 升 Pro 后可访问升级时可恢复范围内的历史数据。动态价格、税费与地区货币不是本文的稳定事实。[S62]

## 4. 基础 IM 功能全集（B01—B19）

### B01 入口、Shell（应用外壳）与 Workspace（工作区）

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 套餐、平台、管理限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B01-01 | Workspace（工作区）登录与切换 | 登录/Workspace switcher → 进入或切换独立 Workspace | `FULL/GA` | Web/desktop/mobile；身份与策略按 Workspace | [S07][S-W01] | 多 Workspace 不是同一数据域 |
| B01-02 | 顶层导航 | Shell → Home、DMs、Activity、Files、Agents & tools、Admin | `FULL/GA` | 入口随角色、rollout、套餐变化 | [S06][S-W01] | UI 可见不等于后端权益已开放 |
| B01-03 | Home（主页）工作区 | Home → Threads、Huddles、Directory、Starred、Channels、DM、Agents & Apps | `FULL/GA` | desktop/web 实机；移动布局不同 | [S-W01] | 是导航聚合，不是新业务对象 |
| B01-04 | Admin（管理员）入口 | 有权角色进入 Admin → 管理 Workspace/Org | `PARTIAL/GA` | 权限与套餐决定页面 | [S35][S39][S-W01] | 普通成员不可据入口推断管理员能力 |
| B01-05 | 独立/分屏会话 | 打开消息、Canvas、Agent 会话 → 主区、分屏或独立窗口 | `PARTIAL/GA` | 以 desktop/web 为主；对象支持不同 | [S15][S41] | 分屏是呈现机制，不改变对象权限 |
| B01-06 | 全局搜索/新建 | 顶栏搜索或 compose → 搜索、跳转或新消息 | `FULL/GA` | 全套餐；结果受历史与权限约束 | [S18][S10][S-W01] | AI 搜索答案另记 A02 |

### B02 身份、关系与目录

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B02-01 | Profile（个人资料） | 成员打开个人资料 → 查看姓名、角色、状态、联系信息 | `FULL/GA` | 管理员可配置部分资料字段；外部可见受关系影响 | [S19][S35] | 不证明跨组织可见全部字段 |
| B02-02 | Directory（成员目录） | Directory/搜索 People → 查找 Workspace 成员 | `FULL/GA` | 结果受成员身份/来宾范围 | [S18][S-W01] | Enterprise Search 人员源另记 A02 |
| B02-03 | User groups（用户组） | 管理/提及用户组 → 批量通知或分配 | `PARTIAL/GA` | 付费；Free 不可用；创建/管理受角色限制 | [S03][S35] | 不是任意通讯录分组 |
| B02-04 | Guest（访客）身份 | 邀请 single-/multi-channel guest → 限定频道成员 | `FULL/GA` | 付费计划；角色权限受限 | [S57][S35] | Guests 不可使用 AI apps/agents，见 A05 |
| B02-05 | 外部组织身份 | Slack Connect 邀请/接受 → 外部成员进入共享频道/DM | `PARTIAL/GA` | Free 仅 1:1；组织审批与策略可拦截 | [S09][S02] | 外部成员仍属于其自己的组织 |
| B02-06 | 状态与可用性 | 头像/个人资料 → 设置文本、emoji、清除时间、Active/Away | `FULL/GA` | 全套餐；外部成员可能看到状态 | [S19] | 送达/已读不是同一对象 |
| B02-07 | 隐藏某人 | 个人菜单 → 隐藏其消息/姓名并弱化通知 | `FULL/GA` | 全套餐；对方不被通知；徽标仍可能出现 | [S20] | 不是封禁、踢出或安全举报 |

### B03 空间与会话

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B03-01 | Public channel（公共频道） | 创建/加入公共频道 → 成员可搜索和加入 | `FULL/GA` | Guests 除外；管理策略可限制创建 | [S08] | 内容对 Workspace 成员可发现 |
| B03-02 | Private channel（私人频道） | 创建/转换/邀请 → 仅成员可见、可搜索其内容 | `FULL/GA` | 邀请制；转换/管理受角色策略 | [S08][S38] | 私密内容不在普通频道管理列表中展示正文 |
| B03-03 | #general（默认通用频道） | Workspace 默认频道 → 非 Guest 成员必须加入 | `FULL/GA` | 不能离开、归档、删除或改为私密 | [S08][S38] | 是特殊系统频道 |
| B03-04 | 1:1 DM（一对一私信） | DMs/新消息 → 两人私信 | `FULL/GA` | 全套餐；跨组织受 Slack Connect/策略 | [S10] | 不等于私密频道 |
| B03-05 | Group DM（群组私信） | 选择 3—9 人 → 群组 DM；可命名 | `FULL/GA` | 最多 9 人；可转换为私密频道 | [S10][S11] | 增员会创建新的 group DM |
| B03-06 | DM（私信）增员与历史选择 | 在 DM 添加人员 → 选择包含历史或从新会话开始 | `FULL/GA` | 新建 group DM 并通知成员 | [S11] | 原 DM 不被原地改写 |
| B03-07 | Message thread（消息列） | 消息 Reply in thread → 侧向讨论与跟进 | `FULL/GA` | 全套餐；可回发到频道 | [S08][S12] | thread 仍依附根消息/会话权限 |
| B03-08 | Slack Connect channel（Slack Connect 外部协作频道） | 邀请外部组织 → 共享频道协作 | `PARTIAL/GA` | Free 仅 1:1；各组织审批/保留策略并存 | [S09][S02] | 不是单一组织的普通成员关系 |
| B03-09 | Channel template（频道模板） | 从模板创建频道 → 带预设 tabs/Canvas/List/Workflow | `PARTIAL/GA` | 付费；可由管理员限制 | [S08][S02] | 模板提供起点，不证明业务语义原生化 |
| B03-10 | Archive/unarchive channel（归档/取消归档频道） | 管理菜单 → 停止新活动；历史仍可搜索；可恢复 | `PARTIAL/GA` | 角色限制；Free 历史窗口仍适用；#general 不可归档 | [S38] | 删除是不同且永久的操作 |
| B03-11 | Code channel（代码频道） | 从支持的 Agent 在 channel/DM 触发 → 临时 public/private 多人代码频道 | `PARTIAL/PREVIEW` | Slack Code 渐进 rollout；需安装受支持 Agent；Agent 可能另收费 | [S53] | 不代表 Slack 原生提供模型或代码执行运行时 |

### B04 导航、视图与个人工作编排

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B04-01 | Sidebar（侧栏）会话导航 | Home 侧栏 → 最近频道/DM/Apps | `FULL/GA` | desktop/web；可按偏好隐藏/过滤 | [S15] | 移动端结构不同 |
| B04-02 | 自定义分区 | Sidebar 新建/移动 → 私人整理频道/DM | `PARTIAL/GA` | Pro+；Free 不含 | [S16][S02] | 不改变频道成员/权限 |
| B04-03 | 共享侧栏分区 | 分享分区 → DM 给成员，接收者可自定义 | `PARTIAL/GA` | 付费；可含用户组 | [S17] | 接收是导航配置，不自动授予频道访问 |
| B04-04 | Starred（已加星标） | 对频道/DM 加星 → 进入 Starred | `FULL/GA` | 全套餐；个人视图 | [S21] | 不等于 Pin 消息 |
| B04-05 | Drafts & sent（草稿和已发送） | 顶层视图 → Draft/Scheduled/Sent 三态 | `FULL/GA` | desktop/web/mobile差异；可编辑、删除、改期、立即发送/取消，草稿可批量删除 | [S12][S-W01] | 发送后编辑/删除受治理策略 |
| B04-06 | Unreads/Catch Up（未读/集中处理） | 未读视图 → 筛选、排序、回复、跳转、标已读/撤销 | `FULL/GA` | 移动可滑动；视图名称/rollout 可不同 | [S14][S-W01] | “标已读”是个人状态，不是回执 |
| B04-07 | Activity（活动） | Activity → 聚合提及、DM、线程、反应、邀请、Apps、提醒、VIP 等 | `PARTIAL/GA` | 新版自 2026-01 渐进 rollout；旧 UI 可能暂存 | [S13][S63] | rollout 未完成时入口/筛选可能不同 |
| B04-08 | Activity（活动）自定义视图 | desktop 创建保存视图 → mobile 可访问 | `PARTIAL/GA` | 创建主要在 desktop；过滤器依 rollout | [S13] | 是个人过滤，不改变源事件 |
| B04-09 | Conversation tabs（对话标签） | 频道头 Messages/Add canvas/+ → 添加/编辑标签页 | `PARTIAL/GA` | Canvas/List/Workflow 等对象受套餐 | [S24][S25][S-W01] | tab 是入口，不复制底层对象 |
| B04-10 | 分屏/独立窗口 | 打开对象菜单 → 并排或独立查看 | `PARTIAL/GA` | desktop/web 为主；对象支持不一 | [S15][S41] | 不改变同步、保留或权限 |

### B05 发现、创建与加入

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B05-01 | Browse/search channels（浏览/搜索频道） | Channels/Search → 发现可访问频道 | `FULL/GA` | 私密频道仅成员可发现正文 | [S08][S18] | 结果受权限与历史限制 |
| B05-02 | Create channel（建立频道） | Channels/new → public/private channel | `FULL/GA` | 管理员可限制创建者 | [S08][S35] | 模板见 B03-09 |
| B05-03 | Join/leave channel（加入/离开频道） | 公共频道 Join/Leave → 更新成员关系 | `FULL/GA` | #general 不能离开；私密频道需邀请 | [S08] | 离开不删除历史消息 |
| B05-04 | Invite member/guest（邀请成员/访客） | 邀请入口 → member 或 guest | `PARTIAL/GA` | 角色、域名、套餐和审批限制 | [S35][S57] | 账号生命周期见 B17 |
| B05-05 | New message composer（新消息编辑器） | 顶层 compose → 选人/频道开始消息 | `FULL/GA` | 全套餐；外部对象受策略 | [S10][S12] | 不是创建新频道 |
| B05-06 | App/Agent discovery（应用/代理发现） | Agents & tools / Marketplace / AgentExchange → 搜索、安装或申请 | `PARTIAL/GA` | 安装可需管理员批准；第三方许可另算 | [S34][S41][S-W01] | 市场卡片文案不计 Slack 原生功能 |
| B05-07 | Workflow/template discovery（工作流程/模板发现） | Workflows All/Templates/Managed by you → 选择模板或新建 | `PARTIAL/GA` | 发布/构建为付费能力 | [S36][S-W01] | 示例模板不证明对应第三方系统已连接 |

### B06 Composer 与发送

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B06-01 | Rich text formatting（富文本格式） | Composer → 粗体、斜体、下划线、删除线、链接、列表、引用、代码 | `FULL/GA` | desktop/web/mobile控件不同 | [S12][S-W01] | 代码块不是可执行代码 |
| B06-02 | Emoji picker（表情选择器） | Composer → 插入 emoji | `FULL/GA` | 自定义 emoji 管理受权限 | [S22][S-W01] | Reaction 见 B08 |
| B06-03 | Mention（提及） | 输入 @ → 通知人、频道或用户组 | `FULL/GA` | 通知可被 DND/偏好影响 | [S23] | Mention 不保证读取 |
| B06-04 | Attach files（添加附件） | +/拖放 → 最多批量 10 个、单文件至 1GB | `FULL/GA` | 存储/分享受套餐和权限 | [S29][S-W01] | App 生成附件另受其权限 |
| B06-05 | Record clip（录制剪辑） | Composer → 录制音频/视频 Clip 并发送 | `FULL/GA` | 设备/浏览器权限；转录可用性依语言 | [S30] | 不等于 Huddle 或教育录课系统 |
| B06-06 | Shortcut/command（快捷方式/命令） | Shortcut 或 `/` → 触发 App 命令/Workflow | `PARTIAL/GA` | App/Workflow 必须已安装；外部频道仅本组织快捷方式 | [S37] | 结果由 App/Workflow 决定 |
| B06-07 | Send now（立即发送） | 点击发送/Enter → 消息进入会话 | `FULL/GA` | 管理员可限制频道发帖 | [S12][S39] | 送达回执未证明，见 B19 |
| B06-08 | Schedule send（定时发送） | 发送菜单 → Scheduled；可改期、取消或立即发送 | `FULL/GA` | 全套餐；时区影响显示 | [S12][S-W01] | 不是 Workflow 自动消息 |
| B06-09 | Draft autosave（草稿自动保存） | 未发送内容离开会话 → Draft | `FULL/GA` | 多端同步表现可能不同 | [S12] | 不保证永久保存 |

### B07 消息与内容对象

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B07-01 | Text message（文本消息） | Composer → 频道/DM/线程消息 | `FULL/GA` | 保留、编辑、删除受策略 | [S12] | 与 Canvas 段落不是同一对象 |
| B07-02 | Link preview（链接预览） | 粘贴 URL → 消息内链接/预览 | `PARTIAL/GA` | 目标站点与安全设置可影响预览 | [S12] | 不证明目标内容被长期索引 |
| B07-03 | File message（文件消息） | 上传文件 → 预览、搜索、下载/分享 | `FULL/GA` | 1GB；恶意软件扫描；外部链接受套餐 | [S29] | 文件权限不总等于会话外公开 |
| B07-04 | Audio/video Clip（音频/视频剪辑） | 录制发送 → 可播放，视频/音频可生成 transcript | `FULL/GA` | 生成转录受支持条件 | [S30][S31] | 非同步内容，不是实时会议 |
| B07-05 | Canvas（画板） | 创建或附加 Canvas → 富文本协作文档、评论、线程 | `PARTIAL/GA` | 完整能力 Pro+；Free/降级有限或只读 | [S24][S02][S03] | 不是通用文件系统或课程对象 |
| B07-06 | List（列表） | 创建 List → 字段、视图、任务、线程 | `PARTIAL/GA` | Pro+；Free 降级只读 | [S25][S02][S03] | 不是完整项目管理套件契约 |
| B07-07 | Workflow/App message（工作流程/应用消息） | App/Workflow 发消息 → 结构化卡片、按钮或结果 | `PARTIAL/GA` | 依 App scope、Workflow 套餐和实现 | [S34][S36] | 第三方结果不可归为 Slack 原生语义 |
| B07-08 | Agent artifact message（代理成果物消息） | Agent/Slack Code 产出 diff、Canvas、HTML、files 等 | `PARTIAL/PREVIEW` | Slack Code rollout/Agent 许可 | [S53] | artifact 可持久性依其类型和 Agent |

### B08 消息动作与治理

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B08-01 | Reply in thread（在消息列中回复） | 消息菜单 → thread reply | `FULL/GA` | 根消息权限继承 | [S08][S12] | 可选回发频道仍是两处呈现 |
| B08-02 | Emoji reaction（表情回复） | 消息上反应 → 聚合 emoji/成员 | `FULL/GA` | 全套餐 | [S22] | Message activity 聚合分析另记 B16 |
| B08-03 | Edit own message（编辑自己的消息） | 消息菜单 → 更新内容并保留 edited 状态 | `PARTIAL/GA` | 管理员可允许、禁止或设时限 | [S32][S35] | 法定保留可保全旧版本 |
| B08-04 | Unsend（撤回发送） | 发送后同会话且 composer 为空时撤回 → 内容/文件回 composer | `PARTIAL/GA` | desktop；15 秒内 | [S32] | 与永久删除不同 |
| B08-05 | Delete message（删除消息） | 消息菜单 → 永久从普通视图删除 | `PARTIAL/GA` | 权限/策略；无用户批量删除 | [S32][S40] | 合规保留可能在 Discovery 中保全 |
| B08-06 | Forward/share message（转发/分享消息） | 消息菜单 → 转发至其他会话 | `FULL/GA` | 目标会话权限适用 | [S33] | 不自动授予源私密内容权限 |
| B08-07 | Copy link（复制链接） | 消息菜单 → 复制深链 | `FULL/GA` | 访问者仍需原会话权限 | [S33] | 链接不是公开分享 |
| B08-08 | Pin（固定） | 消息菜单 → 固定在会话详情 | `FULL/GA` | 成员权限/频道策略 | [S12] | 与个人 Star/Save 不同 |
| B08-09 | Mark unread（标为未读） | 消息/视图操作 → 设置个人未读点 | `FULL/GA` | 个人状态 | [S14][S64] | 不向发送者提供已读回执 |
| B08-10 | Save/remind later（保存/稍后提醒） | 保存消息/文件 → Later；提醒、完成、归档或移除 | `FULL/GA` | 私人列表；Guest 仅个人提醒 | [S14][S26] | 不改变源对象 |

### B09 阅读、历史与搜索

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B09-01 | Conversation history（对话历史） | 打开频道/DM/thread → 顺序阅读历史 | `PARTIAL/GA` | Free 最近 90 天；付费无限；仍受保留策略 | [S02][S03][S12] | “无限”不覆盖管理员永久删除 |
| B09-02 | Free deletion horizon（免费版删除期限） | 时间流逝 → 超过 1 年消息/文件永久删除 | `FULL/GA` | Free；90 天外先隐藏/不可搜 | [S03][S04] | 升级能恢复的仅是尚未永久删除数据 |
| B09-03 | All Unreads/Catch Up（全部未读/集中处理） | 未读视图 → 批量阅读、筛选、标记 | `FULL/GA` | rollout/UI 差异 | [S14][S63] | 个人阅读队列 |
| B09-04 | Search result types（搜索结果类型） | Search → Messages、Files、People、Channels、Canvases；移动可含 Workflows | `FULL/GA` | 权限与平台差异 | [S18] | AI 答案另记 A02 |
| B09-05 | Search modifiers/filters（搜索修饰符/筛选条件） | `in/from/has/is/date/thread/with/creator` 等 → 缩小结果 | `FULL/GA` | 语法/对象支持不同 | [S18] | 不做语义推理 |
| B09-06 | Conversation search（对话内搜索） | 会话内搜索/快捷键 → 限定当前会话 | `FULL/GA` | 权限/历史窗口适用 | [S18][S-W01] | 与全局搜索不同 |
| B09-07 | Search history（搜索历史） | 搜索框 → 回看近期查询 | `FULL/GA` | 个人视图 | [S18] | 不等于 Slackbot 会话历史 |
| B09-08 | Export/eDiscovery（导出/电子数据发现） | 管理员导出或 Discovery API → 合规读取数据 | `PARTIAL/GA` | Business+ 可全消息导出；Enterprise+ 更细治理；法律/审批限制 | [S02][S39][S40] | 不是普通成员的搜索功能 |

### B10 通知、注意力与个人节奏

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B10-01 | Notification surfaces（通知呈现位置） | 新活动 → 横幅、侧栏加粗、提及徽标、Workspace/App 图标 | `FULL/GA` | desktop/mobile 权限和 OS 设置 | [S43][S44][S-W01] | 不等于消息送达状态 |
| B10-02 | Workspace notification level（工作区通知级别） | Preferences → Everything 或 mentions/DM 等 | `FULL/GA` | 可被管理员/设备设置部分影响 | [S43] | 每会话例外可覆盖 |
| B10-03 | Conversation exceptions（对话例外设置） | 频道/DM 通知菜单 → 独立级别 | `FULL/GA` | 全套餐 | [S43] | 个人偏好 |
| B10-04 | Keyword notifications（关键词通知） | 设置关键词 → 精确匹配时通知 | `PARTIAL/GA` | 不覆盖 thread；匹配规则有限 | [S43] | 不是语义订阅 |
| B10-05 | Mobile/desktop/email routing（移动端/桌面端/邮件路由） | 偏好 → 设备切换；邮件 15 分钟/每小时聚合且可回复 | `FULL/GA` | 客户端/邮箱可用性 | [S43][S44] | 邮件回复仍进入 Slack 会话 |
| B10-06 | DND/schedule（免打扰/日程） | 状态或偏好 → 暂停通知、设日程 | `FULL/GA` | 提及仍可能形成徽标 | [S19][S43] | 不把账号设为离线 |
| B10-07 | Mute/hide conversation（静音/隐藏对话） | 会话菜单 → 减少侧栏和通知 | `FULL/GA` | 个人偏好 | [S15][S43] | 仍可主动访问会话 |
| B10-08 | Activity filters/VIP（活动筛选/VIP） | Activity → 按事件/频道/分区/VIP 过滤 | `PARTIAL/GA` | 2026 新 Activity 渐进 rollout | [S13][S63] | VIP 是注意力筛选，不是身份角色 |
| B10-09 | Reminders（提醒） | 消息/文件/List/Canvas/频道或个人入口 → Later/Activity 提醒 | `FULL/GA` | Guests 仅个人提醒；重复能力依对象 | [S26] | Slackbot 自动任务另记 A10/A12 |
| B10-10 | Focus/out-of-office status（专注/不在办公室状态） | 日历/状态 → 自动或手动显示专注、Huddle、下班/休假 | `FULL/GA` | Calendar 连接影响自动化；提及者可见提示 | [S19][S45] | 不证明企业考勤/休假审批 |

### B11 文件、知识与协作对象

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B11-01 | File upload（文件上传） | Composer/拖放 → 文件消息与预览 | `FULL/GA` | 单文件 1GB、一次最多 10 个；全套餐但历史/存储政策不同 | [S29] | 不保证任意格式都可预览 |
| B11-02 | Malware scan（恶意软件扫描） | 上传文件 → Slack 扫描并可能阻断恶意内容 | `FULL/GA` | 扫描并非安全无风险保证 | [S29] | 不替代组织 DLP |
| B11-03 | Files browser（文件浏览器） | Files/搜索 → 浏览可访问文件 | `FULL/GA` | 权限/历史窗口适用 | [S18][S29][S-W01] | 不是跨源 Enterprise Search |
| B11-04 | Conversation files & links（对话文件与链接） | 会话详情 → 聚合 Files/links | `FULL/GA` | 只显示当前可访问会话内容 | [S29] | 不创建副本 |
| B11-05 | File download（文件下载） | 预览/菜单 → 下载 | `PARTIAL/GA` | desktop 可下载；mobile 主要支持图片等；管理员策略可限制 | [S29] | 设备副本不受 Slack 后续删除保证 |
| B11-06 | File share/external link（文件分享/外部链接） | 文件菜单 → 分享到会话或生成外部链接 | `PARTIAL/GA` | 外部链接为付费；公共频道成员权限与私密文件上传者权限不同 | [S29] | 外链需单独治理 |
| B11-07 | File delete（文件删除） | 文件菜单 → 删除单个文件 | `FULL/GA` | 无普通用户批量删除；法定保留可保全 | [S29][S40] | 消息与附件的删除语义可能不同 |
| B11-08 | Canvas create/edit（画板建立/编辑） | Files、频道 tab 或新建 → 富文本、媒体、表格、checklist | `PARTIAL/GA` | Pro+ 完整；权限为 view/edit/request | [S24][S65] | Free/降级只读或受限 |
| B11-09 | Canvas comments/threads（画板评论/消息列） | 选区/内容 → 评论、thread、reaction | `PARTIAL/GA` | 受 Canvas 权限；请求访问 desktop only | [S24][S65] | 评论不是频道消息副本 |
| B11-10 | Canvas delete/restore（画板删除/恢复） | 菜单删除 → 24 小时内可恢复 | `PARTIAL/GA` | 有权限角色；超时后边界未在本轮逐项验证 | [S24] | 不是通用回收站 SLA |
| B11-11 | Lists（列表） | Files/模板/频道 tab → 字段、table/board、filter、subtask、thread | `PARTIAL/GA` | Pro+；CSV 导入/导出；Free 降级只读 | [S25][S02][S03] | 不证明甘特、资源管理等完整 PM 能力 |
| B11-12 | Canvas/List permissions（画板/列表权限） | Share/权限菜单 → 限制个人/频道 view/edit、请求访问 | `PARTIAL/GA` | 对象所有者/管理员策略 | [S65] | 分享入口不自动绕过源数据权限 |

### B12 Huddle（抱团）、音视频与同步协作

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B12-01 | Start/join Huddle（发起/加入抱团） | 频道/DM 头部 Huddle → 实时会话 | `FULL/GA` | Free 2 人；付费最多 50；成员与 Guests 可用 | [S27][S-W01] | 不是预排期会议对象 |
| B12-02 | Audio/video（音频/视频） | Huddle 内切换 → 音频/视频参与 | `FULL/GA` | 最多 25 个视频；设备权限/网络限制 | [S27] | 录制不是默认原生会后档案 |
| B12-03 | Invite/access request（邀请/访问申请） | 邀请非会话成员/分享链接 → 加入；外部可请求访问并获批准 | `PARTIAL/GA` | 非会话成员看不到基础消息/thread；外部审批 | [S27] | 加入 Huddle 不授予底层会话内容 |
| B12-04 | Multi-screen sharing（多人屏幕共享） | Huddle 分享屏幕 → 最多 2 个同时屏幕 | `FULL/GA` | 平台/浏览器能力差异 | [S27] | 非持久 artifact |
| B12-05 | Drawing（屏幕绘制） | 屏幕分享中绘制 | `PARTIAL/GA` | Mac/Windows desktop | [S27] | 不等于 Canvas 绘图 |
| B12-06 | Huddle thread/canvas continuity（抱团消息列/画板延续） | Huddle 专属 thread/canvas → 会后继续访问 | `FULL/GA` | 继承会话/对象权限 | [S27] | Huddle 结束不删除这些对象 |
| B12-07 | Live captions（实时字幕） | Huddle 开启 captions → 英文实时字幕 | `PARTIAL/GA` | 当前帮助明确英文；不保存 | [S27][S31] | 不是完整会后 transcript |
| B12-08 | End semantics（结束规则） | 最后一人离开 → Huddle 结束 | `FULL/GA` | 网络中断/重连表现未逐设备验证 | [S27] | 与频道生命周期无关 |
| B12-09 | Huddle AI notes（抱团 AI 笔记） | Huddle 开启 AI notes → 生成 notes/summary/action items | `PARTIAL/GA` | Pro+；参与者提示、管理员 AI 设置适用 | [S05][S28] | AI 生成内容需复核；非录音档案等价物 |

### B13 结构化行动与业务连接

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B13-01 | List task/status（列表任务/状态） | List 新建 item/field → 负责人、日期、状态、子任务 | `PARTIAL/GA` | Pro+ | [S25][S02] | 是通用结构化项，不是课程/作业对象 |
| B13-02 | Message to List（消息转为列表项） | 消息菜单 → 把消息添加为 List item | `PARTIAL/GA` | Pro+；仍保留源消息链接/权限 | [S25] | 不自动抽取可靠业务字段 |
| B13-03 | Canvas/List templates（画板/列表模板） | 新建对象 → 从模板起步 | `PARTIAL/GA` | Pro+；模板可由用户/组织提供 | [S24][S25][S02] | 模板营销名称不证明原生领域模型 |
| B13-04 | Object reminders（对象提醒） | List/Canvas/message/file → 到期或个人提醒 | `FULL/GA` | 对象/Guest 支持差异 | [S26] | 不等于升级/催办工作流 |
| B13-05 | Workflow Builder（工作流程构建器） | Agents & tools/Workflows → 组合 trigger、steps 并发布 | `PARTIAL/GA` | Pro+；构建和发布是付费能力 | [S36][S-W01] | 外部步骤需对应 App/授权 |
| B13-06 | Workflow forms（工作流程表单） | Workflow 表单 → 收集字段并进入步骤 | `PARTIAL/GA` | Pro+；表单治理继承 Workflow | [S36] | 不是完整调查/考试系统 |
| B13-07 | Workflow branching（工作流程条件分支） | 添加 branch → 条件分支 | `PARTIAL/GA` | 新 Business+/Enterprise+；旧版计划需核验 | [S02][S48] | 分支能力不证明事务一致性 |
| B13-08 | Calendar/App connection（日历/应用连接） | 安装并连接外部 App → 日历状态、通知或业务动作 | `PARTIAL/GA` | 外部账户、scope、第三方收费/可用区 | [S34][S19] | 第三方数据不变成 Slack 原生事实 |
| B13-09 | Automated messages（自动消息） | Workflow/App/Slackbot task → 定时或事件触发消息 | `PARTIAL/GA` | 套餐、App、审批、频率限制；Slackbot最多每日3次自动任务运行 | [S36][S54] | 与用户 scheduled send 分开 |

### B14 App（应用）、Bot（机器人）、自动化与开发平台

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B14-01 | App discovery/install（应用发现/安装） | Agents & tools/Marketplace → 搜索、安装或申请 | `PARTIAL/GA` | Free 最多 10；管理员可限制；外部账户/收费另算 | [S34][S02][S-W01] | Marketplace 数量为动态营销值 |
| B14-02 | App permission scopes（应用权限范围） | 安装页 → 查看读/写/行动 scope 并授权 | `FULL/GA` | 安装者/管理员策略；App 可代表 user 或 app | [S35] | scope 是上限，不保证 App 行为质量 |
| B14-03 | App Home/Messages（应用主页/消息） | 打开 App → Home、Messages 或配置界面 | `PARTIAL/GA` | App 实现决定 | [S34] | 不算 Slack 原生业务对象 |
| B14-04 | Bot messages（机器人消息） | Bot/App 发消息 → 频道/DM 卡片或文本 | `PARTIAL/GA` | scope、频道成员关系、管理员策略 | [S34][S35] | 传统 bot 不自动等于 AI Agent |
| B14-05 | Shortcuts/slash commands（快捷方式/斜杠命令） | `/` 或 shortcut → 调用 App/Workflow action | `PARTIAL/GA` | 已安装能力；Connect 频道只显示本组织快捷方式 | [S37] | 命令结果由集成负责 |
| B14-06 | Workflow triggers/steps（工作流程触发器/步骤） | Workflow Builder → link/form/schedule/event 等触发与步骤 | `PARTIAL/GA` | Pro+；连接器授权 | [S36] | 不保证跨系统回滚 |
| B14-07 | Workflow activity logs（工作流程活动日志） | Workflow 管理 → 查看运行活动/错误 | `PARTIAL/GA` | 创建者/manager 权限，保留期依官方规则 | [S66] | 不是全组织审计日志 |
| B14-08 | API/events/webhooks（API/事件/Webhook） | 开发者平台 → App 调 API、订阅 Events、发 webhook | `PARTIAL/GA` | rate limits、scopes、审核/分发政策 | [S50][S51] | 仅证明平台接口，不证明某成品功能 |
| B14-09 | Agent app type（代理应用类型） | 开发者/管理员安装 Agent → 自主多步骤目标与 agent surface | `PARTIAL/GA` | Agent app scope、安装审批、模型/许可另算 | [S35][S41][S50] | 与 Bot、Workflow、Slackbot 分开计数 |
| B14-10 | Unified Agents & tools center（统一代理与工具中心） | Shell → All agents、Workflows、Apps 统一管理/发现 | `PARTIAL/GA` | UI/内容依 rollout、地区、权限、安装状态 | [S-W01][S41] | 第三方卡片能力不是 Slack 原生能力 |

### B15 角色、社区与空间治理

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B15-01 | Workspace/Org roles（工作区/企业组织角色） | Owner/Admin/Member/Guest → 不同管理权限 | `FULL/GA` | Enterprise org 与 Workspace 层不同 | [S55] | 自定义角色 Enterprise+另计 B16 |
| B15-02 | Channel access model（频道访问模型） | public 可加入、private 邀请制、guest 限定频道 | `FULL/GA` | 策略和 Connect 关系叠加 | [S08][S57] | 不以消息粒度授权普通成员 |
| B15-03 | Channel posting permissions（频道发帖权限） | 管理员/频道 manager → 限制谁可发帖 | `PARTIAL/GA` | Business+ 起有更强 channel management | [S02][S39] | 回复/Workflow 例外需具体配置验证 |
| B15-04 | Message edit/delete policy（消息编辑/删除策略） | Admin settings → 允许、禁止或限时编辑；限制删除角色 | `FULL/GA` | 所有计划有基础设置；组织级粒度依计划 | [S56] | 用户 UI 可见取决于策略 |
| B15-05 | Invite/guest governance（邀请/访客治理） | Admin → 控制邀请与 guest | `PARTIAL/GA` | 套餐/域/角色限制 | [S55][S57] | 不等于外部 Slack Connect 管理 |
| B15-06 | Slack Connect governance（Slack Connect 治理） | 各组织审批共享关系/频道 | `PARTIAL/GA` | Free 仅 1:1；企业策略更细 | [S09][S02] | 双方保留/导出规则并不相同 |
| B15-07 | Channel management tools（频道管理工具） | Admin → 浏览/改名/转换/归档/删除/设置 retention/AI/posting | `PARTIAL/GA` | Business+/Enterprise+；私密正文不显示 | [S39] | 操作会产生 action message；不等于读取私密内容 |
| B15-08 | Hide/content flagging（隐藏/内容标记） | 成员隐藏某人；Enterprise+ 可内容标记 | `PARTIAL/GA` | 隐藏全计划；内容标记 Enterprise+ | [S20][S02] | 本轮未证明完整社区举报/申诉闭环 |

### B16 管理、安全与合规

| ID | Feature（功能） | 入口/对象/角色 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B16-01 | Encryption/security baseline（加密/安全基线） | Slack service → transit/at-rest protection与安全控制 | `PARTIAL/GA` | 具体认证/部署/地区以 Trust 文档和合同为准 | [S67] | 不从营销词推断端到端加密 |
| B16-02 | SSO/SCIM（单点登录/跨域身份管理） | Admin identity settings → SSO/provision/deprovision | `PARTIAL/GA` | 主要为 Business+/Enterprise+；Free/Pro 仅在连接 Salesforce org 时有脚注例外 | [S02] | 例外不等于通用免费 SSO |
| B16-03 | Retention policies（保留策略） | Admin → Workspace/Org/Conversation 消息与文件保留 | `PARTIAL/GA` | 付费可自定义；永久删除不可逆 | [S04] | legal hold 可覆盖正常删除语义 |
| B16-04 | Export（导出） | Admin → 导出 public 或 all conversations | `PARTIAL/GA` | Business+ 起 all-message export；审批/法律/计划限制 | [S02][S39] | 普通成员无此入口 |
| B16-05 | Data residency（数据驻留） | Admin/合同 → 选择支持的数据区域 | `PARTIAL/GA` | Business+/Enterprise+；具体数据类别/地区需部署核验 | [S02] | 不等于所有子处理器均在同地区 |
| B16-06 | DLP/info barriers（数据丢失防护/信息屏障） | Enterprise policies → 检测/限制内容和通信 | `PARTIAL/GA` | Enterprise+；配置/集成依赖 | [S02] | 本轮未逐条审计供应商/规则覆盖面 |
| B16-07 | Legal holds/Discovery API（法定保留/电子数据发现 API） | 管理员创建 hold 或 eDiscovery 集成 → 删除/编辑后仍保全 | `PARTIAL/GA` | Enterprise+；Slack Connect 等存在范围例外 | [S40][S02] | 合规保全不等于用户可见历史 |
| B16-08 | Audit logs（审计日志） | Enterprise admin/API → 读取安全/管理事件 | `PARTIAL/GA` | Enterprise+ | [S02] | 与 Workflow activity log 不同 |
| B16-09 | EKM/device management/anomaly response（企业密钥管理/设备管理/异常响应） | Enterprise 管理 → 密钥、设备和异常会话控制 | `PARTIAL/GA` | Enterprise+，部分 add-on/实施条件 | [S02] | 不假定默认开启 |
| B16-10 | Custom roles/domain claiming（自定义角色/域名声明） | Org Admin → 分配细粒度管理角色、声明域 | `PARTIAL/GA` | Enterprise+ | [S02] | 与频道 manager/用户组不同 |
| B16-11 | Workspace transparency（工作区透明度） | 成员查看 Workspace settings → Owner 联系方式、retention、export/Discovery 可用性、TOS | `FULL/GA` | 所有成员可见范围由页面定义 | [S68] | 显示“可用”不证明管理员已执行导出 |
| B16-12 | AI/App administration（AI/应用管理） | Admin → 允许人群、安装审批、AI/Agent/Workflow 控制 | `PARTIAL/GA` | 套餐、组织层级与功能分别配置 | [S47][S35][S41] | 关闭 AI 不自动降低价格 |

### B17 生命周期、可靠性与恢复

| ID | Feature（功能） | 入口/触发 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B17-01 | Draft recovery（草稿恢复） | 离开未发送 composer → Draft 可继续 | `FULL/GA` | 多端/清理后的保留 SLA 未证明 | [S12] | 不是长期版本控制 |
| B17-02 | Connection failure states（连接失败状态） | WebSocket/网络异常 → cannot connect/load/server/WebSocket error | `FULL/GA` | 客户端与网络环境 | [S69][S70] | WebSocket 故障会停止新消息到达 |
| B17-03 | Client recovery（客户端恢复） | reload/restart/clear cache/status/support → 尝试恢复 | `FULL/GA` | 不保证所有服务端故障可本地恢复 | [S69] | 不是消息 exactly-once 契约 |
| B17-04 | Channel archive recovery（频道归档恢复） | archive → closed；unarchive → 恢复活动 | `PARTIAL/GA` | public membership 不恢复，private membership 保留；#general 不适用 | [S38] | 删除不能用 unarchive 恢复 |
| B17-05 | Permanent channel delete（永久删除频道） | 授权角色删除 → 频道及消息永久删除 | `PARTIAL/GA` | 严格角色/计划/合规限制 | [S38][S40] | legal hold/eDiscovery 可能另保全 |
| B17-06 | Canvas short restore（画板短期恢复） | 删除 Canvas → 24 小时内恢复 | `PARTIAL/GA` | 对象/权限限制 | [S24] | 不外推至 List、消息或频道 |
| B17-07 | Account deactivation/reactivation（账号停用/重新激活） | Owner/Admin 停用 → 全设备登出、不可登录；消息/文件保留；可重启 | `FULL/GA` | App 可能同步禁用；角色限制 | [S71] | 停用不是删除历史 |
| B17-08 | Plan downgrade transitions（套餐降级转换） | 降到 Free → guests 停用、Connect 断开、group huddle受限、Canvas/List只读、Workflow停止等 | `FULL/GA` | 当前对象和配置决定实际影响 | [S03] | 不等于对象立即全部删除 |
| B17-09 | Retention deletion（保留期删除） | 到达 policy horizon → 永久删除消息/文件 | `PARTIAL/GA` | 计划、会话 override、legal hold | [S04][S40] | 用户删除与定时保留是不同触发 |

### B18 平台、辅助功能与国际化

| ID | Feature（功能） | 入口/对象 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B18-01 | Desktop/web/mobile clients（桌面端/Web/移动端客户端） | App/Web → 访问核心消息与工作对象 | `PARTIAL/GA` | 功能按平台有差异 | [S72] | “有客户端”不等于所有功能完全一致 |
| B18-02 | Supported OS/browser（支持的操作系统/浏览器） | 安装/访问 → 在支持版本运行 | `FULL/GA` | 快照：macOS 13+、Windows 11 23H2+、iOS 17+、Android 11+ 等；半年更新 | [S72] | 版本是动态事实，按快照使用 |
| B18-03 | Huddle browser support（抱团浏览器支持） | 浏览器启动 Huddle → 音视频 | `PARTIAL/GA` | Chrome/Firefox；其他浏览器不全支持 | [S27][S72] | 普通消息 Web 支持更广 |
| B18-04 | Keyboard navigation（键盘导航） | 快捷键/焦点 → 无鼠标导航与操作 | `FULL/GA` | 不同平台快捷键不同 | [S31] | 本轮未做 WCAG 逐项实测 |
| B18-05 | Screen reader/simplified layout（屏幕阅读器/简化布局） | Accessibility preferences → 辅助朗读/简化布局 | `FULL/GA` | 客户端/读屏器组合差异 | [S31] | 官方支持不等于全部第三方组合认证 |
| B18-06 | Visual accessibility（视觉无障碍） | 偏好 → dark/compact/font/zoom/link underline/减少动画 | `FULL/GA` | 部分为客户端偏好 | [S31] | 不改变内容语义 |
| B18-07 | Captions/transcripts/alt text（字幕/逐字稿/替代文本） | Huddle/Clip/Image → 字幕、transcript、alt text | `PARTIAL/GA` | Huddle captions 英文且不保存；Clip支持条件不同 | [S31][S27][S30] | 不等于多语言会后会议记录 |
| B18-08 | Language/time zone（语言/时区） | Preferences/profile → UI语言、时区相关显示 | `PARTIAL/GA` | AI 翻译 Business+；支持语言清单动态 | [S05][S72] | UI 本地化与内容翻译分开 |

### B19 Presence（在线状态）、送达与实时状态

| ID | Feature（功能） | 入口/触发 → 结果与状态 | 支持/发布 | 限制 | 证据 | 边界 |
|---|---|---|---|---|---|---|
| B19-01 | Manual availability（手动可用状态） | Profile → 手动 Active/Away | `FULL/GA` | 全套餐 | [S19] | 不是工作时间证明 |
| B19-02 | Automatic availability（自动可用状态） | 活跃/不活跃 → active；desktop 约 10 分钟无活动转 away | `FULL/GA` | 客户端状态计算 | [S19] | 多端登录具体合并规则未审计 |
| B19-03 | Automatic contextual status（自动情境状态） | Huddle/Focus/off-hours → 自动状态 | `PARTIAL/GA` | Calendar/客户端/组织连接影响 | [S19] | 可被用户覆盖/清除 |
| B19-04 | Typing indicator（正在输入提示） | Preferences/会话输入 → 显示正在输入 | `FULL/GA` | 可在消息显示偏好中调整；多人呈现不同 | [S73] | 不证明消息已发送或已读 |
| B19-05 | Personal unread state（个人未读状态） | 新消息/mark unread → bold、badge、unread point | `FULL/GA` | 个人状态、跨端同步 | [S14][S64] | 发送者不可据此获得回执 |
| B19-06 | Per-recipient delivery receipt（逐收件人送达回执） | 发送消息 → 每收件人 delivered 状态 | `NOT_PROVEN/UNKNOWN_RELEASE_STATE` | 本轮官方 Help/产品/管理员文档未找到明确普通用户契约 | [S-Q02] | 不把缺证写成“确定没有” |
| B19-07 | Per-recipient read receipt（逐收件人已读回执） | 阅读消息 → 向发送者显示已读人/时间 | `NOT_PROVEN/UNKNOWN_RELEASE_STATE` | Message activity 仅 Business+/Enterprise+ 且给授权管理员聚合 view/reaction/click/share/device 分析，不是会话级已读回执 | [S74][S-Q02] | Mark read/unread 是个人队列；不等于发送者回执 |
| B19-08 | Huddle live participants（抱团实时参与者） | Huddle 加入/离开 → 实时成员与会话状态 | `FULL/GA` | 受连接和人数上限 | [S27] | 不证明出勤记录/正式考勤 |

## 5. 原生 AI、Slackbot、Agent（代理）、App（应用）/Bot（机器人）/Workflow（工作流程）与开发平台（A01—A14）

> 计数边界：`Slack AI` 是原生 AI assist（辅助能力）；`Slackbot` 是私人 AI Agent（代理）；第三方/内部 Agent（代理）是安装型 Agent app（代理应用）；传统 App/Bot（应用/机器人）是连接器或命令型应用；Workflow Builder（工作流程构建器）是确定性自动化；Slack Code 是多人—代理临时代码频道。它们不互相混算。

| ID | 原子 Feature（功能） | 形态；入口/触发 → 结果/状态 | 支持/发布 | 套餐、权限、持久性与边界 | 证据 |
|---|---|---|---|---|---|
| A01-01 | Conversation summary（对话摘要） | `AI_ASSIST`；频道/DM → 对未读、近 7 日或自定义日期生成带引用摘要 | `FULL/GA` | Pro+；只基于用户可访问内容；自定义日期主要 desktop | [S05][S46] |
| A01-02 | Thread summary（消息列摘要） | `AI_ASSIST`；thread → 生成带来源引用的摘要 | `FULL/GA` | Pro+；管理员可关闭 AI | [S05][S47] |
| A01-03 | Channel recap（频道要点回顾） | `AI_ASSIST`；选择频道 → 每日 recap 未读信息 | `PARTIAL/GA` | Business+；由用户选择来源，不等于全组织广播 | [S05] |
| A01-04 | Summary persistence（摘要持久性） | 摘要/搜索答案 → 响应后不作为新消息长期写入 | `PARTIAL/GA` | 官方安全页称这些结果为 ephemeral；用户主动分享/复制会产生新对象 | [S46] |
| A02-01 | Natural-language Slack search（Slack 自然语言搜索） | `AI_ASSIST`；搜索框自然语言问题 → 答案、引用与相关消息 | `FULL/GA` | Business+；权限交集；可能不完备，须按引用复核 | [S05][S46] |
| A02-02 | Share AI search answer（分享 AI 搜索答案） | 答案页 Share → 先提示复核，再允许 `Share anyway` | `FULL/GA` | Business+；分享后接收者仍需理解引用权限/上下文 | [S05] |
| A02-03 | Enterprise Search（企业搜索） | `AI_ASSIST`；查询 → Slack + 已连接企业源答案 | `PARTIAL/GA` | Enterprise+；管理员配置 source/person/AI inclusion；源权限不被绕过 | [S49] |
| A02-04 | Custom enterprise connectors（自定义企业搜索连接器） | `PLATFORM`；开发者连接内部知识源 → 进入企业搜索 | `PARTIAL/GA` | Enterprise+；org-ready/internal only，非 Marketplace 通用 App | [S52] |
| A03-01 | Message explanation（消息解释） | `AI_ASSIST`；消息菜单 → 解释上下文/术语 | `PARTIAL/GA` | Business+；输出非事实源，依可见上下文 | [S05] |
| A03-02 | Translation（翻译） | `AI_ASSIST`；消息/内容 → 翻译 | `PARTIAL/GA` | Business+；支持语言动态，不能推断术语准确性 | [S05] |
| A03-03 | File summary（文件摘要） | `AI_ASSIST`；支持文件 → 摘要 | `PARTIAL/GA` | Business+；仅支持类型/大小；自动摘要仅对所有会话成员可访问的文本文件 | [S05] |
| A03-04 | Canvas generation（画板内容生成） | `AI_ASSIST`；提示 → 生成/整理 Canvas 内容 | `PARTIAL/GA` | Business+；Canvas 权限与人工编辑适用 | [S05] |
| A03-05 | General rewrite in composer（编辑器通用改写） | 选中消息文本 → 改写语气/长度 | `NOT_PROVEN/UNKNOWN_RELEASE_STATE` | 本轮当前 AI Guide 未取得足够行为与套餐证据；不由“生成能力”外推 | [S-Q03] |
| A04-01 | Huddle notes（抱团笔记） | `AI_ASSIST`；Huddle 开启 notes → 摘要、notes、action items | `FULL/GA` | Pro+；参与者可见提示，管理员 AI 设置适用 | [S05][S28] |
| A04-02 | Huddle captions（抱团字幕） | `NON_AI_OR_UNSPECIFIED`；Huddle → 英文实时字幕且不保存 | `FULL/GA` | 全套餐/平台条件；不把字幕自动计为生成式 AI | [S27] |
| A04-03 | Native meeting recording/transcript archive（原生会议录制/逐字稿归档） | Huddle → 可检索完整录制/逐字稿 | `NOT_PROVEN/UNKNOWN_RELEASE_STATE` | Huddle Help 只证明不保存的实时 captions 与持久 thread/canvas；不外推录制 | [S27][S-Q04] |
| A05-01 | Agent discovery（代理发现） | `AI_AGENT`；Agents & tools/AgentExchange → 搜索、安装或申请 Agent | `PARTIAL/GA` | 管理员可要求审批；第三方许可/账户/收费另算 | [S41][S-W01] |
| A05-02 | Agent DM/split session（代理私信/分屏会话） | `AI_AGENT`；打开 Agent → 1:1 主区或分屏会话、查看历史 | `PARTIAL/GA` | 安装与权限前置；历史属于该 Agent surface | [S41] |
| A05-03 | Agent in public/private channel（公共/私人频道中的代理） | `AI_AGENT`；频道 `@agent` → 在多人上下文回应/工作 | `PARTIAL/GA` | Agent 必须在频道；私密频道权限与 scope 适用 | [S41] |
| A05-04 | Guest agent access（访客代理访问） | Guest 尝试 AI app/agent → 不可使用 | `NOT_AVAILABLE/GA` | 官方明确 Guests 不能使用 AI apps/agents | [S41] |
| A05-05 | Slack Code multi-player agent（Slack Code 多人代理协作） | `AI_AGENT`；支持 Agent 从频道/DM → 创建临时代码频道，多人协作 | `PARTIAL/PREVIEW` | 渐进 rollout；页面称所有计划可用但需 Agent，第三方自身可能付费；与 App guide 套餐表述冲突见 C-02 | [S53] |
| A06-01 | Personal Slackbot（私人 Slackbot） | `AI_AGENT`；顶栏/DM → 私人工作 Agent | `PARTIAL/GA` | 完整权益 Business+/Enterprise+；Free/Pro 仅有限 preview/basic；用户权限交集 | [S42][S54][S-W01] |
| A06-02 | Slackbot inspect/stop（Slackbot 步骤查看/停止） | Slackbot 工作中 → 查看步骤；Stop 中断 | `FULL/GA` | 输出需复核；停止不保证撤销已完成外部动作 | [S42] |
| A06-03 | Slackbot deep research（Slackbot 深度研究） | 提示 → 跨可访问 Slack/连接数据进行研究并给结果 | `PARTIAL/GA` | Business+/Enterprise+；源、连接与引用决定覆盖面 | [S42][S75] |
| A06-04 | Slackbot conversation lifecycle（Slackbot 对话生命周期） | History → 续接、重命名、查看历史；分享 prompt | `FULL/GA` | 分享 prompt 不等于共享私人会话/全部上下文 | [S42] |
| A06-05 | Slackbot file handling（Slackbot 文件处理） | 上传/提示 → 分析、创建、编辑 Canvas/CSV/TXT/List/PDF/Image | `PARTIAL/GA` | CSV/TXT 1MB、PDF 4.5MB/100 页、图片 30MB（大图缩放）等当前限制 | [S42] |
| A07-01 | Permission intersection（权限交集） | AI/Slackbot/Enterprise Search → 仅用用户可访问内容 | `FULL/GA` | 不提升源权限；第三方 Agent 另看 scopes | [S46][S42][S49] |
| A07-02 | Citation grounding（引用溯源） | 摘要/搜索答案 → 可跳到支持消息/来源 | `FULL/GA` | 引用不保证综合结论无遗漏；分享前应复核 | [S05][S46] |
| A07-03 | Slackbot memory（Slackbot 记忆） | 每周从个人活动生成偏好/主题记忆 → view/edit/remove/off | `PARTIAL/GA` | Business+/Enterprise+；默认开启；可从 ChatGPT/Claude 导入 | [S43A] |
| A07-04 | Enterprise connected sources（企业连接数据源） | Admin 连接 Drive/OneDrive/GitHub/Box/Confluence/mail 等 → 可搜索 | `PARTIAL/GA` | Enterprise+；各源权限和配置；可用源动态 | [S49] |
| A07-05 | Persistence separation（持久性分层） | AI summary/search vs Slackbot history/memory/artifact/task → 不同保留状态 | `FULL/GA` | 摘要/答案 ephemeral；history/memory 可管理；共享 artifact 继承对象权限 | [S46][S42][S43A][S44A] |
| A08-01 | Slackbot recurring task（Slackbot 定期任务） | 提示创建 → 先生成 draft，用户确认后运行 | `PARTIAL/GA` | Business+/Enterprise+；最多每日 3 次自动运行；可 pause/edit/delete | [S42][S54] |
| A08-02 | Slackbot App/MCP tools（Slackbot 应用/MCP 工具） | 连接 App/MCP → 读写外部系统 | `PARTIAL/GA` | 个人账户连接；Enterprise 安装总需审批；工具级 Always allow/Needs approval/Blocked/Custom | [S45A][S44A] |
| A08-03 | AI workflow generation（AI 工作流程生成） | 描述目标 → 生成 Workflow draft，用户编辑/发布 | `PARTIAL/GA` | Business+；不支持 List item/webhook triggers 等当前限制 | [S48A] |
| A08-04 | AI workflow steps（AI 工作流程步骤） | Workflow 加 AI answer/summarize 等 → 运行 AI 步骤 | `PARTIAL/GA` | Business+；AI answer 不支持 Salesforce/外部频道；summarize 仅 public channel 等限制 | [S48A] |
| A08-05 | Deterministic Workflow Builder（确定性工作流程构建器） | trigger + steps + form/branch → 自动化 | `PARTIAL/GA` | Pro+；branch Business+/Enterprise+；与 Agent 自主规划分开 | [S36][S48] |
| A08-06 | Traditional App/Bot command（传统应用/机器人命令） | shortcut/slash/app message → 预定义动作 | `PARTIAL/GA` | scope/安装/外部系统；不计 AI Agent | [S34][S35][S37] |
| A08-07 | Slack MCP server（Slack MCP 服务器） | 外部 AI client 连接 Slack MCP → 搜索/读消息文件成员频道、发消息、创建/读 Canvas | `PARTIAL/GA` | 管理员/用户授权、客户端与政策；工具集动态 | [S44A] |
| A08-08 | Slackbot as MCP client（作为 MCP 客户端的 Slackbot） | Slackbot 连接外部 MCP server → 调外部工具 | `PARTIAL/GA` | tool policy 和审批语义逐工具；第三方数据不由 Slack 保证 | [S44A][S45A] |
| A09-01 | Slackbot shared Canvas write（Slackbot 写入共享画板） | Slackbot 要写共享 Canvas → 显式 Confirm 后写入 | `FULL/GA` | 共享 artifact；源 Canvas 权限适用 | [S42] |
| A09-02 | Interactive surface（交互式操作台） | Slackbot 生成 report/dashboard → 可追问、分享至频道/DM/tab | `PARTIAL/GA` | Business+/Enterprise+；静态文件不自动更新 | [S46A] |
| A09-03 | Slack Code artifact（Slack Code 成果物） | Agent → code diff、Canvas、HTML、files | `PARTIAL/PREVIEW` | Slack Code rollout；artifact 类型决定持久性与权限 | [S53] |
| A09-04 | Line/batch review（逐行/批量审阅） | Slack Code diff → 行评论或批量 review | `PARTIAL/PREVIEW` | 支持 Agent/rollout；review 不等于代码已合并 | [S53] |
| A09-05 | Surface retrieval boundary（操作台找回边界） | 查找先前 interactive surface → 从会话 history 找 | `PARTIAL/GA` | file search/browser 在官方页为 coming soon；不能记为当前 GA | [S46A] |
| A10-01 | Today personalized landing（Today 个性化工作台） | Today → meetings、action items、highlights、建议 todo/Later、meeting prep | `PARTIAL/BETA_OR_EXPERIMENT` | Beta 且不再接受新参与者；不可视为普遍 GA | [S47A][S75] |
| A10-02 | Recap proactive digest（主动要点回顾） | 选定频道 → 每日未读 recap | `PARTIAL/GA` | Business+；由用户配置来源 | [S05] |
| A10-03 | Slackbot recurring proactive run（Slackbot 定期主动运行） | 已确认任务按计划运行 → 消息/结果 | `PARTIAL/GA` | 最多每日 3 次；usage/credit 约束 | [S42][S54] |
| A11-01 | Share-answer review gate（分享答案复核门槛） | 分享 AI 搜索答案 → review prompt → Share anyway | `FULL/GA` | 是提醒，不是强制事实审核 | [S05] |
| A11-02 | Shared Canvas confirmation（共享画板写入确认） | Slackbot 写共享 Canvas → Confirm | `FULL/GA` | 对共享写入有明确确认；其他工具可配置 always allow | [S42][S45A] |
| A11-03 | Tool-level approval（工具级审批） | App/MCP 工具 → Always allow/Needs approval/Blocked/Custom | `FULL/GA` | 因可设 Always allow，不能写“所有外部动作逐次确认” | [S45A] |
| A11-04 | Stop Agent（停止代理） | Slackbot/Slack Code → Stop 当前工作 | `PARTIAL/GA` | Slack Code仍 rollout；Stop 不自动回滚已完成动作 | [S42][S53] |
| A12-01 | Slackbot history/resume（Slackbot 历史/续接） | History → 找回并续接会话 | `FULL/GA` | 私人会话；不等于共享频道上下文永久记忆 | [S42] |
| A12-02 | Slackbot task controls（Slackbot 任务控制） | recurring task → pause/edit/delete | `FULL/GA` | 已执行结果不自动撤销 | [S42] |
| A12-03 | Slack Code states（Slack Code 状态） | Agent/code channel → Working/Idle/Needs attention/Done/Inactive/Archived | `PARTIAL/PREVIEW` | 渐进 rollout | [S53] |
| A12-04 | Slack Code inactivity（Slack Code 非活动状态） | 7 天无活动 → 从 sidebar 移除/进入 inactive lifecycle | `PARTIAL/PREVIEW` | 不等于数据立即永久删除 | [S53] |
| A12-05 | Close/archive code channel（关闭/归档代码频道） | 参与者 → close/archive | `PARTIAL/PREVIEW` | 角色/Agent/rollout；恢复语义未完全证明 | [S53] |
| A13-01 | Native AI enablement（原生 AI 启用控制） | Owner/Admin → 对 all/no one 或指定人群开启 | `FULL/GA` | 付费；Enterprise 可按人/组/排除；关闭不减价 | [S47] |
| A13-02 | AI security model（AI 安全模型） | AI 请求 → 权限交集、引用；Slack 管理第三方 LLM | `FULL/GA` | 官方称数据不用于训练第三方模型；仍需组织数据治理 | [S46] |
| A13-03 | App/Agent install approval（应用/代理安装审批） | Admin → 允许、限制、审批安装 | `FULL/GA` | Enterprise/组织策略更严格 | [S34][S41] |
| A13-04 | Slackbot usage limit（Slackbot 使用限额） | 使用 Slackbot → 消耗消息/credit | `PARTIAL/GA` | B+ 15 messages/member/week；Enterprise+ 无该周限但受政策；Free/Pro preview 有 lifetime/credit | [S54] |
| A13-05 | Skills administration（技能管理） | Admin dashboard → 分配/管理 skills 与 skill sets | `PARTIAL/GA` | Business+/Enterprise+；skill set 最多 25 | [S55A][S75] |
| A13-06 | Memory user control（记忆用户控制） | Slackbot memory → view/edit/remove/off/import | `FULL/GA` | 用户控制不等于组织级保留/Discovery 已全部审计 | [S43A] |
| A14-01 | Build Slack App/Bot（构建 Slack 应用/机器人） | `PLATFORM`；API/Events/Webhooks → 自建集成或 bot | `FULL/GA` | scopes、rate limits、分发/审核 | [S50][S51] |
| A14-02 | Build AI Agent surface（构建 AI 代理交互界面） | `PLATFORM`；Agent app/AI docs → 原生 Agent 对话 surface | `PARTIAL/GA` | 安装、许可、runtime/model 由开发者/第三方负责 | [S50] |
| A14-03 | Enterprise Search connector（企业搜索连接器） | `PLATFORM`；自定义 connector → 组织内部知识源 | `PARTIAL/GA` | Enterprise+；org-ready/internal only | [S52] |
| A14-04 | Create/share Slackbot skill（建立/分享 Slackbot 技能） | `AI_AGENT_CONFIG`；catalog/Slackbot Q&A/from scratch → 创建并审批/分享 skill | `PARTIAL/GA` | Business+/Enterprise+；内部/外部分享需治理 | [S55A] |
| A14-05 | Skill auto-match/manual attach（技能自动匹配/手动附加） | Slackbot → 自动匹配或用户手动附加 skill | `PARTIAL/GA` | 可用 skills 与管理员分配决定 | [S55A] |
| A14-06 | Create Workflow（建立工作流程） | `WORKFLOW_AUTOMATION`；Builder → trigger/steps/form/branch | `PARTIAL/GA` | Pro+；AI/branch 高阶付费墙 | [S36][S48][S48A] |
| A14-07 | Build MCP integration（构建 MCP 集成） | `PLATFORM`；Slack MCP server/client → 连接外部 AI/工具 | `PARTIAL/GA` | 授权、工具 policy、客户端兼容 | [S44A][S45A] |
| A14-08 | Agentforce in Slack（Slack 中的 Agentforce） | `THIRD_PARTY_AGENT`；安装/映射账户 → Salesforce Agentforce 会话/动作 | `PARTIAL/GA` | Salesforce 许可、账户映射与管理员设置；不计 Slack 原生 AI | [S56A][S57A] |

## 6. 端到端链路审计

| Flow | 入口 → 中间状态 → 结果 | 已证状态 | 关键断点/恢复/治理 | 证据 |
|---|---|---|---|---|
| E2E-01 基础消息 | 选择频道/DM → compose/draft → send/scheduled → unread/activity → reply/reaction/edit/delete | `FULL` | Draft 可恢复；定时可取消/改期；编辑/删除受策略；WebSocket 故障停止新消息 | [S12][S13][S32][S69] |
| E2E-02 外部协作 | 创建 Slack Connect 邀请 → 对方组织审批 → shared channel/DM → 双方发消息/文件/Huddle | `PARTIAL` | Free 仅 1:1；双方身份、retention、App/shortcut 策略不同；断开后关系变化 | [S09][S02][S37] |
| E2E-03 Huddle（抱团）到会后 | 频道/DM 启动 → 邀请/加入 → 音视频/屏幕/字幕 → 结束 → thread/canvas 继续 | `FULL` | Free 2 人；字幕英文且不保存；外部访问需批准；AI notes Pro+ | [S27][S28] |
| E2E-04 结构化工作 | 消息 → Add to List → fields/assignee/status → reminder/thread → Workflow action | `PARTIAL` | Pro+；外部 step 需授权；Workflow 日志可诊断但不保证跨系统事务回滚 | [S25][S26][S36][S66] |
| E2E-05 AI catch-up | 频道/thread → summary/recap → citation → 跳回源消息 → 人工复核/分享 | `FULL` | Summary Pro+、recap B+；权限交集；答案短暂，分享会生成新消息 | [S05][S46] |
| E2E-06 Slackbot（私人 AI 代理）工作 | 打开 Slackbot → 提示/上传 → 查看步骤 → stop 或形成 artifact/task → confirm/pause/edit/delete | `PARTIAL` | 完整 Slackbot B+；Free/Pro limited preview；共享 Canvas 明确确认，工具审批可配置；每日自动运行上限 | [S42][S45A][S54][S-W01] |
| E2E-07 安装型 Agent（代理） | Agents & tools → 搜索/安装申请 → admin approval → DM/split/channel `@` → 结果/历史/移除 | `PARTIAL` | Guests 不可用；第三方 scope、账户、模型、收费与质量另算 | [S41][S35][S-W01] |
| E2E-08 Slack Code（多人代理编码空间） | channel/DM 触发 Agent → 临时代码频道 → Working/Needs attention → diff/artifact → line/batch review/stop → Done/close/archive | `PARTIAL/PREVIEW` | 渐进 rollout；7 日无活动生命周期；all-plans 与 paid-app 表述有冲突；不证明代码合并或运行成功 | [S53] |
| E2E-09 Enterprise Search（企业搜索） | Admin 连接 source/配置人群 → 索引按源权限 → 用户问答/引用 → 管理员调整 source inclusion | `PARTIAL` | Enterprise+；连接源、权限、地区、索引时效需部署验证 | [S49][S52] |
| E2E-10 生命周期 | active channel/member/paid plan → archive/deactivate/downgrade/retention → read-only/disconnect/hidden/permanent deletion | `PARTIAL` | 各触发不同；legal hold 可保全；不能把 UI 不可见等同数据已删除 | [S03][S04][S38][S40][S71] |

## 7. 教育行业专项

### 7.1 结论分类

| 分类 | 结论 | 支持/发布 | 证据与边界 |
|---|---|---|---|
| 教育专属原生产品对象 | 课程、班级、作业、提交、批改、成绩、题库、考勤、学习分析、家校关系等 | `NOT_PROVEN` | 教育方案页没有行为文档证明这些是 Slack 原生对象；不能用“课堂频道”替代课程域模型 [S58][S-Q05] |
| 通用能力的教育场景包装 | 用 class/project channels 问答学习、虚拟课堂/online office hours、公告、public/private campus communities、企业安全 | `PARTIAL/MARKETING_ONLY` | 只证明官方定位；频道、Huddle、消息、安全行为分别回 [S08][S27][S39] 验证 [S58] |
| 商业优惠 | 符合条件教育机构的 Pro 或 Business+ 85% 折扣 | `FULL/GA` | 非营利教育机构、认可 K-12/高校、教职员工/校友/学生团体、学区等；每个 Workspace 单独申请，由 Workspace Owner 提交 [S59] |
| 年龄边界 | 16 岁以下不可使用 Slack | `NOT_AVAILABLE/GA` | 是资格/安全边界，不是家长同意即可绕过的已证路径 [S59] |
| Enterprise+ 教育折扣 | 85% 折扣是否覆盖 Enterprise+ | `NOT_PROVEN` | 当前 Help 只明确 Pro/Business+；不能外推 [S59][S-Q05] |
| 第三方教育集成 | LMS、网课、文件/日历等 Marketplace 集成 | `PARTIAL` | 只有具体 App 行为、scope 与许可经官方/供应商证据验证后才能计数；本轮不把营销 logo/卡片计为 Slack 原生 [S34][S58] |

### 7.2 适合教育场景但仍是通用 Slack 能力

- 课堂/项目频道、线程、提及、公告式受限发帖：B03/B08/B10/B15。
- Huddle、屏幕分享、Clip、Canvas、Lists：B11/B12/B13；它们不自动形成排课、课堂录制、作业提交或成绩册。
- Slack Connect、Guests、企业安全：B02/B03/B15/B16；16 岁年龄限制仍优先适用。
- Slack AI/Slackbot/Agent：A01—A14；没有教育专属模型、教学安全策略或学生学习记录治理的已证官方能力。

## 8. 已确认负向事实、冲突与关键未知项

### 8.1 已确认的负向/限制事实

| ID | 事实 | 状态 | 证据 |
|---|---|---|---|
| N-01 | Free 不是无限历史：最近 90 天可见/可搜，超过 1 年永久删除 | `CONFIRMED_NEGATIVE` | [S03][S04] |
| N-02 | Free 最多 10 个 App；Canvas/List/Workflow/自定义分区等显著受限 | `CONFIRMED_NEGATIVE` | [S02][S03][S-W01] |
| N-03 | Free Huddle 与 Slack Connect 只支持 1:1 | `CONFIRMED_NEGATIVE` | [S02][S27] |
| N-04 | Workspace 套餐整体升级，不能只为单个人升级 | `CONFIRMED_NEGATIVE` | [S62] |
| N-05 | Guests 不能使用 AI apps/agents | `CONFIRMED_NEGATIVE` | [S41] |
| N-06 | Huddle live captions 当前英文且不保存；不能当会后逐字稿 | `CONFIRMED_NEGATIVE` | [S27] |
| N-07 | 删除消息/频道/到期保留通常永久；legal hold 是合规保全例外，不是用户恢复 | `CONFIRMED_NEGATIVE` | [S32][S38][S40] |
| N-08 | Slackbot 自动任务最多每日运行 3 次；B+ 有每成员每周消息限 | `CONFIRMED_NEGATIVE` | [S54] |
| N-09 | Today 是 beta 且不再接受新参与者 | `CONFIRMED_NEGATIVE` | [S47A] |
| N-10 | 16 岁以下不可使用 Slack | `CONFIRMED_NEGATIVE` | [S59] |
| N-11 | 教育页未证明教育原生领域对象 | `NOT_PROVEN` | [S58][S-Q05] |
| N-12 | Message activity 是授权管理员的聚合分析，不是普通会话逐人已读回执 | `CONFIRMED_BOUNDARY` | [S74] |

### 8.2 `CONFLICT`

| ID | 冲突 | 本文处理 |
|---|---|---|
| C-01 | `paid-vs-free` 同页前段称 Free “最多 3 个工具”，后段称“10 个应用”；当前公开 pricing 主矩阵、Plans Help 与 Workspace 套餐矩阵均为 10 | 以多源当前矩阵记 10；保留该页面滞后/翻译冲突，不静默忽略 [S02][S62][S-W01] |
| C-02 | Slack Code Help 称有受支持 Agent 时 all plans；App/Agent Guide 及套餐矩阵对 AI assistant apps/无限 Apps 有付费边界 | Slack Code 记 `PARTIAL/PREVIEW`；Slack 本体计划可用性、Agent 安装许可和第三方收费拆开；实际 Workspace 验证 [S34][S41][S53] |
| C-03 | Workspace 顶部可见 Slackbot AI，但完整 Slackbot 套餐为 Business+ | 入口实测为“升级”或“基础版”；Free/Pro 记 limited preview/basic，不改写正式套餐 [S05][S54][S-W01] |
| C-04 | 旧 Business+/Enterprise Grid/Slack AI add-on 与当前同名/相邻套餐的 AI 权益不同 | 在事实中强制标 current/legacy/preview；2027-03-01 退役前需按 Workspace feature access 判定 [S60][S61] |

### 8.3 `UNKNOWN / NOT_PROVEN` 与待补证

| ID | 未知项 | 为什么仍未知 | 下一证据动作 |
|---|---|---|---|
| S-Q01 | 匿名 Workspace 的当前 plan/试用与 UI | **已补证**：Free 基础、Pro 试用、四列套餐与公开矩阵一致；无身份数据入文档 | 未来套餐迁移后再做同入口只读快照 [S-W01] |
| S-Q02 | 普通用户逐收件人 delivery/read receipt | 官方 Help 未找到明确存在或明确否定的契约；Message activity 不等价 | 需要 Slack 官方行为文档或受控双账号实机验证；当前保持 `NOT_PROVEN` |
| S-Q03 | 当前原生 composer rewrite 的精确入口/套餐/发布态 | AI Guide 当前证据不足 | 需要官方 Help 具体行为页或真实有权益 Workspace 验证 |
| S-Q04 | Huddle 原生完整录制/持久 transcript | 当前 Help 只证实时不保存 captions、AI notes、Clip | 需要官方录制行为文档；当前不外推 |
| S-Q05 | 教育原生课程/作业/成绩对象及 Enterprise+ 教育折扣 | 教育营销与折扣 Help 未证明 | 需要官方教育行为 Help/合同条款；当前 `NOT_PROVEN` |
| S-Q06 | GovSlack、数据地区与监管行业的功能一致性（Feature parity） | 本轮未按每个 B/A 原子项审计 GovSlack/地区差异 | 后续单独官方 GovSlack/region audit；不得从商用 Slack 外推 |
| S-Q07 | Slack Code/大模式 Slackbot/Activity/Agents & tools 在所有 Workspace 的 rollout 完成度 | 官方明确 gradual rollout/beta/preview 或 UI 动态 | 记录 Workspace 日期、plan、feature access，不用单次可见性外推全体 |
| S-Q08 | 第三方 Agent 的模型、数据保留、动作回滚、结果质量与价格 | 由各 Agent/App/外部服务决定 | 对入选 Agent 做独立供应商一手审计，不归入 Slack 原生 |

## 9. Review Gate

用户已于 2026-08-30 完成审阅，确认本文件可以作为 Slack 单品事实基线进入 `4.2B`。现存 `CONFLICT`、`NOT_PROVEN` 与 `S-Qxx` 继续作为证据边界保留，不阻塞能力桥接，也不得在桥接阶段被改写为确定事实。

| Gate | 结果 | 说明 |
|---|---|---|
| G1 Slack-only | `PASS` | 未研究 Teams/Discord |
| G2 一手来源 | `PASS` | 仅 Slack 官方 Help、产品/套餐、管理员/安全、`docs.slack.dev`、更新/退役、教育官方页及匿名 Workspace |
| G3 B01—B19 全覆盖 | `PASS` | 19/19 子域；171 个 B 原子功能行 |
| G4 A01—A14 全覆盖 | `PASS` | 14/14 子域；70 个 A 原子功能行；AI/Bot/Agent/App/Workflow/Platform 分型 |
| G5 套餐/发布态/限制 | `PASS_WITH_GAPS` | current/legacy/preview 分离；rollout/region/GovSlack 缺口已列 S-Q06/S-Q07 |
| G6 教育营销降级 | `PASS` | 营销页只记 `MARKETING_ONLY`；折扣与行为 Help 分开；教育原生能力 `NOT_PROVEN` |
| G7 负向/冲突/未知 | `PASS` | 12 个负向/边界事实、4 个 `CONFLICT`、8 个 Q 项 |
| G8 端到端流程 | `PASS` | 10 条链路，含断点、审批、恢复或生命周期 |
| G9 隐私 | `PASS` | Workspace、成员、频道、私信和消息内容全部匿名化/未记录 |
| G10 决策边界 | `PASS` | 未形成 ClassIn 优先级或 `LOCKED` 决策 |

计数口径：表格中匹配 `Bxx-xx` 的 171 行 + `Axx-xx` 的 70 行 = **241 个原子功能记录**。来源索引含 **75 个编号官方来源条目 + 9 个补充分支来源条目 + 1 个匿名 Workspace 可见证据条目**，共 85 个证据条目、99 个去重官方 URL（原证据集 89 个公开页面 + 1 个登录后 Slack plans 官方入口，本轮术语治理另增加 9 个简体中文官方页面）；个别条目为同一行为族的两张官方 Help 页面。所有 Web 来源访问日均为 2026-08-30，除非条目中标注发布日期/retirement 日期。

## 10. 官方一手来源索引

> 共同访问日：2026-08-30。链接中的语言版本可由 Slack 自动重定向；事实以访问当日页面正文为准。`S-W01` 是只读 Workspace UI/套餐页观察，不含用户或业务数据。

| ID | 官方来源 | 用途 |
|---|---|---|
| S01 | [Slack features](https://slack.com/intl/zh-cn/features) | 四支柱与产品定位；`MARKETING_ONLY` |
| S02 | [Slack plans and features](https://slack.com/help/articles/115003205446-Slack-plans-and-features)；[Pricing](https://slack.com/intl/zh-cn/pricing) | 当前 Free/Pro/Business+/Enterprise+ 主矩阵 |
| S03 | [Feature limitations on the free version of Slack](https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack)；[Usage limits for free workspaces](https://slack.com/help/articles/115002422943-Usage-limits-for-free-workspaces) | Free 历史、App、降级后行为 |
| S04 | [Customize data retention in Slack](https://slack.com/help/articles/203457187-Customize-data-retention-in-Slack) | 90 天/1 年、付费保留与删除 |
| S05 | [Guide to AI features in Slack](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack) | 原生 AI 能力、套餐与行为 |
| S06 | [Using Slack help category](https://slack.com/intl/zh-cn/help/categories/200111606) | 官方帮助信息架构 |
| S07 | [Sign in to Slack](https://slack.com/help/articles/212681477-Sign-in-to-Slack) | Workspace 进入/登录 |
| S08 | [What is a channel?](https://slack.com/help/articles/360017938993-What-is-a-channel) | public/private/#general/thread/template |
| S09 | [Slack Connect guide](https://slack.com/help/articles/115004151203-Slack-Connect-guide) | 外部组织频道/DM 与审批边界 |
| S10 | [Understand direct messages](https://slack.com/help/articles/212281468-Understand-direct-messages) | 1:1/group DM、入口与对象 |
| S11 | [Add people to a direct message](https://slack.com/help/articles/1500002969782-Add-people-to-a-direct-message) | 增员、历史选择、转 private channel |
| S12 | [Send and read messages](https://slack.com/help/articles/201457107-Send-and-read-messages) | composer、send/schedule/draft/read/action |
| S13 | [Get your work done from Activity](https://slack.com/help/articles/19693583638803-Get-your-work-done-from-Activity) | Activity 过滤、视图、inline action |
| S14 | [View all unread messages](https://slack.com/help/articles/226410907-View-all-unread-messages)；[Save messages and files for later](https://slack.com/help/articles/360042650274-Save-messages-and-files-for-later) | Unreads/Catch Up 与 Later |
| S15 | [Adjust your sidebar preferences](https://slack.com/help/articles/212596808-Adjust-your-sidebar-preferences) | Sidebar、导航、隐藏、清理 |
| S16 | [Organize your sidebar with custom sections](https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections) | Pro+ 私人分区 |
| S17 | [Share sidebar sections](https://slack.com/help/articles/29873996048019-Share-sidebar-sections) | 共享分区 |
| S18 | [Search in Slack](https://slack.com/help/articles/202528808-Search-in-Slack) | 搜索对象、修饰符、历史 |
| S19 | [Set your Slack status and availability](https://slack.com/help/articles/201864558-Set-your-Slack-status-and-availability) | 状态、Active/Away、自动状态 |
| S20 | [Hide a person in Slack](https://slack.com/help/articles/16905395872019-Hide-a-person-in-Slack) | 隐藏与通知边界 |
| S21 | [Star channels and direct messages](https://slack.com/help/articles/201331016-Star-channels-and-direct-messages) | Starred |
| S22 | [Use emoji and reactions](https://slack.com/help/articles/202931348-Use-emoji-and-reactions) | emoji/reaction |
| S23 | [Use mentions in Slack](https://slack.com/help/articles/205240127-Use-mentions-in-Slack) | 人、频道、用户组提及 |
| S24 | [Use a canvas in Slack](https://slack.com/help/articles/203950418-Use-a-canvas-in-Slack) | Canvas 内容、协作、删除恢复 |
| S25 | [Use lists in Slack](https://slack.com/help/articles/27452748828179-Use-lists-in-Slack) | List 字段、视图、任务、模板、导入导出 |
| S26 | [Set a reminder](https://slack.com/help/articles/208423427-Set-a-reminder) | 多对象提醒与 Guest 边界 |
| S27 | [Use huddles in Slack](https://slack.com/help/articles/4402059015315-Use-huddles-in-Slack) | 人数、音视频、共享、字幕、生命周期 |
| S28 | [Use AI to take huddle notes](https://slack.com/help/articles/28355100015907-Use-AI-to-take-huddle-notes) | Huddle AI notes |
| S29 | [Add files to Slack](https://slack.com/help/articles/201330736-Add-files-to-Slack) | 文件限制、扫描、预览、分享、删除 |
| S30 | [Record audio and video clips](https://slack.com/help/articles/4406235165587-Record-audio-and-video-clips) | Clips |
| S31 | [Accessibility in Slack](https://slack.com/help/articles/4455747966739-Accessibility-in-Slack) | 键盘、读屏、视觉偏好、字幕/转录/alt |
| S32 | [Edit or delete messages](https://slack.com/help/articles/202395258-Edit-or-delete-messages) | edit/delete/15 秒 unsend |
| S33 | [Forward messages in Slack](https://slack.com/help/articles/203274767-Forward-messages-in-Slack) | 转发与链接 |
| S34 | [Guide to apps in Slack](https://slack.com/help/articles/360001537467-Guide-to-apps-in-Slack)；[Apps and integrations category](https://slack.com/help/categories/360000047926) | App 发现、安装、surface、外部依赖 |
| S35 | [Understand app permissions](https://slack.com/help/articles/115003461503-Understand-app-permissions) | scopes、user/app/bot/agent 权限 |
| S36 | [Guide to Workflow Builder](https://slack.com/help/articles/360035692513-Guide-to-Workflow-Builder)；[Build a workflow](https://slack.com/help/articles/17542172840595-Build-a-workflow) | trigger/step/form/publish |
| S37 | [Use shortcuts to take actions](https://slack.com/help/articles/360057554553-Use-shortcuts-to-take-actions) | shortcut、slash command、Connect 边界 |
| S38 | [Archive or delete a channel](https://slack.com/help/articles/213185307-Archive-or-delete-a-channel) | archive/unarchive/delete 与 membership |
| S39 | [Use channel management tools](https://slack.com/help/articles/360047512554-Use-channel-management-tools) | 管理动作、计划、私密内容边界 |
| S40 | [Create and manage legal holds](https://slack.com/help/articles/4401830811795-Create-and-manage-legal-holds) | 合规保全、删除覆盖与范围例外 |
| S41 | [Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | Agents & tools、DM/分屏/频道、Guests、审批 |
| S42 | [How to work with Slackbot](https://slack.com/intl/en-gb/help/articles/202026038-How-to-work-with-Slackbot) | 私人 Agent、步骤/Stop、任务、文件、history、确认 |
| S43 | [Configure Slack notifications](https://slack.com/help/articles/201355156-Configure-Slack-notifications) | 通知级别、例外、关键词、设备 |
| S44 | [Guide to Slack notifications](https://slack.com/help/articles/360025446073-Guide-to-Slack-notifications) | 横幅、badge、mobile、email 与邮件回复 |
| S45 | [Set your out-of-office status](https://slack.com/help/articles/20584016893843-Set-your-out-of-office-status) | 休假状态、提及提示、日历同步 |
| S46 | [Security for AI features in Slack](https://slack.com/help/articles/28310650165907-Security-for-AI-features-in-Slack) | 权限交集、引用、ephemeral、LLM 数据边界 |
| S47 | [Manage Slack AI settings](https://slack.com/help/articles/28244420881555-Manage-Slack-AI-settings) | 人群级启停、Enterprise 管理、价格边界 |
| S48 | [Add a branch to a workflow](https://slack.com/help/articles/42799802523283-Add-a-branch-to-a-workflow) | Workflow branching |
| S49 | [Set up and manage Slack enterprise search](https://slack.com/help/articles/39044407124755-Set-up-and-manage-Slack-enterprise-search) | Enterprise+ 源、权限、管理员配置 |
| S50 | [AI in Slack — developer docs](https://docs.slack.dev/ai/) | Agent/AI 开发平台 |
| S51 | [Slack platform documentation](https://docs.slack.dev/) | API、Events、Webhooks 与平台边界 |
| S52 | [Enterprise search — developer docs](https://docs.slack.dev/enterprise-search/) | 自定义 connector 与分发边界 |
| S53 | [Build with AI as a team using Slack Code](https://slack.com/help/articles/54310833022355-Build-with-AI-as-a-team-using-Slack-Code) | 临时代码频道、state、artifact、review、stop、rollout |
| S54 | [Slackbot limits and credit usage](https://slack.com/help/articles/53579676130195-Slackbot-limits-and-credit-usage) | preview、B+ 周限、Flex Credits、任务频率 |
| S55 | [Permissions by role in Slack](https://slack.com/help/articles/201314026-Permissions-by-role-in-Slack) | Owner/Admin/Member/Guest 权限 |
| S56 | [Manage permissions for message editing and deletion](https://slack.com/help/articles/115004868646-Manage-permissions-for-message-editing-and-deletion) | 管理员消息策略 |
| S57 | [Understand guest roles in Slack](https://slack.com/help/articles/202518103-Understand-guest-roles-in-Slack) | single-/multi-channel guest |
| S58 | [Slack for distance learning](https://slack.com/intl/zh-cn/solutions/distance-learning) | 教育场景定位；`MARKETING_ONLY` |
| S59 | [Apply for the Slack for Education discount](https://slack.com/help/articles/206646877-Apply-for-the-Slack-for-Education-discount) | 85% 折扣、资格、申请者、16 岁边界 |
| S60 | [Updates to feature availability and pricing for Slack plans](https://slack.com/help/articles/39264531104275-Updates-to-feature-availability-and-pricing-for-Slack-plans) | 2025-06 AI 套餐变更与 legacy 迁移 |
| S61 | [Slack feature and plan retirements](https://slack.com/help/articles/4426294050451-Slack-feature-and-plan-retirements) | legacy plans/add-on 于 2027-03-01 退役 |
| S62 | [Paid vs free Slack](https://slack.com/intl/zh-cn/pricing/paid-vs-free) | 整体 Workspace 升级、历史恢复及 3/10 App 冲突 |
| S63 | [Introducing the new Activity view](https://slack.com/help/articles/46751260742035-Introducing-the-new-Activity-view) | 2026-01 渐进 rollout |
| S64 | [Manage your Mark as Read preference](https://slack.com/help/articles/360043037853-Manage-your-Mark-as-Read-preference) | 个人 read/unread 行为 |
| S65 | [Manage access permissions for canvases and lists](https://slack.com/help/articles/15678967614611-Manage-access-permissions-for-canvases-and-lists) | view/edit/request access |
| S66 | [View workflow activity logs](https://slack.com/help/articles/360055655493-View-workflow-activity-logs) | Workflow 运行诊断 |
| S67 | [Slack security](https://slack.com/trust/security) | 安全基线；高层事实，不外推 E2EE |
| S68 | [Review your workspace settings](https://slack.com/help/articles/360000355143-Review-your-workspace-settings) | 成员可见 retention/export/owner/TOS 透明度 |
| S69 | [Troubleshoot connection issues](https://slack.com/help/articles/205138367-Troubleshoot-connection-issues) | 连接错误状态与本地恢复 |
| S70 | [Manage Slack connection issues](https://slack.com/help/articles/360001603387-Manage-Slack-connection-issues) | WebSocket 443 与网络管理员边界 |
| S71 | [Deactivate a member's account](https://slack.com/help/articles/204475027-Deactivate-a-member-s-account) | 停用/重启、登出与内容保留 |
| S72 | [System requirements for using Slack](https://slack.com/help/articles/115002037526-System-requirements-for-using-Slack) | OS/browser/mobile 与更新周期 |
| S73 | [Change how messages are displayed](https://slack.com/help/articles/213893898-Change-how-messages-are-displayed) | Typing indicator 与消息显示偏好 |
| S74 | [Manage message activity](https://slack.com/help/articles/4403584815507-Manage-message-activity) | 管理员聚合 view/reaction/click/share/device 分析，不是 read receipt |
| S75 | [Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes) | 2026 Slackbot、Skills、Slack Code、Agents & tools、Today 更新 |

### 10.1 补充分支来源（同属上述官方证据集）

| ID | 官方来源 | 用途 |
|---|---|---|
| S43A | [Build your Slackbot memory](https://slack.com/help/articles/52916888307091-Build-your-Slackbot-memory) | 周记忆、导入、查看/编辑/删除/关闭 |
| S44A | [Guide to the Slack MCP server](https://slack.com/help/articles/48855576908307-Guide-to-the-Slack-MCP-server) | Slack MCP server 与 Slackbot client 两个方向 |
| S45A | [Use Slackbot to work with other apps](https://slack.com/help/articles/52462803708819-Use-Slackbot-to-work-with-other-apps-from-Slack) | 工具连接、账户、审批、Always allow/Blocked |
| S46A | [Create interactive surfaces with Slackbot](https://slack.com/help/articles/53908463892755-Create-interactive-surfaces-with-Slackbot) | dashboard/report artifact、分享与 coming soon 边界 |
| S47A | [Start your day with Today](https://slack.com/help/articles/51262305668371-Start-your-day-with-Today) | Today beta、停止接收新参与者 |
| S48A | [Use AI to build Slack workflows](https://slack.com/help/articles/32843655109395-Use-AI-to-build-Slack-workflows) | 生成 Workflow、AI steps 与当前限制 |
| S55A | [Browse, share and create Slackbot skills](https://slack.com/help/articles/51448833927187-Browse-share-and-create-Slackbot-skills) | skill catalog、创建、分享、skill set |
| S56A | [Use Agentforce in Slack](https://slack.com/help/articles/36218786859667-Use-Agentforce-in-Slack) | 第三方 Agentforce 用户行为 |
| S57A | [Set up and manage Agentforce in Slack](https://slack.com/help/articles/36218109305875-Set-up-and-manage-Agentforce-in-Slack) | Salesforce 许可、账户映射与管理员设置 |

### 10.2 Workspace 与缺证记录

| ID | 证据 | 用途/边界 |
|---|---|---|
| S-W01 | [Slack plans 登录入口](https://app.slack.com/plans) 与匿名化登录 Workspace 只读观察（具体 Workspace 路径未记录） | 2026-08-30 已验证：Free 基础、Pro 试用、四列矩阵；顶层/侧栏/频道/composer/Agents & tools/Slackbot basic or upgrade UI。Workspace 标识、账号、成员、频道、消息内容均未记录 |
| S-Q02 | 本轮 Slack 官方 Help/产品/管理员文档的 receipt 检索记录 | 未取得普通用户逐人 delivery/read receipt 的明确正/负契约；保持 `NOT_PROVEN` |
| S-Q03 | 当前 AI Guide/帮助目录的 composer rewrite 检索记录 | 未取得精确当前入口、套餐与发布态；保持 `NOT_PROVEN` |
| S-Q04 | Huddle/Clips/AI notes 官方行为页交叉检索 | 未取得 Huddle 完整录制和持久逐字稿契约；保持 `NOT_PROVEN` |
| S-Q05 | 教育方案页、教育折扣 Help 与通用行为 Help 交叉检索 | 未取得教育原生领域对象或 Enterprise+ 85% 折扣证据；保持 `NOT_PROVEN` |

## 11. 审阅提示

本文件是 Slack 事实快照，不是对 ClassIn 的需求优先级。后续若进入竞品比较或产品决策，应先把 `CONFLICT` 与 `S-Qxx` 保持为显式状态，再按统一对象、角色、入口、结果、权限和生命周期进行横向映射；不能把 Slack 的营销命名、第三方 App 能力或预览入口直接改写为 ClassIn 需求。
