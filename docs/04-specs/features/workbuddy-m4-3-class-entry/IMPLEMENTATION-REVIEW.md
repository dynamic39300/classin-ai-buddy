---
title: M4.3 Implementation Review
status: IMPLEMENTED_READY_FOR_REVIEW
version: v1.3
date: 2026-09-04
---

# M4.3 Implementation Review

## 0. 2026-09-04 current review delta

班级详情 TeacherIn 卡片后的独立全屏 Shell、原导航版式、品牌区、入口班级信息和返回班级命令继续保留。导航菜单按 D-130 更新为“我的任务、技能市场、AgentIn、我的文件”；“我的任务”正文按 D-131 与一级 TeacherIn 完全同源，复用 Task Assembly 首页及完整交互。`classin-mvp` Route、Launch Context、Session Namespace 与私有任务数据继续独立。

## 1. Outcome

M4.3 已形成 `PRD → Feature Spec → Tickets → Implementation → Verify → Review` 的完整工程链。班级详情现在清晰区分班级共享“AI 应用”和教师私密 TeacherIn；MVP 入口打开独立、全屏的 TeacherIn 页面。该页面不挂载 ClassIn 原主导航，左栏以“我的任务”命名原新建任务入口，并保留技能市场、AgentIn、我的文件、入口班级信息与返回来源班级命令。

终局 `ideal-full` 与 MVP `classin-mvp` 分别由独立 Product Module 装配；只复用更低层的页面 Surface、Domain 与 Adapter Interface。Route、导航身份、能力配置、Workspace Session、Conversation Runtime、任务草稿、Receipt 缓存及业务对象幂等 scope 均已隔离。MVP 当前导航内容与首页 TeacherIn 发布项一致，隐藏 Tools、Schedules 与 Settings，但不删除底层能力或改变终局配置，终局历史也不会进入 MVP。

## 2. Review closure

| Risk | Closure |
| --- | --- |
| 同一路由挂载会让未来 MVP 裁剪影响终局 | 建立稳定 Experience Profile Interface 与两套 Route Base；页面只通过 Profile 构造内部链接 |
| 首版值相同导致误把 Profile 配置当成共享配置 | 终局与 MVP 持有独立、不可变的任务/能力配置副本；只复用底层 Surface、Domain 与 Interface |
| MVP 页面借用 ClassIn AppShell 或在原导航新增入口 | MVP Route 已移出 `AppShell`；Standalone Shell 只投影 `TeacherIn 导航`，DOM 中不存在“老师视角主导航” |
| 只过滤 UI 仍可能泄漏终局历史 | Workspace、Conversation Runtime、TeacherIn Receipt 使用独立 Namespace，且无跨 Namespace fallback |
| 相同 Demo Run/Action ID 跨 Experience 覆盖 ClassIn 对象 | 每个 Experience 使用独立 Adapter 实例；测验业务对象 ID 增加稳定 idempotency scope |
| MVP 内部链接跳回终局 | Task Bar、能力导航、新任务、Run、派生任务、失败恢复链接均通过 Profile path builder |
| 班级入口在右栏首屏不可发现 | 独立底部 Section、明确“仅你可见”和主动作；1440×900 首屏及 1024×640 均可达 |
| 返回时丢失来源课程或能力页没有返回 | class/course 来自受校验 Class Workspace；Standalone Shell 持续投影返回命令，course 作为受控 search 保留 |
| Demo 双入口互相替代 | 终局一级入口保持原样；MVP 入口只在班级详情新增，学生侧不可见 |
| “我的任务”被误实现为新任务目录页 | 撤回 `/tasks` 与目录 Surface；只调整左栏显示名称，保留原 `/new`、Task Bar 与任务选择器 |
| 能力裁剪误伤终局或被旧 URL 绕过 | 独立修改 MVP 导航清单为 Skills/AgentIn/Files；Tools/Schedules/Settings 不展示，未发布路径按 Profile 策略处理 |

## 3. Verification

- D-130 定向 Gate：TypeScript、范围内 ESLint、production build 全通过；Profile / Task Assembly / Quiz 8 项 Vitest 通过；班级入口与 AgentIn 定向 E2E 通过；1440×900、1024×640 及 Core Context 双状态 4 项视觉回归通过。

- `npm run check`：85 个测试文件、561 项 Vitest 全通过；
- `npm run build`：production build 通过，保留既有大 chunk 提醒；
- Chromium E2E：最新全量并发执行 121/131；10 项在浏览器拥塞后出现动画取值或超时，随后全部以单 worker 精确复跑通过。因此 131 项行为均有绿色证据，但本轮未把拥塞结果改写成一次全绿的并发产物；
- 视觉：班级详情 1440×900、MVP TeacherIn 1440×900/1024×640、终局 TeacherIn 1440×900 精确复跑通过；
- 文件质量：`git diff --check` 通过。

全仓视觉套件仍存在项目已记录的旧基线漂移，范围覆盖角色选择、首页等未修改页面；本阶段未批量重写这些无关基线，只更新并稳定复跑 Write Set 内三张快照。

## 4. Remaining boundary

当前为固定、脱敏、可重置的 `[模拟]` Demo。M4.3 尚未接入真实权限/Context Resolver、跨设备同步与数据迁移，这些仍不在本期。用户已于 2026-08-25 完成页面验收，里程碑标记为 `COMPLETE_USER_ACCEPTED`。

## 5. Navigation identity correction

首次实现错误复用了终局一级导航节点，并在 MVP 路由中改写其 href/active；首版两套 allowlist 也引用了同一数组。第二次虽建立了独立节点，但仍把 MVP Route 挂在 ClassIn AppShell 下，导致原主导航承载了不该存在的第二个 TeacherIn 一级项。根因是把“底层实现可复用”误扩展为“产品 Shell 可复用”，且 E2E 一度把错误行为写成预期。最终修正后两个 Product Module、不可变配置与 Shell 装配均独立；回归测试明确断言终局入口仍在 ClassIn 主导航，MVP 全屏页只存在自己的 `TeacherIn 导航`，二者不能互相高亮或代理。
