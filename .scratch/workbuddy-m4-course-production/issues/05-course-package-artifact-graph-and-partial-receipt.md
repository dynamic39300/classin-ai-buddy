# 05 — 交付课程方案包与部分成功回执

**What to build:** 教师可以从课程目标创建独立课程方案包 Run，审阅课件、作业、测验和录播脚本组成的 Artifact Graph，并对逐项写回结果进行处理。

**Blocked by:** 01 — 交付 Core Context Proposal 与 Snapshot；04 — 交付写回异常与恢复。

**Status:** ready-for-agent

- [ ] 课程方案包保留独立 Task Type、必需 Context 和产物清单确认。
- [ ] Artifact Graph 表达四类产物、依赖和逐项 planned/generating/ready/failed/excluded/approved 状态。
- [ ] 教师可排除或重试适用项，单项失败不抹掉成功 Artifact。
- [ ] Package Navigator 与活动 Artifact 预览共享一个右侧活动区。
- [ ] 批量审批仍可展开和取消单项，不混合不同组织或不兼容风险。
- [ ] Mock Adapter 返回对象级 succeeded/failed/not_executed/waiting 结果和部分成功 Receipt。
- [ ] 失败项可重试，已成功项不会重复执行；浏览器、Adapter、可访问性和视觉验收通过。
