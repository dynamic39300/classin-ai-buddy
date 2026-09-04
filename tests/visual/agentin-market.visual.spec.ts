import { expect, test, type Page } from '@playwright/test';

async function openAgentIn(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('button', { name: 'TeacherIn', exact: true }).click();
  await primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' }).getByRole('link', { name: 'AgentIn', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '添加智能体' })).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.mouse.move(0, 0);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 640 }]) {
  test(`AgentIn market fidelity at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openAgentIn(page, viewport);
    await expect(page).toHaveScreenshot(`agentin-market-${viewport.width}x${viewport.height}.png`, {
      animations: 'disabled',
      fullPage: true,
    });
  });
}

test('AgentIn search result fidelity', async ({ page }) => {
  await openAgentIn(page, { width: 1440, height: 900 });
  await page.getByRole('searchbox', { name: '搜索智能体' }).fill('NOBOOK');
  await expect(page.getByText('找到 1 个与“NOBOOK”相关的智能体')).toBeVisible();
  await expect(page).toHaveScreenshot('agentin-market-search-result-1440x900.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('AgentIn catalog middle fidelity', async ({ page }) => {
  await openAgentIn(page, { width: 1440, height: 900 });
  await page.getByTestId('agentin-market-scroll').evaluate((element) => {
    element.scrollTop = Math.round((element.scrollHeight - element.clientHeight) / 2);
  });
  await expect(page).toHaveScreenshot('agentin-market-middle-1440x900.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('AgentIn unavailable section fidelity', async ({ page }) => {
  await openAgentIn(page, { width: 1440, height: 900 });
  await page.getByRole('heading', { name: '以下智能体当前场景不支持添加' }).scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('agentin-market-bottom-1440x900.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
