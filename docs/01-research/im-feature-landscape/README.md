---
title: ClassIn IM 功能全景与竞品研究
status: PHASE_4_2B_COMPLETE_PENDING_USER_REVIEW
version: v0.12
date: 2026-08-30
---

# ClassIn IM 功能全景与竞品研究

## 1. 研究目的

本研究先建立可追溯的 IM 功能事实底图，再讨论升级方向。研究结果只形成 `RECOMMENDATION` 或候选项，不自动改写产品需求、工程范围或 `LOCKED` 决策。

研究分四步：

| 阶段 | 核心问题 | 阶段产物 | 当前状态 |
| --- | --- | --- | --- |
| 1. Demo 盘点 | 当前可运行 Demo 中有哪些 IM 入口和功能？ | [Demo IM 入口与功能清单](./01-DEMO-IM-FEATURE-INVENTORY.md) | `USER_REVIEWED` |
| 2. 线上 ClassIn 盘点 | Notion、线上截图和补充材料能证明哪些线上能力？ | [线上 ClassIn IM 功能全集](./02-ONLINE-CLASSIN-IM-FEATURE-INVENTORY.md) + [60 张截图证据图谱](./02-ONLINE-CLASSIN-IM-EVIDENCE-ATLAS.md) | `COMPLETE` |
| 3. 内部差异分析 | Demo 与线上 ClassIn 的覆盖、缺失和冲突是什么？ | [Demo × 线上 IM 功能差异分析](./03-DEMO-VS-ONLINE-IM-GAP-ANALYSIS.md) | `COMPLETE` |
| 4. 竞品与候选方向 | Slack 的基础 IM 与 AI/Agent 能力如何建设，与 ClassIn Online/Demo 的对应、差距和教育适配方向是什么？ | [竞品研究框架](./04A-COMPETITOR-RESEARCH-FRAMEWORK.md) + [官方一手来源地图](./04A-COMPETITOR-PRIMARY-SOURCE-MAP.md) + [Slack 功能深度审计](./04B-SLACK-IM-FEATURE-AUDIT.md) + [Slack × ClassIn 能力桥接](./04C-SLACK-VS-CLASSIN-CAPABILITY-MAPPING.md) | `4.2B_COMPLETE_PENDING_USER_REVIEW`；Teams/Discord `PAUSED_BY_USER` |

## 2. 统一分析口径

### 2.1 对象定义

- **入口**：用户从 IM 外部进入消息中心、具体会话或固定班级群聊的可见操作或稳定深链。
- **Feature**：用户能够感知、触发或依赖的独立 IM 能力；同一能力在多个页面重复出现时只记一项，并在“角色 / 渠道”中表达差异。
- **基础 IM 能力**：分为“会话型 IM”和“通知公告型消息”两个子域。前者覆盖会话组织、消息生产与消费、成员发现和消息治理；后者覆盖系统通知、官方公告和班级公告等消息触达。
- **AI 扩展能力**：教师私密 TeacherIn、群内公开班级 Agent、教师/学生隔离 Agent 私聊。它们纳入全集，但独立标记，避免与普通 IM 基础能力混算。
- **能力与承载面的关系**：班级公告与消息中心官方公告归为同一个“通知公告”业务能力家族；不同入口、对象或页面只记录为承载面差异，不重复计算能力。
- **相邻业务面**：待办、作业、课程、加入班课等与消息互相跳转但拥有独立业务对象和页面的能力。

### 2.2 Demo 实现状态

| 状态 | 含义 |
| --- | --- |
| `LOCAL_OPERATIONAL` | 交互在当前 React Demo 中真实可操作，结果只写本地状态或固定内存 Store。 |
| `MOCK_CLOSED_LOOP` | 使用固定、脱敏、可重置 Scenario 与 Mock Adapter，形成可验证闭环；未接生产服务。 |
| `PLACEHOLDER` | 有可见入口和反馈，因此在功能覆盖比较中视为“已有该功能表达”；但不执行真实文件、设备、通讯录或业务服务操作，不能视为完整实现。 |
| `POLICY_ONLY` | 主要表达权限、可见性、只读或失效策略，而非独立业务副作用。 |
| `DORMANT` | 代码资产存在，但实现或产品接入未完成，前端未挂载；用户不可见、不可达、不可用，不计入当前 Demo 已有功能。可单列为升级候选资产。 |

第一阶段的 Demo 清单不枚举前端完全不存在的功能。`NOT_IMPLEMENTED` 仅在第三、四阶段出现：当线上 ClassIn 或竞品已经证明存在某项参照能力，而 Demo 既无可见表达、也无 Dormant 代码资产时，用它明确表示对比差距。

功能“是否存在”与实现成熟度分别判断：`PLACEHOLDER` 算存在但成熟度不足；`DORMANT` 不算当前 Demo 存在，只说明仓库中有未完成接入的代码资产。

### 2.3 证据与结论强度

| 代码 | 证据 | 可支持的结论 |
| --- | --- | --- |
| `V` | 2026-08-30 本地 Demo 浏览器实机验证 | 用户当前可见、可达、可操作的运行态事实 |
| `C` | 当前 `src/` 实现与固定 Scenario | 实现结构、角色条件、状态和真值边界 |
| `T` | 当前自动化测试 | 已锁定的行为契约和异常/响应式覆盖 |
| `S` | 已审阅 Spec 与 `LOCKED` 决策 | 设计意图和约束；不能单独证明当前运行态存在 |

优先使用 `V + C + T`。只有 `S` 而没有当前实现证据的项目不得写成“Demo 已实现”。

## 3. 审阅标记

研究文档统一使用以下标记：

- `【待你确认】`：需要产品口径或范围判断；
- `【待补截图】`：需要线上真实产品截图证明；
- `【待补资料】`：需要 Notion、规则说明、版本信息或其他材料；
- `【待实机验证】`：代码/规格存在，但尚未在目标版本、角色或平台实机确认；
- `【证据冲突】`：不同来源直接矛盾，结论暂停；
- `【UNKNOWN】`：现有证据不足，不能合理推断。

所有待审项保留稳定 ID，用户反馈后原位更新状态和结论，不在聊天中单独形成事实源。

## 4. 阶段 Write Set

第一步只写入：

- 本研究入口和统一口径；
- Demo IM 入口与功能事实清单；
- 待用户校准和待后续补证据的问题。

第一步不修改 `src/`、测试、Feature Spec、`DECISION-LEDGER.md` 或既有线上/竞品研究结论。

第二步只写入：

- 本轮 Notion、60 张线上截图和用户补充说明的证据图谱；
- 线上 ClassIn IM 入口、Feature 全集、渠道矩阵、角色矩阵、负向事实与 AI 邻接证据；
- 用户校准后的功能有无结论，以及延后到需求设计阶段的规则细节。

第二步不修改 Demo 实现、测试、Feature Spec、`DECISION-LEDGER.md`，也不提前形成第三阶段差异结论或第四阶段竞品推荐。

第三步只写入：

- 两个入口体系和线上 104 项 Feature 的逐项 Demo 覆盖映射；
- 线上负向事实与 Demo 行为冲突检查；
- Demo 基础增量、AI IM 扩展与 Dormant 资产的反向登记；
- 差距聚类、候选优先级和用户校准问题。

第三步不修改 Demo 实现、测试、Feature Spec 或 `DECISION-LEDGER.md`，不把差异研究自动升级为产品需求。

第四步的 `4.1` 只写入：

- 竞品样本边界、基础 IM 与 AI/Agent 双层 Taxonomy；
- 证据等级、结论状态、套餐/角色/平台/地区/发布态等限制字段；
- Slack、Microsoft Teams、Discord 的官方一手来源地图；
- 逐产品审计表、跨产品矩阵和升级候选池模板，以及待用户确认的研究口径。

`4.1` 不写具体竞品 Feature 有无结论、成熟度排名或 ClassIn 升级优先级；这些内容分别留到 `4.2—4.7`，并在每一阶段经过证据审计和用户校准。

第四步的 `4.2` 只写入 Slack 单品事实：官方产品定位和信息架构、套餐价值围栏、基础 IM 与 AI/Agent 原子 Feature、端到端操作链、教育行业方案、负向事实、限制与证据缺口。当前不执行 Teams、Discord，不提前形成跨产品排名或 ClassIn 升级优先级。

`4.2` 的术语显示统一保留英文原名作为检索键，并在核心术语、章节首次出现和 241 项原子功能名称中补充中文。中文明确区分 Slack 官方简体中文名、保留品牌名后的解释性中文、研究原子能力释义和暂译。

第四步的 `4.2B` 只写入 Slack 241 项与 ClassIn Online/Demo 的能力桥接、互斥映射状态、ClassIn 反向优势、差距主题和未排序候选长名单。`CLASSIN_ADVANTAGE` 只表示教育适配或 Demo 设计模型更贴合，不代表通用能力或生产成熟度全面领先；所有候选保持 `RECOMMENDATION / UNPRIORITIZED`。

Microsoft Teams `4.3`、Discord `4.4` 已按用户 2026-08-30 最新决定标记为 `PAUSED_BY_USER`，不会因 Slack Review Gate 已通过而自动启动。依赖多竞品事实的 `4.5/4.6` 同步暂停。
