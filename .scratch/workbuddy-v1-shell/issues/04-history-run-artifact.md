# 04 — 交付历史 Run 与 Artifact 面板闭环

**What to build:** 教师打开任一历史任务后，可以理解任务目标、使用的 Context、已完成步骤、当前步骤和阶段 Artifact，并能控制 Artifact 面板而不丢失 Run。

**Blocked by:** 02 — 交付教师 AI Agent 两级导航闭环。

**Status:** completed

- [x] 每条历史任务可通过稳定 Run URL 打开，未知 ID 具有可解释的安全状态。
- [x] Run Header 展示任务标题、状态与本地 Demo 真值。
- [x] 时间线区分目标、Context、已完成步骤和当前步骤，不默认暴露技术日志。
- [x] 同一时刻只有一个活动辅助面板；Artifact 面板可以打开和关闭且 Run 状态不丢失。
- [x] Artifact 预览、版本和保存动作不暗示真实文件已经生成或写回 ClassIn。
- [x] Run 与 Artifact 在 1440×900 无溢出、遮挡或不可达主行动。
