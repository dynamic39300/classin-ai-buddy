# WorkBuddy M4 Phase 4 Review Checklist

**Status:** FUNCTIONAL_SCOPE_ACCEPTED_UX_REVISION_REQUIRED
**Date:** 2026-08-21  
**Fixture:** `workbuddy-m4-course-production-v1`

## 1. 本阶段交付结论

M4 已把 M3 的工作台骨架推进为两条可操作、可重置且明确标注为 Mock 的课程生产纵向闭环：

- 单课件：`Goal → Core Context → ContextSnapshot → 补参 → Plan → RunEvent → ArtifactDraft → ProposedAction → Approval → Mock Adapter → ExecutionReceipt`；
- 课程方案包：独立 `course-package` Task Type → 产物范围确认 → Artifact Graph → ProposedAction → 独立 Approval → Adapter → 对象级 Receipt → 失败项重试；
- 衔接：从已审阅课件创建关联但独立的方案包 Run，保留 `parentRunRef` 与 `sourceArtifactRef`，并在生成前重新确认裁剪后的独立 ContextSnapshot；
- 恢复：主教学范围变更先展示影响，确认后生成新 Snapshot，旧 Snapshot/Artifact/Action/Receipt 保留为 superseded 证据。

所有生成内容、执行结果和 ClassIn 写回均为固定、脱敏、内存态 Mock，不代表真实模型、文件生成或生产 API 已接入。

2026-08-21 用户 Review 已确认上述功能 Feature、领域对象、异常与治理覆盖全面，没有功能范围缺口。同时，用户未接受当前阶段卡片和活动面板驱动的最终交互表达：教师应当在一个持续存在的 Agent 任务对话窗口中感知目标理解、结构化补参、Context、计划、动态过程、Skill/Tool 调用、产物、动作提案、确认与回执，而不是依靠阶段页面或立即跳转完成链路。

因此本结论拆成两部分：

- **功能与技术基线：接受。** 现有 `WorkBuddyRun`、`ContextSnapshot`、Artifact Graph、Action、Approval、Adapter、Receipt、异常恢复和幂等语义继续作为 M4.1 输入；
- **产品交互体验：需要修订。** 进入 [M4.1 对话式 Agent Run UX 规格包](../workbuddy-m4-agent-run-ux/README.md)，完成设计 Review、实现和用户复审前，不把 M4 标记为最终产品体验验收通过。

## 2. 建议 Review 路径

1. 以老师身份进入 `AI Agent → 新建任务`。
2. 打开“核心上下文”，检查七层结构、来源/版本/权限/敏感度；应用动量课程建议并确认 `ContextSnapshot`。
3. 选择“生成单个课件”，检查补参、计划、稳定过程事件、ArtifactDraft 与最小 ContextProjection。
4. 在产物面板发起“保存到 ClassIn”，检查 ProposedAction 信息，再分别体验批准、执行和 ExecutionReceipt。
5. 通过“Mock 写回场景”依次检查权限拒绝、版本冲突、临时失败、超时与安全重试；权限和冲突都要求调整后重新确认。
6. 返回新建任务，选择“生成课程方案包”，检查四类 Artifact Graph、取消单项、部分成功与失败项重试。
7. 从单课件产物选择“基于此课件生成课程方案包”，检查独立 Run/Snapshot 与双向来源引用。
8. 在单课件 Run 选择“调整教学范围”，检查影响预览、新 Snapshot 和 superseded 证据。
9. 返回新建任务，在 Core Context 面板执行“重置 M4 场景”，确认动态历史与所有 M4 内存状态恢复固定初始值。

## 3. 状态覆盖

| 状态 | 可复现入口 |
|---|---|
| `needs_attention` | 新建任务只带 Actor/组织；或 Replanning 后等待补参 |
| `waiting` | 计划确认、审批前、已批准未执行 |
| `completed_pending_review` | 单课件 ArtifactDraft 已生成 |
| `permission_denied` | Mock 写回场景选择权限拒绝 |
| `version_conflict` | Mock 写回场景选择版本冲突 |
| `recoverable_failure` | Mock 写回场景选择临时失败后安全重试 |
| `timeout` | Mock 写回场景选择超时后安全重试 |
| `partial_success` | 课程方案包首次对象级写回 |
| `completed` | 成功 ExecutionReceipt 或可用方案包项完成写回 |
| `superseded` | 调整主教学范围并确认重新规划 |

## 4. 自动化证据

- TypeScript：通过；
- ESLint：通过；
- Vitest：50 files / 378 tests 通过（单 worker 全量复跑）；
- Production build：通过；Vite 仅保留既有大 chunk 提示；
- Playwright E2E：67/67 通过（单 worker 全量复跑）；
- WorkBuddy Visual：8/8 通过，覆盖 1440×900 与 1000×768；
- M4 E2E 内 axe serious/critical：0。

## 5. 双轴审查整改与终审结论

首轮 Standards/Spec 审查发现的 P1/P2/P3 已全部进入实现整改，并通过上述自动化验证：

- 方案包补齐显式 `ProposedAction → Approval → Adapter → ExecutionReceipt`，Domain 不再伪造对象 ID 或 Receipt；
- 派生方案包不再复制并自动确认原 Snapshot，只显式建议必要教学范围，并要求教师确认独立 Snapshot；
- Package Run 写入任务历史，活动面板、Artifact 与 Receipt 可离开页面后恢复；
- ContextProjection 改为按 Capability Manifest 和步骤用途生成，展示 Snapshot、用途、生成时间、来源版本与敏感项裁剪数量；
- 单课件和方案包 Adapter 均覆盖权限、冲突、可恢复失败、超时和幂等重试，并使用 Mock 与 deterministic test 两个具体实现执行契约测试；
- 幂等键在第一次合法执行尝试时即绑定规范化请求指纹；审批、Run/Context/Artifact 归属先于缓存重放校验，同键异请求被拒绝，同语义乱序请求可稳定重放；
- ProposedAction 的时间策略改为共享的失败关闭规则；无效时间、过期审批和过期执行均拒绝，续期只更换 ID、幂等键与有效期并保留教师已确认目标；
- Core Context hierarchy 与课程包 Artifact Graph 均在领域入口校验重复 ID、悬空依赖和环；合法乱序 DAG 按依赖关系解析；
- Courseware 与 Package application controller 已从 Workspace Provider 拆出，公开 Workspace Interface 不变；
- UI 只消费 Feature-owned presentation model，Fixture 文案、ID、时间和对象定义移至 Mock scenarios；
- 侧栏关闭恢复焦点，CSS 字号与间距回到已锁定 token。

固定基线 `24e758b` 至交付 HEAD 的最终 Code Review 结论：**Standards PASS / Spec PASS，P0–P3 为 0**。

## 6. 明确不属于 M4

- 真实 LLM、流式 Provider、Skill/MCP 执行、真实 PPTX/DOCX/视频文件；
- ClassIn 生产 API、数据库、跨刷新/跨设备持久化、生产权限与冲突协议；
- 学生个人证据与学生姓名进入普通课程生产 Projection；
- 最终品牌视觉和完整文档编辑器。

## 7. 用户 Review 记录

2026-08-21 用户完成 M4 整体审阅并确认：功能 Feature 覆盖全面，底层技术方案可以保留；当前阶段实际模拟的是 Agent Run 体验，尚未接入真实 Agent。用户要求把单课件和课程方案包都改为一个对话窗口内动态完成的完整 Agent Run，并确认以下方向：

1. 使用一体化对话时间线表达完整闭环；
2. V05 智能教案作为主流程证据，V04/V06 补充产物预览与编辑；
3. Core Context 改为默认展开、可收起的结构化业务对象树；
4. 右侧活动区使用 `上下文 / 产出` 两个视图动态切换；
5. 当前使用确定性体验 Adapter 模拟 Run，未来真实 Agent Runtime 通过同一 Seam 替换。

导航结构与文案由独立会话处理；历史任务最终数量、全局 Demo 文案与统一真值表达尚未在本次确认中锁定。内部 Standards/Spec 双轴工程终审仍保持 PASS，但产品体验 Review Gate 转入 M4.1。
