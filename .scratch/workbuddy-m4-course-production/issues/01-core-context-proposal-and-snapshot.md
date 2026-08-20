# 01 — 交付 Core Context Proposal 与 Snapshot

**What to build:** 教师从 AI Agent 直接新建课程生产任务时，可以检查由现有 ClassIn Mock 事实形成的 Context 建议，明确选择教学范围并冻结一个可解释、可重置的 ContextSnapshot。

**Blocked by:** M3 已完成；本 Ticket 可立即开始。

**Status:** complete

- [x] 新任务默认只确认 Actor 与组织，不自动确认最近班级。
- [x] Core Context 面板覆盖七类结构，并显示来源、版本/更新时间、权限、敏感度和纳入状态。
- [x] 教师可选择高二物理 3 班、动量与碰撞、第一单元、聚合学习者范围、资源和 Domain Knowledge。
- [x] 层级变更会清除不兼容下级对象；缺少单课件或课程方案包必需项时进入 needs_attention。
- [x] 确认生成稳定 ContextSnapshot；普通课件 ContextProjection 不包含学生姓名。
- [x] 面板与场景支持明确 Mock 真值标签、键盘操作、Focus 返回和一键重置。
- [x] Domain、浏览器、可访问性和 1440×900 视觉验收通过。

**Verification:** `npm run typecheck`; `npm run lint`; Core Context Domain 3/3；M4 E2E 1/1；WorkBuddy visual 3/3；既有 WorkBuddy E2E 仅旧静态 Context 断言已按已审阅 M4 行为更新。
