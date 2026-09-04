# 教师视角上下文字段矩阵

> 返回：[全局数据地图](./README.md)  
> 视角定义：以教师 `uid` 为主体，在明确 `school_uid`、授权班级 / 课节和任务时间窗内，获取教师自己的事实及其有权访问的班级、学生、活动、沟通与资源事实。

## 使用说明

- “建议语义字段”是未来上下文接口的稳定命名，不表示生产接口已经存在。
- “底层字段”保留当前可关联字段，便于追溯。
- A/B/C/D/E 分级见[全局数据地图](./README.md#2-可用性分级)。
- 学生明细对教师可见性必须由机构、班级、课节和资源权限共同约束。

## 教师上下文主表

| 层级 | 业务对象与粒度 | 建议语义字段 | 关键底层字段 / 关联键 | 主要事实来源 | 等级 | 默认进入 AI | 说明 |
|---|---|---|---|---|---|---|---|
| 身份 | 全局教师用户 / `uid` | `teacher.uid`、`account_status`、`registered_at`、`locale` | `uid`、`accountstatus`、`registetime`、`area_code`、`country` | `dim_user_f_view` | A | 最小集合 | 昵称、手机号等个人字段不默认进入 |
| 身份 | 用户教育身份配置 / `uid` | `school_stage_id`、`grade_id`、`identity_id`、`subject_id` | `uid`、`school_stage_id`、`grade_id`、`identity_id`、`school_subject_id` | `ods_ms_eo_osuc_eeo_user_identity_f_view` | A | 按任务 | 是用户配置，不等于其在某班级的实际教学角色 |
| 机构 | 教师在机构中的成员关系 / `st_id` | `teacher_membership_id`、`school_uid`、`display_name`、`employee_no`、`position`、`membership_state`、`joined_at` | `st_id`、`teacher_uid`、`school_uid`、`name`、`empno`、`position`、`isdel`、`addtime` | `ods_ms_eo_os_eeo_school_teacher_df_view` | A | 是 | `st_id` 仅在机构范围内有意义 |
| 机构 | 教师能力开关 / `st_id` | `can_create_course`、`public_resource_status`、`join_type` | `client_create_course`、`public_resource_status`、`join_type` | 同上 | A | 按任务 | 仅能描述当前开关，不能替代完整授权校验 |
| 机构 | 机构基础与服务状态 / `school_uid` | `school_name`、`school_type`、`region`、`service_version`、`service_status`、`service_expires_at` | `school_uid` 及机构类别、区域、认证 / 服务 / 试用字段 | `ods_ms_eo_os_eeo_school_auth_df_view` | A/E | 最小集合 | 合同、法务、银行、密码、Secret 等字段禁止进入 AI |
| 班级 | 班级 / 班课群 / `course_id` | `course_group_id`、`name`、`status`、`category`、`start_at`、`end_at`、`student_count`、`lesson_count` | `course_id`、`school_uid`、`name`、`status`、`category`、`starttime`、`endtime`、`student_num`、`class_count` | `dim_course_info_f_view` | A | 当前范围 | 语义层应命名为 `course_group`，避免误解为单门学科课程 |
| 班级 | 班级负责人及 IM / 课堂权限 | `head_teacher_membership_id`、`allow_join`、`allow_add_friend`、`allow_temp_classroom`、`teacher_can_add_lesson` | `head_teacher_stid`、`allow_initiative_join`、`add_friend`、`temp_classroom`、`teacher_add_class` | 同上 | A | 按任务 | 负责人字段可直取；完整教师成员关系仍缺统一标准视图 |
| 班级 | 教师—班级角色 | `course_roles[]`、`relationship_valid_at` | `st_id / uid + course_id`，结合负责人、课节教师和 IM `classidentity` | 多源关联 | B/C | 是 | 当前无已验证的 canonical course-member 视图；必须标推导 |
| 班级 | 班级中的授权学生集合 | `authorized_students[]` | 共享 `school_uid + course_id`，结合课节学生、LMS 学生、IM 教学成员 | 多源关联 | B/C | 否，按需 | 只能服务当前任务；不能固化为跨时态永久师生关系 |
| 课节 | 课节主数据 / `class_id` | `lesson_id`、`course_group_id`、`name`、`status`、`type`、`subject_id`、`starts_at`、`ends_at` | `class_id`、`course_id`、`school_uid`、`name`、`status`、`type`、`subject_id`、开始 / 结束字段 | `dim_course_class_f_view` | A | 当前课节 | `class_id` 的真实语义是课节 |
| 课节 | 课节教师配置 / `class_id` | `main_teacher_membership_id`、`assistant_teacher_membership_id`、`live_enabled`、`record_enabled`、`teaching_mode` | `main_st_id`、`ass_st_id`、直播 / 录制 / 模式 / 安全字段 | 同上 | A | 按任务 | 用于还原教师在这一次课节中的角色和课堂能力 |
| 课堂 | 教师课节参与 / `class_id + uid` | `lesson_identity`、`online_seconds`、`late`、`early_leave`、`platform`、`presence_segments` | `class_id`、`course_id`、`school_uid`、`member_uid`、`identity`、`stayin_time`、`late`、`early`、`online`、`platform`、`time_list`、`dt` | `ods_ms_eo_os_eeo_class_member_time_di_view` | A | 当前任务 | `identity=3` 教师、`4` 助教；时间字段需保留观察日期 |
| 课堂 | 学生课节名单 / `class_id + student_uid` | `lesson_students[]`、`membership_state` | `class_id`、`course_id`、`stud_id`、`student_uid`、`school_uid`、`isdel`、`class_etime` | `ods_ms_eo_os_eeo_class_and_student_di_view` / 当前快照视图 | A | 否，按需 | 教师只能取授权课节范围；历史分析要考虑快照时态 |
| 课堂 | 课堂事件 / 动作 | `classroom_actions[]` | `action`、`class_id`、`course_id`、`school_uid`、`source_id`、`uid`、`iden`、`details`、`dt` | `dwd_class_student_action_v2_di_view` | A/E | 摘要 | `details` 可能含细节，默认先做聚合 / 摘要 |
| 课堂 | 课节综合事实 | `attendance_summary`、`interaction_summary`、`recording_summary` | 教师、课程、课节、出勤、迟到、直播、录播等字段 | `dwd_course_class_detail_info_di_view` | A | 摘要 | 宽表适合检索，但关键结论仍应能回溯到明细 |
| 评价 | 教师对学生的课节评语 | `teacher_comment`、`star_level`、`commented_at` | `stud_id`、`st_id`、`course_id`、`class_id`、`star_level`、`comment`、`comment_timestamp` | `ods_ms_eo_os_eeo_teacher_comment_di_view` | A/E | 按需 | 正文属于敏感教学证据，不默认跨任务携带 |
| LMS | 统一活动主数据 / `activity_id` | `activity_id`、`type`、`title`、`status`、`publish_state`、`process_state`、`starts_at`、`ends_at`、`max_score`、`passing_score`、`student_total` | `activity_id`、`school_id`、`course_id`、`teacher_id`、`unit_id`、`biz_id`、`biz_type`、`name`、`publish_flag`、`process_flag`、开始 / 截止 / 评分字段 | `ods_ms_eo_oslms_lms_activity_df_view` / 当前快照视图 | A | 当前任务 | `biz_type + biz_id` 决定后续查哪类业务对象 |
| LMS | 活动创建与负责关系 | `creator_uid`、`teacher_uid`、`created_at`、`updated_at`、`deleted` | `creator_uid`、`teacher_id`、`create_time`、`update_time`、`delete_flag` | 同上 | A | 是 | 需区分创建者与教学负责人 |
| LMS | 作业主对象 | `homework_id`、`title`、`description_ref`、`starts_at`、`ends_at`、`late_allowed`、`score_rule`、`submission_summary` | `homework_id`、`course_id`、`teacher_uid`、`school_uid`、标题 / 描述 / 媒体 / 题目、状态、时间、分数、人数统计 | `ods_ms_eo_oshw_eeo_course_homework_7df_view` | A/E | 元数据 | 当前可见为 7 日全量快照；正文 / 媒体按需 |
| LMS | 学生作业状态 / 每生每作业 | `submission_state`、`score`、`submitted_at`、`reviewed_at`、`needs_revision`、`revision_count`、`correct_count`、`wrong_count` | `stu_homework_id`、`homework_id`、`student_uid`、`status`、`score`、提交 / 批改 / 订正 / 对错 / 时间字段 | 作业学生 7 日全量视图 | A/E | 按需 | 提交正文、附件、教师修改内容默认不取 |
| LMS | 学习资料主对象与查看情况 | `material_id`、`title`、`description_ref`、`starts_at`、`ends_at`、`student_total`、`checked_total`；每生 `checked_at`、`check_total` | 资料 ID、教师 / 班级 / 机构、标题 / 描述 / 媒体、时间、统计；学生 `student_uid`、`check_time`、`check_total`、`score_percent` | 学习资料主 / 学生视图 | A/E | 元数据 / 按需 | 资料正文、附件通过授权资源引用取用 |
| LMS | 录播学习主对象与观看证据 | `record_id`、`title`、`duration`、`student_total`、`checked_total`；每生 `valid_play_seconds`、`max_position`、`play_segments` | 录播 ID、课程 / 教师 / 机构、视频、开始 / 截止 / 时长；学生、文件、播放秒数 / 位置 / 分段 | 录播主视图、学生视频进度视图 | A | 摘要 / 按需 | 播放记录是学习证据，不直接等同于掌握 |
| LMS / AI | AI 批阅 / AI 阅读结果 | `ai_review_status`、`ai_review_count`、`ai_grade`、`ai_rate`、`teacher_review_status`、`reviewed_at` | `activity_id`、`student_uid`、`ai_review_status`、`ai_review_content`、失败字段、`rate`；阅读 `excellent`、`rate`、评论 / 文件 / 状态 / 时间 | LMS AI 批阅、AI 阅读学生视图 | A/E | 摘要 / 按需 | 比率存在缩放差异；AI 输出不是无条件真值 |
| 待办 | 教师统一待办 / 每个待办项 | `todo_id`、`type`、`title`、`due_at`、`state`、`related_object_ref` | 知识定义存在，当前查询角色未暴露标准视图 | 待办中心 | C | 否 | 当前只能按具体 LMS / 课节状态推导，不能宣称已读取统一待办 |
| IM | 教师的会话 / 群成员身份 | `conversation_id`、`conversation_type`、`member_status`、`im_admin_role`、`teaching_role`、`can_speak` | `clusterid`、`type`、`uid`、`status`、`nickname`、`identity`、`classidentity`、`allow_speak`、设置字段 | `ods_ms_eo_im_cluster_member_f_view` | A/E | 当前会话 | IM 管理身份与教学身份必须分开表达 |
| IM | 会话关系态 | `read_cursor`、`at_message_id`、`pinned`、`last_message` | `uid`、`clusterid`、`readcursor`、`atmsgid`、`top`、最后消息 / 可显示消息数 | `ods_ob_eo_im_user_cluster_relation_f_view` | D | 否 | 当前结构可见但没有有效行，不能承诺能力 |
| IM | 消息信封 / 每条消息 | `message_key`、`conversation_id`、`sender_uid`、`target_uids`、`message_type`、`reply_to`、`sent_at` | `clusterid`、`msgbucketid`、`msgid`、`clustertype`、`msgcmd`、`sourceuid`、`targetuids`、`replymsgid`、`timeformat`、`dt` | `ods_ms_eo_chat_msg_user_chat_msg_di_view` | A/E | 信封可按需 | `timetag` 只作逻辑排序；正文解析依赖 `msgcmd` |
| IM | 消息正文 / 附件 | `message_content_ref`、`attachment_refs[]` | `msgdata` 及消息类型解析结果 | 同上 | E | 否，按需 | 必须限制会话、时间窗、任务和教师权限 |
| 空间 | 课程文件 / 每个文件 | `resource_id`、`course_group_id`、`owner_uid`、`folder_id`、`name`、`size`、`extension`、`created_at` | `id`、`sid`、`course_id`、`user_id`、`file_id`、`folder_id`、`file_name`、`user_name`、`size`、`extension`、删除 / 时间 / 类型 | 课程文件视图 | A/E | 引用 | 文件元数据可检索，正文须通过授权工具按需读取 |
| 空间 | 个人 / 机构空间与共享资源 | `space_type`、`resource_ref`、`share_scope`、`permission` | 用户、机构、文件 / 文件夹、共享、resource-user-role 和权限字段 | 空间相关视图 | A/E | 引用 | 权限事实必须随资源一并进入上下文 |
| AI | 教师 AI 会话 / 每个 session | `agent_id`、`scene`、`scene_id`、`session_id`、`role`、`title`、`message_count`、`feedback_summary`、`created_at` | `id`、`agent_id`、`scene`、`scene_id`、`session_id`、`uid`、`role=1`、标题 / 数量 / 反馈 / 时间 / app | `dwd_ai_session_df_view` | A/E | 摘要 | 用于连续性和偏好证据，不应自动形成长期人格画像 |
| AI | 教师 AI 消息 / 每轮问答 | `message_id`、`question_ref`、`answer_ref`、`useful_feedback`、`created_at` | `id`、`uid`、`as_id`、`message_id`、`question`、`answer`、`is_useful`、时间 | `dwd_ai_session_message_df_view` | A/E | 否，按需 | 正文只在相关任务和授权下提取 |
| 治理 | 每条上下文事实 | `source_entity`、`source_key`、`observed_at`、`freshness`、`derived`、`quality`、`authorization_scope`、`truth_label` | 原始键、`dt`、创建 / 更新时间、删除状态、推导规则 | Context Adapter 统一补充 | B | 必须 | 没有治理信息的字段不应作为可执行 Agent 的输入 |

## 教师视角的默认数据包

一个普通教师从班级群进入 AI 时，默认只需：

1. 教师 `uid` 与当前机构成员 `st_id`；
2. 当前 `school_uid + course_id` 与教师在该班的有效角色；
3. 当前会话 `clusterid`、会话类型和教师可发言 / 可管理状态；
4. 当前时间窗内的课节、活动状态与截止时间；
5. 数据来源、观察时间和授权范围。

只有当教师提出“谁还没交”“帮我总结这位学生的问题”等具体任务时，才扩展到学生名单、提交结果、课堂证据和有限消息正文。
