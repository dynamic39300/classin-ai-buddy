import { CalendarClock, CircleHelp, FileText, Link2, MessageCircle, Trash2, UserPlus, Video } from 'lucide-react';
import { useId, useState } from 'react';
import { resolveTeacherOpenCourseActions, resolveOpenCourseStatus, type OpenCourseWorkspaceRecord } from '@domain/open-course/open-course';
import { OpenCourseDialog } from './OpenCourseDialog';
import { formatOpenCourseDateTime, getOpenCourseEnterState, getOpenCourseStatusLabel } from './open-course-view';
import styles from './OpenCourseWorkspace.module.css';

export function TeacherOpenCourseDetailDialog({
  course,
  onClose,
  onEdit,
  onInvite,
  onDelete,
  onEnter,
}: {
  course: OpenCourseWorkspaceRecord;
  onClose: () => void;
  onEdit: () => void;
  onInvite: () => void;
  onDelete: () => void;
  onEnter: () => void;
}) {
  const [deleteMode, setDeleteMode] = useState(false);
  const [feedback, setFeedback] = useState('');
  const status = resolveOpenCourseStatus(course);
  const actions = resolveTeacherOpenCourseActions(course);
  const enter = getOpenCourseEnterState(course);
  const enterHintId = useId();

  if (deleteMode) {
    return (
      <OpenCourseDialog title="删除公开课？" kind="alertdialog" onClose={() => setDeleteMode(false)}>
        <p>删除后不可恢复，公开课将从本地列表移除。</p>
        <div className={styles.dialogActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => setDeleteMode(false)}>取消</button>
          <button className={styles.dangerButton} type="button" onClick={onDelete}><Trash2 aria-hidden="true" size={16} />确认删除</button>
        </div>
      </OpenCourseDialog>
    );
  }

  const showPlaceholder = (label: string) => setFeedback(`${label}为 Demo Placeholder，未连接真实服务。`);

  return (
    <OpenCourseDialog title="公开课详情" onClose={onClose} detail>
      <div className={styles.detailDialogBody}>
        <header className={styles.detailDialogIdentity}>
          <div>
            <h3>{course.title}</h3>
            <p>{course.instructorName}</p>
          </div>
          <div className={styles.detailDialogIdentityActions}>
            <span className={styles.statusBadge} data-status={status}>{getOpenCourseStatusLabel(status)}</span>
            {status !== 'ended' ? (
              <div className={styles.detailDialogEnterAction}>
                <button className={styles.primaryButton} type="button" disabled={!actions.canEnter} onClick={onEnter}><Video aria-hidden="true" size={15} />{actions.enterLabel}</button>
                <span className={styles.detailDialogEnterHelp}>
                  <button type="button" aria-label="查看上课时间提示" aria-describedby={enterHintId}>
                    <CircleHelp aria-hidden="true" size={14} />
                  </button>
                  <span id={enterHintId} role="tooltip"><strong>{enter.label}</strong><span>{enter.hint}</span></span>
                </span>
              </div>
            ) : null}
          </div>
        </header>

        <dl className={styles.detailDialogFacts} aria-label="公开课关键事实">
          <div><dt><CalendarClock aria-hidden="true" size={14} />开始时间</dt><dd>{formatOpenCourseDateTime(course.startsAt)}</dd></div>
          <div><dt>课堂时长</dt><dd>{course.durationMinutes} 分钟</dd></div>
          <div><dt>报名人数</dt><dd>{course.enrolledCount}/{course.maxSeats} 人</dd></div>
          <div><dt>课堂位置</dt><dd>{course.classroomSummary}</dd></div>
        </dl>

        <div className={styles.detailDialogRows}>
          {course.description.trim() ? (
            <section className={styles.detailDialogRow} aria-labelledby="open-course-dialog-description">
              <h3 id="open-course-dialog-description">课程说明</h3>
              <p>{course.description}</p>
            </section>
          ) : null}

          <section className={styles.detailDialogRow} aria-labelledby="open-course-dialog-config">
            <h3 id="open-course-dialog-config">课堂配置</h3>
            <p>
              座位席 {course.classroom.showSeats ? '开启' : '关闭'} · 自动上台 {course.classroom.autoStage ? '开启' : '关闭'} · 台上人数 {course.classroom.stageCapacity}
            </p>
          </section>

          <section className={styles.detailDialogRow} aria-labelledby="open-course-dialog-recording">
            <h3 id="open-course-dialog-recording">录制设置</h3>
            <p>录制教室 {course.classroom.recordClassroom ? '演示开关已开启' : '关闭'} · 录制现场 {course.classroom.recordScene ? '演示开关已开启' : '关闭'}</p>
          </section>

          <section className={styles.detailDialogRow} aria-labelledby="open-course-dialog-links">
            <h3 id="open-course-dialog-links">直播与回放</h3>
            <div className={styles.placeholderLinks}>
              <button type="button" onClick={() => showPlaceholder('网页直播链接')}><Link2 aria-hidden="true" size={16} />网页直播链接</button>
              <button type="button" onClick={() => showPlaceholder('网页回放链接')}><Link2 aria-hidden="true" size={16} />网页回放链接</button>
            </div>
          </section>
        </div>

        {status === 'ended' ? (
          <section className={styles.detailDialogSection} aria-labelledby="open-course-dialog-results">
            <h3 id="open-course-dialog-results">课后信息</h3>
            <div className={styles.resultActions}>
              <button className={styles.placeholderButton} type="button" onClick={() => showPlaceholder('教学报告')}><FileText aria-hidden="true" size={16} /><span>教学报告</span><small>Placeholder</small></button>
              <button className={styles.placeholderButton} type="button" onClick={() => showPlaceholder('课后评价')}><MessageCircle aria-hidden="true" size={16} /><span>课后评价</span><small>Placeholder</small></button>
            </div>
          </section>
        ) : null}

        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}

        <footer className={styles.detailDialogActions}>
          {status === 'ended' ? <div className={styles.detailDialogActionHint}><span>公开课已结束，当前信息只读。</span></div> : null}
          <div className={styles.headerActions}>
            {actions.canDelete ? <button className={styles.dangerButton} type="button" onClick={() => setDeleteMode(true)}><Trash2 aria-hidden="true" size={15} />删除公开课</button> : null}
            {actions.canInvite ? <button className={styles.secondaryButton} type="button" onClick={onInvite}><UserPlus aria-hidden="true" size={15} />邀请学生</button> : null}
            {actions.canEdit ? <button className={styles.secondaryButton} type="button" onClick={onEdit}>编辑</button> : null}
          </div>
        </footer>
      </div>
    </OpenCourseDialog>
  );
}
