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
  await expect(processDetail.getByText('高二物理 3 班', { exact: true })).toBeVisible();
  await expect(processDetail.getByText('李明', { exact: true })).toHaveCount(0);
});
