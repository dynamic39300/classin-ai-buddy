---
title: Agent Harness 成熟架构模式与教师 AI 产品研究
date: 2026-08-16
version: v1.0
status: 阶段 D 外部研究输入
tags:
  - ClassIn
  - WorkBuddy
  - Agent-Harness
  - 架构研究
  - 教育AI
aliases:
  - Agent Harness 行业架构研究
  - 教师 AI 工作伙伴行业研究
---

# Agent Harness 成熟架构模式与教师 AI 产品研究

## 一、文档定位

本文为教师 WorkBuddy 阶段 D 的外部研究输入，回答三个问题：

1. 用户提到的“DeepSeek 最近开源的 Harness”具体是什么，其公开架构能证明什么；
2. 行业内 Agent Loop、状态图、持久工作流、MCP、A2A 和插件化 Harness 各自解决哪一层问题；
3. 这些模式及真实教师 AI 产品，对当前五模块 Harness 有哪些可吸收经验、缺口提醒和不适用边界。

本文不是技术选型决议，也不以产品营销页反推未公开的内部架构。所有外部事实只使用官方 GitHub、官方文档、协议规范和官方产品帮助页，检索日期均为 **2026-08-16**。

### 证据标记

- **事实**：能够由一手来源直接证明；
- **判断**：基于事实对教师 WorkBuddy 的架构解释；
- **未知**：一手来源没有公开，不能推断。

---

## 二、研究结论摘要

### 1. DeepSeek 项目已经唯一确认

用户所指项目是 DeepSeek 官方组织的 [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness)。GitHub 官方 API 显示仓库对象创建于 `2026-08-13T11:56:32Z`，描述为 “DeepSeek Harness: Everything is a Plugin.”，默认分支为 `master`，许可证为 MIT；README 明确称它是 DeepSeek AI 开发的开源 Agent Harness。[GitHub API](https://api.github.com/repos/deepseek-ai/deepseek-harness) · [官方 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)

但不能把 `created_at` 解释成全部源码第一次产生或第一次对公众发布的精确时刻。仓库根提交日期早于仓库对象创建时间，表明官方仓库包含导入或迁移前历史；可靠结论只能是“DeepSeek 官方组织中的这个仓库对象于 8 月 13 日创建，并在检索日公开可访问”。[根提交](https://github.com/deepseek-ai/deepseek-harness/commit/b67e81ac97647270b3002d78532baf3a5b68cbc3) · [GitHub API](https://api.github.com/repos/deepseek-ai/deepseek-harness)

### 2. 当前五模块方向正确，但还不是完整的部署拓扑

当前五模块：

1. 上下文引擎；
2. 目标与任务运行时；
3. 能力与业务工具系统；
4. 教师控制与执行系统；
5. 评价与持续学习系统。

它们已经覆盖教师 WorkBuddy 最重要的业务责任，不需要因为外部框架而推翻。行业资料提示的主要缺口不是“再增加若干平级业务模块”，而是需要把以下内容显式补成一层共享技术基座：

- 身份、租户、授权、隐私与保留策略；
- 事件、状态、检查点、定时器和任务队列；
- 模型网关、Prompt/模型版本、预算与限流；
- Capability Schema、插件生命周期和协议适配；
- 教学产物版本、来源、差异和谱系；
- Trace、审计、评价数据集和运行诊断；
- 面向工作台的状态投影、事件流和通知。

### 3. 应在项目启动阶段确立完整蓝图，但不能一次性建设完整平台

建议现在锁定的是一份“**完整但低分辨率**”的全局架构蓝图：责任边界、事实所有权、运行不变量、核心契约、协议边界和跨模块基座必须完整；具体框架、数据库、消息系统和部署拆分保持可替换。

随后以“课程目标 → 课程对象”纵向切片提高局部分辨率，验证 Intent、Context、Artifact、Capability、Action、Evaluation 六类契约。不能把“有全局蓝图”误解为先建设通用 Agent 平台，也不能把“纵向切片”误解为只设计第一条业务链而不管终局一致性。

### 4. 推荐的是组合范式，不是单框架包办

不同模式分别解决不同层次：

| 层次 | 可参考范式 | WorkBuddy 中的责任 |
| --- | --- | --- |
| 单次 Agent 推进 | OpenAI Agents SDK 等 Agent Loop | 模型调用、工具循环、handoff、guardrail、短暂停和 trace |
| Agent 状态图 | LangGraph | 显式分支、检查点、图内人工中断和状态调试 |
| 跨小时/天的可靠业务过程 | Temporal 等 Durable Workflow | 等待教师、定时复查、重试、恢复、业务副作用编排 |
| Agent 到工具/资源 | MCP | 工具发现和调用协议，不代替业务授权与领域状态机 |
| Agent 到独立 Agent | A2A | 有独立目标、生命周期和交付物的跨 Agent 委派 |
| 可组合 Harness | DeepSeek Harness | 插件、事件域、Capability seam、工具策略流水线和可替换 provider |

不建议在 D0 直接决定全部采用某个框架。应在 D2 通过短技术验证决定：WorkBuddy Run 是否需要独立 Durable Workflow 外壳、图运行时是否必要、Agent Loop SDK 是否只作为可替换 provider。

---

## 三、DeepSeek Harness 核验与架构解读

### 1. 身份、时间与成熟度

| 项目 | 一手证据 | 可以得出的结论 |
| --- | --- | --- |
| 官方身份 | [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness) 位于 DeepSeek 官方 GitHub 组织；README 自述由 DeepSeek AI 开发 | 用户所指项目已唯一确认 |
| 仓库对象时间 | [GitHub REST API](https://api.github.com/repos/deepseek-ai/deepseek-harness) 返回 `created_at=2026-08-13T11:56:32Z`、`pushed_at=2026-08-13T13:00:21Z` | 能证明官方仓库对象的创建和最近代码推送元数据，不能证明全部代码最早产生时间 |
| 历史边界 | [根提交](https://github.com/deepseek-ai/deepseek-harness/commit/b67e81ac97647270b3002d78532baf3a5b68cbc3) 的作者日期早于仓库对象创建时间 | 仓库可能导入了既有历史，不能用 `created_at` 代替项目研发起点 |
| 成熟度 | [README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) 明确标注 `developer preview`，并警告会有 compatibility-breaking changes | 可作为前沿架构样本，不可作为稳定生产依赖的成熟度证明 |

### 2. 官方公开的核心架构

DeepSeek Harness 使用 Cordis 驱动的“一切皆插件”架构。模型适配器、工具注册表、会话日志和 Agent Loop 都是插件；插件向共享上下文贡献服务、类型化事件和可逆副作用，不存在必须被修改的特权内核。[官方架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

运行实例是一棵由 Profile、Bundle 和 Patch 逐层装配的插件树。基础 Bundle 提供模型、工具、持久化、沙箱、审批、配置、凭据和遥测，Web 与 Headless 形态在其上组合。[官方架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) · [Base Bundle](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/base/README.md)

它将事件分为三类：持久的 Session Event、进行中控制用的 Agent Event，以及为具体能力附加策略和适配器的 Capability Event。会话日志是模型上下文、UI、恢复、fork、transcript 和 telemetry 的来源；官方不变量是“模型可见即已记录”，即到达模型请求的输入必须能够由日志重建。[官方架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) · [Agent 生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/agent-lifecycle.md)

其 Capability seam 明确区分 Service Definition、Service Provider 和 Consumer：接口、实现与使用者是不同角色，扩展依赖能力定义而不是具体实现。这一模式覆盖 LLM、存储、文件系统、沙箱、子 Agent、Skills、凭据、反馈和工作流等能力。[Capability Seams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md) · [Packages](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/README.md)

工具调用通过可扩展管线执行，策略、guard、审批、执行、超时/重试、规范化、结果冻结和持久事件能够在不修改 Agent Loop 的情况下组合。[工具执行管线](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-execution-pipeline.md)

### 3. 对 WorkBuddy 的直接启示

| DeepSeek 模式 | WorkBuddy 可吸收内容 | 必须改造的教育边界 |
| --- | --- | --- |
| Session Event 与 Agent Event 分离 | 区分可回放 Run 事实与临时流式状态 | 不能把学生敏感原文无限写入通用会话日志；日志内容、引用、脱敏和保留需受机构策略控制 |
| “模型可见即已记录” | 形成 ContextSnapshot、Prompt/模型版本和来源可追踪不变量 | 应理解为“可审计重建”，不等于永久保存全部原始内容 |
| Definition / Provider / Consumer | 强化 Capability Contract 和 adapter 可替换性 | ClassIn 领域规则和权限不能被插件本地约定取代 |
| 工具策略流水线 | 将权限、风险、审批、执行和结果标准化放在唯一副作用入口 | 批量学生动作、消息、诊断和评价需要教育专属风险分级 |
| Profile / Bundle / Patch | 支持机构、学段、学科和部署形态的组合 | 机构规则要有受治理版本，不能允许任意用户 Patch 绕过安全不变量 |
| 可替换 Agent Loop | 主 Agent 业务契约不绑定某个 Loop 或模型供应商 | Run、课程对象和审批事实仍需由 WorkBuddy 与 ClassIn 领域拥有 |

### 4. 不适合直接照搬的部分

DeepSeek Harness 的公开包大量面向编码/工作区 Agent，包括文件系统、Shell、终端、LSP、进程和沙箱能力。[Capability Seams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md) 这些能力能够验证通用 Harness 的可组合性，但不是教师 WorkBuddy 的核心业务抽象。

官方 README 明确声明项目仍处于开发者预览。[README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) 因此当前最合理的用法是吸收其事件、插件和 seam 设计原则，并进行独立 PoC；不应在尚未完成稳定性、安全和运维验证时将它设为生产架构唯一基座。

其“模型可见即已记录”若未经教育数据治理改造，可能与学生隐私、最小保留、删除和机构隔离要求冲突。这是 WorkBuddy 的领域判断，不是 DeepSeek 官方文档对教育合规的承诺。

---

## 四、六种通用 Harness 范式对比

### 1. 总览

| 范式 | 官方定位与关键机制 | 适合解决 | 不单独解决 | 对五模块的映射 |
| --- | --- | --- | --- | --- |
| OpenAI Agents SDK | Agent 配置 instructions/tools/guardrails/handoffs；Runner 循环处理最终输出、handoff 和 tool calls；支持 HITL、Sessions 和 tracing。[README](https://github.com/openai/openai-agents-python) · [Runner](https://openai.github.io/openai-agents-python/running_agents/) · [HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/) | 单次或短程 Agent Loop、工具调用、多 Agent 协作、运行追踪 | ClassIn 领域模型、长期业务状态、组织权限和完整评价治理 | 主要落入目标与任务运行时、能力系统、教师控制、评价系统的内部 provider |
| LangGraph | 面向长运行、有状态 Agent 的低层编排；Checkpointer 保存线程状态，Store 保存跨线程数据；Interrupt 可持久暂停并恢复人工输入。[官方仓库](https://github.com/langchain-ai/langgraph) · [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | 显式图状态、分支、循环、图内 HITL、故障恢复和调试 | 教育对象、业务权限、业务写回语义和跨系统可靠事务 | 主要作为目标与任务运行时的候选实现，也支撑教师控制 |
| Temporal | Workflow 是代码定义的业务过程；Activities 执行外部副作用；Event History 支持重放恢复；Query/Signal/Update 分别读取、异步改变和同步改变运行状态。[Overview](https://docs.temporal.io/evaluate/understanding-temporal) · [Workflow Execution](https://docs.temporal.io/workflow-execution) · [Message Passing](https://docs.temporal.io/develop/python/message-passing) | 跨小时/天任务、等待、定时器、重试、恢复、幂等和可靠业务编排 | 模型推理循环、Prompt、知识检索和教学业务设计 | 主要作为目标与任务运行时、控制执行系统的 Durable substrate |
| MCP | Host 建立到多个 Client 的连接，每个 Client 与一个 Server 建立有状态会话；Server 暴露 Resources、Prompts 和 Tools，协议包含生命周期、授权和传输规范。[架构规范](https://modelcontextprotocol.io/specification/2026-07-28/architecture) · [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | Agent 到工具/资源的标准化发现和调用 | 工具本身正确性、ClassIn 领域权限、审批、事务、A2A 任务生命周期 | 能力与业务工具系统的协议 adapter；控制系统仍包裹副作用 |
| A2A | 独立、可不透明的 Agent 通过 Agent Card 发现能力，使用 Message、Task、Artifact 和 Task 状态进行同步、流式或异步协作；终态 Task 不重启。[官方仓库](https://github.com/a2aproject/A2A) · [Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/) · [Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/) | 跨团队/系统的独立 Agent 委派、长任务和交付物交换 | 主 Agent 内部工具调用、业务授权、父任务验收和产物版本所有权 | 能力系统中的 Professional Sub-agent adapter，并与运行时建立父子 Run 映射 |
| DeepSeek Harness | Everything-is-a-plugin；Session/Agent/Capability 三类事件；Definition/Provider/Consumer seam；可插拔 Agent Loop 和工具执行策略管线。[README](https://github.com/deepseek-ai/deepseek-harness) · [Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) | Harness 内部可组合性、替换能力、事件扩展和编码类工具生态 | 教育领域事实、稳定生产成熟度、机构治理和长业务闭环的现成答案 | 可作为五模块内部插件、事件和 adapter 组织方式的参考 |

### 2. OpenAI Agents SDK：Agent Loop 参考，不是完整业务平台

Runner 的公开循环是：调用当前 Agent 的模型，若产生最终输出则结束；若产生 handoff 则切换 Agent 并继续；若产生工具调用则执行并把结果追加后继续；超过 `max_turns` 时停止。[Runner 文档](https://openai.github.io/openai-agents-python/running_agents/)

其 HITL 机制允许敏感工具声明需要审批，运行以 interruption 暂停，`RunState` 可序列化后再批准、拒绝和恢复；审批能够从嵌套 Agent 工具冒泡到外层 Run。[HITL 文档](https://openai.github.io/openai-agents-python/human_in_the_loop/)

**判断**：这类 SDK 适合成为 WorkBuddy 的“Agent Loop provider”，但不能成为课程、审批和业务执行的事实所有者。WorkBuddy 仍需在 SDK 外保存稳定的 Run、ContextSnapshot、PlanVersion、Artifact 和 ExecutionReceipt。

### 3. LangGraph：适合显式状态和人工中断

LangGraph 官方将其定位为构建长运行、有状态 Agent 的低层编排框架；Persistence 使用 Checkpointer 保存单线程图状态，用 Store 保存跨线程应用数据。[官方仓库](https://github.com/langchain-ai/langgraph) · [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)

Interrupt 能在节点中动态暂停，状态经 Checkpointer 保存，并通过相同 `thread_id` 和 `Command(resume=...)` 恢复；官方文档提醒恢复时会从包含 interrupt 的节点开头重新执行，因此 interrupt 前的副作用需要可重放或隔离。[Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)

**判断**：它适合“目标澄清 → 生成 → 校验 → 教师确认 → 修订”这类显式分支，但不能把所有开放式教学思考硬编码为节点。若采用，节点只表达可观察业务状态，不表达模型隐藏推理。

### 4. Temporal：适合真正跨时间的 WorkBuddy Run

Temporal 将 Workflow 定义为代码中的业务逻辑，将外部 API、数据库等易失败操作放入 Activity；Temporal Service 保存 Event History，Worker 通过重放恢复 Workflow 状态。[Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal) · [Workflow Execution](https://docs.temporal.io/workflow-execution)

Workflow 可以通过 Query 只读状态，通过 Signal 异步改变状态，通过 Update 校验、改变状态并返回结果；这些机制可映射教师补充信息、批准/拒绝、暂停、取消和重新规划。[Message Passing](https://docs.temporal.io/develop/python/message-passing)

**判断**：当 WorkBuddy 任务需要等待数小时或数天、到期复查、可靠重试和跨服务副作用时，Durable Workflow 的价值明显。它不是模型编排框架，Agent Loop、Context Engine 和 Capability System 仍应通过 Activity 或明确接口接入。

### 5. MCP：工具协议，不是业务安全边界

MCP 使用 Host-Client-Server 架构；Host 创建多个 Client，每个 Client 与一个 Server 保持隔离的有状态会话，Server 可公开 Tools、Resources 和 Prompts。[MCP 架构规范](https://modelcontextprotocol.io/specification/2026-07-28/architecture)

Tools 由模型发现和调用，规范同时要求实现方重视输入验证、访问控制、速率限制、结果校验，并建议在敏感操作上保留人类确认能力。[MCP Tools 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

**判断**：MCP 能统一工具接入，但协议可调用不等于教师已授权，更不等于课程/作业状态允许写入。所有有副作用的 MCP 调用仍必须转成 ProposedAction，经过 WorkBuddy 控制系统和领域 API 校验。

### 6. A2A：只用于真正独立的专业 Agent

A2A 面向彼此不透明、可能由不同框架和组织实现的 Agent。Agent Card 描述能力和连接信息；有状态工作以 Task 表达，过程中可产生状态更新和 Artifact，也可进入 `input-required`、`auth-required` 等中断状态。[官方仓库](https://github.com/a2aproject/A2A) · [Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)

终态 Task 不可重启；后续修订应在同一 `contextId` 下创建新 Task，Artifact 的版本关联由 Client 管理而不是协议自动管理。[Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)

A2A 官方将 MCP 区分为 Agent-to-Tool，将 A2A 定位为 Agent-to-Agent 协作。[A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)

**判断**：WorkBuddy 只有在子能力拥有独立目标、生命周期、上下文、权限和完成契约时才使用 A2A。课程对象版本、父 Run 验收和教师批准仍由 WorkBuddy Client 侧管理。

---

## 五、教师 AI 产品一手案例

### 1. 证据使用边界

以下案例用于研究产品体验、业务上下文和教师控制，不用于证明其未公开的内部 Agent Harness。某产品使用“Agent”“AI Operating System”或“Copilot”等名称，也不能据此推断它内部采用 MCP、A2A、状态图或 Durable Workflow。

### 2. 横向比较

| 产品 | 官方公开的教师体验 | 业务/知识上下文 | 教师控制 | Harness 公开度与启示 |
| --- | --- | --- | --- | --- |
| Khanmigo for Teachers | 支持 standards-aligned 备课、学习目标、rubric、exit ticket、活动、题目及家庭沟通草稿，并可汇总近期学生作业以识别支持点。[官方教师页](https://www.khanmigo.ai/teachers) | Khan Academy 内容与学生作业摘要使其区别于无业务上下文聊天。[官方教师页](https://www.khanmigo.ai/teachers) | 产品定位为教师助理和草稿生成；学生使用需要家庭或学校/学区渠道。[官方教师页](https://www.khanmigo.ai/teachers) | 未公开 Agent Loop、Skill/MCP/A2A 或 Harness；可证明“知识与学习证据增强教师产出”，不能证明底层架构 |
| MagicSchool | 公开 80+ 教师工具和 50+ 学生工具，覆盖 lesson、rubric、quiz、worksheet、presentation、feedback 和 custom chatbot。[Magic Tools](https://www.magicschool.ai/magic-tools) | 教师可按年级、学科和目标定制，学区可构建 custom tools；官方还列出 Google Classroom、Canvas 等集成。[Integrations](https://www.magicschool.ai/integrations) | 学生能力被描述为 teacher-guided，机构可配置 moderation 和边界。[Magic Tools](https://www.magicschool.ai/magic-tools) | “AI Operating System”是产品定位，不是公开 Harness 证据；可参考任务化工具目录和机构定制 |
| SchoolAI | Spaces 支持教师创建学习体验，Mission Control 让教师实时查看学生对话，结束后聚合 strengths/gaps 并分组。[Spaces](https://schoolai.com/products/spaces) | 可配置 grade、subject、teaching style，学生可上传草稿、笔记和项目；官方列出 LMS、SSO、SIS 与 Google Classroom/Canvas 集成。[Integrations](https://schoolai.com/integrations) | 教师可查看告警、暂停对话并直接介入，系统公开实时安全监控机制。[安全说明](https://schoolai.com/blog/how-schoolai-protects-students-with-real-time-safety-monitoring) | 公开产品形态接近“运行—观察—干预—复盘”；公开的 [`ts-prompt`](https://github.com/SchoolAI/ts-prompt) 只证明类型化 Prompt 工具，不能代表产品 Harness |
| TeachFX | 教师主动录制课堂音频，系统分析 talk time、开放式问题、学术词汇等模式，并支持教师设定目标和观察后续变化。[官方产品页](https://teachfx.com/) | 课堂音频、transcript 和教学实践证据形成垂直上下文。[官方案例](https://teachfx.com/blog/how-has-teachfx-changed) | 官方定位为支持教师而非评价教师，录制、目标和分享由教师控制。[官方产品页](https://teachfx.com/) | 未公开通用 Harness；值得借鉴“证据 → 反思 → 目标 → 再测量”的评价闭环 |
| Brisk Teaching | 浏览器扩展嵌入 Docs、Slides、PDF 和 YouTube，提供材料生成、反馈、阅读级别调整和写作过程回放，并有 Web 工作区。[AI Tools](https://www.briskteaching.com/ai-tools-for-teachers) | Batch Feedback 可读取 Drive/Classroom 作业，Brisk Next 使用班级数据、标准、年级和近期使用形成建议。[AI Tools](https://www.briskteaching.com/ai-tools-for-teachers) | 产物可 preview、edit、assign，教师可在原工作位置继续修改。[AI Tools](https://www.briskteaching.com/ai-tools-for-teachers) | 未公开 Agent Loop 或 Harness；证明“中央工作台 + 工作发生处嵌入”可以并存 |
| Microsoft Education Copilot | Microsoft 365 Copilot App 中的 Teach 支持 lesson、rubric、quiz、flashcards、standards alignment 和 differentiation，并提供历史区。[Teach 帮助](https://support.microsoft.com/en-us/education/copilot/teach-in-the-microsoft-365-copilot-app) | 可与 Word、Teams Classwork 和 Learning Activities 协同，后者提供 started/completed、平均分和困难项等结果信息。[Classwork](https://support.microsoft.com/en-us/education/copilot/create-with-copilot-in-classwork) · [Learning Activities](https://support.microsoft.com/en-us/education/copilot/learning-activities) | Classwork 中的 Copilot 产出需教师 review/edit 后 Save/Publish，管理员可关闭能力。[Classwork](https://support.microsoft.com/en-us/education/copilot/create-with-copilot-in-classwork) | 官方教育页还列出 Copilot Studio 等产品，但不能证明 Teach 内部直接采用同一 Agent 架构。[教育总览](https://www.microsoft.com/en-us/education/products/copilot) |
| Google Gemini for Education | 支持教案、差异化、考试、作业、rubric 和沟通；Gems 提供定制专家，Canvas 提供生成和编辑工作区。[Gemini for Education](https://edu.google.com/ai/gemini-for-education/) | Gemini Notebook 只基于用户加入的 Sources 回答，并提供 inline citation，可由 PDF、网站、YouTube、Docs 和 Slides 生成教学材料。[Gemini Notebook](https://edu.google.com/ai-gemini-notebook/) | 官方说明教育账号具有数据保护和未成年人额外 guardrail；来源由用户选择，回答可追溯引用。[Gemini for Education](https://edu.google.com/ai/gemini-for-education/) | Gems、Notebook 和 Workspace 集成是体验与能力证据，不是公开 Harness 证据 |

### 3. 教育产品的共同模式

从一手产品文档可以确认，成熟教师 AI 体验普遍不是单一万能聊天框，而是以下组合：

1. 具体教师任务入口；
2. 可编辑、可保存或可分发的教学产物；
3. 课程标准、内容、课堂或学生证据上下文；
4. 教师审阅、修改、暂停或实时介入；
5. 学生运行结果或教学效果洞察。

这个归纳是对上述官方产品能力的比较判断，不代表这些产品都实现了完整 Agent 或统一 Harness。

### 4. 对 WorkBuddy 最有价值的体验借鉴

- **Brisk**：中央 WorkBuddy 与 ClassIn 内嵌入口可以共用同一 Run 和 Artifact，不必二选一；
- **SchoolAI**：当 Agent 影响学生侧体验时，教师需要 Mission Control、实时告警、暂停和介入；
- **Microsoft**：`review/edit → Save/Publish` 是教师控制和业务写回之间清楚的产品契约；
- **Google Notebook**：知识生成应显示 Source 和 citation，而不是只声称“基于知识库”；
- **TeachFX**：评价系统应连接证据、反思、教师目标和下一次测量；
- **Khanmigo**：通用教师任务可以独立使用，接入学习证据后产出更精细，这与 WorkBuddy 的“通用底座 + ClassIn 增强层”一致。

---

## 六、对当前五模块 Harness 的完备性检查

### 1. 总体判断

当前五模块的业务责任基本完整，应保持稳定。需要补充的是“模块内部的关键子系统”和“所有模块共同依赖的平台基座”，而不是把行业框架的名词直接变成新的平级领域模块。

### 2. 五模块逐项检查

| 当前模块 | 已覆盖 | 需要补强 | 外部模式依据 |
| --- | --- | --- | --- |
| 上下文引擎 | 身份范围、业务事实、证据、知识、偏好、推断和来源快照 | Knowledge Asset 生命周期、索引版本、删除/过期、敏感字段策略、Prompt 可见上下文审计、跨机构强隔离 | DeepSeek 的可重建模型输入；Google Notebook 的 source-grounded citation；MCP 的连接隔离 |
| 目标与任务运行时 | Intent、计划、步骤、依赖、暂停、恢复、失败和复查 | 明确 Durable Run 的权威状态、事件/命令模型、定时器、迁移和历史保留；决定 Graph Runtime 与 Durable Workflow 的关系 | LangGraph Checkpointer/Interrupt；Temporal Event History/Signal/Update；A2A Task 生命周期 |
| 能力与业务工具系统 | Skill、AI Tool、MCP、ClassIn Tool、A2A 子 Agent 的注册与调用 | 强化 Definition/Provider/Consumer；Capability 版本、Schema 兼容、健康、预算、生命周期和按租户启用；明确 MCP 与 A2A adapter 不拥有业务语义 | DeepSeek Capability seam；MCP Resources/Prompts/Tools；A2A Agent Card/Task |
| 教师控制与执行系统 | 风险、差异、审批、幂等、撤销、补偿和回执 | Policy-as-code、审批信号持久化、复合动作的部分成功、批量学生动作风险、权限撤销传播、数据保留和告警处理 | DeepSeek Tool pipeline；OpenAI HITL；LangGraph Interrupt；Microsoft review/edit/save/publish |
| 评价与持续学习系统 | 质量、采纳、修改、执行、安全、成本和业务结果 | Trace Schema、离线冻结任务集、线上 cohort、因果边界、数据最小化、Prompt/模型/知识/工具版本关联、质量退化告警 | OpenAI tracing；DeepSeek Session telemetry；TeachFX 证据到再测量闭环 |

### 3. 建议显式补出的共享技术基座

| 基座能力 | 责任 | 不应由谁临时代管 |
| --- | --- | --- |
| Identity & Tenant Policy | 统一用户、机构、角色、对象范围、授权与撤权传播 | Prompt、单个 Skill、MCP Server |
| Durable State & Eventing | Run 状态、Event/Command、Timer、Queue、Checkpoint、并发与恢复 | 浏览器页面、模型上下文、单次 Agent SDK Session |
| Model & Prompt Gateway | 模型路由、版本、结构化输出、敏感数据策略、预算、限流和降级 | 每个 Skill 自行直连供应商 |
| Capability Registry | Schema、版本、权限、风险、成本、健康、Provider 和协议 adapter | 主 Agent 的 Prompt 工具列表 |
| Artifact Workspace | 中间产物、领域草稿、来源、差异、版本、教师修改和谱系 | 聊天消息文本或 Run 临时字段 |
| Observability & Evaluation | Trace、审计、指标、评价数据集、告警和隐私保留 | 第三方模型日志或单一 APM |
| UI Projection & Event Stream | 将 Run、Artifact、Context、Approval 和 Receipt 投影成工作台连续状态 | 由 UI 拼接多个后端的私有状态 |
| Configuration & Plugin Governance | 机构/学段/学科组合、配置版本、兼容、回滚和安全不变量 | 不受治理的用户 Patch |

这些基座是逻辑能力清单，不代表 D0 就要拆成八个微服务。第一阶段可以是模块化单体、单数据库和进程内事件，只要接口、事实所有权和迁移路径不被破坏。

### 4. 一个需要提升为一等对象的概念：Artifact

行业资料反复出现“可编辑交付物”：A2A 将 Artifact 与 Message 区分，[A2A Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)；Microsoft 要求教师审阅后保存/发布，[Classwork](https://support.microsoft.com/en-us/education/copilot/create-with-copilot-in-classwork)；DeepSeek 用持久 Session Event 维护可回放状态，[Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)。

因此 WorkBuddy 不应只拥有对话和 Plan，还应明确 `ArtifactDraft` 的生命周期：

- 从哪次 Run、哪些事实和知识生成；
- 哪部分由教师修改或采纳；
- 与哪个课程/单元/活动领域对象关联；
- 当前只是 WorkBuddy 中间产物，还是已经成为 ClassIn 草稿；
- 每次修订、校验、审批和写回对应哪个版本；
- 失败、冲突、撤销和复查如何追踪。

Artifact Workspace 可以作为能力系统、控制系统和领域 adapter 之间的共享子系统，不必增加第六个业务深模块，但必须拥有清楚的 Schema 和事实所有权。

---

## 七、推荐的全局架构蓝图

### 1. 五层结构

| 层次 | 组成 | 现在需要锁定什么 |
| --- | --- | --- |
| 体验与渠道层 | 统一 WorkBuddy 工作台、ClassIn 内嵌入口、移动提醒、状态投影 | 同一 Run/Artifact 的多入口一致性；教师可见的计划、证据、差异、审批和结果 |
| 主 Agent 与协作层 | 目标理解、澄清、协作模式选择、专业 Agent 委派 | 主 Agent 唯一教师身份；隐藏内部拓扑；A2A 进入条件 |
| 五模块 Harness | Context、Runtime、Capability、Control、Evaluation | 小 Interface、事实所有权、不变量和六类契约 |
| 共享技术基座 | IAM/Policy、Durable State、Model Gateway、Artifact、Registry、Observability、Configuration | 逻辑责任和替换 seam；暂不锁定所有具体产品 |
| 领域与外部系统 | ClassIn 课程/课堂/作业/消息/资源/身份，知识库，外部 MCP/A2A | 领域事实不复制；读、草稿、确认写回；模拟与真实 adapter 同契约 |

### 2. 运行时组合建议

建议以一个权威 `WorkBuddyRun` 贯穿全链路，避免 Agent SDK Session、LangGraph Thread、Temporal Workflow 和 A2A Task 各自成为互相竞争的事实源。

如果 PoC 表明任务只在一个交互会话内完成，且暂停时间短，可先使用简单持久状态机或 LangGraph 类 Checkpointer；如果需要跨小时/天等待、定时复查和多领域可靠副作用，应由 Temporal 类 Durable Workflow 作为外层权威运行时。Agent Loop 可在某个步骤内执行，不能拥有业务 Run 的最终状态。

若同时使用图运行时和 Durable Workflow，必须提前定义 ID 与状态映射：

| WorkBuddy 对象 | 外部运行时对象 | 规则 |
| --- | --- | --- |
| `RunRef` | Workflow ID / Graph thread ID | `RunRef` 是产品稳定标识，外部 ID 只是实现引用 |
| `PlanVersion` | Workflow/Graph state version | 计划升级使旧审批失效 |
| `ApprovalRequest` | Signal/Update/Interrupt | 教师决定先落 WorkBuddy 审计，再推进外部运行时 |
| `CapabilityCall` | Activity/Graph node/SDK tool call | 调用结果必须标准化，不泄漏框架私有对象 |
| `SubRunRef` | A2A Task ID / Child Workflow | 父 Run 只接受完成契约和 Artifact，不共享隐式内存 |

### 3. 协议边界建议

- 内部稳定、强领域语义的 ClassIn API 可以直接使用领域 adapter，不必为了“协议统一”全部包装成 MCP；
- MCP 用于可发现、结构化、相对原子的工具和资源接入；
- A2A 用于真正独立、长运行、可不透明的专业 Agent；
- Agent SDK、LangGraph、Temporal、DeepSeek Harness 都放在 adapter 或 provider 后，不进入课程和教师工作流的领域 Schema；
- 任何框架产生的“成功”都必须转换为 WorkBuddy `ExecutionReceipt` 或 `ArtifactResult`，不能直接宣告教学目标完成。

---

## 八、实施策略建议

### D0：冻结全局低分辨率蓝图

现在应完成：

- 五层架构和五个业务深模块；
- WorkBuddyRun、ContextSnapshot、Artifact、Capability、ProposedAction、Approval、ExecutionReceipt、EvaluationEvent 的事实所有权；
- 六类契约及版本策略；
- 模拟 ClassIn 与未来真实 ClassIn 使用同一领域 adapter Interface；
- 教师控制、学生安全、跨机构隔离和数据最小化不变量。

现在不应完成：

- 所有微服务拆分；
- 全部协议和供应商选型；
- 全业务场景状态机；
- 为未来假设建设通用插件市场或多 Agent 网络。

### D1：用全功能高保真原型检查产品状态

原型覆盖终局全链路，但属于可视化交互 PoC。每个关键交互节点标注 Harness owner、Domain object、Knowledge need、Side effect、Approval、Event 和 Truth label。原型可以改变 UI，但不能绕过已冻结的事实所有权和安全不变量。

### D2：架构 Spike 与 ADR

建议至少验证四个技术问题：

1. Agent Loop provider 是否能够暂停、序列化、恢复，并保留结构化工具和审批结果；
2. LangGraph 类状态图与 Temporal 类 Durable Workflow，谁拥有长期 WorkBuddyRun，是否需要组合；
3. Capability seam 能否用同一契约切换本地模拟、ClassIn adapter、MCP 和 A2A provider；
4. Artifact 和 ContextSnapshot 能否在不复制 ClassIn 事实的前提下支持来源、版本、差异和回放。

Spike 输出应是 ADR 和可重复测试，不是框架演示截图。

### D3：建设“课程目标 → 课程对象”纵向骨架

先以模拟机构和模拟 ClassIn Adapter 跑通：目标 → 范围 → ContextSnapshot → 计划 → 课程 ArtifactDraft → 教师编辑 → 规则校验 → 差异 → 审批 → 模拟保存 → ExecutionReceipt → 评价事件。

只有这条链能够证明：终局原型中的产品状态可以由完整 Harness 蓝图承接，同时当前工程建设仍保持可控范围。

---

## 九、需要形成的共识判断

1. **是，应在项目启动阶段确立完整全局 Agent 架构蓝图。** 完整指责任、契约和不变量完整，不指一次性实现完整。
2. **不应先画完原型再考虑技术，也不应先锁死全部技术选型。** 原型与蓝图共演，纵向切片验证二者。
3. **当前五模块继续保留。** 新增的是共享技术基座和 Artifact 一等对象，不是照抄外部框架重构业务边界。
4. **DeepSeek Harness 是有价值的近期一手样本。** 应吸收插件、事件、seam 和工具流水线模式；因其仍为开发者预览且偏通用/编码 Agent，不直接作为生产选型。
5. **教育产品提供体验和治理证据，开源 Harness 提供技术模式证据。** 两类证据必须分开使用。
6. **技术领先性来自可替换、可恢复、可审计和可评价。** 不是集成最多框架或 Agent 数量最多。

---

## 十、一手来源索引

### 通用 Harness 与协议

- DeepSeek Harness：[GitHub](https://github.com/deepseek-ai/deepseek-harness) · [API](https://api.github.com/repos/deepseek-ai/deepseek-harness) · [Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) · [Agent Lifecycle](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/agent-lifecycle.md) · [Tool Pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/tool-execution-pipeline.md) · [Capability Seams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md)
- OpenAI Agents SDK：[GitHub](https://github.com/openai/openai-agents-python) · [Running Agents](https://openai.github.io/openai-agents-python/running_agents/) · [HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/) · [Tracing](https://openai.github.io/openai-agents-python/tracing/)
- LangGraph：[GitHub](https://github.com/langchain-ai/langgraph) · [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence) · [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- Temporal：[Understanding Temporal](https://docs.temporal.io/evaluate/understanding-temporal) · [Workflow Execution](https://docs.temporal.io/workflow-execution) · [Message Passing](https://docs.temporal.io/develop/python/message-passing)
- MCP：[Specification](https://modelcontextprotocol.io/specification/2026-07-28) · [Architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture) · [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- A2A：[GitHub](https://github.com/a2aproject/A2A) · [Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/) · [Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/) · [A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)

### 教师 AI 产品

- Khanmigo for Teachers：[官方教师页](https://www.khanmigo.ai/teachers)
- MagicSchool：[Magic Tools](https://www.magicschool.ai/magic-tools) · [Integrations](https://www.magicschool.ai/integrations)
- SchoolAI：[Spaces](https://schoolai.com/products/spaces) · [Integrations](https://schoolai.com/integrations) · [Safety Monitoring](https://schoolai.com/blog/how-schoolai-protects-students-with-real-time-safety-monitoring) · [ts-prompt](https://github.com/SchoolAI/ts-prompt)
- TeachFX：[官方产品页](https://teachfx.com/) · [官方案例](https://teachfx.com/blog/how-has-teachfx-changed)
- Brisk Teaching：[AI Tools](https://www.briskteaching.com/ai-tools-for-teachers)
- Microsoft Education Copilot：[Teach](https://support.microsoft.com/en-us/education/copilot/teach-in-the-microsoft-365-copilot-app) · [Classwork](https://support.microsoft.com/en-us/education/copilot/create-with-copilot-in-classwork) · [Learning Activities](https://support.microsoft.com/en-us/education/copilot/learning-activities) · [教育总览](https://www.microsoft.com/en-us/education/products/copilot)
- Google Gemini for Education：[Gemini for Education](https://edu.google.com/ai/gemini-for-education/) · [Gemini Notebook](https://edu.google.com/ai-gemini-notebook/)

