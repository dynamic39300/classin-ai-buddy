# WorkBuddy 后端与 Harness 技术规范

## 责任模型

后端围绕五个 Harness 深模块和共享技术基座组织，不按模型供应商、SDK 或协议名称划分业务 Module。每个 Module 提供小而稳定的 Interface，并拥有自己的不变量、错误和审计事件。

## 契约优先

- Intent、Context、Artifact、Capability、Action、Evaluation 使用版本化 Schema；
- 外部输入先验证，未知字段、版本不兼容和权限不足返回结构化错误；
- Provider 私有对象不越过 Adapter Seam；
- API、事件和持久化模型分开演进，映射关系有测试；
- 破坏性契约变更通过 ADR、迁移和兼容窗口处理。

## Run 与事件

`WorkBuddyRun` 是业务运行的稳定事实，SDK Session、Graph Thread、Workflow ID 和 A2A Task ID 只是实现引用。每次状态变化由 Command 触发并产生可审计 `RunEvent`；恢复必须避免重复执行已成功的业务副作用。

需要跨小时/天等待、定时器和多系统可靠副作用时，才使用 Durable Workflow。短程生成任务使用轻量 Agent Loop 或状态机即可。

## Capability 与工具执行

每个 Capability 通过 `CapabilityManifest` 描述 Provider 版本、输入输出、所需权限、风险、副作用、审批、幂等、超时、重试、补偿、成本和生命周期。

所有副作用进入唯一执行管线：

```text
ProposedAction -> Policy -> Approval -> Domain Validation
-> Idempotency -> Execute -> Normalize -> ExecutionReceipt -> Audit
```

MCP 和 A2A 只作为 Adapter；协议可调用不代表业务授权或领域状态允许写入。

## 数据与持久化

- ClassIn 领域事实留在事实所有者系统；
- WorkBuddy 保存必要引用、快照元数据、ArtifactDraft、审批、回执和评价；
- 学生原文按最小化、授权、保留和删除策略处理；
- 长期记忆区分教师偏好、任务历史、知识、学生事实和机构规则；
- 数据库迁移可回滚，事件与投影支持重建和版本升级。

## 安全

- 身份、租户、角色和对象范围在服务端强制校验；
- Prompt、Skill 或 MCP Server 不能成为权限所有者；
- 敏感日志默认脱敏，Trace 与业务数据采用不同访问策略；
- 批量学生动作、外部消息、正式评价和发布属于高风险动作，需要教师确认和机构策略；
- 凭据由受控 Secret 机制提供，不进入仓库、Prompt 或模型上下文。

## 可观测性与评价

使用关联 ID 串起 Run、模型调用、Capability、Action、Receipt 和 Evaluation。记录模型/Prompt/知识/Capability 版本、延迟、成本、错误和教师采纳，但不把 Trace 供应商日志当作业务事实。

## 测试

- Domain 状态和策略使用确定性单元测试；
- Adapter 使用契约测试，模拟与真实实现遵循相同用例；
- 副作用执行测试幂等、部分失败、冲突、重试和补偿；
- 事件重放测试恢复和投影一致性；
- 安全测试覆盖跨机构、越权、权限撤销和敏感字段；
- 模型非确定性通过固定任务集、结构约束和评价门槛验证，不用单次快照断言语义质量。

