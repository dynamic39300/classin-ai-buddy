import { expect, test } from '@playwright/test';

async function openWorkBuddy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: '教师 WorkBuddy' }).click();
}

async function createCoursewareRun(page: import('@playwright/test').Page) {
  await openWorkBuddy(page);
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
}

async function confirmCoursewarePlan(page: import('@playwright/test').Page) {
  await createCoursewareRun(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const clarification = timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' });
  await clarification.getByRole('button', { name: '提交确认' }).click();
  return timeline.getByRole('article').filter({ hasText: '智能课件执行计划' });
}

test('teacher creates one dynamic smart-courseware run from the default Context tree', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkBuddy(page);

  const context = page.getByRole('complementary', { name: '核心上下文' });
  await expect(context).toBeVisible();
  await expect(context.getByRole('tree', { name: '教学上下文对象' })).toBeVisible();
  await expect(context.getByRole('textbox', { name: '搜索上下文' })).toBeVisible();
  await expect(context.getByRole('button', { name: '收起高二物理 3 班' })).toBeVisible();
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();

  await expect(page.getByRole('group', { name: '已选择上下文' }).getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '已选择上下文' }).getByText('+1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await expect(timeline.getByText('教学目标', { exact: true })).toBeVisible();
  await expect(timeline.getByText('已理解你的目标', { exact: true })).toBeVisible();
  await expect(timeline.getByText('还需要确认课件要求', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: '上下文' })).toHaveAttribute('aria-selected', 'true');
});

test('teacher completes inline clarification and approves a plan without leaving the Run', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareRun(page);
  const originalUrl = page.url();
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const clarification = timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' });

  await expect(clarification.getByText('第 1 步，共 4 步')).toBeVisible();
  await clarification.getByRole('radio', { name: '第 1 课时（新授入门）' }).check();
  await clarification.getByRole('combobox', { name: '课件时长' }).selectOption('45');
  await clarification.getByRole('combobox', { name: '教材版本' }).selectOption('人教版');
  await clarification.getByRole('combobox', { name: '课件风格' }).selectOption('简约探究');
  await clarification.getByRole('button', { name: '提交确认' }).click();

  await expect(timeline.getByText('课件要求已补充', { exact: true })).toBeVisible();
  const plan = timeline.getByRole('article').filter({ hasText: '智能课件执行计划' });
  await expect(plan.getByText('理解教学目标', { exact: true })).toBeVisible();
  await expect(plan.getByText('组装课件初稿', { exact: true })).toBeVisible();
  await expect(plan.getByText('等待点：教师确认计划', { exact: true })).toBeVisible();
  await expect(plan.getByRole('button', { name: '开始执行计划' })).toBeVisible();
  expect(page.url()).toBe(originalUrl);
});

test('approved plan runs capabilities in place before the smart courseware Artifact arrives', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const plan = await confirmCoursewarePlan(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });

  await plan.getByRole('button', { name: '开始执行计划' }).click();
  const activeCall = timeline.getByRole('article').filter({ hasText: '理解教学目标' });
  await expect(activeCall.getByText('运行中', { exact: true })).toBeVisible();
  await expect(activeCall.getByText('目标与课时约束', { exact: true })).toBeVisible();

  for (const capability of ['理解教学目标', '设计教学结构', '组装课件初稿', '检查教学与内容质量']) {
    const call = timeline.getByRole('article').filter({ hasText: capability });
    await expect(call.getByText('已完成', { exact: true })).toBeVisible();
    await expect(call.getByText('查看技术证据', { exact: true })).toBeVisible();
  }

  const artifact = timeline.getByRole('article').filter({ hasText: '动量守恒模型：从碰撞实验到守恒定律' });
  await expect(artifact).toBeVisible();
  const timelineTexts = await timeline.getByRole('article').allTextContents();
  expect(timelineTexts.findIndex((text) => text.includes('检查教学与内容质量')))
    .toBeLessThan(timelineTexts.findIndex((text) => text.includes('动量守恒模型：从碰撞实验到守恒定律')));
  await expect(page.getByRole('tab', { name: '产出' })).toHaveAttribute('aria-selected', 'true');
  const output = page.getByRole('region', { name: '智能课件产出' });
  await expect(output.getByText('动量守恒模型：从碰撞实验到守恒定律', { exact: true })).toBeVisible();
  await expect(output.getByText('v1', { exact: true })).toBeVisible();
  await expect(output.getByText('18 页', { exact: true })).toBeVisible();
  await expect(timeline).not.toContainText('教学动画');
  await expect(timeline).not.toContainText('课后练习');
});
