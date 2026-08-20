import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function openPreparedWorkBuddy(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const panel = page.getByRole('complementary', { name: '核心上下文' });
  await panel.getByRole('button', { name: '应用动量课程建议' }).click();
  await panel.getByRole('button', { name: '确认 ContextSnapshot' }).click();
  await panel.getByRole('button', { name: '关闭核心上下文' }).click();
}

async function createCoursewareArtifact(page: import('@playwright/test').Page) {
  await openPreparedWorkBuddy(page);
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await page.getByRole('button', { name: '确认任务信息' }).click();
  await page.getByRole('button', { name: '确认计划并执行' }).click();
}

test('teacher reviews Core Context and freezes a resettable Snapshot @a11y', async ({ page }) => {
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
  await expect(panel.getByRole('button', { name: '确认 ContextSnapshot' })).toBeDisabled();

  await panel.getByRole('button', { name: '应用动量课程建议' }).click();
  await expect(panel.getByText('可以确认 Snapshot', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: '确认 ContextSnapshot' })).toBeEnabled();
  await panel.getByRole('button', { name: '确认 ContextSnapshot' }).click();

  await expect(panel.getByText('Snapshot 已冻结', { exact: true })).toBeVisible();
  await expect(panel.getByText('workbuddy-m4-context-v1', { exact: true })).toBeVisible();
  await expect(summary.getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(summary.getByText('动量与碰撞', { exact: true })).toBeVisible();
  await expect(summary.getByText('第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(summary.getByText('全班 30 人', { exact: true })).toBeVisible();

  await panel.getByRole('button', { name: '重置 M4 场景' }).click();
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
  await expect(page.getByText('已从 ContextSnapshot 复用：高二物理 3 班 · 动量与碰撞 · 第一单元 受力与动量')).toBeVisible();
  await page.getByRole('spinbutton', { name: '预计页数' }).fill('16');
  await page.getByRole('button', { name: '确认任务信息' }).click();

  await expect(page.getByRole('heading', { name: '执行计划' })).toBeVisible();
  await expect(page.getByText('预期产物：16 页课件初稿')).toBeVisible();
  await expect(page.getByText('等待点：教师确认计划')).toBeVisible();
  await page.getByRole('button', { name: '确认计划并执行' }).click();

  await expect(page.getByRole('heading', { name: '课件初稿已生成' })).toBeVisible();
  for (const event of ['ContextSnapshot 已载入', '任务计划已确认', '教学结构已生成', '课件草稿已组装', '质量检查通过']) {
    await expect(page.getByText(event, { exact: true })).toBeVisible();
  }

  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await expect(artifact.getByText('artifact-courseware-momentum-v1', { exact: true })).toBeVisible();
  await expect(artifact.getByText('v1', { exact: true })).toBeVisible();
  await expect(artifact.getByText('固定 Mock ArtifactDraft · 未写入 ClassIn')).toBeVisible();

  await page.getByRole('button', { name: '执行详情' }).click();
  const processDetail = page.getByRole('complementary', { name: '执行详情' });
  await expect(processDetail.getByText('最小 ContextProjection')).toBeVisible();
  await expect(processDetail.getByLabel('courseware-renderer ContextProjection').getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(processDetail.getByText('组装课件内容与页面', { exact: false })).toBeVisible();
  await expect(processDetail.getByText('李明', { exact: true })).toHaveCount(0);
  await processDetail.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByRole('button', { name: '执行详情' })).toBeFocused();
});

test('teacher approves a courseware writeback and trusts only its ExecutionReceipt', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);

  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();

  const approval = page.getByRole('complementary', { name: '保存审批' });
  await expect(approval.getByText('ProposedAction', { exact: true })).toBeVisible();
  await expect(approval.getByText('目标：高二物理 3 班 / 动量与碰撞 / 第一单元 受力与动量')).toBeVisible();
  await expect(approval.getByText('artifact-courseware-momentum-v1 · v1', { exact: true })).toBeVisible();
  await expect(approval.getByText('风险：低 · 可逆：是 · 权限：允许写入')).toBeVisible();
  await expect(approval.getByText('保存成功', { exact: true })).toHaveCount(0);

  await approval.getByRole('button', { name: '批准保存' }).click();
  await expect(approval.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await expect(approval.getByText('保存成功', { exact: true })).toHaveCount(0);
  await approval.getByRole('button', { name: '执行已批准动作' }).click();

  const receipt = page.getByRole('complementary', { name: 'ExecutionReceipt' });
  await expect(receipt.getByText('保存成功', { exact: true })).toBeVisible();
  await expect(receipt.getByText('receipt-courseware-save-1', { exact: true })).toBeVisible();
  await expect(receipt.getByText('classin-courseware-momentum-v1', { exact: true })).toBeVisible();
  await expect(receipt.getByText('v1', { exact: true })).toBeVisible();
  await expect(receipt.getByRole('link', { name: '返回 ClassIn 课程对象' })).toHaveAttribute('href', /\/teacher\/classes\/physics-3/);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher can inspect writeback failures and safely retry a recoverable action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  const artifact = page.getByRole('complementary', { name: '当前任务产物' });

  await artifact.getByRole('combobox', { name: 'Mock 写回场景' }).selectOption('permission_denied');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  let receipt = page.getByRole('complementary', { name: 'ExecutionReceipt' });
  await expect(receipt.getByRole('heading', { name: '权限拒绝' })).toBeVisible();
  await expect(receipt.getByText('未执行目标：unit-momentum-1', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '返回产物' }).click();

  await artifact.getByRole('combobox', { name: 'Mock 写回场景' }).selectOption('version_conflict');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  receipt = page.getByRole('complementary', { name: 'ExecutionReceipt' });
  await expect(receipt.getByRole('heading', { name: '版本冲突' })).toBeVisible();
  await expect(receipt.getByText('expected：unit-momentum-1-v1 · current：unit-momentum-1-v2', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '返回产物' }).click();

  await artifact.getByRole('combobox', { name: 'Mock 写回场景' }).selectOption('recoverable_failure');
  await artifact.getByRole('button', { name: '保存到 ClassIn' }).click();
  await page.getByRole('complementary', { name: '保存审批' }).getByRole('button', { name: '批准保存' }).click();
  await page.getByRole('button', { name: '执行已批准动作' }).click();
  receipt = page.getByRole('complementary', { name: 'ExecutionReceipt' });
  await expect(receipt.getByRole('heading', { name: '临时失败' })).toBeVisible();
  await expect(receipt.getByText('已保留 Approval 与 idempotencyKey', { exact: true })).toBeVisible();
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
  await context.getByRole('button', { name: '确认 ContextSnapshot' }).click();
  await context.getByRole('button', { name: '关闭核心上下文' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/run-m4-course-package/);

  await expect(page.getByRole('heading', { name: '确认课程方案包范围' })).toBeVisible();
  for (const item of ['动量守恒模型课件', '动量守恒分层作业', '动量与碰撞随堂测验', '碰撞实验录播脚本']) await expect(page.getByText(item, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认产物清单并生成' }).click();
  await expect(page.getByRole('heading', { name: 'Artifact Graph' })).toBeVisible();
  await expect(page.getByText('生成失败', { exact: true })).toBeVisible();

  const navigator = page.getByRole('complementary', { name: '课程方案包导航' });
  await navigator.getByRole('button', { name: '重试失败项' }).click();
  await navigator.getByRole('button', { name: '生成批量写回提案' }).click();
  const approval = page.getByRole('complementary', { name: '课程方案包审批' });
  await approval.getByRole('checkbox', { name: /动量与碰撞随堂测验/ }).uncheck();
  await approval.getByRole('button', { name: '批准写回' }).click();
  await expect(approval.getByText('已批准 · 尚未执行', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '执行已批准方案包' }).click();
  let receipt = page.getByRole('complementary', { name: '课程方案包 ExecutionReceipt' });
  await expect(receipt.getByText('部分成功', { exact: true })).toBeVisible();
  await expect(receipt.getByText('succeeded', { exact: true })).toHaveCount(2);
  await expect(receipt.getByText('not_executed', { exact: true })).toBeVisible();
  await expect(receipt.getByText('failed', { exact: true })).toBeVisible();

  await receipt.getByRole('button', { name: '重试失败项' }).click();
  await page.getByRole('complementary', { name: '课程方案包导航' }).getByRole('button', { name: '生成批量写回提案' }).click();
  await page.getByRole('complementary', { name: '课程方案包审批' }).getByRole('button', { name: '批准写回' }).click();
  await page.getByRole('complementary', { name: '课程方案包审批' }).getByRole('button', { name: '执行已批准方案包' }).click();
  receipt = page.getByRole('complementary', { name: '课程方案包 ExecutionReceipt' });
  await expect(receipt.getByText('package-recording', { exact: true })).toBeVisible();
  await expect(receipt.getByText('waiting', { exact: true })).toHaveCount(2);
  await expect(receipt.getByText('succeeded', { exact: true })).toHaveCount(1);

  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('list', { name: '近期任务列表' }).getByRole('link', { name: /动量单元课程方案包/ }).click();
  receipt = page.getByRole('complementary', { name: '课程方案包 ExecutionReceipt' });
  await expect(receipt.getByText('package-recording', { exact: true })).toBeVisible();
  await receipt.getByRole('button', { name: '返回导航' }).click();
  await page.getByRole('complementary', { name: '课程方案包导航' }).getByRole('button', { name: '关闭' }).click();
  await expect(page.getByRole('button', { name: '方案包导航' })).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher derives an independent package Run from the reviewed courseware', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  await page.getByRole('complementary', { name: '当前任务产物' }).getByRole('button', { name: '基于此课件生成课程方案包' }).click();
  await expect(page).toHaveURL(/run-m4-course-package/);
  await expect(page.getByText('parentRunRef · run-m4-courseware', { exact: true })).toBeVisible();
  await expect(page.getByText('sourceArtifactRef · artifact-courseware-momentum-v1 · v1', { exact: true })).toBeVisible();
  await expect(page.getByText('独立 Task Type · course-package · 等待独立 ContextSnapshot', { exact: true })).toBeVisible();
  await expect(page.getByText('学习者范围、课堂时间和教学证据未继承', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '检查并确认 Core Context' }).click();
  const derivedContext = page.getByRole('complementary', { name: '核心上下文' });
  await derivedContext.getByRole('button', { name: '确认 ContextSnapshot' }).click();
  await derivedContext.getByRole('button', { name: '关闭核心上下文' }).click();
  await expect(page.getByText('独立 Task Type · course-package · context-snapshot-package-1', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认产物清单并生成' })).toBeFocused();
  await page.getByRole('button', { name: '确认产物清单并生成' }).click();
  await page.getByRole('link', { name: '返回源课件 Run' }).click();
  await expect(page).toHaveURL(/run-m4-courseware/);
  await expect(page.getByRole('heading', { name: '课件初稿已生成' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当前任务产物' }).getByText('artifact-courseware-momentum-v1', { exact: true })).toBeVisible();
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
  await expect(impact.getByText('当前 ArtifactDraft、ProposedAction 与 ExecutionReceipt', { exact: true })).toBeVisible();
  await impact.getByRole('button', { name: '确认并重新规划' }).click();

  await expect(page.getByRole('heading', { name: '补齐任务信息' })).toBeVisible();
  await expect(page.getByText('Superseded 证据已保留', { exact: true })).toBeVisible();
  await expect(page.getByText(/context-snapshot-courseware-1 · artifact-courseware-momentum-v1 · action-courseware-save-1 · receipt-courseware-save-1/)).toBeVisible();
  await page.getByRole('button', { name: '核心上下文' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await expect(context.getByText('高二物理 1 班', { exact: true })).toBeVisible();
  await expect(context.getByText('机械波基础', { exact: true })).toBeVisible();
  await expect(context.getByText('第一单元 机械波', { exact: true })).toBeVisible();
});

test('reviewer resets every M4 in-memory object to the fixed fixture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await createCoursewareArtifact(page);
  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: /核心上下文/ }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '重置 M4 场景' }).click();
  await expect(context.getByText('需要补充教学范围', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '核心上下文摘要' }).getByText('需要选择教学范围', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '生成动量守恒模型课件', exact: true })).toHaveCount(0);
});
