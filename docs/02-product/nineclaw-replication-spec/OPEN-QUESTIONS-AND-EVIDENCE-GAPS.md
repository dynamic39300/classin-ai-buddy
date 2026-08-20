# NineClaw 待确认问题与证据缺口

## 1. 使用规则

本清单是待确认事项的唯一审阅入口。聊天中的 P0/P1 摘要不再作为另一套清单；后续统一按这里的 `Q-*` 编号确认和回写。

每项可填写以下结论之一：

- `CONFIRMED_BY_MEDIA`：补录/截图直接确认；
- `CONFIRMED_BY_OWNER`：产品操作人员明确说明，但尚无动态证据；
- `DEFAULT_APPROVED`：同意采用本表的建议默认处理；该处理标为 `DESIGN_COMPLETION`；
- `NEEDS_REVISION`：不同意默认处理，并在“您的选择/补充”中写明正确逻辑；
- `MEDIA_PENDING`：需要补充录屏或截图后再确认；
- `OUT_OF_SCOPE`：本阶段不还原；
- `OPEN`：继续保持未知。

人工说明和截图不会被包装成 NineClaw UI 一手动态事实；二者会在规格中分别标注。

审阅优先级：

- `A`：只在实现对应高影响能力前阻塞，涉及数据丢失、危险操作、凭据、扣费、外部发送或不可逆副作用；
- `B`：显著影响核心体验，建议确认；未确认时可以采用表中安全默认；
- `C`：主要影响还原精度，可以直接采用经验默认。

填写方式：直接把最后一列的 `待填写` 改为 `DEFAULT_APPROVED`、`CONFIRMED_BY_OWNER：……`、`NEEDS_REVISION：……`、`MEDIA_PENDING：素材路径` 或 `OUT_OF_SCOPE`。

## 2. 全量审阅工作表

### 2.1 主任务与产物

| ID | 级别 | 建议默认处理 | 您的选择/补充 |
|---|---|---|---|
| Q-T01 | C | 快捷任务只预填目标/能力上下文，不自动发送；教师确认输入后创建 Run | DEFAULT_APPROVED |
| Q-T02 | B | 先按已观察的单页确认卡实现：选项、其他、跳过、提交；交互结构预留多问题扩展 | DEFAULT_APPROVED |
| Q-T03 | C | 计划可展开/折叠；失败步骤可重试；默认不允许直接编辑或任意跳过 Agent 计划 | DEFAULT_APPROVED；CONFIRMED_BY_OWNER：重试时接续原任务对话执行 |
| Q-T04 | A | 停止后禁止新调用，尽力取消在途任务；保留已完成步骤并标明可能已发生的副作用；继续时创建新尝试 | DEFAULT_APPROVED |
| Q-T05 | B | 历史恢复 Run、未完成补参和最后活动产物；默认定位到最新事件，并提供回到先前位置能力 | DEFAULT_APPROVED |
| Q-T06 | B | 先支持选中元素/选区 AI 修改，展示修改结果后由教师确认应用；整篇修改作为后续扩展 | DEFAULT_APPROVED |
| Q-T07 | A | 存在未保存内容时阻止静默退出，提示保存/放弃/取消；异常退出时保留本地恢复草稿 | DEFAULT_APPROVED |
| Q-T08 | B | 每次保存生成逻辑新版本并更新当前版本；保留上一版以支持回退，不直接无痕覆盖 | DEFAULT_APPROVED |
| Q-T09 | B | 统一错误卡显示人类可读原因、影响和重试/换策略/停止；技术错误默认折叠并脱敏 | DEFAULT_APPROVED |
| Q-T10 | C | HTML 使用内嵌预览；DOCX/PPTX/XLSX/PDF 优先只读预览，不支持时提供下载/外部打开；视频使用播放器 | DEFAULT_APPROVED：允许占位方式实现 |

### 2.2 Skill、Tool、内容、定时任务与文件

| ID | 级别 | 建议默认处理 | 您的选择/补充 |
|---|---|---|---|
| Q-S01 | C | 分开表达“已安装”“已启用”“本任务已选择”；三者不共用一个状态 | DEFAULT_APPROVED |
| Q-S02 | B | 上传前校验目录/ZIP/Markdown/GitHub URL 和 manifest；坏包拒绝；同名时要求替换/另存确认 | DEFAULT_APPROVED |
| Q-S03 | C | 按已确认链路由 Skill Creator 创建一条任务流；生成后预览并由用户确认安装到“我的技能” | DEFAULT_APPROVED |
| Q-M01 | C | 表单和 JSON 编辑同一份配置；保存前做 Schema 与必填校验，二者切换保持内容 | DEFAULT_APPROVED |
| Q-M02 | A | Token/环境变量默认掩码、不可进入日志和会话；保存前提供连接测试，失败不启用 Tool | DEFAULT_APPROVED |
| Q-C01 | C | 按截图字段实现；标题、内容类型及核心目录字段必填，介绍上限 500，其余采用合理长度 | DEFAULT_APPROVED |
| Q-C02 | C | Step 4 显示文件、元数据、定价和缺失项；提交成功后进入“审核中”，并回到我的作品 | DEFAULT_APPROVED |
| Q-C03 | A | 扣积分前明确二次确认；余额不足阻止操作；已解锁作品再次访问不重复扣费 | DEFAULT_APPROVED |
| Q-C04 | C | 驳回卡显示原因，支持编辑元数据/文件后重新提交；保留原审核记录 | DEFAULT_APPROVED |
| Q-A01 | C | 只实现已观察字段；折叠区未知字段不额外扩展，后续按需要增加 | DEFAULT_APPROVED |
| Q-A02 | A | 使用账户本地时区；默认不并发执行同一任务、不补跑离线期间错过任务；到期后停止新调度 | DEFAULT_APPROVED |
| Q-A03 | B | 每次立即/定时运行创建一个普通 Run；定时历史与 Run、Artifact 双向关联 | DEFAULT_APPROVED |
| Q-F01 | C | 第一版使用目录树/列表，支持打开、预览、上传、重命名、删除和作为任务输入；删除需确认 | DEFAULT_APPROVED |
| Q-SEC01 | A | 危险命令默认拒绝；确需执行时限定沙箱与工作目录，并在执行前展示影响、目标和显式审批 | DEFAULT_APPROVED |

### 2.3 设置与商业化

| ID | 级别 | 建议默认处理 | 您的选择/补充 |
|---|---|---|---|
| Q-SET01 | A | API Key 掩码存储、可替换/清除但不可回显；测试成功后才能启用 Provider；自定义模型校验唯一 ID | DEFAULT_APPROVED |
| Q-SET02 | A | 恢复前展示备份时间与影响并二次确认；先自动生成恢复点；冲突默认不静默覆盖 | DEFAULT_APPROVED |
| Q-SET03 | A | 凭据掩码；绑定后先发测试消息；解绑和真实外部发送需明确确认并保留回执 | DEFAULT_APPROVED |
| Q-SET04 | B | 沙箱安装显示下载/安装/失败/重试；仅对新任务生效，不改变正在执行的 Run | DEFAULT_APPROVED |
| Q-SET05 | C | 检查更新显示最新/可更新/失败；反馈附件沿用 5 个、单个 10MB 限制，提交后显示成功回执 | DEFAULT_APPROVED |
| Q-B01 | A | 若实施真实支付，支付前确认套餐与金额，支付后以服务端回执到账；权益、到期和支付失败显式显示 | DEFAULT_APPROVED |
| Q-B02 | A | 积分流水不可由前端推断；余额不足阻止扣费；退款/申诉作为独立状态并保留流水 | DEFAULT_APPROVED |

### 2.4 批量确认区

如果您同意某一组全部采用建议默认，可直接填写：

- 主任务与产物（Q-T01～Q-T10）：`DEFAULT_APPROVED`，其中 Q-T03、Q-T10 保留单项补充
- Skill、Tool、内容、定时任务与文件（Q-S01～Q-SEC01）：`DEFAULT_APPROVED`
- 设置与商业化（Q-SET01～Q-B02）：`DEFAULT_APPROVED`

批量确认与单项回复冲突时，以单项回复为准。

## 3. P0：影响主任务链还原——详细证据问题

本节用于解释原始证据缺口，并同步记录第 2.1 节确认结果。`DEFAULT_APPROVED（证据仍 OPEN）`表示实施方案已经确认，但没有把该方案改写成 NineClaw 一手事实。

| ID | 问题 | 为什么重要 | 最小补充材料 | 确认结果 / 证据状态 |
|---|---|---|---|---|
| Q-T01 | 快捷任务是预填输入器、立即发送，还是直接进入补参？ | 决定首页主入口链 | 连续录制点击一个快捷任务到下一屏 10–20 秒 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T02 | 已确认教材版本页有选项、“其他”、跳过和提交；是否还有第 2/3 页、能否返回或自然语言回答？ | 决定 Clarification 状态机 | 完整完成一次多题补参录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T03 | 计划步骤可否折叠、重试、跳过或手动编辑？ | 决定 Run 控制权 | 计划区域逐项点击录屏 | DEFAULT_APPROVED + CONFIRMED_BY_OWNER（重试续接原任务对话执行） |
| Q-T04 | 点停止后正在运行的命令/远端任务如何结束，能否继续？ | 决定取消语义和副作用 | 运行中停止并恢复的完整录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T05 | 历史任务恢复后是否自动恢复右侧产物、滚动位置和未完成补参？ | 决定会话持久化 | 退出任务后从历史重新打开 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T06 | 产物 AI 修改是选区、块、全文还是三者都有？如何接受/拒绝？ | 决定编辑器核心交互 | 选中文字到 AI 修改完成的连续录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T07 | 未保存编辑关闭产物/切任务/退应用时如何处理？ | 防止丢稿 | 三种退出路径各一次 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T08 | 保存是覆盖原文件、生成新版本还是另存？版本是否可回退？ | 决定 Artifact 模型 | 修改并保存两次后查看文件/历史 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T09 | 模型/Tool/命令失败的真实错误卡和恢复动作是什么？ | 决定异常态还原 | 各制造一个安全的可恢复失败 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-T10 | 不同产物类型的预览工具栏分别有哪些动作？ | 决定右栏组件变体 | DOCX/PPTX/XLSX/PDF/HTML/视频各一张全屏截图 | DEFAULT_APPROVED（允许占位实现；证据仍 OPEN） |

## 4. P1：影响模块闭环——详细证据问题

本节用于保留证据缺口和建议补录方式，并同步记录第 2.2 节确认结果。

| ID | 模块 | 问题 | 最小补充 | 确认结果 / 证据状态 |
|---|---|---|---|---|
| Q-S01 | Skill | 安装、启用、本任务选择三者在 UI 中如何区分？ | 同一 Skill 从未安装到任务使用的连续录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-S02 | Skill | 上传本地包的格式、校验、冲突和失败反馈？ | 上传成功 + 同名冲突/坏包各一次 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-S03 | Skill | 创建 Skill 的全部问题、生成文件和确认步骤？ | 从“创建”到我的技能的全链录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-M01 | Tool | 自定义 MCP 表单/JSON 的全部字段与校验？ | 从空表单到测试/保存的慢速录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-M02 | Tool | 环境变量/Token 是否掩码，连接是否有测试动作？ | 配置页静态全屏 + 测试结果 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-C01 | Content | 发布 Step 2 的完整字段、必填和长度？ | Step 2 顶到底滚动截图 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-C02 | Content | Step 4 提交摘要、成功页和审核后通知？ | 从 Step 3 下一步到提交成功 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-C03 | Content | 下载/解锁扣积分确认、余额不足和重复解锁？ | 三种账户状态操作录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-C04 | Content | 驳回作品如何查看原因、修改和重新提交？ | 一条驳回作品操作录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-A01 | Scheduler | 创建表单折叠区以下全部字段？ | 全表单从顶到底截图 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-A02 | Scheduler | 频率、时区、离线、错过和重叠执行策略？ | 产品负责人说明 + 可见设置 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-A03 | Scheduler | 立即运行后的任务/产物在哪里，历史如何关联？ | 点立即运行到结果打开 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-F01 | Files | 我的文件完整 IA 与 CRUD 行为？ | 从入口开始完整漫游录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-SEC01 | Runtime | V07 可见含 `rm -rf` 的命令已完成；执行前是否有策略拦截、审批或可恢复隔离？ | 同类危险命令从触发到拒绝/批准的安全测试录屏 | DEFAULT_APPROVED（证据仍 OPEN） |

## 5. P2：系统配置和商业化——详细证据问题

本节用于保留证据缺口和建议补录方式，并同步记录第 2.3 节确认结果。

| ID | 模块 | 问题 | 最小补充 | 确认结果 / 证据状态 |
|---|---|---|---|---|
| Q-SET01 | 模型 | Key 保存、清除、测试失败和模型添加规则？ | 完整配置一次测试 Provider | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-SET02 | 备份 | 恢复前确认、冲突、加密密钥和失败反馈？ | 备份/恢复完整录屏，隐去私密信息 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-SET03 | IM | 手动绑定字段、测试消息、解绑和权限失败？ | 一个渠道完整绑定/解绑 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-SET04 | 沙箱 | 安装进度、失败、重启、生效时间？ | 沙箱安装或失败链 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-SET05 | 关于/反馈 | 页面字段已由截图确认；检查更新结果、协议详情、附件校验和反馈成功态是什么？ | 完整点击/提交录屏 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-B01 | 会员 | 四档月度套餐与支付方式已确认；支付成功、到账、权益和到期状态是什么？ | 完成一笔测试支付或产品方说明 | DEFAULT_APPROVED（证据仍 OPEN） |
| Q-B02 | 积分 | 余额、任务/明细和流水已确认；分页、余额不足、退款/申诉如何处理？ | 对应状态录屏 | DEFAULT_APPROVED（证据仍 OPEN） |

## 6. 可暂不阻塞第一轮高保真设计的未知项

- 精确字体族、字号、像素间距、圆角和阴影；可在视觉还原阶段通过截图标定。
- 后端表名、数据库和内部 Agent Runtime；不属于 UI/PRD 还原范围。
- marketplace 全量实时卡片；内容随账户和版本变化，可用证据快照作为 fixture。
- 远端服务真实 SLA 和模型质量；需要单独运行评测，不由静态源码证明。
- 用户菜单、深链和系统级快捷键；若不进入首轮交互稿可延后。

## 7. 建议的补录顺序

若需要用户补充素材，建议一次录制完成以下五组，减少往返：

1. **主任务全链**：快捷入口 → 多题补参 → 计划 → 一次失败重试 → 中途改约束 → 产物编辑/AI 修改 → 保存 → 历史恢复。
2. **产物矩阵**：DOCX、PPTX、XLSX、PDF、HTML、练习解析和视频预览分别慢速展示工具栏。
3. **供给链**：安装/启用/使用 Skill；上传/创建 Skill；自定义 MCP 表单与 JSON。
4. **内容与定时**：发布四步、解锁/余额不足/改编；定时创建、立即运行、历史结果。
5. **低频系统页**：我的文件、模型失败、备份恢复、IM 解绑、沙箱安装、会员和积分。

录制建议：1920×1080 或原生分辨率、鼠标停留 1–2 秒再点击、表单从顶到底慢滚、不要裁掉标题栏和侧栏；涉及 Token、学生数据和账号信息时先脱敏。

## 8. 当前进入设计阶段的判断

现有材料足以开始：全局 IA、主任务正常链、Skill/Tool/Content/Scheduler 主页面、设置页和核心 Artifact 交互的第一轮高保真结构稿。

现有材料不足以声称：异常与恢复 100% 还原、所有产物工具栏像素级一致、我的文件/会员/积分完整闭环、Skill/MCP 供应链治理和定时任务运行语义完全确认。上述缺口不会被改写成 NineClaw 事实；经审阅同意后，可以采用第 2 节的建议默认处理，并标记为 `DESIGN_COMPLETION` 进入实施。
