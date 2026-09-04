export const AGENTIN_EVIDENCE_ID = 'notion-agentin-20260903' as const;

export type AgentInMarketQuery = Readonly<{
  text: string;
}>;

export type AgentInCardView = Readonly<{
  id: string;
  title: string;
  description: string;
  favoritesLabel: string;
  authorLabel: string;
  availability: 'available' | 'unavailable_in_context';
  badge: 'hot' | 'knowledge_base' | null;
  avatarAsset: string;
  sourceEvidence: typeof AGENTIN_EVIDENCE_ID;
}>;

export type AgentInFavoriteView = Readonly<{
  id: string;
  label: string;
  avatarAsset: string;
  pinned: boolean;
}>;

export type AgentInMarketView = Readonly<{
  gradeLabel: '小学·二年级';
  subjects: readonly ['语文', '数学', '科学', '道德与法治', '其他'];
  sorts: readonly ['最热', '最新'];
  favorites: readonly AgentInFavoriteView[];
  recommendations: readonly AgentInCardView[];
  available: readonly AgentInCardView[];
  unavailableInContext: readonly AgentInCardView[];
  totalMatches: number;
}>;

type AgentInFixture = AgentInCardView & Readonly<{
  catalogVisible: boolean;
}>;

const avatar = (id: string) => `/reference/agentin/avatars/${id}.png`;

function fixture(
  id: string,
  title: string,
  description: string,
  favoritesLabel: string,
  author: string,
  options: Readonly<{
    availability?: AgentInCardView['availability'];
    badge?: AgentInCardView['badge'];
    catalogVisible?: boolean;
  }> = {},
): AgentInFixture {
  return Object.freeze({
    id,
    title,
    description,
    favoritesLabel: `${favoritesLabel} 人收藏`,
    authorLabel: `@${author}`,
    availability: options.availability ?? 'available',
    badge: options.badge ?? null,
    avatarAsset: avatar(id),
    sourceEvidence: AGENTIN_EVIDENCE_ID,
    catalogVisible: options.catalogVisible ?? true,
  });
}

const CARD_FIXTURES: readonly AgentInFixture[] = Object.freeze([
  fixture('doushen-tutor', '豆神AI 私教问答', '欢迎来到豆神 AI 私教问答，我是专为 K12 学生打造的「双脑驱动型学习伙伴」。', '5.9W', 'ClassIn', { badge: 'hot' }),
  fixture('luxun', '鲁迅', '我是鲁迅，原名周树人。我弃医从文，只为唤醒沉睡的国民。', '1.3W', 'ClassIn'),
  fixture('libai', '李白', '我是李白，字太白，号青莲居士，人称诗仙。我爱喝酒、游历山河。', '1.2W', 'ClassIn'),
  fixture('career-navigator', '职业领航员', '职业世界的指南针，解析地理教师、测绘工程师、旅游规划师等职业路径。', '7858', 'ClassIn'),
  fixture('reading-partner', '阅读伙伴', '我是你的专属阅读伴侣，专注于构建深度阅读与思维训练的融合空间。', '7673', 'ClassIn'),
  fixture('confucius', '孔子', '我是孔子，鲁国人，周游列国十四载未得重用，却教出三千弟子。', '2643', 'ClassIn'),
  fixture('book-list', '课外书单推荐', '我是你的专属阅读导航员，擅长根据你的年龄、兴趣和学习目标个性化推荐。', '2264', 'ClassIn'),
  fixture('dufu', '杜甫', '我是杜甫，字子美，世称诗圣。我的诗多写民间疾苦、家国兴衰。', '2002', 'ClassIn'),
  fixture('knowledge-understanding', '知识理解', '抽象概念的翻译官，擅长用生活案例拆解复杂原理。', '1399', 'ClassIn'),
  fixture('sinology-master', '国学大师', '我是国学智囊，深谙中华传统文化。有任何关于国学的问题，欢迎随时问我。', '1195', 'ClassIn'),
  fixture('little-teacher', '我是小老师', '想象你正在向一个完全不懂这个概念的人解释这个概念。使用简单的语言。', '811', 'ClassIn'),
  fixture('socrates', '苏格拉底助手', '思维训练场的引导者，通过层层追问帮你穿透表象。面对地理难题时。', '542', 'ClassIn'),
  fixture('composition-coach', '学生语文作文辅导专家', '我是你的作文成长伙伴，虽然我不直接替你写，但我会用提问填空的方式。', '350', 'ClassIn'),
  fixture('daily-quote', '每日名言', '教育智慧积累平台，智能土建经过筛选的中外教育金句，为教学实践注入思想养分。', '205', 'ClassIn'),
  fixture('read-poetry', '认真读古诗', '我是古诗研读小助手，专注解码传统文化基因，让古典文学在课堂中焕发活力。', '171', 'ClassIn'),
  fixture('classical-translation', '文言文翻译官', '我是文言文翻译官，精通古文语义与现代转化。无论经典名篇还是生僻语句。', '159', 'ClassIn'),
  fixture('idiom-teacher', '成语老师', '我是你的成语学习老师，专为语文课内外学习设计，遇到不懂的成语时。', '109', 'ClassIn'),
  fixture('question-extractor', '试题内容提取【兼容ClassIn…】', '支持上传 PDF、图片等包含试题内容的附件，并将其识别为 ClassIn 题库。', '14', '张润臣'),
  fixture('prompt-navigator', '提示词领航员', '专门帮助大家写好提示词的智能体！', '13', '青煜凡'),
  fixture('idiom-origin', '成语溯源与应用专家', '输入一个成语，我会输出其“前世”（历史典故/出处）、“今生”（现代语境下的造句和误用场景）。', '8', 'ClassIn'),
  fixture('animation-recommender', '推荐一部动画片', '我是推荐动画片的专家，快来和我对话吧！', '6', '伍海鸥'),
  fixture('reason-helper', '写理由小能手', '我想养小动物，能说出许多理由，快来问问我吧！', '4', '伍海鸥'),
  fixture('fairy-tale-wish', '童话心愿发布会', '故事创编评价智能体。', '3', '诗雅'),
  fixture('recess-game-designer', '课间游戏设计玩伴', '你是一位充满好奇心、热情洋溢的“课间游戏设计玩伴”。', '2', '梦女孩'),
  fixture('scenery-poem', '美景小诗—AI小助手', '我是你的美景小诗小能手，请你发你写的小诗给我，我会给你点赞或批评。', '2', '邓莹莹'),
  fixture('recess-game-reviewer', '课间游戏评价智能体', '# 角色定位 你是一位亲切、专业且充满活力的课间游戏评价智能体。', '2', '梦女孩'),
  fixture('biography-card', '人物科普简介卡', '人物科普小助手，用户仅输入任意人物姓名，即可自动生成整洁、精简的简介。', '2', '瑶瑶'),
  fixture('rain-writing', '写雨小助手', '我是写生活中的雨小助手，我能帮助你写得更好哟！', '1', '伍海鸥'),
  fixture('geography-encyclopedia', '地理百科大全', '全球知识的立体沙盘，覆盖七大洲地貌特征、四大洋深度数据和气候类型分布。', '323', 'ClassIn', { catalogVisible: false }),
  fixture('stroke-order', '汉字笔顺', '我是专为老师汉字教学场景设计的辅助工具，聚焦小学低学段识字写字教学的需求。', '3629', 'ClassIn', { availability: 'unavailable_in_context' }),
  fixture('nobook', 'NOBOOK', 'NOBOOK 虚拟实验的智能检索与展示，使教师能够在授课过程中无缝调用所需实验资源。', '111', 'ClassIn', { availability: 'unavailable_in_context' }),
  fixture('homework-photo-correction', '作业拍照校正', '专为教学场景下的纸质作业数字化提供辅助。依托 AI 视觉校正技术。', '87', 'ClassIn', { availability: 'unavailable_in_context' }),
  fixture('question-bank', '题库出题', '直连 ClassIn 官方海量题库，覆盖全学段、全学科教学需求。', '73', 'ClassIn', { availability: 'unavailable_in_context' }),
  fixture('powerup', 'PowerUp点读书', '课前预习不知道单词怎么念？课后复习想再听一遍对话？', '25', '青言研习', { availability: 'unavailable_in_context' }),
  fixture('summary-master', '总结大师', '给我你看到的文字与文件，我来给你总结提炼。', '17', '郭金亮', { availability: 'unavailable_in_context' }),
  fixture('minutes-extractor', '提炼纪要', '我是你的小助手，可以帮你整理总结纪要。', '11', '郭金亮', { availability: 'unavailable_in_context', badge: 'knowledge_base' }),
  fixture('organization-question-bank', '组织题库出题', '直连机构专属题库资源，充分利用学校积累的优质试题资源和教师的优质教研内容。', '4', 'ClassIn', { availability: 'unavailable_in_context' }),
]);

const RECOMMENDATION_IDS = Object.freeze([
  'daily-quote',
  'idiom-origin',
  'geography-encyclopedia',
  'confucius',
]);

const FAVORITE_FIXTURES: readonly AgentInFavoriteView[] = Object.freeze([
  Object.freeze({ id: 'class-knowledge', label: '我的班级知识库', avatarAsset: avatar('class-knowledge'), pinned: true }),
  Object.freeze({ id: 'math-thinking', label: '数学思维教练', avatarAsset: avatar('math-thinking'), pinned: false }),
  Object.freeze({ id: 'luxun-favorite', label: '鲁迅', avatarAsset: avatar('luxun'), pinned: false }),
  Object.freeze({ id: 'dufu-favorite', label: '杜甫', avatarAsset: avatar('dufu'), pinned: false }),
  Object.freeze({ id: 'study-partner', label: '学小伴', avatarAsset: avatar('study-partner'), pinned: false }),
  Object.freeze({ id: 'libai-favorite', label: '李白', avatarAsset: avatar('libai'), pinned: false }),
  Object.freeze({ id: 'avatar-double', label: 'xinlei的替身', avatarAsset: avatar('avatar-double'), pinned: false }),
]);

const SUBJECTS = Object.freeze(['语文', '数学', '科学', '道德与法治', '其他'] as const);
const SORTS = Object.freeze(['最热', '最新'] as const);

function asCard(fixtureRecord: AgentInFixture): AgentInCardView {
  const { catalogVisible, ...view } = fixtureRecord;
  void catalogVisible;
  return view;
}

export function getAgentInMarketView(query: AgentInMarketQuery = { text: '' }): AgentInMarketView {
  const normalized = query.text.trim().toLocaleLowerCase('zh-CN');
  const matches = CARD_FIXTURES.filter((item) => {
    if (!normalized) return item.catalogVisible;
    return `${item.title} ${item.description} ${item.authorLabel}`.toLocaleLowerCase('zh-CN').includes(normalized);
  });
  const recommendations = RECOMMENDATION_IDS.map((id) => CARD_FIXTURES.find((item) => item.id === id))
    .filter((item): item is AgentInFixture => Boolean(item))
    .map(asCard);
  const available = matches.filter(({ availability }) => availability === 'available').map(asCard);
  const unavailableInContext = matches.filter(({ availability }) => availability === 'unavailable_in_context').map(asCard);

  return Object.freeze({
    gradeLabel: '小学·二年级',
    subjects: SUBJECTS,
    sorts: SORTS,
    favorites: FAVORITE_FIXTURES,
    recommendations: Object.freeze(recommendations),
    available: Object.freeze(available),
    unavailableInContext: Object.freeze(unavailableInContext),
    totalMatches: available.length + unavailableInContext.length,
  });
}
