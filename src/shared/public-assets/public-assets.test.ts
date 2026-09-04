import { describe, expect, it } from 'vitest';
import { applicationBasename, publicAssetUrl } from './index';

describe('public deployment paths', () => {
  it('keeps root deployments unchanged', () => {
    expect(publicAssetUrl('/brand/eeo.svg', '/')).toBe('/brand/eeo.svg');
    expect(applicationBasename('/')).toBeUndefined();
  });

  it('projects assets and router basename into a deployment subdirectory', () => {
    expect(publicAssetUrl('/brand/eeo.svg', '/classin-newstruc/')).toBe('/classin-newstruc/brand/eeo.svg');
    expect(applicationBasename('/classin-newstruc/')).toBe('/classin-newstruc');
  });

  it('normalizes operator-provided base paths', () => {
    expect(publicAssetUrl('brand/eeo.svg', 'classin-newstruc')).toBe('/classin-newstruc/brand/eeo.svg');
  });
});
