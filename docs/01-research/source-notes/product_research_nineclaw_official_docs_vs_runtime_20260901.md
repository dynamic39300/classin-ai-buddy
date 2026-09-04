---
title: NineClaw 官方公开目录与本机运行时安装状态对照
status: RESEARCHED
date: 2026-09-01
scope: 两份 2026-08-21/22 官方资料盘点附件；macOS NineClaw 1.0.22（build 1.0.22.155）本机安装实例、SQLite 与最近运行日志
truth_label: 公开目录声明与本机实例观察；不代表 NineClaw 全账号、全灰度或未来版本的全集
---

# NineClaw 官方公开目录与本机运行时安装状态对照

## 1. 结论先行

本次对照纠正一个关键口径：

> 用户上传的两份 Markdown 是基于 NineClaw 官方蓝皮书、产品主页和官方界面整理的**公开能力目录**，不是当前这台 Mac 的安装 Manifest。它们说明“官方公开过或广场可提供什么”；安装目录、SQLite 和运行日志说明“当前本机 1.0.22 实例实际装了什么、启用了什么、最近一次 Run 发现了什么”。

两套材料不是互相否定，而是不同层级：

| 对象 | 官方公开目录口径 | 当前本机 1.0.22 口径 | 正确解释 |
|---|---:|---:|---|
| Skill | 29 个蓝皮书逐项列名 + 3 个官网演示候选 = 最多 32 个名称 | 25 个运行时包；24 个工作区投影并进入最近一次 SDK init；`docx` 已安装但禁用 | 17 个一一映射，1 个部分映射，官方目录另有 14 个名称，本机另有 7 个包 |
| 工具广场 MCP | 6 张卡片 | SQLite 已安装且启用 4 个 | NineClaw 工具、教研云题库、GitHub、GitLab 已装；Context7、Fetch 未装 |
| 最近一次用户 MCP 运行状态 | 公开资料不提供本机状态 | 3 个连接成功、GitLab 失败 | “数据库已启用”不等于“本次连接成功” |
| Harness 内部 MCP | 不属于工具广场目录 | `memory`、`session`、`skill` 共 3 个，最近 init 均 connected | 应与工具广场 MCP 分开计数 |

因此，此前“已经掌握本机当前安装实例的全集”仍然成立，但必须限定为：

> **已完整盘点当前这台 Mac 上 NineClaw 1.0.22 的本机安装与最近运行时状态；没有据此声称掌握 NineClaw 远端技能广场、所有账号和所有灰度版本的全球全集。**

## 2. 材料性质与版本边界

### 2.1 两份上传附件分别证明什么

| 附件 | 文档自身声明的资料范围 | 能证明 | 不能证明 |
|---|---|---|---|
| `/Users/eeo/Downloads/NineClaw_Skills_官方盘点_2026-08-22.md` | 好未来官方发布稿、NineClaw 官方蓝皮书、官方产品主页及官网前端演示 | 截至 2026-08-22 可从公开材料识别的 Skill 名称、分类和用途 | 当前本机是否安装、是否启用、是否被 SDK 发现、是否调用成功 |
| `/Users/eeo/Downloads/NineClaw_官方工具与MCP清单.md` | NineClaw 官方蓝皮书、官方产品页面及好未来产品发布说明 | 工具广场卡片、官方宣称能力、连接器与基础工具的产品分层 | 当前本机账号装了哪几个 MCP、连接健康度、当前暴露的 Tool 全集 |

两份附件都没有声明适配的客户端版本号，并且都主动提示能力会受版本、账号、权限和灰度影响。因此不能把附件日期直接改写为 NineClaw 1.0.22 的安装快照。

### 2.2 当前本机事实的时间边界

- 应用版本：NineClaw `1.0.22`，build `1.0.22.155`；
- 文件与 SQLite 状态复核日期：2026-09-01；
- 最近一条完整 SDK init：2026-08-24 15:10:25（Asia/Shanghai）；
- 运行日志中没有比该时间更新的完整 init，因此“连接状态”和“暴露 Tool”描述的是该次 Run，不是 2026-09-01 的实时网络探测；
- 本次没有主动调用外部 MCP，本文没有记录或复制任何凭据值。

### 2.3 事实标签

- **DOC ASSERTION**：上传附件或当前官方蓝皮书页面的公开声明；
- **LOCAL FACT**：安装包、运行时目录、SQLite 或 `cowork.log` 直接证明；
- **PARTIAL MATCH**：名称或能力相近，但不是同一个可一一识别的本地 Skill 包；
- **NOT VERIFIED**：公开材料提出，但当前本机没有对应包、数据库记录或运行时证据。

## 3. Skill 数量口径对照

### 3.1 官方公开目录的 32 个名称

上传附件的计数是合理的公开资料口径：

- NineClaw 蓝皮书分类数字合计 32；
- 蓝皮书表格逐项列出了 29 个名称；
- 上传附件另从官网演示数据整理出 3 个候选名称；
- 3 个候选不能仅因“29 + 3 = 32”就升级为面向所有用户正式上架的事实。

2026-09-01 复核当前官方蓝皮书页面后，仍可看到“30+ 技能包”、分类数量以及上述 29 个逐项名称。3 个候选名称仍只按上传附件的官网演示观察处理。

### 3.2 当前本机的 25 / 24 口径

| 本机层级 | 数量 | 一手证据 |
|---|---:|---|
| 运行时主目录中含 `SKILL.md` 的包 | 25 | `/Users/eeo/Library/Application Support/NineClaw/SKILLs/*/SKILL.md` |
| 当前工作区有效 Skill 符号链接 | 24 | `/Users/eeo/nineclaw/我的文件/.claude/skills/` |
| 最近 SDK init 发现的工作区 NineClaw Skill | 24 | `/Users/eeo/Library/Application Support/NineClaw/logs/cowork.log` 最近 `Event system init` |
| SQLite 明确禁用 | 1 | `kv.skills_state`：`docx.enabled=false` |
| 随 `.app` 发布的 bundled 包 | 8 | `/Applications/NineClaw.app/Contents/Resources/SKILLs/` |

最近 init 的原始 `skills` 数组还包括 `update-config`、`debug` 等 SDK 系统 Skill。它们不是 NineClaw 技能广场包，本对照不把它们计入 24 个工作区 Skill。

## 4. 官方 29 个逐项 Skill 与本机状态

| # | 官方公开名称 | 当前本机对应包 | 本机状态 | 对照结论 |
|---:|---|---|---|---|
| 1 | 智能教案 | `teacher-lesson-plan-assistant` | 已安装、启用、最近 init 发现 | **一一映射** |
| 2 | 课后练习 | `homework-generator` | 已安装、启用、最近 init 发现 | **一一映射** |
| 3 | 教学计划 | `teaching-plan-generator` | 已安装、启用、最近 init 发现 | **一一映射** |
| 4 | 数学试题诊断 | `paper-diagnosis` | 已安装、启用、最近 init 发现 | **一一映射** |
| 5 | 转逐字稿 | `teaching-transcript-generator` | 已安装、启用、最近 init 发现 | **一一映射**；输入是 PPT/教案，不是音视频 ASR |
| 6 | 教学动画 | `single-page-creator` | 已安装、启用、最近 init 发现 | **一一映射** |
| 7 | Manim 动画视频 | 无 | 无本地包或工作区投影 | **当前本机未安装**；不能用通用 `seedance-video-generator` 代替计数 |
| 8 | 物理动态可视化 | `physics-solver` | 已安装、启用、最近 init 发现 | **一一映射** |
| 9 | 几何解题 | `geometry-solver` | 已安装、启用、最近 init 发现 | **一一映射** |
| 10 | 题目配图 | 无 | 无同名/同职责本地包 | **当前本机未安装**；`vision` 是理解图片，不是题目配图生成 |
| 11 | 飞书（lark-cli） | `lark-cli-agent` | 已安装、启用、最近 init 发现；未见本机调用 | **一一映射** |
| 12 | 钉钉（dws cli） | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 13 | 知音楼（yach-cli） | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 14 | ClawHub 技能市场 | 无 | 无本地包或工作区投影 | **当前本机未安装**；`find-skills` 不是 ClawHub 发布/管理包 |
| 15 | 查找技能 | `find-skills` | 已安装、启用、最近 init 发现 | **一一映射** |
| 16 | 生成可编辑 PPTX | `pptx` | bundled、已安装、启用、最近 init 发现 | **一一映射** |
| 17 | 信息图 | `infographic` | 已安装、启用、最近 init 发现 | **一一映射**；本地 frontmatter 未标 `official: true`，不影响名称映射 |
| 18 | 前端设计 | `frontend-design` | bundled、已安装、启用、最近 init 发现 | **一一映射** |
| 19 | 文案撰写 | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 20 | 文案编辑 | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 21 | 社交内容创作 | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 22 | 头脑风暴 | `brainstorming` | 已安装、启用、最近 init 发现 | **一一映射** |
| 23 | 学生成绩分析 | `grade-analysis` | 已安装、启用、最近 init 发现 | **一一映射** |
| 24 | 高中选科走班排课 | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 25 | 智能抠图 | 无 | 无本地包或工作区投影 | **当前本机未安装**；当前 `oss-image-upload` 只是上传，不是抠图 |
| 26 | 天气查询 | 无 | 无本地包或工作区投影 | **当前本机未安装** |
| 27 | 百度搜索 | `baidu-search` | 已安装、启用、最近 init 发现 | **一一映射** |
| 28 | 技能创建器 | `skill-creator` | 已安装、启用、最近 init 发现 | **一一映射** |
| 29 | 浏览器自动化（Playwright） | 无 | 无本地包；最近 init 也没有 Playwright/Browser Tool | **当前本机未安装/未发现** |

小结：官方蓝皮书逐项列名的 29 个中，当前本机有 **17 个一一映射**，另 **12 个没有对应本地包**。

## 5. 3 个官网演示候选与本机状态

| 官网演示候选 | 当前本机相关包 | 对照结论 |
|---|---|---|
| DOC 讲义整理 | `docx` / Word 文档 | **部分映射**：本地包具备通用 DOCX 创建、编辑、修订、批注和解析能力，但包名、触发说明与职责都不是独立“DOC 讲义整理”；且当前 `docx` 已禁用 |
| 音视频逐字稿 | 无 | **当前本机无独立包**；`teaching-transcript-generator` 是把 PPT/教案改写为课堂讲稿，不能合并计数 |
| 知识点提取 | 无 | **当前本机无独立包**；试题诊断等流程会识别知识点，不等于安装了独立“知识点提取” Skill |

合并官方 29 个和 3 个候选后，最终对照为：

- **17 个一一映射**；
- **1 个部分映射**：`docx` ↔ DOC 讲义整理；
- **官方公开目录另有 14 个名称**，当前本机没有对应包；
- **当前本机另有 7 个包**，不在这 32 个公开名称中。

## 6. 当前本机另有的 7 个 Skill 包

| 本机包 | 展示名 | 当前状态 | 为什么不并入官方 32 名称 |
|---|---|---|---|
| `learning-report-generator` | 学习报告生成 | 已安装、启用、最近 init 发现 | 与“学生成绩分析”相关但职责更宽，生成知识点、错因、建议与家长寄语报告，不应重复归并 |
| `oss-image-upload` | 文件上传 | bundled、已安装、启用、最近 init 发现 | 文件上传底座，不是“智能抠图” |
| `pdf` | PDF 文档 | bundled、已安装、启用、最近 init 发现 | 通用 Artifact 工具，公开 32 名称没有独立 PDF Skill |
| `seedance-video-generator` | 视频生成 | 已安装、启用、最近 init 发现 | 通用生成式视频，不是强调 Manim 引擎与数学推导的“Manim 动画视频” |
| `subject-expert` | 学科专家 | bundled、已安装、启用、最近 init 发现 | 学科知识/教学提示底座，公开 32 名称没有同名独立包 |
| `vision` | 视觉理解 | bundled、已安装、启用、最近 init 发现 | OCR、图像理解与视觉问答，不是“题目配图”或“智能抠图” |
| `xlsx` | 电子表格 | bundled、已安装、启用、最近 init 发现 | 通用 Artifact/数据工具，不能与“学生成绩分析”或“走班排课”重复计数 |

`docx` 不在本表重复列出，因为已作为“DOC 讲义整理”的部分映射；它是第 25 个运行时包，但当前明确禁用。

## 7. MCP 逐项对照

### 7.1 工具广场 6 张卡片 vs 当前本机 4 个安装记录

| 工具广场项 | 附件/蓝皮书声明 | 当前 SQLite | 最近完整 init | 当前暴露或调用证据 | 应修订的口径 |
|---|---|---|---|---|---|
| NineClaw 工具 | TTS、AI 生图、联网搜索 | 已安装、启用；HTTP transport | `nine-tool` connected | 暴露 `tts_generate`、`image_generate`、`image_search`、`web_search`；数据库有 3 条 `web_search` tool-use 记录 | 补充“图片搜索”。附件看到的“HTT…”应解释为 **HTTP 传输方式**，不是已确认的 HTTP 请求 Tool |
| 教研云题库 | 试题搜索、试卷生成、题库管理 | 已安装、启用；HTTP transport | `nine-paper` connected | 只暴露 `jyy_search_questions`、`jyy_search_question_items`；数据库分别有 6、1 条 tool-use 记录 | **本机只验证了检索**；“组卷/题库管理”目前仍是卡片/蓝皮书声明，不能写成当前 Tool 已实现 |
| GitHub | 仓库、Issue、PR、Actions/CI、代码审查、API 查询 | 已安装、启用；stdio | `github` connected | 暴露 26 个仓库、Issue、PR、搜索与文件读写 Tool；本机无调用记录 | “已连接”不等于已验证调用；当前 26 个 Tool 中没有独立 Actions/CI Tool，附件的 Actions/CI 表述未被本机 init 证实 |
| GitLab | 项目、合并请求、CI/CD | 已安装、启用；stdio | `gitlab` **failed** | 未暴露 Tool；无调用记录 | 必须写成“已安装启用，但最近连接失败”，不能写成当前可用 |
| Context7 / API 文档查询 | 最新库文档与代码示例 | 无记录 | 无 Server、无 Tool | 无 | 仅工具广场可选卡片，**当前本机未安装** |
| Fetch / 网页抓取 | HTML/JSON/Markdown 抓取 | 无记录 | 无 Server、无 Tool | 无 | 仅工具广场可选卡片，**当前本机未安装** |

SQLite 中 4 条用户 MCP 均为 `enabled=1`。最近 init 的用户 MCP 结果是：NineClaw 工具、教研云题库、GitHub 连接成功；GitLab 失败。不要把 `enabled=1`、`connected` 和“已实际调用成功”合成一个状态。

附件称工具广场界面中前两项显示“已安装”、后四项显示“安装”，但当前本机 SQLite 显示 GitHub、GitLab 的安装记录创建于 2026-08-20，且均为启用。因此该界面口径不是当前本机配置快照，不能用于覆盖本机数据库。另一个实现差异是：当前官方蓝皮书把 GitHub 描述为通过 `gh CLI` 操作，而本机 MCP 配置与 init Tool 形态对应 `@modelcontextprotocol/server-github`；汇报中应以“GitHub 连接器”描述能力，不把某一种实现路径写死为统一事实。

### 7.2 当前本机另有 3 个 Harness 内部 MCP

| 内部 Server / Tool | 最近 init | 本机调用记录 | 正确归属 |
|---|---|---:|---|
| `memory` / `memory` | connected | 5 条 tool-use | 内部持久记忆 Server，不是工具广场卡片 |
| `session` / `session_search` | connected | 2 条 tool-use | 内部会话检索 Server，不是“情景记忆”商品 |
| `skill` / `skill_manage` | connected | 0 | 内部 Skill 生命周期管理 Server，不是“程序记忆”商品 |

附件把 `memory`、`session_search`、`skill_manage` 放在“三层记忆”一行，容易误导。准确表述应为：它们是三个职责不同的内部 MCP Server；其中只有 `memory` 直接承担持久记忆，`session_search` 是会话历史检索，`skill_manage` 是 Skill 创建、修改和文件管理。

### 7.3 附件中的基础工具清单

附件列出的 Read、Write、Edit、Glob、Grep、Bash、NotebookEdit、Skill、Task、Cron 等工具，最近 init 均能找到对应项，因此作为“代表性基础工具”基本正确，但不是完整清单。最近 init 另外还能看到 AskUserQuestion、TaskCreate/Get/List/Update、Monitor、PushNotification、ScheduleWakeup、Worktree/Plan Mode 等。

这些基础工具不是工具广场 MCP 卡片，也不应与 4 个用户 MCP 或 3 个内部 MCP 混合计数。

### 7.4 即时通讯连接器不属于本次安装清单

附件列出的飞书、钉钉、企业微信、QQ、微信及远程调度能力，是官方蓝皮书的产品能力声明。它们不在 SQLite `mcp_servers` 的 4 条记录中，也不等价于 Skill 包：当前本机仅能确认安装了 `lark-cli-agent` 这一飞书 Skill。其他连接器是否在当前账号配置、连接或可用，不能从本次 Skill/MCP 数据集推出。

## 8. 建议修订两份附件的关键表述

### 8.1 标题和开头应增加的限定

建议把标题或副标题改为：

- `NineClaw 官方公开 Skill 目录盘点（非本机安装 Manifest）`；
- `NineClaw 工具广场与 MCP 官方能力清单（非本机安装状态）`。

### 8.2 可直接替换的 Skill 结论

> 截至 2026 年 8 月，NineClaw 官方蓝皮书公开口径为“30+”技能，分类数字合计 32，其中 29 个名称可在蓝皮书中逐项确认；另有 3 个官网演示候选。该口径表示公开目录，不代表某台设备已全部安装。当前本机 NineClaw 1.0.22 运行时目录有 25 个 Skill 包，其中 24 个已投影到工作区并进入最近一次 SDK init，`docx` 已安装但禁用。公开 32 名称与本机包之间有 17 个一一映射、1 个部分映射；公开目录另有 14 个名称，本机另有 7 个包。

### 8.3 可直接替换的 MCP 结论

> NineClaw 工具广场公开展示 6 个 MCP 项：NineClaw 工具、教研云题库、GitHub、GitLab、Context7 和 Fetch。当前本机 SQLite 实际安装并启用了前 4 个；最近一次完整 init 中，NineClaw 工具、教研云题库和 GitHub 连接成功，GitLab 连接失败，Context7 与 Fetch 未安装。Harness 还注入 `memory`、`session`、`skill` 三个内部 MCP，它们不属于工具广场商品。

### 8.4 必须收紧的能力宣称

1. 将 NineClaw 工具的“HTTP”写成 transport，不写成 HTTP 请求能力；
2. 将教研云题库拆成“卡片宣称组卷/管理”与“本机实际暴露两个检索 Tool”；
3. GitHub 写成“已连接并暴露 26 个 Tool、尚无调用证据”，不概括为所有 Actions/CI 能力已经验证；
4. GitLab 保留 `failed`；
5. Context7、Fetch 写成“广场可选、本机未安装”；
6. 三个内部 MCP 分别写为持久记忆、会话检索和 Skill 生命周期，不统称“三层记忆”；
7. IM 连接器保留为官方产品声明，不并入本机 Skill/MCP 安装全集。

## 9. 证据路径与可复核查询

### 9.1 上传材料和官方公开资料

- `/Users/eeo/Downloads/NineClaw_Skills_官方盘点_2026-08-22.md`；
- `/Users/eeo/Downloads/NineClaw_官方工具与MCP清单.md`；
- [NineClaw 官方蓝皮书：Skills 技能包入门](https://agent.laoshibang.com/nineclaw/bluebook/bluebook/part-01-getting-started/chapter-05-model-selection.html)；
- [NineClaw 官方蓝皮书：Skills 技能包详解](https://agent.laoshibang.com/nineclaw/bluebook/bluebook/part-03-advanced/chapter-14-skills.html)；
- [NineClaw 官方蓝皮书：连接器与 MCP 工具广场](https://agent.laoshibang.com/nineclaw/bluebook/bluebook/part-03-advanced/chapter-15-connectors.html)；
- [好未来官方发布说明](https://www.tal.com/zh-cn/news/detail/3030)。

### 9.2 本机一手事实

- 应用版本：`/Applications/NineClaw.app/Contents/Info.plist`；
- bundled Skill：`/Applications/NineClaw.app/Contents/Resources/SKILLs/`；
- 运行时 Skill 主目录：`/Users/eeo/Library/Application Support/NineClaw/SKILLs/`；
- 当前工作区投影：`/Users/eeo/nineclaw/我的文件/.claude/skills/`；
- Skill 启停状态：`/Users/eeo/Library/Application Support/NineClaw/nineclaw.sqlite` 的 `kv.skills_state`；
- MCP 安装/启用状态：同一 SQLite 的 `mcp_servers`；
- 最近 SDK init、MCP 连接状态与 Tool 列表：`/Users/eeo/Library/Application Support/NineClaw/logs/cowork.log`；
- 既有逐项底稿：`docs/01-research/source-notes/product_research_nineclaw_skills_mcp_fusion_20260901.md`。

安全复核时只查询 MCP 名称、启用状态、transport、配置键名和运行状态，不应直接输出 `config_json` 或日志中的完整 MCP 配置，因为历史日志样本可能包含敏感 header。

## 10. 最终判断

两份附件对“官方公开能力边界”有价值，也帮助发现本机未安装但官方公开过的 14 个 Skill 名称和 2 个 MCP 卡片。它们不应被称为本机安装部署清单。

在限定到当前本机 NineClaw 1.0.22 后，我们已经完成可复核的本机全集盘点：**25 个 Skill 包、24 个当前启用发现；4 个已安装启用的用户 MCP、3 个内部 MCP，并保留最近连接和调用证据的状态差异。**

后续汇报应同时保留“官方公开目录”和“本机安装运行时”两列，避免把“可安装”“已安装”“已启用”“已连接”“已调用”“质量已验证”压成一个模糊的“已实现”。
