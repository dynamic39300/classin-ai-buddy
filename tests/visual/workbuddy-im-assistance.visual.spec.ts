import { expect, test, type Locator, type Page } from '@playwright/test';

async function openReminderDraft(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.getByLabel('TeachBuddy 私密协作窗口').getByRole('button', { name: '生成消息草稿' }).click();
  await expect(page.getByLabel('TeachBuddy 私密协作窗口').getByText('2 项作业', { exact: true })).toBeVisible({ timeout: 12_000 });
}

async function openWorkBuddyReady(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await expect(page.getByLabel('TeachBuddy 私密协作窗口')).toBeVisible();
}

async function openWeeklyPreparationDraft(page: Page, viewport: { width: number; height: number }) {
  await openWorkBuddyReady(page, viewport);
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  await sidecar.getByRole('button', { name: /根据本周教学计划生成课前准备通知/ }).click();
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  await expect(sidecar.getByRole('heading', { name: '课前准备通知已生成' })).toBeVisible({ timeout: 12_000 });
}

async function openGuidedExplanationDraft(page: Page, viewport: { width: number; height: number }) {
  await openWorkBuddyReady(page, viewport);
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  await sidecar.locator('button').filter({ hasText: '单题讲解' }).click();
  await sidecar.getByRole('button', { name: '生成消息草稿' }).click();
  await expect(sidecar.getByLabel('单题交互讲解待审核')).toBeVisible({ timeout: 12_000 });
}

async function sendReminder(page: Page, viewport: { width: number; height: number }) {
  await openReminderDraft(page, viewport);
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  await sidecar.getByRole('button', { name: '确认并发送至高二物理 3 班' }).click();
  await expect(sidecar.getByRole('status', { name: '班级群消息发送成功' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}

async function scrollbarThumbColor(surface: Locator) {
  return surface.evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor);
}

async function expectScrollbarsDisclosedOnInteraction(page: Page) {
  const timeline = page.getByLabel('消息记录');
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const body = sidecar.locator('[data-scrolled]');
  const editor = sidecar.getByRole('textbox', { name: '群消息正文' });

  await page.mouse.move(0, 0);
  await expect.poll(() => scrollbarThumbColor(timeline)).toBe('rgba(0, 0, 0, 0)');
  await expect.poll(() => scrollbarThumbColor(body)).toBe('rgba(0, 0, 0, 0)');
  await expect.poll(() => scrollbarThumbColor(editor)).toBe('rgba(0, 0, 0, 0)');

  await timeline.hover({ position: { x: 8, y: 8 } });
  await expect.poll(() => scrollbarThumbColor(timeline)).not.toBe('rgba(0, 0, 0, 0)');

  await body.hover({ position: { x: 8, y: 8 } });
  await expect.poll(() => scrollbarThumbColor(body)).not.toBe('rgba(0, 0, 0, 0)');

  await editor.hover({ position: { x: 8, y: 8 } });
  await expect.poll(() => scrollbarThumbColor(editor)).not.toBe('rgba(0, 0, 0, 0)');

  await page.mouse.move(0, 0);
}

async function expectFloatingAssistantWorkbench(page: Page) {
  const frame = page.locator('[data-layout-region="workbuddy-assistant"]');
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const composer = sidecar.locator('form');
  await expect(sidecar).toHaveAttribute('data-surface', 'floating-assistant');
  const [frameBox, sidecarBox, composerBox, surfaceStyle] = await Promise.all([
    frame.boundingBox(),
    sidecar.boundingBox(),
    composer.boundingBox(),
    sidecar.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderRadius: Number.parseFloat(style.borderRadius), boxShadow: style.boxShadow };
    }),
  ]);
  expect(frameBox).not.toBeNull();
  expect(sidecarBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect((sidecarBox?.y ?? 0) - (frameBox?.y ?? 0)).toBeGreaterThanOrEqual(8);
  expect((frameBox?.x ?? 0) + (frameBox?.width ?? 0) - ((sidecarBox?.x ?? 0) + (sidecarBox?.width ?? 0))).toBeGreaterThanOrEqual(8);
  expect((frameBox?.y ?? 0) + (frameBox?.height ?? 0) - ((sidecarBox?.y ?? 0) + (sidecarBox?.height ?? 0))).toBeGreaterThanOrEqual(8);
  expect((composerBox?.x ?? 0) - (sidecarBox?.x ?? 0)).toBeGreaterThanOrEqual(8);
  expect((sidecarBox?.x ?? 0) + (sidecarBox?.width ?? 0) - ((composerBox?.x ?? 0) + (composerBox?.width ?? 0))).toBeGreaterThanOrEqual(8);
  expect(surfaceStyle.borderRadius).toBeGreaterThanOrEqual(8);
  expect(surfaceStyle.boxShadow).not.toBe('none');
}

async function expectUnifiedCommunicationSurface(page: Page) {
  const surface = page.getByRole('region', { name: '消息通信主工作台' });
  const style = await surface.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { borderRadius: Number.parseFloat(computed.borderRadius), boxShadow: computed.boxShadow };
  });
  await expect(surface.getByRole('region', { name: '班级消息列表', exact: true })).toBeVisible();
  await expect(surface.getByRole('region', { name: '高二物理 3 班会话', exact: true })).toBeVisible();
  expect(style.borderRadius).toBeGreaterThanOrEqual(8);
  expect(style.boxShadow).not.toBe('none');
}

async function expectBorderLightReviewCanvas(page: Page, editorName = '群消息正文', testId = 'workbuddy-review-artifact') {
  const artifact = page.getByTestId(testId);
  const core = artifact.locator('[data-review-layer="core"]');
  const impact = artifact.locator('[data-review-layer="impact"]');
  const action = artifact.locator('[data-review-layer="action"]');
  const editor = artifact.getByRole('textbox', { name: editorName });
  const getStyle = (locator: typeof artifact) => locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      borderBottomWidth: Number.parseFloat(computed.borderBottomWidth),
      borderTopWidth: Number.parseFloat(computed.borderTopWidth),
      borderWidth: Number.parseFloat(computed.borderWidth),
      boxShadow: computed.boxShadow,
    };
  });
  const [artifactStyle, coreStyle, impactStyle, actionStyle, editorStyle] = await Promise.all([
    getStyle(artifact),
    getStyle(core),
    getStyle(impact),
    getStyle(action),
    getStyle(editor),
  ]);
  expect(artifactStyle.borderWidth).toBe(0);
  expect(artifactStyle.boxShadow).toBe('none');
  expect(coreStyle.borderWidth).toBe(0);
  expect(coreStyle.boxShadow).toBe('none');
  expect(impactStyle.borderBottomWidth).toBe(0);
  expect(actionStyle.borderTopWidth).toBe(0);
  expect(editorStyle.borderWidth).toBeGreaterThanOrEqual(1);
}

test('WorkBuddy IM reminder draft at 1440x900', async ({ page }) => {
  await openReminderDraft(page, { width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);
  await expectScrollbarsDisclosedOnInteraction(page);
  await expectFloatingAssistantWorkbench(page);
  await expectUnifiedCommunicationSurface(page);
  await expectBorderLightReviewCanvas(page);
  await expect(page.getByRole('separator', { name: '调整 TeachBuddy 宽度' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-im-reminder-draft-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM expanded editor keeps its shell fixed after scrolling at 1440x900', async ({ page }) => {
  await openReminderDraft(page, { width: 1440, height: 900 });
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const body = sidecar.locator('[data-scrolled]');
  await sidecar.getByRole('button', { name: '展开编辑群消息正文' }).click();
  await body.hover();
  await page.mouse.wheel(0, 2_400);
  await expect.poll(() => sidecar.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(sidecar.getByText('TeachBuddy', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('textbox', { name: '向 TeachBuddy 输入要求' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('workbuddy-im-expanded-editor-scrolled-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM scrollbars stay quiet until hover or keyboard focus', async ({ page }) => {
  await openReminderDraft(page, { width: 1440, height: 900 });
  await expectScrollbarsDisclosedOnInteraction(page);

  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const body = sidecar.locator('[data-scrolled]');
  const editor = sidecar.getByRole('textbox', { name: '群消息正文' });
  await editor.focus();
  await expect(editor).toBeFocused();
  await expect.poll(() => scrollbarThumbColor(editor)).not.toBe('rgba(0, 0, 0, 0)');
  await expect.poll(() => scrollbarThumbColor(body)).not.toBe('rgba(0, 0, 0, 0)');
});

test('WorkBuddy IM ready state exposes the available simulated class tasks', async ({ page }) => {
  await openWorkBuddyReady(page, { width: 1440, height: 900 });
  const taskGroup = page.getByRole('group', { name: '模拟任务' });
  await expect(taskGroup.getByRole('button')).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('workbuddy-im-two-simulated-tasks-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM weekly preparation notice draft at 1440x900', async ({ page }) => {
  await openWeeklyPreparationDraft(page, { width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);
  await expectFloatingAssistantWorkbench(page);
  await expectBorderLightReviewCanvas(page, '群通知正文', 'workbuddy-weekly-review-artifact');
  await expect(page).toHaveScreenshot('workbuddy-im-weekly-preparation-draft-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM weekly notice expands inside the sidecar at 1440x900', async ({ page }) => {
  await openWeeklyPreparationDraft(page, { width: 1440, height: 900 });
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const sidecarBefore = await sidecar.boundingBox();
  await sidecar.getByRole('button', { name: '展开编辑群通知正文' }).click();
  const editor = sidecar.locator('[data-focused-message-editor="true"]');
  const sidecarAfter = await sidecar.boundingBox();
  await expect(page.getByRole('dialog', { name: '编辑群通知正文' })).toHaveCount(0);
  await expect(sidecar.getByRole('textbox', { name: '群通知正文' })).toBeFocused();
  await expect(editor).toHaveAttribute('data-expanded', 'true');
  expect(sidecarBefore).not.toBeNull();
  expect(sidecarAfter).not.toBeNull();
  expect(Math.abs(sidecarAfter!.width - sidecarBefore!.width)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('workbuddy-im-weekly-focused-editor-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM weekly notice keeps its sidecar width while expanding at 1024x640', async ({ page }) => {
  await openWeeklyPreparationDraft(page, { width: 1024, height: 640 });
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const sidecarBefore = await sidecar.boundingBox();
  await sidecar.getByRole('button', { name: '展开编辑群通知正文' }).click();
  const sidecarAfter = await sidecar.boundingBox();
  const editor = sidecar.getByRole('textbox', { name: '群通知正文' });
  const editorBox = await editor.boundingBox();
  expect(sidecarBefore).not.toBeNull();
  expect(sidecarAfter).not.toBeNull();
  expect(editorBox).not.toBeNull();
  expect(Math.abs(sidecarAfter!.x - sidecarBefore!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(sidecarAfter!.width - sidecarBefore!.width)).toBeLessThanOrEqual(1);
  expect(editorBox!.height).toBeGreaterThanOrEqual(350);
  await expect(sidecar.getByRole('button', { name: '收起群通知正文' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('workbuddy-im-weekly-focused-editor-1024x640.png', { fullPage: true });
});

test('WorkBuddy IM edited checklist exposes an inline restore action', async ({ page }) => {
  await openReminderDraft(page, { width: 1440, height: 900 });
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  await sidecar.getByRole('button', { name: '从动量守恒作业 A 组移除李明' }).click();
  await expect(sidecar.getByRole('button', { name: '还原名单至本次草稿最初生成的范围' })).toBeVisible();
  await expect(sidecar.getByText('4 位学生', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page).toHaveScreenshot('workbuddy-im-edited-checklist-restore-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM three-pane workspace at 1280x800', async ({ page }) => {
  await openReminderDraft(page, { width: 1280, height: 800 });
  await expectNoHorizontalOverflow(page);
  await expectFloatingAssistantWorkbench(page);
  await expectUnifiedCommunicationSurface(page);
  await expectBorderLightReviewCanvas(page);
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const box = await sidecar.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(384);
  expect(box?.width).toBeLessThanOrEqual(520);
  await expect(page).toHaveScreenshot('workbuddy-im-three-pane-1280x800.png', { fullPage: true });
});

test('WorkBuddy guided explanation review at 1440x900', async ({ page }) => {
  await openGuidedExplanationDraft(page, { width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);
  await expectFloatingAssistantWorkbench(page);
  await expect(page).toHaveScreenshot('workbuddy-guided-explanation-review-1440x900.png', { fullPage: true });
});

test('WorkBuddy guided explanation review remains reachable at 1024x640', async ({ page }) => {
  await openGuidedExplanationDraft(page, { width: 1024, height: 640 });
  await page.waitForTimeout(800);
  await expectNoHorizontalOverflow(page);
  const review = page.getByLabel('单题交互讲解待审核');
  await expect(review).toBeVisible();
  await review.getByRole('textbox', { name: '教师审核版完整答案' }).scrollIntoViewIfNeeded();
  await expect(review.getByRole('textbox', { name: '教师审核版完整答案' })).toBeVisible();
  await review.getByRole('textbox', { name: '学生题目' }).scrollIntoViewIfNeeded();
  const sidecarBody = page.getByLabel('TeachBuddy 私密协作窗口').locator('[data-scrolled]');
  await sidecarBody.evaluate((element) => { element.scrollTop = Math.min(420, element.scrollHeight - element.clientHeight); });
  await expect.poll(() => sidecarBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page).toHaveScreenshot('workbuddy-guided-explanation-review-1024x640.png', { fullPage: true });
});

test('WorkBuddy guided explanation exposes editable process and answer controls', async ({ page }) => {
  await openGuidedExplanationDraft(page, { width: 1440, height: 900 });
  const review = page.getByLabel('单题交互讲解待审核');
  const answer = review.getByRole('textbox', { name: '教师审核版完整答案' });
  await answer.fill('教师修订答案：小球 B 碰后以 4.0 m/s 向右运动。');
  await review.getByRole('button', { name: '应用修改' }).scrollIntoViewIfNeeded();
  await expect(review.getByRole('button', { name: '应用修改' })).toBeVisible();
  await expect(review.getByRole('button', { name: '确认保存并发送' })).toBeDisabled();
  await expect(page).toHaveScreenshot('workbuddy-guided-explanation-editable-answer-1440x900.png', { fullPage: true });
});

test('guided explanation message opens as a focused student-facing viewer', async ({ page }) => {
  await openGuidedExplanationDraft(page, { width: 1440, height: 900 });
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  await sidecar.getByRole('button', { name: '确认保存并发送' }).click();
  await expect(sidecar.getByLabel('讲题内容发送成功')).toBeVisible();
  await sidecar.getByRole('button', { name: '查看消息' }).click();
  await page.getByRole('button', { name: '查看分步讲解' }).click();
  await expect(page.getByRole('dialog', { name: '小球正碰：用动量守恒求碰后速度' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-guided-explanation-viewer-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM reminder overlay at 1024x640', async ({ page }) => {
  await openReminderDraft(page, { width: 1024, height: 640 });
  await expectNoHorizontalOverflow(page);
  await expectFloatingAssistantWorkbench(page);
  await expectUnifiedCommunicationSurface(page);
  await expectBorderLightReviewCanvas(page);
  await expect(page.getByRole('separator', { name: '调整 TeachBuddy 宽度' })).not.toBeVisible();
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const box = await sidecar.boundingBox();
  expect(box?.width).toBeGreaterThan(384);
  expect(box?.width).toBeLessThanOrEqual(520);
  await expect(page).toHaveScreenshot('workbuddy-im-reminder-draft-1024x640.png', { fullPage: true });
});

test('WorkBuddy IM sent receipt stays compact at 1440x900', async ({ page }) => {
  await sendReminder(page, { width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);
  await expectFloatingAssistantWorkbench(page);

  const receipt = page.getByRole('status', { name: '班级群消息发送成功' });
  const [box, style] = await Promise.all([
    receipt.boundingBox(),
    receipt.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        borderWidth: Number.parseFloat(computed.borderWidth),
        boxShadow: computed.boxShadow,
      };
    }),
  ]);

  expect(box?.height).toBeLessThanOrEqual(136);
  expect(style.borderWidth).toBe(0);
  expect(style.boxShadow).toBe('none');
  await expect(receipt.getByText('已发送 1 条班级群消息')).toBeVisible();
  await expect(receipt.getByText(/王老师 → 高二物理 3 班/)).toBeVisible();
  await expect(receipt.getByRole('button', { name: '查看群消息' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-im-sent-receipt-1440x900.png', { fullPage: true });
});

test('WorkBuddy IM sent receipt adapts at the 384px minimum panel width', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('classin.message-workspace.workbuddy-width.messages-global', '384');
  });
  await sendReminder(page, { width: 1440, height: 900 });
  await expectNoHorizontalOverflow(page);

  const assistantRegion = page.locator('[data-layout-region="workbuddy-assistant"]');
  const sidecar = page.getByLabel('TeachBuddy 私密协作窗口');
  const receipt = sidecar.getByRole('status', { name: '班级群消息发送成功' });
  const [assistantBox, sidecarBox, receiptBox] = await Promise.all([
    assistantRegion.boundingBox(),
    sidecar.boundingBox(),
    receipt.boundingBox(),
  ]);
  expect(assistantBox?.width).toBe(384);
  expect(sidecarBox?.width).toBeLessThanOrEqual(384);
  expect(receiptBox?.height).toBeLessThanOrEqual(160);
  await expect(receipt.getByText(/王老师 → 高二物理 3 班/)).toBeVisible();
  await expect(receipt.getByRole('button', { name: '查看群消息' })).toBeVisible();
  await expect(page).toHaveScreenshot('workbuddy-im-sent-receipt-384px-1440x900.png', { fullPage: true });
});
