---
title: M4.2 Implementation Review
status: COMPLETE_USER_ACCEPTED
version: v1.6
date: 2026-08-24
decision: D-078, D-085, D-086, D-090, D-091, D-095
---

# M4.2 Implementation Review

## 1. Delivered

- `WB-06`：教师在当前群或学生私聊的 WorkBuddy 中，从学生提供的作业/题号与卡点生成格式中立 `GuidedExplanationArtifact`；固定 Demo 通过受治理的课程/作业 Context 定位完整数值题。
- 示例题已升级为具有完整数值条件的二维碰撞应用题：以向右为正，按动量守恒列式、代入计算并得到 `4.0 m/s，向右`，同时回代校验碰撞前后总动量。
- 教师审核面首先展示可编辑的最终发送话术及“查看分步讲解”文字链接；发送前可打开同一 Viewer 预览。标题、导读、学生题目、四个步骤的标题/正文/检查点和教师版完整答案继续可按需展开修订；“应用修改”原子地产生新 Artifact 版本，存在未应用修改时不能发送旧版本。只有“确认保存并发送”成功后，Artifact 才进入“我的文件”，同版本 ContentReference 进入当前目标消息。
- 消息接收端以普通教师消息展示最终话术和文字链接；链接打开四步讲解、检查点和完整答案 Viewer，不执行任意 HTML，不暴露隐藏推理链。
- `PA-01/DA-01` 共享 `GuidedTutoringModule` 与 Agent Definition：公开群投影短提示与自检问题，私聊投影三步辅导与追问；均不直接给最终答案。
- 讲题生成/分发 Adapter 独立于作业提醒 Adapter；生成失败、权限拒绝、可恢复失败和证据不匹配均有显式状态与允许命令。Receipt 引用 Run、Context、Artifact、Action、Approval；Evaluation 只在证据匹配时产生。
- 每次讲题生成建立唯一 RunRef、Artifact、Action 和幂等链；同一线程连续讲不同题不会复用旧 Receipt，相同幂等键的请求指纹冲突会 fail closed。
- `ArtifactLibraryModule` 提供 `add/list/get`；只有成功 Receipt 后才入库。消息 ContentReference 携带完整执行证据，学生切换到目标线程后可打开同一审批版本。
- 群聊与当前学生 1v1 使用同一 `GuidedExplanationModule` 和审核 Surface，仅由目标策略决定分发位置；两条路径均展示教师应用后的同一版本。
- `M4.2-11` 已补齐教师/学生共用的 Agent 私聊体验：授权优先目录支持全部/班级 Agent/联系人范围与能力关键词搜索；列表、Header、消息和响应状态持续投影稳定 Agent 名称和专属图标。
- `M4.2-12` 按 D-085 收敛了 IM 视觉噪音：不在 Agent 条目重复显示 `[模拟] AI Agent` / `[模拟] Agent`，也不在文件或消息显示 `H5`；WorkBuddy 场景级 `[模拟] 数据`、Domain 真值、Receipt、Evaluation 和审计证据继续保留。
- 每个角色恢复自己与 Agent 的隔离 Thread；更早的人类/Agent 消息可向上加载，切换会话后保留历史与滚动位置，阅读历史时新回复不强制贴底并提供“1 条新消息”锚点。
- 模拟 Adapter 提供可感知但确定性的回复节奏，显式经历“正在理解”与“正在整理”再完成；可恢复失败允许重试，授权撤销则进入不可重试的 `authorization_failure`。搜索、首次发送和重试均由同一权威授权校验失败关闭。
- `M4.2-13/14` 已统一最终消息的纯文本语义、链接和自然段呈现，并由共享编辑器承接长内容编辑、焦点与独立滚动，避免各任务重复实现发送前审核面。
- `M4.2-15` 已将 WorkBuddy 任务入口的头像、问候、动态生成节奏、完成态 Composer、产出入口和沉浸退出引导对齐到同一 Shell 规范。
- `M4.2-16` 已纳入测验活动草稿扩展场景：同一主 Agent 连续生成完整试卷，教师必须先打开并确认当前 Artifact，之后才进入活动参数交互；最终 Approval 只创建教师可见草稿，课程详情负责二次编辑和独立发布。

## 2. Review 修复

多轮 Standards/Spec Review 发现并已修复：草稿提前入库、仅成功 Receipt、失败丢证据、文件库任意分享绕过当前目标、Prompt 绕过 NeedsInput、Dialog 焦点协议缺失、E2E/视觉覆盖不足、讲题能力塞入 Homework Adapter、生成 Seam 缺失、学生问题角色识别不可靠、消息引用缺少执行证据、同线程复用旧 Run/Receipt、权限状态没有可执行退出路径、审核 UI 重复 Domain 规范化、旧版本 Approval 可能越过当前版本执行，以及 Agent 私聊新消息锚点、失败身份/真值、Picker/发送/重试权威授权链不一致。M4.2-12 自检进一步确认最终话术与 Action body/批准版本一致，发送前/后 Viewer 共用无障碍 Dialog，删除的仅是重复 UI 标签而非真值或证据。

终局结果：Spec Review `PASS`；Standards Review `PASS`，无剩余可行动 hard finding。`WorkBuddyImProvider` 的多任务分支仍记录为后续可优化的 Repeated Switches / Divergent Change judgement，不阻断 M4.2 封存。

## 3. Verification

- `npm run check`：84 个测试文件、555 tests 全通过；TypeScript 与 ESLint 无错误或 warning；
- `npm run build`：TypeScript 与 Vite production build 通过；
- M4.2-12 相关 E2E/a11y：最终话术编辑、发送前预览、批准后消息链接、学生接收端与文件库共 1 条通过；PA-01、DA-01 范围回归通过；
- Agent 私聊关键 E2E/a11y：教师/学生授权目录、能力搜索、隔离历史、向上分页、两阶段响应和新消息锚点共 1 条通过；
- 文件库回归 E2E：1 条通过；
- 视觉：4 条讲题基线，以及教师/学生 Agent 私聊、处理中状态和公开回复 4 条范围基线通过；人工复核未见溢出、遮挡、不可达操作或重复格式/模拟标签；
- 测验扩展：Domain、Adapter、Session、Integration、Chromium E2E/a11y 与 6 个关键视觉状态通过；覆盖生成前空 Inspector、连续生成、试卷审阅 Gate、参数交互、Approval、草稿 Receipt、刷新恢复及课程详情编辑/发布；
- `git diff --check`：通过。

构建仍有既有单 chunk 超过 500 kB 的 Vite warning；不影响本期行为，代码分包属于后续工程优化，不在 M4.2 Write Set。

## 4. Truth Boundary

全部讲题内容、业务数据、Agent 回复、入库、消息分发、Receipt 与 Evaluation 均为固定、脱敏、可重置的 `[模拟]`。界面在 WorkBuddy Surface 保留场景级 `[模拟] 数据`，真值同时存在 Domain 和证据链；不在每个 IM 条目重复显示。未接真实模型、真实 ClassIn IM/文件 API 或生产内容托管，不代表教学效果或生产就绪。

## 5. User Acceptance

用户于 2026-08-24 确认 M4.2 全部页面效果与新增扩展场景验收完成，并明确授权执行 `git commit` 与 `git push` 进行版本封存。M4.2 判定为 `COMPLETE_USER_ACCEPTED`。
