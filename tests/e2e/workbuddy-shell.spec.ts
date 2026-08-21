import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openTeacherWorkBuddy(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: '教师 WorkBuddy' }).click();
}

async function openAllTasks(page: Page) {
  const existing = page.getByRole('dialog', { name: '全部任务选择器' });
  if (await existing.count()) return existing;
  await page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' }).locator('button[aria-current="page"]').click();
  await expect(existing).toBeVisible();
  return existing;
}

async function switchTask(page: Page, title: string) {
  const selector = await openAllTasks(page);
  await selector.getByRole('button', { name: new RegExp(title) }).first().click();
}

test('teacher enters the collapsible WorkBuddy workspace with renamed capability entries @a11y', async ({ page }) => {
  await openTeacherWorkBuddy(page);

  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  const workBuddyEntry = primaryNavigation.getByRole('link', { name: '教师 WorkBuddy' });
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(workBuddyEntry).toHaveAttribute('aria-current', 'page');

  const secondaryNavigation = primaryNavigation.getByRole('group', { name: '教师 WorkBuddy 二级导航' });
  for (const destination of ['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']) {
    await expect(secondaryNavigation.getByRole('link', { name: destination, exact: true })).toBeVisible();
  }
  await expect(secondaryNavigation.getByText('近期任务', { exact: true })).toHaveCount(0);
  const taskTabs = page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' });
  await expect(taskTabs).toBeVisible();
  await expect(taskTabs.getByRole('button', { name: '新建任务', exact: true })).toHaveAttribute('aria-current', 'page');

  const selector = await openAllTasks(page);
  await expect(selector.getByRole('button', { name: /生成函数单调性课件/ }).first()).toBeVisible();
  await expect(selector.getByRole('button', { name: /整理本周学情沟通要点/ }).first()).toBeVisible();
  await page.getByRole('button', { name: '关闭全部任务选择器' }).click();

  await secondaryNavigation.getByRole('link', { name: '工具连接', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '工具连接' })).toBeVisible();

  await primaryNavigation.getByRole('button', { name: '收起教师 WorkBuddy 二级导航' }).click();
  await expect(secondaryNavigation).toHaveCount(0);
  await primaryNavigation.getByRole('button', { name: '展开教师 WorkBuddy 二级导航' }).click();
  await expect(primaryNavigation.getByRole('group', { name: '教师 WorkBuddy 二级导航' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('student navigation does not expose teacher WorkBuddy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '学生视角主导航' });
  await expect(primaryNavigation.getByRole('link', { name: '教师 WorkBuddy' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: '教师 WorkBuddy 二级导航' })).toHaveCount(0);
});

test('teacher keeps a new-task draft while switching parallel task tabs', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  const goal = page.getByRole('textbox', { name: '描述教学任务' });
  await goal.fill('为高一三班准备明天的函数复习课');

  await switchTask(page, '生成函数单调性课件');
  await expect(page.getByRole('heading', { level: 1, name: '生成函数单调性课件' })).toBeVisible();
  const taskTabs = page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true })).toHaveAttribute('aria-current', 'page');

  await taskTabs.getByRole('button', { name: '新建任务', exact: true }).click();
  await expect(goal).toHaveValue('为高一三班准备明天的函数复习课');

  await page.getByRole('button', { name: '关闭任务：生成函数单调性课件' }).click();
  await expect(taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true })).toHaveCount(0);
  const selector = await openAllTasks(page);
  await expect(selector.getByRole('button', { name: /生成函数单调性课件/ }).first()).toBeVisible();
});

test('teacher opens unopened history as a tab and switches between Run contexts', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  await switchTask(page, '整理本周学情沟通要点');

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-parent-note$/);
  const taskTabs = page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '整理本周学情沟通要点', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('可重试 · 本地模拟')).toBeVisible();

  await switchTask(page, '分析三班作业共性问题');
  await expect(page.getByText('已完成 · 本地模拟')).toBeVisible();
  await expect(taskTabs.getByRole('button', { name: '分析三班作业共性问题', exact: true })).toHaveAttribute('aria-current', 'page');

  await taskTabs.getByRole('button', { name: '整理本周学情沟通要点', exact: true }).click();
  await expect(page.getByText('可重试 · 本地模拟')).toBeVisible();
});

test('teacher manages and scrolls all tasks inside the current-tab selector', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openTeacherWorkBuddy(page);
  await switchTask(page, '函数单元课程方案包');

  let selector = await openAllTasks(page);
  const moreActions = selector.getByRole('button', { name: '函数单元课程方案包更多操作' });
  await selector.getByRole('button', { name: /函数单元课程方案包/ }).first().focus();
  await moreActions.click();
  await selector.getByRole('menuitem', { name: '重命名' }).click();
  const renameInput = selector.getByRole('textbox', { name: '重命名任务' });
  await renameInput.fill('函数单元方案包 · 第一版');
  await renameInput.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: '函数单元方案包 · 第一版' })).toBeVisible();
  const taskTabs = page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '函数单元方案包 · 第一版', exact: true })).toHaveAttribute('aria-current', 'page');

  const taskList = selector.getByRole('list', { name: '全部任务列表' });
  const initialScroll = await taskList.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  expect(initialScroll.scrollHeight).toBeGreaterThan(initialScroll.clientHeight);
  const lastTask = selector.getByRole('button', { name: /规划期中复习任务清单/ }).first();
  await lastTask.focus();
  await expect.poll(() => taskList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.getByRole('button', { name: '关闭全部任务选择器' }).click();
  selector = await openAllTasks(page);
  await selector.getByRole('button', { name: /函数单元方案包 · 第一版/ }).first().focus();
  await selector.getByRole('button', { name: '函数单元方案包 · 第一版更多操作' }).click();
  await selector.getByRole('menuitem', { name: '删除' }).click();
  await expect(taskTabs.getByRole('button', { name: '函数单元方案包 · 第一版', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: '函数单元方案包 · 第一版' })).toHaveCount(0);

  const longestAnimation = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('*')).map((element) => {
    const duration = getComputedStyle(element).animationDuration.split(',')[0] ?? '0s';
    return Number.parseFloat(duration) || 0;
  })));
  expect(longestAnimation).toBeLessThanOrEqual(0.001);
});
