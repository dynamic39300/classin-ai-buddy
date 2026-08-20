import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Mic, RefreshCw, Video } from 'lucide-react';
import type { AppRole } from '@domain/account/role';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { canEnterOpenCoursePreflight, toOpenCourseWorkspaceRecord } from '@domain/open-course/open-course';
import { useOpenCourseSession } from './use-open-course-session';
import { OpenCourseDialog } from './OpenCourseDialog';
import { getOpenCourseSource, withOpenCourseSource } from './open-course-view';
import styles from './OpenCourseWorkspace.module.css';

export function OpenCoursePreflightWorkspace({ role, courseId }: { role: AppRole; courseId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = getOpenCourseSource(searchParams);
  const { openCourses } = useClassWorkspaceStore();
  const { joinedCourseIds } = useOpenCourseSession();
  const rawCourse = openCourses.find(({ id }) => id === courseId);
  const roleVisible = rawCourse && (rawCourse.visibleTo.includes(role) || (role === 'student-family' && joinedCourseIds.has(rawCourse.id)));
  const course = rawCourse && roleVisible ? toOpenCourseWorkspaceRecord(rawCourse) : null;
  const [cameraOn, setCameraOn] = useState(true);
  const [facing, setFacing] = useState<'front' | 'rear'>('front');
  const [micOn, setMicOn] = useState(true);
  const [classroomOpen, setClassroomOpen] = useState(false);
  const root = role === 'teacher' ? 'teacher' : 'student';
  const detailPath = role === 'teacher'
    ? (() => {
        const params = new URLSearchParams(searchParams);
        params.set('source', searchParams.get('source') ?? source);
        params.set('dialog', 'detail');
        params.set('course', courseId);
        return `/teacher/open-courses?${params.toString()}`;
      })()
    : withOpenCourseSource(`/${root}/open-courses/${courseId}`, source);

  if (!course || !canEnterOpenCoursePreflight(course)) {
    return (
      <main className={styles.safeState}>
        <h1>当前无法进入课前检查</h1>
        <p>{course ? '仅开课前 30 分钟内或直播中可进入；已结束公开课不可进入。' : '公开课不存在或当前角色不可见。'}</p>
        <button className={styles.primaryButton} type="button" onClick={() => navigate(detailPath)}>返回公开课详情</button>
      </main>
    );
  }

  return (
    <main className={styles.preflight} aria-labelledby="preflight-title">
      <section className={styles.previewPane}>
        <button className={styles.backButtonLight} type="button" onClick={() => navigate(detailPath)}><ArrowLeft aria-hidden="true" size={16} />返回详情</button>
        <div className={styles.previewState}>
          <Camera aria-hidden="true" size={30} />
          <strong>{cameraOn ? `${facing === 'front' ? '前置' : '后置'}摄像头预览（演示）` : '摄像头已关闭'}</strong>
          <span>不会申请真实摄像头或麦克风权限</span>
        </div>
      </section>
      <section className={styles.devicePanel}>
        <span className={styles.eyebrow}>设备检查</span>
        <h1 id="preflight-title">进入 {course.title}</h1>
        <Toggle label="摄像头" checked={cameraOn} onChange={setCameraOn} icon={<Camera aria-hidden="true" size={17} />} />
        <fieldset className={styles.facingControl} disabled={!cameraOn}>
          <legend>摄像头方向</legend>
          <button type="button" aria-pressed={facing === 'front'} onClick={() => setFacing('front')}>前置</button>
          <button type="button" aria-pressed={facing === 'rear'} onClick={() => setFacing('rear')}><RefreshCw aria-hidden="true" size={14} />后置</button>
        </fieldset>
        <Toggle label="麦克风" checked={micOn} onChange={setMicOn} icon={<Mic aria-hidden="true" size={17} />} />
        <div className={styles.micMeter} role="meter" aria-label={micOn ? '麦克风音量演示' : '麦克风已关闭'} aria-valuemin={0} aria-valuemax={8} aria-valuenow={micOn ? 5 : 0}>{Array.from({ length: 8 }, (_, index) => <span key={index} data-active={micOn && index < 5} />)}</div>
        <button className={styles.primaryButton} type="button" onClick={() => setClassroomOpen(true)}><Video aria-hidden="true" size={16} />进入教室</button>
      </section>
      {classroomOpen ? (
        <OpenCourseDialog title="ClassIn 教室" onClose={() => setClassroomOpen(false)}>
          <p>教室能力为 Demo Placeholder，未连接真实音视频、白板或课堂引擎。</p>
          <div className={styles.dialogActions}><button className={styles.primaryButton} type="button" onClick={() => setClassroomOpen(false)}>关闭并停留在课前检查</button></div>
        </OpenCourseDialog>
      ) : null}
    </main>
  );
}

function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (checked: boolean) => void; icon: ReactNode }) {
  return <label className={styles.deviceToggle}><span>{icon}{label}</span><input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
