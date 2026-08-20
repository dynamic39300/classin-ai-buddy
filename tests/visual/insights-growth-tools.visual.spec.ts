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
  const root = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
  const workspace = page.locator('#main-content');
  const size = await workspace.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth);
}

for (const viewport of VIEWPORTS) {
  test(`blackboard at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /老师视角/);
    await page.getByRole('link', { name: '黑板' }).click();
    await expect(page.getByRole('heading', { name: '黑板暂未接入' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`teacher-blackboard-${viewport.name}.png`, { fullPage: true });
  });

  test(`teaching insights at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await selectRole(page, /老师视角/);
    await page.getByRole('link', { name: '教学洞察' }).click();
    if (viewport.name === '1440x900') {
      const diagnosis = page.getByRole('heading', { name: '课堂响应较好，优先处理未交与错题。' }).locator('..').locator('..');
      const palette = await diagnosis.evaluate((section) => {
        const content = section.parentElement;
        const tokenProbe = document.createElement('span');
        tokenProbe.style.background = 'var(--color-success-soft)';
        document.body.append(tokenProbe);
        const colors = {
          diagnosis: getComputedStyle(section).backgroundColor,
          contentPaddingLeft: content ? getComputedStyle(content).paddingLeft : '',
          contentPaddingRight: content ? getComputedStyle(content).paddingRight : '',
          successSoft: getComputedStyle(tokenProbe).backgroundColor,
        };
        tokenProbe.remove();
        return colors;
      });
      expect(palette.diagnosis).toBe(palette.successSoft);
      expect(palette.contentPaddingLeft).toBe('40px');
      expect(palette.contentPaddingRight).toBe('40px');
    }
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot(`teacher-insights-${viewport.name}.png`, { fullPage: true });
  });

  if (viewport.name === '1440x900') {
    test('teaching insights range filter at 1440x900', async ({ page }) => {
      await page.setViewportSize(viewport);
      await selectRole(page, /老师视角/);
      await page.getByRole('link', { name: '教学洞察' }).click();
      await page.getByRole('button', { name: /初三英语 2 班/ }).click();
      const filterPanel = page.getByRole('group', { name: '教学洞察范围筛选选项' });
      await expect(filterPanel.getByRole('combobox', { name: '班级范围' })).toBeVisible();
      await expect(filterPanel.getByRole('combobox', { name: '课程范围' })).toBeVisible();
      const panelBounds = await filterPanel.boundingBox();
      expect(panelBounds).not.toBeNull();
      expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
      expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(1440);
      expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(900);
      await expectNoHorizontalOverflow(page);
      await expect(page).toHaveScreenshot('teacher-insights-range-filter-1440x900.png', { fullPage: true });
    });

    test('all lessons report at 1440x900', async ({ page }) => {
      await page.setViewportSize(viewport);
      await selectRole(page, /老师视角/);
      await page.getByRole('link', { name: '教学洞察' }).click();
      await page.getByRole('button', { name: '查看全部课堂' }).click();
      await expect(page.getByRole('heading', { name: '全部课堂', exact: true })).toBeVisible();
      await expect(page.getByRole('img', { name: /出勤率趋势/ })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expect(page).toHaveScreenshot('teacher-insights-all-lessons-1440x900.png', { fullPage: true, maxDiffPixels: 2500 });
    });
  }

}

test('student growth at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: '成长' }).click();
  const palette = await page.getByRole('region', { name: '学习节奏稳定，下一步建议复盘最近一次错题。' }).evaluate((diagnosis) => {
    const growthPage = document.querySelector<HTMLElement>('[aria-label="学生成长"]');
    const filter = diagnosis.querySelector<HTMLElement>('button');
    const nextStep = Array.from(diagnosis.querySelectorAll<HTMLElement>('div')).find((element) => element.textContent?.includes('建议从最近已发布课堂'));
    const content = diagnosis.parentElement;
    const tokenProbe = document.createElement('span');
    tokenProbe.style.background = 'var(--color-success-soft)';
    tokenProbe.style.borderColor = 'var(--color-line-subtle)';
    document.body.append(tokenProbe);
    const colors = {
      canvas: growthPage ? getComputedStyle(growthPage).backgroundColor : '',
      contentPaddingLeft: content ? getComputedStyle(content).paddingLeft : '',
      contentPaddingRight: content ? getComputedStyle(content).paddingRight : '',
      diagnosis: getComputedStyle(diagnosis).backgroundColor,
      filter: filter ? getComputedStyle(filter).backgroundColor : '',
      nextStepBorder: nextStep ? getComputedStyle(nextStep).borderTopColor : '',
      lineSubtle: getComputedStyle(tokenProbe).borderTopColor,
      successSoft: getComputedStyle(tokenProbe).backgroundColor,
    };
    tokenProbe.remove();
    return colors;
  });
  expect(palette.canvas).toBe('rgb(255, 255, 255)');
  expect(palette.filter).toBe('rgb(255, 255, 255)');
  expect(palette.diagnosis).toBe(palette.successSoft);
  expect(palette.nextStepBorder).toBe(palette.lineSubtle);
  expect(palette.contentPaddingLeft).toBe('40px');
  expect(palette.contentPaddingRight).toBe('40px');
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('student-growth-1440x900.png', { fullPage: true });

  await page.getByRole('button', { name: /成长范围.*全部班级/ }).click();
  const filterPanel = page.getByRole('group', { name: '成长范围筛选选项' });
  await page.getByRole('combobox', { name: '班级范围' }).selectOption('growth-class-001');
  await expect(filterPanel.getByRole('combobox', { name: '课程范围' })).toBeEnabled();
  const panelBounds = await filterPanel.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(1440);
  expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(900);
  await expect(page).toHaveScreenshot('student-growth-range-filter-1440x900.png', { fullPage: true });
  await page.getByRole('combobox', { name: '课程范围' }).selectOption('growth-course-001');

  for (const label of ['上课天数', '获得奖励']) {
    const help = page.getByRole('button', { name: `${label}说明` });
    await help.focus();
    const tooltipId = await help.getAttribute('aria-describedby');
    expect(tooltipId).not.toBeNull();
    const tooltip = page.locator(`#${tooltipId}`);
    await expect(tooltip).toBeVisible();
    const bounds = await tooltip.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1440);
  }

  await page.getByRole('button', { name: '准确率说明' }).focus();
  await expect(page.getByRole('tooltip').filter({ hasText: '不代表课程总成绩' })).toBeVisible();
  await expect(page).toHaveScreenshot('student-growth-metric-tooltip-1440x900.png', { fullPage: true });
});

test('casting at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '投屏' }).click();
  await expect(page.getByRole('dialog', { name: 'ClassIn 投屏' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('teacher-casting-1440x900.png', { fullPage: true });
});
