# 07 — 交付 Context Replanning、Projection 与恢复

**What to build:** 教师在 Run 中修改主教学范围时，可以先查看影响，再生成新 Snapshot 和计划；旧 Snapshot、步骤和产物作为 superseded 证据保留，执行详情只展示实际 ContextProjection。

**Blocked by:** 02 — 交付单课件目标到 Artifact；05 — 交付课程方案包与部分成功回执。

**Status:** complete

- [x] 修改主班级/课程先展示被移除 Context、受影响步骤、Artifact 和 Action。
- [x] 返回修改、取消和确认重新规划均有明确结果，不静默应用。
- [x] 确认创建新 ContextSnapshot 和计划，旧对象标记 superseded 并保留原因。
- [x] 过程详情展示 CapabilityManifest、使用目的、裁剪/脱敏和实际 ContextProjection。
- [x] Artifact、Context、执行详情切换不丢当前活动面板；Context 草稿只在教师确认后应用。
- [x] 当前会话恢复回到正确 Run、Artifact、活动面板和 Receipt；跨刷新恢复不在 M4 范围。
- [x] Domain、浏览器、可访问性和视觉验收通过。

**Verification:** Course Production Domain replanning test；影响预览→新 Snapshot→superseded evidence E2E；派生 Run 返回源 Run 时恢复 Artifact 活动面板。
