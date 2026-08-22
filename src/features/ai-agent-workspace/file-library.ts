export type FileAssetKind =
  "课件" | "教案" | "练习" | "学情报告" | "表格" | "素材包";

export type FileAssetProject = Readonly<{
  id: string;
  title: string;
  context: string;
  runId?: string;
}>;

export type FileAsset = Readonly<{
  id: string;
  name: string;
  extension: string;
  kind: FileAssetKind;
  summary: string;
  size: string;
  version: string;
  createdAt: string;
  createdLabel: string;
  status: "可使用" | "等待解析" | "无权访问";
  favorite: boolean;
  reuseCount: number;
  sharedTargets: readonly string[];
  project: FileAssetProject;
  canUseAsContext: boolean;
  canShare: boolean;
}>;

export type FileAssetQuery = Readonly<{
  query: string;
  kind: "all" | FileAssetKind;
  favoriteOnly: boolean;
}>;

export type FileAssetGroup = Readonly<{
  project: FileAssetProject;
  latestCreatedAt: string;
  latestCreatedLabel: string;
  assets: readonly FileAsset[];
}>;

export type FileAssetView = Readonly<{
  groups: readonly FileAssetGroup[];
  resultCount: number;
  favoriteCount: number;
}>;

export const FILE_ASSET_KIND_OPTIONS: readonly FileAssetKind[] = [
  "课件",
  "教案",
  "练习",
  "学情报告",
  "表格",
  "素材包",
];

const COURSEWARE_PROJECT: FileAssetProject = {
  id: "project-courseware",
  title: "生成函数单调性智能课件",
  context: "高一（3）班 / 高中数学 / 函数的性质",
  runId: "run-courseware",
};

const PACKAGE_PROJECT: FileAssetProject = {
  id: "project-package",
  title: "函数单元课程方案包",
  context: "高一（3）班 / 高中数学 / 函数单元",
  runId: "run-lesson-package",
};

const HOMEWORK_PROJECT: FileAssetProject = {
  id: "project-homework",
  title: "分析三班作业共性问题",
  context: "高一（3）班 / 函数作业 #4 / 42 份提交",
  runId: "run-homework-review",
};

export const FILE_ASSET_FIXTURES: readonly FileAsset[] = [
  {
    id: "asset-courseware-pptx",
    name: "函数单调性智能课件.pptx",
    extension: "PPTX",
    kind: "课件",
    summary: "18 页智能课件，包含概念讲解、例题迁移和分层练习。",
    size: "12.4 MB",
    version: "v2",
    createdAt: "2026-08-22T10:08:00+08:00",
    createdLabel: "今天 10:08",
    status: "可使用",
    favorite: true,
    reuseCount: 3,
    sharedTargets: ["高中数学教研组"],
    project: COURSEWARE_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
  {
    id: "asset-courseware-practice",
    name: "函数单调性分层练习.docx",
    extension: "DOCX",
    kind: "练习",
    summary: "基础、提高和迁移三层练习，附答案与解析。",
    size: "186 KB",
    version: "v1",
    createdAt: "2026-08-22T10:06:00+08:00",
    createdLabel: "今天 10:06",
    status: "可使用",
    favorite: false,
    reuseCount: 1,
    sharedTargets: [],
    project: COURSEWARE_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
  {
    id: "asset-courseware-script",
    name: "函数单调性课堂讲解脚本.docx",
    extension: "DOCX",
    kind: "教案",
    summary: "按课件页码组织的课堂讲解脚本和提问建议。",
    size: "94 KB",
    version: "v1",
    createdAt: "2026-08-22T10:04:00+08:00",
    createdLabel: "今天 10:04",
    status: "可使用",
    favorite: false,
    reuseCount: 0,
    sharedTargets: [],
    project: COURSEWARE_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
  {
    id: "asset-package-plan",
    name: "函数单元课程方案.docx",
    extension: "DOCX",
    kind: "教案",
    summary: "函数单元 6 课时课程方案，包含目标、活动和评价安排。",
    size: "242 KB",
    version: "v1",
    createdAt: "2026-08-21T16:42:00+08:00",
    createdLabel: "昨天 16:42",
    status: "可使用",
    favorite: true,
    reuseCount: 2,
    sharedTargets: ["李明老师"],
    project: PACKAGE_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
  {
    id: "asset-package-assessment",
    name: "函数单元形成性评价题库.xlsx",
    extension: "XLSX",
    kind: "表格",
    summary: "按课时和知识点组织的形成性评价题目与答案。",
    size: "128 KB",
    version: "v1",
    createdAt: "2026-08-21T16:38:00+08:00",
    createdLabel: "昨天 16:38",
    status: "可使用",
    favorite: false,
    reuseCount: 1,
    sharedTargets: [],
    project: PACKAGE_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
  {
    id: "asset-homework-report",
    name: "三班函数作业共性问题分析.pdf",
    extension: "PDF",
    kind: "学情报告",
    summary: "三个高频错误、证据摘要和下一课教学建议。",
    size: "1.8 MB",
    version: "v1",
    createdAt: "2026-08-20T18:26:00+08:00",
    createdLabel: "8 月 20 日 18:26",
    status: "可使用",
    favorite: true,
    reuseCount: 4,
    sharedTargets: ["高一（3）班班级群"],
    project: HOMEWORK_PROJECT,
    canUseAsContext: true,
    canShare: true,
  },
];

export function buildFileAssetView(
  assets: readonly FileAsset[],
  filters: FileAssetQuery,
): FileAssetView {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("zh-CN");
  const filtered = assets.filter((asset) => {
    if (filters.kind !== "all" && asset.kind !== filters.kind) return false;
    if (filters.favoriteOnly && !asset.favorite) return false;
    if (!normalizedQuery) return true;
    return [
      asset.name,
      asset.extension,
      asset.kind,
      asset.summary,
      asset.project.title,
      asset.project.context,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(normalizedQuery);
  });

  const grouped = new Map<string, FileAsset[]>();
  for (const asset of filtered) {
    const current = grouped.get(asset.project.id) ?? [];
    grouped.set(asset.project.id, [...current, asset]);
  }

  const groups = [...grouped.values()]
    .map((groupAssets): FileAssetGroup => {
      const assetsByTime = [...groupAssets].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const latest = assetsByTime[0]!;
      return {
        project: latest.project,
        latestCreatedAt: latest.createdAt,
        latestCreatedLabel: latest.createdLabel,
        assets: assetsByTime,
      };
    })
    .sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));

  return {
    groups,
    resultCount: filtered.length,
    favoriteCount: assets.filter((asset) => asset.favorite).length,
  };
}
