import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher generates a quiz, creates only a draft, then reviews and publishes it in class detail @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  const primaryNavigation = page.getByRole('navigation', { name: '老师视角主导航' });
  await primaryNavigation.getByRole('button', { name: 'TeacherIn', exact: true }).click();
  await primaryNavigation.getByRole('group', { name: 'TeacherIn 二级导航' }).getByRole('link', { name: '我的任务', exact: true }).click();

  await page.getByRole('button', { name: 'Skill 生成测验' }).click();
  await expect(page.getByRole('button', { name: '创建任务' })).toBeEnabled();
  await page.getByRole('button', { name: '创建任务' }).click();

  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-quiz-activity-1$/);
  await expect(page.getByRole('heading', { name: '生成测验并创建活动草稿' })).toBeVisible();
  await expect(page.getByText('只创建教师可见草稿')).toBeVisible();
  const composer = page.getByRole('textbox', { name: '向 TeacherIn 补充要求' });
  await composer.fill('解析里请突出正方向约定。');
  await page.getByRole('button', { name: '发送补充要求' }).click();
  await expect(page.getByText('解析里请突出正方向约定。')).toBeVisible();
  const brief = page.getByRole('article', { name: '确认试卷结构' });
  await expect(brief.getByRole('checkbox', { name: '单选题' })).toBeChecked();
  await brief.getByRole('spinbutton', { name: '试卷总分' }).fill('100');
  await expect(page.getByRole('button', { name: '产出 · 0' })).toBeDisabled();
  await brief.getByRole('button', { name: '确认以上要求并生成' }).click();
  await expect(page.getByRole('status', { name: '测验生成进度' })).toContainText('分析测评目标');
  await expect(page.getByRole('button', { name: '开始生成试卷' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '继续设置测验活动' })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/runs\/run-quiz-activity-1$/);
  await expect(page.getByRole('status', { name: '测验生成进度' })).toBeVisible();

  await expect(page.getByRole('button', { name: '查看生成的测验试卷' })).toBeVisible();
  await expect(page.getByRole('article', { name: '审阅并确认测验试卷' })).toBeVisible();
  await expect(page.getByRole('article', { name: '测验活动参数' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '产出 · 1' })).toBeEnabled();
  const auxiliary = page.getByRole('complementary', { name: '任务辅助区' });
  await expect(auxiliary.getByRole('tab', { name: '产出 · 1' })).toHaveAttribute('aria-selected', 'true');
  const output = auxiliary.getByRole('region', { name: '测验试卷产出' });
  await expect(output.getByText('5 题', { exact: true })).toBeVisible();
  await expect(output.getByText('100 分', { exact: true })).toBeVisible();
  await expect(output.getByText('系统机械能一定不变', { exact: true })).toBeVisible();
  const applicationQuestion = output.getByRole('listitem').filter({ hasText: '质量 0.20 kg 的 A 球' });
  await applicationQuestion.getByText('查看答案与解析').click();
  await expect(applicationQuestion).toContainText('4.0 m/s，向右');
  await auxiliary.getByRole('tab', { name: '上下文' }).click();
  await expect(auxiliary.getByRole('complementary', { name: '核心上下文' })).toBeVisible();
  await auxiliary.getByRole('tab', { name: '产出 · 1' }).click();
  await page.getByRole('button', { name: '收起辅助区' }).click();
  await expect(auxiliary).toHaveCount(0);
  await page.getByRole('article', { name: '审阅并确认测验试卷' }).getByRole('button', { name: '打开试卷审阅' }).click();
  await page.getByRole('complementary', { name: '任务辅助区' }).getByRole('button', { name: '确认试卷内容，继续设置活动' }).click();
  await expect(page.getByText('试卷内容已确认')).toBeVisible();

  const settings = page.getByRole('article', { name: '测验活动参数' });
  await expect(settings).toBeVisible();
  await settings.getByRole('textbox', { name: '活动标题' }).fill('动量守恒课后诊断测验');
  await settings.getByLabel('截止时间').fill('');
  await settings.getByRole('button', { name: '准备创建草稿' }).click();
  await expect(settings.getByRole('alert')).toContainText('请输入有效日期');
  await settings.getByLabel('截止时间').fill('2026-08-26T22:00');
  await settings.getByRole('button', { name: '准备创建草稿' }).click();
  const approval = page.getByRole('article', { name: '创建测验活动草稿确认' });
  await expect(approval.getByText('将创建草稿，不会发布', { exact: true })).toBeVisible();
  await approval.getByRole('button', { name: '确认创建草稿' }).click();

  const receipt = page.getByRole('article', { name: '测验活动草稿执行回执' });
  await expect(receipt.getByText('测验活动草稿已创建', { exact: true })).toBeVisible();
  await expect(receipt).toContainText('尚未发布');
  await page.reload();
  await expect(page.getByRole('article', { name: '测验活动草稿执行回执' })).toContainText('测验活动草稿已创建');
  await receipt.getByRole('link', { name: '前往班级课程详情审阅' }).click();

  await expect(page).toHaveURL(/\/teacher\/classes\/physics-3/);
  const activity = page.locator('[data-activity-id^="activity-momentum-unit-quiz"]');
  await expect(activity).toContainText('动量守恒课后诊断测验');
  await expect(activity).toContainText('草稿');
  await expect(activity).toContainText('仅老师可见');

  await activity.getByRole('button', { name: '编辑测验' }).click();
  let editor = page.getByRole('dialog', { name: '编辑测验草稿' });
  await expect(editor.getByRole('button', { name: '关闭编辑测验草稿' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await activity.getByRole('button', { name: '编辑测验' }).click();
  editor = page.getByRole('dialog', { name: '编辑测验草稿' });
  await editor.getByRole('textbox', { name: '活动说明' }).fill('教师已复核题目、答案与时间。');
  await editor.getByRole('textbox', { name: '第 5 题标准答案' }).fill('4.0 m/s，方向向右（教师已复核）');
  await editor.getByRole('combobox', { name: '评分方案' }).selectOption('percentage');
  await editor.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('status')).toContainText('仍未发布');

  await page.getByRole('button', { name: '切换至学生' }).click();
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button').filter({ hasText: '进入班级' }).click();
  await expect(page.getByText('动量守恒课后诊断测验', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '切换至老师' }).click();
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button').filter({ hasText: '进入班级' }).click();
  await activity.getByRole('button', { name: '发布' }).click();
  const publish = page.getByRole('dialog', { name: '确认发布测验' });
  await expect(publish).toContainText('当前是教师可见草稿');
  await publish.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page.getByRole('status', { name: '测验发布回执' })).toContainText('学生课程目录现在可见');
  await expect(activity).toContainText('已发布');

  const teacherAccessibility = await new AxeBuilder({ page }).analyze();
  expect(teacherAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: '切换至学生' }).click();
  await page.getByRole('button', { name: '班课管理' }).click();
  await page.getByRole('link', { name: '我的班级' }).click();
  await page.getByRole('row').filter({ hasText: '高二物理 3 班' }).getByRole('button').filter({ hasText: '进入班级' }).click();
  await expect(page.locator('[data-activity-id^="activity-momentum-unit-quiz"]').filter({ hasText: '动量守恒课后诊断测验' })).toBeVisible();

  const studentAccessibility = await new AxeBuilder({ page }).analyze();
  expect(studentAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});
