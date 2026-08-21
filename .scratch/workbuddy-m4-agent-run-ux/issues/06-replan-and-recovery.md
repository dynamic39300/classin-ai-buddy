# 06 — 交付停止、补充、Replanning 与写回异常恢复

**What to build:** 教师可以在原对话中补充普通要求、停止执行、改变教学范围、查看影响并 Replanning；保存时的权限拒绝、版本冲突、超时和临时失败均在同一 Timeline 中给出受治理恢复，而不丢失旧证据。

**Blocked by:** 05 — 完成课件编辑、AI 修改、审批与成功 Receipt。

**Status:** complete

- [x] 普通补充只影响未开始步骤，重大变化进入影响确认。
- [x] Replanning 产生新 Snapshot/Plan/Artifact 身份并保留 superseded 证据。
- [x] 停止、取消和恢复具有显式事件与允许命令。
- [x] 权限、冲突、超时、临时失败和重试保持既有领域不变量。
- [x] 重试不重复已成功副作用，恢复后的 Action/Approval/Receipt 归属正确。
- [x] 历史恢复不把旧 Artifact 的派生关系误投影到新版本。
