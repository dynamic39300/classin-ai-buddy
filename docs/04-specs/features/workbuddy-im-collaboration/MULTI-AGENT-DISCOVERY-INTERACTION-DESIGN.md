---
title: 班级多 Agent 发现、Mention 与单聊入口详细交互设计
status: APPROVED_AND_IMPLEMENTED
version: v1.0
date: 2026-08-24
owner: ClassIn AI Native Product Design
depends-on:
  - D-071
  - D-072
  - IM-PRD-079—088
---

# 班级多 Agent 发现、Mention 与单聊入口详细交互设计

## 1. 结论

本方案把“从多个班级 Agent 中快速找到一个并调用”定义为跨教师、学生、公共群聊和 Agent 单聊入口共用的产品能力，而不是学生群聊 Composer 的局部下拉菜单。

推荐建立一个统一的 `Agent Discovery + Invocation` 交互原语：

- 在公共班级群输入 `@`，打开“班级 Agent / 班级成员”分组的统一 Mention Picker；
- 点击 Composer 的 `@Agent`，打开同一 Picker，但预先限定为当前班级可公开调用的 Agent；
- 在教师或学生的消息搜索、新建对话与 Agent 会话切换入口中，复用同一候选、权限、搜索和排序逻辑；
- 公共群聊选中 Agent 后建立一个结构化主 Agent Target，发送时形成公开 Agent Mention；
- Agent 单聊入口选中后打开或创建 `actorId + agentId` 的隔离线程，进入线程后不再要求每条消息 `@`；
- 首版一条公开群消息只允许一个主 Agent，人员 Mention 不受影响。

本文件处于详细设计评审状态，不修改当前 `LOCKED_V18` PRD，也不授权进入实现。评审通过后再生成稳定需求 ID、更新 Feature Spec 和拆分开发 Tickets。

## 2. 设计读法

- `DESIGN_VARIANCE: 3`：沿用现有 ClassIn PC 密集工作台，不建立第二套消息 Shell。
- `MOTION_INTENSITY: 2`：只使用 Picker 出现、候选高亮和 Target 替换反馈，不做装饰性动效。
- `VISUAL_DENSITY: 4`：Picker 首屏最多展示 6—8 个候选，信息只保留身份和一个区分能力。
- 基准视口：1440 × 900；同时验收 1280 × 800 与 1024 × 640。
- 颜色不是身份、选择、权限或错误的唯一信号。

## 3. 目标与非目标

### 3.1 目标

1. 新用户可以从可见按钮发现班级 Agent；熟练用户可以直接输入 `@` 完成选择。
2. 教师和学生只看到当前班级、当前角色、当前渠道真正可用的 Agent。
3. 4、10、30 个 Agent 时都能用名称、别名、学科或能力快速定位。
4. 公开群聊发送前持续表达“哪个 Agent、公开给谁、使用什么范围”。
5. Agent 改名、重名、撤权、不可用或复制文本不会错误触发其他 Agent。
6. 教师和学生的 Agent 私聊入口复用同一发现逻辑，但线程和消息历史严格隔离。
7. 鼠标、键盘、中文输入法和屏幕阅读器完成同一条交互链。

### 3.2 非目标

- 不在 Picker 内管理、安装、授权或配置 Agent；教师管理使用独立治理入口。
- 不在本轮开放一条消息同时调用多个 Agent。
- 不使用 `/Agent名称` 选择 Agent；`/` 保留给已选 Agent 的动作命令。
- 不把教师私密 WorkBuddy 放进班级 Agent 候选。
- 不为 Agent Target 把整个 `WorkspaceComposer` 改造成通用富文本编辑器。
- 不声明真实 Agent Runtime、生产授权、审计和数据保留已经完成。

## 4. 核心术语与不变量

- **Authorized Agent Collection**：当前 Class、Actor Role 与 Channel Policy 共同允许发现的 Agent 集合。
- **Agent Candidate Projection**：授权集合经查询、匹配、排序和 UI 压缩后的候选。
- **Agent Discovery Session**：一次 Picker 的打开模式、查询、活动候选和触发来源。
- **Primary Agent Target**：用户已经明确选择、准备在本消息中触发的唯一 Agent。
- **Agent Mention Entity**：发送后进入消息的结构化 Agent 引用，包含稳定 `agentId`，不是普通字符串。
- **Agent Direct Thread Intent**：从单聊入口选择 Agent 后打开或创建隔离线程的意图。

不变量：

1. 候选权限过滤先于搜索和排序；无权对象完全不进入 Projection。
2. 教师和学生看到的全员可见 Agent 都引用同一个 `ClassAgentDefinition`，不复制名称、头像或能力。
3. 公共群聊只在消息包含有效 Agent Mention Entity 时触发，不以 `body.includes('@名称')` 作为触发事实。
4. 每条公开消息最多一个 Primary Agent Target。
5. `Primary Agent Target selected` 不等于 `Agent request sent`，也不提前创建 Run 或读取消息上下文。
6. Agent 单聊线程由 Actor 和 Agent 共同确定，教师不能发现任何学生 Agent 私聊。

## 5. 角色与渠道矩阵

| 入口 | 候选范围 | 选中命令 | 发送/可见性 |
| --- | --- | --- | --- |
| 教师公共班级群 | 当前班级对教师公开、允许 `public-class` 的 Agent | `selectPrimaryAgent(agentId)` | 当前群公开；群成员可见 |
| 学生公共班级群 | 当前班级对学生公开、允许 `public-class` 的 Agent | `selectPrimaryAgent(agentId)` | 与教师群聊相同 |
| 教师 Agent 单聊入口 | 当前教师可用、允许 `private-direct` 的 Agent | `openOrCreateAgentThread(teacherId, agentId)` | 仅当前教师与 Agent |
| 学生 Agent 单聊入口 | 当前学生可用、允许 `private-direct` 的 Agent | `openOrCreateAgentThread(studentId, agentId)` | 仅当前学生与 Agent |
| 已进入 Agent 单聊 | 当前线程绑定的唯一 Agent | 普通消息直接提交 | 不要求再次 `@` |

公共群聊与单聊入口可以复用 Picker Surface，但不得把两个选择结果压成一个页面回调。

## 6. 信息架构调整

### 6.1 班级群 Agent Context Bar

当前单 Agent 信息条在多 Agent 时改为集合摘要：

```text
✦  班级 Agents · 4 个可用
   老师已授权 · 当前班级范围 · 群内公开回复                   [查看 Agents]
```

- 不在 Header 横向平铺全部 Agent。
- `查看 Agents` 直接打开 Agent-only Picker；如后续需要完整介绍页，只从 Picker Footer 提供独立“查看全部介绍”导航，不改变当前选择链。
- 学生只看到可用集合与能力说明，不看到安装、授权或教师私有配置。
- 教师可以从 Picker 空状态或目录进入“管理班级 Agent”，该动作不进入 Option 行。

### 6.2 公共 Composer

左下工具保留低噪按钮：

```text
✦ @Agent ▾
```

- 1 个 Agent：点击仍打开轻量身份确认，不直接静默插入，保证与多 Agent 心智一致。
- 2 个以上：点击打开 Agent-only Picker，可在按钮旁显示低权重数量。
- 0 个：不显示可执行按钮；学生看到静态说明“本班暂未开放 Agent”，教师可进入管理。

### 6.3 消息搜索与新建对话

教师、学生共用分组搜索：

```text
班级 Agents
  ✦ 物理学习助手        高二物理 3 班 · 解题与答疑
  ✦ 作业订正助手        高二物理 3 班 · 错题订正

班级成员
  王老师                 教师
  李明                   学生
```

- 选 Agent 打开或创建当前 Actor 的独立线程。
- 已有线程直接进入；没有线程时先建立空会话，再由首条消息触发 Agent。
- 教师搜索结果不得出现任何学生 Agent 线程或“学生曾使用”信息。
- 学生之间也不能发现对方 Agent 线程。

### 6.4 已进入 Agent 单聊后的切换

- Header 可提供低权重“切换 Agent”入口，打开 Agent-only Picker。
- 选择另一个 Agent 时导航到另一个独立线程，不迁移当前消息和 Composer 草稿。
- 如果当前 Composer 有未发送草稿，先在原位提示“切换后草稿会保留在当前会话”，不使用阻断 Modal；确认切换后草稿仍属于原线程。
- 当前 Agent 单聊 Composer 不显示 `@Agent` 工具。

## 7. Picker 详细设计

### 7.1 两种打开模式

| 打开方式 | Picker Mode | 查询来源 | 初始结果 |
| --- | --- | --- | --- |
| Composer 输入 `@` | `mixed-mention` | `@` 后至光标的字符 | 班级 Agent / 班级成员分组 |
| 点击 `@Agent` / `查看 Agents` | `agent-only` | Picker 内自动聚焦的 Combobox Query | 最近使用 + 全部 Agent |
| 新建对话 / 搜索 | `direct-agent` 或混合搜索 | 消息搜索 Query | Agent / 联系人分组 |
| Agent Header“切换 Agent” | `agent-only-direct` | Picker Session Query | 支持 private-direct 的 Agent |

两种 Composer 打开方式共用候选和排序 Module，但焦点行为确定且不混用：

- 输入 `@`：DOM 焦点留在 Composer，`@` 后至光标的字符作为查询；
- 点击 `@Agent` / `查看 Agents`：Picker 打开时自动聚焦顶部 Combobox Query，用户可立即键入，不需要再次点击搜索；
- 两种方式选中后都关闭 Picker，并把焦点还给 Composer；Esc 则回到各自的原触发位置。

### 7.2 桌面 Surface

```text
┌──────────────────────────────────────────┐
│ 选择班级 Agent                 4 个可用  │
│ 输入名称、学科或能力即可搜索              │
├──────────────────────────────────────────┤
│ 最近使用                                 │
│ ● 物理学习助手   Agent   物理 · 解题答疑 │
│ ● 作业订正助手   Agent   物理 · 错题订正 │
├──────────────────────────────────────────┤
│ 全部 Agent                               │
│ ● 实验探究助手   Agent   物理 · 实验设计 │
│ ● 学习规划助手   Agent   全科 · 计划复盘 │
├──────────────────────────────────────────┤
│ ↑↓ 选择   Enter 确认   Esc 关闭          │
└──────────────────────────────────────────┘
```

尺寸：

- 宽度：Agent-only 380px；mixed 400px；最大不超过 Composer 可用宽度。
- 最大高度：360px；首屏 6—8 个 Option，超出后内部滚动。
- 距 Composer / 光标 6—8px；靠近视口顶部时翻转到下方。
- 圆角使用 6px；单层边界和轻阴影，不做卡片套卡片。
- Option 高度 52px；分组 Header 28px；Footer 提示 32px。
- Scrollbar 默认隐藏或低对比，Hover / Focus Within / 滚动时出现。

### 7.3 候选行

每行只承担“选择”一个动作，不嵌套详情、收藏、私聊或管理按钮。

必须显示：

1. 28—32px 头像或 Agent 专属图标；
2. 唯一显示名，单行加粗；
3. 文字 `Agent` 类型标识，不能只靠图标或绿色；
4. 一行 `学科/课程范围 · 核心能力`；
5. 仅在异常时显示 `暂不可用`，正常行不重复“老师已授权”。

同名时依次增加：

- 教师配置短名；
- 学科/课程范围；
- 提供方或授权来源。

仍无法区分时不得静默选择，提示教师为 Agent 设置唯一短名。

### 7.4 Hover、Active 与 Selected

- Hover：浅灰背景，不改变选择。
- Keyboard Active：背景 + 2px 内部焦点标识，并设置 `aria-activedescendant`。
- Selected Target：关闭 Picker，在 Composer Target Lane 中显示 Token。
- 不能仅以品牌绿表示 Active 或 Selected。
- 鼠标移动不能抢走键盘活动项，直到用户真正点击 Option。

## 8. 搜索与排序

### 8.1 匹配字段

按以下字段匹配：

1. 显示名；
2. Mention Alias / 教师配置短名；
3. 学科、年级、课程；
4. 公开 Capability 关键词；
5. 拼音全拼或首字母仅作为后续可选增强，不能在未测试前作为唯一中文查找方式。

不搜索：

- Agent 私有 Prompt、内部 Skill、MCP 或模型名；
- 未授权 Agent；
- 其他班级 Agent；
- 其他用户的私聊使用记录。

### 8.2 稳定排序

1. 名称 / Alias 精确匹配；
2. 名称前缀匹配；
3. 学科或当前课程精确匹配；
4. Capability 关键词匹配；
5. 当前 Actor 最近在本班使用，最多 3 个；
6. 教师配置展示顺序；
7. 稳定名称排序。

最近使用只作为弱加权，不覆盖精确匹配；不使用不可解释的 AI 个性化排序。

### 8.3 查询反馈

- 0 字符：展示最近使用和全部可用 Agent。
- 1 个字符起实时过滤；本地 Projection 目标为 50ms 内完成。
- 无结果：`没有匹配的已授权 Agent`，保留输入并提供“清除搜索”。
- 加载：固定 Picker 尺寸，显示 3 行轻量 Skeleton，不跳动。
- 读取失败：显示“暂时无法读取班级 Agent”，提供重试，不扩大到市场搜索。
- 结果数变化用温和 `role=status` 宣布，不逐键重复朗读整张列表。

## 9. Composer Target 设计

### 9.1 为什么不用 textarea 内联富文本 Token

当前 `WorkspaceComposer` 的输入引擎是 textarea。为 Agent Token 改为 contenteditable 会同时影响公开聊天、WorkBuddy、Agent Run、历史追问、IME、复制粘贴和可访问性，范围远超本轮价值。

首版使用 Composer 内独立 Target Lane：

```text
┌────────────────────────────────────────────────────────────┐
│ [✦ @物理学习助手  ×]                                      │
│ 第 5 题碰撞前后的方向应该怎么判断？                        │
│                                                            │
│ 🙂  📎   将由物理学习助手在本群公开回复 · 全班可见      ↑ │
└────────────────────────────────────────────────────────────┘
```

- 输入 `@物理...` 并选中后，查询片段从正文移除，转为 Primary Agent Target。
- 消息发送后，展示层在正文开头渲染结构化 `@物理学习助手` Mention。
- Target Lane 只在选中 Agent 时出现，不为默认 Composer 增加空白高度。
- Target Token 有文字、图标和删除动作；删除后正文不丢失。
- Target Lane 使 Agent 成为明确“回复对象”，比在 textarea 中伪造富文本更可靠。

### 9.2 选择第二个 Agent

首版不并发召唤多个 Agent：

- 再次打开 Picker 时标题显示“切换回复 Agent”；
- 选择后原位替换 Target，并以 `role=status` 宣布“已切换为实验探究助手”；
- 5 秒内可使用轻量“撤销切换”，不弹确认 Modal；仅当 Target 替换仍是最后一次产品操作时接管撤销，用户继续编辑正文后恢复 textarea 原生 Undo；
- 人员 Mention 仍可存在于普通消息文本或未来结构化实体中。

### 9.3 发送前持续反馈

状态提示必须具体：

```text
物理学习助手将以 Agent 身份在本群公开回复 · 全班成员可见 · 当前课程范围
```

- 不使用一次性 Toast 代替。
- 不每次弹确认 Modal。
- Agent 名称、公开范围和 Context Scope 来自当前 Selection Projection。
- 如果没有实际问题正文，只选 Agent，发送按钮禁用并提示“请补充问题”。

## 10. Mention Entity 与消息投影

建议数据形态：

```ts
type AgentMentionEntity = Readonly<{
  type: 'class-agent';
  agentId: string;
  classId: string;
  authorizationId: string;
  authorizationVersion: string;
  displayNameSnapshot: string;
  channel: 'public-class';
}>;
```

消息提交形态：

```ts
type PublicClassMessageDraft = Readonly<{
  body: string;
  agentMention?: AgentMentionEntity;
}>;
```

触发规则：

- 有有效 Entity + 非空正文：发送普通群消息并创建 Agent Request。
- 只有看起来相同的普通文字：作为普通消息发送，不触发 Agent。
- Authorization Version 过期：保留草稿，进入 stale-target，不写消息、不创建 Request。
- 复制到外部：降级为可读 `@名称`；复制回 ClassIn 不自动恢复绑定。
- Agent 改名：既有消息保留发送时 Snapshot；新选择使用最新名称，稳定 ID 不变。

## 11. 状态模型

### 11.1 Discovery Session

```text
closed
  ├─ type @ ───────────────→ open(mixed-mention)
  ├─ click @Agent ─────────→ open(agent-only)
  └─ new/switch direct ────→ open(direct-agent)

open
  ├─ query ────────────────→ filtering
  ├─ choose ───────────────→ selected / navigation-intent
  ├─ no result ────────────→ empty
  ├─ read failure ─────────→ recoverable-failure
  └─ Esc / outside ────────→ closed (draft preserved)
```

### 11.2 Primary Agent Target

```text
none
  └─ select ───────────────→ valid

valid
  ├─ replace ──────────────→ valid(new) + undo window
  ├─ remove ───────────────→ none
  ├─ authorization change ─→ stale
  └─ send ────────────────→ validating

stale
  ├─ reselect ─────────────→ valid
  └─ remove ───────────────→ none

validating
  ├─ valid ────────────────→ submitted
  └─ invalid ──────────────→ stale / unavailable
```

Picker 状态、Target 状态和 Agent Reply 状态必须分离；不能用一个 `isAgentOpen` 同时表达三者。

## 12. 权限、隐私与治理

候选必须同时满足：

```text
sameClass
AND visibleToActorRole
AND channelEnabled
AND authorizationActive
AND agentAvailable
```

- 无权对象不灰置、不显示数量、不通过搜索结果泄露。
- 教师公共集合与学生公共集合可以相同，但 Direct Policy 可以不同。
- 教师管理入口不进入学生 Surface。
- 最近使用记录按 Actor 隔离；不得显示“某学生最近使用了哪个 Agent”。
- Agent 单聊搜索只搜索定义和当前 Actor 的线程，不搜索其他 Actor 消息。
- 发送前必须复核 Authorization Version；撤权后保留正文但阻止触发。
- 所有 Demo 候选继续显示“体验 Agent / 体验数据”，不能暗示生产授权。

## 13. 键盘、IME 与无障碍

| 输入 | 行为 |
| --- | --- |
| `@` | 打开 mixed Picker；DOM 焦点留在 Composer |
| 点击 `@Agent` | 打开 agent-only Picker；焦点自动进入 Picker Combobox Query |
| `↓ / ↑` | 移动活动 Option，不改变已选 Target |
| `Home / End` | 到当前分组首尾；仅 Picker 打开时接管 |
| `Enter` | 非 IME 组合态时选择活动 Option；无活动项时遵循 Composer 提交规则 |
| `Tab` | 首版接受活动 Option；行为必须与其他 Mention 一致 |
| `Esc` | 关闭 Picker，保留正文和字面 `@`，不退出沉浸 Shell |
| `Backspace` | 查询非空时删字；Target 聚焦时整体删除 Target |
| `Ctrl/Cmd + Z` | 仅在 Target 选择/替换是最后一次产品操作且正文未继续编辑时撤销 Target；否则遵循 textarea 原生 Undo |

ARIA：

- 触发按钮名称：“选择班级 Agent”。
- Editable Trigger 使用 Combobox + Listbox Popup。
- `aria-expanded`、`aria-controls`、`aria-activedescendant`、`aria-selected` 完整。
- Agent 与成员使用有名称的 `role=group`。
- Option 可访问名称优先读差异：`物理学习助手，Agent，物理，解题与作业答疑`。
- 动态结果、选择、替换、无结果和授权失效使用 `role=status`；不可恢复错误才使用 Alert。
- IME `compositionstart—compositionend` 期间不提交、不选择、不关闭 Picker。

## 14. 响应式与层级

### 14.1 1440 / 1280 宽屏

- Picker 锚定 Composer 左下按钮或查询光标附近，不遮挡发送按钮。
- 高度不足时向上扩展；消息 Timeline 不因 Picker 打开重新排版。
- z-index 高于 Composer 和消息内容，低于 Dialog / Focus Surface。

### 14.2 1024 紧凑窗口

- Picker 宽度 `min(380px, viewport - 24px)`，保留 12px 安全边距。
- WorkBuddy Overlay 存在时，Picker 仍锚定当前 Chat Composer，不跨入 WorkBuddy Surface。
- Option 次级描述省略号，但名称、Agent 类型和选择状态不可截断。
- 不把 Picker 升级为全屏 Modal。

### 14.3 Reduced Motion

- 打开/关闭只使用 100—140ms opacity/scale 过渡；Reduced Motion 下立即显示。
- 候选过滤不做位移动画，避免列表跳动和焦点错位。

## 15. Deep Module 设计

### 15.1 目标依赖

```text
MessageWorkspace / NewConversationSurface
  → AgentDiscoveryController Interface
    → AgentDiscoveryModule
      → authorization filtering
      → search + deterministic ranking
      → candidate projection + disambiguation
      → selection validation
      → AgentDirectoryAdapter Seam
  → WorkspaceComposer Target Interface
    → PrimaryAgentTarget projection
  → ClassAgentConversation Interface
    → public request / private direct thread
```

### 15.2 AgentDiscoveryModule Interface

建议只暴露两个纯命令：

```ts
type AgentDiscovery = Readonly<{
  project(request: AgentDiscoveryRequest): AgentDiscoveryProjection;
  select(request: AgentSelectionRequest): AgentSelectionResult;
}>;
```

`project` 隐藏授权过滤、查询匹配、稳定排序、最近使用和 Option 压缩；`select` 隐藏 stale authorization、重名和渠道校验。页面不遍历 `ClassAgentDefinition[]` 自行实现搜索。

### 15.3 AgentDirectoryAdapter Seam

```ts
type AgentDirectory = Readonly<{
  readAuthorizedAgents(context: AgentDirectoryContext): Promise<AgentDirectorySnapshot>;
}>;
```

当前 Mock Adapter 和未来 ClassIn Authorization Adapter 均满足同一 Interface；Snapshot 必须带版本，供发送前复核。

### 15.4 页面职责

页面只负责：

- 提供 Actor、Class、Channel 和打开来源；
- 投影 Picker / Target View Model；
- 把 `PublicMentionSelection` 交给 Composer；
- 把 `DirectThreadSelection` 交给消息路由。

页面不得拥有：

- 授权过滤；
- 搜索字段和权重；
- Agent 重名规则；
- Mention 文本解析；
- 私聊线程隔离规则；
- Authorization Version 校验。

删除 `AgentDiscoveryModule` 后，上述复杂度会重新散落到教师群聊、学生群聊、教师单聊和学生单聊四处，说明该 Module 具有足够 Depth 和 Leverage。

## 16. 异常与恢复

| 状态 | 用户反馈 | 恢复动作 |
| --- | --- | --- |
| 本班 0 个 Agent | 学生：“本班暂未开放 Agent”；教师：“尚未授权班级 Agent” | 教师可进入管理；学生无空按钮 |
| 搜索无结果 | “没有匹配的已授权 Agent” | 清除查询 |
| 目录加载失败 | “暂时无法读取班级 Agent” | 重试；保留正文 |
| Agent 暂不可用 | 不进入默认候选；若已选后失效则 Target 标红并说明 | 重新选择或删除 Target |
| 授权撤销 | “该 Agent 已不再对本班开放” | 重新选择；正文保留 |
| 同名未消歧 | 不允许 Select 成功 | 展示学科/短名；教师调整名称 |
| 只有 Agent 无问题 | 发送禁用 | 补充问题 |
| 普通文字看似 Mention | 作为普通文本发送，不触发 | 可重新打开 Picker 转为 Target |
| 选择第二 Agent | 原位替换并宣布 | 5 秒内撤销 |
| Direct 切换时有草稿 | 说明草稿留在原会话 | 确认切换或取消 |
| 发送前版本变化 | 不写消息、不创建 Agent Request | 刷新候选并重新选择 |

## 17. 观测与隐私

可以记录：

- Picker 打开来源：typed-mention / composer-button / new-direct / switch-direct；
- 授权候选数量 Bucket；
- 选择耗时、选择排名和是否使用搜索；
- 查询长度 Bucket、空结果率、取消率；
- Target 替换、撤销、stale 和发送成功；
- 键盘 / 鼠标入口，不记录辅助技术身份。

不得记录：

- 学生原始问题正文；
- 原始搜索词；
- 其他用户的 Agent 私聊或最近使用；
- 未授权 Agent 的存在信息。

## 18. 验收矩阵

### 18.1 核心行为

- [ ] 教师和学生公共群聊都可通过输入 `@` 和点击 `@Agent` 打开同一候选逻辑。
- [ ] 输入 `@` 显示 Agent / 成员分组；点击按钮只显示 Agent。
- [ ] 教师和学生的全员可见 Agent 身份、能力和稳定顺序来自同一 Agent 定义。
- [ ] 教师/学生单聊入口都能搜索 Agent 并进入各自隔离线程。
- [ ] 已进入 Agent 私聊后无需 mention；切换 Agent 打开另一个线程。
- [ ] 未授权、其他班级、其他角色私有和 private-only 对象不泄露。
- [ ] 选中 Agent 形成结构化 Target；普通同名文字不触发。
- [ ] 一条群消息只能有一个主 Agent，第二次选择原位替换且可撤销。
- [ ] 发送前显示具体 Agent、公开范围和 Context Scope。
- [ ] 授权失效、不可用、无结果和目录失败均保留正文并可恢复。

### 18.2 规模与查找

- [ ] 4、10、30 个 Agent 的列表和搜索均可操作。
- [ ] 名称、Alias、学科和 Capability 查询都能定位目标。
- [ ] 两个近似名称与两个相同名称不静默选错。
- [ ] 精确匹配稳定优先；最近使用不覆盖精确结果。
- [ ] 首屏不超过 8 个 Option，滚动区域不引发页面横向溢出。

### 18.3 键盘、IME 与可访问性

- [ ] `@`、方向键、Enter/Tab、Esc、Backspace 和撤销全程无需鼠标。
- [ ] 中文输入法候选上屏不误选择、不误发送、不关闭 Picker。
- [ ] Picker、分组、Option、结果数、活动项、选择和错误均有准确语义。
- [ ] 焦点始终可见；关闭后回到 Composer 或原触发按钮。
- [ ] axe 无 serious / critical violation。

### 18.4 视觉与响应式

- [ ] 1440 × 900、1280 × 800、1024 × 640 无遮挡、溢出和不可达发送按钮。
- [ ] Picker 不改变消息 Timeline 布局，不跨入 WorkBuddy Surface。
- [ ] Hover、Keyboard Active、Selected 和 Disabled 可区分且不只靠颜色。
- [ ] Reduced Motion 下交互状态不丢失。

## 19. 开发前需要确认的产品决策

以下均给出推荐默认值；用户确认后再写入 PRD：

1. **Agent Target 表现**：推荐使用 Composer Target Lane，不升级富文本编辑器。
2. **一条消息 Agent 数量**：推荐首版最多一个，选择第二个原位替换并可撤销。
3. **单 Agent 点击行为**：推荐也打开轻量确认 Picker，保持模型一致，不静默插入。
4. **通用 `@` 排序**：推荐 Agent 与成员明确分组；不永远把 Agent 压在所有成员之前。
5. **Direct 切换**：推荐打开独立线程，不在当前 Agent 私聊中 mention 第二 Agent。
6. **最近使用**：推荐按 Actor 记录，最多 3 个；全部列表保持教师配置稳定顺序。
7. **能力搜索**：推荐只匹配教师对全班公开的 Capability Keywords，不做自由自然语言推断。
8. **Header 集合摘要**：推荐“班级 Agents · N 个可用”，不平铺头像和卡片。

## 20. 进入开发前的交付顺序

设计确认后，严格执行：

1. PRD 增加稳定 `IM-PRD-*`：多 Agent 授权集合、发现、公开 Mention、Direct 入口、Target 与恢复。
2. Feature Spec 定义 `AgentDiscoveryModule`、Directory Adapter、Mention Entity、状态机和权限契约。
3. Tickets 建议拆为：
   - Agent Discovery Domain + Directory Adapter；
   - Picker Surface + 搜索/键盘/IME；
   - WorkspaceComposer Primary Agent Target；
   - 教师/学生公共群聊接入；
   - 教师/学生 Direct 入口与线程隔离；
   - E2E/a11y/visual/traceability。
4. 先用 4 个 Agent、1 个重名、1 个撤权和 1 个失败状态做可重置 Mock。
5. 完成 4 个入口实机评审后，再进入真实 Directory / Runtime 集成。

## 21. 研究依据

详细一手证据、事实/推论区分和 19 项来源见：

- [班级群聊多 Agent Mention Picker 交互模式研究](../../../01-research/source-notes/multi-agent-mention-picker-patterns-20260823.md)

本方案继承研究结论：`@` 选择对象、`/` 选择动作；字符入口与可见按钮打开同一候选逻辑；候选先按权限和当前上下文收窄；选中后绑定稳定对象；公开后果在发送前持续可见。
