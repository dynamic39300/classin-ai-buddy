# 05 — 交付课程方案包与部分成功回执

**What to build:** 教师可以从课程目标创建独立课程方案包 Run，审阅课件、作业、测验和录播脚本组成的 Artifact Graph，并对逐项写回结果进行处理。

**Blocked by:** 01 — 交付 Core Context Proposal 与 Snapshot；04 — 交付写回异常与恢复。

**Status:** complete

- [x] 课程方案包保留独立 Task Type、必需 Context 和产物清单确认。
- [x] Artifact Graph 表达四类产物、依赖和逐项 planned/ready/failed/excluded/written_back 状态；生成中状态由显式命令边界替代计时动画。
- [x] 教师可排除或重试适用项，单项失败不抹掉成功 Artifact。
- [x] Package Navigator 与活动结果预览共享一个右侧活动区。
- [x] 批量审批仍可展开和取消单项，不混合不同组织或不兼容风险。
- [x] 固定 Mock Package Adapter 返回对象级 succeeded/failed/not_executed/waiting 结果和部分成功 Receipt。
- [x] 失败项可重试，已成功项不会重复执行；浏览器、Domain、可访问性和视觉验收通过。

**Verification:** Package Domain 1/1；对象级部分成功及失败项重试 E2E 通过；1440×900 partial receipt baseline 已人工检查；TypeScript/ESLint 通过。
