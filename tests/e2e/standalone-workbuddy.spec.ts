import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test('legacy standalone URL redirects to the branded TeachBuddy URL', async ({ page }) => {
  await page.goto('/workbuddy#classin');
  await expect(page).toHaveURL(/\/teachbuddy#classin$/);
  await expect(page.getByRole('heading', { level: 1, name: /把教学想法.*可以直接审阅的成果/ })).toBeVisible();
});

async function registerStandaloneTeacher(page: Page) {
  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('林老师');
  await page.getByLabel('邮箱').fill('lin.standalone@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/teachbuddy');
  await page.evaluate(() => localStorage.clear());
});

test('standalone teacher registers, creates a charged task and restores the isolated workspace @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/teachbuddy');
  await expect(page.getByRole('heading', { level: 1, name: '把教学想法，变成 可以直接审阅的成果' })).toBeVisible();
  await page.getByRole('link', { name: '免费开始', exact: true }).first().click();
  await page.getByLabel('教师称呼').fill('林老师');
  await page.getByLabel('邮箱').fill('lin.standalone@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();

  await expect(page.getByTestId('standalone-workbuddy-shell')).toBeVisible();
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  await expect(page.getByText('未连接 ClassIn', { exact: true })).toBeVisible();
  await expect(page.getByText(/模拟|仿真/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: '内容资源' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);

  await page.getByRole('link', { name: '了解连接价值' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '现在可以开始，连接 ClassIn 后更省一步' })).toBeVisible();
  await expect(page.getByText('当前：独立使用')).toBeVisible();
  await expect(page.getByText('[未来] 连接 ClassIn')).toBeVisible();
  await expect(page.getByRole('link', { name: /了解 ClassIn/ })).toHaveAttribute('href', 'https://www.classin.com/');
  await page.getByRole('link', { name: '先创建一个任务' }).click();

  await page.getByRole('button', { name: /核心上下文 · 2/ }).click();
  await expect(page.getByRole('button', { name: '选择资源' })).toHaveCount(0);
  await page.getByRole('button', { name: /应用本次示例教学范围/ }).click();
  await page.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '生成单个课件' }).click();
  await expect(page.getByRole('button', { name: '创建任务' })).toBeEnabled();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/runs\/run-m4-courseware$/);
  await expect(page.getByRole('link', { name: /AI 点数 300/ })).toBeVisible();
  await expect(page.getByText('未连接 ClassIn 时，不读取班级、作业或学生事实')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '生成函数单调性智能课件' })).toBeVisible();
  await expect(page.getByRole('link', { name: /AI 点数 300/ })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('standalone membership grants points once and keeps a persistent ledger @a11y', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '会员方案' }).click();
  await page.getByRole('button', { name: '选择方案' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('会员订单');
  await expect(dialog).not.toContainText(/模拟|仿真/);
  await dialog.getByRole('button', { name: '确认开通' }).click();
  await expect(page.getByRole('status')).toContainText('已到账 1500 AI 点数');
  await expect(page.getByRole('link', { name: /AI 点数 1860/ })).toBeVisible();

  await page.getByRole('link', { name: /AI 点数 1860/ }).click();
  await expect(page.getByRole('region', { name: '点数流水' })).toContainText('会员点数到账');
  await expect(page.getByRole('region', { name: '点数流水' })).toContainText('新用户体验点数');
  await page.reload();
  await expect(page.getByText('1860', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('会员点数到账')).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('standalone content resources stay inside the consumer product boundary', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '内容资源' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/content$/);
  await expect(page.getByRole('heading', { level: 1, name: '内容资源' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);
  await expect(page.getByText('独立个人内容库', { exact: true })).toBeVisible();
  await expect(page.getByText(/模拟|仿真/)).toHaveCount(0);
  await expect(page.getByText('机构内容库')).toHaveCount(0);
  await expect(page.locator('a[href^="/teacher"]')).toHaveCount(0);

  await page.getByRole('button', { name: '查看函数单调性精品教案' }).click();
  await page.getByRole('button', { name: '改编到新任务' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);

  await page.goto('/teachbuddy/app/content');
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('个人机械波演示课件');
  await page.getByLabel('作品简介').fill('用于个人复习课的机械波演示。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('status')).toContainText('作品已保存到个人内容库');
  await expect(page.getByRole('button', { name: '查看个人机械波演示课件' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '查看个人机械波演示课件' })).toBeVisible();
});

test('standalone quiz ends in the personal content library without a ClassIn writeback flow', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('button', { name: '生成测验试卷' }).click();
  await page.getByRole('button', { name: /核心上下文 · 2/ }).click();
  await page.getByRole('button', { name: /应用本次示例教学范围/ }).click();
  await page.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/runs\/run-quiz-activity-1$/);
  await expect(page.getByText('当前不会读取或写入 ClassIn 教学活动')).toBeVisible();

  await page.getByRole('article', { name: '确认试卷结构' }).getByRole('button', { name: '确认以上要求并生成' }).click();
  await expect(page.getByRole('article', { name: '审阅并确认测验试卷' })).toBeVisible();
  const auxiliary = page.getByRole('complementary', { name: '任务辅助区' });
  await auxiliary.getByRole('button', { name: '确认试卷内容，准备保存' }).click();

  await expect(page.getByRole('article', { name: '测验活动参数' })).toHaveCount(0);
  await expect(page.locator('a[href^="/teacher"]')).toHaveCount(0);
  const save = page.getByRole('article', { name: '保存测验试卷到个人内容库' });
  await expect(save).toContainText('连接 ClassIn 后');
  await save.getByRole('button', { name: '确认保存试卷' }).click();
  await expect(page.getByRole('article', { name: '个人测验内容保存回执' })).toContainText('测验试卷已保存到个人内容库');

  await page.reload();
  await expect(page.getByRole('article', { name: '个人测验内容保存回执' })).toBeVisible();
  await page.getByRole('link', { name: '查看内容资源' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/content$/);
  await expect(page.getByRole('button', { name: /查看.*诊断测验/ })).toBeVisible();
});

test('standalone accounts keep capability data and workspace sessions isolated', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByLabel('描述教学任务').fill('第一位老师的私有任务草稿');
  await page.getByRole('link', { name: '技能市场' }).click();
  await expect(page.locator('main[data-surface="skills"]')).not.toContainText(/ClassIn|机构推荐|班级|教研组/);
  await page.getByRole('link', { name: '内容资源' }).click();
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('第一位老师的私有课件');
  await page.getByLabel('作品简介').fill('只属于第一位老师的个人内容。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('button', { name: '查看第一位老师的私有课件' })).toBeVisible();
  await page.getByRole('button', { name: '退出登录' }).click();

  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('周老师');
  await page.getByLabel('邮箱').fill('zhou.standalone@example.com');
  await page.getByLabel('密码').fill('teaching99');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  await expect(page.getByLabel('描述教学任务')).toHaveValue('');
  await expect(page.getByText('第一位老师的私有任务草稿')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  await page.getByRole('link', { name: '内容资源' }).click();
  await expect(page.getByRole('button', { name: '查看第一位老师的私有课件' })).toHaveCount(0);
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('第二位老师的私有课件');
  await page.getByLabel('作品简介').fill('验证第二个账号可以独立发布。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('button', { name: '查看第二位老师的私有课件' })).toBeVisible();
});

test('standalone personal files expose only local product actions', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '我的文件' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/files$/);
  await expect(page.locator('a[href^="/teacher"]')).toHaveCount(0);
  await expect(page.getByText(/TeacherIn|组织云盘|教研组/)).toHaveCount(0);

  await page.getByRole('button', { name: '查看函数单调性智能课件.pptx' }).click();
  await expect(page.getByRole('heading', { level: 3, name: '个人文件库' })).toBeVisible();
  await expect(page.getByRole('button', { name: '复制分享链接' })).toBeVisible();
  await expect(page.getByRole('button', { name: '在空间中定位' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /TeacherIn/ })).toHaveCount(0);
  await page.getByRole('button', { name: '作为上下文', exact: true }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
});

test('standalone task admission blocks at zero points and resumes after a membership grant', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await page.getByRole('button', { name: /核心上下文 · 2/ }).click();
  await page.getByRole('button', { name: /应用本次示例教学范围/ }).click();
  await page.getByRole('button', { name: '确认上下文版本' }).click();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await page.goto('/teachbuddy/app/new');
    await page.getByLabel('描述教学任务').fill(`生成第 ${attempt + 1} 份课程方案包`);
    await page.getByRole('button', { name: '创建任务' }).click();
    await expect(page).toHaveURL(/\/teachbuddy\/app\/runs\/run-m4-course-package$/);
  }
  await expect(page.getByRole('link', { name: /AI 点数 0/ })).toBeVisible();

  await page.goto('/teachbuddy/app/new');
  await page.getByLabel('描述教学任务').fill('生成余额不足时的课程方案包');
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  await expect(page.getByText('AI 点数不足，请先前往“AI 点数”或“会员方案”补充点数。')).toBeVisible();

  await page.getByRole('link', { name: '会员方案' }).click();
  await page.getByRole('button', { name: '选择方案' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '确认开通' }).click();
  await expect(page.getByRole('link', { name: /AI 点数 1500/ })).toBeVisible();

  await page.goto('/teachbuddy/app/new');
  await page.getByLabel('描述教学任务').fill('充值后继续生成课程方案包');
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page.getByRole('link', { name: /AI 点数 1380/ })).toBeVisible();
});

test('signed-out teachers cannot enter standalone app routes', async ({ page }) => {
  await page.goto('/teachbuddy/app/credits');
  await expect(page).toHaveURL(/\/teachbuddy\/login\?next=%2Fteachbuddy%2Fapp%2Fcredits$/);
  await expect(page.getByRole('heading', { level: 1, name: '欢迎回到 TeachBuddy' })).toBeVisible();
});
