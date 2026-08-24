export type MessageWorkspaceLayoutScope = 'messages-global' | 'messages-class';

export type WorkBuddyWidthLimits = {
  max: number;
  min: number;
};

const WORKBUDDY_MIN_WIDTH = 384;
const WORKBUDDY_MAX_WIDTH = 640;
const WORKBUDDY_DEFAULT_MAX_WIDTH = 520;
const WORKBUDDY_DEFAULT_VIEWPORT_RATIO = 0.34;
const WORKBUDDY_MAX_CONTAINER_RATIO = 0.45;
const LAYOUT_OUTER_PADDING = 24;
const SPLITTER_WIDTH = 12;
const GLOBAL_COMMUNICATION_MIN_WIDTH = 704;
const CLASS_COMMUNICATION_MIN_WIDTH = 576;
const STORAGE_KEY_PREFIX = 'classin.message-workspace.workbuddy-width';

function getStorageKey(scope: MessageWorkspaceLayoutScope): string {
  return `${STORAGE_KEY_PREFIX}.${scope}`;
}

export function getDefaultWorkBuddyWidth(containerWidth: number): number {
  return Math.min(
    WORKBUDDY_DEFAULT_MAX_WIDTH,
    Math.max(WORKBUDDY_MIN_WIDTH, containerWidth * WORKBUDDY_DEFAULT_VIEWPORT_RATIO),
  );
}

export function getWorkBuddyWidthLimits(
  containerWidth: number,
  scope: MessageWorkspaceLayoutScope,
): WorkBuddyWidthLimits {
  const communicationMinWidth = scope === 'messages-global'
    ? GLOBAL_COMMUNICATION_MIN_WIDTH
    : CLASS_COMMUNICATION_MIN_WIDTH;
  const availableAfterMain = containerWidth - LAYOUT_OUTER_PADDING - SPLITTER_WIDTH - communicationMinWidth;
  const max = Math.max(
    WORKBUDDY_MIN_WIDTH,
    Math.min(WORKBUDDY_MAX_WIDTH, containerWidth * WORKBUDDY_MAX_CONTAINER_RATIO, availableAfterMain),
  );
  return { min: WORKBUDDY_MIN_WIDTH, max };
}

export function clampWorkBuddyWidth(width: number, limits: WorkBuddyWidthLimits): number {
  return Math.min(limits.max, Math.max(limits.min, width));
}

export function readWorkBuddyWidthPreference(scope: MessageWorkspaceLayoutScope): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = Number.parseFloat(window.localStorage.getItem(getStorageKey(scope)) ?? '');
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeWorkBuddyWidthPreference(scope: MessageWorkspaceLayoutScope, width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(scope), String(Math.round(width)));
  } catch {
    // Layout preferences are optional and must never block message work.
  }
}
