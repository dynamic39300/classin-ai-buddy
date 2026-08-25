import type { CapabilityItem, CapabilitySurfaceId } from './capability-workspace';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';

const SKILLS: readonly CapabilityItem[] = Object.freeze([
  { id: 'standalone-skill-courseware', truth: '[模拟]', title: '智能课件结构设计', subtitle: '把教学目标组织为可讲授的页面结构', status: '已启用', statusTone: 'success', meta: ['官方能力', '适用：课件生成'], tags: ['课程生产', '结构设计'], description: '根据教师提供的范围和课堂时长生成可审阅的智能课件结构。', source: TEACHBUDDY_BRAND.shortName, version: 'v1.4.0', permissions: ['读取当前任务输入', '写入个人 Artifact 草稿'] },
  { id: 'standalone-skill-goal', truth: '[模拟]', title: '教学目标澄清', subtitle: '识别目标、范围与交付物之间的缺口', status: '已安装', statusTone: 'neutral', meta: ['官方能力', '适用：所有任务'], tags: ['目标', '上下文'], description: '在执行前把教师目标转换为可确认的任务计划。', source: TEACHBUDDY_BRAND.shortName, version: 'v1.2.1', permissions: ['读取当前任务上下文'] },
  { id: 'standalone-skill-rehearsal', truth: '[模拟]', title: '备课演练反馈', subtitle: '从上传的演练资料提炼教学改进点', status: '更新可用', statusTone: 'warning', meta: ['个人 Skill', '适用：备课演练'], tags: ['演练', '改进'], description: '关联教师主动上传的演练资料和课件版本，输出反馈草稿。', source: '当前教师', version: 'v2.1.0', permissions: ['读取教师主动选择的文件'] },
  { id: 'standalone-skill-geometry', truth: '[模拟]', title: '几何解题', subtitle: '生成可验证的几何推理与图形说明', status: '可安装', statusTone: 'info', meta: ['教师社区', '适用：数学'], tags: ['几何', '讲题'], description: '将题目条件、推理步骤和可视化构图分层呈现，便于教师复查。', source: '教师社区', version: 'v0.8.7', permissions: ['读取当前题目内容', '生成个人解题草稿'] },
]);

const TOOLS: readonly CapabilityItem[] = Object.freeze([
  { id: 'standalone-tool-generation', truth: '[模拟]', title: `${TEACHBUDDY_BRAND.shortName} 内容生成`, subtitle: '独立产品内置能力', status: '已连接', statusTone: 'success', meta: ['http', '由独立产品托管'], tags: ['内置工具', '内容生成'], description: '提供文字转语音、AI 生图和网页资料检索能力。', source: TEACHBUDDY_BRAND.shortName, permissions: ['仅访问当前任务授权的数据'] },
  { id: 'standalone-tool-file-parser', truth: '[模拟]', title: '个人文件解析', subtitle: '解析当前账号主动上传的资料', status: '已连接', statusTone: 'success', meta: ['http', '个人工作区'], tags: ['文件', '解析'], description: '提取 PDF、DOCX 与 PPTX 的文本结构，作为当前任务输入。', source: TEACHBUDDY_BRAND.shortName, permissions: ['仅访问个人文件库中明确选择的文件'] },
  { id: 'standalone-tool-web', truth: '[模拟]', title: '网页内容读取', subtitle: '网页内容转为任务资料', status: '可安装', statusTone: 'info', meta: ['http', '需教师确认网址'], tags: ['网页', '资料'], description: '读取教师指定的公开网页并形成带来源的任务材料。', source: '第三方工具', permissions: ['仅访问教师明确提交的网址'] },
]);

const SCHEDULES: readonly CapabilityItem[] = Object.freeze([
  { id: 'standalone-schedule-weekly-plan', truth: '[模拟]', title: '每周一生成个人教学计划', subtitle: '每周一 · 08:00 · 个人工作区', status: '已启用', statusTone: 'success', meta: ['下次：8 月 31 日 08:00', '最近：成功'], tags: ['教学计划', '周任务'], description: '根据教师保存的任务目标和个人资料生成待复查计划。', source: '当前教师', permissions: ['读取个人任务和文件摘要', '结果需教师复查'] },
  { id: 'standalone-schedule-material-check', truth: '[模拟]', title: '课前检查个人备课材料', subtitle: '按教师设定时间运行', status: '已停用', statusTone: 'neutral', meta: ['下次：未安排', '最近：8 月 20 日'], tags: ['课前准备', '检查'], description: '检查个人文件库中的课件与资料是否齐备，并生成待办草稿。', source: '当前教师', permissions: ['读取个人文件库', '只创建个人待办草稿'] },
]);

export function standaloneCapabilityItems(surface: CapabilitySurfaceId): readonly CapabilityItem[] {
  const source = surface === 'skills' ? SKILLS : surface === 'tools' ? TOOLS : surface === 'schedules' ? SCHEDULES : [];
  return source.map((item) => ({ ...item }));
}
