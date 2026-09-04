import { describe, expect, it } from 'vitest';
import {
  taskAssemblyModule,
  taskMaterialKey,
  type TaskAgentReference,
  type TaskFileReference,
  type TaskSkillReference,
} from './task-assembly';

const agent = (id = 'daily-quote', prompt = '请生成一句课堂名言。'): TaskAgentReference => ({
  kind: 'agent', id, title: id, avatarAsset: null, source: 'agentin', recommendedPrompt: prompt,
});

const skill = (task = false): TaskSkillReference => ({
  kind: 'skill', id: task ? 'courseware' : 'word', title: task ? '生成单个课件' : 'Word 文档',
  description: '测试技能', source: 'official',
  taskIntent: task ? { taskType: 'single-courseware', suggestedGoal: '生成一份课件。' } : null,
});

const file = (source: TaskFileReference['source'] = 'my-files'): TaskFileReference => ({
  kind: 'file', id: 'file-1', title: '函数资料.pdf', source, mimeType: 'application/pdf',
  sizeBytes: 1024, version: 'v1', locationLabel: source,
});

describe('taskAssemblyModule', () => {
  it('injects an agent prompt into empty and non-empty drafts', () => {
    const empty = taskAssemblyModule.create();
    const first = taskAssemblyModule.dispatch(empty, { type: 'select-agent', agent: agent() });
    expect(first.session.text).toBe('请生成一句课堂名言。');
    expect(first.session.promptFragments[0]?.range).toEqual({ start: 0, end: first.session.text.length });

    const withTeacherText = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'replace-text', value: '我的教学目标', caret: 6,
    });
    const appended = taskAssemblyModule.dispatch(withTeacherText.session, { type: 'select-agent', agent: agent() });
    expect(appended.session.text).toBe('我的教学目标\n请生成一句课堂名言。');
    expect(appended.session.promptFragments[0]?.range.start).toBe(7);
  });

  it('deduplicates stable references and preserves selection order', () => {
    let session = taskAssemblyModule.create();
    session = taskAssemblyModule.dispatch(session, { type: 'select-skill', skill: skill() }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'add-file', file: file(), state: { status: 'ready' } }).session;
    const duplicate = taskAssemblyModule.dispatch(session, { type: 'add-file', file: file(), state: { status: 'ready' } });
    expect(duplicate.result).toMatchObject({ outcome: 'unchanged', reason: 'duplicate' });
    expect(session.materials.map(({ selectionOrder }) => selectionOrder)).toEqual([1, 2]);
  });

  it('keeps multiple Agent references but replaces the previous automatic prompt', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'select-agent', agent: agent('a', '第一段'),
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'select-agent', agent: agent('b', '第二段') }).session;
    expect(session.text).toBe('第二段');
    expect(session.promptFragments.map(({ agentId, range }) => ({ agentId, text: session.text.slice(range.start, range.end) })))
      .toEqual([{ agentId: 'b', text: '第二段' }]);
    expect(session.materials.map(({ reference }) => reference.id)).toEqual(['a', 'b']);
  });

  it('replaces task Skill and Agent prompts while preserving teacher-authored text', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'replace-text', value: '请保留这条教师要求', caret: 9,
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'select-skill', skill: skill(true) }).session;
    expect(session.text).toBe('请保留这条教师要求\n生成一份课件。');
    session = taskAssemblyModule.dispatch(session, { type: 'select-agent', agent: agent('a', '新的 Agent Prompt') }).session;
    expect(session.text).toBe('请保留这条教师要求\n新的 Agent Prompt');
    session = taskAssemblyModule.dispatch(session, { type: 'select-skill', skill: {
      ...skill(true), id: 'course-package', title: '生成课程方案包',
      taskIntent: { taskType: 'course-package', suggestedGoal: '新的 Skill Prompt' },
    } }).session;
    expect(session.text).toBe('请保留这条教师要求\n新的 Skill Prompt');
  });

  it('moves untouched fragments when the teacher edits before them', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'replace-text', value: '目标', caret: 2,
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'select-agent', agent: agent('a', '建议') }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'replace-text', value: '详细目标\n建议', caret: 4 }).session;
    expect(session.promptFragments[0]).toMatchObject({ range: { start: 5, end: 7 }, editState: 'untouched' });
  });

  it('marks intersected prompts edited and preserves them when removing the agent', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'select-agent', agent: agent('a', '原始建议'),
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'replace-text', value: '教师改写建议', caret: 6 }).session;
    expect(session.promptFragments[0]?.editState).toBe('edited');
    const removed = taskAssemblyModule.dispatch(session, { type: 'remove-material', key: 'agent:agentin:a' });
    expect(removed.session.text).toBe('教师改写建议');
    expect(removed.result).toMatchObject({ outcome: 'changed', effect: { promptPreserved: true } });
  });

  it('removes only an untouched anchored prompt and never identical teacher text elsewhere', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'replace-text', value: '同一句', caret: 3,
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'select-agent', agent: agent('a', '同一句') }).session;
    const removed = taskAssemblyModule.dispatch(session, { type: 'remove-material', key: 'agent:agentin:a' });
    expect(removed.session.text).toBe('同一句');
  });

  it('undoes an agent add without deleting unrelated teacher text typed afterwards', () => {
    const added = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'select-agent', agent: agent('a', '建议'),
    });
    const undoId = added.result.outcome === 'changed' ? added.result.undoId : null;
    let session = taskAssemblyModule.dispatch(added.session, {
      type: 'replace-text', value: '建议\n教师补充', caret: 7,
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'undo', undoId: undoId! }).session;
    expect(session.text).toBe('建议\n教师补充');
    expect(session.materials).toHaveLength(0);
  });

  it('restores removed untouched prompt and original material order', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), { type: 'select-skill', skill: skill() }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'select-agent', agent: agent('a', '建议') }).session;
    const removed = taskAssemblyModule.dispatch(session, { type: 'remove-material', key: 'agent:agentin:a' });
    const undoId = removed.result.outcome === 'changed' ? removed.result.undoId : null;
    const restored = taskAssemblyModule.dispatch(removed.session, { type: 'undo', undoId: undoId! });
    expect(restored.session.text).toBe('建议');
    expect(restored.session.materials.map(({ reference }) => reference.kind)).toEqual(['skill', 'agent']);
  });

  it('keeps task-skill suggestions when the skill is removed', () => {
    const selected = taskAssemblyModule.dispatch(taskAssemblyModule.create(), { type: 'select-skill', skill: skill(true) });
    expect(selected.session.text).toBe('生成一份课件。');
    const removed = taskAssemblyModule.dispatch(selected.session, {
      type: 'remove-material', key: taskMaterialKey(skill(true)),
    });
    expect(removed.session.text).toBe('生成一份课件。');
  });

  it('blocks snapshots for non-ready files and preserves provenance for ready materials', () => {
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'select-agent', agent: agent('a', '建议'),
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'add-file', file: file(), state: { status: 'reading', progress: null } }).session;
    expect(taskAssemblyModule.createSnapshot(session, { id: 'snapshot-1', createdAt: '2026-09-03T00:00:00.000Z' }))
      .toMatchObject({ ok: false, reason: 'material_not_ready' });
    session = taskAssemblyModule.dispatch(session, {
      type: 'update-file-state', key: taskMaterialKey(file()), state: { status: 'ready' },
    }).session;
    const snapshot = taskAssemblyModule.createSnapshot(session, { id: 'snapshot-1', createdAt: '2026-09-03T00:00:00.000Z' });
    expect(snapshot.ok && snapshot.snapshot).toMatchObject({
      goal: '建议', materials: [{ kind: 'agent' }, { kind: 'file' }],
      agentPromptProvenance: [{ agentId: 'a', finalText: '建议', editState: 'untouched' }],
    });
  });

  it('fails closed on unsafe sessions and restores local files as stale', () => {
    expect(taskAssemblyModule.create({ version: 1, text: 'x' })).toEqual(taskAssemblyModule.create());
    let session = taskAssemblyModule.dispatch(taskAssemblyModule.create(), {
      type: 'replace-text', value: '目标', caret: 2,
    }).session;
    session = taskAssemblyModule.dispatch(session, { type: 'add-file', file: file('local'), state: { status: 'ready' } }).session;
    const restored = taskAssemblyModule.create(JSON.parse(JSON.stringify(session)));
    expect(restored.materials[0]?.state).toEqual({ status: 'stale', reason: 'local_file_reselect' });
  });

  it('clears assembly state without depending on external context', () => {
    const selected = taskAssemblyModule.dispatch(taskAssemblyModule.create(), { type: 'select-agent', agent: agent() });
    expect(taskAssemblyModule.dispatch(selected.session, { type: 'clear' }).session).toEqual(taskAssemblyModule.create());
  });
});
