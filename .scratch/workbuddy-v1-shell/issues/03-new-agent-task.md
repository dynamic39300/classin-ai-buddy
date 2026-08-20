# 03 — 交付新建 Agent 任务闭环

**What to build:** 教师可以在 AI Agent 中从自然语言目标、结构化 Core Context 和已确认的任务类型开始一个本地 Demo 任务，并清楚理解尚未连接真实 Agent。

**Blocked by:** 02 — 交付教师 AI Agent 两级导航闭环。

**Status:** completed

- [x] 新建任务页具有唯一 Goal Composer 主行动、附件入口与明确空状态。
- [x] Core Context 摘要以班级、课程和单元等结构化 ClassIn 对象呈现。
- [x] “生成单个课件”和“生成课程方案包”保持两个独立快捷任务类型。
- [x] 快捷任务可预填目标，空目标不能创建任务。
- [x] 所有提交、附件和 Context 操作明确标注本地 Demo 真值，不调用真实 AI、上传或业务 API。
- [x] 键盘、焦点、可访问名称和 1440×900 布局通过验收。
