# ClassIn 教师 WorkBuddy 项目 Agent 规范

> 本文件是当前仓库的唯一 Agent 行为规范。开始研究、设计、编码、测试或整理文档前，先完整阅读本文件，再按任务触发条件读取被指向的文档。

## 1. 项目使命

在可运行的 ClassIn PC 产品基座内，把教师 WorkBuddy 从终局产品定义推进为可验证的产品、Harness 和工程纵向切片。当前首条切片是“课程目标到课程对象”，使用可重置的模拟 ClassIn 机构和模拟业务对象。

当前交付物分为三类：

- 产品与架构事实：`docs/00-project/`、`docs/02-product/`、`docs/06-architecture/`；
- 外部研究与证据：`docs/01-research/`；
- 可操作产品基座与未来生产代码：`src/`、`tests/`；
- 原型说明、评审记录和导出快照：`prototype/`。

当前代码同时承载教师端与学生端的可运行 PC Demo；WorkBuddy 只进入教师端。它用于结构、状态和交互验证，不伪装成生产服务或真实 ClassIn 集成。

## 2. 事实优先级

发生冲突时按以下顺序处理：

1. 用户当前任务中的明确要求；
2. `docs/00-project/DECISION-LEDGER.md` 中的 `LOCKED` 决策；
3. 已审阅的 Feature Spec；
4. 当前实现和自动化检查表达的行为；
5. `docs/01-research/` 的一手证据；
6. `docs/07-history/` 中的阶段原稿、历史讨论和会话导出。

发现冲突时记录差异并停止扩大范围，不把 `UNKNOWN` 改写成事实。

## 3. 上下文协议

按任务读取最小必要上下文：

1. 本文件；
2. `docs/00-project/PROJECT-BRIEF.md` 与 `DECISION-LEDGER.md`；
3. 目标模块的 Spec、原型说明或研究记录；
4. 目标实现和对应测试。

只有在研究、架构审计、项目复盘或用户明确要求时，才通过 `docs/07-history/README.md` 读取对应的历史文档。

## 4. 产品与架构不变量

- WorkBuddy 的教师入口是统一主 Agent 工作台，不要求教师选择内部 Agent、Skill、MCP 或模型；
- ClassIn 继续拥有教师、机构、课程、课堂、作业、消息和正式发布状态等领域事实；
- WorkBuddy 拥有 `WorkBuddyRun`、`ContextSnapshot`、`ArtifactDraft`、`CapabilityManifest`、`ProposedAction`、`Approval`、`ExecutionReceipt` 和评价事件；
- 产品逻辑、业务规则、Domain Knowledge、业务数据/API 以不同 Interface 拥有；
- 真实变化点建立 Seam，模拟和真实实现通过同一 Adapter Interface 替换；
- Agent 生成、审批、执行和评价是显式状态，不能靠多个互相矛盾的布尔值表达；
- 任何模拟结果、集成模拟和未来能力都必须有真值标签，不能暗示生产就绪。

模块设计统一使用以下词汇：Module、Interface、Seam、Adapter、Depth、Leverage、Locality。复杂逻辑隐藏在 Deep Module 内，页面只编排 Interface。

## 5. 工程工作流

每个变更遵循：

1. **Discover**：定位决策、Spec、研究、实现和测试；
2. **Scope**：写明本次改变、明确不改变和 Write Set；
3. **Specify**：复杂行为先更新 Feature Spec 或架构决策；
4. **Implement**：优先完成一条可复现的纵向闭环；
5. **Verify**：运行静态检查、契约检查和适用的浏览器/视觉验收；
6. **Record**：把结论写回唯一事实源，聊天不是事实源。

每一步必须有可检查的完成条件。发现用户已有修改时协作保留，不回滚或覆盖。

## 6. 目录与依赖

可运行应用位于仓库根目录的 `src/`，使用 npm、React、Vite 和 TypeScript；`prototype/` 只保存原型说明、评审记录和导出快照。教师端与学生端使用独立页面树，共享经过明确授权的 Domain、Feature 与 Design System。目标依赖方向为：

```text
app -> pages -> features -> domain
app -> features -> design-system
adapters/mocks -> domain/contracts
features -> design-system
domain/contracts -> no React, DOM or browser dependency
```

`domain` 不依赖 React、DOM、Mock 或具体 Adapter；`design-system` 不依赖业务 Feature；`mocks` 只实现已有 Interface。WorkBuddy 通过教师路由下的嵌套路由布局提供扁平二级导航，不给 AppShell 暴露 WorkBuddy 私有状态。

## 7. 原型规则

产品与原型设计规范见 `docs/03-design/PROTOTYPE-DESIGN-STANDARDS.md`，工程规则见 `docs/05-engineering/ENGINEERING-STANDARDS.md`。迁入的 ClassIn PC 基座保留已评审的现有视觉；新增 WorkBuddy 首先追求结构与交互高保真，并遵循当前 Token、可访问性和视觉规则，不自行创造第二套 Shell。

原型必须表达空白、生成中、需要补充、待确认、部分成功、权限拒绝、可恢复失败、完成待复查和撤销/过期状态中的适用部分。

## 8. 数据与安全

- 只使用脱敏、固定版本、可重置的模拟数据；
- 不提交真实学生信息、账号、Token、`.env` 或外部服务凭据；
- 不把学生事实、教师推断和机构规则写入无治理的长期记忆；
- 任何业务写回先变成 `ProposedAction`，经过策略、教师审批、领域校验和 `ExecutionReceipt`；
- 研究使用一手公开资料，产品营销页只能作为体验证据，不能推断未公开的 Harness。

## 9. 完成定义

任务只有同时满足以下条件才算完成：

- 变更符合锁定决策、Spec 和当前 Write Set；
- 核心、空、加载、错误、权限和恢复状态按范围处理；
- 应用可用 `npm run dev` 启动，且范围内关键交互可操作；
- 视觉验收无溢出、遮挡、不可达操作和未标注的模拟能力；
- 规范、目录和研究结果已写回仓库并可被后续 Agent 定位；
- 未验证内容和剩余风险已明确记录。

## 10. 触发式参考

- 修改 `AGENTS.md`、`CLAUDE.md` 或其他 Agent 消费文档：先读取 `writing-for-agents` 技能；
- 设计 Module、Interface、Seam 或 Adapter：读取 `codebase-design` 词汇和相关 Spec；
- 进行外部资料、GitHub、协议或框架调研：使用 `research` 技能并保留一手来源；
- 构建一次性 UI/状态原型：使用 `prototype` 技能；
- 修改既有 ClassIn PC 页面：读取 `docs/05-engineering/FRONTEND-STANDARDS.md`、目标 Feature 和对应测试；保持教师/学生路由边界。
