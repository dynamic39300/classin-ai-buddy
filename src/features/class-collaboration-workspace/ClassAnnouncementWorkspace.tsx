import { useState } from 'react';
import { BellRing, CheckCircle2, Clock3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getActiveClassMembers,
  getClassMemberDisplayName,
} from '@domain/class/class';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import {
  getClassDetailPath,
  getClassListReturnPath,
  getCurrentClassMember,
  getVisibleClass,
  type CollaborationRole,
  type CollaborationSource,
} from './class-collaboration-view';
import { ClassPageHeader, SafeClassState } from './WorkspaceChrome';
import styles from './ClassCollaborationWorkspace.module.css';

type ClassAnnouncementWorkspaceProps = {
  role: CollaborationRole;
  classId?: string;
  announcementId?: string;
  source?: CollaborationSource;
};

function formatAnnouncementTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function ClassAnnouncementWorkspace({
  role,
  classId,
  announcementId,
  source = 'classes',
}: ClassAnnouncementWorkspaceProps) {
  const navigate = useNavigate();
  const { classes } = useClassWorkspaceStore();
  const [locallyConfirmedIds, setLocallyConfirmedIds] = useState<ReadonlySet<string>>(new Set());
  const record = getVisibleClass(classes, classId, role);
  const actor = record ? getCurrentClassMember(record, role) : undefined;
  const announcement = record?.announcements.find(({ id }) => id === announcementId);
  const classDetailPath = record ? getClassDetailPath(role, record.id, source) : getClassListReturnPath(role, source);

  if (!record || !actor || !announcement) {
    return (
      <SafeClassState
        title="找不到这条班级公告"
        detail="公告不存在，或当前角色无法访问所属班级。"
        onBack={() => navigate(classDetailPath)}
      />
    );
  }

  const isConfirmed = role === 'student-family'
    ? announcement.readByRole['student-family'] === true || locallyConfirmedIds.has(announcement.id)
    : announcement.confirmedMemberIds.includes(actor.id);
  const activeMembers = getActiveClassMembers(record.members);
  const memberById = new Map(activeMembers.map((member) => [member.id, member]));
  const confirmedNames = announcement.confirmedMemberIds
    .map((id) => memberById.get(id))
    .filter((member) => member !== undefined)
    .map(getClassMemberDisplayName);
  const unconfirmedNames = announcement.unconfirmedMemberIds
    .map((id) => memberById.get(id))
    .filter((member) => member !== undefined)
    .map(getClassMemberDisplayName);

  const confirm = () => {
    if (role !== 'student-family' || isConfirmed) return;
    setLocallyConfirmedIds((current) => new Set(current).add(announcement.id));
  };

  return (
    <main className={styles.page} aria-labelledby="announcement-title">
      <ClassPageHeader
        className={record.name}
        title="班级公告"
        eyebrow={role === 'teacher' ? '教师视角' : '学生视角'}
        onBack={() => navigate(classDetailPath)}
      />

      <article className={styles.announcementArticle}>
        <header>
          <div>
            <span className={styles.metaLine}><Clock3 aria-hidden="true" size={15} />{formatAnnouncementTime(announcement.createdAt)} · {announcement.authorName}</span>
            <h2 id="announcement-title">{announcement.title}</h2>
          </div>
          {role === 'student-family' ? (
            <span className={styles.readState} data-confirmed={isConfirmed}>
              <CheckCircle2 aria-hidden="true" size={16} />{isConfirmed ? '已确认' : '待确认'}
            </span>
          ) : null}
        </header>
        <p className={styles.announcementBody}>{announcement.body}</p>
      </article>

      {role === 'teacher' ? (
        <section className={styles.confirmationSection} aria-labelledby="confirmation-title">
          <header className={styles.sectionHeader}>
            <div><span>确认情况</span><h2 id="confirmation-title">成员确认样例</h2></div>
            <div className={styles.metrics} aria-label="公告确认统计">
              <span><strong>{announcement.confirmedMemberIds.length}</strong> 已确认</span>
              <span><strong>{announcement.unconfirmedMemberIds.length}</strong> 未确认</span>
            </div>
          </header>
          <div className={styles.sampleColumns}>
            <section aria-labelledby="confirmed-sample-title">
              <h3 id="confirmed-sample-title"><CheckCircle2 aria-hidden="true" size={16} />已确认样例</h3>
              {confirmedNames.length > 0 ? <ul>{confirmedNames.map((name) => <li key={name}>{name}</li>)}</ul> : <p>暂无可显示样例</p>}
            </section>
            <section aria-labelledby="unconfirmed-sample-title">
              <h3 id="unconfirmed-sample-title"><Users aria-hidden="true" size={16} />未确认样例</h3>
              {unconfirmedNames.length > 0 ? <ul>{unconfirmedNames.map((name) => <li key={name}>{name}</li>)}</ul> : <p>暂无可显示样例</p>}
            </section>
          </div>
          <ReminderAction disabled={announcement.unconfirmedMemberIds.length === 0} />
        </section>
      ) : (
        <StudentConfirmation confirmed={isConfirmed} readOnly={false} onConfirm={confirm} />
      )}
    </main>
  );
}

function ReminderAction({ disabled }: { disabled: boolean }) {
  const [feedback, setFeedback] = useState('');
  return (
    <div className={styles.sectionAction}>
      <button className={styles.primaryButton} type="button" disabled={disabled} onClick={() => setFeedback('提醒操作已在本地记录，本 Demo 不发送真实消息。')}>
        <BellRing aria-hidden="true" size={16} />提醒未确认成员
      </button>
      {feedback ? <p role="status">{feedback}</p> : null}
    </div>
  );
}

function StudentConfirmation({ confirmed, readOnly, onConfirm }: { confirmed: boolean; readOnly: boolean; onConfirm: () => void }) {
  const [feedback, setFeedback] = useState('');
  return (
    <section className={styles.studentConfirmation} aria-labelledby="student-confirm-title">
      <div><span>阅读确认</span><h2 id="student-confirm-title">{readOnly ? '当前公告仅供查看' : confirmed ? '你已确认这条公告' : '阅读后请确认'}</h2></div>
      <button
        className={styles.primaryButton}
        type="button"
        disabled={confirmed || readOnly}
        onClick={() => {
          onConfirm();
          setFeedback('已在当前学生视角记录确认状态。');
        }}
      >
        <CheckCircle2 aria-hidden="true" size={16} />{readOnly && !confirmed ? '仅查看' : confirmed ? '已确认' : '我已确认'}
      </button>
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>
  );
}
