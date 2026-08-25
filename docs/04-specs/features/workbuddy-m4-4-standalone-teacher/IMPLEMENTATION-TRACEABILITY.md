---
title: M4.4 独立教师 ClassIn TeachBuddy 实现追踪
status: COMPLETE
version: v1.2
date: 2026-08-25
fixed_point: 6508529
---

# M4.4 Implementation Traceability

## 1. Product Assembly

| 需求 | 实现 | 验证 |
| --- | --- | --- |
| M44-PRD-001～004 独立官网与获客表达 | `StandalonePublicPages.tsx`、产品界面预览资产、Landing CSS | Integration Landing；Visual `landing-1440x900` |
| M44-PRD-010～013 教师个人账号 | `domain/standalone-workbuddy/identity.ts`、`standalone-session.ts`、`StandaloneAuthPage` | Identity Unit；Auth Integration；Guard E2E；Visual Register |
| M44-PRD-020 独立产品组合 | `App.ProductComposition` 在 ClassIn Provider 挂载前分流；`StandaloneWorkBuddyBridge` 独立注入 | E2E 断言无 ClassIn 主导航；Class Workspace / WorkBuddy Shell 回归 |
| M44-PRD-021～023 全功能工作台 | `standalone-teacher-workbuddy-experience.ts`、`StandaloneWorkBuddyRoutes/Shell` | Profile Unit；1440×900 / 1024×640 Visual；全量 WorkBuddy E2E 回归 |
| M44-PRD-024 内容/文件资源独立闭环 | Profile `productBoundary`、`standalone-content-library.ts`、`standalone-file-library.ts`、个人内容 Module、Profile-aware `AiAgentWorkSurface/CapabilityWorkspace/FileLibrary` | Standalone catalog/Content Module Unit；Chromium 发布→列表→刷新恢复、文件详情→个人 Context E2E；断言无 `/teacher`、TeacherIn/Space/机构数据 |
| M44-PRD-025 TeacherIn 内容格式兼容 | `domain/teacherin/content.ts` 权威 `teacherin-content-v1` 类型与 Validator；Standalone 内容 Module 在发布与 Session 恢复边界校验；D-107 与兼容架构说明 | Schema/证据链/非法 Session Unit；所有内置与个人发布内容通过权威 Validator；真实 API Adapter 仍为未来 Gate |
| M44-PRD-022/025 账号级数据隔离 | `createStandaloneTeacherWorkBuddyExperience(accountId)`、账号级 Workspace Namespace、独立能力 fixture 与账号过滤内容 Session | Profile/Session/Capability Unit；两个账号的 Task、Capability、个人内容发布与点数 Chromium 隔离旅程 |

`/workbuddy/*` 不挂载 `RoleSessionProvider`、`ClassWorkspaceProvider`、Homework、Message、IM、Class Agent 或 ClassIn WorkBuddy Bridge。它只复用 WorkBuddy Domain、稳定 Surface、能力 Registry、模板和 Adapter Interface。

## 2. Context and Conversion

| 需求 | 实现 | 验证 |
| --- | --- | --- |
| M44-PRD-030 未连接事实持续可见 | 独立 Shell `connectionBanner` | E2E / Visual |
| M44-PRD-031 手动 Context 可执行 | `mocks/scenarios/standalone-workbuddy.ts` 仅含 `teacher-input` / `domain-knowledge` | 任务创建 E2E；Cross-boundary import audit |
| M44-PRD-032 不伪造正式写回 | Standalone Adapter 组合对 ClassIn writeback 返回 permission denied；测验在审阅后保存个人内容，不展示 ClassIn 活动参数或 `/teacher/*` 链接 | Workspace session recovery/Content Unit；Standalone 测验生成→审阅→个人保存 E2E |
| M44-PRD-033 解释连接增量 | `StandaloneClassInPage.tsx` 对照“独立使用 / [未来] 连接”，官方 ClassIn CTA | E2E；Visual `classin-value-1440x900` |

## 3. AI Points and Membership

| 需求 | 实现 | 验证 |
| --- | --- | --- |
| M44-PRD-040～041 AI 点数与固定报价 | `commerce.ts` 的 `QUOTES`；可选 `WorkBuddyTaskAdmission` Seam | Commerce Unit；New Task Visual |
| M44-PRD-042 余额不足阻断 | `AiCreditModule.reserve` 返回 `insufficient`，不调用 `createRun` | Integration exhaustion；E2E 零余额→充值→恢复 |
| M44-PRD-043 预占/结算/释放 | `reserve/settle/release` 显式状态和不可变流水 | Commerce Unit；Session guard negatives |
| M44-PRD-044 幂等与冲突关闭 | 完整请求指纹；相同 key 回放、不同载荷 `evidence_mismatch` | Commerce Unit |
| M44-PRD-045 点数流水 | `AiCreditViewModel`、Credits Page、`[模拟]` ledger | Membership E2E / reload；Credits Visual |
| M44-PRD-050～054 三档方案与模拟订单 | `MEMBERSHIP_PLANS`、Order Module、原生 Modal Dialog、到账 Receipt | Commerce Unit；Membership E2E/a11y；Order Visual |

Commerce Session 边界验证账号钱包、固定报价、Reservation 状态、Ledger 连续余额、Reservation→Run、Order→Receipt→Grant、唯一 ID/key 和固定 `[模拟]` 真值。损坏数据 fail closed，不从另外两个 Experience 回退。

## 4. Test Assets

- Unit：`identity.test.ts`、`commerce.test.ts`、`content.test.ts`、Standalone Capability/Content/File catalog、Profile 与 Workspace Session tests；
- Integration：`tests/integration/standalone-workbuddy.test.tsx`；
- E2E/a11y：`tests/e2e/standalone-workbuddy.spec.ts`；
- Visual：`tests/visual/standalone-workbuddy.visual.spec.ts` 与 8 张稳定基线；
- Regression：全量 Vitest、Class Workspace、Ideal/MVP WorkBuddy、全量 Chromium E2E。

## 5. Deliberate Boundaries

- 登录、订单、金额、点数和运行结果均为固定本地 `[模拟]` 体验；
- 不接真实 OAuth、短信、支付、模型 Runtime、ClassIn API 或跨设备同步；
- “连接 ClassIn”只解释 `[未来]` 增量并进入官方站点，不生成虚假申请 Receipt；
- 当前固定 Demo Run ID 由既有 WorkBuddy Runtime fixture 拥有；点数流水通过 Reservation ID 保持多次执行证据可区分。
- Standalone 的内容/文件目录、来源、改编与 Context 引用路径独立于 TeacherIn/Space；共享的只是 Surface 结构和交互规则。
- 内容对象虽独立存储，但内容格式与 TeacherIn 权威 `teacherin-content-v1` 契约完全兼容并在 Session 边界 fail closed；当前 Demo 不宣称真实 API、同步或生产授权已上线。
