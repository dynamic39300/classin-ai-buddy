# Test Layout

- `unit/`：跨模块纯逻辑测试；模块内测试优先与源码共置。
- `integration/`：页面、路由、Store 与 Mock Adapter 的联合行为。
- `e2e/`：Playwright 核心用户旅程。
- `visual/`：固定视口截图、布局与无障碍验收。

测试策略和质量门禁见 `docs/05-engineering/TESTING-STANDARDS.md`。
