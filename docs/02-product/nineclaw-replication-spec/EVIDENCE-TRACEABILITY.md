# NineClaw 规格证据追溯矩阵

## 1. 一手证据入口

完整视频、截图和关键帧索引见 [NineClaw 页面与交互关键帧证据图册](../../01-research/source-notes/product_research_nineclaw_keyframe_evidence_atlas_20260821.md)。图册覆盖 8 段录屏（合计 56:01.53）、41 张静态截图和 69 张稳定命名关键帧；每项均记录“可证明 / 不可证明”。

本矩阵把规格对象映射到证据 ID。`Sxx` 为静态截图，`KF-*` 为录屏关键帧；没有 ID 的设计规则必须标为 `INF` 或 `UNKNOWN`。

## 2. 页面证据映射

| 规格对象 | 主要证据 | 可直接还原 | 仍不可证明 |
|---|---|---|---|
| G-P01 全局壳 | S01、S02、S10–S13 | 左栏、收起、设置/积分/会员入口 | 用户菜单、跨会话偏好 |
| G-O03 历史任务菜单 | OWNER-C1 | 默认显示相对时间；“…”菜单支持重命名、置顶、删除 | 操作失败、删除恢复 |
| T-P01 新建任务 | S01、S03–S09、KF-T01、KF-T13 | 输入器、目录/Skill/模型、快捷任务选中态 | 快捷任务点击后的精确发送规则 |
| T-O04 补参卡 | KF-T04–KF-T07 | 缺失变量、教材版本页、其他/跳过/提交、提交结果 | 第 2/3 页、返回与必填规则 |
| T-P03 执行时间线 | KF-T02–KF-T14、KF-A01、KF-P01–KF-P07 | 计划、TaskCreate、Skill/文件/命令轨迹、完成总结、目标改变 | 统一事件 Schema、失败/重试/部分成功 |
| T-P04/P05 产物 | KF-A02–KF-A08、KF-P06、KF-S07 | 双栏、HTML 预览、选区、撤销/重做、AI 修改、保存成功 | DOCX/PPT 内嵌预览、版本/冲突/跨会话 |
| S-P01/P02 Skill | KF-S01–KF-S11、S04 | 目录、推荐、详情、上传、创建、使用、我的技能 | 升级、冲突、回滚、共享权限 |
| S-O02 → T-P01 创建 Skill 任务流 | OWNER-C1、KF-S05–KF-S09 | 通过 Skill Creator 在任务中创建 Skill | 全部补参和失败分支 |
| M-P01/P02 Tool | KF-O01–KF-O09 | 目录、表单/JSON、HTTP/MCP、stdio、环境变量、校验错误 | 凭据安全、连接测试、运行异常 |
| M-O01 Tool 详情/管理 | OWNER-C1 | 不能直接发起任务；不存在到 T-P03 的跳转 | — |
| C-P01 内容广场 | S14–S17、KF-C01 | 卡片、筛选、列表 | 推荐算法、空态/分页 |
| C-P02 作品详情 | S18、S19、KF-C02–KF-C04 | 详情、文档预览、下载确认、改编预填结果 | 计费/权限、原始字段映射协议 |
| C-P03 我的作品 | S20–S23、KF-C05、KF-C14 | 概览、发布/解锁/收藏、状态筛选、审核中 | 指标口径、驳回/下架闭环 |
| C-O01 发布向导 | S24–S28、KF-C06–KF-C13 | 四步、文件/封面、信息字段、定价、提交检查、上传成败 | 草稿、审核后台、特定重试算法 |
| A-P01/A-O01 | S29–S35 | 默认页、表单、通知渠道、创建后、编辑/启动、运行中 | 动态调度、失败、暂停、通知送达 |
| SET-P02–P07 | S36–S41 | 模型、沙箱、IM、备份、反馈、关于字段 | 保存/测试/失败/权限 |
| B-P01/B-P02 | S11–S13 | 积分余额/流水、会员套餐、支付方式 | 支付成功、到账、退款、到期 |
| F-P01 我的文件 | S01–S03、任务产物帧 | 入口、数量、目录与任务关联 | 页面 IA 与 CRUD |

## 3. 关键任务事件证据映射

| 规范事件/阶段 | 证据 | 结论强度 |
|---|---|---|
| `UserGoalSubmitted` | KF-T01、KF-T13、KF-P01 | 直接可见 |
| `MissingInputDetected` | KF-T04 | 直接可见 |
| `ClarificationRequested/Completed` | KF-T05–KF-T07 | 直接可见一个确认页及提交结果；多页未知 |
| `PlanCreated/TaskStepStarted` | KF-T03、KF-T08、KF-P02 | 可见计划/TaskCreate；内部 Schema 未知 |
| `SkillRead` | KF-T08、KF-P03 | 直接可见读取轨迹；版本/供应链未知 |
| `ShellCommandStarted/Completed` | KF-A01、KF-T09–KF-T11、KF-P04、KF-P07 | 直接可见命令轨迹；审批和隔离未知 |
| `ToolCallStarted/Succeeded` | KF-M01–KF-M05 | 调用卡和 JSON 可见；授权/重试未知 |
| `StrategyReplanned` | KF-P05–KF-P07 | 用户改目标与新 HTML 结果可见；旧计划状态未知 |
| `ArtifactCreated/PreviewLoaded` | KF-A02–KF-A06、KF-P06 | 文件入口和 HTML 双栏预览可见 |
| `ArtifactEditStarted/AIRevisionRequested` | KF-A05、KF-A07 | 选区、工具栏、AI 修改框可见；修改提交结果不全 |
| `ArtifactSaved` | KF-A08 | UI“保存成功”直接可见；后端/版本持久化未知 |
| `RunCompleted` | KF-T12、KF-M06、KF-P07 | 完成总结/最终回答可见 |
| `RunStopRequested` | 既有录屏中的停止控件 | 只证明入口/运行态，停止后语义不足 |
| `TaskStepFailed/Recovered` | KF-C12–KF-C13 仅属于发布上传；主任务链无等价覆盖 | 主 Agent 异常链 `UNKNOWN` |

## 4. 安全与治理证据

| 风险 | 证据 | 规格处理 |
|---|---|---|
| 技术细节默认暴露 | KF-T09–KF-T11、KF-M03、KF-P04 | 标杆事实保留；ClassIn 默认折叠、脱敏 |
| 危险命令缺少相邻审批 | KF-P07 显示含 `rm -rf` 的已完成命令 | 不能推断已审批；进入 Q-SEC01，ClassIn 执行前策略拦截 |
| Tool/MCP 授权与凭据治理未知 | KF-O05、KF-M01–KF-M05 | 配置/调用事实与安全成熟度分开 |
| UI 保存成功不等于业务回执 | KF-A08 | Artifact 保存与 ClassIn `ExecutionReceipt` 分离 |
| 内容审核只到前台状态 | KF-C11、KF-C14 | 不反推审核后台或 SLA 保证 |

## 5. 设计稿引用规则

- 页面级视觉稿在标题或注释中引用页面 ID 和至少一个证据 ID。
- 若增加现有证据未覆盖的状态，必须标注 `DESIGN_COMPLETION`，不能标成 NineClaw 原样还原。
- `UNKNOWN` 被补录确认后，先更新图册/问题清单，再更新页面规格；不得只在 Figma 或聊天中口头变更。
- ClassIn adaptation 引用本矩阵时，同时引用 Decision Ledger，避免把 Skill/模型/MCP 入口复制成教师默认主导航。
