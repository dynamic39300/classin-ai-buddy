# Source Layout

业务代码按以下模块组织：

- `app/`：组合根、Provider、Router、角色化 Shell 和启动配置。
- `design-system/`：Token、基础控件、布局原语和可访问性行为。
- `domain/`：纯 TypeScript 领域模型、状态解析、权限和排序。
- `features/`：可独立完成的业务动作与纵向功能切片。
- `pages/`：`teacher/`、`student/`、`shared/` 三棵页面目录。
- `mocks/`：Fixture、Scenario 和领域接口的 Mock Adapter。
- `shared/`：无业务归属的基础工具；不得成为杂物目录。

详细依赖与命名规则见 `docs/05-engineering/PROJECT-STRUCTURE.md`。
