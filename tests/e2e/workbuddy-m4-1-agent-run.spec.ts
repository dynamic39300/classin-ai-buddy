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

async function generateCoursewareArtifact(page: import('@playwright/test').Page) {
  const plan = await confirmCoursewarePlan(page);
  await plan.getByRole('button', { name: '开始执行计划' }).click();
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();
}

async function createPackageRun(page: import('@playwright/test').Page) {
  await openWorkBuddy(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
}

async function generatePackageArtifacts(page: import('@playwright/test').Page) {
  await createPackageRun(page);
  const plan = page.getByRole('article').filter({ hasText: '课程方案包执行计划' });
  await plan.getByRole('button', { name: '确认范围并开始生成' }).click();
  await expect(page.getByRole('region', { name: '课程方案包产出' })).toBeVisible();
  return page.getByRole('feed', { name: 'Agent 任务时间线' });
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

test('teacher edits the Artifact and completes Action, Approval, execution and Receipt in one Timeline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await generateCoursewareArtifact(page);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const output = page.getByRole('region', { name: '智能课件产出' });

  await output.getByRole('button', { name: '编辑课件' }).click();
  await expect(output.getByText('编辑中', { exact: true })).toBeVisible();
  await output.getByRole('button', { name: '第 6 页 · 碰撞案例' }).click();
  await output.getByRole('textbox', { name: 'AI 修改要求' }).fill('把第 6 页案例改成更贴近生活的冰壶碰撞，并增加一页易错点辨析。');
  await output.getByRole('button', { name: '应用 AI 修改' }).click();

  await expect(output.getByText('v1', { exact: true })).toBeVisible();
  await expect(output.getByText('v2', { exact: true })).toBeVisible();
  await expect(timeline.getByText('动量守恒模型：从碰撞实验到守恒定律', { exact: true })).toBeVisible();
  await expect(timeline.getByText('课件已更新为 v2', { exact: true })).toBeVisible();
  await expect(timeline.getByText('替换第 6 页案例 · 新增易错点辨析页 · 其他页面保持不变', { exact: true })).toBeVisible();
  await output.getByRole('button', { name: '保存草稿' }).click();
  await expect(output.getByRole('status')).toContainText('未写入 ClassIn');

  await output.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await output.getByRole('button', { name: '保存到 ClassIn' }).click();
  const action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await expect(action.getByText('高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(action.getByText('低风险 · 允许写入 · 可撤销', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '确认执行' }).click();

  let approval = page.getByRole('dialog', { name: '确认保存到 ClassIn' });
  await page.keyboard.press('Escape');
  await expect(approval).toHaveCount(0);
  await expect(action.getByRole('button', { name: '确认执行' })).toBeFocused();
  await action.getByRole('button', { name: '确认执行' }).click();
  approval = page.getByRole('dialog', { name: '确认保存到 ClassIn' });
  await expect(approval.getByText('来源课件 v2', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(action.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toHaveCount(0);
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(action.getByText('正在执行', { exact: true })).toBeVisible();

  const receipt = timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' });
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('只有执行回执能证明 ClassIn 已接受本次保存。', { exact: true })).toBeVisible();
  await expect(receipt.getByRole('link', { name: '打开 ClassIn 课程对象' })).toBeVisible();

  const taskNavigation = page.getByRole('navigation', { name: '已打开的 WorkBuddy 任务' });
  await taskNavigation.getByRole('button').first().click();
  await taskNavigation.getByRole('button', { name: '生成动量守恒模型课件', exact: true }).click();
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
  await composer.getByRole('button', { name: '继续执行' }).click();
  await expect(timeline.getByText('任务已从停止位置继续', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '智能课件产出' })).toBeVisible();

  await composer.getByRole('textbox', { name: '向 Agent 补充要求' }).fill('把主教学范围改为高二物理 1 班的机械波基础。');
  await composer.getByRole('button', { name: '发送补充要求' }).click();
  const impact = timeline.getByRole('article').filter({ hasText: '教学范围变化需要重新规划' });
  await expect(impact.getByText('高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(impact.getByText('高二物理 1 班 · 机械波基础 · 第一单元 机械波', { exact: true })).toBeVisible();
  await impact.getByRole('button', { name: '确认并重新规划' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);
  await expect(page.getByRole('heading', { name: '生成机械波基础课件' })).toBeVisible();
  await expect(timeline.getByText('已归档调整前的计划与产物', { exact: true })).toBeVisible();
  await expect(timeline.getByText('还需要确认课件要求', { exact: true })).toBeVisible();
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

  const denied = timeline.getByRole('article').filter({ hasText: '保存动作需要处理' });
  await expect(denied.getByText('保存位置没有写入权限', { exact: true })).toBeVisible();
  await denied.getByRole('button', { name: '改用教师草稿区并重新确认' }).click();
  action = timeline.getByRole('article').filter({ hasText: '保存到 ClassIn' });
  await expect(action.getByText('高二物理 3 班 / 动量与碰撞 / 教师草稿区', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '确认执行' }).click();
  await page.getByRole('dialog', { name: '确认保存到 ClassIn' }).getByRole('button', { name: '批准保存' }).click();
  await action.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(timeline.getByRole('article').filter({ hasText: '课件草稿已保存到 ClassIn' })).toBeVisible();
});

test('teacher configures and generates a four-artifact course package inside one Run', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createPackageRun(page);
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-course-package$/);
  const timeline = page.getByRole('feed', { name: 'Agent 任务时间线' });
  const plan = timeline.getByRole('article').filter({ hasText: '课程方案包执行计划' });
  await expect(plan.getByRole('combobox', { name: '课程课时' })).toHaveValue('2');
  await expect(plan.getByRole('spinbutton', { name: '作业题量' })).toHaveValue('12');
  await expect(plan.getByRole('combobox', { name: '测验时长' })).toHaveValue('15');
  await expect(plan.getByRole('combobox', { name: '录播时长' })).toHaveValue('8');
  const scope = plan.getByRole('group', { name: '课程方案包产物范围' });
  await expect(scope.getByRole('checkbox')).toHaveCount(4);
  await scope.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).uncheck();
  await expect(scope.getByRole('checkbox', { name: /碰撞实验录播脚本/ })).not.toBeChecked();
  await scope.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).check();
  await scope.getByRole('checkbox', { name: /碰撞实验录播脚本/ }).check();
  await expect(scope.getByRole('checkbox', { name: /碰撞实验录播脚本/ })).toBeChecked();

  await plan.getByRole('button', { name: '确认范围并开始生成' }).click();
  const progress = timeline.getByRole('article').filter({ hasText: '课程方案包生成进度' });
  await expect(progress.getByText('动量守恒模型课件', { exact: true })).toBeVisible();
  await expect(progress.getByText('生成中', { exact: true }).first()).toBeVisible();
  const output = page.getByRole('region', { name: '课程方案包产出' });
  await expect(output).toBeVisible();
  await expect(output.getByText('4 项产出', { exact: true })).toBeVisible();
  await expect(output.getByRole('button', { name: /动量守恒模型课件/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /动量守恒分层作业/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /动量与碰撞随堂测验/ })).toBeVisible();
  await expect(output.getByRole('button', { name: /碰撞实验录播脚本/ })).toBeVisible();
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
  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(action.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await action.getByRole('button', { name: '执行已批准方案包' }).click();

  const receipt = timeline.getByRole('article').filter({ hasText: '课程方案包执行完成' });
  await expect(receipt).toBeVisible();
  await expect(receipt.getByText('已执行', { exact: true })).toHaveCount(4);
  await expect(receipt).not.toContainText('[模拟]');
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
