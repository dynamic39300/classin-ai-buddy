# NineClaw 组件与字段清单

## 1. 目的

本清单把跨页面重复出现的产品元素变成稳定组件契约，避免视觉稿按页面重复发明交互。组件名是本项目的设计语言，不代表 NineClaw 内部组件名称。

## 2. 应用壳组件

| ID | 组件 | 必要内容 | 状态/变体 | 关键行为 |
|---|---|---|---|---|
| G-C01 | AppSidebar | 品牌、主导航、历史、文件、设置、会员、积分 | 展开/收起、当前模块 | 保持主页面上下文 |
| G-C02 | PrimaryNavItem | 图标、标签、选中态 | default/hover/active | 切换一级页 |
| G-C03 | HistorySection | 标题、控制、任务条目 | loading/empty/data | 搜索、打开任务 |
| G-C04 | HistoryItem | 标题、相对时间、状态可选、“…”操作入口 | active/inactive/hover/menu-open | 恢复 Run；默认显示距离当前几小时等时间，操作入口打开菜单 |
| G-C09 | HistoryItemMenu | 重命名、置顶、删除 | closed/open/action-running | 对当前历史任务执行管理动作 |
| G-C05 | UserIdentity | 头像、姓名 | loading/loaded | 打开用户菜单 |
| G-C06 | TruthLabel | 本地等运行真值 | local/cloud/mock 等 | 只读说明 |
| G-C07 | MembershipCard | 会员状态/推广 | member/non-member | 进入会员 |
| G-C08 | PointsCard | 积分余额 | loading/loaded | 进入积分 |

## 3. 任务输入与上下文组件

| ID | 组件 | 字段/内容 | 状态 | 行为 |
|---|---|---|---|---|
| T-C01 | GoalComposer | draft、placeholder | idle/focused/disabled | 多行输入、发送 |
| T-C02 | WorkdirSelector | 当前目录、最近目录 | selected/missing/denied | 选择/添加目录 |
| T-C03 | AttachmentPicker | 文件/文件夹 | idle/uploading/error | 添加上下文 |
| T-C04 | ContextChip | icon、name、type、remove | ready/error | 打开/移除 |
| T-C05 | SkillPicker | 搜索、Skill 列表 | loading/empty/results | 选择 Skill |
| T-C06 | SkillChip | icon、name、source | selected | 从本次任务移除 |
| T-C07 | ModelPicker | provider/model、default | ready/unavailable | 选择/进设置 |
| T-C08 | SendStopControl | send/stop icon | disabled/send/running/stopping | 提交或停止 |
| T-C09 | QuickTask | icon、label | default/hover | 注入任务意图 |

## 4. 会话与执行组件

| ID | 组件 | 最小可见信息 | 展开信息 | 动作 |
|---|---|---|---|---|
| T-C10 | UserMessage | 文本、附件/上下文 | 时间等 | 复制/引用待确认 |
| T-C11 | AgentMessage | Markdown/说明 | 思考过程可分离 | 复制等待确认 |
| T-C12 | ThinkingDisclosure | 思考/执行中标签 | 可见过程文本 | 展开/收起 |
| T-C13 | ClarificationCard | 原因、问题、进度 | 答案摘要 | 选择/输入/提交 |
| T-C14 | PlanCard | 目标与步骤 | 输入输出摘要 | 展开步骤 |
| T-C15 | StepRow | 标题、状态 | 关联事件 | 展开 |
| T-C16 | CapabilityEvent | 人类可读动作、状态 | Skill/Tool 技术详情 | 重试/复制 |
| T-C17 | CommandEvent | 动作摘要、状态 | command/cwd/stdout/stderr | 停止/重试/复制 |
| T-C18 | FileEvent | 文件名、读写状态 | 路径/大小/解析 | 打开/定位 |
| T-C19 | ErrorRecoveryCard | 原因、影响 | errorCode/attempt | 重试/换策略/停止 |
| T-C20 | ArtifactCard | 名称、类型、状态 | 版本/路径 | 打开/定位 |
| T-C21 | CompletionSummary | 完成内容、产物清单 | 步骤统计 | 查看/继续 |
| T-C22 | JumpToLatest | 新事件数 | — | 滚到最新 |

## 5. 产物组件

| ID | 组件 | 必要内容 | 状态 | 行为 |
|---|---|---|---|---|
| T-C23 | ArtifactPane | 文件名、内容、关闭 | loading/ready/error | 分栏查看 |
| T-C24 | ArtifactToolbar | 类型相关动作 | view/edit/dirty/saving | 编辑、AI 修改、保存 |
| T-C25 | DocumentViewer | 排版内容 | loading/ready/error | 阅读/选择 |
| T-C26 | ExerciseViewer | 题目、答案/解析 | hidden/visible | 切换解析 |
| T-C27 | ArtifactEditor | 文档块、光标 | clean/dirty/conflict | 直接编辑 |
| T-C28 | BlockToolbar | 格式动作 | selection/no selection | 应用格式 |
| T-C29 | AIRevisionControl | 指令、修改范围 | idle/running/result | 请求/接受/继续修改 |
| T-C30 | SaveIndicator | 保存状态、时间 | dirty/saving/saved/failed | 保存/重试 |

## 6. 广场和管理组件

| ID | 组件 | 适用页面 | 关键内容/行为 |
|---|---|---|---|
| X-C01 | PageHeader | Skill/Tool/Content/Scheduler | 标题、说明、主行动 |
| X-C02 | TabSwitch | 所有广场/我的页 | 单选标签，保留筛选 |
| X-C03 | SearchField | Skill/Content 等 | 关键词、清除、提交/实时策略待定 |
| X-C04 | FilterGroup | Content | 分类标题与单选/多选值 |
| X-C05 | SortControl | Content | 综合/最新 |
| X-C06 | MarketplaceCard | Skill/Tool/Content | 图、名称、说明、来源、状态、动作 |
| X-C07 | DetailModal | Skill/Tool | 详情、主要/次要动作、关闭 |
| X-C08 | InstallControl | Skill/Tool | 安装/进度/已安装/重试 |
| X-C09 | EnableSwitch | Skill/Tool/Scheduler | 明确开关影响；异步回滚 |
| X-C10 | DestructiveConfirm | 删除/覆盖/解绑 | 对象、影响、确认文案 |
| X-C11 | EmptyState | 所有列表 | 原因、下一步主行动 |
| X-C12 | ErrorState | 所有异步页面 | 安全错误、重试 |

## 7. 内容发布组件

| ID | 组件 | 字段/规则 |
|---|---|---|
| C-C01 | PublishStepper | 四步、当前/完成/未开始状态；不允许越过必填步骤 |
| C-C02 | FileDropzone | 文件名、格式、大小、进度、重选/重试；≤100MB |
| C-C03 | CoverUploader | JPG/PNG/WebP、预览、替换、错误 |
| C-C04 | WorkMetadataForm | 标题、说明、分类、学段、学科、标签；精确规则待证据 |
| C-C05 | PricingControl | 免费开关、积分整数 0 或 1–999999 |
| C-C06 | SubmissionReview | 文件、封面、元数据、定价和审核说明摘要 |
| C-C07 | ReviewStatusBadge | 审核中/通过/驳回/下架 |

## 8. 表单通用字段规则

所有字段至少定义：label、帮助说明、是否必填、默认值、允许格式、最小/最大长度、空白处理、输入中校验、提交后错误、敏感性、是否持久化和离开页面策略。当前可直接确认的字段如下：

| 字段 | 页面 | 已确认规则 | 未确认 |
|---|---|---|---|
| 作品文件 | 发布 Step 1 | 任意格式、≤100MB | 是否多文件、压缩包 |
| 作品封面 | 发布 Step 1 | JPG/PNG/WebP | 尺寸/比例/大小 |
| 作品积分 | 发布 Step 3 | 0 免费；付费 1–999999 整数 | 余额/分成/手续费 |
| 定时标题 | 定时任务 | 文本字段 | 必填、长度、重复名 |
| 定时提示词 | 定时任务 | 多行任务目标 | 最大长度、变量模板 |
| 定时频率 | 定时任务 | 可见每日 | 全部频率/cron |
| 执行时间 | 定时任务 | 时间字段 | 时区/DST |
| 到期日 | 定时任务 | 可选日期 | 结束日包含性 |
| 工作目录 | 任务/定时任务 | 路径、Browse | 权限/不存在/移动 |
| Provider API Key | 模型设置 | 密码字段/掩码 | 保存/清除/导出策略 |
| Base URL | 模型设置 | URL | 协议白名单/尾斜线 |
| API 格式 | 模型设置 | Anthropic/OpenAI compatible | 默认值/扩展格式 |

## 9. 微交互与可访问性基线

- 图标按钮必须有可见 tooltip 或 accessible name；
- 切换、安装、保存和删除必须有即时状态，不能只等 toast；
- 模态打开后焦点进入，关闭后返回触发点；
- 键盘可完成输入、补参、提交、关闭和主要导航；
- 颜色不是唯一状态信号；
- 长任务动效支持减少动态效果偏好；
- 失败信息避免泄露 Token、环境变量、私有路径和学生数据；
- toast 只作为辅助反馈，关键结果必须留在对象或页面上。
