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
    const secondaryNavigation = document.querySelector<HTMLElement>('aside[aria-label="AI Agent 二级导航"]');
    const workspace = document.querySelector<HTMLElement>('#main-content');
    if (!primarySidebar || !secondaryNavigation || !workspace) throw new Error('WorkBuddy shell geometry is incomplete.');
    const primary = primarySidebar.getBoundingClientRect();
    const secondary = secondaryNavigation.getBoundingClientRect();
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      primaryWidth: primary.width,
      secondaryWidth: secondary.width,
      navigationGap: secondary.left - primary.right,
      workspaceClientWidth: workspace.clientWidth,
      workspaceScrollWidth: workspace.scrollWidth,
    };
  });

  expect(geometry.primaryWidth).toBe(220);
  expect(geometry.secondaryWidth).toBe(232);
  expect(Math.abs(geometry.navigationGap)).toBeLessThanOrEqual(1);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.workspaceScrollWidth).toBeLessThanOrEqual(geometry.workspaceClientWidth);
}

test('WorkBuddy new task at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await expectWorkbenchGeometry(page);

  const secondaryNavigation = page.getByRole('complementary', { name: 'AI Agent 二级导航' });
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
  await page.getByRole('complementary', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '生成函数单调性课件' }).click();
  await expectWorkbenchGeometry(page);
  await expect(page.getByRole('complementary', { name: '当前任务产物' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-run-artifact-1440x900.png', { fullPage: true });
});
