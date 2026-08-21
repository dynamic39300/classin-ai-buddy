---
title: ClassIn 教师 WorkBuddy 研究与分析资产回溯及阅读指南
status: RESEARCHED
truth: MIXED-SOURCE-INDEX
date: 2026-08-20
scope: docs/00-project, docs/01-research, docs/02-product, docs/04-specs, docs/06-architecture, docs/07-history
---

# ClassIn 教师 WorkBuddy 研究与分析资产回溯及阅读指南

## 0. 这份文档解决什么问题

当前仓库已经积累了四种不同性质的材料：当前事实源、研究证据、阶段交付原稿、过程与会话记录。它们记录了项目从战略问题恢复、产品定位、Agent Harness 研究，到课程生产纵向切片和 NineClaw 对标的完整演进，但不能以相同权重阅读。

本文完成三件事：

1. 按项目阶段还原每轮研究解决了什么问题、形成了什么结论、后来落到哪里；
2. 按主题把分散材料重新组织，指出重复、演进、未吸收和仍需验证的内容；
3. 提供 15 分钟、60 分钟、半天和专题深读四种阅读路线。

本文是导航和回溯，不替代当前项目、产品、Spec 或架构事实源，也不把历史判断重新升级为当前决策。

## 1. 阅读前先区分四个证据层级

| 层级 | 目录与代表文档 | 应当如何使用 | 冲突时的处理 |
|---|---|---|---|
| L0 当前事实与锁定决策 | `docs/00-project/`、`DECISION-LEDGER.md`、`ARCHITECTURE-BASELINE.md` | 判断项目现在是什么、正在做什么、哪些边界不能静默改变 | 优先级最高 |
| L1 当前设计与工作基线 | `docs/02-product/`、`docs/04-specs/`、`docs/06-architecture/` | 理解当前产品方案、首条切片和目标架构；注意 `RECOMMENDATION`、draft、SIMULATED 等状态 | 服从 L0；待审稿不能当 LOCKED |
| L2 研究证据 | `docs/01-research/source-notes/` | 追溯外部/内部证据、竞品事实、架构模式和未知项 | 只能支持建议，不能直接升级为业务规则 |
| L3 历史与过程 | `docs/07-history/` | 理解结论怎样形成、为什么转向，以及早期备选方案 | 与当前事实冲突时，以 L0/L1 为准 |

最容易产生误读的是：把 L3 的“当时建议”当成今天的产品承诺，或把 L2 的竞品实现当成 WorkBuddy 已采用的架构。

## 2. 截至 2026-08-20 的当前结论

如果只想先知道项目现在在哪里，可以把当前状态压缩成以下十点：

1. 产品终局是统一教师 WorkBuddy 工作台和主 Agent 体验，教师不选择内部 Agent、Skill、MCP 或模型。[项目简报](../00-project/PROJECT-BRIEF.md) · [D-001](../00-project/DECISION-LEDGER.md)
2. WorkBuddy 可以独立提供教师生产力；连接 ClassIn 后获得更深的课程、课堂、作业、互动和结果证据。[项目简报](../00-project/PROJECT-BRIEF.md)
3. ClassIn 保留教师、机构、课程、课堂、作业、消息和正式发布状态等业务事实；WorkBuddy 拥有 Run、ContextSnapshot、ArtifactDraft、ProposedAction、Approval、ExecutionReceipt 和评价事件。[架构基线](../06-architecture/ARCHITECTURE-BASELINE.md)
4. 全局业务关注三条核心结果链：作业到订正、备课演练到改进、诊断到干预；工程先用“课程目标到课程对象”建立共享骨架。[R-001](../00-project/DECISION-LEDGER.md)
5. 第一版交付可审教课程方案包，不生产 PPT，不正式发布，只做模拟草稿写回和回执；PPT 属于第二版。[R-002](../00-project/DECISION-LEDGER.md)
6. 第一版是单教师、单机构、单班级课程、单次 Run，使用固定、脱敏、可重置的模拟数据。[课程生产产品设计](../04-specs/features/course-production/PRODUCT-DESIGN.md)
7. Agent 生成路径与业务执行路径分离；任何写回必须经过 ProposedAction、策略、领域校验、教师审批、Adapter 和 ExecutionReceipt。[实现架构蓝图](../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)
8. 当前采用 `pnpm workspace + TypeScript strict + 模块化单体` 的 production-shaped prototype，不锁定模型供应商和重型编排框架。[D-007/D-008](../00-project/DECISION-LEDGER.md)
9. 原型是结构高保真、视觉低保真，重点验证状态、信息架构、教师控制和 Harness 映射，不是品牌 UI 或生产集成证明。[D-003/D-004](../00-project/DECISION-LEDGER.md)
10. NineClaw 的产品与 Skill 研究目前仍是新的研究输入；其中可吸收内容尚未全部升级到 WorkBuddy manifest、Skill 治理或决策台账。

## 3. 项目阶段回溯

### 阶段 0：恢复问题与建立双路径判断（2026-08-15）

**核心问题**：ClassIn WorkBuddy 到底解决什么业务问题，是增长项目、AI 工具集合，还是教师工作范式升级？

**研究方式**：把内部战略认知与外部独立判断分开，再用 ClassIn 公开资料和教与学 SOP 汇合。

**主要输入**：

- [历史会话导出](../07-history/sessions/历史会话导出_20260815.md)：恢复项目最早的分歧、已有资产和研究主线；
- [路径一：内部战略认知与关键假设](../07-history/process-records/路径一_内部战略认知与关键假设_20260815.md)：还原内部动因、增长意图、产品假设和组织张力；
- [路径二：ClassIn 业务与 AI 战略独立判断](../07-history/process-records/路径二_ClassIn业务与AI战略独立判断_20260815.md)：从公开事实独立推导业务机会、首个场景和推进方式；
- [ClassIn 公开资料研究](./source-notes/public_research_classin_20260815.md)：公司、产品线、商业模式、AI 阶段和公开证据缺口；
- [ClassIn 教与学 SOP 及 AI 能力共识输入](./source-notes/ClassIn教与学SOP及AI能力共识输入_20260815.md)：把师生业务还原为目标—准备—发生—证据—诊断—干预—反馈循环；
- [两条路径汇合](../07-history/process-records/汇合_ClassIn_WorkBuddy项目起点_20260815.md)和[共识结论](../07-history/process-records/共识结论_ClassIn教师WorkBuddy_20260815.md)：形成当时的共同起点。

**阶段结论**：

- 第一用户是教师，价值需要穿透学生、家长和机构；
- ClassIn 的差异不是“有数据”，而是处在教学事实发生、证据形成和动作回写的闭环位置；
- AI 必须保持教师专业控制权；
- 愿景 Demo 与真实验证原型要分轨；
- 当时业务验证优先建议是“课后 10 分钟教学闭环”。

**后来怎样变化**：课后闭环仍保留为战略核心结果链，但工程第一刀在 8 月 16 日改为“课程目标到课程对象”。原因不是否定课后价值，而是课程生产基础链能在没有真实学生数据/API 的情况下先验证 Run、Context、Artifact、审批、写回和评价骨架。

### 阶段 A：终局产品与业务蓝图（2026-08-15）

**核心问题**：既然终局不是单点工具，怎样表达完整产品但又不把愿景当成已实现？

**主要产出**：

- [阶段共识与下一阶段六件套](../07-history/stage-deliverables/20260815-ClassIn教师WorkBuddy阶段共识与下一阶段六件套.md)：定义六件套之间的关系；
- [终局教师 WorkBuddy 产品定义](../07-history/stage-deliverables/01-终局教师WorkBuddy产品定义_20260815.md)：统一工作台、目标用户、能力域和边界；
- [三张核心图](../07-history/stage-deliverables/02-ClassIn教师WorkBuddy三张核心图_20260815.md)：终局体验、对象与上下文、自主性成熟度三个正交视图；
- [当日里程碑复盘](../07-history/process-records/20260815-ClassIn教师WorkBuddy项目当日里程碑复盘.md)：记录从上下文恢复到六件套形成的九个节点。

**阶段结论**：以终为始建立低分辨率全局蓝图，以纵向场景逐步提高局部分辨率；教师结果而不是 Agent 数量是产品主索引。

**当前落点**：[项目简报](../00-project/PROJECT-BRIEF.md)、D-001、D-005 和全局六个能力域。

### 阶段 B：Harness、数据和工程基座（2026-08-16）

**核心问题**：统一主 Agent 背后需要什么系统边界；哪些是通用模式，哪些只是框架能力？

**主要研究**：

- [Agent Harness 成熟架构模式与教师 AI 产品研究](./source-notes/industry_research_agent_harness_patterns_20260816.md)：Agent Loop、状态图、Temporal、MCP、A2A 与教师 AI 产品横向比较；
- [开源 Agent 与 Harness 架构全景研究](./source-notes/industry_research_open_source_agent_harness_landscape_20260816.md)：12 类开源项目和协议的统一架构对比；
- [AI-Native 工程规范与仓库结构研究](./source-notes/engineering_research_ai_native_repository_standards_20260816.md)：monorepo、契约、Adapter、测试、治理、ADR 和 Agent-facing instructions。

**主要阶段产出**：

- [Agent Harness 架构](../07-history/stage-deliverables/03-教师WorkBuddy-Agent-Harness架构_20260816.md)；
- [ClassIn 数据、知识、上下文与工具清单](../07-history/stage-deliverables/04-ClassIn数据知识上下文与工具清单_20260816.md)；
- [终局愿景 Demo 体验脚本](../07-history/stage-deliverables/05-教师WorkBuddy终局愿景Demo体验脚本_20260816.md)；
- [分阶段纵向切片与评价门槛](../07-history/stage-deliverables/06-教师WorkBuddy分阶段纵向切片与评价门槛_20260816.md)；
- [阶段 D 交互原型与技术基座实施计划](../07-history/stage-deliverables/07-教师WorkBuddy阶段D交互原型与技术基座实施计划_20260816.md)；
- [高保真原型与 Harness 映射框架](../07-history/stage-deliverables/08-教师WorkBuddy高保真原型与Agent-Harness映射框架_20260816.md)。

**阶段结论**：

- 五个 Harness 深模块方向稳定：Context、Runtime、Capability、Control、Evaluation；
- 需要共享技术基座补齐 Artifact、持久状态、事件、策略、可观测和 UI 投影；
- Agent Loop、状态图、Durable Workflow、MCP 和 A2A 是不同层次的组合，不应由单一框架包办；
- Skill、业务 Tool、Domain Knowledge、业务事实和产品逻辑必须分开拥有；
- 项目选择 production-shaped prototype，先稳定 Interface 和 Adapter seam。

**当前落点**：[架构基线](../06-architecture/ARCHITECTURE-BASELINE.md)、D-002 至 D-008、[工程规范](../05-engineering/ENGINEERING-STANDARDS.md)和[系统理解与交付地图](../06-architecture/SYSTEM-UNDERSTANDING-AND-DELIVERY-MAP.md)。

### 阶段 C：内部案例校准（2026-08-17）

**核心问题**：前述 Harness 蓝图能否在真实教育 AI 项目中找到可运行证据？

**主要研究**：[新版 AI 学情与 Agent Harness 内部案例系统研究](./source-notes/internal_case_ai_learning_agent_harness_20260817.md)。

**新增认识**：

- 产品任务必须先收敛，Harness 才能形成深 Module；
- 统一数据访问 Tool 可以隐藏大量脚本和参数复杂度；
- Context、Memory、Skill、Tool 不能统称 Prompt；
- 轨迹应同时服务调试、Evaluation、成本和回归；
- 是否需要 Sandbox 取决于任务和 Tool 边界，不是意识形态选择。

**不能迁移的部分**：案例主要证明只读学情查询和报告生成，不能证明带业务副作用的审批、幂等、部分成功、撤销和 ExecutionReceipt。

**当前落点**：五模块未被推翻，但写回控制、评价、可观测和 Adapter 契约被进一步加强。

### 阶段 D：业务编排与产品设计框架（2026-08-18）

**核心问题**：怎样从终局能力地图收敛到可设计、可比较、可交付的业务场景？

**主要研究与分析**：

- [希沃 AI 教育全场景方案研究](./source-notes/seewo_ai_education_full_scenario_solution_20260818.md)：验证“场景先于 Agent”、课前课中课后证据循环、Artifact 复用和教师确认；
- [AI 编排蓝图](../02-product/AI-ORCHESTRATION-BLUEPRINT.md)：提出七个产品 Module 和统一编排主链；
- [核心业务闭环与能力优先矩阵](../02-product/CORE-BUSINESS-LOOP-PRIORITY-MATRIX.md)：区分业务战略优先级和工程验证顺序；
- [全量能力覆盖矩阵](../02-product/CAPABILITY-COVERAGE-MATRIX.md)：将每项能力映射到 Artifact、Harness、规则、知识、数据/API、异常和真值；
- [WorkBuddy“是什么”与“做什么”阶段总结](../07-history/stage-deliverables/09-教师WorkBuddy是什么与做什么阶段总结_20260818.md)。

**阶段结论**：

- 全局按三条核心业务结果链组织，工程按四条纵向切片推进；
- 产品设计层与技术实现层分离，但通过 Scenario、Artifact、State、Evaluation 串联；
- Skill 的价值是复用教育方法和结构化任务，不是把每个 Prompt 或模型包装成 Agent；
- 产品经理需要同时设计场景、编排、Skill、Context/Data、Domain Knowledge、教师控制和评价。

**当前落点**：R-001、[产品设计索引](../02-product/README.md)和后续场景设计框架。

### 阶段 E：首条切片从产品到实现（2026-08-19）

**核心问题**：怎样把“课程目标到课程对象”从愿景拆成可审阅的第一版产品、Feature Spec 和实现架构？

**主要分析**：

- [业务场景产品设计框架](../02-product/SCENARIO-PRODUCT-DESIGN-FRAMEWORK.md)及[附图](../02-product/SCENARIO-PRODUCT-DESIGN-DIAGRAMS.md)、[附表](../02-product/SCENARIO-PRODUCT-DESIGN-TABLES.md)；
- [整体产品方案设计](../04-specs/features/course-production/OVERALL-PRODUCT-SOLUTION-DESIGN.md)；
- [第一版产品设计](../04-specs/features/course-production/PRODUCT-DESIGN.md)、[附图](../04-specs/features/course-production/PRODUCT-DESIGN-DIAGRAMS.md)、[附表](../04-specs/features/course-production/PRODUCT-DESIGN-TABLES.md)；
- [纵向切片 Spec](../04-specs/features/course-production/SPEC.md)和[Feature Spec](../04-specs/features/course-production/FEATURE-SPEC.md)；
- [课程生产六件套拆解](../06-architecture/COURSE-PRODUCTION-SIX-PART-DECOMPOSITION.md)；
- [系统理解与交付地图](../06-architecture/SYSTEM-UNDERSTANDING-AND-DELIVERY-MAP.md)；
- [业务流程驱动的实现架构蓝图](../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)。

**阶段结论**：

- 第一版核心 Artifact 从“具体 PPT”收敛为“可审教课程方案包”；
- 审教、版本、Diff、最终确认、保存审批和业务回执成为一等状态；
- 页面只发 Command、读 ViewModel；场景 Workflow 隐藏顺序、状态和恢复；
- Skill 只能生成草稿，不能拥有权限判断、正式状态或写回；
- 当前实现架构蓝图仍为 `D0 review draft`，Feature Spec 仍待产品审阅。

**过程证据**：[业务场景产品设计框架与课件审教迭代 Session](../07-history/sessions/20260819-业务场景产品设计框架与课件审教迭代-session-log.md)和[从产品设计到实现架构蓝图 Session](../07-history/sessions/20260819-从产品设计到实现架构蓝图-session-log.md)。

### 阶段 F：NineClaw 产品与 Skill 深拆（2026-08-19—20）

**核心问题**：一个已安装的教师桌面 Agent 如何组织本地 Harness、产品交互和 Skill 资产，哪些可以迁移到 WorkBuddy？

**三轮研究**：

1. [本地架构与 Skill 资产设计](./source-notes/product_research_nineclaw_local_architecture_and_skills_20260819.md)：安装层、运行数据层、工作区投影、Agent SDK 与 Skill 生命周期；
2. [产品设计与交互研究](./source-notes/product_research_nineclaw_product_design_and_interaction_20260820.md)：信息架构、Feature inventory、端到端操作链、内容广场、定时任务和教师生产力体验；
3. [Skill 全量目录与交叉验证](./source-notes/product_research_nineclaw_skill_catalog_and_cross_validation_20260820.md)：23 个本地 Skill 的结构、实现深度、UI × 源码对齐和安全风险。

**可迁移认识**：

- Skill 可以是 `instructions + references + assets + scripts + evals` 的可携带深模块；
- 应用级中心仓库、工作区投影、会话发现和 Artifact 输出是有效分层；
- 统一任务 Agent 可以隐藏内部 Skill 拓扑；
- Skill 启用集合、单次选择、安装来源和运行版本应分开建模。

**不能直接复制**：

- 自然语言 description 不能同时承担路由、授权和安全策略；
- 可执行脚本、宿主环境、明文 `.env`、动态依赖安装和同 ID 覆盖不适合学生数据场景；
- 内容广场/Skill 市场不是当前 WorkBuddy 教师入口；
- 能力包存在只证明静态资产，不证明教育质量、服务可用性或生产安全。

**当前状态**：这些结论尚未全部回写当前 Skill manifest、Capability Registry 和治理 Spec，应视为下一轮设计输入，而不是已采用实现。

## 4. 按主题归类

### 4.1 战略、市场与产品定位

**建议阅读链**：

1. [ClassIn 公开资料研究](./source-notes/public_research_classin_20260815.md)
2. [路径一：内部战略认知](../07-history/process-records/路径一_内部战略认知与关键假设_20260815.md)
3. [路径二：独立战略判断](../07-history/process-records/路径二_ClassIn业务与AI战略独立判断_20260815.md)
4. [两条路径汇合](../07-history/process-records/汇合_ClassIn_WorkBuddy项目起点_20260815.md)
5. [终局产品定义](../07-history/stage-deliverables/01-终局教师WorkBuddy产品定义_20260815.md)
6. [当前项目简报](../00-project/PROJECT-BRIEF.md)

**演进主线**：从“AI 拉新/教师入口”争议，收敛为“统一教师工作台 + ClassIn 深连接器”；独立入口还是主要情境入口仍是开放问题。

### 4.2 教与学业务循环、能力地图和优先级

**建议阅读链**：

1. [ClassIn 教与学 SOP](./source-notes/ClassIn教与学SOP及AI能力共识输入_20260815.md)
2. [三张核心图](../07-history/stage-deliverables/02-ClassIn教师WorkBuddy三张核心图_20260815.md)
3. [分阶段纵向切片与评价门槛](../07-history/stage-deliverables/06-教师WorkBuddy分阶段纵向切片与评价门槛_20260816.md)
4. [核心业务闭环与优先矩阵](../02-product/CORE-BUSINESS-LOOP-PRIORITY-MATRIX.md)
5. [全量能力覆盖矩阵](../02-product/CAPABILITY-COVERAGE-MATRIX.md)

**演进主线**：从功能大全，转向证据循环；再从完整生命周期，收敛到三条业务结果链和四条工程切片。

### 4.3 Agent Harness 与运行架构

**建议阅读链**：

1. [Harness 成熟模式研究](./source-notes/industry_research_agent_harness_patterns_20260816.md)
2. [开源 Harness 全景研究](./source-notes/industry_research_open_source_agent_harness_landscape_20260816.md)
3. [内部 AI 学情案例](./source-notes/internal_case_ai_learning_agent_harness_20260817.md)
4. [历史 Agent Harness 架构](../07-history/stage-deliverables/03-教师WorkBuddy-Agent-Harness架构_20260816.md)
5. [当前架构基线](../06-architecture/ARCHITECTURE-BASELINE.md)
6. [实现架构蓝图](../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)

**演进主线**：五个深模块保持稳定；后来补出 Artifact、持久状态、策略、事件、可观测和 UI 投影，并把生成路径与执行路径明确分流。

### 4.4 Skill、Capability、Tool 与 Domain Knowledge

**建议阅读链**：

1. [数据、知识、上下文与工具清单](../07-history/stage-deliverables/04-ClassIn数据知识上下文与工具清单_20260816.md)
2. [AI 编排蓝图第七至九节](../02-product/AI-ORCHESTRATION-BLUEPRINT.md)
3. [课程生产六件套拆解](../06-architecture/COURSE-PRODUCTION-SIX-PART-DECOMPOSITION.md)
4. [NineClaw 本地架构与 Skill](./source-notes/product_research_nineclaw_local_architecture_and_skills_20260819.md)
5. [NineClaw Skill 全量审计](./source-notes/product_research_nineclaw_skill_catalog_and_cross_validation_20260820.md)

**演进主线**：Skill 从早期的能力名/Prompt 包，逐步被定义为有输入输出、方法、校验、错误和评价契约的深 Module；NineClaw 进一步提供了物理资产包证据，但治理契约尚未回写当前基线。

### 4.5 Context、Memory、数据、知识与安全治理

**建议阅读链**：

1. [ClassIn 教与学 SOP](./source-notes/ClassIn教与学SOP及AI能力共识输入_20260815.md)
2. [数据、知识、上下文与工具清单](../07-history/stage-deliverables/04-ClassIn数据知识上下文与工具清单_20260816.md)
3. [内部 AI 学情案例第 8—10 节](./source-notes/internal_case_ai_learning_agent_harness_20260817.md)
4. [架构基线](../06-architecture/ARCHITECTURE-BASELINE.md)
5. [课程生产 Feature Spec](../04-specs/features/course-production/FEATURE-SPEC.md)

**稳定原则**：事实、知识、偏好和推断分离；最小授权投影进入模型；学生推断不能升级为业务事实；写回以审批和回执证明。

### 4.6 竞品与内部案例

| 研究对象 | 最适合回答的问题 | 不能证明什么 |
|---|---|---|
| ClassIn 公开产品 | 公司与产品公开阶段、已有 AI 工作流、商业与证据缺口 | 内部经营质量和未公开 Harness |
| 希沃 | 教育全场景怎样按工作阶段、终端、对象和证据循环组织 | 后端真实 Agent 架构和生产成熟度 |
| 内部 AI 学情项目 | 只读数据查询、报告、Context、Tool、Eval 怎样形成可运行 Harness | 高风险写回、撤销和跨对象副作用 |
| NineClaw | 教师桌面 Agent、Skill 资产包、工作区投影和内容生态 | ClassIn 领域闭环、机构治理和学生数据安全 |

### 4.7 场景产品设计与首条切片

**建议阅读链**：

1. [业务场景产品设计框架](../02-product/SCENARIO-PRODUCT-DESIGN-FRAMEWORK.md)
2. [课程生产整体产品方案](../04-specs/features/course-production/OVERALL-PRODUCT-SOLUTION-DESIGN.md)
3. [第一版产品设计](../04-specs/features/course-production/PRODUCT-DESIGN.md)
4. [Feature Spec](../04-specs/features/course-production/FEATURE-SPEC.md)
5. [实现架构蓝图](../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)

**演进主线**：从“目标到课程对象/课件”收敛为“可审教课程方案包”；PPT、正式发布和真实学生判断全部后移。

### 4.8 AI-Native 工程与仓库治理

**建议阅读链**：

1. [AI-Native 工程研究](./source-notes/engineering_research_ai_native_repository_standards_20260816.md)
2. [ADR-001](../00-project/decisions/ADR-001-workspace-and-prototype-shape.md)
3. [工程目录规范](../05-engineering/PROJECT-STRUCTURE.md)
4. [工程规范](../05-engineering/ENGINEERING-STANDARDS.md)
5. [前端](../05-engineering/FRONTEND-STANDARDS.md)、[后端/Harness](../05-engineering/BACKEND-STANDARDS.md)、[测试](../05-engineering/TESTING-STANDARDS.md)

**演进主线**：研究建议已经大部分升级为 D-008、ADR 和工程规范，因此实现时应读当前标准，只有追溯理由时再读研究底稿。

## 5. 关键转向、表面冲突与正确解释

| 议题 | 早期表述 | 当前表述 | 判断 |
|---|---|---|---|
| 第一刀做什么 | 8 月 15 日优先“课后 10 分钟教学闭环” | 工程首条切片锁定“课程目标到课程对象” | 不是战略否定；前者是业务价值候选，后者是无真实数据条件下的架构证明顺序 |
| 产品入口 | 早期讨论独立 App、Today 工作台或 ClassIn 情境入口 | 终局统一工作台已锁定，主要分发入口仍开放 | 产品壳已定，渠道/分发未定 |
| 原型保真度 | 历史阶段 D 多次使用“高保真原型” | 当前锁定“结构高保真、视觉低保真” | “高保真”被精确定义为流程、状态与控制，不是品牌视觉 |
| 第一版产物 | 历史材料包含课程/课件/PPT 叙事 | 第一版只交付可审教课程方案包，PPT 后移 | R-002 是当前边界，历史 Demo 不能扩大范围 |
| Harness 模块数 | 五个深模块 | 五模块 + 共享技术基座 + 六类稳定契约 | 深模块未推翻；部署与治理要素被补齐 |
| Skill 的角色 | 早期有“3 个核心 Skill”、功能名或 Prompt 化倾向 | 深 Module，只生成 R0/R1 结果；权限、写回和正式状态不属于 Skill | 当前架构定义优先 |
| Agent 自主性 | 愿景中覆盖长链路规划与执行 | 当前只验证有限 Agent，所有副作用显式审批和回执 | 从愿景叙事收敛为可治理状态机 |
| 数据与 Memory | 早期强调长期理解老师、班级和学生 | 事实、偏好、推断、知识分离；最小授权投影，禁止无治理长期记忆 | 当前安全与事实所有权原则优先 |
| 竞品迁移 | 希沃/NineClaw 展示了广能力和市场/内容入口 | WorkBuddy 默认隐藏内部能力拓扑，不建设插件市场 | 竞品只提供证据和模式，不决定产品 IA |

## 6. 尚未闭合的研究问题

以下问题在多份文档中重复出现，截至当前仍不能视为已解决：

1. 第一批真实教师、机构、学科、课程和试点规模；
2. 真实 ClassIn API、对象版本、草稿/发布语义、权限、幂等、撤销和逐项回执能力；
3. 独立 WorkBuddy 与 ClassIn 情境入口的主要分发关系；
4. 无 ClassIn 与有 ClassIn 两种模式是否共享完全相同的核心对象模型；
5. 第一条真实试点以教师效率、产物质量、持续采用还是教学结果为主要指标；
6. 可进入首批 Domain Knowledge 的课程标准、教学法、机构规范和评价量规及其版本责任；
7. 哪些低风险动作可预授权，哪些永久逐次审批；
8. 教师确认的诊断结论、AI 假设、用户偏好和长期记忆如何分别存储、过期和审计；
9. 当前实现架构蓝图能否在另外三条优先切片中保持同样的 Module/Interface 边界；
10. NineClaw 研究提出的 Skill manifest、来源、完整性、权限、评测和运行快照怎样落成 WorkBuddy 契约。

## 7. 推荐阅读路线

### 7.1 15 分钟：先建立当前认知

1. 本文第 1、2、5、6 节；
2. [项目简报](../00-project/PROJECT-BRIEF.md)；
3. [决策台账](../00-project/DECISION-LEDGER.md)；
4. [架构基线](../06-architecture/ARCHITECTURE-BASELINE.md)。

完成后应能回答：产品是什么、当前做什么、谁拥有事实、哪些建议还没锁定。

### 7.2 60 分钟：理解当前产品与实现链

1. [AI 编排蓝图](../02-product/AI-ORCHESTRATION-BLUEPRINT.md)的结论、统一主链、Skill、Context/Data 和决策门；
2. [核心业务闭环与优先矩阵](../02-product/CORE-BUSINESS-LOOP-PRIORITY-MATRIX.md)；
3. [课程生产整体产品方案](../04-specs/features/course-production/OVERALL-PRODUCT-SOLUTION-DESIGN.md)；
4. [课程生产 Feature Spec](../04-specs/features/course-production/FEATURE-SPEC.md)；
5. [实现架构蓝图](../06-architecture/WORKBUDDY-IMPLEMENTATION-ARCHITECTURE-BLUEPRINT.md)。

完成后应能从教师任务一路追踪到 Artifact、审批、Adapter、Receipt 和 Evaluation。

### 7.3 半天：理解项目为什么走到这里

1. [当日里程碑复盘](../07-history/process-records/20260815-ClassIn教师WorkBuddy项目当日里程碑复盘.md)；
2. [阶段共识与六件套](../07-history/stage-deliverables/20260815-ClassIn教师WorkBuddy阶段共识与下一阶段六件套.md)；
3. [终局产品定义](../07-history/stage-deliverables/01-终局教师WorkBuddy产品定义_20260815.md)；
4. [三张核心图](../07-history/stage-deliverables/02-ClassIn教师WorkBuddy三张核心图_20260815.md)；
5. [历史 Harness 架构](../07-history/stage-deliverables/03-教师WorkBuddy-Agent-Harness架构_20260816.md)；
6. [数据、知识、上下文与工具清单](../07-history/stage-deliverables/04-ClassIn数据知识上下文与工具清单_20260816.md)；
7. 再回到当前[决策台账](../00-project/DECISION-LEDGER.md)对照哪些内容已经锁定、哪些被降级。

### 7.4 专题深读

- **想研究 Agent/Harness**：Harness 两轮外部研究 → 内部案例 → 架构基线 → 实现架构蓝图；
- **想研究 Skill 资产**：AI 编排蓝图 → 课程六件套 → NineClaw 本地架构 → 23 Skill 交叉验证；
- **想研究产品全景**：ClassIn SOP → 终局产品定义 → 希沃研究 → 能力优先矩阵；
- **想研究首条切片**：场景产品设计框架 → 整体产品方案 → 第一版产品设计 → Feature Spec → 实现架构；
- **想研究战略起点**：路径一 → 路径二 → 两条路径汇合 → 当前项目简报；
- **想研究过程决策**：只在上述文档仍不能解释“为什么”时，再读 `docs/07-history/sessions/`。

## 8. 全量研究底稿目录

| 文档 | 日期 | 主题 | 当前角色 |
|---|---|---|---|
| [ClassIn 公开资料研究](./source-notes/public_research_classin_20260815.md) | 08-15 | 公司、产品、商业、AI 阶段 | 外部事实输入；时间敏感 |
| [ClassIn 教与学 SOP](./source-notes/ClassIn教与学SOP及AI能力共识输入_20260815.md) | 08-15 | 教学循环、对象、AI 边界 | 业务模型输入 |
| [Harness 成熟架构模式](./source-notes/industry_research_agent_harness_patterns_20260816.md) | 08-16 | 通用 Harness 与教师 AI 产品 | 架构模式输入 |
| [开源 Harness 全景](./source-notes/industry_research_open_source_agent_harness_landscape_20260816.md) | 08-16 | 12 类项目/协议 | 完备性复核输入 |
| [AI-Native 工程研究](./source-notes/engineering_research_ai_native_repository_standards_20260816.md) | 08-16 | 仓库、契约、测试、治理 | 已大部吸收进工程基线 |
| [内部 AI 学情案例](./source-notes/internal_case_ai_learning_agent_harness_20260817.md) | 08-17 | 教育场景 Harness 实践 | 内部案例校准 |
| [希沃全场景方案](./source-notes/seewo_ai_education_full_scenario_solution_20260818.md) | 08-18 | 教育全链路竞品 | 产品链路输入 |
| [NineClaw 本地架构与 Skill](./source-notes/product_research_nineclaw_local_architecture_and_skills_20260819.md) | 08-19 | 桌面 Harness、Skill 生命周期 | Skill 设计输入 |
| [NineClaw 产品与交互](./source-notes/product_research_nineclaw_product_design_and_interaction_20260820.md) | 08-20 | IA、功能、交互、内容生态 | 产品对标输入 |
| [NineClaw Skill 全量审计](./source-notes/product_research_nineclaw_skill_catalog_and_cross_validation_20260820.md) | 08-20 | 23 Skill、实现与风险 | 最新交叉验证输入 |

## 9. 历史资料目录与阅读价值

### 9.1 阶段交付原稿

`docs/07-history/stage-deliverables/` 的 10 份材料保存“当时完整方案”。其中 01—08 是 8 月 15—16 日终局产品、核心图、Harness、数据、Demo、切片和阶段 D 计划；09 是 8 月 18 日产品层总结；“阶段共识与六件套”是整组材料的总入口。

阅读价值：理解完整思想框架。使用限制：范围、切片、原型保真度和 PPT 边界应以当前决策与 Spec 为准。

### 9.2 过程记录

`docs/07-history/process-records/` 的 6 份材料保存讨论日志、内部/外部双路径、汇合、共识和里程碑复盘。

阅读价值：理解为什么从“AI 工具/拉新”转向教师结果和业务闭环。使用限制：其中的 90 天计划、第一场景和指标是当时建议，不是当前排期承诺。

### 9.3 Session 日志

`docs/07-history/sessions/` 的 4 份材料保存原始或整理后的会话：8 月 15 日上下文恢复、8 月 18 日 AI 编排蓝图、8 月 19 日产品设计框架与课件审教、8 月 19 日实现架构蓝图。

阅读价值：当正式文档不能解释措辞和取舍时追溯原始上下文。使用限制：会话不是事实源，不建议作为第一阅读入口。

## 10. 后续维护规则

1. 新研究先进入 `docs/01-research/source-notes/`，保留来源、日期、事实/判断/未知边界；
2. 被项目采纳的结论必须回写 `00-project`、`02-product`、`04-specs`、`05-engineering` 或 `06-architecture`；
3. 每轮研究结束时更新本文的阶段、主题、未闭合问题和“当前落点”；
4. 竞品新增功能、软件版本、价格、SDK 和协议属于时间敏感事实，复用前重新核验；
5. 历史资料只增加索引和勘误，不静默改写当时观点；
6. 相同结论不要在多个当前事实源中重复维护：决策写台账，业务能力写产品层，行为写 Spec，Module/Interface 写架构层；
7. 下一轮最值得新增的专题不是继续扩展竞品列表，而是完成真实 ClassIn 对象/API/权限审计，以及把 NineClaw 研究转成 WorkBuddy Skill/Capability 治理契约。
