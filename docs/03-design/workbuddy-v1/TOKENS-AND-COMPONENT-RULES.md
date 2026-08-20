---
title: WorkBuddy V1 Token 与基础组件候选规则
status: REVIEWED_APPROVED
version: v0.1
date: 2026-08-20
---

# WorkBuddy V1 Token 与基础组件候选规则

## 1. 当前边界

本文件定义的目标设计规格已经通过 Phase 1 Review 和 D-018 锁定。当前旧原型仍受 D-003 约束：结构高保真、视觉低保真；这只影响旧原型的实施状态，不再影响目标设计规范的确定性。

原始候选值见 `source-materials/classin-pc-tokens-v1.4-reference.css`。

## 2. 已采纳规则

- 4px 基础网格：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40`；
- 中性背景采用无品牌色偏的黑白灰；
- 品牌、Action、Status 和 Data 颜色语义分离；
- 教师高频控件和列表采用 Compact 密度；
- 阴影只用于 Work Surface、Overlay、Dialog、Menu 和拖拽对象；
- 页面 Section 不自动获得圆角、边框和阴影；
- 数字、时间、计数和百分比使用 tabular numerals；
- 动效使用短促、可预测的状态过渡，并尊重 reduced motion。

## 3. 候选尺寸

| 对象 | 候选 | 状态 |
|---|---:|---|
| ClassIn 全局侧栏 | `216-224px` | `LOCKED RANGE` |
| 顶部工具栏 | `44-56px` | `LOCKED RANGE` |
| AI Agent 二级导航面板 | `224-240px`；NineClaw 式扁平导航，默认可见 6 条任务 | `LOCKED RANGE` |
| Context/Artifact/执行详情活动区 | `344-640px`，按内容扩展且同一时间只活动一个 | `LOCKED RANGE` |
| Icon Button / 紧凑控件 | `32px` | `ADOPTED` |
| 普通控件 | `32-36px` | `ADOPTED` |
| 历史/过程单行 | `36-40px` | `ADOPTED` |
| 双行对象 | `48-56px` | `ADOPTED` |

具体栏宽不能脱离 WorkBuddy 容器方案单独锁定。

## 4. 排版候选

| 层级 | 候选 | 用途 |
|---|---|---|
| Page Title | `20/28 semibold` | 工作区标题 |
| Section Title | `16/24 semibold` | 阶段、产物或面板标题 |
| Item Title | `14/20 medium/semibold` | 任务、Artifact、工具调用标题 |
| Body | `14/20 regular` | 消息、说明和字段 |
| Meta | `12/18 regular/medium` | 时间、来源、状态和辅助信息 |

字体栈锁定为 `Inter Variable, PingFang SC, Microsoft YaHei, sans-serif`。

## 5. 圆角与层级

目标设计锁定 `0/4/6/8/16` 层级：

- `0` 用于相接面板、连续表面和全宽分区；
- `4` 用于 Button、Input、Tag 和列表选中底；
- `6` 用于独立任务、Artifact 行和小对象面板；
- `8` 用于 Menu、Popover、Tooltip 和 Dialog；
- `16` 只用于 Work Surface 等大型应用层容器；
- 不在页面区块中引入大量圆角卡片；
- Work Surface 的大型圆角不能向内部 Section 递归传播。

## 6. 基础组件状态

Button、Icon Button、Input、Textarea、Select、Menu Item、Task Row、Artifact Row、Context Chip、Process Event、Tabs 和 Disclosure 均需覆盖：

`rest / hover / focus-visible / pressed / selected / disabled / loading / error`

组件还必须表达：

- 真实、模拟、集成模拟和未来能力；
- 草稿、待确认、部分成功、失败可恢复和已完成待复查；
- 业务事实、AI 推断、教师确认和 Domain Knowledge 来源差异。

## 7. 图标规则

- 使用统一线性图标系统，优先 Lucide；
- 教学对象图标跨页面稳定：课件、作业、测验、录播、课程、班级、单元、课堂；
- Skill、MCP、工具调用和技术日志不复用教学对象图标；
- Icon 不能单独承担消息类别、权限或失败原因；
- 同一对象的默认、选中和完成状态通过形态、文字和状态共同表达。
