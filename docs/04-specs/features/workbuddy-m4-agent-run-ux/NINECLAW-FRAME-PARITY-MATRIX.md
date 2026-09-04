---
title: WorkBuddy M4.1 NineClaw 逐帧还原与语义统一矩阵
status: TO_SPEC_EVIDENCE
version: v0.1
date: 2026-08-21
governing_decision: D-028
---

# WorkBuddy M4.1 NineClaw 逐帧还原与语义统一矩阵

## 1. 目的

本矩阵把 V04、V05、V06 中已经观察到的可见元素、文案、状态变化和动态效果映射为一条上下文连续的“生成智能课件”Agent Run。它是 Feature Spec、Experience Adapter、视觉实现与 E2E 验收之间的证据桥梁。

这里的“逐帧”指每一个具有产品语义变化的事件帧，而不是对编码视频的每个物理画面做重复登记。没有产品状态变化的连续等待画面归入前一个事件的持续态；出现新元素、新文案、新状态、新焦点、新分栏或新反馈时必须建立新事件。

## 2. 唯一目标叙事

```text
narrativeRef: intelligent-courseware-run-1
teacher: 王老师
goal: 为高一（3）班生成一份函数单调性智能课件，包含概念讲解、图像示例、课堂探究和随堂练习
contextSnapshotRef: context-snapshot-courseware-1
artifactRef: artifact-courseware-monotonicity@v1（浏览不产生新版本）
target: 高中数学·必修一 / 函数的性质 / 课程资源草稿
```

以下约束贯穿全部源素材：

- V05 提供唯一任务目标、Agent 口吻、缺参、计划、执行和完成叙事；
- V04 只提供过程轨迹、产物引用、分栏预览和交互式产物结构；
- V06 只提供聚焦层、工具位置和退出结构；内嵌编辑按 D-044 明确不复刻；
- 目标 Timeline 不出现“三顾茅庐故事动画”“课后练习”或对应源文件名；
- V04/V06 的源文案仍完整登记，但目标文案统一为同一个智能课件及其版本；
- 课程方案包是另一独立 Task Type，不借用本矩阵中的 V04/V06 原任务文案。

## 3. 共享可见元素清单

| ID | 源视频共同事实 | 智能课件目标表达 | 状态 |
| --- | --- | --- | --- |
| S-01 | 左侧主导航、历史任务、我的文件、设置和账号区持续存在 | 继续使用 ClassIn 左侧 Shell 与 AI Agent 二级导航，不在 Run 中创建第三根 Stage 导航 | `CLASSIN_ADAPTATION` |
| S-02 | 中央区保持同一任务标题和连续会话 | 中央区保持同一 `runRef` 和 Timeline；阶段变化不跳转页面 | `EXACT` |
| S-03 | 用户消息、Agent 说明、思考/过程、调用结果按时间追加 | 映射为 Teacher Message、Goal Understanding、Plan、Process、Capability Call、Artifact、Action 和 Receipt 事件 | `CLASSIN_ADAPTATION` |
| S-04 | 当前执行内容位于视口下方，页面随新事件向下推进 | 用户位于底部时自动跟随；用户上滚后停止抢占并显示“新增 N 条” | `EXACT` |
| S-05 | Skill、文件读取、命令、写入等调用使用紧凑行表达进行中与完成 | 保留同层级调用卡；教师摘要默认可见，脱敏技术证据按需展开 | `CLASSIN_ADAPTATION` |
| S-06 | 产物打开后形成左会话、右预览 | 右侧统一辅助区切换到“产出”，Timeline 和 Composer 不被替换 | `EXACT` |
| S-07 | 右侧产物拥有全屏、分享、下载、编辑等工具位置 | 保留预览、聚焦和下载；编辑改为进入专业第三方文档编辑器，未接入时明确提示 | `CLASSIN_ADAPTATION` |
| S-08 | 编辑态拥有保存、退出、选择框和 AI 修改输入 | 不在 Work Buddy 预览器内复刻；按 D-044 收敛为只读全局预览与第三方编辑器衔接 | `USER_DIRECTED_DIVERGENCE` |
| S-09 | 视频中的账号、积分、会员和模型选择持续可见但不参与任务主链 | 不复制到 WorkBuddy Run；这些属于 NineClaw Shell 而非目标 Agent Run 事件 | `CLASSIN_ADAPTATION` |
| S-10 | 视频中存在绝对路径、环境变量、原始命令和终端输出 | 保留调用事件、进行中/完成状态和技术证据入口；真实账号、Secret 与本机路径脱敏 | `SECURITY_REDACTION` |

## 4. V05：智能课件主流程事件

| Event | Source / timestamp | 源可见事实与关键原文 | 智能课件目标文案与行为 | Target | Parity |
| --- | --- | --- | --- | --- | --- |
| L-01 | [lesson@00:48](../../../01-research/evidence/nineclaw-keyframes/lesson_0048_missing-variables.jpg) | 首页 Composer 中已有完整教案要求，底部选择“智能教案”；快捷入口仍可见 | Composer 已带入 Core Context Chip；教师输入统一 Goal 并发送。发送后创建稳定 Run 与历史条目 | A00–A03 / `teacher_message` | `CLASSIN_ADAPTATION` |
| L-02 | [lesson@01:12](../../../01-research/evidence/nineclaw-keyframes/lesson_0072_confirmation-step-1.jpg) | “需要您的确认”；显示“课时安排”；选项包括“第1课时（新授入门）”“第2课时（进阶）”“第3课时（综合）”“不限/默认第1课时”“其他”；底部有“跳过”“提交”和步骤进度 | Agent 先说明还缺课时、时长、风格、教材版本；内嵌确认卡保持标题、步骤进度、单选/其他、跳过和提交结构。当前帧字段改为“课时安排”，选项与函数单调性课件语义一致 | A04–A05 / `clarification_request` | `TASK_SEMANTIC_NORMALIZATION` |
| L-03 | [lesson@01:20](../../../01-research/evidence/nineclaw-keyframes/lesson_0080_confirmation-submitted.jpg) | 确认卡关闭；原用户目标仍在上方；Agent 分析学科、年级、单元、教材版本、课时与授课类型 | 提交后卡片收起为“已补充 4 项”；Agent 生成面向教师的目标理解摘要，不展示隐藏思维链 | A06–A07 / `clarification_submitted`, `goal_understood` | `CLASSIN_ADAPTATION` |
| L-04 | [lesson@01:28](../../../01-research/evidence/nineclaw-keyframes/lesson_0088_post-confirmation-execution.jpg) | “我来帮你生成……在开始之前，需要先确认几个关键信息”；随后出现“用户确认”完成行，执行继续，并说明将读取技能参考资源 | 同一 Timeline 显示确认结果和“我会基于已确认的教学范围组织课件”；已知 Core Context 不重复询问 | A06–A08 / `context_confirmed`, `plan_proposed` | `CLASSIN_ADAPTATION` |
| L-05 | [lesson@02:06](../../../01-research/evidence/nineclaw-keyframes/lesson_0126_taskcreate-and-skill-read.jpg) | 连续出现目录检查、Skill 文件读取、DOCX Skill 读取；随后三个 `TaskCreate`：阅读文档、编写内容、生成 Word 文档 | Plan 确认后创建课件结构、视觉页面、课堂活动与随堂练习等步骤；调用卡显示“读取智能课件设计规范”“读取课件生成能力”，计划行逐条进入待执行 | A08–A10 / `plan_confirmed`, `capability_call`, `step_created` | `TASK_SEMANTIC_NORMALIZATION` |
| L-06 | [lesson@03:30](../../../01-research/evidence/nineclaw-keyframes/lesson_0210_docx-environment-trace.jpg) | 环境与依赖检查完成；Agent 说明将使用已就绪能力创建文档；过程持续显示进行中 | 当前步骤先进入 running；显示“正在准备课件生成环境”和脱敏调用摘要，不声称真实安装依赖 | A10–A11 / `step_started`, `capability_call` | `CLASSIN_ADAPTATION` |
| L-07 | [lesson@04:12](../../../01-research/evidence/nineclaw-keyframes/lesson_0252_script-generation.jpg) | 出现脚本写入、代码片段和“主脚本就绪”；Agent 继续创建完整内容模块 | 显示“正在生成课件页面结构”和可折叠技术证据；阶段输出为课件目录与页面草稿，不展示原始长代码 | A11–A12 / `capability_progress`, `step_result` | `TASK_SEMANTIC_NORMALIZATION` |
| L-08 | [lesson@05:18](../../../01-research/evidence/nineclaw-keyframes/lesson_0318_tool-command-trace.jpg) | 该源帧已切换到另一课后作业任务，包含 `homework-generator`、HTML 文件、作业概况；不能作为原智能教案内容连续证据 | 不复制该任务名、文件名、题量与课后作业总结；只复用紧凑调用完成行、阶段表格和结果摘要的视觉结构 | A12–A13 / `capability_completed`, `step_result` | `TASK_SEMANTIC_NORMALIZATION` |
| L-09 | [lesson@07:15](../../../01-research/evidence/nineclaw-keyframes/lesson_0435_completion-summary.jpg) | 完成总结包含学科年级、单元课时、课题、类型、模块结构、针对要求的设计、排版规范和后续建议 | 完成总结改为“函数单调性智能课件已生成”，列出概念讲解、图像示例、课堂探究、随堂练习、课时与视觉风格；追加 Artifact 卡并打开产出区 | A13–A14 / `run_summary`, `artifact_created` | `TASK_SEMANTIC_NORMALIZATION` |

## 5. V04：产物产生与预览补充事件

| Event | Source / timestamp | 源可见事实与关键原文 | 智能课件目标文案与行为 | Target | Parity |
| --- | --- | --- | --- | --- | --- |
| A-01 | [animation@00:00](../../../01-research/evidence/nineclaw-keyframes/animation_0000_goal-composer.jpg) | 首页 Composer 中输入“三顾茅庐故事动画”目标，底部选择“教学动画” | 不作为第二个 Goal；只复用首页 Composer、任务类型标记和发送前布局。目标仍为函数单调性智能课件 | A00–A03 | `TASK_SEMANTIC_NORMALIZATION` |
| A-02 | [animation@00:23](../../../01-research/evidence/nineclaw-keyframes/animation_0023_execution-start.jpg) | 同一任务进入执行；Agent 说明任务理解、所用 Skill、环境检查、脚本查看、生成与文件呈现步骤；调用行经历执行中→执行完成 | 复用“理解摘要→能力说明→步骤→第一个调用”的出现顺序；文案替换为智能课件结构设计能力与课件页面生成 | A07–A11 | `TASK_SEMANTIC_NORMALIZATION` |
| A-03 | [animation@00:46](../../../01-research/evidence/nineclaw-keyframes/animation_0046_plan-and-commands.jpg) | “我先制定计划”；四项任务计划；“预计耗时 2–5 分钟。开始调用” | 复用计划标题、编号列表、预计过程和启动反馈；目标计划使用智能课件四步，不复制动画分镜、头像或 HTML 文件名 | A08–A10 | `TASK_SEMANTIC_NORMALIZATION` |
| A-04 | [animation@01:57](../../../01-research/evidence/nineclaw-keyframes/animation_0117_command-trace.jpg) | 调用卡展开终端进度；大量结构化提示词；“执行中”持续可见 | 复用当前调用展开、流式追加、状态点和滚动行为；内容替换为课件页面、图像示例、课堂探究和随堂练习生成摘要 | A10–A12 | `TASK_SEMANTIC_NORMALIZATION` |
| A-05 | [animation@03:07](../../../01-research/evidence/nineclaw-keyframes/animation_0187_artifact-file-result.jpg) | 录屏在该时间点切到另一智能教案任务，主区出现完整教案长 Prompt；不是动画任务的连续结果 | 不把长教案 Prompt 作为新消息插入当前 Run；只登记源任务切换，目标 Run 保持稳定 | 不产生目标事件 | `TASK_SEMANTIC_NORMALIZATION` |
| A-06 | [animation@03:40](../../../01-research/evidence/nineclaw-keyframes/animation_0220_preview-split.jpg) | 左侧仍保留计划和调用；右侧打开代码/文件预览，形成双栏；调用完成后说明文件已复制到工作目录 | Artifact 引用出现后右侧自动切换到“产出”；左侧 Timeline 保持；预览标题为“函数单调性智能课件 v1” | A13–A14 | `TASK_SEMANTIC_NORMALIZATION` |
| A-07 | [animation@04:03](../../../01-research/evidence/nineclaw-keyframes/animation_0243_interactive-artifact.jpg) | Agent 总结“生成成果、内容亮点、访问链接”；右侧显示交互式产物 | 总结列出课件结构和验证结果；右侧显示可翻页课件预览；Timeline Artifact 卡保留稳定引用 | A14–A15 | `TASK_SEMANTIC_NORMALIZATION` |
| A-08 | [animation@04:37](../../../01-research/evidence/nineclaw-keyframes/animation_0277_edit-ai-modify.jpg) | 右侧顶部有全屏、分享、下载、编辑；产物保持可交互；左侧完成总结不消失 | 复用工具区、双栏和持续会话；编辑入口改为第三方专业编辑器，Work Buddy 内保持只读 | A15–A16 | `USER_DIRECTED_DIVERGENCE` |

## 6. V06：产物编辑与保存补充事件

| Event | Source / timestamp | 源可见事实与关键原文 | 智能课件目标文案与行为 | Target | Parity |
| --- | --- | --- | --- | --- | --- |
| E-01 | [exercise@00:00](../../../01-research/evidence/nineclaw-keyframes/exercise_0000_goal.jpg) | 首页选择“课后练习”，任务上下文与智能教案不同 | 不创建第三个 Goal；只复用从新任务进入标准 Run 的入口结构 | A00–A03 | `TASK_SEMANTIC_NORMALIZATION` |
| E-02 | [exercise@00:54](../../../01-research/evidence/nineclaw-keyframes/exercise_0054_execution.jpg) | Agent 分析学科年级、知识点、题型、题量、难度、答案解析等缺口，当前状态为执行中 | 复用结构化缺口分析的密度与进行中反馈；字段替换为课时、时长、教材版本和课件风格 | A04–A05 | `TASK_SEMANTIC_NORMALIZATION` |
| E-03 | [exercise@02:54](../../../01-research/evidence/nineclaw-keyframes/exercise_0174_preview-split.jpg) | 左侧显示生成总结和题型表；右侧打开产物正文；顶部有全屏、分享、下载、编辑 | 左侧显示课件完成总结；右侧打开课件页面预览；顶部工具保持同位置与状态 | A14–A15 | `TASK_SEMANTIC_NORMALIZATION` |
| E-04 | [exercise@03:30](../../../01-research/evidence/nineclaw-keyframes/exercise_0210_edit-ai-modify.jpg) | 右侧进入“编辑中”；顶部“保存”“退出”；正文元素有选中框；底部出现“AI修改 / 请输入修改意见” | 不复刻内嵌编辑；聚焦层改为全局页面目录与只读逐页预览，修改交给第三方专业编辑器 | A15–A16 | `USER_DIRECTED_DIVERGENCE` |
| E-05 | [exercise@03:40](../../../01-research/evidence/nineclaw-keyframes/exercise_0220-save-success.jpg) | 顶部出现“保存成功”；编辑工具退出，回到非编辑预览 | Work Buddy 浏览不产生新版本；“保存到 ClassIn”仍需 ProposedAction、Approval 和 Adapter，Receipt 到达后才显示“课件草稿已保存到 ClassIn” | A16–A20 | `ADDED_DOMAIN_GOVERNANCE` |

## 7. ClassIn 增量治理事件

以下事件没有声称来自 NineClaw 录屏，但属于已审阅 M4.1 主链：

| Event | 新增内容 | 插入位置 | 类型 |
| --- | --- | --- | --- |
| C-01 | 默认展开的 Core Context 业务对象树与 Composer Chip | L-01 前及 Goal 提交前 | `ADDED_DOMAIN_GOVERNANCE` |
| C-02 | ContextSnapshot 冻结、来源、权限、敏感度和最小 ContextProjection | L-03/L-04 | `ADDED_DOMAIN_GOVERNANCE` |
| C-03 | Artifact 稳定 ID、版本、来源步骤和验证摘要 | L-09/A-06 | `ADDED_DOMAIN_GOVERNANCE` |
| C-04 | ProposedAction 卡与低风险单对象卡内确认 | E-05 后 | `ADDED_DOMAIN_GOVERNANCE` |
| C-05 | Approval 与执行中状态分离 | ProposedAction 后 | `ADDED_DOMAIN_GOVERNANCE` |
| C-06 | ExecutionReceipt、对象 ID、版本、时间和返回入口 | 执行完成后 | `ADDED_DOMAIN_GOVERNANCE` |
| C-07 | 权限拒绝、版本冲突、临时失败、超时与安全重试 | 可控异常分支 | `ADDED_DOMAIN_GOVERNANCE` |
| C-08 | 运行中重大修改触发 Replanning，旧证据标记 superseded | Process 中 Teacher Message 后 | `ADDED_DOMAIN_GOVERNANCE` |

## 8. 动态节奏基线

| 动态 | 源证据 | 目标可观察行为 |
| --- | --- | --- |
| 发送后开始响应 | V04@00:00→00:23、V06@00:00→00:54 | 用户消息立即进入 Timeline；150–500ms 出现整理状态；随后追加目标理解 |
| 补参等待 | V05@01:12 | 确认卡出现后 Run 进入 `requires_teacher_input`，受阻步骤不得继续 |
| 提交后继续 | V05@01:20→01:28 | 卡片收起为完成摘要，下一事件从已确认字段继续 |
| 调用状态 | V05@02:06、V04@00:23→01:57 | 调用卡先出现 running，再在原位置追加结果并进入 completed/failed |
| 长过程滚动 | V04@01:57、V05@03:30→05:18 | 用户在底部时平滑跟随；用户上滚时不抢焦点 |
| 产物到达 | V04@03:40→04:03 | Timeline 先出现 Artifact 引用，再打开或提示右侧产出；不能先显示无来源预览 |
| 全局预览 | V06@02:54→03:30 | 右侧进入聚焦只读阅读态，页面目录和翻页工具出现，Timeline 状态保持原位 |
| 保存反馈 | V06@03:30→03:40 | 保存动作具有进行中反馈；ClassIn 目标链只有 Receipt 可以声明业务保存成功 |

## 9. 实现与验收断言

1. V04/V05/V06 共 22 个登记事件均具有目标去向或明确“不产生目标事件”的上下文边界说明。
2. 单课件主流程始终使用同一个 `narrativeRef`、`runRef`、`contextSnapshotRef` 和 Artifact 版本链。
3. 目标页面中不得出现“三顾茅庐”“教学动画”“北京版小学英语”“课后练习.html”等源任务残留。
4. V05 的确认卡结构、步骤进度、跳过/提交、调用行、任务步骤和完成总结都必须可观察。
5. V04 的左会话右预览、Artifact 引用、工具区和持续 Timeline 都必须可观察。
6. V06 的版面结构映射为全局只读预览、页面目录、翻页与退出；内嵌编辑按 D-044 明确不实现。
7. `prefers-reduced-motion` 只减少过渡，不改变事件顺序或跳过 running 状态。
8. 视觉回归至少覆盖确认卡、计划、运行中调用、Artifact 到达、全局只读预览、ProposedAction、Approval 和 Receipt。
9. 所有 `ADAPTED` 文案都必须能回溯到本矩阵的源事件和目标文案，不在组件内临时发明第三套任务叙事。
10. 真实 Agent Runtime 接入后只替换事件来源，不改变本矩阵定义的教师可观察语义、审批边界和 Receipt 真值。

## 10. 证据边界

- V05 没有清晰证明多个确认页面的完整后续步骤；M4.1 的四项补参来自已审阅 PRD，确认卡视觉和交互来自 V05。
- V05 的 DOCX 内嵌预览证据不足；目标智能课件预览使用 M4.1 已定义的 Artifact Preview，不声称复刻 DOCX Viewer。
- V06 的“保存成功”只证明 UI 反馈，不证明版本、冲突或跨会话持久化；ClassIn 业务保存继续以 ExecutionReceipt 为唯一事实。
- 源视频中途切换到其他任务的画面已登记为上下文边界，不会被错误拼入当前智能课件 Timeline。
