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

test('teacher reviews announcements, members, invitations, and class settings @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);

  await page.goto('/teacher/classes/physics-3/announcements/announcement-physics-1?from=home');
  await expect(page.getByRole('heading', { name: '班级公告' })).toBeVisible();
  await expect(page.getByLabel('公告确认统计')).toContainText('1 已确认');
  await page.getByRole('button', { name: '提醒未确认成员' }).click();
  await expect(page.getByRole('status')).toContainText('不发送真实消息');

  await page.goto('/teacher/classes/physics-3/members?from=home');
  await page.getByPlaceholder('搜索账号名或班级昵称').fill('小吴');
  await expect(page.getByRole('region', { name: '学习者' }).getByRole('strong')).toHaveText('小吴');
  await page.getByPlaceholder('搜索账号名或班级昵称').fill('');
  await page.getByRole('button', { name: '邀请成员' }).click();
  const invite = page.getByRole('dialog', { name: '邀请成员' });
  await invite.getByRole('tab', { name: 'In口令' }).click();
  await expect(invite.getByText(/^\d{3} \d{3}$/)).toBeVisible();
  await invite.getByRole('tab', { name: '二维码' }).click();
  await expect(invite.getByLabel('高二物理 3 班邀请二维码 Mock')).toBeVisible();
  await invite.getByRole('button', { name: '关闭邀请成员' }).click();

  await page.goto('/teacher/classes/physics-3/settings?from=home');
  await expect(page.getByText('退出班级或课程结课后可查看内容')).toBeVisible();
  await expect(page.getByText('协同教师可创建活动')).toBeVisible();
  await expect(page.getByText(/学校|学科|头像/)).toHaveCount(0);
  const nicknamePermission = page.getByRole('switch', { name: /允许学生修改班级昵称/ });
  await expect(nicknamePermission).toBeChecked();
  await nicknamePermission.click();
  await expect(nicknamePermission).not.toBeChecked();
  await expectNoSeriousA11yViolations(page);
});

test('student confirmation stays local and member management stays hidden @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);

  await page.goto('/student/classes/physics-3/announcements/announcement-physics-1?from=home');
  await page.getByRole('button', { name: '我已确认' }).click();
  await expect(page.getByRole('button', { name: '已确认' })).toBeDisabled();

  await page.goto('/student/classes/physics-3/members?from=home');
  await expect(page.getByRole('button', { name: '邀请成员' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /移除|设为教师/ })).toHaveCount(0);

  await page.goto('/student/classes/physics-3/settings?from=home');
  await expect(page.getByText('班主任权限')).toHaveCount(0);
  await expect(page.getByText('批量移除成员')).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('teacher completes the canonical open-course flow with explicit placeholders @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await selectRole(page, /老师视角/);
  await page.goto('/teacher/open-courses/new?source=home');

  await expect(page.getByRole('button', { name: /组织 · 我的账号/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '拍摄或相册' })).toBeVisible();
  await expect(page.getByRole('button', { name: '添加' })).toBeVisible();
  await page.getByRole('textbox', { name: '公开课名称' }).fill('公开课全链路验收');
  await page.getByLabel('开始时间').fill('2026-08-08T14:45');
  await page.getByLabel('课堂时长').selectOption('90');
  await page.getByRole('button', { name: '发布' }).click();

  const detail = page.getByRole('dialog', { name: '公开课详情' });
  await expect(detail).toBeVisible();
  await detail.getByRole('button', { name: '邀请学生' }).click();
  const invite = page.getByRole('dialog', { name: '邀请学生' });
  await expect(invite).toBeVisible();
  await expect(invite.getByText(/^IN[A-Z0-9]{6}$/)).toBeVisible();
  await invite.getByRole('button', { name: '微信' }).click();
  await expect(invite.getByRole('status')).toContainText('未连接真实外部服务');
  await invite.getByRole('button', { name: '关闭邀请学生' }).click();

  await page.getByRole('button', { name: '网页直播链接' }).click();
  await expect(page.getByRole('status')).toContainText('网页直播链接为 Demo Placeholder');
  await page.getByRole('button', { name: '上课', exact: true }).click();
  await expect(page.getByRole('heading', { name: /进入 公开课全链路验收/ })).toBeVisible();
  await page.getByRole('button', { name: '进入教室' }).click();
  await expect(page.getByRole('dialog', { name: 'ClassIn 教室' })).toContainText('未连接真实音视频');
  await expectNoSeriousA11yViolations(page);
});

test('composite join hands its passcode to the student open-course flow and settings follow the URL @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await selectRole(page, /学生视角/);
  await page.goto('/student/join');

  const targetNavigation = page.getByRole('navigation', { name: '加入与添加类型' });
  await expect(targetNavigation.getByRole('button')).toHaveCount(4);
  await targetNavigation.getByRole('button', { name: /加入班级/ }).click();
  await page.getByPlaceholder('输入口令').fill('123456');
  await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('未写入真实成员关系');

  await targetNavigation.getByRole('button', { name: /加入公开课/ }).click();
  await page.getByPlaceholder('输入口令').fill('IN81NY53');
  await page.getByRole('button', { name: '继续' }).click();
  await expect(page).toHaveURL(/\/student\/open-courses\/join\?passcode=IN81NY53/);
  await expect(page.getByLabel('In 口令')).toHaveValue('IN81NY53');
  await page.getByRole('button', { name: '加入公开课' }).click();
  await expect(page.getByRole('heading', { name: '家长会说明会' })).toBeVisible();
  await expect(page.getByRole('button', { name: /群聊|邀请学生|编辑|删除/ })).toHaveCount(0);

  await page.goto('/student/settings/system');
  await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '保存' })).toHaveCount(0);
  await page.getByRole('button', { name: '返回我的权益' }).click();
  await expect(page).toHaveURL(/\/student\/settings\/benefits$/);
  await expect(page.getByRole('heading', { name: '金石' })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});
