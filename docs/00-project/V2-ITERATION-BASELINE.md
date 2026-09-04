---
title: ClassIn TeacherIn 2.0 迭代迁移基线
status: MIGRATED_VERIFIED
version: v0.2
date: 2026-08-27
---

# ClassIn TeacherIn 2.0 迭代迁移基线

## 目的

本目录是 ClassIn TeacherIn 2.0 的设计与开发工作区。2.0 从既有可运行项目迁入，先保留产品事实、锁定决策、核心代码、测试和设计证据，再通过新的 Spec 与决策记录推进升级；“2.0”本身不自动改写任何既有 `LOCKED` 决策。

## 来源快照

- 来源目录：`/Users/eeo/Documents/claudecode/classin-ai-buddy`
- 来源分支：`codex/workbuddy-m3-shell`
- 来源提交：`41962e4a2ca52e93f712e3f56e6e0f77dc1eb6e2`
- 迁移日期：2026-08-27
- 迁移语义：复制来源目录当时的工作树，而不是只复制最后一次提交。

来源工作树中的以下未提交内容也已纳入 2.0 基线：

- `index.html`
- `public/manifest.webmanifest`
- `src/app/App.tsx`
- `src/app/shell/ImmersiveMessageWorkspaceFrame.tsx`
- `src/app/shell/Sidebar.tsx`
- `src/design-system/TeachBuddyAvatar.module.css`（来源快照中的历史文件名；当前已按 D-132 迁移为 `TeacherInAvatar.module.css`）
- `src/design-system/TeachBuddyAvatar.tsx`（来源快照中的历史文件名；当前已按 D-132 迁移为 `TeacherInAvatar.tsx`）
- `src/features/role-switch/ui/RoleSelectPage.tsx`
- `src/features/standalone-workbuddy/StandalonePublicPages.tsx`
- `docs/05-engineering/SUBDIRECTORY-STATIC-DEPLOYMENT.md`
- `src/shared/`

## 已迁入范围

- 根工程与质量配置：npm、TypeScript、Vite、ESLint、Playwright、设计 Token；
- 核心实现：`src/`、`public/`；
- 自动化验证：`tests/`，包括视觉回归基线；
- 产品、研究、设计、Spec、工程与架构事实：`docs/`；
- 原型说明与关键演示资产：`prototype/`；
- Agent 入口与项目上下文：`AGENTS.md`、`CLAUDE.md`、`CONTEXT.md`；
- 辅助工具：`tools/`。

当前目录原有的 `ClassIn IM-此前计划迭代升级的资料/` 与 `classin im 当前设计现状/` 保持原位，未被来源项目覆盖。

## 明确未迁入

- 来源仓库 `.git/`：2.0 使用独立工作区边界，不继承来源分支和远端写入关系；
- `node_modules/`、`dist/`、Playwright 报告、测试结果、缓存和临时目录：均可重新生成；
- `reference/`：约 6.2GB 的原始本地调研素材不属于核心代码基线；已经提炼的一手证据继续保留在 `docs/01-research/`；
- `.env*`、凭据和密钥：未发现需要迁入的项目凭据，也不允许后续提交。

## 2.0 开始规则

1. 先读 `AGENTS.md`、`PROJECT-BRIEF.md`、`DECISION-LEDGER.md` 与本文件，完成条件是明确当前事实、锁定决策和来源边界。
2. 把 2.0 的目标、明确不做的范围、成功指标和首条纵向切片写入新的 Feature Spec；完成条件是每项需求都有可验收状态和责任边界。
3. 新方案与既有 `LOCKED` 决策冲突时，先在决策台账记录替代关系和用户确认；完成条件是没有两条同时生效但互相矛盾的事实。
4. 设计与开发继续使用现有 Module、Interface、Seam、Adapter 和显式状态模型；完成条件是页面、领域、Adapter 与测试的依赖方向可检查。
5. 每个 2.0 纵向切片以 `npm run check`、`npm run build` 和适用的浏览器/视觉验证收口；完成条件是结果与剩余风险写回对应 Spec。

## 尚未锁定

2.0 的产品范围、优先级、技术架构变化、真实服务接入范围与发布计划尚未由本次迁移定义。后续不得从目录名或旧版原型材料推断这些结论。

## 迁移验证

2026-08-27 已完成：

- 来源与目标的 `docs/`、`src/`、`tests/`、`prototype/`、`public/`、`tools/` 逐文件比较无意外差异；目标只新增本迁移基线，`AGENTS.md` 与 `README.md` 只增加 2.0 入口；
- `npm ci` 成功，安装 262 个包，审计结果为 0 个已知漏洞；
- `npm run check` 通过：TypeScript、ESLint、94 个 Vitest 文件与 589 项测试全部通过；
- `npm run build` 通过；保留约 1.42MB 主 JavaScript chunk 的已有性能提醒；
- Chromium E2E 全量并发运行 142 项，其中 140 项直接通过；2 项消息转场/通知链路时序用例在单 worker 精确复跑时 2/2 通过，归类为并发波动；
- 视觉回归基线已迁入，但本次只做搬运，不更新也不批量执行全量视觉快照。

验证期间还观察到一条既有 React 控制台告警：列表中出现重复的 `教案` key。它未导致本次测试失败，属于后续 2.0 稳定化待诊断项，不在迁移任务中直接修改。

当前目录已初始化为独立本地 Git 仓库，分支为 `main`；尚未创建提交，也未配置远端。
