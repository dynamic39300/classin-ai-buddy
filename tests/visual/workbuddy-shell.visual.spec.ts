import { expect, test, type Page } from '@playwright/test';

async function openTeacherAgent(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
}

async function switchTask(page: Page, title: string) {
  await page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' }).locator('button[aria-current="page"]').click();
  await page.getByRole('dialog', { name: '全部任务选择器' }).getByRole('button', { name: new RegExp(title) }).first().click();
}

async function expectWorkbenchGeometry(page: Page) {
  const geometry = await page.evaluate(() => {
    const primaryNavigation = document.querySelector<HTMLElement>('nav[aria-label="老师视角主导航"]');
    const primarySidebar = primaryNavigation?.closest<HTMLElement>('aside');
    const secondaryNavigation = document.querySelector<HTMLElement>('[role="group"][aria-label="Work Buddy 二级导航"]');
    const workspace = document.querySelector<HTMLElement>('#main-content');
    const workSurface = document.querySelector<HTMLElement>('[aria-label="Work Buddy 工作区"]');
    const stage = document.querySelector<HTMLElement>('[data-workbuddy-stage="true"]');
    const taskBar = document.querySelector<HTMLElement>('header[aria-label="Work Buddy 任务导航"]');
    if (!primarySidebar || !secondaryNavigation || !workspace || !workSurface || !stage || !taskBar) throw new Error('WorkBuddy shell geometry is incomplete.');
    const primary = primarySidebar.getBoundingClientRect();
    const secondary = secondaryNavigation.getBoundingClientRect();
    const surface = workSurface.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const taskBarRect = taskBar.getBoundingClientRect();
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      primaryWidth: primary.width,
      secondaryInsideSidebar: secondary.left >= primary.left && secondary.right <= primary.right,
      surfaceGap: surface.left - workspace.getBoundingClientRect().left,
      surfaceWidth: surface.width,
      workspaceClientWidth: workspace.clientWidth,
      workspaceScrollWidth: workspace.scrollWidth,
      taskBarAtStageTop: Math.abs(taskBarRect.top - stageRect.top),
      contentFollowsTaskBar: Math.abs(surface.top - taskBarRect.bottom),
      genericTopbarCount: stage.querySelectorAll(':scope > header').length,
    };
  });

  expect(geometry.primaryWidth).toBe(220);
  expect(geometry.secondaryInsideSidebar).toBe(true);
  expect(Math.abs(geometry.surfaceGap)).toBeLessThanOrEqual(1);
  expect(geometry.surfaceWidth).toBe(geometry.workspaceClientWidth);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.workspaceScrollWidth).toBeLessThanOrEqual(geometry.workspaceClientWidth);
  expect(geometry.taskBarAtStageTop).toBeLessThanOrEqual(1);
  expect(geometry.contentFollowsTaskBar).toBeLessThanOrEqual(1);
  expect(geometry.genericTopbarCount).toBe(0);
}

async function createCoursewareArtifact(page: Page) {
  const now = new Date('2026-08-21T10:00:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
  await openTeacherAgent(page);
  await page.getByRole('button', { name: /^核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.clock.runFor(2_000);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' }).getByRole('button', { name: '提交确认' }).click();
  await timeline.getByRole('article').filter({ hasText: '智能课件执行计划' }).getByRole('button', { name: '开始执行计划' }).click();
  await page.clock.runFor(12_000);
  const output = page.getByRole('region', { name: '智能课件产出' });
  await expect(output).toBeVisible();
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
}

async function startCoursewareRun(page: Page) {
  const now = new Date('2026-08-21T10:00:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
  await openTeacherAgent(page);
  await page.getByRole('button', { name: /^核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.clock.runFor(2_000);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' }).getByRole('button', { name: '提交确认' }).click();
  await timeline.getByRole('article').filter({ hasText: '智能课件执行计划' }).getByRole('button', { name: '开始执行计划' }).click();
}

test('WorkBuddy new task at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await expectWorkbenchGeometry(page);

  const secondaryNavigation = page.getByRole('group', { name: 'Work Buddy 二级导航' });
  for (const title of ['技能市场', '工具连接', '我的文件', '定时任务', '设置']) {
    await expect(secondaryNavigation.getByRole('link', { name: title, exact: true })).toBeVisible();
  }

  await expect(page).toHaveScreenshot('workbuddy-new-task-1440x900.png', { fullPage: true });
});

test('WorkBuddy new task entry hover at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  const newTaskEntry = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' }).getByRole('button', { name: '添加新任务' });
  await newTaskEntry.hover();
  await expect(newTaskEntry.locator('svg.lucide-plus')).toBeVisible();
  await expect(newTaskEntry.locator('svg')).toHaveCount(1);

  await expect(page).toHaveScreenshot('workbuddy-new-task-entry-hover-1440x900.png', { fullPage: true });
});

test('WorkBuddy new task with Core Context auxiliary panel at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await page.getByRole('button', { name: '展开核心上下文' }).click();
  await expect(page.getByRole('complementary', { name: '核心上下文' })).toBeVisible();

  await expect(page).toHaveScreenshot('workbuddy-new-task-context-open-1440x900.png', { fullPage: true });
});

test('WorkBuddy TeacherIn Context picker at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await page.getByRole('button', { name: '展开核心上下文' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '选择资源' }).click();
  await expect(context.getByRole('list', { name: 'TeacherIn 搜索结果' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-teacherin-context-picker-1440x900.png', { fullPage: true });
});

test('WorkBuddy capability page uses the standard title topbar at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await page.getByRole('group', { name: 'Work Buddy 二级导航' }).getByRole('link', { name: '技能市场', exact: true }).click();
  const capabilityStage = page.locator('#main-content').locator('..');

  await expect(capabilityStage.locator(':scope > header').getByRole('heading', { level: 1, name: '技能市场' })).toBeVisible();
  await expect(page.locator('header[aria-label="Work Buddy 任务导航"]')).toHaveCount(0);
  await expect(page).toHaveScreenshot('workbuddy-capability-titlebar-1440x900.png', { fullPage: true });
});

test('WorkBuddy Run with one Artifact panel at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await switchTask(page, '生成函数单调性课件');
  await expectWorkbenchGeometry(page);
  await expect(page.getByRole('complementary', { name: '当前任务产物' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-run-artifact-1440x900.png', { fullPage: true });
});

test('WorkBuddy current Session uses an inline rename field at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await switchTask(page, '生成函数单调性课件');
  const taskTab = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' }).getByRole('button', { name: '生成函数单调性课件', exact: true });
  await taskTab.hover();
  await expect(page.getByRole('button', { name: '重命名任务：生成函数单调性课件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭任务：生成函数单调性课件' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-task-tab-hover-actions-1440x900.png', { fullPage: true });
  await page.getByRole('button', { name: '重命名任务：生成函数单调性课件' }).click();
  await expect(page.getByRole('textbox', { name: '重命名任务：生成函数单调性课件' })).toBeFocused();
  await expect(page).toHaveScreenshot('workbuddy-task-tab-rename-1440x900.png', { fullPage: true });
});

test('WorkBuddy all-task selector anchors to the current task tab at 1440x900', async ({ page }) => {
  await openTeacherAgent(page);
  await switchTask(page, '函数单元课程方案包');
  const currentTab = page
    .getByRole('navigation', { name: '已打开的 Work Buddy 任务' })
    .getByRole('button', { name: '函数单元课程方案包', exact: true });
  await currentTab.click();
  await expect(page.getByRole('dialog', { name: '全部任务选择器' })).toBeVisible();

  await expect(page).toHaveScreenshot('workbuddy-task-selector-anchored-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 courseware ArtifactDraft at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await expectWorkbenchGeometry(page);
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-courseware-artifact-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 running step progress at 1440x900', async ({ page }) => {
  await startCoursewareRun(page);
  const progressTrigger = page.getByRole('button', { name: /查看任务执行步骤，第 1\/4 步/ });
  await progressTrigger.hover();
  await expect(page.getByRole('region', { name: '任务执行步骤' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-running-step-progress-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 ExecutionReceipt at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await page.getByRole('region', { name: '智能课件产出' }).getByRole('button', { name: '保存到 ClassIn' }).click();
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(2_000);
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-courseware-receipt-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 writeback conflict at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  await page.evaluate(() => {
    window.history.replaceState({}, '', `${window.location.pathname}?review=recovery`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('combobox', { name: '恢复路径验收场景' }).selectOption('version_conflict');
  await page.getByRole('region', { name: '智能课件产出' }).getByRole('button', { name: '保存到 ClassIn' }).click();
  const action = page.getByRole('feed', { name: 'Agent 任务时间线' }).getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(2_000);
  await expect(page.getByText('目标版本已经更新', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-writeback-conflict-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 course package partial result at 1440x900', async ({ page }) => {
  const now = new Date('2026-08-21T10:00:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
  await openTeacherAgent(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await page.getByRole('button', { name: /^核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.clock.runFor(2_000);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await timeline.getByRole('article').filter({ hasText: '课程方案包执行计划' }).getByRole('button', { name: '确认范围并开始生成' }).click();
  await page.clock.runFor(9_000);
  await page.evaluate(() => {
    window.history.replaceState({}, '', `${window.location.pathname}?review=package-partial`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('combobox', { name: '课程方案包恢复场景' }).selectOption('partial_success');
  await page.getByRole('region', { name: '课程方案包产出' }).getByRole('button', { name: '保存所选产物到 ClassIn' }).click();
  const action = timeline.getByRole('article').filter({ hasText: '保存课程方案包到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存课程方案包' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();
  await page.clock.runFor(2_000);
  await expect(page.getByRole('status').filter({ hasText: '部分成功' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-course-package-partial-1440x900.png', { fullPage: true });
});

test('WorkBuddy M4 Context replanning impact at 1440x900', async ({ page }) => {
  await createCoursewareArtifact(page);
  const composer = page.getByRole('group', { name: '任务补充输入' });
  await composer.getByRole('textbox', { name: '向 Agent 补充要求' }).fill('把主教学范围改为高一（2）班的二次函数单元。');
  await composer.getByRole('button', { name: '发送补充要求' }).click();
  await expect(page.getByRole('feed', { name: 'Agent 任务时间线' }).getByRole('article').filter({ hasText: '教学范围变化需要重新规划' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-context-replanning-1440x900.png', { fullPage: true });
});

test('WorkBuddy keeps embedded navigation reachable at compact desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('link', { name: 'Work Buddy' }).click();

  const secondaryNavigation = primaryNavigation.getByRole('group', { name: 'Work Buddy 二级导航' });
  for (const { name, exact } of [
    { name: '技能市场', exact: true },
    { name: '工具连接', exact: true },
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
    const workspace = document.querySelector<HTMLElement>('[aria-label="Work Buddy 工作区"]');
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
  await primaryNavigation.getByRole('button', { name: '收起 Work Buddy 二级导航' }).click();
  await expect(page.getByRole('group', { name: 'Work Buddy 二级导航' })).toHaveCount(0);
  const collapsedSidebarWidth = await page.locator('aside').first().evaluate((element) => element.getBoundingClientRect().width);
  expect(collapsedSidebarWidth).toBe(64);
});
