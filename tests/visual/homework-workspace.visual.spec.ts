import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1024x640', width: 1024, height: 640 },
] as const;

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const root = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);

  const workspace = page.locator('#main-content');
  const size = await workspace.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth);
}

for (const viewport of VIEWPORTS) {
  test(`teacher homework board at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /老师视角/);
    await page.goto('/teacher/homework/homework-momentum-a?source=task_center');
    await expect(page.getByRole('heading', { level: 1, name: '动量守恒作业 A 组' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`teacher-homework-board-${viewport.name}.png`, { fullPage: true });
  });

  test(`teacher homework editor at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /老师视角/);
    await page.goto('/teacher/homework/new');
    await expect(page.getByRole('heading', { level: 1, name: '新建作业' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`teacher-homework-editor-${viewport.name}.png`, { fullPage: true });
  });

  test(`student homework answer at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /学生视角/);
    await page.goto('/student/homework/homework-momentum-a/edit?mode=first&source=student_home');
    await expect(page.getByRole('heading', { level: 1, name: '作答' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`student-homework-answer-${viewport.name}.png`, { fullPage: true });
  });
}
