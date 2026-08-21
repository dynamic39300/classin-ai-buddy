import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openSurface(page: Page, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const teacherButton = page.getByRole('button', { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
  await page.getByRole('group', { name: 'Work Buddy 二级导航' }).getByRole('link', { name: label, exact: true }).click();
  await expect(page.getByTestId('ai-agent-workspace-layout').getByRole('heading', { level: 1, name: label })).toBeVisible();
}

test('skills market supports search, detail, install and use in task', async ({ page }) => {
  await openSurface(page, '技能市场');
  await expect(page.getByRole('tab', { name: '推荐' })).toBeVisible();
  await page.getByRole('textbox', { name: '搜索技能市场' }).fill('错因');
  await expect(page.getByRole('button', { name: '查看作业错因聚类' })).toBeVisible();
  await page.getByRole('button', { name: '查看作业错因聚类' }).click();
  await expect(page.getByRole('complementary', { name: '作业错因聚类详情' })).toContainText('读取作业提交摘要');
  await page.getByRole('button', { name: '安装 Skill' }).click();
  await expect(page.getByRole('dialog', { name: /确认安装/ })).toBeVisible();
  await page.getByRole('button', { name: '确认安装' }).click();
  await expect(page.getByRole('status')).toContainText('已安装');
  await expect(page.getByRole('button', { name: '启用 Skill' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('tool connections expose connection failure and forbid direct task execution', async ({ page }) => {
  await openSurface(page, '工具连接');
  await page.getByRole('button', { name: '查看公开资料检索' }).click();
  await page.getByRole('button', { name: '连接工具' }).click();
  await expect(page.getByRole('status')).toContainText('机构策略阻断');
  await page.getByRole('button', { name: '关闭详情' }).click();
  await page.getByRole('button', { name: '查看课程表与日程' }).click();
  const detail = page.getByRole('complementary', { name: '课程表与日程详情' });
  await expect(detail).toContainText('认证失败');
  await expect(detail.getByRole('button', { name: '测试连接' })).toBeVisible();
  await expect(detail.getByRole('button', { name: /立即运行|创建任务/ })).toHaveCount(0);
  await detail.getByRole('button', { name: '连接工具' }).click();
  await expect(detail).toContainText('已连接');
});

test('content and files preserve task entry as an explicit action', async ({ page }) => {
  await openSurface(page, '内容资源');
  await page.getByRole('combobox', { name: '筛选内容类型' }).selectOption('课件');
  await expect(page.getByRole('button', { name: '查看机械波概念演示' })).toBeVisible();
  await page.getByRole('button', { name: '查看机械波概念演示' }).click();
  await page.getByRole('button', { name: '改编到新任务' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await openSurface(page, '我的文件');
  await page.getByRole('button', { name: '查看函数单调性智能课件' }).click();
  await expect(page.getByRole('complementary', { name: '函数单调性智能课件详情' })).toContainText('可作为任务输入');
  await page.getByRole('button', { name: '作为任务 Context' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
});

test('scheduled tasks show blocked state and settings offer grouped controls', async ({ page }) => {
  await openSurface(page, '定时任务');
  await page.getByRole('button', { name: '新建定时任务' }).click();
  await page.getByRole('textbox', { name: '定时任务名称' }).fill('每周生成班级学情摘要');
  await page.getByRole('button', { name: '保存规则' }).click();
  await expect(page.getByRole('status')).toContainText('已创建');
  await page.getByRole('button', { name: '查看作业截止后生成错题摘要' }).click();
  await expect(page.getByRole('complementary', { name: '作业截止后生成错题摘要详情' })).toContainText('已阻断');
  await expect(page.getByRole('complementary', { name: '作业截止后生成错题摘要详情' })).toContainText('需恢复日程连接');
  await openSurface(page, '设置');
  await expect(page.getByRole('navigation', { name: 'Work Buddy 设置分组' })).toBeVisible();
  await page.getByRole('button', { name: '模型' }).click();
  await expect(page.getByRole('heading', { level: 2, name: '模型' })).toBeVisible();
  await page.getByRole('button', { name: '测试连接' }).click();
  await expect(page.getByRole('status')).toContainText('模型连接测试完成');
});

test('capability surfaces remain usable in compact desktop without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.goto('/');
  const teacherButton = page.getByRole('button', { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
  await page.getByRole('group', { name: 'Work Buddy 二级导航' }).getByRole('link', { name: '工具连接', exact: true }).click();
  await expect(page.getByTestId('ai-agent-workspace-layout').getByRole('heading', { level: 1, name: '工具连接' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
