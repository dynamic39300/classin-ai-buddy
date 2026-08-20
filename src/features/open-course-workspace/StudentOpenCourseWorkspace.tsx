import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, KeyRound, QrCode, Video } from 'lucide-react';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import {
  canEnterOpenCoursePreflight,
  joinOpenCourseByPasscode,
  resolveOpenCourseStatus,
  toOpenCourseWorkspaceRecord,
} from '@domain/open-course/open-course';
import { useOpenCourseSession } from './use-open-course-session';
import {
  formatOpenCourseDateTime,
  getOpenCourseEnterState,
  getOpenCourseReturnPath,
  getOpenCourseSource,
  getOpenCourseStatusLabel,
  withOpenCourseSource,
} from './open-course-view';
import styles from './OpenCourseWorkspace.module.css';

export function StudentJoinOpenCourseWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = getOpenCourseSource(searchParams);
  const { openCourses, setOpenCourses } = useClassWorkspaceStore();
  const { joinedCourseIds, joinCourse } = useOpenCourseSession();
  const [passcode, setPasscode] = useState(() => searchParams.get('passcode') ?? '');
  const [feedback, setFeedback] = useState('');
  const demoCourse = openCourses[0] ? toOpenCourseWorkspaceRecord(openCourses[0]) : null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = joinOpenCourseByPasscode(openCourses, joinedCourseIds, passcode);
    if (result.status === 'empty') return setFeedback('请输入 In 口令。');
    if (result.status === 'not-found') return setFeedback('口令无效或公开课不存在。');
    if (result.status === 'duplicate') return setFeedback('你已加入该公开课。');

    joinCourse(result.course.id);
    setOpenCourses((records) => records.map((record) => record.id === result.course.id
      ? { ...result.course, visibleTo: record.visibleTo.includes('student-family') ? record.visibleTo : [...record.visibleTo, 'student-family'] }
      : record));
    setFeedback('已加入公开课。');
    navigate(withOpenCourseSource(`/student/open-courses/${result.course.id}`, source), { replace: true });
  };

  return (
    <main className={styles.page} aria-labelledby="join-open-course-title">
      <header className={styles.pageHeader}>
        <div>
          <button className={styles.backButton} type="button" onClick={() => navigate(getOpenCourseReturnPath('student-family', source, searchParams))}>
            <ArrowLeft aria-hidden="true" size={16} />返回
          </button>
          <span className={styles.eyebrow}>公开课</span>
          <h1 id="join-open-course-title">使用口令加入</h1>
          <p>加入成功后，该公开课会进入本地学生公开课列表。</p>
        </div>
      </header>
      <section className={styles.joinPanel}>
        <KeyRound aria-hidden="true" size={24} />
        <form onSubmit={submit}>
          <label className={styles.field}>
            <span>In 口令</span>
            <input aria-label="In 口令" value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="off" placeholder="输入公开课 In 口令" />
          </label>
          <button className={styles.primaryButton} type="submit">加入公开课</button>
        </form>
        {demoCourse ? <small>Demo 口令：<code>{demoCourse.passcode}</code></small> : null}
        <button className={styles.placeholderButton} type="button" onClick={() => setFeedback('扫码加入为 Demo Placeholder，未连接摄像头。')}><QrCode aria-hidden="true" size={15} />扫码加入</button>
        {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
      </section>
    </main>
  );
}

export function StudentOpenCourseDetailWorkspace({ courseId }: { courseId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = getOpenCourseSource(searchParams);
  const { openCourses } = useClassWorkspaceStore();
  const { joinedCourseIds } = useOpenCourseSession();
  const rawCourse = openCourses.find(({ id }) => id === courseId);
  const canView = rawCourse && (rawCourse.visibleTo.includes('student-family') || joinedCourseIds.has(rawCourse.id));
  const course = rawCourse && canView ? toOpenCourseWorkspaceRecord(rawCourse) : null;

  if (!course) {
    return (
      <main className={styles.safeState}>
        <h1>未找到公开课</h1><p>该公开课尚未加入、已删除或当前角色不可见。</p>
        <button className={styles.primaryButton} type="button" onClick={() => navigate(getOpenCourseReturnPath('student-family', source, searchParams))}>安全返回</button>
      </main>
    );
  }

  const status = resolveOpenCourseStatus(course);
  const enter = getOpenCourseEnterState(course);
  const canEnter = canEnterOpenCoursePreflight(course);
  return (
    <main className={styles.page} aria-labelledby="student-open-course-title">
      <header className={styles.pageHeader}>
        <div>
          <button className={styles.backButton} type="button" onClick={() => navigate(getOpenCourseReturnPath('student-family', source, searchParams))}>
            <ArrowLeft aria-hidden="true" size={16} />返回
          </button>
          <span className={styles.eyebrow}>我的公开课 · 只读</span>
          <h1 id="student-open-course-title">{course.title}</h1>
          <p>{course.subject} · {course.instructorName}</p>
        </div>
      </header>
      <div className={styles.detailLayout}>
        <section className={styles.heroBand} data-cover={course.coverId.replace('cover-', '')}>
          <span className={styles.statusBadge} data-status={status}>{getOpenCourseStatusLabel(status)}</span>
          <div><CalendarClock aria-hidden="true" size={18} /><strong>{formatOpenCourseDateTime(course.startsAt)}</strong><span>{course.durationMinutes} 分钟</span></div>
        </section>
        <section className={styles.detailSection}>
          <h2>课堂信息</h2>
          <dl className={styles.detailList}>
            <div><dt>授课教师</dt><dd>{course.instructorName}</dd></div>
            <div><dt>台上人数</dt><dd>{course.classroom.stageCapacity}</dd></div>
            <div><dt>课堂位置</dt><dd>{course.classroomSummary}</dd></div>
            <div><dt>公开课说明</dt><dd>{course.description}</dd></div>
          </dl>
        </section>
        <footer className={styles.actionBar}>
          <div><strong>{enter.label}</strong><span>{enter.hint}</span></div>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!canEnter}
            onClick={() => navigate(withOpenCourseSource(`/student/open-courses/${course.id}/preflight`, source))}
          ><Video aria-hidden="true" size={16} />{enter.label}</button>
        </footer>
      </div>
    </main>
  );
}
