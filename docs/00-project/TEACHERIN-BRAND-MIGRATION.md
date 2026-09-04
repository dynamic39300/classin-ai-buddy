---
title: ClassIn TeacherIn 品牌命名与迁移边界
status: LOCKED
version: v2.0
date: 2026-09-04
decision: D-132
---

# ClassIn TeacherIn 品牌命名与迁移边界

> 2026-09-04 起，原展示品牌 **ClassIn TeachBuddy / TeachBuddy** 全局迁移为 **ClassIn TeacherIn / TeacherIn**。本文件取代 D-108 的旧展示命名规则；旧称只允许出现在迁移记录、冻结历史证据和不可编辑的阶段导出中。

## 唯一命名规则

| 使用位置 | 名称 | 说明 |
| --- | --- | --- |
| 官网、注册登录、正式介绍、对外材料 | **ClassIn TeacherIn** | 正式产品名，ClassIn 品牌与教学场景同时明确 |
| 工作台导航、班级入口、任务页、IM 私密协作窗口 | **TeacherIn** | 空间受限界面的统一短名 |
| 中文解释性副标题 | **AI 教学搭档** | 说明角色，不作为另一产品名 |
| 代码、ClassIn 内部路由、存储、领域证据 | `WorkBuddy` / `workbuddy` | 历史工程兼容标识，不是当前展示品牌 |
| 独立 C 端公开 URL | `/teachbuddy/*` | 本轮不迁移 URL；作为已发布兼容路径继续使用，`/workbuddy/*` 仍仅兼容跳转 |

不得再新增 `Work Buddy`、`教师 WorkBuddy`、`我的教学助理`、`WorkBuddy by ClassIn` 或 `ClassInBuddy` 等并行展示名。

## 已纳入的展示面

1. ClassIn PC 终局一级导航工作台；
2. 班级课程详情进入的 MVP 独立工作台；
3. 独立 C 端教师官网、注册登录、个人工作台与 ClassIn 价值说明；
4. 班级群聊和私聊中的 TeacherIn 私密协作窗口；
5. 技能、工具、文件、内容资源、任务历史、产物来源与模拟证据文案；
6. 页面标题、Web Manifest、图片替代文本、ARIA 名称和浏览器自动化断言。

## 不迁移的工程标识

- `/teacher/ai-agent/*`、`/teacher/classes/:classId/workbuddy/*` 等 ClassIn 内部路由；
- `WorkBuddyRun`、`WorkBuddyExperienceProfile`、`ContextSnapshot` 等已存在的类型与 Interface；
- `workbuddy` 本地存储命名空间、幂等键、对象 ID、数据属性和测试 ID；
- `src/**/workbuddy-*`、`docs/**/workbuddy-*` 目录和文件名；
- `docs/07-history/` 的阶段原稿以及外部研究引用原文。
- 已导出的截图、视频、PPTX、检查快照和 Notion 更新载荷；这些文件记录生成时的页面事实，不在本轮原地改写。

这些标识保持稳定，是为了让品牌展示迁移不破坏任务恢复、Receipt 证据链、幂等语义和历史追溯。`/teachbuddy/*` 在此次字面名称迁移前已经发布，本轮继续作为兼容主路径；旧 `/workbuddy/*` 通过等路径重定向继续兼容已有链接。未来若迁移公开 URL，必须另立决策并同时处理深链、Auth `next`、分享链接和历史书签。

## 与既有 TeacherIn 内容生态的关系

仓库原本已经使用 **TeacherIn** 表示 ClassIn 内的教研内容生产、作品管理和市场分发生态。主 AI 教学搭档改名后，两者归于同一 TeacherIn 产品品牌，但工程职责仍分开：

- **TeacherIn AI 教学搭档工作台**拥有 Agent Run、上下文快照、Artifact、审批与执行回执；
- **TeacherIn 内容生态**拥有作品草稿、编辑、授权、发布、定价与分发状态；
- 从 AI Artifact 创建内容作品仍是显式 `ProposedAction → Approval → Adapter → ExecutionReceipt`，品牌同名不等于自动发布或数据直连。

涉及二者边界的文档必须使用上述限定语；页面空间明确时可以继续显示短名 **TeacherIn**。

## 后续变更门禁

- 新页面应从 `src/contracts/workbuddy/product-brand.ts` 的 `TEACHERIN_BRAND` 读取产品展示名；
- 对外文档首次出现时写“ClassIn TeacherIn（简称 TeacherIn）”；
- 规格描述产品体验时使用 TeacherIn，描述代码/领域对象时继续使用准确类型名；
- 视觉回归、无障碍查询和 E2E 文案断言必须同步品牌展示名；
- 若未来继续迁移 ClassIn 内部路由或领域名，必须另立 ADR，提供持久化数据、URL 和证据对象的兼容方案，不得夹带在 UI 改名中。
