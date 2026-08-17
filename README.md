# ClassIn 教师 WorkBuddy

这是 ClassIn 教师 WorkBuddy 的产品、Agent Harness 与原型验证仓库。当前阶段以“结构高保真、视觉低保真”的可操作线框原型和“课程目标到课程对象”纵向切片为中心。

## 当前入口

- Agent 规范：[AGENTS.md](./AGENTS.md)
- 项目简报：[docs/00-project/PROJECT-BRIEF.md](./docs/00-project/PROJECT-BRIEF.md)
- 决策台账：[docs/00-project/DECISION-LEDGER.md](./docs/00-project/DECISION-LEDGER.md)
- 目录与工程规范：[docs/05-engineering/PROJECT-STRUCTURE.md](./docs/05-engineering/PROJECT-STRUCTURE.md)
- 原型设计规范：[docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md](./docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md)
- 首条纵向切片 Spec：[docs/04-specs/features/course-production/SPEC.md](./docs/04-specs/features/course-production/SPEC.md)
- 原型目录：[prototype/wireframe-course-production/](./prototype/wireframe-course-production/)

## 运行工作台

安装 workspace 依赖并启动：

```bash
pnpm install
pnpm dev
```

然后打开 `http://localhost:4173/?variant=focus`。默认是面向教师的任务引导式体验；加入 `review=1` 可打开评审模式，查看方案视图、过程视图和异常状态。当前工作台只使用本地固定数据，不连接真实 ClassIn 服务。API/BFF 脚手架可用 `pnpm dev:api` 单独启动。

## 证据与历史文档

- 一手研究与证据：[docs/01-research/](./docs/01-research/)
- 阶段产出、过程记录与历史会话：[docs/07-history/](./docs/07-history/)

历史原稿保留原文，只作思想过程和来源追溯。当前可执行的结论以 `docs/00-project/`、`docs/02-product/`、`docs/04-specs/` 和 `docs/06-architecture/` 为准。
