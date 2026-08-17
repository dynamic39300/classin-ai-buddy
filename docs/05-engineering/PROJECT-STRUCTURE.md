# WorkBuddy 工程目录规范

## 当前仓库结构

```text
classin-ai-buddy/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── docs/
│   ├── 00-project/                 # 目标、范围、决策台账
│   ├── 01-research/               # 一手研究和证据边界
│   ├── 02-product/                # 能力矩阵、对象和体验模型
│   ├── 03-design/                 # 原型与未来 UI 规范
│   ├── 04-specs/features/         # 可实现 Feature Spec
│   ├── 05-engineering/            # 工程、测试、AI 协作规范
│   ├── 06-architecture/           # Harness 与契约基线
│   └── 07-history/                # 阶段原稿、过程记录与会话追溯
├── apps/workbench/                # React/Vite 教师工作台与原型路由
├── apps/api/                      # 单一 API/BFF 和组合根
├── packages/                      # 领域、契约、Harness、Adapter、Fixture、UI
├── prototype/                     # 原型说明、评审记录和导出快照
├── tests/                         # 契约、领域、浏览器和视觉测试
├── scripts/                       # 可重复的本地命令
└── docs/01-research/source-notes/ # 研究底稿与外部证据
```

## Workspace 模块

```text
apps/
├── workbench/                     # Shell、页面、教师 Feature 和 UI Projection
└── api/                           # HTTP/SSE、组合根、鉴权入口
packages/
├── domain/                        # 纯领域对象、状态机和不变量
├── contracts/                     # Zod Schema、DTO 和事件信封
├── application/                   # 用例、Port 和事务边界
├── harness/                       # 五个深模块的协调 Interface
├── adapters/mock-classin/         # 模拟 ClassIn Adapter
├── fixtures/                      # 固定、脱敏、可重置的数据
└── ui/                            # 中性 Token 和工作台基础模式
```

## 依赖方向

```text
workbench -> ui + contracts
api -> application + harness + adapters
harness -> application + contracts + domain
adapters -> application ports + contracts + domain
domain/contracts -> no UI, browser, server or adapter dependency
```

`prototype/` 只保存说明、评审和导出快照。可运行原型位于 `apps/workbench` 的明确原型路由，数据通过 API/BFF 和 Mock Adapter 注入。真正变化点使用小 Interface 和可替换 Adapter，避免为假想扩展建立浅层包装。

## 文档与代码的对应

每个 Feature Spec 必须列出：目标、状态、Domain Object、Harness Module、Adapter Interface、真值标签、错误/恢复路径和验收命令。实现完成后只更新 Spec 和决策台账，不维护聊天中的第二份状态。
