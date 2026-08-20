# NineClaw 全局状态矩阵

## 1. 状态建模原则

状态必须描述互斥的生命周期，不使用“多个真假布尔值”拼出矛盾界面。每个状态都需要：进入条件、可见反馈、允许动作、退出条件、需要保留的数据。

## 2. Run 状态矩阵

| 状态 | 进入条件 | 页面反馈 | 允许动作 | 退出条件 | 必须保留 |
|---|---|---|---|---|---|
| draft | 尚未提交 | 可编辑输入器 | 输入、附件、选 Skill/模型、发送 | 提交/放弃 | 输入草稿 |
| submitting | 已发送、Run 未确认 | 用户消息 + 处理中 | 停止/等待 | 创建成功/失败 | 输入快照 |
| clarifying | 信息不足 | 补参卡、进度 | 回答、提交、停止 | 补参完成/停止 | 已答问题 |
| planning | 形成计划 | 思考/计划中 | 停止、追加约束 | 计划完成/失败 | 目标、答案 |
| executing | 步骤运行 | 计划与事件时间线、停止 | 追加约束、展开详情、停止 | 产物/失败/停止 | 全部事件 |
| waiting_user | 关键确认 | 高可见请求 | 同意、拒绝、修改 | 教师决定 | 请求与影响 |
| replanning | 约束变化 | 调整说明 | 停止/等待 | 新计划/失败 | 新旧计划 |
| recoverable_failed | 可恢复错误 | 原因 + 恢复动作 | 重试、换策略、停止 | 成功/终止 | 错误与尝试 |
| stopped | 用户停止 | 已停止、已有结果 | 继续输入、查看产物 | 新提交 | 已完成步骤 |
| artifact_ready | 至少一个产物可用 | Artifact 卡/右栏 | 查看、编辑、继续 | 修改/保存/完成 | 产物版本 |
| completed | 运行结束 | 总结与产物 | 查看、继续新一轮 | 追加需求 | 完整记录 |
| terminal_failed | 无可行恢复 | 失败影响与建议 | 复制、重新开始 | 新 Run | 失败证据 |

## 3. 计划步骤状态

| 状态 | 表达 | 可转移到 |
|---|---|---|
| pending | 尚未执行 | running、skipped、superseded |
| running | 正在执行和当前动作 | succeeded、failed、cancelled |
| waiting_user | 等待输入/确认 | running、cancelled |
| succeeded | 完成 + 输出摘要 | 终态；新约束时可 superseded |
| failed | 原因与恢复 | running、skipped、cancelled |
| skipped | 原因 | 终态 |
| cancelled | 因停止终止 | 终态；继续时创建新尝试 |
| superseded | 被新约束替代 | 终态，保留追溯 |

## 4. Artifact 状态

| 状态 | 可见反馈 | 可用动作 | 数据规则 |
|---|---|---|---|
| generating | 类型、进度/阶段 | 取消能力待定 | 尚不可当成最终文件 |
| generated | 文件已写入 | 打开、定位 | 固化初始版本 |
| preview_loading | 解析中 | 关闭 | 原文件仍存在 |
| preview_ready | 内容可读 | 编辑、AI 修改、下载 | 指向稳定版本 |
| preview_failed | 解析失败 | 重试、外部打开 | 不等于生成失败 |
| editing_clean | 编辑器已打开无改动 | 关闭、修改 | 与已保存版本一致 |
| editing_dirty | 有未保存改动 | 保存、取消、AI 修改 | 退出需防丢稿 |
| ai_revising | AI 生成修改 | 等待/取消待定 | 绑定基线版本 |
| saving | 正在写入 | 防重复操作 | 锁定提交版本 |
| saved | 保存成功 | 继续编辑、关闭 | 生成新版本/更新时间 |
| save_failed | 写入失败 | 重试、另存 | 必须保留草稿 |
| superseded | 已有更新版本 | 查看历史 | 不再是当前版本 |

## 5. Skill/Tool 安装状态

| 状态 | 卡片主动作 | 管理动作 | 任务可用性 |
|---|---|---|---|
| available | 安装 | 详情 | 不可用 |
| installing | 安装中 | 取消 `UNKNOWN` | 不可用 |
| install_failed | 重试 | 查看原因 | 不可用 |
| installed_disabled | 启用 | 删除、详情 | 默认不可用 |
| installed_enabled | 去使用/立即使用 | 禁用、删除、详情 | 可由 Agent 调用 |
| update_available | 更新 | 版本详情 | 旧版是否可用 `UNKNOWN` |
| deleting | 删除中 | — | 新任务不可选 |

`installed`、`enabled`、`selected_for_run` 必须是不同维度；页面可以派生展示态，但底层不可混用。

## 6. 内容作品状态

| 状态 | 所有者可见动作 | 广场可见性 | 备注 |
|---|---|---|---|
| local_draft | 继续发布/删除 | 不可见 | 向导草稿是否保存 `UNKNOWN` |
| uploading | 等待/取消待定 | 不可见 | 文件与封面独立进度 |
| upload_failed | 重试/重选 | 不可见 | 保留元数据草稿 |
| metadata_incomplete | 完善信息 | 不可见 | 下一步禁用 |
| pricing_incomplete | 设置定价 | 不可见 | 整数范围校验 |
| submitting | 防重复提交 | 不可见 | 固化提交快照 |
| under_review | 查看 | 不可见/规则待定 | 界面提示 1–24 小时 |
| approved | 查看/管理 | 可见 | 下载/解锁/改编 |
| rejected | 查看原因/修改重提 | 不可见 | 具体动作待验证 |
| off_shelf | 查看/管理 | 不可见 | 主动/平台下架区别待定 |

## 7. 定时任务状态

| 状态 | 列表反馈 | 允许动作 | 转移 |
|---|---|---|---|
| draft | 仅表单内 | 保存/取消 | enabled/disabled |
| enabled | 开关开、下次执行 | 立即运行、编辑、禁用、删除 | running/disabled/expired |
| disabled | 开关关 | 启用、编辑、删除、立即运行待定 | enabled |
| running | 本次执行中 | 查看/停止能力待定 | enabled/succeeded/failed |
| succeeded | 历史成功 | 查看结果 | 历史终态 |
| failed | 历史失败 | 查看/重跑 | running |
| expired | 到期 | 编辑/删除 | enabled/disabled |
| blocked | 缺模型/目录/通知配置 | 修复配置 | enabled |

重叠执行、设备离线补跑、时区/DST、错过执行和通知失败不应混同为任务执行失败，均需要单独策略。

## 8. 模型与连接状态

| 对象 | 状态 | 页面反馈 | 动作 |
|---|---|---|---|
| Provider | disabled | 未启用 | 启用/配置 |
| Provider | unconfigured | 缺字段 | 填写 |
| Provider | testing | 测试中 | 等待 |
| Provider | connected | 可用 | 添加/选择模型 |
| Provider | auth_failed | 鉴权错误 | 改 Key/重试 |
| Provider | endpoint_failed | 地址/网络错误 | 改 URL/重试 |
| IM channel | unbound | 未绑定 | 绑定/手动配置 |
| IM channel | binding | 处理中 | 等待 |
| IM channel | connected | 已连接 | 重绑/解绑 |
| IM channel | permission_failed | 权限不足 | 重新授权 |
| Sandbox | unavailable | 虚拟机不可用 | 安装 |
| Sandbox | installing | 进度 | 等待/重试 |
| Sandbox | available | 模式可选 | 切换模式 |

## 9. 页面共通状态

每个列表/详情/弹窗至少评审以下状态：

- initial loading；
- loaded with data；
- empty first use；
- empty after filters；
- partial data/image failure；
- recoverable request failure；
- offline/unavailable；
- permission denied；
- unauthenticated/session expired；
- submitting and duplicate prevention；
- success confirmation；
- destructive action confirmation；
- stale/conflict when data changed elsewhere。

## 10. ClassIn 适配时必须新增的正式状态

NineClaw 标杆还原之外，ClassIn 业务写回必须明确增加：

```text
ArtifactDraft
  → ProposedAction
  → policy_checking
  → awaiting_approval
  → approved / rejected / expired
  → executing
  → succeeded / partially_succeeded / failed
  → ExecutionReceipt
  → undo_available / undo_expired（适用时）
```

这些状态不能用“Agent 回复已完成”替代，也不能与本地文件保存状态混为一谈。
