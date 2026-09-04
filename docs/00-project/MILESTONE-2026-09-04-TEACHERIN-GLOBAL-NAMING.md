---
title: 2026-09-04 TeacherIn 全局命名迁移里程碑
status: COMPLETE_VERIFIED
version: v1.1
date: 2026-09-04
decision: D-132
---

# 2026-09-04 TeacherIn 全局命名迁移里程碑

## 1. 里程碑结论

教师 AI 教学搭档的正式展示名从 **ClassIn TeachBuddy** 迁移为 **ClassIn TeacherIn**，所有空间受限界面的短名从 **TeachBuddy** 迁移为 **TeacherIn**。这是全局产品命名变更，不改变已经验收的功能、页面结构、权限、路由语义、数据隔离或 Agent 运行状态机。

## 2. 已迁移范围

- ClassIn 教师端一级入口、二级导航、任务页和任务 Tab；
- 班级课程详情 Banner、班级作用域全屏工作台及返回链路；
- IM 内入口、私密协作窗口、退出引导、宽度调节器和输入器；
- 独立教师官网、登录注册、产品 Shell、能力页、文件与内容文案；
- 页面标题、Web Manifest、图片替代文本、ARIA 名称和用户可见 Mock 数据；
- 品牌契约、头像组件、单元/集成/E2E/视觉测试中的展示名与断言；
- `AGENTS.md`、项目简报、领域术语、产品与研究文档、PRD、Feature Spec、Tickets、实现追踪和阶段报告。

## 3. 兼容边界

本轮只迁移产品字面名称。以下标识继续保留：

- `WorkBuddy` / `workbuddy` 类型、Module、目录、文件名、内部 ClassIn 路由和 Session Namespace；
- 已发布的 `/teachbuddy/*` 独立产品路径，以及旧 `/workbuddy/*` 兼容重定向；
- `classin:teachbuddy:*` 本地存储键和 `data-teachbuddy-*` 测试/数据属性；
- `docs/07-history/`、截图、视频、PPTX、Notion 更新载荷和检查快照中的冻结历史字样。

这些保留项不构成页面展示名。未来若迁移 URL、持久化键或证据标识，需要独立兼容方案和新的决策记录。

## 4. 同名概念消歧

仓库原有 TeacherIn 内容生态与新的 TeacherIn AI 教学搭档展示名归于同一产品品牌，但保持领域职责分离：AI 教学搭档工作台负责 Run、Context、Artifact、审批和回执；内容生态负责作品草稿、编辑、授权、发布和分发。二者之间仍通过显式受控动作连接。

## 5. 验证记录

- 现行运行时代码、Manifest 与 HTML 的旧展示名扫描为 **0**；现行文档只在本迁移记录、D-108 审计行和来源快照历史文件名中保留旧称；
- `npm run typecheck` 通过；`src/` 与 `tests/` 范围 ESLint 为 0 error；
- `npm run test -- --testTimeout=10000`：99 个测试文件、627 项测试全部通过；
- `npm run build` 通过；仅保留既有主 Chunk 大于 500 kB 提醒；
- 教师主入口、班级全屏入口、IM 私密协作和独立教师产品 4 条 Chromium E2E 全部通过；
- 教师首页、班级详情、班级全屏 TeacherIn、IM Sidecar 和独立产品等 6 组视觉检查通过；官网内嵌产品预览资产已用当前 TeacherIn 页面替换并人工复核；
- 全仓 `npm run lint` 仍被 `tools/im_fact_study/`、`tools/im_semantic_topic_v1/` 与演示构建脚本中的 43 个既有 Node 环境/未使用变量规则错误阻断；本轮未扩大范围修复这些研究工具，迁移触及的应用与测试代码范围无新增 Lint 错误。
