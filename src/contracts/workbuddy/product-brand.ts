/**
 * Product-facing naming for the teacher AI companion.
 *
 * Internal routes, storage namespaces and domain types intentionally keep the
 * historical `workbuddy` identifier so a display-brand change cannot invalidate
 * persisted sessions or evidence chains.
 */
export const TEACHBUDDY_BRAND = Object.freeze({
  officialName: 'ClassIn TeachBuddy',
  shortName: 'TeachBuddy',
  descriptor: 'AI 教学搭档',
  workspaceDescriptor: '教师工作空间',
});
