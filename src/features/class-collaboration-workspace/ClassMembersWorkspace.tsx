import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Edit3, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  canEditClassNickname,
  canSetClassTeacher,
  getActiveClassMembers,
  getClassMemberCounts,
  getClassMemberDisplayName,
  getClassMemberRemovalEligibility,
  removeClassMembers,
  setClassMemberAsTeacher,
  updateClassMemberNickname,
  type ClassMember,
} from '@domain/class/class';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { InviteMembersDialog } from './InviteMembersDialog';
import {
  CLASS_COLLABORATION_DEMO_NOW_ISO,
  getClassDetailPath,
  getClassListReturnPath,
  getCurrentClassMember,
  getVisibleClass,
  type CollaborationRole,
  type CollaborationSource,
} from './class-collaboration-view';
import { ClassPageHeader, ConfirmDialog, SafeClassState } from './WorkspaceChrome';
import styles from './ClassCollaborationWorkspace.module.css';

type PendingDangerAction =
  | { type: 'promote'; memberId: string; memberName: string }
  | { type: 'remove'; memberIds: readonly string[]; memberNames: readonly string[] };

export function ClassMembersWorkspace({
  role,
  classId,
  source = 'classes',
}: {
  role: CollaborationRole;
  classId?: string;
  source?: CollaborationSource;
}) {
  const navigate = useNavigate();
  const { classes, setClasses } = useClassWorkspaceStore();
  const record = getVisibleClass(classes, classId, role);
  const actor = record ? getCurrentClassMember(record, role) : undefined;
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [pendingDanger, setPendingDanger] = useState<PendingDangerAction | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const backPath = record ? getClassDetailPath(role, record.id, source) : getClassListReturnPath(role, source);

  const activeMembers = useMemo(() => getActiveClassMembers(record?.members ?? []), [record?.members]);
  const counts = getClassMemberCounts(activeMembers);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredMembers = activeMembers.filter((member) => (
    !normalizedQuery
    || member.name.toLocaleLowerCase().includes(normalizedQuery)
    || getClassMemberDisplayName(member).toLocaleLowerCase().includes(normalizedQuery)
  ));
  const teachers = filteredMembers.filter(({ role: memberRole }) => memberRole === 'headmaster' || memberRole === 'teacher');
  const learners = filteredMembers.filter(({ role: memberRole }) => memberRole === 'student-family');
  const editingMember = activeMembers.find(({ id }) => id === editingMemberId);
  const canManage = role === 'teacher' && record !== undefined;

  if (!record || !actor) {
    return <SafeClassState onBack={() => navigate(backPath)} />;
  }

  const updateMembers = (members: ReadonlyArray<ClassMember>) => {
    setClasses((current) => current.map((currentRecord) => currentRecord.id === record.id
      ? { ...currentRecord, members: [...members] }
      : currentRecord));
  };

  const toggleSelection = (memberId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
    setFeedback('');
  };

  const requestBatchRemoval = () => {
    const targets = activeMembers.filter(({ id }) => selectedIds.has(id));
    if (targets.length === 0) return;
    setPendingDanger({
      type: 'remove',
      memberIds: targets.map(({ id }) => id),
      memberNames: targets.map(getClassMemberDisplayName),
    });
  };

  const applyDangerAction = () => {
    if (!pendingDanger) return;
    if (pendingDanger.type === 'promote') {
      const target = activeMembers.find(({ id }) => id === pendingDanger.memberId);
      if (!target || !canSetClassTeacher(actor.role, target)) {
        setFeedback('当前成员状态或权限已变化，未设置为教师。');
      } else {
        updateMembers(setClassMemberAsTeacher(record.members, target.id));
        setFeedback(`${getClassMemberDisplayName(target)}已设置为教师。`);
      }
      setPendingDanger(null);
      return;
    }

    const targets = pendingDanger.memberIds
      .map((id) => activeMembers.find((member) => member.id === id))
      .filter((member) => member !== undefined);
    const eligibility = targets.map((target) => getClassMemberRemovalEligibility(actor.role, actor.id, target));
    const blocked = eligibility.find((item) => !item.allowed);
    if (targets.length !== pendingDanger.memberIds.length || blocked) {
      const reason = blocked && !blocked.allowed && blocked.reason === 'blocking-lesson'
        ? '所选成员中有教师仍有未结束课堂，未移除任何成员。'
        : '所选成员包含不可移除对象，未移除任何成员。';
      setFeedback(reason);
    } else {
      updateMembers(removeClassMembers(record.members, new Set(pendingDanger.memberIds), CLASS_COLLABORATION_DEMO_NOW_ISO));
      setSelectedIds(new Set());
      setFeedback(`已移除 ${pendingDanger.memberIds.length} 位成员。`);
    }
    setPendingDanger(null);
  };

  const openInvite = () => {
    setInviteOpen(true);
    setFeedback('');
  };

  const closeInvite = () => {
    setInviteOpen(false);
    requestAnimationFrame(() => inviteButtonRef.current?.focus());
  };

  return (
    <main className={styles.page} aria-labelledby="members-page-title">
      <ClassPageHeader
        className={record.name}
        title="班级成员"
        eyebrow={role === 'teacher' ? '教师视角' : '学生视角'}
        onBack={() => navigate(backPath)}
        actions={canManage ? (
          <button ref={inviteButtonRef} className={styles.primaryButton} type="button" onClick={openInvite}>
            <UserPlus aria-hidden="true" size={16} />邀请成员
          </button>
        ) : undefined}
      />

      <section className={styles.memberToolbar} aria-labelledby="members-page-title">
        <div>
          <h2 id="members-page-title">当前成员</h2>
          <p><strong>{counts.students}/50</strong> 位学习者 · {counts.teachers} 位教师</p>
        </div>
        <label className={styles.searchField}>
          <Search aria-hidden="true" size={16} />
          <span className={styles.srOnly}>搜索成员</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索账号名或班级昵称" />
        </label>
        {canManage && actor.role === 'headmaster' ? (
          <button className={styles.dangerGhostButton} type="button" disabled={selectedIds.size === 0} onClick={requestBatchRemoval}>
            <Trash2 aria-hidden="true" size={16} />批量移除 {selectedIds.size}
          </button>
        ) : null}
      </section>

      <MemberGroup
        title="班主任 / 教师"
        members={teachers}
        actor={actor}
        settings={record.settings}
        readOnly={role !== 'teacher' || !canManage}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onEdit={setEditingMemberId}
        onPromote={(member) => setPendingDanger({ type: 'promote', memberId: member.id, memberName: getClassMemberDisplayName(member) })}
        onRemove={(member) => setPendingDanger({ type: 'remove', memberIds: [member.id], memberNames: [getClassMemberDisplayName(member)] })}
      />
      <MemberGroup
        title="学习者"
        members={learners}
        actor={actor}
        settings={record.settings}
        readOnly={role !== 'teacher' || !canManage}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onEdit={setEditingMemberId}
        onPromote={(member) => setPendingDanger({ type: 'promote', memberId: member.id, memberName: getClassMemberDisplayName(member) })}
        onRemove={(member) => setPendingDanger({ type: 'remove', memberIds: [member.id], memberNames: [getClassMemberDisplayName(member)] })}
      />

      {filteredMembers.length === 0 ? <p className={styles.emptyState}>没有匹配的 active 成员</p> : null}
      {feedback ? <p className={styles.pageFeedback} role="status">{feedback}</p> : null}

      {editingMember ? (
        <NicknameDialog
          member={editingMember}
          onCancel={() => setEditingMemberId(null)}
          onSave={(value) => {
            if (!canEditClassNickname(actor.role, actor.id, editingMember, record.settings)) {
              setFeedback('当前权限已变化，昵称未修改。');
            } else {
              updateMembers(updateClassMemberNickname(record.members, editingMember.id, value));
              setFeedback(`${editingMember.name}的班级昵称已更新。`);
            }
            setEditingMemberId(null);
          }}
        />
      ) : null}

      {pendingDanger ? (
        <ConfirmDialog
          title={pendingDanger.type === 'promote' ? '设置为教师' : '确认移除成员'}
          detail={pendingDanger.type === 'promote'
            ? `确认将 ${pendingDanger.memberName} 设置为教师？`
            : `将移除 ${pendingDanger.memberNames.join('、')}。资格校验不通过时，本次操作不会移除任何成员。`}
          confirmLabel={pendingDanger.type === 'promote' ? '确认设置' : '确认移除'}
          onCancel={() => setPendingDanger(null)}
          onConfirm={applyDangerAction}
        />
      ) : null}

      {inviteOpen ? <InviteMembersDialog classId={record.id} className={record.name} onClose={closeInvite} /> : null}
    </main>
  );
}

function MemberGroup({
  title,
  members,
  actor,
  settings,
  readOnly,
  selectedIds,
  onToggleSelection,
  onEdit,
  onPromote,
  onRemove,
}: {
  title: string;
  members: readonly ClassMember[];
  actor: ClassMember;
  settings: Parameters<typeof canEditClassNickname>[3];
  readOnly: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelection: (memberId: string) => void;
  onEdit: (memberId: string) => void;
  onPromote: (member: ClassMember) => void;
  onRemove: (member: ClassMember) => void;
}) {
  if (members.length === 0) return null;
  const headmasterCanRemove = !readOnly && actor.role === 'headmaster';
  return (
    <section className={styles.memberGroup} aria-label={title}>
      <header><h2>{title}</h2><span>{members.length}</span></header>
      <div className={styles.memberList}>
        {members.map((member) => {
          const displayName = getClassMemberDisplayName(member);
          const canEdit = !readOnly && canEditClassNickname(actor.role, actor.id, member, settings);
          const canPromote = !readOnly && canSetClassTeacher(actor.role, member);
          const canSelect = headmasterCanRemove && member.id !== actor.id && member.role !== 'headmaster';
          return (
            <div className={styles.memberRow} key={member.id}>
              {headmasterCanRemove ? (
                <input
                  type="checkbox"
                  aria-label={`选择 ${displayName}`}
                  checked={selectedIds.has(member.id)}
                  disabled={!canSelect}
                  onChange={() => onToggleSelection(member.id)}
                />
              ) : null}
              <div className={styles.memberIdentity}>
                <strong>{displayName}</strong>
                <span>账号名：{member.name}{member.classNickname ? ` · 班级昵称：${member.classNickname}` : ''}</span>
              </div>
              <span className={styles.roleLabel}>{member.role === 'headmaster' ? '班主任' : member.role === 'teacher' ? '教师' : member.relationship}</span>
              {!readOnly && (canEdit || canPromote || headmasterCanRemove) ? (
                <div className={styles.rowActions}>
                  {canEdit ? <button className={styles.iconTextButton} type="button" onClick={() => onEdit(member.id)}><Edit3 aria-hidden="true" size={15} />修改昵称<span className={styles.srOnly}> {displayName}</span></button> : null}
                  {canPromote ? <button className={styles.iconTextButton} type="button" onClick={() => onPromote(member)}><ShieldCheck aria-hidden="true" size={15} />设为教师<span className={styles.srOnly}> {displayName}</span></button> : null}
                  {headmasterCanRemove && member.id !== actor.id && member.role !== 'headmaster' ? <button className={styles.dangerIconButton} type="button" onClick={() => onRemove(member)}><Trash2 aria-hidden="true" size={15} />移除<span className={styles.srOnly}> {displayName}</span></button> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NicknameDialog({ member, onCancel, onSave }: { member: ClassMember; onCancel: () => void; onSave: (value: string) => void }) {
  const [value, setValue] = useState(member.classNickname ?? member.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(value);
  };

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <form className={styles.nicknameDialog} role="dialog" aria-modal="true" aria-labelledby="nickname-dialog-title" onSubmit={submit}>
        <header>
          <div><span>当前班级内显示</span><h2 id="nickname-dialog-title">修改 {member.name} 的昵称</h2></div>
          <button className={styles.iconButton} type="button" onClick={onCancel} aria-label="关闭昵称编辑"><X aria-hidden="true" size={18} /></button>
        </header>
        <label>
          <span>班级昵称</span>
          <input ref={inputRef} value={value} maxLength={20} onChange={(event) => setValue(event.target.value)} />
          <small>{Array.from(value).length}/20，留空将使用账号名</small>
        </label>
        <footer>
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>取消</button>
          <button className={styles.primaryButton} type="submit">保存</button>
        </footer>
      </form>
    </div>
  );
}
