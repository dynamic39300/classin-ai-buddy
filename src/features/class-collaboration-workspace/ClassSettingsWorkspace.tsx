import { useRef, useState } from 'react';
import { Edit3, LogOut, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  canEditClassNickname,
  getClassExitEligibility,
  getClassMemberCounts,
  getClassMemberDisplayName,
  removeClassMembers,
  updateClassMemberNickname,
  type ClassAccountPlan,
  type ClassRecord,
} from '@domain/class/class';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { InviteMembersDialog } from './InviteMembersDialog';
import {
  CLASS_COLLABORATION_DEMO_NOW_ISO,
  getClassDetailPath,
  getClassListReturnPath,
  getCurrentClassMember,
  getVisibleClass,
  withSource,
  type CollaborationRole,
  type CollaborationSource,
} from './class-collaboration-view';
import { ClassPageHeader, ConfirmDialog, SafeClassState } from './WorkspaceChrome';
import styles from './ClassCollaborationWorkspace.module.css';

type PendingSettingsAction = 'exit' | null;

const PLAN_LABELS: Record<ClassAccountPlan, string> = {
  free: '免费版',
  trial: '试用版',
  pro: '正式版',
};

export function ClassSettingsWorkspace({
  role,
  classId,
  source = 'classes',
  now = new Date(CLASS_COLLABORATION_DEMO_NOW_ISO),
}: {
  role: CollaborationRole;
  classId?: string;
  source?: CollaborationSource;
  now?: Date;
}) {
  const navigate = useNavigate();
  const { classes, setClasses } = useClassWorkspaceStore();
  const record = getVisibleClass(classes, classId, role);
  const actor = record ? getCurrentClassMember(record, role) : undefined;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingSettingsAction>(null);
  const [feedback, setFeedback] = useState('');
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const backPath = record ? getClassDetailPath(role, record.id, source) : getClassListReturnPath(role, source);

  if (!record || !actor) {
    return <SafeClassState onBack={() => navigate(backPath)} />;
  }

  const counts = getClassMemberCounts(record.members);
  const isHeadmaster = role === 'teacher' && actor.role === 'headmaster';
  const canInvite = role === 'teacher';
  const exitEligibility = !isHeadmaster ? getClassExitEligibility(record, actor, now) : null;
  const nicknameEditable = role === 'student-family'
    && canEditClassNickname(actor.role, actor.id, actor, record.settings);

  const updateRecord = (update: (current: ClassRecord) => ClassRecord) => {
    setClasses((current) => current.map((currentRecord) => currentRecord.id === record.id
      ? update(currentRecord)
      : currentRecord));
  };

  const closeInvite = () => {
    setInviteOpen(false);
    requestAnimationFrame(() => inviteButtonRef.current?.focus());
  };

  const toggleStudentNicknamePermission = () => {
    if (!isHeadmaster) return;
    updateRecord((current) => ({
      ...current,
      settings: {
        ...current.settings,
        allowStudentEditNickname: !current.settings.allowStudentEditNickname,
      },
    }));
    setFeedback(`学生修改班级昵称已${record.settings.allowStudentEditNickname ? '关闭' : '开启'}。`);
  };

  const saveStudentNickname = () => {
    if (!nicknameEditable) return;
    updateRecord((current) => ({
      ...current,
      members: updateClassMemberNickname(current.members, actor.id, nickname),
    }));
    setEditingNickname(false);
    setFeedback('你的班级昵称已更新。');
  };

  const applyDangerAction = () => {
    if (pendingAction === 'exit') {
      const latestEligibility = getClassExitEligibility(record, actor, now);
      if (!latestEligibility.allowed) {
        setFeedback(getExitBlockedText(latestEligibility.reason));
      } else {
        updateRecord((current) => ({
          ...current,
          members: removeClassMembers(current.members, new Set([actor.id]), now.toISOString()),
        }));
        navigate(getClassListReturnPath(role, source), { replace: true });
      }
      setPendingAction(null);
    }
  };

  return (
    <main className={styles.page} aria-labelledby="settings-page-title">
      <ClassPageHeader
        className={record.name}
        title="班级设置"
        eyebrow={role === 'teacher' ? '教师视角' : '学生视角'}
        onBack={() => navigate(backPath)}
      />

      <section className={styles.settingsSection} aria-labelledby="settings-page-title">
        <header className={styles.sectionHeader}>
          <div><span>班级对象</span><h2 id="settings-page-title">基本信息</h2></div>
        </header>
        <dl className={styles.definitionRows}>
          <div><dt>班级名称</dt><dd>{record.name}</dd></div>
          <div><dt>成员</dt><dd>{counts.total} 人 · {counts.teachers} 位教师 · {counts.students}/50 位学习者</dd></div>
        </dl>
      </section>

      {role === 'teacher' ? (
        <section className={styles.settingsSection} aria-labelledby="invite-section-title">
          <header className={styles.sectionHeader}>
            <div><span>成员协作</span><h2 id="invite-section-title">邀请与成员</h2></div>
          </header>
          <div className={styles.commandRows}>
            <div>
              <span><UserPlus aria-hidden="true" size={18} /></span>
              <div><strong>邀请成员</strong><small>联系人、In口令和二维码三种固定方式</small></div>
              <button ref={inviteButtonRef} className={styles.secondaryButton} type="button" disabled={!canInvite} onClick={() => setInviteOpen(true)}>打开邀请</button>
            </div>
            {isHeadmaster ? (
              <div>
                <span><Trash2 aria-hidden="true" size={18} /></span>
                <div><strong>批量移除成员</strong><small>成员资格会在确认移除前统一校验</small></div>
                <button
                  className={styles.dangerGhostButton}
                  type="button"
                  onClick={() => navigate(withSource(`/teacher/classes/${record.id}/members`, source))}
                >进入成员页</button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {isHeadmaster ? (
        <section className={styles.settingsSection} aria-labelledby="permission-section-title">
          <header className={styles.sectionHeader}>
            <div><span>班主任权限</span><h2 id="permission-section-title">班级权限</h2></div>
          </header>
          <div className={styles.permissionRows}>
            <ReadOnlyPermission label="退出班级或课程结课后可查看内容" enabled={record.settings.allowViewAfterLeaveOrComplete} />
            <ReadOnlyPermission label="协同教师可创建活动" enabled={record.settings.allowTeacherCreateLesson} />
            <label className={styles.permissionRow}>
              <span><strong>允许学生修改班级昵称</strong><small>仅修改当前班级内显示名</small></span>
              <input
                type="checkbox"
                role="switch"
                checked={record.settings.allowStudentEditNickname}
                onChange={toggleStudentNicknamePermission}
              />
            </label>
          </div>
        </section>
      ) : null}

      {role === 'student-family' ? (
        <section className={styles.settingsSection} aria-labelledby="nickname-section-title">
          <header className={styles.sectionHeader}>
            <div><span>本人信息</span><h2 id="nickname-section-title">班级昵称</h2></div>
          </header>
          <div className={styles.nicknameSetting}>
            <div><strong>{getClassMemberDisplayName(actor)}</strong><small>账号名：{actor.name}</small></div>
            {nicknameEditable ? (
              <button className={styles.secondaryButton} type="button" onClick={() => { setNickname(actor.classNickname ?? actor.name); setEditingNickname(true); }}>
                <Edit3 aria-hidden="true" size={15} />修改昵称
              </button>
            ) : <span className={styles.readOnlyBadge}>不可修改</span>}
          </div>
          {editingNickname ? (
            <div className={styles.inlineEditor}>
              <label><span>班级昵称</span><input value={nickname} maxLength={20} onChange={(event) => setNickname(event.target.value)} /></label>
              <div><button className={styles.secondaryButton} type="button" onClick={() => setEditingNickname(false)}>取消</button><button className={styles.primaryButton} type="button" onClick={saveStudentNickname}>保存</button></div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!isHeadmaster ? (
        <section className={styles.dangerSection} aria-labelledby="membership-section-title">
          <header className={styles.sectionHeader}>
            <div><span>成员关系</span><h2 id="membership-section-title">退出班级</h2></div>
          </header>
          <div className={styles.lifecycleRow}>
            <span><LogOut aria-hidden="true" size={18} /></span>
            <div>
              <strong>退出班级</strong>
              <small>{PLAN_LABELS[actor.plan]} · {exitEligibility?.allowed ? '当前可退出' : getExitBlockedText(exitEligibility?.reason)}</small>
            </div>
            <button className={styles.dangerButton} type="button" disabled={!exitEligibility?.allowed} onClick={() => setPendingAction('exit')}>退出班级</button>
          </div>
        </section>
      ) : null}

      {feedback ? <p className={styles.pageFeedback} role="status">{feedback}</p> : null}

      {pendingAction ? (
        <ConfirmDialog
          title="确认退出班级"
          detail={`确认退出 ${record.name}？退出后将返回${source === 'home' ? '首页' : '班级列表'}。`}
          confirmLabel="确认退出"
          onCancel={() => setPendingAction(null)}
          onConfirm={applyDangerAction}
        />
      ) : null}

      {inviteOpen ? <InviteMembersDialog classId={record.id} className={record.name} onClose={closeInvite} /> : null}
    </main>
  );
}

function ReadOnlyPermission({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={styles.permissionRow}>
      <span><strong>{label}</strong><small>当前版本只读</small></span>
      <span className={styles.readOnlyValue}>{enabled ? '已开启' : '已关闭'}</span>
    </div>
  );
}

function getExitBlockedText(reason: 'unfinished-lessons' | 'pro-retention-window' | undefined): string {
  if (reason === 'unfinished-lessons') return '仍有未结束课堂，暂时不能退出';
  if (reason === 'pro-retention-window') return '最后课堂结束未满 60 天，暂时不能退出';
  return '暂时不能退出';
}
