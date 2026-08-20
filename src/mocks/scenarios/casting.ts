import type { CastingTarget } from '@domain/casting/casting';

export const CASTING_TARGETS: readonly CastingTarget[] = [
  { id: 'screen-2', name: '2大屏', network: '同一局域网 · 可用', kind: 'device' },
  { id: 'classinx-0efd5', name: 'ClassInX-0EFD5', network: '同一局域网 · 可用', kind: 'device' },
];

export const CASTING_NETWORK = { name: 'E0O', ip: '10.254.76.71' };
export const CASTING_CODE_TARGET: CastingTarget = { id: 'casting-code', name: '投屏码设备', network: '由投屏码匹配 · Demo', kind: 'code' };
