import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function expectNoSeriousA11yViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
}

test('teacher manages personal files and acquires a selected resource @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '空间' }).click();

  await expect(page).toHaveURL(/\/teacher\/space$/);
  await expect(page.getByRole('heading', { name: '我的云盘' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.getByText('TeacherIn')).toHaveCount(0);
  await page.getByRole('button', { name: /新建/ }).click();
  await page.getByRole('menuitem', { name: '新建文件夹' }).click();
  await page.getByRole('textbox', { name: '文件夹名称' }).fill('课堂演示资料');
  await page.getByRole('button', { name: '创建' }).click();
  await expect(page.getByText('课堂演示资料')).toBeVisible();

  await page.getByRole('tab', { name: '资源中心' }).click();
  await expect(page).toHaveURL(/\/teacher\/space\/resource-center$/);
  await expect(page.getByRole('tab', { name: '全部资源' })).toHaveAttribute('aria-selected', 'true');
  const resource = page.getByText('动量守恒模型课件').locator('xpath=ancestor::article');
  await resource.getByRole('button', { name: '获取' }).click();
  await expect(page.getByRole('status')).toContainText('获取成功');
  await page.getByRole('tab', { name: /我的资源/ }).click();
  await expect(page.getByText('只读列表', { exact: true })).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('organization permissions and question-bank boundary remain visible @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '空间' }).click();
  await page.getByRole('tab', { name: '组织云盘' }).click();

  await expect(page.getByText('内部管理资料')).toHaveCount(0);
  await expect(page.getByRole('group', { name: '组织云盘上下文' })).toHaveCount(0);
  await expect(page.getByText('可管理', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '选择物理教研组' })).toBeDisabled();
  await page.getByRole('button', { name: '打开物理教研组' }).click();
  await expect(page.getByRole('checkbox', { name: '选择王老师教案.docx' })).toBeEnabled();
  await expect(page.getByRole('checkbox', { name: '选择高二物理题型整理.pdf' })).toBeDisabled();
  await page.getByRole('button', { name: '王老师教案.docx更多操作' }).click();
  await page.getByRole('menuitem', { name: '保存为我的云盘副本' }).click();
  await expect(page.getByRole('status')).toContainText('新副本');

  await page.getByRole('tab', { name: '题库中心' }).click();
  await expect(page.getByRole('heading', { name: '题库中心 Placeholder' })).toBeVisible();
  await expect(page.getByRole('button', { name: '返回我的云盘' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '新建测验' })).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('student opens only class-authorized resources from the class context @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByText('高二物理 3 班', { exact: true }).click();
  await page.getByRole('button', { name: '查看关联资源' }).click();

  await expect(page).toHaveURL(/\/student\/classes\/physics-3\/resources$/);
  await expect(page.locator('#context-resource-title')).toBeVisible();
  await expect(page.getByText('动量守恒模型课件')).toBeVisible();
  await expect(page.getByText('阅读定位与主旨练习')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '空间' })).toHaveCount(0);
  await page.getByRole('button', { name: '查看资料' }).click();
  await expect(page.getByRole('status')).toContainText('不下载真实文件');
  await expectNoSeriousA11yViolations(page);
});
