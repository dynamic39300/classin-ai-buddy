# 04 — 交付写回异常与恢复

**What to build:** 教师在保存课件时可以理解并恢复权限拒绝、版本冲突和临时失败，所有失败均保留 Artifact、审批证据和未执行范围。

**Blocked by:** 03 — 交付单课件审批与成功回执。

**Status:** complete

- [x] 权限拒绝明确显示未执行目标和可用替代动作，不泄露隐藏对象。
- [x] 版本冲突显示 expected/current 版本并阻止静默覆盖。
- [x] 可恢复失败保留批准状态和 idempotencyKey，允许安全重试。
- [x] 重试成功产生同一动作关联的新稳定 Receipt，不重复已成功副作用。
- [x] Adapter contract 同时覆盖成功、幂等重放、权限拒绝、冲突和可恢复失败。
- [x] UI 状态、Focus、错误恢复和真值标签通过浏览器与视觉验收。

**Verification:** Adapter contract 4/4；权限/冲突/临时失败与重试 E2E 通过；axe serious/critical 为 0；版本冲突 1440×900 baseline 已人工检查。
