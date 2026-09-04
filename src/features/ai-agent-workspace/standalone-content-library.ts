import {
  TEACHERIN_CONTENT_SCHEMA_VERSION,
  isTeacherInCompatibleContentPackage,
  type TeacherInCompatibleContentPackage,
} from '@domain/teacherin/content';
import type { CapabilityItem } from './capability-workspace';

type FixtureInput = Readonly<{
  id: string;
  title: string;
  description: string;
  contentType: TeacherInCompatibleContentPackage['contentType'];
  stage: string;
  subject: string;
  tags: readonly string[];
  source: string;
  visibility: TeacherInCompatibleContentPackage['authorization']['visibility'];
  version: string;
}>;

function packageFixture(input: FixtureInput): TeacherInCompatibleContentPackage {
  const value: TeacherInCompatibleContentPackage = Object.freeze({
    schemaVersion: TEACHERIN_CONTENT_SCHEMA_VERSION,
    id: input.id,
    version: input.version,
    contentType: input.contentType,
    title: input.title,
    description: input.description,
    stage: input.stage,
    subject: input.subject,
    tags: Object.freeze([...input.tags]),
    assets: Object.freeze([Object.freeze({ id: `asset-${input.id}`, kind: 'document' as const, format: input.contentType === 'courseware' ? 'pptx' : 'teacherin-json', version: input.version })]),
    provenance: Object.freeze({ sourceRunRef: `fixture-${input.id}`, sourceArtifactRef: Object.freeze({ id: `artifact-${input.id}`, version: input.version }), authorId: input.source, generatedBy: 'workbuddy' as const }),
    authorization: Object.freeze({ visibility: input.visibility, reuse: 'reference-and-adapt' as const, attributionRequired: true }),
    lifecycle: Object.freeze({ state: 'published' as const, createdAt: '2026-08-20T10:00:00+08:00', updatedAt: '2026-08-22T10:00:00+08:00' }),
    truthLabel: '[模拟]' as const,
  });
  if (!isTeacherInCompatibleContentPackage(value)) throw new Error(`Invalid TeacherIn-compatible content fixture: ${input.id}`);
  return value;
}

const STANDALONE_CONTENT_PACKAGES: readonly TeacherInCompatibleContentPackage[] = Object.freeze([
  packageFixture({ id: 'standalone-content-function-lesson', title: '函数单调性精品教案', description: '围绕函数单调性的概念建构、例题与课堂评价组织完整教学流程。', contentType: 'lesson-plan', stage: '高中', subject: '数学', tags: ['教案', '函数'], source: 'workbuddy-community', visibility: 'teacher-community', version: 'v1.5' }),
  packageFixture({ id: 'standalone-content-wave-visual', title: '机械波概念演示', description: '以波速、频率和波长关系为主线的智能课件模板。', contentType: 'courseware', stage: '高中', subject: '物理', tags: ['课件', '机械波'], source: 'demo-teacher', visibility: 'teacher-community', version: 'v2.0' }),
  packageFixture({ id: 'standalone-content-momentum-review', title: '动量守恒单元复习', description: '面向动量守恒单元的课堂复习和随堂练习素材。', contentType: 'material', stage: '高中', subject: '物理', tags: ['练习', '复习'], source: 'community-teacher', visibility: 'teacher-community', version: 'v1.3' }),
  packageFixture({ id: 'standalone-content-geometry-game', title: '空间几何互动练习', description: '通过可旋转模型和分层问题帮助学生建立空间几何表象。', contentType: 'activity', stage: '高中', subject: '数学', tags: ['活动', '空间几何'], source: 'workbuddy-community', visibility: 'teacher-community', version: 'v1.1' }),
  packageFixture({ id: 'standalone-content-chemistry-paper', title: '化学反应原理单元测验', description: '覆盖化学平衡、电离平衡和反应热的单元测验与评分要点。', contentType: 'quiz', stage: '高中', subject: '化学', tags: ['试卷', '化学反应'], source: 'community-teacher', visibility: 'teacher-community', version: 'v2.2' }),
  packageFixture({ id: 'standalone-content-lab-assets', title: '电磁感应实验素材包', description: '包含实验装置图、数据表和课堂观察记录模板。', contentType: 'material', stage: '高中', subject: '物理', tags: ['素材', '电磁感应'], source: 'demo-teacher', visibility: 'private', version: 'v1.4' }),
]);

const CONTENT_TYPE_LABEL: Readonly<Record<TeacherInCompatibleContentPackage['contentType'], string>> = Object.freeze({
  courseware: '课件',
  'lesson-plan': '教案',
  quiz: '试卷',
  activity: '活动',
  material: '素材',
});

function projectContentItem(content: TeacherInCompatibleContentPackage, currentAccountId?: string): CapabilityItem {
  const mine = currentAccountId === content.provenance.authorId;
  const typeLabel = CONTENT_TYPE_LABEL[content.contentType];
  return Object.freeze({
    id: content.id,
    truth: content.truthLabel,
    title: content.title,
    subtitle: `${content.stage}${content.subject} · ${typeLabel}`,
    status: mine ? '可改编' : '已收藏',
    statusTone: mine ? 'info' : 'success',
    meta: [mine ? '我的作品' : '教师社区', `契约：${content.schemaVersion}`, content.authorization.visibility === 'private' ? '仅本人管理' : '可公开引用'],
    tags: [typeLabel, `${content.stage}${content.subject}`, ...content.tags],
    description: content.description,
    source: mine ? '我的作品' : '教师社区',
    version: content.version,
    permissions: content.authorization.reuse === 'reference-and-adapt' ? ['可引用', '可改编', '必须保留来源'] : ['仅允许引用'],
  });
}

export function standaloneContentItems(
  personalPackages: readonly TeacherInCompatibleContentPackage[] = [],
  accountId?: string,
): readonly CapabilityItem[] {
  const all = [...personalPackages, ...STANDALONE_CONTENT_PACKAGES.filter(({ id }) => !personalPackages.some((content) => content.id === id))];
  return all
    .filter((content) => content.authorization.visibility === 'teacher-community' || content.provenance.authorId === accountId)
    .map((content) => projectContentItem(content, accountId));
}

export function standaloneContentPackages(): readonly TeacherInCompatibleContentPackage[] {
  return STANDALONE_CONTENT_PACKAGES.map((content) => ({ ...content }));
}
