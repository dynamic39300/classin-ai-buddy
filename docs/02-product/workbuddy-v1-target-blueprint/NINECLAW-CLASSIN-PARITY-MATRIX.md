---
title: NineClaw → ClassIn WorkBuddy 功能对照转换矩阵
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
coverage: 38/38
---

# NineClaw → ClassIn WorkBuddy 功能对照转换矩阵

## 1. 转换原则

本矩阵以已审阅的 `nineclaw-replication-spec` 为功能基线。V1 目标设计对 38 个已知页面、覆盖层和壳状态逐项给出去向，不因 ClassIn 语义适配、渐进披露或入口移动而删掉闭环。

四类转换决策：

- `EQUIVALENT_PRESERVE`：能力与闭环等价保留；
- `PRESENTATION_ADAPT`：保留能力，按 ClassIn Shell、教师语言或 Core Context 调整呈现；
- `ENVIRONMENT_ADAPT`：保留产品意图，底层配置按 ClassIn 部署与治理环境替换；
- `PRESERVE_PENDING_BINDING`：不预删，但商业或正式业务归属尚未确认，不在 UI 中伪装成已上线能力。

“默认折叠”“高级设置”“从设置进入”都不等于删除。工具详情不能直接发起任务；创建 Skill 可以通过 Skill Creator 形成一个独立 Agent Run。

## 2. 全量页面与覆盖层映射

| ID | NineClaw 已知功能 | ClassIn WorkBuddy V1 去向 | 决策 | Core Context / ClassIn 适配 |
|---|---|---|---|---|
| G-P01 | 全局应用壳 | ClassIn PC 共享 Shell；`AI Agent` 为教师侧一级菜单，内部使用专属 Work Surface | `PRESENTATION_ADAPT` | 沿用当前教师、机构、全局通知与账户范围 |
| G-O01 | 侧栏收起态 | 保留 ClassIn 一级/二级导航收起与恢复 | `PRESENTATION_ADAPT` | 收起不丢失当前 Run 和 Context 草稿 |
| G-O02 | 用户菜单 | 复用 ClassIn 账户菜单与组织/身份边界 | `ENVIRONMENT_ADAPT` | 切换组织必须重建 Context Proposal |
| G-O03 | 历史任务操作菜单 | AI Agent 二级菜单中的任务条目保留 `…`：重命名、置顶、删除 | `EQUIVALENT_PRESERVE` | 默认显示相对时间；1440×900 默认可见 6 条，更多滚动 |
| T-P01 | 新建任务首页 | 新建 Agent Run；输入目标、附件、快捷任务和核心上下文 | `PRESENTATION_ADAPT` | 工作目录扩展为本地/上传/ClassIn Space；Core Context Chip 可检查 |
| T-O01 | 工作目录选择器 | 资源与目标位置选择器：最近本地目录、上传、我的云盘、组织云盘、资源中心 | `ENVIRONMENT_ADAPT` | 每项显示来源、权限、格式、更新时间与解析状态 |
| T-O02 | Skill 选择器 | 保留为高级能力选择；普通教师可由任务类型自动匹配 | `PRESENTATION_ADAPT` | 只显示可接收当前 Context 类型与敏感级别的 Skill |
| T-O03 | 模型选择器 | 保留模型选择与自定义模型设置入口；默认由机构策略给出 | `ENVIRONMENT_ADAPT` | 模型可接收的 Context 范围由策略与 Capability Manifest 约束 |
| T-P02 | 历史任务工作区 | 从二级菜单恢复 Run 的会话、计划、过程、Context Snapshot 与 Artifact | `PRESENTATION_ADAPT` | 恢复历史 Snapshot；明确与实时业务事实的差异 |
| T-P03 | 运行中任务 | 目标理解、补参、计划、Skill/Tool 调用、阶段结果、停止、重规划与恢复 | `EQUIVALENT_PRESERVE` | 教师摘要显示已用 Context；能力追踪显示最小 Projection |
| T-O04 | 结构化补参卡 | 会话内字段卡；一次补齐必要 Context 或任务参数 | `PRESENTATION_ADAPT` | 已知 ClassIn 事实自动预填并标来源，不重复询问 |
| T-P04 | 任务 + 右侧产物 | Run 中心区 + 单一活动右侧区；打开 Artifact 预览、解析、验证与保存 | `PRESENTATION_ADAPT` | 右侧可切换 Artifact / Core Context / 执行详情 |
| T-P05 | 产物编辑/AI 修改 | 保留查看、直接编辑、选区/整文 AI 修改、应用/拒绝、版本和保存 | `EQUIVALENT_PRESERVE` | 写回 ClassIn 前形成 ProposedAction 并重新校验目标对象 |
| S-P01 | 技能广场 | AI Agent 内的 Skill 管理入口；搜索、分类、安装、我的技能、添加 | `PRESENTATION_ADAPT` | 机构允许范围、适用任务类型和 Context 权限可见 |
| S-O01 | Skill 详情 | 保留说明、作者/来源、作用、输入输出、权限、安装和去使用 | `PRESENTATION_ADAPT` | 补充 Capability Manifest 与可接收 Context 摘要 |
| S-O02 | 添加 Skill | 保留本地上传；“创建 Skill”进入 `T-P01` 并由 Skill Creator 发起创建任务流 | `EQUIVALENT_PRESERVE` | 创建任务使用当前机构策略，但不自动带入无关班级/学生数据 |
| S-P02 | 我的技能 | 保留启停、删除、版本、查看详情和去使用 | `PRESENTATION_ADAPT` | 展示治理状态、适用范围和敏感数据权限 |
| M-P01 | 工具广场 | AI Agent 内的 Tool/MCP 管理入口；搜索、安装、我的工具、自定义 | `PRESENTATION_ADAPT` | 标记连接范围、组织策略和可操作的 ClassIn 对象 |
| M-P02 | 我的工具 | 保留启停、编辑、删除、连接与健康状态 | `ENVIRONMENT_ADAPT` | Tool 只通过 Adapter/Interface 获得授权对象与动作能力 |
| M-O01 | Tool 详情/管理 | 保留安装、编辑、删除与权限说明；**不提供直接发起任务的连线** | `EQUIVALENT_PRESERVE` | 在实际 Run 中由编排选择或调用工具 |
| M-O02 | 自定义 MCP | 保留表单/JSON 两种配置、校验、保存、取消与测试连接 | `ENVIRONMENT_ADAPT` | 密钥不回显；Context 与动作权限单独声明 |
| C-P01 | 内容广场 | 教学内容/模板广场；搜索、筛选、作品详情、我的作品、发布 | `PRESENTATION_ADAPT` | 可按学段、学科、年级、内容类型和机构范围筛选 |
| C-P02 | 作品详情 | 保留预览、下载/解锁、一键改编、收藏、返回 | `PRESENTATION_ADAPT` | 一键改编创建新 Run，并将作品作为来源明确的 Context Item |
| C-P03 | 我的作品 | 保留我发布/解锁/收藏、发布与作品管理 | `PRESENTATION_ADAPT` | 可关联 WorkBuddy Artifact 和 ClassIn Space 资源引用 |
| C-O01 | 发布作品四步向导 | 保留内容、元数据、范围/权限、确认发布四步结构 | `ENVIRONMENT_ADAPT` | 机构可见性、学生数据检查与来源归属进入发布校验 |
| A-P01 | 定时任务列表 | 保留创建、立即运行、编辑、删除、启停 | `EQUIVALENT_PRESERVE` | 每次触发重新校验 Actor、组织、Context 来源与权限 |
| A-O01 | 创建/编辑定时任务 | 保留名称、目标、周期、时区、输入位置、能力和通知等配置 | `PRESENTATION_ADAPT` | 保存 Context 选择规则，不冻结未来学生数据快照 |
| A-P02 | 定时任务历史 | 保留每次触发的结果、状态、关联 Run 和 Artifact | `EQUIVALENT_PRESERVE` | 记录触发时实际 Snapshot 与 ExecutionReceipt |
| F-P01 | 我的文件 | 迁入 ClassIn Space/WorkBuddy 文件视图；预览并作为任务输入 | `ENVIRONMENT_ADAPT` | 本地、个人云盘、组织云盘和任务 Artifact 分别标来源 |
| SET-P01 | 设置壳/通用 | AI Agent 设置壳；通用、能力、连接、数据与反馈入口 | `PRESENTATION_ADAPT` | 继承 ClassIn 账户与机构设置边界 |
| SET-P02 | 模型设置 | 保留模型配置、连接测试、添加模型和默认策略 | `ENVIRONMENT_ADAPT` | 增加模型数据边界与敏感 Context 准入说明 |
| SET-P03 | 云端备份 | 保留任务/Skill/个性配置备份与恢复意图 | `ENVIRONMENT_ADAPT` | ClassIn 正式对象不由 WorkBuddy 备份；只备份其拥有的数据 |
| SET-P04 | IM 机器人 | 保留外部消息触发与通知连接；具体渠道按 ClassIn 集成确定 | `ENVIRONMENT_ADAPT` | 外部入口不得绕过 Actor、Tenant 与审批策略 |
| SET-P05 | 沙箱环境 | 保留隔离执行模式、环境安装和健康状态 | `ENVIRONMENT_ADAPT` | 危险命令、文件系统与网络权限进入显式审批策略 |
| SET-P06 | 关于 | 保留版本、更新、协议、隐私与能力真值说明 | `EQUIVALENT_PRESERVE` | 明确 Mock、Beta、未来和生产就绪标签 |
| SET-P07 | 反馈 | 保留问题类型、描述、附件、诊断信息同意和提交 | `PRESENTATION_ADAPT` | Context/学生数据默认不随反馈上传 |
| B-P01 | 会员 | 暂保商业能力位置，不预设教师个人购买还是机构授权 | `PRESERVE_PENDING_BINDING` | V1 设计可显示授权状态，不伪造交易闭环 |
| B-P02 | 积分 | 暂保额度/用量/记录意图，不预设“积分”是最终 ClassIn 名称 | `PRESERVE_PENDING_BINDING` | 与模型额度、机构配额或商业账户的正式关系待定 |

## 3. 覆盖结果

| 模块 | 基线数量 | 已映射 | 结果 |
|---|---:|---:|---|
| Global Shell | 4 | 4 | `100%` |
| Task / Artifact | 9 | 9 | `100%` |
| Skill | 4 | 4 | `100%` |
| Tool / MCP | 4 | 4 | `100%` |
| Content | 4 | 4 | `100%` |
| Scheduled Task | 3 | 3 | `100%` |
| Files | 1 | 1 | `100%` |
| Settings | 7 | 7 | `100%` |
| Business / Entitlement | 2 | 2 | `100%` |
| **合计** | **38** | **38** | **100% 已给出去向** |

这里的 `100%` 表示目标产品设计已逐项记账，不表示生产实现已完成，也不表示所有环境依赖已经确认。

## 4. 必须保持的闭环

1. `目标/Prompt → 补参 → 计划 → 执行 → Artifact → 编辑/AI 修改 → 保存`；
2. `Skill 发现/安装/创建 → 任务使用 → 调用可追踪`；
3. `Tool/MCP 安装/配置 → Run 内调用 → 权限和结果可追踪`；
4. `内容发现 → 一键改编 → 新 Run → 新 Artifact`；
5. `定时规则 → 触发 Run → 历史与结果`；
6. `Artifact → ProposedAction → Approval → ClassIn 领域校验 → ExecutionReceipt`；
7. `历史任务 → 恢复 Snapshot、过程和产物 → 继续或派生新任务`。

## 5. Phase 2 Review 重点

- `B-P01/B-P02` 是保留位置还是应在后续明确绑定为机构授权与用量；
- “我的文件”在最终信息架构中归 AI Agent 二级功能还是复用 ClassIn Space 主入口；
- Skill/Tool 管理入口对普通教师的默认可见层级；
- Content 广场是 V1 同屏设计内容，还是保留在完整 IA、后续实现。
