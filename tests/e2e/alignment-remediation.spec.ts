import { expect, test, type Page } from '@playwright/test';

async function selectRole(page: Page, roleName: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: roleName }).click();
}

test('teacher Home routes teaching objects by their owning workspace', async ({ page }) => {
  await selectRole(page, /老师视角/);

  const teacherOperationTrigger = page.getByRole('article', { name: '动量守恒模型' }).getByRole('button', { name: '动量守恒模型：去备课' });
  await teacherOperationTrigger.click();
  const operationDialog = page.getByRole('dialog', { name: '动量守恒模型' });
  await expect(operationDialog).toContainText('去备课');
  await expect(operationDialog).toContainText('Demo Placeholder');
  await expect(page).toHaveURL(/\/teacher\/home$/);
  await page.keyboard.press('Escape');
  await expect(operationDialog).toHaveCount(0);
  await expect(teacherOperationTrigger).toBeFocused();

  await page.locator('button[data-home-anchor="assignment-momentum"]').click();
  const homeworkDialog = page.getByRole('dialog', { name: '动量守恒作业 A 组' });
  await expect(homeworkDialog).toContainText('作业');
  await expect(page).toHaveURL(/\/teacher\/home$/);
  await homeworkDialog.getByRole('button', { name: '关闭动量守恒作业 A 组弹窗' }).click();

  await page.locator('button[data-home-anchor="open-family"]').click();
  const openCourseDialog = page.getByRole('dialog', { name: '公开课详情' });
  await expect(openCourseDialog).toContainText('家长会说明会');
  await expect(page).toHaveURL(/\/teacher\/open-courses\?dialog=detail&course=open-family&source=home$/);
  await openCourseDialog.getByRole('button', { name: '关闭公开课详情' }).click();
  await expect(page).toHaveURL(/\/teacher\/home$/);

  await page.locator('button[data-home-anchor="task-wave-correction"]').click();
  const taskDialog = page.getByRole('dialog', { name: '机械波错题订正' });
  await expect(taskDialog).toContainText('机械波');
  await taskDialog.getByRole('button', { name: '关闭机械波错题订正弹窗' }).click();
  await page.getByRole('button', { name: '查看全部任务' }).click();
  await expect(page).toHaveURL(/\/teacher\/tasks$/);
});

test('student Home routes learning items by their owning workspace', async ({ page }) => {
  await selectRole(page, /学生视角/);

  const studentOperationTrigger = page.getByRole('article', { name: '动量守恒模型' }).getByRole('button', { name: '动量守恒模型：去上课' });
  await studentOperationTrigger.click();
  const operationDialog = page.getByRole('dialog', { name: '动量守恒模型' });
  await expect(operationDialog).toContainText('去上课');
  await expect(operationDialog).toContainText('Demo Placeholder');
  await expect(page).toHaveURL(/\/student\/home$/);
  await operationDialog.getByRole('button', { name: '关闭动量守恒模型弹窗' }).click();
  await expect(studentOperationTrigger).toBeFocused();

  await page.locator('button[data-home-anchor="open-family"]').click();
  await expect(page.getByRole('dialog', { name: '公开课详情' })).toContainText('家长会说明会');
  await expect(page).toHaveURL(/\/student\/open-courses\?dialog=detail&course=open-family&source=home$/);
});

test('student Home uses the A2 workbench and class chat stays focused', async ({ page }) => {
  await selectRole(page, /学生视角/);

  await expect(page.getByRole('heading', { level: 1, name: '首页' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '学习安排' })).toBeVisible();
  await expect(page.getByRole('region', { name: '最近三天' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '待办' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '班级消息' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '学习进展' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '我的班级' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '我的公开课' })).toHaveCount(0);
  await expect(page.getByText('当前最重要')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最近反馈' })).toHaveCount(0);

  const messageSection = page.getByRole('region', { name: '班级消息' });
  await messageSection.getByRole('button', { name: /高二物理 3 班/ }).click();
  await expect(page).toHaveURL(/\/student\/classes\/physics-3\/chat\?from=home$/);
  await expect(page.getByRole('heading', { level: 1, name: '班级群聊' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '消息分类' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '高二物理 3 班' })).toBeVisible();
});

test('teaching insights does not expose an invented messaging action', async ({ page }) => {
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '教学洞察' }).click();
  await page.getByRole('button', { name: /李华/ }).click();
  await expect(page.getByRole('button', { name: '发消息' })).toHaveCount(0);
});

test('teacher Home attention summaries preserve owning workspace context', async ({ page }) => {
  await selectRole(page, /老师视角/);

  const insightSection = page.getByRole('region', { name: '教学洞察' });
  await insightSection.getByRole('button', { name: '查看高二物理 3 班作业洞察' }).click();
  await expect(page).toHaveURL(/\/teacher\/insights\?class=physics-3&section=homework&source=home$/);
  const insightBreadcrumb = page.getByRole('navigation', { name: '面包屑' });
  await expect(insightBreadcrumb).toContainText('首页');
  await expect(insightBreadcrumb).toContainText('高二物理 3 班');
  await expect(page.locator('[data-insight-anchor="homework"]')).toBeFocused();

  await page.goto('/teacher/home');
  const messageSection = page.getByRole('region', { name: '消息' });
  await messageSection.getByRole('button', { name: /高二物理 3 班/ }).click();
  await expect(page).toHaveURL(/\/teacher\/messages\?category=class&thread=class-physics-3&source=home$/);
});
