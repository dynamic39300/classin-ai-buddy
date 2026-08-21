import { expect, test, type Page } from '@playwright/test';

async function openSurface(page: Page, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const teacherButton = page.getByRole('button', { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
  await page.getByRole('group', { name: 'Work Buddy 二级导航' }).getByRole('link', { name: label, exact: true }).click();
  await expect(page.getByTestId('ai-agent-workspace-layout').getByRole('heading', { level: 1, name: label })).toBeVisible();
}

for (const label of ['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']) {
  test(`${label} high-fidelity surface`, async ({ page }) => {
    await openSurface(page, label);
    await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(`workbuddy-${label}.png`, { animations: 'disabled' });
  });
}

for (const label of ['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']) {
  test(`${label} compact surface`, async ({ page }) => {
    await openSurface(page, label);
    await page.setViewportSize({ width: 1000, height: 768 });
    await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(`workbuddy-${label}-compact.png`, { animations: 'disabled' });
  });
}
