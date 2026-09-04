---
title: TeacherIn 内容兼容与独立产品边界
status: LOCKED
version: v1.1
date: 2026-09-04
source_decisions: D-042/D-043/D-106/D-107/D-132
---

# TeacherIn 内容兼容与独立产品边界

## 1. 结论

独立 TeacherIn AI 教学搭档运行态与 ClassIn 内 TeacherIn 内容生态同时满足两件事：

1. **产品运行隔离**：独立账号、Route、Shell、Workspace、历史、存储、权限和商业数据不读取或代理 ClassIn 内部产品；
2. **内容格式兼容**：所有内容资源从生产起即遵循 TeacherIn 的统一内容契约，连接后不需要重新制作或转换内容格式，即可进入 TeacherIn 内部的编辑、授权、发布和分发生态。

这不是矛盾。独立的是产品运行和事实所有权，统一的是内容生产标准。

## 2. 关系矩阵

| 维度 | Standalone TeacherIn 工作台 | ClassIn 内 TeacherIn 内容生态 | 关系 |
| --- | --- | --- | --- |
| 产品入口与账号 | `/teachbuddy/*`、教师个人账号 | ClassIn 教师入口与组织身份 | 隔离 |
| Workspace 与历史 | `standalone-teacher` Namespace | `ideal-full` / `classin-mvp` 与 ClassIn 业务数据 | 隔离 |
| 存储对象与权限 | 独立个人内容对象、独立权限 | TeacherIn 作品、组织权限与发布状态 | 隔离；连接时建立新对象关联 |
| 内容类型与结构 | TeacherIn 兼容内容包 | TeacherIn 权威内容契约 | 完全兼容 |
| 素材、元数据与版本 | 遵循相同格式和语义 | TeacherIn 校验与治理 | 完全兼容 |
| 编辑、授权、发布与分发 | 独立产品内自闭环；未连接时不写入 TeacherIn | TeacherIn 拥有内部作品生命周期 | 经授权连接后衔接 |

## 3. 统一内容契约

`TeacherIn 兼容内容包` 是跨产品的统一领域语言。权威字段与 Validator 由 TeacherIn 内容契约拥有，WorkBuddy 不复制第二套近似 Schema。契约至少覆盖以下语义组：

- 内容类型、内容结构和可呈现素材；
- 标题、简介、封面、学段、学科与内容标签；
- 内容版本、来源 Artifact/Run、作者与生成方式；
- 授权、可见性、引用与改编规则；
- 草稿、编辑、发布和衍生所需的生命周期元数据。

所谓“完全匹配”表示同一 Schema Version 和同一组领域校验，不需要做内容字段重排、素材重制或格式转换。产品侧可以拥有不同 ViewModel，但 ViewModel 不能发明与 TeacherIn 冲突的内容语义。

## 4. 未来连接路径

```text
Standalone TeacherIn-Compatible Content Package
→ ProposedAction（创建 TeacherIn 草稿）
→ 身份 / 权限 / 版本 / 授权范围校验
→ Teacher Approval
→ TeacherIn Adapter 创建独立作品草稿
→ ExecutionReceipt 关联 Standalone Artifact 与 TeacherIn Draft
→ 教师在 TeacherIn 继续编辑、授权、发布和分发
```

连接步骤处理的是身份、权限、对象 ID、版本与回执，不处理内容格式转换。未连接时，Standalone 继续在自己的内容生态中完成生产、管理、改编和个人分发。

## 5. 明确不等于

- 不等于 Standalone 页面跳转 ClassIn 后台；
- 不等于共享数据库、账号、Session 或权限；
- 不等于内容自动同步或自动发布；
- 不等于当前 Demo 已接通真实 TeacherIn API；
- 不等于 WorkBuddy 获得 TeacherIn 正式发布状态的事实所有权。

## 6. 项目总结引用口径

> M4.4 不只完成了独立 TeacherIn AI 教学搭档的产品与商业闭环，还统一了外部内容生产与 TeacherIn 内部内容生态的格式标准：两个运行边界在数据上独立，但所有内容资源从生产起即为 TeacherIn 兼容内容包，为未来获客、连接、内容回流和内部编辑分发建立了零格式转换通道。

关联事实源：[项目简报](../00-project/PROJECT-BRIEF.md)、[当前状态与下一阶段](../00-project/CURRENT-STATUS-AND-NEXT-PLAN.md)、[D-107](../00-project/DECISION-LEDGER.md)、[M4.4 PRD](../04-specs/features/workbuddy-m4-4-standalone-teacher/PRODUCT-REQUIREMENTS.md) 和 [M4.4 Feature Spec](../04-specs/features/workbuddy-m4-4-standalone-teacher/FEATURE-SPEC.md)。
