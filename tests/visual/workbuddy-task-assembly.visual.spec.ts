import { expect, test, type Page } from '@playwright/test';

async function openIdealNewTask(page: Page, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  const teacherButton = page.getByRole('button', { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('button', { name: 'TeacherIn', exact: true }).click();
  await primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' }).getByRole('link', { name: '我的任务', exact: true }).click();
  await expect(page.getByRole('heading', { name: '老师好，有什么能帮您的？' })).toBeVisible();
  await expect(page.locator('[data-workbuddy-typewriter="true"]')).toHaveAttribute('data-state', 'complete');
}

function stableLayoutScreenshotOptions(page: Page) {
  return {
    animations: 'disabled' as const,
    mask: [page.locator('video')],
    maskColor: '#eef7f3',
  };
}

async function openFileDialog(page: Page, source: '我的文件' | 'ClassIn 空间') {
  await page.getByRole('button', { name: '添加任务材料' }).click();
  await page.getByRole('menuitem', { name: /添加文件/ }).click();
  await page.getByRole('menuitem', { name: new RegExp(source) }).click();
}

test('new task assembly default fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-默认.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly keeps comfortable spacing at compact desktop width', async ({ page }) => {
  await openIdealNewTask(page, { width: 1024, height: 640 });
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-紧凑桌面.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly add menu fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  await page.getByRole('button', { name: '添加任务材料' }).click();
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-加号菜单.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly progressive Skill picker fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  await page.getByRole('button', { name: '添加任务材料' }).click();
  await page.getByRole('menuitem', { name: /Skill/ }).click();
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-Skill逐层选择.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly material lane fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  const quick = page.getByRole('region', { name: '常用 Agent 和 Skill' });
  for (const name of ['Skill 生成单个课件', 'Skill 生成课程方案包', 'Skill 生成测验', 'Skill 分析班级学情', 'Skill Word 文档', 'Agent 每日名言', 'Agent 成语溯源与应用专家', 'Agent 地理百科大全', 'Agent 孔子']) {
    await quick.getByRole('button', { name }).click();
  }
  await page.getByTestId('task-assembly-quick-strip').evaluate((element) => {
    element.scrollLeft = 0;
  });
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-材料收起.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly selected Agent stays visually quiet', async ({ page }) => {
  await openIdealNewTask(page);
  await page.getByRole('button', { name: 'Agent 成语溯源与应用专家' }).click();
  await expect(page.getByText('任务材料', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/已加入 Agent.*推荐 Prompt/)).toHaveCount(0);
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveScreenshot(
    'workbuddy-任务装配-Agent已选.png',
    stableLayoutScreenshotOptions(page),
  );
});

test('new task assembly My Files dialog fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  await openFileDialog(page, '我的文件');
  await expect(page.getByRole('dialog', { name: '从我的文件添加' })).toHaveScreenshot('workbuddy-任务装配-我的文件.png', { animations: 'disabled' });
});

test('new task assembly ClassIn Space dialog fidelity', async ({ page }) => {
  await openIdealNewTask(page);
  await openFileDialog(page, 'ClassIn 空间');
  await expect(page.getByRole('dialog', { name: '从 ClassIn 空间添加' })).toHaveScreenshot('workbuddy-任务装配-ClassIn空间.png', { animations: 'disabled' });
});
