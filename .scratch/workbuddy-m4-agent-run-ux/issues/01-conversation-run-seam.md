# 01 — 建立 ConversationRun Seam 并投影一个可恢复的 Run

**What to build:** 教师打开一个现有课程生产 Run 时，页面可以通过统一 ConversationRun Interface 获得有序 Timeline、当前等待点、对象引用和允许命令；确定性 Experience Adapter 与未来真实 Agent Runtime 共享同一契约，现有 M4 Surface 在迁移期间继续可用。

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] `open / dispatch / subscribe` 与 cursor replay 的公开契约可测试。
- [x] 事件拥有稳定 ID、sequence、状态、Run/Object 引用和允许命令。
- [x] 重复命令不会产生重复事件或业务动作。
- [x] 一个已完成单课件 Run 可恢复 Goal、Plan、Process、Artifact、Action 与 Receipt。
- [x] 旧 Surface 与现有 M4 测试保持绿色。

**Verification:** ConversationRun public Seam 2/2；课程生产、写回 Domain 与 Adapter 聚焦回归共 30/30；TypeScript 通过。
