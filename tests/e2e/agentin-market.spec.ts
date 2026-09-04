import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openTeacherAgentIn(page: Page, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('button', { name: 'TeacherIn', exact: true }).click();
  const secondaryNavigation = primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' });
  await expect(secondaryNavigation.getByRole('link', { name: 'AgentIn', exact: true })).toBeVisible();
  await expect(secondaryNavigation.getByRole('link', { name: '工具连接', exact: true })).toHaveCount(0);
  await expect(secondaryNavigation.getByRole('link', { name: '定时任务', exact: true })).toHaveCount(0);
  await secondaryNavigation.getByRole('link', { name: 'AgentIn', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/agentin$/);
  await expect(page.getByLabel('AgentIn 智能体市场')).toBeVisible();
}

test('teacher opens the source-backed AgentIn market and can inspect local states @a11y', async ({ page }) => {
  await openTeacherAgentIn(page);

  await expect(page.getByLabel('AgentIn 智能体市场')).toBeVisible();
  await expect(page.getByRole('heading', { name: '猜你喜欢' })).toBeVisible();
  const unavailableHeading = page.getByRole('heading', { name: '以下智能体当前场景不支持添加' });
  await expect(unavailableHeading).toBeVisible();
  await unavailableHeading.scrollIntoViewIfNeeded();
  await expect.poll(() => unavailableHeading.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  })).toBe(true);
  await expect(page.locator('header[aria-label="TeacherIn 任务导航"]')).toHaveCount(0);

  await page.getByRole('button', { name: '数学', exact: true }).click();
  await expect(page.getByText('已选择“数学”，真实筛选逻辑尚未接入。')).toBeVisible();
  await page.getByRole('button', { name: '关闭提示' }).click();

  await page.getByRole('searchbox', { name: '搜索智能体' }).fill('NOBOOK');
  await expect(page.getByText('找到 1 个与“NOBOOK”相关的智能体')).toBeVisible();
  await expect(page.getByRole('heading', { name: '猜你喜欢' })).toHaveCount(0);
  await page.getByLabel('智能体目录').getByRole('button', { name: /NOBOOK/ }).click();
  await expect(page.getByText('“NOBOOK”当前场景不支持添加。')).toBeVisible();
  await page.getByRole('searchbox', { name: '搜索智能体' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '清空搜索' })).toBeFocused();
  await page.getByRole('searchbox', { name: '搜索智能体' }).fill('不存在的智能体');
  await expect(page.getByText('没有找到相关智能体')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索' }).click();
  await expect(page.getByRole('heading', { name: '猜你喜欢' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 640 }]) {
  test(`AgentIn has no horizontal page overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openTeacherAgentIn(page, viewport);
    const geometry = await page.evaluate(() => {
      const workspace = document.querySelector<HTMLElement>('#main-content');
      const market = document.querySelector<HTMLElement>('[aria-label="AgentIn 智能体市场"]');
      if (!workspace || !market) throw new Error('AgentIn geometry is incomplete.');
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        workspaceClientWidth: workspace.clientWidth,
        workspaceScrollWidth: workspace.scrollWidth,
        marketClientWidth: market.clientWidth,
        marketScrollWidth: market.scrollWidth,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
    expect(geometry.workspaceScrollWidth).toBeLessThanOrEqual(geometry.workspaceClientWidth);
    expect(geometry.marketScrollWidth).toBeLessThanOrEqual(geometry.marketClientWidth);
  });
}

test('AgentIn is available in the class-scoped TeacherIn navigation but stays outside standalone and student navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto('/teacher/classes/physics-3?course=course-momentum');
  await page.getByRole('button', { name: '打开 TeacherIn' }).click();
  const classNavigation = page.getByRole('navigation', { name: 'TeacherIn 导航' });
  await expect(classNavigation.getByRole('link', { name: 'AgentIn', exact: true })).toBeVisible();
  await classNavigation.getByRole('link', { name: 'AgentIn', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/agentin\?course=course-momentum$/);
  await expect(page.getByLabel('AgentIn 智能体市场')).toBeVisible();

  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('边界测试老师');
  await page.getByLabel('邮箱').fill('agentin.boundary@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  await page.goto('/teachbuddy/app/agentin');
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);

  await page.goto('/teacher/home');
  await page.getByRole('group', { name: '角色切换' }).getByRole('button', { name: '切换至学生' }).click();
  await expect(page.getByRole('navigation', { name: '学生视角主导航' }).getByRole('link', { name: 'AgentIn' })).toHaveCount(0);
});
