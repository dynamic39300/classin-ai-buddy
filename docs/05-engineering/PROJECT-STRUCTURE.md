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
├── src/
│   ├── app/                       # 组合根、路由、Provider 与全局 Shell
│   ├── pages/teacher/             # 教师端页面树，包含 WorkBuddy 入口
│   ├── pages/student/             # 学生端页面树
│   ├── features/                  # 可识别的业务工作区与 WorkBuddy Feature
│   ├── domain/                    # 纯领域对象、状态与不变量
│   ├── contracts/                 # 稳定 View Model 与 Adapter/Feature 共享契约
│   ├── design-system/             # Token、Primitive 与跨业务 Pattern
│   ├── mocks/                     # 固定、脱敏、可重置的场景数据
│   └── shared/                    # 无业务归属的轻量共享能力
├── prototype/                     # 原型说明、评审记录和导出快照
├── tests/                         # unit、integration、e2e 与 visual 测试
├── public/                        # 静态资源
├── package.json                   # npm 命令与依赖唯一入口
├── tokens.css                     # 全局语义 Token
└── docs/01-research/source-notes/ # 研究底稿与外部证据
```

## 应用模块

```text
app -> pages -> features -> domain
app -> pages/features -> design-system
app/features/mocks -> contracts
mocks/adapters -> public domain/contracts interfaces
domain/contracts -> no React, DOM, browser or concrete adapter dependency
```

教师和学生页面树不互相引用。可复用能力只能通过公开 Feature、Domain 或 Design System 下沉。页面不跨目录读取 Feature 内部文件。

## WorkBuddy 放置规则

```text
src/pages/teacher/                 # 教师 AI Agent 页面入口
src/features/ai-agent-workspace/   # 扁平二级导航与任务工作台投影
src/domain/workbuddy/              # Run、Context、Artifact、Action 等纯模型
src/contracts/workbuddy/           # Run/Artifact UI Projection 契约
src/mocks/scenarios/               # 固定 WorkBuddy 场景与任务历史
```

AI Agent 是 ClassIn PC 教师端一级菜单；进入后只出现一层 NineClaw 风格的扁平二级导航。任务历史属于该二级导航的一部分，不形成第三级菜单。未来真实 API/BFF 与 Agent Harness 通过明确 Interface/Adapter 接入，当前不与 Mock 形状耦合。

## 文档与代码的对应

每个 Feature Spec 必须列出：目标、状态、Domain Object、Harness Module、Adapter Interface、真值标签、错误/恢复路径和验收命令。实现完成后只更新 Spec、决策台账和迁移/实施清单，不维护聊天中的第二份状态。
