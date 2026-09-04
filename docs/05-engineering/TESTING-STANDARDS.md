# WorkBuddy 测试与验收规范

## 当前门禁

- `npm ci` 可从 lockfile 重建依赖，`npm run dev` 启动 Vite；
- `npm run typecheck` 与 `npm run lint` 通过；
- `npm run test` 覆盖 `tests/unit` 与 `tests/integration`；
- `npm run build` 生成可部署静态产物；
- `npm run test:e2e` 覆盖教师/学生关键旅程，`npm run test:visual` 覆盖关键页面；
- `npm run test:a11y` 覆盖带 `@a11y` 标记的浏览器用例；
- 固定 Mock 可重置，刷新不依赖外部服务；
- `1440x900` 无横向溢出、文本遮挡或不可达操作；
- 键盘 Tab 顺序、焦点可见且 `prefers-reduced-motion` 生效。

## 测试层级

- Unit：纯 Domain、selector、转换与不变量；
- Integration：Feature 与页面工作区在固定 Mock 下的状态和交互；
- E2E：从角色选择、导航到关键任务完成的可见旅程；
- Visual：只为稳定、可复现状态保存快照，默认以 `1440x900` 为 WorkBuddy 评审视口。

教师端与学生端用例分别建立 fixture，不依赖前一用例遗留的身份状态。WorkBuddy 至少覆盖：新建任务、结构化补参、运行中、需确认、失败恢复、完成待复查，以及扁平二级导航和历史任务操作。

迁移或继承旧基座时，先在源仓库复现失败。只有目标仓库新增或恶化的失败才记为迁移回归；源测试与源 UI 不一致应登记为基线缺口，不通过偷偷改产品文案掩盖。

## 生产阶段门禁

- 领域状态机与权限规则有单元测试；
- Adapter Interface 有成功、部分成功、权限拒绝、冲突、超时和恢复测试；
- 核心教师旅程有浏览器 E2E；
- UI 状态由 View Model 驱动，不直接读取 SDK 私有事件；
- 评价事件能关联 Run、ContextSnapshot、Artifact、Action、审批和业务回执；
- 视觉验收只在真实可复现状态上进行，不用固定延时掩盖异步问题。
