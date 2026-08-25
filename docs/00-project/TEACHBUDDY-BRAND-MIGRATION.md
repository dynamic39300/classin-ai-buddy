---
title: ClassIn TeachBuddy 品牌命名与迁移边界
status: LOCKED
version: v1.0
date: 2026-08-25
decision: D-108
---

# ClassIn TeachBuddy 品牌命名与迁移边界

## 唯一命名规则

| 使用位置 | 名称 | 说明 |
| --- | --- | --- |
| 官网、注册登录、正式介绍、对外材料 | **ClassIn TeachBuddy** | 正式产品名，ClassIn 品牌与教学场景同时明确 |
| 工作台导航、班级入口、任务页、IM 私密协作窗口 | **TeachBuddy** | 空间受限界面的统一短名 |
| 中文解释性副标题 | **AI 教学搭档** | 说明角色，不作为另一产品名 |
| 代码、路由、存储、领域证据 | `WorkBuddy` / `workbuddy` | 历史工程兼容标识，不是当前展示品牌 |

不得再新增 `Work Buddy`、`教师 WorkBuddy`、`我的教学助理`、`WorkBuddy by ClassIn` 或 `ClassInBuddy` 等并行展示名。

## 已纳入的展示面

1. ClassIn PC 终局一级导航工作台；
2. 班级课程详情进入的 MVP 独立工作台；
3. 独立 C 端教师官网、注册登录、个人工作台与 ClassIn 价值说明；
4. 班级群聊和私聊中的 TeachBuddy 私密协作窗口；
5. 技能、工具、文件、内容资源、任务历史、产物来源与模拟证据文案；
6. 页面标题、Web Manifest、图片替代文本、ARIA 名称和浏览器自动化断言。

## 不迁移的工程标识

- `/teacher/ai-agent/*`、`/teacher/classes/:classId/workbuddy/*`、`/workbuddy/*` 路由；
- `WorkBuddyRun`、`WorkBuddyExperienceProfile`、`ContextSnapshot` 等已存在的类型与 Interface；
- `workbuddy` 本地存储命名空间、幂等键、对象 ID、数据属性和测试 ID；
- `src/**/workbuddy-*`、`docs/**/workbuddy-*` 目录和文件名；
- `docs/07-history/` 的阶段原稿以及外部研究引用原文。

这些标识保持稳定，是为了让品牌展示迁移不破坏任务恢复、Receipt 证据链、幂等语义、链接兼容和历史追溯。

## 后续变更门禁

- 新页面应从 `src/contracts/workbuddy/product-brand.ts` 读取产品展示名；
- 对外文档首次出现时写“ClassIn TeachBuddy（简称 TeachBuddy）”；
- 规格描述产品体验时使用 TeachBuddy，描述代码/领域对象时继续使用准确类型名；
- 视觉回归、无障碍查询和 E2E 文案断言必须同步品牌展示名；
- 若未来要迁移路由或领域名，必须另立 ADR，提供持久化数据、URL 和证据对象的兼容方案，不得夹带在 UI 改名中。
