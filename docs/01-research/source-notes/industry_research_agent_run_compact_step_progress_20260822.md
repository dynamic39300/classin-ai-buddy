---
title: Agent Run 紧凑步骤进度与悬浮步骤面板一手规范调研
status: VERIFIED_WITH_BOUNDARIES
version: v0.1
date: 2026-08-22
---

# Agent Run 紧凑步骤进度与悬浮步骤面板一手规范调研

## 1. 研究问题

为 WorkBuddy 模拟 Agent Run 设计一个靠近输入区的紧凑进度入口：常驻显示“当前第 N / M 步”，在鼠标 Hover、键盘 Focus 或点击后展示步骤清单，并明确区分已完成、正在执行、等待执行等状态。

本次只核验以下一手来源：W3C/WAI 规范与实践、MDN 平台文档、IBM Carbon Design System 和 U.S. Web Design System（USWDS）。用户提供的 Codex 截图只作为期望形态，不被用于推断 Codex 的内部状态模型或未公开行为。

## 2. 结论

推荐采用“**确定的步骤位置 + 不确定的当前步骤耗时**”双层表达：

- 胶囊稳定显示 `第 2 / 4 步`，因为计划总步骤数和当前步骤位置已知；
- 当前步骤图标使用轻量旋转环，表达这一步仍在处理，但不伪造百分比或预计剩余时间；
- Hover、Focus 或点击打开非模态步骤面板，按计划顺序显示已完成、正在进行和等待三个状态；
- 颜色只做辅助，状态还必须由图标形状和可见文字共同表达；
- 动态变化不移动焦点，只在步骤切换、需要教师介入、完成或失败等低频节点进行礼貌播报；
- `prefers-reduced-motion: reduce` 下停用连续旋转和位移动画，保留静态“正在进行”图标与文字。

这里不应把“2 / 4”解释成完成度 `50%`。步骤可能耗时和工作量差异很大；它表达的是**当前位于计划中的第几步**，不是精确的时间或工作量百分比。

## 3. 一手证据与设计含义

| 证据 | 一手来源结论 | 对 WorkBuddy 的直接约束 |
| --- | --- | --- |
| 线性多步骤 | [Carbon Progress Indicator](https://carbondesignsystem.com/components/progress-indicator/usage/) 用于线性多步骤任务，显示已完成、当前和未来步骤，并帮助用户理解当前步骤、总步骤数和整体进展；默认版本可以只是视觉反馈而非导航。 | 当 Run 已有稳定 Plan 且至少包含多个步骤时显示 `N / M`；步骤面板默认只读，不把步骤行误做成可跳转导航。 |
| 确定与不确定进度 | [Carbon Progress Bar](https://carbondesignsystem.com/components/progress-bar/usage/) 要求：进度可计算时用 determinate；进度或等待时间不可计算时用 indeterminate，且不显示百分比。 | 用 `N / M` 表达已知步骤位置；当前步骤内部用 spinner 表达未知耗时。不要生成虚假的 `%`、预计秒数或匀速进度条。 |
| 进度语义 | [MDN `progressbar` role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role) 要求：确定进度提供并更新 `aria-valuenow`；不确定进度省略它；组件必须有可访问名称。 | 若胶囊实现为真正的进度条语义，可用 `aria-valuemin="1"`、`aria-valuemax="4"`、`aria-valuenow="2"` 和 `aria-valuetext="正在执行第 2 步，共 4 步：生成课件结构"`。纯装饰 spinner 不单独重复播报。 |
| 当前/完成/等待 | [USWDS Step Indicator](https://designsystem.digital.gov/components/step-indicator/) 要求当前步骤与完成、等待步骤有不同的颜色和文字处理，完成状态需要可被读屏获取的文字；[WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#aria-current) 定义 `aria-current="step"` 表示流程中的当前步骤。 | 清单使用有序列表；当前项标记 `aria-current="step"`，并给每项提供“已完成 / 正在进行 / 等待执行”可见文字或等价隐藏文字。 |
| 不依赖颜色 | [WCAG 2.2 的 1.4.1](https://www.w3.org/TR/WCAG22/#use-of-color) 要求颜色不能成为表达信息或状态的唯一方式。 | 已完成用勾选图标 + 文案，进行中用旋转/静态环 + 文案，等待用空心圆 + 文案；绿色、强调色和灰色只是冗余编码。 |
| Hover/Focus 附加内容 | [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) 要求由 Hover 或 Focus 触发的附加内容可关闭、可被鼠标移入，并持续到触发条件移除、用户关闭或信息失效。 | 面板必须同时支持 Hover 与键盘 Focus；指针从胶囊移入面板时不得消失；支持 `Escape`；不能用一离开胶囊就关闭的脆弱 hover 实现。 |
| Tooltip 边界 | [WAI-ARIA APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) 说明 Tooltip 不接收焦点，触发器保持焦点；若浮层含可聚焦元素，应改用非模态 Dialog。该 APG 模式仍标注为 work in progress。 | 当前只读步骤清单可以做无交互的描述浮层；一旦加入“查看详情、停止、重试”等控件，就必须升级为可聚焦的 Popover/非模态 Dialog，不能继续使用 `role="tooltip"`。 |
| 展开控件 | [APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) 要求使用真实 button，`Enter`/`Space` 切换，并以 `aria-expanded` 表达展开状态，可用 `aria-controls` 关联内容。 | 胶囊本身使用 `<button>`；Hover/Focus 负责预览，点击负责锁定展开；键盘用户可用 `Enter`/`Space` 打开，用 `Escape` 关闭。 |
| 非模态浮层 | [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using) 说明 `popover="auto"` 支持点外关闭和 `Escape`，并可建立触发器与浮层的展开及焦点关系。 | 支持目标浏览器时优先使用原生 Popover；否则实现等价的非模态行为。关闭后焦点回到进度胶囊，且同一时刻只展开一个步骤面板。 |
| Reduced Motion | [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) 说明 `reduce` 表示用户希望减少非必要运动，可用媒体查询移除或弱化动画。 | 关闭 spinner 连续旋转、扫光、呼吸放大和面板位移动画；允许即时显隐或极短透明度变化。状态含义必须在无动画时仍完整。 |
| 动态状态播报 | [WCAG 2.2 的 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) 要求无需移动焦点也能让辅助技术获知等待、进度和结果；其说明同时警告 Live Region 过度播报会造成干扰。[ARIA25](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA25) 示例使用 `aria-live="polite"` 且不移动焦点。 | 只播报有意义的步骤跃迁，例如“第 2 步开始：生成课件结构”“第 2 步完成”；不要播报 spinner 每一帧、每秒计时或流式 token。 |

## 4. 推荐的 WorkBuddy 交互规格

### 4.1 常驻胶囊

- 位置：Conversation Run 底部输入区正上方、与输入区水平中心对齐；不覆盖 Timeline 的当前事件或输入控件。
- 展示条件：Plan 已确认且 Run 存在 `2` 个及以上可执行步骤时出现；补参、待确认等还没有可执行计划的阶段显示阶段文案，而不伪造 `N / M`。
- 运行中：`旋转环  第 2 / 4 步`；可增加当前步骤短标题作为无障碍名称，但不挤入视觉胶囊。
- 暂停/待教师输入：停止旋转，改用明确的暂停或提示图标，并显示 `等待你的确认 · 第 2 / 4 步`。
- 完成：短暂显示 `✓ 4 / 4 步已完成` 后淡出；如果完成态仍有“待复查”，应显示 `4 / 4 步 · 完成待复查`，不能只写“已完成”。
- 失败：显示 `! 第 2 / 4 步需要处理`，步骤面板中保留失败项和恢复动作入口所属的 Timeline 位置；颜色之外必须保留图标与文字。

### 4.2 步骤面板

- 结构：小标题“任务进度”，下方使用 `<ol>`；顺序必须与已确认 Plan 和 Timeline 的 `stepRef` 一致。
- 每行：状态图标、步骤标题、状态文字；当前步骤可以附一行低权重摘要，例如“正在生成 18 页课件结构”。
- 状态：
  - `completed`：勾选图标 + `已完成`；
  - `running/streaming`：spinner + `正在进行`，并标记当前步骤；
  - `queued`：空心圆 + `等待执行`；
  - `requires_input/requires_confirmation`：提示图标 + `等待你的补充/确认`；
  - `failed_recoverable`：警示图标 + `需要处理`；
  - `skipped`：短横或跳过图标 + `已跳过`。
- 默认只读：不要让已完成或等待步骤表现得像可点击链接；需要查看详细执行证据时，提供一个清晰的“在时间线中查看”动作，并将面板按 Popover/非模态 Dialog 处理。
- 面板实时原位更新，不因步骤变更自动夺取焦点，也不自动滚动主 Timeline。

### 4.3 打开与关闭

- `pointerenter` 胶囊后短延迟打开，防止鼠标经过时闪烁；延迟值属于实现调优，不由本次一手资料锁定。
- 胶囊获得键盘焦点时可显示；点击、`Enter` 或 `Space` 可锁定展开。
- 指针可从胶囊移动到面板；胶囊与面板均失去 Hover/Focus 后才关闭非锁定预览。
- `Escape` 随时关闭；点击外部关闭已锁定面板；关闭后保持或返回胶囊焦点。
- 触屏没有 Hover，因此点击必须是完整替代路径。

## 5. 状态与数据映射建议

胶囊和步骤面板必须是既有 Plan/Run 状态的**只读投影**，不能维护第二套独立进度状态。建议以确认后的 Plan 步骤为分母，以当前未终止步骤为位置：

```text
Plan.steps + step_progress/capability_call events
  → ordered step projections
  → currentStepIndex / totalSteps
  → compact progress capsule + details panel
```

- `M` 来自当前有效、未被 superseded 的 Plan；Replan 后整体原位切换到新 Plan，并明确播报计划已更新。
- `N` 是当前步骤在 Plan 中的位置，不是已完成数量；当第 2 步正在运行时显示 `2 / 4`。
- 并行步骤不能硬套单一 `N`。若当前产品未来允许真正并行执行，应改成“2 个步骤进行中 · 1/4 已完成”或其他集合式表达，本轮需另行验证。
- 阶段暂停、等待确认、失败和停止不能仍显示旋转环；动态图标必须由真实状态驱动。
- `[模拟]` 真值标签继续由 Run Surface 承担，进度入口不暗示生产 Runtime 已接入。

## 6. 无障碍实现基线

```html
<button
  type="button"
  aria-expanded="false"
  aria-controls="run-step-progress-panel"
  aria-label="正在执行第 2 步，共 4 步：生成课件结构"
>
  <span aria-hidden="true"><!-- spinner --></span>
  <span>第 2 / 4 步</span>
</button>

<section id="run-step-progress-panel" aria-label="任务进度" hidden>
  <ol>
    <li><span aria-hidden="true">✓</span>读取课程上下文 <span>已完成</span></li>
    <li aria-current="step"><span aria-hidden="true"><!-- spinner --></span>生成课件结构 <span>正在进行</span></li>
    <li><span aria-hidden="true">○</span>生成页面内容 <span>等待执行</span></li>
    <li><span aria-hidden="true">○</span>校验并交付 <span>等待执行</span></li>
  </ol>
</section>

<div class="sr-only" aria-live="polite"><!-- 只写入低频里程碑 --></div>
```

如果胶囊同时承担 `progressbar` 角色，不要在同一个节点里放需要被读屏识别的复杂子结构，因为 MDN 提醒 `progressbar` 的后代在可访问性树中会按 presentation 处理。更稳妥的实现是：按钮承担展开交互和可访问名称，另设独立、视觉隐藏的进度语义，或直接让按钮名称完整表达 `N / M + 当前步骤`。

Reduced Motion 基线：

```css
@media (prefers-reduced-motion: reduce) {
  .runStepSpinner,
  .runStepPulse {
    animation: none;
  }

  .runStepPanel {
    transition: opacity 0.01ms linear;
    transform: none;
  }
}
```

## 7. 验收清单

1. Run 有稳定 Plan 后，胶囊显示真实 `N / M`；Plan 未形成时不伪造步数。
2. 当前步骤仍在处理且耗时未知时只显示 spinner，不显示虚假百分比或倒计时。
3. 步骤面板同时可由鼠标 Hover、键盘 Focus 和点击访问；触屏可点击访问。
4. 指针能移入步骤面板；`Escape` 可关闭；面板不会遮住胶囊本身和输入主操作。
5. 已完成、进行中、等待、待教师处理、失败和跳过均由“图标 + 文字 + 可选颜色”表达。
6. 当前步骤在语义上可确定，步骤顺序与 Plan/Timeline 一致。
7. 状态更新不移动焦点、不强制滚动 Timeline；只在关键步骤跃迁时礼貌播报。
8. Reduced Motion 下没有连续旋转、扫光、呼吸或位移动画，静态状态仍可辨识。
9. Replan、暂停、停止、失败与完成待复查不会继续显示错误的运行中 spinner。
10. 自动化至少覆盖鼠标、键盘、Escape、Reduced Motion 和状态映射；另用 VoiceOver/NVDA 做一次人工验证。

## 8. 边界与未知

- Carbon 的 Progress Indicator 主要面向用户完成的线性流程；WorkBuddy 是系统执行的计划。本文借用其“当前/完成/未来”和 `N / M` 信息结构，不把用户导航行为直接照搬。
- WAI-ARIA APG 明确标注 Tooltip Pattern 仍为 work in progress；因此本文以 WCAG 1.4.13 的规范性要求作为 Hover/Focus 的最低边界，并优先采用真实 button + Disclosure/Popover 语义。
- 原生 Popover API 已进入现代浏览器基线，但项目实际支持矩阵尚未在本研究中核验；实现前应确认 Electron/Chromium 版本，或提供等价降级。
- 截图无法证明 Codex 的延迟、关闭策略、读屏输出或状态计算方式；这些不应被写成行业事实。
- 真正并行、动态增删步骤或 Plan Replanning 需要集合式进度表达，不能继续假设单一线性 `N / M`。

## 9. 一手来源

1. IBM Carbon Design System — [Progress indicator: Usage](https://carbondesignsystem.com/components/progress-indicator/usage/)
2. IBM Carbon Design System — [Progress bar: Usage](https://carbondesignsystem.com/components/progress-bar/usage/)
3. U.S. Web Design System — [Step indicator](https://designsystem.digital.gov/components/step-indicator/)
4. W3C — [WAI-ARIA 1.2: `aria-current`](https://www.w3.org/TR/wai-aria-1.2/#aria-current)
5. W3C WAI — [WCAG 2.2, Success Criterion 1.4.1 Use of Color](https://www.w3.org/TR/WCAG22/#use-of-color)
6. W3C WAI — [Understanding SC 1.4.13: Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
7. W3C WAI-ARIA APG — [Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
8. W3C WAI-ARIA APG — [Disclosure (Show/Hide) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
9. MDN — [Using the Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using)
10. MDN — [ARIA: progressbar role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role)
11. MDN — [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
12. W3C WAI — [Understanding SC 4.1.3: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
13. W3C WAI — [ARIA25: Using an ARIA live region to convey progress](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA25)
