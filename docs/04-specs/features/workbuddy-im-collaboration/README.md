# WorkBuddy IM 人机协作交付索引

本目录按 `PRD → Feature Spec → Tickets → Implementation → Acceptance` 管理 IM 协作能力，避免产品判断、工程规则和实现结果混写。

| 阶段 | 唯一交付物 | 回答的问题 | 当前状态 |
| --- | --- | --- | --- |
| Product Requirements | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) | 为谁解决什么问题、MVP 做什么、怎样算有价值 | `LOCKED_V19` |
| Feature / Technical Spec | [FEATURE-SPEC.md](./FEATURE-SPEC.md) | 领域不变量、状态机、Interface、Seam 和验收契约是什么 | `IMPLEMENTED_V19` |
| Tickets | [TICKET-BREAKDOWN-PROPOSAL.md](./TICKET-BREAKDOWN-PROPOSAL.md) | 以什么顺序、哪些 Write Set、何时完成 | `IM_030_COMPLETED` |
| Traceability | [IMPLEMENTATION-TRACEABILITY.md](./IMPLEMENTATION-TRACEABILITY.md) | 每条需求落在哪个规格、代码和测试证据中 | `PASS_V19` |
| Acceptance | [IMPLEMENTATION-REVIEW.md](./IMPLEMENTATION-REVIEW.md) | 实机、自动化、视觉和风险是否通过 | `V18_PENDING_USER_REVIEW` |
| Immersive Interaction | [IMMERSIVE-MESSAGE-WORKSPACE-INTERACTION-DESIGN.md](./IMMERSIVE-MESSAGE-WORKSPACE-INTERACTION-DESIGN.md) | 如何从一级消息入口进入全屏三栏、原位退出并恢复全部状态 | `IMPLEMENTED_PENDING_USER_REVIEW` |
| Multi-Agent Discovery Design | [MULTI-AGENT-DISCOVERY-INTERACTION-DESIGN.md](./MULTI-AGENT-DISCOVERY-INTERACTION-DESIGN.md) | 教师/学生如何在公共群聊和 Agent 单聊入口发现、搜索、选择多个已授权 Agent | `IMPLEMENTED_PENDING_USER_REVIEW` |

## 变更流程

1. 产品意图或范围变化先更新 PRD，并为需求分配稳定 ID。
2. 领域行为、权限、状态或 Interface 变化更新 Feature Spec，并引用对应需求 ID。
3. Tickets 只拆解已经进入本阶段范围的需求；每张 Ticket 明确 Write Set、依赖和 Definition of Done。
4. Implementation 只实现已进入 Ticket 的内容；临时发现不得静默扩大范围。
5. 自动化与实机证据写回 Traceability；未通过项保留为风险或后续 Ticket。
6. 场景二、三的渠道骨架已经进入 PRD/Spec/Ticket/验收；完整业务 Case Library 仍需另行立项，不能由当前确定性示例推导为已完成。

## 真值说明

当前应用使用固定、脱敏、可重置的 ClassIn 模拟业务对象和模拟写回 Adapter。产品 Surface 可以高保真验证，但不宣称已接入真实作业、学生数据、模型或 IM 服务。
