import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function selectRole(page: Page, label: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: label }).click();
}

async function openTeacherClassCollection(page: Page) {
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
}

async function openTeacherOpenCourseCollection(page: Page) {
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '公开课' }).click();
}

async function expectNoSeriousA11yViolations(page: Page) {
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
}

function expectAchromaticRgb(color: string) {
  const channels = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  expect(channels).not.toBeNull();
  if (!channels) return;
  expect(channels[1]).toBe(channels[2]);
  expect(channels[2]).toBe(channels[3]);
}

test('teacher manages a class context from the class-management navigation @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);

  await expect(page.getByRole('heading', { level: 1, name: '我的班级' })).toBeVisible();
  await page.getByRole('button', { name: '新建班级' }).click();
  await page.getByRole('textbox', { name: '班级名称' }).fill('高三物理冲刺班');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/class-local-5$/);
  await expect(page.getByLabel('面包屑')).toContainText('高三物理冲刺班');
  await expect(page.getByText('先创建第一门课程')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建课程' })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看建课引导' })).toHaveCount(0);
  await page.getByLabel('面包屑').getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await expect(page.getByLabel('面包屑')).toContainText('高二物理 3 班');
  await expect(page.getByRole('button', { name: '编辑班级' })).toBeVisible();
  await expect(page.getByText('未结课', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '收起右侧栏' }).click();
  const lessonActions = page.getByRole('group', { name: '动量守恒模型快捷操作' });
  const enterClassroom = lessonActions.getByRole('button', { name: '去上课' });
  await expect(enterClassroom).toHaveText('去上课');
  await enterClassroom.click();
  const lessonDialog = page.getByRole('dialog', { name: '动量守恒模型' });
  await expect(lessonDialog).toContainText('去上课');
  await expect(lessonDialog).toContainText('Demo Placeholder');
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3$/);
  await lessonDialog.getByRole('button', { name: '完成查看' }).click();
  await page.getByRole('button', { name: '公告' }).click();
  await page.getByRole('textbox', { name: '公告标题' }).fill('周末实验材料提醒');
  await page.getByRole('button', { name: '发布公告' }).click();
  await expect(page.getByText('周末实验材料提醒')).toBeVisible();
  await page.getByRole('button', { name: '关闭公告' }).click();
  await expect(page.getByRole('status')).toContainText('公告已在本地 Demo 中发布');

  await expectNoSeriousA11yViolations(page);
});

test('class detail keeps its full-screen TeacherIn page while adopting the homepage navigation contents @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);

  await page.goto('/teacher/ai-agent/new');
  await page.getByRole('textbox', { name: '描述教学任务' }).fill('终局入口中的未提交任务草稿');

  await page.goto('/teacher/classes/physics-3?course=course-momentum');
  await expect(page.getByRole('button', { name: 'AI 应用' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('老师已授权 · 班级成员可用')).toBeVisible();
  await expect(page.getByText('我的教学伴侣', { exact: true })).toBeVisible();
  await expect(page.getByText('我是您的教学搭档，有什么要帮忙？', { exact: true })).toBeVisible();
  const teachBuddyEntry = page.getByRole('button', { name: '打开 TeacherIn' });
  const entryAvatar = await teachBuddyEntry.locator('[data-teachbuddy-avatar="true"]').boundingBox();
  expect(entryAvatar?.width ?? 0).toBeGreaterThanOrEqual(40);
  await expect.poll(() => teachBuddyEntry.evaluate((element) => getComputedStyle(element).cursor)).toBe('pointer');
  await expect.poll(() => teachBuddyEntry.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe('none');
  await teachBuddyEntry.focus();
  await expect(teachBuddyEntry).toBeFocused();
  await expect.poll(() => teachBuddyEntry.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await teachBuddyEntry.click();

  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/new\?course=course-momentum$/);
  await expect(page.getByTestId('class-mvp-workbuddy-shell')).toBeVisible();
  await expect(page.getByTestId('ai-agent-workspace-layout')).toHaveAttribute('data-experience-profile', 'classin-mvp');
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);
  const workBuddyNavigation = page.getByRole('navigation', { name: 'TeacherIn 导航' });
  await expect(workBuddyNavigation.getByRole('link', { name: '我的任务', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('');
  for (const label of ['技能市场', 'AgentIn', '我的文件']) {
    await expect(workBuddyNavigation.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(workBuddyNavigation.getByRole('link')).toHaveText(['我的任务', '技能市场', 'AgentIn', '我的文件']);
  for (const label of ['工具连接', '定时任务', '设置']) {
    await expect(workBuddyNavigation.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
  await expect(page.getByText('资源与能力', { exact: true })).toHaveCount(0);
  await expect(page.getByText('自动化与设置', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '常用 Agent 和 Skill' })).toBeVisible();
  await expect(page.getByRole('region', { name: '入口上下文' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回高二物理 3 班' })).toBeVisible();
  await expect(page.getByRole('button', { name: '展开核心上下文' })).toHaveCount(0);
  await expect(page.getByText('告诉我您想完成的教学工作，我会结合已授权的教学上下文，生成可检查、可修改的结果。')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skill 生成单个课件' })).toBeVisible();
  await page.goto('/teacher/classes/physics-3/workbuddy/settings?course=course-momentum');
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/new\?course=course-momentum$/);
  await expect(workBuddyNavigation.getByRole('link', { name: '我的任务', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('');
  await expect(workBuddyNavigation.getByRole('link', { name: '我的文件' })).toBeVisible();
  await workBuddyNavigation.getByRole('link', { name: '我的文件' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/files\?course=course-momentum$/);
  await expect(workBuddyNavigation.getByRole('link', { name: '我的文件' })).toHaveAttribute('aria-current', 'page');
  await workBuddyNavigation.getByRole('link', { name: 'AgentIn', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/agentin\?course=course-momentum$/);
  await expect(page.getByLabel('AgentIn 智能体市场')).toBeVisible();
  await expect(workBuddyNavigation.getByRole('link', { name: 'AgentIn', exact: true })).toHaveAttribute('aria-current', 'page');
  await workBuddyNavigation.getByRole('link', { name: '我的任务', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/workbuddy\/new\?course=course-momentum$/);
  await page.getByRole('textbox', { name: '描述教学任务' }).fill('MVP 内跨班保留的未提交任务草稿');
  await page.getByRole('link', { name: '返回高二物理 3 班' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\?course=course-momentum$/);

  await page.goto('/teacher/classes/physics-1?course=course-physics-1');
  await page.getByRole('button', { name: '打开 TeacherIn' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-1\/workbuddy\/new\?course=course-physics-1$/);
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('MVP 内跨班保留的未提交任务草稿');
  await page.getByRole('link', { name: '返回高二物理 1 班' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-1\?course=course-physics-1$/);

  await page.goto('/teacher/ai-agent/new');
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('终局入口中的未提交任务草稿');
  await expectNoSeriousA11yViolations(page);
});

test('uses the immersive single-class chat with WorkBuddy and returns to the class', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();

  await page.getByRole('button', { name: '班级群聊' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\/chat$/);
  await expect(page.getByRole('heading', { level: 1, name: '班级群聊' })).toBeVisible();
  await expect(page.getByLabel('班级群聊沉浸工作区导航').getByText('高二物理 3 班', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeHidden();
  await expect(page.getByLabel('班级消息列表')).toHaveCount(0);

  const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  const composer = conversation.locator('form');
  await expect(conversation.getByRole('button', { name: '会话管理', exact: true })).toBeVisible();
  await conversation.getByRole('textbox', { name: '输入消息' }).fill('test');
  await conversation.getByRole('button', { name: '发送', exact: true }).click();

  await expect(conversation.getByRole('status')).toContainText('消息已在本地 Demo 中发送');
  for (const label of ['发送表情', '添加附件', '发送']) {
    await expect(conversation.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  await expect(page.getByRole('complementary', { name: 'TeacherIn 私密协作窗口' })).toBeVisible();
  await expect(conversation.getByRole('button', { name: 'TeacherIn' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '关闭 TeacherIn' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '消息通信主工作台' })).toContainText('高二物理 3 班');
  const separator = page.getByRole('separator', { name: '调整 TeacherIn 宽度' });
  await expect(separator).toBeVisible();
  await separator.focus();
  await page.keyboard.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '384');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('classin.message-workspace.workbuddy-width.messages-class'))).toBe('384');
  await expectNoSeriousA11yViolations(page);

  const conversationBox = await conversation.boundingBox();
  const composerBox = await composer.boundingBox();
  expect(conversationBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  if (conversationBox && composerBox) {
    expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(conversationBox.y + conversationBox.height);
  }

  await page.getByRole('button', { name: '返回班级' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3$/);
  await expect(page.getByRole('button', { name: '班级群聊' })).toBeVisible();

  await page.getByRole('button', { name: '班级群聊' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '班级群聊' })).toBeVisible();
  await expect(page.locator('[data-shell-mode="linear-workbench"]')).toHaveAttribute('data-message-shell-mode', 'immersive');
  await expect(page.getByRole('region', { name: '高二物理 3 班会话' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status')).toHaveText('再按一次 Esc 返回班级');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3$/);
});

test('student class chat uses one immersive navigation layer without teacher WorkBuddy @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: /高二物理 3 班/ }).click();

  await page.getByRole('button', { name: '班级群聊' }).click();
  await expect(page).toHaveURL(/\/student\/classes\/physics-3\/chat$/);
  await expect(page.getByLabel('班级群聊沉浸工作区导航')).not.toContainText('高二物理 3 班');
  await expect(page.getByRole('heading', { level: 1, name: '班级群聊' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: '学生视角主导航' })).toBeHidden();
  await expect(page.getByRole('region', { name: '高二物理 3 班会话' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'TeacherIn 私密协作窗口' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '会话管理', exact: true })).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole('button', { name: '返回班级' }).click();
  await expect(page).toHaveURL(/\/student\/classes\/physics-3$/);
  await expect(page.getByRole('button', { name: '班级群聊' })).toBeVisible();
});

test('student class details stay read-only and hide draft teaching content @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: /高二物理 3 班/ }).click();

  await expect(page.getByLabel('面包屑')).toContainText('高二物理 3 班');
  await expect(page.getByRole('button', { name: '编辑班级' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '邀请成员' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: '当前课程' })).toBeVisible();
  await expect(page.getByText('第一单元 受力与动量', { exact: true })).toBeVisible();
  await expect(page.getByText('课堂 · 40 分钟 · 30 位成员', { exact: true })).toBeVisible();
  await expect(page.getByText('作业 · 今天 18:00 截止', { exact: true })).toBeVisible();
  await expect(page.getByText(/课堂 · 课堂|作业 · 作业/)).toHaveCount(0);
  await expect(page.getByText('错题订正与复习')).toHaveCount(0);
  await expect(page.getByText('机械波错题订正')).toHaveCount(0);
  await page.getByRole('button', { name: '去做作业' }).click();
  const homeworkDialog = page.getByRole('dialog', { name: '动量守恒作业 A 组' });
  await expect(homeworkDialog).toContainText('去做作业');
  await expect(homeworkDialog).toContainText('Demo Placeholder');
  await expect(page).toHaveURL(/\/student\/classes\/physics-3$/);
  await homeworkDialog.getByRole('button', { name: '完成查看' }).click();
  await expect(page.getByText('动量守恒作业 A 组', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看全部成员' }).click();
  await expect(page).toHaveURL(/\/student\/classes\/physics-3\/members$/);
  await expect(page.getByRole('heading', { level: 1, name: '班级成员' })).toBeVisible();
  await expect(page.getByRole('button', { name: '邀请成员' })).toHaveCount(0);

  await expectNoSeriousA11yViolations(page);
});

test('student public courses keep the teacher collection interaction without management commands @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '公开课' }).click();

  const table = page.getByRole('table', { name: '我的公开课' });
  await expect(table.getByText('高效阅读公开课')).toBeVisible();
  await expect(table.getByText('家长会说明会')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '加入公开课' })).toBeVisible();
  await expect(page.getByRole('button', { name: /新建公开课|编辑|邀请学生|删除公开课/ })).toHaveCount(0);

  await page.getByRole('row', { name: /查看公开课 高效阅读公开课/ }).click();
  const detail = page.getByRole('dialog', { name: '公开课详情' });
  await expect(detail).toContainText('学生权限');
  await expect(detail.getByRole('button', { name: /编辑|邀请学生|删除公开课/ })).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('teacher settings protect drafts and the class rail squeezes the course workspace @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);
  await page.getByRole('row').filter({ hasText: '高二物理 1 班' }).getByRole('button', { name: '进入班级' }).click();

  const settingsTrigger = page.getByRole('button', { name: '编辑班级' });
  await settingsTrigger.click();
  const dialog = page.getByRole('dialog', { name: '班级属性' });
  const backdrop = await dialog.locator('xpath=parent::div').boundingBox();
  expect(backdrop).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  await expect(dialog).toContainText('退出班级或课程结课后可查看内容');
  await expect(dialog).toContainText('协同教师可创建活动');
  await expect(dialog.getByRole('button', { name: '退出班级', exact: true })).toBeEnabled();
  await dialog.getByRole('textbox', { name: '班级名称' }).fill('未保存的班级名称');
  await dialog.getByRole('button', { name: '关闭班级属性' }).click();
  await expect(dialog.getByRole('alert')).toContainText('班级属性尚未保存');
  await expectNoSeriousA11yViolations(page);
  await dialog.getByRole('button', { name: '放弃修改' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(settingsTrigger).toBeFocused();

  const content = page.locator('section[aria-labelledby="course-content-title"]');
  const expandedRailContentBounds = await content.boundingBox();
  await page.getByRole('button', { name: '收起右侧栏' }).click();
  const rail = page.getByRole('complementary', { name: '班级辅助信息' });
  await expect(rail).toHaveAttribute('data-collapsed', 'true');
  await expect(page.getByRole('button', { name: '展开右侧栏' })).toBeVisible();
  await expect.poll(async () => (await content.boundingBox())?.width ?? 0).toBeGreaterThan(expandedRailContentBounds?.width ?? 0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '展开右侧栏' }).click();
  const transitionDurations = await page.evaluate(() => {
    const body = document.querySelector<HTMLElement>('[class*="detailBody"]');
    const rail = document.querySelector<HTMLElement>('[class*="contextRail"]');
    return [body, rail].map((element) => element ? getComputedStyle(element).transitionDuration : 'missing');
  });
  expect(transitionDurations.every((duration) => Number.parseFloat(duration) <= 0.001)).toBe(true);
});

test('teacher class list and detail share the same property dialog', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);

  const listTrigger = page.getByRole('button', { name: '编辑高二物理 3 班' });
  await listTrigger.click();
  const listDialog = page.getByRole('dialog', { name: '班级属性' });
  const listDialogBounds = await listDialog.boundingBox();
  const listBackdropBounds = await listDialog.locator('xpath=parent::div').boundingBox();
  await expect(listDialog.getByRole('textbox', { name: '班级名称' })).toHaveValue('高二物理 3 班');
  await expect(listDialog.getByRole('textbox', { name: '班级简介' })).toBeVisible();
  await expect(listDialog.getByRole('combobox', { name: '班主任' })).toBeEnabled();
  await expect(listDialog.getByRole('switch', { name: '允许退出班级或课程结课后查看内容' })).toBeEnabled();
  await expect(listDialog.getByRole('switch', { name: '允许协同教师创建活动' })).toBeEnabled();
  await expect(listDialog.getByRole('switch', { name: '允许学生修改班级昵称' })).toBeVisible();
  await listDialog.getByRole('button', { name: '协同教师可创建活动说明' }).hover();
  await expect(listDialog.getByRole('tooltip')).toContainText('允许协同教师新建课堂和课程活动');
  expect(listBackdropBounds).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  expect(listDialogBounds?.width ?? 0).toBeGreaterThan(880);
  expect(listDialogBounds?.height ?? 0).toBeGreaterThan(720);
  await expect(listDialog.getByRole('button', { name: '结课', exact: true })).toHaveCount(0);
  await listDialog.getByRole('button', { name: '取消' }).click();
  await expect(listTrigger).toBeFocused();

  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await page.getByRole('button', { name: '编辑班级' }).click();
  const detailDialog = page.getByRole('dialog', { name: '班级属性' });
  const detailDialogBounds = await detailDialog.boundingBox();
  expect(detailDialogBounds?.width ?? 0).toBeCloseTo(listDialogBounds?.width ?? 0, 0);
  expect(detailDialogBounds?.height ?? 0).toBeCloseTo(listDialogBounds?.height ?? 0, 0);
  await expectNoSeriousA11yViolations(page);
});

test('teacher creates a course, publishes a unit, and adds a pending activity @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await page.getByRole('button', { name: '收起右侧栏' }).click();

  await page.getByRole('button', { name: '新建内容' }).click();
  await page.getByRole('menuitem', { name: '新建课程' }).click();
  await page.getByRole('textbox', { name: '课程名称' }).fill('实验探究');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('combobox', { name: '当前课程' })).toHaveValue(/course-local-/);

  await page.getByRole('button', { name: '新建内容' }).click();
  await page.getByRole('menuitem', { name: '新建单元' }).click();
  await page.getByRole('textbox', { name: '单元名称' }).fill('实验设计');
  await page.getByRole('textbox', { name: '单元介绍' }).fill('围绕守恒定律设计验证实验。');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('status')).toContainText('单元草稿已保存');
  await page.getByRole('button', { name: '单元操作 实验设计' }).click();
  await page.getByRole('menuitem', { name: '编辑单元', exact: true }).click();
  await page.getByRole('button', { name: '发布' }).click();
  await expect(page.getByRole('status')).toContainText('单元已发布');

  await page.getByRole('button', { name: '单元操作 实验设计' }).click();
  await page.getByRole('menuitem', { name: '新建活动' }).click();
  await page.getByRole('radio', { name: '课堂' }).click();
  await page.getByRole('textbox', { name: '活动标题' }).fill('动量实验课堂');
  await page.getByLabel('开始时间（选填）').fill('2026-08-10T10:00');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('动量实验课堂')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('课堂已创建，状态为待开始');

  await page.getByRole('button', { name: '单元操作 实验设计' }).click();
  await page.getByRole('menuitem', { name: '新建活动' }).click();
  await page.getByRole('radio', { name: '作业' }).click();
  await page.getByRole('button', { name: '进入作业编辑器' }).click();
  await expect(page).toHaveURL(/\/teacher\/homework\/new\?.*source=class_unit/);
  await expect(page.getByRole('combobox', { name: /班级/ }).first()).toHaveValue('physics-3');
  await expect(page.getByRole('combobox', { name: /课程/ }).first()).toHaveValue(/course-local-/);
  await expect(page.getByRole('combobox', { name: /单元/ }).first()).toHaveValue(/unit-local-/);

  await page.getByPlaceholder('输入作业标题').fill('实验数据分析作业');
  await page.getByPlaceholder('说明作答要求和提交内容').fill('整理实验数据，并说明误差来源。');
  await page.getByLabel(/开始时间/).fill('2026-08-10T08:00');
  await page.getByLabel(/截止时间/).fill('2026-08-11T20:00');
  await page.getByRole('button', { name: '发布' }).click();

  await expect(page.getByRole('heading', { level: 1, name: '实验数据分析作业' })).toBeVisible();
  await page.getByRole('button', { name: '返回班级' }).click();
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\?view=directory&course=course-local-/);
  await expect(page.getByText('实验数据分析作业', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '收起右侧栏' }).click();
  const publishedHomeworkRow = page.getByText('实验数据分析作业', { exact: true }).locator('xpath=ancestor::div[button][1]');
  await publishedHomeworkRow.getByRole('button', { name: '查看实验数据分析作业详情' }).click();
  const activityDialog = page.getByRole('dialog', { name: '实验数据分析作业' });
  await expect(activityDialog).toContainText('所属课程');
  await activityDialog.getByRole('button', { name: '去批改' }).click();
  await expect(activityDialog).toContainText('Demo Placeholder');
  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3\?view=directory&course=course-local-/);
  await page.getByRole('button', { name: '完成查看' }).click();
  await expect(page.getByRole('combobox', { name: '当前课程' })).toHaveValue(/course-local-/);

  await expect(page.getByRole('button', { name: /从其他班级导入/ })).toHaveCount(0);
  await page.getByRole('button', { name: '展开右侧栏' }).click();
  await page.getByRole('button', { name: 'AI 助教' }).click();
  await expect(page.getByRole('dialog', { name: '能力边界说明' })).toContainText('Placeholder');
  await expectNoSeriousA11yViolations(page);
});

test('teacher class collection controls use neutral gray surfaces', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);
  const collectionColors = await page.evaluate(() => {
    const search = document.querySelector<HTMLInputElement>('input[placeholder="搜索班级"]');
    const sort = document.querySelector<HTMLSelectElement>('select[aria-label="排序"]');
    const tableHeader = document.querySelector<HTMLElement>('[class*="tableHeader"]');
    return {
      search: search?.parentElement ? getComputedStyle(search.parentElement).backgroundColor : '',
      searchInput: search ? getComputedStyle(search).backgroundColor : '',
      sort: sort?.parentElement ? getComputedStyle(sort.parentElement).backgroundColor : '',
      tableHeader: tableHeader ? getComputedStyle(tableHeader).backgroundColor : '',
    };
  });
  expectAchromaticRgb(collectionColors.search);
  expect(collectionColors.searchInput).toBe('rgba(0, 0, 0, 0)');
  expectAchromaticRgb(collectionColors.sort);
  expectAchromaticRgb(collectionColors.tableHeader);
});

test('teacher collection layouts share compact spacing and class names stay on one line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);

  const classTitle = await page.getByText('高二物理 3 班', { exact: true }).first().boundingBox();
  const classSearch = await page.getByPlaceholder('搜索班级').boundingBox();
  const classTable = await page.locator('[role="table"]').first().boundingBox();
  const classSort = page.getByRole('combobox', { name: '排序' }).locator('..');
  const classSortBounds = await classSort.boundingBox();
  const classFirstRow = page.getByRole('table', { name: '班级列表' }).getByRole('row').nth(1);
  const classFirstRowBounds = await classFirstRow.boundingBox();
  const classFirstRowBorders = await classFirstRow.evaluate((row) => {
    const styles = getComputedStyle(row);
    return { top: styles.borderTopWidth, bottom: styles.borderBottomWidth };
  });
  await classFirstRow.getByRole('button', { name: '进入班级' }).focus();
  await expect.poll(() => classFirstRow.evaluate((row) => getComputedStyle(row).backgroundColor))
    .not.toBe('rgba(0, 0, 0, 0)');

  await page.getByRole('link', { name: '公开课' }).click();
  const openCourseSearch = await page.getByPlaceholder('搜索名称、学科或老师').boundingBox();
  const openCourseTable = await page.getByRole('table', { name: '我的公开课' }).boundingBox();
  const openCourseSort = page.getByRole('combobox', { name: '公开课排序' }).locator('..');
  const openCourseSortBounds = await openCourseSort.boundingBox();
  const openCourseFirstRow = page.getByRole('table', { name: '我的公开课' }).getByRole('row').nth(1);
  const openCourseFirstRowBounds = await openCourseFirstRow.boundingBox();
  const openCourseFirstRowBorders = await openCourseFirstRow.evaluate((row) => {
    const styles = getComputedStyle(row);
    return { top: styles.borderTopWidth, bottom: styles.borderBottomWidth };
  });
  await page.getByRole('button', { name: '新建公开课' }).focus();
  await page.keyboard.press('Tab');
  await expect(openCourseFirstRow).toBeFocused();
  await expect.poll(() => openCourseFirstRow.evaluate((row) => getComputedStyle(row).backgroundColor))
    .not.toBe('rgba(0, 0, 0, 0)');

  expect(classTitle?.width ?? 0).toBeGreaterThan(80);
  expect(classTitle?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(24);
  expect(classSearch?.y ?? 0).toBeCloseTo(openCourseSearch?.y ?? 0, 0);
  expect((classTable?.y ?? 0) - (classSearch?.y ?? 0)).toBeCloseTo(
    (openCourseTable?.y ?? 0) - (openCourseSearch?.y ?? 0),
    0,
  );
  expect(classFirstRowBounds?.height ?? 0).toBeCloseTo(openCourseFirstRowBounds?.height ?? 0, 0);
  expect(classFirstRowBorders).toEqual({ top: '0px', bottom: '0px' });
  expect(openCourseFirstRowBorders).toEqual({ top: '0px', bottom: '0px' });
  expect(classSortBounds?.width ?? 0).toBeCloseTo(32, 0);
  expect(classSortBounds?.height ?? 0).toBeCloseTo(32, 0);
  expect(openCourseSortBounds?.width ?? 0).toBeCloseTo(32, 0);
  expect(openCourseSortBounds?.height ?? 0).toBeCloseTo(32, 0);
});

test('teacher unit dialog keeps controls and backdrop neutral', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherClassCollection(page);
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button', { name: '进入班级' }).click();
  await page.getByRole('button', { name: '收起右侧栏' }).click();
  await page.getByRole('button', { name: '新建内容' }).click();
  await page.getByRole('menuitem', { name: '新建单元' }).click();

  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const input = document.querySelector<HTMLInputElement>('input[aria-label="单元名称"]');
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="单元介绍"]');
    const backdrop = document.querySelector<HTMLElement>('[class*="dialogBackdrop"]');
    return {
      surfaceMuted: root.getPropertyValue('--color-surface-muted').trim(),
      overlay: root.getPropertyValue('--color-overlay').trim(),
      input: input ? getComputedStyle(input).backgroundColor : '',
      textarea: textarea ? getComputedStyle(textarea).backgroundColor : '',
      backdrop: backdrop ? getComputedStyle(backdrop).backgroundColor : '',
    };
  });

  expect(colors.surfaceMuted).toBe('rgb(244 244 244)');
  expect(colors.overlay).toBe('rgb(13 13 13 / 0.42)');
  expectAchromaticRgb(colors.input);
  expectAchromaticRgb(colors.textarea);
  expectAchromaticRgb(colors.backdrop);
});

test('teacher opens the named editor dialog by keyboard and creates an open course @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /老师视角/);
  await openTeacherOpenCourseCollection(page);
  await expectNoSeriousA11yViolations(page);

  const trigger = page.getByRole('button', { name: '新建公开课' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/teacher\/open-courses\?dialog=create$/);
  const editor = page.getByRole('dialog', { name: '新建公开课' });
  await expect(editor).toBeVisible();
  await editor.getByRole('textbox', { name: '公开课名称' }).fill('物理实验公开课');
  await editor.getByLabel('开始时间').fill('2026-08-08T14:45');
  await editor.getByRole('button', { name: '发布' }).click();
  await expect(page).toHaveURL(/\/teacher\/open-courses\?dialog=detail&course=open-local-4&source=list$/);
  const detail = page.getByRole('dialog', { name: '公开课详情' });
  await expect(detail.getByRole('heading', { name: '物理实验公开课' })).toBeVisible();
  await expect(detail.getByRole('button', { name: '邀请学生' })).toBeVisible();

  await expectNoSeriousA11yViolations(page);
});

test('student joins an open course with an In passcode in local Demo state @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await selectRole(page, /学生视角/);
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '公开课' }).click();
  await page.getByRole('button', { name: '加入公开课' }).click();
  await page.getByLabel('In 口令').fill('IN81NY53');
  await page.getByRole('button', { name: '加入公开课' }).click();
  await expect(page).toHaveURL(/\/student\/open-courses\/open-family\?source=list$/);
  await expect(page.getByRole('heading', { level: 1, name: '家长会说明会' })).toBeVisible();
  await expect(page.getByRole('button', { name: /群聊|邀请学生|编辑|删除/ })).toHaveCount(0);
  await expectNoSeriousA11yViolations(page);
});

test('schedule opens the canonical open-course detail dialog without leaving the schedule', async ({ page }) => {
  await selectRole(page, /老师视角/);
  await page.getByRole('link', { name: '课程表' }).click();
  await page.getByRole('complementary', { name: '当日安排' }).getByRole('button', { name: '查看 19:00 家长会说明会，公开课', exact: true }).click();
  await expect(page.getByRole('complementary', { name: '当日安排' })).toBeVisible();
  const detail = page.getByRole('dialog', { name: '公开课详情' });
  await expect(detail.getByRole('heading', { name: '家长会说明会' })).toBeVisible();
  await expect(page).toHaveURL(/\/teacher\/schedule/);
});
