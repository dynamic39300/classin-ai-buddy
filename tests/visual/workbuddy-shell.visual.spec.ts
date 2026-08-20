import { expect, test, type Page } from '@playwright/test';

async function openTeacherAgent(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
}

async function expectWorkbenchGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const primaryNavigation = document.querySelector<HTMLElement>('nav[aria-label="老师视角主导航"]');
    const primarySidebar = primaryNavigation?.closest<HTMLElement>('aside');
    const secondaryNavigation = document.querySelector<HTMLElement>('[role="group"][aria-label="AI Agent 二级导航"]');
    const workspace = document.querySelector<HTMLElement>('#main-content');
    const workSurface = document.querySelector<HTMLElement>('[aria-label="AI Agent 工作区"]');
    if (!primarySidebar || !secondaryNavigation || !workspace || !workSurface) throw new Error('WorkBuddy shell geometry is incomplete.');
    const primary = primarySidebar.getBoundingClientRect();
    const secondary = secondaryNavigation.getBoundingClientRect();
    const surface = workSurface.getBoundingClientRect();
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      primaryWidth: primary.width,
      secondaryInsideSidebar: secondary.left >= primary.left && secondary.right <= primary.right,
      surfaceGap: surface.left - workspace.getBoundingClientRect().left,
      surfaceWidth: surface.width,
      workspaceClientWidth: workspace.clientWidth,
      workspaceScrollWidth: workspace.scrollWidth,
    };
  });

  expect(geometry.primaryWidth).toBe(220);
  expect(geometry.secondaryInsideSidebar).toBe(true);
  expect(Math.abs(geometry.surfaceGap)).toBeLessThanOrEqual(1);
  expect(geometry.surfaceWidth).toBe(geometry.workspaceClientWidth);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.workspaceScrollWidth).toBeLessThanOrEqual(geometry.workspaceClientWidth);
}

test('WorkBuddy new task at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await expectWorkbenchGeometry(page);

  const secondaryNavigation = page.getByRole('group', { name: 'AI Agent 二级导航' });
  for (const title of [
    '生成函数单调性课件',
    '函数单元课程方案包',
    '分析三班作业共性问题',
    '设计二次函数随堂测验',
    '整理本周学情沟通要点',
    '制作导数概念微课脚本',
  ]) {
    await expect(secondaryNavigation.getByRole('link', { name: title })).toBeVisible();
  }

  await expect(page).toHaveScreenshot('workbuddy-new-task-1440x900.png', { fullPage: true });
});

test('WorkBuddy Run with one Artifact panel at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '生成函数单调性课件' }).click();
  await expectWorkbenchGeometry(page);
  await expect(page.getByRole('complementary', { name: '当前任务产物' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-run-artifact-1440x900.png', { fullPage: true });
});

test('WorkBuddy keeps embedded navigation reachable at compact desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('link', { name: 'AI Agent' }).click();

  const secondaryNavigation = primaryNavigation.getByRole('group', { name: 'AI Agent 二级导航' });
  for (const { name, exact } of [
    { name: '新建任务', exact: true },
    { name: '规划期中复习任务清单', exact: false },
    { name: 'Skills', exact: true },
    { name: 'Tools', exact: true },
    { name: '内容', exact: true },
    { name: '我的文件', exact: true },
    { name: '定时任务', exact: true },
    { name: '设置', exact: true },
  ]) {
    const link = secondaryNavigation.getByRole('link', { name, exact });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
  }

  const geometry = await page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>('aside[data-contextual-navigation="true"]');
    const workspace = document.querySelector<HTMLElement>('[aria-label="AI Agent 工作区"]');
    if (!sidebar || !workspace) throw new Error('Compact WorkBuddy geometry is incomplete.');
    return {
      sidebarWidth: sidebar.getBoundingClientRect().width,
      workspaceLeft: workspace.getBoundingClientRect().left,
      sidebarRight: sidebar.getBoundingClientRect().right,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(geometry.sidebarWidth).toBe(220);
  expect(Math.abs(geometry.workspaceLeft - geometry.sidebarRight)).toBeLessThanOrEqual(1);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);

  await expect(page).toHaveScreenshot('workbuddy-embedded-navigation-1000x768.png', { fullPage: true });

  await primaryNavigation.getByRole('link', { name: '首页' }).click();
  await expect(page.getByRole('group', { name: 'AI Agent 二级导航' })).toHaveCount(0);
  const collapsedSidebarWidth = await page.locator('aside').first().evaluate((element) => element.getBoundingClientRect().width);
  expect(collapsedSidebarWidth).toBe(64);
});
