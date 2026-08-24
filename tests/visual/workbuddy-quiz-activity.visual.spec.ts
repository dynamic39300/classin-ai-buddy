import { expect, test } from '@playwright/test';

test('workbuddy quiz activity draft approval at 1440x900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const now = new Date('2026-08-24T17:40:00+08:00');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1_000));
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'Work Buddy' }).click();
  await page.getByRole('button', { name: '生成测验并创建活动草稿' }).click();
  await page.getByRole('button', { name: '展开核心上下文' }).click();
  const context = page.getByRole('complementary', { name: '核心上下文' });
  await context.getByRole('button', { name: '应用动量守恒测验建议' }).click();
  await context.getByRole('button', { name: '确认上下文版本' }).click();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveScreenshot('workbuddy-quiz-activity-brief-1440x900.png', { animations: 'disabled' });
  await page.getByRole('article', { name: '确认试卷结构' }).getByRole('button', { name: '确认以上要求并生成' }).click();
  await page.clock.runFor(420);
  await expect(page.getByRole('status', { name: '测验生成进度' })).toContainText('第 1/4 步 · 分析测评目标');
  await expect(page).toHaveScreenshot('workbuddy-quiz-activity-generating-1440x900.png', { animations: 'disabled' });
  await page.clock.runFor(2_440);
  await expect(page.getByRole('article', { name: '审阅并确认测验试卷' })).toBeVisible();
  await expect(page.getByRole('article', { name: '测验活动参数' })).toHaveCount(0);
  await expect(page).toHaveScreenshot('workbuddy-quiz-activity-paper-review-1440x900.png', { animations: 'disabled' });
  await page.getByRole('complementary', { name: '任务辅助区' }).getByRole('button', { name: '确认试卷内容，继续设置活动' }).click();
  const settings = page.getByRole('article', { name: '测验活动参数' });
  await expect(settings).toBeVisible();
  await page.getByRole('button', { name: '查看生成的测验试卷' }).click();
  await settings.getByRole('button', { name: '准备创建草稿' }).click();
  const approval = page.getByRole('article', { name: '创建测验活动草稿确认' });
  await expect(approval).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-quiz-activity-draft-approval-1440x900.png', { animations: 'disabled' });

  await approval.getByRole('button', { name: '确认创建草稿' }).click();
  await expect(page.getByRole('feed', { name: '测验活动任务时间线' }).getByRole('status')).toContainText('正在创建测验活动草稿');
  await page.clock.runFor(720);
  const receipt = page.getByRole('article', { name: '测验活动草稿执行回执' });
  await expect(receipt).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-quiz-activity-draft-receipt-1440x900.png', { animations: 'disabled' });

  await receipt.getByRole('link', { name: '前往班级课程详情审阅' }).click();
  await expect(page.locator('[data-activity-id^="activity-momentum-unit-quiz"]')).toContainText('仅老师可见');
  await expect(page).toHaveScreenshot('class-detail-workbuddy-quiz-draft-1440x900.png', { animations: 'disabled' });
});
