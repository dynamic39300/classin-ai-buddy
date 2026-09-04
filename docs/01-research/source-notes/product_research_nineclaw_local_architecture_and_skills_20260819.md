---
title: NineClaw（九章龙虾）本地架构与 Skill 资产设计研究
status: RESEARCHED
date: 2026-08-19
scope: macOS NineClaw 1.0.21（build 1.0.21.139）本地安装实例
truth_label: 本地安装包与运行实例逆向观察，不代表官方公开架构承诺
---

# NineClaw（九章龙虾）本地架构与 Skill 资产设计研究

## 1. 结论摘要

NineClaw 1.0.21 是一个 Electron 桌面壳，前端由远程页面承载，桌面主进程负责本地 Agent Harness：会话、消息、权限、附件、Skill、MCP、记忆、定时任务、IM 网关、本地/沙箱执行和遥测。核心 Agent 运行时不是自研推理循环，而是随包分发的 `@anthropic-ai/claude-agent-sdk` 与平台二进制；本机日志显示其以 Claude Code 兼容协议启动，但模型字段为 `glm-5.1`，说明模型供应与 Agent Harness 已解耦。

Skill 资产采用四层分发：

```text
应用包内置源 Resources/SKILLs
        ↓ 启动同步、版本修复
用户数据主副本 ~/Library/Application Support/NineClaw/SKILLs
        ↓ 启用状态过滤、符号链接
工作区 .claude/skills
        ↓ settingSources=project
Claude Agent SDK 自动发现和按描述触发
```

这一设计最值得 WorkBuddy 借鉴的不是 `SKILL.md` 文件格式本身，而是“资产源、运行时副本、工作区投影、会话选择”相互分离。不过 NineClaw 当前仍把业务方法、工具说明、脚本依赖、密钥配置和 Agent 自修改能力放在同一 Skill 边界内；对于 ClassIn 的受治理业务写回，这个边界不够严格，不能直接照搬。

## 2. 研究范围与证据

用户指定的仓库目录 `reference/九章龙虾/` 在研究时为空。实际安装与运行资料位于：

- 应用安装包：`/Applications/NineClaw.app`；
- 应用运行数据：`/Users/eeo/Library/Application Support/NineClaw`；
- 默认教师工作区：`/Users/eeo/nineclaw/我的文件`；
- 安装镜像：`/Users/eeo/Downloads/NineClaw-1.0.21-darwin-arm64.dmg`。

本文只读取本机的一手制品：应用 `Info.plist`、`app.asar`、bundled/runtime Skill、SQLite schema、系统提示词和脱敏后的运行日志。没有把反编译产物或第三方专有 Skill 全量复制进仓库。

版本证据：`/Applications/NineClaw.app/Contents/Info.plist` 的 `CFBundleShortVersionString=1.0.21`、`CFBundleVersion=1.0.21.139`、`CFBundleIdentifier=com.nineclaw.app`；`app.asar/package.json` 的包名为 `@nineclaw/electron`，版本为 `1.0.21`。

## 3. 本地目录分层

### 3.1 安装层

```text
/Applications/NineClaw.app/Contents/Resources/
├── app.asar                       # Electron 主进程、preload、内嵌编辑器和依赖
├── app.asar.unpacked/
│   └── node_modules/
│       ├── @anthropic-ai/claude-agent-sdk
│       ├── @anthropic-ai/claude-agent-sdk-darwin-arm64/claude
│       ├── better-sqlite3
│       ├── playwright
│       └── npm
└── SKILLs/                        # 随安装包发布的官方 Skill 源
    ├── skills.config.json
    ├── docx/
    ├── frontend-design/
    ├── oss-image-upload/
    ├── pdf/
    ├── pptx/
    ├── subject-expert/
    ├── vision/
    └── xlsx/
```

`app.asar` 中可恢复的源码模块标记显示它原本是模块化 TypeScript 工程的打包产物，而不是单文件手写程序。主要模块簇包括：

- `bootstrap/` 与 `lifecycle/`：应用初始化、代理、日志、窗口和生命周期；
- `window-manager/` 与 `ipc-handlers/`：Electron BrowserWindow、preload 边界、桌面能力 IPC；
- `cowork-runner/`：上下文构建、提示词、权限、安全策略、事件流、本地/沙箱执行器、附件和 MCP；
- `skill-manager/`：Skill 加载、同步、安装、状态、脚本服务与依赖；
- `store/`：SQLite 会话、消息、配置、记忆、定时任务、MCP 和 IM 映射；
- `scheduler/`、`im/`、`cloud/`：定时运行、多 IM 渠道、备份恢复；
- `llm/`、`proxy/`、`telemetry/`：模型接口适配、协议转换和观测。

### 3.2 用户数据层

```text
~/Library/Application Support/NineClaw/
├── nineclaw.sqlite                # 产品状态与会话主库
├── SKILLs/                        # 可修改、可增删、可升级的运行时 Skill 主副本
├── logs/cowork.log                # Harness 运行日志
├── memory/                        # 记忆文件区
└── Electron caches/session data
```

SQLite schema 清楚表达了产品对象：`cowork_sessions`、`cowork_messages`、`cowork_config`、`user_memories`、`scheduled_tasks`、`scheduled_task_runs`、`mcp_servers`、`im_config`、`im_session_mappings`。其中 `cowork_sessions.active_skill_ids` 是 JSON 文本，说明 Skill 既有全局启用态，也有会话级选择态。

### 3.3 教师工作区层

```text
~/nineclaw/我的文件/
├── AGENT_SYSTEM_PROMPT.md
├── .claude/skills/                # 指向用户数据 Skill 主副本的符号链接
├── .cowork-temp/                  # 执行缓存
└── 教师输入与 Agent 生成的文件
```

本机 `.claude/skills/*` 均为符号链接，例如 `docx -> ~/Library/Application Support/NineClaw/SKILLs/docx`。这让 SDK 使用标准项目级发现机制，同时避免每个工作区复制大体积脚本和依赖。Windows 不支持同样的链接策略时，代码会递归复制并写 marker，但跳过 `node_modules` 和隐藏目录。

## 4. 核心代码逻辑

### 4.1 UI 与本地 Harness 的边界

主进程用 `BrowserWindow` 加载配置中的 `VITE_RENDERER_URL`，并通过 preload/IPC 暴露会话、文件、Skill、MCP、定时任务、IM、云备份和 HTML 预览能力。安装包没有完整业务前端源码，只有 preload 与独立 editor 静态资源；因此本次能确认本地 Harness 结构，不能把远程 Web UI 的内部模块结构当作已观察事实。

### 4.2 一次 Agent 运行的链路

```text
Renderer 发起 cowork:session:start / continue
  → IPC 校验输入并解析会话 cwd
  → SkillManager.syncSkillsToWorkingDir(cwd)
  → 构建 RunContext（历史、附件、系统提示词、权限、安全策略、环境）
  → ExecutorFactory 按 execution_mode 选择 Local 或 Sandbox
  → 本地执行器启动随包 Claude Code 二进制
  → 注入 SKILLS_ROOT、MCP（memory/session/skill）及模型网关配置
  → SDK 从项目 .claude/skills 发现 Skill
  → 流式事件经 dispatcher 写 SQLite，并通过 IPC 推送 Renderer
```

本机日志直接记录了 `--setting-sources=project`、cwd 为教师工作区、`SKILLS_ROOT` 指向用户数据层，以及 SDK init 返回的 tools、skills、MCP servers、模型和 token 信息。默认 `maxTurns=200`，体现的是长程执行 Harness，而非单轮聊天封装。

### 4.3 本地与沙箱执行

执行器有 `local` 和 `sandbox` 两条路径。沙箱侧包含 QEMU 运行时、镜像下载、9p workspace/skill mount、宿主到 guest 路径映射、Skill 文件收集和推送；本地侧直接启动平台 Claude Code 二进制。两条路径共享 RunContext、事件格式和 Skill 语义，这是一个有价值的 Adapter seam。

## 5. Skill 资产模型

### 5.1 最小契约

一个合法 Skill 的最小结构是 `<skill-id>/SKILL.md`。目录名是稳定的 ASCII ID；`SKILL.md` YAML frontmatter 支持：

```yaml
---
name: 展示名
description: 自然语言触发条件
version: 1.0.0       # 可选
official: true       # 可选，也兼容 isOfficial
license: ...         # schema 可接受的附加字段
---
```

正文被作为 `prompt`，frontmatter 解析失败时会降级：名称取目录名，描述取正文首个非空标题/文本。因此运行时契约宽松、作者体验友好，但也意味着缺少严格发布校验时容易产生质量漂移。

### 5.2 资产组合模式

本机 11 个运行时 Skill 呈现四种组合：

| 类型 | 例子 | 结构作用 |
|---|---|---|
| 纯指令 | `brainstorming`、`frontend-design` | 只用 `SKILL.md` 改变方法和质量标准 |
| 领域知识包 | `subject-expert` | `SKILL.md + references/`，按学科延迟读取知识 |
| 业务产物包 | `homework-generator`、`teacher-lesson-plan-assistant` | 工作流 + references + assets，定义教师产物规范与模板 |
| 工具执行包 | `docx`、`pdf`、`pptx`、`vision`、`oss-image-upload` | 指令 + scripts/package/runtime，能够实际读写文件或调用服务 |

资产规模也反映这种差异：`docx` 64 个文件/17 个 scripts，`pptx` 58/13，`pdf` 12/8；`subject-expert` 有 8 个 reference 文件而无脚本；两个教师业务 Skill 各自带 5 个 reference 和 1 个 asset。

### 5.3 发现、启停与选择

`SkillLoader` 扫描根目录的直接子目录，只接受含 `SKILL.md` 的目录。`SkillManager` 把启停态保存在 SQLite KV 的 `skills_state`，默认启用；`listSkills()` 合并 bundled 标识、运行时目录、启用态和版本。应用还提供 `skills:list`、`skills:setEnabled`、`skills:delete`、`skills:download`、`skills:getConfig`、`skills:setConfig` 等 IPC。

触发分两层：产品 UI/会话可通过 `active_skill_ids` 做显式选择，Runner 会把选择转换为 `/skill-id` 前缀拼入用户请求；进入 SDK 后，Skill 的 `description` 又充当自然语言路由提示。前缀本质上仍是 SDK 指令/提示，不是策略引擎层面的确定性授权。运行日志中的 `skills` 与 slash commands 列表随安装/启用变化，验证了发现结果会进入 Agent 初始化协议。

### 5.4 发布、升级与修复

启动时，bundled Skill 从应用包同步到用户数据目录：

- 目标不存在时复制；
- bundled `version` 高于运行时版本时清理后重装；
- runtime health check 失败时修复；
- 干净覆盖时保留目标 `.env`；
- 每次覆盖 `skills.config.json`；
- 非 bundled Skill 保留在用户数据目录。

下载入口支持本地目录、单个 `SKILL.md`、zip、远程 zip、GitHub `owner/repo`、仓库 URL 或仓库子路径。安装时会规范化目录名并做 root containment 检查。

### 5.5 Skill 的可执行环境

工具型 Skill 不只是提示词。Skill Manager 会：

- 构造包含用户 shell PATH 的执行环境；
- 注入 `SKILLS_ROOT` 与 Electron/Node/Python runtime 路径；
- 检查并安装 npm/Python 等依赖；
- 带 timeout 执行脚本并收集 stdout/stderr；
- 为部分官方 Skill 注入服务配置和凭据；
- 在本地和沙箱之间映射相同的 Skill 文件。

这说明 NineClaw 的 Skill 实际上是“提示词 + 知识 + 模板 + 可执行代码 + 配置”的部署单元，而不只是 prompt snippet。

### 5.6 Agent 自维护 Skill

系统内置 `mcp__skill__skill_manage`，允许 Agent 创建、全量编辑、patch、删除以及写入/删除 Skill 子文件。工具说明将 Skill 定义为 procedural memory，并建议复杂任务成功、纠错或发现复用流程后沉淀；创建/删除前要求用户确认。名称限制为 64 字符 ASCII 小写字母、数字、点、下划线和连字符，内容必须带 `name`、`description` frontmatter。实现另有路径约束、安全扫描、主文件 100,000 字符和附属文件 1 MiB 上限，但这些只能降低误操作，不能替代发布审批和代码信任。

这是较强的闭环：执行经验可以变成可复用资产。但它同时扩大了供应链与提示词持久化风险，尤其当 Skill 可包含脚本、网络调用和长期凭据时。

## 6. 当前实现的可见问题

1. bundled `skills.config.json` 声明了 `math-courseware`，但安装包中没有对应目录；同时把 `skills.config.json` 自己列成 Skill ID。安装包一级目录还存在没有 `SKILL.md` 的 `geogebra`。Loader 会忽略无入口的目录，因此不影响发现，但说明发布清单与物理资产缺少一致性校验。
2. `teacher-lesson-plan-assistant/SKILL.md` 正文残留开发机绝对路径 `/Users/admin/workspace/...`，暴露了资产发布清洁度问题。
3. 内置配置清单只有 10 项，而运行时目录有 11 个有效 Skill；`homework-generator`、`teacher-lesson-plan-assistant`、`brainstorming` 属于后装或运行期加入资产。`official: true` 与 `isBuiltIn` 因而是两个不同维度，这是合理的，但 UI 和治理必须避免混淆。
4. frontmatter schema 宽松且有 fallback，利于兼容，却缺少明确的能力声明、权限需求、输入输出契约、依赖锁定和数据等级。
5. Skill 启用后以项目级符号链接整体暴露给 SDK；会话 `active_skill_ids` 是否能形成强隔离，仍需结合 Renderer 传参与 RunContext 注入进一步动态验证。现有证据只能确认字段和同步机制，不能证明未选择 Skill 在运行时绝对不可用。
6. 应用的系统提示词包含学生档案、班级名单等长期记忆规范，但本地数据库本身未体现机构级数据治理、保留期或审计策略。对教育场景而言，仅靠提示词约束不足。
7. 下载同 ID Skill 可直接覆盖；脚本继承宿主 PATH/环境并可触发依赖安装，`.env` 采用明文键值文件。没有观察到包签名、完整性锁或来源信任校验，因此第三方 Skill 是明确的供应链与本地代码执行风险。
8. manifest schema 大多数字段可选且允许额外字段，Loader 实际主要消费 `name`、`description`、`version`、`official/isOfficial`。`tags`、`author`、`platforms`、`metadata` 等即使存在，也未观察到进入强治理决策。

## 7. 对 ClassIn WorkBuddy 的启示

### 建议吸收

1. 保留“资产源 → 安装副本 → 工作区投影 → Run 选择”的分层，但把它显式建模为 `SkillPackage`、`InstalledSkill`、`SkillBinding` 和 `RunSkillSnapshot`，不要只靠目录和 JSON 字段。
2. 延续渐进披露：manifest 只用于发现和选择，正文/参考资料按需读取，脚本只在真正执行时加载。
3. 采用组合资产包：`SKILL.md + references + assets + scripts + evals`，让教学方法、领域知识、模板和工具代码各有清晰位置。
4. 为本地/模拟/真实 Adapter 共享同一 Skill 与 Run Interface；NineClaw 的 local/sandbox executor seam 是可参考形态。
5. 保留会话级 Skill 快照和版本，使每次 `WorkBuddyRun` 可复现、可评价、可追责。

### 必须加深的治理边界

1. Skill 不能直接拥有 ClassIn 业务事实或正式写权限。它只能提出 `ProposedAction`，再经过策略、教师审批、领域校验和 `ExecutionReceipt`。
2. manifest 应增加 `capabilities`、`requiredInterfaces`、`permissions`、`dataClassification`、`sideEffects`、`inputSchema`、`outputSchema`、`artifactTypes`、`compatibility`、`publisher`、`integrity` 和 `evaluationSuite`。
3. 把自然语言 description 路由与权限授权分离。description 可以帮助“选什么”，CapabilityManifest 决定“允许做什么”。
4. Agent 自创建 Skill 只应进入草稿/个人层，经过静态扫描、eval、签名和管理员批准后才能成为机构资产；包含脚本的 Skill 不应默认获得网络、文件系统和凭据。
5. Domain Knowledge、业务规则、工具 Adapter 和教学工作流应是不同 Interface 的依赖，避免像当前部分教师 Skill 那样全部揉进一份长提示词。

## 8. 建议的 WorkBuddy Skill 包草案

```text
skill-package/
├── skill.yaml                 # 机器可校验 manifest，不与长 prompt 混写
├── instructions/SKILL.md      # Agent 工作流与渐进披露入口
├── knowledge/                 # 版本化 Domain Knowledge 引用，不存业务事实
├── templates/                 # Artifact 模板
├── scripts/                   # 可选；受权限沙箱控制
├── evals/                     # 触发、质量、安全、回归样例
└── provenance/                # 发布者、版本、签名、来源与审阅记录
```

运行时建议形成不可变快照：

```text
WorkBuddyRun
  └── RunSkillSnapshot[]
      ├── skillId + version + integrity
      ├── resolved capability set
      ├── loaded knowledge/template refs
      ├── granted permissions
      └── evaluation hooks
```

这与当前锁定决策兼容：教师仍只面对统一主 Agent；Skill 是内部能力资产，不成为教师必须理解的产品入口。

## 9. 证据索引

- 应用身份与版本：`/Applications/NineClaw.app/Contents/Info.plist`。
- Electron 包与依赖：`/Applications/NineClaw.app/Contents/Resources/app.asar/package.json`（研究时只读解包）。
- 主进程模块、Skill Manager、Runner、IPC：`/Applications/NineClaw.app/Contents/Resources/app.asar/dist/index.mjs`（打包文件中的 `//#region src/...` 标记；关键范围：Skill loader 13023–13125，Skill manager 13752–14502，Skill MCP 17253–17463，Runner 19185–19320，Skill IPC 29315–29421，启动 30148–30235）。
- bundled Skill：`/Applications/NineClaw.app/Contents/Resources/SKILLs/`。
- 运行时 Skill：`/Users/eeo/Library/Application Support/NineClaw/SKILLs/`。
- 工作区投影：`/Users/eeo/nineclaw/我的文件/.claude/skills/`。
- 产品对象 schema：`/Users/eeo/Library/Application Support/NineClaw/nineclaw.sqlite` 的 `.schema`。
- 运行链动态证据：`/Users/eeo/Library/Application Support/NineClaw/logs/cowork.log`。
- Agent 产品行为：`/Users/eeo/nineclaw/我的文件/AGENT_SYSTEM_PROMPT.md`。

## 10. 证据限制

- 这是已安装闭源制品的静态与本机动态观察，不是官方源码仓库审计；模块名来自 sourceless bundle 中保留的 region 标记。
- 远程 Renderer 的源码不在安装包中，本文不推断其前端状态管理和服务端实现。
- 未执行破坏性测试、网络抓包、凭据读取或 Skill 脚本调用；有关权限和安全性的判断仅基于代码路径、manifest 与日志。
- 研究结论是 `RECOMMENDATION`，不修改 `DECISION-LEDGER.md` 的任何 `LOCKED` 决策。
