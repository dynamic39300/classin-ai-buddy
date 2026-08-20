import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function openPreparedWorkBuddy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const panel = page.getByRole('complementary', { name: '核心上下文' });
  await panel.getByRole('button', { name: '应用动量课程建议' }).click();
  await panel.getByRole('button', { name: '确认上下文版本' }).click();
  await panel.getByRole('button', { name: '关闭核心上下文' }).click();
}

async function createCoursewareArtifact(page: import('@playwright/test').Page) {
  await openPreparedWorkBuddy(page);
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.getByRole('button', { name: '确认任务信息' }).click();
  await page.getByRole('button', { name: '确认计划并执行' }).click();
  await page.getByRole('complementary', { name: '当前任务产物' }).getByRole('button', { name: '确认课件可用于后续任务' }).click();
}

async function createPackageArtifacts(page: import('@playwright/test').Page) {
  await page.goto('/');
  const teacherView = page.getByRole('button', { name: /老师视角/ });
  if (await teacherView.count()) await teacherView.click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.getByRole('button', { name: '确认产物清单并开始生成' }).click();
  await page.getByRole('button', { name: '查看生成结果' }).click();
}

async function selectCoursewareScenario(panel: import('@playwright/test').Locator, scenario: string) {
  await panel.getByText('评审工具', { exact: true }).click();
  await panel.getByRole('combobox', { name: '模拟写回场景' }).selectOption(scenario);
}

async function selectPackageScenario(panel: import('@playwright/test').Locator, scenario: string) {
  await panel.getByText('评审工具', { exact: true }).click();
  await panel.getByRole('combobox', { name: '课程方案包模拟写回场景' }).selectOption(scenario);
}

test('teacher reviews Core Context and freezes a resettable Snapshot @a11y', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();

  const summary = page.getByRole('group', { name: '核心上下文摘要' });
  await expect(summary.getByText('ClassIn 教研中心', { exact: true })).toBeVisible();
  await expect(summary.getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(summary.getByText('高一（3）班', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /核心上下文/ }).click();
  const panel = page.getByRole('complementary', { name: '核心上下文' });
  await expect(panel).toBeVisible();
  for (const section of ['教师与组织', '教学范围', '学习者范围', '时间与日程', '资源与教师输入', '教学证据', 'Domain Knowledge']) {
    await expect(panel.getByRole('heading', { name: section })).toBeVisible();
  }
  await expect(panel.getByText('王老师', { exact: true })).toBeVisible();
  await expect(panel.getByText('学生姓名默认不进入普通课程生产任务')).toBeVisible();
  await expect(panel.getByRole('button', { name: '确认上下文版本' })).toBeDisabled();

  await panel.getByRole('button', { name: '应用动量课程建议' }).click();
  const contextItem = (label: string) => panel.getByRole('article').filter({ hasText: label });
  await contextItem('全班 30 人').getByRole('button', { name: '排除' }).click();
  await expect(contextItem('全班 30 人').getByText(/可读取 ·/)).toBeVisible();
  await contextItem('全班 30 人').getByRole('button', { name: '选择' }).click();
  await contextItem('高二物理 1 班').getByRole('button', { name: '选择' }).click();
  await expect(contextItem('高二物理 3 班').getByRole('button', { name: '选择' })).toBeVisible();
  await contextItem('高二物理 3 班').getByRole('button', { name: '选择' }).click();
  await contextItem('动量与碰撞').getByRole('button', { name: '选择' }).click();
  await contextItem('第一单元 受力与动量').getByRole('button', { name: '选择' }).click();
  await contextItem('全班 30 人').getByRole('button', { name: '选择' }).click();
  await expect(panel.getByText('可以确认上下文', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '确认上下文版本' })).toBeEnabled();
  await panel.getByRole('button', { name: '确认上下文版本' }).click();

  await expect(panel.getByText('上下文已冻结', { exact: true })).toBeVisible();
  await expect(panel.getByText('workbuddy-m4-context-v1', { exact: true })).toBeVisible();
  await expect(summary.getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(summary.getByText('动量与碰撞', { exact: true })).toBeVisible();
  await expect(summary.getByText('第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(summary.getByText('全班 30 人', { exact: true })).toBeVisible();

  await panel.getByRole('button', { name: '重置演示数据' }).click();
  await expect(summary.getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(panel.getByText('需要补充教学范围', { exact: true })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher turns a single-courseware goal into an auditable ArtifactDraft', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPreparedWorkBuddy(page);

  await page.getByRole('button', { name: '生成单个课件' }).click();
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('为高二物理 3 班设计一份动量守恒模型课件，从碰撞实验进入守恒定律');
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-m4-courseware$/);

  await expect(page.getByRole('heading', { name: '补齐任务信息' })).toBeVisible();
  await expect(page.getByText('已从核心上下文复用：高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量')).toBeVisible();
  await page.getByRole('spinbutton', { name: '预计页数' }).fill('16');
  await page.getByRole('button', { name: '确认任务信息' }).click();

  await expect(page.getByRole('heading', { name: '执行计划' })).toBeVisible();
  await expect(page.getByText('预期产物：16 页课件初稿')).toBeVisible();
  await expect(page.getByText('等待点：教师确认计划')).toBeVisible();
  await expect(page.getByText('能力摘要：提炼教学目标、课时与边界')).toBeVisible();
  await page.getByRole('button', { name: '确认计划并执行' }).click();

  await expect(page.getByRole('heading', { name: '课件初稿已生成' })).toBeVisible();
  const process = page.getByLabel('课件初稿已生成');
  for (const event of ['核心上下文已载入', '任务计划已确认', '教学结构已生成', '课件草稿已组装', '质量检查通过']) {
    await expect(process.getByText(event, { exact: true })).toBeVisible();
  }

  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await artifact.getByText('技术证据', { exact: true }).click();
  await expect(artifact.getByText('artifact-courseware-momentum-v1', { exact: true })).toBeVisible();
  await expect(artifact.getByText('v1', { exact: true })).toBeVisible();
  await expect(artifact.getByText('[模拟]课件草稿 · 未写入 ClassIn')).toBeVisible();
  await expect(artifact.getByRole('button', { name: '确认课件可用于后续任务' })).toBeVisible();
  await expect(artifact.getByRole('button', { name: '基于此课件生成课程方案包' })).toHaveCount(0);
  await expect(artifact.getByRole('button', { name: '保存到 ClassIn' })).toHaveCount(0);

  await page.getByRole('button', { name: '执行详情' }).click();
  const processDetail = page.getByRole('complementary', { name: '执行详情' });
  await expect(processDetail.getByText('能力所用上下文')).toBeVisible();
  await expect(processDetail.getByLabel('组装课件内容与页面上下文').getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(processDetail.getByLabel('组装课件内容与页面上下文').getByText(/任务目标：为高二物理 3 班设计一份动量守恒模型课件/)).toBeVisible();
  await expect(processDetail.getByText('组装课件内容与页面', { exact: false })).toBeVisible();
  await expect(processDetail.getByText('李明', { exact: true })).toHaveCount(0);
  await processDetail.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByRole('button', { name: '执行详情' })).toBeFocused();
});

test('teacher approves a courseware writeback and trusts only its execution receipt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);

  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();

  const approval = page.getByRole('complementary', { name: '保存审批' });
  await expect(approval.getByText('保存提案', { exact: true })).toBeVisible();
  await expect(approval.getByText('目标：高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量')).toBeVisible();
  await expect(approval.getByText(/^v1/)).toBeVisible();
  await expect(approval.getByText('风险：低 · 可逆：是 · 权限：允许写入')).toBeVisible();
  await expect(approval.getByText('保存成功', { exact: true })).toHaveCount(0);

  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(approval.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await expect(approval.getByText('保存成功', { exact: true })).toHaveCount(0);
  await approval.getByRole('button', { name: '执行已批准动作' }).click();

  const receipt = page.getByRole('complementary', { name: '执行回执' });
  await expect(receipt.getByText('保存成功', { exact: true })).toBeVisible();
  await receipt.getByText('技术证据', { exact: true }).last().click();
  await expect(receipt.getByText(/receipt-courseware-save-1/)).toBeVisible();
  await expect(receipt.getByText('v1', { exact: true })).toBeVisible();
  await expect(receipt.getByRole('link', { name: '返回 ClassIn 课程对象' })).toHaveAttribute('href', /\/teacher\/classes\/physics-3/);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher can inspect writeback failures and safely retry a recoverable action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  const artifact = page.getByRole('complementary', { name: '当前任务产物' });

  await selectCoursewareScenario(artifact, 'permission_denied');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  let receipt = page.getByRole('complementary', { name: '执行回执' });
  await expect(receipt.getByRole('heading', { name: '权限拒绝' })).toBeVisible();
  await expect(receipt.getByText('未执行范围', { exact: true })).toBeVisible();
  await expect(receipt.getByText('高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '返回产物' }).click();

  await selectCoursewareScenario(artifact, 'version_conflict');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  receipt = page.getByRole('complementary', { name: '执行回执' });
  await expect(receipt.getByRole('heading', { name: '版本冲突' })).toBeVisible();
  await expect(receipt.getByText('提交版本：unit-momentum-1-v1 · 当前版本：unit-momentum-1-v2', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '采用当前版本并重新确认' }).click();
  const recoveredApproval = page.getByRole('complementary', { name: '保存审批' });
  await expect(recoveredApproval.getByText('unit-momentum-1-v2', { exact: false })).toBeVisible();
  await recoveredApproval.getByRole('button', { name: '批准保存' }).click();
  await recoveredApproval.getByRole('button', { name: '执行已批准动作' }).click();
  await expect(page.getByRole('complementary', { name: '执行回执' }).getByRole('heading', { name: '保存成功' })).toBeVisible();
  await receipt.getByRole('button', { name: '返回产物' }).click();

  await selectCoursewareScenario(artifact, 'recoverable_failure');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  receipt = page.getByRole('complementary', { name: '执行回执' });
  await expect(receipt.getByRole('heading', { name: '临时失败' })).toBeVisible();
  await expect(receipt.getByText('已保留审批记录，可安全重试', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '安全重试' }).click();
  await expect(receipt.getByRole('heading', { name: '保存成功' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher writes a course package with object-level partial results', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量课程建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/run-m4-course-package/);

  await expect(page.getByRole('heading', { name: '确认课程方案包范围' })).toBeVisible();
  for (const item of ['动量守恒模型课件', '动量守恒分层作业', '动量与碰撞随堂测验', '碰撞实验录播脚本']) await expect(page.getByText(item, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认产物清单并开始生成' }).click();
  await expect(page.getByRole('heading', { name: '正在生成课程方案包' })).toBeVisible();
  await page.getByRole('button', { name: '查看生成结果' }).click();
  await expect(page.getByRole('heading', { name: '课程方案包产物' })).toBeVisible();
  await expect(page.getByText('生成失败', { exact: true })).toBeVisible();

  const navigator = page.getByRole('complementary', { name: '课程方案包导航' });
  await navigator.getByRole('button', { name: '重试失败项' }).click();
  await navigator.getByRole('button', { name: '生成批量写回提案' }).click();
  const approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await approval.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).uncheck();
  await approval.getByRole('button', { name: '批准写回' }).click();
  await expect(approval.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  let receipt = page.getByRole('complementary', { name: '课程方案包执行回执' });
  await expect(receipt.getByText('部分成功', { exact: true })).toBeVisible();
  await expect(receipt.getByText('执行成功', { exact: true })).toHaveCount(2);
  await expect(receipt.getByText('未执行', { exact: true })).toBeVisible();
  await expect(receipt.getByText('执行失败', { exact: true })).toBeVisible();

  await receipt.getByRole('button', { name: '重试失败项' }).click();
  await page.getByRole('complementary', { name: '课程方案包导航' }).getByRole('button', { name: '生成失败项重试提案' }).click();
  const retryApproval = page.getByRole('complementary', { name: '课程方案包审批' });
  await retryApproval.getByText('技术证据', { exact: true }).click();
  await expect(retryApproval.getByText('action-package-save-retry-1 · workbuddy-package-save-retry-1', { exact: true })).toBeVisible();
  await retryApproval.getByRole('button', { name: '批准写回' }).click();
  await retryApproval.getByRole('button', { name: '执行已批准方案包' }).click();
  receipt = page.getByRole('complementary', { name: '课程方案包执行回执' });
  await expect(receipt.getByText('碰撞实验录播脚本', { exact: true })).toBeVisible();
  await expect(receipt.getByText('已成功，本次未重复执行', { exact: true })).toHaveCount(2);
  await expect(receipt.getByText('执行成功', { exact: true })).toHaveCount(1);

  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('list', { name: '近期任务列表' }).getByRole('link', { name: /动量单元课程方案包/ }).click();
  receipt = page.getByRole('complementary', { name: '课程方案包执行回执' });
  await expect(receipt.getByText('碰撞实验录播脚本', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '返回导航' }).click();
  await page.getByRole('complementary', { name: '课程方案包导航' }).getByRole('button', { name: '关闭' }).click();
  await expect(page.getByRole('button', { name: '方案包导航' })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher changes the package target or version and re-approves after governed failures', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await createPackageArtifacts(page);
  let navigator = page.getByRole('complementary', { name: '课程方案包导航' });
  await selectPackageScenario(navigator, 'permission_denied');
  await navigator.getByRole('button', { name: '生成批量写回提案' }).click();
  let approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await approval.getByRole('button', { name: '批准写回' }).click();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  let receipt = page.getByRole('complementary', { name: '课程方案包执行回执' });
  await receipt.getByRole('button', { name: '改用教师草稿区并重新确认' }).click();
  approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await expect(approval.getByText('目标：高二物理 3 班 / 动量与碰撞 / 教师草稿区')).toBeVisible();
  await approval.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).uncheck();
  await expect(approval.getByText('目标：高二物理 3 班 / 动量与碰撞 / 教师草稿区')).toBeVisible();
  await approval.getByRole('button', { name: '批准写回' }).click();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  await expect(page.getByRole('complementary', { name: '课程方案包执行回执' }).getByText('已执行所有获批对象')).toBeVisible();

  await createPackageArtifacts(page);
  navigator = page.getByRole('complementary', { name: '课程方案包导航' });
  await selectPackageScenario(navigator, 'version_conflict');
  await navigator.getByRole('button', { name: '生成批量写回提案' }).click();
  approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await approval.getByRole('button', { name: '批准写回' }).click();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  receipt = page.getByRole('complementary', { name: '课程方案包执行回执' });
  await expect(receipt.getByText('目标版本：unit-momentum-1-v1；当前版本：unit-momentum-1-v2')).toBeVisible();
  await receipt.getByRole('button', { name: '采用当前版本并重新确认' }).click();
  approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await expect(approval.getByText('unit-momentum-1-v2', { exact: true })).toBeVisible();
  await approval.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).uncheck();
  await expect(approval.getByText('unit-momentum-1-v2', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '批准写回' }).click();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  await expect(page.getByRole('complementary', { name: '课程方案包执行回执' }).getByText('已执行所有获批对象')).toBeVisible();
});

test('teacher derives an independent package Run from the reviewed courseware', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  await page.getByRole('complementary', { name: '当前任务产物' }).getByRole('button', { name: '基于此课件生成课程方案包' }).click();
  await expect(page).toHaveURL(/run-m4-course-package/);
  await page.getByText('技术证据', { exact: true }).click();
  await expect(page.getByText('parentRunRef · run-m4-courseware', { exact: true })).toBeVisible();
  await expect(page.getByText('sourceArtifactRef · artifact-courseware-momentum-v1 · v1', { exact: true })).toBeVisible();
  await expect(page.getByText('等待确认独立核心上下文', { exact: true })).toBeVisible();
  await expect(page.getByText('学习者范围、课堂时间和教学证据未继承', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '检查并确认核心上下文' }).click();
  const derivedContext = page.getByRole('complementary', { name: '核心上下文' });
  await derivedContext.getByRole('button', { name: '确认上下文版本' }).click();
  await derivedContext.getByRole('button', { name: '关闭核心上下文' }).click();
  await expect(page.getByText('已确认独立核心上下文', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认产物清单并开始生成' })).toBeFocused();
  await page.getByRole('button', { name: '确认产物清单并开始生成' }).click();
  await page.getByRole('link', { name: '返回源课件任务' }).click();
  await expect(page).toHaveURL(/run-m4-courseware/);
  await expect(page.getByRole('heading', { name: '课件初稿已生成' })).toBeVisible();
  const sourceArtifact = page.getByRole('complementary', { name: '当前任务产物' });
  await sourceArtifact.getByText('技术证据', { exact: true }).click();
  await expect(sourceArtifact.getByText('artifact-courseware-momentum-v1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '执行详情' }).click();
  const processDetail = page.getByRole('complementary', { name: '执行详情' });
  await processDetail.getByLabel('解释教学目标与边界上下文').getByText('技术证据', { exact: true }).click();
  await expect(processDetail.getByText(/context-snapshot-courseware-1/).first()).toBeVisible();
});

test('teacher previews Context impact and preserves superseded evidence when replanning', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  await page.getByRole('button', { name: '调整教学范围' }).click();

  const impact = page.getByRole('complementary', { name: '重新规划影响' });
  await expect(impact.getByText('高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(impact.getByText('高二物理 1 班 · 机械波基础 · 第一单元 机械波', { exact: true })).toBeVisible();
  await expect(impact.getByText('当前课件、保存提案与执行回执', { exact: true })).toBeVisible();
  await impact.getByRole('button', { name: '确认并重新规划' }).click();

  await expect(page.getByRole('heading', { name: '补齐任务信息' })).toBeVisible();
  await expect(page.getByText('为高二物理 1 班设计一份机械波基础课件，从波的传播现象进入核心概念', { exact: true })).toBeVisible();
  await expect(page.getByText('调整前的证据已保留', { exact: true })).toBeVisible();
  await expect(page.getByText(/原保存提案：高二物理 3 班 \/ 动量与碰撞 \/ 第一单元 受力与动量/)).toBeVisible();
  await expect(page.getByText(/原执行结果：课件已保存到 ClassIn 单元资料/)).toBeVisible();
  await expect(page.getByText(/原上下文：.*高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量.*全班 30 人/)).toBeVisible();
  await page.getByText('查看技术证据', { exact: true }).click();
  await expect(page.getByText(/context-snapshot-courseware-1 · artifact-courseware-momentum-v1 · action-courseware-save-1 · receipt-courseware-save-1/)).toBeVisible();
  await page.getByRole('button', { name: '核心上下文' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await expect(context.getByText('高二物理 1 班', { exact: true })).toBeVisible();
  await expect(context.getByText('机械波基础', { exact: true })).toBeVisible();
  await expect(context.getByText('第一单元 机械波', { exact: true })).toBeVisible();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '确认任务信息' }).click();
  await expect(page.getByText('机械波主题 · 目标与课时约束', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认计划并执行' }).click();
  const replannedArtifact = page.getByRole('complementary', { name: '当前任务产物' });
  await expect(replannedArtifact.getByRole('heading', { name: '机械波基础：从传播现象到核心概念' })).toBeVisible();
  await replannedArtifact.getByRole('button', { name: '确认课件可用于后续任务' }).click();
  await replannedArtifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  const replannedApproval = page.getByRole('complementary', { name: '保存审批' });
  await expect(replannedApproval.getByText('目标：高二物理 1 班 / 机械波基础 / 第一单元 机械波')).toBeVisible();
  await replannedApproval.getByRole('button', { name: '批准保存' }).click();
  await replannedApproval.getByRole('button', { name: '执行已批准动作' }).click();
  const replannedReceipt = page.getByRole('complementary', { name: '执行回执' });
  await expect(replannedReceipt.getByRole('heading', { name: '保存成功' })).toBeVisible();
  await replannedReceipt.getByText('技术证据', { exact: true }).first().click();
  await expect(replannedReceipt.getByText('classin-courseware-wave-v2', { exact: true })).toBeVisible();
  await expect(replannedReceipt.getByRole('link', { name: '返回 ClassIn 课程对象' })).toHaveAttribute('href', /\/teacher\/classes\/physics-1\?course=course-physics-1&unit=unit-wave-1/);
});

test('reviewer resets every M4 in-memory object to the fixed fixture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '重置演示数据' }).click();
  await expect(context.getByText('需要补充教学范围', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '核心上下文摘要' }).getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '生成动量守恒模型课件', exact: true })).toHaveCount(0);
});
