---
title: NineClaw Skill、MCP 全量盘点与 ClassIn 融合建议
status: RESEARCHED
date: 2026-09-01
scope: macOS NineClaw 1.0.22（build 1.0.22.155）本地安装实例、运行时数据库、运行日志与既有一手录屏关键帧
truth_label: 本机闭源制品与运行实例观察；不代表 NineClaw 官方公开承诺，也不代表 ClassIn 已实现对应能力
---

# NineClaw Skill、MCP 全量盘点与 ClassIn 融合建议

## 1. 本文回答什么

本文为汇报稿第 8.2 节“Skill 能力”和第 8.4 节“MCP / 工具能力”提供可直接引用的事实底稿，回答三个问题：

1. 当前本机 NineClaw 到底有哪些 Skill、MCP Server 和 MCP Tool；
2. 哪些只是在界面或磁盘中出现，哪些已被运行时发现，哪些有真实调用证据；
3. 哪些能力建议融合进 ClassIn TeacherIn，哪些只能借鉴产品模式，不能照搬实现。

本文严格分开三类结论：

- **FACT**：安装包、运行时目录、SQLite、运行日志或一手录屏直接证明；
- **INFERENCE**：根据源码结构作出的有限推断，不能升级为产品承诺；
- **CLASSIN RECOMMENDATION**：面向 TeacherIn 的建议，不是 NineClaw 事实，也不表示 ClassIn 已实现。

融合标记统一为：

- **A｜建议融合**：与教师核心工作闭环直接相关，建议进入 TeacherIn 能力设计；
- **B｜条件融合**：有价值，但必须更换 Adapter、补权限/数据治理或放到后续阶段；
- **C｜不直接融合**：不进入教师核心产品，只参考其平台形态或保留为受控外部连接器。

## 2. 截止 2026-09-01 的结论摘要

### 2.1 Skill 不是“23 个”的静态结论

**FACT：当前应用版本为 1.0.22（build 1.0.22.155）。** 版本证据来自 `/Applications/NineClaw.app/Contents/Info.plist`。

当前本机存在三种不同口径：

| 口径 | 数量 | 含义 |
|---|---:|---|
| 运行时 Skill 主目录 | 25 | `/Users/eeo/Library/Application Support/NineClaw/SKILLs/` 下含 `SKILL.md` 的包 |
| 当前工作区投影 | 24 | `/Users/eeo/nineclaw/我的文件/.claude/skills/` 中的有效符号链接 |
| 最近一次 SDK init 发现 | 24 | 2026-08-24 运行日志 `skills` / `slash_commands` 的实际发现结果 |
| 本地 frontmatter 标记 `official: true` | 19 | 资产元数据标记；不等同于“随安装包内置” |
| 随应用包发布的 bundled Skill | 8 | `docx`、`frontend-design`、`oss-image-upload`、`pdf`、`pptx`、`subject-expert`、`vision`、`xlsx` |

旧的 2026-08-20 审计记录为 23 个工作区 Skill；之后本机新增了 `baidu-search` 与 `lark-cli-agent`。与此同时，`docx` 在 SQLite `kv.skills_state` 中被明确设为 `enabled=false`，因此它仍存在于应用资源目录和运行时主目录，但不再投影到当前工作区，也没有进入最近一次 SDK init 的 24 个可发现 Skill。**“磁盘有包”“元数据称官方”“当前启用”“本次运行发现”是四种不同状态。**

### 2.2 MCP 也有三层口径

| 层级 | 数量 | 当前事实 |
|---|---:|---|
| 工具广场可见卡片 | 6 | NineClaw工具、教研云题库、GitHub、GitLab、Context7、Fetch |
| 当前 SQLite 已安装且启用的用户 MCP | 4 | NineClaw工具、教研云题库、GitHub、GitLab |
| Harness 内部 MCP | 3 | `memory`、`session`、`skill`，不属于工具广场商品 |

最近一次完整运行日志显示：NineClaw工具、教研云题库、GitHub 和三个内部 MCP 已连接；GitLab 为 `failed`。Context7 与 Fetch 仅有工具广场卡片证据，本机数据库没有安装记录，也没有运行时调用证据。

### 2.3 建议优先融合的能力簇

**CLASSIN RECOMMENDATION：** 不建议按 NineClaw 的卡片和目录名逐项平移，建议按教师任务闭环融合为五组：

1. **课程生产**：智能教案、教学计划、课后练习、转逐字稿、PPTX / DOCX / PDF / XLSX Artifact 工具链；
2. **诊断评价**：数学试题诊断、学生成绩分析、学习报告生成；
3. **学科与多模态理解**：学科专家、视觉理解，以及受控的几何/物理可视化；
4. **ClassIn 业务工具**：题库检索优先，后续再扩展课程、作业、课堂、消息等领域 Adapter；
5. **Harness 元能力**：会话检索、Skill 生命周期、Run 级能力快照、工具调用状态与回执。

NineClaw 的外部搜索、飞书、GitHub/GitLab、任意 OSS 上传和 Agent 自修改 Skill 不应直接成为教师默认能力；它们只能经过 ClassIn 的权限、数据分级、审批、审计与 Adapter 边界后条件接入。

## 3. 证据与验证等级

### 3.1 一手证据

- 应用身份与版本：`/Applications/NineClaw.app/Contents/Info.plist`；
- bundled Skill：`/Applications/NineClaw.app/Contents/Resources/SKILLs/`；
- 运行时 Skill 主目录：`/Users/eeo/Library/Application Support/NineClaw/SKILLs/`；
- 当前工作区投影：`/Users/eeo/nineclaw/我的文件/.claude/skills/`；
- 状态与配置：`/Users/eeo/Library/Application Support/NineClaw/nineclaw.sqlite`；
- SDK init、MCP 连接与工具列表：`/Users/eeo/Library/Application Support/NineClaw/logs/cowork.log`；
- Harness 实现：`/Applications/NineClaw.app/Contents/Resources/app.asar` 中的 `dist/index.mjs`；
- Skill / Tool 产品界面：`docs/01-research/evidence/nineclaw-keyframes/skills_*.jpg`、`tools_*.jpg`、`mcp_*.jpg`；
- 代表性任务闭环：`docs/01-research/evidence/nineclaw-keyframes/homework_*.jpg`、`lesson_*.jpg`。

### 3.2 验证等级

| 等级 | 定义 |
|---|---|
| V3｜动态验证 | 运行日志、数据库工具调用结果或连续录屏证明已被发现并实际调用 |
| V2｜运行时发现 | 当前工作区投影与 SDK init 均能发现，但本轮没有该能力的完成调用 |
| V1｜静态实现 | 包、脚本、references、assets 或源码存在，未做真实服务/产物验收 |
| V0｜仅 UI 广场 | 只在工具广场或 Skill 广场看到卡片，不能证明当前本机已安装或可运行 |

本文没有读取或复制任何 Token 值，没有网络抓包，也没有为了研究主动调用外部服务。动态结论来自本机已有运行记录，因此只能证明该样本，不代表平台 SLA。

## 4. 当前 Skill 全量清单（25 个运行时包）

> 状态说明：“当前启用”指已投影到工作区且进入最近一次 SDK init；“官方”仅指本地 `SKILL.md` 的 `official: true`；“bundled”指随应用包发布。二者不能互换。

| # | Skill（ID / 展示名 / 版本） | 当前事实与能力摘要 | 验证 | 主要风险 | ClassIn 融合 |
|---:|---|---|---|---|---|
| 1 | `baidu-search` / 百度搜索 / 1.1.3 | 当前启用；未标官方；1 个 Python 脚本。通过百度 AI Search 搜索实时网页，frontmatter 明确依赖 `BAIDU_API_KEY`。本机已有 1 个会话选择它。 | V2 | 查询与上下文外发、搜索结果不可信、引用与版权、密钥治理 | **B**：需要“受控检索 Adapter + 来源白名单 + 引用”，不直接把第三方搜索 Skill 暴露给教师 |
| 2 | `brainstorming` / 头脑风暴 / 1.0.1 | 当前启用；未标官方；纯指令 Skill。要求创作/功能工作先澄清目标、方案和设计。 | V2 | 触发条件过宽，可能给简单任务增加阻力；无自动验证 | **B**：吸收“先澄清再执行”的方法，不作为教师可选 Skill 卡 |
| 3 | `docx` / Word 文档 / 1.0.1 | bundled、官方，但当前明确禁用；9 个 scripts、package 与 eval。支持 DOCX 创建、编辑、修订、批注、格式、文本和公式。 | V1（当前禁用） | 本地文件读写、外部依赖、专有许可；“包存在”不等于当前可调用 | **A（底座）**：以受治理的 `DocumentArtifactAdapter` 融合；必须在汇报中保留 disabled 语义 |
| 4 | `find-skills` / find-skills / 1.0.2 | 当前启用；未标官方；纯指令，依赖外部 `npx skills` 搜索、安装和更新 Skill。本机已有 1 个会话选择它。 | V2 | 第三方代码供应链、来源与版本不可控、可修改工作区 | **C**：只参考“查找/安装”产品闭环；ClassIn 应使用审核后的机构能力目录 |
| 5 | `frontend-design` / 网页设计 / 1.0.1 | bundled、官方、当前启用；纯设计指令，生成 Web 页面/组件/应用。 | V2 | “生产级”属于目标描述，不是质量证据；可生成任意脚本 | **B**：可服务互动 H5 / 教学网页，但需预览沙箱、内容安全与发布审批 |
| 6 | `geometry-solver` / 几何解题 / 0.4.5 | 官方、当前启用；1 个 SSE 客户端脚本，把几何题转为交互式分步 HTML。 | V2 / 静态网关 | 题目外发；动态 HTML 安全；数学正确性、服务可用性未验收 | **B**：教学价值高，先作为受控数学可视化能力，需正确性 eval 与 HTML 沙箱 |
| 7 | `grade-analysis` / 学生成绩分析 / 0.0.3 | 官方、当前启用；Python 分析器 + HTML 模板。支持平均分、分数段、及格/优秀率、学生追踪和学科对比。 | V2 / 静态引擎 | 学生姓名与成绩属敏感业务数据；统计口径和多考试语义需复核 | **A**：应融合，但直接读取 ClassIn 事实 Adapter，不通过任意文件外发 |
| 8 | `homework-generator` / 课后练习 / 0.1.2 | 官方、当前启用；5 个 reference、1 个模板与 autoresearch 结果。根据学段、知识点、题型、数量和难度生成练习/试卷。已有 2 个单 Skill 会话与 1 个 `homework-generator + pptx` 组合会话。 | V3（选择与录屏任务链）；质量仍未验 | 题目正确率、难度与课程标准对齐；自报 eval 不能替代独立评测 | **A**：核心融合；与题库 MCP、课程 Context、作业 Artifact 和教师确认联动 |
| 9 | `infographic` / 信息图 / 0.0.2 | 当前启用；本地未标官方，UI 卡片显示官方；含 45 个布局/风格 reference，支持 21×21 组合。 | V2 | 本地元数据与 UI 来源标签不一致；依赖图像生成工具，内容与版权风险 | **B**：作为课程内容表现能力，不进入首批业务写回闭环 |
| 10 | `lark-cli-agent` / 飞书 / 0.0.2 | 当前启用；未标官方；纯 CLI 操作说明，覆盖飞书文档、云盘、表格、多维表格、IM、日历、Wiki、联系人、邮件、任务、会议、审批和 OKR。 | V2；无本机调用证据 | 外部账号授权面极宽，可代表用户发送消息和修改云资源；与 ClassIn 域重叠 | **C**：不融合飞书本身；仅参考“一套连接器覆盖多资源”的 Adapter/权限设计 |
| 11 | `learning-report-generator` / 学习报告生成 / 0.1.0 | 当前启用；未标官方；Python 报告器、HTML 模板、eval。把作业/考试/试卷诊断组织成概览、知识点、错因、建议和家长寄语。 | V2 / 静态引擎 | 学生画像推断、家长沟通措辞、上游数据外发、HTML 注入 | **A**：核心融合；必须区分学生事实、教师推断和 AI 建议，并由教师审阅 |
| 12 | `oss-image-upload` / 文件上传 / 0.0.4 | bundled、官方、当前启用；Node 客户端、package、eval。可把任意本地路径或 base64 文件上传至 OSS 并返回 CDN URL。 | V2 | 任意本地文件外发、访问范围/过期/删除不明确、凭据与日志风险 | **C（实现）/A（需求）**：需要文件能力，但应替换为 ClassIn 受治理对象存储，不复用任意 OSS 上传模型 |
| 13 | `paper-diagnosis` / 数学试题诊断 / 0.1.8 | 官方、当前启用；上传、SSE 诊断、报告器、HTML、eval 组合。批改试卷/作业、识别知识点并生成薄弱项报告。 | V2；录屏证明同类产品入口 | 学生试卷先上传再传外部服务；诊断准确率、答案解析和人工复核 | **A**：核心融合；需要识别/批改/诊断分层、置信度和教师确认 |
| 14 | `pdf` / PDF 文档 / 1.0.1 | bundled、官方、当前启用；8 个脚本。支持提取文本/表格、创建、合并、拆分与表单。 | V2 / 静态工具链 | 文件兼容、恶意 PDF、外部二进制与资源消耗 | **A（底座）**：作为 Artifact 解析与导出 Adapter，不作为教师必须选择的能力 |
| 15 | `physics-solver` / 物理动态可视化 / 0.1.2 | 官方、当前启用；完整专家提示 reference，目标输出单文件互动 HTML。 | V2；无确定性执行器证明 | 物理正确性、动态代码安全、浏览器性能 | **B**：在可视化教学场景试点，需学科 eval 和沙箱 |
| 16 | `pptx` / ppt演示文稿 / 1.0.1 | bundled、官方、当前启用；5 个脚本、package 与较完整 PPTX/HTML 转换、验证工具链。 | V2；任务录屏有 PPTX Artifact，但不能唯一归因 | 版式/字体兼容、外部依赖、复杂文件执行风险 | **A（底座）**：课程生产核心 Artifact Adapter；教师主路径不暴露底层 Skill 名 |
| 17 | `seedance-video-generator` / 视频生成 / 0.0.5 | 官方、当前启用；4 个脚本、3 个 reference、package。支持素材上传、提示优化、异步生成、轮询、下载与合并。本机有 1 个会话选择。 | V2 | 素材外发、Token、费用、生成内容版权与安全、长任务恢复 | **B**：后续内容生产能力，必须有费用提示、异步回执、取消与审核 |
| 18 | `single-page-creator` / 教学动画 / 0.3.5 | 官方、当前启用；1 个 SSE 客户端，将教学主题转成单文件互动 H5。本机有 1 个会话选择。 | V3（选择与产品录屏）；服务质量未验 | 原始动态 HTML、题目外发、跨学科正确性 | **B**：高价值但高风险；纳入沙箱 Artifact，不直接写回正式课程 |
| 19 | `skill-creator` / 技能创建器 / 1.0.3 | 官方、当前启用；10 个脚本、reference、asset，覆盖创建、修改、eval、benchmark、描述优化与打包。本机有 1 个会话选择，录屏证明创建/安装产品链。 | V3（产品链）/ V1（自身评测质量） | 可生成可执行代码并持久化提示；供应链、权限提升和自修改风险 | **A（治理能力）/C（直接自写）**：融合草稿、评测、审批、签名、发布生命周期；禁止 Agent 未经审核直接成为机构能力 |
| 20 | `subject-expert` / 学科专家 / 未声明版本 | bundled、官方、当前启用；8 个学科 reference，覆盖主要 K12 学科。 | V2 | 触发过宽、无版本、知识来源与正确率不透明 | **A**：转化为版本化 Domain Knowledge 与学科评测，不照搬单一长提示词 |
| 21 | `teacher-lesson-plan-assistant` / 智能教案 / 0.0.4 | 官方、当前启用；5 个 reference、1 个模板，设计 12 模块教案并组合 DOCX。本机有 2 个会话选择。 | V3（选择与录屏链）；导出稳定性未验 | 教材版本、课程标准、旧绝对路径、当前 `docx` 被禁用造成组合依赖不一致 | **A**：核心融合；需显式输入槽、课程 Context、Artifact 契约和依赖校验 |
| 22 | `teaching-plan-generator` / 教学计划 / 0.0.4 | 官方、当前启用；1 个 reference、2 个 assets，生成学期/单元/专题教学计划。 | V2 | 主要是提示与模板；无确定性导出和质量评测 | **A**：作为课程规划 Skill，连接课时、课程与正式发布对象 |
| 23 | `teaching-transcript-generator` / 转逐字稿 / 0.0.5 | 官方、当前启用；5 个大型 reference，把 PPT/教案转成受教学模式、年级、学科和时长约束的课堂逐字稿。 | V2 | 文档解析与长文本稳定性；不能把 PPT/教案输入混同于音视频转写 | **A**：融合为“课堂讲稿生成”；音视频转写应另建能力，不混名 |
| 24 | `vision` / 视觉理解 / 0.0.3 | bundled、官方、当前启用；1 个 API 客户端脚本，支持 OCR、图表/截图理解和视觉问答；本地图像会先组合上传能力。 | V2 | 学生图像与文档外发、OCR 错误、上传链路继承 OSS 风险 | **A（能力）/C（现实现）**：需要多模态理解，但必须用 ClassIn 数据分级与受控视觉 Adapter |
| 25 | `xlsx` / 电子表格 / 1.0.1 | bundled、官方、当前启用；说明覆盖公式、格式、分析、可视化和重算；当前包无独立 scripts 目录。 | V2 / 以说明为主 | 表格公式与格式兼容、学生数据、描述能力深于当前包结构证据 | **A（底座）**：用于成绩/运营导入导出，但以结构化业务数据优先，文件仅作入口与 Artifact |

### 4.1 19 个本地“官方”与 6 个未标官方

**FACT：** 本地 `official: true` 共 19 个：`docx`、`frontend-design`、`geometry-solver`、`grade-analysis`、`homework-generator`、`oss-image-upload`、`paper-diagnosis`、`pdf`、`physics-solver`、`pptx`、`seedance-video-generator`、`single-page-creator`、`skill-creator`、`subject-expert`、`teacher-lesson-plan-assistant`、`teaching-plan-generator`、`teaching-transcript-generator`、`vision`、`xlsx`。

未标 `official: true` 的 6 个是：`baidu-search`、`brainstorming`、`find-skills`、`infographic`、`lark-cli-agent`、`learning-report-generator`。其中 UI 把信息图和学习报告等呈现为官方或产品能力的证据，不应反向篡改本地 manifest 事实；它说明远端广场元数据与本地包 frontmatter 是不同来源。

### 4.2 资产与发布一致性问题

**FACT：** bundled 与 runtime 的 `skills.config.json` 仍列出不存在的 `math-courseware`，并把 `skills.config.json` 自己列为 Skill ID。Loader 以“子目录中存在 `SKILL.md`”为发现条件，因此这两个错误项没有进入 SDK，但说明发布清单与物理资产缺少一致性校验。

**INFERENCE：** `teacher-lesson-plan-assistant` 期望组合 DOCX 产物，而当前 `docx` 被禁用，组合任务可能退化到其他写文件方式或在特定路径失败。现有证据不能证明所有组合依赖都会被运行前检查。

**CLASSIN RECOMMENDATION：** TeacherIn 的 `CapabilityManifest` 应显式声明依赖、版本、权限、输入/输出 Artifact、数据等级与完整性；Run 启动前解析为不可变快照，依赖缺失应阻止执行或给出可恢复方案。

## 5. 工具广场 6 张 MCP 卡片

| 工具广场卡片 | UI 声明能力 | 当前安装/运行事实 | 已观察 MCP Tools | 风险 | ClassIn 融合 |
|---|---|---|---|---|---|
| NineClaw工具 | TTS 文字转语音、AI 生图、联网搜索、图片搜索；HTTP 流式传输 | SQLite 已安装且启用；最近运行 `nine-tool` connected | `tts_generate`、`image_generate`、`image_search`、`web_search`；本机记录有 3 个 `web_search` 成功结果 | 外部内容/提示外发、版权、生成安全、费用与服务依赖 | **B**：拆成 Search / Image / TTS 三个受治理 Interface；只把教师需要的能力呈现为任务动作 |
| 教研云题库 | 试题搜索、试卷生成、题库管理；HTTP 流式传输 | 已安装且启用；最近运行 `nine-paper` connected；连续录屏证明 Agent 并行检索题目并二次追问 | `jyy_search_questions`、`jyy_search_question_items`；本机至少 3 次 question search 与 1 次 item search 有成功结果 | 返回原始 JSON 噪声、题库授权、答案正确性、条件缺失、潜在写操作边界 | **A**：优先融合；以 ClassIn 题库 Adapter 暴露只读检索，生成/组卷/发布分别建动作和审批 |
| GitHub | 仓库、Issues、PR、Actions 管理；stdio | 已安装且启用；最近运行 connected，暴露 26 个工具；本机无调用记录 | 完整工具见 5.1 | 写仓库、建/合并 PR、创建 Issue 等均可代表用户执行；PAT 权限与供应链 | **C（教师产品）**：不进入教师默认能力；仅工程/Skill 开发环境按最小权限连接 |
| GitLab | 项目、合并请求、流水线；stdio | 已安装且启用，但最近运行 `failed`，没有暴露工具 | 无当前可用工具证据 | 连接失败、凭据/URL 配置、广泛代码库写权限 | **C**：不进入教师产品；连接器框架可参考，必须显示真实连接健康度 |
| Context7 | 为 AI 编程提供最新库文档和代码示例；stdio | 仅工具广场卡片；SQLite 无安装记录，运行日志无 server/tool | 无 | 与教学主业务弱相关；外部文档可信度与网络访问 | **C**：教师核心不融合；工程开发环境可独立使用 |
| Fetch | 网页内容抓取与 HTML 转 Markdown；stdio | 仅工具广场卡片；SQLite 无安装记录，运行日志无 server/tool | 无 | SSRF、恶意网页、版权、提示注入、无界抓取 | **B**：研究/备课可用，但必须通过安全抓取代理、域名策略与引用系统 |

### 5.1 GitHub 当前暴露的 26 个工具

**FACT：** 最近一次 connected init 暴露以下工具；这是运行时工具列表，不代表本机已实际调用：

`add_issue_comment`、`create_branch`、`create_issue`、`create_or_update_file`、`create_pull_request`、`create_pull_request_review`、`create_repository`、`fork_repository`、`get_file_contents`、`get_issue`、`get_pull_request`、`get_pull_request_comments`、`get_pull_request_files`、`get_pull_request_reviews`、`get_pull_request_status`、`list_commits`、`list_issues`、`list_pull_requests`、`merge_pull_request`、`push_files`、`search_code`、`search_issues`、`search_repositories`、`search_users`、`update_issue`、`update_pull_request_branch`。

这组能力同时包含只读查询和高影响写操作。**CLASSIN RECOMMENDATION：** MCP Server 连接成功不能直接等于工具授权；TeacherIn 应在 Tool 层继续声明 `read/write`、作用对象、数据等级、副作用与审批策略。

### 5.2 NineClaw 的 MCP 管理面能力

**FACT（UI + SQLite schema + Harness）：**

- 工具广场与“我的工具”分开；
- 用户可以安装、启停、编辑和删除 MCP Server；
- 自定义支持 `stdio` 与 HTTP 流式传输；
- 表单模式支持 command、args、env、URL、headers，另有 JSON 模式；
- SQLite `mcp_servers` 保存 `name`、`description`、`enabled`、`transport_type` 与 `config_json`；
- Harness 在每次 Run 开始时把已启用服务器合并进 SDK MCP 配置，并把连接状态和工具列表写入 init 事件。

**风险：** 当前产品能保存环境变量和 HTTP headers；日志样本曾包含完整 MCP 配置，因此“密钥不出现在 UI”不等于“密钥不会进入日志”。本文未复制任何凭据值。

**CLASSIN RECOMMENDATION：** ClassIn 不应允许普通教师直接填写任意 command、env 或 headers。机构管理员可管理连接；教师只获得经策略裁剪的 Tool 能力。密钥进入 Secret Store，运行日志只留引用 ID 和脱敏字段。

## 6. Harness 内部 3 个 MCP Server

这些 MCP 不在工具广场卡片中，但每次本地 Run 都由 Harness 注入。它们是理解 NineClaw “记忆—会话—技能沉淀”闭环的关键。

| 内部 Server / Tool | 源码事实 | 动态证据 | 风险 | ClassIn 融合 |
|---|---|---|---|---|
| `memory` / `memory` | 持久化跨会话信息；支持 `add`、`replace`、`remove`，目标为 `user` 或 `memory` | 最近 init connected；本机样本 5 个完成结果中 4 个为 error。只能说明该样本失败率高，不能外推平台 SLA | 个人偏好、环境信息与学生/教师事实边界模糊；错误恢复不足 | **B**：不照搬自由文本长期记忆。只保存明确类型、来源、同意、保留期和可撤销的受治理记忆 |
| `session` / `session_search` | FTS5 搜索历史会话，可选 LLM 摘要；省略 query 可零模型成本浏览最近会话 | 最近 init connected；本机 2 个完成结果均成功 | 跨会话权限、摘要可能遗漏/误写、历史数据保留 | **A**：融合为 Task / Run 历史检索，按教师、机构、课程权限过滤并引用原始回执 |
| `skill` / `skill_manage` | 支持 `create`、`edit`、`patch`、`delete`、`write_file`、`remove_file`；有名称约束、frontmatter 校验、静态威胁扫描与大小限制 | 最近 init connected；本机未观察到该 MCP tool 调用；Skill 创建器 UI/会话链另有证据 | Agent 持久化自身指令与脚本，形成供应链和权限提升通道；静态正则扫描不足 | **A（生命周期）/C（直接写）**：保留草稿、eval、审批、签名、发布；禁止未审阅写入生产 Skill |

## 7. Skill 与 MCP 在 NineClaw 中如何协同

**FACT：** 一次 Run 的典型链路是：

```text
教师自然语言目标
  → 会话选择或自然语言触发 Skill
  → Skill 读取 instructions / references / assets
  → Agent 调用基础工具或 MCP Tool
  → 产生 HTML / DOCX / PPTX / 报告等 Artifact
  → 在同一任务流显示工具参数、状态、结果与后续对话
```

一手录屏已经证明两种代表性组合：

1. `homework-generator` 被读取后，Agent 调用文件与命令工具生成作业 HTML，并在任务内预览；
2. 教研云题库 MCP 根据自然语言条件查询，条件不足时继续拆分查询，展示 raw result，最终由 Agent 综合为可读题目。

**INFERENCE：** NineClaw 的优势不在单个 Skill 或单个 MCP 数量，而在“统一任务入口 + 可见调用轨迹 + Artifact + 连续修订”的组合。单独复制 Skill 市场而不建立 Run、Context、Artifact、ProposedAction、Approval 与 Receipt，无法复刻闭环价值。

## 8. 面向 ClassIn 的融合清单

### 8.1 建议融合（A）

| 能力簇 | NineClaw 对应项 | ClassIn 建议形态 |
|---|---|---|
| 教案与教学规划 | 智能教案、教学计划、学科专家 | `TeachingPlanSkill` + 版本化 Domain Knowledge + Course Context |
| 练习与题库 | 课后练习、教研云题库 MCP | 只读题库检索 → 题目草稿 → 教师确认 → 作业/测验 ProposedAction |
| 诊断与报告 | 试题诊断、成绩分析、学习报告 | 事实、诊断推断、建议三层分离；保留置信度、来源与教师修订 |
| 课堂讲稿 | 转逐字稿 | 从已选课件/教案生成课堂讲稿 Artifact；音视频转写另建能力 |
| 文档 Artifact | DOCX、PPTX、PDF、XLSX | 深藏于 Artifact Adapter；统一预览、版本、导出、第三方编辑器衔接 |
| 多模态理解 | vision | 受控 OCR / 图表 / 试卷理解 Interface；数据分级和脱敏 |
| 历史检索 | session_search | 搜索可访问的 Task / Run / Receipt，回答必须回链原记录 |
| Skill 生命周期 | skill-creator、skill_manage 的治理部分 | 个人草稿 → 静态扫描 → eval → 审阅 → 签名 → 机构发布 |

### 8.2 条件融合（B）

- 百度/网页搜索、Fetch：只能通过安全代理、来源策略和引用；
- 信息图、生图、TTS、视频生成：需要费用、版权、内容安全与异步回执；
- 几何/物理/教学动画：需要学科正确性 eval 和 HTML 沙箱；
- 头脑风暴：吸收目标澄清方法，不增加教师心智负担；
- 长期记忆：只保留受治理、可见、可撤销的结构化记忆；
- MCP 自定义：只开放给平台/机构管理员，教师不直接配置命令、环境变量与请求头。

### 8.3 不直接融合（C）

- 飞书 Skill：能力对象与 ClassIn 重叠，保留连接器思路，不把外部平台操作引入教师主路径；
- GitHub / GitLab / Context7：属于开发和能力生产环境，不是教师核心任务；
- 任意 OSS 上传：需求要保留，实现必须替换为 ClassIn 受治理文件服务；
- `npx skills` 任意安装：替换为签名、来源可信、可审阅的机构能力目录；
- Agent 直接修改生产 Skill：只能生成草稿，不能绕过审批发布。

## 9. 需要在汇报中保留的边界

1. “25 个包”不等于“25 个都可用”：当前只有 24 个进入工作区和 SDK；`docx` 是明确 disabled。
2. “官方”不等于 bundled、已启用、已执行或已验证；它只是本地 manifest / UI 的来源标签。
3. “工具广场有 6 张卡”不等于 6 个已安装：本机只安装 4 个；Context7、Fetch 为 V0。
4. “MCP 连接成功”不等于每个 Tool 已授权或稳定：GitHub 暴露大量写操作，GitLab 最近失败。
5. “有脚本”不等于生产就绪：大部分外部服务、文件兼容、教育正确性和数据治理没有在本研究中做全量验收。
6. NineClaw 的动态 HTML、任意文件上传、外部 CLI 和自修改 Skill 模式不能直接用于真实学生数据。
7. ClassIn 当前 Demo 仍是确定性模拟或集成模拟；本文的建议不能改写为“ClassIn 已接入真实 Skill/MCP”。

## 10. 证据索引与可复核查询

### 10.1 Skill

- 全量入口：`/Users/eeo/Library/Application Support/NineClaw/SKILLs/*/SKILL.md`；
- 当前启用投影：`/Users/eeo/nineclaw/我的文件/.claude/skills/`；
- bundled 源：`/Applications/NineClaw.app/Contents/Resources/SKILLs/`；
- 启停状态：SQLite `kv` 表的 `skills_state`；
- 会话级选择：SQLite `cowork_sessions.active_skill_ids`；
- SDK 实际发现：`cowork.log` 最近一次 `Event system init` 的 `skills` 与 `slash_commands`；
- 市场与管理 UI：`skills_0000_marketplace.jpg`、`skills_0177_official-recommended.jpg`、`skills_0825_installed-cards.jpg`、`skills_0858_my-skills-management.jpg`。

### 10.2 MCP / Tools

- 安装与启用状态：SQLite `mcp_servers`；
- Harness 配置与内部 Server：`app.asar/dist/index.mjs` 中 `configureUserMcpServers`、`createMemoryMcpServer`、`createSessionMcpServer`、`createSkillMcpServer`；
- 连接状态与 tool list：`cowork.log` 最近一次 `Event system init`；
- 实际工具调用：SQLite `cowork_messages.metadata.toolName` 与配对 `tool_result.metadata.isError`；
- 工具广场：`tools_0000_catalog.jpg`；
- 内置/自定义表单：`tools_0021_builtin-tool-detail.jpg`、`tools_0030_github-env-form.jpg`、`tools_0045_http-mcp-form.jpg`、`tools_0051_stdio-form.jpg`；
- 我的工具：`tools_0042_my-tools.jpg`、`tools_0058_validation-error.jpg`；
- 题库调用连续证据：`mcp_0000_task-and-first-call.jpg`、`mcp_0024_tool-call.jpg`、`mcp_0074_raw-json-response.jpg`、`mcp_0173_followup-tool-call.jpg`、`mcp_0222_final-synthesis.jpg`。

## 11. 最终判断

NineClaw 当前最值得 ClassIn 融合的是：**教育业务 Skill 的结构化输入与 Artifact 产出、题库等 MCP 的真实工具调用、会话级 Skill 选择、运行时调用轨迹，以及 Skill 从创建到管理的资产闭环。**

最不应照搬的是：**把任意脚本、任意外部连接、长期记忆、业务写回和 Agent 自修改能力放在同一个宽松权限边界内。** TeacherIn 应继续坚持统一主 Agent 入口，并把 Skill、MCP 和 Tool 下沉为有版本、有权限、有数据等级、有审批、有执行回执的内部能力层。
