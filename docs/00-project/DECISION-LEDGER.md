# Decision Ledger

| ID | 状态 | 决策 | 原因 | 影响 |
|---|---|---|---|---|
| D-001 | LOCKED | 终局产品是统一教师 WorkBuddy 工作台和主 Agent 体验 | 统一教师任务入口，隐藏内部能力拓扑 | 原型以工作台为中心，不做 AI 工具目录首页 |
| D-002 | LOCKED | 第一条纵向切片为“课程目标到课程对象” | 可覆盖目标、上下文、产物、审批、写回和评价的主要骨架 | 使用模拟 ClassIn Adapter |
| D-003 | LOCKED | 当前原型采用结构高保真、视觉低保真 | 当前目标是能力和体验对齐，不是品牌视觉定稿 | 中性黑白灰，单一语义强调色 |
| D-004 | LOCKED | 模拟数据必须固定、脱敏、可重置并标注真值 | 当前没有真实 ClassIn 数据 | 不宣称生产集成或真实学生判断 |
| D-005 | LOCKED | WorkBuddy 与 ClassIn 事实所有权分离 | 防止 Agent 或原型复制业务事实 | 使用领域 Interface 和 Adapter |
| D-006 | LOCKED | 原型说明、可运行工作台、研究文档分目录管理 | 降低 AI 上下文噪音和误改风险 | `prototype/` 保存说明与快照，`apps/workbench` 承载可运行原型 |
| D-007 | LOCKED | 框架和供应商不在原型阶段锁死 | 先验证 Interface 和状态，再做 Spike | 具体 SDK 只能位于 Adapter/Provider 后 |
| D-008 | SUPERSEDED_BY_D-023 | 使用 `pnpm workspace + TypeScript strict + 模块化单体` 建立 production-shaped prototype | 对应代码已由用户明确清理，且新的 ClassIn PC 可运行基座采用单应用结构 | 历史决策保留追溯；当前工程结构以 D-023 为准 |
| D-009 | LOCKED | 教师首屏采用任务引导式体验，默认隐藏 Harness 和业务系统术语 | 第一版让教师先理解系统再开始工作，产生焦虑和操作不确定性 | 默认路径只表达“说目标 → 看方案 → 确认保存”；工程状态进入评审模式或辅助信息 |
| D-010 | LOCKED | ClassIn WorkBuddy 第一版产品设计以 NineClaw 已验证体验为对标蓝本，已知功能闭环按 `95%-100%` 覆盖，未经整体设计评审不预先删除 | 过早删减会破坏 NineClaw 紧凑的任务、能力与产物闭环 | 功能可因 ClassIn 语义调整入口、层级和表达；默认隐藏底层术语不等于删除 Skill、MCP、工具调用或执行追踪能力 |
| D-011 | LOCKED | `Core Context` 是 NineClaw 向 ClassIn WorkBuddy 转化的核心适配层，并明确区分业务上下文与 `Domain Knowledge` | Agent 需要同时理解当前教师工作的业务现场和稳定的教学/机构规则 | 上下文来源与对象语义优先依据 `classin-pc-optimizer` 的 ClassIn PC 研究和设计事实；产品设计覆盖任务入口、详情、执行引用和单次任务快照四层表达 |
| D-012 | LOCKED | “生成单个课件”与“从目标生成课程方案包”是两个可独立发起、也可衔接的 Agent 任务类型 | 教师既存在单独制作课件的真实需求，也存在一次生成课件、作业、测验、录播等课程配套内容并形成课程对象的需求 | 课程方案包是新增任务模型，不替换或吞并单课件生成；页面、任务模板、产物模型和后续工程切片分别表达两种闭环 |
| D-013 | LOCKED | WorkBuddy 设计基线融合 ClassIn PC 既有交互与业务语义、Linear PC 设计基因和 NineClaw Agent 体验 | 三类来源分别回答业务连续性、视觉交互品质和 Agent 闭环问题 | 外部项目中的 `LOCKED` 不自动继承；迁入规则必须标记 `ADOPTED`、`ADAPTED`、`REFERENCE_ONLY` 或 `OPEN_VALIDATE` |
| D-014 | LOCKED | 全量 AI 能力覆盖采用两次校验：V1 详细设计前只做架构扩展性检查，V1 后再逐项补齐终局能力 | 既避免页面和产物模型硬编码为单课件，也避免全量能力研究阻塞首版完整架构 | 第一次仅检查多产物、依赖、上下文、多对象写回和恢复等承载能力；第二次完成能力到入口、Context、Skill/Tool、Artifact、Action 与 ClassIn 对象的全映射 |
| D-015 | LOCKED | 暂停九章爱学 Web AI 工具矩阵和操作流程的进一步研究 | 当前 NineClaw 研究已经足以支撑教师 Agent 工作台设计，九章爱学并非本阶段 Agent 形态蓝本 | 保留已有材料，不删除；若未来单独建设 AI 工具集合产品面，再重新评估是否恢复研究 |
| D-016 | SUPERSEDED_BY_D-024 | WorkBuddy 使用两级导航：ClassIn 一级主导航 + 对标 NineClaw 的 AI Agent 二级导航面板；二级面板内部采用扁平 Section，不再建立第三级菜单 | 用户在 Phase 3 Review 中校准导航层级；既要保留 ClassIn 全局方向，也要完整承载 NineClaw 的任务与能力导航 | 两级 IA 与扁平 Section 继续有效；独立面板的空间归属由 D-024 修订 |
| D-017 | SUPERSEDED_BY_D-024 | WorkBuddy 采用 ClassIn 共享 Shell、AI Agent 二级导航面板与专属 Agent Work Surface；右侧辅助区按意图在 `Artifact / Core Context / 执行详情` 间切换 | 保留两级导航和任务恢复能力，同时避免历史再独立成第三根栏，以及 Context、过程与产物同时形成持续多栏 | 单一活动辅助区规则继续有效；二级导航不再占用 Work Surface 独立列，按 D-024 执行 |
| D-018 | LOCKED | WorkBuddy 目标设计规格采用 ClassIn PC 的专业、克制、现代工作台基线，并锁定 `1440×900`、4px 网格、Inter Variable + 中文系统字体、ClassIn 语义绿色与 `0/4/6/8/16` 圆角层级 | 用户已完成 Phase 1 Review，具体设计规格可以从候选升级为目标规范 | 品牌绿只用于识别、焦点、主操作和真实状态；页面 Section 不自动圆角卡片化；D-003 仅继续约束当前旧原型的视觉交付阶段，不否定目标视觉规范已锁定 |
| D-019 | LOCKED | Core Context 采用七类受治理结构，完整 Context Snapshot 不直接下发给 Skill/Tool，每次能力调用只获得最小必要的 Context Projection | 用户已完成 Phase 2 Review；必须兼顾 ClassIn 业务现场、Domain Knowledge、教师控制与学生敏感数据最小化 | 页面区分业务上下文、Domain Knowledge、教师资料、教学证据和 AI 推断；运行详情可解释实际投影，但不暴露未下发数据 |
| D-020 | LOCKED | 单课件完成后“基于此课件生成课程方案包”创建一个关联的新 WorkBuddyRun，原 Run 与课件版本保持独立 | 用户确认 Phase 2 任务类型模型；改变任务类型或吞并原 Run 会破坏独立闭环和可追溯性 | 新 Run 引用 `sourceArtifactRef`，重新确认自身 Core Context 与产物清单，不沿用未使用的隐式 Context |
| D-021 | LOCKED | NineClaw 已知 38 个页面、覆盖层与壳状态在 ClassIn WorkBuddy 目标产品中全部有去向，环境适配、渐进披露或待绑定都不等于删除 | 用户确认 Phase 2 功能映射矩阵；第一版先维持完整闭环，再在完整设计评审后讨论删减 | `M-O01` Tool 详情不直接发起任务；`S-O02` 可通过 Skill Creator 创建关联 Agent Run；会员/积分保留位置但不伪造商业闭环 |
| D-022 | LOCKED | V1 目标架构以 Task Type、Core Context、Artifact Graph、Capability Provider 和 Action Commit 等 Interface 承载单/多产物、恢复与多对象写回 | 用户确认 Phase 2 扩展性检查，允许进入完整页面设计 | `DESIGN_PASS` 不表示生产实现；真实 ClassIn API、媒体生成、权限、Knowledge 治理和商业绑定继续保持 `OPEN/UNKNOWN` |
| D-023 | LOCKED | 当前 PC 前端完整继承 `classin-pc-optimizer` 的单应用 `npm + React/Vite` 产品基座，保留老师/学生页面树、ClassIn Shell、Domain、Feature、Design System、Mock 与测试；WorkBuddy 作为老师侧纵向 Feature 接入 | 用户确认按《ClassIn PC 产品基座迁移方案》执行；复用真实全局 Demo 比重建 Placeholder Shell 更完整，也避免已删除 workspace 与新代码并存 | 迁入 `src/public/tests` 与根构建配置；源 Agent/工程规则合并吸收而非覆盖；后端/Harness Spec 保留，第二个真实部署运行时出现前不恢复 monorepo |
| D-024 | SUPERSEDED_BY_D-029 | AI Agent 二级导航作为上下文扩展嵌入 ClassIn 左侧栏的 `AI Agent` 一级入口下方；右侧 Stage 不再保留独立导航列，完整用于 Run、Artifact、Core Context 与执行详情 | 用户完成 M3 功能框架验收后，根据实机截图明确要求释放右侧页面篇幅，同时保持任务历史与能力入口属于 AI Agent 导航 | 左侧二级能力目录继续有效；任务新建、历史与并行工作区的归属由 D-029 修订 |
| D-025 | LOCKED | 单课件与课程方案包的标准 Agent Run 使用一个持续存在的对话式任务窗口表达；`Goal → Core Context → Plan → Process → Artifact → ProposedAction → Approval → ExecutionReceipt` 通过消息、结构化卡片、确认窗口和动态事件在同一 Run 时间线内完成，不再把阶段推进表达成多个独立页面 | 用户完成 M4 功能范围审阅后确认：底层领域模型覆盖全面，但现有阶段卡片与页面切换不能让教师感知真实 Agent 任务流 | M4 领域对象、状态机、审批、写回与 Receipt 语义保持不变；M4.1 重做前端 Run Projection、事件节奏、结构化补参和审批表达；Run 路由只用于稳定恢复，不代表阶段页面跳转 |
| D-026 | LOCKED | Core Context 在新任务和 Run 中使用默认展开、可收起的业务对象树；右侧只保留一个活动辅助区，以 `上下文 / 产出` 两个视图动态切换，执行过程主要进入对话时间线 | 用户确认上下文是任务前必须关注的信息，并要求班级、课程、计划文档、单元、活动、资源和 Space 文件可逐层展开、勾选并动态进入 Prompt | 选中对象同步为 Composer Context Chip，提交时冻结 ContextSnapshot；产物到达时在对话内产生入口并更新右侧 `产出` 状态，不丢失 Context 草稿或当前选择；技术执行详情采用事件内渐进披露 |
| D-027 | LOCKED | 当前阶段只模拟标准 Agent Run 的动态体验，不宣称已经接入真实 Agent；对话式 Run Module 通过稳定 Interface 使用可重置的确定性 Experience Adapter，未来真实 Agent Runtime Adapter 在同一 Seam 替换 | 用户明确确认本阶段目标是做出完整界面表达，后续接入真实 Agent 能力后替换模拟效果 | 页面与浏览器测试跨同一 Run Interface；模拟 Adapter 负责确定性事件与时间推进，领域 Module 继续负责 Context、Artifact、Action、Approval 和 Receipt 不变量；真实 Runtime 接入时不得绕过业务审批和写回 Adapter |
| D-028 | LOCKED | M4.1 动态 Agent Run 以 NineClaw 目标录屏为逐帧还原基线；默认 100% 覆盖录屏中可见的元素、出现顺序、状态变化、展开收起、滚动、反馈和动效节奏，并完整登记源文案 | 用户要求先复刻已经验证的完整任务体验，同时要求三段素材在一个任务中的上下文连续、语义协调 | V05 的“智能课件”任务是唯一内容主线；V04/V06 只补齐产物预览、编辑、AI 修改和保存等交互结构，其“教学动画”“课后练习”文案必须等位改写为智能课件语义，不得混成多个任务。ClassIn 品牌、业务对象、Core Context、审批与 Receipt 采用等位替换或增量叠加；所有非逐字复用项进入逐帧差异表，标明 `TASK_SEMANTIC_NORMALIZATION`、`CLASSIN_ADAPTATION`、`SECURITY_REDACTION` 或 `ADDED_DOMAIN_GOVERNANCE` |
| D-029 | LOCKED | 一级入口统一命名为“教师 WorkBuddy”，并提供独立展开/收起控制；左侧二级目录只承载“技能市场、工具连接、内容资源、我的文件、定时任务、设置”，新建任务、已打开任务 Tab 与全部任务滚动选择器统一进入右侧 Work Surface 顶层 | 用户确认参考浏览器/Linear 的并行任务模型：教师需要同时处理多个任务，并在当前 Tab 下拉选择历史任务或用 `+` 新建任务；任务历史继续塞在左侧会混淆能力导航与工作现场 | Tab 表达当前打开的任务工作区，路由表达当前任务；选择未打开任务会加入 Tab，关闭 Tab 不删除 Run，`+` 打开新任务草稿；全部任务选择器拥有独立滚动、搜索和任务管理操作。URL 暂保留 `/teacher/ai-agent/*` 作为兼容路由，不把内部旧命名继续暴露为界面文案 |
| R-001 | RECOMMENDATION | WorkBuddy 全局能力围绕三条核心业务结果链组织：作业到订正、备课演练到改进、诊断到干预；工程按“课程目标到课程对象、作业到订正、备课演练到改进、诊断到干预”四条纵向切片推进 | 同时保持终局业务地图完整，并用课程生产基础链先验证共享 Harness，再逐步引入学生证据、媒体证据和跨对象副作用 | 产品能力矩阵、AI 编排蓝图和系统交付地图采用业务场景名称；内部 ID 只用于工程追踪。该建议待真实用户、数据和权限证据验证后再决定是否升级为 LOCKED |
| R-002 | RECOMMENDATION | 产品设计同时完整定义“生成单个课件”和“生成课程方案包”两种任务；工程首条切片先验证共享的目标、Context、计划、Artifact、审阅、确认、写回和回执骨架，再按风险分期接入具体文件生产与正式发布 | 避免用工程分期反向删减已经锁定的产品任务类型，同时控制第一条生产化切片的排版、媒体和跨对象副作用复杂度 | 原型必须表达两种任务的产品位置与可衔接关系；真实 PPT/视频生成和正式发布的工程顺序在设计评审后另行锁定 |
| R-003 | RECOMMENDATION | M4 的功能 Feature、领域模型与状态治理已通过用户范围验收；现有前端交互尚未通过最终体验验收，进入 M4.1 对话式 Agent Run UX 修订 | 用户确认能力覆盖全面，但阶段卡片、立即跳转和静态展示不能表达完整动态 Agent Run | M4 技术基线继续保留；Phase 4 状态更新为 `FUNCTIONAL_SCOPE_ACCEPTED_UX_REVISION_REQUIRED`，完成 M4.1 详细 PRD、实现与用户复审前不宣称 M4 产品体验已最终验收 |

## 变更规则

修改 `LOCKED` 决策前先在本文件记录替代方案、证据、影响和用户确认状态。研究结果只能提出 `RECOMMENDATION`，不能静默升级为 `LOCKED`。
