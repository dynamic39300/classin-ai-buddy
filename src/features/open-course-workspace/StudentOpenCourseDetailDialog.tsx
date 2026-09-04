import { CalendarClock, FileText, MessageCircle, Video } from 'lucide-react';
import { useState } from 'react';
import type { OpenCourseWorkspaceRecord } from '@domain/open-course/open-course';
import { getOpenCourseEnterState, getOpenCourseStatusLabel, formatOpenCourseDateTime } from './open-course-view';
import { OpenCourseDialog } from './OpenCourseDialog';
import styles from './OpenCourseWorkspace.module.css';

export function StudentOpenCourseDetailDialog({
  course,
  onClose,
  onEnter,
}: {
  course: OpenCourseWorkspaceRecord;
  onClose: () => void;
  onEnter: () => void;
}) {
  const [feedback, setFeedback] = useState('');
  const enter = getOpenCourseEnterState(course);
  const showPlaceholder = (label: string) => setFeedback(`${label}为 Demo Placeholder，当前未连接真实课堂服务。`);

  return (
    <OpenCourseDialog title="公开课详情" onClose={onClose} detail>
      <div className={styles.detailDialogBody}>
        <header className={styles.detailDialogIdentity}>
          <div><h3>{course.title}</h3><p>{course.instructorName}</p></div>
          <div className={styles.detailDialogIdentityActions}>
            <span className={styles.statusBadge} data-status={enter.status}>{getOpenCourseStatusLabel(enter.status)}</span>
            {enter.status !== 'ended' ? <button className={styles.primaryButton} type="button" disabled={enter.disabled} onClick={onEnter}><Video aria-hidden="true" size={15} />{enter.label}</button> : null}
          </div>
        </header>
        <dl className={styles.detailDialogFacts} aria-label="公开课关键事实">
          <div><dt><CalendarClock aria-hidden="true" size={14} />开始时间</dt><dd>{formatOpenCourseDateTime(course.startsAt)}</dd></div>
          <div><dt>课堂时长</dt><dd>{course.durationMinutes} 分钟</dd></div>
          <div><dt>报名人数</dt><dd>{course.enrolledCount}/{course.maxSeats} 人</dd></div>
          <div><dt>课堂位置</dt><dd>{course.classroomSummary}</dd></div>
        </dl>
        <div className={styles.detailDialogRows}>
          <section className={styles.detailDialogRow} aria-labelledby="student-open-course-description"><h3 id="student-open-course-description">课程说明</h3><p>{course.description || '暂无课程说明'}</p></section>
          <section className={styles.detailDialogRow} aria-labelledby="student-open-course-access"><h3 id="student-open-course-access">学生权限</h3><p>可查看已加入公开课的信息与课堂状态；不能编辑、邀请成员或删除公开课。</p></section>
        </div>
        {enter.status === 'ended' ? <section className={styles.detailDialogSection} aria-labelledby="student-open-course-results"><h3 id="student-open-course-results">课后内容</h3><div className={styles.resultActions}><button className={styles.placeholderButton} type="button" onClick={() => showPlaceholder('课堂回放')}><FileText aria-hidden="true" size={16} /><span>课堂回放</span><small>Placeholder</small></button><button className={styles.placeholderButton} type="button" onClick={() => showPlaceholder('课后评价')}><MessageCircle aria-hidden="true" size={16} /><span>课后评价</span><small>Placeholder</small></button></div></section> : null}
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
        <footer className={styles.detailDialogActions}><div className={styles.detailDialogActionHint}><span>{enter.hint}</span></div></footer>
      </div>
    </OpenCourseDialog>
  );
}
