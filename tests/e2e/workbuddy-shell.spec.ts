import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher enters the flat AI Agent workspace and returns to ClassIn @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();

  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  const agentEntry = primaryNavigation.getByRole('link', { name: 'AI Agent' });
  await agentEntry.click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(agentEntry).toHaveAttribute('aria-current', 'page');
  const secondaryNavigation = primaryNavigation.getByRole('group', { name: 'AI Agent 二级导航' });
  await expect(secondaryNavigation.getByRole('link', { name: '新建任务' })).toHaveAttribute('aria-current', 'page');
  await expect(secondaryNavigation.getByText('近期任务', { exact: true })).toBeVisible();

  for (const title of [
    '生成函数单调性课件',
    '函数单元课程方案包',
    '分析三班作业共性问题',
    '设计二次函数随堂测验',
    '整理本周学情沟通要点',
    '制作导数概念微课脚本',
  ]) {
    await expect(secondaryNavigation.getByRole('link', { name: title })).toBeVisible();
  }
  await expect(secondaryNavigation.getByRole('link', { name: '规划期中复习任务清单' })).toHaveCount(1);

  for (const destination of ['Skills', 'Tools', '内容', '我的文件', '定时任务', '设置']) {
    await expect(secondaryNavigation.getByRole('link', { name: destination, exact: true })).toBeVisible();
  }
  await expect(secondaryNavigation.getByRole('button', { name: '能力与资源' })).toHaveCount(0);
  await expect(secondaryNavigation.getByLabel('待确认')).toBeVisible();
  await expect(secondaryNavigation.getByLabel('可重试')).toBeVisible();

  await secondaryNavigation.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/tools$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Tools' })).toBeVisible();
  await expect(page.getByText('M3 结构占位 · 将按已审阅 PRD 在 Phase 4 实现')).toBeVisible();

  await primaryNavigation.getByRole('link', { name: '课程表' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '课程表' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'AI Agent 二级导航' })).toHaveCount(0);

  await agentEntry.click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(primaryNavigation.getByRole('group', { name: 'AI Agent 二级导航' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('student navigation does not expose the teacher AI Agent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();

  const primaryNavigation = page.getByRole('navigation', { name: '学生视角主导航' });
  await expect(primaryNavigation.getByRole('link', { name: 'AI Agent' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'AI Agent 二级导航' })).toHaveCount(0);
});

test('teacher prepares either approved task type with structured Core Context', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();

  await expect(page.getByRole('heading', { name: '今天想完成什么教学任务？' })).toBeVisible();
  await expect(page.getByRole('group', { name: '核心上下文摘要' }).getByText('ClassIn 教研中心', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '核心上下文摘要' }).getByText('需要选择教学范围', { exact: true })).toBeVisible();

  const goal = page.getByRole('textbox', { name: '描述教学任务' });
  const createTask = page.getByRole('button', { name: '创建任务' });
  await expect(createTask).toBeDisabled();

  await page.getByRole('button', { name: '生成单个课件' }).click();
  await expect(goal).toHaveValue('为高二物理 3 班设计一份动量守恒模型课件，从碰撞实验进入守恒定律');
  await expect(createTask).toBeDisabled();

  await page.getByRole('button', { name: /核心上下文/ }).click();
  const contextPanel = page.getByRole('complementary', { name: '核心上下文' });
  await contextPanel.getByRole('button', { name: '应用动量课程建议' }).click();
  await contextPanel.getByRole('button', { name: '确认 ContextSnapshot' }).click();
  await contextPanel.getByRole('button', { name: '关闭核心上下文' }).click();
  await expect(createTask).toBeEnabled();

  await page.getByRole('button', { name: '生成课程方案包' }).click();
  await expect(goal).toHaveValue('从动量单元课程目标出发，生成包含课件、作业、测验和录播脚本的课程方案包');

  await page.getByRole('button', { name: '添加附件' }).click();
  await expect(page.getByRole('status')).toContainText('尚未上传真实文件');
  await page.getByRole('button', { name: /核心上下文/ }).click();
  await expect(page.getByRole('complementary', { name: '核心上下文' })).toBeVisible();
});

test('teacher restores a historical Run and controls its single Artifact panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '生成函数单调性课件' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-courseware$/);
  await expect(page.getByRole('heading', { level: 1, name: '生成函数单调性课件' })).toBeVisible();
  await expect(page.getByText('执行中 · 本地模拟')).toBeVisible();
  await expect(page.getByText('教学信息已补齐')).toBeVisible();
  await expect(page.getByText('已生成任务计划')).toBeVisible();
  await expect(page.getByText('正在生成课件初稿')).toBeVisible();

  const artifact = page.getByRole('complementary', { name: '当前任务产物' });
  await expect(artifact).toBeVisible();
  await expect(artifact.getByText('结构预览为本地固定数据，不代表 AI 已真实生成文件。')).toBeVisible();
  await expect(artifact.getByRole('button', { name: '保存到 ClassIn' })).toBeDisabled();

  await page.getByRole('button', { name: '关闭产物' }).click();
  await expect(artifact).toHaveCount(0);
  await page.getByRole('button', { name: '查看产物' }).click();
  await expect(page.getByRole('complementary', { name: '当前任务产物' })).toBeVisible();
  await expect(page.getByRole('button', { name: '展开查看' })).toBeFocused();

  const runComposer = page.getByRole('textbox', { name: '向 Agent 补充要求' });
  await runComposer.fill('把第二个例题换成生活化情境');
  await page.getByRole('button', { name: '发送补充要求' }).click();
  await expect(page.getByRole('status')).toContainText('尚未连接真实 Agent');
  await expect(page.getByRole('region', { name: '本地补充要求记录' })).toContainText('把第二个例题换成生活化情境');
  await page.getByRole('button', { name: '展开查看' }).click();
  await expect(page.getByRole('status')).toContainText('Artifact Focus');
  await expect(page.getByRole('button', { name: '退出聚焦' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '函数单元课程方案包' }).click();
  await expect(page.getByText('待确认 · 本地模拟')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '向 Agent 补充要求' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '修改任务要求' })).toBeVisible();
  await expect(page.getByText('从函数单元课程目标出发，生成课件、作业、测验和录播脚本组成的课程方案包。')).toBeVisible();
  await expect(page.getByRole('complementary', { name: '当前任务产物' }).getByText('函数单元课程方案包', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认并继续（本地 Demo）' }).click();
  await expect(page.getByRole('status')).toContainText('任务仍保持待确认');

  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '整理本周学情沟通要点' }).click();
  await expect(page.getByText('可重试 · 本地模拟')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '修改任务要求' })).toBeVisible();
  await page.getByRole('button', { name: '重试任务（本地 Demo）' }).click();
  await expect(page.getByRole('status')).toContainText('失败状态未改变');

  await page.getByRole('group', { name: 'AI Agent 二级导航' }).getByRole('link', { name: '分析三班作业共性问题' }).click();
  await expect(page.getByText('已完成 · 本地模拟')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Agent 补充要求|修改任务要求/ })).toHaveCount(0);

  await page.goto('/teacher/ai-agent/runs/run-does-not-exist');
  await expect(page.getByRole('heading', { name: '找不到这个任务' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回新建任务' })).toBeVisible();
});

test('teacher manages recent tasks from the flat history section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();

  const secondaryNavigation = page.getByRole('group', { name: 'AI Agent 二级导航' });
  await secondaryNavigation.getByRole('link', { name: '函数单元课程方案包' }).click();
  const moreActions = secondaryNavigation.getByRole('button', { name: '函数单元课程方案包更多操作' });
  await expect(moreActions).toBeVisible();

  await moreActions.focus();
  await page.keyboard.press('Enter');
  await expect(secondaryNavigation.getByRole('menu')).toBeVisible();
  await expect(secondaryNavigation.getByRole('menuitem', { name: '重命名' })).toBeFocused();
  await secondaryNavigation.getByRole('menuitem', { name: '重命名' }).click();
  const renameInput = secondaryNavigation.getByRole('textbox', { name: '重命名任务' });
  await renameInput.fill('函数单元方案包 · 第一版');
  await renameInput.press('Enter');
  await expect(secondaryNavigation.getByRole('button', { name: '函数单元方案包 · 第一版更多操作' })).toBeFocused();
  await expect(secondaryNavigation.getByRole('link', { name: /函数单元方案包 · 第一版/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '函数单元方案包 · 第一版' })).toBeVisible();
  await expect(secondaryNavigation.getByRole('status')).toContainText('当前原型会话中重命名');

  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: '首页' }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();
  await expect(secondaryNavigation.getByRole('link', { name: /函数单元方案包 · 第一版/ })).toBeVisible();
  await secondaryNavigation.getByRole('link', { name: /函数单元方案包 · 第一版/ }).click();

  const renamedMoreActions = secondaryNavigation.getByRole('button', { name: '函数单元方案包 · 第一版更多操作' });
  await renamedMoreActions.click();
  await page.keyboard.press('Escape');
  await expect(secondaryNavigation.getByRole('menu')).toHaveCount(0);
  await expect(renamedMoreActions).toBeFocused();
  await renamedMoreActions.click();
  await secondaryNavigation.getByRole('menuitem', { name: '置顶' }).click();
  await expect(secondaryNavigation.getByRole('status')).toContainText('置顶状态已在当前原型会话中更新');

  await renamedMoreActions.click();
  await secondaryNavigation.getByRole('menuitem', { name: '删除' }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(secondaryNavigation.getByRole('link', { name: /函数单元方案包 · 第一版/ })).toHaveCount(0);
  await expect(secondaryNavigation.getByRole('status')).toContainText('历史中移除');
});

test('WorkBuddy keeps history scrolling, focus and reduced motion explicit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('navigation', { name: '老师视角主导航' }).getByRole('link', { name: 'AI Agent' }).click();

  const secondaryNavigation = page.getByRole('group', { name: 'AI Agent 二级导航' });
  const historyList = secondaryNavigation.getByRole('list', { name: '近期任务列表' });
  const initialScroll = await historyList.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop }));
  expect(initialScroll.scrollHeight).toBeGreaterThan(initialScroll.clientHeight);
  expect(initialScroll.scrollTop).toBe(0);

  await secondaryNavigation.getByRole('link', { name: '规划期中复习任务清单' }).focus();
  await expect.poll(() => historyList.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  const focusStyle = await secondaryNavigation.getByRole('link', { name: '规划期中复习任务清单' }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);

  const longestAnimation = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('*')).map((element) => {
    const duration = getComputedStyle(element).animationDuration.split(',')[0] ?? '0s';
    return Number.parseFloat(duration) || 0;
  })));
  expect(longestAnimation).toBeLessThanOrEqual(0.001);
});
