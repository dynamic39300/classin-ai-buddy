---
title: WorkBuddy V1 Phase 3 Review 清单
status: REVIEWED_APPROVED
version: v0.2
date: 2026-08-20
---

# WorkBuddy V1 Phase 3 Review 清单

## 1. P0：进入原型前必须确认

| ID | 检查项 | 当前目标规格 | 您需要判断 |
|---|---|---|---|
| P3-01 | 全局 IA | ClassIn 一级主导航 + 嵌入 AI Agent 入口下的 NineClaw 式二级导航；新建、6 条历史、Skills、Tools、内容、定时、文件和设置保持扁平，无第三级菜单；右侧完整保留给 Work Surface | 用户完成 M3 验收后确认布局修订 |
| P3-02 | 我的文件 | AI Agent 保留快捷入口，但复用 ClassIn Space 的 WorkBuddy 筛选视图，不复制文件系统 | 是否确认复用 Space |
| P3-03 | Run 布局 | Run 主轴 + 一个活动辅助区；Artifact/Core Context/执行详情同位切换 | 是否符合预期工作方式 |
| P3-04 | 复杂编辑 | 轻预览在右侧；课件复杂编辑和多 Artifact 审阅进入 Focus Surface，并能返回现场 | 是否确认容器升级方式 |
| P3-05 | 两类课程任务 | 单课件与课程方案包分别完整；课件派生方案包创建关联新 Run | 页面链路是否完整 |
| P3-06 | 课程方案包 | 默认可包含课件、作业、测验、录播/视频和教学资料，教师执行前可增删 | 默认集合和可编辑性是否合理 |
| P3-07 | 业务写回 | Artifact → ProposedAction → Approval → ClassIn 校验 → Receipt；支持批量选择与逐项结果 | 审批粒度与部分成功是否合理 |
| P3-08 | 43 个页面 | 38 个 NineClaw 基线全部有去向，并新增 Context、Focus、审批、文件引用等 ClassIn 页面 | 是否存在不应独立成页或仍缺失的页面 |

## 2. P1：影响详细交互

| ID | 检查项 | 当前默认设计 |
|---|---|---|
| P3-09 | 布局尺寸 | 1440×900；220px 唯一左侧栏；48px Topbar；360-400px 默认活动区；中央 Run 不小于 560px |
| P3-10 | 近期任务 | 默认共可见 6 条，置顶优先，其余内部滚动；相对时间与 `…` 菜单 |
| P3-11 | Skill/Tool | 能力与资源区默认可折叠；普通教师不必手工选择；高级用户仍可管理和追踪 |
| P3-12 | 内容 | 内容广场完整保留；一键改编先进入任务草稿确认 Context，不立即执行 |
| P3-13 | 定时任务 | 每次触发标准 Run；业务写回仍可等待审批；Context 在触发时重新装配 |
| P3-14 | Context 修改 | 运行中更换主班级/课程先展示影响，再生成新 Snapshot 并 Replanning |
| P3-15 | 历史恢复 | 恢复 Run/滚动/面板/Artifact 版本；跨组织不加载另一组织敏感正文 |

## 3. P2：允许保持 OPEN

以下不阻塞结构/交互原型，可以继续用明确真值标签表达：

- 真实 ClassIn API、对象版本、权限粒度和生产冲突协议；
- PPT/DOCX/视频内嵌预览与真实文件生成质量；
- Domain Knowledge 的机构创建、审核、发布和继承流程；
- 外部消息具体渠道与 Scheduler 生产策略；
- “会员/积分”的最终 ClassIn 名称、购买主体、配额和交易闭环；
- 哪些第三方模型/Tool 可获得 `student_sensitive` Context。

## 4. 推荐回复方式

如果整体无问题，可直接确认“Phase 3 全部通过”。若有调整，只需按 `P3-01` 至 `P3-15` 标注修改内容；P2 项只有掌握新增事实时才需要补充。
