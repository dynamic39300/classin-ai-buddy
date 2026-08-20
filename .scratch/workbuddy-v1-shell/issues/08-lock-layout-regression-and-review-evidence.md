# 08 — 锁定布局回归与 Review 证据

**What to build:** 为已嵌入左侧栏的 Agent 导航建立可复现的浏览器、视觉、键盘与质量门禁，使布局调整不会回归已验收的 M3 功能。

**Blocked by:** 07 — 将 Agent 二级导航嵌入 ClassIn 左侧栏。

**Status:** completed

- [x] 浏览器旅程证明导航归属、路由可达性、历史管理、Artifact 和 Core Context 入口没有回归。
- [x] 1440×900 与紧凑桌面视觉检查证明工作区扩宽、无溢出、无不可达操作。
- [x] 可访问性、Focus、Reduced Motion、滚动所有权和真值标签通过检查。
- [x] Typecheck、Lint、相关 E2E、Visual、完整 Vitest、全量 E2E 和生产构建通过。
- [x] 完成 Spec/Standards 双轴 Review，回写决策、规格、票据和验收状态并提交当前分支。

## 完成证据

- `npm run typecheck`、`npm run lint`：PASS；
- Vitest：44 files、312 tests PASS；
- 全量 E2E 单 worker：57/57 PASS；WorkBuddy 定向 E2E：6/6 PASS；
- WorkBuddy Visual：3/3 PASS，覆盖 1440×900 新任务、Run + Artifact 与 1000×768 紧凑导航；
- Production build：PASS，仅保留既有 chunk-size 非阻塞警告；
- Standards Review：PASS；Spec Review：PASS；无剩余 P0–P3 finding。
