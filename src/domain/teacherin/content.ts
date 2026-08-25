export const TEACHERIN_CONTENT_SCHEMA_VERSION = 'teacherin-content-v1' as const;

export type TeacherInCompatibleContentPackage = Readonly<{
  schemaVersion: typeof TEACHERIN_CONTENT_SCHEMA_VERSION;
  id: string;
  version: string;
  contentType: 'courseware' | 'lesson-plan' | 'quiz' | 'activity' | 'material';
  title: string;
  description: string;
  stage: string;
  subject: string;
  tags: readonly string[];
  assets: readonly Readonly<{ id: string; kind: 'document' | 'cover' | 'attachment'; format: string; version: string }>[];
  provenance: Readonly<{
    sourceRunRef: string;
    sourceArtifactRef: Readonly<{ id: string; version: string }>;
    authorId: string;
    generatedBy: 'workbuddy';
  }>;
  authorization: Readonly<{
    visibility: 'private' | 'teacher-community';
    reuse: 'reference-only' | 'reference-and-adapt';
    attributionRequired: boolean;
  }>;
  lifecycle: Readonly<{
    state: 'draft' | 'published';
    createdAt: string;
    updatedAt: string;
  }>;
  truthLabel: '[模拟]';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isTeacherInCompatibleContentPackage(value: unknown): value is TeacherInCompatibleContentPackage {
  if (!isRecord(value) || value.schemaVersion !== TEACHERIN_CONTENT_SCHEMA_VERSION
    || !isNonEmptyString(value.id) || !isNonEmptyString(value.version)
    || !['courseware', 'lesson-plan', 'quiz', 'activity', 'material'].includes(String(value.contentType))
    || !isNonEmptyString(value.title) || !isNonEmptyString(value.description)
    || !isNonEmptyString(value.stage) || !isNonEmptyString(value.subject)
    || !Array.isArray(value.tags) || !value.tags.every(isNonEmptyString)
    || !Array.isArray(value.assets) || value.assets.length === 0
    || !value.assets.every((asset) => isRecord(asset) && isNonEmptyString(asset.id)
      && ['document', 'cover', 'attachment'].includes(String(asset.kind))
      && isNonEmptyString(asset.format) && isNonEmptyString(asset.version))
    || !isRecord(value.provenance) || !isNonEmptyString(value.provenance.sourceRunRef)
    || !isRecord(value.provenance.sourceArtifactRef) || !isNonEmptyString(value.provenance.sourceArtifactRef.id)
    || !isNonEmptyString(value.provenance.sourceArtifactRef.version) || !isNonEmptyString(value.provenance.authorId)
    || value.provenance.generatedBy !== 'workbuddy'
    || !isRecord(value.authorization) || !['private', 'teacher-community'].includes(String(value.authorization.visibility))
    || !['reference-only', 'reference-and-adapt'].includes(String(value.authorization.reuse))
    || typeof value.authorization.attributionRequired !== 'boolean'
    || !isRecord(value.lifecycle) || !['draft', 'published'].includes(String(value.lifecycle.state))
    || !isNonEmptyString(value.lifecycle.createdAt) || !isNonEmptyString(value.lifecycle.updatedAt)
    || value.truthLabel !== '[模拟]') return false;
  return !Number.isNaN(Date.parse(value.lifecycle.createdAt)) && !Number.isNaN(Date.parse(value.lifecycle.updatedAt));
}
