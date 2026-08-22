import type { LucideIcon } from "lucide-react";
import { WORKBUDDY_CAPABILITIES } from "./capability-registry";

export type CapabilitySurfaceId =
  "skills" | "tools" | "content" | "files" | "schedules" | "settings";
export type CapabilityTab = { id: string; label: string };
export type CapabilityStatus =
  | "已启用"
  | "可安装"
  | "更新可用"
  | "已安装"
  | "已停用"
  | "已连接"
  | "认证失败"
  | "策略阻断"
  | "待连接"
  | "可改编"
  | "已收藏"
  | "审核中"
  | "已解析"
  | "已同步"
  | "等待解析"
  | "无权访问"
  | "已阻断";
export type CapabilityAction =
  | "connect"
  | "install"
  | "update"
  | "enable"
  | "disable"
  | "toggle-schedule"
  | "favorite"
  | "test"
  | "edit"
  | "preview"
  | "source"
  | "history"
  | "details"
  | "run";
export type CapabilityCommand = Readonly<{
  itemId: string;
  status: CapabilityStatus;
  statusTone: CapabilityItem["statusTone"];
  message: string;
}>;
export type CapabilityCommandResult = Readonly<{
  truth: "[模拟]";
  outcome: "succeeded" | "blocked";
  items: readonly CapabilityItem[];
  message: string;
}>;

export type CapabilityItem = Readonly<{
  id: string;
  truth?: "[模拟]";
  title: string;
  subtitle: string;
  status: CapabilityStatus;
  statusTone: "success" | "warning" | "danger" | "neutral" | "info";
  meta: readonly string[];
  tags: readonly string[];
  description: string;
  source: string;
  version?: string;
  permissions: readonly string[];
}>;

export type TaskSkillOption = Readonly<{
  id: string;
  title: string;
  description: string;
  source: "官方";
}>;

export type SkillImportCandidate =
  | Readonly<{ kind: "file"; name: string }>
  | Readonly<{ kind: "folder"; name: string }>
  | Readonly<{ kind: "url"; value: string }>;

export type SkillImportValidation = Readonly<
  | { ok: true; title: string; source: string }
  | { ok: false; message: string }
>;

export const TASK_SKILL_OPTIONS: readonly TaskSkillOption[] = [
  {
    id: "skill-word-document",
    title: "Word 文档",
    description: "生成结构清晰、可交付的 Word 文档草稿",
    source: "官方",
  },
  {
    id: "skill-web-design",
    title: "网页设计",
    description: "设计并生成可预览的网页内容",
    source: "官方",
  },
  {
    id: "skill-file-upload",
    title: "文件上传",
    description: "读取本次任务中明确选择的文件资料",
    source: "官方",
  },
  {
    id: "skill-pdf-document",
    title: "PDF 文档",
    description: "生成适合阅读与分发的 PDF 文档",
    source: "官方",
  },
  {
    id: "skill-presentation",
    title: "PPT 演示文稿",
    description: "生成多页课件与演示文稿草稿",
    source: "官方",
  },
  {
    id: "skill-subject-expert",
    title: "学科专家",
    description: "按学科知识与教学目标辅助任务规划",
    source: "官方",
  },
];

export function validateSkillImport(
  candidate: SkillImportCandidate,
): SkillImportValidation {
  if (candidate.kind === "folder") {
    const title = candidate.name.trim() || "本地 Skill";
    return { ok: true, title, source: "本地文件夹" };
  }
  if (candidate.kind === "file") {
    const name = candidate.name.trim();
    if (!/\.(?:md|zip)$/i.test(name)) {
      return { ok: false, message: "仅支持包含 SKILL.md 的文件夹、ZIP 或 Markdown 文件。" };
    }
    return {
      ok: true,
      title: name.replace(/\.(?:md|zip)$/i, "") || "本地 Skill",
      source: name.toLowerCase().endsWith(".zip") ? "本地 ZIP" : "本地 Markdown",
    };
  }
  try {
    const url = new URL(candidate.value.trim());
    const github = url.hostname === "github.com" || url.hostname.endsWith(".github.com");
    const zip = url.pathname.toLowerCase().endsWith(".zip");
    if (!/^https?:$/.test(url.protocol) || (!github && !zip)) throw new Error("unsupported");
    const lastSegment = url.pathname.split("/").filter(Boolean).at(-1) ?? "远程 Skill";
    return {
      ok: true,
      title: lastSegment.replace(/\.zip$/i, "") || "远程 Skill",
      source: github ? "GitHub" : "ZIP 链接",
    };
  } catch {
    return { ok: false, message: "请输入有效的 GitHub URL 或 ZIP 下载链接。" };
  }
}

export type CapabilitySurfaceConfig = Readonly<{
  id: CapabilitySurfaceId;
  label: string;
  description: string;
  icon: LucideIcon;
  tabs: readonly CapabilityTab[];
}>;

const CAPABILITY_TABS: Record<CapabilitySurfaceId, readonly CapabilityTab[]> = {
  skills: [
    { id: "recommended", label: "推荐" },
    { id: "market", label: "技能广场" },
    { id: "mine", label: "我的 Skills" },
  ],
  tools: [
    { id: "market", label: "工具广场" },
    { id: "mine", label: "我的工具" },
  ],
  content: [
    { id: "market", label: "内容广场" },
    { id: "my-works", label: "我的作品" },
    { id: "saved", label: "收藏" },
  ],
  files: [
    { id: "all", label: "全部" },
    { id: "artifacts", label: "任务产物" },
    { id: "my-cloud", label: "我的云盘" },
    { id: "org-cloud", label: "组织云盘" },
    { id: "upload", label: "上传引用" },
  ],
  schedules: [
    { id: "tasks", label: "任务" },
    { id: "history", label: "历史" },
  ],
  settings: [],
};

export const CAPABILITY_SURFACE_CONFIGS: readonly CapabilitySurfaceConfig[] =
  WORKBUDDY_CAPABILITIES.map(({ id, label, description, icon }) => ({
    id,
    label,
    description,
    icon,
    tabs: CAPABILITY_TABS[id],
  }));

export const SKILL_ITEMS: readonly CapabilityItem[] = [
  {
    id: "skill-courseware-structure",
    title: "智能课件结构设计",
    subtitle: "把教学目标组织为可讲授的页面结构",
    status: "已启用",
    statusTone: "success",
    meta: ["官方能力", "适用：课件生成"],
    tags: ["课程生产", "结构设计"],
    description: "根据课程目标、单元活动和课堂时长，生成可审阅的智能课件结构。",
    source: "ClassIn WorkBuddy",
    version: "v1.4.0",
    permissions: ["读取课程与单元", "写入 Artifact 草稿"],
  },
  {
    id: "skill-homework-cluster",
    title: "作业错因聚类",
    subtitle: "从提交证据中整理共性问题与错因候选",
    status: "可安装",
    statusTone: "info",
    meta: ["机构推荐", "适用：作业订正"],
    tags: ["作业分析", "证据"],
    description:
      "保留来源提交引用，将观察到的错误与带置信度的错因候选分开呈现。",
    source: "星河学习中心",
    version: "v0.9.2",
    permissions: ["读取作业提交摘要", "不读取无关班级"],
  },
  {
    id: "skill-lesson-rehearsal",
    title: "备课演练反馈",
    subtitle: "从演练记录中提炼可观察的教学改进点",
    status: "更新可用",
    statusTone: "warning",
    meta: ["个人 Skill", "适用：备课演练"],
    tags: ["演练", "改进"],
    description: "关联演练时间戳和课件版本，输出可复查的反馈草稿。",
    source: "王老师",
    version: "v2.1.0",
    permissions: ["读取演练记录", "读取课件版本"],
  },
  {
    id: "skill-goal-clarifier",
    title: "教学目标澄清",
    subtitle: "识别目标、范围与交付物之间的缺口",
    status: "已安装",
    statusTone: "neutral",
    meta: ["官方能力", "适用：所有任务"],
    tags: ["目标", "上下文"],
    description: "在开始执行前，把教师目标转换为可确认的任务计划。",
    source: "ClassIn WorkBuddy",
    version: "v1.2.1",
    permissions: ["读取当前任务上下文"],
  },
  {
    id: "skill-paper-diagnosis",
    title: "试卷诊断",
    subtitle: "从答题证据生成可复查的班级诊断",
    status: "可安装",
    statusTone: "info",
    meta: ["机构推荐", "适用：学情分析"],
    tags: ["试卷", "学情"],
    description:
      "分析题目、知识点与答题证据，输出班级层面的教学建议和证据引用。",
    source: "ClassIn WorkBuddy",
    version: "v1.0.3",
    permissions: ["读取脱敏答题摘要", "生成诊断草稿"],
  },
  {
    id: "skill-teaching-plan",
    title: "教学计划",
    subtitle: "把课程目标组织为学期与单元计划",
    status: "已启用",
    statusTone: "success",
    meta: ["官方能力", "适用：课程规划"],
    tags: ["教学计划", "课程"],
    description: "根据课程周期、教材目录和班级进度生成可调整的教学计划。",
    source: "ClassIn WorkBuddy",
    version: "v1.3.2",
    permissions: ["读取课程计划", "写入计划草稿"],
  },
  {
    id: "skill-transcript",
    title: "课堂逐字稿",
    subtitle: "从课件和教案生成教师讲授逐字稿",
    status: "已安装",
    statusTone: "neutral",
    meta: ["官方能力", "适用：备课"],
    tags: ["逐字稿", "备课"],
    description: "保留课件页码与讲授环节引用，形成可编辑、可排练的课堂逐字稿。",
    source: "ClassIn WorkBuddy",
    version: "v1.1.0",
    permissions: ["读取课件与教案", "生成文档草稿"],
  },
  {
    id: "skill-geometry-solver",
    title: "几何解题",
    subtitle: "生成可验证的几何推理与图形说明",
    status: "可安装",
    statusTone: "info",
    meta: ["机构推荐", "适用：数学"],
    tags: ["几何", "讲题"],
    description: "将题目条件、推理步骤和可视化构图分层呈现，便于教师复查。",
    source: "星河学习中心",
    version: "v0.8.7",
    permissions: ["读取题目内容", "生成解题草稿"],
  },
];

export const TOOL_ITEMS: readonly CapabilityItem[] = [
  {
    id: "tool-classin-official",
    title: "ClassIn 官方工具",
    subtitle: "ClassIn 官方服务",
    status: "已连接",
    statusTone: "success",
    meta: [
      "http",
      "https://ttaapi.laoshibang.com/aiteacher/nineclaw/thirdmcp/mcp",
    ],
    tags: ["http", "内置工具"],
    description:
      "ClassIn 官方工具：TTS 文字转语音、AI 生图、联网搜索、HTTP 流式传输",
    source: "ClassIn",
    permissions: [],
  },
  {
    id: "tool-classin-question-bank",
    title: "ClassIn 题库",
    subtitle: "ClassIn 题库服务",
    status: "已连接",
    statusTone: "success",
    meta: [
      "http",
      "https://ttaapi.laoshibang.com/aiteacher/nineclaw/paper/mcp",
    ],
    tags: ["http", "题库"],
    description: "ClassIn 题库服务：试题搜索、试卷生成、题库管理",
    source: "ClassIn",
    permissions: [],
  },
  {
    id: "tool-github",
    title: "GitHub",
    subtitle: "GitHub 平台集成",
    status: "已连接",
    statusTone: "success",
    meta: ["stdio", "npx -y @modelcontextprotocol/server-github"],
    tags: ["stdio", "代码平台"],
    description: "GitHub 平台集成：仓库、Issues、PR、Actions 管理",
    source: "第三方工具",
    permissions: [],
  },
  {
    id: "tool-gitlab",
    title: "GitLab",
    subtitle: "GitLab API 集成",
    status: "可安装",
    statusTone: "info",
    meta: ["stdio", "npx -y @modelcontextprotocol/server-gitlab"],
    tags: ["stdio", "代码平台"],
    description: "GitLab API 集成：项目管理、合并请求、流水线",
    source: "第三方工具",
    permissions: [],
  },
  {
    id: "tool-context7",
    title: "Context7",
    subtitle: "最新的库文档和代码示例",
    status: "可安装",
    statusTone: "info",
    meta: ["stdio", "npx -y @upstash/context7-mcp@latest"],
    tags: ["stdio", "开发文档"],
    description: "为 AI 编程提供最新的库文档和代码示例",
    source: "第三方工具",
    permissions: [],
  },
  {
    id: "tool-fetch",
    title: "Fetch",
    subtitle: "网页内容抓取和 HTML 转 Markdown",
    status: "可安装",
    statusTone: "info",
    meta: ["stdio", "npx -y @modelcontextprotocol/server-fetch"],
    tags: ["stdio", "网页抓取"],
    description: "网页内容抓取和 HTML 转 Markdown，适合 LLM 消费",
    source: "第三方工具",
    permissions: [],
  },
];

export const CONTENT_ITEMS: readonly CapabilityItem[] = [
  {
    id: "content-wave-visual",
    title: "机械波概念演示",
    subtitle: "高中物理 · 机械波 · 课件模板",
    status: "可改编",
    statusTone: "info",
    meta: ["王老师", "更新于 2 天前", "已授权"],
    tags: ["课件", "高中物理"],
    description:
      "以波速、频率和波长关系为主线的智能课件模板，支持改编为当前课程目标。",
    source: "我的作品",
    version: "v2.0",
    permissions: ["可引用", "可改编"],
  },
  {
    id: "content-momentum-review",
    title: "动量守恒单元复习",
    subtitle: "高中物理 · 单元复习 · 练习素材",
    status: "已收藏",
    statusTone: "success",
    meta: ["机构内容库", "更新于 5 天前", "已授权"],
    tags: ["练习", "复习"],
    description: "面向动量守恒单元的课堂复习和随堂练习素材。",
    source: "机构内容库",
    version: "v1.3",
    permissions: ["可引用", "不可直接发布"],
  },
  {
    id: "content-classroom-inquiry",
    title: "课堂探究活动模板",
    subtitle: "通用 · 课堂活动 · 探究",
    status: "审核中",
    statusTone: "warning",
    meta: ["李老师", "更新于 1 周前", "审核中"],
    tags: ["活动", "探究"],
    description: "一个可在课程活动中复用的探究模板，作品审核通过后才可改编。",
    source: "内容广场",
    version: "v0.8",
    permissions: ["仅预览"],
  },
  {
    id: "content-function-lesson",
    title: "函数单调性精品教案",
    subtitle: "高中数学 · 函数 · 教案",
    status: "可改编",
    statusTone: "info",
    meta: ["ClassIn 教研中心", "更新于 3 天前", "已授权"],
    tags: ["教案", "高中数学"],
    description: "围绕函数单调性的概念建构、例题与课堂评价组织完整教学流程。",
    source: "内容广场",
    version: "v1.5",
    permissions: ["可引用", "可改编"],
  },
  {
    id: "content-geometry-game",
    title: "空间几何互动练习",
    subtitle: "高中数学 · 空间几何 · 活动",
    status: "已收藏",
    statusTone: "success",
    meta: ["机构内容库", "更新于 4 天前", "已授权"],
    tags: ["活动", "高中数学"],
    description: "通过可旋转模型和分层问题帮助学生建立空间几何表象。",
    source: "机构内容库",
    version: "v1.1",
    permissions: ["可引用", "不可直接发布"],
  },
  {
    id: "content-chemistry-paper",
    title: "化学反应原理单元测验",
    subtitle: "高中化学 · 单元测验 · 试卷",
    status: "可改编",
    statusTone: "info",
    meta: ["星河学习中心", "更新于 6 天前", "已授权"],
    tags: ["试卷", "高中化学"],
    description: "覆盖化学平衡、电离平衡和反应热的单元测验与评分要点。",
    source: "内容广场",
    version: "v2.2",
    permissions: ["可引用", "可改编"],
  },
  {
    id: "content-reading-homework",
    title: "现代文阅读分层作业",
    subtitle: "初中语文 · 阅读 · 作业",
    status: "可改编",
    statusTone: "info",
    meta: ["ClassIn 教研中心", "更新于 1 周前", "已授权"],
    tags: ["作业", "初中语文"],
    description: "按基础理解、证据推断与表达迁移组织三层阅读作业。",
    source: "内容广场",
    version: "v1.0",
    permissions: ["可引用", "可改编"],
  },
  {
    id: "content-lab-assets",
    title: "电磁感应实验素材包",
    subtitle: "高中物理 · 电磁感应 · 素材",
    status: "已收藏",
    statusTone: "success",
    meta: ["王老师", "更新于 2 周前", "已授权"],
    tags: ["素材", "高中物理"],
    description: "包含实验装置图、数据表和课堂观察记录模板。",
    source: "我的作品",
    version: "v1.4",
    permissions: ["可引用", "可编辑"],
  },
];

export const FILE_ITEMS: readonly CapabilityItem[] = [
  {
    id: "file-courseware-v2",
    title: "函数单调性智能课件",
    subtitle: "智能课件 · 8 页 · v2",
    status: "已解析",
    statusTone: "success",
    meta: ["任务产物", "Run：生成函数单调性课件", "2 小时前", "12.4 MB"],
    tags: ["Artifact", "课件"],
    description: "来自“生成函数单调性智能课件”任务的当前版本。",
    source: "WorkBuddy Artifact",
    version: "v2",
    permissions: ["教师可见", "可作为任务输入"],
  },
  {
    id: "file-wave-template",
    title: "机械波课堂素材包",
    subtitle: "文件夹 · 6 个文件",
    status: "已同步",
    statusTone: "success",
    meta: ["组织云盘", "归属：机械波课程", "昨天", "已授权"],
    tags: ["素材", "组织云盘"],
    description: "课程“机械波”对应的组织共享素材，保留来源目录引用。",
    source: "组织云盘 / 高中物理",
    version: "最新",
    permissions: ["读取", "不可删除"],
  },
  {
    id: "file-homework-import",
    title: "动量守恒作业提交摘要",
    subtitle: "CSV · 已脱敏 · 42 行",
    status: "等待解析",
    statusTone: "warning",
    meta: ["任务输入", "Run：作业订正", "昨天", "96 KB"],
    tags: ["作业", "证据"],
    description: "准备加入作业订正任务的提交摘要，尚未进入任何执行中的 Run。",
    source: "我的文件",
    version: "v1",
    permissions: ["教师可见", "敏感字段已裁剪"],
  },
  {
    id: "file-restricted-reference",
    title: "机构题库原始导出",
    subtitle: "XLSX · 需要申请访问",
    status: "无权访问",
    statusTone: "danger",
    meta: ["组织云盘", "权限：未授权", "上周"],
    tags: ["题库", "受限"],
    description:
      "当前教师没有该文件的读取权限，不能作为任务 Context；可向机构管理员申请。",
    source: "组织云盘 / 机构题库",
    version: "v0.1",
    permissions: ["无权读取", "不可预览", "可申请访问"],
  },
];

export const SCHEDULE_ITEMS: readonly CapabilityItem[] = [
  {
    id: "schedule-weekly-summary",
    title: "每周一生成教学周报",
    subtitle: "每周一 · 08:00 · ClassIn 教研中心",
    status: "已启用",
    statusTone: "success",
    meta: ["下次：8 月 24 日 08:00", "最近：成功"],
    tags: ["课程总结", "周报"],
    description: "读取上一周课程、作业和课堂记录，生成待教师复查的教学周报。",
    source: "教师创建",
    permissions: ["读取课程与作业摘要", "结果需教师复查"],
  },
  {
    id: "schedule-homework-review",
    title: "作业截止后生成错题摘要",
    subtitle: "作业截止后 · 等待日程连接",
    status: "已阻断",
    statusTone: "danger",
    meta: ["原因：课程表连接认证失败", "上次：未运行"],
    tags: ["作业", "错因分析"],
    description: "作业截止后触发作业订正 Run；需恢复日程连接后才会运行。",
    source: "教师创建",
    permissions: ["读取指定作业提交", "不自动发布订正"],
  },
  {
    id: "schedule-lesson-prep",
    title: "课前 24 小时检查准备项",
    subtitle: "每次课程前 · 08:30",
    status: "已停用",
    statusTone: "neutral",
    meta: ["下次：未安排", "最近：8 月 10 日"],
    tags: ["课前准备", "检查"],
    description: "检查课件、活动和资源是否齐备，并生成待办草稿。",
    source: "教师创建",
    permissions: ["读取课程和资源", "只创建待办草稿"],
  },
];

export function getCapabilitySurface(
  surface: CapabilitySurfaceId,
): CapabilitySurfaceConfig {
  return (
    CAPABILITY_SURFACE_CONFIGS.find((item) => item.id === surface) ??
    CAPABILITY_SURFACE_CONFIGS[0]!
  );
}

export function filterCapabilityItems(
  items: readonly CapabilityItem[],
  query: string,
  tab: string,
): readonly CapabilityItem[] {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesQuery =
      !normalized ||
      [item.title, item.subtitle, item.description, item.source, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    if (!matchesQuery) return false;
    if (tab === "mine")
      return [
        "已启用",
        "已安装",
        "更新可用",
        "已连接",
        "认证失败",
        "策略阻断",
      ].includes(item.status);
    if (tab === "saved") return item.status === "已收藏";
    if (tab === "my-works") return item.source === "我的作品";
    if (tab === "artifacts") return item.source === "WorkBuddy Artifact";
    if (tab === "my-cloud") return item.source === "我的文件";
    if (tab === "org-cloud") return item.source.includes("组织云盘");
    if (tab === "upload")
      return item.source.includes("上传") || item.source === "我的文件";
    if (tab === "cloud") return item.source.includes("云盘");
    if (tab === "active")
      return item.status === "已启用" || item.status === "已阻断";
    if (tab === "history")
      return item.meta.some((value) => value.includes("最近"));
    return true;
  });
}

export function surfaceItems(
  surface: CapabilitySurfaceId,
): readonly CapabilityItem[] {
  const items =
    surface === "skills"
      ? SKILL_ITEMS
      : surface === "tools"
        ? TOOL_ITEMS
        : surface === "content"
          ? CONTENT_ITEMS
          : surface === "files"
            ? FILE_ITEMS
            : SCHEDULE_ITEMS;
  return items.map((item) => ({ ...item, truth: "[模拟]" as const }));
}

/** Mock Adapter seam: UI submits a governed command and receives a normalized result. */
export function executeCapabilityCommand(
  items: readonly CapabilityItem[],
  command: CapabilityCommand,
): CapabilityCommandResult {
  const target = items.find((item) => item.id === command.itemId);
  if (!target) {
    return {
      truth: "[模拟]",
      outcome: "blocked",
      items,
      message: "该能力已不存在，操作未执行。",
    };
  }
  if (target.status === "策略阻断")
    return {
      truth: "[模拟]",
      outcome: "blocked",
      items,
      message: "当前机构策略阻断该工具，操作未执行。",
    };
  return {
    truth: "[模拟]",
    outcome: "succeeded",
    items: items.map((item) =>
      item.id === command.itemId
        ? { ...item, status: command.status, statusTone: command.statusTone }
        : item,
    ),
    message: command.message,
  };
}
