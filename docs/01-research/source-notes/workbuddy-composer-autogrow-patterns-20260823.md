---
title: WorkBuddy Composer 自动增长、高度上限与字符计数模式研究
status: research-note
date: 2026-08-23
scope: ClassIn PC 教师 IM 沉浸式页面中 WorkBuddy 私密 Composer 的自动增长、溢出滚动、字符上限与计数反馈
evidence-policy: 仅引用官方设计系统、官方产品文档与官方开源源码；明确区分 FACT 与 CLASSIN INFERENCE
---

# WorkBuddy Composer 自动增长、高度上限与字符计数模式研究

## 1. 结论先行

面向当前 ClassIn PC WorkBuddy Sidecar，建议采用以下参数作为 MVP 基线：

| 项目 | 推荐值 | 说明 |
| --- | --- | --- |
| 初始高度 | `1` 个文本行，输入区域最小高度 `2.5rem / 40px` | 空输入保持紧凑；当前参考任务因自然换行可以直接呈现为 2–3 行，不需要固定多行 |
| 自动增长 | 每次输入、粘贴、删除和容器宽度变化后，根据内容高度重算 | 未达到上限时不显示输入区滚动条 |
| 最大高度 | `10rem / 160px`，约可见 6–7 行中文任务描述 | 取成熟 AI Composer 官方示例的较宽裕一档；不会持续侵占 Run 主体空间 |
| 超限行为 | 高度保持 `160px`，输入区切换为 `overflow-y: auto` | 光标位置应保持可见；Sidecar 主体与 Composer 各自滚动，互不抢夺滚动 |
| 字符上限 | `4,000` 个 Unicode 字符作为 MVP 技术上限 | 接近成熟消息产品公开上限的高位，同时避免用户把长文档内容直接塞进 Composer |
| 计数器 | 默认隐藏；达到 `3,200 / 4,000`（80%）后显示 `已输入 / 上限` | 减少常态噪声；靠近上限时才给出可操作反馈 |
| 达到上限 | 不再接受更多输入，并保留已有内容；粘贴时不可无提示丢失 | 应显示明确说明，并引导长内容通过文件或上下文加入，而不是继续扩大文字上限 |
| 键盘 | PC 上 `Enter` 发送，`Shift+Enter` 换行；IME 组合输入时不发送 | 与 VS Code Chat 的公开实现说明一致；显式发送按钮始终保留 |

上述数值属于 **CLASSIN INFERENCE**，不是外部产品规范直接规定的唯一答案。外部事实支持的是“紧凑起步—自动增长—受控封顶—内部滚动—仅在必要时提示字符限制”这一组合模式。

## 2. 证据标签与边界

- **FACT**：可以从下列一手来源直接验证的产品、组件或源码行为。
- **CLASSIN INFERENCE**：结合 ClassIn PC 的右侧辅助区宽度、教师任务输入和当前设计规范得出的推荐，不是来源原话。
- **OPEN**：需要通过教师可用性测试或真实输入数据验证，当前不能升级为事实。

本研究只回答 Composer 的输入体验，不改变 WorkBuddy Run、教师审批、消息发送身份或权限模型。

## 3. 一手来源索引

| ID | 来源 | 一手性质 | 本次可用证据 |
| --- | --- | --- | --- |
| SRC-01 | [Material UI Textarea Autosize](https://mui.com/material-ui/react-textarea-autosize/) / [API](https://mui.com/material-ui/api/textarea-autosize/) | MUI 官方组件文档 | Textarea 可随输入和窗口变化自动调整；`minRows`、`maxRows` 显式限定可见行数；官方最大高度示例使用 `maxRows={4}` |
| SRC-02 | [assistant-ui 官方 Base Composer 源码](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/base.tsx) | 成熟开源 AI UI 项目官方源码 | Base Composer 使用紧凑最小高度与 `max-h-32`，并禁止手动 resize |
| SRC-03 | [assistant-ui 官方 Gemini Composer 示例源码](https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/components/examples/gemini.tsx) | 成熟开源 AI UI 项目官方源码 | 输入从 `rows={1}` 开始，使用 `leading-6` 与更宽裕的 `max-h-40`，并禁止手动 resize |
| SRC-04 | [Tailwind CSS max-height](https://tailwindcss.com/docs/max-height) | Tailwind 官方文档 | `max-h-<number>` 是基于 spacing token 的固定最大高度，支持自定义精确值；项目主题可以重写 spacing，因此外部类名不能脱离主题机械换算 |
| SRC-05 | [Slack Block Kit plain-text input](https://api.slack.com/reference/block-kit/block-elements#input) | Slack 官方 API 文档 | 输入可为单行或多行；`max_length` 合法范围为 1–3000 个字符 |
| SRC-06 | [Discord Sending Messages](https://support.discord.com/hc/en-us/articles/360034632292-Sending-Messages) / [Message Resource](https://docs.discord.com/developers/resources/message) | Discord 官方帮助与 API 文档 | 普通消息上限 2000 字符；Nitro 为 4000；API 创建消息正文上限为 2000 |
| SRC-07 | [GOV.UK Character count](https://design-system.service.gov.uk/components/character-count/) | GOV.UK 官方设计系统 | 仅在确有技术或业务理由时设置字符限制；可按百分比 threshold 延后展示计数；建议上限高于多数用户实际需要 |
| SRC-08 | [VS Code Sessions architecture：chat input keyboard behavior](https://github.com/microsoft/vscode/blob/main/src/vs/sessions/SESSIONS.md) | Microsoft 官方 GitHub 规格文档 | 普通 Enter 提交；Shift+Enter 和 IME 组合期间的 Enter 保留给换行/完成输入法组合 |

## 4. 调研事实

### 4.1 自动增长和最大行数是两个独立控制量

- **FACT（SRC-01）**：MUI 将 Textarea Autosize 定义为随键盘输入和窗口尺寸变化自动匹配内容高度的组件，同时提供 `minRows` 与 `maxRows`；官方示例用 `maxRows={4}` 演示内容达到上限后的受控高度。
- **FACT（SRC-02、SRC-03）**：assistant-ui 的官方 Base 和 Gemini Composer 都禁止用户手动拖拽调整，依赖自动布局；Gemini 示例明确从 `rows={1}` 开始并设置最大高度。

**CLASSIN INFERENCE**：WorkBuddy 不应固定显示一块大文本框，也不应让用户手动拖拽。空输入从一行起步；输入、粘贴或删除时自然增长或收缩；到达最大高度后才出现输入区内部滚动。

### 4.2 成熟 AI Composer 的公开实现给出了紧凑档和宽裕档

- **FACT（SRC-02）**：assistant-ui Base Composer 源码使用 `min-h-10` 和 `max-h-32`。
- **FACT（SRC-03）**：其 Gemini 风格示例使用 `rows={1}`、`leading-6`、`max-h-40`。
- **FACT（SRC-04）**：这些高度类由项目 spacing token 计算，主题可以重写；因此可靠事实是两个示例采用了不同的受控上限，而不是所有项目中类名都必然等于同一像素值。

**CLASSIN INFERENCE**：ClassIn WorkBuddy 是任务型 Agent 输入，通常比普通 IM 消息更长，采用宽裕档 `10rem / 160px` 比 `8rem / 128px` 更合适。按当前约 1.45 行高和内边距，约能完整查看 6–7 行中文指令；在 900px 高的 PC 工作区中仍不会让输入框主导页面。

### 4.3 字符上限不应由可见高度决定

- **FACT（SRC-05）**：Slack 的多行 plain-text input 可以配置 `max_length`，文档允许的上限范围是 1–3000。
- **FACT（SRC-06）**：Discord 普通消息正文限制为 2000 字符，Nitro 消息为 4000；超过普通客户端限制的长内容会转成文本文件。
- **FACT（SRC-07）**：GOV.UK 明确建议只有在法律或技术原因、或有证据证明用户会输入过多时才使用字符限制；如果用户频繁触顶，应考虑提高限制，而不是只依靠计数器。

**CLASSIN INFERENCE**：可见高度解决“编辑时占多少屏幕”，字符上限解决“系统愿意接收多大的任务文字”，两者不能互相替代。WorkBuddy 可以在 160px 内滚动编辑 4000 字符，但大段资料、试题或文档正文应通过附件/上下文进入，避免把 Composer 变成长文编辑器。

### 4.4 计数器应渐进出现，而不是常驻制造压力

- **FACT（SRC-07）**：GOV.UK Character count 支持按上限百分比配置 threshold；在阈值前对视觉用户隐藏，接近限制后再显示。其建议将限制设置得高于多数用户实际需要。
- **FACT（SRC-07）**：GOV.UK 的实现会为视觉用户实时更新，并在屏幕阅读器用户停止输入后播报，避免每次按键都造成干扰；其组件还特别提醒 Unicode/emoji 与“字符”计数口径可能不同。

**CLASSIN INFERENCE**：WorkBuddy 采用 4000 字符上限时，在 80%（3200）后显示 `3,200 / 4,000`。不应从第一个字符起永久显示 `87 / 4,000`；靠近上限才出现，达到上限后切换为清晰的限制提示。计数口径需要在工程上统一为“用户感知字符”或明确使用 JavaScript 字符串长度，避免 emoji 与组合字符造成 UI、前端校验和服务端校验不一致。

### 4.5 PC 键盘发送必须尊重换行与中文输入法组合

- **FACT（SRC-08）**：VS Code Chat 的规格说明区分普通 Enter、Shift+Enter 和 IME composition：普通 Enter 提交，Shift+Enter 插入换行，输入法组合期间的 Enter 不触发提交。

**CLASSIN INFERENCE**：ClassIn PC 应采用相同规则，并始终保留可点击发送按钮。实现时至少检查 `event.isComposing` 或原生事件的 composition 状态，防止教师在中文选词确认时误发送任务。

## 5. 对 ClassIn PC 的推荐规格

### 5.1 尺寸与滚动

```text
空内容 / 一行内容
  textarea：min-height 2.5rem（40px），无纵向滚动条
       ↓ 内容换行或粘贴
自动增长
  height = min(scrollHeight, 10rem)
       ↓ scrollHeight > 10rem
封顶
  height = 10rem（160px）
  overflow-y = auto
  保持光标与当前编辑行可见
```

建议 CSS/行为约束：

1. `rows={1}`，`resize: none`，避免初始空框过高和用户拖拽破坏 Sidecar 布局。
2. `min-height: 2.5rem`；`max-height: 10rem`；未溢出时 `overflow-y: hidden`，溢出后切换为 `auto`。
3. 每次内容变化先把高度重置为 `auto`，再取 `min(scrollHeight, maxHeight)`；删除文字时必须同步回缩。
4. Sidecar 宽度变化会改变换行数量，应通过 `ResizeObserver` 或等价布局事件重新测量，不能只监听键盘输入。
5. Composer 外壳保持固定在 Sidecar 底部；仅 textarea 内部增长，辅助说明和发送按钮不随文本滚动消失。
6. 细滚动条只属于真正溢出的 textarea；未溢出时不要常驻显示一条灰色轨道。

### 5.2 字符上限与反馈

建议 MVP 使用：

```text
0–3199 字符       不显示计数器
3200–3999 字符    显示“3,200 / 4,000”
4000 字符         显示“已达 4,000 字上限”并停止继续输入
粘贴超过上限      保留可接受部分，同时给出非阻断提示；不得静默截断
```

字符上限选 `4000` 的理由是：

- 高于 Slack 多行输入公开允许的 3000，能容纳教师包含班级、对象、约束和输出格式的复合任务；
- 与 Discord 官方公开的长消息高位一致，可作为成熟消息产品的上界参照；
- 仍足够低，可以明确把长课件、文章、题目集合引导到文件/上下文能力，而不是把 Sidecar Composer 发展成编辑器；
- 4000 是产品保护阈值，不代表推荐用户每次输入 4000 字。

### 5.3 无障碍与异常状态

- 计数反馈使用独立可访问描述；不要把每个字符变化都通过高频 `aria-live` 播报。
- 达到上限、粘贴被截断或发送失败时，提示必须说明发生了什么以及如何修复。
- 自动增长不能改变键盘焦点或把 Sidecar 主体强制滚到底部。
- 输入区内部开始滚动后，滚轮/触控板在边界处是否把滚动传递给 Sidecar body，需要在浏览器中实测，避免嵌套滚动陷阱。
- 中文、emoji、换行、组合字符和超长不换行字符串都应加入自动化测试。

## 6. 仍需验证的 OPEN 项

1. **真实输入分布**：记录脱敏后的字符长度分位数（P50、P90、P95、P99）以及 4000 上限命中率；若教师经常超过 3200，应重新判断任务是否缺少附件/上下文入口，或上限是否过窄。
2. **160px 是否足够**：用“简单催交”“包含多项输出要求”“粘贴一段课程说明”三类任务测试编辑、回看和修改效率；重点观察教师是否频繁在输入区内上下寻找内容。
3. **计数口径**：前后端共同决定按 Unicode code point、grapheme cluster 还是 UTF-16 code unit 计数，并在多端保持一致。
4. **小窗口适配**：在 `1024×640`、浏览器 200%/400% 缩放下，最大高度应考虑改为 `min(10rem, 28dvh)`，保证 Run 和错误/确认操作仍可到达。

## 7. 最终判断

行业一手资料没有给出一个适用于所有聊天产品的统一“最多显示几行”。它们提供的是稳定的组合原则：**起始紧凑、内容驱动增长、设置最大行数或高度、超限后内部滚动；字符限制单独按业务和技术约束确定，并在接近限制时渐进提示。**

因此，ClassIn PC WorkBuddy 的首版建议锁定为：`1 行起步 → 自动增长 → 10rem/160px 封顶 → 内部滚动`，字符上限 `4000`，在 `3200` 后显示计数。该方案与成熟 AI Composer 的公开实现区间一致，也能保护 Sidecar 中 Agent Run 与教师确认操作的可用空间。
