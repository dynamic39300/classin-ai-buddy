---
title: TeacherIn 新任务首页任务装配实现追踪
status: IMPLEMENTED_READY_FOR_REVIEW
version: v0.5
date: 2026-09-03
---

# TeacherIn 新任务首页任务装配实现追踪

## 1. 追踪矩阵

| Requirement | Spec | Ticket | Implementation | Verification | 状态 |
|---|---|---|---|---|---|
| NTA-PRD-001～005 | Boundary / 6 / 9 | NTA-04、06、09、10 | `TaskAssemblyComposer`、`AiAgentWorkSurface`、Session v4 | Integration + E2E + 5 张新视觉基线 | PASS |
| NTA-PRD-006～011 | 5 / 6 / 9.3～9.4 | NTA-02、06、09、10 | 5 Skill、4 Agent、搜索选择器、AgentIn / 技能市场跳转 | Domain + Capability + E2E | PASS |
| NTA-PRD-012～017 | 3 / 7 / 9.5 | NTA-02、03、06、07、09、10 | 三类 FileReference、目录 Port / Adapter、两个独立 Dialog | Adapter + Integration + E2E + Visual | PASS |
| NTA-PRD-018～024 | 4 / 5 / 12.2 | NTA-02、04、06、09、10 | Prompt Fragment、编辑保护、Remove / Undo、材料状态与折叠 | 31 项 TaskAssembly Domain 测试 + Integration | PASS |
| NTA-PRD-025～029 | 10 / 11 | NTA-04、08、09、10 | Assembly Snapshot Map、三类 Run 稳定关联、Session fail-closed | Domain + Session + Run E2E | PASS |
| NTA-PRD-030 | 6.1～6.2 / 9.1 | NTA-06、09、10 | 四个旧任务入口迁入常用 Skill，普通 Skill 保持材料语义 | Capability + Integration + E2E | PASS |
| NTA-PRD-031 | 7 / 13 | NTA-03、06、07、11 | 脱敏固定 Fixture、文件元数据引用、不持久化文件内容 | Adapter tests + Session inspection | PASS |
| NTA-PRD-032～033 | 13～15 | NTA-05～07、09～11 | `WorkspaceComposer.materials`、键盘 / Focus、Profile 边界 | Unit + Axe + 1024 / 1440 浏览器几何 | PASS |
| NTA-PRD-034～038 | 9.3、9.5～9.6、14 | NTA-06、09～11 | 首屏收敛、同轴浏览、轻量标签带、自动演示 Context | Integration + E2E + 1440 / 1024 Visual | PASS |
| NTA-PRD-039 | 9.4、12.3～14 | NTA-12 | 上方逐级 Picker、返回入口、最新自动 Prompt 替换 | Domain + Integration + E2E + 2 张 Picker Visual | PASS |
| NTA-PRD-040 | 9.3、14 | NTA-13 | 56rem 内容轴、居中欢迎区、Grid 横条、标签起点停靠 | E2E 几何 + 1440 / 1024 Visual | PASS |
| D-128 / NTA-PRD-014、037 | 9.1、9.5、14 | NTA-14 | 材料 Lane 移入 Composer 底部工具栏并紧随加号 | E2E 几何 + 单材料 / 多材料 Visual | PASS |

## 2. 执行日志

| 时间 | Ticket | 记录 |
|---|---|---|
| 2026-09-03 | NTA-01 | 用户批准 Ticket Breakdown；创建实现追踪骨架并进入 Implementation。 |
| 2026-09-03 | NTA-02～05 | 完成 TaskAssembly Deep Module、文件来源 Port / Adapter、Session v4 与 Composer 通用材料 Slot。 |
| 2026-09-03 | NTA-06～08 | 完成 5 Skill + 4 Agent、加号菜单、统一材料区、三类文件、两个独立 Dialog 与三类 Run Snapshot 关联。 |
| 2026-09-03 | NTA-09～10 | 完成 Integration、Profile、E2E、Axe 与 5 张任务装配视觉基线；同步更新旧 Skill 选择器基线。 |
| 2026-09-03 | NTA-11 | 完成 Standards / Spec 双轴 Review；范围 Gate 全绿，仓库无关历史债务保留并显式记录。 |
| 2026-09-03 | NTA-12 | 按页面复审完成上方逐级 Picker、返回路径与最新自动 Prompt 替换；保留多材料标签和教师文字。 |
| 2026-09-03 | NTA-13 | 按 WorkBuddy 首页参考重排内容轴与欢迎区；横条按钮同轨对齐，翻页锁定完整标签起点。 |
| 2026-09-04 | NTA-14 | 逐张核对腾讯 WorkBuddy 原始 Agent / Skill 选择截图，将材料标签从正文顶部移至加号右侧的底部工具栏，并增加几何验收。 |

## 3. 当前 Gate

- NTA-01～NTA-10：`DONE`；
- NTA-11：`DONE_WITH_REPO_BASELINE_NOTES`；
- NTA-12：`DONE`；
- NTA-13：`DONE`；
- NTA-14：`DONE`；
- 范围内 Gate：627 项 Vitest、TypeScript、`src/` + `tests/` ESLint、production build 均通过；D-125 定向 Chromium E2E 4 / 4、新任务装配 Visual 8 / 8 通过；此前 49 项受影响 E2E 证据继续保留；
- 全仓 Gate：`npm run lint` 仍被并行 IM 数据研究工具目录的 39 个既有错误阻断；全仓旧视觉基线存在跨页面漂移，未批量覆盖；
- 详细证据与剩余风险见 [实现 Review](./IMPLEMENTATION-REVIEW.md)。
