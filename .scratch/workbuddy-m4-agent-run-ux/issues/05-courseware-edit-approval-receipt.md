# 05 — 完成课件编辑、AI 修改、审批与成功 Receipt

**What to build:** 教师在右侧产出区预览、聚焦、选择课件内容并输入 AI 修改要求，得到新 Artifact 版本；随后从 Timeline 提出保存到 ClassIn 的 Action、完成低风险确认、等待执行，并在原 Run 获得成功 ExecutionReceipt。

**Blocked by:** 04 — 动态执行 Skill/Tool 过程并交付可预览智能课件。

**Status:** complete

- [x] 预览、Focus、下载、编辑、保存与退出位置稳定且键盘可达。
- [x] AI 修改产生 `v2` 与 Timeline 版本事件，不覆盖 `v1`。
- [x] V06 的编辑框、选择态和保存反馈结构被智能课件语义完整复刻。
- [x] ProposedAction 显示目标、差异、风险、权限、版本与过期。
- [x] Approval 与执行中明确分开；只有 Receipt 表示 ClassIn 保存成功。
- [x] 重新打开可通过 Run ID 恢复 Timeline、Artifact、Inspector 和 Receipt。
