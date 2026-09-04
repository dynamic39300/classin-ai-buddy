import type {
  LocalTaskFileCandidate,
  LocalTaskFileValidation,
  TaskFileCatalogResult,
  TaskFileCatalogSource,
  TaskMaterialCatalogPort,
} from '@contracts/workbuddy/task-material-source';
import type { TaskFileReference } from '@domain/workbuddy/task-assembly';

export type TaskMaterialCatalogScenario = 'loaded' | 'permission_denied' | 'recoverable_failure';

type CatalogFixture = Readonly<TaskFileReference & {
  updatedAt: string;
  ownerLabel: string;
  truthLabel: '[模拟]';
}>;

const MY_FILE_FIXTURES: readonly CatalogFixture[] = Object.freeze([
  {
    kind: 'file', id: 'my-file-function-notes', title: '函数单调性课堂笔记.pdf', source: 'my-files',
    mimeType: 'application/pdf', sizeBytes: 2_480_000, version: 'v3', locationLabel: '我的文件 / 备课资料',
    updatedAt: '2026-08-27 17:20', ownerLabel: '林老师', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'my-file-homework-analysis', title: '高一3班作业分析.xlsx', source: 'my-files',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeBytes: 986_000,
    version: 'v2', locationLabel: '我的文件 / 学情分析', updatedAt: '2026-08-26 20:14', ownerLabel: '林老师', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'my-file-lesson-outline', title: '函数单调性教学设计.docx', source: 'my-files',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 1_260_000,
    version: 'v5', locationLabel: '我的文件 / 教学设计', updatedAt: '2026-08-25 09:40', ownerLabel: '林老师', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'my-file-class-slides', title: '函数图像课堂例题.pptx', source: 'my-files',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', sizeBytes: 8_360_000,
    version: 'v1', locationLabel: '我的文件 / 课件', updatedAt: '2026-08-22 14:08', ownerLabel: '林老师', truthLabel: '[模拟]',
  },
]);

const CLASSIN_SPACE_FIXTURES: readonly CatalogFixture[] = Object.freeze([
  {
    kind: 'file', id: 'space-textbook-chapter', title: '人教A版必修一第三章教材.pdf', source: 'classin-space',
    mimeType: 'application/pdf', sizeBytes: 12_800_000, version: '2026.08', locationLabel: 'ClassIn 空间 / 星河学习中心 / 数学组',
    updatedAt: '2026-08-27 10:30', ownerLabel: '星河学习中心', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'space-question-bank', title: '函数单调性精选题库.docx', source: 'classin-space',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 3_420_000,
    version: 'v8', locationLabel: 'ClassIn 空间 / 高中数学 / 题库', updatedAt: '2026-08-26 16:45', ownerLabel: '高中数学教研组', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'space-rubric', title: '课堂观察评价量表.xlsx', source: 'classin-space',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeBytes: 640_000,
    version: 'v4', locationLabel: 'ClassIn 空间 / 教研规范', updatedAt: '2026-08-21 11:12', ownerLabel: '教学管理中心', truthLabel: '[模拟]',
  },
  {
    kind: 'file', id: 'space-demo-video', title: '函数图像示范课.mp4', source: 'classin-space',
    mimeType: 'video/mp4', sizeBytes: 18_600_000, version: 'v2', locationLabel: 'ClassIn 空间 / 示范课',
    updatedAt: '2026-08-18 18:00', ownerLabel: '王老师', truthLabel: '[模拟]',
  },
]);

export type TaskFileCatalogItemView = Readonly<{
  reference: TaskFileReference;
  ownerLabel: string;
  updatedAt: string;
}>;

function fixturesFor(source: TaskFileCatalogSource): readonly CatalogFixture[] {
  return source === 'my-files' ? MY_FILE_FIXTURES : CLASSIN_SPACE_FIXTURES;
}

function publicReference(fixture: CatalogFixture): TaskFileReference {
  return Object.freeze({
    kind: fixture.kind,
    id: fixture.id,
    title: fixture.title,
    source: fixture.source,
    mimeType: fixture.mimeType,
    sizeBytes: fixture.sizeBytes,
    version: fixture.version,
    locationLabel: fixture.locationLabel,
  });
}

function catalogResult(
  source: TaskFileCatalogSource,
  query: string,
  scenario: TaskMaterialCatalogScenario,
): TaskFileCatalogResult {
  if (scenario === 'permission_denied') {
    return Object.freeze({ outcome: 'permission_denied', message: '当前账号没有访问此文件来源的权限。' });
  }
  if (scenario === 'recoverable_failure') {
    return Object.freeze({ outcome: 'recoverable_failure', message: '文件列表暂时无法加载，请重试。' });
  }
  const needle = query.trim().toLocaleLowerCase('zh-CN');
  const items = fixturesFor(source)
    .filter((item) => !needle || `${item.title} ${item.locationLabel} ${item.ownerLabel}`.toLocaleLowerCase('zh-CN').includes(needle))
    .map(publicReference);
  return Object.freeze({ outcome: 'loaded', items: Object.freeze(items) });
}

function createCatalogAdapter(
  expectedSource: TaskFileCatalogSource,
  scenario: TaskMaterialCatalogScenario,
): TaskMaterialCatalogPort {
  return Object.freeze({
    async list(input) {
      if (input.source !== expectedSource) {
        return Object.freeze({ outcome: 'recoverable_failure', message: '文件来源与当前选择器不一致。' });
      }
      return catalogResult(expectedSource, input.query, scenario);
    },
  });
}

export function createDemoMyFilesAdapter(
  scenario: TaskMaterialCatalogScenario = 'loaded',
): TaskMaterialCatalogPort {
  return createCatalogAdapter('my-files', scenario);
}

export function createDemoClassInSpaceAdapter(
  scenario: TaskMaterialCatalogScenario = 'loaded',
): TaskMaterialCatalogPort {
  return createCatalogAdapter('classin-space', scenario);
}

export function getTaskFileCatalogItemView(reference: TaskFileReference): TaskFileCatalogItemView | null {
  const fixture = [...MY_FILE_FIXTURES, ...CLASSIN_SPACE_FIXTURES]
    .find((candidate) => candidate.source === reference.source && candidate.id === reference.id);
  return fixture ? Object.freeze({ reference: publicReference(fixture), ownerLabel: fixture.ownerLabel, updatedAt: fixture.updatedAt }) : null;
}

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'mp4']);
const MAX_LOCAL_FILE_BYTES = 25 * 1024 * 1024;

function localFileId(candidate: LocalTaskFileCandidate): string {
  const normalized = candidate.name.toLocaleLowerCase('zh-CN').replace(/[^\p{L}\p{N}.-]+/gu, '-');
  return `${normalized}:${candidate.size}:${candidate.lastModified}`;
}

export function createLocalTaskFileReference(candidate: LocalTaskFileCandidate): TaskFileReference {
  return Object.freeze({
    kind: 'file',
    id: localFileId(candidate),
    title: candidate.name.trim() || '无法读取的本地文件',
    source: 'local',
    mimeType: candidate.type || 'application/octet-stream',
    sizeBytes: Number.isFinite(candidate.size) && candidate.size >= 0 ? candidate.size : null,
    version: null,
    locationLabel: '本地文件',
  });
}

export function validateLocalTaskFile(candidate: LocalTaskFileCandidate): LocalTaskFileValidation {
  if (!candidate.name.trim() || !Number.isFinite(candidate.size) || candidate.size < 0 || !Number.isFinite(candidate.lastModified)) {
    return Object.freeze({ ok: false, reason: 'read_error', message: '无法读取该文件的基本信息。' });
  }
  if (candidate.size > MAX_LOCAL_FILE_BYTES) {
    return Object.freeze({ ok: false, reason: 'too_large', message: '单个文件不能超过 25 MB。' });
  }
  const extension = candidate.name.split('.').at(-1)?.toLocaleLowerCase('zh-CN') ?? '';
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return Object.freeze({ ok: false, reason: 'unsupported', message: '暂不支持该文件格式。' });
  }
  return Object.freeze({
    ok: true,
    reference: createLocalTaskFileReference(candidate),
  });
}
