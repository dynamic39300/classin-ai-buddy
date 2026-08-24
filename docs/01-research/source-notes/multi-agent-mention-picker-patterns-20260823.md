---
title: 班级群聊多 Agent Mention Picker 交互模式研究
status: research-note
date: 2026-08-23
scope: 班级内多个已授权 Agent 的唤起、搜索、选择、发送前反馈与可访问性
evidence-policy: 仅引用 Slack、Microsoft Teams、Discord、GitHub、Notion、W3C/WAI 等官方产品文档、开发文档与规范
---

# 班级群聊多 Agent Mention Picker 交互模式研究

## 1. 问题、项目边界与证据标签

当前评审截图中，Composer 左下角只有一个 `@Agent` 快捷入口；点击后直接插入唯一的 `@班级 Agent`。当教师为同一班级授权多个全员可见 Agent 后，这个入口不再能直接代表唯一对象，需要回答五个问题：用户如何唤起、如何在多实体中只找 Agent、如何快速搜索和排序、如何确认自己选中了哪一个 Agent，以及发送前如何理解公开回复与上下文范围。

本研究只提出交互候选，不修改 D-071、D-072，也不把推荐静默升级为 `LOCKED`：

- 群聊仍然只有显式 mention 才触发 Agent，并以 Agent 自身身份公开回复；
- 候选列表只能出现当前班级、当前角色已获授权的 Agent；
- 教师与学生看到同一组全员可见 Agent，不因此获得对方 Agent 私聊的发现权；
- 完整教学 Case Library、真实 Runtime、长期记忆和治理后台仍不在本研究中宣称完成。

### 证据标签

- **FACT**：可由下列一手来源直接验证的外部事实。
- **CLASSIN INFERENCE**：把外部事实与当前项目约束结合后的推论；不是外部产品的原话。
- **RECOMMENDATION**：供 ClassIn 产品评审的交互方案；不是新的锁定决策。
- **OPEN**：需要原型、可用性测试或治理决策验证的问题。

## 2. 一手来源索引

| ID | 一手来源 | 本次可验证内容 |
| --- | --- | --- |
| SRC-01 | [Slack：Use mentions in Slack](https://slack.com/help/articles/205240127-Use-mentions-in-Slack) | 输入 `@` 后按名称搜索或从成员列表选择；重名 mention 会进入显式歧义状态，而不是静默绑定错误对象 |
| SRC-02 | [Slack：Use shortcuts to take actions in Slack](https://slack.com/help/articles/360057554553-Use-shortcuts-to-take-actions-in-Slack) | `/` 或 Composer 图标可打开同一快捷菜单；默认显示最近使用项，继续输入可搜索；选择后补充参数再发送 |
| SRC-03 | [Slack：Accessibility changelog](https://slack.com/help/articles/50668520513939-Accessibility-Changelog) | 官方持续修正 autocomplete 的屏幕阅读器体验；当前约定以方向键浏览候选，`Tab` 留给次级动作；候选标签需完整可理解 |
| SRC-04 | [Microsoft Teams：Designing your bot](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/design/bots) | 群聊/频道通过 `@` 使用 bot；公开上下文面向整个团队；命令菜单选择后将命令插入 Composer；菜单应简短且只突出核心能力 |
| SRC-05 | [Microsoft Teams：Define message extension action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command) | Compose 按钮、命令框 `/`、消息 `…` 是不同调用位置；部分结果可先插入 Composer，由用户最终发送 |
| SRC-06 | [Microsoft 365 app schema：bots.commandLists](https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/root-bots-command-lists?view=m365-app-1.26) | bot 命令可声明 mention 与 slash 两种 trigger，并按 team、personal、groupChat 等 scope 配置 |
| SRC-07 | [Discord：Interactions Overview](https://docs.discord.com/developers/interactions/overview) | slash command 可通过输入 `/` 或打开 command picker 使用；消息、用户和 App 可拥有不同上下文入口 |
| SRC-08 | [Discord：Application Commands](https://docs.discord.com/developers/interactions/application-commands) | 命令具有名称、描述、参数、autocomplete 和权限；无使用权限的命令不出现在 picker 中 |
| SRC-09 | [GitHub：Basic writing and formatting syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) | `@` 同时搜索人和团队；列表随输入过滤；方向键选择，`Tab` 或 `Enter` 完成；候选受协作者/会话参与者范围约束 |
| SRC-10 | [GitHub：Integrating Copilot cloud agent with Teams](https://docs.github.com/en/copilot/how-tos/copilot-integrations/integrate-cloud-agent-with-teams) | Agent 可由群聊 `@GitHub` 唤起；官方明确披露整条 thread 会成为上下文，并建议需要缩小上下文时改用私聊 |
| SRC-11 | [Notion：Comments, mentions & reactions](https://www.notion.com/help/comments-mentions-and-reminders) | 输入 `@` 后实时搜索人、群组或页面并按 `Enter` 选择；mention 是可保持对象身份的内联引用，页面改名后引用同步更新 |
| SRC-12 | [Notion：Keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts) | 同一 `@` 入口可混排人、页面、日期和提醒；`Esc` 可关闭 `@` 菜单并保留字面输入；`/` 用于插入内容或动作 |
| SRC-13 | [Microsoft Graph：Search people](https://learn.microsoft.com/en-us/graph/search-concept-person) | 人员搜索可按沟通、协作和业务关系计算相关性，并支持模糊匹配与类型过滤 |
| SRC-14 | [W3C APG：Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | 可编辑输入通过 popup 提供并过滤建议；按钮也可打开同一 popup；`Enter` 接受、`Esc` 关闭、方向键导航，并定义 `aria-expanded`、`aria-activedescendant`、`aria-selected` |
| SRC-15 | [W3C APG：Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) | listbox 支持分组、方向键和 type-ahead；选项名称应短而可辨；选项内不适合再嵌套链接、按钮或复选框 |
| SRC-16 | [WCAG 2.2](https://www.w3.org/TR/wcag/) | 键盘焦点必须可见；控件名称、角色、状态可由辅助技术获得；动态结果数和选择结果可作为无需抢焦点的 status message 宣布 |
| SRC-17 | [Slack：Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | Slack 提供独立 Agents & tools / channel Agents & apps 目录；Agent 加入频道后用 `@名称` 唤起；交互可明确为公开或私密 |
| SRC-18 | [Microsoft Teams：Use slash commands](https://support.microsoft.com/en-us/teams/chat/use-commands-in-microsoft-teams) | `/` 在消息框打开命令列表，可按命令名、描述或 App 过滤，最近命令置顶；命令用于执行动作而非单纯引用身份 |
| SRC-19 | [GitHub：Using agent apps](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-agent-apps) | 多个 Agent App 可并存；在 PR 评论中需输入 `@AGENT-NAME` 并从 autocomplete picker 选择具体 Agent；Agents UI 也先选择 Agent 再提交 prompt |

## 3. 行业事实：各类触发器解决的是不同问题

### 3.1 `@` 是“选择对话对象”，按钮是其可发现入口

- **FACT（SRC-01）**：Slack 允许用户直接输入 `@`，再输入姓名或从候选成员中选择；同一步可以重复 mention 多人。
- **FACT（SRC-04）**：Teams 在群聊与频道中使用 `@botname` 与 bot 交互，并提醒这个上下文对整个团队可见。
- **FACT（SRC-09）**：GitHub 的 `@` 候选可以混合人和团队，随输入过滤，并用方向键、`Tab` 或 `Enter` 完成。
- **FACT（SRC-11、SRC-12）**：Notion 的 `@` 甚至可以同时承载人、群组、页面、日期与提醒；用户可继续输入实时搜索，也能以 `Esc` 退出菜单、保留字面 `@`。
- **FACT（SRC-17）**：Slack 允许在频道详情的 `Agents & apps` 中加入多个 Agent；加入后在 Composer 输入 `@` 加 Agent 名称发起互动，并明确区分公开互动和仅自己可见的私密互动。
- **FACT（SRC-19）**：GitHub Agent Apps 在共享评论场景中要求从 autocomplete picker 选中具体 Agent；在独立 Agents UI 中也先选 Agent，再输入任务。
- **FACT（SRC-14）**：WAI-ARIA Combobox 允许文本输入和相邻的 Open button 打开同一 popup；两者不是必须建立两套选择逻辑。

**CLASSIN INFERENCE**：当前 `@Agent` 按钮不应在多 Agent 时变成第二套独立弹窗或直接 mention 一个默认 Agent。最稳定的模型是：输入 `@` 与点击 `@Agent` 都打开同一个 Mention Picker；区别仅在初始过滤范围。

### 3.2 `/` 更适合“选择动作”，不适合替代 Agent 身份选择

- **FACT（SRC-02）**：Slack 的 slash 菜单混合快捷操作、App 与 Workflow；点击 Composer 图标或输入 `/` 均可打开，默认显示最近使用项，输入名称后过滤。
- **FACT（SRC-05、SRC-06）**：Teams 把 Compose button、command box `/` 和消息上下文菜单作为动作命令的不同 invoke location；bot manifest 也明确区分 mention trigger 与 slash trigger。
- **FACT（SRC-18）**：Teams slash command 在消息框内按名称、描述或 App 实时过滤，最近命令置顶；官方示例都是导航、状态、Workflow、App 操作等动作。
- **FACT（SRC-07、SRC-08）**：Discord 把 slash command 作为 App 的原生动作入口，命令由名称、描述、参数和权限共同定义。
- **FACT（SRC-12）**：Notion 使用 `@` 引用对象，使用 `/` 插入 block 或执行内容动作。

**CLASSIN INFERENCE**：在教育群聊中，`@物理学习助手` 回答的是“由谁公开回复”；未来的 `/讲解错题`、`/生成练习` 才回答“让当前对象做什么”。若现在把多个 Agent 迁移到 `/` 命令，会把身份、能力和动作混成一层，并破坏 D-071 已锁定的显式 mention Gate。

## 4. 行业事实：多实体、权限、搜索和排序

### 4.1 多实体可以共用触发字符，但必须有类型和范围

- **FACT（SRC-09）**：GitHub 的 `@` 列表混排 people 与 teams，但结果只包含仓库协作者和当前 thread 参与者。
- **FACT（SRC-11、SRC-12）**：Notion 的 `@` 可以混排不同对象类型，并用候选内容区分人、群组、页面与日期。
- **FACT（SRC-08）**：Discord 的 command picker 不显示用户无权限执行的命令。
- **FACT（SRC-02）**：Slack Connect 中，外部组织成员不能使用仅安装在本组织 Workspace 的 App shortcut。

**CLASSIN INFERENCE**：权限过滤必须发生在候选生成之前。把未授权 Agent 灰置在学生列表中仍会泄露其存在，也会制造“为什么别人有、我没有”的无效入口。当前班级 Mention Picker 只返回 `authorized + visible-to-role + public-mention-enabled` 的 Agent。

### 4.2 搜索必须在输入路径中原生发生，不应先打开再找搜索按钮

- **FACT（SRC-01、SRC-09、SRC-11）**：Slack、GitHub、Notion 均在用户输入 `@` 后直接以随后的字符过滤候选。
- **FACT（SRC-02）**：Slack 的图标入口与 `/` 字符入口打开同一菜单；菜单打开后继续输入即可搜索，无需再点放大镜。
- **FACT（SRC-13）**：Microsoft 的人员搜索把沟通、协作和业务关系用于相关性排序，并支持模糊匹配和类型过滤。
- **FACT（SRC-14）**：Editable Combobox 的输入可以直接过滤 popup 建议。

**CLASSIN INFERENCE**：ClassIn 不需要额外的“搜索 Agent”二次入口。点击 `@Agent` 后焦点应立即回到/保持在 Composer，用户直接键入名称、别名、学科或能力关键词；Popup 同步过滤。

### 4.3 排序可利用“最近使用”，但不能掩盖精确意图

- **FACT（SRC-02、SRC-18）**：Slack shortcut 与 Teams slash command 菜单打开时都把 recently used commands/shortcuts 放在前面。
- **FACT（SRC-13）**：Microsoft Graph 可以按沟通、协作和业务关系产生 relevance order。
- **FACT（SRC-09）**：GitHub 先限制到当前项目/对话有关系的对象，再在该范围内提供过滤。

**CLASSIN INFERENCE**：多 Agent 初始列表可以按当前班级相关性和近期使用缩短路径，但不宜使用不可解释的“AI 推荐”覆盖名称精确匹配。教育场景还需要教师和学生可以复述“为什么看到这些 Agent”：它们全部由教师授权给当前班级。

## 5. 行业事实：选择、歧义和发送前反馈

### 5.1 mention 应绑定稳定对象，不只是保留一段文本

- **FACT（SRC-01）**：Slack 遇到多个相同 display name 时，用虚线框和问号标出歧义并要求用户选择；不会静默挑一个人。
- **FACT（SRC-09）**：GitHub 的候选完成后成为可通知的人或团队引用，候选列表受权限和会话范围约束。
- **FACT（SRC-19）**：GitHub 在多个 Agent App 并存时仍要求从 autocomplete picker 明确选择 `@AGENT-NAME`，或在 Agents UI 的 prompt box 下先选择一个 Agent。
- **FACT（SRC-11）**：Notion 页面 mention 会跟随页面改名更新，说明界面显示文本背后保留的是对象引用，而非不可解析的普通字符串。
- **FACT（Microsoft Teams 官方 bot conversation 文档）**：[Teams 的 mention payload](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/bot-v3/bot-conversations/bots-conv-channel) 同时包含稳定 ID 和名称；服务端通过实体而非仅凭显示文本判断 mention。

**CLASSIN INFERENCE**：`@物理学习助手` 应是带 `agentId` 的语义 token。若仍以 `body.includes('@名称')` 作为唯一触发，重名、改名、复制粘贴和别名都会产生错误触发或漏触发。

### 5.2 群聊 Agent 的身份、公开范围和读取范围要在发送前可见

- **FACT（SRC-04）**：Teams 官方明确提醒，频道中的 bot 面向整个 team，而不是仅当前 channel 的某个私人空间。
- **FACT（SRC-10）**：GitHub Copilot in Teams 明确披露整条 thread 会成为 Agent 的上下文；若希望收窄上下文，官方建议新开 thread 或改用私聊。
- **FACT（SRC-05）**：Teams 的部分动作结果先插入 Composer，再由用户发送，区分“已生成/已选择”和“已公开发送”。
- **FACT（SRC-08）**：Discord 的命令权限会决定某个命令能否出现在 picker 中。

**CLASSIN INFERENCE**：Agent token 选中并不等于消息已发出。Composer 在发送前必须持续显示：具体 Agent、公开回复范围、当前课程/班级范围和必要的上下文摘要；不应用一次性 Toast 替代。

## 6. 行业事实：键盘和无障碍不是补充状态

- **FACT（SRC-14）**：Editable Combobox 使用方向键进入/遍历候选、`Enter` 接受、`Esc` 关闭；DOM 焦点可留在输入框，通过 `aria-activedescendant` 表达活动候选，并用 `aria-expanded`、`aria-selected` 暴露状态。
- **FACT（SRC-15）**：Listbox 支持 option group、方向键与 type-ahead；超过约七项时尤其推荐 type-ahead。选项名称过长或都以同样前缀开始会显著增加屏幕阅读器负担。
- **FACT（SRC-15）**：`option` 内不适合放独立按钮、链接或复选框；若每行需要多个可交互控件，应改用其他模式，而不是假装成 listbox。
- **FACT（SRC-03）**：Slack 现行 autocomplete 用方向键浏览候选，`Tab` 用于完成次级动作；官方还专门改进了 autocomplete 的屏幕阅读器说明和 slash command 结果标签。
- **FACT（SRC-16）**：键盘焦点需要可见；控件的 name、role、state 需要可由辅助技术确定；动态状态可在不抢走焦点时被宣布。

**CLASSIN INFERENCE**：Picker 打开、过滤、无结果、选中和权限变化都需要有可感知状态；不能只用颜色、头像或视觉高亮表达“这是 Agent”“当前选中了第几项”。

## 7. ClassIn 推荐交互方案

以下全部为 **RECOMMENDATION**，等待产品评审，不是新的 LOCKED 决策。

### 7.1 一个 Picker，两种快速唤起

| 入口 | 初始候选 | 用户后续动作 | 适用人群 |
| --- | --- | --- | --- |
| 在 Composer 任意位置输入 `@` | `班级 Agent` 与 `班级成员` 分组混排 | 继续输入名称；方向键 + `Enter/Tab` 选择 | 熟悉群聊 mention 的用户；同时覆盖人和 Agent |
| 点击截图位置的 `@Agent` | 只显示当前班级已授权 Agent | 保持 Composer 焦点，直接输入名称/学科/能力；或点击候选 | 首次用户、只想找 Agent 的用户 |

两条入口必须进入同一个 Picker state 和同一套候选对象。按钮不默认选中“最近 Agent”，不另开 Modal，也不让用户先点一次“搜索”。

推荐按钮表现：

- 单 Agent：仍可显示 `@Agent`，点击直接插入唯一 Agent，但首次可短暂展开身份确认；
- 2 个及以上：显示 `@Agent` + chevron，可选增加低强调数量 `3`，点击打开 Agent-only Picker；
- 0 个：不显示可用入口；若产品需要解释，则显示不可交互说明“本班暂未授权 Agent”，不能打开空选择器。

#### 7.1.1 教师 / 学生 × 公共群聊 / Agent 单聊入口矩阵

多 Agent 选择不能只在学生群聊 Composer 中成立。它应被定义为跨角色、跨渠道共用的 `Agent Discovery + Invocation` Interface；候选授权、搜索、排序、身份消歧和稳定 `agentId` 绑定复用同一逻辑，但选中后的命令按渠道分流。

| 角色与入口 | 候选范围 | 选中结果 | 关键边界 |
| --- | --- | --- | --- |
| 教师公共班级群 | 当前班级对教师公开且允许群内 mention 的 Agent | 在当前 Composer 插入结构化 Agent token，发送后公开触发 | 教师私密 WorkBuddy 不进入候选，不与班级 Agent 混为一体 |
| 学生公共班级群 | 当前班级对学生公开且允许群内 mention 的 Agent | 与教师群聊相同，公开触发并对群成员可见 | 不能看到教师专属、未授权或 private-direct-only Agent |
| 教师 Agent 单聊入口 | 对当前教师开放 private-direct 的班级 Agent | 打开或创建 `teacherId + agentId` 的独立私聊线程 | 不发现任何学生与 Agent 的私聊；进入线程后无需重复 mention |
| 学生 Agent 单聊入口 | 对当前学生开放 private-direct 的班级 Agent | 打开或创建 `studentId + agentId` 的独立私聊线程 | 只进入自己的线程；教师和其他学生不可发现 |

公共群聊与单聊入口可以复用同一 Agent Picker 外观，但不能复用同一选中命令：

```text
public-class       → insertAgentMention(agentId, authorizationVersion)
private-direct     → openOrCreateAgentThread(actorId, agentId)
```

Agent 单聊一旦打开，当前 Agent 已由线程身份确定，Composer 不再要求每条消息 `@`。如果用户想切换到另一个 Agent，应从会话列表搜索、Header 的“切换 Agent”入口或统一“新建对话”选择器进入另一个独立线程，不能把第二个 Agent mention 插入原私聊导致上下文和隐私边界混合。

教师和学生可以拥有不同的最近使用记录，但全员可见 Agent 的名称、头像、能力说明和教师配置顺序应来自同一个 `ClassAgentDefinition` / Authorization Projection；不能在四个页面各维护一份列表或搜索规则。

### 7.2 Popup 位置与结构

Popup 锚定在 Composer 中的 `@` 光标或左下 `@Agent` 按钮上方；靠近视口边缘时翻转，但不能遮挡当前输入行和发送按钮。

```text
┌────────────────────────────────────────────┐
│ 选择班级 Agent                 4 个可用     │
│ 输入名称、学科或能力即可搜索                 │
├────────────────────────────────────────────┤
│ 最近使用                                    │
│ ✦ 物理学习助手   物理 · 解题与作业答疑       │
├────────────────────────────────────────────┤
│ 全部 Agent                                  │
│ ✦ 实验探究助手   物理 · 实验设计             │
│ ✦ 英语口语陪练   英语 · 口语练习             │
│ ✦ 学习规划助手   全科 · 计划与复盘            │
├────────────────────────────────────────────┤
│ ↑↓ 选择  Enter 确认  Esc 关闭               │
└────────────────────────────────────────────┘
```

每一行只承担一次选择，不嵌套“详情”“收藏”“私聊”等按钮。可见内容保持两行以内：

1. 第一行：头像、唯一显示名、`Agent` 类型标识；
2. 第二行：学科/课程范围 + 一个最能区分的核心能力；
3. 仅在需要时显示短状态：`老师已授权`、`暂不可用`，不要给所有行重复“全员可见、群内公开回复”长句。

公开范围是选择器级事实，放在标题或 Composer 反馈区统一表达：`仅显示本班已授权、群内可公开回复的 Agent`。

### 7.3 多实体混排与 Agent 专属过滤

- 直接输入 `@`：分成 `班级 Agent`、`班级成员` 两个有可访问名称的 option group；Agent 使用稳定图标与文字 `Agent`，不能只靠绿色区分。
- 点击 `@Agent`：直接应用 Agent-only filter，不再显示人；过滤标签本身可见为 `班级 Agent`，让用户知道为什么列表更短。
- 未授权、仅教师可见、仅私聊可用、已从班级移除的 Agent 完全不进入候选；不要灰置泄露。
- 如果未来提供“全部/Agent/成员”切换，使用单选 filter，不在每个 option 内放 checkbox；首版在只有两个 group 时没有必要增加 Tab 栏。

### 7.4 搜索和排序

搜索不需要二次入口。打开 Picker 后直接输入，匹配：

1. Agent 显示名与 mention alias；
2. 学科、课程和年级；
3. 教师配置的公开能力关键词，例如“实验”“口语”“错题”；
4. 拼音首字母可作为中文输入效率优化，但必须在原型中验证误匹配。

排序顺序推荐保持可解释：

1. 名称/alias 精确匹配；
2. 名称前缀与学科精确匹配；
3. 当前课程/当前群相关 Agent；
4. `最近在本班使用`（最多 3 个，独立分组）；
5. 其余按教师配置顺序，再按稳定名称排序。

不要用不可解释的个性化相关度改变精确匹配；教师和学生可以拥有各自的“最近使用”，但 `全部 Agent` 的稳定顺序与授权集合应一致。搜索无结果时显示：`没有匹配的已授权 Agent`，并保留原输入；不得扩大到其他班级或未授权市场结果。

### 7.5 选中后成为语义 token

选中候选后，在 Composer 中插入一个不可歧义的内联 token：

```text
[✦ @物理学习助手]  第 5 题的方向怎么判断？
```

行为规则：

- token 绑定 `agentId`、当前 `authorizationId/version` 与显示快照；提交时不再仅解析文字；
- token 有清晰选中态，`Backspace/Delete` 可整体删除，左右键可跨越；复制粘贴到不支持语义 token 的位置时降级为可读文本，但不能在原应用中误绑定另一个同名 Agent；
- 输入唯一名称并完成分隔符后可以自动建议转 token，但不能在重名时静默转化；
- 同名/近似名必须在候选行显示区分信息，如 `物理 · 高二物理 3 班` 与 `实验 · 高二物理 3 班`；若仍不能区分，要求教师先改名或增加唯一短名；
- 消息正文里出现普通文字 `@某名称`、已经 `Esc` 退出候选的字面 `@`，不触发 Agent。

### 7.6 发送前的持续反馈

选中 token 后，Composer 工具栏将原先泛化的提示替换为具体反馈：

```text
物理学习助手将以 Agent 身份在本群公开回复 · 使用当前消息与已授权课程范围
```

这是常驻一行状态，不使用确认 Modal。仅在下列异常场景阻断或二次处理：

- 授权在发送前失效：保留草稿与 token，显示 `该 Agent 已不可用，请重新选择`；
- token 仍有重名歧义：显示 `请选择具体 Agent` 并重新打开 Picker；
- 用户只有原始文本、没有语义 token：允许作为普通消息发送，但明确提示 `未选择具体 Agent，本消息不会触发 Agent`；
- 同一条消息选择第二个 Agent：首版不并发召唤，提供 `替换为新 Agent` 或 `另发一条消息`，避免多个 Agent 抢答和回复归属不清。

普通公开提问不增加每次确认弹窗；目标、身份、可见范围和上下文范围在发送前持续可见即可。发送后，mention 仍以可辨认 token 呈现，并让对应 Agent 的“回复中”状态与该次 mention 建立视觉和程序关联。

### 7.7 键盘与屏幕阅读器契约

| 操作 | 建议行为 |
| --- | --- |
| 输入 `@` / 点击 `@Agent` | 打开同一 popup；Composer 保持 DOM 焦点；宣布“4 个可用班级 Agent” |
| 继续输入 | 实时过滤；以 status message 宣布“2 个结果”，不重复朗读整张列表 |
| `↓` / `↑` | 移动 `aria-activedescendant`；可见焦点与屏幕阅读器活动项同步 |
| `Enter` | 接受当前 Agent 并插入 token；宣布“已选择物理学习助手，群内公开回复” |
| `Tab` | 首版可接受当前高亮项；若未来候选含次级动作，应遵循产品统一 autocomplete 规则，不双重解释 |
| `Esc` | 关闭 Picker，不清除已写正文；直接输入 `@` 时保留字面字符，不触发 Agent |
| `Backspace` | 查询非空时删字；查询为空且紧邻 token 时整体删除 token |
| IME composing | 中文输入法合成期间不提交、不关闭 Picker、不抢占方向键/Enter |

语义建议以 editable combobox + listbox popup 为基线：`aria-expanded`、`aria-controls`、`aria-activedescendant`、`role=option`、`aria-selected`、有名称的 option group 和可见 focus ring。结果行的 accessible name 应先读差异信息，例如 `物理学习助手，Agent，物理，解题与作业答疑`；不要让每项都以重复的“已授权班级 Agent”开头。

## 8. 多 Agent 教育群聊的决定性体验因素

这些是由上述事实与项目约束得出的 **RECOMMENDATION**，按对体验成败的影响排序。

1. **候选范围可信**：用户看到的每个 Agent 都能在当前班级、当前角色、当前群聊真正使用；权限过滤先于搜索，不展示不可达对象。
2. **目标选择足够快**：新手点击当前 `@Agent`，熟练用户直接输入 `@`；两条路径都能在一次打开和连续键入中完成，不需要“打开 → 再点搜索 → 再选分类”。
3. **身份可区分**：名称之外必须有 Agent 类型、学科/课程范围和核心能力；同名不自动选，不能让“班级 Agent”成为多个对象共享的唯一显示名。
4. **语义绑定可靠**：触发依据是 `agentId` token，而不是正文字符串；改名、别名、复制粘贴、重名和撤销授权都有确定行为。
5. **公开后果在发送前清楚**：学生与教师都能看见“谁会回复、回复对谁可见、会使用什么范围的上下文”；私聊与群聊不能只有颜色差别。
6. **控制群聊噪声**：仍坚持显式 mention；首版一条消息只召唤一个 Agent，避免并发抢答、上下文争用和学生无法判断回复归属。
7. **输入连续性不被破坏**：Picker 只辅助 Composer，不夺走草稿、光标、中文输入法和发送键；关闭、无结果、授权变化均保留用户文字。
8. **键盘与屏幕阅读器是同一交互**：方向键、`Enter`、`Esc`、焦点、选择和动态结果都有程序语义，不另做只能鼠标点击的轻量版。
9. **排序稳定且可解释**：精确匹配优先；最近使用只用于缩短路径，不让教师和学生面对完全不同、无法解释的“智能排序”。
10. **失败发生在发送前或原位恢复**：授权失效、Agent 暂不可用和歧义都在 Composer 原位处理，不能发送后才用沉默或 Toast 告知失败。

## 9. 推荐状态模型与关键边界

```text
closed
  ├─ type @ ─────────────→ open(mixed)
  └─ click @Agent ───────→ open(agent-only)

open
  ├─ type query ─────────→ filtering
  ├─ Enter/click option ─→ token-selected
  ├─ no match ───────────→ empty-authorized-scope
  └─ Esc ────────────────→ closed (draft preserved)

token-selected
  ├─ edit question ──────→ token-selected
  ├─ delete token ───────→ closed/plain-draft
  ├─ authorization stale → stale-token (draft preserved)
  └─ send ───────────────→ public-agent-request
```

领域与 UI 应区分：

- `authorized Agent collection`：授权事实；
- `mention candidate projection`：当前角色、群聊、查询和排序后的候选；
- `mention token`：用户已经选择的稳定对象引用；
- `public Agent request`：发送后才形成的公开触发意图。

打开列表、移动高亮或插入 token 都不是 Agent Run，也不应提前读取群消息上下文或创建回复任务。

## 10. OPEN：需要原型和产品决策验证的问题

1. 单 Agent 时，点击 `@Agent` 是否继续直接插入，还是也先展开一行身份确认；前者更快，后者与多 Agent 模型更一致。
2. 直接输入 `@` 时，Agent 是否永远置于成员之前；建议仅在 Composer 当前提示强调 Agent 时优先，否则保持明确分组，避免影响普通成员 mention。
3. “最近使用”按个人、角色还是班级共享；建议首版按个人本地记录，并保留稳定的“全部 Agent”顺序。
4. 是否搜索 capability 关键词；若 Agent 能力描述由教师自由填写，需要定义同义词和空结果策略，不能宣称自然语言搜索已经可靠。
5. 一条消息是否允许多个 Agent。首版建议限制为一个；只有完成回复编排、顺序、取消、限流和可见性设计后再开放并发 mention。
6. Agent 读取上下文究竟是“当前消息”“当前 thread”“最近 N 条消息”还是课程事实组合；SRC-10 证明这项披露重要，但具体范围必须来自 ClassIn ChannelPolicy，不能从外部产品照搬。
7. 当前 `Textarea` 如何承载稳定的内联 token、IME、复制粘贴和屏幕阅读器；这是后续 Prototype/Spec 的工程与可访问性验证点，本研究不预设具体编辑器实现。

## 11. 最小原型与验收矩阵

| 验收任务 | 必须覆盖 | 成功信号 |
| --- | --- | --- |
| 快速唤起 | 输入 `@`、点击 `@Agent` | 两条路径进入同一候选模型；点击路径自动限定 Agent |
| 找到目标 | 4、10、30 个授权 Agent；名称、别名、学科、能力查询 | 无需第二次点击搜索；精确目标稳定排首位 |
| 多实体 | 成员与 Agent 同名、两个 Agent 近似名 | 类型、学科和能力可区分；不静默选错 |
| 权限 | 师生同一全员可见集合；教师私有/私聊-only Agent | 不可用对象完全不出现；不会泄露其他范围 |
| Token | 选中、改名、删除、复制粘贴、重复选择 | `agentId` 不漂移；重名与文本 mention 不误触发 |
| 发送前 | 普通状态、授权失效、未解析文本、选择第二 Agent | 草稿保留；公开范围清楚；异常原位可恢复 |
| 键盘 | `@`、输入、方向键、`Enter/Tab`、`Esc`、`Backspace` | 全流程不依赖鼠标；焦点始终可见且可预测 |
| 中文输入法 | 拼音候选、Enter 上屏、组合期间方向键 | 不误提交、不误选择、不关闭 Picker |
| 屏幕阅读器 | 打开、结果数变化、活动项、选择、无结果 | name/role/state 和结果变化被准确、克制地宣布 |
| 群聊噪声 | 连续多人提问、同一消息尝试多 Agent | 明确回复归属；首版不会并发召唤多个 Agent |

建议用当前截图位置先做一个不接真实 Runtime 的交互原型，至少准备 4 个 Agent、2 个近似名称、1 个权限变化状态和 1 个空结果状态。核心可用性问题不是“列表是否好看”，而是用户能否在不离开 Composer 的情况下快速、正确、可预期地指定一个公开回复者。

## 12. 结论

一手资料共同支持的不是增加一个庞大的 Agent 管理面，而是一个一致的 Composer 原语：**`@` 选择对象，`/` 选择动作；字符输入与可见按钮打开同一可搜索候选；候选先按权限和当前上下文收窄；选中后成为稳定对象引用；公开后果在发送前持续可见。**

对当前 ClassIn 截图位置，推荐保留低噪 `@Agent` 按钮，把它升级为 Agent-only Mention Picker 的可发现入口；同时让直接输入 `@` 打开包含“班级 Agent / 班级成员”分组的统一 Picker。用户无需再点搜索，继续输入名称、学科或能力即可过滤；方向键与 `Enter` 完成选择；选中后以绑定 `agentId` 的 token 和一行公开范围反馈完成发送前确认。首版一条消息只召唤一个 Agent，以此控制教育群聊中的抢答、误触发与责任归属。
