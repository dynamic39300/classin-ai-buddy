import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openTeacherWorkBuddy(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
}

async function openAllTasks(page: Page) {
  const existing = page.getByRole('dialog', { name: '全部任务选择器' });
  if (await existing.count()) return existing;
  await page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' }).locator('button[aria-current="page"]').click();
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
  const workBuddyEntry = primaryNavigation.getByRole('link', { name: 'Work Buddy' });
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(workBuddyEntry).toHaveAttribute('aria-current', 'page');
  const extensionToggle = primaryNavigation.getByRole('button', { name: '收起 Work Buddy 二级导航' });
  await extensionToggle.hover();
  await expect.poll(() => extensionToggle.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(extensionToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-workbuddy-stage="true"] > header')).toHaveCount(0);
  await expect(page.locator('header[aria-label="Work Buddy 任务导航"]')).toBeVisible();

  const secondaryNavigation = primaryNavigation.getByRole('group', { name: 'Work Buddy 二级导航' });
  for (const destination of ['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']) {
    await expect(secondaryNavigation.getByRole('link', { name: destination, exact: true })).toBeVisible();
  }
  await primaryNavigation.getByRole('button', { name: '班课管理', exact: true }).click();
  const workBuddyChild = secondaryNavigation.getByRole('link', { name: '技能市场', exact: true });
  const classManagementChild = primaryNavigation.getByRole('link', { name: '我的班级', exact: true });
  const childNavigationGeometry = await Promise.all([workBuddyChild, classManagementChild].map((link) => link.evaluate((element) => {
    const rectangle = element.getBoundingClientRect();
    const iconRectangle = element.querySelector('svg')?.getBoundingClientRect();
    return {
      left: rectangle.left,
      width: rectangle.width,
      height: rectangle.height,
      iconLeft: iconRectangle?.left,
      fontSize: getComputedStyle(element).fontSize,
    };
  })));
  expect(childNavigationGeometry[0]).toEqual(childNavigationGeometry[1]);
  await expect(secondaryNavigation.getByText('近期任务', { exact: true })).toHaveCount(0);
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  await expect(taskTabs).toBeVisible();
  await expect(taskTabs.getByRole('button', { name: '新建任务', exact: true })).toHaveAttribute('aria-current', 'page');

  const selector = await openAllTasks(page);
  await expect(selector.getByRole('button', { name: /生成函数单调性课件/ }).first()).toBeVisible();
  await expect(selector.getByRole('button', { name: /整理本周学情沟通要点/ }).first()).toBeVisible();
  await page.getByRole('button', { name: '关闭全部任务选择器' }).click();

  await secondaryNavigation.getByRole('link', { name: '工具连接', exact: true }).click();
  const capabilityStage = page.locator('#main-content').locator('..');
  await expect(capabilityStage.locator(':scope > header').getByRole('heading', { level: 1, name: '工具连接' })).toBeVisible();
  await expect(page.locator('header[aria-label="Work Buddy 任务导航"]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' })).toHaveCount(0);

  await primaryNavigation.getByRole('button', { name: '收起 Work Buddy 二级导航' }).click();
  await expect(secondaryNavigation).toHaveCount(0);
  await primaryNavigation.getByRole('button', { name: '展开 Work Buddy 二级导航' }).click();
  await expect(primaryNavigation.getByRole('group', { name: 'Work Buddy 二级导航' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('new task keeps a Codex-style right auxiliary panel compact, aligned and stateful', async ({ page }) => {
  await openTeacherWorkBuddy(page);

  const layout = page.locator('[data-panel-open]');
  const main = layout.locator(':scope > section').first();
  const panel = page.getByRole('complementary', { name: '核心上下文' });
  const expandToggle = page.getByRole('button', { name: '展开核心上下文' });
  const closedMainWidth = await main.evaluate((element) => element.getBoundingClientRect().width);

  await expect(expandToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await expandToggle.click();

  const collapseToggle = page.getByRole('button', { name: '收起核心上下文' });
  await expect(collapseToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  const geometry = await page.evaluate(() => {
    const taskBar = document.querySelector<HTMLElement>('header[aria-label="Work Buddy 任务导航"]');
    const layoutElement = document.querySelector<HTMLElement>('[data-panel-open="true"]');
    const mainElement = layoutElement?.querySelector<HTMLElement>(':scope > section');
    const panelElement = document.querySelector<HTMLElement>('#workbuddy-core-context-panel');
    if (!taskBar || !mainElement || !panelElement) throw new Error('New task auxiliary geometry is incomplete.');
    const taskBarRect = taskBar.getBoundingClientRect();
    const mainRect = mainElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    return {
      taskBarBottom: taskBarRect.bottom,
      mainRight: mainRect.right,
      mainWidth: mainRect.width,
      panelLeft: panelRect.left,
      panelTop: panelRect.top,
      panelWidth: panelRect.width,
    };
  });
  expect(Math.abs(geometry.mainRight - geometry.panelLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.taskBarBottom - geometry.panelTop)).toBeLessThanOrEqual(1);
  expect(geometry.mainWidth).toBeLessThan(closedMainWidth);
  expect(geometry.panelWidth).toBe(360);

  const search = panel.getByRole('textbox', { name: '搜索上下文' });
  await search.fill('函数');
  await panel.getByRole('button', { name: '关闭核心上下文' }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: '展开核心上下文' })).toBeFocused();

  await page.getByRole('button', { name: '展开核心上下文' }).click();
  await expect(panel.getByRole('textbox', { name: '搜索上下文' })).toHaveValue('函数');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('primary navigation reveals its scrollbar only while the region is engaged', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  await page.setViewportSize({ width: 1000, height: 768 });

  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await expect.poll(() => primaryNavigation.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);

  const readScrollbarColor = () => primaryNavigation.evaluate((element) => getComputedStyle(element).scrollbarColor);
  await page.mouse.move(700, 320);
  const idleScrollbarColor = await readScrollbarColor();

  await primaryNavigation.hover({ position: { x: 190, y: 320 } });
  await expect.poll(readScrollbarColor).not.toBe(idleScrollbarColor);
  const initialScrollTop = await primaryNavigation.evaluate((element) => element.scrollTop);
  await page.mouse.wheel(0, 360);
  await expect.poll(() => primaryNavigation.evaluate((element) => element.scrollTop)).toBeGreaterThan(initialScrollTop);

  await page.mouse.move(700, 320);
  await expect.poll(readScrollbarColor).toBe(idleScrollbarColor);

  const homeEntry = primaryNavigation.getByRole('link', { name: '首页', exact: true });
  await homeEntry.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(homeEntry).toBeFocused();
  await expect.poll(readScrollbarColor).not.toBe(idleScrollbarColor);
});

test('capability destinations use the standard page topbar instead of task tabs', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  const secondaryNavigation = page.getByRole('group', { name: 'Work Buddy 二级导航' });
  const capabilityStage = page.locator('#main-content').locator('..');

  for (const destination of ['技能市场', '工具连接', '内容资源', '我的文件', '定时任务', '设置']) {
    await secondaryNavigation.getByRole('link', { name: destination, exact: true }).click();
    await expect(capabilityStage.locator(':scope > header').getByRole('heading', { level: 1, name: destination })).toBeVisible();
    await expect(page.locator('header[aria-label="Work Buddy 任务导航"]')).toHaveCount(0);
  }

  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
  await expect(page.locator('header[aria-label="Work Buddy 任务导航"]')).toBeVisible();
  await expect(capabilityStage.locator(':scope > header')).toHaveCount(0);
});

test('student navigation does not expose teacher WorkBuddy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '学生视角主导航' });
  await expect(primaryNavigation.getByRole('link', { name: 'Work Buddy' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Work Buddy 二级导航' })).toHaveCount(0);
});

test('teacher keeps a new-task draft while switching parallel task tabs', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  const goal = page.getByRole('textbox', { name: '描述教学任务' });
  await goal.fill('为高一三班准备明天的函数复习课');

  await switchTask(page, '生成函数单调性课件');
  await expect(page.getByRole('heading', { level: 1, name: '生成函数单调性课件' })).toBeVisible();
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true })).toHaveAttribute('aria-current', 'page');

  const activeTab = taskTabs.locator('button[aria-current="page"]');
  const activeTabChevron = activeTab.locator('svg');
  await expect.poll(() => activeTabChevron.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  await activeTab.hover();
  await expect.poll(() => activeTabChevron.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');

  await taskTabs.getByRole('button', { name: '新建任务', exact: true }).click();
  await expect(goal).toHaveValue('为高一三班准备明天的函数复习课');

  const generatedTab = taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true });
  const generatedTabEdit = page.getByRole('button', { name: '重命名任务：生成函数单调性课件' });
  const generatedTabClose = page.getByRole('button', { name: '关闭任务：生成函数单调性课件' });
  await expect.poll(() => generatedTabEdit.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  await expect.poll(() => generatedTabClose.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  await generatedTab.hover();
  await expect.poll(() => generatedTabEdit.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await expect.poll(() => generatedTabClose.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  const getGeometry = (button: typeof generatedTabEdit) => button.evaluate((element) => {
    const rectangle = element.getBoundingClientRect();
    return { width: rectangle.width, height: rectangle.height, centerY: rectangle.top + rectangle.height / 2 };
  });
  const [editGeometry, closeGeometry] = await Promise.all([getGeometry(generatedTabEdit), getGeometry(generatedTabClose)]);
  expect(editGeometry.width).toBe(24);
  expect(editGeometry.height).toBe(24);
  expect(closeGeometry.width).toBe(24);
  expect(closeGeometry.height).toBe(24);
  expect(Math.abs(editGeometry.centerY - closeGeometry.centerY)).toBeLessThanOrEqual(0.5);
  await generatedTabClose.click();
  await expect(taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true })).toHaveCount(0);
  const selector = await openAllTasks(page);
  await expect(selector.getByRole('button', { name: /生成函数单调性课件/ }).first()).toBeVisible();
});

test('teacher renames the current Session inline from its active tab', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  await switchTask(page, '生成函数单调性课件');

  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  const currentTab = taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true });
  const renameTrigger = page.getByRole('button', { name: '重命名任务：生成函数单调性课件' });
  await currentTab.hover();
  await expect(renameTrigger).toBeVisible();

  await renameTrigger.click();
  const renameInput = taskTabs.getByRole('textbox', { name: '重命名任务：生成函数单调性课件' });
  await expect(renameInput).toBeFocused();
  await renameInput.fill('暂存标题');
  await renameInput.press('Escape');
  await expect(taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(renameTrigger).toBeFocused();

  await renameTrigger.click();
  await renameInput.fill('高一函数单调性复习课件');
  await renameInput.press('Enter');
  await expect(taskTabs.getByRole('button', { name: '高一函数单调性复习课件', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: '重命名任务：高一函数单调性复习课件' })).toBeFocused();

  const selector = await openAllTasks(page);
  await expect(selector.getByRole('button', { name: /高一函数单调性复习课件/ }).first()).toBeVisible();
});

test('task tabs expose distinct hover and persistent active highlights', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  const taskBar = page.locator('header[aria-label="Work Buddy 任务导航"]');
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  const targetTab = taskTabs.getByRole('button', { name: '生成函数单调性课件', exact: true });
  const targetShell = targetTab.locator('..');

  await expect.poll(() => taskBar.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
  const idleBackground = await targetShell.evaluate((element) => getComputedStyle(element).backgroundColor);
  await targetTab.hover();
  await expect.poll(() => targetShell.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(idleBackground);
  const hoverBackground = await targetShell.evaluate((element) => getComputedStyle(element).backgroundColor);

  await targetTab.click();
  await expect(targetTab).toHaveAttribute('aria-current', 'page');
  await expect(targetTab).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(targetShell).toHaveAttribute('data-active', 'true');
  await expect.poll(() => targetShell.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(hoverBackground);
  const activeStyle = await targetShell.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, shadow: style.boxShadow };
  });
  const activeWeight = await targetTab.evaluate((element) => getComputedStyle(element).fontWeight);
  expect(activeStyle.background).not.toBe(hoverBackground);
  expect(activeStyle.shadow).toContain('inset');
  expect(Number(activeWeight)).toBeGreaterThanOrEqual(600);
});

test('all tasks selector anchors to the active task tab', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  await page.setViewportSize({ width: 2589, height: 1027 });
  await switchTask(page, '函数单元课程方案包');

  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  const activeTab = taskTabs.getByRole('button', { name: '函数单元课程方案包', exact: true });
  const triggerBox = await activeTab.boundingBox();
  expect(triggerBox).not.toBeNull();

  await activeTab.click();
  const selector = page.getByRole('dialog', { name: '全部任务选择器' });
  await expect(selector).toBeVisible();
  const selectorBox = await selector.boundingBox();
  expect(selectorBox).not.toBeNull();
  expect(Math.abs(selectorBox!.x - triggerBox!.x)).toBeLessThanOrEqual(2);
});

test('new task entry follows the open tabs and swaps icons without layout shift', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  const newTaskEntry = taskTabs.getByRole('button', { name: '新建任务页面' });
  const lastOpenTab = taskTabs.locator(':scope > div').last();
  const contextToggle = page.getByRole('button', { name: '展开核心上下文' });
  const plusIcon = newTaskEntry.locator('svg').nth(0);
  const composeIcon = newTaskEntry.locator('svg').nth(1);
  const readGeometry = () => newTaskEntry.evaluate((element) => {
    const rectangle = element.getBoundingClientRect();
    return { left: rectangle.left, top: rectangle.top, width: rectangle.width, height: rectangle.height };
  });

  const [tabBox, entryBox, toggleBox] = await Promise.all([
    lastOpenTab.boundingBox(),
    newTaskEntry.boundingBox(),
    contextToggle.boundingBox(),
  ]);
  expect(tabBox).not.toBeNull();
  expect(entryBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(Math.abs(entryBox!.x - (tabBox!.x + tabBox!.width) - 4)).toBeLessThanOrEqual(1);
  expect(entryBox!.x + entryBox!.width).toBeLessThan(toggleBox!.x);
  expect(entryBox!.width).toBe(32);
  expect(entryBox!.height).toBe(32);

  const idleGeometry = await readGeometry();
  const idleBackground = await newTaskEntry.evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect.poll(() => plusIcon.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await expect.poll(() => composeIcon.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');

  await newTaskEntry.hover();
  await expect.poll(() => plusIcon.evaluate((element) => getComputedStyle(element).opacity)).toBe('0');
  await expect.poll(() => composeIcon.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await expect.poll(() => newTaskEntry.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(idleBackground);
  expect(await readGeometry()).toEqual(idleGeometry);

  await newTaskEntry.focus();
  await expect(newTaskEntry).toBeFocused();
  await expect.poll(() => composeIcon.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  expect(await readGeometry()).toEqual(idleGeometry);
});

test('teacher opens unopened history as a tab and switches between Run contexts', async ({ page }) => {
  await openTeacherWorkBuddy(page);
  await switchTask(page, '整理本周学情沟通要点');

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-parent-note$/);
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '整理本周学情沟通要点', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('可重试', { exact: true })).toBeVisible();

  await switchTask(page, '分析三班作业共性问题');
  await expect(page.getByText('已完成', { exact: true })).toBeVisible();
  await expect(taskTabs.getByRole('button', { name: '分析三班作业共性问题', exact: true })).toHaveAttribute('aria-current', 'page');

  await taskTabs.getByRole('button', { name: '整理本周学情沟通要点', exact: true }).click();
  await expect(page.getByText('可重试', { exact: true })).toBeVisible();
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
  const taskTabs = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  await expect(taskTabs.getByRole('button', { name: '函数单元方案包 · 第一版', exact: true })).toHaveAttribute('aria-current', 'page');

  const taskList = selector.getByRole('list', { name: '全部任务列表' });
  const initialScroll = await taskList.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  expect(initialScroll.scrollHeight).toBeGreaterThan(initialScroll.clientHeight);
  const lastTask = selector.getByRole('button', { name: /规划期中复习任务清单/ }).first();
  await lastTask.focus();
  await expect.poll(() => taskList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
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
