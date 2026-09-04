# NineClaw 能力管理页面 UI 高保真证据基线

> 日期：2026-08-22
> 研究范围：Skills、MCP/Tools、内容、我的文件、定时任务、设置六个能力管理页面
> 证据范围：本仓库保存的 NineClaw 原始录屏、静态截图与逐帧关键帧
> 用途：为 ClassIn WorkBuddy 能力管理页面的高保真重构提供可追溯基线，不定义底层 Agent 或真实服务能力

## 1. 结论摘要

当前实现与 NineClaw 的主要差异不是“卡片还不够精致”，而是六类页面被压成了同一套轻量列表/卡片模板。原版实际使用了至少五种不同页面原型：

1. Skills 与 Tools：营销或目录入口 + 双列能力卡 + 居中管理弹窗；
2. 内容：大幅首页、密集筛选、四列视觉卡片、独立详情页与分步发布工作台；
3. 我的文件：原始素材没有独立管理页证据，只能从左栏文件入口、工作目录选择和 Artifact 预览推导 ClassIn 适配；
4. 定时任务：显著空状态、全宽任务卡、历史表格与接近全高的创建弹窗；
5. 设置：独立设置壳层，按类别采用两列或三列的专用配置界面。

因此，高保真重构必须先恢复每一类页面自己的信息密度、主次层级和交互容器，不能继续以“换颜色、加阴影”修饰同一个通用组件。

### 1.1 证据标签

- **FACT**：在原始视频、截图或已抽取关键帧中直接可见；
- **INFERENCE**：由多个连续画面或界面关系推断，但素材未直接展示完整规则；
- **ADAPTATION**：为嵌入 ClassIn PC、满足当前 PRD 或补足证据缺口而设计，不是 NineClaw 原版事实；
- **UNKNOWN**：当前素材无法确认，实施时不应擅自宣称为原版还原。

“100% 高保真”在本文中只适用于有 **FACT** 证据的页面、状态与元素。对“我的文件”独立页、通用加载骨架、权限错误等未录制状态，只能做有标记的适配，不能用想象补齐原版。

## 2. 证据总表

| 页面 | 原始素材 | 关键帧或静态图 | 可证实程度 |
|---|---|---|---|
| Skills | [技能广场完整录屏](../../../reference/九章龙虾（PC-dmg软件）/技能广场-应用技能&安装&创建新技能体验全功能.mov)，00:00–14:43 | [市场首页](../evidence/nineclaw-keyframes/skills_0000_marketplace.jpg)、[官方推荐](../evidence/nineclaw-keyframes/skills_0177_official-recommended.jpg)、[详情弹窗](../evidence/nineclaw-keyframes/skills_0189_skill-detail.jpg)、[上传弹窗](../evidence/nineclaw-keyframes/skills_0270_upload-skill-modal.jpg)、[添加菜单](../../../reference/九章龙虾（PC-dmg软件）/skill-操作选项.png)、[查找技能](../../../reference/九章龙虾（PC-dmg软件）/skill-搜索技能.png)、[创建技能](../../../reference/九章龙虾（PC-dmg软件）/skill-创建技能.png)、[任务选择 Skill](../../../reference/九章龙虾（PC-dmg软件）/新建任务：选择技能.png)、[已安装卡片](../evidence/nineclaw-keyframes/skills_0825_installed-cards.jpg)、[我的技能](../evidence/nineclaw-keyframes/skills_0858_my-skills-management.jpg) | 高 |
| MCP/Tools | [工具广场完整录屏](../../../reference/九章龙虾（PC-dmg软件）/工具广场.mov)，00:00–01:02 | [目录](../evidence/nineclaw-keyframes/tools_0000_catalog.jpg)、[自定义表单](../evidence/nineclaw-keyframes/tools_0009_custom-form.jpg)、[JSON 模式](../evidence/nineclaw-keyframes/tools_0015_json-mode.jpg)、[内置工具配置](../evidence/nineclaw-keyframes/tools_0021_builtin-tool-detail.jpg)、[我的工具](../evidence/nineclaw-keyframes/tools_0042_my-tools.jpg)、[校验错误](../evidence/nineclaw-keyframes/tools_0058_validation-error.jpg) | 高 |
| 内容 | [内容广场完整录屏](../../../reference/九章龙虾（PC-dmg软件）/内容广场.mov)，00:00–05:51 | [广场列表](../evidence/nineclaw-keyframes/content_0000_marketplace-list.jpg)、[详情](../evidence/nineclaw-keyframes/content_0021_work-detail.jpg)、[我的作品](../evidence/nineclaw-keyframes/content_0151_my-works-dashboard.jpg)、[发布上传](../evidence/nineclaw-keyframes/content_0192_publish-upload-modal.jpg)、[完善信息](../evidence/nineclaw-keyframes/content_0213_publish-info-form.jpg)、[提交审核](../evidence/nineclaw-keyframes/content_0243-submit-review.jpg)、[失败 Toast](../evidence/nineclaw-keyframes/content_0303-upload-failure-toast.jpg)、[作品列表](../evidence/nineclaw-keyframes/content_0345-my-works-list.jpg) | 高 |
| 我的文件 | [首页新建任务](../../../reference/九章龙虾（PC-dmg软件）/首页，新建任务.png)、[添加文件夹](../../../reference/九章龙虾（PC-dmg软件）/新建任务：添加文件夹.png)、任务录屏中的 Artifact 预览 | 无独立文件管理页关键帧 | 低；独立页为 UNKNOWN |
| 定时任务 | 静态截图组 | [默认空状态](../../../reference/九章龙虾（PC-dmg软件）/定时任务-首页-默认状态.png)、[创建弹窗](../../../reference/九章龙虾（PC-dmg软件）/定时任务，创建任务.png)、[字段](../../../reference/九章龙虾（PC-dmg软件）/定时任务-创建任务、创建任务时填写的信息.png)、[通知渠道](../../../reference/九章龙虾（PC-dmg软件）/定时任务，创建任务，选择通知渠道.png)、[创建完成](../../../reference/九章龙虾（PC-dmg软件）/定时任务创建完成.png)、[二次编辑](../../../reference/九章龙虾（PC-dmg软件）/对创建完成的任务进行二次编辑和启动运行.png)、[运行中](../../../reference/九章龙虾（PC-dmg软件）/定时任务已正常启动，提示在运行中的状态.png) | 中高 |
| 设置 | 静态截图组 | [模型](../../../reference/九章龙虾（PC-dmg软件）/设置模型.png)、[云端备份](../../../reference/九章龙虾（PC-dmg软件）/设置云端备份.png)、[IM 机器人](../../../reference/九章龙虾（PC-dmg软件）/设置接入 IM 机器人.png)、[沙箱](../../../reference/九章龙虾（PC-dmg软件）/设置沙箱运行环境.png)、[关于](../../../reference/九章龙虾（PC-dmg软件）/关于 Classin.png)、[反馈](../../../reference/九章龙虾（PC-dmg软件）/用户反馈建议.png) | 高（静态），动效低 |

完整关键帧索引与视频元数据见 [NineClaw 关键帧证据图册](./product_research_nineclaw_keyframe_evidence_atlas_20260821.md)。

## 3. 跨页面视觉与布局语法

以下尺寸均由 3024×1898 原始画面做视觉测量，属于 **FACT（近似测量）**，实施时应以比例和密度优先，而不是机械套用像素。

### 3.1 应用壳层

- **FACT**：固定左栏约占整窗宽度 14%，主内容约占 86%；顶部白色标题栏约占整窗高度 5%。左栏使用极浅蓝白底，主内容多使用浅蓝—浅紫背景，而不是纯白画布。
- **FACT**：左栏顶部为品牌、醒目的蓝色主按钮“新建任务”，随后是 Skills、Tools、内容、定时任务；再以分割线区隔历史任务与“我的文件”条目；设置位于底部固定区。
- **FACT**：激活导航是浅蓝底、蓝色图标或文字的圆角行；普通导航无重底色。左栏可收起，收起状态见 [侧栏收起截图](../../../reference/九章龙虾（PC-dmg软件）/展示侧边栏收起的状态.png)。
- **ADAPTATION**：ClassIn 外层一级导航继续保留；WorkBuddy 六个入口作为其二级导航。不要在内容区再制造第三层常驻导航。

### 3.2 颜色、圆角、阴影与密度

- **FACT**：能力页主强调色是高饱和蓝色，Skills Hero 辅以蓝紫渐变；大面积背景为低饱和蓝灰/蓝紫。当前实现的绿色主强调色不是 NineClaw 能力页视觉基线。
- **FACT**：目录卡常用白色或半透明白色、细蓝灰边框、低扩散蓝灰阴影；卡片圆角视觉上约 14–20px，弹窗圆角更大。
- **FACT**：卡片并不“轻薄”：图标、标题、描述、来源/协议、状态或 CTA 均形成至少三层信息；内容卡还包含大图、角标、作者与统计。
- **FACT**：选择态主要通过蓝色下划线、浅蓝填充、蓝色边框或开关表示；不同页面不强行统一为一种 Tab。
- **INFERENCE**：录屏可见部分卡片在指针经过时出现蓝边或阴影增强，但无法精确确定完整 hover 动画参数。应控制为边框/阴影轻变化，不添加无证据的大幅位移。

### 3.3 交互容器分工

| 容器 | NineClaw 使用位置 | 基线 |
|---|---|---|
| 居中弹窗 | Skill 详情、Skill 上传、Tool 安装/自定义、定时任务创建 | 暗色遮罩；强层级；标题和关闭入口固定；长内容内部滚动；重要操作固定在底部 |
| 独立详情页 | 内容作品详情 | 顶部返回；左大预览、右操作；下方完整元数据 |
| 分步大型工作台 | 内容发布 | 左步骤栏 + 右表单；接近主内容全尺寸；底部主操作固定 |
| 右侧 Inspector | 任务 Run 的 Context/Artifact | 仅属于任务工作台，不应成为 Skills/Tools/内容管理页的通用详情模式 |
| 表格 | 定时任务历史 | 低装饰、列对齐、状态显式 |

## 4. Skills 页面基线

### 4.1 页面骨架与尺寸关系

- **FACT**：顶部 Chrome 标题为“技能广场”。标题栏下是具有蓝紫抽象波浪的营销 Hero，中心内容约占主区域宽度 2/3；大标题、说明文字垂直居中。[市场首页](../evidence/nineclaw-keyframes/skills_0000_marketplace.jpg)
- **FACT**：Hero 下方为同一内容宽度的工具行：左侧三个文字 Tab“官方推荐 / 技能广场 / 我的技能”，选中项用蓝色下划线；右侧是宽搜索框和描边“+ 添加技能”按钮。
- **FACT**：默认目录为双列网格。每张卡的宽高比约 3.3:1；两列间距约等于卡片内部左右边距，纵向间距略小。常规桌面首屏同时可见至少 2×2 张完整卡和下一行的一部分。
- **FACT**：“我的技能”仍为双列，但卡片高度明显增加，以容纳开关、来源、整行“立即使用”和独立删除按钮。[我的技能](../evidence/nineclaw-keyframes/skills_0858_my-skills-management.jpg)

### 4.2 卡片、筛选与状态

| 元素 | 高保真基线 | 标签 |
|---|---|---|
| 图标 | 左侧 32–40px 线性图标，带独立颜色；不使用统一绿色圆块 | FACT |
| 标题与说明 | 标题单行高权重；说明压为一行或两行；底部显示 `@官方` 等来源 | FACT |
| 安装状态 | 卡片右上为蓝色紧凑“+ 安装”或描边“已安装”；部分卡有橙色“上新”角标 | FACT |
| 管理状态 | “我的技能”右上有开关和“我的”小标；底部一整行描边“立即使用”，删除是单独红色描边图标按钮 | FACT |
| 搜索/Tab | 搜索是长圆角输入；Tab 是文字+下划线，不是大胶囊 | FACT |
| Hover | 蓝色边界/阴影轻增强；动画时长、是否位移未知 | FACT/UNKNOWN |
| 禁用/失败/加载/空 | 原始 Skills 录屏未展示可靠样本 | UNKNOWN |

### 4.3 详情与添加

- **FACT**：Skill 详情是居中宽弹窗，不是右侧 Drawer。弹窗约占主区域宽度 60%–70%、高度约 65%–75%；头部含图标、标题、辅助操作和关闭；中间由大幅预览/说明主导；底部固定提示和蓝色“去使用”。[详情弹窗](../evidence/nineclaw-keyframes/skills_0189_skill-detail.jpg)
- **FACT**：“添加技能”打开中等宽度上传弹窗：虚线拖拽区、选择文件按钮、“或输入链接”分隔、URL 输入与添加按钮、浅色规则提示区。[上传弹窗](../evidence/nineclaw-keyframes/skills_0270_upload-skill-modal.jpg)
- **FACT**：从 Skill 发起使用时回到新任务/任务流；Skill 管理页本身不承载完整 Run。[发起任务](../evidence/nineclaw-keyframes/skills_0810_use-skill-task-start.jpg)
- **ADAPTATION**：ClassIn 版可在详情中补充版本、权限和适用教学对象，但应置于原有详情信息区，不把治理字段变成抢占首屏的另一套卡片。

### 4.4 新增截图补充的 Skill 闭环

- **FACT**：“添加技能”不是直接进入单一路径，而是在按钮下打开三项菜单：“查找技能 / 上传技能 / 创建技能”。[操作选项](../../../reference/九章龙虾（PC-dmg软件）/skill-操作选项.png)
- **FACT**：“查找技能”进入新任务，并预填“帮我找一个技能，这个技能是为了：”；输入区同时出现可移除的 `find-skills` Skill 标签。[查找技能](../../../reference/九章龙虾（PC-dmg软件）/skill-搜索技能.png)
- **FACT**：“创建技能”进入新任务，并预填“帮我创建一个新技能，这个技能是为了：”；输入区同时出现可移除的“技能创建器”标签。[创建技能](../../../reference/九章龙虾（PC-dmg软件）/skill-创建技能.png)
- **FACT**：上传弹窗同时支持拖入文件夹、ZIP 或 Markdown，以及输入 GitHub URL 或 ZIP URL；规则区明确要求文件夹或 ZIP 包含 `SKILL.md`，单个 Markdown 文件包含技能名称和描述的 YAML。[上传技能](../../../reference/九章龙虾（PC-dmg软件）/skill-上传技能.png)
- **FACT**：新任务输入区可以打开 Skill 选择器。选择器包含搜索、官方 Skill 列表和通往技能市场的底部入口；选中后 Skill 以可移除标签留在输入区。[任务选择 Skill](../../../reference/九章龙虾（PC-dmg软件）/新建任务：选择技能.png)
- **ADAPTATION**：Work Buddy 保持统一主 Agent 默认路径，Skill 选择是可选增强，不变成创建普通任务的前置条件；当前上传只做固定数据校验和模拟导入，不声明真实 Skill 运行时或远端仓库已连接。

## 5. MCP / Tools 页面基线

### 5.1 页面骨架与目录卡

- **FACT**：顶部标题“工具广场”，无 Skills 式大型营销 Hero；主区直接进入 Tab、搜索和“+ 自定义”工具行。[工具目录](../evidence/nineclaw-keyframes/tools_0000_catalog.jpg)
- **FACT**：Tab 为“工具广场 / 我的工具”，选中项用蓝色下划线；右侧是搜索与描边按钮。
- **FACT**：工具目录采用双列白色卡片，宽高比约 3.2:1；首屏约显示 2×3。卡片左侧为工具图标，中部为标题与单行说明，底部为 `http` 或 `stdio` 小协议徽标，可继续显示命令摘要；右上是蓝色“+ 安装”。
- **FACT**：“我的工具”沿用双列卡片，增加启用开关或已安装状态。[我的工具](../evidence/nineclaw-keyframes/tools_0042_my-tools.jpg)

### 5.2 自定义/安装弹窗

- **FACT**：自定义工具使用窄而高的居中弹窗，约占整窗宽度 1/5、主区域高度 70%–85%；内部纵向排列大量字段，并提供内部滚动。[自定义表单](../evidence/nineclaw-keyframes/tools_0009_custom-form.jpg)
- **FACT**：弹窗内“表单 / JSON”是蓝色填充的分段控件；JSON 模式使用大面积编辑框。[JSON 模式](../evidence/nineclaw-keyframes/tools_0015_json-mode.jpg)
- **FACT**：表单模式包含名称、描述、传输方式、命令/URL、参数和动态环境变量。传输选项明确出现 stdio、SSE 与 HTTP 流式传输。
- **FACT**：内置工具安装同样使用居中弹窗，预填名称、描述、传输、URL、HTTP Header 等，底部右对齐取消/安装。[内置工具](../evidence/nineclaw-keyframes/tools_0021_builtin-tool-detail.jpg)
- **FACT**：必填或格式错误以字段附近红色内联校验展示，而不是只依赖全局 Toast。[校验错误](../evidence/nineclaw-keyframes/tools_0058_validation-error.jpg)
- **FACT**：环境变量表单用于 GitHub 等工具，密钥字段与普通文本字段有不同呈现。[环境变量](../evidence/nineclaw-keyframes/tools_0030_github-env-form.jpg)
- **UNKNOWN**：加载骨架、连接超时、权限拒绝和工具运行时错误没有在该管理录屏中完整展示。
- **ADAPTATION**：ClassIn 的权限范围、机构审批和审计信息可以加入详情/安装确认，但不能把“运行任务”放进工具卡主操作；工具调用发生在 Agent Run 中。

## 6. 内容页面基线

### 6.1 广场首页

- **FACT**：顶部白色页头同时包含标题与短说明、居中的“广场 / 我的作品”分段控件、右侧描边“+ 发布作品”。这里的主 Tab 是白色轨道内蓝色填充胶囊，不沿用 Skills 的下划线。[广场列表](../evidence/nineclaw-keyframes/content_0000_marketplace-list.jpg)
- **FACT**：首屏有接近全宽的渐变 Hero：小标签“内容广场”、大标题“分享好内容，成就好课堂”、说明文字与右侧大搜索框。
- **FACT**：Hero 下是高密度筛选面板，至少含“品类 / 学段 / 学科”三行。每行左侧有小图标和字段名，右侧展开一组可直接点击的筛选胶囊；选中项以浅蓝底/蓝边表示。
- **FACT**：列表上方显示总量“共 758 个作品”，右侧有“综合 / 最新”分段排序。
- **FACT**：作品采用四列视觉卡片。卡片上半部是大幅 16:9 封面；封面左下叠加品类标签，右上叠加“免费”或积分价格；下半部是标题，底部为头像/作者与收藏或评分。圆角、图片和叠层角标共同构成明显视觉重量。
- **FACT**：指针落在卡片时可见蓝色描边/阴影增强；完整动效参数未知。

### 6.2 我的作品与详情

- **FACT**：“我的作品”首先展示“我的收益概览”大面板，内部是四个并列 KPI 卡；下方才进入“我发布的 / 我解锁的 / 我收藏的”次级 Tab、数量和分类/状态筛选。[我的作品](../evidence/nineclaw-keyframes/content_0151_my-works-dashboard.jpg)
- **FACT**：空状态位于列表中央，以淡色线性图标和短文案表达；非空列表仍保持图片主导的作品卡片。[作品列表](../evidence/nineclaw-keyframes/content_0345-my-works-list.jpg)
- **FACT**：作品详情是独立页面。顶部有返回；主体上部为左侧大预览、右侧购买/获取操作，右栏集中展示价格、收藏、蓝色“下载”和渐变“一键改编为同款”；下方另有大块作品说明与元数据。[作品详情](../evidence/nineclaw-keyframes/content_0021_work-detail.jpg)
- **FACT**：文档预览可在详情流程中进一步打开；下载存在独立确认层。[文档预览](../evidence/nineclaw-keyframes/content_0048_document-preview.jpg)、[下载确认](../evidence/nineclaw-keyframes/content_0078_download-confirmation.jpg)

### 6.3 发布工作台与状态

- **FACT**：发布不是小表单，而是接近主区域全尺寸的大型居中工作台。左侧固定四步：“上传文件 / 完善信息 / 设置定价 / 提交审核”；右侧为当前步骤的可滚动内容；底部固定下一步或提交操作。[发布上传](../evidence/nineclaw-keyframes/content_0192_publish-upload-modal.jpg)
- **FACT**：上传步骤使用大面积虚线拖拽区，随后显示文件上传状态、封面上传区；系统原生文件选择器会覆盖其上。[原生选择器](../evidence/nineclaw-keyframes/content_0195_native-file-picker.jpg)、[上传中](../evidence/nineclaw-keyframes/content_0198_uploading-state.jpg)
- **FACT**：完善信息页是结构化长表单，包含左侧内容字段和右侧分类目录/选择区，并需要内部滚动。[完善信息](../evidence/nineclaw-keyframes/content_0213_publish-info-form.jpg)
- **FACT**：上传错误用页面上方 Toast 显示；封面成功有明确成功状态；提交审核有独立最终步骤。[失败 Toast](../evidence/nineclaw-keyframes/content_0303-upload-failure-toast.jpg)、[封面成功](../evidence/nineclaw-keyframes/content_0318-cover-upload-success.jpg)、[提交审核](../evidence/nineclaw-keyframes/content_0243-submit-review.jpg)
- **UNKNOWN**：广场初始加载骨架、分页到底行为、审核拒绝详情未由现有关键帧证明。
- **ADAPTATION**：ClassIn 可把“积分/收益”替换为机构内适用的权限、可见范围或复用次数，但如果目标是 100% 视觉对标，Hero、筛选矩阵、四列封面卡和四步发布结构必须先保留。

## 7. 我的文件页面基线

### 7.1 可直接证实的原版结构

- **FACT**：全局左栏有“我的文件 N”分组和文件/历史条目；条目含文件夹或文档图标、名称、时间，选中行以浅蓝背景或描边突出。[首页](../../../reference/九章龙虾（PC-dmg软件）/首页，新建任务.png)
- **FACT**：新任务可添加文件夹；定时任务创建可选择工作目录路径。[添加文件夹](../../../reference/九章龙虾（PC-dmg软件）/新建任务：添加文件夹.png)、[定时任务字段](../../../reference/九章龙虾（PC-dmg软件）/定时任务-创建任务、创建任务时填写的信息.png)
- **FACT**：任务执行产生的 Artifact 可在任务工作台右侧预览，例如 [文件结果](../evidence/nineclaw-keyframes/animation_0187_artifact-file-result.jpg) 与 [分栏预览](../evidence/nineclaw-keyframes/animation_0220_preview-split.jpg)。
- **UNKNOWN**：没有发现 NineClaw 独立“我的文件”管理页的无遮挡截图或连续录屏；因此无法证明它使用卡片还是表格、有哪些 Tab、是否有详情抽屉、上传/删除/版本交互如何实现。

### 7.2 ClassIn 适配基线

以下是为了完成当前 WorkBuddy 信息架构的 **ADAPTATION**，不可标成原版复刻：

1. 使用文件浏览器/紧凑表格，不使用与 Skills 相同的营销卡片；
2. 顶部工具行包含位置或面包屑、搜索、上传/引用；主体列表列出名称、来源、关联 Run、版本、更新时间和解析状态；
3. 选中文件后打开可收起的预览/元数据侧栏，保持任务工作台 Artifact 预览的一致性；
4. 视觉上沿用浅蓝背景、白色行、蓝色选中态和 12–16px 圆角；
5. “全部 / 任务产物 / 我的云端 / 机构云端 / 上传”等分类属于 ClassIn PRD，不是 NineClaw FACT；
6. 必须覆盖空目录、上传中、解析中、解析失败、无权限和版本冲突，但这些状态样式需由 ClassIn 设计规范定义。

## 8. 定时任务页面基线

### 8.1 首页、列表与历史

- **FACT**：页头标题为“定时任务”；“任务 / 历史”使用较大的浅色块/胶囊选择态，不是下划线 Tab。[默认空状态](../../../reference/九章龙虾（PC-dmg软件）/定时任务-首页-默认状态.png)
- **FACT**：首次空状态在主区域中央使用醒目的大号蓝色“+ 新建任务”及一行解释。创建后，页头右侧保留较小的描边新建按钮。
- **FACT**：任务以单列全宽白色卡片呈现，内部留白充足：标题与 Prompt/描述在左，分割线后显示时钟图标与计划（例如“每天 · 09:00”）；右上是“已启用”及开关，右下是省略号。[创建完成](../../../reference/九章龙虾（PC-dmg软件）/定时任务创建完成.png)
- **FACT**：省略号打开带阴影的白色浮层菜单，选项含图标与文字：“立即运行 / 编辑 / 删除”。[二次编辑](../../../reference/九章龙虾（PC-dmg软件）/对创建完成的任务进行二次编辑和启动运行.png)
- **FACT**：“历史”使用低装饰表格而非卡片，列包括任务、执行时间、状态；运行中的行显示蓝色状态和旋转指示。[运行中](../../../reference/九章龙虾（PC-dmg软件）/定时任务已正常启动，提示在运行中的状态.png)

### 8.2 创建/编辑弹窗

- **FACT**：创建任务使用接近全高的大型居中弹窗，约占整窗宽度 45%、高度 85%–90%；暗色遮罩，弹窗内部滚动，底部操作栏固定。[创建弹窗](../../../reference/九章龙虾（PC-dmg软件）/定时任务，创建任务.png)
- **FACT**：字段至少包含大号任务标题、较高 Prompt 输入、计划类型、日期/时间或每天+时间、工作目录、可选失效时间、IM 通知渠道。输入控件高度和纵向间距明显大于普通表格行。[字段](../../../reference/九章龙虾（PC-dmg软件）/定时任务-创建任务、创建任务时填写的信息.png)
- **FACT**：通知渠道下拉是带复选框的浮层，并区分可用与未配置渠道。[通知渠道](../../../reference/九章龙虾（PC-dmg软件）/定时任务，创建任务，选择通知渠道.png)
- **FACT**：编辑复用同一大型表单，不跳入另一套详情页。
- **UNKNOWN**：失败、错过执行、暂停原因、重试和历史空状态的完整视觉未被素材覆盖。
- **ADAPTATION**：ClassIn 需要补充时区、班级/课程 Context Snapshot、审批门槛和执行回执入口；这些应嵌入原有大表单与历史表格，而不是把页面改造成通用能力卡。

## 9. 设置页面基线

### 9.1 独立设置壳层

- **FACT**：进入设置后，主区域切换为独立设置壳层；顶部有“← 返回应用”，右上保留用户信息。设置内部左栏约占整窗宽度 14%–15%，包含“通用 / 模型 / 云端备份 / IM 机器人 / 沙箱 / 关于 / 反馈”。
- **FACT**：选中项是大面积浅蓝圆角行，图标和文字同行；右侧内容区为白底，布局随类别变化，而非统一卡片列表。
- **FACT**：多数可编辑页底部有固定取消/保存操作区；长页面本体独立滚动。

### 9.2 各设置页面

| 页面 | 页面骨架与元素形态 | 状态证据 |
|---|---|---|
| 模型 | 三列：设置导航 / Provider 列表 / Provider 配置。Provider 行约 90px 高，含 Logo、名称、开关；选中行浅蓝底或蓝边。右栏含标题和状态胶囊、API Key、Base URL、API 格式单选、测试按钮、模型列表与“添加模型”。[截图](../../../reference/九章龙虾（PC-dmg软件）/设置模型.png) | FACT：未开启、选中、开关；UNKNOWN：测试中与错误详情 |
| 云端备份 | 全宽设置表单：大标题、右侧总开关、分割线、状态键值行、操作按钮与安全说明。[截图](../../../reference/九章龙虾（PC-dmg软件）/设置云端备份.png) | FACT：关闭、禁用操作；UNKNOWN：恢复冲突 |
| IM 机器人 | 三列：导航 / 渠道或 Provider 列表 / 连接详情。中列卡片含图标和开关；右侧有连接状态面板及可展开的手工配置字段。[截图](../../../reference/九章龙虾（PC-dmg软件）/设置接入 IM 机器人.png) | FACT：选中、连接状态、开关；UNKNOWN：鉴权失败 |
| 沙箱 | 主区是多行大号 Radio Card；选中项亮蓝描边，未选项白底，部分选项淡化不可用；下方有检测/安装按钮和状态说明。[截图](../../../reference/九章龙虾（PC-dmg软件）/设置沙箱运行环境.png) | FACT：选中、禁用；UNKNOWN：安装进度 |
| 关于 | 上半部居中 Logo、应用名、版本和更新入口；下半部为用户协议、隐私协议等双行卡片。[截图](../../../reference/九章龙虾（PC-dmg软件）/关于 Classin.png) | FACT：静态信息 |
| 反馈 | 顶部琥珀色提示条；问题类型单选；大面积描述输入；附件虚线按钮与数量；联系方式；底部近全宽蓝色/渐变提交按钮。[截图](../../../reference/九章龙虾（PC-dmg软件）/用户反馈建议.png) | FACT：默认表单；UNKNOWN：提交中、成功、失败 |

### 9.3 ClassIn 适配约束

- **ADAPTATION**：ClassIn 可保留外层 PC Shell，并在 WorkBuddy 设置路由内使用 NineClaw 的内层设置导航；必须避免出现三个以上并列导航层。
- **ADAPTATION**：模型密钥、云备份和沙箱等若一期不可真实使用，应按项目真值规则显示不可用或未来能力状态，不可仅靠可点击外观暗示生产就绪。
- **ADAPTATION**：设置项可按 ClassIn 机构策略重命名或裁剪，但模型、IM、运行环境这三类专用布局不应退化为相同的四张普通卡片。

## 10. 状态覆盖矩阵

| 页面 | 选中/已安装 | Hover | 禁用 | 空 | 加载/进行中 | 错误 | 完成/成功 |
|---|---|---|---|---|---|---|---|
| Skills | FACT | 局部 FACT、动效 UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | 已安装 FACT |
| Tools | FACT | 局部 FACT、动效 UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | 内联校验 FACT | 已安装/启用 FACT |
| 内容 | FACT | FACT | UNKNOWN | FACT | 上传中 FACT | Toast FACT | 上传成功/提交 FACT |
| 我的文件 | 左栏选中 FACT；独立页 UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Artifact 产生中仅任务页 FACT | UNKNOWN | Artifact 预览 FACT |
| 定时任务 | 启用 FACT | 菜单触发 FACT | 开关关闭视觉未完整证明 | FACT | 运行中 FACT | UNKNOWN | 创建完成 FACT |
| 设置 | FACT | UNKNOWN | FACT | 不适用或 UNKNOWN | UNKNOWN | UNKNOWN | 连接/配置状态局部 FACT |

重构时，FACT 状态需视觉复现；UNKNOWN 状态按 ClassIn Design System 补足并保留适配标记。不要从“录屏没展示错误”推断产品没有错误态。

## 11. 当前实现差异与可执行改造

当前对照对象为 `CapabilityWorkspace` 及其共享样式/数据模型。以下差异按视觉影响排序。

### P0：页面原型错误

1. **六页共用同一轻量卡片骨架**
   当前表现：同类 Header、Tab、薄卡、通用详情层贯穿全部页面。
   NineClaw：Skills/Tools、内容、文件、定时任务、设置是不同页面原型。
   改造：保留共享 Token 和基础控件，但拆出 `SkillMarketplaceSurface`、`ToolMarketplaceSurface`、`ContentMarketplaceSurface`、`FileLibrarySurface`、`ScheduleSurface`、`SettingsSurface` 六个深模块。

2. **详情容器错误**
   当前表现：倾向以通用侧栏或通用 Overlay 承载详情。
   NineClaw：Skill/Tool 用居中弹窗；内容用独立详情页；内容发布用大型分步工作台；定时任务用接近全高表单。
   改造：按第 3.3 节映射，不再复用一种详情容器。

3. **内容页面信息量严重不足**
   当前表现：少量通用卡片与简单筛选。
   NineClaw：渐变 Hero、三行筛选矩阵、总量/排序、四列大图卡、KPI、二级作品 Tab、四步发布。
   改造：先完整恢复广场首页与我的作品两套首屏，再实现详情与发布流程。

4. **设置被做成普通偏好卡片**
   当前表现：缺少 Provider 列表、专用配置区与固定底部动作。
   NineClaw：独立设置壳层，按页面采用两列/三列专用布局。
   改造：设置导航、模型、IM、沙箱分别建立专用网格；关于/反馈独立模板。

### P1：视觉密度与层级偏差

5. **主色和背景语气偏差**
   当前表现：绿色主强调、白灰平面为主。
   NineClaw：能力页面高饱和蓝 + 蓝紫 Hero + 低饱和蓝灰背景。
   改造：ClassIn 外层导航可继续使用品牌绿；WorkBuddy 能力内容区按锁定视觉策略使用蓝色能力强调，或建立明确的品牌映射 Token，不能混用绿色 CTA 与蓝色选中态。

6. **Skills Hero 太弱**
   当前表现：高度、字阶、渐变和插画层次均不足。
   NineClaw：Hero 是页面第一视觉中心，约占首屏主区高度 1/4，蓝紫波浪和大标题强识别。
   改造：提高 Hero 高度与大标题字阶，补足波浪/光晕背景并保持搜索、Tab 在其下方同宽对齐。

7. **卡片过薄、样本过少**
   当前表现：图标、标题、短说明组成近似骨架屏的卡片。
   NineClaw：Skills/Tools 至少三层信息；内容卡以封面为主；首屏有 4–6 张以上样本。
   改造：按页面卡片 anatomy 补齐来源、协议、价格、作者、状态、CTA、开关和角标；使用足量固定脱敏 fixture 呈现真实密度。

8. **Hover 过度或方向错误**
   当前若使用明显 `translateY`，与证据不符。
   改造：限定为 1px 左右边界/阴影/底色变化；除非补到视频证据，不实现夸张浮起或缩放。

### P1：关键交互缺失

9. **Skills 缺少上传双入口与管理态 CTA**
   改造：恢复拖拽上传、链接添加、规则提示；“我的技能”提供开关、立即使用、删除三种不同权重操作。

10. **Tools 缺少表单/JSON 双模式和动态字段**
    改造：恢复 transport 选择、命令/URL 分支、Header/环境变量增行、内联校验；工具管理页不直接发起 Run。

11. **定时任务弹窗和历史页过轻**
    改造：创建/编辑使用 45% 窗宽、85%+ 窗高的大表单；历史用表格；空状态与已创建状态采用两套首屏结构。

12. **内容发布没有形成工作台**
    改造：左步骤栏、右滚动表单、固定底部主操作；补上传中、失败 Toast、成功、最终提交状态。

### P2：证据边界与真值表达

13. **“我的文件”不能宣称 100% 原版复刻**
    改造：采用第 7.2 节 ClassIn 文件库适配，并在设计/验收记录中保留 ADAPTATION 标签。

14. **未知状态不应复制通用占位文案**
    改造：根据 ClassIn 状态规范补空、加载、错误、权限与恢复；不在用户主路径反复显示“Demo/模拟”，但仍需在合适的元数据或环境标识中满足项目真值要求。

## 12. 实施顺序与验收口径

### 12.1 推荐顺序

1. 先固定 WorkBuddy 二级导航、页面宽度、背景与能力强调色；
2. 重构 Skills 与 Tools，建立目录卡、详情/安装弹窗的基础部件；
3. 独立完成内容首页、我的作品、详情和发布四个 Surface；
4. 完成定时任务空状态、列表、历史表和大型表单；
5. 完成设置壳层与六种专用设置页；
6. 最后按 ClassIn 适配实现“我的文件”，避免误把推断反向污染 NineClaw 基线。

### 12.2 可视验收清单

- Skills：同视口下能看到强 Hero、下划线 Tab、双列高密度卡；详情为宽居中弹窗，添加为中等宽上传弹窗；
- Tools：无 Hero；双列工具卡能一眼区分协议和安装状态；自定义弹窗可切换表单/JSON并产生内联校验；
- 内容：首屏具备 Hero、三行筛选、总量/排序和四列封面卡；“我的作品”具备 KPI；详情是整页；发布是四步大型工作台；
- 我的文件：明确标为 ClassIn 适配；紧凑表格/浏览器与 Artifact 预览语义一致；
- 定时任务：空状态主按钮显著；创建后是全宽单列卡；历史是表格；创建弹窗接近全高并可内部滚动；
- 设置：有独立内层导航；模型和 IM 为三列，云备份/沙箱为专用全宽结构，关于/反馈不套普通设置卡；
- 所有页面：无横向溢出、无被固定底栏遮挡的字段、弹窗关闭和主操作可达；选择、空、进行中、错误及完成状态按证据矩阵覆盖；
- 视觉对比：在与原素材相同或等比例视口做逐页截图，以页面分区、列宽、信息密度、卡片 anatomy、弹窗尺寸和状态为对齐指标，而不是只比较颜色。

## 13. 未知项与后续取证建议

1. **UNKNOWN**：“我的文件”独立页面的原版信息架构、详情与状态；需要补充该页面录屏或静态截图。
2. **UNKNOWN**：Skills 的空、安装失败、更新、加载；Tools 的连接超时、权限拒绝、运行时错误；需要针对性操作录屏。
3. **UNKNOWN**：内容广场的分页/无限滚动、审核拒绝与重新提交；需要从列表底部和审核失败场景补证据。
4. **UNKNOWN**：定时任务失败、暂停、错过执行、重试、历史空态；需要至少一条失败 Run 的完整录屏。
5. **UNKNOWN**：设置中的测试连接、保存成功、保存失败和安装进度动效；当前静态截图只能证明布局和静态状态。
6. **INFERENCE**：卡片 hover 的蓝边/阴影变化可见，但精确持续时间、缓动和焦点键盘态未被素材证明；实施应以 ClassIn 可访问性规则补足。

在没有新增素材前，上述未知项不阻碍高保真重构已证实主路径，但必须在 PRD、Spec 与验收记录中继续保留证据标签。
