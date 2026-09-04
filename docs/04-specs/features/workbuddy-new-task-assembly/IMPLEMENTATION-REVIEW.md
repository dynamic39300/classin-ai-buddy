---
title: TeacherIn 新任务首页任务装配实现 Review
status: READY_FOR_USER_REVIEW
version: v0.5
date: 2026-09-03
source_spec: ./FEATURE-SPEC.md
source_tickets: ./TICKET-BREAKDOWN.md
---

# TeacherIn 新任务首页任务装配实现 Review

## 1. Review 结论

范围内 Standards 与 Spec 两轴没有未关闭的硬 Finding，NTA-01～NTA-13 已达到页面 Review 条件。当前实现仍是固定、脱敏、可重置的 Demo Adapter 与 Fixture，不代表真实 ClassIn 文件服务、Agent Runtime 或生产授权已经接通。

2026-09-03 页面评审调整已实现：首屏说明、常用能力可见标题与 `ideal-full` Core Context 入口 / 摘要隐藏；浏览按钮覆盖在能力横条右侧；自动演示上下文允许课件与课程方案包直接创建；材料标签带移除可见标题、数量与分隔线；Composer 下方不再显示正常操作的成功说明和文字型 Undo 条，错误与阻断反馈继续保留。

2026-09-03 第二轮页面复审调整已实现：加号改为输入器上方的轻量逐级选择器，一级只显示文件、Agent、Skill，二级提供返回、搜索或来源列表；多能力标签继续保留，但文本区只维护最新一次可识别的自动 Prompt，教师自行输入或已编辑文字不被覆盖。

2026-09-03 第三轮页面复审调整已实现：参考 WorkBuddy 把首页重排为居中的欢迎区、能力横条和 Composer 三段式结构；主内容统一为 56rem，欢迎头像和标题缩小；横条与翻页按钮进入同一 Grid 并锁定完整标签停靠，消除错位和半标签。

2026-09-04 第四轮页面复审调整已实现：再次核对 WorkBuddy 原始 Agent / Skill 选择截图，已选材料标签从正文上方移入输入器底部工具栏，形成“加号 → 标签 → 提交”的同轴顺序；正文区域现在只承载 Prompt。

## 2. Standards Review

| 维度 | 证据 | 结论 |
|---|---|---|
| Deep Module | `src/domain/workbuddy/task-assembly.ts` 隐藏去重、Prompt Fragment、Undo、状态投影和 Snapshot；无 React / DOM / Storage 依赖 | PASS |
| Seam / Adapter | `TaskMaterialCatalogPort` 由 My Files 与 ClassIn Space Demo Adapter 实现；页面不读取 Fixture | PASS |
| 依赖方向 | 页面 → Feature → Domain / Contract；Design System 只新增通用 `materials` Slot | PASS |
| Session 与证据 | Session v4 兼容 v3 草稿；Assembly Snapshot 使用稳定 ID；Run 引用缺失时 fail closed | PASS |
| Profile 边界 | 新装配能力只向 `ideal-full` 注入；`classin-mvp`、`standalone-teacher` 与学生端保持原行为 | PASS |
| 数据与真值 | 文件只保存元数据引用，不保存 File / Base64；数据为脱敏固定 Demo Fixture | PASS |
| a11y 与视觉 | Menu / Dialog / Focus / Escape / 键盘路径、Axe、1024 / 1440 无水平溢出均有浏览器证据 | PASS |

## 3. Spec Review

| 产品行为 | 实现证据 | 验证证据 | 结论 |
|---|---|---|---|
| 5 个 Skill 后接 4 个 Agent | `TASK_SKILL_OPTIONS`、`TASK_AGENT_OPTIONS`、快捷横条 | Capability unit + E2E | PASS |
| 原 4 个教学任务迁为常用 Skill | Task Intent 映射继续驱动三类任务 | Integration + 既有 Quiz E2E | PASS |
| Agent 推荐 Prompt 带入、来源可追溯 | Prompt Fragment 与 Agent provenance | Domain + Integration + Run Snapshot E2E | PASS |
| Skill / Agent 加号选择与管理跳转 | 加号菜单、两个选择器、AgentIn / 技能市场路由 | E2E | PASS |
| 上方逐级选择与返回 | 一级 / 二级单层投影、返回按钮、独立滚动、Reduced Motion | Integration + E2E + Visual | PASS |
| 最新自动 Prompt 替换 | Domain 清理旧未编辑自动 Prompt，保留教师文字与全部材料引用 | Domain + Integration + E2E | PASS |
| WorkBuddy 式首页版式 | 居中 56rem 内容轴、standard Avatar、Grid 横条与标签起点停靠 | E2E 几何 + 1440 / 1024 Visual | PASS |
| 本地、我的文件、ClassIn 空间 | 原生多选、两个独立 Dialog、目录 Adapter | Adapter + Integration + E2E + Visual | PASS |
| 统一任务材料区 | Skill / Agent / File Chip、状态、移除、Undo、两行布局 | Integration + Visual | PASS |
| WorkBuddy 式材料位置 | 加号右侧底部标签、正文与材料分层、提交按钮无重叠 | E2E 几何 + 单材料 / 多材料 Visual | PASS |
| 页面评审收敛 | 单纯标签带、无成功说明；错误反馈保留；Domain Undo 与 Context 实现不删除 | E2E + 1440 / 1024 Visual | PASS |
| 创建前阻断与创建后证据 | 非 Ready 材料阻断；三类 Run 持有 Snapshot ID | Domain + Session + E2E | PASS |
| 其他 Experience 不扩展 | 组合根按 Profile 注入 | Profile / E2E | PASS |

40 条 Requirement 的逐组映射见 [实现追踪](./IMPLEMENTATION-TRACEABILITY.md)。

## 4. Verification evidence

| 命令 / 范围 | 结果 |
|---|---|
| `npm test` | PASS，99 个文件 / 627 项 |
| `npm run typecheck` | PASS |
| `npx eslint src tests` | PASS |
| `npm run build` | PASS；保留既有主 chunk 大于 500 kB 提醒 |
| 受影响 E2E：消息、Capability、Quiz、Task Assembly | PASS，49 / 49 |
| 页面评审调整 E2E：Task Assembly、Shell、M4 Run、Quiz | PASS，40 / 40 |
| D-125 / D-126 定向 E2E | PASS，4 / 4；覆盖上方弹层、逐级返回、1024×640 边界、Prompt 覆盖、统一左右边界、垂直基线与完整标签停靠 |
| D-128 定向 E2E / Visual | PASS；1440×900 验证加号、单标签同轴及提交按钮无重叠，1024×640 验证多标签与页面无横向溢出；单材料 / 多材料视觉基线已更新 |
| 新任务装配 Visual | PASS，8 / 8；包含重排后的 1440×900、1024×640、一级菜单、Skill 二级层和多材料状态 |
| 既有新任务 Skill selector Visual | PASS，1 / 1 |

## 5. Repo-wide notes（不属于本 Feature 的硬阻断）

1. `npm run lint` 仍在 `tools/im_fact_study/` 与 `tools/im_semantic_topic_v1/` 的并行研究脚本中报告 39 个既有错误；本轮未越权修改这些脚本，`src/` 与 `tests/` 已全绿。
2. 全仓 Visual 在中止时为 39 通过、22 失败、3 中断、102 未运行；失败集中于角色选择、首页、学生页与既有 IM 等无关页面的旧基线漂移或既有断言漂移。本轮没有批量接受这些快照。
3. 全量 E2E 首轮为 147 / 148；唯一失败是既有消息滚动辅助函数在滚轮事件后同步读取 `scrollTop`。改为等待浏览器滚动状态后，精确重复 2 / 2 与全部受影响场景 49 / 49 通过。
4. 页面评审后运行 28 个关联 Visual：Task Assembly、M4 Run、Quiz 与 Shell 的产品画面均通过；其中既有“running step progress”快照仍因 Timeline 自动跟随时的纵向滚动位置不稳定而失败（差异集中于同一 Run 内容的上下偏移），不属于本次首页 Write Set，也未批量接受该基线。

## 6. 用户 Review 建议路径

1. 进入教师视角 → TeacherIn → 新任务；
2. 检查 5 个 Skill、4 个 Agent 的顺序和横向浏览；
   - 欢迎区整体居中，能力横条与输入器左右边界一致；
   - 点击左右按钮后，左侧不出现被截断的半个标签；
3. 连续选择两个 Skill 和一个 Agent，确认标签均保留但输入框只显示最新自动 Prompt；编辑后移除 Agent，确认教师文本不被误删；
4. 通过加号分别选择 Skill、Agent、本地文件、我的文件与 ClassIn 空间；
5. 检查材料区状态、两行布局、移除和撤销；
6. 直接选择“生成单个课件”或“生成课程方案包”并创建任务，再刷新 Run，确认任务、演示 ContextSnapshot 与材料证据仍可恢复；
7. 切换到 ClassIn MVP / Standalone 或学生端，确认没有出现本轮新入口。

补充视觉检查：单独选择“成语溯源与应用专家”，确认输入器正文只显示推荐 Prompt，底部工具栏按“加号 → Agent 标签 → 提交按钮”排列，页面不显示材料标题、数量、分隔线或下方成功说明。

加号检查：一级浮层应在输入器上方且只显示三类入口；进入 Skill 后只显示 Skill 层，并可通过左上返回按钮回到一级。
