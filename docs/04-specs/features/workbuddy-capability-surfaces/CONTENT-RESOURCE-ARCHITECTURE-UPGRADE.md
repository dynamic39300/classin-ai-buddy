---
title: WorkBuddy 内容与资源架构升级规格
status: IMPLEMENTING
version: v0.1
date: 2026-08-22
governing_decisions: D-042,D-043,D-044,D-051
---

# WorkBuddy 内容与资源架构升级规格

## Outcome

TeacherIn 是 ClassIn Space 下唯一可见的内容生产、作品管理与市场分发业务入口。WorkBuddy 只承担两类连接：把 TeacherIn 资源作为稳定引用加入 Core Context，以及把 WorkBuddy Artifact 创建成 TeacherIn 草稿。

ClassIn Space 是文件存储载体；“我的文件”是 AI 协作产物的查询投影；TeacherIn 拥有作品信息、授权和发布。三者共享引用，不建立第二套文件所有权。

## Module Map

```text
TeacherIn Catalog Adapter
        ↓ TeacherInResourceRef
Core Context Module → ContextSnapshot → WorkBuddy Run

WorkBuddy Run → ArtifactVersion → SpaceFileRef
                         ├→ Artifact Library Projection → 我的文件
                         └→ TeacherIn Draft Module → TeacherIn Draft Adapter
                                                    ↓
                                             ExecutionReceipt
```

### Interfaces

- `TeacherInAdapter.searchResources(query)`：返回当前教师可选择的资源引用，不返回市场页面实现。
- `TeacherInAdapter.createDraft(action, approval)`：以 Artifact 版本和 Space 文件引用创建草稿，返回幂等回执。
- `WorkBuddyContext.addReference(item)`：把 Space 或 TeacherIn 引用加入待确认 Context；已冻结快照进入重新确认状态。
- `WorkBuddyTeacherIn.createDraft(asset)`：完成 ProposedAction、教师 Approval、Adapter 执行和 Receipt 记录。

## Invariants

1. TeacherIn 资源进入 Run 时保存对象 ID、版本、来源和权限，不复制资源正文。
2. “我的文件”只展示 AI 协作生成的 Artifact/File，不提供上传入口。
3. 同一 Artifact 版本重复创建草稿返回同一 Receipt，不产生重复草稿。
4. Artifact 版本变化后不静默覆盖已有关联；界面显示版本差异并要求新的显式动作。
5. 成功文案固定为“已在 TeacherIn 创建草稿。你可以前往 TeacherIn 继续编辑作品信息、设置授权并发布。”
6. WorkBuddy 状态机只表达未创建、创建中、草稿已创建、权限拒绝和可恢复失败；TeacherIn 前台流程不包含提交审核、审核中、通过或驳回。
7. WorkBuddy 的旧内容广场保留为 Dormant Module，不进入默认导航、公开路由和当前发布验收。
8. `/teacher/ai-agent/content` 兼容跳转到 `/teacher/space/teacherin`；`/teacher/space/resource-center` 兼容映射到同一 TeacherIn Surface。
9. 所有 TeacherIn 数据和回执在当前体验环境标注 `[模拟]`，不宣称真实 API 已接入。

## User Journeys

### TeacherIn 资源作为 Context

1. 教师打开新任务的 Core Context。
2. 在“资源与教师输入”中打开 TeacherIn 资源选择器并搜索。
3. 选择资源后，系统加入带版本的 `TeacherInResourceRef`。
4. 教师确认 Context，引用随 `ContextSnapshot` 冻结。
5. 资源无权访问、版本变化或下架时保留对象身份并显示可恢复状态。

### Artifact 创建 TeacherIn 草稿

1. 教师从当前 Run Artifact 或“我的文件”触发“创建草稿到 TeacherIn”。
2. 系统形成 `ProposedAction`；本次明确点击同时记录教师 Approval。
3. Adapter 使用 Artifact 版本、SpaceFileRef 和幂等键创建草稿。
4. 成功 Receipt 记录来源 Run、Artifact 版本、草稿 ID、创建时间和 TeacherIn 定位路径。
5. “我的文件”持续显示草稿关联，教师可以再次定位，不需要依赖 Toast 记忆。
6. 定位路径直接打开 TeacherIn 作品草稿编辑态，继续编辑作品名称、授权方式并发布；当前 Demo 显式标注模拟保存/发布。

## States

| State | Visible meaning | Allowed command | Recovery |
|---|---|---|---|
| `not_created` | 尚未创建 TeacherIn 草稿 | 创建草稿 | — |
| `creating` | 正在创建草稿 | 无 | 等待 |
| `draft_created` | 已有关联草稿 | 前往 TeacherIn | 版本变化时重新确认 |
| `permission_denied` | 当前账号无创建权限 | 前往 TeacherIn/联系管理员 | 权限恢复后重试 |
| `recoverable_failure` | 未产生可确认副作用 | 重试 | 使用同一幂等键 |

## Dormant Module

- `CapabilityWorkspace` 的 `content` Surface、内容数据、样式和领域测试继续保留。
- 可见能力注册表排除 `content`；完整能力注册表仍包含它，供 Dormant Module 回归测试使用。
- 恢复旧能力必须新增或修订 LOCKED 决策，再显式修改可见性配置；不能通过偶然路由重新暴露。

## Acceptance

- WorkBuddy 二级导航不显示“内容资源”，旧路径进入 TeacherIn。
- Space 正式栏目显示 TeacherIn，旧资源中心路径保持兼容。
- TeacherIn 资源可搜索、加入 Context、确认并在刷新后恢复。
- “我的文件”作为 Context 后产生稳定 Space 引用，不改写任务目标。
- 至少一个 Artifact 可创建 TeacherIn 草稿、显示固定成功文案并定位到对应草稿。
- 重复创建不会生成第二个草稿；权限拒绝和可恢复失败由领域/Adapter 测试覆盖。
- 默认可达页面不存在“提交审核”“审核中”“作品已提交审核”。
