---
title: ClassIn PC 产品基座迁移清单
status: M3_COMPLETE
version: v0.3
date: 2026-08-20
source_repository: /Users/eeo/Documents/claudecode/classin-pc-optimizer
source_branch: main
source_commit: ff5dfa0f332f4a937aa6faa8b2b88a0313858a8c
---

# ClassIn PC 产品基座迁移清单

## 1. M0 源状态

- 源仓库：`/Users/eeo/Documents/claudecode/classin-pc-optimizer`；
- 分支/Commit：`main@ff5dfa0f332f4a937aa6faa8b2b88a0313858a8c`；
- Commit 说明：`2026-08-13 feat: add dual-platform experience presentation`；
- M0 检查时源 Git 工作区 clean；
- Git 跟踪文件：986，约 402MB；
- 产品代码：`src/` 223 个文件，约 1.3MB；
- 测试：`tests/` 131 个文件，约 8.7MB。

## 2. M0 基线验证

| 验证 | 结果 |
|---|---|
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run test` | `307/310 PASS`；3 个集成用例在全量并行时超过 5 秒 |
| 3 个 timeout 用例 `--maxWorkers=1` 复跑 | `37/37 PASS` |
| `npm run build` | `PASS`；仅有主 JS chunk 大于 500kB 的非阻塞警告 |

三个并行 timeout 文件：

- `tests/integration/class-workspace.test.tsx`；
- `tests/integration/space-workspace.test.tsx`；
- `tests/integration/teaching-insights-workspace.test.tsx`。

迁移后同样先做全量验证，再单线程复跑 timeout 用例，以区分源基线波动和迁移回归。

### 源浏览器基线缺口

源仓库产品角色选择页已经使用“学生视角”，但 13 个 E2E 用例和若干 Visual 用例仍寻找旧标签“学生/家长视角”。该失败已在源仓库同一 Commit、单线程、单用例条件下原样复现，属于源测试与源 UI 不一致，不是迁移回归。

## 3. 导入 Write Set

### 目录

- `src/**`；
- `public/**`；
- `tests/**`。

### 根配置

- `.editorconfig`；
- `index.html`；
- `package.json`；
- `package-lock.json`；
- `eslint.config.js`；
- `playwright.config.ts`；
- `tokens.css`；
- `tsconfig.app.json`；
- `tsconfig.json`；
- `tsconfig.node.json`；
- `vite.config.ts`。

## 4. 明确排除

- 源 `.git`、`.agents`、`.hallmark`、`.scratch`、`skills-lock.json`；
- `node_modules`、`dist`、`coverage`、`playwright-report` 和其他缓存；
- 源 `docs/**`、`reference/**`、根 `README.md`、`CONTEXT.md`；
- 源 `AGENTS.md` 和 `CLAUDE.md` 原文件；
- `pnpm-lock.yaml` 与 `.pnpm-store`；
- 当前 WorkBuddy `docs/**`、`reference/**`、`prototype/**` 和用户已有修改。

## 5. 迁移后收敛

- 当前 `AGENTS.md` 合并源项目的角色隔离、单应用目录、测试与视觉门禁；
- `CLAUDE.md` 继续只指向当前 `AGENTS.md`；
- `docs/05-engineering/` 更新为 npm 单应用前端 + 保留未来 WorkBuddy 后端/Harness Spec；
- 根 `README.md` 更新运行命令和真值边界；
- 在现有老师导航中增加 AI Agent 一级入口，并由 Shell 提供扁平二级导航 Slot；
- 迁入后不立刻实现 43 个页面，先通过 M1 基线 Review。

## 6. M1 目标验证

| 验证 | 结果 |
|---|---|
| `npm ci` | `PASS`；0 vulnerabilities |
| 初始迁入 `npm run check` | `PASS`；43 files、310 tests |
| 当前 Ticket 01 `npm run check` | `PASS`；43 files、311 tests（含教师 AI Agent 导航 Domain 断言） |
| `npm run build` | `PASS`；仅有 816.12kB 主 JS chunk 非阻塞警告 |
| 旧学生标签单用例（修正前） | `FAIL`；在源与目标仓库相同失败 |
| 修正目标测试选择器后单用例 | `PASS` |
| `npm run test:e2e -- --workers=1` | `51/51 PASS` |

目标测试只把旧选择器更新为当前公开 UI 标签“学生视角”，没有修改产品文案或业务行为。Visual 测试中的相同旧选择器同步维护；视觉快照在 M3 综合 Review Gate 统一验收。

## 7. M2 规范收敛

- `AGENTS.md`、README、工程、前端、目录与测试规范已统一为 npm 单应用事实；
- D-023 已锁定 ClassIn PC 产品基座与教师 WorkBuddy 的同一依赖图；
- 教师/学生页面树禁止互相导入内部页面实现；
- 非测试 Domain 文件禁止依赖 React、App、Pages、Features、Mocks 或 Design System；
- 上述角色与 Domain 依赖边界已进入 ESLint 门禁；
- `CLAUDE.md` 保持只指向当前 `AGENTS.md` 的最小规则入口。

## 8. M3 实施入口

- 实施规格：`docs/04-specs/features/workbuddy-v1-workspace/IMPLEMENTATION-SPEC.md`；
- 本地 Tickets：`.scratch/workbuddy-v1-shell/issues/`；
- 最高测试 Seam：角色选择 → 教师 AppShell → AI Agent 一级入口 → 扁平二级导航与 Work Surface；
- 六个 M3 Tickets 均已完成；最终证据见下一节。

## 9. M3 最终验收

| 验证 | 结果 |
|---|---|
| `npm run typecheck` | `PASS` |
| `npm run lint` | `PASS` |
| `npm run test -- --maxWorkers=1` | `44 files / 312 tests PASS` |
| `npm run build` | `PASS`；仅有主 JS chunk 大于 500kB 的既有非阻塞警告 |
| 全量 `tests/e2e` 单线程 | `57/57 PASS` |
| 最终 WorkBuddy E2E | `6/6 PASS` |
| WorkBuddy 1440×900 Visual | `2/2 PASS` |
| Spec Review | `PASS`；无剩余 P0–P3 finding |
| Standards Review | `PASS`；无剩余 P0–P3 finding |

M3 已交付 ClassIn 教师一级 `AI Agent` 入口、扁平二级导航、新建任务、带显式状态/命令/恢复路径的历史 Run、单一 Artifact 面板与 Focus、会话级历史管理及真值标签。所有数据仍为固定版本 `workbuddy-m3-v1` 的脱敏 Mock；没有真实 Agent、ClassIn API、文件生成或业务写回。
