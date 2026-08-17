# WorkBuddy 工程规范

## 技术基线

当前采用 `pnpm workspace`、React/Vite 工作台、单一 TypeScript API/BFF、Zod 契约和模块化单体。原型 UI 可以被替换，但 Domain、Contract、Port、Adapter 和架构测试保持 production-shaped。具体 Agent SDK、数据库和 Durable Runtime 仍需后续 ADR。

## Module 与 Interface

- Module 公开小而稳定的 Interface，复杂状态转换隐藏在 Implementation 内；
- 依赖由组合根注入，不在领域函数里创建 Adapter；
- 返回结构化结果，不在纯逻辑里直接操作 DOM、Toast、路由或全局 Store；
- 只有两个真实实现或明确替换需求时建立 Seam；
- 外部数据先校验，再进入领域模块；生产 TypeScript 使用 `strict`，禁止 `any`。

## 状态

Agent Run、Artifact、Approval 和 ExecutionReceipt 使用 discriminated union 或等价显式状态机。每个状态都要有进入条件、用户可见含义、允许命令和恢复路径。

## Mock 与 Adapter

Mock fixture 固定、可重置、带稳定 ID 和版本。Mock action 返回与未来真实 Adapter 一致的结果形状，并覆盖成功、部分成功、权限拒绝、冲突、超时和可恢复失败。

## UI

页面只编排布局、Feature 和设计系统 Pattern。业务规则下沉到 Module。所有颜色、间距、圆角、阴影和动效都通过 Token；原型可以使用 CSS 变量，禁止将散落的硬编码值当成设计系统。

## 质量

至少提供：原型启动检查、契约检查、关键状态操作检查和 `1440x900` 视觉检查。发现未验证能力时标记风险，不用截图美化掩盖行为缺口。
