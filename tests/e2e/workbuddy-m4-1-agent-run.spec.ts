import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const now = new Date('2026-08-21T10:00:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
});

async function openWorkBuddy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
}

async function openNewTaskContext(page: import('@playwright/test').Page) {
  const context = page.getByRole('complementary', { name: '核心上下文' });
  if (!await context.isVisible()) await page.getByRole('button', { name: '展开核心上下文' }).click();
  await expect(context).toBeVisible();
  return context;
}

async function createCoursewareRun(page: import('@playwright/test').Page) {
  await openWorkBuddy(page);
  const context = await openNewTaskContext(page);
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '任务补充输入' }).getByRole('button', { name: '停止执行' })).toHaveCount(0);
  await page.clock.runFor(2_000);
}

async function confirmCoursewarePlan(page: import('@playwright/test').Page) {
  await createCoursewareRun(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const clarification = timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' });
  await clarification.getByRole('button', { name: '提交确认' }).click();
  return timeline.getByRole('article').filter({ hasText: '智能课件执行计划' });
}

async function generateCoursewareArtifact(page: import('@playwright/test').Page) {
  const plan = await confirmCoursewarePlan(page);
  await plan.getByRole('button', { name: '开始执行计划' }).click();
  await expect(page.getByRole('button', { name: '停止执行' })).toBeVisible();
  await page.clock.runFor(12_000);
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();
}

async function createPackageRun(page: import('@playwright/test').Page) {
  await openWorkBuddy(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  const context = await openNewTaskContext(page);
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);
}

async function generatePackageArtifacts(page: import('@playwright/test').Page) {
  await createPackageRun(page);
  const plan = page.getByRole('article').filter({ hasText: '课程方案包执行计划' });
  await plan.getByRole('button', { name: '确认范围并开始生成' }).click();
  await expect(page.getByRole('button', { name: '停止执行' })).toBeVisible();
  await page.clock.runFor(9_000);
  await expect(page.getByRole('region', { name: '课程方案包产出' })).toBeVisible();
  return page.getByRole('feed', { name: 'Agent 任务时间线' });
}

test('teacher creates one dynamic smart-courseware run from the on-demand Context tree', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openWorkBuddy(page);

  const context = page.getByRole('complementary', { name: '核心上下文' });
  await expect(context).toBeHidden();
  await page.getByRole('button', { name: '展开核心上下文' }).click();
  await expect(context).toBeVisible();
  const contextTree = context.getByRole('tree', { name: '教学上下文对象' });
  await expect(contextTree).toBeVisible();
  await expect(context.getByRole('textbox', { name: '搜索上下文' })).toBeVisible();
  await expect(context.getByRole('button', { name: '收起高一（3）班' })).toBeVisible();
  const classItem = contextTree.getByRole('treeitem', { name: /高一（3）班/ });
  await classItem.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(classItem).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(classItem).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(contextTree.locator('[role="treeitem"]:focus')).toContainText('高中数学 · 必修一');
  const contextSearch = context.getByRole('textbox', { name: '搜索上下文' });
  await contextSearch.fill('函数的性质');
  await contextSearch.press('Tab');
  await page.keyboard.press('Tab');
  await expect(contextTree.locator('[role="treeitem"]:focus')).toContainText('函数的性质');
  await contextSearch.fill('');
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();

  await expect(page.getByRole('group', { name: '已选择上下文' }).getByText('高一（3）班', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '已选择上下文' }).getByText('+1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  await expect(page.getByLabel('当前为固定体验数据')).toHaveText('[模拟] 体验环境');
  await expect(page.getByRole('button', { name: '上下文 · 10' })).toBeVisible();
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await expect(timeline.getByText('教学目标', { exact: true })).toBeVisible();
  await expect(timeline.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
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

test('teacher submits a custom lesson arrangement and can cancel the proposed plan', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareRun(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const clarification = timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' });
  await clarification.getByRole('radio', { name: '其他' }).check();
  await clarification.getByRole('textbox', { name: '其他课时安排' }).fill('第 4 课时（复习提升）');
  await clarification.getByRole('button', { name: '提交确认' }).click();

  await expect(timeline.getByRole('article').filter({ hasText: '课件要求已补充' })).toContainText('第 4 课时（复习提升）');
  const plan = timeline.getByRole('article').filter({ hasText: '智能课件执行计划' });
  await plan.getByRole('button', { name: '取消任务' }).click();
  await expect(timeline.getByRole('article').filter({ hasText: '任务已取消' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '生成函数单调性智能课件' }).locator('..').getByText('已取消', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '任务补充输入' }).getByRole('button', { name: '继续执行' })).toHaveCount(0);
  await expect(plan.getByRole('button', { name: '开始执行计划' })).toHaveCount(0);
  await expect(plan.getByRole('button', { name: '取消任务' })).toHaveCount(0);
});

test('approved plan runs capabilities in place before the smart courseware Artifact arrives', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const plan = await confirmCoursewarePlan(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });

  await plan.getByRole('button', { name: '开始执行计划' }).click();
  const activeCall = timeline.getByRole('article', { name: '理解教学目标 · 运行中' });
  await expect(activeCall.getByText('运行中', { exact: true })).toBeVisible();
  await expect(activeCall.getByText('目标与课时约束', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '执行中' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '执行中' })).toContainText('第 1/4 步 · 预计还需 12 秒');
  await expect(activeCall.getByText('本步预计 3 秒', { exact: true })).toBeVisible();
  expect(await activeCall.evaluate((element) => getComputedStyle(element, '::after').animationName)).toContain('runSweep');
  await page.clock.runFor(1_000);
  await expect(page.getByRole('status').filter({ hasText: '执行中' })).toContainText('预计还需 11 秒');
  await expect(activeCall.getByText('本步预计 2 秒', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('article', { name: '设计教学结构 · 等待执行' })).toBeVisible();
  await page.clock.runFor(11_000);

  for (const capability of ['理解教学目标', '设计教学结构', '组装课件初稿', '检查教学与内容质量']) {
    const call = timeline.getByRole('article').filter({ hasText: capability });
    await expect(call.getByText('已完成', { exact: true })).toBeVisible();
    await expect(call.getByText('查看技术证据', { exact: true })).toBeVisible();
  }

  const artifact = timeline.getByRole('article').filter({ hasText: '函数单调性：从图像变化到形式化定义' });
  await expect(artifact).toBeVisible();
  const timelineTexts = await timeline.getByRole('article').allTextContents();
  expect(timelineTexts.findIndex((text) => text.includes('检查教学与内容质量')))
    .toBeLessThan(timelineTexts.findIndex((text) => text.includes('函数单调性：从图像变化到形式化定义')));
  await expect(page.getByRole('tab', { name: '产出' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '产出 · 1' })).toBeVisible();
  const output = page.getByRole('region', { name: '智能课件产出' });
  await expect(output.getByText('函数单调性：从图像变化到形式化定义', { exact: true })).toBeVisible();
  await expect(output.getByText('v1', { exact: true })).toBeVisible();
  await expect(output.getByText('18 页', { exact: true })).toBeVisible();
  await expect(timeline).not.toContainText('教学动画');
  await expect(timeline).not.toContainText('课后练习');
});

test('running Run exposes its live plan through a compact hover and keyboard progress control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const plan = await confirmCoursewarePlan(page);
  await plan.getByRole('button', { name: '开始执行计划' }).click();

  const trigger = page.getByRole('button', { name: /查看任务执行步骤，第 1\/4 步/ });
  const steps = page.getByRole('region', { name: '任务执行步骤' });
  await expect(trigger).toBeVisible();
  await trigger.hover();
  await expect(steps).toBeVisible();
  await expect(steps.getByRole('listitem').filter({ hasText: '理解教学目标' })).toContainText('进行中');
  await expect(steps.getByRole('listitem').filter({ hasText: '设计教学结构' })).toContainText('等待');
  await expect(steps.getByRole('listitem').filter({ hasText: '理解教学目标' })).toHaveAttribute('aria-current', 'step');

  await page.mouse.move(0, 0);
  await expect(steps).toBeHidden();
  await trigger.focus();
  await expect(steps).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(steps).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.clock.runFor(3_000);
  const secondStepTrigger = page.getByRole('button', { name: /查看任务执行步骤，第 2\/4 步/ });
  await expect(secondStepTrigger).toBeVisible();
  await secondStepTrigger.hover();
  await expect(steps.getByRole('listitem').filter({ hasText: '理解教学目标' })).toContainText('已完成');
  await expect(steps.getByRole('listitem').filter({ hasText: '设计教学结构' })).toContainText('进行中');
});

test('creating another single courseware starts a fresh streaming Run instead of reopening completed progress', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);

  await page.goto('/teacher/ai-agent/new');
  const context = await openNewTaskContext(page);
  await context.getByRole('button', { name: '应用函数单调性课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();

  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '智能课件产出' })).toHaveCount(0);
  await expect(timeline.getByRole('article', { name: '理解教学目标 · 运行中' })).toHaveCount(0);

  await page.clock.runFor(2_000);
  const clarification = timeline.getByRole('article').filter({ hasText: '还需要确认课件要求' });
  await expect(clarification).toBeVisible();
  await expect(timeline.getByText('函数单调性：从图像变化到形式化定义', { exact: true })).toHaveCount(0);

  await clarification.getByRole('button', { name: '提交确认' }).click();
  const plan = timeline.getByRole('article').filter({ hasText: '智能课件执行计划' });
  await plan.getByRole('button', { name: '开始执行计划' }).click();
  await expect(timeline.getByRole('article', { name: '理解教学目标 · 运行中' })).toBeVisible();
  await expect(timeline.getByRole('article', { name: '设计教学结构 · 等待执行' })).toBeVisible();

  await page.clock.runFor(3_000);
  await expect(timeline.getByRole('article', { name: '理解教学目标 · 已完成' })).toBeVisible();
  await expect(timeline.getByRole('article', { name: '设计教学结构 · 运行中' })).toBeVisible();
});

test('collapsing the completed Run inspector removes the output from layout and restores one-column workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);

  const runSurface = page.locator('section[aria-labelledby="conversation-run-title"]');
  const output = page.getByRole('region', { name: '智能课件产出' });

  await page.getByRole('button', { name: '收起辅助区' }).click();

  await expect(runSurface).toHaveAttribute('data-inspector-open', 'false');
  await expect(page.getByRole('button', { name: '展开辅助区' })).toBeVisible();
  await expect(output).toBeHidden();
  const collapsedColumnCount = await runSurface.evaluate((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length);
  expect(collapsedColumnCount).toBe(1);
});

test('teacher previews the full read-only Artifact and completes Action, Approval, execution and Receipt in one Timeline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const output = page.getByRole('region', { name: '智能课件产出' });

  await expect(output.getByText('可查看全部页面。内容修改需使用专业文档编辑器。', { exact: true })).toBeVisible();
  await expect(output.getByText('[模拟] 预览', { exact: true })).toBeVisible();
  await expect(output.getByRole('button', { name: '编辑课件' })).toHaveCount(0);
  await expect(output.getByRole('textbox', { name: 'AI 修改要求' })).toHaveCount(0);
  await expect(output.getByText('第 1 页，共 18 页', { exact: true })).toBeVisible();
  await expect(output.getByRole('button', { name: '上一页' })).toBeDisabled();
  await output.getByRole('button', { name: '下一页' }).click();
  await expect(output.getByRole('heading', { name: '本节课，我们要解决什么' })).toBeVisible();
  await expect(output.getByText('第 2 页，共 18 页', { exact: true })).toBeVisible();

  const focusPreview = output.getByRole('button', { name: '全局预览' });
  await focusPreview.click();
  await expect(output).toBeFocused();
  const pageDirectory = output.getByRole('navigation', { name: '课件全部页面' });
  await expect(pageDirectory).toBeVisible();
  await expect(pageDirectory.getByRole('button')).toHaveCount(18);
  await pageDirectory.getByRole('button', { name: '打开第 6 页：哪些图像在区间内单调递增' }).click();
  await expect(output.getByRole('heading', { name: '哪些图像在区间内单调递增' })).toBeVisible();
  await expect(output.getByText('第 6 页，共 18 页', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(output.getByRole('heading', { name: '增函数的数学定义' })).toBeVisible();
  await page.keyboard.press('End');
  await expect(output.getByText('第 18 页，共 18 页', { exact: true })).toBeVisible();
  await expect(output.getByRole('button', { name: '下一页' })).toBeDisabled();
  await page.keyboard.press('Home');
  await expect(output.getByText('第 1 页，共 18 页', { exact: true })).toBeVisible();
  await output.getByRole('button', { name: '使用专业编辑器打开' }).click();
  await expect(output.getByRole('status')).toContainText('未接入第三方文档编辑器');
  await page.keyboard.press('Escape');
  await expect(focusPreview).toBeFocused();
  await expect(output.getByText('v1', { exact: true })).toBeVisible();
  await expect(timeline.getByText('函数单调性：从图像变化到形式化定义', { exact: true })).toBeVisible();

  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '保存到 ClassIn' }).click();
  const action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await expect(action.getByText('高一（3）班 / 高中数学 · 必修一 / 第三单元 函数的性质', { exact: true })).toBeVisible();
  await expect(action.getByText('低风险 · 允许写入 · 可撤销', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '确认执行' }).click();

  let approval = page.getByRole('dialog', { name: '确认保存到 ClassIn' });
  await page.keyboard.press('Escape');
  await page.clock.runFor(16);
  await expect(approval).toHaveCount(0);
  await expect(action.getByRole('button', { name: '确认执行' })).toBeFocused();
  await action.getByRole('button', { name: '确认执行' }).click();
  approval = page.getByRole('dialog', { name: '确认保存到 ClassIn' });
  await expect(approval.getByText('来源课件 v1', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(action.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toHaveCount(0);
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(action.getByText('正在执行', { exact: true })).toBeVisible();
  await expect(action.getByText('预计 2 秒', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);

  const receipt = timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' });
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('只有执行回执能证明 ClassIn 已接受本次保存。', { exact: true })).toBeVisible();
  await expect(receipt.getByRole('link', { name: '打开 ClassIn 课程对象' })).toBeVisible();

  const taskNavigation = page.getByRole('navigation', { name: '已打开的 Work Buddy 任务' });
  await taskNavigation.getByRole('button').first().click();
  await taskNavigation.getByRole('button', { name: '生成函数单调性智能课件', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  await expect(page.getByRole('tab', { name: '产出' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('feed', { name: 'Agent 任务时间线' }).getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
});

test('teacher supplements, stops, resumes and replans the same Run while old evidence remains inspectable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const plan = await confirmCoursewarePlan(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await plan.getByRole('button', { name: '开始执行计划' }).click();

  const composer = page.getByRole('group', { name: '任务补充输入' });
  await composer.getByRole('textbox', { name: '向 Agent 补充要求' }).fill('例题讲解后增加一分钟的同桌讨论。');
  await composer.getByRole('button', { name: '发送补充要求' }).click();
  await expect(timeline.getByText('例题讲解后增加一分钟的同桌讨论。', { exact: true })).toBeVisible();
  await expect(timeline.getByText('已应用到尚未开始的步骤', { exact: true })).toBeVisible();

  await composer.getByRole('button', { name: '停止执行' }).click();
  await expect(timeline.getByText('任务执行已停止', { exact: true })).toBeVisible();
  await expect(composer.getByRole('button', { name: '继续执行' })).toBeVisible();
  const pausedProgress = page.getByRole('button', { name: /查看任务执行步骤，已暂停，第 1\/4 步/ });
  await pausedProgress.click();
  await expect(page.getByRole('region', { name: '任务执行步骤' }).locator('li[aria-current="step"]')).toContainText('已暂停');
  await composer.getByRole('button', { name: '继续执行' }).click();
  await page.clock.runFor(12_000);
  await expect(timeline.getByText('任务已从停止位置继续', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();

  await composer.getByRole('textbox', { name: '向 Agent 补充要求' }).fill('把主教学范围改为高一（2）班的二次函数单元。');
  await composer.getByRole('button', { name: '发送补充要求' }).click();
  const impact = timeline.getByRole('article').filter({ hasText: '教学范围变化需要重新规划' });
  await expect(impact.getByText('高一（3）班 · 高中数学 · 第三单元 函数的性质', { exact: true })).toBeVisible();
  await expect(impact.getByText('高一（2）班 · 高中数学 · 第四单元 二次函数', { exact: true })).toBeVisible();
  await impact.getByRole('button', { name: '确认并重新规划' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  await expect(page.getByRole('heading', { name: '生成二次函数智能课件' })).toBeVisible();
  await expect(timeline.getByText('已归档调整前的计划与产物', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('article').filter({ hasText: '调整前智能课件执行计划' })).toHaveAttribute('data-state', 'superseded');
  await expect(timeline.getByRole('article').filter({ hasText: '函数单调性：从图像变化到形式化定义' })).toHaveAttribute('data-state', 'superseded');
  await expect(timeline.getByText('还需要确认课件要求', { exact: true })).toBeVisible();
});

test('stable Run ID restores Timeline, Artifact, Receipt, Inspector and Composer after refresh', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  const output = page.getByRole('region', { name: '智能课件产出' });
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '保存到 ClassIn' }).click();
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(2_000);
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
  await page.getByRole('group', { name: '任务补充输入' }).getByRole('textbox', { name: '向 Agent 补充要求' }).fill('刷新后继续完善例题层次');
  await output.getByRole('button', { name: '全局预览' }).click();
  await output.getByRole('navigation', { name: '课件全部页面' }).getByRole('button', { name: '打开第 12 页：三个容易混淆的判断' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: '上下文' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('textbox', { name: '搜索上下文' }).fill('高一（3）班');
  await page.getByRole('tab', { name: /产出/ }).click();

  const runUrl = page.url();
  await page.reload();

  expect(page.url()).toBe(runUrl);
  await expect(page.getByRole('feed', { name: 'Agent 任务时间线' }).getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
  await expect(page.getByRole('region', { name: '智能课件产出' }).getByText('函数单调性：从图像变化到形式化定义', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /产出/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('group', { name: '任务补充输入' }).getByRole('textbox', { name: '向 Agent 补充要求' })).toHaveValue('刷新后继续完善例题层次');
  await expect(page.getByRole('region', { name: '智能课件产出' }).getByText('第 12 页，共 18 页', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '智能课件产出' }).getByRole('heading', { name: '三个容易混淆的判断' })).toBeVisible();
  await page.getByRole('tab', { name: '上下文' }).click();
  await expect(page.getByRole('complementary', { name: '核心上下文' }).getByRole('textbox', { name: '搜索上下文' })).toHaveValue('高一（3）班');
});

test('governed recovery keeps a denied save inside the same Run and requires a new approval', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  await page.evaluate(() => {
    window.history.replaceState({}, '', `${window.location.pathname}?review=recovery`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('combobox', { name: '恢复路径验收场景' }).selectOption('permission_denied');
  const output = page.getByRole('region', { name: '智能课件产出' });
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '保存到 ClassIn' }).click();
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  let action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(2_000);

  const denied = timeline.getByRole('article').filter({ hasText: '保存动作需要处理' });
  await expect(denied.getByText('保存位置没有写入权限', { exact: true })).toBeVisible();
  await denied.getByRole('button', { name: '改用教师草稿区并重新确认' }).click();
  action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' }).last();
  await expect(action.getByText('高一（3）班 / 高中数学 · 必修一 / 教师草稿区', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await page.clock.runFor(2_000);
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
});

test('teacher configures and generates a four-artifact course package inside one Run', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createPackageRun(page);
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-course-package$/);
  await expect(page.getByLabel('当前为固定体验数据')).toHaveText('[模拟] 体验环境');
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const plan = timeline.getByRole('article').filter({ hasText: '课程方案包执行计划' });
  await expect(plan.getByRole('combobox', { name: '课程课时' })).toHaveValue('2');
  await expect(plan.getByRole('spinbutton', { name: '作业题量' })).toHaveValue('12');
  await expect(plan.getByRole('combobox', { name: '测验时长' })).toHaveValue('15');
  await expect(plan.getByRole('combobox', { name: '录播时长' })).toHaveValue('8');
  await plan.getByRole('combobox', { name: '课程课时' }).selectOption('3');
  await plan.getByRole('spinbutton', { name: '作业题量' }).fill('16');
  await plan.getByRole('combobox', { name: '测验时长' }).selectOption('20');
  await plan.getByRole('combobox', { name: '录播时长' }).selectOption('12');
  const scope = plan.getByRole('group', { name: '课程方案包产物范围' });
  await expect(scope.getByRole('checkbox')).toHaveCount(4);
  await scope.getByRole('checkbox', { name: /函数单调性随堂测验/ }).uncheck();
  await expect(scope.getByRole('checkbox', { name: /函数图像辨析录播脚本/ })).not.toBeChecked();
  await scope.getByRole('checkbox', { name: /函数单调性随堂测验/ }).check();
  await scope.getByRole('checkbox', { name: /函数图像辨析录播脚本/ }).check();
  await expect(scope.getByRole('checkbox', { name: /函数图像辨析录播脚本/ })).toBeChecked();

  await plan.getByRole('button', { name: '确认范围并开始生成' }).click();
  const progressTrigger = page.getByRole('button', { name: /查看任务执行步骤，第 1\/3 步/ });
  await expect(progressTrigger).toBeVisible();
  await progressTrigger.hover();
  await expect(page.getByRole('region', { name: '任务执行步骤' })).toContainText('形成课程目标与课件结构');
  await expect(timeline.getByText('3 课时 · 作业 16 题 · 测验 20 分钟 · 录播 12 分钟', { exact: true })).toBeVisible();
  const progress = timeline.getByRole('article').filter({ hasText: '课程方案包生成进度' });
  await expect(progress.getByText('函数单调性智能课件', { exact: true })).toBeVisible();
  await expect(progress.getByText('生成中', { exact: true }).first()).toBeVisible();
  await expect(timeline.getByText(/v1 · 可预览/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '产出 · 0' }).first()).toBeDisabled();
  const composer = page.getByRole('group', { name: '任务补充输入' });
  await composer.getByRole('button', { name: '停止执行' }).click();
  await expect(progress).toContainText('已停止');
  await expect(page.getByRole('heading', { name: '函数单调性课程方案包' }).locator('..').getByText('已停止', { exact: true })).toBeVisible();
  await composer.getByRole('textbox', { name: '向 Agent 补充要求' }).fill('录播脚本结尾增加两道课堂反思问题。');
  await composer.getByRole('button', { name: '发送补充要求' }).click();
  await expect(timeline.getByText('录播脚本结尾增加两道课堂反思问题。', { exact: true })).toBeVisible();
  await composer.getByRole('button', { name: '继续执行' }).click();
  await page.clock.runFor(9_000);
  const output = page.getByRole('region', { name: '课程方案包产出' });
  await expect(output).toBeVisible();
  await expect(output.getByText('4 项产出', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '产出 · 4' })).toBeVisible();
  await expect(output.getByRole('button', { name: /函数单调性智能课件/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /函数单调性分层作业/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /函数单调性随堂测验/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /函数图像辨析录播脚本/ })).toBeVisible();
  await expect(output.getByText('3 课时 · 18 页课件 · 概念讲解、图像辨析、例题与课堂练习', { exact: true })).toBeVisible();
  await output.getByRole('button', { name: /函数单调性分层作业/ }).click();
  await expect(output.getByText('16 道分层作业 · 基础、进阶与探究任务', { exact: true })).toBeVisible();
  await output.getByRole('button', { name: '修改此产物' }).click();
  await output.getByRole('textbox', { name: '修改函数单调性分层作业' }).fill('增加一道结合函数图像判断单调区间的探究题。');
  await page.reload();
  await expect(output.getByRole('textbox', { name: '修改函数单调性分层作业' })).toHaveValue('增加一道结合函数图像判断单调区间的探究题。');
  await output.getByRole('button', { name: '应用修改并生成新版本' }).click();
  await expect(output.getByText('作业 · v2', { exact: true })).toBeVisible();
});

test('cancelled course package freezes its scope and exposes no stale plan commands', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createPackageRun(page);
  const plan = page.getByRole('article').filter({ hasText: '课程方案包执行计划' });
  await plan.getByRole('button', { name: '取消任务' }).click();

  await expect(page.getByRole('heading', { name: '函数单调性课程方案包' }).locator('..').getByText('已取消', { exact: true })).toBeVisible();
  await expect(plan.getByRole('combobox', { name: '课程课时' })).toBeDisabled();
  await expect(plan.getByRole('spinbutton', { name: '作业题量' })).toBeDisabled();
  await expect(plan.getByRole('button', { name: '确认范围并开始生成' })).toHaveCount(0);
  await expect(plan.getByRole('button', { name: '取消任务' })).toHaveCount(0);
});

test('teacher approves the package once and receives object-level execution results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const timeline = await generatePackageArtifacts(page);
  const output = page.getByRole('region', { name: '课程方案包产出' });
  await output.getByRole('button', { name: '保存所选产物到 ClassIn' }).click();
  const action = timeline.getByRole('article').filter({ hasText: '保存课程方案包到 ClassIn' });
  await expect(action.getByRole('checkbox', { checked: true })).toHaveCount(4);
  await action.getByRole('button', { name: '确认执行' }).click();
  const approval = page.getByRole('dialog', { name: '确认保存课程方案包' });
  await expect(approval.getByText('4 项', { exact: true })).toBeVisible();
  const approvalItems = approval.getByRole('list', { name: '本次批准的课程产物' });
  await expect(approvalItems.getByRole('listitem')).toHaveCount(4);
  await expect(approvalItems.getByText(/已选择 · v1/)).toHaveCount(4);
  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(action.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();
  await expect(action.getByText('正在执行对象级写回', { exact: true })).toBeVisible();
  await expect(action.getByText('预计 2 秒', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);

  const receipt = timeline.getByRole('article').filter({ hasText: '课程方案包执行完成' });
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('已执行', { exact: true })).toHaveCount(4);
  await expect(receipt.getByText('[模拟]课程方案包执行回执', { exact: true })).toBeVisible();
});

test('partial package writeback retries only failed and waiting items while retaining both receipts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const timeline = await generatePackageArtifacts(page);
  await page.evaluate(() => {
    window.history.replaceState({}, '', `${window.location.pathname}?review=package-partial`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('combobox', { name: '课程方案包恢复场景' }).selectOption('partial_success');
  const output = page.getByRole('region', { name: '课程方案包产出' });
  await output.getByRole('button', { name: '保存所选产物到 ClassIn' }).click();
  let action = timeline.getByRole('article').filter({ hasText: '保存课程方案包到 ClassIn' });
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存课程方案包' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();
  await page.clock.runFor(2_000);

  const partialReceipt = timeline.getByRole('article').filter({ hasText: '课程方案包部分成功' });
  await expect(partialReceipt.getByText('执行失败', { exact: true })).toBeVisible();
  await expect(partialReceipt.getByText('等待依赖', { exact: true })).toBeVisible();
  await partialReceipt.getByRole('button', { name: '修改并重试失败项' }).click();
  await output.getByRole('button', { name: '生成失败项重试提案' }).click();

  action = timeline.getByRole('article').filter({ hasText: '重试失败项保存提案' });
  await expect(action.getByRole('checkbox', { checked: true })).toHaveCount(2);
  await expect(action.getByText('已成功，不重复执行', { exact: true })).toHaveCount(2);
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存课程方案包' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();
  await page.clock.runFor(2_000);

  await expect(partialReceipt).toBeVisible();
  const receipts = timeline.getByRole('article').filter({ hasText: /课程方案包(部分成功|执行完成)/ });
  await expect(receipts).toHaveCount(2);
  await expect(receipts.last().getByText('已成功，本次未重复执行', { exact: true })).toHaveCount(2);
});

test('approved courseware derives an independently contextualized package with bidirectional links', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  const output = page.getByRole('region', { name: '智能课件产出' });
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '基于此课件生成课程方案包' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-course-package$/);
  await expect(page.getByText('正在整理任务与上下文', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  await expect(timeline.getByText('来源课件 · v1', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('link', { name: '返回源课件任务' })).toBeVisible();
  await expect(timeline.getByText('需要确认独立核心上下文', { exact: true })).toBeVisible();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await expect(timeline.getByText('课程方案包执行计划', { exact: true })).toBeVisible();

  await timeline.getByRole('link', { name: '返回源课件任务' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  await expect(page.getByRole('region', { name: '智能课件产出' }).getByRole('link', { name: '打开已派生课程方案包' })).toBeVisible();
});

test('approved current-run Artifact creates a TeacherIn draft before publication', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  const output = page.getByRole('region', { name: '智能课件产出' });
  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '创建草稿到 TeacherIn' }).click();
  await expect(output.getByRole('status')).toContainText('你可以前往 TeacherIn 继续编辑作品信息、设置授权并发布');
  await output.getByRole('link', { name: '前往 TeacherIn' }).click();
  await expect(page).toHaveURL(/\/teacher\/space\/teacherin\?draft=/);
  await expect(page.getByRole('heading', { name: 'TeacherIn' })).toBeVisible();
  await expect(page.getByRole('region', { name: '作品草稿' }).getByRole('textbox', { name: '作品名称' })).toHaveValue('函数单调性：从图像变化到形式化定义');
});

test('compact reduced-motion Run keeps the Timeline, Inspector and primary commands accessible @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const plan = await confirmCoursewarePlan(page);
  await plan.getByRole('button', { name: '开始执行计划' }).focus();
  await page.keyboard.press('Enter');
  const runningCall = page.getByRole('feed', { name: 'Agent 任务时间线' }).getByRole('article', { name: '理解教学目标 · 运行中' });
  expect(await runningCall.evaluate((element) => getComputedStyle(element, '::after').animationName)).toBe('none');
  const progressTrigger = page.getByRole('button', { name: /查看任务执行步骤，第 1\/4 步/ });
  expect(await progressTrigger.locator('svg').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.clock.runFor(12_000);
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();
  await page.getByRole('tab', { name: '上下文' }).click();
  await expect(page.getByRole('complementary', { name: '核心上下文' })).toBeVisible();
  await page.getByRole('tab', { name: '产出' }).click();
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.clock.resume();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
