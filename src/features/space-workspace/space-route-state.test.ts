import { describe, expect, it } from 'vitest';
import { parseSpaceRouteState } from './space-route-state';

describe('space route state', () => {
  it('restores a valid drive directory, search, sort, and view from the URL', () => {
    expect(parseSpaceRouteState(
      'my-drive',
      new URLSearchParams('parentId=my-root-folder&q=pdf&sort=updated&view=grid'),
    )).toEqual({
      parentId: 'my-root-folder',
      query: 'pdf',
      driveSort: 'updated',
      resourceSort: 'latest',
      view: 'grid',
      resourceTab: 'all',
    });
  });

  it('restores the resource view without accepting drive-only values', () => {
    expect(parseSpaceRouteState(
      'resource-center',
      new URLSearchParams('parentId=my-root-folder&q=动量&sort=name&view=grid&resourceTab=mine'),
    )).toEqual({
      parentId: null,
      query: '动量',
      driveSort: 'name',
      resourceSort: 'name',
      view: 'list',
      resourceTab: 'mine',
    });
  });

  it('falls back safely when URL values are unsupported', () => {
    expect(parseSpaceRouteState(
      'organization-drive',
      new URLSearchParams('parentId=&sort=latest&view=board&resourceTab=owned'),
    )).toEqual({
      parentId: null,
      query: '',
      driveSort: 'name',
      resourceSort: 'latest',
      view: 'list',
      resourceTab: 'all',
    });
  });
});
