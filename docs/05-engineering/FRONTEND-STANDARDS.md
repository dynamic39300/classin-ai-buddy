# WorkBuddy 前端技术规范

## 产品表面

前端是 WorkBuddy 状态的投影层，不是 Agent SDK、Graph 或 Workflow 私有事件的拼装器。所有页面只消费稳定 View Model，并通过 Command Interface 发送教师意图。

当前前端同时包含教师端和学生端页面树。AI Agent 是教师端一级入口；其内部是单层扁平二级导航。学生端不展示 WorkBuddy，两个角色页面不得跨树读取内部实现。

## 模块组织

- `app` 负责组合根、路由、Provider、Shell 和全局错误边界；
- `features` 表达教师可识别的任务或闭环；
- `domain` 表达纯状态、权限、不变量和转换；
- `design-system` 表达 Token、Primitive 和跨业务 Pattern；
- `adapters` 把 HTTP、MCP、流式事件或本地 Mock 转成稳定契约。

页面只组合 Feature，不拥有可复用业务规则。Module 只从公开出口被引用，不跨目录读取内部实现。

## 状态模型

- Server/Run 状态、领域状态、表单草稿和 UI 临时状态分开；
- Run、Artifact、Approval 和 Receipt 使用显式联合状态，不使用互相矛盾的布尔值；
- Derived state 通过纯函数或 selector 计算，不存储第二份；
- URL 可以保存可分享的选择和视图，不能保存敏感上下文原文；
- 页面刷新和重新进入应通过稳定 Run ID 恢复，不依赖聊天 DOM。

## UI Projection

前端统一投影：

- `RunViewModel`：当前目标、阶段、等待原因、允许命令；
- `ArtifactViewModel`：版本、来源、差异、校验和教师修改；
- `ContextViewModel`：来源、授权、缺口、冲突和真值等级；
- `ActionViewModel`：对象、风险、审批、执行状态和回执；
- `EvaluationViewModel`：质量、采纳、成本、异常和业务结果。

UI 不直接依赖模型供应商响应、MCP 结果或 A2A Task 结构。

## 设计系统与可访问性

- 使用语义 Token 表达颜色、间距、字号、圆角、阴影、z-index 和动效；
- 页面 Section 使用布局和留白，不将所有内容包装成悬浮卡片；
- 所有命令具备键盘入口、可见焦点和可读名称；
- Hover 不承担唯一行为；
- 正文与控件达到 WCAG 2.2 AA；
- 加载、空白、错误、权限、部分成功和恢复状态保持稳定尺寸；
- 支持 `prefers-reduced-motion`，不做无业务意义的动画。

## 数据边界

外部数据在 Adapter 入口校验。UI 只显示允许范围内的字段；日志、错误和调试面板不暴露学生敏感原文。真实写回必须展示目标对象、差异、风险和回执。

## 验证

生产阶段至少运行类型检查、Lint、单元/集成测试、Playwright E2E、axe 可访问性和关键视口截图。原型阶段采用同样的行为检查思想，但不为可抛弃代码建立生产抽象。
