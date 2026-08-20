---
title: ClassIn PC 产品基座迁移方案
status: M3_COMPLETE
version: v0.3
date: 2026-08-20
source_repository: /Users/eeo/Documents/claudecode/classin-pc-optimizer
source_commit: ff5dfa0f332f4a937aa6faa8b2b88a0313858a8c
---

# ClassIn PC 产品基座迁移方案

## 1. 结论

建议迁入 `classin-pc-optimizer` 的**完整可运行产品基座**，再把 WorkBuddy 作为老师页面树中的 AI Agent 纵向 Feature 接入。这样可以真实继承 ClassIn 的身份、组织、导航、班级、课程表、待办、空间、洞察、设计系统和返回现场，而不是为 Agent 页面伪造一圈 Placeholder Shell。

不建议把源仓库逐字节整体复制。源仓库当前有 986 个 Git 跟踪文件、约 402MB；其中 `docs/` 约 172.7MB、`reference/` 约 218.9MB，而真正产品代码 `src/` 为 223 个文件、约 1.3MB，测试为 131 个文件、约 8.7MB。全量镜像会重复证据、覆盖当前事实源，并把历史、截图和源项目规则混入 WorkBuddy。

因此“全都搬过来”的准确含义应是：**产品运行闭环、工程规则和验证能力完整迁移；证据库、缓存和冲突事实源不迁移。**

## 2. 为什么体验会更完整

| 只做独立 Agent 页面 | 迁入 ClassIn PC 基座后 |
|---|---|
| 身份、组织和一级导航是静态壳 | 使用现有 AppShell、账户、角色和组织体验 |
| 班级/课程/Space Context 只能伪造入口 | 可以从真实 Demo 页面和稳定 Mock 对象发起 Run |
| 返回现场依赖手写跳转 | 复用现有 Router、Deep Link 和页面状态恢复 |
| Agent 的视觉容易与 ClassIn 脱节 | 直接继承 Token、排版、侧栏、Topbar 与交互 Pattern |
| 只能验证 Agent 单页 | 可以验证“ClassIn 对象 → Agent → Artifact → 返回对象”的整条体验 |
| 其他页面只做空 Placeholder | 保留已有老师/学生完整高保真 Demo 作为全局背景 |

## 3. 迁移范围

### 3.1 `ADOPT`：迁入并成为当前运行基座

| 来源 | 目标 | 说明 |
|---|---|---|
| `src/` | `src/` | App Shell、Router、两棵角色页面树、Domain、Features、Design System、Mocks |
| `public/` | `public/` | Manifest 与品牌静态资产 |
| `tests/` | `tests/` | Unit/Integration/E2E/Visual 与现有视觉基线 |
| `index.html` | 根目录 | Vite 入口 |
| `package.json` + `package-lock.json` | 根目录 | 单应用 npm 工具链与确定依赖 |
| `vite.config.ts` | 根目录 | Alias、Vitest 和 4173 端口 |
| `tsconfig*.json` | 根目录 | TypeScript strict 与路径别名 |
| `eslint.config.js` | 根目录 | Lint 规则 |
| `playwright.config.ts` | 根目录 | E2E/Visual 环境 |
| `.editorconfig` | 根目录 | 基础编辑约定 |
| `tokens.css` | 根目录或迁入 Design System Token | 先保持兼容，再在单一事实源中收敛 |

### 3.2 `ADAPT`：吸收原则，不覆盖当前文件

| 来源 | 处理 |
|---|---|
| 源 `AGENTS.md` | 将角色页面隔离、单应用依赖方向、代码质量与测试门禁合并到当前 WorkBuddy `AGENTS.md`；当前项目使命和事实优先级继续拥有 |
| 源 `CLAUDE.md` | 保持当前“只指向 AGENTS.md”的最小指针，不复制源规则正文 |
| 源 `docs/05-engineering/*.md` | 与当前 WorkBuddy 前端/后端/Harness 规范整合，消除 `pnpm workspace` 与单应用结构冲突 |
| 源 `docs/03-design/PC-DESIGN-SYSTEM.md` | 作为 ClassIn 设计系统基线吸收；WorkBuddy 已锁定的 Linear/NineClaw 转译继续作为增量规范 |
| 源 `CONTEXT.md` | 只迁入当前 WorkBuddy 领域词典缺少且无冲突的 ClassIn 术语，不覆盖现有 Core Context/Run/Artifact 语言 |

### 3.3 `REFERENCE_ONLY`：当前已有证据则不重复

- ClassIn Product DNA、PC Design System 和 Linear 研究已在 `docs/03-design/workbuddy-v1/source-materials/` 保存只读快照；
- Phase 2 Core Context 已直接引用 `classin-pc-optimizer` 的班级、课程、课程表、待办、空间和洞察事实；
- 需要补充源码溯源时，以迁移清单记录源 commit，不再复制一套历史研究目录。

### 3.4 `EXCLUDE`：不迁入

- `.git/`、`node_modules/`、`dist/`、`coverage/`、`playwright-report/`；
- `.scratch/`、`.pnpm-store/`、本地工具缓存和 `.DS_Store`；
- 源 `reference/`、研究截图、历史 sessions 和演示 Deck；
- 源 `docs/00-project/` 至 `docs/04-specs/` 的整库镜像；
- 源 `README.md`、Decision Ledger 和项目使命；
- `pnpm-lock.yaml`：源项目已采用 npm 脚本和 `package-lock.json`，迁移后只保留一个包管理器事实源；
- 任何真实账号、Token、`.env` 或学生数据。

## 4. 目标代码结构

在第二个真实可部署应用出现前，采用源项目的单 Vite 应用结构：

```text
classin-ai-buddy/
├── src/
│   ├── app/
│   │   ├── router/
│   │   └── shell/
│   ├── design-system/
│   ├── domain/
│   │   ├── existing-classin-domains/
│   │   └── workbuddy/                 # Run、Context、Artifact、Action 纯领域状态
│   ├── features/
│   │   ├── existing-classin-features/
│   │   └── ai-agent-workspace/        # WorkBuddy 纵向 Feature
│   ├── pages/
│   │   ├── teacher/
│   │   │   └── TeacherAiAgentPage.tsx
│   │   ├── student/
│   │   └── shared/
│   ├── mocks/
│   │   └── scenarios/workbuddy.ts
│   └── shared/
├── tests/
├── docs/
├── prototype/
└── root build configs
```

WorkBuddy 作为老师侧 Feature 接入，不创建一套平行的 ClassIn Shell，也不在一个页面里用大量角色条件拼老师/学生产品。

## 5. Module、Interface 与 Seam

### 5.1 复用的深 Module

- `app/shell`：ClassIn 一级主导航、身份、账户、Topbar 和操作保护；
- `domain/*`：班级、课程表、任务、消息、空间和教学对象事实；
- `features/*-workspace`：现有页面业务闭环；
- `design-system`：语义 Token、教学对象图标和基础 Pattern。

### 5.2 WorkBuddy 新 Module

- `domain/workbuddy`：Run、ContextSnapshot、Artifact、Action、Approval、Receipt 状态与不变量；
- `features/ai-agent-workspace`：二级导航、Run Work Surface、活动辅助区与命令编排；
- `mocks/scenarios/workbuddy`：固定、脱敏、可重置的运行场景；
- 后续真实 AI/Harness 只在出现第二个 Adapter 时建立对应 Seam。

### 5.3 Shell Interface 增量

现有 AppShell 不应被 WorkBuddy 页面复制。它只需要深化一个小 Interface：

```text
route selects AI Agent
  → Shell renders AgentSecondaryNav slot
  → Work Surface renders current Agent route
  → leaving route preserves/guards current Run UI state
```

复杂的任务历史、能力入口和导航状态留在 `ai-agent-workspace` Implementation 内，不扩大所有 ClassIn 页面必须理解的 Shell Interface。

## 6. 需要替换的旧工程决策

当前仓库 D-008 和工程文档仍描述已经删除的 `pnpm workspace + apps/workbench + apps/api + packages/*`。迁入 PC 基座后应由新决策替换为：

- 当前阶段只有一个真实可运行 PC Web/PWA 交付物，采用单应用 npm + Vite；
- WorkBuddy 前端 Module 与 ClassIn 页面共处一个依赖图；
- API/BFF、Durable Workflow 或独立 Harness 只有在真实第二交付物/运行时进入实施时再建立；
- 后端架构 Spec 继续保留，不因前端单应用而降级或删除。

该替换需在迁移开始前写入 Decision Ledger，避免配置和文档同时宣称两套工程事实。

## 7. 实施阶段

### M0：迁移前快照

- 记录源 commit、文件 Manifest、目标 Write Set 和排除项；
- 确认源仓库 clean；
- 确认当前 WorkBuddy 文档和用户删除的旧 Demo 不被恢复。

完成标准：迁移对象可逐项追溯，目标没有未解决覆盖冲突。

### M1：导入可运行 ClassIn PC 基座

- 迁入运行代码、配置、静态资产与测试；
- 安装 npm 依赖；
- 保持源行为不变；
- 运行 typecheck、lint、unit/integration、关键 E2E 和 1440×900 Shell Visual。

完成标准：ClassIn PC 全局 Demo 在当前仓库可用一条命令运行，验证结果与源基线一致。

### M2：规范与目录收敛

- 合并 AGENTS、CLAUDE 指针、工程/测试/目录规范；
- 更新 README、PROJECT-STRUCTURE、Decision Ledger；
- 添加架构依赖检查，禁止跨角色与深路径越界。

完成标准：运行环境与文档只有一套事实，不同时宣称 npm 单应用和 pnpm workspace。

### M3：AI Agent Shell 纵向切片

- 在老师一级导航加入 AI Agent 入口；
- 实现 NineClaw 式扁平二级导航面板；
- 其他 ClassIn 页面保持现有完整 Demo；
- AI Agent 主区先挂载结构高保真的 New Task / Run / Active Panel 骨架。

完成标准：可从老师工作台进入 AI Agent、切换两级导航、打开六条历史、返回 ClassIn 页面并恢复现场。

### M4：按已审阅 PRD 实现 Agent 页面

- 逐条实现单课件和课程方案包链；
- 接入 Core Context、过程、Artifact、Action/Receipt 的可重置场景；
- 进入 Phase 4 原型 Review。

## 8. 风险与处理

| 风险 | 处理 |
|---|---|
| 直接覆盖当前 AGENTS/文档 | 使用合并与上下文指针；当前 WorkBuddy 事实优先 |
| 两种包管理器/目录并存 | 迁移门禁前锁定 npm 单应用并替换 D-008 |
| 把 ClassIn PC Demo 当生产系统 | 保留 Placeholder/Mock 真值标签 |
| 视觉基线大量回归 | M1 先保持源行为，M3 再单独加入 Agent |
| WorkBuddy 逻辑散入 Shell | 只新增二级导航 Slot，复杂 Implementation 留在 Feature Module |
| 以后需要后端时返工 | 保留 Domain/Harness Interface；第二个真实运行时出现再建立部署 Seam |

## 9. 已确认的迁移决策

1. 是否按本方案迁入“完整可运行产品基座”，而不是复制源仓库全部 402MB；
2. 是否确认当前 PC 前端采用单应用 npm + Vite，替换已删除的 pnpm workspace D-008；
3. 是否保留源项目老师端和学生端全部高保真页面及测试，AI Agent 只先在老师端落地；
4. 是否同意源 `AGENTS.md` 与工程规范采用“合并吸收”，不覆盖当前 WorkBuddy 项目使命和领域规则；
5. 是否按 M0 → M1 → M2 → M3 → M4 分阶段迁移并在 M1/M3 各设置一次 Review Gate。

2026-08-20，用户确认以上五项，授权按本方案执行。M0、M1、M2 与 M3 均已完成并通过双轴 Review Gate；下一阶段从 M4 的独立 Feature Spec/Tickets 开始，不在 M3 Shell 提交中暗接真实 Agent 或业务写回。
