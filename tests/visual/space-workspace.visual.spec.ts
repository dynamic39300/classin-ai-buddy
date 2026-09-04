import { expect, test, type Page } from '@playwright/test';

const VIEWPORT = { width: 1440, height: 900 } as const;

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function expectSpaceVisualContract(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector('main');
    const searchShell = document.querySelector('input[type="search"]')?.closest('label');
    const spaceTabs = document.querySelector<HTMLElement>('[role="tablist"][aria-label="空间栏目"]');
    const activeSpaceTab = spaceTabs?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    const colorProbe = document.createElement('span');
    colorProbe.style.color = 'var(--color-action-strong)';
    document.body.append(colorProbe);
    const actionStrong = getComputedStyle(colorProbe).color;
    colorProbe.remove();
    return {
      overflow: root.scrollWidth > root.clientWidth || Boolean(main && main.scrollWidth > main.clientWidth),
      canvas: getComputedStyle(root).getPropertyValue('--color-canvas').trim(),
      surface: getComputedStyle(root).getPropertyValue('--color-surface').trim(),
      muted: getComputedStyle(root).getPropertyValue('--color-surface-muted').trim(),
      actionStrong,
      searchBackground: searchShell ? getComputedStyle(searchShell).backgroundColor : null,
      tabsBorderWidth: spaceTabs ? getComputedStyle(spaceTabs).borderBottomWidth : null,
      activeTabBorderColor: activeSpaceTab ? getComputedStyle(activeSpaceTab).borderBottomColor : null,
      activeTabBorderWidth: activeSpaceTab ? getComputedStyle(activeSpaceTab).borderBottomWidth : null,
    };
  });

  expect(result.overflow).toBe(false);
  expect(result.canvas).toBe('rgb(255 255 255)');
  expect(result.surface).toBe('rgb(255 255 255)');
  expect(result.muted).toBe('rgb(244 244 244)');
  if (result.searchBackground) expect(result.searchBackground).toBe('rgb(244, 244, 244)');
  if (result.tabsBorderWidth) expect(result.tabsBorderWidth).toBe('0px');
  if (result.activeTabBorderColor) expect(result.activeTabBorderColor).toBe(result.actionStrong);
  if (result.activeTabBorderWidth) expect(Number.parseFloat(result.activeTabBorderWidth)).toBeGreaterThan(0);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
});

for (const surface of [
  { path: '/teacher/space', name: 'teacher-my-drive-1440x900.png' },
  { path: '/teacher/space/organization-drive', name: 'teacher-organization-drive-1440x900.png' },
  { path: '/teacher/space/teacherin', name: 'teacher-teacherin-1440x900.png' },
  { path: '/teacher/space/question-bank', name: 'teacher-question-bank-1440x900.png' },
]) {
  test(surface.name, async ({ page }) => {
    await selectRole(page, /老师视角/);
    await page.goto(surface.path);
    await expectSpaceVisualContract(page);
    await expect(page).toHaveScreenshot(surface.name, { fullPage: true });
  });
}

test('teacher-teacherin-draft-1440x900.png', async ({ page }) => {
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/space/teacherin?draft=teacherin-draft-courseware-pptx&source=workbuddy&title=函数单调性智能课件');
  await expectSpaceVisualContract(page);
  await expect(page.getByRole('region', { name: '作品草稿' })).toBeVisible();
  await expect(page).toHaveScreenshot('teacher-teacherin-draft-1440x900.png', { fullPage: true });
});

test('student-authorized-resources-1440x900.png', async ({ page }) => {
  await selectRole(page, /学生视角/);
  await page.goto('/student/classes/physics-3/resources');
  await expectSpaceVisualContract(page);
  await expect(page.getByRole('link', { name: '空间' })).toHaveCount(0);
  await expect(page).toHaveScreenshot('student-authorized-resources-1440x900.png', { fullPage: true });
});

for (const subdirectory of [
  {
    name: 'teacher-my-drive-subdirectory-1440x900.png',
    path: '/teacher/space?parentId=my-root-folder',
  },
  {
    name: 'teacher-organization-drive-subdirectory-1440x900.png',
    path: '/teacher/space/organization-drive?parentId=org-operate-folder',
  },
] as const) {
  test(subdirectory.name, async ({ page }) => {
    await selectRole(page, /老师视角/);
    await page.goto(subdirectory.path);
    await expectSpaceVisualContract(page);

    const metrics = await page.evaluate(() => {
      const toolbar = document.querySelector<HTMLElement>('[role="group"][aria-label="文件列表工具栏"]');
      const breadcrumbs = toolbar?.querySelector<HTMLElement>('[aria-label="文件夹路径"]');
      const search = toolbar?.querySelector<HTMLInputElement>('input[type="search"]')?.closest<HTMLElement>('label');
      const actions = toolbar?.querySelector<HTMLElement>('[role="group"][aria-label="文件操作"]');
      const toolbarRect = toolbar?.getBoundingClientRect();
      const breadcrumbsRect = breadcrumbs?.getBoundingClientRect();
      const searchRect = search?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      return {
        toolbarHeight: toolbarRect?.height ?? null,
        topDelta: breadcrumbsRect && searchRect && actionsRect
          ? Math.max(breadcrumbsRect.top, searchRect.top, actionsRect.top)
            - Math.min(breadcrumbsRect.top, searchRect.top, actionsRect.top)
          : null,
        searchAfterBreadcrumb: breadcrumbsRect && searchRect ? searchRect.left > breadcrumbsRect.left : false,
        searchWidth: searchRect?.width ?? null,
        searchHeight: searchRect?.height ?? null,
      };
    });

    expect(metrics.toolbarHeight).toBeLessThanOrEqual(40);
    expect(metrics.topDelta).toBeLessThanOrEqual(1);
    expect(metrics.searchAfterBreadcrumb).toBe(true);
    expect(metrics.searchWidth).toBe(240);
    expect(metrics.searchHeight).toBe(32);
    await expect(page).toHaveScreenshot(subdirectory.name, { fullPage: true });
  });
}
