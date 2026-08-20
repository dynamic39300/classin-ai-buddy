import type { AppRole } from '@domain/account/role';
import type { OpenCourseRecord, OpenCourseStatus } from '@domain/class/class';
import {
  OPEN_COURSE_DEMO_CLOCK,
  OPEN_COURSE_DEMO_CLOCK_ISO,
  resolveOpenCourseStatus,
} from '@domain/open-course/open-course';

export type OpenCourseSource = 'home' | 'list' | 'schedule';

export function normalizeOpenCourseSource(value: string | null): OpenCourseSource {
  if (value === 'home') return 'home';
  if (value === 'teacher_schedule' || value === 'student_schedule') return 'schedule';
  return 'list';
}

export function getOpenCourseSource(searchParams: Pick<URLSearchParams, 'get'>): OpenCourseSource {
  return normalizeOpenCourseSource(searchParams.get('source') ?? searchParams.get('from'));
}

export function getOpenCourseReturnPath(role: AppRole, source: OpenCourseSource, context?: Pick<URLSearchParams, 'get'>): string {
  const root = role === 'teacher' ? 'teacher' : 'student';
  if (source === 'schedule') {
    const params = new URLSearchParams();
    for (const key of ['date', 'view', 'event']) {
      const value = context?.get(key);
      if (value) params.set(key, value);
    }
    return `/${root}/schedule${params.size ? `?${params.toString()}` : ''}`;
  }
  return source === 'home' ? `/${root}/home` : `/${root}/open-courses`;
}

export function withOpenCourseSource(path: string, source: OpenCourseSource): string {
  return `${path}?${new URLSearchParams({ source }).toString()}`;
}

export function formatOpenCourseDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function toDemoDateTimeLocal(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '2026-08-08T14:15';
  return new Date(time + 8 * 60 * 60_000).toISOString().slice(0, 16);
}

export function fromDemoDateTimeLocal(value: string): string {
  return value ? `${value}:00+08:00` : OPEN_COURSE_DEMO_CLOCK_ISO;
}

export function getNextOpenCourseId(records: ReadonlyArray<OpenCourseRecord>): string {
  let index = records.length + 1;
  while (records.some(({ id }) => id === `open-local-${index}`)) index += 1;
  return `open-local-${index}`;
}

export function getOpenCourseStatusLabel(status: OpenCourseStatus): string {
  if (status === 'scheduled') return '待开始';
  if (status === 'live') return '直播中';
  return '已结束';
}

export function getOpenCourseEnterState(course: OpenCourseRecord): {
  status: OpenCourseStatus;
  label: string;
  disabled: boolean;
  hint: string;
} {
  const status = resolveOpenCourseStatus(course);
  if (status === 'ended') return { status, label: '已结束', disabled: true, hint: '公开课已结束。' };
  if (status === 'live') return { status, label: '进入教室', disabled: false, hint: '公开课正在进行。' };
  const minutes = Math.ceil((new Date(course.startsAt).getTime() - OPEN_COURSE_DEMO_CLOCK.getTime()) / 60_000);
  if (minutes <= 30) return { status, label: '上课', disabled: false, hint: '已进入开课前 30 分钟窗口。' };
  return { status, label: '未开始', disabled: true, hint: `开课前 30 分钟可进入，当前还需等待 ${minutes - 30} 分钟。` };
}
