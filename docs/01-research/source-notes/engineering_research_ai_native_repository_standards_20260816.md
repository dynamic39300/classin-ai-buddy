---
title: ClassIn 教师 WorkBuddy AI-Native 工程规范与仓库结构研究
date: 2026-08-16
version: v1.0
status: 工程脚手架决策输入
tags:
  - ClassIn
  - WorkBuddy
  - Engineering
  - AI-Native
  - Agent-Harness
  - Repository-Architecture
---

# ClassIn 教师 WorkBuddy AI-Native 工程规范与仓库结构研究

## 一、研究目标与证据边界

本文为进入 WorkBuddy 原型开发前的工程脚手架提供决策输入，回答四个问题：

1. TypeScript 前端、后端与共享模块如何组织；
2. Agent Harness 的模块、契约、事件、评测、可观测性、模拟 Adapter 和安全治理如何落盘；
3. `AGENTS.md`、`CLAUDE.md` 等 Agent-facing instructions 如何成为仓库可执行规范；
4. 如何使用 ADR、架构测试、契约测试和原型隔离，避免原型代码污染未来生产架构。

证据仅采用官方仓库、官方文档、正式标准或项目维护者的一手资料。相邻 ClassIn 项目的 `AGENTS.md` / `CLAUDE.md` 只作为本地实践输入，不作为行业标准。

本文不决定具体云厂商、生产数据库、模型供应商或 ClassIn 真实 API。没有真实业务数据和接口的部分仍标记为模拟或待验证。

## 二、结论摘要

### 2.1 推荐现在采用

| 决策 | 推荐 | 理由 |
| --- | --- | --- |
| 仓库模型 | `pnpm workspace` 的轻量 monorepo | 前端、API、领域契约、Harness 和模拟 Adapter 需要共享类型但保持边界；pnpm 原生支持 workspace，并可用 `workspace:` 保证依赖解析到本地包 |
| 构建调度 | 第一版使用根脚本；包和任务增多后引入 Turborepo | 当前只有一条纵向切片，先避免额外配置；Turborepo 适合后续任务缓存和依赖图调度 |
| 语言 | 全栈 TypeScript strict | 原型 UI、API、契约和模拟 Adapter 可共享结构化类型；外部数据仍必须运行时校验 |
| 系统形态 | 模块化单体，不拆微服务 | 当前要验证 Harness 边界而不是分布式运维；模块和契约先稳定，再决定部署边界 |
| 前端 | React + Vite，按产品区域/feature 组织 | 适合高仿真工作台快速迭代；业务状态不下沉到通用 UI 组件 |
| 后端 | 单一 API/BFF 组合根，应用层调用 Harness ports | UI 不直接调用模型、MCP、知识库或 ClassIn Adapter |
| 契约 | TypeScript 类型 + Zod 运行时 Schema + 固定示例 | 编译期类型不能验证网络、模型、文件或持久化数据；Schema 是所有边界的入口。Zod 官方定位即为 TypeScript-first validation library，[见官方文档](https://zod.dev/) |
| 测试 | 单元 + Adapter 契约 + 架构边界 + Playwright E2E | 分别验证纯逻辑、模拟/真实一致性、依赖方向和教师端旅程 |
| 可观测性 | 从第一天建立 `RunEvent` 和 trace correlation；OpenTelemetry 经 Adapter 接入 | 先锁定业务事件语义，不把供应商 SDK 或尚未稳定的 GenAI 语义约定泄漏到领域层 |
| 原型数据 | 确定性 fixtures + `MockClassInAdapter` | 原型可重置、可复现，并与未来真实 Adapter 使用同一 port 和同一契约测试 |
| 决策记录 | 小型 ADR 日志 | 只记录有长期代价或替代方案的重要决策，不把每个实现细节写成 ADR |
| Agent 指令 | 根 `AGENTS.md` 为唯一行为源，`CLAUDE.md` 只做指针；必要时局部 `AGENTS.md` | 避免两份规则漂移；局部文件只补充包特有命令和边界 |

### 2.2 现在不采用

| 暂不采用 | 原因 | 重新评估触发条件 |
| --- | --- | --- |
| Nx | 功能强但当前治理成本高于收益；我们可先用 workspace、TS references 和依赖测试获得关键能力 | 包数量、团队数量或受影响任务计算明显成为瓶颈 |
| Temporal / 外部 Durable Workflow 平台 | 第一阶段运行周期短、模拟数据为主，先用可持久化 Run state seam 验证语义 | 出现跨小时/跨天恢复、可靠定时、补偿、并发执行或生产 SLA |
| LangGraph / Google ADK / OpenAI Agents SDK 作为全局架构 | 它们提供运行模式，不拥有 ClassIn 领域事实、Artifact 和教师审批边界 | 用同一纵向切片做框架 spike 后再选 Agent Loop Adapter |
| MCP 作为内部所有函数的统一接口 | MCP 是跨进程/产品能力协议，不应替代进程内清晰函数接口 | 能力需要独立部署、动态发现或被多个 Agent 客户端复用 |
| A2A | 当前没有必须独立生命周期和权限边界的专业子 Agent | 出现独立 Agent 服务、长任务委派和明确完成契约 |
| Pact 全面铺开 | 当前真实 ClassIn provider 尚不可用；内部 package 的共享 Schema 与 conformance suite 更直接 | API 由独立团队/仓库拥有，且需要 consumer-driven provider verification |
| Storybook 作为第一阶段必需基础设施 | 第一条原型链路优先验证完整工作台体验；单独维护 story 可能造成双份场景 | 设计系统出现多个消费者，或组件状态组合已难在产品页完整覆盖 |
| 微服务、插件市场、通用多 Agent 网络 | 尚无独立部署、扩缩容或组织所有权证据 | 真实负载、团队边界和安全模型证明需要拆分 |

## 三、一手资料带来的工程判断

### 3.1 Monorepo 与 TypeScript

#### pnpm Workspace：采用

pnpm 官方文档明确 workspace 是内建能力，根目录以 `pnpm-workspace.yaml` 声明；`workspace:` 协议可阻止依赖意外解析到 registry 中的同名包。[来源：pnpm Workspace](https://pnpm.io/workspaces)

对本项目的适配：

- 使用 `apps/*` 承载可运行产品；`packages/*` 承载有明确 API 的模块；
- 内部依赖统一写 `workspace:*`；
- 禁止通过深层相对路径跨 package 访问内部实现；
- workspace 是代码组织和依赖边界，不等于必须独立发布每个包。

#### Turborepo：延迟采用

Turborepo 官方定位是 JavaScript/TypeScript codebase 的高性能构建系统，适合按任务依赖关系缓存和调度。[来源：Turborepo 官方仓库](https://github.com/vercel/turborepo)

本项目第一版只有少量应用和包，根脚本已足够；当 `typecheck`、`test`、`build`、`e2e` 的重复执行成为实际问题时，再加入 `turbo.json`。目录结构不依赖 Turborepo，因此可以无迁移成本后加。

#### Nx：了解但不采用

Nx 官方强调 affected execution、缓存、插件和 monorepo 治理，并提供 `@nx/enforce-module-boundaries` 等能力。[来源：Nx 官方仓库](https://github.com/nrwl/nx)；[来源：Nx 模块边界](https://nx.dev/features/enforce-module-boundaries)

本项目当前更需要可读的领域边界和少量自动化规则，而不是完整 workspace 平台。采用 Nx 会同时引入 project configuration、generator 和 plugin 决策，增加 Agent 读取成本。先使用 package exports、TS project references、ESLint import 规则和依赖图测试。

#### TypeScript Project References：采用

TypeScript 官方说明 project references 用于把程序拆成更小部分、改善构建时间并建立项目间结构；被引用项目需要 `composite`。[来源：TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

对本项目的适配：

- 根 `tsconfig.json` 仅维护 references，不放业务源码；
- `tsconfig.base.json` 统一 `strict`、模块解析和质量选项；
- 每个 app/package 有自己的 `tsconfig.json`；
- packages 使用明确 `exports`，避免消费者绕过公共入口；
- TypeScript references 只表达编译依赖，仍需架构测试防止非法方向。

### 3.2 前端、组件与端到端验证

#### ESLint Flat Config：采用

ESLint 官方当前使用 `eslint.config.js` / `eslint.config.mjs` 的 flat configuration，配置由数组按文件匹配组合。[来源：ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)

本项目应在根目录统一配置：TypeScript 类型感知规则、React hooks、import 边界和测试文件例外。格式化与语义检查分开，避免 ESLint 规则承担全部格式化职责。

#### Playwright Browser Context：采用

Playwright 官方通过独立 BrowserContext 为每个测试提供隔离，避免测试间状态泄漏；其 web-first assertions 会自动重试直到条件满足。[来源：Playwright Isolation](https://playwright.dev/docs/browser-contexts)；[来源：Playwright Assertions](https://playwright.dev/docs/test-assertions)

对 WorkBuddy 原型的适配：

- 每个教师旅程从固定 fixture 状态开始；
- 测试不复用前一个用例产生的课程草稿；
- 不使用任意 `waitForTimeout` 掩盖异步；
- 主视口至少覆盖锁定桌面尺寸，并补一个窄屏检查文本溢出；
- 关键截图按“目标澄清、计划、产物、审批、回执”状态保存，而非只截首页。

#### Storybook：有条件采用

Storybook 官方将 stories 定位为组件已知状态的可复现表达，并支持组件测试、可访问性、viewport 等工具。[来源：Storybook Docs](https://storybook.js.org/docs)；[来源：Storybook Tests](https://storybook.js.org/docs/writing-tests)

第一阶段不强制单独 Storybook 应用。先把设计 token、通用组件和状态 variant 写成可测试模块；当组件被多个 feature 使用，或状态组合数量增长，再引入 Storybook。高仿真原型的首要验收对象仍是完整教师任务链。

### 3.3 Agent/Harness 模式

#### OpenAI Agents SDK：Agent Loop Adapter 候选

官方 TypeScript SDK提供 agent、tools、handoffs、guardrails、human-in-the-loop、sessions 和 tracing。[来源：OpenAI Agents SDK JS](https://github.com/openai/openai-agents-js)

可借鉴：

- agent loop、tool schema、guardrail、HITL 和 trace 的组合；
- agent-as-tool 与 handoff 的不同语义；
- 模型与工具执行保持服务端。

不应让 SDK 的 session 直接成为 `WorkBuddyRun`，也不应让 SDK tool 绕过 `ProposedAction → Approval → ExecutionReceipt`。

#### Google ADK：事件、Artifact 与编排参考

Google ADK 官方 TypeScript 版本强调 code-first、Zod tool schema、多 Agent 编排、MCP、A2A 及开发调试工具；ADK 文档还把 session/state、events、artifacts 和 evaluation 分开。[来源：Google ADK TypeScript](https://github.com/google/adk-js)；[来源：ADK 文档](https://adk.dev/)

可借鉴 `Event` 是运行进展载体、`Artifact` 与聊天消息分离的思想；不直接采用其 Agent/Application 对象替代 WorkBuddy 的领域语言。

#### Microsoft Agent Framework：生产治理参考

官方仓库列出 middleware、graph workflow、checkpointing、streaming、HITL、time travel 与 OpenTelemetry；当前主实现是 Python 和 .NET。[来源：Microsoft Agent Framework](https://github.com/microsoft/agent-framework)

它验证了“Agent Loop + Workflow + Checkpoint + Observability + HITL”必须分层，但语言栈与本项目全栈 TypeScript 不一致，因此只作完备性检查，不作当前运行底座。

#### Pydantic AI、LangGraph 与 Temporal：模式证据

- Pydantic AI 把类型化输出、依赖注入、durable execution、evals 和 instrumentation 作为独立能力。[来源：Pydantic AI](https://github.com/pydantic/pydantic-ai)
- LangGraph 官方定位是面向长运行、有状态 Agent 的低层 orchestration，强调 durable execution、streaming 和 human-in-the-loop。[来源：LangGraph](https://github.com/langchain-ai/langgraph)
- Temporal TypeScript SDK 将 workflow、activity、client、worker 和 testing 分为独立包，说明 durable orchestration 与副作用执行应是不同责任。[来源：Temporal TypeScript SDK](https://github.com/temporalio/sdk-typescript)

三者共同支持当前判断：WorkBuddy 的 Run 状态、确定性计划推进、副作用工具和评价不应混成一个 Agent 类。当前只定义 `RunStore` / `WorkflowRuntime` ports；直到真实长任务需求出现才选择具体 durable runtime。

#### DeepSeek Harness：插件装配参考，不作基座

DeepSeek 官方仓库以 `Everything is a Plugin` 描述其 Developer Preview，展示 capability、profile/bundle/patch、事件和可替换 agent loop 的装配方式。[来源：DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)

对本项目的适配是把模型、知识、工具、策略和遥测放在组合根装配；不照搬编码 Agent 的文件系统、Shell、LSP 和 workspace 假设，也不允许插件拥有 ClassIn 事实。

### 3.4 协议与可观测性

#### MCP：外部能力边界，不是内部总线

MCP 规范把 base protocol、lifecycle、authorization、server features 与 client features 分层；消息基于 JSON-RPC 2.0，并提供 TypeScript schema 作为协议 source of truth。[来源：MCP 规范](https://modelcontextprotocol.io/specification/2025-06-18/basic)

本项目只在外部能力需要独立部署、动态发现或跨产品复用时实现 `McpCapabilityAdapter`。内部课程目标生成、Artifact 校验和审批策略保持普通 TypeScript 接口。MCP tool 也必须先转为内部 `CapabilityResult`，副作用仍经过控制系统。

#### A2A：延迟到真正的远程 Agent 委派

A2A 官方把自身定义为不暴露内部 state/memory/tools 的 opaque agent application 互操作协议，支持 Agent Card、长任务、流式和异步通知。[来源：A2A 官方仓库](https://github.com/a2aproject/A2A)

因此 A2A 不应用于普通函数、Skill 或单次生成。只有专业子 Agent 拥有独立目标、生命周期、权限或部署边界时才增加 `A2ADelegateAdapter`。

#### OpenTelemetry：采用标准 trace，隔离不稳定语义

OpenTelemetry 是 vendor-neutral 的 traces、metrics、logs 标准与工具生态。[来源：OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/)

Generative AI semantic conventions 仍可能演进，官方页面标注不同部分的稳定性。[来源：OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)

本项目应：

- 使用稳定 trace/span correlation，把 `runId`、`stepId`、`capabilityId`、`actionId` 作为受控属性；
- 在 `packages/observability` 内映射 GenAI attributes，不让领域事件依赖 OTel 名称；
- 默认不记录学生原文、完整 prompt、模型输出或密钥；
- token/cost/latency、工具错误和审批结果可记录聚合或脱敏值；
- trace 不是审计日志，`ExecutionReceipt` 和权限决策需要独立不可抵赖记录策略。

### 3.5 Agent-facing instructions 与 ADR

#### AGENTS.md：采用单一规则源和局部覆盖

AGENTS.md 官方将其定义为 coding agents 的 README，建议放置构建、测试、代码风格和安全信息；大型 monorepo 可在子项目放置局部文件，离目标文件最近的指令优先，显式用户要求仍最高。[来源：AGENTS.md 规范](https://agents.md/)

相邻 `classin-pc-agentin` 和 `classin-pc-optimizer` 已实践：根 `AGENTS.md` 作为唯一行为宪法，`CLAUDE.md` 只链接到它，避免规则复制后漂移。本项目应沿用这一做法，并补充 WorkBuddy 特有的事实所有权、模拟真值标签和工具副作用边界。

根 `AGENTS.md` 应短而可执行，包含：

1. 项目使命和当前阶段；
2. 单一事实源优先级；
3. 最小上下文读取顺序；
4. 依赖方向和不可突破的领域不变量；
5. `FACT / LOCKED / RECOMMENDATION / UNKNOWN / PLACEHOLDER` 标签；
6. 开发、测试和视觉验收命令；
7. 安全、隐私、模型和工具调用规则；
8. 完成定义。

局部 `AGENTS.md` 只有在命令、生成代码规则或安全边界明显不同的时候建立，例如 `packages/adapters/` 和 `tests/e2e/`；禁止复制根规则。

#### ADR：采用简短、版本化的决策记录

ADR 的维护者资料将其定义为记录重要架构决策及其上下文和后果的文档，并建议与代码一起纳入版本控制。[来源：Architecture Decision Record](https://github.com/joelparkerhenderson/architecture-decision-record)

本项目建议 `docs/00-project/decisions/ADR-NNN-title.md`，状态只用 `proposed / accepted / superseded / rejected`。每份包含 Context、Decision、Alternatives、Consequences、Verification、Supersedes。以下内容需要 ADR：

- workspace 与模块边界；
- Agent Loop / Durable Runtime 的具体选型；
- Artifact 和 Run 的持久化方式；
- ClassIn Adapter 的认证和写入模式；
- PII 记录、保留和脱敏策略；
- MCP/A2A 的引入。

纯 UI 微调、普通依赖升级和已在 feature spec 中明确的行为不写 ADR。

## 四、推荐仓库结构

以下结构是“终局可延伸、当前不过度建设”的目标。脚手架阶段只创建必要目录和最小入口，不需要为每个空模块写占位实现。

```text
classin-ai-buddy/
├── AGENTS.md
├── CLAUDE.md                    # 只指向 AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json                # project references
├── eslint.config.mjs
├── .env.example                 # 只放变量名和说明
├── apps/
│   ├── workbench/               # React/Vite 教师工作台
│   │   ├── src/
│   │   │   ├── app/             # composition、router、providers
│   │   │   ├── pages/           # 路由级组装
│   │   │   ├── features/        # goal、plan、artifact、approval、receipt
│   │   │   └── test/
│   │   └── package.json
│   └── api/                     # HTTP/SSE/BFF 与服务端组合根
│       ├── src/
│       │   ├── routes/
│       │   ├── composition/
│       │   └── server.ts
│       └── package.json
├── packages/
│   ├── domain/                  # 纯领域对象、状态机、不变量
│   ├── contracts/               # Zod schemas、DTO、event envelopes
│   ├── application/             # use cases、ports、事务边界
│   ├── harness/                 # 五模块协调，不绑定供应商 SDK
│   │   └── src/
│   │       ├── context/
│   │       ├── runtime/
│   │       ├── capabilities/
│   │       ├── control/
│   │       └── evaluation/
│   ├── artifacts/               # Artifact version、diff、validation
│   ├── policy/                  # tenant、权限、风险、审批、数据治理
│   ├── agent-runtime/           # 具体 Agent SDK/loop Adapter
│   ├── adapters/
│   │   ├── mock-classin/
│   │   ├── classin/             # 真实接口确认前可不创建
│   │   ├── knowledge/
│   │   ├── model/
│   │   └── persistence/
│   ├── evaluation/              # datasets、scorers、experiment contract
│   ├── observability/           # OTel 映射、redaction、metrics
│   ├── fixtures/                # 稳定 ID、可重置的模拟机构与课程
│   └── ui/                      # token、primitive、共享工作台组件
├── tests/
│   ├── architecture/            # 依赖方向与禁用 import
│   ├── contracts/               # 所有 Adapter 的 conformance suite
│   ├── integration/             # Harness + mock adapters
│   └── e2e/                     # Playwright 教师纵向旅程
├── docs/
│   ├── 00-project/              # brief、decision ledger、ADR
│   ├── 01-research/
│   ├── 02-product/
│   ├── 03-design/               # wireframe 原则、tokens、交互状态
│   ├── 04-specs/features/
│   ├── 05-engineering/          # standards、testing、security、harness
│   └── sessions/
└── reference/                   # 原始证据，不是当前规范
```

### 4.1 当前脚手架最小集合

第一次实施不应把上述树全部填满。最小集合为：

```text
apps/workbench
apps/api
packages/domain
packages/contracts
packages/harness
packages/adapters/mock-classin
packages/fixtures
packages/ui
tests/architecture
tests/contracts
tests/e2e
docs/00-project/decisions
docs/03-design
docs/04-specs/features/course-production
docs/05-engineering
```

当真实代码证明需要独立 public API 时，再从 `harness` 中提取 `artifacts`、`policy`、`evaluation` 或 `observability` package。目录不应提前替代模块设计。

## 五、依赖方向与事实所有权

### 5.1 允许的依赖方向

```text
apps/workbench -> packages/ui + packages/contracts
apps/api       -> packages/application + packages/contracts + composition
application    -> domain + contracts + ports
harness        -> application + domain + contracts
adapters       -> application ports + contracts
agent-runtime  -> harness ports + vendor SDK
evaluation     -> contracts + read-only event interfaces
observability  -> contracts + telemetry SDK
fixtures       -> contracts + domain builders
```

### 5.2 禁止方向

- `domain` 不依赖 React、Node HTTP、数据库、模型 SDK、MCP 或 mock；
- `contracts` 不依赖 apps、adapters 或 vendor SDK；
- `workbench` 不导入 `adapters/*` 或模型 SDK；
- `harness` 不直接访问数据库或 ClassIn API；
- `mock-classin` 不被业务组件直接 import，只在 API composition root 注入；
- `evaluation` 不修改正式业务对象；
- 任意 Capability 不得绕过 control module 直接执行副作用。

### 5.3 五个 Harness 深模块的代码归属

| 深模块 | 拥有 | 不拥有 |
| --- | --- | --- |
| Context | `ContextSnapshot` 装配、来源、权限过滤、过期 | 原始课程/学生事实、知识内容所有权 |
| Runtime | `WorkBuddyRun`、plan、step、wait/retry/resume | 课程、作业、消息等业务状态 |
| Capabilities | manifest、发现、输入输出校验、调用结果 | 审批决定、业务写入最终状态 |
| Control | action risk、approval、idempotency、execution receipt | 教学内容生成、业务事实副本 |
| Evaluation | evaluation event、dataset、score、反馈连接 | 修改原始证据、自动把推断写成学生标签 |

`Artifact` 是跨模块的一等对象：Capability 生成或修改，教师在 UI 审阅，Control 将其转为 ProposedAction，但其版本、来源和 validation 不能埋在聊天 message 中。

## 六、契约、事件与错误模型

### 6.1 第一批必须固化的 Schema

| Schema | 最小字段 |
| --- | --- |
| `TaskIntent` | `id`、teacher scope、goal、constraints、success criteria、missing fields、status |
| `WorkBuddyRun` | `id`、intent ref、plan version、state、current step、wait reason、timestamps |
| `ContextSnapshot` | identity scope、facts、knowledge refs、inferences、source/version/permission/expiry |
| `Artifact` / `ArtifactVersion` | type、content、source refs、validation、version、author、target object |
| `CapabilityManifest` | input/output schema、side effect、risk、permissions、timeout、cost class、owner |
| `CapabilityResult` | typed output、source refs、usage、warnings、structured error |
| `ProposedAction` | target、operation、diff、risk、reversible、idempotency key、approval requirement |
| `Approval` | action ref、actor、scope、decision、timestamp、reason |
| `ExecutionReceipt` | actual object ref/version、result、partial failures、undo info、provider request id |
| `EvaluationEvent` | run/step/artifact refs、metric、value、evaluator、dataset/version、timestamp |

所有外部输入在系统边界 `safeParse`。模型的结构化输出仍是不可信外部输入，不能因为 TypeScript 泛型声明而跳过校验。

### 6.2 事件信封

第一阶段使用进程内 append-only `RunEvent`，字段至少包括：

```text
eventId, eventType, eventVersion, occurredAt,
tenantId, actorId, runId, stepId?, artifactId?, actionId?,
correlationId, causationId, payload, truthLabel
```

事件名称使用完成时态，如 `run.started`、`context.snapshot_built`、`artifact.version_created`、`action.proposed`、`approval.granted`、`action.execution_failed`。事件用于恢复、UI projection、审计关联和评价，不公开模型隐藏推理。

CloudEvents 提供跨系统事件的通用属性规范。[来源：CloudEvents](https://cloudevents.io/)。当前无需强制所有进程内事件完全采用 CloudEvents；若未来上消息总线，可由 event publisher Adapter 映射，避免过早把传输标准变成领域模型。

### 6.3 错误分类

统一错误只使用可处理类别，不把供应商字符串直接传到 UI：

- `validation_error`：输入或模型输出不符合 schema；
- `permission_denied`：身份或对象范围不允许；
- `policy_blocked`：风险策略拒绝；
- `conflict`：对象版本或幂等冲突；
- `dependency_unavailable`：模型、知识或业务系统不可用；
- `timeout`：能力超过预算；
- `partial_failure`：批量动作部分成功；
- `cancelled`：教师或系统取消；
- `unknown`：保留原始 cause 于受限日志，不展示敏感细节。

每类错误必须声明 `retryable`、`teacherAction`、`safeMessage` 和可选 `retryAfter`。

## 七、模拟 Adapter 与未来真实集成

### 7.1 Port-first，而非 mock-first

先从业务用例定义 port，例如：

```text
CourseRepository.getCourse(scope, courseId)
CourseDraftGateway.saveDraft(action, approval)
KnowledgeGateway.search(query, scope)
ModelGateway.generateStructured(request, schema)
RunStore.append(events, expectedVersion)
```

`MockClassInAdapter` 和未来 `ClassInAdapter` 都实现同一 port。port 不应复制某个未知 ClassIn REST endpoint 的猜测，也不返回界面专用 shape。

### 7.2 确定性 fixtures

- 固定机构、教师、班级、课程、资料和版本 ID；
- 时钟和随机数可注入；
- 明确成功、权限拒绝、版本冲突、部分失败和超时场景；
- 每个场景可通过一个 seed 重置；
- fixture 标记 `SIMULATED`，不得显示为真实 ClassIn 数据；
- 测试内禁止调用真实模型或公网服务，除非明确属于单独的 evaluation job。

### 7.3 Adapter 契约测试

在 `tests/contracts` 建立共享 conformance suite：给任意 Adapter factory，验证相同输入、错误类别、幂等、版本冲突、权限和 receipt schema。当前跑 mock；真实 Adapter 可用后运行相同 suite。

Pact 官方用于 consumer-driven contract testing。[来源：Pact Docs](https://docs.pact.io/)。当 ClassIn provider API 由独立团队维护且能在 CI 验证 provider 时，再增加 Pact；当前共享 conformance suite 对内部 port 更直接。

## 八、安全、隐私与治理目录

### 8.1 必须进入代码而非 Prompt 的控制

- tenant / organization scope；
- role/object authorization；
- data minimization 和 source allowlist；
- capability allowlist；
- side-effect risk classification；
- approval policy；
- idempotency 和 version precondition；
- secret redaction；
- retention / deletion；
- audit event；
- prompt injection 后的工具参数重新校验。

OWASP LLM Application Top 10 将 prompt injection、敏感信息泄漏、不安全输出处理、过度代理等作为应用风险类别；NIST AI RMF 强调治理、测量和持续管理风险。[来源：OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)；[来源：NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)

### 8.2 学生与教师数据规则

- 原始证据、模型推断、教师确认结论是三类不同对象；
- 默认不把学生原文或 PII 写入 prompt/trace/eval dataset；
- evaluation sample 必须脱敏并记录授权、来源和保留期限；
- mock 数据不能使用真实学生姓名、账号或可回溯组合；
- 高风险沟通、评价、发布和批量动作默认人工确认；
- 所有业务写入只能通过对应事实所有者 Adapter，并返回实际 receipt。

## 九、测试与质量门禁

### 9.1 测试分层

| 层级 | 验证内容 | 不验证 |
| --- | --- | --- |
| Unit | 领域不变量、状态迁移、risk/approval policy、diff、schema | 网络与浏览器 |
| Contract | Adapter 对 port 的一致行为、错误、幂等、receipt | UI 布局 |
| Integration | Harness + mock adapters 的完整 Run、event 和恢复 | 真 ClassIn 可用性 |
| Architecture | 禁止依赖、package exports、循环依赖 | 业务正确性 |
| Component | UI variant、keyboard、a11y、长文本 | 跨页面旅程 |
| E2E | 目标到课程对象的教师旅程、异常恢复、截图 | 模型质量统计显著性 |
| Evaluation | 固定数据集上的结构正确性、教学 rubric、成本和安全 | UI 交互 |

### 9.2 架构测试

应自动失败的规则：

1. `domain` import React、Node、模型 SDK 或 Adapter；
2. `contracts` import app 或 vendor SDK；
3. `workbench` import server-only package；
4. feature 通过深路径访问另一个 package 的内部文件；
5. mock 代码进入 production composition；
6. capability 实现直接 import 写入型领域 Adapter 而绕过 control；
7. package dependency cycle；
8. `any`、未处理 promise、非穷尽 discriminated union 进入关键模块。

实现优先级：先用 package `exports` + ESLint import restrictions + 一个依赖图检查脚本；若规则增长，再评估 Nx enforce-module-boundaries 或专用 dependency-cruiser。不要仅靠目录命名期待 Agent 或人自动遵守。

### 9.3 原型进入下一阶段的门禁

- `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:contracts`、`pnpm test:architecture`、`pnpm test:e2e` 通过；
- 所有关键 UI 状态有稳定截图：default、loading、empty、error、permission、conflict、partial success；
- E2E 不使用固定 sleep；
- mock reset 可重复执行；
- 页面明确展示模拟真值标签；
- 无密钥和真实 PII 进入 repo、trace 或测试 artifact；
- 目标、计划、Artifact、Approval、Receipt 能通过 `runId` 串联；
- 原型代码中不存在直接模型调用或直接 ClassIn 数据写入。

## 十、原型隔离策略

“原型隔离”不等于另建一个最终丢弃的随意代码仓库。正确做法是保留生产形状的边界，同时把模拟实现封装在组合根：

```text
Browser -> Workbench UI -> API/BFF -> Application/Harness ports
                                      ├── Mock ClassIn Adapter
                                      ├── Deterministic Model Adapter
                                      └── In-memory Run Store
```

原型模式必须显式开启，例如 `APP_RUNTIME_MODE=prototype`；生产 build 默认不包含 mock composition。UI 只知道 `truthLabel`、source 和 receipt，不知道数据来自哪个 mock 文件。

建议两条执行轨：

- `prototype:deterministic`：固定模型结果，供产品走查、E2E 和截图；
- `prototype:live-model`：可选真实模型 Adapter，供受控体验实验，不进入稳定 E2E 基线。

这允许设计快速变化，同时保留未来替换真实 ClassIn Adapter 和 Agent runtime 的路径。

## 十一、与相邻 ClassIn 项目的适配

相邻项目已形成值得继承的本地约束：

| 本地实践 | 本项目处理 |
| --- | --- |
| `AGENTS.md` 单一规则源，`CLAUDE.md` 只链接 | 直接继承，防止双份规则漂移 |
| 用户要求 → 决策台账 → Feature Spec → 代码/测试 → 研究证据 | 继承并写入根规则 |
| `FACT / LOCKED / RECOMMENDATION / UNKNOWN / PLACEHOLDER` | 继承；WorkBuddy 另加运行时 `truthLabel` |
| `app/pages -> features -> domain` 依赖方向 | 扩展为 UI、application、harness、ports/adapters 的明确方向 |
| domain 纯 TypeScript | 直接继承 |
| Mock Adapter 只放在真实变化点 | 直接继承，并增加共享契约测试 |
| 语义 token、禁用任意硬编码视觉值 | 继承；当前使用中性线框 token，不锁定 ClassIn 品牌视觉 |
| 核心旅程 Playwright + 必要视觉验收 | 继承并加入 Run/Approval/Receipt 状态 |
| Placeholder 不伪装真实服务 | 强化为 `truthLabel` 和 prototype composition 隔离 |

需要修正的一点：相邻项目的规则高度针对既有 PC/移动端页面，不应整份复制。WorkBuddy 根规则应围绕教师统一工作台、Agent Harness、教学事实所有权、模拟机构和目标到课程生产切片重新编写。

## 十二、实施顺序

### Step 0：锁定规范

- 根 `AGENTS.md`、指针型 `CLAUDE.md`；
- Project Brief、Decision Ledger；
- ADR 模板；
- Engineering、Testing、Security、Design/Wireframe 四份短规范。

### Step 1：建立 workspace 和边界

- `apps/workbench`、`apps/api`；
- 最小 `domain/contracts/harness/mock-classin/fixtures/ui` packages；
- strict TypeScript、ESLint、package exports；
- architecture test 先失败再修通。

### Step 2：建立确定性纵向骨架

- `TaskIntent → WorkBuddyRun → ContextSnapshot → Artifact → ProposedAction → Approval → ExecutionReceipt`；
- 内存 RunStore 和 mock ClassIn Adapter；
- shared adapter conformance suite；
- UI 用事件 projection 展示计划和状态。

### Step 3：建立高仿真工作台

- 中性线框 token 和稳定布局尺寸；
- 每个能力域以代表场景高仿真，其余通过入口和 IA 表达；
- 优先实现目标澄清、计划、Artifact 编辑、来源、审批、回执；
- Playwright 验证完整教师旅程与异常状态。

### Step 4：再做技术选型 spike

- 用相同 contracts 比较原生 loop 与一个候选 Agent SDK；
- 用相同 events 比较内存 RunStore 与持久化实现；
- 用同一 evaluation dataset 比较模型或 prompt；
- 只有证据达到门槛才以 ADR 接受 SDK、Temporal、MCP 或 A2A。

## 十三、最终适配结论

1. 当前最科学的 AI-Native 结构不是“把所有前沿 Agent 框架装进仓库”，而是让产品定义、领域事实、Harness 契约、模拟/真实 Adapter、评价和 Agent 指令都拥有明确且可测试的位置。
2. `pnpm workspace + TypeScript strict + 模块化单体` 足以支撑第一条“目标到课程生产”纵向切片，并为后续增加 durable runtime、MCP、A2A 或真实 ClassIn Adapter 保留 seam。
3. 原型应该是 production-shaped prototype：交互和状态可以高仿真，数据可以模拟，但组件不能直接依赖 mock、模型或业务系统。
4. 当前 Harness 五模块保持不变；工程上补充 Artifact、policy、contracts、observability、fixtures 和 composition root，就能把架构判断变成可运行的验证骨架。
5. Agent-facing instructions 必须短、单一、可执行，并由测试和目录边界兑现；“AI Native”不是文档数量，而是 Agent 能快速找到事实、理解边界、运行验证并把结果写回单一事实源。

## 十四、主要一手来源索引

### 工程与仓库

- [pnpm Workspace](https://pnpm.io/workspaces)
- [Turborepo 官方仓库](https://github.com/vercel/turborepo)
- [Nx 官方仓库](https://github.com/nrwl/nx)
- [Nx Enforce Module Boundaries](https://nx.dev/features/enforce-module-boundaries)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Zod Documentation](https://zod.dev/)
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Playwright Isolation](https://playwright.dev/docs/browser-contexts)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Pact Documentation](https://docs.pact.io/)
- [Architecture Decision Record](https://github.com/joelparkerhenderson/architecture-decision-record)
- [AGENTS.md](https://agents.md/)

### Agent、协议与治理

- [OpenAI Agents SDK for JavaScript/TypeScript](https://github.com/openai/openai-agents-js)
- [Google ADK for TypeScript](https://github.com/google/adk-js)
- [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)
- [Pydantic AI](https://github.com/pydantic/pydantic-ai)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [Temporal TypeScript SDK](https://github.com/temporalio/sdk-typescript)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic)
- [Agent2Agent Protocol](https://github.com/a2aproject/A2A)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [CloudEvents](https://cloudevents.io/)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
