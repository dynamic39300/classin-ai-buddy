---
title: ClassIn PC Demo IM 入口与功能清单
status: PHASE_1_USER_REVIEWED
version: v0.2
date: 2026-08-30
research_program: ClassIn IM 功能全景与竞品研究 / Phase 1
---

# ClassIn PC Demo IM 入口与功能清单

## 1. 阶段结论

当前 Demo 已形成一个同时服务教师与学生的 PC 消息基座，覆盖四类消息目录、普通私聊、班级群聊、系统通知、官方公告、未读与搜索、群消息基础治理、业务通知深链，以及教师 TeacherIn 和班级 Agent 两套 AI 协作能力。

但这不是生产 IM：消息、联系人、授权、文件、设备、AI 生成、写回和回执均来自本地 Scenario、内存状态或 Mock Adapter；附件、群文件、成员详情、联系人资料和部分公告动作仍是 Placeholder。正常页面不重复展示“模拟”标签，但真值仍保存在 Domain、Fixture、Adapter、Receipt 和测试证据中。

本表回答“当前 Demo 实际有什么”，不回答线上 ClassIn 是否具备同等能力，也不把规格中的未来 Case 记为已实现。

当前清单登记 **7 组当前可见、可用的外部入口**；另单列 1 组全局搜索 Dormant 代码资产，它未完成产品接入，前端未挂载，因此不计入当前 Demo 已有入口。功能主表共 **86 项**：46 项基础 IM、30 项 AI IM 扩展、10 项跨域体验能力；按实现状态分为 46 项本地可操作、25 项固定模拟闭环、5 项 Placeholder、10 项权限/状态策略。基础 IM、AI IM 扩展和跨域体验分别统计，不混算为同一种能力。

## 2. 范围和方法

### 2.1 纳入范围

- 教师端 `/teacher/messages`、`/teacher/classes/:classId/chat`；
- 学生端 `/student/messages`、`/student/classes/:classId/chat`；
- 首页、班级详情、稳定深链和业务通知等 IM 外部入口，以及尚未装配的全局搜索模块；
- `MessageWorkspace` 内的会话、消息、通知、管理、状态和响应式能力；
- 教师私密 TeacherIn、公开班级 Agent、教师/学生 Agent 私聊；
- 当前实现、Scenario、测试和已锁定约束之间的对应关系。

### 2.2 明确不纳入

- 线上 ClassIn 真实版本事实；
- `docs/01-research/source-notes/classin_im_1_0_online_current_state_audit_20260827.md` 中尚未与本 Demo 对照的线上结论；
- 班级公告的完整独立页面、待办、作业、课程和文件库本身；它们只在与 IM 发生入口或回跳时记录。班级公告与官方公告在后续能力比较中归为同一个“通知公告”业务能力家族，不因承载页面不同而重复计数；
- `IM-CHANNEL-CASE-LIBRARY.md` 中标记为 `[未来]` 的 WB/PA/DA Case；
- 真实 Agent Runtime、真实 IM/文件 API、生产授权和治理后台。

### 2.3 本轮实机抽查

2026-08-30 在本地 Vite Demo 中验证：

| 路径 | 角色 | 验证结果 |
| --- | --- | --- |
| `/teacher/messages?category=class&thread=class-physics-3` | 教师 | 四分类目录、班级群、消息操作、三栏沉浸、TeacherIn 常驻、可调宽度可达 |
| `/teacher/messages?category=direct&thread=direct-wang-li` | 教师 | Agent/联系人分组、普通私聊、会话管理、TeacherIn 回复辅助可达 |
| `/teacher/messages?category=system&thread=system-teacher-submissions` | 教师 | 系统通知详情、元数据、作业深链和“阅读不改变待办”说明可达 |
| `/teacher/messages?category=official&thread=official-update` | 教师 | 官方公告列表、详情、发布信息和占位动作可达 |
| `/student/messages?category=direct&thread=direct-class-agent-physics-3-student` | 学生 | Agent/联系人目录、Agent 隔离私聊、历史加载可达；无 TeacherIn、无教师管理入口 |
| `/teacher/classes/physics-3/chat` | 教师 | 固定班级双栏沉浸、返回班级、TeacherIn 常驻可达 |
| `/student/classes/physics-3/chat` | 学生 | 固定班级单栏沉浸、返回班级、群聊和公开 Agent 入口可达；无 TeacherIn |

### 2.4 自动化复核

- `npm run test -- tests/integration/message-workspace.test.tsx tests/integration/class-agent-conversation.test.tsx tests/integration/workbuddy-im-assistance.test.tsx`：3 个文件、47 项测试通过；
- `npx playwright test tests/e2e/message-workspace.spec.ts --workers=1`：Chromium 31 项通过，用时约 2.4 分钟；覆盖消息滚动、师生入口、会话管理、沉浸进退、TeacherIn、班级 Agent、可访问性和紧凑布局。

## 3. Demo IM 外部入口清单

| ID | 入口位置 | 角色 | 触发与落点 | 当前状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| E-01 | 全局侧栏“消息” | 教师 | `/teacher/messages`；进入消息中心并自动进入沉浸工作区 | `LOCAL_OPERATIONAL` | `V/C/T`：`src/app/shell/navigation.ts`、`TeacherMessagesPage.tsx` | 默认最多显示“会话列表 + 当前会话 + TeacherIn”三栏。 |
| E-02 | 全局侧栏“消息” | 学生 | `/student/messages`；进入标准消息中心 | `LOCAL_OPERATIONAL` | `V/C/T`：`src/app/shell/navigation.ts`、`StudentMessagesPage.tsx` | 学生消息中心不进入教师沉浸策略，不显示 TeacherIn。 |
| E-03 | 教师首页“消息”摘要 | 教师 | “查看全部”进入消息中心；点击摘要携带 `category/thread/source=home` 定位具体会话 | `LOCAL_OPERATIONAL` | `V/C/T`：`TeacherHomePage.tsx:335` | 当前固定首页展示班级群与学生私聊摘要。 |
| E-04 | 学生首页“班级消息”摘要 | 学生 | “查看全部”进入消息中心；点击最新班级消息进入 `/student/classes/:classId/chat?from=home` | `LOCAL_OPERATIONAL` | `V/C/T`：`StudentHomePage.tsx:273` | 与教师首页不同，摘要点击直接进入固定班级群聊。 |
| E-05 | 教师班级详情“班级群聊” | 教师 | `/teacher/classes/:classId/chat`；固定当前班级并显示“聊天 + TeacherIn” | `LOCAL_OPERATIONAL` | `V/C/T`：`TeacherClassWorkspace.tsx:1047`、`TeacherClassChatPage.tsx` | 入口显示当前班级未读数；返回路径稳定指向原班级。 |
| E-06 | 学生班级详情“班级群聊” | 学生 | `/student/classes/:classId/chat`；固定当前班级，只显示群聊 | `LOCAL_OPERATIONAL` | `V/C/T`：`StudentClassWorkspace.tsx:200`、`StudentClassChatPage.tsx` | 不显示会话列表、教师管理或 TeacherIn。 |
| E-07 | 全局搜索“消息”结果（未装配） | 教师、学生 | 模块能够构建消息搜索结果并经 `ProductTarget` 生成目标线程 URL，但当前 App 没有挂载 `GlobalSearchDialog` 或可见触发入口 | `DORMANT`（实现/接入不完整，前端未用） | `C/T`：`GlobalSearchDialog.tsx:98`、`search.ts`、`product-target.ts:65` | 用户不可见、不可达、不可用；不计为当前 Demo 已有入口，只作为升级候选代码资产。 |
| E-08 | 稳定消息深链 | 教师、学生 | `category + thread + source` 恢复分类、线程和来源；不可见线程进入“目标消息不可用” | `LOCAL_OPERATIONAL` | `V/C/T`：`MessageWorkspace.tsx`、`product-target.ts` | 支持首页、搜索和业务通知回跳复用同一路由语义。 |

## 4. Demo IM 功能主清单

本章按三部分独立呈现：4.1—4.5 为 **基础 IM（46 项）**，4.6—4.7 为 **AI IM 扩展（30 项）**，4.8 为 **跨域体验能力（10 项）**。后续表单和统计保持这一分界。

### A. 基础 IM

#### 4.1 会话组织、发现与未读

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| NAV-01 | 四类消息目录 | 教师、学生 | 私聊、班级消息、系统通知、官方公告；同一列表面板切换 | `LOCAL_OPERATIONAL` | `V/C/T`；`MessageCategory` 固定四值 |
| NAV-02 | 分类未读汇总 | 教师、学生 | 私聊/班级消息显示数字，系统/官方显示未读点；`99+` 封顶 | `LOCAL_OPERATIONAL` | `V/C/T`；本地 Store |
| NAV-03 | 会话未读 | 教师、学生 | 会话行显示未读数或点；进入线程将当前角色未读归零 | `LOCAL_OPERATIONAL` | `V/C/T`；角色隔离的 `unreadByRole` |
| NAV-04 | 当前分类全部标为已读 | 教师、学生 | 列表操作菜单执行当前分类批量已读 | `LOCAL_OPERATIONAL` | `C/T`；仅本地状态 |
| NAV-05 | 分类内搜索 | 教师、学生 | 只搜索当前分类的标题、副标题、最近消息或通知正文 | `LOCAL_OPERATIONAL` | `V/C/T`；本地字符串匹配 |
| NAV-06 | 私聊范围筛选 | 教师、学生 | “全部 / 班级 Agent / 联系人”，显示 Agent 和联系人数量 | `LOCAL_OPERATIONAL` | `V/C/T`；授权优先投影 |
| NAV-07 | Agent 能力关键词搜索 | 教师、学生 | 私聊目录与新建私聊可按 Agent 名称、班级、课程和公开能力搜索 | `LOCAL_OPERATIONAL` | `V/C/T`；固定 4 个 Agent |
| NAV-08 | 会话排序和预览 | 教师、学生 | 按 `updatedAt` 倒序，展示头像、标题、最近正文、时间和未读 | `LOCAL_OPERATIONAL` | `V/C/T`；固定 Scenario |
| NAV-09 | 发起私聊 | 教师、学生 | 打开带搜索的 Dialog，Agent 与联系人分组；选择后复用唯一既有线程 | `LOCAL_OPERATIONAL` | `C/T`；未接真实通讯录 |
| NAV-10 | 跨 Agent 切换保护 | 教师、学生 Agent 私聊 | 当前草稿未发送时，二次选择确认切换；草稿保留在线程内 | `LOCAL_OPERATIONAL` | `C/T`；本地草稿 Map |
| NAV-11 | URL 状态恢复 | 教师、学生 | 分类和线程写入 URL；刷新或深链恢复选择 | `LOCAL_OPERATIONAL` | `V/C/T` |
| NAV-12 | 无结果、空分类和不可用目标 | 教师、学生 | 分别显示清除搜索、查看全部、分类空状态或目标不可用 | `POLICY_ONLY` | `C/T` |

#### 4.2 消息生产、内容与阅读

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| MSG-01 | 发送纯文本消息 | 教师、学生；私聊/班级群 | 输入非空正文后追加本地消息并清空 Composer | `LOCAL_OPERATIONAL` | `V/C/T`；无真实 IM API |
| MSG-02 | 多行正文与安全折行 | 全部实时会话 | 保留换行、空行与缩进；长词在气泡宽度内折行 | `LOCAL_OPERATIONAL` | `C/T`；纯文本，不解析 Markdown |
| MSG-03 | Enter / Shift+Enter / IME Composer | 教师、学生 | 复用 `WorkspaceComposer` 的发送、换行和中文输入契约 | `LOCAL_OPERATIONAL` | `C/T` |
| MSG-04 | 每线程独立未发送草稿 | 教师、学生 | 切换线程后草稿按线程保留 | `LOCAL_OPERATIONAL` | `C/T`；页面本地状态，不持久化到生产服务 |
| MSG-05 | 发送表情 | 教师、学生；可写会话 | 快捷发送固定 `🙂` Emoji 消息 | `LOCAL_OPERATIONAL` | `C/T`；本地消息 |
| MSG-06 | 附件与扩展菜单 | 教师、学生 | 照片、拍摄、名片、文件、语音、临时教室入口 | `PLACEHOLDER` | `V/C`；只返回 Placeholder 反馈，不访问设备或文件服务 |
| MSG-07 | 消息时间与日期标记 | 教师、学生 | 会话列表显示今天/昨天/月日；Timeline 显示“今天”和时分 | `LOCAL_OPERATIONAL` | `V/C/T` |
| MSG-08 | 连续同发送者消息分组 | 教师、学生 | 相邻同作者消息弱化重复头像和作者信息 | `LOCAL_OPERATIONAL` | `C/T` |
| MSG-09 | 系统事件消息 | 班级群 | 以居中系统文案展示课堂开始等事件，不使用普通气泡 | `LOCAL_OPERATIONAL` | `V/C/T`；固定 Scenario |
| MSG-10 | 置顶消息展示 | 班级群 | Header 下显示置顶横条；教师可置顶/取消置顶非系统、未撤回消息 | `LOCAL_OPERATIONAL` | `V/C/T`；本地线程状态 |
| MSG-11 | 撤回消息 | 班级群 | 教师可撤回自己的群消息；学生只可撤回 24 小时内自己的群消息 | `LOCAL_OPERATIONAL` | `V/C/T`；本地时间和本地线程状态 |
| MSG-12 | 撤回后占位 | 班级群 | 正文替换为“消息已撤回”，清除对应置顶 | `LOCAL_OPERATIONAL` | `C/T` |
| MSG-13 | 可打开内容引用 | 教师批准后的讲题消息 | 普通教师消息正文内展示“查看分步讲解”文字链接，打开批准版本 Viewer | `MOCK_CLOSED_LOOP` | `V/C/T`；固定 GuidedExplanation Artifact |
| MSG-14 | 只读和禁言 Composer | 固定班级只读、学生被禁言 | Composer 替换为“仅供查看”或“已开启全体禁言”状态条 | `POLICY_ONLY` | `C/T` |

#### 4.3 历史、滚动与新消息

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| HIS-01 | Agent 私聊历史分页 | 教师、学生 Agent 私聊 | “加载更早消息”向前追加固定历史页 | `LOCAL_OPERATIONAL` | `V/C/T`；固定历史 Scenario |
| HIS-02 | 历史追加锚点保持 | Agent 私聊 | Prepend 后保持原阅读位置，不跳到底部 | `LOCAL_OPERATIONAL` | `C/T` |
| HIS-03 | 每线程滚动位置 | 教师、学生 | 切换线程后恢复各自 Timeline 滚动位置 | `LOCAL_OPERATIONAL` | `C/T`；页面生命周期内 |
| HIS-04 | 新 Agent 消息锚点 | Agent 私聊 | 阅读历史时回复到达不强制贴底，显示“1 条新消息” | `LOCAL_OPERATIONAL` | `C/T` |
| HIS-05 | 局部滚动所有权 | 所有消息入口 | Shell 固定；会话列表和 Timeline 内部滚动；Header 与 Composer 固定 | `LOCAL_OPERATIONAL` | `V/C/T` |
| HIS-06 | 低噪滚动条 | 沉浸消息与长内容 | 默认隐藏 Thumb，Hover 或键盘焦点时显示 | `LOCAL_OPERATIONAL` | `S/C/T` |

#### 4.4 会话管理与业务连接

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| MAN-01 | 教师统一“会话管理”入口 | 教师；群聊/普通 1v1 | 不因消息中心或固定班级入口变化 | `LOCAL_OPERATIONAL` | `V/C/T` |
| MAN-02 | 群文件 | 班级群 | 菜单入口存在，返回“未上传或下载真实文件”反馈 | `PLACEHOLDER` | `V/C` |
| MAN-03 | 群成员 | 班级群 | 菜单入口存在，提示在班级详情统一管理 | `PLACEHOLDER` | `V/C` |
| MAN-04 | 全体禁言 / 解除禁言 | 教师；班级群 | 切换本地线程禁言状态；学生 Composer 随之禁用 | `LOCAL_OPERATIONAL` | `C/T`；无生产治理写回 |
| MAN-05 | 联系人资料 | 教师；普通 1v1 | 菜单入口存在，提示未读取真实通讯录 | `PLACEHOLDER` | `C/T` |
| MAN-06 | 消息免打扰 | 教师；普通 1v1 | 本地切换免打扰状态并反馈 | `LOCAL_OPERATIONAL` | `C/T`；无真实通知服务 |
| MAN-07 | 学生会话操作边界 | 学生 | 无教师“会话管理”；班级群只显示有限“班级会话操作” | `POLICY_ONLY` | `V/C/T` |
| MAN-08 | 加入与添加 | 教师、学生；私聊列表 | 列表操作进入角色对应 `/join` 页面，页面可返回私聊分类 | `LOCAL_OPERATIONAL` | `C/T`；不等于通讯录新增已完成 |

#### 4.5 通知公告型消息

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| NTF-01 | 系统通知目录与详情 | 教师、学生 | 独立分类；展示 Tag、标题、正文、元数据和动作 | `LOCAL_OPERATIONAL` | `V/C/T`；固定通知 Scenario |
| NTF-02 | 官方公告目录与详情 | 教师、学生 | 独立分类；展示发布方、发布时间和公告正文 | `LOCAL_OPERATIONAL` | `V/C/T`；固定公告 Scenario |
| NTF-03 | 作业通知业务深链 | 教师、学生 | 提交进度、退回、批改结果可进入作业详情/订正/结果 | `LOCAL_OPERATIONAL` | `V/C/T`；目标业务页为本地 Demo |
| NTF-04 | 从业务页返回原通知 | 教师、学生 | `source=notification + notification id` 回到原系统通知线程 | `LOCAL_OPERATIONAL` | `C/T` |
| NTF-05 | 阅读与待办状态分离 | 系统通知 | 阅读通知只清未读，不改变待办处理状态 | `POLICY_ONLY` | `V/C/T` |
| NTF-06 | 非业务公告动作 | 课堂报告、更新说明、维护公告 | 按钮存在但只显示入口保留反馈 | `PLACEHOLDER` | `V/C`；未接报告或公告服务 |

### B. AI IM 扩展

#### 4.6 班级 Agent：公开群聊与隔离私聊

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| AGT-01 | 群内 `@` 混合发现 | 教师、学生；班级群 | 输入 `@` 展示已授权 Agent 与成员候选 | `MOCK_CLOSED_LOOP` | `V/C/T`；固定授权快照 |
| AGT-02 | `@Agent` 专用 Picker | 教师、学生；班级群 | 独立入口、自动聚焦搜索、Agent-only 列表 | `MOCK_CLOSED_LOOP` | `V/C/T` |
| AGT-03 | 结构化主响应 Agent | 教师、学生；班级群 | 每条消息最多绑定 1 个 Primary Agent；正文普通同名文字不触发 | `MOCK_CLOSED_LOOP` | `C/T` |
| AGT-04 | Agent 替换、移除与撤销 | 教师、学生；班级群 | 切换 Agent 后 5 秒可撤销；空正文 Backspace 可移除目标 | `LOCAL_OPERATIONAL` | `C/T` |
| AGT-05 | 授权发送前重验 | 教师、学生 | Definition、Binding、Authorization ID/version 失配时 fail closed | `POLICY_ONLY` | `C/T`；固定授权模型 |
| AGT-06 | 公开 Agent 回复 | 教师、学生；班级群 | 仅显式结构化 `@Agent` 触发，以 Agent 身份公开回复 | `MOCK_CLOSED_LOOP` | `V/C/T`；确定性 Adapter |
| AGT-07 | 公开回复可见范围 | 班级群 | 回复对群成员可见，消息显示公开可见范围 | `POLICY_ONLY` | `V/C/T` |
| AGT-08 | Agent 私聊目录 | 教师、学生 | 同一 4 个班级 Agent 均可进入；教师和学生线程 ID 隔离 | `MOCK_CLOSED_LOOP` | `V/C/T` |
| AGT-09 | Agent 私聊无需 `@` | 教师、学生 Agent 私聊 | 普通消息直接触发当前 Agent | `MOCK_CLOSED_LOOP` | `V/C/T` |
| AGT-10 | 两阶段响应状态 | Agent 私聊 | “正在理解”→“正在整理”→完成，约 1.8 秒仅属于 Mock | `MOCK_CLOSED_LOOP` | `C/T` |
| AGT-11 | 回复失败与重试 | 群聊/Agent 私聊 | 保留用户消息和 Agent 身份；可恢复失败提供重试 | `MOCK_CLOSED_LOOP` | `C/T` |
| AGT-12 | 授权撤销失败关闭 | Agent 私聊 | 撤权后不可继续重试或进入越权线程 | `POLICY_ONLY` | `C/T` |
| AGT-13 | 教师不可发现学生 Agent 私聊 | 教师 | 教师只能进入自己的 Agent 线程，不能搜索学生线程 | `POLICY_ONLY` | `V/C/T` |
| AGT-14 | 同一能力的渠道化投影 | PA-01 / DA-01 | 公开群短提示；隔离私聊分步辅导；均不直接给最终答案 | `MOCK_CLOSED_LOOP` | `S/C/T`；代表性固定 Case |

#### 4.7 教师私密 TeacherIn IM 协作

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| TB-01 | 教师私密 Sidecar | 教师；普通班级群/普通 1v1 | 只对教师可见，不成为公开会话或群成员 | `MOCK_CLOSED_LOOP` | `V/C/T`；学生端不可发现 |
| TB-02 | 班级群三项推荐任务 | 教师；班级群 | 作业催交、课前准备通知、单题讲解 | `MOCK_CLOSED_LOOP` | `V/C/T`；固定 Case |
| TB-03 | 1v1 两项推荐任务 | 教师；学生私聊 | 回复辅助、单题讲解 | `MOCK_CLOSED_LOOP` | `V/C/T` |
| TB-04 | 私密持续 Composer | 教师 | Ready 发起 Run；运行中可补充；草稿/完成/失败后可继续新 Run | `MOCK_CLOSED_LOOP` | `V/C/T` |
| TB-05 | 可观察 Run Timeline | 教师 | 目标理解、计划、Capability、进度、Artifact；不展示隐藏思维链 | `MOCK_CLOSED_LOOP` | `S/C/T`；确定性 Scheduler |
| TB-06 | 作业催交草稿 | 教师；班级群 | 读取固定有效作业和提交事实，按作业分组生成未提交提醒 | `MOCK_CLOSED_LOOP` | `C/T`；Mock Read Adapter |
| TB-07 | 课前准备通知草稿 | 教师；班级群 | 读取固定周教学计划并生成一条全班准备通知 | `MOCK_CLOSED_LOOP` | `C/T` |
| TB-08 | 单题讲解 Artifact | 教师；班级群或当前学生私聊 | 定位固定题目，生成最终话术、文字链接和四步讲解 | `MOCK_CLOSED_LOOP` | `V/C/T` |
| TB-09 | 待审阅成果面 | 教师 | 查看目标、身份、范围、名单/话术；编辑正文、删除/还原名单 | `MOCK_CLOSED_LOOP` | `S/C/T` |
| TB-10 | 展开/收起最终话术编辑 | 教师 | Sidecar 内增高同一个 Textarea，不弹 Dialog，不改变宽度 | `LOCAL_OPERATIONAL` | `C/T` |
| TB-11 | 教师审批与发送前复核 | 教师；班级群/讲题分发 | 最新草稿版本才可批准；发送前重读事实、校验权限和幂等 | `MOCK_CLOSED_LOOP` | `C/T` |
| TB-12 | 以教师身份发送 | 教师；班级群/当前学生 | 公开 Timeline 只出现教师批准后的最终消息，不出现 TeacherIn 过程 | `MOCK_CLOSED_LOOP` | `C/T`；Mock Write Adapter |
| TB-13 | ExecutionReceipt 与定位 | 教师 | 成功后显示紧凑持久回执并可定位目标消息 | `MOCK_CLOSED_LOOP` | `C/T` |
| TB-14 | 私聊回复建议插入 Gate | 教师；普通 1v1 | 建议只插入公开 Composer，仍需教师手动发送；不自动写消息 | `MOCK_CLOSED_LOOP` | `V/C/T` |
| TB-15 | 讲题入“我的文件” | 教师 | 只有成功 Receipt 后同版本 Artifact 才进入本地文件库 | `MOCK_CLOSED_LOOP` | `S/C/T`；未接真实文件 API |
| TB-16 | 显式异常与恢复 | 教师 | 空结果、读取失败、事实过期、权限拒绝、发送失败、证据不匹配、重试 | `MOCK_CLOSED_LOOP` | `C/T` |

### C. 跨域体验能力

#### 4.8 Shell、响应式、可访问性与状态

| ID | Feature | 角色 / 渠道 | Demo 行为 | 状态 | 证据与真值 |
| --- | --- | --- | --- | --- | --- |
| EXP-01 | 教师消息中心沉浸态 | 教师 `/teacher/messages` | 隐藏全局 Sidebar/Topbar，通信主 Surface 与 TeacherIn 并列 | `LOCAL_OPERATIONAL` | `V/C/T` |
| EXP-02 | 学生标准消息中心 | 学生 `/student/messages` | 保留全局 Shell，列表 + 内容双栏 | `LOCAL_OPERATIONAL` | `V/C/T` |
| EXP-03 | 固定班级沉浸态 | 教师、学生 `/classes/:id/chat` | 无会话列表；教师双栏，学生单栏；稳定返回班级 | `LOCAL_OPERATIONAL` | `V/C/T` |
| EXP-04 | WorkBuddy 可调宽度 | 教师宽屏沉浸态 | Pointer/键盘/Home/End/双击复位；本机保存 global/class 两套偏好 | `LOCAL_OPERATIONAL` | `V/C/T` |
| EXP-05 | 紧凑宽度 Overlay | 教师 | 低于 1184px 时 TeacherIn 转为 Overlay，Splitter 移出可达树 | `LOCAL_OPERATIONAL` | `S/C/T` |
| EXP-06 | 沉浸进退与 Reduced Motion | 教师 | 320ms 同源过渡；Reduced Motion 取消空间动画但保持状态时序 | `LOCAL_OPERATIONAL` | `S/C/T` |
| EXP-07 | 双 `Esc` 退出 | 教师消息中心、师生固定班级 | 非编辑状态双 `Esc` 执行与按钮相同的确定性退出 | `LOCAL_OPERATIONAL` | `C/T` |
| EXP-08 | TeacherIn 退出引导 | 教师消息中心 | 视口居中过渡卡、约 6 秒、暂停、重开、关闭、当前文档“不再提示” | `LOCAL_OPERATIONAL` | `C/T` |
| EXP-09 | Loading / Error | 师生所有消息入口 | Skeleton/加载文案或全边界错误；不伪造已加载内容 | `POLICY_ONLY` | `C/T` |
| EXP-10 | Empty / Read-only / Permission | 师生 | 分类空、目标不可用、班级不存在、只读、禁言和撤权均有显式投影 | `POLICY_ONLY` | `C/T` |

## 5. 角色与渠道总览

| 能力 | 教师普通私聊 | 教师班级群 | 学生普通私聊 | 学生班级群 | 教师 Agent 私聊 | 学生 Agent 私聊 |
| --- | --- | --- | --- | --- | --- | --- |
| 文本 / Emoji / 附件 Placeholder | 有 | 有 | 有 | 有 | 有 | 有 |
| 会话管理 | 联系人资料、免打扰 | 群文件、成员、禁言 | 无教师管理 | 有限班级操作 | 无教师普通会话管理 | 无教师管理 |
| 置顶 | 无 | 教师可操作 | 无 | 只读置顶结果 | 无 | 无 |
| 撤回 | 无 | 教师本人消息 | 无 | 学生本人 24h 内 | 无 | 无 |
| 公开 `@班级 Agent` | 不适用 | 有 | 不适用 | 有 | 不适用 | 不适用 |
| Agent 无需 `@` 回复 | 不适用 | 不适用 | 不适用 | 不适用 | 有 | 有 |
| TeacherIn | 回复辅助、单题讲解 | 催交、课前通知、单题讲解 | 无 | 无 | 无 | 无 |
| 系统/官方详情 | 通过独立分类 | 通过独立分类 | 通过独立分类 | 通过独立分类 | 不适用 | 不适用 |

## 6. 已排除的“看起来像 IM、但当前不是 IM 核心 Feature”的能力

| 项目 | 当前事实 | 本研究处理 |
| --- | --- | --- |
| 班级公告独立页面 | 当前 Demo 中拥有独立 Surface、对象和路由，但与消息中心官方公告属于同一个“通知公告”业务能力家族 | 不盘点完整独立页面；第二步按一个能力归并，入口和对象差异仅作为承载面差异记录 |
| 待办与作业 | 系统通知可深链进入，阅读通知不改变待办状态 | 只记录 IM 入口/回跳，不把作业功能并入 IM 清单 |
| “我的文件” | TeacherIn 讲题成功后可沉淀 Artifact | 只记录 IM 产生内容的去向，不盘点完整文件库 |
| 班级详情中的旧聊天 Dialog | 规格和部分兼容代码仍保留，但当前教师/学生班级群聊入口使用独立沉浸路由 | 标记为 `DORMANT`，不算可用入口 |

## 7. 第一阶段已确认口径与第二阶段补证据登记

| ID | 状态 | 已确认共识 | 后续处理 |
| --- | --- | --- | --- |
| D-Q01 | `CONFIRMED` | IM 全集包含“会话型 IM”和“通知公告型消息”两个基础子域；二者分域统计。 | 第二步沿用这一分类盘点线上能力。 |
| D-Q02 | `CONFIRMED` | 班级公告与消息中心官方公告属于同一个“通知公告”业务能力家族。 | 不重复计算功能；分别记录入口、对象和页面等承载面差异。 |
| D-Q03 | `CONFIRMED` | TeacherIn 与班级 Agent 属于 AI IM 扩展，与基础 IM 独立。 | 保留在同一研究中，但独立成章、独立统计、独立形成候选方向。 |
| D-Q04 | `CONFIRMED / PHASE_2_RESOLVED` | 可见 Placeholder 代表 Demo 已覆盖该功能，但不代表已经完整实现。 | 线上附件链路已证明；第三阶段按 `PARTIAL + PLACEHOLDER` 处理。 |
| D-Q05 | `CONFIRMED / PHASE_2_RESOLVED` | 群文件、成员、禁言、置顶、撤回等本阶段先判断功能有无。 | 线上有无已校准；置顶、撤回和免打扰差异进入第三阶段冲突检查。 |
| D-Q06 | `CONFIRMED / PHASE_2_RESOLVED` | 私聊免打扰、联系人资料、发起私聊和搜索同样先判断功能有无。 | 线上证据已补齐；资料与搜索完整度进入第三阶段逐项映射。 |
| D-Q07 | `CONFIRMED` | `PLACEHOLDER` 算当前 Demo 有功能表达；`DORMANT` 表示代码资产存在但实现/接入不完整、前端未用，用户不可见不可用，因此不算当前 Demo 已有功能。 | Dormant 资产单列进入升级候选池。第一阶段不枚举前端完全不存在的功能；第三、四步仅在有线上或竞品参照能力时用 `NOT_IMPLEMENTED` 表示差距。 |
| D-Q08 | `CONFIRMED` | 教师与学生首页消息摘要应统一进入消息中心并定位具体会话；班级详情“班级群聊”继续进入固定班级会话。 | 当前学生首页偏差记录为后续规范化项，本阶段不修改产品代码。 |

## 8. 关键证据索引

### 8.1 实现

- 路由与入口：`src/app/router/TeacherRoutes.tsx`、`StudentRoutes.tsx`、`src/app/shell/navigation.ts`
- 消息 Domain：`src/domain/message/message.ts`
- 固定数据：`src/mocks/scenarios/messages.ts`、`src/mocks/scenarios/class-agent.ts`
- 消息工作区：`src/features/message-workspace/MessageWorkspace.tsx`
- 消息 Store：`src/features/message-workspace/MessageWorkspaceProvider.tsx`、`message-workspace-store.ts`
- 班级 Agent：`src/domain/class-agent/`、`src/features/class-agent-conversation/`
- TeacherIn IM：`src/features/workbuddy-im-assistance/`
- 首页和班级入口：`TeacherHomePage.tsx`、`StudentHomePage.tsx`、`TeacherClassWorkspace.tsx`、`StudentClassWorkspace.tsx`
- 跨产品深链：`src/domain/navigation/product-target.ts`、`src/features/global-search/GlobalSearchDialog.tsx`

### 8.2 自动化与规格

- 基础消息 Integration：`tests/integration/message-workspace.test.tsx`
- Agent Integration：`tests/integration/class-agent-conversation.test.tsx`
- TeacherIn IM Integration：`tests/integration/workbuddy-im-assistance.test.tsx`
- 浏览器和可访问性：`tests/e2e/message-workspace.spec.ts`
- 视觉：`tests/visual/workbuddy-im-assistance.visual.spec.ts`
- 当前 Feature Spec：`docs/04-specs/features/workbuddy-im-collaboration/FEATURE-SPEC.md`
- 实现追踪：`docs/04-specs/features/workbuddy-im-collaboration/IMPLEMENTATION-TRACEABILITY.md`
- Case 边界：`docs/04-specs/features/workbuddy-im-collaboration/IM-CHANNEL-CASE-LIBRARY.md`

## 9. Phase 1 完成 Gate

- [x] 已建立跨四步统一字段、实现状态和证据等级；
- [x] 已盘点教师/学生消息中心与固定班级群聊入口；
- [x] 已把基础 IM、通知、班级 Agent 和 TeacherIn 分域列出；
- [x] 已区分可操作、Mock 闭环、Placeholder、Policy 和 Dormant；
- [x] 已完成四个核心入口和三类补充路径的浏览器实机抽查；
- [x] 用户已审阅 D-Q01—D-Q08，并校准范围；
- [x] 已根据用户反馈更新为 `PHASE_1_USER_REVIEWED`；第二步线上事实盘点可以开始。
