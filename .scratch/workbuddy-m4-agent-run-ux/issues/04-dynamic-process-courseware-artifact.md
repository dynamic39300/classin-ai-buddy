# 04 — 动态执行 Skill/Tool 过程并交付可预览智能课件

**What to build:** 教师批准计划后，可以看到步骤和 Capability Call 依次从等待、运行到完成；阶段结果最终产生稳定智能课件 Artifact，右侧统一辅助区按规则切到“产出”，同时保留左侧 Timeline。

**Blocked by:** 03 — 在 Timeline 内完成补参、ContextSnapshot 与 Plan 确认。

**Status:** complete

- [x] 每一步至少可见一次 running，不用随机数或真实墙钟驱动测试。
- [x] Skill/Tool 卡展示教师摘要、用途、ContextProjection、输入输出、耗时与结果。
- [x] 当前/失败调用展开，完成的低层调用可折叠。
- [x] 用户上滚时停止自动跟随并显示新增事件数。
- [x] Artifact 到达先有来源事件，再更新右侧未读/预览。
- [x] 产出标题、内容和完成总结始终是同一个智能课件，不残留 V04/V06 源任务语义。
