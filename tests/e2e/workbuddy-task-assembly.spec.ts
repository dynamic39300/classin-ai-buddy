import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openIdealNewTask(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const teacherButton = page.getByRole('button', { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('button', { name: 'TeacherIn', exact: true }).click();
  await primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' }).getByRole('link', { name: '我的任务', exact: true }).click();
}

async function openFileSource(page: Page, source: '本地文件' | '我的文件' | 'ClassIn 空间') {
  await page.getByRole('button', { name: '添加任务材料' }).click();
  await page.getByRole('menuitem', { name: /添加文件/ }).click();
  return page.getByRole('menuitem', { name: new RegExp(source) });
}

test('ideal-full assembles Agent, Skill and all three file sources @a11y', async ({ page }) => {
  await openIdealNewTask(page);

  const quick = page.getByRole('region', { name: '常用 Agent 和 Skill' });
  await expect(quick.getByRole('button')).toHaveCount(11);
  await expect(page.getByText('常用 Agent 和 Skill', { exact: true })).toHaveCount(0);
  await expect(page.getByText('告诉我您想完成的教学工作，我会结合已授权的教学上下文，生成可检查、可修改的结果。')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /核心上下文/ })).toHaveCount(0);
  await expect(page.getByRole('group', { name: '核心上下文摘要' })).toHaveCount(0);
  const quickStrip = page.getByTestId('task-assembly-quick-strip');
  const quickControls = page.getByRole('group', { name: '浏览常用能力' });
  const composerFrame = page.getByRole('textbox', { name: '描述教学任务' }).locator('..');
  const [headingBox, stripBox, controlsBox, composerBox, composerFrameBox, quickBox] = await Promise.all([
    page.getByRole('heading', { name: '老师好，有什么能帮您的？' }).boundingBox(),
    quickStrip.boundingBox(),
    quickControls.boundingBox(),
    page.getByRole('textbox', { name: '描述教学任务' }).boundingBox(),
    composerFrame.boundingBox(),
    quick.boundingBox(),
  ]);
  expect(headingBox).not.toBeNull();
  expect(stripBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(composerFrameBox).not.toBeNull();
  expect(quickBox).not.toBeNull();
  expect(stripBox!.y - (headingBox!.y + headingBox!.height)).toBeGreaterThanOrEqual(24);
  expect(composerBox!.y - (stripBox!.y + stripBox!.height)).toBeGreaterThanOrEqual(12);
  expect(Math.abs((stripBox!.y + stripBox!.height / 2) - (controlsBox!.y + controlsBox!.height / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs(stripBox!.y - controlsBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs((stripBox!.y + stripBox!.height) - (controlsBox!.y + controlsBox!.height))).toBeLessThanOrEqual(1);
  expect(Math.abs(quickBox!.x - composerFrameBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs((quickBox!.x + quickBox!.width) - (composerFrameBox!.x + composerFrameBox!.width))).toBeLessThanOrEqual(1);
  expect(controlsBox!.x).toBeLessThan(stripBox!.x + stripBox!.width);
  const initialScrollLeft = await quickStrip.evaluate((element) => element.scrollLeft);
  await quickControls.getByRole('button', { name: '向右浏览常用能力' }).click();
  await expect.poll(() => quickStrip.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialScrollLeft);
  await expect.poll(() => quickStrip.evaluate((element) => {
    const starts = Array.from(element.querySelectorAll(':scope > button')).map((button) => (button as HTMLElement).offsetLeft);
    return Math.min(...starts.map((start) => Math.abs(start - element.scrollLeft)));
  })).toBeLessThanOrEqual(1);
  await quickControls.getByRole('button', { name: '向左浏览常用能力' }).click();
  await expect.poll(() => quickStrip.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(1);
  await quick.getByRole('button', { name: 'Skill 生成单个课件' }).click();
  await quick.getByRole('button', { name: 'Agent 每日名言' }).click();
  const composer = page.getByRole('textbox', { name: '描述教学任务' });
  await expect(composer).toHaveValue('请结合当前课程主题，推荐一句适合学生的每日名言，并解释其含义与课堂使用方式。');
  await expect(composer).not.toHaveValue(/函数单调性智能课件/);
  await expect(page.getByText('任务材料', { exact: true })).toHaveCount(0);
  await expect(page.getByText('任务材料已更新', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/已加入 Agent.*推荐 Prompt/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: '移除 Skill 生成单个课件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '移除 Agent 每日名言' })).toBeVisible();

  const plus = page.getByRole('button', { name: '添加任务材料' });
  const selectedAgentChip = page.getByRole('button', { name: '移除 Agent 每日名言' }).locator('..');
  const submit = page.getByRole('button', { name: '创建任务' });
  const [plusBox, selectedAgentChipBox, submitBox] = await Promise.all([
    plus.boundingBox(),
    selectedAgentChip.boundingBox(),
    submit.boundingBox(),
  ]);
  expect(plusBox).not.toBeNull();
  expect(selectedAgentChipBox).not.toBeNull();
  expect(submitBox).not.toBeNull();
  expect(selectedAgentChipBox!.x).toBeGreaterThanOrEqual(plusBox!.x + plusBox!.width);
  expect(Math.abs(
    (selectedAgentChipBox!.y + selectedAgentChipBox!.height / 2)
      - (plusBox!.y + plusBox!.height / 2),
  )).toBeLessThanOrEqual(1);
  expect(selectedAgentChipBox!.x + selectedAgentChipBox!.width).toBeLessThan(submitBox!.x);

  const localChoice = await openFileSource(page, '本地文件');
  const chooserPromise = page.waitForEvent('filechooser');
  await localChoice.click();
  const chooser = await chooserPromise;
  await chooser.setFiles([
    'tests/fixtures/task-assembly/课堂观察.md',
    'tests/fixtures/task-assembly/不支持.exe',
  ]);
  await expect(page.getByRole('button', { name: '移除文件 课堂观察.md' })).toBeVisible();
  await expect(page.getByRole('button', { name: '移除文件 不支持.exe' })).toBeVisible();
  await expect(page.getByText('格式不支持')).toBeVisible();
  await expect(page.getByRole('button', { name: '创建任务' })).toBeDisabled();
  await page.getByRole('button', { name: '移除文件 不支持.exe' }).click();

  await (await openFileSource(page, '我的文件')).click();
  const myFiles = page.getByRole('dialog', { name: '从我的文件添加' });
  await expect(myFiles).toBeVisible();
  await myFiles.getByRole('checkbox', { name: /函数单调性课堂笔记\.pdf/ }).check();
  await myFiles.getByRole('button', { name: '添加到任务' }).click();

  await (await openFileSource(page, 'ClassIn 空间')).click();
  const classInSpace = page.getByRole('dialog', { name: '从 ClassIn 空间添加' });
  await expect(classInSpace).toBeVisible();
  await classInSpace.getByRole('textbox', { name: '搜索ClassIn 空间' }).fill('题库');
  await classInSpace.getByRole('checkbox', { name: /函数单调性精选题库\.docx/ }).check();
  await classInSpace.getByRole('button', { name: '添加到任务' }).click();
  await expect(page.getByRole('button', { name: '移除文件 函数单调性精选题库.docx' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('material picker opens above the composer and reveals one level at a time', async ({ page }) => {
  await openIdealNewTask(page);
  const trigger = page.getByRole('button', { name: '添加任务材料' });
  await trigger.click();

  const root = page.getByRole('dialog', { name: '添加任务材料' });
  await expect(root).toBeVisible();
  await expect(root.getByRole('menuitem')).toHaveCount(3);
  const [rootBox, triggerBox] = await Promise.all([root.boundingBox(), trigger.boundingBox()]);
  expect(rootBox).not.toBeNull();
  expect(triggerBox).not.toBeNull();
  expect(rootBox!.y + rootBox!.height).toBeLessThanOrEqual(triggerBox!.y - 7);

  await root.getByRole('menuitem', { name: /Skill/ }).click();
  const nested = page.getByRole('dialog', { name: '选择 Skill' });
  await expect(nested.getByRole('button', { name: '返回添加任务材料' })).toBeVisible();
  await expect(nested.getByRole('textbox', { name: '搜索 Skill' })).toBeFocused();
  await expect(page.getByRole('dialog', { name: '添加任务材料' })).toHaveCount(0);

  const nestedBox = await nested.boundingBox();
  expect(nestedBox).not.toBeNull();
  expect(nestedBox!.y).toBeGreaterThanOrEqual(0);
  expect(nestedBox!.y + nestedBox!.height).toBeLessThanOrEqual(900);
  await nested.getByRole('button', { name: '返回添加任务材料' }).click();
  await expect(page.getByRole('dialog', { name: '添加任务材料' })).toBeVisible();
  await trigger.click();
  await page.setViewportSize({ width: 1024, height: 640 });
  await trigger.click();
  await page.getByRole('menuitem', { name: /Skill/ }).click();
  const compactBox = await page.getByRole('dialog', { name: '选择 Skill' }).boundingBox();
  expect(compactBox).not.toBeNull();
  expect(compactBox!.y).toBeGreaterThanOrEqual(0);
  expect(compactBox!.y + compactBox!.height).toBeLessThanOrEqual(640);
});

test('latest selected capability replaces the previous automatic prompt', async ({ page }) => {
  await openIdealNewTask(page);
  const quick = page.getByRole('region', { name: '常用 Agent 和 Skill' });
  const composer = page.getByRole('textbox', { name: '描述教学任务' });

  await quick.getByRole('button', { name: 'Skill 生成单个课件' }).click();
  await quick.getByRole('button', { name: 'Skill 生成课程方案包' }).click();
  await expect(composer).toHaveValue('从函数单调性课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包');
  await quick.getByRole('button', { name: 'Agent 孔子' }).click();
  await expect(composer).toHaveValue('请从孔子及儒家思想的角度解读当前主题，并给出适合课堂讨论的问题。');
  await expect(page.getByRole('button', { name: '移除 Skill 生成单个课件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '移除 Skill 生成课程方案包' })).toBeVisible();
  await expect(page.getByRole('button', { name: '移除 Agent 孔子' })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 640 });
  const [compactChipBox, compactSubmitBox] = await Promise.all([
    page.getByRole('button', { name: '移除 Agent 孔子' }).locator('..').boundingBox(),
    page.getByRole('button', { name: '创建任务' }).boundingBox(),
  ]);
  expect(compactChipBox).not.toBeNull();
  expect(compactSubmitBox).not.toBeNull();
  expect(compactChipBox!.x + compactChipBox!.width).toBeLessThan(compactSubmitBox!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('created Run keeps an immutable assembly snapshot while class-scoped task data stays isolated', async ({ page }) => {
  await openIdealNewTask(page);
  await page.getByRole('button', { name: 'Skill 生成单个课件' }).click();
  await page.getByRole('button', { name: 'Agent 孔子' }).click();
  await expect(page.getByRole('button', { name: '创建任务' })).toBeEnabled();
  await page.getByRole('button', { name: '创建任务' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\//);

  const linkage = await page.evaluate(() => {
    const session = JSON.parse(sessionStorage.getItem('workbuddy:workspace-session:v4') ?? 'null');
    const snapshotId = session?.coursewareRun?.taskAssemblySnapshotId;
    return { snapshotId, snapshot: snapshotId ? session.taskAssemblySnapshotsById[snapshotId] : null };
  });
  expect(linkage.snapshotId).toMatch(/^task-assembly-single-courseware-/);
  expect(linkage.snapshot?.materials.map((item: { kind: string }) => item.kind)).toEqual(['skill', 'agent']);

  await page.goto('/teacher/classes/physics-3/workbuddy/new?course=course-momentum');
  const classQuick = page.getByRole('region', { name: '常用 Agent 和 Skill' });
  await expect(classQuick).toBeVisible();
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('');
  await classQuick.getByRole('button', { name: 'Skill 生成单个课件' }).click();
  await classQuick.getByRole('button', { name: 'Agent 孔子' }).click();
  await expect(page.getByRole('textbox', { name: '描述教学任务' })).toHaveValue('请从孔子及儒家思想的角度解读当前主题，并给出适合课堂讨论的问题。');
  await expect(page.getByRole('button', { name: '移除 Skill 生成单个课件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '移除 Agent 孔子' })).toBeVisible();
  await page.getByRole('button', { name: '添加任务材料' }).click();
  await expect(page.getByRole('dialog', { name: '添加任务材料' })).toBeVisible();
});
