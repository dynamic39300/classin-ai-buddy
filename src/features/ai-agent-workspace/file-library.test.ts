import { describe, expect, it } from "vitest";
import {
  FILE_ASSET_FIXTURES,
  buildFileAssetView,
  getFileAssetReference,
  type FileAssetQuery,
} from "./file-library";

const ALL_FILES: FileAssetQuery = {
  query: "",
  kind: "all",
  favoriteOnly: false,
};

describe("file asset library module", () => {
  it("groups files by their originating task or teaching project in recent order", () => {
    const view = buildFileAssetView(FILE_ASSET_FIXTURES, ALL_FILES);

    expect(view.resultCount).toBe(6);
    expect(view.groups.map(({ project }) => project.id)).toEqual([
      "project-courseware",
      "project-package",
      "project-homework",
    ]);
    expect(view.groups[0]?.assets.map(({ id }) => id)).toEqual([
      "asset-courseware-pptx",
      "asset-courseware-practice",
      "asset-courseware-script",
    ]);
  });

  it("searches across file, task and teaching context", () => {
    expect(
      buildFileAssetView(FILE_ASSET_FIXTURES, {
        ...ALL_FILES,
        query: "42 份提交",
      }).groups[0]?.project.id,
    ).toBe("project-homework");
    expect(
      buildFileAssetView(FILE_ASSET_FIXTURES, {
        ...ALL_FILES,
        query: "课堂讲解脚本",
      }).groups[0]?.assets.map(({ id }) => id),
    ).toEqual(["asset-courseware-script"]);
  });

  it("combines type and favorite filters without losing project traceability", () => {
    const view = buildFileAssetView(FILE_ASSET_FIXTURES, {
      query: "",
      kind: "学情报告",
      favoriteOnly: true,
    });

    expect(view.resultCount).toBe(1);
    expect(view.groups[0]?.project.runId).toBe("run-homework-review");
    expect(view.groups[0]?.assets[0]?.id).toBe("asset-homework-report");
  });

  it('projects stable Artifact and Space references for downstream commands', () => {
    expect(getFileAssetReference(FILE_ASSET_FIXTURES[0]!)).toEqual({
      artifactRef: { id: 'asset-courseware-pptx', version: 'v2' },
      spaceFileRef: {
        id: 'space-file-courseware-pptx', version: 'v2',
        pathLabel: '我的云盘 / WorkBuddy 产物 / 函数单调性智能课件.pptx',
      },
      teacherInPermission: 'allowed',
    });
  });
});
