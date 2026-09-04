---
title: Slack × ClassIn Online × Demo IM 能力桥接分析
status: PHASE_4_2B_COMPLETE_PENDING_USER_REVIEW
version: v0.1
date: 2026-08-30
research_program: ClassIn IM 功能全景与竞品研究 / Phase 4.2B
---

# Slack × ClassIn Online × Demo IM 能力桥接分析

> 事实快照：2026-08-30（Asia/Shanghai）  
> 输入基线：已审阅 Slack 241 项原子 Feature、线上 ClassIn 104 项 Feature、Demo 86 项 Feature  
> 输出性质：`RECOMMENDATION / UNPRIORITIZED`；不修改 Feature Spec、工程范围或 `LOCKED` 决策  
> 暂停项：Microsoft Teams `4.3`、Discord `4.4` 均为 `PAUSED_BY_USER`

## 0. 结论先行

本阶段完成的不是“照抄 Slack 功能”，而是把三个不同真值层连接起来：

```text
Slack 竞品事实（241 项，官方一手证据）
        ↓ 可比任务、对象与治理机制
ClassIn Online（104 项，当前生产事实）
        ↓ 当前 Demo 覆盖、增量与成熟度
ClassIn Demo（86 项，本地/Mock/Placeholder/Policy/Dormant）
        ↓
差距主题 + ClassIn 教育原生优势 + 未排序候选长名单
```

桥接后的核心认识有六点：

1. **Slack 的领先不是“消息能发得更多”，而是把通信继续组织成个人工作、知识对象、同步协作、结构化行动、自动化与 AI 工作层。** `Activity（活动）`、`Later（留待以后处理）`、Thread（消息列）、Canvas（画板）、Lists（列表）、Huddle（抱团）、Workflow Builder（工作流程构建器）、Agents & tools（代理与工具）和 Slackbot（私人 AI 代理）共同构成了这一层。
2. **ClassIn Online 的优势不在通用企业协作广度，而在教育原生对象和动作的贴合度。** 班级上下文、组织/好友/班级/公开课关系、教学文件与云盘、临时教室、课堂进入、公告和公开课通知，都是 Slack 通用对象不能直接替代的。
3. **ClassIn 当前基础 IM 的主要空白集中在“信息过载后的处理机制”。** 线程、Reaction（表情回复）、消息动作、聚合未读、稍后处理、提醒、精细通知、搜索修饰符、频道/空间治理与历史恢复，比继续增加一种附件按钮更能改变长会话效率。
4. **Slack 的 Canvas/List/Workflow 不应按产品名移植。** 对 ClassIn 更合理的方向是把“消息 → 教学成果物 / 待办 / 作业动作 / 课堂动作”建立为领域化对象，并保留来源、权限、审批、执行和回执。
5. **Demo 已提前验证了 Slack 也在强化的 AI 交互骨架。** 教师私密 Sidecar、群内公开 Agent、隔离 Agent 私聊、权限重验、可观察 Run、Artifact（成果物）、人工审阅、教师身份发送和 ExecutionReceipt（执行回执）都存在设计映射；但它们仍是 `MOCK_CLOSED_LOOP / POLICY_ONLY`，不能写成线上能力或生产成熟度优势。
6. **241 项映射只形成“差距与适配登记”，不形成优先级。** 企业合规、跨组织协作、开发平台和渐进发布功能需要结合 ClassIn 的组织策略、真实 IM 内容研究、生产架构和商业目标再判断。

## 1. 范围、Write Set 与事实边界

### 1.1 本阶段写入

- Slack `B01—B19 / A01—A14` 与 ClassIn Online、Demo 的 33 域能力桥接；
- 241 项 Slack 原子 Feature 的互斥状态登记；
- ClassIn 教育原生能力和 Demo AI 设计资产的反向优势；
- 差距主题和升级候选长名单；
- 需要用户校准或后续补证的明确问题。

### 1.2 本阶段不写入

- Teams、Discord 的任何新事实或横向排名；
- 候选项的 P0/P1/P2、Roadmap、成本承诺或需求锁定；
- 线上 ClassIn 未经证据证明的服务端、移动端、治理、合规或可靠性能力；
- 把 Demo 的 Mock、Placeholder、Policy 或 Dormant 资产升级为生产事实；
- 对 Slack `NOT_PROVEN / CONFLICT / PREVIEW / BETA` 项进行静默补全。

### 1.3 唯一事实源

| 层 | 本阶段事实源 | 用途 |
|---|---|---|
| Slack | [Slack 功能深度审计](./04B-SLACK-IM-FEATURE-AUDIT.md) | 241 项功能、套餐、发布态、限制和官方证据 |
| ClassIn Online | [线上 ClassIn IM 功能全集](./02-ONLINE-CLASSIN-IM-FEATURE-INVENTORY.md) 与 [截图证据图谱](./02-ONLINE-CLASSIN-IM-EVIDENCE-ATLAS.md) | 当前生产入口、104 项 Feature、角色和负向事实 |
| ClassIn Demo | [Demo IM 功能清单](./01-DEMO-IM-FEATURE-INVENTORY.md) | 当前 86 项功能、运行态和真值成熟度 |
| 内部桥接 | [Demo × Online 差异分析](./03-DEMO-VS-ONLINE-IM-GAP-ANALYSIS.md) | 104 项线上能力的 Demo 覆盖、冲突和 Demo 反向增量 |

本文件不重复 Slack 的官方 URL。每个 Slack ID 的证据、套餐和发布态仍回到 04B；本文件只新增跨产品判断。ClassIn 引用保持原稳定 ID，避免同一 Feature 在四份文档中重复定义。

## 2. 映射状态与判断规则

| 状态 | 本文件含义 | 不代表 |
|---|---|---|
| `ALIGNED` | Online 或 Demo 已有可直接比较的对象和用户任务 | 交互、规模、套餐、生产成熟度完全相同 |
| `PARTIAL` | 有相邻对象或部分链路，但范围、深度、角色、状态或成熟度明显不同 | 已完成等价实现 |
| `SLACK_ONLY_CANDIDATE` | 当前 Online 与 Demo 都没有足够的等价表达，且可能进入 ClassIn 候选讨论 | 已确认应该建设或优先建设 |
| `CLASSIN_ADVANTAGE` | 对同一用户任务，ClassIn 已有更教育原生的对象/链路，或 Demo 已验证更明确的人机控制模型 | ClassIn 在通用能力、生产成熟度或商业规模上全面领先 |
| `NOT_APPLICABLE` | Slack 特有组织、商业套餐或平台对象不能直接成为 ClassIn IM Feature | 永远没有参考价值 |
| `NEEDS_VALIDATION` | Slack 事实本身或 ClassIn 对应生产事实不足，暂不能做有无判断 | 功能不存在 |

映射以“用户任务 + 对象 + 入口 + 可观察结果 + 角色/权限 + 生命周期”为单位，不以产品命名相似度为依据。例如 Huddle（抱团）与临时教室都包含同步进入动作，但参与规则、持续时间、课堂控制和消息连续性不同，因此不能只因“都能音视频”判为完全一致。

## 3. 33 个能力域桥接

### 3.1 基础 IM：B01—B19

| Slack 域 | ClassIn Online 对应 | ClassIn Demo 对应 | 域级判断 |
|---|---|---|---|
| B01 入口、Shell 与 Workspace | `ON-E-01/02`、`ON-IA-01/02/11/18` | `E-01—06/08`、`EXP-01—07` | `PARTIAL`：ClassIn 有全局消息与班级现场双入口；缺 Slack 多 Workspace、顶层统一工作 OS 与管理员域 |
| B02 身份、关系与目录 | `ON-REL-01—18` | `NAV-06/07/09`、`MAN-05/08` | `CLASSIN_ADVANTAGE`：ClassIn 的好友、组织、班级、公开课关系更教育原生；Slack 在 Guest、外部组织和状态上更完整 |
| B03 空间与会话 | `ON-IA-03—07`、`ON-NEG-03/07` | `NAV-01`、`MSG-01`、`AGT-06/08` | `PARTIAL`：ClassIn 以班级群/1:1/通知对象组织；无 Slack Channel、Group DM、Thread 和跨组织空间模型 |
| B04 导航、视图与个人工作编排 | `ON-IA-03/08—11/19` | `NAV-01—12`、`HIS-03/04`、`EXP-01—05` | `PARTIAL`：已有分类、未读、搜索、草稿和沉浸工作区；缺 Activity、Later、自定义分区、Starred 等个人处理层 |
| B05 发现、创建与加入 | `ON-E-03—08/12`、`ON-REL-12—18` | `NAV-07/09`、`MAN-08` | `PARTIAL`：ClassIn 强在班级/公开课/关系发现，弱在自由空间建立、模板和 App/Workflow 发现 |
| B06 Composer 与发送 | `ON-CMP-01—24` | `MSG-01—06`、`AGT-01—04` | `CLASSIN_ADVANTAGE`：Online 有截图、多图、教学贴纸、本地/云盘、名片、临时教室等教育化输入；Demo 仅文本闭环且大量附件为 Placeholder |
| B07 消息与内容对象 | `ON-MSG-01—13/15`、`ON-BUS-04—18` | `MSG-01/05/09/13`、`NTF-01—06`、`TB-08/12/15` | `CLASSIN_ADVANTAGE`：ClassIn 有教学文件、名片、临时教室、公开课和官方内容；Slack 强在链接、Canvas/List/Workflow/Agent 成果物通用化 |
| B08 消息动作与治理 | `ON-NEG-01—06/08/10` | `MSG-10—12`、`NAV-04`、`MAN-06` | `SLACK_ONLY_CANDIDATE`：Online 当前明确缺通用消息菜单、回复、Reaction、编辑、转发等；Demo 只验证置顶、撤回与局部已读/免打扰 |
| B09 阅读、历史与搜索 | `ON-IA-15/17/19`、`ON-REL-14—18` | `NAV-02—05/11/12`、`HIS-01—05`、`E-07` | `PARTIAL`：ClassIn 有全网对象搜索和 Demo 长会话锚点；缺消息全文搜索、修饰符、统一未读处理和治理级导出证据 |
| B10 通知、注意力与个人节奏 | `ON-BUS-02/03`、`ON-NEG-08` | `NAV-02—04`、`MAN-06`、`NTF-05` | `PARTIAL`：已有 @提醒、桌面通知、未读与 Demo 免打扰；缺精细路由、关键词、VIP、Later、提醒和专注/离开状态 |
| B11 文件、知识与协作对象 | `ON-CMP-17—21`、`ON-BUS-16`、`ON-GOV-03/06/11` | `MAN-02`、`MSG-06/13`、`TB-15` | `PARTIAL`：Online 的教学文件来源更贴合业务，但群文件生命周期细节延后；Slack 的文件治理、Canvas、List 和恢复更系统 |
| B12 Huddle、音视频与同步协作 | `ON-CMP-24`、`ON-MSG-11—13`、`ON-BUS-17/18`、`ON-GOV-02/07` | `MSG-06` Placeholder | `CLASSIN_ADVANTAGE`：ClassIn 用临时教室/在线课堂承载同步教学；Slack 强在会话中即时抱团、屏幕协作、字幕和会后连续性 |
| B13 结构化行动与业务连接 | `ON-BUS-07—18`、`ON-IA-13/14` | `NTF-03—05`、`TB-06—15` | `CLASSIN_ADVANTAGE`：ClassIn 的课堂、作业、公告和教学成果物是原生对象；Slack 的 Lists/Workflow/Calendar 自动化更通用、可组合 |
| B14 App、Bot、自动化与开发平台 | `ON-AI-01—04` 仅为 AI 边界证据 | `AGT-01—14`、`TB-01—16` | `PARTIAL`：Demo 有 Agent 交互和 Mock Adapter，但没有 Slack 式安装、Scope、事件、Webhook、工作流程市场和统一代理中心 |
| B15 角色、社区与空间治理 | `ON-GOV-01—11` | `MAN-01—08`、`MSG-10/11/14`、`AGT-05/07/12/13` | `PARTIAL`：ClassIn 有教师/管理角色/学生教学治理，Slack 有更广的组织、访客、外部协作和频道管理体系 |
| B16 管理、安全与合规 | 本轮 Online 材料未覆盖 | Demo 只表达局部授权与 Policy | `NEEDS_VALIDATION`：不能把截图未覆盖写成 ClassIn 不支持；需独立生产治理/安全事实审计 |
| B17 生命周期、可靠性与恢复 | `ON-GOV-08—11`、群聊只读保留 | `NAV-10—12`、`HIS-01—04`、`EXP-09/10`、`TB-16` | `PARTIAL`：Demo 状态表达较强，但多为本地/Mock；生产连接、持久化、删除、停用和恢复仍缺证据 |
| B18 平台、辅助功能与国际化 | 本轮只证明 ClassIn PC | `MSG-03`、`HIS-05/06`、`EXP-04—10` | `PARTIAL`：Demo 有键盘、Reduced Motion、紧凑布局与错误状态；多端、读屏、字幕、语言时区缺完整基线 |
| B19 Presence、送达与实时状态 | `ON-IA-19` 仅证明基础未读 | `NAV-02/03`、`AGT-10` | `NEEDS_VALIDATION`：未读可比；在线、输入中、逐人送达/已读和实时参与者不能从现有材料推断 |

### 3.2 AI / Agent：A01—A14

| Slack 域 | ClassIn Online 对应 | ClassIn Demo 对应 | 域级判断 |
|---|---|---|---|
| A01 摘要与 Recap | `NOT_PROVEN` | 无通用会话/Thread 摘要 | `SLACK_ONLY_CANDIDATE` |
| A02 AI 搜索与企业搜索 | 无 AI 搜索；有 `ON-REL-14—18` 规则搜索 | `E-07` 为 Dormant 普通消息搜索 | `SLACK_ONLY_CANDIDATE`；ClassIn 若建设应优先做教学对象与消息的权限内检索 |
| A03 理解、翻译、总结与生成 | `NOT_PROVEN` | `TB-03/08/14` 提供回复辅助与讲题成果物 | `PARTIAL`；已有教育化解释/回复原型，无翻译、文件总结和通用改写 |
| A04 Huddle AI | `NOT_PROVEN` | 无课堂/临时教室 AI 笔记 | `SLACK_ONLY_CANDIDATE`；应与课堂录制、字幕、纪要事实边界一并研究 |
| A05 Agent 发现与会话模式 | `NOT_PROVEN` | `AGT-01—14` 覆盖发现、群内公开和隔离私聊 | `ALIGNED`（设计层）：渠道形态高度可比，但 ClassIn 仅为确定性 Mock |
| A06 私人 Slackbot | `NOT_PROVEN` | `TB-01—05/16` 私密 Sidecar、Run Timeline 与恢复 | `ALIGNED`（设计层）：ClassIn 更聚焦教师任务；Slack 更通用、已产品化 |
| A07 上下文、权限、引用与记忆 | `NOT_PROVEN` | `AGT-05/12/13`、`TB-05/11/13/16` | `PARTIAL`：Demo 强在 fail-closed、事实重读和回执；引用、长期记忆和企业源未实现 |
| A08 工具调用、工作流程与 MCP | `NOT_PROVEN` | `TB-05—13` 通过 Mock Read/Write Adapter 形成确定性闭环 | `PARTIAL`：已有 Capability/Adapter/审批模型，无真实 App、MCP、定期任务和 Workflow Builder |
| A09 Artifact 与交互式操作台 | `NOT_PROVEN` | `MSG-13`、`TB-08—10/13/15` | `CLASSIN_ADVANTAGE`（设计层）：教学成果物、编辑审阅、回执与文件沉淀链明确；仍非生产服务 |
| A10 主动编排与 Today | `NOT_PROVEN` | 首页摘要、`TB-02/03` 推荐任务 | `PARTIAL`：有情境推荐，无统一今日工作台、Recap 或定期主动 Run |
| A11 人工确认、复核与停止 | `NOT_PROVEN` | `TB-09—14`、`AGT-04/11/12` | `CLASSIN_ADVANTAGE`（设计层）：教师审批、最新版本、发送前复核、身份发送和回执更明确；缺通用 Stop |
| A12 Agent 状态、历史与恢复 | `NOT_PROVEN` | `AGT-10/11`、`TB-04/05/13/16` | `PARTIAL`：有显式 Run/失败/重试/回执，无生产持久历史、非活动和归档策略 |
| A13 AI 管理、安全与用量 | `NOT_PROVEN` | `AGT-05/12/13`、`TB-11/16` | `PARTIAL`：有用户侧授权和失败关闭，无组织级启停、安装审批、用量、Skill/Memory 管理 |
| A14 开放平台与扩展 | `NOT_PROVEN` | Domain/Adapter Interface 与 Agent Surface 代码资产 | `PARTIAL`：架构有 Seam，但没有公开 App/Agent/Connector/Skill/MCP 平台 |

## 4. 三层真值不可混写

| 判断对象 | 可以写 | 不可以写 |
|---|---|---|
| Online ClassIn | 当前截图、Notion 和用户确认已证明的功能/负向事实 | 从 Demo、Spec 或 Slack 推断线上存在 |
| ClassIn Demo | 当前可操作、Mock、Placeholder、Policy 与 Dormant 的明确状态 | 把 `MOCK_CLOSED_LOOP` 写成真实 AI/IM 集成，把 `DORMANT` 算作已有入口 |
| Slack | 04B 中官方事实、套餐、限制、发布态和 `NOT_PROVEN` | 把营销定位、第三方 App、Preview 或单 Workspace 可见性扩写成全体 GA |
| 4.2B 候选 | `RECOMMENDATION / UNPRIORITIZED` | `LOCKED`、Roadmap 承诺、开发排期或商业套餐结论 |

## 5. Slack 241 项原子能力互斥登记

本章是完整性登记，不重复 04B 的功能名和证据。每个 Slack ID 在下表中恰好出现一次；状态按第 2 章解释。域级映射与 ClassIn 证据回第 3 章，原子行为回 04B。

| 状态 | 数量 | 占 241 项比例 | 解读 |
|---|---:|---:|---|
| `ALIGNED` | 32 | 13.3% | 已有直接可比能力，但仍需看 Online/Demo 真值与深度 |
| `PARTIAL` | 64 | 26.6% | 有相邻能力，是最需要进一步拆解差距的区域 |
| `SLACK_ONLY_CANDIDATE` | 98 | 40.7% | Slack 参照项较多，必须先聚类和场景验证，不能逐项变需求 |
| `CLASSIN_ADVANTAGE` | 11 | 4.6% | 教育原生对象或 Demo 人机控制模型更贴合；不代表生产全面领先 |
| `NOT_APPLICABLE` | 11 | 4.6% | Slack 特有对象/商业/组织模型不直接映射 |
| `NEEDS_VALIDATION` | 25 | 10.4% | ClassIn 生产事实或 Slack 发布事实不足，暂停有无判断 |
| **合计** | **241** | **100.0%** | 每项恰好登记一次；四舍五入后分项比例合计可能为 100.2% |

<!-- ATOMIC_REGISTER_START -->
| 域 | 映射状态 | Slack 原子 Feature ID |
|---|---|---|
| B01 | `ALIGNED` | B01-02, B01-06 |
| B01 | `PARTIAL` | B01-03, B01-05 |
| B01 | `SLACK_ONLY_CANDIDATE` | B01-01 |
| B01 | `NOT_APPLICABLE` | B01-04 |
| B02 | `ALIGNED` | B02-01, B02-02 |
| B02 | `PARTIAL` | B02-03 |
| B02 | `SLACK_ONLY_CANDIDATE` | B02-04, B02-05, B02-06, B02-07 |
| B03 | `ALIGNED` | B03-04 |
| B03 | `PARTIAL` | B03-01, B03-02, B03-05, B03-10 |
| B03 | `SLACK_ONLY_CANDIDATE` | B03-03, B03-06, B03-07, B03-08, B03-09 |
| B03 | `NOT_APPLICABLE` | B03-11 |
| B04 | `ALIGNED` | B04-01, B04-06 |
| B04 | `PARTIAL` | B04-05, B04-07, B04-09, B04-10 |
| B04 | `SLACK_ONLY_CANDIDATE` | B04-02, B04-03, B04-04, B04-08 |
| B05 | `ALIGNED` | B05-01, B05-03, B05-05, B05-06 |
| B05 | `PARTIAL` | B05-04 |
| B05 | `SLACK_ONLY_CANDIDATE` | B05-02, B05-07 |
| B06 | `ALIGNED` | B06-02, B06-03, B06-04, B06-07 |
| B06 | `PARTIAL` | B06-09 |
| B06 | `SLACK_ONLY_CANDIDATE` | B06-01, B06-05, B06-06, B06-08 |
| B07 | `ALIGNED` | B07-01 |
| B07 | `PARTIAL` | B07-02, B07-04, B07-08 |
| B07 | `CLASSIN_ADVANTAGE` | B07-03, B07-07 |
| B07 | `SLACK_ONLY_CANDIDATE` | B07-05, B07-06 |
| B08 | `PARTIAL` | B08-04, B08-08, B08-09 |
| B08 | `SLACK_ONLY_CANDIDATE` | B08-01, B08-02, B08-03, B08-05, B08-06, B08-07, B08-10 |
| B09 | `ALIGNED` | B09-01 |
| B09 | `PARTIAL` | B09-03, B09-04, B09-06 |
| B09 | `SLACK_ONLY_CANDIDATE` | B09-05, B09-07 |
| B09 | `NOT_APPLICABLE` | B09-02, B09-08 |
| B10 | `ALIGNED` | B10-01 |
| B10 | `PARTIAL` | B10-02, B10-03, B10-05, B10-06, B10-07 |
| B10 | `SLACK_ONLY_CANDIDATE` | B10-04, B10-08, B10-09, B10-10 |
| B11 | `ALIGNED` | B11-03 |
| B11 | `PARTIAL` | B11-04, B11-05, B11-06, B11-07 |
| B11 | `CLASSIN_ADVANTAGE` | B11-01 |
| B11 | `SLACK_ONLY_CANDIDATE` | B11-02, B11-08, B11-09, B11-10, B11-11, B11-12 |
| B12 | `PARTIAL` | B12-02, B12-03, B12-08 |
| B12 | `CLASSIN_ADVANTAGE` | B12-01 |
| B12 | `SLACK_ONLY_CANDIDATE` | B12-04, B12-05, B12-06, B12-07, B12-09 |
| B13 | `PARTIAL` | B13-04 |
| B13 | `CLASSIN_ADVANTAGE` | B13-09 |
| B13 | `SLACK_ONLY_CANDIDATE` | B13-01, B13-02, B13-03, B13-05, B13-06, B13-07, B13-08 |
| B14 | `PARTIAL` | B14-03, B14-04, B14-09 |
| B14 | `SLACK_ONLY_CANDIDATE` | B14-01, B14-02, B14-05, B14-06, B14-07, B14-08, B14-10 |
| B15 | `ALIGNED` | B15-01, B15-02, B15-03 |
| B15 | `PARTIAL` | B15-04, B15-05, B15-07 |
| B15 | `SLACK_ONLY_CANDIDATE` | B15-08 |
| B15 | `NOT_APPLICABLE` | B15-06 |
| B16 | `NEEDS_VALIDATION` | B16-01, B16-02, B16-03, B16-04, B16-05, B16-06, B16-07, B16-08, B16-09, B16-10, B16-11, B16-12 |
| B17 | `PARTIAL` | B17-01, B17-02, B17-03 |
| B17 | `NOT_APPLICABLE` | B17-04, B17-05, B17-06, B17-08 |
| B17 | `NEEDS_VALIDATION` | B17-07, B17-09 |
| B18 | `PARTIAL` | B18-01, B18-04, B18-05, B18-06 |
| B18 | `SLACK_ONLY_CANDIDATE` | B18-07 |
| B18 | `NEEDS_VALIDATION` | B18-02, B18-03, B18-08 |
| B19 | `ALIGNED` | B19-05 |
| B19 | `NEEDS_VALIDATION` | B19-01, B19-02, B19-03, B19-04, B19-06, B19-07, B19-08 |
| A01 | `SLACK_ONLY_CANDIDATE` | A01-01, A01-02, A01-03, A01-04 |
| A02 | `SLACK_ONLY_CANDIDATE` | A02-01, A02-02, A02-03, A02-04 |
| A03 | `PARTIAL` | A03-04, A03-05 |
| A03 | `CLASSIN_ADVANTAGE` | A03-01 |
| A03 | `SLACK_ONLY_CANDIDATE` | A03-02, A03-03 |
| A04 | `SLACK_ONLY_CANDIDATE` | A04-01, A04-02 |
| A04 | `NEEDS_VALIDATION` | A04-03 |
| A05 | `ALIGNED` | A05-01, A05-02, A05-03 |
| A05 | `SLACK_ONLY_CANDIDATE` | A05-05 |
| A05 | `NOT_APPLICABLE` | A05-04 |
| A06 | `ALIGNED` | A06-01, A06-04 |
| A06 | `PARTIAL` | A06-02, A06-05 |
| A06 | `SLACK_ONLY_CANDIDATE` | A06-03 |
| A07 | `ALIGNED` | A07-01, A07-05 |
| A07 | `PARTIAL` | A07-02 |
| A07 | `SLACK_ONLY_CANDIDATE` | A07-03, A07-04 |
| A08 | `PARTIAL` | A08-02, A08-05 |
| A08 | `SLACK_ONLY_CANDIDATE` | A08-01, A08-03, A08-04, A08-06, A08-07, A08-08 |
| A09 | `PARTIAL` | A09-01, A09-02, A09-03 |
| A09 | `CLASSIN_ADVANTAGE` | A09-04, A09-05 |
| A10 | `PARTIAL` | A10-01 |
| A10 | `SLACK_ONLY_CANDIDATE` | A10-02, A10-03 |
| A11 | `CLASSIN_ADVANTAGE` | A11-01, A11-02, A11-03 |
| A11 | `SLACK_ONLY_CANDIDATE` | A11-04 |
| A12 | `PARTIAL` | A12-01, A12-02, A12-03 |
| A12 | `SLACK_ONLY_CANDIDATE` | A12-04, A12-05 |
| A13 | `ALIGNED` | A13-02 |
| A13 | `PARTIAL` | A13-01, A13-03 |
| A13 | `SLACK_ONLY_CANDIDATE` | A13-04, A13-05, A13-06 |
| A14 | `ALIGNED` | A14-02 |
| A14 | `SLACK_ONLY_CANDIDATE` | A14-01, A14-03, A14-04, A14-05, A14-06, A14-07 |
| A14 | `NOT_APPLICABLE` | A14-08 |
<!-- ATOMIC_REGISTER_END -->

## 6. ClassIn 反向优势：不能被 Slack 差距表遮蔽

| 优势 ID | 能力 | 事实层 | 相对 Slack 的适配判断 | 证据 |
|---|---|---|---|---|
| CI-ADV-01 | 全局消息 + 班级现场双入口 | Online + Demo | 通信既能集中处理，也能保留当前班级教学上下文；比单纯复制 Workspace/Channel Shell 更贴合教师路径 | `ON-E-01/02`；`E-01—06` |
| CI-ADV-02 | 好友、组织、班级、公开课四类关系与搜索 | Online | 是教育业务对象发现，不应被抽象成通用 Channel Directory 后丢失对象差异 | `ON-REL-01—18` |
| CI-ADV-03 | 教学贴纸、截图、多图、本地/云盘和教学文件 | Online | Composer 直接连接资源生产与教学素材；Slack 的通用文件能力可补治理，但不应替代 ClassIn 文件语义 | `ON-CMP-03—21`、`ON-MSG-04—08` |
| CI-ADV-04 | 名片、临时教室、公开课等结构化消息 | Online | 消息本身携带教育对象、状态和下一步动作，优于把所有业务只做成文本/链接 | `ON-MSG-09—13`、`ON-BUS-07—18` |
| CI-ADV-05 | 教师/班主任/助教/学生角色治理 | Online | 权限来自教学关系而不是仅 Workspace/Channel 角色；需继续显式化操作与只读状态 | `ON-GOV-01—11` |
| CI-ADV-06 | 系统/官方/作业通知与业务深链 | Demo | 已验证“阅读不等于处理”、进入业务页和返回原通知，可作为消息到教学行动的基座 | `NTF-01—05` |
| CI-ADV-07 | 私密教师 TeacherIn Sidecar | Demo Mock | 教师不需把 AI 加入公开群，也不泄露思考/草稿过程；适合高责任沟通前的私密辅助 | `TB-01—05` |
| CI-ADV-08 | 公开 Agent + 隔离 Agent 私聊 | Demo Mock/Policy | 同一授权能力按群内公开短提示与个人分步辅导投影，并隔离师生私聊线程 | `AGT-01—14` |
| CI-ADV-09 | 教学 Artifact 的审阅、批准、身份发送与回执 | Demo Mock | 把 AI 输出变成可编辑成果物和 `ProposedAction`，教师审批后才以教师身份写入，并产生回执 | `TB-08—15` |
| CI-ADV-10 | 显式权限、过期、失败与恢复状态 | Demo Policy/Mock | 授权发送前重验、事实过期、权限拒绝、发送失败和重试均显式呈现，适合作为生产接口契约方向 | `AGT-05/11/12`、`TB-11/16`、`EXP-09/10` |

其中 CI-ADV-06—10 是 Demo 设计/Mock 优势，不是线上领先事实；后续若进入产品候选池，仍需真实 Adapter、生产授权、消息协议、审计与评价闭环。

## 7. 差距主题：从零散 Feature 转为可讨论的问题

| 主题 ID | 问题 | Slack 证据簇 | ClassIn 当前状态 | 适配原则 |
|---|---|---|---|---|
| GAP-S01 | 用户如何处理消息过载，而不是只看到未读数？ | B04、B09、B10、A01、A10 | Online 有基础未读/@提醒；Demo 有分类已读、锚点 | 把 Activity/Later/Recap 拆成“聚合、排序、稍后、完成、回到原文”任务，不照抄入口名 |
| GAP-S02 | 长群聊如何分叉讨论又不破坏主时间线？ | B03-07、B08-01/02 | Online 与 Demo 均明确无 Thread/Reaction | 先验证班级群中的答疑、作业讨论和通知反馈是否需要消息列；避免制造更多不可读分支 |
| GAP-S03 | 单条消息如何成为可治理对象？ | B08-03—10 | Online 缺通用动作；Demo 有局部置顶/撤回 | 统一动作入口与权限/时限/恢复语义，再决定编辑、删除、转发、链接、保存和提醒 |
| GAP-S04 | 班级之外是否需要持久主题空间？ | B03、B05、B15 | ClassIn 主要以班级/1:1/通知对象组织 | 先以真实沟通事实证明跨班级教研、机构协作或兴趣社群需求，再讨论 Channel 化 |
| GAP-S05 | 消息中的文件如何沉淀为可检索知识？ | B11、B07-05/06、B13-01—04 | Online 文件输入强，生命周期细节不足；Demo 群文件 Placeholder | 保留教学文件/云盘优势，补聚合、权限、预览、版本、恢复与“消息到成果物”链 |
| GAP-S06 | 同步沟通如何与消息前后文连续？ | B12、A04 | ClassIn 有课堂/临时教室，Slack 有即时抱团和会后消息/画板/笔记 | 不重复造音视频引擎；研究课堂前中后消息、素材、纪要和行动项的连续性 |
| GAP-S07 | 消息如何转为行动，而不只是一条提醒？ | B13、B14、A08/A09 | Online 有课堂/公开课/公告；Demo 有作业深链和 Mock 写回 | 优先领域对象：作业、课堂、资源、通知、反馈；通用 Workflow 只作为编排层 |
| GAP-S08 | 用户如何在历史中找回事实并理解上下文？ | B09、A01—A03 | Online 有对象搜索，Demo 消息搜索 Dormant；无 AI 搜索 | 普通全文搜索是基础，AI 答案必须权限相交、带引用、可回到原消息 |
| GAP-S09 | 通知、状态和在线感如何减少打扰与误解？ | B10、B19 | Online 仅部分证明；Demo 有本地免打扰 | 区分未读、送达、已读、在线、输入中、免打扰和业务待办，不合并成一个状态 |
| GAP-S10 | 基础能力在失败、停用、删除和多端下是否可靠？ | B16—B18 | 本轮 Online 证据不足；Demo 有 UI 状态但无生产服务 | 单独建立生产治理/可靠性审计，不能用竞品 UI 表替代架构与合规事实 |
| GAP-S11 | AI 何时私密辅助、何时公开发言？ | A05/A06/A10 | Demo 已验证 TeacherIn、公开 Agent、隔离私聊 | 身份、可见范围、触发方式和渠道策略必须是结构化字段，不靠提示词约定 |
| GAP-S12 | AI 如何从建议走向可控执行？ | A07—A14 | Demo 已验证 Artifact/审批/回执的 Mock 纵向切片 | 保留权限相交、事实重读、最新版本、人工批准、幂等和 Receipt；再接真实工具/Skill/MCP |

## 8. Slack 启发的升级候选长名单

以下仅是“值得进入后续场景验证”的长名单，不是优先级。`候选类型`沿用 4.1：`BASELINE_INHERITANCE / INDUSTRY_PARITY / EDUCATION_ADAPTATION / AI_EXTENSION / DO_NOT_ADOPT / NEEDS_VALIDATION`。

| Candidate ID | 来源 Feature | 候选方向 | 候选类型 | ClassIn 适配假设 | 主要依赖/风险 | 状态 |
|---|---|---|---|---|---|---|
| CAND-SLK-01 | B04-04/06—08、B09-03、B10-08/09 | 个人消息处理工作台 | `EDUCATION_ADAPTATION` | 聚合 @我、未读、待处理通知、保存消息和回到原文 | 与现有待办/通知重复；需真实内容频率验证 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-02 | B03-07、B08-01/02 | Thread（消息列）与 Reaction（表情回复） | `INDUSTRY_PARITY` | 为班级答疑、通知确认和专题讨论降噪 | 可能分散班级时间线；移动/PC 一致性 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-03 | B08-03—10 | 统一消息动作与权限模型 | `BASELINE_INHERITANCE` | 编辑、删除/撤回、转发、复制链接、标未读、保存/提醒共享同一动作入口 | 线上负向事实、合规、时限和多角色冲突 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-04 | B06-01/08/09、B04-05 | 富文本、定时发送与跨会话草稿 | `INDUSTRY_PARITY` | 支持教师预排通知、长消息和可靠草稿恢复 | 发送撤销、时区、多端同步和草稿隐私 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-05 | B09-04—07、B01-06 | 消息全文搜索与修饰符 | `BASELINE_INHERITANCE` | 先补可达、权限内、可回原文的普通搜索，再考虑 AI 答案 | 当前全局消息搜索为 Dormant；索引/权限/历史 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-06 | B11-03—12 | 群文件与知识对象闭环 | `EDUCATION_ADAPTATION` | 将消息文件、云盘资源、讲题成果物与班级资源聚合 | 版本、所有权、下载、恢复、被移出后的权限 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-07 | B07-05/06、B13-01—04 | 教学 Canvas/List 替代模型 | `EDUCATION_ADAPTATION` | 不复制画板/列表品牌，验证“消息 → 教学成果物/待办/名单/计划” | 与作业、备课、文件、待办对象重叠 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-08 | B12-06/07/09、A04 | 课堂/临时教室前后文连续性 | `EDUCATION_ADAPTATION` | 消息发起课堂，结束后回写纪要、素材、行动和可检索记录 | 课堂引擎、录制同意、未成年人隐私 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-09 | B13-05—09、B14-05—08 | 领域工作流程与自动消息 | `EDUCATION_ADAPTATION` | 用规则/表单/触发器编排作业、课堂、通知和反馈 | 不能让教师承担低代码配置负担；审计/幂等 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-10 | B14-01/02/09/10、A13-03 | Agent/App 发现、授权与管理中心 | `AI_EXTENSION` | 统一呈现可用 Agent、能力、适用班级、权限和撤销 | 安装审批、数据出境、第三方许可和学生可见性 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-11 | B10-02—10、B19-01—05 | 通知、免打扰与状态模型 | `BASELINE_INHERITANCE` | 按会话、关键词、角色和教学日程控制打扰，并区分未读/在线/输入中 | 多端推送、时区、紧急通知豁免 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-12 | B17、B18 | 可靠性、恢复与可访问性基线 | `BASELINE_INHERITANCE` | 把 Demo 已有加载/错误/键盘/Reduced Motion 扩为生产契约 | 多端、离线、持久化、读屏和测试成本 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-13 | A01-01—03、A10-02 | 会话/群聊摘要与定期 Recap | `AI_EXTENSION` | 对长班级群、教师跨班消息做引用可回溯摘要 | 摘要遗漏、角色差异、未读边界和敏感内容 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-14 | A02、A07-01/02 | 权限内 AI 搜索与引用 | `AI_EXTENSION` | 查询消息、班级、作业和资源，答案逐条引用并回到源对象 | 权限继承、索引隔离、过期事实和幻觉 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-15 | A03-01—03/05 | 解释、翻译、文件摘要与改写 | `AI_EXTENSION` | 优先教师回复辅助、学生可理解表达和跨语言家庭沟通 | 语义失真、教师责任、未成年人数据 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-16 | A05/A06 | 私密教师 Agent 与公开/私聊班级 Agent | `AI_EXTENSION` | 继续沿用当前三渠道模型，并用真实场景验证任务分配 | 当前仅 Mock；身份、授权、内容安全和模型成本 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-17 | A07、A11 | 权限相交、引用、审批与 Stop | `AI_EXTENSION` | 把 Demo 的 fail-closed、人工审批和回执提升为生产接口 | 审批粒度、撤销、长任务、工具副作用 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-18 | A09、A12 | Agent Artifact、状态、历史与恢复 | `AI_EXTENSION` | 成果物可编辑、版本化、恢复、定位和复用，不只保留聊天文本 | Artifact 所有权、版本、存储、跨会话检索 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-19 | A08-01、A10 | 主动任务与教师今日工作台 | `AI_EXTENSION` | 教师明确授权后按课程节奏运行催交、课前准备、回顾 | 自动化打扰、过期事实、暂停/取消与预算 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-20 | A08-02/07/08、A14-04—07 | Skill / MCP / Workflow 扩展层 | `NEEDS_VALIDATION` | 内部统一能力接口可连接受治理工具，但不暴露技术术语给教师 | 平台范围过大、安全、生态与维护成本 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-21 | B16、A13 | 生产安全、治理和用量事实审计 | `NEEDS_VALIDATION` | 在任何真实 AI/IM 写回前建立身份、保留、审计、安装和用量基线 | 当前研究输入不足，不能从 Slack 反推 ClassIn | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-22 | B03-01—03/08/09 | Channel 化与跨组织空间 | `NEEDS_VALIDATION` | 仅当真实数据证明跨班教研/机构协作长期存在时再建空间模型 | 容易稀释班级主对象、增加治理复杂度 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-23 | B02-04/05、B15-05/06 | Guest/外部组织协作 | `NEEDS_VALIDATION` | 可能用于家长、外聘教师、校际协作，但需独立身份模型 | 未成年人、外部可见性、数据边界与合规 | `RECOMMENDATION / UNPRIORITIZED` |
| CAND-SLK-24 | B12-01—05 | 通用 Huddle 复制 | `DO_NOT_ADOPT` | 不新造与 ClassIn 课堂/临时教室竞争的音视频对象；只借鉴即时进入和消息连续性 | 重复引擎、概念冲突、角色/课堂控制倒退 | `RECOMMENDATION / UNPRIORITIZED` |

## 9. 待用户校准与后续补证

| ID | 标记 | 需要确认/补证的内容 | 当前处理 |
|---|---|---|---|
| M-Q01 | `【待你确认】` | 是否认同 4.2B 的映射状态定义，以及 `CLASSIN_ADVANTAGE` 只表示教育适配/设计模型优势，不表示通用或生产成熟度全面领先 | 在确认前不把状态用于排序 |
| M-Q02 | `【待你确认】` | 是否认同先把 Thread/Reaction、个人处理工作台、消息动作、搜索与文件闭环视为“基础 IM 候选主题”，但仍不排优先级 | 保持长名单 |
| M-Q03 | `【待你确认】` | Channel 化是否只在真实沟通数据证明跨班级持久主题空间后再考虑 | 当前为 `NEEDS_VALIDATION` |
| M-Q04 | `【待你确认】` | Huddle 借鉴是否限定为“即时进入 + 消息前后文连续”，不在 IM 内复制第二套音视频/课堂产品 | 当前把通用 Huddle 复制列为 `DO_NOT_ADOPT` |
| M-Q05 | `【待你确认】` | Canvas/List/Workflow 是否统一按教育领域对象适配，不直接复制 Slack 的产品结构和命名 | 当前采用领域适配原则 |
| M-Q06 | `【待补资料】` | ClassIn 生产侧安全、消息保留、多端同步、送达/已读、在线状态、审计与恢复事实 | B16/B19 等保持 `NEEDS_VALIDATION` |
| M-Q07 | `【待你确认】` | 4.2B 审阅通过后，下一步是先用真实 IM 内容研究校验候选场景，还是直接为候选池建立价值/成本/风险排序方法 | 本阶段不替用户选择 |

## 10. 4.2B 完成 Gate

- [x] Slack 4.2 已标记为用户审阅通过；
- [x] Teams 4.3 与 Discord 4.4 已明确为 `PAUSED_BY_USER`；
- [x] B01—B19、A01—A14 共 33 个域已完成 Online/Demo 桥接；
- [x] 241 个 Slack 原子 Feature 已进入互斥状态登记；
- [x] Online 事实、Demo Mock/Placeholder/Policy/Dormant 与 Slack 事实保持分层；
- [x] 已反向登记 10 项 ClassIn 教育原生或 Demo 设计优势；
- [x] 已形成 12 个差距主题与 24 项未排序候选；
- [x] `NOT_APPLICABLE / NEEDS_VALIDATION` 没有被误写成 ClassIn 缺失；
- [x] 所有候选只标 `RECOMMENDATION / UNPRIORITIZED`，没有写入 `LOCKED`；
- [ ] 用户完成 M-Q01—M-Q07 审阅并确认 4.2B 共识。
