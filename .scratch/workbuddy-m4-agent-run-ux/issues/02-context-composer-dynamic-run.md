# 02 — 从 Core Context 树和 Composer 创建动态智能课件 Run

**What to build:** 教师在默认展开的 Context 树中选择班级、课程、单元和资源，看到与 Composer 双向同步的 Chip，发送智能课件 Goal，并在同一个 Run Timeline 中看到教师消息、整理状态和目标理解，最终停在需要补参的可操作状态。

**Blocked by:** 01 — 建立 ConversationRun Seam 并投影一个可恢复的 Run。

**Status:** ready-for-agent

- [ ] Context 树、搜索、父子选择、最小祖先引用、权限和聚合学习者范围可操作。
- [ ] Tree 与 Chip 双向同步，Composer 显示 4 个高价值项和 `+N`。
- [ ] 发送后立即创建稳定 Run/历史条目并保持一个 URL。
- [ ] 初始动态事件经历 submitted → organizing → goal understood → requires teacher input。
- [ ] Context 默认展开且可收起，焦点和草稿不丢失。
