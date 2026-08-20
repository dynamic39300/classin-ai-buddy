# 07 — 交付 Context Replanning、Projection 与恢复

**What to build:** 教师在 Run 中修改主教学范围时，可以先查看影响，再生成新 Snapshot 和计划；旧 Snapshot、步骤和产物作为 superseded 证据保留，执行详情只展示实际 ContextProjection。

**Blocked by:** 02 — 交付单课件目标到 Artifact；05 — 交付课程方案包与部分成功回执。

**Status:** ready-for-agent

- [ ] 修改主班级/课程先展示被移除 Context、受影响步骤、Artifact 和 Action。
- [ ] 返回修改、取消和确认重新规划均有明确结果，不静默应用。
- [ ] 确认创建新 ContextSnapshot 和计划，旧对象标记 superseded 并保留原因。
- [ ] 过程详情展示 CapabilityManifest、使用目的、裁剪/脱敏和实际 ContextProjection。
- [ ] Artifact、Context、执行详情切换不丢未应用草稿或当前选择。
- [ ] 历史恢复回到正确 Snapshot、计划、Artifact、活动面板和 Receipt。
- [ ] Domain、浏览器、可访问性和视觉验收通过。
