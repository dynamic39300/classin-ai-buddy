# 09 — 交付课件派生方案包与双向 Run 恢复

**What to build:** 教师从已审阅智能课件创建关联但独立的方案包 Run，重新确认 Context 和产物范围；源 Run 与派生 Run 可以双向定位，且关系严格匹配源 Artifact ID 与版本。

**Blocked by:** 05 — 完成课件编辑、AI 修改、审批与成功 Receipt；07 — 在 Conversation Run 中完成课程方案包成功主链。

**Status:** ready-for-agent

- [ ] 派生操作创建新 Run、独立 Snapshot、`parentRunRef` 和 `sourceArtifactRef`。
- [ ] 原课件 Run、Artifact、Action 和 Receipt 不被修改。
- [ ] 新旧 Run 可以往返并恢复各自 Timeline 和 Inspector。
- [ ] Replanning 后旧版本的派生关系只留在 superseded 证据，不误链当前 Artifact。
- [ ] 不创建隐藏的 Context 继承或重复业务副作用。
