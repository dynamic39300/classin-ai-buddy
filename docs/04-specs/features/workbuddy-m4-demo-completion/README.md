---
title: WorkBuddy M4.2–M4.5 Demo 完善路线
status: M4_5_COMPLETE_USER_ACCEPTED
version: v0.8
date: 2026-08-25
source_decision: D-077
---

# WorkBuddy M4.2–M4.5 Demo 完善路线

## 1. 路线决策

M4、M4.1、能力管理页面与 IM v0.19 已形成可运行、可审阅的 Demo 基线。进入 M5–M10 生产交付路线前，先插入四个 Demo 完善阶段，补齐场景覆盖、ClassIn 内部入口、外部产品入口和全局体验收口。

正式顺序为：

```text
M4.2  IM AI 入口地图与业务 Case 矩阵
  → M4.3  ClassIn 内嵌 MVP 入口与角色引导
  → M4.4  独立 To-Teacher / To-C 产品入口
  → M4.5  全局 IA、UI、交互与 Demo Release Gate
  → M5–M10 在独立恢复决策后继续
```

M4.3 必须先于 M4.4：先把 ClassIn 内部的 WorkBuddy、班级 Agent、角色、权限、入口和业务能力梳理完整，再从已验证的内部能力中抽取外部独立产品，避免外部入口提前发明另一套能力模型。

M5–M10 状态为 `PARKED`，不是取消。已有 M5 PRD、Feature Spec 和 Ticket Proposal 保留，不进入代码实施。

## 2. 统一能力表达

所有入口和 Case 使用三个能力层次，并以治理与评价作为横向约束：

| 层次 | 产品语言 | 主要结果 |
| --- | --- | --- |
| L1 | 理解与洞察 `Insight` | 基于已授权事实完成分析、归纳、解释、报告和图表 |
| L2 | 生成与创作 `Creation` | 生成教案、课件、作业、计划、反馈等可审阅 Artifact |
| L3 | 执行与闭环 `Action` | 经授权、审批和领域校验后写入业务系统并返回 Receipt |

`Governance & Evaluation` 贯穿 L1–L3，覆盖权限、证据引用、真值标签、人工审批、执行回执、失败恢复和 Evaluation；它不是独立的第四层能力。

## 3. M4.2 — IM AI 入口地图与业务 Case 矩阵

详细实施事实源：`M4-2-IM-AI-ENTRY-AND-CASE-MATRIX-PRD.md`、`M4-2-FEATURE-SPEC.md`、`M4-2-TICKET-BREAKDOWN.md`、`M4-2-IMPLEMENTATION-REVIEW.md`、`M4-2-USER-ACCEPTANCE-CHECKLIST.md`。

### 目标

在已验收的 IM v0.19 三渠道骨架上，回答“谁、在哪个空间、通过什么入口、调用什么 AI、可见范围是什么、能力到哪一层、谁来审批”。

### 交付

- 角色 × 渠道 × 入口 × AI 身份地图；
- 渠道 × L1/L2/L3 × Governance/Evaluation Case 矩阵；
- 教师私密 WorkBuddy、班级群公开 `@Agent`、教师 Agent 私聊、学生 Agent 私聊和教师 1v1 消息 WorkBuddy 的边界；
- 对不适合某渠道的能力明确标记“禁止/转向”及原因，不为填满矩阵制造越权能力；
- 从现有 Case Library 中选择代表性纵向 Demo，并补齐空、加载、权限、失败、恢复与人工升级。

### Review Gate

- 每个入口的角色、身份、可见范围、Context 和审批规则唯一且无冲突；
- 至少有一条教师 WorkBuddy L1→L2→L3 完整链、一条群内连续 Agent 互动和一条学生隔离辅导链；
- `[模拟]`、`[未来]` 与生产治理缺口明确。

当前锁定的 P0 Case 为 `WB-01 / WB-02 / WB-06 / PA-01 / DA-01`。其中 `WB-06` 使用格式中立的讲题 Artifact；教师先审核可编辑的最终发送话术，并可通过其中的文字链接预览讲解，批准后发送到当前班级群或当前学生私聊。具体 HTML/H5 只属于当前 Presentation Adapter 内部事实。`PA-01 / DA-01` 共用辅导能力但保留公开/私密 Channel Policy，不直接给出最终答案。

截至 2026-08-25，M4.2-01～16 的 PRD、Spec、Tickets、Implementation、自检 Review、自动化验证与用户页面验收均已完成。扩展交付包括消息正文/编辑体验、WorkBuddy Shell 统一体验，以及“生成测验并创建教学活动草稿”的完整纵向闭环。M4.2、M4.3 与 M4.4 均为 `COMPLETE_USER_ACCEPTED`；M4.4 封版前又完成账号级数据隔离、独立内容发布闭环与 TeacherIn 权威格式校验，M4.5 已具备进入条件。

## 4. M4.3 — ClassIn 内嵌 MVP 入口与角色引导

### 目标

先在 ClassIn 内部理顺 AI 能力、角色和使用场景。MVP 在班级/课程详情新增独立“我的教学助理”Launch Portal，打开教师 1:1 的完整 WorkBuddy；原“AI 应用”继续承载老师授权给班级、班级成员可用的 Agent。当前 Demo 同时保留终局一级入口和 MVP 入口；真实 MVP 发布配置可以隐藏终局入口。

### 交付

- 班级/课程详情中彼此独立的“AI 应用”与“我的教学助理”入口；
- 独立装配的终局/MVP WorkBuddy Product Module、可复用的底层 Surface、彼此隔离的历史、MVP 内跨班级连续历史、场景级 Launch Context 与返回原班级的连续性；
- 教师专属 WorkBuddy 与班级共享 Agent 的定位、权限和可见性说明；
- 教师授权班级 Agent、学生发现已授权 Agent、群聊/私聊入口的角色化引导；
- `ideal-full` / `classin-mvp` Experience Profile：首版能力完全镜像，后续只裁剪 MVP Profile，不删除终局 Module；
- 数据空间隔离：终局和 MVP 不共享 Run、历史、草稿、Artifact 索引或 Receipt；MVP 删除类型后相关终局历史完全隐藏；
- 首次进入、空状态、权限拒绝和角色切换引导。

### Review Gate

- 教师和学生能在不依赖口头解释的情况下区分 WorkBuddy 与班级 Agent；
- MVP 入口不会暴露越权能力，也不会破坏终局 WorkBuddy 路由和现有 Run；
- 从班级/课程现场进入、执行 Case、返回原现场的路径连续。

## 5. M4.4 — 独立 To-Teacher / To-C 产品入口

### 目标

从 M4.2 的场景矩阵和 M4.3 已验证的 ClassIn 内部能力中，抽取面向未使用 ClassIn 用户的独立产品体验，而不是复制 ClassIn Shell 或重新发明一套 Agent 模型。

### 交付

- 教师个人用户、个人购买者、核心 Job 和价值主张；
- 外部 Landing、教师注册登录、首个 AI 任务、可带走结果与 ClassIn 转化路径；
- 无 ClassIn Context 与连接 ClassIn 后能力增量的清晰对比；
- 模拟额度、积分、会员和升级状态，用于商业体验验证；
- 从终局能力完整复制后独立装配的教师 WorkBuddy 高保真 Demo Surface。
- 内容资源从生产起采用与 TeacherIn 完全一致的内容契约；产品运行和数据保持隔离，未来授权连接后无需格式转换即可进入内部内容生态。

### Review Gate

- 未使用 ClassIn 的目标用户可以独立完成首次价值闭环；
- 外部能力是内部已验证能力的受控子集或明确扩展；
- Standalone 内容包通过 TeacherIn 格式与语义契约，且不以页面跳转、共享数据库或默认同步冒充生态兼容；
- 不接真实支付、真实 Token 计费、生产账号权益、真实模型或生产 API。

M4.4 首期 To-C 已锁定为教师个人账号，不建设学生、家长或机构管理员产品面。未合作机构中的老师也以个人教师身份体验；机构转化通过 ClassIn 引流入口承接。

内容生态关系见 [TeacherIn 内容兼容与独立产品边界](../../../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。

## 6. M4.5 — 全局 IA、UI、交互与 Demo Release Gate

当前状态：`COMPLETE_USER_ACCEPTED`。首批实施来源为 Notion《第一部分（IM）：用户体验 UI、UX 问题 check & 优化》，详细契约与反馈映射见 [M4.5 IM 与 TeacherIn UI/UX Feature Spec](../workbuddy-m4-5-ui-experience/FEATURE-SPEC.md)。本批统一了群聊 `@` Agent、IM 页面降噪、TeacherIn 动态身份、自适应编辑器、退出引导和产品呈现层真值策略；实现与自动化回归已完成，用户于 2026-08-25 确认阶段体验验收完成。M4.2～M4.4 的底层功能、证据链和数据隔离保持不变。

### 目标

在入口和产品结构稳定后统一收口，不用视觉打磨掩盖尚未解决的信息架构问题。

### 交付

- 全局信息架构、导航、入口、角色和返回路径审计；
- 排版、配色、层级、间距、状态和品牌视觉统一；
- 触发、确认、反馈、恢复、突出与隐藏规则统一；
- 首次使用、空状态、权限和必要说明的用户引导；
- 响应式、键盘、无障碍、视觉回归、Demo 数据复位和演示脚本。

### Review Gate

新用户无需额外讲解，即可理解 WorkBuddy、班级 Agent、公开群聊 Agent 和隔离私聊 Agent 的差异，并顺利完成代表性任务。范围内功能、E2E、视觉、无障碍、Standards/Spec 双轴 Review 与用户实机验收全部通过后，才形成 Demo Release Candidate。

## 7. 实施规则

每个阶段分别执行：

```text
Discover → Product/UX Review → Feature Spec → Tickets
→ Implementation → Tests → Standards/Spec Review → User Acceptance
```

- 不把 M4.2–M4.5 合并成一次长周期开发；
- 前一阶段的用户 Review Gate 是后一阶段进入 Implementation 的条件；
- 真实 Runtime、真实业务 API、生产账号、支付和数据治理仍属于 M9/M10，不因 Demo 设计完善而提前进入；
- 历史 Session 记录保持原始编号和当时结论，不回写改名。
