# 06 — 交付从课件派生课程方案包

**What to build:** 教师可以从已审阅课件创建一个关联但独立的课程方案包 Run，明确复用源 Artifact，同时重新确认本次 Context 和产物范围。

**Blocked by:** 02 — 交付单课件目标到 Artifact；05 — 交付课程方案包与部分成功回执。

**Status:** ready-for-agent

- [ ] 课件 Artifact 提供“基于此课件生成课程方案包”入口。
- [ ] 派生操作创建新 Run ID、parentRunRef 和 sourceArtifactRef，不改变原 Run Task Type。
- [ ] 新 Run 独立确认 ContextSnapshot，不继承原任务未使用的隐式 Context。
- [ ] 原课件版本、原 Run、Receipt 和返回现场保持不变。
- [ ] 新旧 Run 可以互相定位来源/派生关系并正确恢复历史现场。
- [ ] Domain 不变量、浏览器旅程、键盘和真值标签验收通过。
