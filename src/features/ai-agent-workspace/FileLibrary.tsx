import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Filter,
  Link2,
  MessageSquare,
  Presentation,
  Search,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  FILE_ASSET_FIXTURES,
  FILE_ASSET_KIND_OPTIONS,
  buildFileAssetView,
  type FileAsset,
  type FileAssetKind,
} from "./file-library";
import styles from "./FileLibrary.module.css";

type Props = Readonly<{
  onUseAsContext: (asset: FileAsset) => void;
  onOpenRun: (runId: string) => void;
}>;

const SHARE_TARGETS = [
  {
    id: "teacher-li",
    label: "李明老师",
    kind: "一对一聊天",
    detail: "高中数学教研组",
    icon: MessageSquare,
  },
  {
    id: "class-group",
    label: "高一（3）班班级群",
    kind: "班级群",
    detail: "当前课程群聊",
    icon: Users,
  },
  {
    id: "research-group",
    label: "高中数学教研组",
    kind: "群聊",
    detail: "8 位教师",
    icon: Users,
  },
] as const;

const TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: "all" | FileAssetKind;
  label: string;
}> = [
  { value: "all", label: "全部类型" },
  ...FILE_ASSET_KIND_OPTIONS.map((option) => ({
    value: option,
    label: option,
  })),
];

function AssetIcon({
  asset,
  size = 18,
}: Readonly<{ asset: FileAsset; size?: number }>) {
  const Icon =
    asset.kind === "课件"
      ? Presentation
      : asset.kind === "表格"
        ? FileSpreadsheet
        : asset.kind === "素材包"
          ? FileArchive
          : FileText;
  return <Icon aria-hidden="true" size={size} />;
}

export function FileLibrary({ onUseAsContext, onOpenRun }: Props) {
  const [assets, setAssets] = useState<FileAsset[]>(() =>
    FILE_ASSET_FIXTURES.map((asset) => ({ ...asset })),
  );
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | FileAssetKind>("all");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [selected, setSelected] = useState<FileAsset | null>(null);
  const [sharing, setSharing] = useState<FileAsset | null>(null);
  const [shareTargetId, setShareTargetId] = useState<string>(
    SHARE_TARGETS[0].id,
  );
  const [feedback, setFeedback] = useState("");
  const typeControlRef = useRef<HTMLDivElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const view = useMemo(
    () => buildFileAssetView(assets, { query, kind, favoriteOnly }),
    [assets, favoriteOnly, kind, query],
  );

  const selectedTypeLabel =
    TYPE_FILTER_OPTIONS.find((option) => option.value === kind)?.label ??
    "全部类型";

  useEffect(() => {
    if (!typeMenuOpen) return;

    window.requestAnimationFrame(() => {
      typeMenuRef.current
        ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
        ?.focus();
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (typeControlRef.current?.contains(event.target as Node)) return;
      setTypeMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setTypeMenuOpen(false);
      window.requestAnimationFrame(() => typeTriggerRef.current?.focus());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [typeMenuOpen]);

  const resetFilters = () => {
    setQuery("");
    setKind("all");
    setTypeMenuOpen(false);
    setFavoriteOnly(false);
  };
  const toggleFavorite = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    setAssets((current) =>
      current.map((candidate) =>
        candidate.id === asset.id
          ? { ...candidate, favorite: !candidate.favorite }
          : candidate,
      ),
    );
    if (selected?.id === asset.id)
      setSelected({ ...asset, favorite: !asset.favorite });
    setFeedback(
      `[模拟] ${asset.name}${asset.favorite ? "已取消收藏" : "已加入收藏"}。`,
    );
  };
  const openShare = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!asset.canShare) return;
    setShareTargetId(SHARE_TARGETS[0].id);
    setSharing(asset);
  };
  const attachAsContext = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (asset.canUseAsContext) onUseAsContext(asset);
  };
  const openRun = (asset: FileAsset) => {
    if (asset.project.runId) onOpenRun(asset.project.runId);
  };

  return (
    <section className={styles.scene} aria-label="我的文件">
      <div className={styles.toolbar} aria-label="文件筛选">
        <div
          className={styles.selectControl}
          ref={typeControlRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setTypeMenuOpen(false);
            }
          }}
        >
          <button
            ref={typeTriggerRef}
            className={styles.selectTrigger}
            type="button"
            aria-label="筛选文件类型"
            aria-haspopup="listbox"
            aria-expanded={typeMenuOpen}
            aria-controls="file-type-filter-options"
            onClick={() => setTypeMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              setTypeMenuOpen(true);
            }}
          >
            <Filter aria-hidden="true" size={16} />
            <span>{selectedTypeLabel}</span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
          {typeMenuOpen ? (
            <div
              ref={typeMenuRef}
              className={styles.selectMenu}
              id="file-type-filter-options"
              role="listbox"
              aria-label="文件类型选项"
              onKeyDown={(event) => {
                const options = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="option"]',
                  ),
                );
                const currentIndex = options.indexOf(
                  document.activeElement as HTMLElement,
                );
                const nextIndex =
                  event.key === "ArrowDown"
                    ? (currentIndex + 1) % options.length
                    : event.key === "ArrowUp"
                      ? (currentIndex - 1 + options.length) % options.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? options.length - 1
                          : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                options[nextIndex]?.focus();
              }}
            >
              {TYPE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={styles.selectOption}
                  type="button"
                  role="option"
                  aria-selected={kind === option.value}
                  tabIndex={kind === option.value ? 0 : -1}
                  onClick={() => {
                    setKind(option.value);
                    setTypeMenuOpen(false);
                    window.requestAnimationFrame(() =>
                      typeTriggerRef.current?.focus(),
                    );
                  }}
                >
                  <span>{option.label}</span>
                  <Check
                    className={styles.optionCheck}
                    aria-hidden="true"
                    size={15}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" size={17} />
          <span className={styles.srOnly}>搜索文件、任务或课程</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文件、任务或课程"
          />
        </label>
        <button
          className={styles.favoriteFilter}
          type="button"
          aria-pressed={favoriteOnly}
          onClick={() => setFavoriteOnly((current) => !current)}
        >
          <Star
            aria-hidden="true"
            size={16}
            fill={favoriteOnly ? "currentColor" : "none"}
          />
          我的收藏
          <span>{view.favoriteCount}</span>
        </button>
        <output className={styles.resultSummary} aria-live="polite">
          {view.resultCount} 个文件 / {view.groups.length} 个项目
        </output>
      </div>

      {view.groups.length ? (
        <div
          className={styles.timelineList}
          role="region"
          aria-label="按任务分组的 AI 协作文件"
        >
          <div className={styles.fileColumns} aria-hidden="true">
            <span>文件</span>
            <span>类型</span>
            <span>生成时间</span>
            <span>大小</span>
            <span />
          </div>
          {view.groups.map((group) => (
            <section
              className={styles.sessionGroup}
              key={group.project.id}
              aria-labelledby={`file-group-${group.project.id}`}
            >
              <header className={styles.sessionHeader}>
                <div className={styles.sessionIdentity}>
                  <span className={styles.groupIcon}>
                    <Bot aria-hidden="true" size={19} />
                  </span>
                  <div className={styles.groupCopy}>
                    <h2 id={`file-group-${group.project.id}`}>
                      {group.project.title}
                    </h2>
                    <p>{group.project.context}</p>
                  </div>
                </div>
                <span className={styles.sessionCount}>
                  {group.assets.length} 个文件
                </span>
                {group.project.runId ? (
                  <button
                    className={styles.runButton}
                    type="button"
                    onClick={() => onOpenRun(group.project.runId!)}
                  >
                    回到任务
                    <ExternalLink aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </header>
              <div className={styles.fileList}>
                {group.assets.map((asset) => (
                  <article className={styles.fileItem} key={asset.id}>
                    <button
                      className={styles.assetOpen}
                      type="button"
                      aria-label={`查看${asset.name}`}
                      onClick={() => setSelected(asset)}
                    >
                      <span className={styles.assetIcon} data-kind={asset.kind}>
                        <AssetIcon asset={asset} />
                      </span>
                      <span>
                        <strong>{asset.name}</strong>
                      </span>
                    </button>
                    <span className={styles.fileKind}>{asset.kind}</span>
                    <time
                      className={styles.fileTime}
                      dateTime={asset.createdAt}
                    >
                      {asset.createdLabel}
                    </time>
                    <span className={styles.fileSize}>{asset.size}</span>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        aria-label={`${asset.name}收藏`}
                        aria-pressed={asset.favorite}
                        title={asset.favorite ? "取消收藏" : "收藏"}
                        onClick={(event) => toggleFavorite(asset, event)}
                      >
                        <Star
                          aria-hidden="true"
                          size={16}
                          fill={asset.favorite ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={`${asset.name}作为上下文`}
                        title="作为上下文"
                        disabled={!asset.canUseAsContext}
                        onClick={(event) => attachAsContext(asset, event)}
                      >
                        <Link2 aria-hidden="true" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label={`${asset.name}分享`}
                        title="分享"
                        disabled={!asset.canShare}
                        onClick={(event) => openShare(asset, event)}
                      >
                        <Share2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search aria-hidden="true" size={28} />
          <strong>没有找到匹配文件</strong>
          <p>尝试更换文件类型或搜索关键词。</p>
          <button type="button" onClick={resetFilters}>
            清除筛选
          </button>
        </div>
      )}

      {feedback ? (
        <p className={styles.toast} role="status">
          <Check aria-hidden="true" size={16} />
          {feedback}
        </p>
      ) : null}

      {selected ? (
        <div
          className={styles.detailBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <aside
            className={styles.detailPanel}
            aria-label={`${selected.name}文件详情`}
          >
            <header>
              <div>
                <span>{selected.kind}</span>
                <h2>{selected.name}</h2>
              </div>
              <button
                type="button"
                aria-label="关闭文件详情"
                onClick={() => setSelected(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <div className={styles.preview}>
              <span className={styles.previewIcon}>
                <AssetIcon asset={selected} size={34} />
              </span>
              <strong>{selected.extension}</strong>
              <p>{selected.summary}</p>
              <small>[模拟] 当前仅展示结构化文件摘要</small>
            </div>
            <section className={styles.detailSection}>
              <h3>任务与回溯</h3>
              <dl>
                <div>
                  <dt>任务 / 项目</dt>
                  <dd>{selected.project.title}</dd>
                </div>
                <div>
                  <dt>教学范围</dt>
                  <dd>{selected.project.context}</dd>
                </div>
                <div>
                  <dt>生成时间</dt>
                  <dd>{selected.createdLabel}</dd>
                </div>
                <div>
                  <dt>版本</dt>
                  <dd>{selected.version}</dd>
                </div>
              </dl>
            </section>
            <section className={styles.detailSection}>
              <h3>复用记录</h3>
              <p>
                已作为上下文引用 {selected.reuseCount} 次
                {selected.sharedTargets.length
                  ? `，最近分享到${selected.sharedTargets.join("、")}`
                  : "，尚未分享"}
                。
              </p>
            </section>
            <div className={styles.detailActions}>
              <button
                className={styles.contextButton}
                type="button"
                disabled={!selected.canUseAsContext}
                onClick={() => attachAsContext(selected)}
              >
                <Link2 aria-hidden="true" size={16} />
                作为上下文
              </button>
              <button
                type="button"
                disabled={!selected.canShare}
                onClick={() => openShare(selected)}
              >
                <Share2 aria-hidden="true" size={16} />
                分享
              </button>
              <button
                type="button"
                onClick={() =>
                  setFeedback(`[模拟] ${selected.name} 已准备下载。`)
                }
              >
                <Download aria-hidden="true" size={16} />
                下载
              </button>
              {selected.project.runId ? (
                <button type="button" onClick={() => openRun(selected)}>
                  <ExternalLink aria-hidden="true" size={16} />
                  回到任务
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {sharing ? (
        <div className={styles.dialogBackdrop}>
          <section
            className={styles.shareDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-file-title"
          >
            <header>
              <div>
                <span>[模拟] 分享文件</span>
                <h2 id="share-file-title">选择发送位置</h2>
                <p>{sharing.name}</p>
              </div>
              <button
                type="button"
                aria-label="关闭分享文件"
                onClick={() => setSharing(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <fieldset className={styles.targetList}>
              <legend>发送到</legend>
              {SHARE_TARGETS.map((target) => {
                const Icon = target.icon;
                return (
                  <label key={target.id}>
                    <input
                      type="radio"
                      name="share-target"
                      value={target.id}
                      checked={shareTargetId === target.id}
                      onChange={() => setShareTargetId(target.id)}
                    />
                    <span className={styles.targetIcon}>
                      <Icon aria-hidden="true" size={17} />
                    </span>
                    <span>
                      <strong>{target.label}</strong>
                      <small>
                        {target.kind} / {target.detail}
                      </small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <footer>
              <button
                type="button"
                onClick={() => {
                  setFeedback(`[模拟] ${sharing.name} 的分享链接已复制。`);
                  setSharing(null);
                }}
              >
                <Copy aria-hidden="true" size={16} />
                复制链接
              </button>
              <button
                className={styles.sendButton}
                type="button"
                onClick={() => {
                  const target = SHARE_TARGETS.find(
                    (candidate) => candidate.id === shareTargetId,
                  )!;
                  setFeedback(
                    `[模拟] ${sharing.name} 已发送到${target.label}。`,
                  );
                  setSharing(null);
                }}
              >
                <Share2 aria-hidden="true" size={16} />
                发送
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
