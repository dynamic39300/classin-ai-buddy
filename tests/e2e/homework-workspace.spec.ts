import { expect, test, type Page } from '@playwright/test';

function expectAchromaticRgb(color: string) {
  const channels = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  expect(channels).not.toBeNull();
  if (!channels) return;
  expect(channels[1]).toBe(channels[2]);
  expect(channels[2]).toBe(channels[3]);
}

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

test('student submits directly and keeps a persistent submitted state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.goto('/student/homework/homework-momentum-a?source=student_home');
  await page.getByRole('button', { name: '开始作答' }).click();
  const answer = page.getByRole('textbox', { name: '我的答案' });
  const colors = await answer.evaluate((element) => ({
    canvas: getComputedStyle(document.body).backgroundColor,
    input: getComputedStyle(element).backgroundColor,
  }));
  expectAchromaticRgb(colors.canvas);
  expectAchromaticRgb(colors.input);

  await page.getByRole('button', { name: '图片' }).click();
  const dialog = page.getByRole('dialog', { name: '能力边界说明' });
  const dialogColors = await dialog.evaluate((element) => {
    const surface = element.firstElementChild;
    return {
      overlay: getComputedStyle(element).backgroundColor,
      surface: surface ? getComputedStyle(surface).backgroundColor : '',
    };
  });
  expectAchromaticRgb(dialogColors.overlay);
  expectAchromaticRgb(dialogColors.surface);
  await page.getByRole('button', { name: '关闭' }).click();

  await answer.fill('系统总动量在碰撞前后保持不变。');
  await page.getByRole('button', { name: '提交作业' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/student\/homework\/homework-momentum-a\?source=student_home&submitted=1$/);
  await expect(page.getByRole('status')).toHaveText('作业已提交。');
  await expect(page.getByRole('heading', { name: '已提交' })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看我的提交' })).toBeVisible();
});

test('teacher reviews one pending submission and sees a readonly result', async ({ page }) => {
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/homework/homework-momentum-a/submissions/submission-momentum-002?source=task_center');
  await page.getByRole('spinbutton', { name: /分数/ }).fill('88');
  await page.getByRole('textbox', { name: '文字评语' }).fill('过程完整。');
  await page.getByRole('button', { name: '完成批阅' }).click();

  await expect(page).toHaveURL(/\/teacher\/homework\/homework-momentum-a/);
  await page.getByRole('tab', { name: /已批 2/ }).click();
  await expect(page.getByRole('button', { name: '王小明，已批' })).toBeVisible();
});

test('teacher editor reports local placeholder boundaries without creating service state', async ({ page }) => {
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/homework/new');
  await page.getByRole('button', { name: '添加附件' }).click();
  await expect(page.getByRole('dialog', { name: '能力边界说明' })).toContainText('本地 Demo 占位');
  await page.getByRole('button', { name: '关闭' }).click();
  await page.getByRole('button', { name: 'AI 辅助' }).click();
  await expect(page.getByRole('dialog', { name: '能力边界说明' })).toContainText('不连接真实服务');
});
