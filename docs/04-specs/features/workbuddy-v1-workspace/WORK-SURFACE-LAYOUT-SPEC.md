---
title: WorkBuddy V1 Work Surface 布局规格
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
target_viewport: 1440x900
---

# WorkBuddy V1 Work Surface 布局规格

## 1. 目标

布局需要同时保留 ClassIn 一级主导航、AI Agent 二级导航、Agent Run 主轴和一个当前最重要的辅助对象。二级导航对标 NineClaw 并直接包含历史条目；不能再增加第三级菜单或第三根历史栏，也不能让 Context 与 Artifact 同时常驻。

## 2. 1440×900 基准画布

以下为 `TARGET_SPEC`，用于下一阶段原型标定：

| 区域 | 基准值 | 允许范围/行为 |
|---|---:|---|
| Viewport | `1440×900` | Phase 3/4 主验收尺寸 |
| ClassIn 一级主导航 | `216px` | 锁定范围 `216-224px`；收起态目标 `64px` |
| AI Agent 二级导航面板 | `232px` | 锁定范围 `224-240px`；NineClaw 式扁平导航 |
| 全局顶部栏 | `48px` | 锁定范围 `44-56px` |
| Agent 主工作区 | `992×852px` | 位于两级导航右侧、顶部栏下方 |
| Work Surface 外边距 | `12px` | 四边一致，遵循 4px 网格 |
| Work Surface | `968×828px` | 白色连续表面，外层 `16px` 圆角 |
| Run Header | `48px` | 固定，不随时间线滚动 |
| Composer 区 | `auto`，最小 `72px` | 固定底部，最多约 6 行后内部滚动 |
| 右侧活动区 | 默认 `360px` | `344-400px` 可并列；更宽进入 Overlay/Focus |
| 中央 Run 最小宽 | `560px` | 达到下限后辅助区改为 Overlay/Focus |

## 3. 布局模式

### L1：New Task

```text
┌─ ClassIn L1 216 ─┬─ AI Agent L2 232 ─┬──────── Main 992 ────────────────┐
│ 首页 / 班级 / …  │ 新建任务            │ Topbar 48                          │
│ AI Agent         │ 近期任务 × 6        ├────────────────────────────────────┤
│ 消息 / 工具      │ Skills / Tools      │  Work Surface                     │
│                  │ 内容 / 定时 / 文件   │       Goal Composer                │
│                  │ 设置                │       Core Context Summary         │
│                  │                     │       Task Type Shortcuts          │
└──────────────────┴─────────────────────┴────────────────────────────────────┘
```

- 主输入区域视觉中心位于 Work Surface 中上部，不用营销 Hero 挤占任务输入；
- 初次使用显示价值说明和示例，已有使用记录时优先显示最近业务入口与任务类型；
- Core Context 摘要紧邻输入器，不放到页面远端卡片。

### L2：Run，仅主轴

```text
┌ ClassIn L1 ┬ Agent L2 ┬──────────────── Work Surface ─────────────────┐
│ Primary    │ History  │ Run Header                                    │
│ navigation │ + tools  ├───────────────────────────────────────────────┤
│            │          │ Goal / Context Summary                        │
│            │          │ Timeline / Plan / Process / Artifact refs     │
│            │          ├───────────────────────────────────────────────┤
│            │          │ Composer / Stop / Waiting action              │
└────────────┴──────────┴────────────────────────────────────────────────┘
```

- 时间线正文舒适阅读宽度为 `640-760px`，不让长文本横贯全部屏幕；
- 计划、事件和 Artifact 可以超出文本宽度但不得超过内容主栏；
- 教师手动上滚后停止自动跟随，并显示“回到最新”。

### L3：Run + 活动辅助区

```text
┌ ClassIn L1 ┬ Agent L2 ┬──── Run Main ≥560 ─────┬ Active Panel 360 ──┐
│ Primary    │ History  │ Run Header              │ Panel Header         │
│ navigation │ + tools  │ Timeline                │ Artifact / Context / │
│            │          │                         │ Process Detail       │
│            │          │ Composer                │ Footer/Actions       │
└────────────┴──────────┴─────────────────────────┴──────────────────────┘
```

- 活动区只能有一个 `activePanelMode`：`artifact | core_context | process_detail | none`；
- 切换模式保存各自滚动、选中对象和未应用草稿；
- Panel Header 固定；正文单一滚动；主行动固定在 Footer 或 Header；
- 关闭 Panel 返回 `none`，不终止 Run、不清空选中 Artifact。

### L4：Artifact Focus

```text
┌──────────────────────── Focus Surface ────────────────────────────────┐
│ Back to Run │ Artifact title/version │ Compare │ AI revise │ Save     │
├─────────────┬───────────────────────────────────────┬─────────────────┤
│ Package nav │ Artifact canvas/editor               │ Optional detail │
│ optional    │                                       │ / comments      │
└─────────────┴───────────────────────────────────────┴─────────────────┘
```

- 单课件默认隐藏 Package nav；课程方案包显示可收起的 Artifact 导航；
- 返回时恢复 Run 的时间线位置、活动面板模式、选中 Artifact 和版本；
- Focus Surface 仍继承 ClassIn 顶部身份/组织，但可收起侧栏以增加画布。

## 4. 右侧活动区模式

### 4.1 Artifact

Header：类型图标、标题、版本、状态、关闭/扩展。

Body：预览、编辑或多 Artifact 导航；格式不支持内嵌时显示明确占位、下载和外部打开。

Footer：随状态显示 `编辑 / AI 修改 / 比较 / 保存 / 保存到 ClassIn`。主行动不能因正文滚动不可达。

### 4.2 Core Context

Header：核心上下文数量、Snapshot 状态、更新时间、关闭。

Body：Actor/组织、教学范围、学习者、时间、资源、证据、Domain Knowledge 七类 Section。

Footer：未开始时为“应用更改”；运行后变更主范围时为“查看影响并重新规划”。

### 4.3 执行详情

Header：当前步骤/事件、状态、耗时、关闭。

Body：教师摘要 → 能力追踪 → 技术详情三级 Disclosure；Context Projection 单独可查。

Footer：按状态显示停止、重试、换策略、复制诊断、返回最新事件。

## 5. 尺寸切换规则

| 可用 Work Surface 宽度 | 行为 |
|---:|---|
| Agent 主工作区 `≥960px` | Run + 默认 360px 活动区并列 |
| Agent 主工作区 `904-959px` | 活动区压缩到 344px；Run 保持 ≥560px |
| `720-903px` | 活动区变为从右覆盖的 Overlay，不同时压缩 Run |
| `<720px` | 不作为 PC V1 主验收；使用 Focus/全宽转场，关键动作仍可达 |

当 Artifact 需要宽编辑画布、复杂表格或视频时，即使宽度足够也允许主动进入 Focus Surface。

## 6. 垂直滚动所有权

| 区域 | 滚动所有者 | 禁止行为 |
|---|---|---|
| ClassIn 一级主导航 | 一级栏内部 | 页面正文推动导航离开视口 |
| AI Agent 二级导航 | 二级面板内部 | Section 展开产生第三级菜单 |
| 近期任务 | 二级面板任务 Section 内部 | 新事件强制跳到列表顶部 |
| Run Timeline | 主内容区 | Composer 随正文滚走 |
| Active Panel | Panel Body | Header/Footer 双重嵌套滚动 |
| Focus Editor | Artifact Canvas | 页面与编辑器同时争夺垂直滚动 |

## 7. 信息密度

- 任务历史、过程事件、对象选择使用 Compact 密度；
- 长文本、课件预览和编辑使用 Comfortable 密度；
- 一级状态用文字 + 图标，不只依赖颜色；
- 高级技术详情使用等宽字体，仅在展开区域出现；
- 任何空白都服务于分组和阅读，不用大面积 Hero 制造“高级感”。

## 8. 焦点与键盘

- 打开 Popover/Dialog/Panel 后，焦点进入首个可操作对象；
- 关闭后返回原触发点；
- `Esc` 先关闭最上层 Overlay，不终止 Run；
- 发送与停止不能共享没有文本说明的同一不可辨图标状态；
- 历史 `…`、Panel Tab、Disclosure、Artifact 导航均可键盘访问；
- Focus Surface 返回使用明确按钮与系统后退，二者结果一致。

## 9. 原型验收点

1. 1440×900 首屏可见 ClassIn 一级主导航、AI Agent 扁平二级导航、6 条任务、新/当前 Run 与唯一主行动；
2. AI Agent 二级面板内部没有第三级菜单，历史不形成第三根栏；
3. 打开任一右侧模式后只新增一个活动辅助区；
4. 360-400px Artifact 与 Core Context 切换不造成 Run 状态丢失；
5. 更宽面板或复杂编辑会转入 Overlay/Focus，而不是把 Run 压到 560px 以下；
6. 长时间线、长 Context 和长 Artifact 各自只有一个清晰滚动所有者；
7. 主行动不藏在不可见滚动底部；
8. 返回现场恢复任务、滚动、展开和版本。
