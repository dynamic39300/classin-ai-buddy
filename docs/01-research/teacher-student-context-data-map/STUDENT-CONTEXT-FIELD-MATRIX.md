# 学生视角上下文字段矩阵

> 返回：[全局数据地图](./README.md)  
> 视角定义：以学生 `uid` 为主体，在当前机构、班级 / 课节、被分配活动和本人授权资源范围内，获取学生自己的学习、沟通和 AI 使用事实。

## 使用说明

- “学生视角”不意味着可读取同班其他学生的详细学习数据。
- 教师 / 班主任信息只能在学生当前有效班级和课节范围内提供。
- A/B/C/D/E 分级见[全局数据地图](./README.md#2-可用性分级)。

## 学生上下文主表

| 层级 | 业务对象与粒度 | 建议语义字段 | 关键底层字段 / 关联键 | 主要事实来源 | 等级 | 默认进入 AI | 说明 |
|---|---|---|---|---|---|---|---|
| 身份 | 全局学生用户 / `uid` | `student.uid`、`account_status`、`registered_at`、`locale` | `uid`、`accountstatus`、`registetime`、`area_code`、`country` | `dim_user_f_view` | A | 最小集合 | 手机号、账号等直接标识默认不进入 |
| 身份 | 用户教育身份配置 / `uid` | `school_stage_id`、`grade_id`、`identity_id`、`subject_id` | `uid`、`school_stage_id`、`grade_id`、`identity_id`、`school_subject_id` | `ods_ms_eo_osuc_eeo_user_identity_f_view` | A | 按任务 | 可能是配置或偏好，不等于班级内真实年级 / 学科事实 |
| 机构 | 学生在机构中的成员关系 / `stud_id` | `student_membership_id`、`school_uid`、`student_number`、`display_name`、`membership_state`、`joined_at`、`expires_at` | `stud_id`、`student_uid`、`school_uid`、`stud_num / stuno`、`name`、`isdel`、`addtime`、`endtime` | `ods_ms_eo_os_eeo_school_students_df_view` | A | 是 | `stud_id` 只在机构范围内有意义 |
| 机构 | 学生机构级资源状态 | `public_resource_status`、`cloud_folder_refs`、`join_type` | `public_resource_status`、cloud folder、`join_type` | 同上 | A/E | 按任务 | 只提供有权使用的资源引用 |
| 机构 | 学生机构级累计字段 | `reported_course_count`、`reported_attendance`、`reported_lesson_totals` | `course_count`、`attendence`、`total_class`、`on_class`、`off_class` | 同上 | D | 否 | 样例出现“有课节参与但累计为 0”，未审计前不可作为主事实 |
| 机构 | 当前机构基础与服务状态 | `school_name`、`school_type`、`region`、`service_version`、`service_status` | `school_uid` 及类别、区域、服务 / 认证字段 | `ods_ms_eo_os_eeo_school_auth_df_view` | A/E | 最小集合 | 只取影响学生当前能力的必要字段；敏感机构字段禁止 |
| 班级 | 学生所在班级 / `course_id` | `course_group_id`、`name`、`status`、`category`、`start_at`、`end_at`、`lesson_count` | `course_id`、`school_uid`、`name`、`status`、`category`、开始 / 结束、`class_count` | `dim_course_info_f_view` | A/B | 当前范围 | 班级成员关系当前需从课节 / LMS / IM 等多源推导 |
| 班级 | 班级负责人和学生可见权限 | `head_teacher_ref`、`allow_add_friend`、`allow_temp_classroom`、`student_can_modify_nickname` | `head_teacher_stid`、`add_friend`、`temp_classroom`、`student_modify_nickname` | 同上 | A | 按任务 | `head_teacher_stid` 需再关联机构教师成员获取展示信息 |
| 班级 | 学生—班级成员关系 | `course_membership_state`、`course_role`、`relationship_valid_at` | `student_uid / stud_id + course_id`，结合课节学生、活动学生、IM `classidentity` | 多源关联 | B/C | 是 | 当前缺统一 canonical course-member 视图，必须标推导 |
| 班级 | 相关教师集合 | `authorized_teachers[]`、`teacher_roles[]` | 同一 `school_uid + course_id` 下的负责人、课节主讲 / 助教、IM 教学身份 | 多源关联 | B/C | 当前范围 | 只返回当前有效教学关系，不暴露教师私有数据 |
| 课节 | 学生可见课节 / `class_id` | `lesson_id`、`course_group_id`、`name`、`status`、`type`、`subject_id`、`starts_at`、`ends_at` | `class_id`、`course_id`、`school_uid`、`name`、`status`、`type`、`subject_id`、时间 | `dim_course_class_f_view` | A | 当前 / 临近课节 | `class_id` 语义为课节 |
| 课节 | 课节教师与课堂设置 | `main_teacher_ref`、`assistant_teacher_ref`、`live_enabled`、`record_enabled`、`teaching_mode` | `main_st_id`、`ass_st_id`、直播 / 录制 / 模式 / 安全字段 | 同上 | A | 按任务 | 只显示学生可见能力，不向学生暴露管理配置 |
| 课堂 | 学生课节成员关系 | `lesson_membership_state` | `class_id`、`course_id`、`stud_id`、`student_uid`、`school_uid`、`isdel`、`class_etime` | `ods_ms_eo_os_eeo_class_and_student_di_view` / 当前快照视图 | A | 是 | 可作为学生能否进入某课节的重要事实之一 |
| 课堂 | 本人课节参与 / `class_id + uid` | `lesson_identity`、`online_seconds`、`late`、`early_leave`、`online`、`platform`、`presence_segments` | `member_uid`、`identity`、`stayin_time`、`late`、`early`、`online`、`platform`、`time_list`、`dt` | `ods_ms_eo_os_eeo_class_member_time_di_view` | A | 当前任务 | `identity=1` 学生、`2` 旁听；在线时长不等于学习效果 |
| 课堂 | 本人课堂事件 / 动作 | `classroom_actions[]` | `action`、`class_id`、`course_id`、`school_uid`、`source_id`、`uid`、`iden`、`details`、`dt` | `dwd_class_student_action_v2_di_view` | A/E | 摘要 | 只取本人且与当前任务相关的动作 |
| 评价 | 教师对本人的课节评价 | `teacher_ref`、`star_level`、`comment_ref`、`commented_at` | `stud_id`、`st_id`、`course_id`、`class_id`、`star_level`、`comment`、`comment_timestamp` | `ods_ms_eo_os_eeo_teacher_comment_di_view` | A/E | 按需 | 评语正文是敏感学习证据；需要解释来源和时间 |
| LMS | 分配给本人的统一活动关系 / `activity_id + student_uid` | `activity_id`、`state`、`is_done`、`is_scored`、`grade_method`、`rate`、`created_at`、`updated_at` | `activity_id`、`student_uid`、`course_id`、`school_uid`、`status` JSON、`is_score`、`grade_method`、`rate`、`state`、`is_done` | `ods_kafka_eo_oslms_lms_activity_student_f_view` | A | 是 | 学生上下文中最关键的活动入口；需再连活动主数据 |
| LMS | 活动主数据 / `activity_id` | `type`、`title`、`publish_state`、`process_state`、`starts_at`、`ends_at`、`max_score`、`passing_score` | `activity_id`、`course_id`、`teacher_id`、`biz_id`、`biz_type`、`name`、发布 / 进行 / 时间 / 评分字段 | LMS 活动日快照 / 当前快照视图 | A | 是 | 先通过学生关系筛选，再取活动主数据，避免越权 |
| LMS | 本人作业提交 / 每生每作业 | `homework_id`、`submission_state`、`score`、`submitted_at`、`reviewed_at`、`needs_revision`、`revision_count`、`correct_count`、`wrong_count` | `stu_homework_id`、`homework_id`、`student_uid`、`course_id`、`school_uid`、状态 / 分数 / 提交 / 批改 / 订正 / 对错 / 时间 | 作业学生 7 日全量视图 | A/E | 状态默认，正文按需 | 当前视图保留窗口有限，不应直接形成长期轨迹 |
| LMS | 本人作业正文与附件 | `submission_content_ref`、`attachment_refs`、`teacher_edit_ref`、`teacher_comment_ref` | 学生提交内容、媒体、评论、教师修改、答案等字段 | 同上 | E | 否，按需 | 只在答疑、订正、批改解释等明确任务中获取 |
| LMS | 本人学习资料查看 | `material_id`、`checked_at`、`check_total`、`score_percent` | `materials_id`、`student_uid`、`course_id`、`school_uid`、`check_time`、`check_total`、`score_percent` | 学习资料学生视图 | A | 按任务 | 查看次数不等同于理解程度 |
| LMS | 本人录播观看 | `record_id`、`file_id`、`total_play_seconds`、`valid_play_seconds`、`max_position`、`play_segments`、`updated_at` | `record_id`、`student_uid`、`file_id`、总播放 / 有效秒数、位置、分段、时间 | 录播学生视频进度视图 | A | 摘要 / 按需 | 进度可用于继续学习，不直接输出能力结论 |
| LMS / AI | 本人 AI 批阅状态 | `ai_review_status`、`ai_review_count`、`ai_grade`、`ai_rate`、`reviewed_at`、`failure_state` | `activity_id`、`student_uid`、AI 批阅状态 / 次数 / 内容 / 失败 / 时间 / rate | LMS 活动学生 AI 视图 | A/E | 状态 / 摘要 | AI 批阅内容不是最终教师结论，需保留真值标签 |
| LMS / AI | 本人 AI 阅读 / 口语结果 | `excellent`、`rate`、`teacher_comment_ref`、`teacher_review_status`、`submitted_at`、`reviewed_at`、`revision_state` | `reading_id`、`student_uid`、`excellent`、放大存储的 `rate`、评论 / 文件 / review uid、状态 / 时间、AI grade/rate | AI 阅读学生视图等 | A/E | 摘要 / 按需 | 先统一量纲；题目级细节仅在学习任务中取用 |
| 待办 | 学生统一待办 / 每个待办项 | `todo_id`、`type`、`title`、`due_at`、`state`、`related_object_ref` | 知识定义存在，当前查询角色未暴露标准视图 | 待办中心 | C | 否 | 当前可由本人活动与课节状态按需推导，但不能当作统一待办事实 |
| IM | 学生的会话 / 群成员身份 | `conversation_id`、`conversation_type`、`member_status`、`im_admin_role`、`teaching_role`、`can_speak` | `clusterid`、`type`、`uid`、`status`、`nickname`、`identity`、`classidentity`、`allow_speak` | `ods_ms_eo_im_cluster_member_f_view` | A/E | 当前会话 | 教学角色与 IM 管理身份是两套语义 |
| IM | 会话关系态 | `read_cursor`、`at_message_id`、`pinned`、`last_message` | `uid`、`clusterid`、`readcursor`、`atmsgid`、`top`、最后消息 / 可显示消息数 | `ods_ob_eo_im_user_cluster_relation_f_view` | D | 否 | 当前没有有效行，不能据此生成提醒或未读判断 |
| IM | 本人可见消息信封 | `message_key`、`conversation_id`、`sender_uid`、`target_uids`、`message_type`、`reply_to`、`sent_at` | `clusterid`、`msgbucketid`、`msgid`、`clustertype`、`msgcmd`、`sourceuid`、`targetuids`、`replymsgid`、`timeformat`、`dt` | `ods_ms_eo_chat_msg_user_chat_msg_di_view` | A/E | 信封按需 | 班级群 `clusterid` 可对齐 `course_id`；好友会话不可强行对齐 |
| IM | 本人可见消息正文 / 附件 | `message_content_ref`、`attachment_refs[]` | `msgdata` 及消息类型解析结果 | 同上 | E | 否，按需 | 必须限制本人可见会话与必要时间窗 |
| 空间 | 本人可访问课程文件 | `resource_id`、`course_group_id`、`owner_ref`、`folder_id`、`name`、`size`、`extension`、`created_at` | `course_id`、`user_id`、`file_id`、`folder_id`、`file_name`、`size`、`extension`、删除 / 时间 / 类型 | 课程文件视图 | A/E | 引用 | 先返回元数据和引用，正文经权限工具按需读取 |
| 空间 | 个人空间与被分享资源 | `space_type`、`resource_ref`、`share_scope`、`permission` | 用户、文件 / 文件夹、共享、resource-user-role 和权限字段 | 空间相关视图 | A/E | 引用 | 学生不能因“文件存在”而越权访问 |
| AI | 学生 AI 会话 / 每个 session | `agent_id`、`scene`、`scene_id`、`session_id`、`role`、`title`、`message_count`、`feedback_summary`、`created_at` | `agent_id`、`scene`、`scene_id`、`session_id`、`uid`、`role=2`、标题 / 数量 / 反馈 / 时间 / app | `dwd_ai_session_df_view` | A/E | 摘要 | 可用于承接任务，不自动解释为稳定学习偏好 |
| AI | 学生 AI 消息 / 每轮问答 | `message_id`、`question_ref`、`answer_ref`、`useful_feedback`、`created_at` | `uid`、`as_id`、`message_id`、`question`、`answer`、`is_useful`、时间 | `dwd_ai_session_message_df_view` | A/E | 否，按需 | 历史问答正文只在相关任务和明确授权下取用 |
| 治理 | 每条学生上下文事实 | `source_entity`、`source_key`、`observed_at`、`freshness`、`derived`、`quality`、`authorization_scope`、`truth_label` | 原始键、`dt`、创建 / 更新时间、删除状态、推导规则 | Context Adapter 统一补充 | B | 必须 | 学习事实、教师评价与 AI 推断必须分开标注 |

## 学生视角的默认数据包

一个学生从班级群或单聊进入 AI 时，默认只需：

1. 学生 `uid` 与当前机构成员 `stud_id`；
2. 当前 `school_uid + course_id` 和有效班级成员关系；
3. 当前会话 `clusterid` 与学生可见 / 可发言状态；
4. 临近课节、已分配活动、开始 / 截止时间和本人状态；
5. 数据来源、观察时间和授权范围。

只有当学生提出“这道作业怎么订正”“上次课我漏了什么”“继续看录播”等具体任务时，才扩展到本人作业正文、课堂证据、教师评语、录播进度或有限消息正文。默认不读取其他学生的学习明细。
