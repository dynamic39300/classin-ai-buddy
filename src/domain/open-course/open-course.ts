import type { OpenCourseRecord, OpenCourseStatus } from '@domain/class/class';

export const OPEN_COURSE_DEMO_CLOCK = new Date('2026-08-08T14:15:00+08:00');
export const OPEN_COURSE_DEMO_CLOCK_ISO = '2026-08-08T14:15:00+08:00';
export const OPEN_COURSE_PRECHECK_MINUTES = 30;

export const OPEN_COURSE_DURATIONS = [15, 40, 60, 90, 120, 180] as const;
export type OpenCourseDuration = (typeof OPEN_COURSE_DURATIONS)[number];

export const OPEN_COURSE_STAGE_CAPACITIES = ['1V0', '1V1', '1V2', '1V4', '1V6', '1V8', '1V12'] as const;
export type OpenCourseStageCapacity = (typeof OPEN_COURSE_STAGE_CAPACITIES)[number];

export const OPEN_COURSE_PRESET_COVERS = [
  { id: 'cover-green', label: '青绿', tone: 'green' },
  { id: 'cover-blue', label: '海蓝', tone: 'blue' },
  { id: 'cover-amber', label: '暖金', tone: 'amber' },
  { id: 'cover-ink', label: '深墨', tone: 'ink' },
] as const;
export type OpenCourseCoverId = (typeof OPEN_COURSE_PRESET_COVERS)[number]['id'];

export type OpenCourseClassroomConfig = {
  showSeats: boolean;
  autoStage: boolean;
  stageCapacity: OpenCourseStageCapacity;
  recordClassroom: boolean;
  recordScene: boolean;
};

export type OpenCourseWorkspaceRecord = OpenCourseRecord & {
  coverId: OpenCourseCoverId;
  passcode: string;
  classroom: OpenCourseClassroomConfig;
  createdAt: string;
};

export type OpenCourseInput = {
  title: string;
  coverId: OpenCourseCoverId;
  startsAt: string;
  durationMinutes: OpenCourseDuration;
  classroom: OpenCourseClassroomConfig;
};

export type OpenCourseCollectionSort = 'starts-asc' | 'starts-desc' | 'title-asc';

export type OpenCourseCollectionOptions = {
  query?: string;
  status?: OpenCourseStatus | 'all';
  sort?: OpenCourseCollectionSort;
};

export type OpenCourseInputErrors = Partial<Record<'title' | 'startsAt' | 'durationMinutes' | 'stageCapacity', string>>;

export type TeacherOpenCourseActionModel = {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canEnter: boolean;
  enterLabel: '上课' | '进入课堂' | '已结束';
  enterDisabledReason?: string;
};

export type OpenCourseValidationResult =
  | { valid: true; value: OpenCourseInput }
  | { valid: false; errors: OpenCourseInputErrors };

export type JoinOpenCourseResult =
  | { status: 'empty' }
  | { status: 'not-found' }
  | { status: 'duplicate'; course: OpenCourseWorkspaceRecord }
  | { status: 'success'; course: OpenCourseWorkspaceRecord };

export function normalizeOpenCourseClassroom(config: OpenCourseClassroomConfig): OpenCourseClassroomConfig {
  return config.showSeats ? { ...config } : { ...config, autoStage: false };
}

export function resolveOpenCourseStatus(
  course: Pick<OpenCourseRecord, 'startsAt' | 'durationMinutes'>,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): OpenCourseStatus {
  const startsAt = new Date(course.startsAt).getTime();
  const endsAt = startsAt + course.durationMinutes * 60_000;
  const now = clock.getTime();
  if (now < startsAt) return 'scheduled';
  if (now < endsAt) return 'live';
  return 'ended';
}

export function canEditOpenCourse(
  course: Pick<OpenCourseRecord, 'startsAt' | 'durationMinutes'>,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): boolean {
  return resolveOpenCourseStatus(course, clock) === 'scheduled';
}

export function canDeleteOpenCourse(
  course: Pick<OpenCourseRecord, 'startsAt' | 'durationMinutes'>,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): boolean {
  return canEditOpenCourse(course, clock);
}

export function canEnterOpenCoursePreflight(
  course: Pick<OpenCourseRecord, 'startsAt' | 'durationMinutes'>,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): boolean {
  const status = resolveOpenCourseStatus(course, clock);
  if (status === 'ended') return false;
  if (status === 'live') return true;
  return new Date(course.startsAt).getTime() - clock.getTime() <= OPEN_COURSE_PRECHECK_MINUTES * 60_000;
}

export function resolveTeacherOpenCourseActions(
  course: Pick<OpenCourseRecord, 'ownerRoles' | 'startsAt' | 'durationMinutes'>,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): TeacherOpenCourseActionModel {
  const status = resolveOpenCourseStatus(course, clock);
  const owner = course.ownerRoles.includes('teacher');
  if (status === 'ended') {
    return {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canEnter: false,
      enterLabel: '已结束',
    };
  }
  const canEnter = canEnterOpenCoursePreflight(course, clock);
  return {
    canEdit: owner && status === 'scheduled',
    canDelete: owner && status === 'scheduled',
    canInvite: owner,
    canEnter,
    enterLabel: status === 'live' ? '进入课堂' : '上课',
    enterDisabledReason: canEnter ? undefined : '开课前 30 分钟可进入。',
  };
}

export function validateOpenCourseInput(
  input: OpenCourseInput,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): OpenCourseValidationResult {
  const title = input.title.trim();
  const errors: OpenCourseInputErrors = {};
  if (!title) errors.title = '请输入公开课名称。';
  else if (Array.from(title).length > 50) errors.title = '公开课名称不能超过 50 个字。';

  const startsAt = new Date(input.startsAt).getTime();
  if (Number.isNaN(startsAt)) errors.startsAt = '请选择有效的开始时间。';
  else if (startsAt < clock.getTime()) errors.startsAt = '开始时间不能早于 Demo 当前时间。';

  if (!(OPEN_COURSE_DURATIONS as readonly number[]).includes(input.durationMinutes)) {
    errors.durationMinutes = '请选择支持的课堂时长。';
  }
  if (!(OPEN_COURSE_STAGE_CAPACITIES as readonly string[]).includes(input.classroom.stageCapacity)) {
    errors.stageCapacity = '请选择支持的台上人数。';
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    value: {
      ...input,
      title,
      classroom: normalizeOpenCourseClassroom(input.classroom),
    },
  };
}

export function createDemoOpenCoursePasscode(id: string): string {
  let hash = 0;
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  }
  return `IN${hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

function isCoverId(value: unknown): value is OpenCourseCoverId {
  return OPEN_COURSE_PRESET_COVERS.some(({ id }) => id === value);
}

function isStageCapacity(value: unknown): value is OpenCourseStageCapacity {
  return (OPEN_COURSE_STAGE_CAPACITIES as readonly unknown[]).includes(value);
}

function readCoreFields(record: OpenCourseRecord): Partial<OpenCourseWorkspaceRecord> {
  return record as Partial<OpenCourseWorkspaceRecord>;
}

export function toOpenCourseWorkspaceRecord(
  record: OpenCourseRecord,
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): OpenCourseWorkspaceRecord {
  const core = readCoreFields(record);
  const classroom = core.classroom;
  return {
    ...record,
    status: resolveOpenCourseStatus(record, clock),
    coverId: isCoverId(core.coverId) ? core.coverId : 'cover-green',
    passcode: typeof core.passcode === 'string' && core.passcode.trim()
      ? core.passcode.trim().toUpperCase()
      : createDemoOpenCoursePasscode(record.id),
    classroom: normalizeOpenCourseClassroom({
      showSeats: classroom?.showSeats ?? true,
      autoStage: classroom?.autoStage ?? true,
      stageCapacity: isStageCapacity(classroom?.stageCapacity) ? classroom.stageCapacity : '1V6',
      recordClassroom: classroom?.recordClassroom ?? false,
      recordScene: classroom?.recordScene ?? false,
    }),
    createdAt: typeof core.createdAt === 'string' ? core.createdAt : OPEN_COURSE_DEMO_CLOCK_ISO,
  };
}

function sortOpenCourseRecords(
  records: ReadonlyArray<OpenCourseWorkspaceRecord>,
  sort: OpenCourseCollectionSort,
): OpenCourseWorkspaceRecord[] {
  return [...records].sort((left, right) => {
    if (sort === 'title-asc') {
      return left.title.localeCompare(right.title, 'zh-CN') || left.id.localeCompare(right.id);
    }
    const direction = sort === 'starts-desc' ? -1 : 1;
    return direction * (new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
      || left.id.localeCompare(right.id);
  });
}

function filterOpenCourseCollection(
  records: ReadonlyArray<OpenCourseWorkspaceRecord>,
  options: OpenCourseCollectionOptions,
): OpenCourseWorkspaceRecord[] {
  const normalizedQuery = options.query?.trim().toLocaleLowerCase() ?? '';
  const status = options.status ?? 'all';
  const filtered = records
    .filter((record) => status === 'all' || record.status === status)
    .filter((record) => !normalizedQuery || [record.title, record.subject, record.instructorName]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery));
  return sortOpenCourseRecords(filtered, options.sort ?? 'starts-asc');
}

export function selectTeacherOpenCourses(
  records: ReadonlyArray<OpenCourseRecord>,
  options: OpenCourseCollectionOptions = {},
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): OpenCourseWorkspaceRecord[] {
  const owned = records
    .filter(({ visibleTo, ownerRoles }) => visibleTo.includes('teacher') && ownerRoles.includes('teacher'))
    .map((record) => toOpenCourseWorkspaceRecord(record, clock));
  return filterOpenCourseCollection(owned, options);
}

export function selectStudentOpenCourses(
  records: ReadonlyArray<OpenCourseRecord>,
  joinedCourseIds: ReadonlySet<string>,
  options: OpenCourseCollectionOptions = {},
  clock: Date = OPEN_COURSE_DEMO_CLOCK,
): OpenCourseWorkspaceRecord[] {
  const joined = records
    .filter(({ id, visibleTo }) => visibleTo.includes('student-family') && joinedCourseIds.has(id))
    .map((record) => toOpenCourseWorkspaceRecord(record, clock));
  return filterOpenCourseCollection(joined, options);
}

export function openCourseRecordToInput(record: OpenCourseRecord): OpenCourseInput {
  const course = toOpenCourseWorkspaceRecord(record);
  return {
    title: course.title,
    coverId: course.coverId,
    startsAt: course.startsAt,
    durationMinutes: OPEN_COURSE_DURATIONS.includes(course.durationMinutes as OpenCourseDuration)
      ? course.durationMinutes as OpenCourseDuration
      : 40,
    classroom: { ...course.classroom },
  };
}

export function createOpenCourseRecord(input: OpenCourseInput, id: string): OpenCourseWorkspaceRecord {
  const validation = validateOpenCourseInput(input);
  if (!validation.valid) throw new Error('Cannot create an invalid open course.');
  const value = validation.value;
  const record: OpenCourseWorkspaceRecord = {
    id,
    title: value.title,
    subject: '待设置',
    instructorName: '王老师',
    startsAt: value.startsAt,
    durationMinutes: value.durationMinutes,
    status: 'scheduled',
    visibleTo: ['teacher'],
    ownerRoles: ['teacher'],
    enrolledCount: 0,
    maxSeats: 0,
    description: '公开课介绍待补充。',
    classroomSummary: '线上直播间',
    coverId: value.coverId,
    passcode: createDemoOpenCoursePasscode(id),
    classroom: value.classroom,
    createdAt: OPEN_COURSE_DEMO_CLOCK_ISO,
  };
  return { ...record, status: resolveOpenCourseStatus(record) };
}

export function updateOpenCourseRecord(
  current: OpenCourseRecord,
  input: OpenCourseInput,
): OpenCourseWorkspaceRecord {
  if (!canEditOpenCourse(current)) throw new Error('Only scheduled open courses can be edited.');
  const validation = validateOpenCourseInput(input);
  if (!validation.valid) throw new Error('Cannot update an invalid open course.');
  const existing = toOpenCourseWorkspaceRecord(current);
  const value = validation.value;
  const next = {
    ...existing,
    title: value.title,
    coverId: value.coverId,
    startsAt: value.startsAt,
    durationMinutes: value.durationMinutes,
    classroom: value.classroom,
  };
  return { ...next, status: resolveOpenCourseStatus(next) };
}

export function joinOpenCourseByPasscode(
  records: ReadonlyArray<OpenCourseRecord>,
  joinedCourseIds: ReadonlySet<string>,
  passcode: string,
): JoinOpenCourseResult {
  const normalized = passcode.trim().toUpperCase();
  if (!normalized) return { status: 'empty' };
  const course = records
    .map((record) => toOpenCourseWorkspaceRecord(record))
    .find((record) => record.passcode === normalized);
  if (!course) return { status: 'not-found' };
  if (joinedCourseIds.has(course.id)) return { status: 'duplicate', course };
  return { status: 'success', course };
}
