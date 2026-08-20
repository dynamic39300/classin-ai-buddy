import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher sends and manages a class message @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: '消息' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '高二物理 3 班' })).toBeVisible();
  await page.getByRole('textbox', { name: '输入消息' }).fill('请按时进入课堂');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('本地 Demo 中发送');

  await page.getByRole('button', { name: '发送表情' }).click();
  await expect(page.getByRole('status')).toContainText('表情已在本地 Demo 中发送');
  await page.getByRole('button', { name: '添加附件' }).click();
  await page.getByRole('button', { name: '照片', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('未访问真实设备或文件服务');

  const sentMessage = page.getByText('请按时进入课堂', { exact: true }).last().locator('xpath=ancestor::article');
  await sentMessage.getByRole('button', { name: '撤回' }).click();
  await expect(page.getByText('消息已撤回', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: '取消置顶' }).click();
  await expect(page.getByRole('status')).toContainText('已取消置顶消息');
  await page.getByRole('button', { name: '班级会话操作' }).click();
  await page.getByRole('menuitem', { name: '全体禁言' }).click();
  await page.getByRole('button', { name: '班级会话操作' }).click();
  await expect(page.getByRole('menuitem', { name: '解除禁言' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /系统通知/ }).click();
  await page.getByRole('button', { name: '查看提交概况' }).click();
  await expect(page).toHaveURL(/\/teacher\/homework\/homework-momentum-a\?source=notification&notification=system-teacher-submissions$/);
  await page.getByRole('button', { name: '返回通知' }).click();
  await expect(page).toHaveURL(/\/teacher\/messages\?category=system&thread=system-teacher-submissions$/);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('student follows a notice and reuses the teacher direct thread @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await page.getByRole('button', { name: /系统通知/ }).click();
  await page.getByRole('button', { name: /机械波错题订正被退回/ }).click();
  await expect(page.getByRole('heading', { name: '机械波错题订正被退回' })).toBeVisible();
  await page.getByRole('button', { name: '去订正' }).click();
  await expect(page).toHaveURL(/\/student\/homework\/homework-correction\/edit\?source=notification&notification=system-student-returned&mode=correction$/);
  await expect(page.getByRole('heading', { level: 1, name: '订正作业' })).toBeVisible();
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/student\/messages\?category=system&thread=system-student-returned$/);
  await expect(page.getByRole('heading', { name: '机械波错题订正被退回' })).toBeVisible();

  await page.getByRole('button', { name: /实验报告已批改：92 分/ }).click();
  await page.getByRole('button', { name: '查看反馈' }).click();
  await expect(page).toHaveURL(/\/student\/homework\/homework-result\/result\?source=notification&notification=system-student-graded$/);
  await page.getByRole('button', { name: '返回' }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await expect(page).toHaveURL(/\/student\/messages\?category=system&thread=system-student-graded$/);

  await page.getByRole('button', { name: /私聊/ }).click();
  const contactTrigger = page.getByRole('button', { name: '发起私聊' });
  await contactTrigger.click();
  const dialog = page.getByRole('dialog', { name: '发起私聊' });
  await dialog.getByRole('textbox', { name: '搜索联系人' }).fill('王老师');
  await dialog.getByRole('button', { name: /王老师/ }).click();
  await expect(page.getByRole('heading', { name: '王老师' })).toBeVisible();
  await expect(contactTrigger).toBeFocused();

  await page.getByRole('textbox', { name: '输入消息' }).fill('我会重新订正');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByText('我会重新订正', { exact: true }).last()).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('contacts dialog closes with Escape and restores keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: /私聊/ }).click();

  const contactTrigger = page.getByRole('button', { name: '发起私聊' });
  await contactTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '发起私聊' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '发起私聊' })).toHaveCount(0);
  await expect(contactTrigger).toBeFocused();
});

test('keeps the message list command menu above the thread rows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await page.getByRole('button', { name: '班级消息列表操作' }).click();
  const menu = page.getByRole('menu', { name: '班级消息列表操作' });
  const menuItem = menu.getByRole('menuitem', { name: '全部标为已读' });
  await expect(menuItem).toBeVisible();

  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  const menuIsTopmost = await menu.evaluate((element, box) => {
    if (!box) return false;
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit?.closest('[role="menu"]') === element;
  }, menuBox);
  expect(menuIsTopmost).toBe(true);
});
