# ADR-001: Workspace 与原型工程形状

- Status: accepted
- Date: 2026-08-16

## Context

WorkBuddy 当前需要线框原型验证产品结构，同时需要用“课程目标到课程对象”验证 Harness 契约。单 HTML 启动简单，但不能有效验证前后端共享 Schema、模拟/真实 Adapter 一致性、依赖方向和 API 组合根。

## Decision

采用 `pnpm workspace + TypeScript strict + 模块化单体`：

- `apps/workbench` 使用 React/Vite，承载明确标注的原型路由；
- `apps/api` 是单一 API/BFF 和服务端组合根；
- `packages` 承载 domain、contracts、application、harness、mock adapter、fixtures 和 UI；
- workspace 包只通过公开出口依赖；
- 当前使用确定性 Mock Adapter，不连接真实 ClassIn 或真实模型；
- 使用架构检查约束依赖方向。

## Alternatives

1. 单 HTML/CSS/JS：更快，但无法验证工程契约和 Adapter Seam；
2. 单一 React 应用：能验证 UI，后端和共享契约仍是隐含假设；
3. Nx/Turborepo：当前包和任务数量不足以抵消治理成本；
4. 微服务：没有独立部署、扩缩容或组织所有权证据。

## Consequences

- 初始脚手架成本高于单页原型；
- 原型 UI 可以丢弃，但契约、Fixture、架构检查和 Adapter conformance 可以延续；
- 未来引入 Agent SDK、Temporal、MCP 或 A2A 时必须位于现有 Interface 后；
- 当包数量和 CI 任务明显增加时再评估 Turborepo 或 Nx。

## Verification

`pnpm check` 必须通过；`apps/workbench` 不得直接依赖 Adapter 或模型 SDK；Mock ClassIn 只能在 API 组合根注入。

