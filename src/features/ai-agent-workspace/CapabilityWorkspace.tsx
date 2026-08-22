import {
  Archive,
  BookOpen,
  Bot,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cloud,
  Ellipsis,
  FileText,
  FolderOpen,
  GitFork,
  Image,
  Info,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { createElement, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  executeCapabilityCommand,
  filterCapabilityItems,
  getCapabilitySurface,
  surfaceItems,
  validateSkillImport,
  type CapabilityAction,
  type CapabilityItem,
  type CapabilityStatus,
  type CapabilitySurfaceId,
  type SkillImportCandidate,
  type SkillImportValidation,
} from "./capability-workspace";
import { FileLibrary } from "./FileLibrary";
import styles from "./CapabilityWorkspace.module.css";

type Props = Readonly<{ surface: CapabilitySurfaceId }>;
type Common = Readonly<{
  config: ReturnType<typeof getCapabilitySurface>;
  tab: string;
  setTab: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  filtered: readonly CapabilityItem[];
  select: (item: CapabilityItem) => void;
  contentType: string;
  setContentType: (v: string) => void;
}>;

const SETTINGS = [
  ["general", "通用", Settings2],
  ["model", "模型", Sparkles],
  ["data", "云端备份", Cloud],
  ["notifications", "IM 机器人", Bot],
  ["sandbox", "沙箱", ShieldCheck],
  ["about", "关于", Info],
  ["feedback", "反馈", MessageSquare],
] as const;
const SKILL_ICONS = [BookOpen, Boxes, TestTube2, Sparkles];
const COVERS = ["geometry", "wave", "inquiry", "momentum"];

export function CapabilityWorkspace({ surface }: Props) {
  const config = getCapabilitySurface(surface);
  const [tab, setTab] = useState(config.tabs[0]?.id ?? "general");
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState("all");
  const [items, setItems] = useState<CapabilityItem[]>(() => [
    ...surfaceItems(surface),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [toolOpen, setToolOpen] = useState(false);
  const [toolMode, setToolMode] = useState<"form" | "json">("form");
  const [toolName, setToolName] = useState("");
  const [toolEndpoint, setToolEndpoint] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [skillUploadOpen, setSkillUploadOpen] = useState(false);
  const [installItem, setInstallItem] = useState<CapabilityItem | null>(null);
  const [inspector, setInspector] = useState<{
    kind: "preview" | "history" | "source";
    item: CapabilityItem;
  } | null>(null);
  const navigate = useNavigate();
  const filtered = useMemo(
    () =>
      filterCapabilityItems(items, query, tab).filter(
        (item) => contentType === "all" || item.tags.includes(contentType),
      ),
    [contentType, items, query, tab],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const update = (
    item: CapabilityItem,
    status: CapabilityStatus,
    tone: CapabilityItem["statusTone"],
    message: string,
  ) => {
    const result = executeCapabilityCommand(items, {
      itemId: item.id,
      status,
      statusTone: tone,
      message,
    });
    setItems([...result.items]);
    setFeedback(result.message);
  };
  const act = (item: CapabilityItem, action: CapabilityAction) => {
    if (action === "connect")
      update(item, "已连接", "success", `${item.title} 已连接。`);
    else if (action === "update" || action === "enable")
      update(item, "已启用", "success", `${item.title} 已启用。`);
    else if (action === "disable")
      update(item, "已停用", "neutral", `${item.title} 已停用。`);
    else if (action === "toggle-schedule")
      update(
        item,
        item.status === "已启用" ? "已停用" : "已启用",
        item.status === "已启用" ? "neutral" : "success",
        `${item.title} 状态已更新。`,
      );
    else if (action === "favorite")
      update(item, "已收藏", "success", `${item.title} 已收藏。`);
    else if (
      action === "preview" ||
      action === "history" ||
      action === "source"
    )
      setInspector({ kind: action, item });
    else setFeedback(`${item.title} 的连接测试已完成。`);
  };
  const useInTask = (item: CapabilityItem, intent: string) =>
    navigate("/teacher/ai-agent/new", {
      state: {
        capabilityId: item.id,
        capabilityTitle: item.title,
        intent,
        prompt: intent === "skill-use" ? `使用“${item.title}”帮我完成：` : undefined,
      },
    });
  const closeSkillUpload = () => {
    setSkillUploadOpen(false);
    requestAnimationFrame(() => document.getElementById("skill-add-trigger")?.focus());
  };
  const common: Common = {
    config,
    tab,
    setTab,
    query,
    setQuery,
    filtered,
    select: (item) => setSelectedId(item.id),
    contentType,
    setContentType,
  };

  if (surface === "settings") return <SettingsSurface />;
  return (
    <main
      className={styles.page}
      data-surface={surface}
      aria-labelledby={`${surface}-workspace-title`}
    >
      {surface === "skills" ? (
        <SkillMarket
          {...common}
          onFind={() =>
            navigate("/teacher/ai-agent/new", {
              state: {
                capabilityId: "find-skills",
                capabilityTitle: "查找技能",
                intent: "skill-find",
                prompt: "帮我找一个技能，这个技能是为了：",
              },
            })
          }
          onUpload={() => setSkillUploadOpen(true)}
          onCreate={() =>
            navigate("/teacher/ai-agent/new", {
              state: {
                capabilityId: "skill-creator",
                capabilityTitle: "技能创建器",
                intent: "skill-create",
                prompt: "帮我创建一个新技能，这个技能是为了：",
              },
            })
          }
        />
      ) : null}
      {surface === "tools" ? (
        <ToolMarket
          {...common}
          onAdd={() => setToolOpen(true)}
          onRemove={(item) =>
            setItems((all) => all.filter((candidate) => candidate.id !== item.id))
          }
          onToggle={(item) =>
            update(
              item,
              item.status === "已连接" ? "已停用" : "已连接",
              item.status === "已连接" ? "neutral" : "success",
              `${item.title} 状态已更新。`,
            )
          }
        />
      ) : null}
      {surface === "content" ? (
        <ContentMarket {...common} onPublish={() => setPublishOpen(true)} />
      ) : null}
      {surface === "files" ? (
        <FileLibrary
          onUseAsContext={(asset) =>
            navigate("/teacher/ai-agent/new", {
              state: {
                capabilityId: asset.id,
                capabilityTitle: asset.name,
                intent: "context",
              },
            })
          }
          onOpenRun={(runId) => navigate(`/teacher/ai-agent/runs/${runId}`)}
        />
      ) : null}
      {surface === "schedules" ? (
        <ScheduleWorkspace />
      ) : null}
      {feedback ? (
        <p className={styles.toast} role="status">
          {feedback}
        </p>
      ) : null}
      {selected && surface === "tools" ? (
        <ToolInstallDialog
          item={selected}
          editing={tab === "mine"}
          close={() => setSelectedId(null)}
          confirm={() => {
            update(selected, "已连接", "success", `${selected.title} 已安装。`);
            setSelectedId(null);
          }}
        />
      ) : null}
      {selected && surface !== "tools" ? (
        <div
          className={styles.detailBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <Detail
            item={selected}
            surface={surface}
            close={() => setSelectedId(null)}
            install={() => setInstallItem(selected)}
            useInTask={useInTask}
            act={act}
            edit={() => setToolOpen(true)}
            remove={() => {
              setItems((all) => all.filter((item) => item.id !== selected.id));
              setSelectedId(null);
            }}
          />
        </div>
      ) : null}
      {toolOpen ? (
        <ToolDialog
          mode={toolMode}
          setMode={setToolMode}
          name={toolName}
          setName={setToolName}
          endpoint={toolEndpoint}
          setEndpoint={setToolEndpoint}
          close={() => setToolOpen(false)}
          save={() => {
            if (!toolName.trim() || !toolEndpoint.trim()) {
              setFeedback("请填写工具名称和 Endpoint。");
              return;
            }
            setItems((all) => [
              ...all,
              {
                id: `tool-custom-${all.length + 1}`,
                truth: "[模拟]",
                title: toolName.trim(),
                subtitle: "自定义 HTTP 工具连接",
                status: "待连接",
                statusTone: "neutral",
                meta: ["教师创建", "尚未测试"],
                tags: ["http", "自定义"],
                description: `连接到 ${toolEndpoint.trim()}，测试成功后可由 Agent Run 调用。`,
                source: "教师创建",
                version: "draft",
                permissions: ["仅在任务授权范围内调用", "凭证不进入提示词"],
              },
            ]);
            setToolOpen(false);
            setFeedback(`${toolName} 已添加，请先测试连接。`);
            setToolName("");
            setToolEndpoint("");
          }}
        />
      ) : null}
      {publishOpen ? (
        <PublishWorkspace
          close={() => setPublishOpen(false)}
          finish={() => {
            setPublishOpen(false);
            setFeedback("作品已提交审核。");
          }}
        />
      ) : null}
      {skillUploadOpen ? (
        <SkillUploadDialog
          close={closeSkillUpload}
          importSkill={(result) => {
            if (!result.ok) return;
            const nextId = `skill-import-${items.filter(({ id }) => id.startsWith("skill-import-")).length + 1}`;
            setItems((all) => [
              ...all,
              {
                id: nextId,
                truth: "[模拟]",
                title: result.title,
                subtitle: "由教师导入的自定义 Skill",
                status: "已安装",
                statusTone: "neutral",
                meta: ["个人 Skill", `来源：${result.source}`],
                tags: ["自定义", "任务辅助"],
                description: "已通过本地体验校验，可在新任务中选择使用。",
                source: result.source,
                version: "draft",
                permissions: ["仅访问当前任务明确授权的 Context"],
              },
            ]);
            closeSkillUpload();
            setQuery("");
            setTab("mine");
            setFeedback(`[模拟] ${result.title} 已添加到我的 Skills。`);
          }}
        />
      ) : null}
      {installItem ? (
        <ConfirmInstall
          item={installItem}
          close={() => setInstallItem(null)}
          confirm={() => {
            update(
              installItem,
              "已安装",
              "neutral",
              `${installItem.title} 已安装。`,
            );
            setInstallItem(null);
          }}
        />
      ) : null}
      {inspector ? (
        <Inspector value={inspector} close={() => setInspector(null)} />
      ) : null}
    </main>
  );
}

function Tabs({
  config,
  tab,
  setTab,
}: Pick<Common, "config" | "tab" | "setTab">) {
  return (
    <nav
      className={styles.tabs}
      role="tablist"
      aria-label={`${config.label}视图`}
    >
      {config.tabs.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="tab"
          aria-selected={tab === entry.id}
          onClick={() => setTab(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </nav>
  );
}
function SearchBox({
  label,
  query,
  setQuery,
}: Readonly<{ label: string; query: string; setQuery: (v: string) => void }>) {
  return (
    <label className={styles.search}>
      <Search size={17} />
      <input
        aria-label={label}
        placeholder={label}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </label>
  );
}

function SkillMarket({
  config,
  tab,
  setTab,
  query,
  setQuery,
  filtered,
  select,
  onFind,
  onUpload,
  onCreate,
}: Common &
  Readonly<{
    onFind: () => void;
    onUpload: () => void;
    onCreate: () => void;
  }>) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  return (
    <section className={styles.marketScene}>
      <header className={styles.skillHero}>
        <div>
          <span>Work Buddy Skills</span>
          <h1 id="skills-workspace-title" aria-label="技能市场">
            把专业教学方法
            <br />
            <em>装进每一次任务</em>
          </h1>
          <p>为教师精选的能力库，让每个 Agent Run 调用可靠的方法与工作流。</p>
        </div>
        <Sparkles size={76} />
      </header>
      <div className={styles.marketControls}>
        <Tabs config={config} tab={tab} setTab={setTab} />
        <div>
          <SearchBox label="搜索技能市场" query={query} setQuery={setQuery} />
          <div
            className={styles.skillAdd}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAddMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAddMenuOpen(false);
            }}
          >
            <button
              id="skill-add-trigger"
              className={styles.outlineButton}
              type="button"
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
              onClick={() => setAddMenuOpen((open) => !open)}
            >
              <Plus size={16} />
              添加技能
              <ChevronDown size={14} />
            </button>
            {addMenuOpen ? (
              <div className={styles.skillAddMenu} role="menu" aria-label="添加技能方式">
                <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); onFind(); }}>
                  <Search size={16} />
                  <span><strong>查找技能</strong><small>让 Work Buddy 帮你找到合适的 Skill</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); onUpload(); }}>
                  <Upload size={16} />
                  <span><strong>上传技能</strong><small>从文件夹、ZIP、Markdown 或链接添加</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); onCreate(); }}>
                  <Pencil size={16} />
                  <span><strong>创建技能</strong><small>通过新任务生成一个自定义 Skill</small></span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className={styles.cardGrid}>
        {filtered.map((item, index) => (
          <SkillCard
            key={item.id}
            item={item}
            icon={SKILL_ICONS[index % SKILL_ICONS.length]!}
            select={() => select(item)}
          />
        ))}
      </div>
      {!filtered.length ? <Empty /> : null}
    </section>
  );
}

function SkillUploadDialog({
  close,
  importSkill,
}: Readonly<{
  close: () => void;
  importSkill: (result: SkillImportValidation) => void;
}>) {
  const [candidate, setCandidate] = useState<SkillImportCandidate | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const submit = (nextCandidate: SkillImportCandidate | null) => {
    if (!nextCandidate) {
      setError("请先选择文件、文件夹，或输入技能链接。");
      return;
    }
    const result = validateSkillImport(nextCandidate);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    importSkill(result);
  };
  return (
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        className={styles.skillUploadDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-upload-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <header>
          <div>
            <span className={styles.kicker}><Upload size={15} />添加到技能市场</span>
            <h2 id="skill-upload-title">上传技能</h2>
          </div>
          <button autoFocus className={styles.iconButton} type="button" aria-label="关闭上传技能" onClick={close}>
            <X size={18} />
          </button>
        </header>
        <div className={styles.skillUploadBody}>
          <div
            className={styles.skillDropZone}
            data-selected={String(candidate?.kind === "file" || candidate?.kind === "folder")}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const item = event.dataTransfer.items[0];
              const entry = item && "webkitGetAsEntry" in item
                ? item.webkitGetAsEntry?.()
                : null;
              const file = event.dataTransfer.files[0];
              const next = entry?.isDirectory
                ? { kind: "folder" as const, name: entry.name }
                : file
                  ? { kind: "file" as const, name: file.name }
                  : null;
              setCandidate(next);
              setError("");
            }}
          >
            <span className={styles.skillUploadIcon}><Upload size={22} /></span>
            <strong>{candidate && candidate.kind !== "url" ? candidate.name : "拖入技能文件或文件夹"}</strong>
            <p>支持包含 SKILL.md 的文件夹、ZIP 包或单个 Markdown 文件</p>
            <div>
              <label className={styles.ghostButton}>
                选择文件
                <input
                  className={styles.srOnly}
                  type="file"
                  accept=".zip,.md,text/markdown,application/zip"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) setCandidate({ kind: "file", name: file.name });
                    setError("");
                  }}
                />
              </label>
              <label className={styles.ghostButton}>
                选择文件夹
                <input
                  className={styles.srOnly}
                  type="file"
                  {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    const folder = file?.webkitRelativePath.split("/")[0];
                    if (folder) setCandidate({ kind: "folder", name: folder });
                    setError("");
                  }}
                />
              </label>
            </div>
          </div>
          <div className={styles.skillUploadDivider}><span>或输入链接</span></div>
          <label className={styles.skillUrlField}>
            <span>GitHub URL 或 ZIP URL</span>
            <span>
              <input
                type="url"
                aria-label="GitHub URL 或 ZIP URL"
                placeholder="https://github.com/organization/skill"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setCandidate({ kind: "url", value: event.target.value });
                  setError("");
                }}
              />
              <button className={styles.primaryButton} type="button" onClick={() => submit({ kind: "url", value: url })}>添加</button>
            </span>
          </label>
          {error ? <p className={styles.skillUploadError} role="alert">{error}</p> : null}
          <aside className={styles.skillRequirements} aria-label="技能文件要求">
            <Info size={17} />
            <div>
              <strong>文件要求</strong>
              <p>文件夹或 ZIP 包中需要包含 <code>SKILL.md</code>。</p>
              <p>单个 Markdown 文件需要包含技能名称和描述的 YAML。</p>
            </div>
          </aside>
        </div>
        <footer>
          <span>[模拟] 只校验输入，不连接真实 Skill 运行时</span>
          <div>
            <button className={styles.ghostButton} type="button" onClick={close}>取消</button>
            <button className={styles.primaryButton} type="button" onClick={() => submit(candidate)}>添加到我的 Skills</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
function ToolMarket({
  config,
  tab,
  setTab,
  query,
  setQuery,
  filtered,
  select,
  onAdd,
  onRemove,
  onToggle,
}: Common &
  Readonly<{
    onAdd: () => void;
    onRemove: (item: CapabilityItem) => void;
    onToggle: (item: CapabilityItem) => void;
  }>) {
  const visible =
    tab === "mine"
        ? [...filtered].sort(
          (left, right) =>
            ["tool-classin-official", "tool-github", "tool-classin-question-bank"].indexOf(
              left.id,
            ) -
            ["tool-classin-official", "tool-github", "tool-classin-question-bank"].indexOf(
              right.id,
            ),
        )
      : filtered;
  return (
    <section className={`${styles.marketScene} ${styles.toolMarketScene}`}>
      <h1 id="tools-workspace-title" className={styles.srOnly}>
        工具连接
      </h1>
      <div className={styles.toolMarketToolbar}>
        <Tabs config={config} tab={tab} setTab={setTab} />
        <div>
          <SearchBox
            label="搜索工具广场，按 ↵ 搜索"
            query={query}
            setQuery={setQuery}
          />
          <button
            className={styles.toolCustomButton}
            type="button"
            onClick={onAdd}
          >
            <Plus size={16} />
            自定义
          </button>
        </div>
      </div>
      <div className={styles.toolCardGrid}>
        {visible.map((item) => (
          <ToolCard
            key={item.id}
            item={item}
            mine={tab === "mine"}
            install={() => select(item)}
            edit={() => select(item)}
            remove={() => onRemove(item)}
            toggle={() => onToggle(item)}
          />
        ))}
      </div>
      {!visible.length ? <Empty /> : null}
    </section>
  );
}

function ToolCard({
  item,
  mine,
  install,
  edit,
  remove,
  toggle,
}: Readonly<{
  item: CapabilityItem;
  mine: boolean;
  install: () => void;
  edit: () => void;
  remove: () => void;
  toggle: () => void;
}>) {
  const displayTitle = item.title;
  const connectionSummary =
    item.source === "ClassIn" ? "ClassIn 托管连接" : item.meta[1];
  return (
    <article className={`${styles.catalogCard} ${styles.toolCard}`}>
      <div className={styles.toolCardTop}>
        <span className={styles.toolGlyph}>
          <GitFork size={19} />
        </span>
        <strong>{displayTitle}</strong>
        {mine ? (
          <span className={styles.toolManageActions}>
            <button type="button" aria-label={`编辑${displayTitle}`} onClick={edit}>
              <Pencil size={15} />
            </button>
            <button type="button" aria-label={`删除${displayTitle}`} onClick={remove}>
              <Trash2 size={15} />
            </button>
            <button
              className={styles.toolSwitch}
              type="button"
              role="switch"
              aria-checked={item.status === "已连接"}
              aria-label={`${displayTitle}启用状态`}
              onClick={toggle}
            >
              <span />
            </button>
          </span>
        ) : (
          <button className={styles.toolInstallButton} type="button" onClick={install}>
            <Plus size={14} />
            安装
          </button>
        )}
      </div>
      <p>{item.description}</p>
      <div className={styles.toolProtocolRow}>
        <code data-protocol={item.meta[0]}>{item.meta[0]}</code>
        <span>{connectionSummary}</span>
      </div>
    </article>
  );
}
function SkillCard({
  item,
  icon,
  select,
}: Readonly<{
  item: CapabilityItem;
  icon: typeof Shapes;
  select: () => void;
}>) {
  const installable = item.status === "可安装";
  return (
    <button
      className={`${styles.catalogCard} ${styles.capabilityCard}`}
      type="button"
      aria-label={`查看${item.title}`}
      onClick={select}
    >
      <span className={styles.cardTop}>
        <span className={styles.capabilityIcon}>
          {createElement(icon, { size: 18 })}
        </span>
        <strong>{item.title}</strong>
        <span
          className={styles.cardAction}
          data-action={installable ? "install" : "status"}
          data-tone={item.statusTone}
        >
          {installable ? <Plus aria-hidden="true" size={14} /> : null}
          {installable ? "安装" : item.status}
        </span>
      </span>
      <span className={styles.cardDescription}>{item.description}</span>
      <span className={styles.cardFooter}>
        <span className={styles.skillMetaTag}>{item.meta[0]}</span>
        <span>{item.meta[1]}</span>
      </span>
    </button>
  );
}

function ContentMarket({
  config,
  tab,
  setTab,
  query,
  setQuery,
  filtered,
  select,
  contentType,
  setContentType,
  onPublish,
}: Common & Readonly<{ onPublish: () => void }>) {
  return (
    <section className={styles.contentScene}>
      <select
        className={styles.srOnly}
        aria-label="筛选内容类型"
        value={contentType}
        onChange={(event) => setContentType(event.target.value)}
      >
        <option value="all">全部</option>
        <option value="课件">课件</option>
        <option value="活动">活动</option>
        <option value="练习">练习</option>
      </select>
      <header className={styles.contentTop}>
        <div>
          <h1 id="content-workspace-title">内容资源</h1>
          <p>发现灵感，管理作品</p>
        </div>
        <Tabs config={config} tab={tab} setTab={setTab} />
        <button
          className={styles.outlineButton}
          type="button"
          onClick={onPublish}
        >
          <Plus size={16} />
          发布作品
        </button>
      </header>
      {tab === "my-works" ? <MyWorksSummary /> : null}
      {tab !== "my-works" ? (
        <section className={styles.contentHero}>
          <div>
            <span>
              <Sparkles size={15} />
              内容广场
            </span>
            <h2>
              <em>分享好内容</em>，成就好课堂
            </h2>
            <p>覆盖课件、教案、作业、试卷与课堂活动，按教学场景精准筛选。</p>
          </div>
          <SearchBox label="搜索内容资源" query={query} setQuery={setQuery} />
        </section>
      ) : null}
      <section className={styles.filterMatrix}>
        <FilterRow
          icon={<Boxes size={16} />}
          label="品类"
          values={["全部", "课件", "教案", "作业", "试卷", "活动", "素材"]}
          selected={contentType === "all" ? "全部" : contentType}
          change={(value) => setContentType(value === "全部" ? "all" : value)}
        />
        <FilterRow
          icon={<Archive size={16} />}
          label="学段"
          values={["全部", "小学", "初中", "高中", "其他"]}
          selected="全部"
        />
        <FilterRow
          icon={<BookOpen size={16} />}
          label="学科"
          values={[
            "全部",
            "语文",
            "数学",
            "英语",
            "物理",
            "化学",
            "生物",
            "地理",
          ]}
          selected="全部"
        />
      </section>
      <div className={styles.resultBar}>
        <strong>共 {filtered.length} 个作品</strong>
        <span>
          <SlidersHorizontal size={15} />
          综合排序
        </span>
      </div>
      <div className={styles.contentGrid}>
        {filtered.map((item, index) => (
          <ContentCard
            key={item.id}
            item={item}
            cover={COVERS[index % COVERS.length]!}
            select={() => select(item)}
          />
        ))}
      </div>
      {!filtered.length ? <Empty /> : null}
    </section>
  );
}
function FilterRow({
  icon,
  label,
  values,
  selected,
  change,
}: Readonly<{
  icon: ReactNode;
  label: string;
  values: string[];
  selected: string;
  change?: (v: string) => void;
}>) {
  return (
    <div className={styles.filterRow}>
      <span>
        {icon}
        <strong>{label}</strong>
      </span>
      <div>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            data-selected={selected === value}
            onClick={() => change?.(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function MyWorksSummary() {
  return (
    <section className={styles.worksSummary} aria-label="我的作品概览">
      <header>
        <div>
          <span>我的作品</span>
          <h2>让每一次创作都可持续复用</h2>
        </div>
        <button className={styles.ghostButton} type="button">
          查看作品数据
          <ChevronRight size={15} />
        </button>
      </header>
      <div>
        <article>
          <span>已发布</span>
          <strong>12</strong>
          <small>2 个本月新增</small>
        </article>
        <article>
          <span>审核中</span>
          <strong>2</strong>
          <small>预计 1 个工作日</small>
        </article>
        <article>
          <span>被复用</span>
          <strong>86</strong>
          <small>来自 7 个教研组</small>
        </article>
        <article>
          <span>被收藏</span>
          <strong>128</strong>
          <small>较上月 +16</small>
        </article>
      </div>
    </section>
  );
}
function ContentCard({
  item,
  cover,
  select,
}: Readonly<{ item: CapabilityItem; cover: string; select: () => void }>) {
  return (
    <button
      className={styles.contentCard}
      type="button"
      aria-label={`查看${item.title}`}
      onClick={select}
    >
      <span className={styles.cover} data-cover={cover}>
        <small>{item.tags[1] ?? "教学资源"}</small>
        <strong>{item.title}</strong>
        <em>
          <BookOpen size={14} />
          {item.tags[0]}
        </em>
      </span>
      <span className={styles.contentBody}>
        <strong>{item.title}</strong>
        <span>{item.subtitle}</span>
        <span className={styles.author}>
          <i>{item.source.slice(0, 1)}</i>
          {item.source}
          <em>☆ {item.status === "已收藏" ? "1" : "0"}</em>
        </span>
      </span>
    </button>
  );
}

type ScheduleDraft = Readonly<{
  title: string;
  prompt: string;
  repeat: "不重复" | "每天";
  date: string;
  time: string;
  directory: string;
  expiresAt: string;
  notifications: readonly string[];
}>;
type ScheduledTask = ScheduleDraft &
  Readonly<{ id: string; enabled: boolean }>;
type ScheduleHistory = Readonly<{
  id: string;
  title: string;
  executedAt: string;
  status: "运行中";
}>;

const EMPTY_SCHEDULE: ScheduleDraft = {
  title: "",
  prompt: "",
  repeat: "不重复",
  date: "",
  time: "09:00",
  directory: "",
  expiresAt: "",
  notifications: [],
};

const DEFAULT_SCHEDULE: ScheduledTask = {
  id: "scheduled-task-1",
  title: "开课前 10 分钟提醒老师上课",
  prompt:
    "请在我的每一堂课开课前 10 分钟，用短信和 ClassIn APP 消息的方式提醒我",
  repeat: "每天",
  date: "",
  time: "09:00",
  directory: "",
  expiresAt: "",
  notifications: ["飞书"],
  enabled: true,
};

function ScheduleWorkspace() {
  const [view, setView] = useState<"tasks" | "history">("tasks");
  const [tasks, setTasks] = useState<readonly ScheduledTask[]>([
    DEFAULT_SCHEDULE,
  ]);
  const [history, setHistory] = useState<readonly ScheduleHistory[]>([]);
  const [dialog, setDialog] = useState<{
    mode: "create" | "edit";
    taskId?: string;
    draft: ScheduleDraft;
  } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const openCreate = () =>
    setDialog({ mode: "create", draft: EMPTY_SCHEDULE });
  const openEdit = (task: ScheduledTask) => {
    setMenuId(null);
    setDialog({ mode: "edit", taskId: task.id, draft: task });
  };
  const save = () => {
    if (!dialog?.draft.title.trim() || !dialog.draft.prompt.trim()) return;
    if (dialog.mode === "edit" && dialog.taskId) {
      setTasks((all) =>
        all.map((task) =>
          task.id === dialog.taskId ? { ...task, ...dialog.draft } : task,
        ),
      );
    } else {
      setTasks((all) => [
        ...all,
        {
          ...dialog.draft,
          id: `scheduled-task-${all.length + 1}`,
          enabled: true,
        },
      ]);
    }
    setDialog(null);
    setView("tasks");
  };
  const runNow = (task: ScheduledTask) => {
    setHistory((all) => [
      {
        id: `schedule-history-${all.length + 1}`,
        title: task.title,
        executedAt: "2026/8/20 10:37:24",
        status: "运行中",
      },
      ...all,
    ]);
    setMenuId(null);
    setView("history");
  };

  return (
    <section className={styles.scheduleScene}>
      <div className={styles.schedulePageHeader}>
        <div>
          <h1 id="schedules-workspace-title">定时任务</h1>
          <div className={styles.scheduleTabs} role="tablist" aria-label="定时任务视图">
            <button
              type="button"
              role="tab"
              aria-selected={view === "tasks"}
              onClick={() => setView("tasks")}
            >
              任务
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "history"}
              onClick={() => setView("history")}
            >
              历史
            </button>
          </div>
        </div>
        {view === "tasks" && tasks.length ? (
          <button className={styles.scheduleOutlineButton} type="button" onClick={openCreate}>
            <Plus size={18} />
            新建任务
          </button>
        ) : null}
      </div>

      {view === "tasks" ? (
        tasks.length ? (
          <div className={styles.scheduleTaskList}>
            {tasks.map((task) => (
              <article
                className={styles.scheduleTaskCard}
                data-enabled={String(task.enabled)}
                aria-label={`定时任务：${task.title}`}
                key={task.id}
              >
                <div className={styles.scheduleTaskTop}>
                  <span className={styles.scheduleTaskIcon} aria-hidden="true">
                    <CalendarDays size={19} />
                  </span>
                  <div className={styles.scheduleTaskCopy}>
                    <h2>{task.title}</h2>
                    <p>{task.prompt}</p>
                  </div>
                  <label className={styles.scheduleSwitch}>
                    <span>{task.enabled ? "已启用" : "已停用"}</span>
                    <input
                      aria-label={`${task.title}${task.enabled ? "停用" : "启用"}`}
                      type="checkbox"
                      checked={task.enabled}
                      onChange={() =>
                        setTasks((all) =>
                          all.map((item) =>
                            item.id === task.id
                              ? { ...item, enabled: !item.enabled }
                              : item,
                          ),
                        )
                      }
                    />
                    <i aria-hidden="true" />
                  </label>
                </div>
                <div className={styles.scheduleTaskBottom}>
                  <div className={styles.schedulePlanSummary}>
                    <span className={styles.schedulePlanIcon} aria-hidden="true">
                      <Clock3 size={16} />
                    </span>
                    <span>
                      <small>执行计划</small>
                      <strong>
                        {task.repeat === "每天"
                          ? `每天 · ${task.time}`
                          : `${task.date || "未设置日期"} · ${task.time}`}
                      </strong>
                    </span>
                  </div>
                  <div className={styles.scheduleMenuAnchor}>
                    <button
                      className={styles.scheduleMoreButton}
                      type="button"
                      aria-label={`${task.title}更多操作`}
                      aria-expanded={menuId === task.id}
                      onClick={() => setMenuId(menuId === task.id ? null : task.id)}
                    >
                      <Ellipsis size={22} />
                    </button>
                    {menuId === task.id ? (
                      <div className={styles.scheduleMenu} role="menu">
                        <button type="button" role="menuitem" onClick={() => runNow(task)}>
                          <Play size={17} />
                          立即运行
                        </button>
                        <button type="button" role="menuitem" onClick={() => openEdit(task)}>
                          <Pencil size={17} />
                          编辑
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setTasks((all) => all.filter((item) => item.id !== task.id));
                            setMenuId(null);
                          }}
                        >
                          <Trash2 size={17} />
                          删除
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.scheduleEmptyState}>
            <button className={styles.schedulePrimaryButton} type="button" onClick={openCreate}>
              <Plus size={19} />
              新建任务
            </button>
            <p>创建定时任务，让 AI 按计划自动执行</p>
          </div>
        )
      ) : (
        <div className={styles.scheduleHistory} role="table" aria-label="定时任务运行历史">
          <div className={styles.scheduleHistoryHeader} role="row">
            <span role="columnheader">标题</span>
            <span role="columnheader">执行时间</span>
            <span role="columnheader">状态</span>
          </div>
          {history.map((entry) => (
            <div className={styles.scheduleHistoryRow} role="row" key={entry.id}>
              <span role="cell">
                {entry.title}
                <LoaderCircle className={styles.scheduleSpinner} size={15} />
              </span>
              <span role="cell">{entry.executedAt}</span>
              <strong role="cell">{entry.status}</strong>
            </div>
          ))}
        </div>
      )}

      {dialog ? (
        <ScheduleDialog
          mode={dialog.mode}
          draft={dialog.draft}
          setDraft={(draft) => setDialog({ ...dialog, draft })}
          close={() => setDialog(null)}
          save={save}
        />
      ) : null}
    </section>
  );
}
function Status({ item }: Readonly<{ item: CapabilityItem }>) {
  return (
    <span className={styles.status} data-tone={item.statusTone}>
      {item.status}
    </span>
  );
}
function Empty() {
  return (
    <div className={styles.empty}>
      <Search size={24} />
      <strong>没有找到匹配内容</strong>
      <span>换一个关键词或调整筛选后再试。</span>
    </div>
  );
}

function Detail({
  item,
  surface,
  close,
  install,
  useInTask,
  act,
  edit,
  remove,
}: Readonly<{
  item: CapabilityItem;
  surface: CapabilitySurfaceId;
  close: () => void;
  install: () => void;
  useInTask: (item: CapabilityItem, intent: string) => void;
  act: (item: CapabilityItem, action: CapabilityAction) => void;
  edit: () => void;
  remove: () => void;
}>) {
  const content = surface === "content";
  const file = surface === "files";
  const skill = surface === "skills";
  const tool = surface === "tools";
  const schedule = surface === "schedules";
  const navigateToTask = useInTask;
  return (
    <aside
      className={styles.detailModal}
      data-wide={String(content || file)}
      aria-label={`${item.title}详情`}
    >
      <header>
        <div>
          <span className={styles.kicker}>
            {content ? (
              <Image size={15} />
            ) : file ? (
              <FolderOpen size={15} />
            ) : tool ? (
              <Wrench size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {content
              ? "作品详情"
              : file
                ? "文件预览"
                : tool
                  ? "连接详情"
                  : schedule
                    ? "任务规则"
                    : "Skill 详情"}
          </span>
          <h2>{item.title}</h2>
          <p>{item.subtitle}</p>
        </div>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="关闭详情"
          onClick={close}
        >
          <X size={19} />
        </button>
      </header>
      <div className={styles.detailLayout}>
        <div className={styles.detailPreview} data-kind={surface}>
          <span>{item.tags[0]}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          {content || file ? (
            <div>
              <FileText size={42} />
              <strong>{item.version ?? "当前版本"}</strong>
              <small>可复查预览</small>
            </div>
          ) : (
            <Sparkles size={68} />
          )}
        </div>
        <div className={styles.detailInfo}>
          <Status item={item} />
          <section>
            <h3>能力说明</h3>
            <p>{item.description}</p>
          </section>
          <section>
            <h3>来源与版本</h3>
            <p>
              {item.source}
              {item.version ? ` · ${item.version}` : ""}
            </p>
          </section>
          <section>
            <h3>权限与数据边界</h3>
            <ul>
              {item.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>适用范围</h3>
            <div className={styles.tags}>
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
      <footer>
        <span>
          <Info size={15} />
          [模拟] 固定版本体验数据
        </span>
        <div>
          {skill && item.status === "可安装" ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={install}
            >
              安装 Skill
            </button>
          ) : null}
          {skill && item.status === "更新可用" ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => act(item, "update")}
            >
              更新 Skill
            </button>
          ) : null}
          {skill && item.status === "已安装" ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => act(item, "enable")}
            >
              启用 Skill
            </button>
          ) : null}
          {skill && item.status !== "可安装" ? (
            <>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => navigateToTask(item, "skill-use")}
              >
                去使用
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={remove}
              >
                删除
              </button>
            </>
          ) : null}
          {tool && item.status !== "已连接" ? (
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => act(item, "connect")}
            >
              连接工具
            </button>
          ) : null}
          {tool ? (
            <>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "test")}
              >
                <TestTube2 size={15} />
                测试连接
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={edit}
              >
                编辑连接
              </button>
            </>
          ) : null}
          {content ? (
            <>
              <button
                className={styles.primaryButton}
                type="button"
                aria-label="改编到新任务"
                onClick={() => navigateToTask(item, "adapt")}
              >
                <Sparkles size={15} />
                一键改编到任务
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "favorite")}
              >
                收藏
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "preview")}
              >
                预览
              </button>
            </>
          ) : null}
          {file ? (
            <>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => navigateToTask(item, "context")}
              >
                作为任务 Context
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "source")}
              >
                定位来源
              </button>
            </>
          ) : null}
          {schedule ? (
            <>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => navigateToTask(item, "schedule")}
              >
                立即运行
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "toggle-schedule")}
              >
                {item.status === "已启用" ? "停用" : "启用"}
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={edit}
              >
                编辑规则
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => act(item, "history")}
              >
                查看历史
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </aside>
  );
}

function ScheduleDialog({
  mode,
  draft,
  setDraft,
  close,
  save,
}: Readonly<{
  mode: "create" | "edit";
  draft: ScheduleDraft;
  setDraft: (draft: ScheduleDraft) => void;
  close: () => void;
  save: () => void;
}>) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationLabel = draft.notifications.length
    ? draft.notifications.join("、")
    : "无";
  const toggleNotification = (channel: string) =>
    setDraft({
      ...draft,
      notifications: draft.notifications.includes(channel)
        ? draft.notifications.filter((item) => item !== channel)
        : [...draft.notifications, channel],
    });
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.scheduleDialog}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "新建定时任务" : "编辑定时任务"}
      >
        <header>
          <h2>创建任务</h2>
          <button
            className={styles.scheduleCloseButton}
            type="button"
            aria-label="关闭"
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        <div className={styles.scheduleDialogBody}>
          <Field label="标题">
            <input
              aria-label="标题"
              placeholder="输入任务标题"
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </Field>
          <Field label="提示词">
            <textarea
              aria-label="提示词"
              placeholder="输入要执行的提示词..."
              value={draft.prompt}
              onChange={(event) =>
                setDraft({ ...draft, prompt: event.target.value })
              }
            />
          </Field>
          <fieldset className={styles.schedulePlan}>
            <legend>计划</legend>
            <div data-repeat={draft.repeat}>
              <label>
                <span className={styles.srOnly}>重复周期</span>
                <select
                  aria-label="重复周期"
                  value={draft.repeat}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      repeat: event.target.value as ScheduleDraft["repeat"],
                    })
                  }
                >
                  <option>不重复</option>
                  <option>每天</option>
                </select>
              </label>
              {draft.repeat === "不重复" ? (
                <label className={styles.scheduleIconInput}>
                  <span className={styles.srOnly}>执行日期</span>
                  <input
                    aria-label="执行日期"
                    placeholder="年 /月 /日"
                    value={draft.date}
                    onChange={(event) =>
                      setDraft({ ...draft, date: event.target.value })
                    }
                  />
                  <CalendarDays size={18} />
                </label>
              ) : null}
              <label className={styles.scheduleIconInput}>
                <span className={styles.srOnly}>执行时间</span>
                <input
                  aria-label="执行时间"
                  value={draft.time}
                  onChange={(event) =>
                    setDraft({ ...draft, time: event.target.value })
                  }
                />
                <Clock3 size={18} />
              </label>
            </div>
          </fieldset>
          <div className={styles.scheduleFieldBlock}>
            <label htmlFor="schedule-directory">工作目录</label>
            <div className={styles.scheduleBrowseRow}>
              <input
                id="schedule-directory"
                aria-label="工作目录"
                placeholder="ClassIn Space / 我的云盘"
                value={draft.directory}
                onChange={(event) =>
                  setDraft({ ...draft, directory: event.target.value })
                }
              />
              <button type="button">浏览</button>
            </div>
          </div>
          <div className={styles.scheduleFieldBlock}>
            <label htmlFor="schedule-expiry">到期时间 <span>（可选）</span></label>
            <div className={styles.scheduleIconInput}>
              <input
                id="schedule-expiry"
                aria-label="到期时间"
                placeholder="年 /月 /日"
                value={draft.expiresAt}
                onChange={(event) =>
                  setDraft({ ...draft, expiresAt: event.target.value })
                }
              />
              <CalendarDays size={18} />
            </div>
          </div>
          <div className={styles.scheduleFieldBlock}>
            <label>IM 通知 <span>（可选）</span></label>
            <div className={styles.scheduleNotificationPicker}>
              {notificationOpen ? (
                <div className={styles.scheduleNotificationMenu} role="menu">
                  {["飞书", "企业微信", "钉钉", "QQ", "微信"].map((channel) => {
                    const available = channel === "飞书";
                    const checked = draft.notifications.includes(channel);
                    return (
                      <label key={channel} aria-disabled={!available}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!available}
                          onChange={() => toggleNotification(channel)}
                        />
                        <span>{channel}</span>
                        {!available ? <em>未配置</em> : null}
                      </label>
                    );
                  })}
                </div>
              ) : null}
              <button
                type="button"
                aria-label="IM 通知"
                aria-expanded={notificationOpen}
                onClick={() => setNotificationOpen(!notificationOpen)}
              >
                {notificationLabel}
                <ChevronDown size={18} />
              </button>
            </div>
          </div>
        </div>
        <footer>
          <button className={styles.scheduleCancelButton} type="button" onClick={close}>
            取消
          </button>
          <button
            className={styles.schedulePrimaryButton}
            type="button"
            onClick={save}
          >
            {mode === "create" ? "创建任务" : "保存"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PublishWorkspace({
  close,
  finish,
}: Readonly<{ close: () => void; finish: () => void }>) {
  const [step, setStep] = useState(0);
  const steps = ["上传文件", "完善信息", "设置范围", "提交审核"];
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.publishWorkspace}
        role="dialog"
        aria-modal="true"
        aria-label="发布作品"
      >
        <header>
          <div>
            <span>内容资源</span>
            <h2>发布作品</h2>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="关闭发布作品"
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        <div className={styles.publishBody}>
          <nav aria-label="发布步骤">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                data-current={index === step}
                data-complete={index < step}
                onClick={() => index < step && setStep(index)}
              >
                <i>{index < step ? <Check size={14} /> : index + 1}</i>
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.publishForm}>
            {step === 0 ? (
              <>
                <h3>上传作品文件</h3>
                <p>支持课件、教案、试卷和素材包，单个文件不超过 200 MB。</p>
                <button className={styles.dropZone} type="button">
                  <Upload size={30} />
                  <strong>拖拽文件到这里，或点击选择文件</strong>
                  <span>PPTX、PDF、DOCX、ZIP</span>
                </button>
                <div className={styles.uploadedFile}>
                  <FileText size={22} />
                  <span>
                    <strong>机械波概念演示.pptx</strong>
                    <small>12.4 MB · 已完成解析</small>
                  </span>
                  <CircleCheck size={18} />
                </div>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <h3>完善作品信息</h3>
                <p>清晰的信息可以帮助其他教师准确理解和复用作品。</p>
                <Field label="作品标题">
                  <input defaultValue="机械波概念演示" />
                </Field>
                <Field label="作品简介">
                  <textarea defaultValue="围绕波速、频率和波长关系组织的智能课件。" />
                </Field>
                <div className={styles.formColumns}>
                  <Field label="品类">
                    <select>
                      <option>课件</option>
                    </select>
                  </Field>
                  <Field label="学科与学段">
                    <select>
                      <option>高中物理</option>
                    </select>
                  </Field>
                </div>
                <Field label="作品封面">
                  <button className={styles.coverUploader} type="button">
                    <Image size={20} /> 上传或自动生成封面
                  </button>
                </Field>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <h3>设置可见与复用范围</h3>
                <p>作品所有权不变，其他教师只能在授权范围内引用或改编。</p>
                <div className={styles.optionCards}>
                  <button data-selected type="button">
                    <span />
                    <strong>机构内公开</strong>
                    <small>ClassIn 教研中心内可发现</small>
                  </button>
                  <button type="button">
                    <span />
                    <strong>仅指定教研组</strong>
                    <small>选择可见的课程或教研组</small>
                  </button>
                </div>
                <Field label="复用权限">
                  <select>
                    <option>允许引用和改编，必须保留来源</option>
                    <option>仅允许引用</option>
                  </select>
                </Field>
              </>
            ) : null}
            {step === 3 ? (
              <div className={styles.reviewSubmission}>
                <CircleCheck size={42} />
                <h3>准备提交审核</h3>
                <p>文件、封面、作品信息和授权范围均已完整。</p>
                <dl>
                  <dt>作品</dt>
                  <dd>机械波概念演示</dd>
                  <dt>分类</dt>
                  <dd>高中物理 · 课件</dd>
                  <dt>可见范围</dt>
                  <dd>ClassIn 教研中心</dd>
                </dl>
              </div>
            ) : null}
          </div>
        </div>
        <footer>
          <button
            className={styles.ghostButton}
            type="button"
            onClick={() => (step === 0 ? close() : setStep(step - 1))}
          >
            {step === 0 ? "取消" : "上一步"}
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() =>
              step === steps.length - 1 ? finish() : setStep(step + 1)
            }
          >
            {step === steps.length - 1 ? "提交审核" : "下一步"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ToolDialog({
  mode,
  setMode,
  name,
  setName,
  endpoint,
  setEndpoint,
  close,
  save,
}: Readonly<{
  mode: "form" | "json";
  setMode: (v: "form" | "json") => void;
  name: string;
  setName: (v: string) => void;
  endpoint: string;
  setEndpoint: (v: string) => void;
  close: () => void;
  save: () => void;
}>) {
  const [description, setDescription] = useState("");
  const [transport, setTransport] = useState<"stdio" | "sse" | "http">(
    "stdio",
  );
  const [parameters, setParameters] = useState("");
  const [json, setJson] = useState("");
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.toolDialog}
        role="dialog"
        aria-modal="true"
        aria-label="添加工具连接"
      >
        <header>
          <h2>自定义</h2>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="关闭"
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        <div className={styles.modeTabs}>
          <button
            type="button"
            data-selected={mode === "form"}
            onClick={() => setMode("form")}
          >
            表单
          </button>
          <button
            type="button"
            data-selected={mode === "json"}
            onClick={() => setMode("json")}
          >
            JSON
          </button>
        </div>
        {mode === "form" ? (
          <div className={styles.formStack}>
            <Field label="服务名称">
              <input
                aria-label="工具名称"
                placeholder="输入服务名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="描述">
              <input
                aria-label="描述"
                placeholder="描述此 MCP 服务的用途"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="传输类型">
              <select
                aria-label="连接类型"
                value={transport}
                onChange={(event) =>
                  setTransport(event.target.value as "stdio" | "sse" | "http")
                }
              >
                <option value="stdio">标准输入输出（stdio）</option>
                <option value="sse">服务器推送事件（SSE）</option>
                <option value="http">HTTP 流式传输</option>
              </select>
            </Field>
            {transport === "stdio" ? (
              <>
                <Field label="命令">
                  <input
                    aria-label="命令"
                    placeholder="例如: node, npx, uvx, python"
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                  />
                </Field>
                <Field label="参数">
                  <textarea
                    aria-label="参数"
                    placeholder="每行一个参数"
                    value={parameters}
                    onChange={(event) => setParameters(event.target.value)}
                  />
                </Field>
                <div className={styles.toolRepeatableField}>
                  <span>环境变量</span>
                  <button type="button">
                    <Plus size={14} /> 添加
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field label="URL">
                  <input
                    aria-label="Endpoint"
                    placeholder="输入 MCP 服务 URL"
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                  />
                </Field>
                <div className={styles.toolRepeatableField}>
                  <span>HTTP 请求头</span>
                  <button type="button">
                    <Plus size={14} /> 添加
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <textarea
            className={styles.jsonEditor}
            aria-label="JSON"
            placeholder="在此粘贴 MCP 配置 JSON（支持 mcp.servers / mcpServers / servers）"
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
        )}
        <footer>
          <button className={styles.ghostButton} type="button" onClick={close}>
            取消
          </button>
          <button className={styles.primaryButton} type="button" onClick={save}>
            保存
          </button>
        </footer>
      </section>
    </div>
  );
}

function ToolInstallDialog({
  item,
  editing,
  close,
  confirm,
}: Readonly<{
  item: CapabilityItem;
  editing: boolean;
  close: () => void;
  confirm: () => void;
}>) {
  const protocol = item.meta[0] === "http" ? "http" : "stdio";
  const commandParts = item.meta[1]?.split(" ") ?? [];
  const [name, setName] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [location, setLocation] = useState(
    protocol === "stdio" ? commandParts[0] ?? "" : item.meta[1] ?? "",
  );
  const [parameters, setParameters] = useState(
    protocol === "stdio" ? commandParts.slice(1).join("\n") : "",
  );
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.toolDialog}
        role="dialog"
        aria-modal="true"
        aria-label={`${editing ? "编辑" : "安装"}${item.title}`}
      >
        <header>
          <h2>{editing ? "编辑 MCP 服务" : `安装 ${item.title}`}</h2>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="关闭"
            onClick={close}
          >
            <X size={19} />
          </button>
        </header>
        {editing ? (
          <div className={styles.modeTabs}>
            <button type="button" data-selected>
              表单
            </button>
            <button type="button">JSON</button>
          </div>
        ) : null}
        <div className={styles.formStack}>
          <Field label="服务名称">
            <input
              aria-label="服务名称"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="描述">
            <input
              aria-label="服务描述"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="传输类型">
            <input
              aria-label="传输类型"
              value={
                protocol === "http" ? "HTTP 流式传输" : "标准输入输出（stdio）"
              }
              readOnly
            />
          </Field>
          <Field label={protocol === "http" ? "URL" : "命令"}>
            <input
              aria-label={protocol === "http" ? "URL" : "命令"}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </Field>
          {protocol === "stdio" ? (
            <Field label="参数">
              <textarea
                aria-label="参数"
                value={parameters}
                onChange={(event) => setParameters(event.target.value)}
              />
            </Field>
          ) : null}
          {item.id === "tool-github" ? (
            <div className={styles.toolCredentialField}>
              <div>
                <span>环境变量</span>
                <em>· 必填配置</em>
                <button type="button">
                  <Plus size={14} /> 添加
                </button>
              </div>
              <div>
                <input
                  aria-label="环境变量名称"
                  value="GITHUB_PERSONAL_ACCESS_TOKEN"
                  readOnly
                />
                <input
                  aria-label="环境变量值"
                  type="password"
                  placeholder="GITHUB_PERSONAL_ACCESS_TOKEN"
                />
              </div>
            </div>
          ) : (
            <div className={styles.toolRepeatableField}>
              <span>{protocol === "http" ? "HTTP 请求头" : "环境变量"}</span>
              <button type="button">
                <Plus size={14} /> 添加
              </button>
            </div>
          )}
        </div>
        <footer>
          <button className={styles.ghostButton} type="button" onClick={close}>
            取消
          </button>
          <button className={styles.primaryButton} type="button" onClick={confirm}>
            {editing ? "保存" : "安装"}
          </button>
        </footer>
      </section>
    </div>
  );
}
function Field({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function ConfirmInstall({
  item,
  close,
  confirm,
}: Readonly<{ item: CapabilityItem; close: () => void; confirm: () => void }>) {
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.confirmDialog}
        role="dialog"
        aria-modal="true"
        aria-label={`确认安装 ${item.title}`}
      >
        <header>
          <h2>安装 {item.title}</h2>
          <button className={styles.iconButton} type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        <p>安装后可在任务中调用该 Skill。请确认权限范围：</p>
        <ul>
          {item.permissions.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <footer>
          <button className={styles.ghostButton} type="button" onClick={close}>
            取消
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={confirm}
          >
            确认安装
          </button>
        </footer>
      </section>
    </div>
  );
}
function Inspector({
  value,
  close,
}: Readonly<{
  value: { kind: string; item: CapabilityItem };
  close: () => void;
}>) {
  const title =
    value.kind === "preview"
      ? "文件预览"
      : value.kind === "source"
        ? "来源定位"
        : "运行历史";
  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.inspectorDialog}
        role="dialog"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            <p>{value.item.title}</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        <div className={styles.inspectorBody}>
          <FileText size={48} />
          <strong>{value.item.version ?? "当前版本"}</strong>
          <span>{value.item.source}</span>
          <p>来源、权限和关联 Run 已保留，可复查定位。</p>
        </div>
        <footer>
          <button className={styles.ghostButton} type="button" onClick={close}>
            关闭
          </button>
        </footer>
      </section>
    </div>
  );
}

function SettingsSurface() {
  const [section, setSection] = useState("general");
  const [feedback, setFeedback] = useState("");
  return (
    <main
      className={styles.settingsPage}
      aria-labelledby="settings-workspace-title"
    >
      <h1 id="settings-workspace-title" className={styles.srOnly}>
        设置
      </h1>
      <nav className={styles.settingsNav} aria-label="Work Buddy 设置分组">
        {SETTINGS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? "page" : undefined}
            onClick={() => setSection(id)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <SettingsPanel section={section} feedback={setFeedback} />
      {feedback ? (
        <p className={styles.toast} role="status">
          {feedback}
        </p>
      ) : null}
    </main>
  );
}
function SettingsPanel({
  section,
  feedback,
}: Readonly<{ section: string; feedback: (v: string) => void }>) {
  const title = SETTINGS.find(([id]) => id === section)?.[1] ?? "通用";
  if (section === "model" || section === "notifications")
    return (
      <section className={styles.settingsWorkspace}>
        <h2>{title}</h2>
        <div className={styles.settingsSplit}>
          <div className={styles.providerList}>
            <h3>{section === "model" ? "模型提供商" : "通知渠道"}</h3>
            {(section === "model"
              ? ["ClassIn AI", "DeepSeek", "Moonshot", "Qwen", "自定义"]
              : ["ClassIn 站内", "飞书", "企业微信", "钉钉"]
            ).map((provider, i) => (
              <button key={provider} type="button" data-selected={i === 0}>
                <i>{provider.slice(0, 1)}</i>
                <strong>{provider}</strong>
                <span className={styles.switchVisual} data-on={i === 0} />
              </button>
            ))}
          </div>
          <div className={styles.providerDetail}>
            <header>
              <div>
                <h3>
                  {section === "model"
                    ? "ClassIn AI 提供商设置"
                    : "ClassIn 站内通知"}
                </h3>
                <p>机构托管 · 数据边界已启用</p>
              </div>
              <span className={styles.status} data-tone="success">
                已连接
              </span>
            </header>
            {section === "model" ? (
              <>
                <Field label="机构连接">
                  <input value="由 ClassIn 机构策略托管" readOnly />
                </Field>
                <Field label="API 格式">
                  <div className={styles.radioRow}>
                    <label>
                      <input type="radio" defaultChecked />
                      ClassIn 兼容
                    </label>
                    <label>
                      <input type="radio" />
                      OpenAI 兼容
                    </label>
                  </div>
                </Field>
                <button
                  className={styles.ghostButton}
                  type="button"
                  onClick={() => feedback("模型连接测试完成，当前可用。")}
                >
                  <RefreshCw size={15} />
                  测试连接
                </button>
                <h4>可用模型列表</h4>
                <div className={styles.modelRows}>
                  <span>
                    <i />
                    ClassIn Teacher Reasoner <code>teacher-reasoner</code>
                  </span>
                  <span>
                    <i />
                    ClassIn Fast <code>teacher-fast</code>
                  </span>
                </div>
              </>
            ) : (
              <div className={styles.connectionState}>
                <CircleCheck size={28} />
                <strong>已连接</strong>
                <span>凭证由 ClassIn 账号自动管理</span>
                <button className={styles.ghostButton} type="button">
                  重新绑定
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  return (
    <section className={styles.settingsWorkspace}>
      <h2>{title}</h2>
      <SettingsContent section={section} feedback={feedback} />
    </section>
  );
}
function SettingsContent({
  section,
  feedback,
}: Readonly<{ section: string; feedback: (v: string) => void }>) {
  if (section === "sandbox")
    return (
      <>
        <h3 className={styles.settingsSectionTitle}>执行模式</h3>
        <div className={styles.optionCards}>
          <button disabled>
            <span />
            <strong>自动（优先沙箱）</strong>
            <small>优先使用隔离环境</small>
          </button>
          <button data-selected>
            <span />
            <strong>受控运行</strong>
            <small>遵循机构文件、网络和危险动作策略</small>
          </button>
          <button disabled>
            <span />
            <strong>仅沙箱</strong>
            <small>要求隔离环境可用</small>
          </button>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => feedback("沙箱健康检查完成。")}
        >
          检查运行环境
        </button>
      </>
    );
  if (section === "data")
    return (
      <>
        <div className={styles.backupTop}>
          <div>
            <h3>自动备份</h3>
            <p>每 24 小时备份个人 Run、Artifact 草稿、Skill 和偏好。</p>
          </div>
          <span className={styles.switchVisual} />
        </div>
        <div className={styles.backupStatus}>
          <h3>备份状态</h3>
          <dl>
            <dt>上次备份时间</dt>
            <dd>尚未备份</dd>
            <dt>文件大小</dt>
            <dd>-</dd>
            <dt>包含内容</dt>
            <dd>聊天记录、工作区文件与配置</dd>
          </dl>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => feedback("已创建备份任务。")}
        >
          立即备份
        </button>
      </>
    );
  if (section === "feedback")
    return (
      <div className={styles.feedbackForm}>
        <p className={styles.notice}>
          帮助我们持续改善 Work Buddy。提交前请移除学生敏感信息。
        </p>
        <Field label="反馈类型">
          <div className={styles.radioRow}>
            <label>
              <input type="radio" defaultChecked />
              功能建议
            </label>
            <label>
              <input type="radio" />
              问题反馈
            </label>
            <label>
              <input type="radio" />
              其他
            </label>
          </div>
        </Field>
        <Field label="详细描述">
          <textarea aria-label="反馈描述" />
        </Field>
        <Field label="附件上传（选填）">
          <button className={styles.uploadBox} type="button">
            <Plus size={18} />
            添加附件
          </button>
        </Field>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => feedback("反馈已保存为草稿。")}
        >
          提交反馈
        </button>
      </div>
    );
  if (section === "about")
    return (
      <div className={styles.aboutPanel}>
        <Sparkles size={32} />
        <h3>Work Buddy</h3>
        <p>面向教师的任务型 AI 工作台</p>
        <dl>
          <dt>当前版本</dt>
          <dd>v0.1</dd>
          <dt>能力状态</dt>
          <dd>[模拟] 高保真交互与固定数据</dd>
        </dl>
      </div>
    );
  return (
    <div className={styles.settingsRows}>
      <SettingRow title="默认任务类型" description="新建任务时优先展示的入口">
        <select>
          <option>生成智能课件</option>
          <option>生成课程方案包</option>
        </select>
      </SettingRow>
      <SettingRow title="任务通知" description="任务完成或需要确认时提醒">
        <span className={styles.switchVisual} data-on />
      </SettingRow>
      <SettingRow title="执行详情" description="默认折叠底层技术证据">
        <select>
          <option>默认折叠</option>
          <option>默认展开</option>
        </select>
      </SettingRow>
    </div>
  );
}
function SettingRow({
  title,
  description,
  children,
}: Readonly<{ title: string; description: string; children: ReactNode }>) {
  return (
    <div className={styles.settingRow}>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
