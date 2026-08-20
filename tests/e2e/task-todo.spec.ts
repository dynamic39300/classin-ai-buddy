import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function isAchromaticRgb(color: string) {
  const channels = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return channels !== null && channels[1] === channels[2] && channels[2] === channels[3];
}

test('teacher handles a task in a detail dialog with two role actions @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: '待办' }).click();

  await expect(page.getByRole('heading', { level: 1, name: '待办' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '已过截止' })).toBeVisible();

  const typeColors = await page.locator('article[data-kind] small[data-kind]').evaluateAll((elements) => (
    elements.map((element) => getComputedStyle(element).backgroundColor)
  ));
  expect(typeColors.length).toBeGreaterThan(0);
  expect(new Set(typeColors).size).toBe(1);
  expect(isAchromaticRgb(typeColors[0] ?? '')).toBe(true);

  const overdueRow = page.locator('article[data-bucket="overdue"]').first();
  const regularRow = page.locator('article[data-bucket="today"]').first();
  const overdueBase = await overdueRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  await overdueRow.hover();
  const overdueHover = await overdueRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  await regularRow.hover();
  const regularHover = await regularRow.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(overdueHover).not.toBe(overdueBase);
  expect(overdueHover).not.toBe(regularHover);
  expect(isAchromaticRgb(regularHover)).toBe(true);
  await expect(overdueRow).toContainText('收集中（26/30）');

  const classroomRow = page.locator('article[data-kind="classroom"]').filter({ hasText: '动量守恒模型' });
  const prepareButton = classroomRow.getByRole('button', { name: '去备课' });
  await prepareButton.click();
  const preparationDialog = page.getByRole('dialog', { name: '去备课' });
  await expect(preparationDialog).toContainText('未连接课堂服务');
  await expect(page.getByRole('dialog', { name: '确认催交' })).toHaveCount(0);
  await preparationDialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(prepareButton).toBeFocused();

  await page.getByText('机械波错题订正', { exact: true }).click();

  const dialog = page.getByRole('dialog', { name: '机械波错题订正' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '去批改' })).toBeVisible();
  await dialog.getByRole('button', { name: '去催交' }).click();
  const reminderDialog = page.getByRole('dialog', { name: '确认催交' });
  await expect(reminderDialog.getByRole('region', { name: '催交范围确认' })).toContainText('4 名未提交学生');
  await reminderDialog.getByRole('button', { name: '确认催交' }).click();
  await expect(reminderDialog.getByRole('status')).toContainText('4 名未提交学生');
  await page.getByRole('button', { name: '返回任务详情' }).click();
  await expect(page.getByRole('dialog', { name: '机械波错题订正' })).toBeVisible();
  await page.getByRole('button', { name: '关闭任务详情' }).click();
  await expect(dialog).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('task center does not create homework outside a teaching context', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: '待办' }).click();

  await expect(page.getByRole('button', { name: '布置作业' })).toHaveCount(0);
  await expect(page).toHaveURL('/teacher/tasks');
});

test('student todo exposes state-driven learning actions @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.getByRole('link', { name: /待办/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: '待办' })).toBeVisible();
  await expect(page.getByRole('button', { name: '补交', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '去订正', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: '筛选待办' }).click();
  const filterColors = await page.getByRole('combobox').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
  expect(filterColors).toHaveLength(3);
  expect(filterColors.every(isAchromaticRgb)).toBe(true);
  await page.getByRole('combobox', { name: '班级范围' }).selectOption('physics-3');
  await page.getByRole('combobox', { name: '课程范围' }).selectOption({ label: '高二物理' });
  await expect(page.getByRole('button', { name: '筛选待办' })).toContainText('2');
  await page.keyboard.press('Escape');
  await page.getByText('动量守恒作业 A 组', { exact: true }).click();

  const dialog = page.getByRole('dialog', { name: '动量守恒作业 A 组' });
  await expect(dialog.getByRole('button', { name: '继续作业' })).toBeVisible();
  await dialog.getByRole('button', { name: '继续作业' }).click();
  await expect(page).toHaveURL(/\/student\/todos\?/);
  expect(new URL(page.url()).searchParams.get('task')).toBe('task-homework-momentum');
  const operationDialog = page.getByRole('dialog', { name: '继续作业' });
  await expect(operationDialog).toContainText('未连接作答服务');
  await operationDialog.getByRole('button', { name: '返回任务详情' }).click();
  await expect(page.getByRole('dialog', { name: '动量守恒作业 A 组' })).toBeVisible();
  await page.getByRole('button', { name: '关闭任务详情' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: '搜索待办' })).toHaveValue('');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});
