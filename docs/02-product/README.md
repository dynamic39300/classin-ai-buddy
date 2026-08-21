# 产品设计索引

本层维护 WorkBuddy 终局能力、核心对象、用户任务、状态和能力覆盖矩阵。全局产品围绕作业到订正、备课演练到教学改进、诊断到个性化干预三条核心结果链组织；当前第一版高保真先深入课程生产基础链“课程目标到课程对象”，其余能力域通过入口、信息架构和建设状态表达。

下一项产品基线是全量能力覆盖矩阵，要求每项能力有入口、教师任务、Artifact、Harness Module、产品逻辑、业务规则、Domain Knowledge、业务数据/API、异常状态和建设阶段。

## 当前基线

- [教师 WorkBuddy 全量能力覆盖矩阵](./CAPABILITY-COVERAGE-MATRIX.md)：终局能力域到产品逻辑、知识、业务数据和 Harness 的映射。
- [WorkBuddy 核心业务闭环与能力优先矩阵](./CORE-BUSINESS-LOOP-PRIORITY-MATRIX.md)：全局业务时刻、单点/组合/闭环能力以及四条优先工程纵向切片。
- [教师 WorkBuddy AI 编排蓝图](./AI-ORCHESTRATION-BLUEPRINT.md)：从教师业务场景到 AI 流程、Skill、业务数据、Domain Knowledge、前端体验和评价的产品拆解基线。
- [WorkBuddy 业务场景产品设计框架](./SCENARIO-PRODUCT-DESIGN-FRAMEWORK.md)：用产品经理可理解的七个问题设计一条完整业务闭环的主框架。
- [WorkBuddy 业务场景产品设计附图模板](./SCENARIO-PRODUCT-DESIGN-DIAGRAMS.md)：与主框架关联的业务闭环、教师体验、对象关系和页面信息架构图模板。
- [WorkBuddy 业务场景产品设计附表模板](./SCENARIO-PRODUCT-DESIGN-TABLES.md)：与主框架关联的 AI 编排、对象权限、状态异常和评价表模板。

## 首条切片设计包

- [课程目标到课程对象整体产品方案设计](../04-specs/features/course-production/OVERALL-PRODUCT-SOLUTION-DESIGN.md)：七层产品方案、四图三表、版本边界和后续阶段入口。
- [课程目标到课程对象 Feature Spec](../04-specs/features/course-production/FEATURE-SPEC.md)：由已确认产品方案综合生成的可实现功能规格，当前待产品审阅。
- [课程目标到课程对象第一版产品设计](../04-specs/features/course-production/PRODUCT-DESIGN.md)：第一版可审教课程方案包的主设计。
- [课程目标到课程对象第一版产品设计附图](../04-specs/features/course-production/PRODUCT-DESIGN-DIAGRAMS.md)：业务闭环、状态、对象和页面结构。
- [课程目标到课程对象第一版产品设计附表](../04-specs/features/course-production/PRODUCT-DESIGN-TABLES.md)：AI 步骤、对象权限、状态异常和评价指标。

## 标杆产品还原规格

- [NineClaw 页面与交互还原规格包](./nineclaw-replication-spec/README.md)：把录屏、截图与 Skill 源码证据转换为页面地图、完整跳转、Agent 任务事件、页面级 PRD、状态矩阵、组件字段清单和待确认问题，作为 ClassIn redesign 前的详细中间层。

## ClassIn WorkBuddy V1 目标产品转换

- [WorkBuddy V1 目标产品转换包](./workbuddy-v1-target-blueprint/README.md)：将 NineClaw 的 38 个页面与覆盖层逐项映射到 ClassIn，定义 Core Context、单课件/课程方案包任务模型，并完成第一次架构扩展性检查；Phase 2 已审阅通过。
- [WorkBuddy V1 目标信息架构](./workbuddy-v1-target-blueprint/TARGET-INFORMATION-ARCHITECTURE.md)：定义 ClassIn Shell、AI Agent 二级菜单、Run Work Surface、能力/内容/触发渠道与业务入口的目标组织方式。
- [WorkBuddy V1 页面与交互详细规格包](../04-specs/features/workbuddy-v1-workspace/README.md)：43 个目标页面/覆盖层、布局、关键流程、页面级 PRD 和组件状态规格；Phase 3 已审阅通过，并修正为 ClassIn 一级主导航 + AI Agent 扁平二级导航面板。
