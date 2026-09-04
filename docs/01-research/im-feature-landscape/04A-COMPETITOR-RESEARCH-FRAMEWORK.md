---
title: IM 竞品研究框架、功能分类与审计模板
status: PHASE_4_1_COMPLETE
version: v0.3
date: 2026-08-30
research_program: ClassIn IM 功能全景与竞品研究 / Phase 4.1
---

# IM 竞品研究框架、功能分类与审计模板

## 1. 4.1 目标

本阶段先建立一套不依赖 ClassIn 当前页面和缺口的行业研究框架，再进入具体产品盘点。框架同时约束：

1. 什么算基础 IM Feature，怎样拆成可比较的原子能力；
2. AI 助手、传统 Bot、自动化和 Agent 如何分开记录；
3. Slack、Microsoft Teams、Discord 使用什么统一字段审计；
4. 套餐、角色、平台、区域、发布状态和历史版本怎样表达；
5. 什么证据可以支持“有”“受限”“预览”“历史存在”或“明确不支持”；
6. 如何从竞品事实回到 ClassIn 线上、Demo 和升级候选，而不把研究结论自动写成需求。

4.1 不产出“哪家更强”或 ClassIn 升级优先级，也不提前写具体竞品 Feature 结论。官方一手资料入口独立登记在[竞品官方一手来源地图](./04A-COMPETITOR-PRIMARY-SOURCE-MAP.md)。

### 1.1 框架自适应协议

本框架是研究起点，不是强迫竞品事实适配的封闭分类。逐产品审计发现以下情况时必须纠正框架，而不是删减或扭曲事实：

- 竞品存在当前 Taxonomy 未覆盖、但对用户可感知的重要能力；
- 同一一级域混入了不同对象、权限或价值模型，导致比较失真；
- 竞品自身对象模型与预设分类不兼容；
- 原有问题对该产品不适用，继续展开会偏离 IM 研究目的；
- 新证据改变了支持状态、套餐边界、发布状态或历史判断。

小范围子域、标签和字段修正可以直接更新，但须在逐产品文档记录 `Framework delta`、原因、影响 Feature 和日期；涉及竞品范围、比较标准或结论强度的改变，先登记 `【待你确认】` 并与用户校准。任何框架调整都不能降低一手证据要求或把 `UNKNOWN` 改写成事实。

## 2. 研究范围

### 2.1 核心竞品

| 产品 | 本轮定位 | 4.2 后的审计要求 |
| --- | --- | --- |
| Slack | 团队消息与协作产品 | 完整基础 IM + 原生 AI + Agent/App/Workflow 能力 |
| Microsoft Teams | 组织通信、频道、会议与 Microsoft 365 协作产品 | 完整基础 IM + 会议/文件连接 + Copilot/Agent 能力 |
| Discord | 社区、频道、实时语音与 App 生态产品 | 完整基础 IM + 社区治理 + Bot/App/AI 边界 |

三款核心竞品必须使用同一 Taxonomy 完整扫描，不只围绕第三阶段 P0 五域取样。

**当前执行优先级（2026-08-30 用户确认）**：Slack 单品深度审计已经通过用户 Review Gate，当前进入 `4.2B` Slack × ClassIn Online × Demo 能力桥接。Microsoft Teams 与 Discord 保留在研究计划中，但按用户最新决定暂不启动；不因 Slack Gate 已通过而自动恢复，也不并行生成浅层结论。

### 2.2 内部比较锚点

| 锚点 | 用途 | 事实来源 |
| --- | --- | --- |
| ClassIn 线上 IM | 当前生产形态基线 | [线上 104 项 Feature 全集](./02-ONLINE-CLASSIN-IM-FEATURE-INVENTORY.md) |
| ClassIn PC Demo | 当前可运行设计与实现基线 | [Demo 86 项 Feature 清单](./01-DEMO-IM-FEATURE-INVENTORY.md) |
| Demo × 线上差异 | 已知缺口、增量与冲突 | [第三阶段差异分析](./03-DEMO-VS-ONLINE-IM-GAP-ANALYSIS.md) |

竞品 Taxonomy 先独立建立，再映射到以上锚点；禁止直接把线上 104 项当成行业能力全集。

### 2.3 条件性补充样本

Google Chat、Zoom Team Chat、飞书/Lark 等不自动进入核心逐项矩阵。只有出现以下情况时才增加补充产品：

- 核心三款无法覆盖某个对 ClassIn 重要的能力模型；
- 需要验证某项能力是否已经成为行业共性；
- 需要会议、教育、跨组织或亚洲协作场景的专门参照；
- 用户明确扩大竞品范围。

补充样本只回答被触发的问题，不与核心三款混成同等深度的“全量盘点”。

### 2.4 纳入与不纳入

纳入：

- 当前公开可用、受套餐/角色/平台限制或处于官方预览的终端用户能力；
- 管理员可以配置、治理或审计的 IM 能力；
- 官方开发平台明确提供、且能改变 IM 终端体验的 Bot/App/Workflow/Agent 能力；
- AI 总结、搜索、写作、会议辅助、公共 Agent、私密 Agent 和执行动作；
- 与消息强连接的文件、会议、任务、知识和第三方业务对象。

不纳入：

- 与 IM 无稳定入口、对象、消息或状态回写关系的完整外围产品；
- 只有二手报道、社区猜测或未经官方材料证实的能力；
- 未公开的内部架构、模型、数据协议和商业规划；
- 对所有合规认证、加密实现和 API 字段做穷举式技术审计；本轮只记录会影响产品能力和治理边界的部分；
- 把历史实验、Preview 或开发者接口自动记成当前普遍可用的用户 Feature。

## 3. 研究问题

每个竞品都必须回答以下问题：

1. 用户从哪里进入消息域，如何在组织、空间和会话之间切换？
2. 产品有哪些身份、关系、会话和内容对象？
3. 消息如何创建、发送、阅读、组织、查找和再次处理？
4. 文件、会议、任务、知识和应用怎样进入消息并回写状态？
5. 普通成员、管理员、访客、外部用户和 Bot/Agent 的权限如何不同？
6. 功能受到什么套餐、平台、区域、组织策略和发布状态限制？
7. AI 默认是私密辅助、公开参与者、会议促进者还是行动执行者？
8. AI 读取什么上下文、输出对谁可见、何时需要审批、怎样暂停/撤销/接管？
9. 产品提供哪些失败、恢复、历史、审计和人工治理机制？
10. 对 ClassIn 而言，该能力是基础继承参照、行业增强、教学适配机会、AI 候选还是不适用？

## 4. 基础 IM Feature Taxonomy

Taxonomy 使用稳定一级 ID。逐产品盘点时在一级域下创建原子 Feature ID，例如 `B03-THREAD-01`；同一能力在多个页面重复出现时只记一项，通过渠道、角色和平台字段表达差异。

| 一级 ID | 能力域 | 必查对象与问题 |
| --- | --- | --- |
| `B01` | 入口、Shell 与工作区 | 全局入口、上下文入口、首页摘要、深链、窗口/浮层/沉浸模式、多工作区切换 |
| `B02` | 身份、关系与通讯录 | 账号身份、联系人、好友、组织树、成员资料、备注、外部用户、访客、关系生命周期 |
| `B03` | 空间与会话模型 | Workspace/Team/Server、DM、Group DM、Group/Channel、Thread、Forum/Post、临时会话、归档 |
| `B04` | 会话导航与状态 | 列表分类、排序、预览、未读、置顶、收藏、隐藏、归档、草稿、URL/状态恢复 |
| `B05` | 对象发现与会话创建 | 全局搜索、联系人/组织/空间搜索、创建私聊/群/频道、加入/邀请、二维码/链接/口令 |
| `B06` | Composer 与消息创建 | 文本、富文本、Markdown、Emoji、贴纸、Mention、Slash Command、附件、语音、视频、截图、定时发送 |
| `B07` | 消息格式与内容对象 | 文本气泡、图片、视频、音频、文件、链接预览、名片、代码、表格、卡片、业务对象、状态卡 |
| `B08` | 单条消息协作与治理 | 回复、引用、Thread、Reaction、编辑、删除、撤回、转发、复制、收藏、Pin、标记未读、举报 |
| `B09` | 阅读、历史与搜索 | 日期轴、新消息边界、历史分页、锚点、会话内/全局搜索、筛选、跳转、导出、保留 |
| `B10` | 通知、提醒与注意力 | 数字/点、@我的、关键词提醒、桌面/移动/邮件通知、免打扰、通知级别、摘要、稍后提醒 |
| `B11` | 文件、知识与共同编辑 | 本地/云盘文件、文件聚合、搜索、预览、下载、权限、版本、共同编辑、知识页/Canvas/Wiki |
| `B12` | 实时语音、视频与会议 | 语音频道、通话、Huddle/Meeting、屏幕共享、录制、转写、会议 Chat、会议前后消息连续性 |
| `B13` | 结构化动作与业务连接 | 任务、投票、表单、日程、活动、课堂、审批、工作流、外部对象卡、动作状态回写 |
| `B14` | App、Bot 与自动化平台 | App 安装、Bot 身份、命令、交互组件、Webhook、Workflow、权限 Scope、应用市场、移除与停用 |
| `B15` | 角色、权限与社区治理 | Owner/Admin/Member/Guest、发言/上传/邀请权限、审核、禁言、踢出、封禁、举报、内容规则 |
| `B16` | 管理、安全与合规控制 | 组织策略、数据保留、导出/eDiscovery、审计、外部协作、敏感内容、加密/密钥等产品级控制 |
| `B17` | 生命周期、可靠性与恢复 | 发送中/失败/重试、离线、过期、删除账号、退出/移出、空间关闭、权限变化、幂等与恢复 |
| `B18` | 平台、可访问性与国际化 | PC/Web/移动差异、键盘、读屏、Reduced Motion、响应式、语言、翻译、时区和通知系统连接 |
| `B19` | Presence、送达与实时会话状态 | 在线/离开/忙碌/自定义状态、输入中、发送/送达/已读回执、已读成员、实时参与者和状态可见范围 |

### 4.1 原子 Feature 拆分规则

- “发送文件”至少拆成入口、选择器、上传/发送、消息卡、查看/下载、权限/失效六类能力；
- “搜索”按搜索对象和结果动作拆分，不把消息全文搜索、联系人发现和频道发现混为一项；
- “Thread”区分创建/回复、导航、未读/通知、权限、关闭/归档；
- “会议”只登记与 IM 的入口、Chat 连续性、内容回写和治理，不盘点完整音视频引擎；
- “支持 Bot”不等于“支持 AI Agent”；传统自动回复、命令执行和生成式/自主 Agent 分开；
- 相同用户目标但承载模型不同，保留为同一能力家族并记录 `DIFFERENT_MODEL`，不强行拆成优劣。

## 5. AI、Bot、自动化与 Agent Taxonomy

AI 轨与基础 IM 独立统计，但每项 AI 能力必须指向它所依赖的基础 IM 对象、权限和动作。

### 5.1 能力域

| 一级 ID | AI/Agent 能力域 | 必查对象与问题 |
| --- | --- | --- |
| `A01` | 私密总结与 Catch-up | 会话/频道/Thread/会议总结、时间范围、未读摘要、仅个人可见还是可分享 |
| `A02` | AI 搜索与问答 | 自然语言搜索、答案引用、权限继承、跨会话/文件/会议范围、结果分享 |
| `A03` | 写作、改写与翻译 | 回复草稿、语气/长度、纠错、翻译、插入 Composer、自动发送边界 |
| `A04` | 会议与实时促进 | 转写、笔记、议程、决策、行动项、实时问答、主持人开启/关闭、会后资产 |
| `A05` | 公开 Agent/Bot 参与 | 添加成员、`@Agent`、命令、公开身份、Ephemeral/公共回答、移除、抢话控制 |
| `A06` | 私密 Agent 会话 | 1:1 Agent、Sidecar、Agent 目录、会话历史、普通输入触发、人与 Agent 隔离 |
| `A07` | 上下文、知识与权限 | 可读取对象、最小权限、用户权限交集、来源引用、外部知识、记忆与保留 |
| `A08` | Action、工具与工作流 | 任务/日程/文件/外部系统动作、工具调用、自动化触发、跨应用执行 |
| `A09` | Artifact 与结构化结果 | 文档、表格、任务、卡片、方案、代码等结果，版本、预览、编辑、分享和回写 |
| `A10` | 主动信号与建议 | 风险/趋势/待办发现、主动提醒、推荐下一步、频控、静默分析和用户控制 |
| `A11` | 人工审批、接管与责任 | 预览、Approve/Reject、教师/管理员 Owner、暂停、撤销、完全接管、恢复边界 |
| `A12` | Agent 状态与恢复 | 理解/执行/等待/失败/完成、重试、取消、Session、Receipt、历史和评价反馈 |
| `A13` | AI 管理与安全治理 | 管理员开关、套餐许可、数据使用、模型/供应商、审计、敏感信息、外部参与者 |
| `A14` | 自定义 Agent 与开发平台 | Agent Builder、App/Agent API、Scope、知识接入、市场、部署、版本和组织审批 |

### 5.2 AI 形态标签

| 标签 | 定义 | 不应混淆为 |
| --- | --- | --- |
| `AI_ASSIST` | 为当前用户私密生成总结、搜索结果、草稿或建议 | 公开群成员 |
| `AI_PARTICIPANT` | 以可识别身份进入公共/多人会话并输出 | 系统通知或普通 Bot |
| `AI_AGENT` | 获得显式任务、上下文与工具，可持续执行并投影状态 | 单轮生成式回复 |
| `BOT_COMMAND` | 按命令、事件或规则执行确定性/半确定性动作 | 原生生成式 AI |
| `WORKFLOW_AUTOMATION` | 由触发器、条件和动作组成的流程 | 自主 Agent |
| `AI_GOVERNANCE` | 管理、权限、审计、数据和人工控制能力 | 面向用户的 AI 输出功能 |

### 5.3 AI 每项必填八要素

1. `Identity`：谁在说话/执行；
2. `Trigger`：用户点击、输入、`@`、命令、事件还是系统主动；
3. `Visibility`：个人、发起者、参与者、频道、组织或外部用户；
4. `Context`：读取什么、继承谁的权限、是否引用来源；
5. `Output/Action`：回答、草稿、Artifact、任务还是业务副作用；
6. `Human Control`：预览、批准、拒绝、修改、暂停、取消、撤销或接管；
7. `State/Receipt`：运行状态、失败恢复、完成证据和审计；
8. `Administration`：许可、套餐、组织策略、数据治理和移除。

任何缺少以上信息的 AI 结论，只能按已证明部分登记，不能从“有 AI”推断完整 Agent 能力。

## 6. 事实状态与限制字段

### 6.1 产品支持状态

| 字段值 | 含义 |
| --- | --- |
| `FULL` | 官方材料证明主要用户链路完整存在 |
| `PARTIAL` | 只证明部分链路、渠道、角色或结果 |
| `NOT_AVAILABLE` | 官方明确说明不提供、不支持或已移除 |
| `NOT_PROVEN` | 本轮未找到足够证据；不等同于“不支持” |
| `NOT_APPLICABLE` | 该能力与产品对象模型确实不适用，并说明原因 |

### 6.2 发布状态

| 字段值 | 含义 |
| --- | --- |
| `GA` | 官方文档表达为当前正式能力，未标预览/测试 |
| `PREVIEW` | Public Preview、Developer Preview、Early Access 等官方预览 |
| `BETA_OR_EXPERIMENT` | Beta、实验、有限测试或小范围试用 |
| `COMING_SOON` | 官方明确宣布但尚未普遍提供 |
| `HISTORICAL` | 官方历史能力/实验，不能计入当前产品覆盖 |
| `UNKNOWN_RELEASE_STATE` | 官方页面未清楚说明当前发布状态 |

### 6.3 限制字段

支持状态之外必须分别填写：

- `Plan`：免费、付费、企业版、AI Add-on 或未说明；
- `Role`：Owner/Admin/Member/Guest/External/App 等；
- `Channel/Object`：DM、Group DM、Channel、Thread、Forum、Meeting 等；
- `Platform`：Desktop/Web/iOS/Android 或未说明；
- `Region/Tenant`：区域、组织策略、教育/企业租户等；
- `Admin Policy`：默认开放、管理员可开关、安装审批、权限 Scope 等。

不得用一个含糊的 `LIMITED` 同时替代套餐、角色、平台和发布状态。

## 7. 证据协议

### 7.1 一手来源优先级

按具体 Claim 选择拥有该事实的官方来源：

1. 官方终端用户帮助/支持文档：证明用户可见行为和操作链；
2. 官方管理员、安全或合规文档：证明组织策略、权限和治理；
3. 官方开发者文档/API/Scope：证明 App/Bot/Workflow/Agent 平台能力；
4. 官方 Release Notes/公告：证明发布时间、Preview、变更和移除；
5. 官方套餐/定价/许可说明：证明商业可用范围；
6. 官方产品/营销页：只能证明其明确展示的表面与定位，不能推断未说明的完整链路。

不同来源不是简单高低关系；终端行为、管理员策略、开发平台和套餐限制应分别引用其事实所有者。

### 7.2 证据强度

| 标签 | 使用条件 |
| --- | --- |
| `MULTI_SOURCE_VERIFIED` | 至少两类官方来源共同证明行为与边界 |
| `OFFICIAL_VERIFIED` | 单一官方来源足以证明当前 Claim |
| `OFFICIAL_LIMITED` | 官方证明存在，但只覆盖部分链路或明确受限 |
| `OFFICIAL_PREVIEW` | 官方证明且明确为 Preview/Beta/实验 |
| `OFFICIAL_HISTORICAL` | 只证明历史存在或已移除 |
| `MARKETING_ONLY` | 只有官方营销描述，缺操作/规则证据 |
| `VISIBLE_ONLY` | 官方截图或 UI 可见，但动作结果未证明 |
| `UNKNOWN` | 当前一手资料不足 |
| `CONFLICT` | 官方来源在当前版本、范围或描述上直接矛盾 |

### 7.3 负向事实规则

- 只有官方明确写明“不支持、不可用、已停止、仅限……”时，才使用 `NOT_AVAILABLE` 或确定性负向事实；
- 搜索未找到、页面未出现或一张截图缺少控件，只能写 `NOT_PROVEN`；
- 若旧公告说有、当前帮助中心未出现，先标 `CONFLICT` 或 `HISTORICAL`，不得自行判断当前仍可用；
- 产品对象模型不同导致“不适用”时，使用 `NOT_APPLICABLE` 并说明替代模型；
- 对 ClassIn 的差距结论必须引用竞品事实 ID，不能直接从营销口号生成候选。

### 7.4 引用要求

每个原子 Feature 至少包含：

- 直接支持 Claim 的官方页面链接；
- 页面标题和来源产品；
- 本轮访问日期；
- 页面标注的发布日期/更新时间（若存在）；
- 支持状态、发布状态和限制；
- 只做事实摘录与短句转述，不复制长段官方文案。

## 8. 统一记录模型

### 8.1 原子 Feature 主表字段

| 字段 | 必填 | 说明 |
| --- | ---: | --- |
| `Feature ID` | 是 | 稳定 ID，产品间共用同一能力 ID |
| `Domain` | 是 | `B01—B19` 或 `A01—A14` |
| `Feature` | 是 | 原子能力名称 |
| `User value` | 是 | 用户为什么需要它 |
| `Object/Channel` | 是 | 作用在哪类空间、会话或消息对象 |
| `Role` | 是 | 谁可查看、触发、管理 |
| `Entry/Trigger` | 是 | 从哪里、如何触发 |
| `Result/State` | 是 | 可见结果和状态变化 |
| `Support state` | 是 | `FULL/PARTIAL/NOT_AVAILABLE/NOT_PROVEN/NOT_APPLICABLE` |
| `Release state` | 是 | `GA/PREVIEW/...` |
| `Plan/Platform/Region` | 是 | 分字段记录限制；未知也要显式写明 |
| `Evidence` | 是 | 官方一手来源与访问日期 |
| `Evidence strength` | 是 | 第 7.2 节标签 |
| `Boundary` | 是 | 不能由当前证据证明什么 |

### 8.2 AI Feature 扩展字段

AI 表在主表基础上追加：`AI form`、`Identity`、`Visibility`、`Context scope`、`Permission intersection`、`Action`、`Human control`、`Run state/Receipt`、`Admin governance`。

### 8.3 ClassIn 回映射字段

只有完成竞品事实盘点后才填写：

- `ClassIn Online`：`FULL/PARTIAL/NOT_PROVEN/NOT_AVAILABLE/DIFFERENT_MODEL`；
- `ClassIn Demo`：沿用第三阶段 `MATCHED/PARTIAL/DIFFERENT_MODEL/NOT_IMPLEMENTED/CONFLICT`；
- `Candidate type`：`BASELINE_INHERITANCE / INDUSTRY_PARITY / EDUCATION_ADAPTATION / AI_EXTENSION / DO_NOT_ADOPT / NEEDS_VALIDATION`；
- `Recommendation`：只允许 `RECOMMENDATION`，不写 `LOCKED`；
- `Dependency/Risk`：身份关系、文件、消息协议、权限、治理、AI Runtime 等依赖。

## 9. 逐产品审计模板

每个核心竞品形成独立文档，统一结构：

```text
1. 产品与证据范围
2. 对象模型与入口图
3. 基础 IM Feature 全集（B01—B19）
4. AI/Bot/Agent Feature 全集（A01—A14）
5. 套餐、角色、平台与发布状态限制
6. 已确认负向事实
7. 关键端到端流程
8. 对 ClassIn 的可比与不可比边界
9. 待补证据登记
10. 覆盖与质量 Gate
```

基础 IM 表模板：

| Feature ID | Feature | Object/Channel | Role | Entry/Trigger | Result/State | Support | Release | Limits | Evidence | Boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Bxx-...` |  |  |  |  |  |  |  |  |  |  |

AI 表模板：

| Feature ID | AI form | Identity | Trigger | Visibility | Context | Output/Action | Human control | State/Receipt | Governance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Axx-...` |  |  |  |  |  |  |  |  |  |  |

## 10. 全局矩阵与候选池模板

### 10.1 基础 IM 全集矩阵

| Feature ID | Feature | Slack | Teams | Discord | ClassIn Online | ClassIn Demo | Evidence quality | Key difference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Bxx-...` |  |  |  |  |  |  |  |  |

单元格只写支持状态；发布、套餐、角色和平台限制保存在产品明细表，必要时用脚注引用，避免把多个维度压成一个词。

### 10.2 AI/Agent 矩阵

| Feature ID | AI capability | Slack | Teams | Discord | ClassIn Online | ClassIn Demo | Identity/Visibility | Human control | Governance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Axx-...` |  |  |  |  |  |  |  |  |  |

### 10.3 升级候选池

| Candidate ID | 来源 Feature | 候选类型 | 用户/教学价值 | 当前 ClassIn 差距 | 依赖 | 风险 | 建议 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CAND-...` |  |  |  |  |  |  | `RECOMMENDATION` |  |

## 11. 执行顺序

1. `4.1`：研究框架、Taxonomy、证据协议和来源地图；
2. `4.2`：Slack 完整审计并通过单品 Review Gate；
3. `4.2B`：Slack × ClassIn Online × Demo 能力桥接、差距主题与候选长名单；
4. `4.3`：Microsoft Teams 完整审计（`PAUSED_BY_USER`；须经用户再次确认才启动）；
5. `4.4`：Discord 完整审计（`PAUSED_BY_USER`；须经用户再次确认才启动）；
6. `4.5`：跨产品基础 IM 全集矩阵（依赖 4.3/4.4，当前暂停）；
7. `4.6`：跨产品 AI/Agent 矩阵（依赖 4.3/4.4，当前暂停）；
8. `4.7`：ClassIn 升级候选池、适配判断和阶段共识；可先吸收 4.2B 的 Slack 候选长名单，但不得在缺少用户校准时锁定优先级。

逐产品审计可以并行收集资料，但必须先独立完成事实表，再做横向排名，避免“先有结论、再找证据”。每个产品完成后设置一次小型审阅 Gate；全局候选池完成前再做一次总校准。

## 12. 4.1 质量 Gate

- [x] 核心竞品、内部锚点与条件性补充样本已分层；
- [x] 基础 IM `B01—B19` Taxonomy 已覆盖入口、关系、会话、消息、文件、会议、治理、可靠性、平台体验和实时状态；
- [x] AI/Agent `A01—A14` Taxonomy 已与 Bot/Workflow 分开；
- [x] 产品支持、发布状态、套餐/角色/平台限制已拆成独立字段；
- [x] 一手来源优先级、负向事实和引用规则已定义；
- [x] 逐产品表、全局矩阵和候选池模板已建立；
- [x] Slack、Teams、Discord 官方一手来源地图完成并通过链接/范围检查；
- [x] 用户已于 2026-08-30 审阅并确认 4.1 框架，状态更新为 `PHASE_4_1_COMPLETE`。

## 13. 待你审阅的框架口径

| ID | 优先级 | 标记 | 需要确认的口径 | 当前建议 |
| --- | --- | --- | --- | --- |
| `F-Q01` | P0 | `【已确认】` | 是否把三款核心竞品的付费、企业版和 AI Add-on 能力也纳入全集 | 全部纳入，但严格单列套餐与许可限制 |
| `F-Q02` | P0 | `【已确认】` | 是否把会议、语音、共同编辑等与消息强关联的能力纳入基础 IM | 纳入 IM 入口、Chat 连续性和状态回写，不盘点完整外围引擎 |
| `F-Q03` | P0 | `【已确认】` | Bot/App/Workflow 是否与 AI Agent 一起研究 | 一起研究但分标签、分能力域，不能把传统自动化算成 AI |
| `F-Q04` | P1 | `【已确认】` | 管理、安全与合规研究到什么深度 | 记录影响产品能力、角色和治理的控制，不做认证/API 字段穷举 |
| `F-Q05` | P1 | `【已确认并再次调整顺序】` | 是否在核心三款完成前加入更多竞品 | Slack 审计后先执行 4.2B；Teams、Discord 与补充竞品均为 `PAUSED_BY_USER`，不因 Slack Gate 通过而自动启动 |
