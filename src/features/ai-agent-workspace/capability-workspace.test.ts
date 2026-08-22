import { describe, expect, it } from "vitest";
import {
  CAPABILITY_SURFACE_CONFIGS,
  CONTENT_ITEMS,
  FILE_ITEMS,
  SKILL_ITEMS,
  TASK_SKILL_OPTIONS,
  TOOL_ITEMS,
  executeCapabilityCommand,
  filterCapabilityItems,
  getCapabilitySurface,
  surfaceItems,
  validateSkillImport,
} from "./capability-workspace";

describe("WorkBuddy capability workspace model", () => {
  it("exposes the six approved secondary destinations in order", () => {
    expect(CAPABILITY_SURFACE_CONFIGS.map(({ id }) => id)).toEqual([
      "skills",
      "tools",
      "content",
      "files",
      "schedules",
      "settings",
    ]);
    expect(CAPABILITY_SURFACE_CONFIGS.map(({ label }) => label)).toEqual([
      "技能市场",
      "工具连接",
      "内容资源",
      "我的文件",
      "定时任务",
      "设置",
    ]);
  });

  it("keeps a stable surface configuration and first tab", () => {
    expect(getCapabilitySurface("skills").tabs[0]).toEqual({
      id: "recommended",
      label: "推荐",
    });
    expect(getCapabilitySurface("settings").tabs).toEqual([]);
  });

  it("filters skills by title, description, and source", () => {
    expect(
      filterCapabilityItems(SKILL_ITEMS, "错因", "market").map(({ id }) => id),
    ).toEqual(["skill-homework-cluster"]);
    expect(
      filterCapabilityItems(SKILL_ITEMS, "星河", "market").map(({ id }) => id),
    ).toEqual(["skill-homework-cluster", "skill-geometry-solver"]);
  });

  it("exposes the installed official skills shown in the task picker", () => {
    expect(TASK_SKILL_OPTIONS.map(({ title }) => title)).toEqual([
      "Word 文档",
      "网页设计",
      "文件上传",
      "PDF 文档",
      "PPT 演示文稿",
      "学科专家",
    ]);
    expect(TASK_SKILL_OPTIONS.every(({ source }) => source === "官方")).toBe(true);
  });

  it("validates local and linked Skill imports without claiming a real runtime", () => {
    expect(validateSkillImport({ kind: "file", name: "课堂提问.zip" })).toEqual({
      ok: true,
      title: "课堂提问",
      source: "本地 ZIP",
    });
    expect(validateSkillImport({ kind: "file", name: "notes.txt" })).toEqual({
      ok: false,
      message: "仅支持包含 SKILL.md 的文件夹、ZIP 或 Markdown 文件。",
    });
    expect(
      validateSkillImport({ kind: "url", value: "https://github.com/classin/lesson-skill" }),
    ).toEqual({ ok: true, title: "lesson-skill", source: "GitHub" });
    expect(validateSkillImport({ kind: "url", value: "https://example.com/readme" })).toEqual({
      ok: false,
      message: "请输入有效的 GitHub URL 或 ZIP 下载链接。",
    });
  });

  it("mine tabs only show installed or governed items", () => {
    expect(
      filterCapabilityItems(SKILL_ITEMS, "", "mine").map(({ id }) => id),
    ).toEqual([
      "skill-courseware-structure",
      "skill-lesson-rehearsal",
      "skill-goal-clarifier",
      "skill-teaching-plan",
      "skill-transcript",
    ]);
    expect(
      filterCapabilityItems(TOOL_ITEMS, "", "mine").map(({ id }) => id),
    ).toEqual([
      "tool-classin-official",
      "tool-classin-question-bank",
      "tool-github",
    ]);
  });

  it("filters saved content and source-specific files", () => {
    expect(
      filterCapabilityItems(CONTENT_ITEMS, "", "saved").map(({ id }) => id),
    ).toEqual([
      "content-momentum-review",
      "content-geometry-game",
      "content-lab-assets",
    ]);
    expect(
      filterCapabilityItems(FILE_ITEMS, "", "artifacts").map(({ id }) => id),
    ).toEqual(["file-courseware-v2"]);
    expect(
      filterCapabilityItems(FILE_ITEMS, "", "cloud").map(({ id }) => id),
    ).toEqual(["file-wave-template", "file-restricted-reference"]);
  });

  it("filters active and historical scheduled task views", () => {
    expect(
      filterCapabilityItems(surfaceItems("schedules"), "", "active").map(
        ({ id }) => id,
      ),
    ).toEqual(["schedule-weekly-summary", "schedule-homework-review"]);
    expect(
      filterCapabilityItems(surfaceItems("schedules"), "", "history").map(
        ({ id }) => id,
      ),
    ).toEqual(["schedule-weekly-summary", "schedule-lesson-prep"]);
  });

  it("adapts the six reference tools to ClassIn-facing brand copy", () => {
    expect(TOOL_ITEMS.map(({ title }) => title)).toEqual([
      "ClassIn 官方工具",
      "ClassIn 题库",
      "GitHub",
      "GitLab",
      "Context7",
      "Fetch",
    ]);
    expect(TOOL_ITEMS.map(({ meta }) => meta[0])).toEqual([
      "http",
      "http",
      "stdio",
      "stdio",
      "stdio",
      "stdio",
    ]);
    expect(TOOL_ITEMS.find(({ id }) => id === "tool-github")?.description).toBe(
      "GitHub 平台集成：仓库、Issues、PR、Actions 管理",
    );
  });

  it("keeps every fixture traceable to a source and permission contract", () => {
    for (const item of [
      ...SKILL_ITEMS,
      ...CONTENT_ITEMS,
      ...FILE_ITEMS,
      ...surfaceItems("schedules"),
    ]) {
      expect(item.source.length).toBeGreaterThan(0);
      expect(item.permissions.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
    for (const item of TOOL_ITEMS) {
      expect(["ClassIn", "第三方工具"]).toContain(item.source);
      expect(item.meta).toHaveLength(2);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.permissions).toEqual([]);
    }
  });

  it("normalizes capability mutations through the simulated Adapter seam", () => {
    const result = executeCapabilityCommand(SKILL_ITEMS, {
      itemId: "skill-homework-cluster",
      status: "已安装",
      statusTone: "neutral",
      message: "安装完成",
    });
    expect(result).toMatchObject({
      truth: "[模拟]",
      outcome: "succeeded",
      message: "安装完成",
    });
    expect(
      result.items.find(({ id }) => id === "skill-homework-cluster")?.status,
    ).toBe("已安装");
  });
});
