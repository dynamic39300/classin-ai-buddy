---
title: WorkBuddy 待审阅成果面的少边框视觉层级研究
status: research-note
date: 2026-08-23
scope: ClassIn 教师 WorkBuddy 右侧辅助工作台中，四层待审阅成果面如何减少卡片套卡片和重复描边，同时保留人审、编辑与发送层级
evidence-policy: 仅引用官方设计系统与官方组件源码文档；ClassIn 方案单独标注为推论
---

# WorkBuddy 待审阅成果面的少边框视觉层级研究

## 1. 结论先行

**CLASSIN INFERENCE**：当前问题不是四层结构错误，而是几乎每一层都同时使用了“描边、圆角、底色”三种容器信号。右侧 WorkBuddy 本身已经是一张浮起的白色 Surface，内部待审阅成果又有外框，核心区再次有外框，Textarea 还有控件边框，信息行和 Footer 继续用分割线。因此老师看到的是多张套叠卡片，而不是一件待处理成果的连续审阅过程。

推荐采用 **单一外层 Surface + 色块标题 + 无框内容流 + 真实输入控件边界 + Sticky Action Bar**：

```text
WorkBuddy 浮层（唯一外轮廓与阴影）

  暖色状态带  待你审阅  群消息草稿已生成  未发送

  发送至 高二物理 3 班                 王老师 · 30 人可见

  核对名单                             2 项作业 · 5 位学生
  动量守恒作业 A 组   8/10 18:00       移除分组
  @李明  @周悦

  机械波错题订正     8/12 18:00        移除分组
  @王小明  @张然  @赵英  @周悦

  群消息正文                                  可编辑
  ┌─ Textarea：唯一保留完整控件边界 ─────────────────┐
  │ 同学们好……                                      │
  └──────────────────────────────────────────────────┘

  发送前核验最新提交状态                  [确认并发送]
```

关键不是把所有线条都删掉，而是建立边界预算：

- **1 个 Surface 外轮廓**：只属于 WorkBuddy 浮层，不再给 Review Artifact 复制一圈完整卡片边框；
- **1 个输入边界**：Textarea 是可编辑控件，保留清晰默认边界和 Focus Ring；
- **0 至 2 条条件分隔**：只有名单与正文、滚动正文与固定操作区之间确实需要分段时使用；
- 其他层级用背景平面、间距、排版、标签和对齐表达。

## 2. 证据标签与一手来源

- **FACT**：一手来源可以直接核验的规则或实现事实。
- **CLASSIN INFERENCE**：结合事实、当前截图与已锁定四层结构形成的产品推论。
- **OPEN**：需要高保真样机或真实教师测试确认。

| ID | 一手来源 | 本次证据 |
| --- | --- | --- |
| SRC-01 | [Fluent 2：Drawer](https://fluent2.microsoft.design/components/web/react/core/drawer/usage) | Drawer 是与主内容并列的次级 Surface；结构为 Header、Body、Footer。长内容中 Header/Footer 可 Sticky，滚动后用 elevation 与正文分离 |
| SRC-02 | [Fluent 2：Divider](https://fluent2.microsoft.design/components/web/react/core/divider/usage) | Divider 应与 spacing 和 heading 一起建立节奏；Inset divider 表达内容关系更近；Block divider 才表达严格区隔 |
| SRC-03 | [Fluent 2：Elevation](https://fluent2.microsoft.design/elevation) | Elevation 使用光影表达层级、焦点和重要性；无边卡片可以用低阶阴影表达轻微浮起 |
| SRC-04 | [Fluent 2：Card](https://fluent2.microsoft.design/components/web/react/core/card/usage) | Card 应对应单一概念或对象，内容需要简短、行动导向；Header、Body、Footer 是同一对象内部的信息层次 |
| SRC-05 | [Atlassian Design System：Elevation](https://atlassian.design/foundations/elevation/) | Surface 与 shadow 形成 UI 层级；sunken surface 可以作为承载相关内容的 backdrop；raised 主要保留给可移动卡片，或特殊强调场景 |
| SRC-06 | [Primer：ActionList guidelines](https://primer.style/product/components/action-list/guidelines/) | Item divider 只在确实提升复杂列表解析时使用；Primer 明确警告 divider 也可能增加视觉杂乱 |
| SRC-07 | [Primer：ActionList](https://primer.style/product/components/action-list/) | Subtle group heading 默认没有背景和边框；列表可用 Heading、leading/trailing content 和间距建立扫描结构，不必默认打开每项 divider |
| SRC-08 | [Primer：Overlay](https://primer.style/product/getting-started/rails/components/overlay/) | Overlay 的 Header divider 与 Footer divider 是可选参数，不是默认必须存在；Body 以 padding 组织连续内容 |
| SRC-09 | [Primer：Box shadow](https://primer.style/product/css-utilities/box-shadow/) | 小阴影主要用于需要轻微浮起或需要用户注意的内容；大阴影应少量使用 |
| SRC-10 | [Fluent 2：List](https://fluent2.microsoft.design/components/web/react/core/list/usage) | 列表项应采用平行结构和相近行长，以视觉模式而非重复容器提升可扫描性 |

## 3. FACT：行业规则共同指向什么

### 3.1 一件对象只需要一层主要 containment

- **FACT（SRC-04）**：Fluent Card 用于承载一个概念或对象，Header、Body、Footer 是同一张卡的内部组织，而不是要求每个内部区块再成为一张 Card。
- **FACT（SRC-01）**：Fluent Drawer 已经是次级 Surface；其 Body 本身是灵活的内容承载区，Footer 可以承担主要动作。
- **FACT（SRC-08）**：Primer Overlay 把 Header 与 Footer 的 divider 设计成可选项，说明容器结构并不依赖每一层都有边界线。

**CLASSIN INFERENCE**：WorkBuddy 浮层已经完成“这是辅助工作台”的 containment。待审阅 Artifact 属于其 Body 中当前最重要的一件对象，可以用一个暖色状态带建立身份，但不需要再以完整外框和阴影重复声明“我也是一张浮层”。

### 3.2 分隔线是语义标点，不是默认装修

- **FACT（SRC-02）**：Fluent 要求 Divider 与 spacing、headers 联合使用。Inset divider 表达同组内容的近关系；Block divider 才表示严格区分。
- **FACT（SRC-06）**：Primer 只建议在重信息或多行列表确实更易解析时加入 item dividers，并明确提醒分隔线可能只会增加 clutter。
- **FACT（SRC-07）**：Primer 的 subtle group heading 没有背景或边框，列表仍可依靠标题和对齐建立分组。

**CLASSIN INFERENCE**：当前两项作业只有标题、截止时间、学生标签和移除动作，数量很少且结构平行。每项顶部横线不是必需。稳定的 16 至 20px 组间距、标题字重和第二组前的轻微空白，已经足以区分。若教师测试中仍混读，可仅在第二组前加一条短 inset divider，而不是给整个名单加外框。

### 3.3 层级可以由平面和光影表达，不必由线框表达

- **FACT（SRC-03）**：Fluent elevation 用阴影与光照表达层级与焦点；低阶 shadow 可用于无边 Card。
- **FACT（SRC-05）**：Atlassian 把 sunken surface 定义为容纳相关内容的 backdrop，并将 raised surface 主要保留给可移动对象或特殊强调。
- **FACT（SRC-09）**：Primer 建议小阴影用于轻微浮起或需要注意的内容，大阴影在产品 UI 中应克制使用。

**CLASSIN INFERENCE**：名单可落在极浅暖色或中性 sunken plane 中，不画边；编辑器回到白色，利用“浅色底上的白色输入区”形成自然前后关系。唯一的小阴影应该留给固定操作区滚过正文时的 elevation，或 WorkBuddy 浮层本身，不应让名单、核心区和外层同时投影。

### 3.4 Sticky Footer 的边界应该随滚动出现

- **FACT（SRC-01）**：Fluent Drawer 的 Sticky Header/Footer 在内容滚动时 elevation，Body 在其下滚动；高倍缩放和小视口中可以取消 Sticky，优先保证正文。
- **FACT（SRC-08）**：Primer Overlay Footer 的 divider 是可选的。

**CLASSIN INFERENCE**：当前 Footer 即使未发生滚动也同时显示 border-top 和 shadow，视觉上像第三张卡。可以默认无边、仅使用背景与间距；当 Review Body 实际滚入 Footer 下方时再添加顶部阴影或一条细线。这样边界成为滚动状态反馈，而不是永久噪声。

## 4. 三个 ClassIn 候选方向

### 方向 A：单一 Canvas + 暖色状态带（推荐）

```text
WorkBuddy Surface
  ├─ 暖色状态带
  ├─ 一行发送影响
  ├─ 白色连续审阅 Canvas
  │    ├─ 无框名单
  │    └─ 有控件边界的 Textarea
  └─ Sticky Action Bar（滚动时才出现 shadow）
```

**CLASSIN INFERENCE**：

1. 去掉 `Review Artifact` 完整外框、圆角和阴影，让它成为 WorkBuddy Body 的当前主内容；
2. 保留顶部暖色状态带，但圆角只继承 WorkBuddy Body 的上层布局，不再形成独立卡片；
3. 发送影响行取消底边线，用更大的上下间距和标签区分；
4. `reviewCore` 取消边框、阴影和圆角；名单与正文之间可保留一条 inset divider，或只用 20 至 24px 间距；
5. 作业之间先取消 divider，以 16 至 20px spacing 分组；
6. Textarea 保留完整边界，这是“可编辑”的功能信号；
7. Footer 默认无边，只在 `data-scrolled=true` 时出现顶部 shadow。

优势：改动小，四层结构和现有语义完全保留；边界数量可从约 8 组降为 2 至 3 组；与已锁定的“WorkBuddy 是浮层辅助 Surface”一致。

风险：暖色状态带必须与 WorkBuddy 顶部上下文条拉开层级，避免整页横条过多；需要在 384px 最窄侧栏验证标签换行。

### 方向 B：Tonal Well 核对区 + 白色编辑器

```text
状态标题与发送摘要（白底、无框）

浅暖色 / 浅灰 Well
  核对名单
  作业 1 + 学生标签
  作业 2 + 学生标签

白色 Textarea（唯一边框）

轻量 Action Bar
```

**CLASSIN INFERENCE**：借鉴 Atlassian sunken surface，用一整块无描边浅底色把“结构化事实核对”归为一组。正文编辑器作为真正需要操作的白色控件自然浮在其后或其下。数量标签可由胶囊改为普通辅助文字 `2 项作业 · 5 位学生`，减少圆角对象数量。

优势：名单与正文性质不同，老师一眼能区分“系统事实”和“我将发送的文案”；无需外框也有明确层次。

风险：若暖色 Well 与顶部待办状态都使用高饱和度，会造成整块发黄；应只保留一个强暖色锚点，Well 使用非常浅的中性或暖中性色。

### 方向 C：Editorial Flow + 章节锚点

```text
[待你审阅] 群消息草稿已生成                 未发送
发送至 高二物理 3 班 · 王老师 · 30 人可见

核对名单                                  2 项 / 5 人
01  动量守恒作业 A 组 ...
02  机械波错题订正 ...

群消息正文                                可编辑
[Textarea]

[安全核验文案]                            [确认并发送]
```

**CLASSIN INFERENCE**：完全取消名单背景和容器，以章节标题、数字索引、左对齐基线和较大的 section gap 建立编辑式排版。只有状态 Badge、学生 Chip、Textarea 和主按钮仍有实体造型。

优势：最简约、信息密度最高；长名单扩展时不会出现层层套卡。

风险：对字号、行距、对齐精度要求最高；在侧栏缩到 384px 时，截止时间、移除分组和标题可能竞争同一行。需要真实中文内容压力测试，不能只用理想长度样稿验收。

## 5. 推荐选择与边界预算

**CLASSIN INFERENCE**：优先实施 **方向 A**，并吸收方向 B 的“浅色事实 Well”作为可选细节。它不改变已经确认的四层内容架构，只替换视觉 containment 方式，回归风险最低。

建议对当前视图设置明确预算：

| 元素 | 默认边界 | 条件边界 |
| --- | --- | --- |
| WorkBuddy 浮层 | 1 个外轮廓 + 1 个低阶 shadow | 不变 |
| Review Artifact | 无完整外框、无额外 shadow | 状态带只用背景色 |
| 发送影响摘要 | 无边 | 无 |
| 名单核心区 | 无边；可用浅色 Well | 第二组前最多一条 inset divider |
| 学生标签 | 保留填充胶囊，默认无边 | Hover / Focus 才加强轮廓 |
| Textarea | 保留 1 个控件边界 | Focus Ring、Error border |
| Action Bar | 默认无边 | Body 滚动到其下时显示顶部 shadow 或 divider，二选一 |
| Composer | 作为另一个独立输入任务保留控件边界 | 与 Review Body 之间依靠 WorkBuddy 布局间距，不再增加卡片套卡片 |

不建议：

- 把所有横线替换为更多阴影；阴影同样会制造多层卡片感；
- 给四层分别换四种底色；这会把“线框噪声”换成“色块噪声”；
- 取消 Textarea 默认边界；老师会更难识别可编辑性，只能依赖“可编辑”文案；
- 用新的左侧彩色装饰轨代替外框。项目刚刚取消 WorkBuddy 左侧装饰细条，重新引入近似语言会制造概念冲突；
- 把 Footer 按钮悬空覆盖正文；操作区应占据稳定布局空间，避免遮挡名单或消息末尾。

## 6. OPEN：需要样机验证的问题

1. **OPEN**：名单在 2 项、5 人时不需要 divider；增加到 6 至 10 项、20 至 30 人时，纯 spacing 是否仍足够可扫描，需要压力样稿验证。
2. **OPEN**：浅色 Well 应使用中性 `surface-muted` 还是低饱和暖色。暖色更能关联待审阅，但可能削弱 Textarea 与 Header 对比。
3. **OPEN**：Footer shadow 应在内容可滚动时始终存在，还是只有实际发生滚动遮挡时出现。两者需要通过实现成本与感知收益比较。
4. **OPEN**：学生标签的删除按钮在默认状态持续显示，还是仅 Hover/Focus 强化。可发现性、触屏兼容和无障碍不能为了视觉极简被牺牲。
5. **OPEN**：WorkBuddy Composer 与待审阅 Footer 同时处于底部时，是否会产生两个主动作竞争。建议验证草稿待审阅状态下 Composer 的视觉权重，而不是隐藏其能力。

## 7. 推荐验收要点

1. 第一眼仍能识别 `待你审阅`、`未发送` 和唯一主动作，去线后不能损失安全门语义。
2. 不聚焦编辑器也能识别正文可编辑；聚焦后 Focus Ring 足够明显。
3. 1440×900、1280×800、1024×640 与 WorkBuddy 384px 最小宽度均无信息遮挡或动作换行。
4. 两项作业的起止边界可在 3 秒内扫描；若依赖颜色，必须同时有标题、间距或语义分组。
5. 发送操作区在长内容滚动下持续可达，但不覆盖正文；滚动边界出现时只使用 shadow 或 divider 之一。
6. 去除边框不能改动 ArtifactDraft、ProposedAction、Approval、事实复核与 ExecutionReceipt 的状态链。
