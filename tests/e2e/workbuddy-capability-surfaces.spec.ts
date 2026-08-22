import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSurface(page: Page, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const teacherButton = page.getByRole("button", { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  await page
    .getByRole("navigation", { name: "老师视角主导航" })
    .getByRole("link", { name: "Work Buddy" })
    .click();
  await page
    .getByRole("group", { name: "Work Buddy 二级导航" })
    .getByRole("link", { name: label, exact: true })
    .click();
  await expect(
    page.getByRole("banner").getByRole("heading", { level: 1, name: label }),
  ).toBeVisible();
}

test("skills market supports search, detail, install and use in task", async ({
  page,
}) => {
  await openSurface(page, "技能市场");
  await expect(page.getByRole("tab", { name: "推荐" })).toBeVisible();
  await page.getByRole("textbox", { name: "搜索技能市场" }).fill("错因");
  await expect(
    page.getByRole("button", { name: "查看作业错因聚类" }),
  ).toBeVisible();
  const skillCard = page.getByRole("button", { name: "查看作业错因聚类" });
  await skillCard.hover();
  await skillCard.focus();
  await expect(skillCard).toBeFocused();
  await skillCard.click();
  await expect(
    page.getByRole("complementary", { name: "作业错因聚类详情" }),
  ).toContainText("读取作业提交摘要");
  await page.getByRole("button", { name: "安装 Skill" }).click();
  await expect(page.getByRole("dialog", { name: /确认安装/ })).toBeVisible();
  await page.getByRole("button", { name: "确认安装" }).click();
  await expect(page.getByRole("status")).toContainText("已安装");
  await expect(page.getByRole("button", { name: "启用 Skill" })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "去使用" }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(page.getByRole("textbox", { name: "描述教学任务" })).toHaveValue(
    "使用“作业错因聚类”帮我完成：",
  );
  await expect(
    page.getByRole("button", { name: "移除已选技能 作业错因聚类" }),
  ).toBeVisible();
});

test("skills add menu supports recoverable upload and simulated import", async ({
  page,
}) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  const menu = page.getByRole("menu", { name: "添加技能方式" });
  await expect(menu.getByRole("menuitem", { name: /查找技能/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /上传技能/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /创建技能/ })).toBeVisible();
  await menu.getByRole("menuitem", { name: /上传技能/ }).click();

  let upload = page.getByRole("dialog", { name: "上传技能" });
  await upload.getByRole("button", { name: "关闭上传技能" }).click();
  await expect(page.getByRole("button", { name: "添加技能" })).toBeFocused();
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /上传技能/ }).click();
  upload = page.getByRole("dialog", { name: "上传技能" });
  await upload
    .getByRole("textbox", { name: "GitHub URL 或 ZIP URL" })
    .fill("https://example.com/readme");
  await upload.getByRole("button", { name: "添加", exact: true }).click();
  await expect(upload.getByRole("alert")).toContainText(
    "GitHub URL 或 ZIP 下载链接",
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
  await upload
    .getByRole("textbox", { name: "GitHub URL 或 ZIP URL" })
    .fill("https://github.com/classin/lesson-skill");
  await upload.getByRole("button", { name: "添加", exact: true }).click();

  await expect(page.getByRole("tab", { name: "我的 Skills" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "查看lesson-skill" }),
  ).toContainText("已安装");
  await expect(page.getByRole("status")).toContainText(
    "[模拟] lesson-skill 已添加",
  );
});

test("find, create and direct selection keep Skill use inside the new-task draft", async ({
  page,
}) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /查找技能/ }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(page.getByRole("textbox", { name: "描述教学任务" })).toHaveValue(
    "帮我找一个技能，这个技能是为了：",
  );
  await expect(page.getByText("查找技能", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "移除已选技能 查找技能" }).click();
  await page.getByRole("button", { name: "选择技能" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "选择技能" })).toBeFocused();
  await page.getByRole("button", { name: "选择技能" }).click();
  const picker = page.getByRole("dialog", { name: "选择技能" });
  await picker.getByRole("textbox", { name: "搜索技能" }).fill("PPT");
  await picker.getByRole("button", { name: /PPT 演示文稿/ }).click();
  await expect(page.getByText("PPT 演示文稿", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "移除已选技能 PPT 演示文稿" }),
  ).toBeVisible();

  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /创建技能/ }).click();
  await expect(page.getByRole("textbox", { name: "描述教学任务" })).toHaveValue(
    "帮我创建一个新技能，这个技能是为了：",
  );
  await expect(page.getByText("技能创建器", { exact: true })).toBeVisible();
});

test("tool connections use ClassIn brand copy and preserve install configuration", async ({
  page,
}) => {
  await openSurface(page, "工具连接");
  await expect(
    page.getByText("ClassIn 官方工具", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("ClassIn 题库", { exact: true })).toBeVisible();
  await expect(page.getByText("ClassIn 托管连接", { exact: true })).toHaveCount(
    2,
  );
  await expect(page.getByText("GitLab", { exact: true })).toBeVisible();
  await expect(page.getByText("Context7", { exact: true })).toBeVisible();
  await expect(page.getByText("Fetch", { exact: true })).toBeVisible();
  const githubCard = page.locator("article").filter({
    hasText: "GitHub 平台集成：仓库、Issues、PR、Actions 管理",
  });
  await githubCard.getByRole("button", { name: "安装" }).click();
  const install = page.getByRole("dialog", { name: "安装GitHub" });
  await expect(install.getByRole("textbox", { name: "传输类型" })).toHaveValue(
    "标准输入输出（stdio）",
  );
  await expect(install.getByRole("textbox", { name: "命令" })).toHaveValue(
    "npx",
  );
  await expect(install.getByRole("textbox", { name: "参数" })).toContainText(
    "@modelcontextprotocol/server-github",
  );
  await expect(
    install.getByRole("button", { name: /立即运行|创建任务/ }),
  ).toHaveCount(0);
  await install.getByRole("button", { name: "安装" }).click();
  await expect(page.getByRole("status")).toContainText("GitHub 已安装");
  await page.getByRole("tab", { name: "我的工具" }).click();
  await expect(page.getByRole("button", { name: "编辑GitHub" })).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "GitHub启用状态" }),
  ).toBeChecked();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("custom tool creation returns a managed connection card", async ({
  page,
}) => {
  await openSurface(page, "工具连接");
  await page.getByRole("button", { name: "自定义" }).click();
  await page.getByRole("textbox", { name: "工具名称" }).fill("教研资料索引");
  await page.getByRole("combobox", { name: "连接类型" }).selectOption("http");
  await page
    .getByRole("textbox", { name: "Endpoint" })
    .fill("https://example.test/mcp");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("status")).toContainText("已添加");
  await expect(page.getByText("教研资料索引", { exact: true })).toBeVisible();
});

test("content and files preserve task entry as an explicit action", async ({
  page,
}) => {
  await openSurface(page, "内容资源");
  await page
    .getByRole("combobox", { name: "筛选内容类型" })
    .selectOption("课件");
  await expect(
    page.getByRole("button", { name: "查看机械波概念演示" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "查看机械波概念演示" }).click();
  await page.getByRole("button", { name: "改编到新任务" }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await openSurface(page, "我的文件");
  await page
    .getByRole("button", { name: "查看函数单调性智能课件.pptx" })
    .click();
  await expect(
    page.getByRole("complementary", {
      name: "函数单调性智能课件.pptx文件详情",
    }),
  ).toContainText("生成函数单调性智能课件");
  await page.getByRole("button", { name: "作为上下文", exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(page.getByRole("textbox", { name: "描述教学任务" })).toHaveValue(
    /将“函数单调性智能课件\.pptx”作为当前教学任务的参考 Context。/,
  );
});

test("files support task traceability, cross-field search and class-group sharing", async ({
  page,
}) => {
  await openSurface(page, "我的文件");
  await expect(page.getByRole("button", { name: "添加文件" })).toHaveCount(0);
  await expect(page.getByText("教师上传", { exact: true })).toHaveCount(0);
  await expect(page.getByText("组织共享", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "按任务分组的 AI 协作文件" }),
  ).toContainText("生成函数单调性智能课件");
  await expect(page.getByText("今天 10:08", { exact: true })).toBeVisible();

  const typeFilter = page.getByRole("button", { name: "筛选文件类型" });
  await typeFilter.click();
  const typeOptions = page.getByRole("listbox", { name: "文件类型选项" });
  await expect(typeOptions).toBeVisible();
  await expect(
    typeOptions.getByRole("option", { name: "全部类型" }),
  ).toHaveAttribute("aria-selected", "true");
  await typeOptions.getByRole("option", { name: "表格" }).click();
  await expect(typeFilter).toHaveText("表格");
  await expect(
    page.getByRole("button", { name: "查看函数单元形成性评价题库.xlsx" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "查看函数单调性智能课件.pptx" }),
  ).toHaveCount(0);
  await typeFilter.click();
  await typeOptions.getByRole("option", { name: "全部类型" }).click();
  await typeFilter.focus();
  await page.keyboard.press("ArrowDown");
  await expect(typeOptions).toBeVisible();
  await page.keyboard.press("End");
  await expect(
    typeOptions.getByRole("option", { name: "素材包" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(typeOptions).toBeHidden();
  await expect(typeFilter).toBeFocused();

  await page.getByPlaceholder("搜索文件、任务或课程").fill("42 份提交");
  await expect(
    page.getByText("分析三班作业共性问题", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("函数单元课程方案包", { exact: true }),
  ).toHaveCount(0);

  await page.getByPlaceholder("搜索文件、任务或课程").clear();
  await page
    .getByRole("button", { name: "函数单调性智能课件.pptx分享" })
    .click();
  const shareDialog = page.getByRole("dialog", { name: "选择发送位置" });
  await shareDialog.getByRole("radio", { name: /高一（3）班班级群/ }).check();
  await shareDialog.getByRole("button", { name: "发送" }).click();
  await expect(page.locator("p[role='status']")).toContainText(
    "[模拟] 函数单调性智能课件.pptx 已发送到高一（3）班班级群",
  );

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("content supports my works dashboard and four-step publishing", async ({
  page,
}) => {
  await openSurface(page, "内容资源");
  await page.getByRole("tab", { name: "我的作品" }).click();
  await expect(
    page.getByRole("region", { name: "我的作品概览" }),
  ).toContainText("被复用");
  await page.getByRole("button", { name: "发布作品" }).click();
  const publish = page.getByRole("dialog", { name: "发布作品" });
  await expect(publish).toContainText("上传作品文件");
  await publish.getByRole("button", { name: "下一步" }).click();
  await expect(publish).toContainText("完善作品信息");
  await publish.getByRole("button", { name: "下一步" }).click();
  await expect(publish).toContainText("设置可见与复用范围");
  await publish.getByRole("button", { name: "下一步" }).click();
  await expect(publish).toContainText("准备提交审核");
  await publish.getByRole("button", { name: "提交审核", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("作品已提交审核");
});

test("scheduled tasks reproduce the create, edit and running-history journey", async ({
  page,
}) => {
  await openSurface(page, "定时任务");
  await page.getByRole("button", { name: "新建任务" }).click();
  const createDialog = page.getByRole("dialog", { name: "新建定时任务" });
  await expect(
    createDialog.getByPlaceholder("ClassIn Space / 我的云盘"),
  ).toBeVisible();
  await createDialog.getByRole("button", { name: "关闭" }).click();
  await expect(
    page.getByRole("heading", { name: "开课前 10 分钟提醒老师上课" }),
  ).toBeVisible();
  await expect(page.getByText("每天 · 09:00")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "开课前 10 分钟提醒老师上课停用" })
    .click();
  await expect(page.getByText("已停用")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "开课前 10 分钟提醒老师上课启用" })
    .click();
  await page
    .getByRole("button", { name: "开课前 10 分钟提醒老师上课更多操作" })
    .click();
  await page.getByRole("menuitem", { name: "编辑" }).click();
  const editDialog = page.getByRole("dialog", { name: "编辑定时任务" });
  await expect(editDialog.getByRole("textbox", { name: "标题" })).toHaveValue(
    "开课前 10 分钟提醒老师上课",
  );
  await editDialog.getByRole("button", { name: "保存" }).click();
  await page
    .getByRole("button", { name: "开课前 10 分钟提醒老师上课更多操作" })
    .click();
  await page.getByRole("menuitem", { name: "立即运行" }).click();
  await expect(
    page.getByRole("table", { name: "定时任务运行历史" }),
  ).toContainText("2026/8/20 10:37:24");
  await expect(
    page.getByRole("table", { name: "定时任务运行历史" }),
  ).toContainText("运行中");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("scheduled tasks can be deleted back to the reference empty state", async ({
  page,
}) => {
  await openSurface(page, "定时任务");
  await page
    .getByRole("button", { name: "开课前 10 分钟提醒老师上课更多操作" })
    .click();
  await page.getByRole("menuitem", { name: "删除" }).click();
  await expect(
    page.getByText("创建定时任务，让 AI 按计划自动执行"),
  ).toBeVisible();
});

test("scheduled task cards remain individually scannable as the list grows", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建定时任务" });
  await dialog.getByRole("textbox", { name: "标题" }).fill("每周作业复盘");
  await dialog.getByRole("textbox", { name: "提示词" }).fill("每周五整理本周作业共性问题并生成教学建议");
  await dialog.getByRole("textbox", { name: "执行日期" }).fill("2026/8/22");
  await dialog.getByRole("button", { name: "创建任务" }).click();

  const cards = page.getByRole("article", { name: /定时任务：/ });
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole("article", { name: "定时任务：开课前 10 分钟提醒老师上课" })).toBeVisible();
  const secondCard = page.getByRole("article", { name: "定时任务：每周作业复盘" });
  await expect(secondCard).toContainText("执行计划");
  await expect(secondCard).toContainText("2026/8/22 · 09:00");
  await secondCard.getByRole("checkbox", { name: "每周作业复盘停用" }).click();
  await expect(secondCard).toHaveAttribute("data-enabled", "false");

  const firstBox = await cards.nth(0).boundingBox();
  const secondBox = await cards.nth(1).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    ),
  ).toEqual([]);
});

test("settings offer grouped controls", async ({ page }) => {
  await openSurface(page, "设置");
  await expect(
    page.getByRole("navigation", { name: "Work Buddy 设置分组" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "模型" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "模型" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByRole("status")).toContainText("模型连接测试完成");
});

test("capability surfaces remain usable in compact desktop without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.goto("/");
  const teacherButton = page.getByRole("button", { name: /老师视角/ });
  if (await teacherButton.count()) await teacherButton.click();
  await page
    .getByRole("navigation", { name: "老师视角主导航" })
    .getByRole("link", { name: "Work Buddy" })
    .click();
  await page
    .getByRole("group", { name: "Work Buddy 二级导航" })
    .getByRole("link", { name: "工具连接", exact: true })
    .click();
  await expect(
    page
      .getByTestId("ai-agent-workspace-layout")
      .getByRole("heading", { level: 1, name: "工具连接" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  await page
    .getByRole("group", { name: "Work Buddy 二级导航" })
    .getByRole("link", { name: "技能市场", exact: true })
    .click();
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /上传技能/ }).click();
  const uploadBox = await page
    .getByRole("dialog", { name: "上传技能" })
    .boundingBox();
  expect(uploadBox).not.toBeNull();
  expect(uploadBox!.x).toBeGreaterThanOrEqual(0);
  expect(uploadBox!.x + uploadBox!.width).toBeLessThanOrEqual(1000);
  await page.getByRole("button", { name: "关闭上传技能" }).click();

  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /查找技能/ }).click();
  await page.getByRole("button", { name: "选择技能" }).click();
  const pickerBox = await page
    .getByRole("dialog", { name: "选择技能" })
    .boundingBox();
  expect(pickerBox).not.toBeNull();
  expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
  expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(1000);
});
