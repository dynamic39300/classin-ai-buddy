---
title: 私聊 Agent 发现、历史会话与响应等待状态交互研究
status: research-note
date: 2026-08-24
scope: 教师与学生在当前班级内发现已授权 Agent、识别 Agent 身份、恢复私聊历史以及感知 Agent 响应过程
evidence-policy: 仅引用 Slack、Microsoft Teams、Discord、OpenAI、Anthropic 与 W3C/WAI 官方帮助、设计规范和 API 文档
---

# 私聊 Agent 发现、历史会话与响应等待状态交互研究

## 1. 研究问题与边界

当前私聊列表把人类联系人和多个班级 Agent 放在同一平面中，且 Agent 回复即时出现。本研究回答四个可直接进入产品规格的问题：

1. 教师和学生如何在当前班级授权范围内快速找到目标 Agent；
2. 列表、会话 Header 和消息时间线如何持续区分 Agent 与人类；
3. 重新打开 Agent 私聊时如何保留全部历史，并向上加载更早消息而不跳位；
4. Agent 从收到消息到完成回复之间，应显示哪些等待、流式、停止和失败状态。

本研究遵守当前锁定边界：

- `D-071`：群聊与私聊共享 Agent 定义，但执行不同 Channel Policy；学生 Agent 私聊默认不被教师发现；
- `D-072`：教师和学生均可进入同一 Agent 的私聊入口，但线程与上下文按当前用户隔离；
- `D-073`：候选只包含当前班级、当前角色已授权可见的 Agent；搜索和稳定 `agentId` 绑定由统一 Discovery 规则负责；
- 当前仍是固定、脱敏、可重置的 `SIMULATED` Demo，不据此宣称生产 Runtime、真实 Directory 或长期记忆已完成。

本文不修改锁定决策，不实现 UI，也不把业内观察直接写成 ClassIn 事实。

### 证据标签

- **FACT**：由紧邻的一手官方来源直接支持的外部事实；
- **CLASSIN INFERENCE**：结合外部事实与项目锁定边界形成的推论；
- **RECOMMENDATION**：建议进入下一版 PRD/Feature Spec 的候选方案；
- **OPEN**：必须通过产品评审、原型或可用性测试确定。

## 2. 一手来源索引

| ID | 一手来源 | 本研究使用的事实 |
| --- | --- | --- |
| SRC-01 | [Slack：Work with AI agents in Slack](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | 可用 Agent 的集中发现与搜索；Agent sessions 侧栏；续聊与 History；公开/私密渠道区分 |
| SRC-02 | [Microsoft Teams：Designing your bot](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/design/bots) | Bot 的 app name/icon、专属 Chat、私聊欢迎信息、能力与限制说明 |
| SRC-03 | [Discord：User Resource](https://docs.discord.com/developers/resources/user) | User 对象用 `bot` 字段明确标识 OAuth2 application 身份，同时保留 username/avatar |
| SRC-04 | [Discord：Message Resource](https://docs.discord.com/developers/resources/message) | Message 保留 author；`LOADING` flag 表示 bot 正在 “thinking” |
| SRC-05 | [Slack：conversations.history](https://docs.slack.dev/reference/methods/conversations.history/) | DM 历史、用户与 bot/webhook 消息、cursor/time 分页、最近消息优先 |
| SRC-06 | [Microsoft Graph：List messages in a chat](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0) | 聊天消息列表、降序返回、`@odata.nextLink` 翻页 |
| SRC-07 | [W3C APG：Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | 输入过滤、popup、方向键、Enter、Escape 与可访问状态 |
| SRC-08 | [W3C APG：Feed Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/feed/) | 滚动加载的动态内容、焦点与加载协作责任 |
| SRC-09 | [WAI-ARIA 1.2：log role](https://www.w3.org/TR/wai-aria-1.2/#log) | 聊天记录是有意义顺序的 live region；新内容在末尾加入；隐含 `aria-live="polite"` |
| SRC-10 | [CSS Scroll Anchoring Level 1](https://www.w3.org/TR/css-scroll-anchoring-1/) | 内容在视口外插入时通过锚点与滚动偏移补偿减少跳动 |
| SRC-11 | [Slack：Developing AI apps](https://docs.slack.dev/ai/developing-ai-apps/) | 收到输入后立即进入 processing；标准 loading、Stop、active、文本流式输出 |
| SRC-12 | [Slack：assistant.threads.setStatus](https://docs.slack.dev/reference/methods/assistant.threads.setStatus/) | `is thinking...` 状态、loading messages、回复/清空时结束状态 |
| SRC-13 | [Microsoft：ShowTypingMiddleware](https://learn.microsoft.com/en-us/javascript/api/botbuilder-core/showtypingmiddleware) | 首次 typing 延迟、周期性续发、直到 bot 发出消息 |
| SRC-14 | [OpenAI：Streaming API responses](https://platform.openai.com/docs/guides/streaming-responses) | 完整输出会产生等待；SSE streaming 可在继续生成时先呈现开头 |
| SRC-15 | [Anthropic：Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | SSE 的 message/content-block delta、完成和流内错误事件 |

## 3. 观察事实：Agent 发现不是普通联系人模糊搜索

### 3.1 可用范围先于搜索

- **FACT**：Slack 的 `Agents & tools` 集中展示用户已经可以访问的 Agent；用户可在 `Apps` 中搜索并选择一个 Agent，所有 Agent sessions 出现在专用侧栏并可从上次位置继续。[SRC-01](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)
- **FACT**：Slack 把“已安装且有访问权的 Agent”和去 Marketplace 搜索新 Agent 分成两条路径；前者是使用，后者可能触发安装或管理员审批。[SRC-01](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)
- **FACT**：WAI-ARIA Combobox 允许输入直接过滤关联 popup；方向键浏览候选，`Enter` 接受，`Escape` 关闭且不必破坏原输入。[SRC-07](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

**CLASSIN INFERENCE**：当前私聊搜索不能先返回全机构 Agent，再把未授权项灰置；那既泄露存在性，也把授权失败推迟到点击后。正确顺序是：

```text
当前班级 + 当前登录用户/角色
  -> 授权与可见性过滤
  -> 对可见 Agent 建立可搜索索引
  -> 名称/别名/学科/能力匹配
  -> 稳定排序与结果分组
```

### 3.2 “查找可聊对象”与“安装/授权新 Agent”必须分开

- **FACT**：Slack 在已可用 Agent 区域内开始会话；安装新 Agent 则进入 AgentExchange/Marketplace 和授权流程，两者不是同一个搜索结果动作。[SRC-01](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)
- **FACT**：Teams 支持从 Store、App flyout 或新聊天/Composer 的 `@mention` 添加 bot；这是“添加能力”，而专属 Chat 是已经可用后的交互空间。[SRC-02](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/design/bots)

**CLASSIN INFERENCE**：M4.2/M4.x 私聊搜索只承担“找到当前班级已经授权给我的 Agent”。`申请授权`、`安装 Agent`、跨班搜索与治理后台不应混入当前列表。

## 4. 观察事实：Agent 身份需要结构化、重复且不依赖颜色

- **FACT**：Teams 把 bot 会话的结构明确拆为 `App name and icon`、专属 `Chat tab` 和 `Chat bubble`；在首次私聊中还要求 bot 说明自己能做什么、限制是什么以及用户可以怎样开始。[SRC-02](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/design/bots)
- **FACT**：Discord 的 User 对象除 username/avatar 外，还有布尔字段 `bot`，用于判断该用户是否属于 OAuth2 application；这说明“是不是 bot”是独立身份属性，不应从头像或名称字符串猜测。[SRC-03](https://docs.discord.com/developers/resources/user)
- **FACT**：Discord Message 保留 author；webhook/application 消息另有 `webhook_id`/`application_id` 等结构化归属，不能只靠气泡样式判断作者。[SRC-04](https://docs.discord.com/developers/resources/message)

**CLASSIN INFERENCE**：列表行、Header 和每条消息都应从同一个 `participantKind = human | class-agent` 与稳定 `agentId` 投影身份。视觉符号只是投影，不能成为权限或路由判断依据。

## 5. 观察事实：历史是同一会话的可分页消息序列

- **FACT**：Slack 明确允许从 Agent 的 Chat 恢复会话并在 History 查看聊天历史；`Agents & tools` 侧栏还用于“pick up sessions where you left off”。[SRC-01](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack)
- **FACT**：Slack `conversations.history` 获取某个 conversation 的消息与事件历史，支持 DM；返回值既可包含用户消息，也可包含 bot/webhook 格式化消息，并用 `next_cursor` 或时间边界继续分页，时间范围内最近消息先返回。[SRC-05](https://docs.slack.dev/reference/methods/conversations.history/)
- **FACT**：Microsoft Graph 的 chat messages 也以 chat ID 为边界，当前支持按 created/lastModified time 降序返回，并用 `@odata.nextLink` 继续取下一页。[SRC-06](https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0)
- **FACT**：W3C Feed Pattern 把滚动加载定义为动态内容列表，并要求页面根据包含 DOM focus 的内容负责加载与视觉滚动；WAI-ARIA `log` 直接把 chat log 和 messaging history 列为有意义顺序的 live region。[SRC-08](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)、[SRC-09](https://www.w3.org/TR/wai-aria-1.2/#log)
- **FACT**：CSS Scroll Anchoring 通过追踪 anchor node 并补偿 scroll offset，目的是降低视口之外新增内容造成的阅读位置跳动。[SRC-10](https://www.w3.org/TR/css-scroll-anchoring-1/)

**CLASSIN INFERENCE**：点击列表中的既有 Agent 必须恢复同一个隔离 thread，而不是每次创建空白 Chat；向上取回旧页时，以插入前首条可见消息 ID 为锚点恢复位置，不按“加载后继续保持 scrollTop=0”处理。

## 6. 观察事实：等待、生成与完成是不同状态

- **FACT**：Slack 推荐 Agent 收到用户消息后立即把 session 设为 `processing`；界面显示标准 loading，并可在接入停止事件后提供 Stop。完成后必须显式改回 `active`，否则 processing 会持续到超时。[SRC-11](https://docs.slack.dev/ai/developing-ai-apps/)
- **FACT**：Slack 的兼容接口允许显示 `is thinking...` 等状态和轮换 loading messages，目的正是为较慢响应设定用户预期；回复或清空状态时结束 indicator。[SRC-12](https://docs.slack.dev/reference/methods/assistant.threads.setStatus/)
- **FACT**：Microsoft 的 typing middleware 可以配置首次 indicator 的 delay 与后续 period；indicator 持续到 bot 发出另一条消息。[SRC-13](https://learn.microsoft.com/en-us/javascript/api/botbuilder-core/showtypingmiddleware)
- **FACT**：Discord Message 的 `LOADING` flag 明确表示 Interaction Response 中 bot 正在 “thinking”。[SRC-04](https://docs.discord.com/developers/resources/message)
- **FACT**：OpenAI 指出整段生成完再返回会产生等待，SSE streaming 允许在完整响应仍在生成时先呈现开头；Anthropic 也把消息流拆成开始、content deltas、完成和流内 error 事件。[SRC-14](https://platform.openai.com/docs/guides/streaming-responses)、[SRC-15](https://platform.claude.com/docs/en/build-with-claude/streaming)

**CLASSIN INFERENCE**：一个纯粹的 `setTimeout` 后突然插入完整回复，只解决“看起来没那么快”，却没有表达系统当前处于什么状态，也无法处理停止、失败或真实 streaming。Demo 也应先有可测试状态机，再由 Mock Adapter 提供确定性耗时。

## 7. 面向 ClassIn 的推荐规格

以下均为 **RECOMMENDATION**，尚不是新的 `LOCKED` 决策。

### 7.1 私聊列表和搜索

#### 7.1.1 空查询时的列表结构

保留一个私聊列表，不新增独立“Agent 产品页”；在列表内部建立可扫描分组：

```text
[搜索私聊或班级 Agent                         ]
[全部] [Agent 4] [联系人]

本班已授权 Agent · 4
  [Agent avatar] 物理学习助手   [AI Agent]
                 物理 · 解题提示与知识点辅导
  [Agent avatar] 作业订正助手   [AI Agent]
                 作业 · 错因定位与订正建议

最近私聊
  [human avatar] 王老师         物理老师
  [human avatar] 陈同学         高二物理 3 班
```

规格建议：

- 默认 `全部`；`Agent` 是搜索 scope/filter，不是第二套搜索页面；
- 分组标题显示真实可见数量，如 `本班已授权 Agent · 4`；零个时显示“本班暂未向你授权 Agent”，不泄露其他 Agent；
- Agent 初始排序：置顶 → 最近有会话 → 最近使用 → 名称稳定排序；输入查询后改为精确名称 → 名称前缀/别名 → 学科 → 能力关键词 → 最近使用；
- 只索引当前班级和当前角色已授权字段：`displayName`、受控 aliases、subject、短 capability labels；不搜索任意生成内容或学生历史正文；
- 命中字符高亮，但结果可访问名称必须仍包含完整 Agent 名称、`AI Agent` 身份、学科和授权班级；
- 搜索结果按 `班级 Agent`、`联系人` 分组；若 scope 为 `Agent`，不再混入人类；
- 选择结果后绑定稳定 `agentId` 并打开该用户既有 thread；显示名称相同也不得静默猜选。

#### 7.1.2 搜索交互与键盘契约

- 输入框采用 editable combobox 语义，popup 为分组 listbox；`aria-expanded`、`aria-controls`、`aria-activedescendant` 和 option 的 `aria-selected` 与视觉状态同步；
- 输入即过滤，不要求用户再点“搜索”；`↓/↑` 遍历，`Enter` 打开会话，`Escape` 清空当前 popup/退出结果但不意外切换会话；
- 非抢焦点的 `role="status"` 宣布一次结果数量，例如“找到 3 个已授权 Agent”，不逐字符播报整张列表；
- 查询为空时恢复分组和稳定顺序；无结果文案明确搜索范围：“本班已授权 Agent 中没有匹配结果”；
- 搜索失败与无权限是不同状态；前者提供重试，后者不显示不可用 Agent。

### 7.2 Agent 与人类的身份区分

三个位置使用同一套身份投影：

| Surface | Agent 必备投影 | 人类投影 | 禁止只依赖 |
| --- | --- | --- | --- |
| 私聊列表行 | 专属 Agent avatar；完整名称；文字徽标 `AI Agent`；学科/能力短句；模拟真值标签按现有规则呈现 | 人类头像；姓名；教师/学生或班级关系 | 只有头像底色、方圆形状或绿色在线点 |
| 会话 Header | Agent avatar + 名称 + `AI Agent`；`本班已授权`；能力/可见范围入口 | 姓名 + 人类角色/关系 | 名称中含“助手”两个字 |
| 消息时间线 | 每个连续消息组首条显示 Agent avatar、名称和 `AI Agent`；每条 DOM message 保留可访问 author label | 现有自己/对方气泡与真实姓名 | 单纯让 Agent 气泡换颜色 |

补充规则：

- Agent avatar 可使用统一外框/角标表达类别，但每个 Agent 必须有不同图形或学科符号，不能都用黑底单字；
- `AI Agent` 是文字身份，不只显示 sparkle 图标；屏幕阅读器可读为“物理学习助手，AI Agent”；
- 图片、H5 卡片或附件属于该 Agent 消息时，附件的 author metadata 仍指向同一 `agentId`；不能因为消息主体是图片就丢失身份；
- Agent 不使用“在线/离线”绿点伪装人类 presence；运行状态用 `正在思考`、`回复已停止` 等会话状态表达；
- 首次空线程显示简短 welcome：它是谁、由哪个班级授权、能做什么、不会做什么，以及 2–3 个建议问题；不能只显示空白 Composer。

### 7.3 历史消息与向上翻页

#### 7.3.1 线程归属

建议稳定键至少包含：

```text
directAgentThreadKey = classId + currentParticipantId + agentId + channelPolicy
```

教师和学生选择同一个 Agent 仍进入各自 thread；教师列表、搜索、历史 API 和本地缓存都不能读取学生 thread。切换显示名称、排序或过滤不改变 thread key。

#### 7.3.2 打开与加载契约

1. 打开已有 Agent：先显示最近一页，默认定位到未读锚点；没有未读则定位底部；若在当前设备同一 Session 内刚离开，则优先恢复保存的消息 ID 锚点。
2. 接近顶部：顶部出现 `正在加载更早消息…`，请求 `before/cursor` 页；同时保留一个可点击/键盘触发的 `加载更早消息` 回退入口。
3. 请求成功：把旧页 prepend；用加载前首条可见 `messageId` 恢复其原视觉位置；不得跳到最顶部或最底部。
4. 请求失败：顶部原位显示“更早消息加载失败 · 重试”，当前已读消息不消失。
5. 到达起点：显示一次“已显示全部历史消息”，随后保持稳定，不重复请求。
6. 阅读旧消息时收到新消息：不强制贴底；显示 `N 条新消息` 锚点。用户点击或本来就在底部时才滚到新消息。

消息记录采用 `role="log"`/等价语义并给出可访问名称。向前 prepend 的旧历史不应当作为“新到消息”逐条播报；真正追加在末尾的 Agent 新回复使用 polite announcement。加载状态使用独立 `role="status"`，不移动键盘焦点。

#### 7.3.3 历史数据最小字段

```text
ConversationMessage
  id
  threadId
  author: { kind, participantId | agentId, displayName, avatarRef }
  direction: inbound | outbound
  body / attachmentRefs
  createdAt
  deliveryState
  simulationLabel

HistoryPage
  messages
  olderCursor?
  hasOlder
```

历史中必须同时保存人类消息和 Agent 消息；不能只保存 Agent 最终答案，也不能在重新进入时用当前 Prompt 重新生成过去回复。

### 7.4 Agent 响应状态机与等待体验

#### 7.4.1 状态机

```text
idle
  -> accepted       // 用户消息已落到时间线
  -> processing     // Agent 正在处理；尚无正文 token
  -> streaming      // 已出现第一段可见回复
  -> completed

processing | streaming
  -> stopped        // 用户停止或会话切换策略终止
  -> recoverable-failure
```

每个状态只有一个所有者；不要用 `isTyping + isLoading + hasReply + done` 等互相冲突的布尔值拼装。

#### 7.4.2 教师与学生共用的可见体验

1. 用户发送后，自己的消息立即进入时间线并显示发送时间；
2. 紧随其后显示带该 Agent avatar/name 的状态行：`物理学习助手正在思考…`，三点动画只作辅助；
3. 如果处理超过约 3 秒，可把稳定文案改为与任务相关但不冒充内部推理的阶段说明，例如 `正在整理题目条件…`；不要高速轮播俏皮文案；
4. 第一段回复到达后，用同一消息容器从 `processing` 原位转为 `streaming`，不先删除状态再在别处跳出气泡；
5. streaming 完成后一次性标记 `completed`，开放反馈/追问；
6. processing/streaming 提供可访问的 `停止回复`；停止后保留用户消息与已产生内容，并显示 `回复已停止，可重新生成`；
7. 失败在同一位置显示可恢复错误和 `重试`，不得让 loading 永久存在，也不得伪造一条成功回复。

#### 7.4.3 Demo 的确定性时间建议

以下时间是 **CLASSIN RECOMMENDATION**，不是 Slack、Teams、OpenAI 或 Anthropic 的行业标准：

- 当前模拟回复固定在发送后立即进入 `processing`；
- 为解决“回复瞬时出现”的验收问题，首个可见正文在 `1.2–1.8s` 的确定性区间出现；测试用固定 scenario seed，禁止随机造成 flaky test；
- 随后以小段而非逐字动画完成 `streaming`，总可见生成过程约 `1–3s`；
- 如果回复只有一个极短句，也至少让 processing 状态可被感知，但不应为了“像 AI”强制生产 Runtime 延迟；真实接入后以真实 first-token 和 stream 事件替换 Mock 时钟；
- Demo 的 Header/会话信息继续显示既有 `模拟` 真值标签，不能让等待动画暗示已经接入真实模型。

#### 7.4.4 等待状态的可访问性

- 状态容器使用 `role="status"`/polite live region，只播报一次“物理学习助手正在思考”和一次“回复完成”；装饰性跳动圆点 `aria-hidden="true"`；
- `prefers-reduced-motion: reduce` 下取消位移/跳动，但保留静态文案和停止按钮；
- streaming 不逐 token 触发屏幕阅读器播报；完成一段或完成整条后再宣布；
- 状态文本必须带 Agent 名称，不能只说“正在输入”，否则在切换多个 Agent 后无法确定响应者；
- 停止、失败和重试可由键盘访问，focus ring 清晰；状态变化不抢走 Composer 焦点。

## 8. 教师与学生渠道矩阵

| 场景 | 可发现候选 | 打开后的历史 | 身份与等待 |
| --- | --- | --- | --- |
| 教师搜索 Agent 私聊 | 当前班级对该教师可见且允许 direct 的 Agent；不显示学生专属 thread | 只恢复该教师与目标 Agent 的历史 | `AI Agent` 身份与 processing/streaming 状态完整显示 |
| 学生搜索 Agent 私聊 | 当前班级对该学生可见且允许 direct 的 Agent；不显示教师 WorkBuddy | 只恢复该学生与目标 Agent 的历史 | 与教师端共用组件和状态机，不因学生角色简化 |
| 教师搜索人类 | 当前教师有权私聊的联系人 | 人类私聊历史 | 不显示 `AI Agent` 或思考状态 |
| 学生搜索人类 | 当前学生有权私聊的联系人 | 人类私聊历史 | 人类 typing 与 Agent processing 在文案/身份上区分 |

## 9. 反模式

以下做法应明确写入 Feature Spec 的禁止项：

1. **未授权项灰置**：泄露其他班级或角色专属 Agent；候选生成前就应过滤。
2. **把“搜索可用 Agent”与“安装/申请 Agent”混在一起**：点击结果后才告知无权限，破坏定位任务。
3. **只用黑底单字头像区分 Agent**：人类也可能使用同样头像；必须有结构化身份与文字徽标。
4. **把“助手”名称当类型**：改名、重名和本地化后都会误判。
5. **点击 Agent 永远开新空线程**：丢失连续性，也让用户误以为历史没有保存。
6. **prepend 旧页后滚动跳顶/跳底**：破坏阅读锚点；必须按 message ID 补偿位置。
7. **用户阅读历史时自动贴底**：新消息到来会夺走阅读位置；使用“新消息”锚点。
8. **用一个无限 spinner 代替状态机**：无法表达停止、失败、streaming 或完成。
9. **展示伪造的思维链、百分比或精确剩余时间**：没有真实证据；可描述任务阶段，不声称内部推理内容。
10. **每个 token 都进 live region**：屏幕阅读器会被连续打断；按阶段/完成聚合播报。
11. **生产也人为 sleep**：Demo 的确定性延迟只能属于 Mock Adapter，不能进入真实 Runtime Interface。
12. **等待动画取消模拟标签**：更真实的动效不等于真实模型已经接入。

## 10. 可直接转成验收条件的清单

### 搜索与列表

- [ ] 教师与学生切到 `Agent` scope 后，只看到当前班级、当前角色已授权 Agent，数量准确；
- [ ] 名称、别名、学科、能力关键词均能命中，精确名称优先且排序稳定；
- [ ] 键盘可完成打开、筛选、遍历、确认和退出；无结果/结果数可被辅助技术感知；
- [ ] 同名 Agent 必须显式消歧，选择后绑定稳定 `agentId`；
- [ ] 每个 Agent 列表行与 Header 都有唯一头像、完整名称、文字 `AI Agent` 和授权/能力说明。

### 历史

- [ ] 从搜索结果和普通列表点击同一 Agent，进入同一个当前用户隔离 thread；
- [ ] 最近一页同时包含人类与 Agent 的历史消息；
- [ ] 向上加载旧页后，加载前首条可见消息仍处于近似视觉位置；
- [ ] 失败、无更多、重试均为可见状态，已有消息不丢失；
- [ ] 阅读旧消息期间收到新消息不强制贴底；
- [ ] 教师无法通过搜索、列表或历史接口读取学生与 Agent 的隔离 thread。

### 响应状态

- [ ] 教师和学生发送后均先看到带目标 Agent 身份的 `正在思考…`；
- [ ] Mock 首段回复按固定 scenario timing 延后出现，E2E 使用可控 fake clock/配置而非真实随机等待；
- [ ] processing → streaming → completed 状态顺序可观察且不会出现互相矛盾 UI；
- [ ] processing/streaming 可停止；失败可重试；状态不会永久悬挂；
- [ ] reduced-motion、键盘、屏幕阅读器状态播报通过；
- [ ] 模拟真值标签始终存在。

## 11. 仍需产品拍板的 OPEN 项

1. 空查询时 Agent 分组是否永远位于人类最近私聊之前，还是仅在用户选择 `Agent` scope 后置顶；
2. 默认搜索 scope 是 `全部` 还是记住上次 `Agent/联系人` 选择；
3. 当前班级如何在全局消息中心中确定：跟随最近班级、显式班级筛选，还是每个 Agent 行标班级；
4. Demo 采用 `1.2s` 固定首段等待，还是按回答长度使用固定 scenario 配置表；
5. 首期是否实现真正的分段 streaming，或只实现 processing 后整条完成；推荐实现最少两段，以验证状态机而非仅延时。

## 12. 结论

业内一手资料共同支持四个稳定原则：

1. **先做授权范围，再做搜索**：用户寻找的是“现在可聊的 Agent”，不是整个 Agent 市场；
2. **身份是数据，不是配色**：Agent 必须在列表、Header 与消息 author 中持续以稳定 ID、名称、头像和文字徽标出现；
3. **历史属于隔离 thread**：点击 Agent 是恢复同一会话；向上分页必须保留阅读锚点并同时保存人类与 Agent 消息；
4. **等待是状态机，不是 sleep**：先 processing，再 streaming/completed，并覆盖 Stop、失败和无障碍；Demo 延迟由 Mock Adapter 确定性提供，不能污染真实 Runtime。

因此，下一步 PRD/Spec 应把“Agent 私聊搜索 + Agent identity projection + paged history + response lifecycle”定义成一个跨教师/学生复用的纵向闭环；角色差异只进入授权候选与 thread ownership，不复制两套交互。
