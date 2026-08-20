# 06 — 完成 M3 综合验收与 Review Gate

**What to build:** 把产品基座、两级导航、新任务、历史 Run、Artifact 和历史管理组合成可稳定演示和审阅的 M3 版本，并留下完整验证与审查证据。

**Blocked by:** 03 — 交付新建 Agent 任务闭环；04 — 交付历史 Run 与 Artifact 面板闭环；05 — 交付任务历史管理闭环。

**Status:** completed

- [x] 最高层浏览器旅程覆盖教师进入 AI Agent、操作两级导航、打开任务、切换能力、返回 ClassIn 页面和再次进入。
- [x] 1440×900 视觉验收同时显示两级导航、六条历史、新建/当前 Run 和唯一主行动。
- [x] 可访问性、键盘操作、Focus、Reduced Motion、滚动所有权和真值标签通过检查。
- [x] 类型检查、Lint、完整 Vitest、生产构建和相关 Playwright E2E 通过；源基线缺口与本次回归分开报告。
- [x] 使用代码规范与实施 Spec 两个轴完成 code review，所有 P0–P3 findings 关闭。
- [x] Migration Manifest、Implementation Spec 与 Ticket 状态回写，代码提交到当前分支并交付用户 Review。

## 完成证据

- `npm run typecheck`、`npm run lint`：PASS；
- `npm run test -- --maxWorkers=1`：44 files、312 tests PASS；
- `npm run build`：PASS，仅保留既有主 chunk 大于 500kB 的非阻塞警告；
- 全量 E2E：57/57 PASS；最终 WorkBuddy 定向 E2E：6/6 PASS；
- WorkBuddy 视觉验收：2/2 PASS，1440×900 基线已人工检查；
- 双轴 Review：Spec PASS，Standards PASS，无剩余 P0–P3 finding。
