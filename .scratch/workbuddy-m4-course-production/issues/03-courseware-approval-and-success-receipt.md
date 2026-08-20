# 03 — 交付单课件审批与成功回执

**What to build:** 教师审阅单课件后，可以提出保存到 ClassIn 的业务动作、检查差异与风险、明确审批，并由 Mock ClassIn Adapter 返回可追溯的成功 ExecutionReceipt。

**Blocked by:** 02 — 交付单课件目标到 Artifact。

**Status:** complete

- [x] Artifact 的保存动作先创建 ProposedAction，不直接改变 ClassIn 对象。
- [x] 审批前显示目标、差异、影响、来源版本、权限、风险、可逆性和过期信息。
- [x] Approval 与执行成功是不同状态，拒绝不会产生 Receipt 或业务写入。
- [x] Mock Adapter 校验审批契约和 idempotencyKey，并返回稳定对象 ID/版本；expectedVersion 已进入 Action 契约并将在失败场景 Ticket 04 验证。
- [x] 只有 ExecutionReceipt 可以把动作表达为成功，且提供返回 ClassIn 对象入口。
- [x] 重复批准或刷新后的重放不会创建重复副作用。
- [x] Domain、Adapter contract、浏览器、键盘、可访问性和视觉验收通过。

**Verification:** Writeback Domain 2/2；Adapter contract 1/1（含幂等重放）；M4 成功写回 E2E 与 axe 通过；ExecutionReceipt 1440×900 baseline 已人工检查。
