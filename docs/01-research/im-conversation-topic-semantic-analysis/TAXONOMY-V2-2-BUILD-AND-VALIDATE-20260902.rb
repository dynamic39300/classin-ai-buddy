#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "json"
require "digest"

ROOT = File.expand_path(__dir__)
EVIDENCE_PATH = File.join(ROOT, "TAXONOMY-V2-1-AB-EFFECTIVE-TOPIC-EVIDENCE-INDEX-20260902.csv")
V21_FLAT_PATH = File.join(ROOT, "TAXONOMY-V2-1-CANDIDATE-FLAT-20260902.csv")
V2_FLAT_PATH = File.join(ROOT, "TAXONOMY-V2-CANDIDATE-FLAT-20260902.csv")
TREE_PATH = File.join(ROOT, "TAXONOMY-V2-2-FROZEN-TREE-20260902.md")
RULES_PATH = File.join(ROOT, "TAXONOMY-V2-2-RULE-CARDS-20260902.json")
ACTIVE_NODES_PATH = File.join(ROOT, "TAXONOMY-V2-2-ACTIVE-NODES-20260902.json")
MAPPING_PATH = File.join(ROOT, "TAXONOMY-V2-1-TO-V2-2-NODE-MAPPING-20260902.csv")
POOL_PATH = File.join(ROOT, "TAXONOMY-V2-2-CANDIDATE-POOL-20260902.csv")
REPORT_PATH = File.join(ROOT, "TAXONOMY-V2-2-VALIDATION-REPORT-20260902.md")

VERSION = "classin-im-semantic-taxonomy-v2.2-frozen-20260902"

def terminal(id, name, status, definition, include_text, exclude_text, adjacent_rules,
             legacy: [], evidence_ids: [], negative_ids: [])
  {
    id: id,
    name: name,
    node_type: "terminal",
    evidence_status: status,
    definition: definition,
    include: [include_text],
    exclude: [exclude_text],
    adjacent_rules: Array(adjacent_rules),
    legacy_labels: Array(legacy),
    evidence_ids: Array(evidence_ids),
    negative_ids: Array(negative_ids)
  }
end

def group(id, name, children)
  { id: id, name: name, node_type: "group", children: children }
end

def terminal_l2(id, name, status, definition, include_text, exclude_text, adjacent_rules,
                legacy: [], evidence_ids: [], negative_ids: [])
  terminal(id, name, status, definition, include_text, exclude_text, adjacent_rules,
           legacy: legacy, evidence_ids: evidence_ids, negative_ids: negative_ids)
end

domains = [
  {
    id: "L1-001", name: "学习与学业内容",
    definition: "学习者正在学习什么、需要完成什么、怎样计划，以及学习结果或表现如何。",
    exclude: "排除教师怎样教学、课程怎样排期运营以及数字工具本身的使用问题。",
    groups: [
      group("L2-001", "学科、技能与研究学习", [
        terminal("L3-001", "英语语言学习", "evidence_backed", "围绕英语词汇、语法、听说读写、翻译或表达能力展开的学习。", "英语知识讲解、语言练习、口语或写作学习。", "英语教材选择、英语课程排期、一般社交英文对话。", "按正在学习的知识或技能对象裁决；教材对象归 L3-073，任务交付归 L3-007。", legacy: "英语语言学习"),
        terminal("L3-002", "语文与中文学习", "provisional", "围绕汉字、语文课文、古文、中文阅读或写作能力展开的学习。", "中文语言知识、阅读理解、语文写作与表达训练。", "文学作品兴趣讨论、教材文件收发。", "以学习目的为门槛；自主谈论小说作品归 L3-042。", legacy: "语文与中文学习"),
        terminal("L3-003", "数学学习", "provisional", "围绕数学概念、计算、几何、函数或数学解题展开的学习。", "数学知识解释、习题思路和计算训练。", "数学课排期、一般考试管理、仅出现数字。", "具体数学知识归本节点；正式考试结果归 L3-072。", legacy: "数学学习"),
        terminal("L3-004", "自然科学与工程学习", "provisional", "围绕物理、化学、生物、自然科学或工程知识展开的学习。", "自然科学概念、实验原理或工程知识学习。", "通用设备故障、跨学科研究方法、纯数学。", "研究方法与数据分析能力归 L3-071；设备排障归 L3-029。"),
        terminal("L3-005", "编程与计算学习", "provisional", "以学习为目的的编程、算法、软件项目或信息学问题。", "代码理解、算法学习、编程项目调试和计算思维训练。", "一般应用操作、安装配置或软件运行故障。", "以是否在学习计算知识为界；工具故障归 L3-029，普通操作归 L3-030/L3-033。"),
        terminal("L3-006", "艺术技能学习", "provisional", "以能力训练为目的的乐器、绘画、表演等艺术学习。", "艺术技能练习、教师指导与训练反馈。", "艺术作品兴趣讨论、自主艺术创作。", "技能训练归本节点；作品消费归 L3-042/L3-043，实际创作归 L3-045。", legacy: "艺术技能学习"),
        terminal("L3-071", "研究方法与学术项目能力", "evidence_backed", "在教师指导、课程或学习语境中形成研究问题、方法、数据分析、学术写作与项目推进能力。", "研究选题、研究设计、数据构建、实证分析、论文修改及学习型投稿准备。", "脱离学习或指导关系的独立职业研究与正式发表活动；一般作业催交。", ["先看活动目的而非‘论文/代码’关键词：学习或辅导语境归本节点。", "若只讨论作业提交状态归 L3-007；独立专业研究证据充分后进入候选 L2-054。"], evidence_ids: %w[STI-09cd2311f389de17cc0e STI-7f5f1d7502a8e54c0b6c STI-13d3c331b05625b88a2e STI-2e3946fccc5af55e82cd STI-b9d5718f8e82ff9771ed])
      ]),
      group("L2-041", "学习任务、计划与评价", [
        terminal("L3-007", "作业布置、完成与订正", "evidence_backed", "围绕作业或练习的布置、完成、提交、批改、重做和订正。", "作业要求、提交进度、答案修订和错题订正。", "纯知识讲解、长期学习规划、正式考试官方成绩。", "以具体作业交付物为界；学习安排归 L3-009，正式测评结果归 L3-072。", legacy: "作业与练习"),
        terminal("L3-009", "学习计划、复习与备考", "evidence_backed", "围绕学习安排、复习策略、备考节奏或学习习惯形成计划。", "复习计划、备考安排、学习目标和习惯调整。", "课程日历排期、作业单次提交、正式考试结果。", "学习者的学习计划归本节点；课程时间绑定归 L2-025。", legacy: "学习计划与资源"),
        terminal("L3-072", "正式测评、考试与成绩", "human_confirmed", "围绕明确的正式或标准化测评事件、官方成绩、等级、通过与否。", "考试安排中的测评事项、正式分数、成绩发布和通过结果。", "练习估分、日常课堂观察、单纯备考。", "有正式测评载体或官方结果才归本节点；教师日常观察归 L3-010。", legacy: "测评与考试反馈"),
        terminal("L3-010", "日常学习表现与反馈", "human_confirmed", "基于课堂、练习、作业或教师观察形成的日常学习表现、薄弱项与反馈。", "课堂表现、理解程度、参与状态、练习表现及改进建议。", "正式考试官方成绩、对教师授课质量的评价。", "评价对象是学习者归本节点；评价对象是教师或教学设计归 L3-015。", legacy: "学习表现与反馈")
      ])
    ]
  },
  {
    id: "L1-002", name: "教学设计、实施与改进",
    definition: "教师决定教什么、使用什么资源、怎样组织教学，以及怎样评价和改进教学。",
    exclude: "排除学生自身表现、课程排期与收费、一般数字故障。",
    groups: [
      group("L2-023", "教学内容规划与资源", [
        terminal("L3-073", "教材、教学资料与课件", "human_confirmed", "教学所用教材、读物、课件、音视频材料的选择、适配、制作、查找、获取、分享与使用。", "教材适配、课件准备、资料推荐、查找或发送。", "文件权限或格式故障；仅讨论页码、单元与已学待学内容。", ["主要问题是‘用什么/在哪里/是否合适’归本节点。", "主要问题是‘教什么/教到哪里’归 L3-012；两个事项均持续时拆 Topic。"], legacy: ["教学资料与课件", "教材与材料选择"]),
        terminal("L3-012", "课程内容范围与教学进度", "evidence_backed_boundary_review", "围绕课程覆盖的内容范围、页码、单元、先后顺序、已完成和接下来教授的内容。", "授课内容确认、章节推进、内容衔接和后续教学范围。", "日历排课、单纯换教材或找文件、教学方法。", ["回答‘教什么/教到哪’归本节点；回答‘怎么教’归 L3-014。", "旧‘教材与课程进度’常为复合 Topic，迁移时必须回看证据并允许拆分。"], legacy: "教材与课程进度")
      ]),
      group("L2-042", "教学方法、课堂规范与质量改进", [
        terminal("L3-014", "教学方法与课堂活动设计", "evidence_backed", "教师为达成学习目标而设计或调整提问、支架、语速、语言支持与课堂活动。", "教学策略、课堂活动、互动方式和授课节奏设计。", "学生既有表现、参与纪律规则、对授课质量的评价结论。", "教师采取的教学办法归本节点；学生应遵守什么归 L3-074；评价教学好坏归 L3-015。", legacy: "教学方法与课堂活动", negative_ids: %w[STI-4a5c15095217f662745a]),
        terminal("L3-074", "课堂互动规范与参与要求", "provisional", "课堂中对学习者发言、聊天、摄像头、专注和参与行为的明确要求或限制。", "课堂聊天限制、摄像头要求、课堂用语、专注与参与规则。", "群组禁言和成员治理；教师工作纪律；一般教学活动设计。", "规范约束的对象是学生课堂行为时归本节点；平台群治理归 L3-027。", evidence_ids: %w[STI-4a5c15095217f662745a STI-0d90f16b47afe912c2ca]),
        terminal("L3-015", "教学质量评价与改进", "evidence_backed", "对教师、教学设计或授课效果进行观察、评价，并提出或确认改进。", "授课内容是否跑题、难度与节奏是否适当、教师备课及教学质量改进。", "学生学习表现、课程客服体验、一般教学方法介绍。", ["评价对象是教学过程或教师归本节点；评价对象是学生归 L3-010。", "投诉核心是服务流程或口碑处置归 L3-077。"], evidence_ids: %w[STI-6c0512ba9323b465408a STI-ecfd3e71c311c9795728])
      ])
    ]
  },
  {
    id: "L1-003", name: "课程运营与服务",
    definition: "围绕课程时间、出勤、课堂接入、学员承接与权益、教师合作和结算的运营事项。",
    exclude: "排除教学内容本身、一般技术故障及普通消费。",
    groups: [
      group("L2-025", "课程排期与变更", [
        terminal("L3-018", "可用时段与排班", "evidence_backed", "尚未绑定具体课程的可授课或可参加时段以及供给排班。", "开放、更新或核对可用时间和教师排班。", "已绑定学员的固定预约、既有课程改期。", "供给时间池归本节点；绑定具体学员和课程归 L3-075。", legacy: "可用时段与排班"),
        terminal("L3-075", "课程预约与固定排课", "provisional", "把具体学员、课程和时间绑定，形成首次预约或固定课表。", "预约具体课程、确认固定周课表或新增固定时段。", "修改已存在的课程、仅开放可用时间。", "首次绑定归本节点；已有课程变更归 L3-017。", evidence_ids: %w[STI-97c3d224af0c4fcda972 STI-9e030374cfe8a97f7567]),
        terminal("L3-017", "课程改期、取消与补课", "evidence_backed", "对已经存在的课程进行改期、取消、恢复、加课或补课。", "换时间、取消课、补课与恢复课程。", "首次预约、单纯缺勤事实、仅开放可约时段。", "存在既有课程且改变其状态归本节点；未绑定安排归 L3-018/L3-075。", legacy: "课程变更与补课")
      ]),
      group("L2-026", "到课与课堂运行", [
        terminal("L3-019", "到课、请假与缺勤处置", "human_confirmed", "围绕教师或学生是否到课、迟到、等待、请假、缺席、代课及即时处置。", "出勤确认、请假、迟到、缺勤和催促进课。", "课堂入口配置、网络排障、主要诉求为结算申诉。", "‘人是否到’归本节点；‘入口/教室是否可进入’归 L3-024；扣薪只作为后果或独立 L3-079。", legacy: "到课与缺勤处理"),
        terminal("L3-024", "教室与课堂接入", "evidence_backed", "围绕教室创建、课堂入口、会议码、进入权限和接入配置。", "查找或创建教室、获取课堂入口、确认进入权限。", "人没到、网络或设备故障排查。", "询问入口或配置归本节点；出现异常并持续排障归 L3-029。", legacy: "在线教室与课程接入")
      ]),
      group("L2-043", "学员承接、服务与权益", [
        terminal("L3-076", "试听、首课与学员承接", "human_confirmed", "围绕试听、首课、新学员资料、首次家长联系和服务交接。", "试听安排、新生首课通知、学员背景交接与课前准备。", "正式课程改期、一般服务评价和退款。", "以学员进入服务生命周期的承接为界；既有课程变更归 L3-017。", evidence_ids: %w[STI-7317918b7211cfdb64fb STI-8ef0cbdf7e03e74072f8]),
        terminal("L3-077", "服务评价、投诉与口碑跟进", "provisional", "对课程服务体验的好评、差评、投诉、口碑以及后续客服处置。", "投诉、评价删除请求、客服跟进和口碑处理。", "教师授课质量本身、学生学习表现。", "评价对象是服务流程或处置体验归本节点；教学质量归 L3-015。", evidence_ids: %w[STI-5d328780b49940239117]),
        terminal("L3-078", "学员课程权益、费用与退款", "human_confirmed", "学员侧的课时权益、学费、赠课、转课、退款和结算。", "学员课时变更、课程退款、费用争议和权益处理。", "教师工资与扣罚、普通购物。", "按结算对象裁决：学员侧归本节点，教师侧归 L3-079。", evidence_ids: %w[STI-f1531db81484de34cbcb])
      ]),
      group("L2-044", "教师合作、规范与结算", [
        terminal("L3-080", "教师招聘、入职与资料", "evidence_backed", "教师招聘、面试、入职、资质材料和初始分配。", "教师招募、推荐、入职材料与初次工作交接。", "在岗考核、一次迟到、教学方法。", "进入合作关系前后的一次性承接归本节点；持续工作规范归 L3-081。", evidence_ids: %w[STI-5b32849c0674b7eaa4ed STI-429c8fec757131164c07]),
        terminal("L3-081", "教师工作规范、考核与人员处置", "evidence_backed", "教师在岗工作规则、纪律、考核、替换、交接和离职处置。", "工作群规则、请假流程、考核标准和人员处置。", "一般教学方法、学员请假本身、教师薪资金额。", "制度约束或人员管理归本节点；单次出勤事实归 L3-019。", evidence_ids: %w[STI-783a199447c502ec1b83 STI-429c8fec757131164c07]),
        terminal("L3-079", "教师课酬、薪资与奖励", "human_confirmed", "教师侧课时费、工资、佣金、奖励、扣罚和结算。", "教师工资、课酬计算、奖励和因出勤产生的扣罚。", "学员退款、普通金融投资。", "按结算对象裁决：教师侧归本节点；缺勤事实仍归 L3-019，并用关系字段关联。", evidence_ids: %w[STI-e1ffeb2915b6e19331c6])
      ])
    ]
  },
  {
    id: "L1-004", name: "数字平台与技术",
    definition: "数字账号、群组空间、设备、应用和消息文件操作本身成为正在解决的对象。",
    exclude: "排除仅借助数字媒介完成的教学、课程运营或社交目的。",
    groups: [
      group("L2-008", "账号、联系人与群组空间", [
        terminal("L3-026", "账号认证与资料设置", "evidence_backed", "登录、验证码、密码、绑定、认证及账号资料设置。", "账号登录、认证、绑定、密码和资料修改。", "现实人格身份讨论、联系人功能。", "账号主体和认证资料归本节点；通讯关系归 L3-082。", legacy: "账号与身份资料"),
        terminal("L3-082", "联系人与通讯功能", "evidence_backed", "好友、联系人、屏蔽、私信、通话或消息可用性等通讯功能。", "添加好友、联系人状态、屏蔽和通讯功能是否可用。", "约联系时间、关系担忧、账号认证。", "功能本身归本节点；沟通目的为见面安排归 L3-038。", legacy: "在线联络与联系人"),
        terminal("L3-027", "群组空间与成员治理", "evidence_backed", "数字群组的创建、加入退出、公告、禁言、移除、资料及成员治理。", "建群、群设置、群成员和管理操作。", "社群内容互动、课堂参与规则。", "数字空间治理归本节点；社群活动内容归 L3-039。", legacy: "群组与社群设置")
      ]),
      group("L2-045", "设备、应用与数字操作", [
        terminal("L3-029", "技术故障与连接排查", "evidence_backed", "网络、供电、音视频、设备、页面或应用出现异常，并以定位和恢复为主要事项。", "断线、报错、不可用、设备异常和持续排障。", "正常设置和使用限制；仅因故障提出的调课结果。", "先看主要待解决事项：恢复技术状态归本节点；课程变更归 L3-017，并可记录故障原因。", legacy: "连接与设备故障"),
        terminal("L3-030", "设备设置、应用安装与使用限制", "provisional", "设备或应用处于正常可操作状态时的设置、安装、更新、权限或使用时长限制。", "安装应用、调整设置、配置设备和限制应用时长。", "报错或连接异常排查；普通手机取用与位置协调。", "异常恢复归 L3-029；消息或文件具体操作归 L3-033。", evidence_ids: %w[STI-25955a34809779ca84c9]),
        terminal("L3-032", "在线课堂与协作功能操作", "provisional", "对白板、黑板、共享、课堂互动或协作功能进行正常操作。", "使用课堂白板、共享协作和互动工具。", "一般消息收发、账号登录、网络故障。", "教育协作功能归本节点；通用消息和附件操作归 L3-033。", evidence_ids: %w[STI-f465c15f5799da0ac687]),
        terminal("L3-033", "消息、文件与媒体操作", "evidence_backed", "消息输入，以及图片、录音、视频和文件的发送、接收、保存、删除、下载或格式处理。", "打字或语音输入、消息发送、附件和媒体处理。", "教学资源的内容选择、创意作品制作、权限故障。", "操作媒介本身归本节点；教学目的归 L3-073，创作目的归 L3-047。", evidence_ids: %w[STI-9de114c0bf1b2e282a08 STI-3ea0fb0c2b5ce5f28a9b STI-3d6d1c91dafb975fc481])
      ])
    ]
  },
  {
    id: "L1-005", name: "人际关系与社交",
    definition: "现实关系、个人身份、自我认知、社交安排、日常交流和社群参与。",
    exclude: "排除数字群功能、课程沟通和娱乐作品内容本身。",
    groups: [
      group("L2-011", "关系与相处", [
        terminal("L3-034", "恋爱与亲密关系", "evidence_backed", "围绕伴侣、表白、前任、分手和亲密关系的沟通。", "恋爱状态、情感互动、亲密关系矛盾。", "普通朋友关系、成人内容安全属性。", "以关系类型裁决；普通同伴关系归 L3-035。", legacy: "恋爱与亲密关系"),
        terminal("L3-035", "朋友同学关系与相处", "evidence_backed", "朋友或同学之间的支持、误会、冲突、道歉和关系状态。", "友谊、同伴矛盾、关系确认与相互支持。", "恋爱关系、单纯聚会时间安排。", "关系本身归本节点；共同活动安排归 L3-038。", legacy: "同伴关系与互动"),
        terminal("L3-036", "家庭与亲属关系", "evidence_backed", "家长、手足、亲属角色及家庭成员之间的相处。", "亲子、兄弟姐妹、亲属关系和家庭互动。", "医疗处置、一般居家用品。", "关系互动归本节点；家庭只作为原因时不改变事项主路径。", legacy: "家庭与亲属关系")
      ]),
      terminal_l2("L2-046", "个人身份、特征与自我认知", "provisional", "对现实身份、人格特征、MBTI、自我形象或自我认识的讨论。", "人格类型、自我评价和现实身份特征。", "账号资料设置、关系冲突、穿着购物。", "讨论‘我是谁/我有什么特征’归本节点；账号身份归 L3-026。", legacy: "个人与同伴信息", negative_ids: %w[STI-a797f84d64243e209232]),
      group("L2-012", "社交活动、日常交流与社群参与", [])
    ]
  }
]

# Replace the compact placeholder above with the full social, entertainment and
# outer-domain definitions. Keeping this second append block makes review diffs
# easier to navigate than one monolithic literal.
social = domains.find { |d| d[:id] == "L1-005" }[:groups].find { |g| g[:id] == "L2-012" }
social[:children] = [
  terminal("L3-038", "见面、聚会与交流安排", "evidence_backed", "围绕线上或线下见面、聚餐、生日、共同活动或联系时间的社交安排。", "约见、聚会、共同娱乐和联系时间协调。", "课程排期、旅行见闻、关系冲突本身。", "社交目的的时间安排归本节点；课程安排归 L2-025。", legacy: "社交活动与见面"),
  terminal("L3-100", "日常寒暄与关系维系", "provisional", "没有更具体持续内容主题时，以问候、关心、陪伴、回应近况或维持联系为主要功能的持续交流。", "达到 Topic 门槛的问候、晚安、关心是否被忽略和关系维系对话。", "天气、饮食、影视等已有明确内容主题；笑话或梗本身；单句礼貌语。", ["必须同时满足：达到 Topic 门槛、没有更具体议题、主要功能是维持联系。", "具体生活事务归 L2-047；幽默内容本身归 L3-040。"], evidence_ids: %w[STI-896436e0b0c1f0b31dfb STI-7b5859bb7969e32bc1a1]),
  terminal("L3-039", "社群参与与成员交流", "evidence_backed", "围绕现实社群的招募、欢迎、共同兴趣和成员参与内容。", "社群活动、成员欢迎、共同兴趣和参与互动。", "数字群设置、禁言、公告或移除。", "社群为何聚集和交流归本节点；数字空间怎样治理归 L3-027。", legacy: "社群互动与成员交流"),
  terminal("L3-040", "玩笑、梗与语言游戏", "evidence_backed_boundary_review", "调侃、梗、接龙、脑筋急转弯或语言游戏本身成为持续讨论对象。", "持续围绕误读、梗、虚构称呼或语言游戏展开的互动。", "有稳定内容的个人经历、一般轻松语气、日常寒暄。", "幽默是内容对象时归本节点；轻松只是语气时仍按真实内容分类。", evidence_ids: %w[STI-a797f84d64243e209232 STI-5ffc2d6b58f62894a06a STI-adbcb1fb3a04476cdfff])
]

domains.concat([
  {
    id: "L1-006", name: "娱乐与创作",
    definition: "娱乐内容消费、游玩、兴趣收藏、实际创作及虚构互动。",
    exclude: "排除技能教学、健康训练和纯文件操作。",
    groups: [
      group("L2-013", "娱乐内容、游玩与兴趣收藏", [
        terminal("L3-041", "游戏与游玩", "evidence_backed", "电子游戏、桌面或线下游戏的角色、关卡、装备、对局和玩法讨论。", "游戏内容、玩法、角色、对局和游玩安排。", "游戏项目开发、登录故障、纯语言玩笑。", "消费或参与游戏归本节点；编程学习归 L3-005。", legacy: "电子游戏与游玩"),
        terminal("L3-042", "影视、动漫与文学作品", "evidence_backed", "影视、动漫、小说等既有作品的角色、剧情、评价和推荐。", "观看阅读、剧情角色讨论和作品推荐。", "原创故事、课程阅读任务。", "消费既有作品归本节点；创作新内容归 L3-046。", legacy: "影视动漫与文学作品"),
        terminal("L3-043", "音乐作品、演出与艺人文化", "evidence_backed", "歌曲、演出、艺人、偶像和粉丝文化的兴趣讨论。", "歌曲、演唱会、艺人和粉丝互动。", "乐器技能学习、音频剪辑创作。", "作品或艺人兴趣归本节点；技能训练归 L3-006。", legacy: "音乐与偶像文化"),
        terminal("L3-083", "体育赛事与运动娱乐", "provisional", "体育赛事、运动员、赛事观看和单次休闲运动的娱乐讨论。", "看比赛、聊球队运动员和休闲运动。", "持续体能训练、康复或健康目标。", "娱乐消费或单次活动归本节点；健康训练归 L2-050。", legacy: "体育与互动活动"),
        terminal("L3-049", "兴趣周边与收藏", "provisional", "卡片、手办、周边、藏品及收藏交流。", "收藏、交换、展示或评价兴趣周边。", "普通购物决策、个人穿着、账号头像。", "收藏价值与兴趣是主旨时归本节点；购买流程本身归 L2-056。", legacy: "收藏与形象物品")
      ]),
      group("L2-014", "内容创作与虚构互动", [
        terminal("L3-045", "视觉艺术与手作创作", "provisional", "绘画、设计、手作等实际创作、改编或发布。", "制作视觉作品、绘画、设计和手工创作。", "只购买工具、只谈论既有作品。", "必须有创作动作；技能教学归 L3-006。", legacy: "视觉与手作创作"),
        terminal("L3-046", "故事、角色设定与虚构互动", "evidence_backed", "原创故事、人物设定、世界观、文本创作以及有共同设定的持续虚构互动。", "写故事、设计角色、共同角色扮演和世界观创作。", "阅读既有文学作品、普通称谓或玩笑。", "有持续虚构设定归本节点；无设定调侃归 L3-040。", legacy: ["文字与角色创作", "角色扮演与虚构互动"]),
        terminal("L3-047", "音视频与多媒体创作", "evidence_backed", "剪辑、配乐、录制和制作音视频或多媒体作品。", "视频剪辑、配音、录制和多媒体作品生产。", "单纯发送、下载、格式转换或播放。", "创作产物归本节点；纯媒介操作归 L3-033。", legacy: "音视频创作")
      ])
    ]
  },
  {
    id: "L1-007", name: "日常生活、健康与出行",
    definition: "具体的起居生活事务、健康与身体活动、宠物、天气、位置和出行。",
    exclude: "排除课程运营、关系冲突、纯寒暄和公共制度议题。",
    groups: [
      terminal_l2("L2-047", "饮食、作息与生活事务", "evidence_backed", "具体的饮食、睡眠作息、生活用品、寄取和日常办事事项。", "吃饭与点餐、睡眠安排、生活用品、快递寄取和具体生活事务。", "健康医疗、旅行位置、社交聚会、纯晚安寒暄。", ["存在具体生活对象或待办归本节点；交流目的仅为关心陪伴归 L3-100。", "聚餐的社交组织目的归 L3-038。"], evidence_ids: %w[STI-ff9d6caf00f2c2e3f447 STI-f2975f5aac73a6971ef1 STI-b05ae32373da58f74616 STI-fb20b50c87535e0fd59e]),
      terminal_l2("L2-049", "宠物与动物生活", "provisional", "宠物、动物照护以及与动物共同生活的日常事项。", "饲养、照护、宠物状态和动物生活经历。", "生物学学习、纯影视角色。", "现实动物生活归本节点；知识学习归 L3-004。", legacy: "动物与饲养"),
      terminal_l2("L2-050", "健康与身体活动", "evidence_backed", "症状、医疗照护、康复，以及以体能或健康为目的的持续运动。", "身体状态、就医治疗、康复、锻炼和体能目标。", "疾病仅作为请假原因、赛事观看、单次休闲运动。", "健康问题本身归本节点；若只解释缺勤则作为 cause 并归 L3-019。", legacy: ["健康与医疗", "运动与身体锻炼"]),
      terminal_l2("L2-051", "天气与自然环境状况", "evidence_backed", "天气、气候和自然环境的实际状况成为持续讨论对象。", "天气变化、气候体验和自然环境状态。", "天气只作为断网、请假或调课原因。", "天气本身归本节点；若只是业务原因则记录 cause，不改变业务主路径。", legacy: "天气与公共环境"),
      terminal_l2("L2-052", "位置、行程与旅行", "evidence_backed", "当前位置、通勤、具体行程协调及旅行地点经历。", "在哪里、怎样前往、返程安排、旅行见闻和地点探索。", "社交见面目的、公共交通政策。", "个人移动或地点体验归本节点；约人见面归 L3-038。", legacy: "旅行与地点经历")
    ]
  },
  {
    id: "L1-011", name: "教育环境与校园事务",
    definition: "学校或校园环境中的制度、班级、校内活动和在校生活事项。",
    exclude: "排除具体学科学习、课程运营、同伴关系和独立专业研究。",
    groups: [
      terminal_l2("L2-053", "校园事务与校园生活", "provisional", "发生在学校或校园环境中的班级变动、校内活动、学校规则和整体校园生活体验。", "学校班级情况、校园活动、校内制度及学校生活体验。", "学科知识、作业、朋友关系、普通饮食作息、课程平台运营。", ["学校只是背景不够；主要问题必须是校园制度、活动或整体在校情境。", "复合 Topic 同时含学习计划或日常作息时应拆分。"], legacy: "学校与校园生活", negative_ids: %w[STI-7f5f1d7502a8e54c0b6c])
    ]
  },
  {
    id: "L1-012", name: "商业、消费与金融",
    definition: "个人消费购买与金融市场分析、策略、仓位和交易。",
    exclude: "排除课程费用、兴趣收藏内容和一般生活物流。",
    groups: [
      terminal_l2("L2-056", "消费与购买", "provisional", "商品或服务的比较、价格、下单、充值、收货和购买决策。", "选择商品、讨论价格、购买和收货。", "课程费用退款、金融投资、收藏内容本身、生活用品寄取但无购买决策。", "交易购买过程归本节点；商品只是兴趣内容时归 L3-049/L3-042。", legacy: "消费与购买"),
      terminal_l2("L2-057", "金融市场分析与交易", "evidence_backed", "股票、期货、贵金属、外汇等行情、策略、仓位和交易行动。", "市场行情、进出场、止损、仓位和交易策略。", "普通消费、课程结算、无具体交易的社会新闻。", "具体金融标的和交易决策归本节点；普通购买归 L2-056。", legacy: "金融市场与交易")
    ]
  },
  {
    id: "L1-013", name: "法律与公共事务",
    definition: "法律权利，以及面向群体或社会运行的公共议题与外部事件信息。",
    exclude: "排除个人生活险情、账号安全、天气和个人行程。",
    groups: [
      terminal_l2("L2-058", "法律与权利", "provisional", "法律规则、权利义务、合法性判断和维权行动。", "是否合法、法律责任、权利受损与维权。", "金融交易安全、账号安全、单纯个人险情。", "以法律规范或权利主张为主要对象时归本节点；只陈述风险不够。", legacy: "安全、法律与风险"),
      terminal_l2("L2-059", "公共事务与社会信息", "provisional", "面向群体或社会运行的政策、公共事件、公共服务和社会信息讨论。", "政策社会议题、公共运行事件和影响群体的外部信息。", "个人位置行程、天气事实、学校或工作中的个人事务。", "必须有公共或群体层面的对象；唯一旧实例若主要是个人地点应迁往 L2-052。", legacy: "公共议题与外部信息")
    ]
  }
])

evidence_rows = CSV.read(EVIDENCE_PATH, headers: true, encoding: "bom|utf-8").map(&:to_h)
evidence_by_id = evidence_rows.to_h { |row| [row.fetch("topic_instance_id"), row] }

flat_nodes = []
cards = []

domains.each do |domain|
  flat_nodes << { level: 1, node_id: domain[:id], node_name: domain[:name], node_type: "domain", is_terminal: false,
                  evidence_status: "frozen_structure", path_ids: domain[:id], path_names: domain[:name] }
  domain[:groups].each do |node|
    if node[:node_type] == "group"
      flat_nodes << { level: 2, node_id: node[:id], node_name: node[:name], node_type: "group", is_terminal: false,
                      evidence_status: "frozen_structure", path_ids: "#{domain[:id]} > #{node[:id]}", path_names: "#{domain[:name]} > #{node[:name]}" }
      siblings = node[:children].map { |child| child[:id] }
      node[:children].each do |child|
        path_ids = "#{domain[:id]} > #{node[:id]} > #{child[:id]}"
        path_names = "#{domain[:name]} > #{node[:name]} > #{child[:name]}"
        flat_nodes << { level: 3, node_id: child[:id], node_name: child[:name], node_type: "terminal", is_terminal: true,
                        evidence_status: child[:evidence_status], path_ids: path_ids, path_names: path_names }
        cards << child.merge(level: 3, terminal_level: "L3", path_ids: path_ids.split(" > "),
                             path_names: path_names.split(" > "), sibling_ids: siblings - [child[:id]])
      end
    else
      path_ids = "#{domain[:id]} > #{node[:id]}"
      path_names = "#{domain[:name]} > #{node[:name]}"
      flat_nodes << { level: 2, node_id: node[:id], node_name: node[:name], node_type: "terminal", is_terminal: true,
                      evidence_status: node[:evidence_status], path_ids: path_ids, path_names: path_names }
      sibling_ids = domain[:groups].select { |s| s[:node_type] == "terminal" }.map { |s| s[:id] } - [node[:id]]
      cards << node.merge(level: 2, terminal_level: "L2", path_ids: path_ids.split(" > "),
                          path_names: path_names.split(" > "), sibling_ids: sibling_ids)
    end
  end
end

def example_from(row, relation)
  {
    relation: relation,
    research_phase: row.fetch("research_phase"),
    window_id: row.fetch("window_id"),
    topic_instance_id: row.fetch("topic_instance_id"),
    topic_name: row.fetch("effective_name"),
    topic_description: row.fetch("effective_description"),
    source_path: row.fetch("effective_taxonomy_path"),
    evidence_message_ids: row.fetch("evidence_message_ids").split("|")
  }
end

cards.each do |card|
  selected = card[:evidence_ids].map { |id| evidence_by_id[id] }.compact
  selected += evidence_rows.select { |row| card[:legacy_labels].include?(row["effective_path_l3"]) }
  selected = selected.uniq { |row| row["topic_instance_id"] }.first(3)
  card[:positive_examples] = if selected.empty?
                               [{ relation: "not_observed", note: "阶段 A+B 未见可作为该节点干净正例的 Topic；该节点保持 provisional，不得据此做规模结论。" }]
                             else
                               selected.map { |row| example_from(row, "positive") }
                             end
end

cards_by_id = cards.to_h { |card| [card[:id], card] }
cards.each do |card|
  explicit = card[:negative_ids].map { |id| evidence_by_id[id] }.compact
  sibling = card[:sibling_ids].map do |sibling_id|
    cards_by_id[sibling_id]&.fetch(:positive_examples, [])&.find { |ex| ex[:relation] == "positive" }
  end.compact.first
  card[:negative_examples] = if explicit.any?
                               explicit.first(2).map { |row| example_from(row, "negative_adjacent") }
                             elsif sibling
                               [sibling.merge(relation: "negative_adjacent", note: "该实例属于相邻节点，不应归入当前节点。")]
                             else
                               [{ relation: "not_observed", note: "阶段 A+B 未见可稳定复用的相邻负例；以 exclude 与 adjacent_rules 裁决，禁止虚构例子。" }]
                             end
end

rule_cards = cards.map do |card|
  card.reject { |key, _| %i[id name legacy_labels evidence_ids negative_ids sibling_ids node_type level].include?(key) }
      .merge(node_id: card[:id], node_name: card[:name])
end

rules_payload = {
  taxonomy_version: VERSION,
  status: "FROZEN_STRUCTURE_MIGRATION_PENDING",
  evidence_scope: {
    included: "阶段 A+B：80 个已复核会话、331 个 effective_topic",
    excluded: "阶段 D 未读取；未使用其内容塑造目录",
    caution: "结构定版不等于所有 provisional 节点已获统计验证"
  },
  counts: {
    l1: flat_nodes.count { |n| n[:level] == 1 },
    l2: flat_nodes.count { |n| n[:level] == 2 },
    l3: flat_nodes.count { |n| n[:level] == 3 },
    terminal_topics: flat_nodes.count { |n| n[:is_terminal] },
    total_active_nodes: flat_nodes.length
  },
  global_decision_rules: [
    "先按完整上下文识别主要待解决事项，不按关键词、角色、媒介、原因或后果直接定路径。",
    "一个 Topic 只有一个主终点；两个独立且持续的事项应拆 Topic，并用 relation/cause/business_impact 关联。",
    "L2 有 L3 时不可停在 L2；终点允许位于 L2 或 L3。",
    "没有稳定位置时使用 taxonomy_gap；上下文不足时使用 context_insufficient，不得强塞宽泛兜底。",
    "provisional 节点可用于下一阶段验证，但不得直接用于需求规模或产品优先级结论。"
  ],
  terminal_rule_cards: rule_cards
}

File.write(RULES_PATH, JSON.pretty_generate(rules_payload) + "\n")

# A normalized all-node projection used by deterministic migration validators.
# Terminal rule text is repeated here deliberately so a single immutable file
# can validate both variable-depth paths and routing decisions.
active_nodes_payload = {
  taxonomy_version: VERSION,
  status: "FROZEN_STRUCTURE_MIGRATION_PENDING",
  nodes: flat_nodes.map do |node|
    path_ids = node[:path_ids].split(" > ")
    path_names = node[:path_names].split(" > ")
    card = cards_by_id[node[:node_id]]
    {
      taxonomy_version: VERSION,
      level: node[:level],
      node_id: node[:node_id],
      node_name: node[:node_name],
      parent_id: path_ids.length > 1 ? path_ids[-2] : nil,
      node_type: node[:node_type],
      is_terminal: node[:is_terminal],
      evidence_status: node[:evidence_status],
      path_ids: path_ids,
      path_names: path_names,
      definition: card ? card[:definition] : "",
      include_rules: card ? card[:include] : [],
      exclude_rules: card ? card[:exclude] : [],
      neighbor_rules: card ? card[:adjacent_rules] : []
    }
  end
}

File.write(ACTIVE_NODES_PATH, JSON.pretty_generate(active_nodes_payload) + "\n")

tree_lines = []
domains.each do |domain|
  tree_lines << "#{domain[:id]} #{domain[:name]}"
  domain[:groups].each_with_index do |node, group_index|
    group_last = group_index == domain[:groups].length - 1
    marker = group_last ? "└─" : "├─"
    if node[:node_type] == "group"
      tree_lines << "#{marker} #{node[:id]} #{node[:name]}〔分组〕"
      prefix = group_last ? "   " : "│  "
      node[:children].each_with_index do |child, child_index|
        branch = child_index == node[:children].length - 1 ? "└─" : "├─"
        suffix = child[:evidence_status] == "provisional" ? " ◇" : (child[:evidence_status] == "human_confirmed" ? " ●" : "")
        tree_lines << "#{prefix} #{branch} #{child[:id]} #{child[:name]}#{suffix}"
      end
    else
      suffix = node[:evidence_status] == "provisional" ? " ◇" : ""
      tree_lines << "#{marker} #{node[:id]} #{node[:name]}〔终点〕#{suffix}"
    end
  end
  tree_lines << ""
end

tree_md = <<~MD
  # ClassIn IM 语义主题 Taxonomy v2.2 定版结构

  > 状态：`FROZEN_STRUCTURE / STAGE_AB_EVIDENCE_ONLY / MIGRATION_PENDING / STAGE_D_UNSEEN`  
  > 依据：阶段 A+B 80 个已复核会话、331 个 `effective_topic`，以及人工确认的 v2.1 修正意见。  
  > 定版含义：本文件冻结下一轮 A+B 适用性扫描使用的结构与边界；不表示所有 `◇ provisional` 节点已得到统计验证，也不覆盖 v1/v2/v2.1 历史结果。

  ## 1. 结构计数

  | 指标 | 数量 |
  |---|---:|
  | L1 | #{rules_payload[:counts][:l1]} |
  | 活跃 L2 | #{rules_payload[:counts][:l2]} |
  | 活跃 L3 | #{rules_payload[:counts][:l3]} |
  | 可选终点 | #{rules_payload[:counts][:terminal_topics]} |
  | 活跃总节点 | #{rules_payload[:counts][:total_active_nodes]} |

  v2.1 的 `L2-048 个人近况、经历与日常安排` 已退役，`L2-054 专业研究与学术发表` 已移入候选池；新增 `L3-100 日常寒暄与关系维系`。历史 v2 已把 `L3-084` 分配给“棋牌桌游与线下游戏”，因此该 ID 永不复用。

  ## 2. 完整定版结构

  标记：`〔分组〕` 不可直接选择；`〔终点〕` 可直接选择；`◇` 表示证据不足、待后续验证；`●` 表示本轮人工明确确认的关键边界。

  ```text
  #{tree_lines.join("\n")}
  ```

  ## 3. 全局裁决规则

  1. 先识别完整上下文中的主要待解决事项，不按关键词、角色、媒介、原因或后果直接定路径。
  2. 一个 Topic 只有一个主终点；两个独立且持续的事项应拆 Topic，再用 `cause[]`、`business_impact[]` 和 `relation[]` 关联。
  3. L2 有 L3 时不得停在 L2；可变深度只允许选择唯一终点节点。
  4. 没有稳定位置时使用 `taxonomy_gap`，上下文不足时使用 `context_insufficient`，不再设置宽泛兜底类。
  5. `◇` 节点可以参与后续验证，但不得直接被解释为真实需求规模或产品优先级。

  ## 4. 关键边界

  - **研究学习 vs 专业研究**：教师指导、课程或学习目的下的研究选题、方法、数据、论文与投稿准备归 `L3-071`；独立职业研究在 A+B 中无干净正例，`L2-054` 留在候选池。
  - **教学资源 vs 内容进度 vs 教学方法**：用什么资源归 `L3-073`；教什么、教到哪里归 `L3-012`；怎么教归 `L3-014`。持续包含两个独立事项时拆 Topic。
  - **教学方法 vs 课堂规范 vs 教学质量**：教师采取的方法归 `L3-014`；学习者应遵守的课堂行为归 `L3-074`；评价教师或教学设计并改进归 `L3-015`。
  - **数字四分法**：异常恢复归 `L3-029`；正常设置、安装与限制归 `L3-030`；教育协作功能操作归 `L3-032`；通用消息、文件与媒体操作归 `L3-033`。
  - **寒暄 vs 具体内容 vs 玩笑**：只有达到 Topic 门槛、无更具体内容主题且主要功能是维系关系，才归 `L3-100`；具体天气、饮食、娱乐等仍归其内容节点；幽默本身成为内容才归 `L3-040`。
  - **生活事务 vs 寒暄**：存在饮食、作息、用品、寄取或办事对象归 `L2-047`；单纯晚安、关心和回应是否被忽略归 `L3-100`。
  - **校园事项**：学校只是背景不足以归 `L2-053`；主要事项必须是学校制度、班级、校内活动或整体校园生活。
  - **原因与后果不夺取主路径**：天气、疾病、故障可作为原因；扣薪、退款、补课等可作为后果。只有它们本身成为持续待解决事项时才生成独立 Topic。

  ## 5. 配套事实源

  - 60 个终点的规则卡与 A+B 正负例：`TAXONOMY-V2-2-RULE-CARDS-20260902.json`
  - 84 个活跃节点的机器校验快照：`TAXONOMY-V2-2-ACTIVE-NODES-20260902.json`
  - v2.1 到 v2.2 节点映射：`TAXONOMY-V2-1-TO-V2-2-NODE-MAPPING-20260902.csv`
  - 暂不启用与退役节点：`TAXONOMY-V2-2-CANDIDATE-POOL-20260902.csv`
  - 机械校验结果：`TAXONOMY-V2-2-VALIDATION-REPORT-20260902.md`

  ## 6. 下一门禁

  对 A+B 331 个 Topic 逐条生成 `direct_fit / remap / split / taxonomy_gap / context_insufficient` 迁移预览。迁移必须保留旧路径、证据消息 ID、拟议新路径、理由和置信度；本文件不得用于覆盖历史裁决。阶段 D 在迁移与复核完成前继续保持未见。
MD

File.write(TREE_PATH, tree_md)

v21_rows = CSV.read(V21_FLAT_PATH, headers: true, encoding: "bom|utf-8").map(&:to_h)
active_by_id = flat_nodes.to_h { |node| [node[:node_id], node] }
mapping_rows = v21_rows.map do |row|
  old_id = row.fetch("node_id")
  old_name = row.fetch("node_name")
  if old_id == "L2-048"
    ["classin-im-semantic-taxonomy-v2.1-candidate", old_id, old_name, VERSION, old_id, old_name,
     "retire_overbroad", "retired_do_not_reuse", "宽泛个人近况节点被人工否决；具体内容分流，纯关系维系进入 L3-100。"]
  elsif old_id == "L2-054"
    ["classin-im-semantic-taxonomy-v2.1-candidate", old_id, old_name, VERSION, old_id, old_name,
     "deactivate_to_candidate_pool", "inactive_candidate", "A+B 两个论文实例均处在学习/指导语境，先迁往 L3-071；无干净独立专业研究正例。"]
  else
    target = active_by_id.fetch(old_id)
    action = target[:node_name] == old_name ? "preserve" : "rename_or_narrow"
    note = action == "preserve" ? "ID 与语义连续。" : "保留 ID；v2.2 收窄或澄清名称，历史版本名称不回写。"
    target_status = target[:evidence_status] == "provisional" ? "active_provisional" : "active"
    ["classin-im-semantic-taxonomy-v2.1-candidate", old_id, old_name, VERSION, old_id, target[:node_name],
     action, target_status, note]
  end
end
mapping_rows << ["classin-im-semantic-taxonomy-v2.1-candidate", "", "", VERSION, "L3-100", "日常寒暄与关系维系",
                 "new", "active_provisional", "使用新 ID；L3-084 已由历史 v2 的棋牌节点占用，禁止复用。"]

CSV.open(MAPPING_PATH, "w", write_headers: true,
         headers: %w[source_version source_node_id source_node_name target_version target_node_id target_node_name action target_status notes]) do |csv|
  mapping_rows.each { |row| csv << row }
end

candidate_rows = [
  ["L3-016", "教学记录、总结与回放", "L3", "L2-042", "inactive_candidate", "A+B 无干净正例", "至少 2 个有效 Topic、覆盖 2 个会话且可与教学质量互斥", "历史 ID 保留，不复用"],
  ["L3-025", "课堂开结、时长与中断", "L3", "L2-026", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话出现课堂实际开结/时长事项，并可与改期和故障互斥", "历史 ID 保留，不复用"],
  ["L3-031", "链接、权限与内容访问", "L3", "L2-045", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话以访问控制本身为主要问题", "历史 ID 保留，不复用"],
  ["L3-084", "棋牌桌游与线下游戏", "L3", "L2-013", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话形成独立游玩主题", "历史 v2 已占用；不得分配给寒暄节点"],
  ["L3-057", "个人形象与穿着", "L3", "L1-007", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话且可与消费、身份和创作互斥", "历史 ID 保留，不复用"],
  ["L3-089", "入学、升学与录取", "L3", "L1-011", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话出现教育阶段选择或录取事项", "历史 ID 保留，不复用"],
  ["L3-090", "专业、方向与选课", "L3", "L1-011", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话且与普通课程预约互斥", "历史 ID 保留，不复用"],
  ["L2-054", "专业研究与学术发表", "L2", "parent_tbd", "inactive_candidate", "A+B 两个旧研究实例均为学习/指导语境", "出现至少 2 个跨会话、脱离教学指导的独立专业研究 Topic", "v2.1 ID 保留；未来激活优先复用"],
  ["L3-091", "研究设计、方法与分析", "L3", "L2-054", "inactive_subcandidate", "无干净独立专业研究正例", "L2-054 激活后再评估内部二分", "历史 v2 ID 保留，不复用"],
  ["L3-092", "学术写作、投稿与发表", "L3", "L2-054", "inactive_subcandidate", "现有投稿实例仍属师生指导", "L2-054 激活后再评估内部二分", "历史 v2 ID 保留，不复用"],
  ["L2-036", "职业与工作", "L2", "parent_tbd", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话形成普通职业而非教师机构事务", "历史 v2 ID 保留，不复用"],
  ["L3-063", "商业经营与客户服务", "L3", "L1-012", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话以经营或客户服务为主题", "历史 ID 保留，不复用"],
  ["L3-066", "宏观、行业与企业信息", "L3", "L1-012", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话且能与具体交易互斥", "历史 ID 保留，不复用"],
  ["L3-095", "金融与交易安全", "L3", "L1-012", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话以金融诈骗或交易安全为主要事项", "历史 ID 保留，不复用"],
  ["L3-097", "公共安全与制度性风险", "L3", "L1-013", "inactive_candidate", "A+B 无干净正例", "至少 2 个会话且风险对象面向群体或制度", "历史 ID 保留，不复用"],
  ["L3-098", "政策、政治与社会议题", "L3", "L2-059", "inactive_subcandidate", "A+B 无干净二分证据", "L2-059 获得多个干净正例后再评估", "历史 ID 保留，不复用"],
  ["L3-099", "公共运行与事件信息", "L3", "L2-059", "inactive_subcandidate", "唯一旧实例可能是个人位置事项", "L2-059 获得多个干净正例后再评估", "历史 ID 保留，不复用"],
  ["L2-048", "个人近况、经历与日常安排", "L2", "none", "retired_do_not_reactivate", "人工确认边界过宽，会吞并健康、出行、生活和社交", "不设晋升门槛；具体内容必须分流，纯关系维系归 L3-100", "v2.1 ID 永久保留且不得复用"],
  ["L3-087", "个人近况、经历与日常安排", "L3", "none", "retired_do_not_reactivate", "与退役 L2-048 同一过宽概念", "不重新启用", "历史 v2 ID 永久保留且不得复用"]
]

CSV.open(POOL_PATH, "w", write_headers: true,
         headers: %w[node_id node_name level candidate_parent status stage_ab_evidence activation_gate id_policy]) do |csv|
  candidate_rows.each { |row| csv << row }
end

# Mechanical validation
errors = []
expected_counts = { l1: 10, l2: 25, l3: 49, terminal_topics: 60, total_active_nodes: 84 }
expected_counts.each do |key, expected|
  actual = rules_payload[:counts].fetch(key)
  errors << "#{key}: expected #{expected}, got #{actual}" unless actual == expected
end

active_ids = flat_nodes.map { |node| node[:node_id] }
errors << "active node IDs are not unique" unless active_ids.uniq.length == active_ids.length
errors << "rule card count is not 60" unless rule_cards.length == 60
errors << "terminal node/card mismatch" unless rule_cards.map { |card| card[:node_id] }.sort == flat_nodes.select { |node| node[:is_terminal] }.map { |node| node[:node_id] }.sort

required = %i[node_id node_name terminal_level path_ids path_names definition include exclude adjacent_rules evidence_status positive_examples negative_examples]
rule_cards.each do |card|
  required.each do |field|
    value = card[field]
    empty = value.nil? || (value.respond_to?(:empty?) && value.empty?)
    errors << "#{card[:node_id]} missing #{field}" if empty
  end
  actual_positive = card[:positive_examples].any? { |ex| ex[:relation] == "positive" }
  if card[:evidence_status] != "provisional" && !actual_positive
    errors << "#{card[:node_id]} status #{card[:evidence_status]} lacks an A+B positive example"
  end
end

historic_v2_ids = CSV.read(V2_FLAT_PATH, headers: true, encoding: "bom|utf-8").map { |row| row["node_id"] }
errors << "L3-100 unexpectedly collides with historic v2" if historic_v2_ids.include?("L3-100")
errors << "historic L3-084 missing; ID-collision protection invalid" unless historic_v2_ids.include?("L3-084")
errors << "mapping does not cover all v2.1 nodes plus one new node" unless mapping_rows.length == v21_rows.length + 1
errors << "L2-048 should not be active" if active_ids.include?("L2-048")
errors << "L2-054 should not be active" if active_ids.include?("L2-054")
errors << "L3-100 should be active" unless active_ids.include?("L3-100")

report = <<~MD
  # Taxonomy v2.2 机械校验报告

  > 脚本：`TAXONOMY-V2-2-BUILD-AND-VALIDATE-20260902.rb`  
  > 结果：`#{errors.empty? ? "PASS" : "FAIL"}`  
  > 证据边界：只读取阶段 A+B 证据索引；阶段 D 未读取。

  ## 校验项

  - 结构计数：#{rules_payload[:counts].map { |k, v| "#{k}=#{v}" }.join("，")}
  - 60 个终点均有唯一规则卡：#{rule_cards.length == 60 ? "通过" : "失败"}
  - 所有规则卡必填字段非空：#{errors.none? { |e| e.include?("missing") } ? "通过" : "失败"}
  - 非 provisional 节点至少有 1 个 A+B 正例：#{errors.none? { |e| e.include?("lacks an A+B positive") } ? "通过" : "失败"}
  - 活跃节点 ID 唯一：#{active_ids.uniq.length == active_ids.length ? "通过" : "失败"}
  - `L3-100` 不与历史 v2 冲突，`L3-084` 保持保留：#{errors.none? { |e| e.include?("historic") || e.include?("collides") } ? "通过" : "失败"}
  - v2.1 全节点映射 + v2.2 新节点：#{mapping_rows.length}/#{v21_rows.length + 1}
  - v2.1 证据索引 SHA-256：`#{Digest::SHA256.file(EVIDENCE_PATH).hexdigest}`
  - v2.1 候选平表 SHA-256：`#{Digest::SHA256.file(V21_FLAT_PATH).hexdigest}`

  ## 错误

  #{errors.empty? ? "无。" : errors.map { |error| "- #{error}" }.join("\n")}

  ## 人工仍需关注的风险

  1. `L2-053` 虽有 4 个旧口径实例，但包含复合主题，保持 `provisional`。
  2. `L2-059` 的唯一旧实例可能主要是个人位置与边境询问；若迁移回放无干净公共正例，应整体移入候选池。
  3. `L3-030`、`L3-032`、`L3-074`、`L3-075`、`L3-077`、`L3-100` 仍需下一阶段实例验证。
  4. 正例仅表示 A+B 中存在可回放实例，不代表节点频率或产品优先级；负例是相邻节点实例或明确记录的证据不足说明。
MD

File.write(REPORT_PATH, report)

abort("Validation failed:\n- #{errors.join("\n- ")}") unless errors.empty?
puts "Generated and validated Taxonomy v2.2 artifacts."
