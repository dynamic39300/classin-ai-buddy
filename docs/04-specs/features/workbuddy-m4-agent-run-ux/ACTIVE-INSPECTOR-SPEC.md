---
title: WorkBuddy M4.1 统一右侧活动区规格
status: REVIEWED_APPROVED
version: v0.2
date: 2026-08-21
---

# WorkBuddy M4.1 统一右侧活动区规格

## 1. 目标

右侧活动区是 Agent Run 的对象查看与操作空间，不是第二条任务流程。它只在 `上下文` 与 `产出` 两个视图间切换；计划、过程、Skill/Tool 和审批的主表达留在 Conversation Timeline。

## 2. 顶部入口

Run Header 右上角显示一个组合入口：

```text
[上下文 4] [产出 1] [收起]
```

- `上下文 N`：N 表示当前 Proposal/Snapshot 的高价值选择数量；
- `产出 N`：N 表示当前可用 Artifact 数量；新产出有未读点；
- `收起`：关闭活动区但不改变当前 tab、滚动或选择；
- 收起后 Header 保留 `上下文 / 产出` 两个按钮，可直接以目标视图重新打开。

## 3. 默认与自动切换

### 3.1 新任务

- 默认展开；
- 默认 `上下文`；
- Composer 获得文本焦点，Panel 不自动抢焦点；
- 教师可收起获得更宽输入区。

### 3.2 执行中

- 保持教师当前视图；
- Context Snapshot 完成不会反复自动打开或切换；
- 产物生成前 `产出` 为 0，可点击后显示生成中摘要而不是空白页。

### 3.3 Artifact 到达

如果满足以下条件，自动切换到 `产出`：

- Panel 当前展开；
- 教师没有未应用的 Context 修改；
- 最近 2 秒没有在 Context Tree 中输入、展开或选择；
- 当前不在补参或 Approval 窗口中。

否则：

- 不抢占当前操作；
- `产出` 显示未读点和数量；
- Timeline Artifact 卡显示“打开产出”。

这是产品语义条件，不要求实现使用真实 2 秒墙钟；测试使用可控交互空闲状态。

## 4. Panel Layout

```text
┌ Panel Header ─────────────────────┐
│ [上下文] [产出]       expand close│
├───────────────────────────────────┤
│                                   │
│ Single scroll body                │
│                                   │
├───────────────────────────────────┤
│ Context / Artifact actions        │
└───────────────────────────────────┘
```

- Header 固定；
- Body 只有一个纵向滚动容器；
- Footer 只显示当前对象的主要行动；
- 默认宽度 `360px`，允许 `344–440px`；
- 可用主区不足 `560px` 时改为右侧 Overlay；
- Artifact 需要大画布时进入 Focus Surface，不把 Panel 无限制拉宽。

## 5. 上下文视图

内容和交互遵循 [Core Context 树与 Composer 规格](./CORE-CONTEXT-TREE-AND-COMPOSER-SPEC.md)。

Header：

- `上下文`；
- 已选数量；
- Proposal / Snapshot 状态；
- 搜索；
- 收起。

Body：

- 已选摘要；
- 我的教学树；
- 我的空间树；
- 节点详情按需展开。

Footer：

- 草稿：`还需选择课程` 或 `确认并生成计划`；
- Run 中次要修改：`应用到后续步骤`；
- 主范围变化：`查看影响并重新规划`；
- 已完成：默认只读，可创建关联任务时再编辑新 Run Context。

## 6. 产出视图

### 6.1 无产出

显示当前计划的预期交付，不显示营销空状态：

```text
正在生成课件
完成后将在这里预览、修改和确认。
```

### 6.2 单课件

Header：标题、版本、只读状态、全局预览。

Body：

- 当前页预览或明确的格式占位；
- 全局页面目录、页码、上下翻页与键盘翻页；
- 验证摘要；
- 来源与引用；
- 版本/差异入口。

Footer：

- 生成中：无虚假主操作；
- 待复查：`使用专业编辑器打开`、`确认课件可用`；
- 已采用：`保存到 ClassIn`；
- Action/Receipt 已产生：打开 Timeline 对应卡片，不在 Panel 复制审批状态；
- 预览失败：下载、外部打开、重试预览。

### 6.3 课程方案包

Body 先显示 Artifact 目录，再显示选中项预览：

```text
课程方案包  3/4 可复查
├ ✓ 课件
├ ✓ 作业
├ ● 测验（生成中）
└ — 录播脚本（等待课件）
```

- 目录节点显示依赖和对象级状态；
- 选择节点不改变 Timeline；
- 失败项显示原因和可用恢复，但重试命令仍回到 Timeline 对应事件；
- 批量确认前展示对象级范围；
- 成功项在部分成功后保持不可重复执行。

## 7. Context 与产出的状态保持

每个 tab 独立保存：

- Body 滚动位置；
- 展开的树节点/方案包节点；
- 当前选中 Context/Artifact；
- 搜索词；
- 未应用 Context 修改；
- Artifact 编辑/预览模式。

切换 tab 不提交、不取消、不丢弃任何状态。切换 Run 时按 Run ID 分别恢复；不把上一 Run 的选择带入新 Run。

## 8. Timeline 联动

| Timeline 事件 | Panel 响应 |
| --- | --- |
| clarification_request | 保持 Context，可定位缺失对象 |
| context_snapshot | Context Header 显示已确认 |
| capability_call | 不切换 Panel；详情在事件内展开 |
| artifact_ready | 满足自动切换规则时打开产出，否则标记未读 |
| artifact_revised | 产出更新版本，保留原 Timeline 位置 |
| action_proposed | Panel 保持 Artifact；Timeline Action 卡获得待处理标记 |
| execution_receipt | 产出显示业务状态摘要，但 Receipt 主信息留在 Timeline |
| replanning_required | 切到 Context 前需教师主动确认，不自动抢占 Artifact 编辑 |

## 9. 展开、收起与 Focus

### 9.1 收起

- 关闭后主时间线扩宽；
- 当前 tab、选中项和滚动位置保留；
- 焦点回到触发按钮；
- 不影响运行、事件订阅或 Artifact 状态。

### 9.2 重新打开

- 点击 `上下文` 直接以 Context 打开；
- 点击 `产出` 直接以 Output 打开；
- 点击 Timeline Artifact 卡打开并定位对应 Artifact；
- 点击 Context Chip 打开并定位对应节点。

### 9.3 Artifact Focus

进入 Focus Surface 时保存：

- Run 时间线锚点；
- 当前 tab 和 Panel 宽度；
- Artifact ID/version；
- 预览/编辑状态；
- 未发送 Composer。

返回后全部恢复。Focus Surface 不是新的 Run，不创建新的历史条目。

## 10. 窄屏与 Overlay

| 可用宽度 | 行为 |
| ---: | --- |
| `≥960px` | Timeline + 360px Panel 并列 |
| `904–959px` | Panel 压缩至 344px |
| `720–903px` | Panel 右侧 Overlay，背景时间线保持但不可误操作 |
| `<720px` | 全屏 Sheet，通过 Header 返回 Run |

Overlay 打开时锁定后台滚动；关闭后恢复原焦点和 Timeline 位置。

## 11. 可访问性

- `上下文 / 产出` 使用 tablist/tab 语义或等价的可访问切换模式；
- 未读状态同时有文本和状态点；
- Panel 打开不自动改变焦点，除非由键盘操作明确触发；
- 收起、展开、全屏和返回都有可访问名称；
- Context Tree 遵循 tree/treeitem 语义，checkbox 状态独立可感知；
- Artifact 目录不把颜色作为唯一状态；
- 新 Artifact 到达通过礼貌状态播报，不朗读完整预览内容。

## 12. 验收标准

- 新任务默认展示 Context；
- 教师能常态收起和重新展开；
- 上下文和产出共用同一空间，不形成第三个永久面板；
- Process 详情不再占据独立顶级 Panel 模式；
- Artifact 到达不会覆盖未应用 Context 修改；
- 切换 tab 后状态、滚动、选择与草稿保持；
- Timeline Artifact、Composer Chip 与 Header 入口均可精确定位右侧对象；
- 单课件和方案包都能进入全屏产出并返回原 Run；
- 窄屏没有横向溢出或不可达操作。
