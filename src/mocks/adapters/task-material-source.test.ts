import { describe, expect, it } from 'vitest';
import {
  createDemoClassInSpaceAdapter,
  createDemoMyFilesAdapter,
  getTaskFileCatalogItemView,
  validateLocalTaskFile,
} from './task-material-source';

describe('task material source adapters', () => {
  it('returns stable, searchable My Files references', async () => {
    const adapter = createDemoMyFilesAdapter();
    const all = await adapter.list({ source: 'my-files', query: '' });
    const filtered = await adapter.list({ source: 'my-files', query: '学情' });
    expect(all.outcome === 'loaded' && all.items[0]?.id).toBe('my-file-function-notes');
    expect(filtered.outcome === 'loaded' && filtered.items.map(({ id }) => id)).toEqual(['my-file-homework-analysis']);
    if (all.outcome === 'loaded') expect(all.items[0]).not.toHaveProperty('truthLabel');
  });

  it('keeps ClassIn Space identity and catalog metadata separate from task references', async () => {
    const adapter = createDemoClassInSpaceAdapter();
    const result = await adapter.list({ source: 'classin-space', query: '高中数学' });
    expect(result).toMatchObject({ outcome: 'loaded', items: [{ id: 'space-question-bank', source: 'classin-space' }] });
    if (result.outcome === 'loaded') {
      expect(getTaskFileCatalogItemView(result.items[0]!)).toMatchObject({ ownerLabel: '高中数学教研组' });
    }
  });

  it('rejects cross-source queries instead of returning the wrong catalog', async () => {
    const result = await createDemoMyFilesAdapter().list({ source: 'classin-space', query: '' });
    expect(result).toMatchObject({ outcome: 'recoverable_failure' });
  });

  it.each(['permission_denied', 'recoverable_failure'] as const)('projects the %s scenario', async (scenario) => {
    const result = await createDemoClassInSpaceAdapter(scenario).list({ source: 'classin-space', query: '' });
    expect(result.outcome).toBe(scenario);
  });

  it('allows same file names from different sources to retain different identities', async () => {
    const myFiles = await createDemoMyFilesAdapter().list({ source: 'my-files', query: '' });
    const space = await createDemoClassInSpaceAdapter().list({ source: 'classin-space', query: '' });
    expect(myFiles.outcome).toBe('loaded');
    expect(space.outcome).toBe('loaded');
    if (myFiles.outcome === 'loaded' && space.outcome === 'loaded') {
      expect(new Set([...myFiles.items, ...space.items].map((item) => `${item.source}:${item.id}`)).size)
        .toBe(myFiles.items.length + space.items.length);
    }
  });

  it('validates supported, oversized, unsupported and unreadable local files', () => {
    expect(validateLocalTaskFile({ name: '教学设计.pdf', type: 'application/pdf', size: 1024, lastModified: 1 }))
      .toMatchObject({ ok: true, reference: { source: 'local', title: '教学设计.pdf' } });
    expect(validateLocalTaskFile({ name: '大文件.pdf', type: 'application/pdf', size: 26 * 1024 * 1024, lastModified: 1 }))
      .toMatchObject({ ok: false, reason: 'too_large' });
    expect(validateLocalTaskFile({ name: '程序.exe', type: 'application/octet-stream', size: 1024, lastModified: 1 }))
      .toMatchObject({ ok: false, reason: 'unsupported' });
    expect(validateLocalTaskFile({ name: '', type: '', size: -1, lastModified: Number.NaN }))
      .toMatchObject({ ok: false, reason: 'read_error' });
  });
});
