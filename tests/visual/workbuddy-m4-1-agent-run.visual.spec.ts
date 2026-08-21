import { expect, test } from '@playwright/test';

async function openWorkBuddy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
}

async function confirmContext(page: import('@playwright/test').Page) {
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const now = new Date('2026-08-21T10:00:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
});

test('smart courseware keeps every key Agent Run frame in one work surface', async ({ page }) => {
  await openWorkBuddy(page);
  await confirmContext(page);
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await page.clock.runFor(360);
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-clarification-1440x900.png');

  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' }).getByRole('button', { name: '提交确认' }).click();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-plan-1440x900.png');

  await timeline.getByRole('article').filter({ hasText: '智能课件执行计划' }).getByRole('button', { name: '开始执行计划' }).click();
  await expect(timeline.getByRole('article').filter({ hasText: '理解教学目标' }).getByText('运行中', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-running-1440x900.png');
  await page.clock.runFor(1440);

  const output = page.getByRole('region', { name: '智能课件产出' });
  await expect(output).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-artifact-1440x900.png');
  await output.getByRole('button', { name: '编辑课件' }).click();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-edit-1440x900.png');
  await output.getByRole('button', { name: '退出编辑' }).click();
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '保存到 ClassIn' }).click();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-action-1440x900.png');

  const action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-approval-1440x900.png');
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(360);
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-courseware-receipt-1440x900.png');
});

test('course package preserves progress and partial-recovery frames', async ({ page }) => {
  await openWorkBuddy(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await confirmContext(page);
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await page.clock.runFor(360);
  await expect(page).toHaveScreenshot('workbuddy-m4-1-package-plan-1440x900.png');

  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await timeline.getByRole('article').filter({ hasText: '课程方案包执行计划' }).getByRole('button', { name: '确认范围并开始生成' }).click();
  await expect(timeline.getByRole('article').filter({ hasText: '课程方案包生成进度' }).getByText('生成中', { exact: true }).first()).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-package-progress-1440x900.png');
  await page.clock.runFor(1080);

  const output = page.getByRole('region', { name: '课程方案包产出' });
  await expect(output).toBeVisible();
  await page.evaluate(() => {
    window.history.replaceState({}, '', `${window.location.pathname}?review=package-partial`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('combobox', { name: '课程方案包恢复场景' }).selectOption('partial_success');
  await output.getByRole('button', { name: '保存所选产物到 ClassIn' }).click();
  const action = timeline.getByRole('article').filter({ hasText: '保存课程方案包到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存课程方案包' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();
  await page.clock.runFor(360);
  await expect(timeline.getByRole('article').filter({ hasText: '课程方案包部分成功' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-m4-1-package-partial-1440x900.png');
});
