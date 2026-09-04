import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  CircleHelp,
  Construction,
  Gem,
  Info,
  LogOut,
  Monitor,
  Settings,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { AppRole } from '@domain/account/role';
import styles from './SettingsWorkspace.module.css';

export type SettingsSectionId =
  | 'benefits'
  | 'profile'
  | 'security'
  | 'system'
  | 'classroom'
  | 'device-check'
  | 'file-transfer'
  | 'about'
  | 'help'
  | 'switch-account'
  | 'quit';

type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  Icon: LucideIcon;
  boundary?: string;
};

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'benefits', label: '我的权益', Icon: Gem },
  { id: 'profile', label: '个人信息', Icon: UserRound, boundary: '个人资料读取、编辑和保存尚未接入。' },
  { id: 'security', label: '账号与安全', Icon: ShieldCheck, boundary: '认证、安全校验和账号操作尚未接入。' },
  { id: 'system', label: '系统设置', Icon: Settings, boundary: '系统配置读取、开关和保存规则缺少证据。' },
  { id: 'classroom', label: '教室设置', Icon: Monitor, boundary: '教室配置和课堂引擎尚未接入。' },
  { id: 'device-check', label: '设备检测', Icon: Activity, boundary: '硬件检测、权限申请和检测结果尚未接入。' },
  { id: 'file-transfer', label: '文件传输', Icon: ArrowDownUp, boundary: '设备发现、传输任务和进度服务尚未接入。' },
  { id: 'about', label: '关于软件', Icon: Info, boundary: '版本服务和更新检查尚未接入。' },
  { id: 'help', label: '帮助中心', Icon: CircleHelp, boundary: '在线帮助、客服和外部跳转尚未接入。' },
  { id: 'switch-account', label: '切换账号', Icon: SwitchCamera, boundary: '账号列表、认证和切换会话尚未接入。' },
  { id: 'quit', label: '退出软件', Icon: LogOut, boundary: '退出确认、会话清理和客户端关闭尚未接入。' },
];

function resolveSettingsSection(value: string | undefined): SettingsSectionId {
  return SETTINGS_SECTIONS.some(({ id }) => id === value) ? value as SettingsSectionId : 'benefits';
}

function PlaceholderSection({ section, onBack }: { section: SettingsSection; onBack: () => void }) {
  return (
    <section className={styles.placeholder} aria-labelledby="settings-detail-title">
      <span className={styles.placeholderIcon}><Construction aria-hidden="true" size={24} /></span>
      <div>
        <span className={styles.eyebrow}>PC 设置补充 · Placeholder</span>
        <h2 id="settings-detail-title">{section.label}</h2>
        <p>{section.boundary}</p>
        <p className={styles.boundary}>当前只保留栏目入口和边界说明，不提供配置项、保存或真实账号操作。</p>
      </div>
      <button className={styles.secondaryButton} type="button" onClick={onBack}><ArrowLeft aria-hidden="true" size={16} />返回我的权益</button>
    </section>
  );
}

function BenefitsSection({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <section className={styles.benefits} aria-labelledby="settings-detail-title">
      <header className={styles.accountHeader}>
        <span className={styles.avatar} aria-hidden="true">金</span>
        <div><span className={styles.eyebrow}>账户名</span><h2 id="settings-detail-title">金石</h2><span className={styles.plan}>免费版</span></div>
        <button className={styles.upgradeButton} type="button" onClick={onUpgrade}><Sparkles aria-hidden="true" size={16} />升级</button>
      </header>
      <dl className={styles.entitlementMetrics}>
        <div><dt>每月免费课堂剩余次数</dt><dd>10次</dd></div>
        <div><dt>组织云存储</dt><dd>0/5G</dd></div>
      </dl>
      <section className={styles.benefitDetails} aria-labelledby="benefit-description-title">
        <header><Gem aria-hidden="true" size={18} /><h3 id="benefit-description-title">权益说明</h3></header>
        <ul><li>单次课堂最长 3 小时</li><li>免费解锁 37 种教学工具</li><li>免费云端录制回放</li><li>免费 AI 教学助手</li></ul>
      </section>
    </section>
  );
}

export function SettingsWorkspace({
  role,
  section,
  onSectionChange,
}: {
  role: AppRole;
  section?: string;
  onSectionChange?: (section: SettingsSectionId) => void;
}) {
  const [localActiveId, setLocalActiveId] = useState<SettingsSectionId>(() => resolveSettingsSection(section));
  const [feedback, setFeedback] = useState<string | null>(null);
  const activeId = section === undefined ? localActiveId : resolveSettingsSection(section);
  const activeSection = SETTINGS_SECTIONS.find(({ id }) => id === activeId) ?? SETTINGS_SECTIONS[0]!;

  const selectSection = (next: SettingsSectionId) => {
    setLocalActiveId(next);
    setFeedback(null);
    onSectionChange?.(next);
  };

  return (
    <div className={styles.page} role="region" aria-label={role === 'teacher' ? '老师账号与设置' : '学生账号与设置'}>
      <div className={styles.workspace}>
        <nav className={styles.navigation} aria-label="设置栏目">
          {SETTINGS_SECTIONS.map(({ id, label, Icon }) => <button type="button" key={id} aria-current={activeId === id ? 'page' : undefined} onClick={() => selectSection(id)}><Icon aria-hidden="true" size={17} /><span>{label}</span></button>)}
        </nav>
        <main className={styles.detail}>
          {activeSection.id === 'benefits'
            ? <BenefitsSection onUpgrade={() => setFeedback('Placeholder：升级入口有 PC 截图证据，但支付和套餐服务未接入。')} />
            : <PlaceholderSection section={activeSection} onBack={() => selectSection('benefits')} />}
        </main>
      </div>
      {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
    </div>
  );
}
