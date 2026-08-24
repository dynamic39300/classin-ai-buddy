# WorkBuddy 动态头像素材预览

本目录是一次性视觉原型，用于回答：现有 5 秒方形人物视频经圆形裁剪后，在不同页面尺寸和使用场景中是否清晰、自然。

直接双击 `preview.html`，或在浏览器打开：

- `preview.html?variant=standard`：32 / 40 / 56 / 80 / 112px 尺寸和完整头发裁剪；
- `preview.html?variant=header`：WorkBuddy 侧栏 Header 中的 40px 使用效果；
- `preview.html?variant=nudge`：56px 引导提示效果。

素材保持原始 720×720、H.264 MP4，不重新编码。圆形边界由页面 `border-radius: 50%` 与 `overflow: hidden` 实现，因此同一份素材可以适配不同尺寸。所有视频默认 `muted + autoplay + loop + playsinline`。

本原型尚未接入任何既有产品页面。用户确定投放位置后，应把选定规格重写为正式的 Design System / Feature 组件，并清理其余原型代码。
