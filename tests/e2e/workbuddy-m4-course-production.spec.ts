import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher reviews Core Context and freezes a resettable Snapshot @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();

  const summary = page.getByRole('group', { name: '核心上下文摘要' });
  await expect(summary.getByText('ClassIn 教研中心', { exact: true })).toBeVisible();
  await expect(summary.getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(summary.getByText('高一（3）班', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /核心上下文/ }).click();
  const panel = page.getByRole('complementary', { name: '核心上下文' });
  await expect(panel).toBeVisible();
  for (const section of ['教师与组织', '教学范围', '学习者范围', '时间与日程', '资源与教师输入', '教学证据', 'Domain Knowledge']) {
    await expect(panel.getByRole('heading', { name: section })).toBeVisible();
  }
  await expect(panel.getByText('王老师', { exact: true })).toBeVisible();
  await expect(panel.getByText('学生姓名默认不进入普通课程生产任务')).toBeVisible();
  await expect(panel.getByRole('button', { name: '确认 ContextSnapshot' })).toBeDisabled();

  await panel.getByRole('button', { name: '应用动量课程建议' }).click();
  await expect(panel.getByText('可以确认 Snapshot', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '确认 ContextSnapshot' })).toBeEnabled();
  await panel.getByRole('button', { name: '确认 ContextSnapshot' }).click();

  await expect(panel.getByText('Snapshot 已冻结', { exact: true })).toBeVisible();
  await expect(panel.getByText('workbuddy-m4-context-v1', { exact: true })).toBeVisible();
  await expect(summary.getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(summary.getByText('动量与碰撞', { exact: true })).toBeVisible();
  await expect(summary.getByText('第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(summary.getByText('全班 30 人', { exact: true })).toBeVisible();

  await panel.getByRole('button', { name: '重置 M4 场景' }).click();
  await expect(summary.getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(panel.getByText('需要补充教学范围', { exact: true })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});
