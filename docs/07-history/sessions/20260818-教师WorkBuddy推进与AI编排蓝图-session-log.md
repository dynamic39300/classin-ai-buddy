---
title: 教师 WorkBuddy 推进与 AI 编排蓝图 Session 日志
date: 2026-08-18
status: session log
truth: HISTORY
---

# 教师 WorkBuddy 推进与 AI 编排蓝图 Session 日志

## 文档说明

本文按时间顺序记录本次 Session 的主要用户输入、对应应答的核心摘要、判断和产出。

本文件用于会话追溯，不是当前产品或架构事实源。当前事实优先以 `docs/00-project/`、`docs/02-product/`、`docs/04-specs/` 和 `docs/06-architecture/` 为准。

用户 Prompt 原文按原始任务保留。用户曾发送的完整 `AGENTS.md` 规范不在本文重复复制，避免产生第二份规范；该 Prompt 的原文当前由仓库根目录 [AGENTS.md](../../../AGENTS.md) 唯一承载。

## Session 总览

| 项目 | 内容 |
| --- | --- |
| 工作目录 | `/Users/wangxinlei/Documents/claudecode/classin-ai-buddy` |
| Git 远端 | `git@github.com:dynamic39300/classin-ai-buddy.git` |
| 初始状态 | 空目录，随后完成 SSH Clone |
| 最终分支 | `main` |
| 关键前一提交 | `f487c63 docs: add AI orchestration blueprint` |
| 本 Session 主要主题 | 项目复盘、AI Orchestration 产品方向、蓝图文档和 Git 同步 |
| 日志状态 | 当前 Session 日志待本次提交推送 |

## 1. 拉取项目代码

### 用户 Prompt 原文

> 下载 Git，在 GitHub 目录里边 pull 代码  
> https://github.com/dynamic39300/classin-ai-buddy.git

### 用户补充 Prompt 原文

> git@github.com:dynamic39300/classin-ai-buddy.git

### 应答核心摘要

- 检查并确认 Git 已安装，版本为 `2.50.1`。
- HTTPS 连接 GitHub 时发生超时，改用用户提供的 SSH 地址。
- SSH 鉴权成功，GitHub 识别用户为 `dynamic39300`。
- 将项目克隆到当前目录 `/Users/wangxinlei/Documents/claudecode/classin-ai-buddy`。

### 产出与状态

- 项目成功进入当前工作目录。
- 默认分支为 `main`。
- 远端为 `origin`，Fetch 和 Push 均使用 SSH 地址。
- 初始仓库文件、文档、原型和 workspace 工程结构可见。

## 2. 仓库规范与项目复盘请求

### 用户 Prompt 原文

> # AGENTS.md instructions for /Users/wangxinlei/Documents/claudecode/classin-ai-buddy
>
> [用户在本条 Prompt 中粘贴了仓库根目录 `AGENTS.md` 的完整内容，并附带当前工作目录、Shell、日期、时区和文件系统环境信息。]

完整规范原文见 [AGENTS.md](../../../AGENTS.md)。本条 Prompt 的核心要求包括：遵守当前仓库唯一 Agent 规范、以锁定决策和 Spec 为事实优先级、区分产品逻辑/业务规则/Domain Knowledge/业务数据、使用 Module/Interface/Seam/Adapter 语言、保留用户已有修改，以及在研究、实现、验证和记录之间形成闭环。

### 用户随后输入的项目复盘 Prompt 原文

> 当前项目目录是这几天的工作产出，你可以详细阅读一下。
>
> 主要有以下几点：
>
> 1. 摸清楚这里面讲的到底是什么样的事情
> 2. 梳理我逐步推进产生的几个里程碑节点，以及各自当前的产出分别是什么，进行详细的梳理
> 3. 理解一下我们项目当前的所在状态是什么样的

### 应答核心摘要

把项目定位为“教师 WorkBuddy 的产品、Agent Harness 和工程纵向切片仓库”，而不是单纯的 UI 项目。

重点完成了以下工作：

- 阅读 `AGENTS.md`、Project Brief、Decision Ledger、README、CONTEXT 和历史索引；
- 沿 `docs/07-history/` 还原 2026-08-15 至 2026-08-17 的推进过程；
- 对照六件套、架构文档、Feature Spec、React 工作台、API、Mock Adapter 和 workspace 包；
- 区分“已经形成的产品/架构共识”“已经形成的工程骨架”和“真正跑通的端到端能力”。

### 形成的主要判断

1. 终局产品是统一教师 WorkBuddy 工作台和主 Agent 体验；ClassIn 是上下文、执行和结果反馈增强层。
2. 当前第一条纵向切片是“课程目标 → 课程对象”，使用固定、脱敏、可重置的模拟 ClassIn 数据。
3. 项目已经走完机会发现、战略收敛、产品蓝图和架构基线，进入阶段 D1。
4. 当前 React 原型能演示主路径和部分异常，但 UI 仍通过本地状态和计时器推进，没有真正串联 API、Harness、Adapter、Approval、Receipt 和 Evaluation。
5. Git 当时只有一个初始化提交，因此历史里程碑主要依据文档日期、阶段状态和过程记录还原，而不是依据细粒度 commit 还原。

### 主要参考产出

- [项目简报](../../00-project/PROJECT-BRIEF.md)
- [决策台账](../../00-project/DECISION-LEDGER.md)
- [项目当日里程碑复盘](../process-records/20260815-ClassIn教师WorkBuddy项目当日里程碑复盘.md)
- [课程生产六件套拆解](../../06-architecture/COURSE-PRODUCTION-SIX-PART-DECOMPOSITION.md)
- [课程目标到课程对象 Spec](../../04-specs/features/course-production/SPEC.md)

## 3. 关于下一步推进方向的讨论

### 用户 Prompt 原文

> 好，我感觉接下来进一步的推进有点模糊，但我对我的目的和想要的东西非常清楚。我的目标是，希望通过系统性的讨论和研究，明确以下三点：
>
> 1. 我们要做的是什么：一个教师的 Work Buddy（教师 AI 工作台），这个我觉得之前已经讨论清楚了。
> 2. 教师工作台所涉及的核心业务场景和 AI 能力：这些场景在整个业务链条中是如何分布的？关于 AI 能力要做什么，这个范围基本想清楚了，你可以参考我们当前文档里的梳理，以及另外一个项目目录（/Users/wangxinlei/Documents/claudecode/classin-pc-agentin）里我之前做过的梳理。
> 3. 该怎么去实现它：从产品经理的视角，该怎么去拆解这个系统的框架？
>
> 今天我研究了一天，觉得我似乎不应该把重心放在底层的 AI Agent 实现上，这个方向更偏技术层面。我认为更需要关注的是，在整条 AI 实现链路中：
> • 前端需要什么样的设计体验和特色功能？
> • 需要什么样的 Skill 资产？
> • 它是怎样一条设计的 AI 流程？
> • 需要什么样的业务系统数据接入？
> • 需要我们积累什么样的 Domain Knowledge（业务知识）？
>
> 我想把重点关注在这里，把这套 AI Orchestration（编排）——不管是多 Agent 编排还是 AI Pipeline（流水线）——给设计出来，从而实现这些 AI 场景。这是我特别想产出的东西。
>
> 接下来怎么去进一步实施呢？你看看你有什么建议和思路吗？

### 研究和对照工作

对照了两个项目的相关材料：

- 当前 WorkBuddy 项目的产品定义、三张核心图、Harness 架构、数据/知识/工具清单和课程切片拆解；
- `classin-pc-agentin` 中的教师业务时刻 AI 机会地图、教师 AI 工作台文章小结、AI Harness 协议和既有 ClassIn 领域对象。

### 应答核心摘要

认同用户把重心从“通用底层 Agent 平台”转移到“教师 AI 工作台的业务编排设计”，但补充一个关键区分：

> 不是不研究 Agent，而是不把 Agent 拓扑当作产品主问题。产品经理先定义教师任务如何被 AI 完成，工程再决定哪些环节使用 Pipeline、Skill、Tool、Copilot 或 Agent。

### 建议的七个产品 Module

1. 业务场景 Module；
2. AI 编排 Module；
3. Skill 资产 Module；
4. Context / Data Module；
5. Domain Knowledge Module；
6. Teacher Experience Module；
7. Evaluation Module。

### 统一 AI 编排主链

```text
教师目标
→ 范围与成功标准
→ 上下文和权限确认
→ 业务事实与证据读取
→ Domain Knowledge 检索
→ Skill / Tool 执行
→ 产物或判断草稿
→ 规则校验与证据检查
→ 教师编辑、确认或拒绝
→ 业务对象写回
→ 执行回执
→ 结果复查
→ 下一轮教学调整
```

### 关于实现形态的判断

- 固定步骤、规则明确的场景优先使用 Pipeline；
- 当前对象上下文中的建议和草稿使用 Copilot；
- 需要有限动态选择时使用 Orchestrator + Skill；
- 只有跨多个业务对象、持续运行、等待和复查的任务才成为有限 Agent 候选；
- 正式评分、敏感学生判断、外部沟通和正式发布保留教师控制。

### 建议的四条场景样板

1. 课程目标 → 课程对象；
2. 备课演练 → 教学改进；
3. 批改 → 订正；
4. 诊断 → 个性化干预。

它们分别用于验证课程产物、媒体证据、学生反馈以及跨业务对象执行，不建议一开始同时实现。

## 4. 形成 AI 编排蓝图文档

### 用户 Prompt 原文

> 你帮我把以上我的讨论和你的一些输入反馈总结成一份文档，放在我们的项目目录下。我觉得这个写得挺好的，是一个很好的、切实的落地思路和方向指引。

### 应答核心摘要

将前一轮讨论正式沉淀为产品层蓝图，不修改既有 `LOCKED` 决策。

### 产出文件

[教师 WorkBuddy AI 编排蓝图](../../02-product/AI-ORCHESTRATION-BLUEPRINT.md)

文档状态：

- `status: RECOMMENDATION`
- `truth: DESIGN`
- `version: v0.1`
- `date: 2026-08-18`

### 文档主要内容

- 当前 WorkBuddy 与 ClassIn 的产品共识；
- 产品经理要设计的七个 Module；
- 教师业务链条和 AI 能力分布；
- 统一 AI 编排主链；
- Pipeline、Copilot 和 Agent 的选择原则；
- 前端体验、Skill、业务数据和 Domain Knowledge 设计；
- 场景编排卡；
- 四条优先纵向场景；
- 阶段 A-D 推进顺序；
- G0-G3 决策门；
- 明确不做的事项和当前开放问题。

### 索引更新

更新 [产品设计索引](../../02-product/README.md)，加入 AI 编排蓝图链接。

## 5. Git 提交与推送蓝图文档

### 用户 Prompt 原文

> git commit & push

### 应答核心摘要

- 检查工作区，确认只有产品索引和 AI 编排蓝图两项变更；
- 运行 `git diff --check`，无 whitespace 错误；
- 提交到当前 `main` 分支；
- 使用 SSH 推送到 `origin/main`；
- 推送完成后确认本地 `HEAD` 和远端 `origin/main` 指向同一提交。

### 产出和提交信息

```text
Commit: f487c63 docs: add AI orchestration blueprint
Branch: main
Remote: origin/main
Status: clean and synchronized
```

提交包含：

- `docs/02-product/AI-ORCHESTRATION-BLUEPRINT.md`
- `docs/02-product/README.md`

## 6. 生成本 Session 日志

### 用户 Prompt 原文

> 你帮我把聊天内容生成一个日志文件（Session 的日志文件），包括我输入的 Prompt 原文，以及每一条应答对应的核心摘要信息和产出，做一个总结，形成一个日志。
>
> 更新之后，再进行 git commit and push。

### 本条任务的计划

- 在 `docs/07-history/sessions/` 创建本日志；
- 按顺序记录用户 Prompt 原文、应答摘要、判断和产出；
- 更新 Sessions 目录索引；
- 检查文档内容和 Git diff；
- 提交并推送本次日志变更。

### 本条任务的约束处理

用户发送的完整 `AGENTS.md` Prompt 不在本日志重复复制，避免同一规范存在两份副本。日志中保留了该 Prompt 的语义说明，并链接到仓库根目录的唯一原文。

### 预期产出

- 本文件：`docs/07-history/sessions/20260818-教师WorkBuddy推进与AI编排蓝图-session-log.md`；
- `docs/07-history/sessions/README.md` 中的索引条目；
- 本次日志对应的 Git commit 和远端推送记录。

## Session 最终结论

本次 Session 的核心推进不是增加一个新的 AI 功能，而是完成了产品问题的重新聚焦：

```text
教师 WorkBuddy
→ 教师业务场景
→ AI 编排流程
→ Skill 资产
→ 业务数据与工具
→ Domain Knowledge
→ 教师前端控制体验
→ 结果评价与复查
```

当前推荐的下一步是以“课程目标 → 课程对象”为第一条样板，将这套 AI 编排蓝图继续细化为场景编排卡、前端状态矩阵、Skill 契约、Context Pack、业务工具契约和评价事件，而不是先扩展通用多 Agent 平台。
