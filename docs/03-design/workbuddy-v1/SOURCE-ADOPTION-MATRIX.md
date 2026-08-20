---
title: WorkBuddy 设计来源采纳矩阵
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
---

# WorkBuddy 设计来源采纳矩阵

## 1. 状态定义

| 状态 | 含义 |
|---|---|
| `ADOPTED` | 可直接成为 WorkBuddy 的设计原则，但仍服从当前项目锁定决策 |
| `ADAPTED` | 保留设计意图，需按 Agent 工作台和 ClassIn 业务语义重新表达 |
| `REFERENCE_ONLY` | 只作为证据或候选值，不成为当前规范 |
| `OPEN_VALIDATE` | 需要通过页面方案或用户 Review 再决定 |
| `REJECTED` | 与 WorkBuddy 产品目标、业务事实或安全边界冲突 |

## 2. 来源优先级

| 顺序 | 来源 | 决定什么 |
|---:|---|---|
| 1 | 当前 WorkBuddy `DECISION-LEDGER.md` 与已审阅规格 | 产品目标、功能完整度、默认体验、状态与安全边界 |
| 2 | NineClaw 一手 UI 证据与已审阅还原规格 | Agent 任务、过程、产物和配套功能闭环 |
| 3 | ClassIn PC Product DNA、Feature Spec 与一手截图 | 角色、业务对象、入口、Context 来源和领域归属 |
| 4 | ClassIn PC Design System 与 Token | PC 视觉、密度、组件和桌面交互候选规则 |
| 5 | Linear 一手案例和官方资料 | 结构、信息层级、交互节奏和视觉气质校准 |

## 3. ClassIn PC 规则采纳

| 来源规则 | 状态 | WorkBuddy 转译 |
|---|---|---|
| 专业、克制、现代的教学工作台 | `ADOPTED` | 作为总体视觉与体验气质，不做营销页或消费级聊天应用 |
| 一个页面、一个主任务、一条主阅读轴 | `ADOPTED` | 当前 Run 是主任务；导航、Context、过程和工具信息保持辅助层级 |
| 稳定 Shell，工作区按任务改变 | `ADOPTED` | ClassIn 提供身份与全局方向，WorkBuddy 工作区按新建、执行、产物、管理任务变化 |
| 页面区块不自动卡片化 | `ADOPTED` | Agent 过程使用连续时间轴/事件流；卡片只表示真正独立对象、产物或边界动作 |
| 渐进披露而不是全集平铺 | `ADOPTED` | 默认显示教师可理解的进度；Skill、MCP、工具参数和技术日志逐层展开，但能力不删除 |
| PC 宽幅用于保留上下文 | `ADOPTED` | 优先保持任务、关键 Context 与产物关系，不通过不断加列展示所有信息 |
| 教师工作区使用 Compact 密度 | `ADOPTED` | 历史、事件、对象列表紧凑；长内容和产物阅读区保持舒适行距 |
| 4px 间距网格 | `ADOPTED` | 后续布局和组件使用 `4/8/12/16/20/24/32/40` |
| Inter Variable + 中文系统字体回退 | `ADOPTED` | 目标设计字体栈锁定；当前旧原型是否加载字体资产由实施阶段决定 |
| 品牌绿用于品牌、焦点和关键行动 | `ADOPTED` | ClassIn 语义绿色比例锁定，不用于大面积中性背景或 AI 专属渐变 |
| 具体颜色、阴影和圆角值 | `ADAPTED` | 采纳来源语义值与 `0/4/6/8/16` 层级；WorkBuddy 专属组件仍需在目标页面中验证使用位置 |
| `1440×900` 为桌面 Golden Screen | `ADOPTED` | 页面构图、截图和视觉验收均以此为主视口 |
| 普通业务页面默认不超过两个持续可见分栏 | `ADAPTED` | ClassIn 一级主导航 + AI Agent 二级面板属于 Shell；Work Surface 保留 Run 主轴与一个活动辅助区，历史不再独立成第三根栏 |
| Inline Panel → 扩展面板 → 全屏工作区 | `ADOPTED` | Context 详情、产物编辑和复杂结果按内容复杂度升级承载空间 |
| 单一正文滚动所有者 | `ADOPTED` | Shell、任务流和产物区分别明确滚动边界，不产生不清楚的嵌套页面滚动 |
| Toast 用于短时非阻塞反馈，Dialog 用于边界和权限 | `ADOPTED` | 低风险动作即时反馈；业务写回、权限和不可逆动作进入明确确认 |
| Lucide 图标和稳定教学对象 Icon 语义 | `ADOPTED` | 课件、作业、测验、录播、课程与班级跨页面保持相同对象识别 |

## 4. Linear 规则采纳

| Linear 设计基因 | 状态 | WorkBuddy 转译 |
|---|---|---|
| Shell 是稳定方向，不是视觉主角 | `ADOPTED` | 导航持续存在但降低权重，把注意力交给当前任务 |
| 列表保持、详情就近展开 | `ADAPTED` | 历史任务保持现场；当前 Run 或产物在相邻区域展开，复杂编辑可全屏 |
| 默认只显示识别和决策所需信息 | `ADOPTED` | 执行摘要默认可扫，底层工具调用按意图展开 |
| Hover/Context Menu 暴露低频操作 | `ADOPTED` | 历史条目 `…` 提供重命名、置顶、删除；Hover 不能是唯一入口 |
| 返回后恢复筛选、滚动和选中现场 | `ADOPTED` | 从产物、Skill、MCP 或管理页返回任务时恢复原 Run 与展开位置 |
| 低风险动作即时生效并提供 Undo | `ADAPTED` | 只用于可逆的本地 UI 操作；ClassIn 业务写回继续经过审批与回执 |
| 少边界、低噪中性色和重复节奏 | `ADOPTED` | 依靠排版、对齐、留白与状态面建立结构，不机械复制 Linear 皮肤 |
| 页面按任务选择结构而非机械三栏 | `ADOPTED` | 新建、运行、产物编辑、Skill 管理可采用不同工作区结构 |
| Linear 的 Workspace/Team/Project 组织模型 | `REJECTED` | 使用 ClassIn 机构、教师、班级、课程、单元和教学活动对象 |
| Linear 品牌、研发术语和具体皮肤 | `REJECTED` | 不复制颜色、Logo、术语或 Issue 属性模型 |

## 5. NineClaw 规则采纳

| NineClaw 规则 | 状态 | WorkBuddy 转译 |
|---|---|---|
| Task → Artifact 是中心闭环 | `ADOPTED` | 教师目标进入任务，任务交付可检查、可修改、可保存的产物 |
| 结构化补参 → 计划/执行 → 产物验证 | `ADOPTED` | 作为全部 Agent 任务的共享骨架 |
| 过程、工具调用与阶段性输入输出可追溯 | `ADOPTED` | 默认教师摘要 + 展开详情 + 高级技术明细三层表达 |
| Skill/MCP/内容/定时任务回流统一任务 | `ADOPTED` | 不拆成孤立工具体验；已知功能在第一版设计中均有去向 |
| 右侧产物预览、编辑、AI 修改和保存 | `ADOPTED` | 适配课件、课程方案包及其他 ClassIn Artifact 类型 |
| 原始命令、路径和大段 JSON 默认裸露 | `ADAPTED` | 能力和证据保留，默认折叠到高级执行详情，并增加安全边界 |
| 默认缺少 ClassIn 业务对象与 Context | `ADAPTED` | 通过 Core Context 四层结构补齐，不改变原任务闭环 |

## 6. Phase 1 Review 结论

1. ClassIn PC 一级主导航提供 `AI Agent` 入口；
2. AI Agent 使用对标 NineClaw 的扁平二级导航面板，默认展示近期任务，其余在任务 Section 内滚动查看；
3. Work Surface 采用 Run 主轴 + 单一活动辅助区；
4. 辅助区按意图切换 Artifact、Core Context 和执行详情；
5. 字体、语义绿色、4px 网格与 `0/4/6/8/16` 圆角层级升级为锁定设计规格；
6. Golden Samples 继续作为结构与视觉校准证据，不作为页面复刻模板。
