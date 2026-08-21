import { CalendarClock, FileText, FolderOpen, Settings, Shapes, Wrench, type LucideIcon } from 'lucide-react';

export type WorkBuddyCapability = {
  id: 'skills' | 'tools' | 'content' | 'files' | 'schedules' | 'settings';
  label: string;
  description: string;
  icon: LucideIcon;
  placement: 'resource' | 'system';
};

export const WORKBUDDY_CAPABILITIES: readonly WorkBuddyCapability[] = [
  { id: 'skills', label: '技能市场', description: '发现、安装与管理可被任务调用的专业能力。', icon: Shapes, placement: 'resource' },
  { id: 'tools', label: '工具连接', description: '连接与治理 MCP、ClassIn 业务动作及外部工具。', icon: Wrench, placement: 'resource' },
  { id: 'content', label: '内容资源', description: '管理可复用的教学素材、模板与内容来源。', icon: FileText, placement: 'resource' },
  { id: 'files', label: '我的文件', description: '查看 WorkBuddy 在 ClassIn Space 中创建或引用的文件。', icon: FolderOpen, placement: 'resource' },
  { id: 'schedules', label: '定时任务', description: '创建触发标准 Agent Run 的自动化规则。', icon: CalendarClock, placement: 'system' },
  { id: 'settings', label: '设置', description: '管理模型、连接、数据边界、通知与反馈。', icon: Settings, placement: 'system' },
];

export function getWorkBuddyCapability(section: string) {
  return WORKBUDDY_CAPABILITIES.find(({ id }) => id === section);
}
