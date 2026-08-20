# ClassIn 教师 WorkBuddy

这是 ClassIn PC 教师/学生产品基座与教师 WorkBuddy 的统一设计、研究和实现仓库。当前代码保留既有 ClassIn PC Demo 的完整业务背景，并在教师端增加 AI Agent 工作台；首条 WorkBuddy 纵向切片是“课程目标到课程对象”。

## 当前入口

- Agent 规范：[AGENTS.md](./AGENTS.md)
- 项目简报：[docs/00-project/PROJECT-BRIEF.md](./docs/00-project/PROJECT-BRIEF.md)
- 决策台账：[docs/00-project/DECISION-LEDGER.md](./docs/00-project/DECISION-LEDGER.md)
- ClassIn PC 产品基座迁移方案：[docs/00-project/CLASSIN-PC-FOUNDATION-MIGRATION-PLAN.md](./docs/00-project/CLASSIN-PC-FOUNDATION-MIGRATION-PLAN.md)
- 目录与工程规范：[docs/05-engineering/PROJECT-STRUCTURE.md](./docs/05-engineering/PROJECT-STRUCTURE.md)
- 原型设计规范：[docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md](./docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md)
- 首条纵向切片 Spec：[docs/04-specs/features/course-production/SPEC.md](./docs/04-specs/features/course-production/SPEC.md)
- WorkBuddy V1 规格：[docs/04-specs/features/workbuddy-v1-workspace/](./docs/04-specs/features/workbuddy-v1-workspace/)

## 运行工作台

使用 Node.js 22+，按 lockfile 安装并启动：

```bash
npm ci
npm run dev
```

打开 `http://localhost:4173/`，先选择教师或学生视角。当前应用只使用本地固定数据，不连接真实 ClassIn 服务；AI 生成、业务写回和外部集成均不能视为生产可用。

常用质量命令：

```bash
npm run check
npm run build
npm run test:e2e
npm run test:visual
```

## 证据与历史文档

- 一手研究与证据：[docs/01-research/](./docs/01-research/)
- 阶段产出、过程记录与历史会话：[docs/07-history/](./docs/07-history/)

历史原稿保留原文，只作思想过程和来源追溯。当前可执行的结论以 `docs/00-project/`、`docs/02-product/`、`docs/04-specs/` 和 `docs/06-architecture/` 为准。
