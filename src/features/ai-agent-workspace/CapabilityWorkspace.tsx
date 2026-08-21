import { Check, ChevronRight, CircleAlert, CircleCheck, Clock3, ExternalLink, FileText, FolderOpen, LoaderCircle, MoreHorizontal, Search, Settings2, Shapes, TestTube2, Wrench, X } from 'lucide-react';
import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { executeCapabilityCommand, getCapabilitySurface, filterCapabilityItems, surfaceItems, type CapabilityAction, type CapabilityItem, type CapabilityStatus, type CapabilitySurfaceId } from './capability-workspace';
import styles from './CapabilityWorkspace.module.css';

type CapabilityWorkspaceProps = Readonly<{ surface: CapabilitySurfaceId }>;
type Feedback = Readonly<{ tone: 'success' | 'warning'; text: string }>;

const SETTINGS_SECTIONS = [
  { id: 'general', label: '通用' }, { id: 'model', label: '模型' }, { id: 'data', label: '数据与备份' },
  { id: 'notifications', label: '消息与通知' }, { id: 'sandbox', label: '沙箱与执行环境' }, { id: 'about', label: '关于与能力真值' }, { id: 'feedback', label: '反馈' },
] as const;

function iconFor(surface: CapabilitySurfaceId) {
  if (surface === 'skills') return Shapes;
  if (surface === 'tools') return Wrench;
  if (surface === 'content') return FileText;
  if (surface === 'files') return FolderOpen;
  if (surface === 'schedules') return Clock3;
  return Settings2;
}

function statusIcon(item: CapabilityItem) {
  if (item.statusTone === 'danger') return CircleAlert;
  if (item.statusTone === 'warning') return LoaderCircle;
  if (item.statusTone === 'success') return CircleCheck;
  return Check;
}

export function CapabilityWorkspace({ surface }: CapabilityWorkspaceProps) {
  const config = getCapabilitySurface(surface);
  const [tab, setTab] = useState(config.tabs[0]?.id ?? 'general');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [items, setItems] = useState<CapabilityItem[]>(() => [...surfaceItems(surface)]);
  const [scheduleComposerOpen, setScheduleComposerOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('每周一 · 08:00');
  const [scheduleTarget, setScheduleTarget] = useState('当前教学范围');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [installCandidate, setInstallCandidate] = useState<CapabilityItem | null>(null);
  const [inspector, setInspector] = useState<{ kind: 'preview' | 'history' | 'source'; item: CapabilityItem } | null>(null);
  const [toolComposerOpen, setToolComposerOpen] = useState(false);
  const [toolName, setToolName] = useState('');
  const [toolEndpoint, setToolEndpoint] = useState('');
  const [toolSecret, setToolSecret] = useState('');
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [nextCreatedId, setNextCreatedId] = useState(1);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => filterCapabilityItems(items, query, tab).filter((item) => {
    const matchesSource = sourceFilter === 'all'
      || (sourceFilter === 'classin' && item.source.includes('ClassIn'))
      || (sourceFilter === 'organization' && (item.source.includes('组织') || item.source.includes('机构')))
      || (sourceFilter === 'personal' && (item.source.includes('我的') || item.source.includes('王老师')))
      || (sourceFilter === 'artifact' && item.source.includes('Artifact'))
      || (sourceFilter === 'cloud' && item.source.includes('云盘'));
    const matchesType = contentTypeFilter === 'all' || item.tags.some((tag) => tag === contentTypeFilter);
    return matchesSource && matchesType;
  }), [contentTypeFilter, items, query, sourceFilter, tab]);
  const selected = selectedId ? items.find(({ id }) => id === selectedId) ?? null : null;
  const selectItem = (item: CapabilityItem) => {
    lastTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedId(item.id);
    setFeedback(null);
  };
  const closeDetail = () => {
    setSelectedId(null);
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  };
  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDetail(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected]);
  const announce = (text: string, tone: Feedback['tone'] = 'success') => setFeedback({ text, tone });
  const updateStatus = (item: CapabilityItem, status: CapabilityStatus, statusTone: CapabilityItem['statusTone'], message: string) => {
    const result = executeCapabilityCommand(items, { itemId: item.id, status, statusTone, message });
    setItems([...result.items]);
    announce(result.message, result.outcome === 'blocked' ? 'warning' : 'success');
  };
  const removeItem = (item: CapabilityItem) => {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    closeDetail();
    announce(`${item.title} 已从当前列表移除。`);
  };
  const createSchedule = () => {
    const title = scheduleTitle.trim();
    if (!title) { announce('请先填写定时任务名称。', 'warning'); return; }
    if (editingScheduleId) {
      setItems((current) => current.map((entry) => entry.id === editingScheduleId ? { ...entry, title, subtitle: `${scheduleFrequency} · ${scheduleTarget}` } : entry));
    } else {
      setItems((current) => [...current, { id: `schedule-created-${nextCreatedId}`, truth: '[模拟]' as const, title, subtitle: `${scheduleFrequency} · ${scheduleTarget}`, status: '已启用', statusTone: 'success' as const, meta: ['下次：待计算', '最近：未运行'], tags: ['教师创建'], description: '按教师确认的目标与 Context 规则创建标准 Agent Run，结果仍需教师复查。', source: '教师创建', permissions: ['读取教师授权范围', '结果需教师复查'] }]);
      setNextCreatedId((value) => value + 1);
    }
    setScheduleTitle('');
    setEditingScheduleId(null);
    setScheduleComposerOpen(false);
    announce(`${title} 已${editingScheduleId ? '更新' : '创建'}，首次运行前仍会进入标准 Run 流程。`);
  };
  const editSchedule = (item: CapabilityItem) => {
    setEditingScheduleId(item.id);
    setScheduleTitle(item.title);
    setScheduleComposerOpen(true);
    closeDetail();
  };
  const createTool = () => {
    const title = toolName.trim();
    if (!title || !toolEndpoint.trim()) { announce('请填写工具名称和 Endpoint。', 'warning'); return; }
    if (editingToolId) setItems((current) => current.map((entry) => entry.id === editingToolId ? { ...entry, title, subtitle: `自定义连接 · ${toolEndpoint}` } : entry));
    else setItems((current) => [...current, { id: `tool-created-${nextCreatedId}`, truth: '[模拟]' as const, title, subtitle: `自定义连接 · ${toolEndpoint}`, status: '待连接', statusTone: 'neutral' as const, meta: ['个人连接', 'Secret 已掩码'], tags: ['自定义', '治理'], description: `连接地址：${toolEndpoint}。连接前会按当前机构策略检查权限范围。`, source: '个人连接', version: 'draft', permissions: ['Secret 仅用于连接测试', '任务调用前需教师审批'] }]);
    if (!editingToolId) setNextCreatedId((value) => value + 1);
    setToolName(''); setToolEndpoint(''); setToolSecret(''); setEditingToolId(null); setToolComposerOpen(false); announce(`${title} 已${editingToolId ? '更新' : '添加'}，请先测试连接。`);
  };
  const confirmInstall = () => {
    if (!installCandidate) return;
    updateStatus(installCandidate, '已安装', 'neutral', `${installCandidate.title} 已安装。你可以把它带入新任务。`);
    setInstallCandidate(null);
  };
  const editTool = (item: CapabilityItem) => {
    setEditingToolId(item.id); setToolName(item.title); setToolEndpoint(''); setToolComposerOpen(true); closeDetail();
  };

  if (surface === 'settings') return <SettingsSurface config={config} />;

  return (
    <main className={styles.page} aria-labelledby={`${surface}-workspace-title`}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>{createElement(iconFor(surface), { 'aria-hidden': true, size: 15 })}Work Buddy</span>
          <h1 id={`${surface}-workspace-title`}>{config.label}</h1>
          <p>{config.description}</p>
        </div>
        <span className={styles.truth}>[模拟] 体验数据 · 权限范围内可操作</span>
      </header>
      <div className={styles.body} data-detail={String(Boolean(selected))}>
        <section className={styles.main}>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search aria-hidden="true" size={16} />
              <input aria-label={`搜索${config.label}`} placeholder={`搜索${config.label}`} value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            {surface !== 'schedules' ? <select className={styles.filter} aria-label="筛选来源" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">全部来源</option><option value="classin">ClassIn</option><option value="organization">机构</option><option value="personal">个人</option>{surface === 'files' ? <><option value="artifact">任务产物</option><option value="cloud">云盘</option></> : null}</select> : null}
            {surface === 'content' ? <select className={styles.filter} aria-label="筛选内容类型" value={contentTypeFilter} onChange={(event) => setContentTypeFilter(event.target.value)}><option value="all">全部类型</option><option value="课件">课件</option><option value="活动">活动</option><option value="练习">练习</option></select> : null}
            {surface === 'schedules' ? <button className={styles.primary} type="button" onClick={() => setScheduleComposerOpen(true)}>新建定时任务</button> : null}
            {surface === 'tools' ? <button className={styles.primary} type="button" onClick={() => { setEditingToolId(null); setToolComposerOpen(true); }}>添加工具连接</button> : null}
          </div>
          {scheduleComposerOpen ? <section className={styles.composer} aria-label="新建定时任务" role="dialog"><div><strong>{editingScheduleId ? '编辑定时任务' : '新建定时任务'}</strong><p>保存后会创建规则，运行仍需经过标准 Agent Run 与教师复查。</p></div><input aria-label="定时任务名称" placeholder="例如：每周生成班级学情摘要" value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} /><select aria-label="触发周期" value={scheduleFrequency} onChange={(event) => setScheduleFrequency(event.target.value)}><option>每周一 · 08:00</option><option>每次课程前 24 小时</option><option>作业截止后</option></select><select aria-label="目标教学范围" value={scheduleTarget} onChange={(event) => setScheduleTarget(event.target.value)}><option>当前教学范围</option><option>高一（3）班 · 高中数学</option><option>ClassIn 教研中心</option></select><p className={styles.preview}>未来三次：按上述周期生成待确认 Run；通知：ClassIn 站内；审批：教师确认。</p><div className={styles.actions}><button className={styles.primary} type="button" onClick={createSchedule}>保存规则</button><button className={styles.secondary} type="button" onClick={() => { setScheduleComposerOpen(false); setEditingScheduleId(null); }}>取消</button></div></section> : null}
          {toolComposerOpen ? <section className={styles.composer} aria-label="添加工具连接" role="dialog"><div><strong>{editingToolId ? '编辑工具连接' : '添加工具连接'}</strong><p>Secret 仅用于连接测试，任务调用仍受策略和教师审批约束。</p></div><input aria-label="工具名称" placeholder="工具名称" value={toolName} onChange={(event) => setToolName(event.target.value)} /><select aria-label="连接类型" defaultValue="mcp"><option value="mcp">MCP 连接</option><option value="classin">ClassIn 业务连接</option><option value="webhook">Webhook</option></select><input aria-label="Endpoint" placeholder="Endpoint，例如 https://example.com/mcp" value={toolEndpoint} onChange={(event) => setToolEndpoint(event.target.value)} /><input aria-label="超时" placeholder="超时（秒）" defaultValue="30" /><input aria-label="Secret" type="password" placeholder="Secret（保存后掩码）" value={toolSecret} onChange={(event) => setToolSecret(event.target.value)} /><p className={styles.preview}>权限：读取教师授权范围；网络：仅访问 Endpoint；任务调用前需要教师审批。</p><div className={styles.actions}><button className={styles.primary} type="button" onClick={createTool}>保存连接</button><button className={styles.secondary} type="button" onClick={() => { setToolComposerOpen(false); setEditingToolId(null); }}>取消</button></div></section> : null}
          <nav className={styles.tabs} aria-label={`${config.label}视图`} role="tablist">
            {config.tabs.map((entry) => <button key={entry.id} className={styles.tab} type="button" role="tab" aria-selected={tab === entry.id} onClick={() => { setTab(entry.id); setSelectedId(null); }}>{entry.label}</button>)}
          </nav>
          <div className={styles.list}>
            <div className={styles.listHeader}><strong>{filtered.length} 个结果</strong><span>最近更新优先</span></div>
            {filtered.length ? filtered.map((item) => <CapabilityRow key={item.id} item={item} selected={item.id === selectedId} onSelect={() => selectItem(item)} />) : <div className={styles.empty}><div><Search aria-hidden="true" size={24} /><strong>没有找到匹配内容</strong><span>换一个关键词或清除筛选后再试。</span></div></div>}
          </div>
          {feedback ? <p className={styles.feedback} role="status">{feedback.text}</p> : null}
        </section>
        {selected ? <CapabilityDetail item={selected} surface={surface} onClose={closeDetail} onEdit={surface === 'schedules' ? () => editSchedule(selected) : surface === 'tools' ? () => editTool(selected) : undefined} onRequestInstall={surface === 'skills' ? () => setInstallCandidate(selected) : undefined} onNavigateToTask={(intent) => { announce('已带入新任务草稿。'); navigate('/teacher/ai-agent/new', { state: { capabilityId: selected.id, capabilityTitle: selected.title, intent } }); }} onRemove={() => removeItem(selected)} onAction={(action) => {
          if (action === 'connect') updateStatus(selected, '已连接', 'success', `${selected.title} 已连接，可以在任务中按权限使用。`);
          else if (action === 'install') updateStatus(selected, '已安装', 'neutral', `${selected.title} 已安装。你可以把它带入新任务。`);
          else if (action === 'update') updateStatus(selected, '已启用', 'success', `${selected.title} 已更新到最新版本。`);
          else if (action === 'enable') updateStatus(selected, '已启用', 'success', `${selected.title} 已启用。`);
          else if (action === 'disable') updateStatus(selected, '已停用', 'neutral', `${selected.title} 已停用，历史任务不受影响。`);
          else if (action === 'toggle-schedule') updateStatus(selected, selected.status === '已启用' ? '已停用' : '已启用', selected.status === '已启用' ? 'neutral' : 'success', `${selected.title} 已${selected.status === '已启用' ? '停用' : '启用'}。`);
          else if (action === 'preview' || action === 'history' || action === 'source') setInspector({ kind: action, item: selected });
          else if (action === 'favorite') updateStatus(selected, '已收藏', 'success', `${selected.title} 已加入收藏。`);
          else announce(`${selected.title} 的${action === 'test' ? '连接测试' : '操作'}已完成。`);
        }} /> : null}
        {installCandidate ? <div className={styles.dialogBackdrop}><section className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="install-skill-title"><h2 id="install-skill-title">确认安装 {installCandidate.title}</h2><p>安装后该 Skill 可在任务中被调用，权限范围如下：</p><ul className={styles.permissionList}>{installCandidate.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul><div className={styles.actions}><button className={styles.primary} type="button" onClick={confirmInstall}>确认安装</button><button className={styles.secondary} type="button" onClick={() => setInstallCandidate(null)}>取消</button></div></section></div> : null}
        {inspector ? <div className={styles.dialogBackdrop}><section className={styles.confirmDialog} role="dialog" aria-modal="true" aria-labelledby="inspector-title"><div className={styles.detailHeader}><div><h2 id="inspector-title">{inspector.kind === 'preview' ? '文件预览' : inspector.kind === 'source' ? '来源定位' : '运行历史'}</h2><p>{inspector.item.title}</p></div><button className={styles.close} type="button" aria-label="关闭查看" onClick={() => setInspector(null)}><X aria-hidden="true" size={18} /></button></div>{inspector.kind === 'preview' ? <><p>这是 {inspector.item.subtitle} 的可复查预览。实际内容会在接入 ClassIn Space 后从权限范围内加载。</p><p className={styles.preview}>来源：{inspector.item.source} · 版本：{inspector.item.version ?? '当前版本'} · 真值：{inspector.item.truth ?? '[模拟]'}</p></> : inspector.kind === 'source' ? <><p>来源路径已解析，保留原所有权与访问策略。</p><p className={styles.preview}>{inspector.item.source} · {inspector.item.meta.join(' · ')}</p></> : <><p>计划时间、实际时间、Run、Artifact 和 Receipt 会在每次执行后写入这里。</p><p className={styles.preview}>最近一次：未运行 · 下次：按当前规则计算 · 失败原因：无</p></>}<button className={styles.secondary} type="button" onClick={() => setInspector(null)}>关闭</button></section></div> : null}
      </div>
    </main>
  );
}

function CapabilityRow({ item, selected, onSelect }: Readonly<{ item: CapabilityItem; selected: boolean; onSelect: () => void }>) {
  return <button className={styles.row} type="button" data-selected={selected} onClick={onSelect} aria-label={`查看${item.title}`}>
    <span className={styles.rowMain}><span className={styles.rowIcon}>{createElement(statusIcon(item), { 'aria-hidden': true, size: 17 })}</span><span className={styles.rowText}><span className={styles.rowTitle}><span>{item.title}</span><span className={styles.status} data-tone={item.statusTone}>{item.status}</span></span><span className={styles.rowSubtitle}>{item.subtitle}</span><span className={styles.meta}><span>{item.truth ?? '[模拟]'}</span>{item.meta.map((value) => <span key={value}>{value}</span>)}</span></span></span>
    <ChevronRight aria-hidden="true" size={16} />
  </button>;
}

function CapabilityDetail({ item, surface, onClose, onEdit, onRequestInstall, onNavigateToTask, onRemove, onAction }: Readonly<{ item: CapabilityItem; surface: CapabilitySurfaceId; onClose: () => void; onEdit?: () => void; onRequestInstall?: () => void; onNavigateToTask: (intent: 'context' | 'adapt' | 'schedule') => void; onRemove: () => void; onAction: (action: CapabilityAction) => void }>) {
  const isSkill = surface === 'skills'; const isTool = surface === 'tools'; const isContent = surface === 'content'; const isFile = surface === 'files'; const isSchedule = surface === 'schedules';
  const primaryAction: { label: string; action: CapabilityAction | 'adapt' | 'context' } | null = isSkill && item.status === '可安装' ? { label: '安装 Skill', action: 'install' } : isSkill && item.status === '更新可用' ? { label: '更新 Skill', action: 'update' } : isSkill && item.status === '已安装' ? { label: '启用 Skill', action: 'enable' } : isTool && item.status !== '已连接' ? { label: '连接工具', action: 'connect' } : isContent ? { label: '改编到新任务', action: 'adapt' } : isFile ? { label: '作为任务 Context', action: 'context' } : isSchedule ? { label: '立即运行', action: 'run' } : null;
  return <aside className={styles.detail} aria-label={`${item.title}详情`}>
    <header className={styles.detailHeader}><div><h2>{item.title}</h2><p>{item.subtitle}</p><span className={styles.status} data-tone={item.statusTone}>{item.status}</span></div><button className={styles.close} type="button" aria-label="关闭详情" onClick={onClose}><X aria-hidden="true" size={18} /></button></header>
    <div className={styles.detailBody}>
      <section className={styles.detailSection}><h3>说明</h3><p>{item.description}</p></section>
      <section className={styles.detailSection}><h3>来源与版本</h3><p>{item.source}{item.version ? ` · ${item.version}` : ''}</p></section>
      <section className={styles.detailSection}><h3>适用范围</h3><div className={styles.tags}>{item.tags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}</div></section>
      <section className={styles.detailSection}><h3>输入与输出</h3><p>输入：已授权的教学 Context 与资源引用；输出：可复查的草稿或连接结果。</p></section>
      <section className={styles.detailSection}><h3>运行边界</h3><p>Context 范围：当前任务快照 · 敏感级别：按机构策略；Tool、网络与文件权限均需显式授权。</p></section>
        <section className={styles.detailSection}><h3>权限与数据边界</h3><ul className={styles.permissionList}>{item.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul></section>
      <section className={styles.detailSection}><h3>版本记录</h3><p>当前版本：{item.version ?? '体验版本'} · 来源变更会保留在任务证据中。</p></section>
      <div className={styles.actions}>
        {primaryAction ? <button className={styles.primary} type="button" onClick={() => { if (primaryAction.action === 'install' && onRequestInstall) onRequestInstall(); else { if (primaryAction.action !== 'adapt' && primaryAction.action !== 'context') onAction(primaryAction.action); if (isContent) onNavigateToTask('adapt'); else if (isFile) onNavigateToTask('context'); else if (isSchedule) onNavigateToTask('schedule'); } }}>{primaryAction.label}</button> : null}
        {isSkill && (item.status === '已启用' || item.status === '已安装') ? <><button className={styles.primary} type="button" onClick={() => onNavigateToTask('context')}>去使用</button>{item.status === '已启用' ? <button className={styles.secondary} type="button" onClick={() => onAction('disable')}>停用</button> : null}</> : null}
        {isSkill && item.status !== '可安装' ? <button className={styles.secondary} type="button" onClick={onRemove}>删除</button> : null}
        {isTool ? <><button className={styles.secondary} type="button" onClick={() => onAction('test')}><TestTube2 aria-hidden="true" size={15} />测试连接</button><button className={styles.secondary} type="button" onClick={onEdit}>编辑连接</button><button className={styles.secondary} type="button" onClick={onRemove}>移除连接</button></> : null}
        {isContent ? <><button className={styles.secondary} type="button" onClick={() => onAction('favorite')}>收藏</button><button className={styles.secondary} type="button" onClick={() => onAction('preview')}><ExternalLink aria-hidden="true" size={15} />预览</button></> : null}
        {isFile ? <><button className={styles.secondary} type="button" onClick={() => onAction('preview')}><ExternalLink aria-hidden="true" size={15} />预览</button><button className={styles.secondary} type="button" onClick={() => onAction('source')}>定位来源</button></> : null}
        {isSchedule ? <><button className={styles.secondary} type="button" onClick={() => onAction('toggle-schedule')}>{item.status === '已启用' ? '停用' : '启用'}</button><button className={styles.secondary} type="button" onClick={onEdit}>编辑规则</button><button className={styles.secondary} type="button" onClick={() => onAction('history')}>查看历史</button></> : null}
        {!isContent && !isFile && !isSchedule ? <button className={styles.secondary} type="button" onClick={() => onAction('details')}><MoreHorizontal aria-hidden="true" size={15} />更多</button> : null}
      </div>
      {isTool ? <p className={styles.feedback} role="note">工具详情只负责连接与治理，不能直接发起任务。</p> : null}
    </div>
  </aside>;
}

function SettingsSurface({ config }: Readonly<{ config: ReturnType<typeof getCapabilitySurface> }>) {
  const [section, setSection] = useState('general');
  const [feedback, setFeedback] = useState<string | null>(null);
  return <main className={styles.page} aria-labelledby="settings-workspace-title">
    <header className={styles.header}><div className={styles.titleBlock}><span className={styles.eyebrow}><Settings2 aria-hidden="true" size={15} />Work Buddy</span><h1 id="settings-workspace-title">{config.label}</h1><p>{config.description}</p></div><span className={styles.truth}>[模拟] 体验数据 · 机构边界清晰可见</span></header>
    <div className={styles.settings}><nav className={styles.settingsNav} aria-label="Work Buddy 设置分组">{SETTINGS_SECTIONS.map((entry) => <button key={entry.id} type="button" aria-current={section === entry.id ? 'page' : undefined} onClick={() => { setSection(entry.id); setFeedback(null); }}>{entry.label}</button>)}</nav><SettingsPanel section={section} onFeedback={setFeedback} /></div>
    {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
  </main>;
}

function SettingsPanel({ section, onFeedback }: Readonly<{ section: string; onFeedback: (message: string) => void }>) {
  const title = SETTINGS_SECTIONS.find((entry) => entry.id === section)?.label ?? '通用';
  const save = () => onFeedback(`${title}设置已保存。`);
  return <section className={styles.settingsPanel} aria-labelledby="settings-panel-title"><h2 id="settings-panel-title">{title}</h2><p>设置只影响 WorkBuddy 的个人偏好与能力边界，不会修改 ClassIn 正式业务对象。</p><div className={styles.settingCard}>
    {section === 'general' ? <><SettingRow title="默认任务类型" description="新建任务时优先展示的任务入口"><select aria-label="默认任务类型" defaultValue="courseware"><option value="courseware">生成智能课件</option><option value="package">生成课程方案包</option></select></SettingRow><SettingRow title="通知偏好" description="任务完成、需要确认或出现阻断时提醒"><label className={styles.switch}><input type="checkbox" defaultChecked onChange={save} />接收 WorkBuddy 通知</label></SettingRow></> : null}
    {section === 'model' ? <><SettingRow title="机构默认模型" description="由机构策略提供，敏感 Context 需单独准入"><span className={styles.status} data-tone="success">可用 · ClassIn AI</span></SettingRow><SettingRow title="连接测试" description="连接测试与模型可用性分别记录"><button className={styles.secondary} type="button" onClick={() => onFeedback('模型连接测试完成，当前可用。')}>测试连接</button></SettingRow></> : null}
    {section === 'data' ? <><SettingRow title="个人 WorkBuddy 数据" description="Run、Artifact 草稿、个人 Skill 与偏好"><span className={styles.status} data-tone="info">可备份</span></SettingRow><SettingRow title="最近备份" description="不会包含 ClassIn 正式业务对象">从未备份 <button className={styles.secondary} type="button" onClick={() => onFeedback('已创建备份任务，完成后会显示结果。')}>创建备份</button></SettingRow></> : null}
    {section === 'notifications' ? <><SettingRow title="ClassIn 站内通知" description="任务需要确认或完成时提醒"><label className={styles.switch}><input type="checkbox" defaultChecked onChange={save} />已开启</label></SettingRow><SettingRow title="外部消息" description="外部入口不能绕过审批"><span className={styles.status} data-tone="neutral">未绑定</span></SettingRow></> : null}
    {section === 'sandbox' ? <><SettingRow title="执行环境" description="未来 Skill/Tool 的文件与网络范围"><span className={styles.status} data-tone="info">受控模式</span></SettingRow><SettingRow title="危险动作策略" description="高风险动作必须经过策略与教师审批"><span className={styles.status} data-tone="success">已启用</span></SettingRow></> : null}
    {section === 'about' ? <><SettingRow title="WorkBuddy 版本" description="当前教师工作台体验版本"><span>v0.1 · 体验数据</span></SettingRow><SettingRow title="能力真值" description="当前页面用于结构与交互验证"><span className={styles.status} data-tone="warning">体验数据</span></SettingRow></> : null}
    {section === 'feedback' ? <><SettingRow title="问题类型" description="提交前请移除学生敏感信息"><select aria-label="问题类型" defaultValue="experience"><option value="experience">体验问题</option><option value="content">内容问题</option><option value="permission">权限问题</option></select></SettingRow><SettingRow title="描述" description="请说明复现步骤和期望结果"><input aria-label="反馈描述" placeholder="输入反馈内容" /><button className={styles.primary} type="button" onClick={() => onFeedback('反馈已保存为草稿。')}>保存反馈</button></SettingRow></> : null}
  </div></section>;
}

function SettingRow({ title, description, children }: Readonly<{ title: string; description: string; children: ReactNode }>) {
  return <div className={styles.settingRow}><div><strong>{title}</strong><p>{description}</p></div><div>{children}</div></div>;
}
