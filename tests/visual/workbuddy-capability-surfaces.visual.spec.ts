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

for (const label of [
  "技能市场",
  "工具连接",
  "我的文件",
  "定时任务",
  "设置",
]) {
  test(`${label} high-fidelity surface`, async ({ page }) => {
    await openSurface(page, label);
    await expect(
      page.getByTestId("ai-agent-workspace-layout"),
    ).toHaveScreenshot(`workbuddy-${label}.png`, { animations: "disabled" });
  });
}

test("技能详情 modal fidelity", async ({ page }) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "查看作业错因聚类" }).click();
  await expect(
    page.getByRole("complementary", { name: "作业错因聚类详情" }),
  ).toHaveScreenshot("workbuddy-技能详情.png", { animations: "disabled" });
});

test("技能卡片 hover fidelity", async ({ page }) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "查看作业错因聚类" }).hover();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-技能卡片-hover.png",
    { animations: "disabled" },
  );
});

test("技能添加菜单 fidelity", async ({ page }) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-技能添加菜单.png",
    { animations: "disabled" },
  );
});

test("技能上传 modal fidelity", async ({ page }) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /上传技能/ }).click();
  await expect(page.getByRole("dialog", { name: "上传技能" })).toHaveScreenshot(
    "workbuddy-技能上传.png",
    { animations: "disabled" },
  );
});

test("新任务 Skill selector fidelity", async ({ page }) => {
  await openSurface(page, "技能市场");
  await page.getByRole("button", { name: "添加技能" }).click();
  await page.getByRole("menuitem", { name: /查找技能/ }).click();
  await page.getByRole("button", { name: "选择技能" }).click();
  await expect(page.getByRole("dialog", { name: "选择技能" })).toHaveScreenshot(
    "workbuddy-新任务技能选择.png",
    { animations: "disabled" },
  );
});

test("工具连接 custom modal fidelity", async ({ page }) => {
  await openSurface(page, "工具连接");
  await page.getByRole("button", { name: "自定义" }).click();
  await expect(
    page.getByRole("dialog", { name: "添加工具连接" }),
  ).toHaveScreenshot("workbuddy-工具自定义.png", { animations: "disabled" });
});

test("工具连接 install configuration fidelity", async ({ page }) => {
  await openSurface(page, "工具连接");
  const githubCard = page.locator("article").filter({
    hasText: "GitHub 平台集成：仓库、Issues、PR、Actions 管理",
  });
  await githubCard.getByRole("button", { name: "安装" }).click();
  await expect(
    page.getByRole("dialog", { name: "安装GitHub" }),
  ).toHaveScreenshot("workbuddy-工具安装.png", { animations: "disabled" });
});

test("我的工具 management fidelity", async ({ page }) => {
  await openSurface(page, "工具连接");
  await page.getByRole("tab", { name: "我的工具" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-我的工具.png",
    { animations: "disabled" },
  );
});

test.skip("Dormant Module：内容详情 modal fidelity", async ({ page }) => {
  await openSurface(page, "内容资源");
  await page.getByRole("button", { name: "查看机械波概念演示" }).click();
  await expect(
    page.getByRole("complementary", { name: "机械波概念演示详情" }),
  ).toHaveScreenshot("workbuddy-内容详情.png", { animations: "disabled" });
});

test.skip("Dormant Module：我的作品 dashboard fidelity", async ({ page }) => {
  await openSurface(page, "内容资源");
  await page.getByRole("tab", { name: "我的作品" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-我的作品.png",
    { animations: "disabled" },
  );
});

test("我的文件 detail fidelity", async ({ page }) => {
  await openSurface(page, "我的文件");
  await page
    .getByRole("button", { name: "查看函数单调性智能课件.pptx" })
    .click();
  await expect(
    page.getByRole("complementary", {
      name: "函数单调性智能课件.pptx文件详情",
    }),
  ).toHaveScreenshot("workbuddy-我的文件详情.png", {
    animations: "disabled",
  });
});

test("我的文件 share fidelity", async ({ page }) => {
  await openSurface(page, "我的文件");
  await page
    .getByRole("button", { name: "函数单调性智能课件.pptx分享" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "选择发送位置" }),
  ).toHaveScreenshot("workbuddy-我的文件分享.png", {
    animations: "disabled",
  });
});

test("我的文件 hover fidelity", async ({ page }) => {
  await openSurface(page, "我的文件");
  await page
    .getByRole("button", { name: "查看函数单调性智能课件.pptx" })
    .hover();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-我的文件-hover.png",
    { animations: "disabled" },
  );
});

test("我的文件 type filter fidelity", async ({ page }) => {
  await openSurface(page, "我的文件");
  await page.getByRole("button", { name: "筛选文件类型" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-我的文件-类型筛选.png",
    { animations: "disabled" },
  );
});

test.skip("Dormant Module：发布作品 workspace fidelity", async ({ page }) => {
  await openSurface(page, "内容资源");
  await page.getByRole("button", { name: "发布作品" }).click();
  await expect(page.getByRole("dialog", { name: "发布作品" })).toHaveScreenshot(
    "workbuddy-发布作品.png",
    { animations: "disabled" },
  );
});

test("定时任务 creation modal fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page.getByRole("button", { name: "新建任务" }).click();
  await expect(
    page.getByRole("dialog", { name: "新建定时任务" }),
  ).toHaveScreenshot("workbuddy-定时任务创建.png", { animations: "disabled" });
});

test("定时任务 notification selector fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建定时任务" });
  await dialog.getByRole("button", { name: "IM 通知" }).click();
  await expect(dialog).toHaveScreenshot("workbuddy-定时任务通知渠道.png", {
    animations: "disabled",
  });
});

test("定时任务 created card fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-定时任务创建完成.png",
    { animations: "disabled" },
  );
});

test("定时任务 multiple card hierarchy fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建定时任务" });
  await dialog.getByRole("textbox", { name: "标题" }).fill("每周作业复盘");
  await dialog.getByRole("textbox", { name: "提示词" }).fill("每周五整理本周作业共性问题并生成教学建议");
  await dialog.getByRole("textbox", { name: "执行日期" }).fill("2026/8/22");
  await dialog.getByRole("button", { name: "创建任务" }).click();
  await page.getByRole("checkbox", { name: "每周作业复盘停用" }).click();
  await page
    .getByTestId("ai-agent-workspace-layout")
    .getByRole("heading", { name: "定时任务", exact: true })
    .click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-定时任务多卡片.png",
    { animations: "disabled" },
  );
});

test("定时任务 card hover fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page
    .getByRole("article", { name: "定时任务：开课前 10 分钟提醒老师上课" })
    .hover();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-定时任务卡片-hover.png",
    { animations: "disabled" },
  );
});

test("定时任务 action menu fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page
    .getByRole("button", { name: "开课前 10 分钟提醒老师上课更多操作" })
    .click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-定时任务操作菜单.png",
    { animations: "disabled" },
  );
});

test("定时任务 running history fidelity", async ({ page }) => {
  await openSurface(page, "定时任务");
  await page
    .getByRole("button", { name: "开课前 10 分钟提醒老师上课更多操作" })
    .click();
  await page.getByRole("menuitem", { name: "立即运行" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-定时任务运行中.png",
    { animations: "disabled" },
  );
});

test("模型设置 split view fidelity", async ({ page }) => {
  await openSurface(page, "设置");
  await page.getByRole("button", { name: "模型" }).click();
  await expect(page.getByTestId("ai-agent-workspace-layout")).toHaveScreenshot(
    "workbuddy-模型设置.png",
    { animations: "disabled" },
  );
});

for (const label of [
  "技能市场",
  "工具连接",
  "我的文件",
  "定时任务",
  "设置",
]) {
  test(`${label} compact surface`, async ({ page }) => {
    await openSurface(page, label);
    await page.setViewportSize({ width: 1000, height: 768 });
    await expect(
      page.getByTestId("ai-agent-workspace-layout"),
    ).toHaveScreenshot(`workbuddy-${label}-compact.png`, {
      animations: "disabled",
    });
  });
}
