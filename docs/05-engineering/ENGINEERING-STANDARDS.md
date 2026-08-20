# WorkBuddy 工程规范

## 技术基线

当前采用 npm 单应用、React 19、Vite 8、TypeScript strict 和 React Router。仓库同时承载教师端与学生端页面树；WorkBuddy 只进入教师端。前端基座可运行，但数据仍是固定 Mock，不代表真实 ClassIn 集成。未来 API/BFF、Agent SDK、数据库、Durable Runtime 和 Zod 契约需按 Feature Spec 与后续 ADR 引入，不提前制造空壳架构。

## Module 与 Interface

- Module 公开小而稳定的 Interface，复杂状态转换隐藏在 Implementation 内；
- 依赖由组合根注入，不在领域函数里创建 Adapter；
- 返回结构化结果，不在纯逻辑里直接操作 DOM、Toast、路由或全局 Store；
- 只有两个真实实现或明确替换需求时建立 Seam；
- 外部数据先校验，再进入领域模块；生产 TypeScript 使用 `strict`，禁止 `any`；
- 教师页面不能导入学生页面内部实现，学生页面也不能导入教师页面内部实现；跨角色复用下沉到公开 Feature、Domain 或 Design System 出口；
- AppShell 只暴露稳定布局与导航能力，WorkBuddy 二级导航由教师路由下的嵌套 Layout 组合。

## 状态

Agent Run、Artifact、Approval 和 ExecutionReceipt 使用 discriminated union 或等价显式状态机。每个状态都要有进入条件、用户可见含义、允许命令和恢复路径。

## Mock 与 Adapter

Mock fixture 固定、可重置、带稳定 ID 和版本。Mock action 返回与未来真实 Adapter 一致的结果形状，并覆盖成功、部分成功、权限拒绝、冲突、超时和可恢复失败。

## UI

页面只编排布局、Feature 和设计系统 Pattern。业务规则下沉到 Module。所有颜色、间距、圆角、阴影和动效优先复用 `tokens.css` 与既有语义 Token；禁止为 WorkBuddy 复制一套 Shell 或把散落硬编码值当成设计系统。

## 质量

每个变更至少运行与范围匹配的 `npm run typecheck`、`npm run lint`、Vitest、Playwright E2E 与 `1440x900` 视觉检查。全量基线使用 `npm run check` 与 `npm run build`。测试失败必须区分“迁入源基线缺口”和“本次回归”；发现未验证能力时标记风险，不用截图美化掩盖行为缺口。
