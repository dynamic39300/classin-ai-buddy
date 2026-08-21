import type { LucideIcon } from 'lucide-react';
import { WORKBUDDY_CAPABILITIES } from './capability-registry';

export type CapabilitySurfaceId = 'skills' | 'tools' | 'content' | 'files' | 'schedules' | 'settings';
export type CapabilityTab = { id: string; label: string };
export type CapabilityStatus = '已启用' | '可安装' | '更新可用' | '已安装' | '已停用' | '已连接' | '认证失败' | '策略阻断' | '待连接' | '可改编' | '已收藏' | '审核中' | '已解析' | '已同步' | '等待解析' | '无权访问' | '已阻断';
export type CapabilityAction = 'connect' | 'install' | 'update' | 'enable' | 'disable' | 'toggle-schedule' | 'favorite' | 'test' | 'edit' | 'preview' | 'source' | 'history' | 'details' | 'run';
export type CapabilityCommand = Readonly<{ itemId: string; status: CapabilityStatus; statusTone: CapabilityItem['statusTone']; message: string }>;
export type CapabilityCommandResult = Readonly<{ truth: '[模拟]'; outcome: 'succeeded' | 'blocked'; items: readonly CapabilityItem[]; message: string }>;

export type CapabilityItem = Readonly<{
  id: string;
  truth?: '[模拟]';
  title: string;
  subtitle: string;
  status: CapabilityStatus;
  statusTone: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  meta: readonly string[];
  tags: readonly string[];
  description: string;
  source: string;
  version?: string;
  permissions: readonly string[];
}>;

export type CapabilitySurfaceConfig = Readonly<{
  id: CapabilitySurfaceId;
  label: string;
  description: string;
  icon: LucideIcon;
  tabs: readonly CapabilityTab[];
}>;

const CAPABILITY_TABS: Record<CapabilitySurfaceId, readonly CapabilityTab[]> = {
  skills: [{ id: 'recommended', label: '推荐' }, { id: 'market', label: '技能广场' }, { id: 'mine', label: '我的 Skills' }],
  tools: [{ id: 'market', label: '工具广场' }, { id: 'mine', label: '我的 Tools' }],
  content: [{ id: 'market', label: '内容广场' }, { id: 'mine', label: '我的作品' }, { id: 'saved', label: '收藏' }],
  files: [{ id: 'all', label: '全部' }, { id: 'artifacts', label: '任务产物' }, { id: 'my-cloud', label: '我的云盘' }, { id: 'org-cloud', label: '组织云盘' }, { id: 'upload', label: '上传引用' }],
  schedules: [{ id: 'active', label: '进行中' }, { id: 'history', label: '运行历史' }],
  settings: [],
};

export const CAPABILITY_SURFACE_CONFIGS: readonly CapabilitySurfaceConfig[] = WORKBUDDY_CAPABILITIES.map(({ id, label, description, icon }) => ({ id, label, description, icon, tabs: CAPABILITY_TABS[id] }));

export const SKILL_ITEMS: readonly CapabilityItem[] = [
  { id: 'skill-courseware-structure', title: '智能课件结构设计', subtitle: '把教学目标组织为可讲授的页面结构', status: '已启用', statusTone: 'success', meta: ['官方能力', '适用：课件生成'], tags: ['课程生产', '结构设计'], description: '根据课程目标、单元活动和课堂时长，生成可审阅的智能课件结构。', source: 'ClassIn WorkBuddy', version: 'v1.4.0', permissions: ['读取课程与单元', '写入 Artifact 草稿'] },
  { id: 'skill-homework-cluster', title: '作业错因聚类', subtitle: '从提交证据中整理共性问题与错因候选', status: '可安装', statusTone: 'info', meta: ['机构推荐', '适用：作业订正'], tags: ['作业分析', '证据'], description: '保留来源提交引用，将观察到的错误与带置信度的错因候选分开呈现。', source: '星河学习中心', version: 'v0.9.2', permissions: ['读取作业提交摘要', '不读取无关班级'] },
  { id: 'skill-lesson-rehearsal', title: '备课演练反馈', subtitle: '从演练记录中提炼可观察的教学改进点', status: '更新可用', statusTone: 'warning', meta: ['个人 Skill', '适用：备课演练'], tags: ['演练', '改进'], description: '关联演练时间戳和课件版本，输出可复查的反馈草稿。', source: '王老师', version: 'v2.1.0', permissions: ['读取演练记录', '读取课件版本'] },
  { id: 'skill-goal-clarifier', title: '教学目标澄清', subtitle: '识别目标、范围与交付物之间的缺口', status: '已安装', statusTone: 'neutral', meta: ['官方能力', '适用：所有任务'], tags: ['目标', '上下文'], description: '在开始执行前，把教师目标转换为可确认的任务计划。', source: 'ClassIn WorkBuddy', version: 'v1.2.1', permissions: ['读取当前任务上下文'] },
];

export const TOOL_ITEMS: readonly CapabilityItem[] = [
  { id: 'tool-classin-space', title: 'ClassIn Space', subtitle: '课程、资源与 Artifact 的业务存储', status: '已连接', statusTone: 'success', meta: ['ClassIn', '最近校验：刚刚'], tags: ['课程', '文件'], description: '在授权范围内读取课程对象、资源引用并保存教师确认后的草稿。', source: 'ClassIn', version: 'connected', permissions: ['读取教师可见课程', '写入已审批草稿'] },
  { id: 'tool-content-library', title: '机构内容库', subtitle: '星河学习中心共享教学资源', status: '已连接', statusTone: 'success', meta: ['机构连接', '最近校验：今天 09:12'], tags: ['内容', '组织'], description: '提供机构共享内容的检索与来源引用，不改变内容所有权。', source: '星河学习中心', version: 'v3', permissions: ['读取已发布资源', '读取授权范围'] },
  { id: 'tool-calendar', title: '课程表与日程', subtitle: '为定时任务提供课程时间范围', status: '认证失败', statusTone: 'danger', meta: ['ClassIn', '需要重新授权'], tags: ['日程', '定时'], description: '读取教师课程表和时间窗口，认证失败时定时任务会进入阻断状态。', source: 'ClassIn', version: 'auth required', permissions: ['读取教师日程'] },
  { id: 'tool-web-search', title: '公开资料检索', subtitle: '在允许的公开来源中查找教学资料', status: '策略阻断', statusTone: 'warning', meta: ['外部连接', '机构策略限制'], tags: ['检索', '外部'], description: '当前机构策略不允许在含学生上下文的任务中使用该连接。', source: '机构策略', version: 'blocked', permissions: ['仅公开来源', '不得读取学生敏感信息'] },
];

export const CONTENT_ITEMS: readonly CapabilityItem[] = [
  { id: 'content-wave-visual', title: '机械波概念演示', subtitle: '高中物理 · 机械波 · 课件模板', status: '可改编', statusTone: 'info', meta: ['王老师', '更新于 2 天前', '已授权'], tags: ['课件', '高中物理'], description: '以波速、频率和波长关系为主线的智能课件模板，支持改编为当前课程目标。', source: '我的作品', version: 'v2.0', permissions: ['可引用', '可改编'] },
  { id: 'content-momentum-review', title: '动量守恒单元复习', subtitle: '高中物理 · 单元复习 · 练习素材', status: '已收藏', statusTone: 'success', meta: ['机构内容库', '更新于 5 天前', '已授权'], tags: ['练习', '复习'], description: '面向动量守恒单元的课堂复习和随堂练习素材。', source: '机构内容库', version: 'v1.3', permissions: ['可引用', '不可直接发布'] },
  { id: 'content-classroom-inquiry', title: '课堂探究活动模板', subtitle: '通用 · 课堂活动 · 探究', status: '审核中', statusTone: 'warning', meta: ['李老师', '更新于 1 周前', '审核中'], tags: ['活动', '探究'], description: '一个可在课程活动中复用的探究模板，作品审核通过后才可改编。', source: '内容广场', version: 'v0.8', permissions: ['仅预览'] },
];

export const FILE_ITEMS: readonly CapabilityItem[] = [
  { id: 'file-courseware-v2', title: '函数单调性智能课件', subtitle: '智能课件 · 8 页 · v2', status: '已解析', statusTone: 'success', meta: ['任务产物', 'Run：生成函数单调性课件', '2 小时前', '12.4 MB'], tags: ['Artifact', '课件'], description: '来自“生成函数单调性智能课件”任务的当前版本。', source: 'WorkBuddy Artifact', version: 'v2', permissions: ['教师可见', '可作为任务输入'] },
  { id: 'file-wave-template', title: '机械波课堂素材包', subtitle: '文件夹 · 6 个文件', status: '已同步', statusTone: 'success', meta: ['组织云盘', '归属：机械波课程', '昨天', '已授权'], tags: ['素材', '组织云盘'], description: '课程“机械波”对应的组织共享素材，保留来源目录引用。', source: '组织云盘 / 高中物理', version: '最新', permissions: ['读取', '不可删除'] },
  { id: 'file-homework-import', title: '动量守恒作业提交摘要', subtitle: 'CSV · 已脱敏 · 42 行', status: '等待解析', statusTone: 'warning', meta: ['任务输入', 'Run：作业订正', '昨天', '96 KB'], tags: ['作业', '证据'], description: '准备加入作业订正任务的提交摘要，尚未进入任何执行中的 Run。', source: '我的文件', version: 'v1', permissions: ['教师可见', '敏感字段已裁剪'] },
  { id: 'file-restricted-reference', title: '机构题库原始导出', subtitle: 'XLSX · 需要申请访问', status: '无权访问', statusTone: 'danger', meta: ['组织云盘', '权限：未授权', '上周'], tags: ['题库', '受限'], description: '当前教师没有该文件的读取权限，不能作为任务 Context；可向机构管理员申请。', source: '组织云盘 / 机构题库', version: 'v0.1', permissions: ['无权读取', '不可预览', '可申请访问'] },
];

export const SCHEDULE_ITEMS: readonly CapabilityItem[] = [
  { id: 'schedule-weekly-summary', title: '每周一生成教学周报', subtitle: '每周一 · 08:00 · ClassIn 教研中心', status: '已启用', statusTone: 'success', meta: ['下次：8 月 24 日 08:00', '最近：成功'], tags: ['课程总结', '周报'], description: '读取上一周课程、作业和课堂记录，生成待教师复查的教学周报。', source: '教师创建', permissions: ['读取课程与作业摘要', '结果需教师复查'] },
  { id: 'schedule-homework-review', title: '作业截止后生成错题摘要', subtitle: '作业截止后 · 等待日程连接', status: '已阻断', statusTone: 'danger', meta: ['原因：课程表连接认证失败', '上次：未运行'], tags: ['作业', '错因分析'], description: '作业截止后触发作业订正 Run；需恢复日程连接后才会运行。', source: '教师创建', permissions: ['读取指定作业提交', '不自动发布订正'] },
  { id: 'schedule-lesson-prep', title: '课前 24 小时检查准备项', subtitle: '每次课程前 · 08:30', status: '已停用', statusTone: 'neutral', meta: ['下次：未安排', '最近：8 月 10 日'], tags: ['课前准备', '检查'], description: '检查课件、活动和资源是否齐备，并生成待办草稿。', source: '教师创建', permissions: ['读取课程和资源', '只创建待办草稿'] },
];

export function getCapabilitySurface(surface: CapabilitySurfaceId): CapabilitySurfaceConfig {
  return CAPABILITY_SURFACE_CONFIGS.find((item) => item.id === surface) ?? CAPABILITY_SURFACE_CONFIGS[0]!;
}

export function filterCapabilityItems(items: readonly CapabilityItem[], query: string, tab: string): readonly CapabilityItem[] {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery = !normalized || [item.title, item.subtitle, item.description, item.source, ...item.tags].join(' ').toLowerCase().includes(normalized);
    if (!matchesQuery) return false;
    if (tab === 'mine') return ['已启用', '已安装', '更新可用', '已连接', '认证失败', '策略阻断'].includes(item.status);
    if (tab === 'saved') return item.status === '已收藏';
    if (tab === 'artifacts') return item.source === 'WorkBuddy Artifact';
    if (tab === 'my-cloud') return item.source === '我的文件';
    if (tab === 'org-cloud') return item.source.includes('组织云盘');
    if (tab === 'upload') return item.source.includes('上传') || item.source === '我的文件';
    if (tab === 'cloud') return item.source.includes('云盘');
    if (tab === 'active') return item.status === '已启用' || item.status === '已阻断';
    if (tab === 'history') return item.meta.some((value) => value.includes('最近'));
    return true;
  });
}

export function surfaceItems(surface: CapabilitySurfaceId): readonly CapabilityItem[] {
  const items = surface === 'skills' ? SKILL_ITEMS : surface === 'tools' ? TOOL_ITEMS : surface === 'content' ? CONTENT_ITEMS : surface === 'files' ? FILE_ITEMS : SCHEDULE_ITEMS;
  return items.map((item) => ({ ...item, truth: '[模拟]' as const }));
}

/** Mock Adapter seam: UI submits a governed command and receives a normalized result. */
export function executeCapabilityCommand(items: readonly CapabilityItem[], command: CapabilityCommand): CapabilityCommandResult {
  const target = items.find((item) => item.id === command.itemId);
  if (!target) {
    return { truth: '[模拟]', outcome: 'blocked', items, message: '该能力已不存在，操作未执行。' };
  }
  if (target.status === '策略阻断') return { truth: '[模拟]', outcome: 'blocked', items, message: '当前机构策略阻断该工具，操作未执行。' };
  return {
    truth: '[模拟]',
    outcome: 'succeeded',
    items: items.map((item) => item.id === command.itemId ? { ...item, status: command.status, statusTone: command.statusTone } : item),
    message: command.message,
  };
}
