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

async function createCoursewareArtifact(page: Page) {
  await openTeacherAgent(page);
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.getByRole('button', { name: '确认任务信息' }).click();
  await page.getByRole('button', { name: '确认计划并执行' }).click();
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

test('WorkBuddy M4 courseware ArtifactDraft at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await expectWorkbenchGeometry(page);
  await expect(page.getByRole('complementary', { name: '当前任务产物' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-courseware-artifact-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 ExecutionReceipt at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await page.getByRole('complementary', { name: '当前任务产物' }).getByRole('button', { name: '保存到 ClassIn' }).click();
  const approval = page.getByRole('complementary', { name: '保存审批' });
  await approval.getByRole('button', { name: '批准保存' }).click();
  await approval.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(page.getByRole('complementary', { name: '执行回执' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-courseware-receipt-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 writeback conflict at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await artifact.getByRole('combobox', { name: '模拟写回场景' }).selectOption('version_conflict');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  const approval = page.getByRole('complementary', { name: '保存审批' });
  await approval.getByRole('button', { name: '批准保存' }).click();
  await approval.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(page.getByRole('heading', { name: '版本冲突' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-writeback-conflict-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 course package partial result at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.getByRole('button', { name: '确认产物清单并开始生成' }).click();
  await page.getByRole('button', { name: '完成[模拟]生成' }).click();
  const navigator = page.getByRole('complementary', { name: '课程方案包导航' });
  await navigator.getByRole('button', { name: '重试失败项' }).click();
  await navigator.getByRole('button', { name: '生成批量写回提案' }).click();
  const approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await approval.getByRole('button', { name: '批准写回' }).click();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  await expect(page.getByText('部分成功', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-course-package-partial-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 Context replanning impact at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await page.getByRole('button', { name: '调整教学范围' }).click();
  await expect(page.getByRole('complementary', { name: '重新规划影响' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-context-replanning-1440x900.png', { fullPage: true });
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
