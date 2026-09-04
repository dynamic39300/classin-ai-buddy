# 研究索引

本目录保存外部调研、业务研究和证据边界。`source-notes/` 中的文档是研究底稿，作为架构、产品和工程决策的证据输入，不直接升级为生产业务规则。

## 首读入口

- [研究与分析资产回溯及阅读指南](./RESEARCH-RETROSPECTIVE-AND-READING-GUIDE.md)：按项目阶段、主题和事实层级梳理全部研究、阶段原稿、当前吸收结果、关键转向、未闭合问题与推荐阅读路线。

## 当前阶段

- [ClassIn 教师 / 学生全局上下文数据地图](./teacher-student-context-data-map/README.md)：基于数仓知识、当前可见元数据与只读脱敏小样本，整理教师和学生视角的结构化字段、跨域 ID 链路、当前可得性、数据质量缺口和面向 AI 的最小上下文边界。
- [ClassIn IM 功能全景与竞品研究](./im-feature-landscape/README.md)：前三阶段已形成 Demo 清单、线上 ClassIn 全集和内部差异基线；Slack `4.2` 的 241 项基础 IM/AI-Agent 深度审计已通过用户 Review Gate，`4.2B` 已完成 241 项 Slack × ClassIn Online × Demo 互斥映射、12 个差距主题、10 项反向优势和 24 项未排序候选，当前待用户审阅。Teams `4.3` 与 Discord `4.4` 为 `PAUSED_BY_USER`。
- [ClassIn IM 真实沟通事实研究](./im-real-communication-fact-study/README.md)：2026-08-29 启动的正式研究阶段；先形成方法、数据治理、抽样和标注共识，再执行新一轮事实分析。
- [ClassIn IM 会话结构与沟通用途研究](./im-conversation-structure/README.md)：在 v2.3 Topic 事实之上，以数据库核验会话容器与完整成员职业构成，再用上下文语义区分教师管理协作和教师专业交流；结构、角色、用途与 Topic 正交保存。
- [净室重启与输入溯源](./im-real-communication-fact-study/CLEAN-ROOM-RESTART-AND-INPUT-PROVENANCE.md)：P1–P5 的唯一原始证据源为锁定版本 Excel；第一次分析的全部过程和结论材料隔离到 P6 之后。
- [Pilot 0 开放编码手册](./im-real-communication-fact-study/PILOT0-OPEN-CODING-HANDBOOK.md)：不提供教学主题菜单，由两名标注者在真实脱敏 Case 中独立产生开放码。
- [早期方法共识稿（部分已被替代）](./im-real-communication-fact-study/RESEARCH-METHOD-DATA-GOVERNANCE-SAMPLING-CONSENSUS-DRAFT.md)：仅保留方法讨论轨迹，预设分析维度不再执行。
- [原始工作簿数据字典与质量审计](./im-real-communication-fact-study/DATA-DICTIONARY-AND-QUALITY-AUDIT.md)：正式阶段 P1 只读全表扫描，明确固定100行、角色缺失、群型混杂、复合消息键和正文提取等限制。
- [IM 数据预研 Round 0 封存包](../07-history/stage-deliverables/im-data-prestudy-round-0-20260828/README.md)：保存旧分析、脚本、聚合工作簿、产品假设、阶段日志与校验指纹，仅用于追溯。

## 全库研究参考（本轮 P1–P5 禁止使用）

以下材料仍属于项目知识资产，但不是第二次标准化 IM 数据研究的输入。直到净室事实研究完成并进入 P6，执行者不得打开它们来定义标签、选择 Case 或解释结果。

主要输入：

- [研究底稿索引](./source-notes/README.md)
- [ClassIn IM 1.0 线上版本功能、入口与交互流程盘点](./source-notes/classin_im_1_0_online_current_state_audit_20260827.md)：后续 IM / TeacherIn / Agent 2.0 推演的十二维线上现状基线；区分已确认事实、综合判断和待验证项。
- [ClassIn IM 真实聊天场景发现与 AI 机会分析框架（Round 0 已封存）](./source-notes/classin_im_chat_scenario_discovery_framework_20260828.md)：历史探索方法，具有方案预设，不再作为正式研究协议。
- [ClassIn IM 2026 年 8 月单聊与班级群聊内容抽样分析（Round 0 已封存）](./source-notes/classin_im_chat_content_sample_analysis_20260828.md)：历史规则式聚合分析；主题标签、比例、响应代理和产品映射不再作为决策级事实。
- [IM 与沟通场景中的 AI Agent 交互模式行业研究](./source-notes/industry_research_im_ai_agent_interaction_patterns_20260828.md)：基于 Slack、Teams、Zoom、Discord、SchoolAI、Linear、Intercom 与 MuleRun 官方一手资料，提炼私密辅助、公开 Agent、促进 Session、人工接管和方案三候选。
- [Agent Harness 与教师 AI 产品研究](./source-notes/industry_research_agent_harness_patterns_20260816.md)
- [开源 Agent 与 Harness 架构全景研究](./source-notes/industry_research_open_source_agent_harness_landscape_20260816.md)
- [新版 AI 学情与 Agent Harness 内部案例系统研究](./source-notes/internal_case_ai_learning_agent_harness_20260817.md)
- [希沃 AI 赋能教育全场景方案产品设计链路研究](./source-notes/seewo_ai_education_full_scenario_solution_20260818.md)
- [希沃 AI 教学全业务链路能力覆盖图（HTML）](./ai-capability-opportunity/seewo-ai-full-business-chain.html)
- [NineClaw 本地架构与 Skill 资产设计研究](./source-notes/product_research_nineclaw_local_architecture_and_skills_20260819.md)
- [NineClaw 产品设计与交互研究](./source-notes/product_research_nineclaw_product_design_and_interaction_20260820.md)
- [NineClaw Skill 全量目录与交叉验证](./source-notes/product_research_nineclaw_skill_catalog_and_cross_validation_20260820.md)
- [ClassIn 数据、知识、上下文与工具清单](../07-history/stage-deliverables/04-ClassIn数据知识上下文与工具清单_20260816.md)
- [ClassIn 教与学 SOP 与 AI 能力输入](./source-notes/ClassIn教与学SOP及AI能力共识输入_20260815.md)

研究事实必须区分来源等级和未知项，不直接成为生产业务规则。
