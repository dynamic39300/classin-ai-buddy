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
| D-008 | LOCKED | 使用 `pnpm workspace + TypeScript strict + 模块化单体` 建立 production-shaped prototype | 同时验证前端、API、共享契约、Harness 和模拟 Adapter 的边界 | React/Vite 工作台与单一 API/BFF；暂缓微服务和重型编排 |
| D-009 | LOCKED | 教师首屏采用任务引导式体验，默认隐藏 Harness 和业务系统术语 | 第一版让教师先理解系统再开始工作，产生焦虑和操作不确定性 | 默认路径只表达“说目标 → 看方案 → 确认保存”；工程状态进入评审模式或辅助信息 |

## 变更规则

修改 `LOCKED` 决策前先在本文件记录替代方案、证据、影响和用户确认状态。研究结果只能提出 `RECOMMENDATION`，不能静默升级为 `LOCKED`。
