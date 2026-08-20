import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function expectNoSeriousA11yViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
}

test('teacher opens the blackboard placeholder @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '黑板' }).click();
  await expect(page.getByRole('heading', { name: '黑板暂未接入' })).toBeVisible();
  await expect(page.getByText('当前 Demo 不连接真实板书服务', { exact: false })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test('teacher completes and ends a casting session @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '投屏' }).click();
  await page.getByRole('button', { name: '投屏到 2大屏' }).click();
  await page.getByRole('button', { name: '成功' }).click();
  await expect(page.getByRole('button', { name: '结束投屏', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '结束投屏', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('投屏已结束');
  await expectNoSeriousA11yViolations(page);
});

test('teacher scans class evidence and opens a student insight @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '教学洞察' }).click();
  await expect(page.getByText('18/24', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '近期课堂' })).toBeVisible();

  await page.getByRole('button', { name: /初三英语 2 班/ }).click();
  await expect(page.getByRole('group', { name: '教学洞察范围筛选选项' })).toBeVisible();
  await page.getByRole('combobox', { name: '课程范围' }).selectOption('english-reading');
  await expect(page).toHaveURL(new RegExp('teacher/insights[?]class=english-2&course=english-reading$'));
  await expect(page.getByText('精读课到课稳定，下一步聚焦表达与错题复盘。')).toBeVisible();

  await page.getByRole('button', { name: '作业正确率说明' }).hover();
  await expect(page.getByRole('tooltip').filter({ hasText: '已批改客观题中' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '指标说明' })).toHaveCount(0);

  await expect(page.getByRole('columnheader', { name: '主动参与' })).toBeVisible();
  const recentLesson = page.getByRole('row', { name: /Unit3精读/ });
  await expect(recentLesson.getByText('76%')).toBeVisible();
  await expect(recentLesson.getByRole('button', { name: /查看Unit3精读.*报告/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /词汇专项/ })).toHaveCount(0);
  await page.getByRole('button', { name: '查看全部课堂' }).click();
  await expect(page).toHaveURL(new RegExp('teacher/insights/lessons[?]class=english-2&course=english-reading$'));
  await expect(page.getByRole('region', { name: '历史趋势' })).toBeVisible();
  await expect(page.getByRole('img', { name: /出勤率趋势/ })).toBeVisible();
  await page.getByRole('button', { name: '作业正确率趋势' }).click();
  await expect(page.getByRole('button', { name: '返回洞察' })).toHaveCount(0);
  await page.getByRole('navigation', { name: '面包屑' }).getByRole('link', { name: '教学洞察' }).click();
  await expect(page.getByRole('button', { name: '查看全部课堂' })).toBeFocused();

  await page.getByRole('button', { name: /需关注/ }).click();
  await expect(page.getByText(/\/20 位学生/)).toBeVisible();
  await page.getByRole('button', { name: '李华' }).click();
  await expect(page.getByRole('complementary', { name: '学生洞察详情' })).toContainText('下一步关注');
  await page.getByRole('button', { name: '关闭学生详情' }).click();
  await expect(page.getByRole('button', { name: '李华' })).toBeFocused();
  const studentSection = page.getByRole('region', { name: '学生表现' });
  await expect(studentSection.getByRole('columnheader', { name: '状态', exact: true })).toHaveAttribute('aria-sort', 'descending');
  await expect(studentSection.getByRole('columnheader', { name: '作业正确率' })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test('student filters growth and opens a published blackboard record @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: '成长' }).click();
  await expect(page.getByText('12 天')).toBeVisible();
  const accuracyHelp = page.getByRole('button', { name: '准确率说明' });
  await accuracyHelp.hover();
  const accuracyTooltip = page.getByRole('tooltip').filter({ hasText: '100 题答对 76 题' });
  await expect(accuracyTooltip).toBeVisible();
  await page.mouse.move(0, 0);
  await accuracyHelp.focus();
  await expect(accuracyTooltip).toBeVisible();
  await page.getByRole('button', { name: /成长范围.*全部班级/ }).click();
  await page.getByRole('combobox', { name: '班级范围' }).selectOption('growth-class-001');
  await expect(page.getByRole('combobox', { name: '课程范围' })).toBeEnabled();
  await page.getByRole('combobox', { name: '课程范围' }).selectOption('growth-course-001');
  await expect(page.getByRole('button', { name: /成长范围.*精读课/ })).toBeVisible();
  await expect(page.getByText('作业完成 92%')).toBeVisible();
  const boardTrigger = page.getByRole('button', { name: '已发布板书' });
  await boardTrigger.click();
  await expect(page.getByRole('dialog', { name: '已发布板书' })).toContainText('老师发布的课堂板书入口已保留');
  await expectNoSeriousA11yViolations(page);
  await page.keyboard.press('Escape');
  await expect(boardTrigger).toBeFocused();
});

test('student opens the canonical homework result from growth and returns to growth', async ({ page }) => {
  await selectRole(page, /学生视角/);
  await page.getByRole('link', { name: '成长' }).click();
  await page.getByRole('button', { name: /成长范围.*全部班级/ }).click();
  await page.getByRole('combobox', { name: '班级范围' }).selectOption('physics-3');
  await page.getByRole('button', { name: '作业结果' }).click();

  await expect(page).toHaveURL(/\/student\/homework\/homework-result\/result\?source=growth$/);
  await expect(page.getByRole('heading', { level: 1, name: '碰撞模型单元总结' })).toBeVisible();
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/student\/growth$/);
});

test('protects role switching during active casting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '投屏' }).click();
  await page.getByRole('button', { name: '投屏到 2大屏' }).click();
  await page.getByRole('group', { name: '角色切换' }).getByRole('button', { name: '切换至学生' }).click();
  await expect(page.getByRole('alert')).toContainText('投屏正在进行中');
});
