### 8.4 MCP / 工具：按“读—产—写”分层

基础工具集建议分为四类：

1. **ClassIn 业务读取工具**：教师、机构、课程、班级、成员、课次、课堂、作业、提交、资源、消息与权限；
2. **内容生产工具**：文档、课件、表格、图片、音视频、题目和互动活动生成；
3. **业务动作工具**：保存课程对象、发布作业、发送消息、创建待办、更新资源；所有真实写回必须经过策略与审批；
4. **通用连接工具**：文件、云盘、日历、搜索和经机构授权的第三方服务。

工具不应把底层数据库结构暴露给产品逻辑。读取返回带来源和版本的业务对象；写入接收 Proposed Action 与 Approval，并返回 Execution Receipt。

<callout icon="🧪" color="blue_bg">
	**NineClaw MCP 口径（必须区分安装态与运行态）**
	- **安装态｜2026-09-01 SQLite 快照**：工具广场公开展示 6 个 MCP 项；当前本机实际安装并启用 4 个——NineClaw 工具、教研云题库、GitHub、GitLab。Context7 与 Fetch 未安装。
	- **运行态｜2026-08-24 15:10:25 最近一次完整 SDK init**：NineClaw 工具、教研云题库、GitHub 连接成功，GitLab 连接失败；Harness 注入的 `memory`、`session`、`skill` 三个内部 MCP 均 connected。
	- 本轮没有执行实时外部连接探测，因此 `connected`、Tool 暴露数量与调用情况描述的是上述完整 init 及既有调用记录，不是 2026-09-01 的即时网络状态。`enabled=1`、连接成功、暴露 Tool 和实际调用成功必须分别统计。
	- 配置中的 **HTTP 表示 MCP transport**，不代表存在可以任意访问 URL 的通用 HTTP 请求 Tool。工具广场 6 项与 Harness 内部 3 项也不能合并表述为“已安装 9 个 MCP”。
</callout>

融合标记：<span color="green">✅ A｜建议优先或作为底座融合</span>；<span color="yellow">🟡 B｜满足治理条件或重构后融合</span>；<span color="gray">⏸ C｜不进入教师产品主路径</span>。

<details color="gray_bg">
<summary>展开：NineClaw 工具广场 6 项 + Harness 内部 MCP 3 项</summary>
	<table fit-page-width="true" header-row="true">
<tr>
<td>**工具 / MCP**</td>
<td>**类型 / 能力**</td>
<td>**当前安装与运行证据**</td>
<td>**融合判断**</td>
<td>**ClassIn 落位与边界**</td>
</tr>
<tr>
<td>**NineClaw 工具**</td>
<td>工具广场｜内容与外部信息：TTS、AI 生图、图片搜索、联网搜索</td>
<td>2026-09-01 SQLite：已安装、启用，transport 为 HTTP；2026-08-24 init：`nine-tool` connected，暴露 `tts_generate`、`image_generate`、`image_search`、`web_search` 4 个 Tool；已有 3 个 `web_search` 成功结果。HTTP 仅为传输方式，不是任意 HTTP 请求能力</td>
<td><span color="yellow">🟡 B｜拆分后融合</span></td>
<td>拆为 `SearchAdapter`、`ImageGenerationAdapter`、`TTSAdapter` 等小权限 Interface；分别治理来源、引用、版权、内容安全、费用和外部数据发送，不开放任意 HTTP</td>
</tr>
<tr>
<td>**教研云题库**</td>
<td>工具广场｜教研内容：卡片声明试题搜索、试卷生成与题库管理</td>
<td>2026-09-01 SQLite：已安装、启用，transport 为 HTTP；2026-08-24 init：`nine-paper` connected。当前只暴露 `jyy_search_questions`、`jyy_search_question_items` 两个检索 Tool，并有成功调用样本；**组卷与题库管理目前仍是公开卡片声明，未被本机 Tool 列表验证**</td>
<td><span color="green">✅ A｜优先融合</span></td>
<td>落为 `QuestionBankAdapter`。首期只读检索；组卷形成可审阅草稿，题库管理、正式保存与发布拆成独立 Proposed Action，并经过权限和教师审批</td>
</tr>
<tr>
<td>**GitHub**</td>
<td>工具广场｜工程连接器：仓库、Issue、PR、搜索与文件读写；公开材料另声明 Actions / CI 等能力</td>
<td>2026-09-01 SQLite：已安装、启用，stdio；2026-08-24 init：connected，暴露 26 个 Tool，但本机无实际调用记录。当前 Tool 列表未单独验证 Actions / CI，因此不能把全部公开声明写成已运行验证</td>
<td><span color="gray">⏸ C｜教师端不融合</span></td>
<td>仅在内部工程、Skill 开发与能力治理环境按最小权限连接；Token 进入 SecretProvider，写仓库、建 PR 等动作需单独授权、审计与回执，不进入 TeachBuddy 或 IM 默认能力</td>
</tr>
<tr>
<td>**GitLab**</td>
<td>工具广场｜工程连接器：项目、合并请求与 CI/CD</td>
<td>2026-09-01 SQLite：已安装、启用，stdio；2026-08-24 init：`gitlab` **failed**，未暴露 Tool，也无调用记录。应表述为“已安装启用，但最近连接失败”，不能写成当前可用</td>
<td><span color="gray">⏸ C｜教师端不融合</span></td>
<td>不进入教师产品；只参考连接健康度、失败态、诊断与降级设计。若未来用于内部工程环境，仍需最小权限、密钥隔离和写操作审批</td>
</tr>
<tr>
<td>**Context7**</td>
<td>工具广场｜开发者资料：查询最新开发库文档与代码示例</td>
<td>仅能确认工具广场存在该卡片；2026-09-01 SQLite 无安装记录，2026-08-24 init 无对应 Server 或 Tool，当前本机未安装、无运行证据</td>
<td><span color="gray">⏸ C｜不融合</span></td>
<td>属于开发者工具，与教师核心教学任务不匹配；如内部研发需要，应留在开发环境，不进入教师可见能力中心</td>
</tr>
<tr>
<td>**Fetch**</td>
<td>工具广场｜网页资料导入：抓取网页并转换为结构化文本 / Markdown</td>
<td>仅能确认工具广场存在该卡片；2026-09-01 SQLite 无安装记录，2026-08-24 init 无对应 Server 或 Tool，当前本机未安装、无运行证据</td>
<td><span color="yellow">🟡 B｜条件融合</span></td>
<td>重构为受控的 `TeachingSourceImportAdapter`；通过安全代理、域名白名单、内容大小与格式限制、反提示注入、版权和引用治理导入教学资料，不开放通用网页抓取器</td>
</tr>
<tr>
<td>`memory` / `memory`</td>
<td>Harness 内部 MCP｜持久记忆：跨会话 add / replace / remove 长期信息</td>
<td>不属于工具广场或 SQLite 用户安装项；2026-08-24 init：connected。本机样本 5 次完成结果中 4 次为 error，仅能说明该样本失败率高，不能外推为平台 SLA</td>
<td><span color="yellow">🟡 B｜重构后融合</span></td>
<td>落为受治理的 `MemoryStore`，不照搬自由文本长期记忆；只保存有明确类型、来源、用户同意、保留期、权限和撤销能力的信息。学生事实、教师判断与 AI 推断必须分层</td>
</tr>
<tr>
<td>`session` / `session_search`</td>
<td>Harness 内部 MCP｜会话检索：FTS 搜索历史会话，可选生成摘要</td>
<td>不属于工具广场或 SQLite 用户安装项；2026-08-24 init：connected；本机 2 次完成结果均成功。它是会话历史检索，不应被命名为“情景记忆商品”</td>
<td><span color="green">✅ A｜建议融合</span></td>
<td>落为 `TaskHistoryInterface`，检索 Task、Run、Artifact 与 Receipt；按教师、机构、课程和班级权限过滤，摘要必须回链原始记录，不能把摘要改写为业务事实</td>
</tr>
<tr>
<td>`skill` / `skill_manage`</td>
<td>Harness 内部 MCP｜Skill 生命周期：创建、编辑、局部修改、删除 Skill 及其子文件</td>
<td>不属于工具广场或 SQLite 用户安装项；2026-08-24 init：connected；当前无 `skill_manage` 调用记录。它承担能力生命周期管理，不是“程序记忆”</td>
<td><span color="green">✅ A｜仅内部治理</span></td>
<td>落为内部 `CapabilityRegistry` / 管理后台，保留草稿、扫描、eval、审阅、签名、发布、版本和回滚；禁止普通教师直接修改生产 Skill</td>
</tr>
	</table>
</details>

Read、Write、Edit、Glob、Grep、Bash、Task、Cron 等基础 Harness Tool，以及飞书、钉钉、企业微信、QQ、微信等官方连接器声明，不属于上述工具广场 MCP 安装清单，不与 4 个用户 MCP 或 3 个内部 MCP 混合计数。

**值得融合的 MCP 产品机制**

- **能力中心**：保留“工具广场 / 我的工具”的发现、安装、启停和连接健康度，但作为平台或机构管理员能力，不作为普通教师的前置入口；
- **配置体验**：可以参考表单 + JSON、字段内联校验，以及 stdio / SSE / HTTP streaming 的 Adapter seam；其中 HTTP streaming 是 transport。命令、环境变量和请求头不向教师开放，密钥统一进入 SecretProvider；
- **分层状态**：产品和审计界面分别显示“已安装、已启用、连接中、已连接、连接失败、Tool 已暴露、调用成功/失败”，并标记状态发生时间，避免把历史 init 写成实时状态；
- **Run 内追溯**：记录调用目的、来源、Server / Tool、状态、耗时和结果摘要；原始参数和 JSON 只在脱敏的调试或审计模式中展开；
- **结果综合**：Tool 返回稳定业务对象、来源、版本和权限信息，由 Agent 整理成教师可读结论，不能把原始 JSON 直接当作最终产品结果；
- **失败恢复**：补齐超时、断线、无效响应、取消、重试、幂等、部分成功、连接降级和重新授权。

<callout icon="🔐" color="yellow_bg">
	**NineClaw 未覆盖、但 ClassIn 必须补齐的差异化底座**：课程、班级、课次、作业、提交、资源、消息与权限的业务读取；IM 沟通草稿；以及保存课程对象、发布作业、发送消息等正式写回。所有写回统一经过 `ProposedAction → Approval → 领域校验 → ExecutionReceipt`，不能把“MCP 已安装”或“MCP 已连接”当成“可以代表教师执行”。
</callout>

**研究依据**：2026-08-21/22 NineClaw 官方公开清单、本机 NineClaw 1.0.22 安装目录、2026-09-01 SQLite 快照，以及 2026-08-24 15:10:25 最近一次完整 SDK init 日志。
