import { expect, test, type Page } from '@playwright/test';

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function openTeacherCollection(page: Page, label: '我的班级' | '公开课') {
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: label }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const root = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);

  const workspace = page.locator('#main-content');
  if (await workspace.count()) {
    const size = await workspace.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth);
  }
}

async function expectPureWhiteCanvas(page: Page) {
  const backgrounds = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const computedBackground = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).backgroundColor : null;
    };

    return {
      canvasToken: root.getPropertyValue('--color-canvas').trim(),
      shellToken: root.getPropertyValue('--color-shell').trim(),
      surfaceToken: root.getPropertyValue('--color-surface').trim(),
      body: computedBackground('body'),
      main: computedBackground('main'),
    };
  });

  expect(backgrounds.canvasToken).toBe('rgb(255 255 255)');
  expect(backgrounds.shellToken).toBe('rgb(255 255 255)');
  expect(backgrounds.surfaceToken).toBe('rgb(255 255 255)');
  for (const background of [backgrounds.body, backgrounds.main].filter(Boolean)) {
    expect(background).toMatch(/^(oklch\(1 0 0\)|rgb\(255, 255, 255\))$/);
  }
}

for (const roleViewport of [
  { role: /老师视角/, label: 'teacher', width: 1440, height: 900 },
  { role: /老师视角/, label: 'teacher', width: 1280, height: 720 },
  { role: /老师视角/, label: 'teacher compact', width: 1024, height: 640 },
  { role: /学生视角/, label: 'student', width: 1440, height: 900 },
  { role: /学生视角/, label: 'student', width: 1280, height: 720 },
  { role: /学生视角/, label: 'student compact', width: 1024, height: 640 },
]) {
  test(`${roleViewport.label} canvas contract at ${roleViewport.width}x${roleViewport.height}`, async ({ page }) => {
    await page.setViewportSize({ width: roleViewport.width, height: roleViewport.height });
    await selectRole(page, roleViewport.role);
    await expectPureWhiteCanvas(page);
  });
}

test('role selection at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expectPureWhiteCanvas(page);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('role-select-1440x900.png', { fullPage: true });
});

test('role selection at 1024x640', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('role-select-1024x640.png', { fullPage: true });
});

test('teacher home at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await expectPureWhiteCanvas(page);
  await expectNoHorizontalOverflow(page);
  const dateLabelRightEdges = await Promise.all(
    ['今天', '明天', '后天'].map((label) => page.getByText(label, { exact: true }).evaluate((element) => element.getBoundingClientRect().right)),
  );
  expect(Math.max(...dateLabelRightEdges) - Math.min(...dateLabelRightEdges)).toBeLessThanOrEqual(1);
  const homeScheduleMetrics = await page.evaluate(() => {
    const primary = document.querySelector('article');
    const eventButtons = Array.from(document.querySelectorAll('[data-timeline-node="event"]'))
      .map((node) => node.closest('button'))
      .filter((button): button is HTMLButtonElement => Boolean(button));
    const firstEvent = eventButtons[0]?.getBoundingClientRect();
    const secondEvent = eventButtons[1]?.getBoundingClientRect();
    const completed = document.querySelector<HTMLElement>('[data-completed="true"]');
    const timelineTimes = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-node="event"]'))
      .map((node) => node.closest('button')?.querySelector('time')?.textContent ?? '');
    return {
      completedBackground: completed ? getComputedStyle(completed).backgroundColor : null,
      firstEventGap: firstEvent && secondEvent ? secondEvent.top - firstEvent.bottom : null,
      primaryHeight: primary?.getBoundingClientRect().height ?? null,
      timelineTimes,
    };
  });
  expect(homeScheduleMetrics.primaryHeight).toBeGreaterThanOrEqual(86);
  expect(homeScheduleMetrics.primaryHeight).toBeLessThanOrEqual(90);
  expect(homeScheduleMetrics.firstEventGap).toBeGreaterThanOrEqual(4);
  expect(homeScheduleMetrics.completedBackground).toBe('rgb(244, 244, 244)');
  expect(homeScheduleMetrics.timelineTimes.every((time) => /^\d{2}:\d{2}$/.test(time))).toBe(true);
  await expect(page).toHaveScreenshot('teacher-home-1440x900.png', { fullPage: true });
});

test('student home at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole('heading', { name: '学习安排' })).toBeVisible();
  await expect(page.getByRole('region', { name: '最近三天' })).toBeVisible();
  const metrics = await page.evaluate(() => {
    const primary = document.querySelector('article');
    const attention = document.querySelector('aside[aria-label="关注摘要"]');
    const nodeCenters = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-node]'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
    const dateRightEdges = Array.from(document.querySelectorAll<HTMLElement>('[data-timeline-day] strong'))
      .map((label) => label.getBoundingClientRect().right);
    const eventButtons = Array.from(document.querySelectorAll('[data-timeline-node="event"]'))
      .map((node) => node.closest('button'))
      .filter((button): button is HTMLButtonElement => Boolean(button));
    const firstEvent = eventButtons[0]?.getBoundingClientRect();
    const secondEvent = eventButtons[1]?.getBoundingClientRect();
    const completed = document.querySelector<HTMLElement>('[data-completed="true"]');
    const timelineTimes = eventButtons.map((button) => button.querySelector('time')?.textContent ?? '');
    return {
      attentionWidth: attention?.getBoundingClientRect().width ?? null,
      completedBackground: completed ? getComputedStyle(completed).backgroundColor : null,
      firstEventGap: firstEvent && secondEvent ? secondEvent.top - firstEvent.bottom : null,
      primaryHeight: primary?.getBoundingClientRect().height ?? null,
      timelineTimes,
      nodeDelta: nodeCenters.length ? Math.max(...nodeCenters) - Math.min(...nodeCenters) : null,
      dateLabelDelta: dateRightEdges.length ? Math.max(...dateRightEdges) - Math.min(...dateRightEdges) : null,
    };
  });
  expect(metrics.primaryHeight).toBeGreaterThanOrEqual(86);
  expect(metrics.primaryHeight).toBeLessThanOrEqual(90);
  expect(metrics.attentionWidth).toBeGreaterThanOrEqual(328);
  expect(metrics.attentionWidth).toBeLessThanOrEqual(344);
  expect(metrics.firstEventGap).toBeGreaterThanOrEqual(4);
  expect(metrics.completedBackground).toBe('rgb(244, 244, 244)');
  expect(metrics.nodeDelta).toBeLessThanOrEqual(1);
  expect(metrics.dateLabelDelta).toBeLessThanOrEqual(1);
  expect(metrics.timelineTimes.every((time) => /^\d{2}:\d{2}$/.test(time))).toBe(true);
  await expect(page).toHaveScreenshot('student-home-1440x900.png', { fullPage: true });
});

test('home teaching activity operation and classroom context at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('article', { name: '动量守恒模型' }).getByRole('button', { name: '动量守恒模型：去备课' }).click();
  await expect(page.getByRole('dialog', { name: '动量守恒模型' })).toBeVisible();
  await expect(page).toHaveScreenshot('teacher-home-activity-operation-1440x900.png', { fullPage: true });

  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.getByRole('button', { name: '查看动量守恒模型详情' }).click();
  await expect(page).toHaveURL(/\/student\/classes\/physics-3\?course=course-momentum&unit=unit-momentum-1&activity=activity-momentum-lesson&from=home$/);
  await expect(page.locator('[data-activity-id="activity-momentum-lesson"]')).toHaveAttribute('data-highlighted', 'true');
  await expect(page).toHaveScreenshot('student-home-activity-detail-1440x900.png', { fullPage: true });
});

test('teacher compact shell at 1024x640', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await selectRole(page, /老师视角/);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-home-1024x640.png', { fullPage: true });
});

for (const viewport of [{ width: 1440, height: 900 }]) {
  test(`teacher class-management navigation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /老师视角/);
    const disclosure = page.getByRole('button', { name: '班课管理' });
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: '我的班级' })).toBeVisible();
    await expect(page.getByRole('link', { name: '公开课' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(
      `teacher-navigation-expanded-${viewport.width}x${viewport.height}.png`,
      { fullPage: true },
    );
  });
}

test('teacher class-management navigation states at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  const disclosure = page.getByRole('button', { name: '班课管理' });
  const classLink = page.getByRole('link', { name: '我的班级' });

  await disclosure.hover();
  await expect(page).toHaveScreenshot('teacher-navigation-hover-1440x900.png', { fullPage: true });
  await disclosure.focus();
  await expect(page).toHaveScreenshot('teacher-navigation-focus-1440x900.png', { fullPage: true });
  await disclosure.click();
  await classLink.click();
  await expect(classLink).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveScreenshot('teacher-navigation-selected-1440x900.png', { fullPage: true });
});

test('teacher account menu at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);

  const identitySwitcher = page.getByTitle('账户菜单');
  const identityBounds = await identitySwitcher.boundingBox();
  await identitySwitcher.click();

  const menu = page.getByRole('menu', { name: '账户菜单' });
  await expect(menu).toBeVisible();
  const menuBounds = await menu.boundingBox();
  expect(identityBounds).not.toBeNull();
  expect(menuBounds).not.toBeNull();
  expect(menuBounds?.y).toBeGreaterThanOrEqual(
    (identityBounds?.y ?? 0) + (identityBounds?.height ?? 0),
  );
  expect(menuBounds?.x).toBeGreaterThanOrEqual(0);
  expect((menuBounds?.x ?? 0) + (menuBounds?.width ?? 0)).toBeLessThanOrEqual(1440);
  await expect(page).toHaveScreenshot('teacher-account-menu-1440x900.png', { fullPage: true });
});

for (const identityCase of [
  { role: /老师视角/, label: 'teacher', roleLabel: '老师视角' },
  { role: /学生视角/, label: 'student', roleLabel: '学生视角' },
] as const) {
  test(`${identityCase.label} identity hierarchy at 1440x900`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectRole(page, identityCase.role);

    const identitySwitcher = page.getByTitle('账户菜单');
    await expect(identitySwitcher).toHaveAttribute(
      'aria-label',
      `王老师，${identityCase.roleLabel}，ClassIn 教研中心`,
    );

    const metrics = await identitySwitcher.evaluate((button) => {
      const avatar = button.querySelector('img');
      const accountCopy = avatar?.nextElementSibling;
      const primary = accountCopy?.children[0];
      const organization = accountCopy?.children[1];
      const name = primary?.children[0];
      const role = primary?.children[1];
      const buttonRect = button.getBoundingClientRect();
      const nameRect = name?.getBoundingClientRect();
      const roleRect = role?.getBoundingClientRect();
      const organizationRect = organization?.getBoundingClientRect();

      return {
        buttonHeight: buttonRect.height,
        buttonWidth: buttonRect.width,
        firstLineAlignment:
          nameRect && roleRect ? Math.abs(nameRect.bottom - roleRect.bottom) : null,
        organizationBelowPrimary:
          organizationRect && nameRect ? organizationRect.top > nameRect.top : false,
        organizationText: organization?.textContent,
        primaryText: primary?.textContent,
        roleClientWidth: role?.clientWidth ?? null,
        roleScrollWidth: role?.scrollWidth ?? null,
        organizationClientWidth: organization?.clientWidth ?? null,
        organizationScrollWidth: organization?.scrollWidth ?? null,
      };
    });

    expect(metrics.buttonWidth).toBe(195);
    expect(metrics.buttonHeight).toBe(64);
    expect(metrics.firstLineAlignment).toBeLessThanOrEqual(1);
    expect(metrics.organizationBelowPrimary).toBe(true);
    expect(metrics.primaryText).toBe(`王老师${identityCase.roleLabel}`);
    expect(metrics.organizationText).toBe('ClassIn 教研中心');
    expect(metrics.roleScrollWidth).toBeLessThanOrEqual(metrics.roleClientWidth ?? 0);
    expect(metrics.organizationScrollWidth).toBeLessThanOrEqual(
      metrics.organizationClientWidth ?? 0,
    );
    await expect(identitySwitcher).toHaveScreenshot(
      `${identityCase.label}-identity-switcher-1440x900.png`,
    );
  });
}

test('teacher class collection at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-classes-1440x900.png', { fullPage: true });
});

test('teacher class list settings dialog at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('button', { name: '编辑高二物理 3 班' }).click();
  await expect(page.getByRole('dialog', { name: '班级属性' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-class-list-settings-dialog-1440x900.png', { fullPage: true });
});

test('teacher class detail at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-class-detail-1440x900.png', { fullPage: true });
});

test('teacher empty class at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('button', { name: '新建班级' }).click();
  await page.getByRole('textbox', { name: '班级名称' }).fill('高三物理冲刺班');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByLabel('面包屑')).toContainText('高三物理冲刺班');
  await expect(page.getByText('先创建第一门课程')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建课程' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-empty-class-1440x900.png', { fullPage: true });
});

test('teacher class detail with collapsed rail at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await page.getByRole('button', { name: '收起右侧栏' }).click();
  await expect(page.getByRole('complementary', { name: '班级辅助信息' })).toHaveAttribute('data-collapsed', 'true');
  await expect(page.getByRole('button', { name: '展开右侧栏' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-class-detail-rail-collapsed-1440x900.png', { fullPage: true });
});

for (const dialog of [
  { trigger: '班级群聊', name: '班级群聊', snapshot: 'teacher-class-chat-dialog-1440x900.png' },
  { trigger: '公告', name: '公告', snapshot: 'teacher-class-announcements-dialog-1440x900.png' },
  { trigger: '编辑班级', name: '班级属性', snapshot: 'teacher-class-settings-dialog-1440x900.png' },
] as const) {
  test(`teacher class ${dialog.name} dialog at 1440x900`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await selectRole(page, /老师视角/);
    await openTeacherCollection(page, '我的班级');
    await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
    await page.getByRole('button', { name: dialog.trigger }).click();
    await expect(page.getByRole('dialog', { name: dialog.name })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(dialog.snapshot, { fullPage: true });
  });
}

test('teacher class placeholder boundary at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await page.getByRole('button', { name: 'AI 助教' }).click();
  await expect(page.getByRole('dialog', { name: '能力边界说明' })).toContainText('Placeholder');
  await expect(page).toHaveScreenshot('teacher-class-placeholder-1440x900.png', { fullPage: true });
});

test('teacher completed course at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '我的班级');
  await page.getByRole('row').filter({ hasText: '高一物理基础班' }).getByRole('button', { name: '进入班级' }).click();
  await expect(page.getByText('已结课', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建内容' })).toBeVisible();
  await page.getByRole('button', { name: '新建内容' }).click();
  await expect(page.getByRole('menuitem', { name: '新建课程' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '新建单元' })).toHaveCount(0);
  await page.getByRole('button', { name: '新建内容' }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-completed-class-1440x900.png', { fullPage: true });
});

test('teacher missing class at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/classes/missing-class');
  await expect(page.getByRole('heading', { name: '找不到这个内容' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-missing-class-1440x900.png', { fullPage: true });
});

test('student class detail at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: /高二物理 3 班/ }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-class-detail-1440x900.png', { fullPage: true });
});

test('teacher open course collection at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '公开课');
  await expect(page.getByRole('table', { name: '我的公开课' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-open-courses-1440x900.png', { fullPage: true });
});

test('teacher open course editor dialog at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '公开课');
  await page.getByRole('button', { name: '新建公开课' }).click();
  await expect(page.getByRole('dialog', { name: '新建公开课' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-open-course-dialog-1440x900.png', { fullPage: true });
});

test('teacher open course detail at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherCollection(page, '公开课');
  await page.getByRole('row', { name: '查看公开课 家长会说明会' }).click();
  await expect(page.getByRole('dialog', { name: '公开课详情' })).toContainText('家长会说明会');
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-open-course-detail-1440x900.png', { fullPage: true });
});

test('teacher ended open course detail at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/open-courses/open-history?source=list');
  const endedDetail = page.getByRole('dialog', { name: '公开课详情' });
  await expect(endedDetail).toContainText('产品经理成长训练营');
  await expect(endedDetail.getByRole('button', { name: /邀请学生|编辑|删除公开课|上课|进入课堂/ })).toHaveCount(0);
  await expect(endedDetail.getByRole('button', { name: /教学报告/ })).toContainText('Placeholder');
  await expect(endedDetail.getByRole('button', { name: /课后评价/ })).toContainText('Placeholder');
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-open-course-ended-1440x900.png', { fullPage: true });
});

test('teacher schedule three-column week view at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '课程表' }).click();
  await expect(page.getByRole('region', { name: '完整周视图' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '月历' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-schedule-week-1440x900.png', { fullPage: true, maxDiffPixels: 100 });
});

test('teacher schedule three-column day view at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '课程表' }).click();
  await page.getByRole('button', { name: '日视图' }).click();
  await expect(page.getByRole('region', { name: '单日视图' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '月历' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-schedule-day-1440x900.png', { fullPage: true, maxDiffPixels: 100 });
});

test('teacher schedule with details at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '课程表' }).click();
  await page.getByRole('complementary', { name: '当日安排' }).getByRole('button', { name: '查看 09:00 阅读理解专题，课堂', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '阅读理解专题' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-schedule-detail-1440x900.png', { fullPage: true, maxDiffPixels: 100 });
});

test('student schedule with details at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: '课程表' }).click();
  await page.getByRole('button', { name: /动量守恒作业 A 组/ }).first().click();
  await expect(page.getByRole('complementary', { name: '月历' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-schedule-detail-1440x900.png', { fullPage: true, maxDiffPixels: 100 });
});

test('teacher task center with details at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  await page.getByText('机械波错题订正', { exact: true }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-detail-1440x900.png', { fullPage: true });
});

test('teacher task center grading operation at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  const row = page.locator('article[data-kind="homework"]').filter({ hasText: '机械波错题订正' });
  await row.getByRole('button', { name: '去批改' }).click();
  await expect(page.getByRole('dialog', { name: '作业批改' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-grading-operation-1440x900.png', { fullPage: true });
});

test('teacher classroom placeholder operation at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  const row = page.locator('article[data-kind="classroom"]').filter({ hasText: '动量守恒模型' });
  await row.getByRole('button', { name: '去上课' }).click();
  await expect(page.getByRole('dialog', { name: '去上课' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-classroom-operation-1440x900.png', { fullPage: true });
});

test('teacher task center compact list at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  await expect(page.locator('article[data-bucket="overdue"]').first()).toBeVisible();
  await expect(page.getByText('5 项任务')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-list-1440x900.png', { fullPage: true });
});

test('teacher task center filter at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  await page.getByRole('button', { name: '筛选任务' }).click();
  await expect(page.getByRole('group', { name: '筛选任务选项' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-filter-1440x900.png', { fullPage: true });
});

test('student todo with details at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: /待办/ }).click();
  await page.getByText('动量守恒作业 A 组', { exact: true }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-todos-detail-1440x900.png', { fullPage: true });
});

test('student todo task operation at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: /待办/ }).click();
  const row = page.locator('article[data-kind="homework"]').filter({ hasText: '动量守恒作业 A 组' });
  await row.getByRole('button', { name: '继续作业' }).click();
  await expect(page.getByRole('dialog', { name: '继续作业' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-todos-operation-1440x900.png', { fullPage: true });
});

test('student todo compact list at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: /待办/ }).click();
  await expect(page.locator('article[data-bucket="overdue"]').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-todos-list-1440x900.png', { fullPage: true });
});

test('teacher task center reminder dialog at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '待办' }).click();
  await page.getByText('发布周末学习提醒', { exact: true }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-tasks-reminder-1440x900.png', { fullPage: true });
});

test('teacher class messages at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: /消息/ }).click();
  await expect(page.getByRole('heading', { name: '高二物理 3 班' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-messages-1440x900.png', { fullPage: true });
});

test('student direct messages at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: /私聊/ }).click();
  await expect(page.getByRole('heading', { name: '王老师' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-messages-1440x900.png', { fullPage: true });
});

test('teacher system notice at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: /系统通知/ }).click();
  await expect(page.getByRole('heading', { name: '动量守恒作业提交进度更新' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-system-notice-1440x900.png', { fullPage: true });
});

test('student class resources at 1280x720', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: /查看全部班级/ }).click();
  await page.getByText('高二物理 3 班', { exact: true }).click();
  await page.getByRole('button', { name: '查看关联资源' }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-class-resources-1280x720.png', { fullPage: true });
});
