import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectMessageShellLocked(
  page: Page,
  conversationName: string,
  { expectThreadPanel = true }: { expectThreadPanel?: boolean } = {},
) {
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  const workspace = page.locator('#main-content');
  const conversation = page.getByRole('region', { name: conversationName });
  const timeline = conversation.getByLabel('消息记录');
  const composer = conversation.locator('[data-workspace-composer="true"]');
  const threadPanel = page.getByRole('region', { name: /列表$/ });
  await timeline.evaluate((element) => { element.scrollTop = 0; });
  const before = await Promise.all([
    workspace.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight })),
    composer.boundingBox(),
    expectThreadPanel ? threadPanel.boundingBox() : Promise.resolve(null),
    timeline.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    })),
    page.evaluate(() => ({ clientHeight: document.documentElement.clientHeight, scrollHeight: document.documentElement.scrollHeight })),
  ]);

  expect(before[0].scrollHeight).toBeLessThanOrEqual(before[0].clientHeight + 1);
  expect(before[1]).not.toBeNull();
  if (expectThreadPanel) expect(before[2]).not.toBeNull();
  expect(before[3].overflowY).toBe('auto');
  expect(before[4].scrollHeight).toBeLessThanOrEqual(before[4].clientHeight + 1);

  await timeline.hover();
  await page.mouse.wheel(0, 600);
  const after = await Promise.all([
    workspace.evaluate((element) => element.scrollTop),
    page.evaluate(() => window.scrollY),
    timeline.evaluate((element) => element.scrollTop),
    composer.boundingBox(),
    expectThreadPanel ? threadPanel.boundingBox() : Promise.resolve(null),
  ]);
  expect(after[0]).toBe(0);
  expect(after[1]).toBe(0);
  if (before[3].scrollHeight > before[3].clientHeight) {
    expect(after[2]).toBeGreaterThan(before[3].scrollTop);
  }
  expect(Math.abs((after[3]?.y ?? 0) - (before[1]?.y ?? 0))).toBeLessThanOrEqual(1);
  if (expectThreadPanel) {
    expect(Math.abs((after[4]?.y ?? 0) - (before[2]?.y ?? 0))).toBeLessThanOrEqual(1);
    const threadList = threadPanel.locator('[data-thread-list]');
    await expect(threadList).toHaveCSS('overflow-y', 'auto');
  }
}

test('message scrolling stays inside the timeline while navigation and composer remain fixed', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(page.locator('[data-shell-mode="linear-workbench"]')).toHaveAttribute('data-message-shell-mode', 'standard');
  await page.waitForTimeout(800);

  const workspace = page.locator('#main-content');
  const threadPanel = page.getByRole('region', { name: '班级消息列表', exact: true });
  const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  const timeline = conversation.getByLabel('消息记录');
  const composer = conversation.locator('[data-workspace-composer="true"]');
  await timeline.evaluate((element) => { element.scrollTop = 0; });
  const before = await Promise.all([
    workspace.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop })),
    threadPanel.boundingBox(),
    composer.boundingBox(),
    timeline.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop })),
  ]);

  expect(before[0].scrollHeight).toBeLessThanOrEqual(before[0].clientHeight + 1);
  expect(before[1]).not.toBeNull();
  expect(before[2]).not.toBeNull();
  expect(before[3].scrollHeight).toBeGreaterThan(before[3].clientHeight);

  await timeline.hover();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => timeline.evaluate((element) => element.scrollTop)).toBeGreaterThan(before[3].scrollTop);

  const after = await Promise.all([
    workspace.evaluate((element) => element.scrollTop),
    page.evaluate(() => window.scrollY),
    threadPanel.boundingBox(),
    composer.boundingBox(),
  ]);
  expect(after[0]).toBe(0);
  expect(after[1]).toBe(0);
  expect(Math.abs((after[2]?.y ?? 0) - (before[1]?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((after[3]?.y ?? 0) - (before[2]?.y ?? 0))).toBeLessThanOrEqual(1);
});

test('student message center keeps list and composer fixed while chat content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await expectMessageShellLocked(page, '高二物理 3 班会话');
});

test('teacher immersive message center keeps scrolling inside the communication surface', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await expect(page.locator('[data-shell-mode="linear-workbench"]')).toHaveAttribute('data-message-shell-mode', 'immersive');
  await expectMessageShellLocked(page, '高二物理 3 班会话');
});

test('teacher Agent direct chat keeps scrolling inside its own timeline', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await page.getByRole('button', { name: '私聊', exact: true }).click();
  await page.locator('[data-thread-id="direct-class-agent-physics-3-teacher"]').click();
  await expectMessageShellLocked(page, '物理学习助手会话');
});

test('single-class immersive chats keep their composer fixed for both roles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const entry of [
    { role: /老师视角/, path: '/teacher/classes/physics-3/chat', hasWorkBuddy: true },
    { role: /学生视角/, path: '/student/classes/physics-3/chat', hasWorkBuddy: false },
  ]) {
    await page.goto('/select-role');
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto('/select-role');
    await page.getByRole('button', { name: entry.role }).click();
    await page.goto(entry.path);
    await expectMessageShellLocked(page, '高二物理 3 班会话', { expectThreadPanel: false });
    await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toHaveCount(entry.hasWorkBuddy ? 1 : 0);
  }
});

test('teacher sends and manages a class message @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await expect(page.getByRole('heading', { level: 1, name: '消息' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '高二物理 3 班' })).toBeVisible();
  const structuredManualMessage = '请按时进入课堂：\n\n1. 提前准备课本。\n2. 检查课堂练习。';
  await page.getByRole('textbox', { name: '输入消息' }).fill(structuredManualMessage);
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('本地 Demo 中发送');

  const sentMessageBody = page.getByText(structuredManualMessage, { exact: true }).last();
  await expect(sentMessageBody).toHaveCSS('white-space', 'pre-wrap');
  expect(await sentMessageBody.evaluate((element) => (element as HTMLElement).innerText)).toBe(structuredManualMessage);

  await page.getByRole('button', { name: '发送表情' }).click();
  await expect(page.getByRole('status')).toContainText('表情已在本地 Demo 中发送');
  await page.getByRole('button', { name: '添加附件' }).click();
  await page.getByRole('button', { name: '照片', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('未访问真实设备或文件服务');

  const sentMessage = sentMessageBody.locator('xpath=ancestor::article');
  await sentMessage.getByRole('button', { name: '撤回' }).click();
  await expect(page.getByText('消息已撤回', { exact: true }).last()).toBeVisible();

  await page.getByRole('button', { name: '取消置顶' }).click();
  await expect(page.getByRole('status')).toContainText('已取消置顶消息');
  await page.getByRole('button', { name: '管理', exact: true }).click();
  await page.getByRole('menuitem', { name: '全体禁言' }).click();
  await page.getByRole('button', { name: '管理', exact: true }).click();
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

test('teacher always sees conversation management in class and direct chats', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const classConversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await expect(classConversation.getByRole('button', { name: '管理', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '私聊', exact: true }).click();
  const directConversation = page.getByRole('region', { name: '李明会话' });
  await expect(directConversation.getByRole('button', { name: '管理', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'WorkBuddy', exact: true })).toHaveCount(0);
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(sidecar).toBeVisible();
  await expect(sidecar).toHaveAttribute('data-dismissible', 'false');
  await expect(sidecar.getByRole('button', { name: '关闭 WorkBuddy' })).toHaveCount(0);
  await expect(sidecar.getByText('告诉我你想如何回复当前私聊')).toBeVisible();
  await sidecar.getByRole('button', { name: '生成回复建议', exact: true }).click();
  await expect(sidecar.getByRole('textbox', { name: '私聊回复建议正文' })).toBeVisible();
  await sidecar.getByRole('button', { name: '插入回复框', exact: true }).click();
  await expect(directConversation.getByRole('textbox', { name: '输入消息' })).toHaveValue(/我看到了你提到的/);
  await expect(sidecar).toBeVisible();
});

test('conversation header aligns with categories and keeps identity metadata inline @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await page.getByRole('button', { name: '私聊', exact: true }).click();
  await page.locator('[data-thread-id="direct-teacher-zhang"]').click();

  const categories = page.getByRole('group', { name: '消息分类' });
  const conversation = page.getByRole('region', { name: '张老师会话' });
  const header = conversation.locator('[data-message-header="conversation"]');
  const identity = header.getByRole('heading', { name: '张老师' }).locator('..');
  await expect(identity.getByText('联系人 · 物理教研组', { exact: true })).toBeVisible();

  const [categoryBox, headerBox, titleBox, metadataBox, identityStyle] = await Promise.all([
    categories.boundingBox(),
    header.boundingBox(),
    identity.getByRole('heading', { name: '张老师' }).boundingBox(),
    identity.getByText('联系人 · 物理教研组', { exact: true }).boundingBox(),
    identity.evaluate((element) => {
      const style = getComputedStyle(element);
      return { display: style.display, flexDirection: style.flexDirection };
    }),
  ]);

  expect(Math.abs((categoryBox?.y ?? 0) + (categoryBox?.height ?? 0) - ((headerBox?.y ?? 0) + (headerBox?.height ?? 0)))).toBeLessThanOrEqual(1);
  expect(identityStyle).toEqual({ display: 'flex', flexDirection: 'row' });
  expect((metadataBox?.x ?? 0)).toBeGreaterThan((titleBox?.x ?? 0) + (titleBox?.width ?? 0));

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('message workspace enter and exit transitions stay perceptible without becoming sluggish', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.clock.install();
  await page.getByRole('link', { name: /消息/ }).click();
  const shell = page.locator('[data-shell-mode="linear-workbench"]');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'entering');
  const enterTransitionProjection = await Promise.all([
    shell.evaluate((element) => getComputedStyle(element).transitionDuration),
    page.locator('[data-message-shell-content]').evaluate((element) => ({
      animationDuration: getComputedStyle(element).animationDuration,
      animationName: getComputedStyle(element).animationName,
    })),
  ]);
  expect(enterTransitionProjection[0]).toContain('0.32s');
  expect(enterTransitionProjection[1].animationDuration).toBe('0.32s');
  expect(enterTransitionProjection[1].animationName).not.toBe('none');
  await page.clock.runFor(340);
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');

  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'exiting');
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toHaveCount(0);
  const transitionProjection = await Promise.all([
    shell.evaluate((element) => getComputedStyle(element).transitionDuration),
    page.locator('[data-message-shell-content]').evaluate((element) => ({
      animationDuration: getComputedStyle(element).animationDuration,
      animationName: getComputedStyle(element).animationName,
    })),
  ]);
  expect(transitionProjection[0]).toContain('0.32s');
  expect(transitionProjection[1].animationDuration).toBe('0.32s');
  expect(transitionProjection[1].animationName).not.toBe('none');
  await page.clock.runFor(340);
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toBeVisible();

  await page.getByRole('button', { name: '关闭退出引导' }).click();
  await page.getByRole('button', { name: 'WorkBuddy', exact: true }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'entering');
  await page.clock.runFor(340);
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
});

test('message workspace transition removes spatial motion for reduced-motion users', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.clock.install();
  await page.getByRole('link', { name: /消息/ }).click();

  const shell = page.locator('[data-shell-mode="linear-workbench"]');
  const content = page.locator('[data-message-shell-content]');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'entering');
  await expect
    .poll(() => shell.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration)))
    .toBeLessThanOrEqual(0.001);
  await expect
    .poll(() => content.evaluate((element) => getComputedStyle(element).animationName))
    .toBe('none');

  await page.clock.runFor(340);
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
});

test('teacher enters and exits the immersive message workspace without losing context @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const shell = page.locator('[data-shell-mode="linear-workbench"]');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
  await expect(page.getByRole('button', { name: '退出沉浸模式' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).not.toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '高二物理 3 班' })).toBeVisible();

  const composer = page.getByRole('textbox', { name: '输入消息' });
  await composer.fill('这是一条尚未发送的消息草稿');
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(sidecar).toBeVisible();
  await expect(page.getByRole('button', { name: 'WorkBuddy', exact: true })).toHaveCount(0);
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  await expect(sidecar.getByText('已拆解为 4 个执行步骤')).toBeVisible({ timeout: 4_000 });
  await sidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' }).fill('这是一条尚未发送的 WorkBuddy 补充要求');

  const immersiveUrl = page.url();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(page).toHaveURL(immersiveUrl);
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toBeVisible();
  await expect(page.getByRole('link', { name: /消息/ })).toHaveAttribute('aria-current', 'page');
  await expect(composer).toHaveValue('这是一条尚未发送的消息草稿');
  await expect(sidecar).toHaveCount(0);
  await expect(page.getByText('已退出沉浸模式，WorkBuddy 已收起', { exact: true })).toBeVisible();
  await expect(page.getByText('当前会话和 WorkBuddy 任务状态均已保留。', { exact: true })).toBeVisible();
  await expect(page.getByText('也可以点击右上角“WorkBuddy”再次打开。', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入沉浸模式' })).toHaveCount(0);
  const standardWorkBuddyTrigger = page.getByRole('button', { name: 'WorkBuddy', exact: true });
  await expect(standardWorkBuddyTrigger).toBeVisible();
  await expect(standardWorkBuddyTrigger).toHaveAttribute('aria-expanded', 'false');
  const exitGuidance = page.getByRole('region', { name: 'WorkBuddy 退出引导' });
  const [guidanceBox, guidanceStyle] = await Promise.all([
    exitGuidance.boundingBox(),
    exitGuidance.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        pointerEvents: style.pointerEvents,
        position: style.position,
      };
    }),
  ]);
  expect(guidanceBox).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(guidanceBox!.width).toBeGreaterThanOrEqual(460);
  expect(Math.abs((guidanceBox!.x + guidanceBox!.width / 2) - viewport!.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs((guidanceBox!.y + guidanceBox!.height / 2) - viewport!.height / 2)).toBeLessThanOrEqual(1);
  expect(guidanceStyle.backgroundColor).not.toBe('rgb(255, 255, 255)');
  expect(guidanceStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(guidanceStyle.pointerEvents).toBe('auto');
  expect(guidanceStyle.position).toBe('fixed');

  await exitGuidance.getByRole('button', { name: '重新打开 WorkBuddy' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
  const restoredSidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(restoredSidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' })).toHaveValue('这是一条尚未发送的 WorkBuddy 补充要求');
  await expect(page.getByRole('button', { name: 'WorkBuddy', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /高二物理 3 班/ }).first().focus();
  await page.keyboard.press('Escape');
  await expect(page.getByText('再按一次 Esc 退出沉浸模式', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(composer).toHaveValue('这是一条尚未发送的消息草稿');
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toHaveCount(0);
  await expect(page.getByText('已退出沉浸模式，WorkBuddy 已收起', { exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'WorkBuddy 退出引导' }).getByRole('button', { name: '关闭退出引导' }).click();
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toHaveCount(0);
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('WorkBuddy exit guidance stays long enough and pauses while the teacher engages it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.clock.install();

  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await page.clock.runFor(340);
  const guidance = page.getByRole('region', { name: 'WorkBuddy 退出引导' });
  await expect(guidance).toBeVisible();
  await page.clock.runFor(5_000);
  await expect(guidance).toBeVisible();

  const guidanceBox = await guidance.boundingBox();
  expect(guidanceBox).not.toBeNull();
  await page.mouse.move(
    guidanceBox!.x + guidanceBox!.width / 2,
    guidanceBox!.y + guidanceBox!.height / 2,
  );
  await page.clock.runFor(10_000);
  await expect(guidance).toBeVisible();

  await guidance.getByRole('button', { name: '重新打开 WorkBuddy' }).focus();
  await page.mouse.move(0, 0);
  await page.clock.runFor(10_000);
  await expect(guidance).toBeVisible();

  await page.getByRole('button', { name: '管理', exact: true }).focus();
  await page.clock.runFor(900);
  await expect(guidance).toHaveCount(0);
});

test('teacher can stop showing the WorkBuddy exit guidance until a full page reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();

  const guidance = page.getByRole('region', { name: 'WorkBuddy 退出引导' });
  const preference = guidance.getByRole('checkbox', { name: '不再显示此提示' });
  await expect(guidance).toBeVisible();
  await expect(preference).not.toBeChecked();
  const accessibility = await new AxeBuilder({ page })
    .include('[aria-label="WorkBuddy 退出引导"]')
    .analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await preference.check();
  await expect(preference).toBeChecked();
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('classin.message-workspace.hide-workbuddy-exit-guidance')
  ))).toBe('true');
  await preference.uncheck();
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('classin.message-workspace.hide-workbuddy-exit-guidance')
  ))).toBeNull();
  await preference.check();

  await guidance.getByRole('button', { name: '重新打开 WorkBuddy' }).click();
  const shell = page.locator('[data-shell-mode="linear-workbench"]');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toHaveCount(0);

  await page.reload();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('classin.message-workspace.hide-workbuddy-exit-guidance')
  ))).toBeNull();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '不再显示此提示' })).not.toBeChecked();
});

test('exit guidance never overlaps a still-mounted WorkBuddy sidecar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const shell = page.locator('[data-shell-mode="linear-workbench"]');
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'immersive');
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toBeVisible();
  await page.evaluate(() => {
    const debugWindow = window as Window & {
      __workBuddyExitConflict?: boolean;
      __workBuddyExitObserver?: MutationObserver;
    };
    debugWindow.__workBuddyExitConflict = false;
    const captureConflict = () => {
      const guidanceVisible = Array.from(document.querySelectorAll('[role="status"]'))
        .some((element) => element.textContent?.includes('已退出沉浸模式，WorkBuddy 已收起'));
      const sidecarVisible = document.querySelector('[aria-label="WorkBuddy 私密协作窗口"]') !== null;
      if (guidanceVisible && sidecarVisible) debugWindow.__workBuddyExitConflict = true;
    };
    debugWindow.__workBuddyExitObserver = new MutationObserver(captureConflict);
    debugWindow.__workBuddyExitObserver.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    captureConflict();
  });

  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(shell).toHaveAttribute('data-message-shell-mode', 'standard');
  const exitConflictObserved = await page.evaluate(() => {
    const debugWindow = window as Window & {
      __workBuddyExitConflict?: boolean;
      __workBuddyExitObserver?: MutationObserver;
    };
    debugWindow.__workBuddyExitObserver?.disconnect();
    delete debugWindow.__workBuddyExitObserver;
    const conflict = debugWindow.__workBuddyExitConflict ?? false;
    delete debugWindow.__workBuddyExitConflict;
    return conflict;
  });

  expect(exitConflictObserved).toBe(false);
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toHaveCount(0);
  await expect(page.getByText('已退出沉浸模式，WorkBuddy 已收起', { exact: true })).toBeVisible();
});

test('exit guidance is reserved for sessions that actually showed WorkBuddy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: /系统通知/ }).click();
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toHaveCount(0);

  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  await expect(page.locator('[data-shell-mode="linear-workbench"]')).toHaveAttribute('data-message-shell-mode', 'standard');
  await expect(page.getByRole('region', { name: 'WorkBuddy 退出引导' })).toHaveCount(0);
});

test('WorkBuddy exit guidance remains viewport-centered at compact width', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByRole('button', { name: '退出沉浸模式' }).click();

  const guidance = page.getByRole('region', { name: 'WorkBuddy 退出引导' });
  await expect(guidance).toBeVisible();
  const box = await guidance.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs((box!.x + box!.width / 2) - 400)).toBeLessThanOrEqual(1);
  expect(Math.abs((box!.y + box!.height / 2) - 350)).toBeLessThanOrEqual(1);
  expect(box!.x).toBeGreaterThanOrEqual(8);
  expect(box!.x + box!.width).toBeLessThanOrEqual(792);
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

test('teacher reviews a private WorkBuddy reminder and sends one grouped message @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(sidecar.getByText('仅你可见')).toBeVisible();
  const workBuddyComposer = sidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' });
  await expect(workBuddyComposer).toBeVisible();
  await expect(workBuddyComposer).toHaveValue(/请找出当前班级群里还没截止的作业/);
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  await expect(sidecar.getByRole('status').getByText('正在理解任务')).toBeVisible();
  await expect(sidecar.getByLabel(/已进行 \d+ 秒，预计还需 \d+ 秒/)).toBeVisible();
  await expect(sidecar.getByText('已拆解为 4 个执行步骤')).toBeVisible({ timeout: 4_000 });
  await expect(sidecar.getByLabel('定位当前班级与群聊 · 进行中')).toBeVisible({ timeout: 4_000 });
  await workBuddyComposer.fill('提醒语气简洁一些');
  await sidecar.getByRole('button', { name: '发送补充要求' }).click();
  await expect(sidecar.getByText('你补充了要求')).toBeVisible();
  await expect(sidecar.getByText('提醒语气简洁一些')).toBeVisible();
  await expect(sidecar.getByLabel('查询未截止作业 · 进行中')).toBeVisible({ timeout: 6_000 });
  await expect(sidecar.getByLabel('核对学员提交状态 · 进行中')).toBeVisible({ timeout: 8_000 });
  await expect(sidecar.getByLabel('生成分组提醒草稿 · 进行中')).toBeVisible({ timeout: 10_000 });
  await expect(sidecar.getByText('2 项作业', { exact: true })).toBeVisible({ timeout: 12_000 });
  await expect(sidecar.getByText('提醒草稿已生成')).toBeVisible();
  await expect(sidecar.getByText('待你审阅')).toBeVisible();
  await expect(sidecar.getByText('群消息草稿已生成')).toBeVisible();
  await expect(sidecar.getByText('未发送')).toBeVisible();
  await expect(sidecar.getByLabel('发送身份 王老师')).toBeVisible();
  await expect(sidecar.getByLabel('30 位群成员可见')).toHaveText('30 人可见');
  await expect(sidecar.getByText('5 位学生', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('textbox', { name: '群消息正文' })).toBeEditable();
  await expect(sidecar.getByRole('button', { name: '展开编辑群消息正文' })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '还原名单至本次草稿最初生成的范围' })).toHaveCount(0);
  await expect(page.getByLabel('消息记录').getByText(/以下作业尚未截止/)).toHaveCount(0);

  await sidecar.getByRole('button', { name: '从动量守恒作业 A 组移除李明' }).click();
  await expect(sidecar.getByText('4 位学生', { exact: true })).toBeVisible();
  await sidecar.getByRole('button', { name: '还原名单至本次草稿最初生成的范围' }).click();
  await expect(sidecar.getByText('5 位学生', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '从动量守恒作业 A 组移除李明' })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '还原名单至本次草稿最初生成的范围' })).toHaveCount(0);

  await sidecar.getByRole('button', { name: '从动量守恒作业 A 组移除李明' }).click();
  const approvedReminderBody = await sidecar.getByRole('textbox', { name: '群消息正文' }).inputValue();
  await sidecar.getByRole('button', { name: '确认并发送至高二物理 3 班' }).click();
  await expect(sidecar.getByText('已发送 1 条班级群消息')).toBeVisible();

  const sent = page.getByLabel('消息记录').getByText(/同学们好，以下作业尚未截止/);
  await expect(sent).toBeVisible();
  expect(await sent.evaluate((element) => element.textContent)).toBe(approvedReminderBody);
  await expect(sent).toHaveCSS('white-space', 'pre-wrap');
  expect(await sent.evaluate((element) => (element as HTMLElement).innerText)).toBe(approvedReminderBody);
  await expect(sent.locator('xpath=ancestor::article')).toContainText('我 ·');
  await expect(sent).not.toContainText('WorkBuddy');

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('expanded WorkBuddy editor keeps the sidecar shell anchored while its content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  await expect(sidecar.getByText('2 项作业', { exact: true })).toBeVisible({ timeout: 12_000 });
  await sidecar.getByRole('button', { name: '展开编辑群消息正文' }).click();

  const body = sidecar.locator('[data-scrolled]');
  await body.hover();
  await page.mouse.wheel(0, 2_400);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  const geometry = await sidecar.evaluate((element) => {
    const sidecarBox = element.getBoundingClientRect();
    const headerBox = element.querySelector(':scope > header')?.getBoundingClientRect();
    const composerBox = element.querySelector(':scope > form')?.getBoundingClientRect();
    return {
      documentScrollTop: document.documentElement.scrollTop,
      sidecarScrollTop: element.scrollTop,
      bodyScrollTop: element.querySelector<HTMLElement>('[data-scrolled]')?.scrollTop,
      sidecarTop: sidecarBox.top,
      sidecarBottom: sidecarBox.bottom,
      headerTop: headerBox?.top,
      composerBottom: composerBox?.bottom,
    };
  });

  expect(geometry.documentScrollTop).toBe(0);
  expect(geometry.sidecarScrollTop).toBe(0);
  expect(geometry.bodyScrollTop).toBeGreaterThan(0);
  expect(geometry.headerTop).toBeGreaterThanOrEqual(geometry.sidecarTop);
  expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.sidecarBottom);
  expect(geometry.sidecarBottom - (geometry.composerBottom ?? 0)).toBeLessThanOrEqual(16);
  await expect(sidecar.getByText('WorkBuddy', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' })).toBeVisible();
});

test('teacher turns the weekly teaching plan into a second simulated class notice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(sidecar.getByRole('button', { name: /核对未截止作业/ })).toBeVisible();
  await sidecar.getByRole('button', { name: /根据本周教学计划生成课前准备通知/ }).click();
  await expect(sidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' })).toHaveValue(/你帮我看看本周的教学计划/);
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();

  await expect(sidecar.getByLabel('读取本周教学计划 · 进行中')).toBeVisible({ timeout: 6_000 });
  await expect(sidecar.getByLabel('提炼课前准备事项 · 进行中')).toBeVisible({ timeout: 8_000 });
  await expect(sidecar.getByLabel('生成班级通知草稿 · 进行中')).toBeVisible({ timeout: 10_000 });
  await expect(sidecar.getByRole('heading', { name: '课前准备通知已生成' })).toBeVisible({ timeout: 12_000 });
  await expect(sidecar.getByText('3 节课', { exact: true })).toBeVisible();
  await expect(sidecar.getByText('6 项准备', { exact: true })).toBeVisible();
  const noticeEditor = sidecar.getByRole('textbox', { name: '群通知正文', exact: true });
  await expect(noticeEditor).toHaveValue(/动量守恒定律/);
  const initialNoticeBody = await noticeEditor.inputValue();
  const sidecarBoxBeforeExpand = await sidecar.boundingBox();
  const expandNoticeEditor = sidecar.getByRole('button', { name: '展开编辑群通知正文' });
  await expandNoticeEditor.click();
  const focusedEditor = sidecar.locator('[data-focused-message-editor="true"]');
  const sidecarBoxAfterExpand = await sidecar.boundingBox();
  await expect(page.getByRole('dialog', { name: '编辑群通知正文' })).toHaveCount(0);
  await expect(focusedEditor).toHaveAttribute('data-expanded', 'true');
  await expect(noticeEditor).toBeFocused();
  await expect(sidecar.getByRole('button', { name: '收起群通知正文' })).toHaveAttribute('aria-expanded', 'true');
  const expandedEditorBox = await noticeEditor.boundingBox();
  expect(expandedEditorBox).not.toBeNull();
  expect(expandedEditorBox!.height).toBeGreaterThanOrEqual(450);
  expect(sidecarBoxBeforeExpand).not.toBeNull();
  expect(sidecarBoxAfterExpand).not.toBeNull();
  expect(Math.abs(sidecarBoxAfterExpand!.width - sidecarBoxBeforeExpand!.width)).toBeLessThanOrEqual(1);
  await noticeEditor.fill(`${initialNoticeBody}\n\n请按对应课次提前完成。`);
  await expect(noticeEditor).toHaveValue(/请按对应课次提前完成。/);
  const focusedEditorAccessibility = await new AxeBuilder({ page }).include('[data-focused-message-editor="true"]').analyze();
  expect(focusedEditorAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await sidecar.getByRole('button', { name: '收起群通知正文' }).click();
  await expect(focusedEditor).toHaveAttribute('data-expanded', 'false');
  await expect(expandNoticeEditor).toBeFocused();
  const approvedNoticeBody = await noticeEditor.inputValue();
  await expect(page.getByLabel('消息记录').getByText(/根据本周.*教学计划/)).toHaveCount(0);

  await sidecar.getByRole('button', { name: '确认并发送至高二物理 3 班' }).click();
  await expect(sidecar.getByText('已发送 1 条班级群消息')).toBeVisible();
  const sentNoticeBody = page.getByLabel('消息记录').getByText(/根据本周.*教学计划/);
  await expect(sentNoticeBody).toBeVisible();
  expect(await sentNoticeBody.evaluate((element) => element.textContent)).toBe(approvedNoticeBody);
  await expect(sentNoticeBody).toHaveCSS('white-space', 'pre-wrap');
  expect(await sentNoticeBody.evaluate((element) => (element as HTMLElement).innerText)).toBe(approvedNoticeBody);
  const [sentNoticeBox, composerBox] = await Promise.all([
    sentNoticeBody.locator('xpath=ancestor::article').boundingBox(),
    page.getByLabel('消息记录').locator('xpath=following-sibling::*[@data-workspace-composer="true"]').boundingBox(),
  ]);
  expect(sentNoticeBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(sentNoticeBox!.y + sentNoticeBox!.height).toBeLessThanOrEqual(composerBox!.y + 1);
});

test('WorkBuddy composer grows with the task and scrolls after its visible height limit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  const composer = sidecar.getByRole('textbox', { name: '向 WorkBuddy 输入要求' });
  await expect(composer).toHaveAttribute('maxlength', '4000');

  await composer.fill('提醒');
  const compactHeight = await composer.evaluate((element) => element.getBoundingClientRect().height);
  await composer.fill('第一步确认班级\n第二步查询作业\n第三步核对提交\n第四步生成提醒');
  const expandedHeight = await composer.evaluate((element) => element.getBoundingClientRect().height);
  expect(expandedHeight).toBeGreaterThan(compactHeight);

  await composer.fill('请'.repeat(3_201));
  await expect(sidecar.getByText('3,201 / 4,000')).toBeVisible();
  await composer.fill('请'.repeat(4_000));
  await expect(sidecar.getByText('已达 4,000 字上限')).toBeVisible();
  const capped = await composer.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      maxHeight: Number.parseFloat(style.maxHeight),
      overflowY: style.overflowY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowing: element.dataset.overflowing,
    };
  });
  expect(capped.height).toBeLessThanOrEqual(capped.maxHeight);
  expect(capped.overflowY).toBe('auto');
  expect(capped.scrollHeight).toBeGreaterThan(capped.clientHeight);
  expect(capped.overflowing).toBe('true');
});

test('public chat and private WorkBuddy share one aligned composer contract', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const composers = page.locator('[data-workspace-composer="true"]');
  await expect(composers).toHaveCount(2);
  const publicComposer = composers.filter({ has: page.getByRole('textbox', { name: '输入消息' }) });
  const privateComposer = composers.filter({ has: page.getByRole('textbox', { name: '向 WorkBuddy 输入要求' }) });
  const publicInput = publicComposer.getByRole('textbox', { name: '输入消息' });

  await publicInput.fill('第一行');
  const compactHeight = await publicInput.evaluate((element) => element.getBoundingClientRect().height);
  await publicInput.fill('第一行\n第二行\n第三行');
  const expandedHeight = await publicInput.evaluate((element) => element.getBoundingClientRect().height);
  expect(expandedHeight).toBeGreaterThan(compactHeight);

  const [publicStyle, privateStyle] = await Promise.all([publicComposer, privateComposer].map((composer) => composer.evaluate((element) => {
    const style = getComputedStyle(element);
    const textarea = element.querySelector('textarea');
    const submit = element.querySelector<HTMLButtonElement>('button[type="submit"]');
    const submitBox = submit?.getBoundingClientRect();
    return {
      borderRadius: style.borderRadius,
      resize: textarea ? getComputedStyle(textarea).resize : null,
      submitWidth: submitBox ? Math.round(submitBox.width) : undefined,
      submitHeight: submitBox ? Math.round(submitBox.height) : undefined,
    };
  })));
  expect(publicStyle).toEqual(privateStyle);
  expect(publicStyle).toMatchObject({ resize: 'none', submitWidth: 32, submitHeight: 32 });
});

test('teacher resizes the WorkBuddy auxiliary workspace with an accessible separator', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const communicationSurface = page.getByRole('region', { name: '消息通信主工作台' });
  await expect(communicationSurface.getByRole('region', { name: '班级消息列表', exact: true })).toBeVisible();
  await expect(communicationSurface.getByRole('region', { name: '高二物理 3 班会话', exact: true })).toBeVisible();

  const separator = page.getByRole('separator', { name: '调整 WorkBuddy 宽度' });
  await expect(separator).toBeVisible();
  await expect(separator).toHaveAttribute('aria-controls', 'workbuddy-im-sidecar');
  const separatorBox = await separator.boundingBox();
  expect(separatorBox).not.toBeNull();
  if (separatorBox) {
    const initialWidth = Number(await separator.getAttribute('aria-valuenow'));
    await separator.hover();
    await page.mouse.down();
    await expect(page.locator('[data-dragging="true"]')).toBeVisible();
    await page.mouse.move(separatorBox.x - 40, separatorBox.y + separatorBox.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => Number(await separator.getAttribute('aria-valuenow'))).toBeGreaterThan(initialWidth);
    await expect.poll(() => page.evaluate(() => Number(window.localStorage.getItem('classin.message-workspace.workbuddy-width.messages-global')))).toBeGreaterThan(initialWidth);
  }
  await separator.focus();
  await page.keyboard.press('Home');
  await expect(separator).toHaveAttribute('aria-valuenow', '384');
  await page.keyboard.press('ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '392');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(separator).toHaveAttribute('aria-valuenow', '424');
  await page.keyboard.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '640');
  await separator.dblclick();
  await expect(separator).toHaveAttribute('aria-valuenow', '490');

  const storedWidth = await page.evaluate(() => window.localStorage.getItem('classin.message-workspace.workbuddy-width.messages-global'));
  expect(storedWidth).toBe('490');

  await separator.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toBeVisible();
  await expect(separator).toBeFocused();
  await expect(page.getByRole('button', { name: 'WorkBuddy' })).toHaveCount(0);
});

test('compact immersive messaging keeps WorkBuddy as an overlay without a splitter', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await expect(sidecar).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '关闭 WorkBuddy' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'WorkBuddy' })).toHaveCount(0);
  await expect(page.getByRole('separator', { name: '调整 WorkBuddy 宽度' })).not.toBeVisible();
  await expect(page.getByRole('region', { name: '消息通信主工作台' })).toBeVisible();
});

test('student cannot discover the teacher WorkBuddy sidecar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await expect(page.getByRole('button', { name: 'WorkBuddy' })).toHaveCount(0);
  await expect(page.getByLabel('WorkBuddy 私密协作窗口')).toHaveCount(0);
});

test('teacher approves a guided explanation, opens it from IM and finds the same artifact in My Files @a11y', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  const classConversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await expect(classConversation.getByText(/今天动量守恒练习单第 5 题我不会/)).toBeVisible();
  const sidecar = page.getByLabel('WorkBuddy 私密协作窗口');
  await sidecar.locator('button').filter({ hasText: '单题讲解' }).click();
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  const review = sidecar.getByLabel('单题交互讲解待审核');
  await expect(review).toBeVisible({ timeout: 12_000 });
  await expect(review.getByRole('textbox', { name: '学生题目' })).toHaveValue(/0\.20 kg.*5\.0 m\/s.*0\.30 kg.*1\.0 m\/s/);
  await expect(review.getByRole('textbox', { name: '最终发送话术' })).toHaveValue(/练习单第 5 题/);
  await expect(review.getByRole('button', { name: '展开编辑最终发送话术' })).toBeVisible();
  await review.getByRole('button', { name: '查看分步讲解' }).click();
  const draftPreview = page.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' });
  await expect(draftPreview).toBeVisible();
  await draftPreview.getByRole('button', { name: '关闭讲题内容' }).click();
  await expect(review.getByRole('textbox', { name: '第 2 步讲解' })).toHaveValue(/m_Av_A \+ m_Bv_B/);
  await expect(review.getByRole('textbox', { name: '教师审核版完整答案' })).toHaveValue(/4\.0 m\/s.*向右/s);
  await review.getByRole('textbox', { name: '第 3 步讲解' }).fill("教师修订计算：0.30×v'_B = 1.20，所以 v'_B = 4.0 m/s。");
  await review.getByRole('textbox', { name: '教师审核版完整答案' }).fill('教师修订答案：小球 B 碰后以 4.0 m/s 向右运动。');
  const guidedMessageBody = '同学们，第 5 题的分步解法已经整理好：\n\n【解题提示】\n1. 先确定正方向。\n2. 再列动量守恒式。\n\n请打开链接查看完整讲解。';
  await review.getByRole('textbox', { name: '最终发送话术' }).fill(guidedMessageBody);
  await expect(review.getByRole('button', { name: '确认保存并发送' })).toBeDisabled();
  await review.getByRole('button', { name: '应用修改' }).click();
  await expect(review.getByText('v2 · 未发送')).toBeVisible();
  await review.getByRole('button', { name: '确认保存并发送' }).click();
  await expect(sidecar.getByLabel('讲题内容发送成功')).toBeVisible();
  await sidecar.getByRole('button', { name: '查看消息' }).click();
  const sentGuidedMessage = classConversation.getByText(/同学们，第 5 题的分步解法已经整理好/);
  await expect(sentGuidedMessage).toBeVisible();
  expect(await sentGuidedMessage.evaluate((element) => element.textContent)).toBe(guidedMessageBody);
  await expect(sentGuidedMessage).toHaveCSS('white-space', 'pre-wrap');
  expect(await sentGuidedMessage.evaluate((element) => (element as HTMLElement).innerText)).toBe(guidedMessageBody);
  const openExplanation = classConversation.getByRole('button', { name: '查看分步讲解' });
  await openExplanation.click();
  const dialog = page.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(4);
  await expect(dialog.getByText(/教师修订计算/)).toBeVisible();
  await expect(dialog.getByText(/教师修订答案/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: '关闭讲题内容' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openExplanation).toBeFocused();

  await page.getByRole('button', { name: '退出沉浸模式' }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('link', { name: 'Work Buddy' }).click();
  await primaryNavigation.getByRole('group', { name: 'Work Buddy 二级导航' }).getByRole('link', { name: '我的文件', exact: true }).click();
  await expect(page.getByText('小球正碰：用动量守恒求碰后速度')).toBeVisible();
  await expect(page.getByText('H5', { exact: true })).toHaveCount(0);
  await expect(page.getByText('交互讲解')).toBeVisible();

  await page.getByRole('group', { name: '角色切换' }).getByRole('button', { name: '切换至学生' }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.locator('[data-thread-id="class-physics-3"]').click();
  const studentConversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  const studentOpenExplanation = studentConversation.getByRole('button', { name: '查看分步讲解' });
  await expect(studentOpenExplanation).toBeVisible();
  await studentOpenExplanation.click();
  const studentDialog = page.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' });
  await expect(studentDialog.getByRole('listitem')).toHaveCount(4);
  await expect(studentDialog.getByText(/教师修订答案/)).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('teacher and student can publicly mention the same authorized class Agent @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const perspective of [/老师视角/, /学生视角/]) {
    await page.goto('/select-role');
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto('/select-role');
    await page.getByRole('button', { name: perspective }).click();
    await page.getByRole('link', { name: /消息/ }).click();
    const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
    await expect(conversation.getByText(/已授权.*群内公开回复/)).toBeVisible();
    await conversation.getByRole('button', { name: '选择班级 Agent' }).click();
    await conversation.getByRole('option', { name: /物理学习助手.*Agent/ }).click();
    const composer = conversation.getByRole('textbox', { name: '输入消息' });
    await expect(conversation.getByText('@物理学习助手')).toBeVisible();
    await composer.fill('第 5 题的方向怎么判断？');
    await conversation.getByRole('button', { name: '发送', exact: true }).click();
    await expect(conversation.getByRole('status').filter({ hasText: '正在理解你的问题' }).first()).toBeVisible();
    await expect(conversation.getByText(/先做第一步：统一规定正方向/)).toBeVisible({ timeout: 3_000 });
    await expect(conversation.getByText('当前班级群成员可见')).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).include('[data-message-conversation]').analyze();
    expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  }
});

test('teacher and student use isolated direct threads with the same class Agent @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const cases = [
    { perspective: /老师视角/, ownThread: 'direct-class-agent-physics-3-teacher', hiddenThread: 'direct-class-agent-physics-3-student' },
    { perspective: /学生视角/, ownThread: 'direct-class-agent-physics-3-student', hiddenThread: 'direct-class-agent-physics-3-teacher' },
  ];
  for (const { perspective, ownThread, hiddenThread } of cases) {
    await page.goto('/select-role');
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto('/select-role');
    await page.getByRole('button', { name: perspective }).click();
    await page.getByRole('link', { name: /消息/ }).click();
    await page.getByRole('button', { name: '私聊', exact: true }).click();
    const directList = page.getByRole('region', { name: '私聊列表' });
    await expect(directList.getByRole('button', { name: '班级 Agent 4' })).toBeVisible();
    await directList.getByRole('button', { name: '班级 Agent 4' }).click();
    await expect(directList.locator('button[data-agent="true"]')).toHaveCount(4);
    const directorySearch = directList.getByRole('textbox', { name: '搜索私聊和班级 Agent' });
    await directorySearch.fill('变量');
    await expect(directList.locator('[data-thread-id*="experiment"]')).toBeVisible();
    await expect(directList.locator(`[data-thread-id="${ownThread}"]`)).toHaveCount(0);
    await directorySearch.fill('');
    await expect(page.locator(`[data-thread-id="${hiddenThread}"]`)).toHaveCount(0);
    await page.locator(`[data-thread-id="${ownThread}"]`).click();

    const conversation = page.getByRole('region', { name: '物理学习助手会话' });
    await expect(conversation.getByRole('heading', { name: '物理学习助手' })).toBeVisible();
    await expect(conversation.getByText(/同一班级 Agent.*仅当前会话可见/)).toHaveCount(0);
    await expect(conversation.getByRole('button', { name: '切换 Agent' })).toHaveCount(0);
    await expect(conversation.getByText('仅你与班级 Agent 可见').first()).toBeVisible();
    const loadOlder = conversation.getByRole('button', { name: '加载更早消息' });
    if (await loadOlder.count()) await loadOlder.click();
    await expect(conversation.getByText(/我是本班已授权的物理学习助手/)).toBeVisible();
    await expect(conversation.getByText('动量方向的正负号应该先看什么？')).toBeVisible();
    await expect(conversation.getByRole('button', { name: 'WorkBuddy', exact: true })).toHaveCount(0);
    const composer = conversation.getByRole('textbox', { name: '输入消息' });
    await composer.fill('第 5 题的方向怎么判断？');
    await conversation.getByRole('button', { name: '发送', exact: true }).click();
    await expect(conversation.getByRole('status').filter({ hasText: '正在理解你的问题' })).toBeVisible();
    await expect(conversation.getByRole('status').filter({ hasText: '正在整理可检查的回复步骤' })).toBeVisible({ timeout: 1_500 });
    const timeline = conversation.getByRole('log', { name: '消息记录' });
    await timeline.evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect(conversation.getByText(/我们分三步来/)).toBeVisible({ timeout: 4_000 });
    const newMessageAnchor = conversation.getByRole('button', { name: '1 条新消息' });
    await expect(newMessageAnchor).toBeVisible();
    await newMessageAnchor.click();
    await expect(newMessageAnchor).toHaveCount(0);

    const accessibility = await new AxeBuilder({ page }).include('[data-message-conversation]').analyze();
    expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  }
});

test('typed @ searches Agents and members while the direct directory switches isolated Agents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/select-role');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  const classConversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  const composer = classConversation.getByRole('textbox', { name: '输入消息' });
  await composer.fill('@错题');
  await expect(classConversation.getByRole('option', { name: /作业订正助手.*Agent/ })).toBeVisible();
  await composer.press('Enter');
  await expect(classConversation.getByText('@作业订正助手')).toBeVisible();
  await classConversation.getByRole('button', { name: '选择班级 Agent' }).click();
  await classConversation.getByRole('option', { name: /实验探究助手.*Agent/ }).click();
  await expect(classConversation.getByRole('button', { name: '撤销切换' })).toBeVisible();
  await composer.fill('帮我整理实验步骤');
  await expect(classConversation.getByRole('button', { name: '撤销切换' })).toHaveCount(0);
  await classConversation.getByRole('button', { name: '发送', exact: true }).click();
  await expect(classConversation.getByText(/先明确自变量、因变量和需要保持不变的条件/)).toBeVisible({ timeout: 3_000 });

  await page.getByRole('button', { name: '私聊', exact: true }).click();
  await page.locator('[data-thread-id="direct-class-agent-physics-3-teacher"]').click();
  const directConversation = page.getByRole('region', { name: '物理学习助手会话' });
  const directComposer = directConversation.getByRole('textbox', { name: '输入消息' });
  await directComposer.fill('保留在物理助手会话里的草稿');
  await expect(directConversation.getByRole('button', { name: '切换 Agent' })).toHaveCount(0);
  await page.locator('[data-thread-id="direct-class-agent-experiment-inquiry-physics-3-teacher"]').click();
  await expect(page).toHaveURL(/thread=direct-class-agent-experiment-inquiry-physics-3-teacher/);
  await expect(page.getByRole('region', { name: '实验探究助手会话' })).toBeVisible();

  await page.locator('[data-thread-id="direct-class-agent-physics-3-teacher"]').click();
  await expect(page).toHaveURL(/thread=direct-class-agent-physics-3-teacher/);
  await expect(page.getByRole('region', { name: '物理学习助手会话' }).getByRole('textbox', { name: '输入消息' }))
    .toHaveValue('保留在物理助手会话里的草稿');
});
