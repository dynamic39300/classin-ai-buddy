# 10 — 完成 NineClaw 还原、视觉与 M4.1 Review Gate

**What to build:** 把单课件、方案包、恢复和派生链组合成可稳定重置、可访问、可视觉复核的 M4.1；对照逐帧矩阵证明交互覆盖和智能课件语义连续，并在全量检查通过后移除不再使用的 Stage-only Projection。

**Blocked by:** 06 — 停止、Replanning 与异常恢复；08 — 方案包部分成功与重试；09 — 派生方案包与双向恢复。

**Status:** ready-for-agent

- [ ] 22 个 NineClaw 源事件全部有可验收去向或上下文边界。
- [ ] 确认卡、计划、运行调用、Artifact、编辑、Action、Approval、Receipt 关键视觉帧通过。
- [ ] 目标 Timeline 不含教学动画/课后练习源任务残留。
- [ ] 1440×900、紧凑桌面、Reduced Motion、键盘与 axe 验收通过。
- [ ] 现有 M4 Domain/Adapter 契约无回归。
- [ ] Typecheck、Lint、完整 Vitest、Build、E2E、Visual 和两轴 Code Review 通过。
- [ ] 新 Surface 全量接管后才删除 Stage-only UI，不删除领域证据或恢复能力。
