---
title: ClassIn TeachBuddy 当前状态与下一阶段计划
status: M4_4_COMPLETE_USER_ACCEPTED
version: v0.18
date: 2026-08-25
---

# 当前状态与下一阶段计划

> D-108 已锁定当前展示品牌：正式名称为 **ClassIn TeachBuddy**，界面简称 **TeachBuddy**，中文描述为 **AI 教学搭档**。下文 `WorkBuddyRun` 等 PascalCase 名称及 `workbuddy` 路径仍表示内部工程兼容标识；阶段验收原始名称仅用于历史追踪。

## 1. 当前完成事实

| 范围 | 工程状态 | 用户 Review Gate |
| --- | --- | --- |
| ClassIn PC 教师/学生产品基座 | 已迁入根 `src/` 单应用并持续可运行 | 已通过既有阶段验收 |
| M4 课程生产与 M4.1 ConversationRun | Goal → Context → Plan → Artifact → Action → Approval → Receipt → Evaluation 已实现 | M4.1 与阶段收尾已确认通过 |
| Evaluation Module | 单课件、方案包对象和 WorkBuddy IM 每次执行均保留关联完整证据链的模拟 EvaluationEvent；失败/重试历史可恢复 | 随阶段一至四收尾通过技术验收 |
| 能力管理页面 | Skills、Tools、Files、Schedules、Settings 已实现；Content 按 D-051 Dormant | 2026-08-24 用户确认五个可见页面验收完成 |
| TeachBuddy IM | 作业催交、课前准备通知、沉浸消息工作台和显式审批发送已实现 | 2026-08-24 用户确认 v0.19 验收完成 |
| 班级多 Agent 渠道 | 公开结构化 `@Agent`、教师/学生隔离私聊、授权重验、目标撤销与可恢复失败已实现 | 随 IM v0.19 验收通过 |
| M4.2 IM AI 入口地图与 Case 矩阵 | M4.2-01～16 已完成：五个 P0 Case、最终发送话术、真实题号 Context、Agent 私聊发现/历史/响应、共享消息编辑与 WorkBuddy 统一体验均已闭环 | 2026-08-24 用户验收通过 |
| 一级 WorkBuddy 测验活动草稿（纳入 M4.2 扩展交付） | PRD、Spec、Tickets 与纵向闭环已完成：连续生成并审阅试卷、确认后交互填写参数、draft-only 写回、课程详情逐题编辑、独立发布及学生可见性 | 2026-08-24 用户验收通过 |
| M4.3 ClassIn 内嵌 MVP 入口 | D-098～D-101 已实施：Demo 双入口共存，终局/MVP 独立 Product Module、Shell/导航、配置、Route 与 Data Space；MVP 左栏将原新建任务入口改名为“我的任务”，页面流程不变，并保留 Skills/Tools/Files、隐藏 Schedules/Settings；Launch Context、返回链路与跨 Experience 隔离均通过工程 Gate | 2026-08-25 用户完成页面验收，`COMPLETE_USER_ACCEPTED` |
| M4.4 独立教师 ClassIn TeachBuddy Web 产品 | 第三套独立 Product Module 已完成：独立官网、教师个人账号、完整任务/能力工作台、AI 点数预占/结算/释放、模拟会员订单、无 ClassIn Context 执行及 ClassIn 价值转化；不挂载 ClassIn 业务 Provider，不共享终局/MVP 私有数据；内容资源统一采用 TeacherIn 兼容格式，为未来受治理接入内部内容生态保留零格式转换路径 | 2026-08-25 用户完成方案与页面 Review，`COMPLETE_USER_ACCEPTED` |
| M4.5 全局 Demo 体验收口 | IA、UI、交互、引导和 Demo Release Gate；不改变 M4.2～M4.4 已验收的底层功能和业务逻辑 | 已具备进入条件，尚未开始实施 |
| M5–M10 | M5 规格已就绪；后续生产交付路线保留 | `PARKED`，待 M4.5 后独立恢复 |

所有当前运行结果均为固定、脱敏、可重置的 `[模拟]` 数据；没有真实 ClassIn API、模型 Runtime、生产授权或长期记忆。

## 2. 周一阶段一到阶段四收尾

1. 阶段一——实现审计与稳定化：硬性 Standards/Spec 缺口已修复；终局双轴复审均 all-clear；静态、单元/集成、关键 E2E 和范围视觉复验已完成。
2. 阶段二——能力页与 IM v0.19 Review Gate：五个可见能力页面及 IM v0.19 已于 2026-08-24 完成用户验收。
3. 阶段三——事实源与 Evaluation 收口：旧 workspace 决策已标为被 D-023 替代；单课件、方案包和 IM 已接入 EvaluationEvent；完整证据链失败关闭，失败/重试历史不被覆盖，也不把执行成功解释为教学效果。
4. 阶段四——三渠道 Case Library 与下一阶段：Case 已分渠道盘点并给出优先级；后续路线经用户修订为先进入 M4.2–M4.5 Demo 完善阶段，M5–M10 暂停。

## 3. 已封存基线

### 3.1 已完成的技术 Gate

- `npm run check`：TypeScript、ESLint、72 个 Vitest 文件 / 490 项测试全部通过；
- `npm run build`：生产构建通过；保留已知的约 1.23 MB 主 JS chunk 提醒；
- 关键浏览器回归：消息工作台与 M4.1 共 41 项 Chromium E2E 全部通过；
- 能力页与 IM 范围视觉：39 项通过、3 项 Dormant Module 按设计跳过；更新并稳定复跑本轮受影响的 2 张 IM 发送证据快照；
- Standards/Spec 双轴终局复审：均无剩余硬 finding；文本、代码与样式 diff whitespace 校验通过。

全仓旧视觉基线仍有独立维护债务：此前全量结果为 51 通过、3 跳过、90 失败，绝大部分是约 1% 的既有像素漂移；M4.1 视觉套件也在首帧出现约 2% 的既有漂移。未静默批量更新这些与本阶段无关的基线，仅更新并复验了本轮直接受影响的范围快照。

### 3.2 产品 Gate 结论

封存所需产品 Gate 已完成：

- 五个可见能力页面完成用户 Review Gate；Content 继续按 D-051 保持 Dormant；
- WorkBuddy IM 与班级多 Agent 渠道 v0.19 完成用户 Review Gate。

已在 `codex/workbuddy-m3-shell` 分支以提交 `4c43c49` 封存并推送能力页面、IM v0.19、Evaluation 和阶段收尾基线。

## 4. 当前路线：M4.2–M4.5

正式顺序：

1. **M4.2 — IM AI 入口地图与业务 Case 矩阵**：以角色、渠道、入口、AI 身份和 L1/L2/L3 能力层次补齐 Demo 场景表达；
2. **M4.3 — ClassIn 内嵌 MVP 入口与角色引导**：先理顺 ClassIn 内部的 WorkBuddy、班级 Agent、权限、入口和 MVP 能力范围；
3. **M4.4 — 独立 To-Teacher / To-C 产品入口**：再从内部已验证能力抽取外部获客与独立价值闭环；
4. **M4.5 — 全局 IA、UI、交互与 Demo Release Gate**：在结构稳定后统一收口体验和发布质量。

M4.3 先于 M4.4，避免外部产品入口在内部能力和角色体系未稳定时形成第二套模型。完整范围、依赖和 Gate 见 [M4.2–M4.5 Demo 完善路线](../04-specs/features/workbuddy-m4-demo-completion/README.md)。

M5–M10 保持 `PARKED`，已有文档和实现基础不删除；只有在 M4.5 完成后，经用户独立确认才恢复。

M4.2 最终工程证据：`npm run check` 84 个测试文件 / 555 项测试全通过；production build 通过；讲题最终话术、发送前预览、批准后链接、文件库、PA-01/DA-01、Agent 私聊授权目录/隔离历史/两阶段响应与新消息锚点，以及测验生成→试卷审阅→活动参数→草稿写回→课程详情编辑/发布的关键 E2E/a11y 均通过；受影响范围视觉基线通过并经人工复核。用户已于 2026-08-24 完成 M4.2 页面验收并授权版本封存。

M4.3 工程证据：`npm run check` 85 个测试文件 / 561 项测试与 production build 通过；131 项 Chromium E2E 均有绿色证据（最新并发全量 121 项通过，10 项拥塞失败随后逐项单 worker 复跑全部通过）；班级详情 1440×900、MVP WorkBuddy 1440×900/1024×640 及终局 WorkBuddy 精确视觉回归通过。用户已于 2026-08-25 完成页面验收并授权继续进入 M4.4。

M4.4 最终工程证据：PRD、Feature Spec、14 项 Tickets、实现追踪和双轴 Review 已闭环；全量 TypeScript/ESLint、92 个 Vitest 文件 / 585 项测试与 production build 通过；139 项 Chromium E2E/a11y 均有绿色证据（本轮并发全量 138 项通过，唯一既有消息转场时序用例在并发下读到首帧 `0s`，随后单 worker 精确复跑 1/1 通过）；Standalone 官网、注册、独立工作台、手动 Context、任务扣点、刷新恢复、零余额阻断、模拟会员到账、ClassIn 连接价值、账号级 Workspace 隔离、内容/文件资源独立闭环、独立测验保存和未登录 Guard 均有浏览器证据；1440×900 七个产品状态与 1024×640 工作台共 8 张基线稳定复跑通过。用户已于 2026-08-25 完成 M4.4 方案与页面 Review 并确认无问题；M4.4 可封存，M4.5 已具备正式启动条件。

M4.4 的内容生态关系已按 D-107 锁定：Standalone 与 ClassIn 在产品运行、账号和数据层继续隔离，但内容资源从生产起即遵循 TeacherIn 内容契约。未来连接动作只需要建立身份、权限、对象映射与受控写入，不需要再次转换内容格式；当前 Demo 仍不代表真实 TeacherIn API 已接通。项目总结统一引用 [TeacherIn 内容兼容与独立产品边界](../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。
