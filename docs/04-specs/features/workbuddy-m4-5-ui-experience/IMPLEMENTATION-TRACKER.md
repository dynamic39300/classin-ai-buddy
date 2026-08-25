---
title: M4.5 IM 与 TeachBuddy UI/UX 实施追踪
status: COMPLETE_USER_ACCEPTED
date: 2026-08-25
---

# M4.5 IM 与 TeachBuddy UI/UX 实施追踪

| Ticket | 交付物 | 状态 |
| --- | --- | --- |
| M45-IM-01 | 光标感知 `@` 查询、键盘选择与行内 Agent 目标 | IMPLEMENTED |
| M45-IM-02 | Agent Picker 信息降噪、末项滚动、关闭与聚焦展开 | IMPLEMENTED |
| M45-IM-03 | 班级会话 Header、Agent 横幅与私聊隐私提示降噪 | IMPLEMENTED |
| M45-IM-04 | 共享动态 TeachBuddy 头像、首次逐字欢迎语、上下文重排 | IMPLEMENTED |
| M45-IM-05 | 自适应产物编辑器与 Sidecar 底部布局修复 | IMPLEMENTED |
| M45-IM-06 | 沉浸退出引导重组 | IMPLEMENTED |
| M45-IM-07 | 产品可见“模拟/仿真”文案清理，保留内部 truth metadata | IMPLEMENTED |
| M45-IM-08 | Integration、Chromium E2E、Visual 与文档回归 | VERIFIED |
| M45-IA-09 | 集成版 TeachBuddy 隐藏“设置”发布入口，保留实现与独立产品设置 | VERIFIED |
| M45-IA-10 | 班级课程页“我的教学伴侣”整卡入口与视觉层级优化 | VERIFIED |

## Write Set

- `src/design-system/TeachBuddyAvatar*`
- `src/design-system/WorkspaceComposer*`
- `src/features/message-workspace/*`
- `src/features/class-agent-conversation/AgentMentionPicker*`
- `src/features/workbuddy-im-assistance/*`
- `src/app/shell/ImmersiveMessageWorkspaceFrame*`
- 复用 TeachBuddy/Standalone/Class 页面中的可见开发阶段文案
- 对应 `tests/integration`、`tests/e2e`、`tests/visual` 与本目录文档

## 明确不改变

- M4.2～M4.4 的 Domain 状态机、Execution Evidence 与产品数据隔离；
- `ideal-full`、`classin-mvp`、`standalone-teacher` 的路由及 Session Namespace；
- Class Agent 授权、公开/私聊渠道、消息历史与重试语义；
- 真实服务、支付、OAuth 或生产发布能力。

## 验证证据

- `npm run typecheck`、`npm run lint`、`git diff --check` 与 `npm run build` 均通过；build 仅保留既有大 chunk 提示。
- 全量 Vitest：93 个文件、586 项测试通过；本批目标 Integration：65 项通过。
- Chromium 关键旅程按两组完成回归：消息/班级 46 项、跨 WorkBuddy 页面 59 项；修订后的目标用例均通过。
- 封版复验：全量 Chromium E2E 首轮 140/142 通过；一个并发转场首帧断言单 worker 连续 3 次通过，另一个旧题库标题断言已按当前可访问名称修正并连续 3 次通过；39 项 `@a11y` 全部通过。
- 受影响的 69 个可执行 Visual 场景完成基线更新并稳定复跑，3 个既有条件跳过；动态头像区域使用固定遮罩，避免视频帧造成非结构性漂移。
- 2026-08-25 用户确认 M4.5 阶段体验验收完成；产品版本与汇报材料按独立 Git 提交分别封存。
