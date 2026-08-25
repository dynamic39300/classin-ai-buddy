import { expect, test, type Page } from '@playwright/test';

async function register(page: Page) {
  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('林老师');
  await page.getByLabel('邮箱').fill('visual.standalone@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  const avatarVideo = page.locator('[data-workbuddy-avatar="true"] video');
  if (await avatarVideo.count()) {
    await avatarVideo.evaluate(async (element) => {
      const video = element as HTMLVideoElement;
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      video.pause();
      video.currentTime = 0;
    });
  }
  await expect(page.locator('[data-workbuddy-typewriter="true"]')).toHaveAttribute('data-state', 'complete');
  await page.mouse.move(0, 0);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/teachbuddy');
  await page.evaluate(() => localStorage.clear());
});

test('standalone WorkBuddy acquisition and product surfaces', async ({ page }) => {
  await page.goto('/teachbuddy');
  await expect(page).toHaveScreenshot('standalone-workbuddy-landing-1440x900.png', { animations: 'disabled' });

  await page.goto('/teachbuddy/register');
  await expect(page).toHaveScreenshot('standalone-workbuddy-register-1440x900.png', { animations: 'disabled' });

  await register(page);
  await expect(page).toHaveScreenshot('standalone-workbuddy-new-task-1440x900.png', { animations: 'disabled' });

  await page.getByRole('link', { name: '内容资源' }).click();
  await expect(page).toHaveScreenshot('standalone-workbuddy-content-1440x900.png', { animations: 'disabled' });

  await page.getByRole('link', { name: '了解连接价值' }).click();
  await expect(page).toHaveScreenshot('standalone-workbuddy-classin-value-1440x900.png', { animations: 'disabled' });

  await page.getByRole('link', { name: /AI 点数 360/ }).click();
  await expect(page).toHaveScreenshot('standalone-workbuddy-credits-1440x900.png', { animations: 'disabled' });

  await page.getByRole('link', { name: '会员方案' }).click();
  await page.getByRole('button', { name: '选择方案' }).first().click();
  await expect(page).toHaveScreenshot('standalone-workbuddy-membership-order-1440x900.png', { animations: 'disabled' });
});

test('standalone WorkBuddy keeps the compact desktop shell usable', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await register(page);
  await expect(page).toHaveScreenshot('standalone-workbuddy-new-task-1024x640.png', { animations: 'disabled' });
});
