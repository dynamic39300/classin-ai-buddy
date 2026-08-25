---
title: M4.5 IM 与 TeachBuddy UI/UX 统一优化 Feature Spec
status: COMPLETE_USER_ACCEPTED
triage: active
version: v0.1
date: 2026-08-25
source: https://app.notion.com/p/honored-winner-xinlei/IM-UI-UX-check-3c7a5c3b026b80e780fecb3ac0a43c62
---

# M4.5 IM 与 TeachBuddy UI/UX 统一优化 Feature Spec

## 1. 目标与边界

本轮把 Notion《第一部分（IM）：用户体验 UI、UX 问题 check & 优化》中的 13 组反馈落实为共享界面契约。范围覆盖教师与学生 IM、班级群聊、Agent 私聊、TeachBuddy IM Sidecar、班级详情 TeachBuddy 入口、一级与独立 TeachBuddy 工作台中同构的产物预览。

本轮只调整信息层级、交互反馈、可访问性、文案与布局，不改变 M4.2～M4.4 已验收的 Run、Context、Artifact、Action、Approval、Receipt、授权、路由和产品数据边界。

## 2. 锁定体验契约

### 2.1 `@` Agent 与成员选择

- 在班级群输入框任意光标位置输入 `@` 都打开统一选择器；查询只读取光标前正在编辑的 mention 片段。
- 上下方向键移动当前项，Enter 选择，Escape 关闭；选择 Agent 后只移除当前 mention 查询，不重写句子其他位置。
- 已选主 Agent 以同一输入行内的浅绿色粗体 `@名称` 表达，不重复头像、说明或 Agent 标签；仍允许移除与短时撤销切换。
- 选择器只显示名称与一行能力说明，不重复班级名和 Agent 标签；说明溢出时省略，悬停或键盘聚焦时完整展开。
- 选择器末项必须可滚动到完整可见，并提供明确关闭按钮；活动项变化时自动滚入视口。

### 2.2 IM 页面降噪

- 会话 Header 只保留当前会话身份和必要操作，不重复列表中已经明确的班级说明、进入班级入口或班级 Agent 宣传横幅。
- Agent 私聊不展示“仅你与班级 Agent 可见”等重复隐私提示；治理和可见性仍保留在 Domain 消息元数据中。
- 教师群聊继续投影公开消息的可见范围；学生和教师私聊仍维持独立 Thread 与授权校验。
- 管理操作使用稳定的图标按钮及 `会话管理` 可访问名称，不用冗余文字占据 Header。

### 2.3 TeachBuddy 身份与上下文

- 所有 TeachBuddy 入口与 IM Sidecar 复用同一个动态头像组件；动画遵守 Reduced Motion。
- Sidecar 顶部单行展示动态头像、`TeachBuddy` 和“我是您的教学搭档，有什么要帮忙？”；每个浏览会话首次进入逐字呈现，后续静态展示。
- `当前上下文` 位于同一顶部区域右侧，不再单独占一行。
- 正常产品界面不展示“模拟”“仿真”或开发阶段真值徽标；内部 Domain、Fixture、Session 与 Execution Evidence 继续保留 truth metadata，确保测试和证据链不失真。

### 2.4 编辑、任务窗口与退出体验

- 产物“展开编辑”按内容自适应高度，设置可滚动上限；不使用接近整屏的固定空白编辑区。
- IM Sidecar 任务面移除无效底部分割线与重复的“发送前核验”说明，操作按钮必须完整可达。
- 退出沉浸模式后只说明“会话和任务进度已保留”，将“重新打开 TeachBuddy”和“不再提示”组织为同一操作区。
- 沉浸态顶部只保留页面身份与退出操作；不展示“沉浸工作区”或“退出后仍停留在当前会话”等静态说明。双 `Esc` 的第二次确认提示只在用户首次按下 `Esc` 后临时出现。

### 2.5 集成版能力发布范围

- ClassIn 集成版 TeachBuddy 的“以终为始”入口和班级 MVP 暂不发布“设置”；二级导航不展示该入口，直接访问集成版设置路径回到“新建任务”。
- 设置 Capability、Surface、配置结构和实现代码继续保留，不做删除；未来经里程碑确认后可重新加入 Experience Profile。
- 独立 C 端 TeachBuddy 仍保留个人设置，避免破坏独立账号产品闭环；ClassIn 主产品自身的账号、班级和系统设置不受影响。

### 2.6 班级课程页 TeachBuddy 入口

- 右侧栏入口以“我的教学伴侣”为区块主题，使用放大的动态头像、`TeachBuddy` 标题和“我是您的教学搭档，有什么要帮忙？”描述。
- 整张入口卡片都是一个可聚焦、可点击的按钮，不再拆分身份说明与“打开”子按钮；点击后仍进入当前班级隔离的 MVP Workspace。
- 卡片使用浅品牌色背景、清晰边界和悬停/键盘焦点反馈，在不压过课程目录的前提下强化入口层级。

## 3. 反馈—实现—验收矩阵

| Notion 项 | 共性实现位置 | 验收条件 |
| --- | --- | --- |
| 1、10 | `MessageWorkspace`、`WorkspaceComposer`、`AgentMentionPicker` | 中间光标检索、键盘选择、行内简化目标均成立 |
| 2、12 | `MessageWorkspace` | 班级 Header 与 Agent 横幅无重复信息，核心会话能力不变 |
| 3、7、8 | `TeachBuddyAvatar`、`WorkBuddyImSidecar`、`TeacherClassWorkspace` | 身份、动态头像、首次逐字欢迎语与右侧上下文统一 |
| 4 | `FocusedMessageEditor` | 内容自适应，超过上限才出现纵向滚动 |
| 5 | `WorkBuddyImSidecar`、`WorkBuddyReviewArtifact` | 无多余底线/核验文案，底部操作完整可达 |
| 6 | 所有产品 Surface | 用户可见页面无“模拟/仿真”字样，内部 truth metadata 不删除 |
| 9 | `MessageWorkspace` | Agent 私聊无重复隐私提示，线程隔离和授权校验测试仍通过 |
| 11 | `AgentMentionPicker` | 末项可见、说明单行省略/聚焦展开、无标签、可关闭 |
| 13 | `ImmersiveMessageWorkspaceFrame` | 退出说明简洁、继续入口明确、偏好控件紧邻操作 |

## 4. 不变量与恢复

- `@` 选择失败或关闭后保留原始输入；普通成员 mention 仍作为文本，不触发 Agent Runtime。
- Agent 选择在发送时重新校验当前班级、角色、渠道和授权版本；失效授权 fail closed。
- 处理中、失败和重试仍投影稳定 Agent 身份；失败状态继续提供既有可恢复命令。
- Sidecar 的欢迎语动画只是表现状态，不进入 Run、History 或业务 Session。
- 隐藏可见真值徽标不等于删除真值：Adapter/Domain/Receipt 中的 `truthLabel` 仍是契约字段。

## 5. 验证门禁

- TypeScript、ESLint、`git diff --check` 与 production build 通过。
- Domain/Integration 覆盖群聊 Agent、普通成员 mention、私聊隔离、授权失效、Sidecar 任务与编辑器。
- Chromium E2E 覆盖键盘 `@` 选择、选择器滚动、IM 降噪、首次欢迎语、退出引导与可访问性。
- 1440×900 Visual 更新 IM、Agent 选择器和公开 Agent 回复基线，确认无溢出、遮挡和不可达按钮。
