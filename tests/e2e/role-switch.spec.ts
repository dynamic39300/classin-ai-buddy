import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher to student role journey @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.getByRole('img', { name: 'EEO' })).toBeVisible();
  await expect(page.getByText('Empower Education Online')).toBeVisible();
  await expect(page.getByLabel('ClassIn 桌面端')).toBeVisible();
  await expect(page.getByRole('heading', { name: '选择本次使用视角' })).toBeVisible();
  const roleSelectAccessibility = await new AxeBuilder({ page }).analyze();
  expect(roleSelectAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: /老师视角/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '首页' })).toBeVisible();
  await expect(page.getByRole('link', { name: '黑板' })).toBeVisible();

  const identitySwitcher = page.getByTitle('账户菜单');
  await expect(identitySwitcher).toContainText('王老师');
  await expect(identitySwitcher).toContainText('ClassIn 教研中心');
  await expect(identitySwitcher).not.toContainText('老师视角');
  await expect(identitySwitcher.locator('img')).toBeVisible();

  const teacherAccessibility = await new AxeBuilder({ page }).analyze();
  expect(teacherAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.getByRole('group', { name: '角色切换' }).getByRole('button', { name: '切换至学生' }).click();
  await expect(page.getByRole('heading', { name: '学习安排' })).toBeVisible();
  await expect(page.getByRole('link', { name: '成长' })).toBeVisible();
  await expect(page.getByRole('link', { name: '黑板' })).toBeVisible();
  await expect(page.getByRole('link', { name: '投屏' })).toBeVisible();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'false');

  const studentAccessibility = await new AxeBuilder({ page }).analyze();
  expect(studentAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { name: '学习安排' })).toBeVisible();

  await page.getByTitle('账户菜单').click();
  await page.getByRole('menuitem', { name: '退出登录' }).click();
  await expect(page.getByRole('heading', { name: '选择本次使用视角' })).toBeVisible();
});

test('role switch content does not expand the fixed sidebar track', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  const geometry = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    const navigation = document.querySelector('nav');
    const activeItem = document.querySelector('nav a[aria-current="page"]');
    const roleControl = document.querySelector('[role="group"][aria-label="角色切换"]');
    if (!sidebar || !navigation || !activeItem || !roleControl) {
      throw new Error('Missing sidebar geometry target');
    }
    const rect = (element: Element) => element.getBoundingClientRect();
    return {
      sidebar: rect(sidebar),
      navigation: rect(navigation),
      activeItem: rect(activeItem),
      roleControl: rect(roleControl),
      sidebarScrollWidth: sidebar.scrollWidth,
    };
  });

  expect(geometry.sidebar.width).toBe(220);
  expect(geometry.navigation.right).toBeLessThanOrEqual(geometry.sidebar.right);
  expect(geometry.activeItem.right).toBeLessThanOrEqual(geometry.sidebar.right - 12);
  expect(geometry.roleControl.right).toBeLessThanOrEqual(geometry.sidebar.right - 12);
  expect(geometry.sidebarScrollWidth).toBeLessThanOrEqual(geometry.sidebar.width);
});

test('clicked navigation shows its selected background before pointer leave', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  const scheduleLink = page.getByRole('link', { name: '课程表' });
  await scheduleLink.click();
  await expect(scheduleLink).toHaveAttribute('aria-current', 'page');
  const backgroundWhileHovered = await scheduleLink.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await page.mouse.move(800, 80);
  await page.waitForTimeout(150);
  const backgroundAfterPointerLeave = await scheduleLink.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  expect(backgroundWhileHovered).toBe(backgroundAfterPointerLeave);
});

test('all primary entries are reachable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  await page.getByRole('link', { name: '课程表' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '课程表' })).toBeVisible();
  await expect(page.getByRole('region', { name: '完整周视图' })).toBeVisible();
  await page.getByRole('complementary', { name: '当日安排' }).getByRole('button', { name: '查看 14:30 动量守恒模型，课堂', exact: true }).click();
  await expect(page.getByRole('heading', { name: '动量守恒模型' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await expect(page.getByRole('button', { name: '去备课' })).toBeVisible();

  const scheduleAccessibility = await new AxeBuilder({ page }).analyze();
  expect(scheduleAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: '关闭动量守恒模型详情' }).click();
  await page.getByRole('link', { name: '首页' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '首页' })).toBeVisible();
});

test('schedule keeps timeline and day agenda scrolling independent at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: '课程表' }).click();

  const timeline = page.getByRole('region', { name: '课程表时间网格' });
  const agenda = page.getByRole('region', { name: '当日课程列表' });
  await expect.poll(() => timeline.evaluate((element) => element.scrollTop)).toBeGreaterThan(375);

  const geometry = await page.evaluate(() => {
    const getRect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing schedule element: ${selector}`);
      return element.getBoundingClientRect();
    };
    const label13 = getRect('[data-hour-label="13"]');
    const line13 = getRect('[data-hour-line="13"]');
    const label24 = getRect('[data-hour-label="24"]');
    const line24 = getRect('[data-hour-line="24"]');
    const filter = getRect('button[aria-label="筛选日程"]');
    const month = getRect('aside[aria-label="月历"]');
    const rail = getRect('aside[aria-label="课程表辅助栏"]');
    const monthButtons = [...document.querySelectorAll('aside[aria-label="月历"] button')]
      .filter((element) => element.querySelector('span'));
    const lastDate = monthButtons.at(-1);
    if (!(lastDate instanceof HTMLElement)) throw new Error('Missing final month date');
    const lastDateRect = lastDate.getBoundingClientRect();

    return {
      label13Center: label13.top + label13.height / 2,
      line13Top: line13.top,
      label24Center: label24.top + label24.height / 2,
      line24Top: line24.top,
      filterTop: filter.top,
      monthTop: month.top,
      railWidth: rail.width,
      monthBottomGap: month.bottom - lastDateRect.bottom,
    };
  });
  expect(Math.abs(geometry.label13Center - geometry.line13Top)).toBeLessThan(1);
  expect(Math.abs(geometry.label24Center - geometry.line24Top)).toBeLessThan(1);
  expect(Math.abs(geometry.filterTop - geometry.monthTop)).toBeLessThanOrEqual(1);
  expect(geometry.railWidth).toBe(320);
  expect(geometry.monthBottomGap).toBeGreaterThanOrEqual(12);
  expect(geometry.monthBottomGap).toBeLessThanOrEqual(14);

  const initialTimelineTop = await timeline.evaluate((element) => element.scrollTop);
  const agendaCanScroll = await agenda.evaluate((element) => element.scrollHeight > element.clientHeight);
  expect(agendaCanScroll).toBe(true);
  await agenda.evaluate((element) => { element.scrollTop = 120; });
  expect(await timeline.evaluate((element) => element.scrollTop)).toBe(initialTimelineTop);

  await page.getByRole('button', { name: '日视图' }).click();
  await expect.poll(() => timeline.evaluate((element) => element.scrollTop)).toBe(initialTimelineTop);
  await expect(page.getByTestId('current-time-line')).toHaveCount(1);
});

test('teacher class management is a temporary accessible disclosure @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  const disclosure = page.getByRole('button', { name: '班课管理' });
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('link', { name: '我的班级' })).toHaveCount(0);
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(disclosure).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('link', { name: '我的班级' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes$/);
  await expect(page.getByRole('link', { name: '我的班级' })).toHaveAttribute('aria-current', 'page');

  await page.reload();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: '班课管理' })).toBeDisabled();
  await expect(page.getByRole('link', { name: '我的班级' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: '首页' }).click();
  await expect(page.getByRole('button', { name: '班课管理' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '班课管理' }).click();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('link', { name: '课程表' }).click();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('link', { name: '首页' }).click();

  const storageKeys = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(storageKeys.local.some((key) => key.includes('class-management'))).toBe(false);
  expect(storageKeys.session.some((key) => key.includes('class-management'))).toBe(false);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('student class management uses the same temporary disclosure protocol @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();

  const disclosure = page.getByRole('button', { name: '班课管理' });
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await disclosure.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: '我的班级' }).click();
  await expect(page).toHaveURL(/\/student\/classes$/);
  await expect(page.getByRole('button', { name: '班课管理' })).toBeDisabled();

  await page.getByRole('link', { name: '首页' }).click();
  await expect(page.getByRole('button', { name: '班课管理' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '班课管理' }).click();
  await expect(page.getByRole('button', { name: '班课管理' })).toHaveAttribute('aria-expanded', 'false');

  const storageKeys = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  expect(storageKeys.local.some((key) => key.includes('class-management'))).toBe(false);
  expect(storageKeys.session.some((key) => key.includes('class-management'))).toBe(false);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher creates contextual homework from a scheduled lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: '课程表' }).click();

  await page.getByRole('complementary', { name: '当日安排' }).getByRole('button', { name: '查看 14:30 动量守恒模型，课堂', exact: true }).click();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await page.getByRole('button', { name: '布置作业' }).click();

  await expect(page).toHaveURL('/teacher/homework/new?class=physics-3&date=2026-08-08&event=class-momentum&view=week&course=course-momentum&source=teacher_schedule&unit=unit-momentum-1');
  await expect(page.getByRole('combobox', { name: /班级/ })).toHaveValue('physics-3');
  await expect(page.getByRole('combobox', { name: /课程/ })).toHaveValue('course-momentum');
  await expect(page.getByRole('combobox', { name: /单元/ })).toHaveValue('unit-momentum-1');

  await page.getByRole('button', { name: '返回' }).click();
  await expect(page).toHaveURL('/teacher/schedule?date=2026-08-08&event=class-momentum&view=week');
});

test('keyboard controls menus, dialogs and role commands', async ({ page }) => {
  await page.goto('/');

  const teacherOption = page.getByRole('button', { name: /老师视角/ });
  await teacherOption.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: '首页' })).toBeVisible();

  const accountButtonForHelp = page.getByTitle('账户菜单');
  await accountButtonForHelp.focus();
  await page.keyboard.press('Enter');
  const helpMenuItem = page.getByRole('menuitem', { name: '帮助与反馈' });
  await helpMenuItem.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '帮助与反馈' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '帮助与反馈' })).toHaveCount(0);
  await expect(accountButtonForHelp).toBeFocused();

  const accountButton = page.getByTitle('账户菜单');
  await accountButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: '账号与设置' })).toBeFocused();
  await expect(page.getByRole('menuitem', { name: /切换至/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(accountButton).toBeFocused();

  const quickRoleSwitch = page.getByRole('group', { name: '角色切换' }).getByRole('button', { name: '切换至学生' });
  await quickRoleSwitch.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '学习安排' })).toBeVisible();

  const scheduleLink = page.getByRole('link', { name: '课程表' });
  await scheduleLink.focus();
  await page.keyboard.press('Enter');
  const assignmentEvent = page.getByRole('complementary', { name: '当日安排' }).getByRole('button', { name: '查看 18:00 动量守恒作业 A 组，作业', exact: true });
  await assignmentEvent.focus();
  await page.keyboard.press('Enter');
  const assignmentDialog = page.getByRole('dialog', { name: '动量守恒作业 A 组' });
  await expect(assignmentDialog.getByRole('button', { name: '继续作业', exact: true })).toBeVisible();

  const closeScheduleDetails = page.getByRole('button', { name: '关闭动量守恒作业 A 组详情' });
  await closeScheduleDetails.focus();
  await page.keyboard.press('Enter');
  await expect(assignmentEvent).toBeFocused();
});

test('compact topbar keeps search and notification shortcuts removed @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: '全局搜索' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开全局搜索' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开通知' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开帮助' })).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});
