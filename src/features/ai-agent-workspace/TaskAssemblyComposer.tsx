import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  FolderOpen,
  HardDriveUpload,
  Plus,
  Search,
  Shapes,
  UsersRound,
  X,
} from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { taskMaterialKey, type TaskFileReference, type TaskMaterialReference } from '@domain/workbuddy/task-assembly';
import { createLocalTaskFileReference, validateLocalTaskFile } from '@mocks/adapters/task-material-source';
import { TASK_AGENT_OPTIONS, TASK_SKILL_OPTIONS } from './capability-workspace';
import { TaskFilePickerDialog } from './TaskFilePickerDialog';
import type { WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import { workBuddyCapabilityPath } from './workbuddy-experience-profile';
import type { WorkBuddyTaskAssembly, WorkBuddyTaskMaterialCatalogs } from './workbuddy-workspace';
import styles from './TaskAssemblyComposer.module.css';

type Picker = 'root' | 'agent' | 'skill' | 'file' | null;
export type TaskFileSourceChoice = TaskFileReference['source'];

type TaskAssemblyComposerProps = Readonly<{
  assembly: WorkBuddyTaskAssembly;
  profile: WorkBuddyExperienceProfile;
  canSubmit: boolean;
  contextPanelOpen: boolean;
  contextItemCount: number;
  showContextEntry?: boolean;
  onToggleContext: () => void;
  onSubmit: () => void;
  onTaskTypeChange: (taskType: NonNullable<(typeof TASK_SKILL_OPTIONS)[number]['taskIntent']>['taskType']) => void;
  onFeedback: (message: string) => void;
  taskMaterialCatalogs: WorkBuddyTaskMaterialCatalogs | null;
}>;

function iconForMaterial(reference: TaskMaterialReference) {
  if (reference.kind === 'agent') return <Bot aria-hidden="true" size={13} />;
  if (reference.kind === 'skill') return <Shapes aria-hidden="true" size={13} />;
  return <FileText aria-hidden="true" size={13} />;
}

export function TaskAssemblyComposer({
  assembly,
  profile,
  canSubmit,
  contextPanelOpen,
  contextItemCount,
  showContextEntry = true,
  onToggleContext,
  onSubmit,
  onTaskTypeChange,
  onFeedback,
  taskMaterialCatalogs,
}: TaskAssemblyComposerProps) {
  const [picker, setPicker] = useState<Picker>(null);
  const [fileDialogSource, setFileDialogSource] = useState<Exclude<TaskFileSourceChoice, 'local'> | null>(null);
  const [query, setQuery] = useState('');
  const [materialOverflow, setMaterialOverflow] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const materialListRef = useRef<HTMLDivElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const selectedKeys = new Set(assembly.session.materials.map(({ reference }) => taskMaterialKey(reference)));
  const needle = query.trim().toLocaleLowerCase('zh-CN');
  const visibleAgents = TASK_AGENT_OPTIONS.filter((agent) => !needle
    || `${agent.title} ${agent.recommendedPrompt}`.toLocaleLowerCase('zh-CN').includes(needle));
  const visibleSkills = TASK_SKILL_OPTIONS.filter((skill) => !needle
    || `${skill.title} ${skill.description}`.toLocaleLowerCase('zh-CN').includes(needle));

  useLayoutEffect(() => {
    const list = materialListRef.current;
    if (!list) {
      setMaterialOverflow(false);
      return;
    }
    const measure = () => setMaterialOverflow(list.scrollHeight > list.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [assembly.session.materials.length, assembly.view.expanded]);

  const closePicker = (returnFocus = false) => {
    setPicker(null);
    setQuery('');
    if (returnFocus) requestAnimationFrame(() => document.getElementById('task-assembly-plus')?.focus());
  };

  const openPickerLevel = (nextPicker: Exclude<Picker, null>) => {
    setQuery('');
    setPicker(nextPicker);
  };

  const browseQuickCapabilities = (direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const starts = Array.from(strip.querySelectorAll<HTMLButtonElement>(':scope > button'))
      .map((button) => button.offsetLeft);
    const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const reachableStarts = starts.filter((start) => start <= maxScroll + 1);
    const targetPoint = strip.scrollLeft + direction * strip.clientWidth * 0.72;
    const nextStart = direction > 0
      ? reachableStarts.find((start) => start >= targetPoint) ?? reachableStarts.at(-1) ?? 0
      : [...reachableStarts].reverse().find((start) => start <= targetPoint) ?? 0;
    strip.scrollTo({ left: nextStart, behavior: 'smooth' });
  };

  const selectSkill = (skill: (typeof TASK_SKILL_OPTIONS)[number], closeAfterSelection = false) => {
    const result = assembly.dispatch({ type: 'select-skill', skill });
    if (result.outcome === 'unchanged') {
      onFeedback('');
      return;
    }
    if (skill.taskIntent) onTaskTypeChange(skill.taskIntent.taskType);
    onFeedback('');
    if (closeAfterSelection) closePicker(true);
  };

  const selectAgent = (agent: (typeof TASK_AGENT_OPTIONS)[number], closeAfterSelection = false) => {
    const result = assembly.dispatch({ type: 'select-agent', agent });
    if (result.outcome === 'unchanged') {
      onFeedback('');
      return;
    }
    onFeedback('');
    if (closeAfterSelection) closePicker(true);
  };

  const addCatalogFiles = (files: readonly TaskFileReference[]) => {
    for (const file of files) {
      assembly.dispatch({ type: 'add-file', file, state: { status: 'ready' } });
    }
    onFeedback('');
  };

  const openFileSource = (source: TaskFileSourceChoice) => {
    closePicker();
    if (source === 'local') {
      localFileInputRef.current?.click();
      return;
    }
    if (!taskMaterialCatalogs) {
      onFeedback('当前体验未连接此文件来源。');
      return;
    }
    setFileDialogSource(source);
  };

  const addLocalFiles = (files: FileList | null) => {
    if (!files?.length) return;
    let failed = 0;
    for (const file of Array.from(files)) {
      const candidate = { name: file.name, type: file.type, size: file.size, lastModified: file.lastModified };
      const validation = validateLocalTaskFile(candidate);
      const reference = validation.ok ? validation.reference : createLocalTaskFileReference(candidate);
      const result = assembly.dispatch({
        type: 'add-file',
        file: reference,
        state: validation.ok ? { status: 'reading', progress: null } : { status: 'failed', reason: validation.reason },
      });
      if (result.outcome !== 'changed') continue;
      if (!validation.ok) {
        failed += 1;
        continue;
      }
      queueMicrotask(() => assembly.dispatch({
        type: 'update-file-state',
        key: taskMaterialKey(reference),
        state: { status: 'ready' },
      }));
    }
    onFeedback(failed
      ? `有 ${failed} 个本地文件格式不受支持，请移除后重新选择。`
      : '');
  };

  const materials = assembly.session.materials.length ? (
    <section className={styles.materialLane} aria-label="任务材料">
      <div
        className={styles.materialList}
        data-expanded={assembly.view.expanded}
        ref={materialListRef}
      >
        {assembly.session.materials.map((material) => {
          const key = taskMaterialKey(material.reference);
          const itemView = assembly.view.materials.find((item) => item.key === key);
          return (
            <span className={styles.materialChip} data-kind={material.reference.kind} data-status={material.state.status} key={key}>
              {iconForMaterial(material.reference)}
              <span className={styles.materialName}>{material.reference.title}</span>
              {material.state.status !== 'ready' ? <small>{itemView?.statusLabel}</small> : null}
              <button
                type="button"
                aria-label={`移除${material.reference.kind === 'agent' ? ' Agent ' : material.reference.kind === 'skill' ? ' Skill ' : '文件 '}${material.reference.title}`}
                onClick={() => {
                  assembly.dispatch({ type: 'remove-material', key });
                  onFeedback('');
                }}
              >
                <X aria-hidden="true" size={12} />
              </button>
            </span>
          );
        })}
      </div>
      {materialOverflow || assembly.view.expanded ? (
        <button
          className={styles.materialExpand}
          type="button"
          aria-expanded={assembly.view.expanded}
          onClick={() => assembly.dispatch({ type: 'set-expanded', expanded: !assembly.view.expanded })}
        >
          {assembly.view.expanded ? <><ChevronUp aria-hidden="true" size={13} />收起</> : <><ChevronDown aria-hidden="true" size={13} />展开全部</>}
        </button>
      ) : null}
    </section>
  ) : undefined;

  return (
    <>
      <section className={styles.quickSection} aria-label="常用 Agent 和 Skill">
        <div className={styles.quickStrip} data-testid="task-assembly-quick-strip" ref={stripRef}>
          {TASK_SKILL_OPTIONS.map((skill) => (
            <button
              type="button"
              key={skill.id}
              aria-label={`Skill ${skill.title}`}
              aria-pressed={selectedKeys.has(taskMaterialKey(skill))}
              onClick={() => selectSkill(skill)}
            >
              <span className={styles.quickType}><Shapes aria-hidden="true" size={13} />Skill</span>
              <strong>{skill.title}</strong>
            </button>
          ))}
          {TASK_AGENT_OPTIONS.map((agent) => (
            <button
              type="button"
              key={agent.id}
              aria-label={`Agent ${agent.title}`}
              aria-pressed={selectedKeys.has(taskMaterialKey(agent))}
              onClick={() => selectAgent(agent)}
            >
              {agent.avatarAsset ? <img alt="" src={agent.avatarAsset} /> : <Bot aria-hidden="true" size={15} />}
              <span className={styles.quickType}>Agent</span>
              <strong>{agent.title}</strong>
            </button>
          ))}
        </div>
        <div className={styles.quickControls} role="group" aria-label="浏览常用能力">
          <button type="button" aria-label="向左浏览常用能力" onClick={() => browseQuickCapabilities(-1)}><ChevronLeft aria-hidden="true" size={14} /></button>
          <button type="button" aria-label="向右浏览常用能力" onClick={() => browseQuickCapabilities(1)}><ChevronRight aria-hidden="true" size={14} /></button>
        </div>
      </section>

      <WorkspaceComposer
        ariaLabel="描述教学任务"
        canSubmit={canSubmit && assembly.view.canSubmitMaterials}
        className={styles.composer}
        mode="task"
        onSubmit={onSubmit}
        onValueChange={(value, caret) => assembly.dispatch({ type: 'replace-text', value, caret })}
        placeholder="例如：为高一（3）班生成一份函数单调性课件，包含概念讲解、例题和课堂练习"
        submitLabel="创建任务"
        tools={(
          <div className={styles.tools} onKeyDown={(event) => { if (event.key === 'Escape') closePicker(true); }}>
            <div
              className={styles.pickerAnchor}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closePicker();
              }}
            >
              <button
                id="task-assembly-plus"
                type="button"
                aria-label="添加任务材料"
                aria-haspopup="dialog"
                aria-expanded={picker !== null}
                onClick={() => {
                  if (picker) closePicker();
                  else openPickerLevel('root');
                }}
              >
                {picker ? <X aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
              </button>
              {picker ? (
                <section
                  className={styles.picker}
                  data-depth={picker === 'root' ? 'root' : 'nested'}
                  role="dialog"
                  aria-label={picker === 'root' ? '添加任务材料' : picker === 'agent' ? '选择 Agent' : picker === 'skill' ? '选择 Skill' : '添加文件'}
                >
                  <div className={styles.pickerView} data-kind={picker} key={picker}>
                    {picker !== 'root' ? (
                      <header className={styles.pickerHeader}>
                        <button type="button" aria-label="返回添加任务材料" onClick={() => openPickerLevel('root')}>
                          <ChevronLeft aria-hidden="true" size={15} />
                        </button>
                        <strong>{picker === 'file' ? '添加文件' : picker === 'agent' ? '选择 Agent' : '选择 Skill'}</strong>
                        <span aria-hidden="true" />
                      </header>
                    ) : null}

                    {picker === 'root' ? (
                      <div className={styles.rootMenu} role="menu">
                        <button type="button" role="menuitem" onClick={() => openPickerLevel('file')}><FolderOpen aria-hidden="true" size={16} /><span><strong>添加文件</strong><small>从三个文件来源中选择</small></span><ChevronRight aria-hidden="true" size={14} /></button>
                        <button type="button" role="menuitem" onClick={() => openPickerLevel('agent')}><Bot aria-hidden="true" size={16} /><span><strong>Agent</strong><small>引用专业教学智能体</small></span><ChevronRight aria-hidden="true" size={14} /></button>
                        <button type="button" role="menuitem" onClick={() => openPickerLevel('skill')}><Shapes aria-hidden="true" size={16} /><span><strong>Skill</strong><small>选择已安装的任务能力</small></span><ChevronRight aria-hidden="true" size={14} /></button>
                      </div>
                    ) : null}

                    {picker === 'file' ? (
                      <div className={styles.rootMenu} role="menu">
                        <button type="button" role="menuitem" onClick={() => openFileSource('local')}><HardDriveUpload aria-hidden="true" size={16} /><span><strong>本地文件</strong><small>从电脑选择文件</small></span></button>
                        <button type="button" role="menuitem" onClick={() => openFileSource('my-files')}><FileText aria-hidden="true" size={16} /><span><strong>我的文件</strong><small>从 TeacherIn 文件库选择</small></span></button>
                        <button type="button" role="menuitem" onClick={() => openFileSource('classin-space')}><FolderOpen aria-hidden="true" size={16} /><span><strong>ClassIn 空间</strong><small>从已授权空间选择</small></span></button>
                      </div>
                    ) : null}

                    {picker === 'agent' || picker === 'skill' ? (
                      <>
                        <label className={styles.searchBox}>
                          <Search aria-hidden="true" size={15} />
                          <input autoFocus aria-label={picker === 'agent' ? '搜索 Agent' : '搜索 Skill'} placeholder={picker === 'agent' ? '搜索 Agent' : '搜索 Skill'} value={query} onChange={(event) => setQuery(event.target.value)} />
                        </label>
                        <div className={styles.pickerList}>
                          {(picker === 'agent' ? visibleAgents : visibleSkills).map((item) => {
                            const selected = selectedKeys.has(taskMaterialKey(item));
                            return (
                              <button type="button" key={item.id} aria-pressed={selected} onClick={() => item.kind === 'agent' ? selectAgent(item, true) : selectSkill(item, true)}>
                                <span className={styles.pickerGlyph}>{item.kind === 'agent' ? <Bot aria-hidden="true" size={15} /> : <Shapes aria-hidden="true" size={15} />}</span>
                                <span><strong>{item.title}</strong><small>{item.kind === 'agent' ? item.recommendedPrompt : item.description}</small></span>
                                <em>{selected ? '已选择' : item.kind === 'agent' ? 'AgentIn' : '官方'}</em>
                              </button>
                            );
                          })}
                          {picker === 'agent' && !visibleAgents.length ? <p className={styles.empty}>没有匹配的 Agent</p> : null}
                          {picker === 'skill' && !visibleSkills.length ? <p className={styles.empty}>没有匹配的已安装 Skill</p> : null}
                        </div>
                        <Link className={styles.manageLink} to={workBuddyCapabilityPath(profile, picker === 'agent' ? 'agentin' : 'skills')} onClick={() => closePicker()}>
                          {picker === 'agent' ? <Bot aria-hidden="true" size={15} /> : <Shapes aria-hidden="true" size={15} />}
                          {picker === 'agent' ? '更多 Agent' : '打开技能市场'}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
            {materials}
            {showContextEntry ? <button type="button" aria-expanded={contextPanelOpen} aria-controls="workbuddy-core-context-panel" onClick={onToggleContext}><UsersRound aria-hidden="true" size={15} />核心上下文 · {contextItemCount}</button> : null}
          </div>
        )}
        value={assembly.view.text}
      />

      <input
        ref={localFileInputRef}
        hidden
        multiple
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.mp4"
        onChange={(event) => {
          addLocalFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />

      {fileDialogSource && taskMaterialCatalogs ? (
        <TaskFilePickerDialog
          source={fileDialogSource}
          port={fileDialogSource === 'my-files' ? taskMaterialCatalogs.myFiles : taskMaterialCatalogs.classInSpace}
          selectedKeys={selectedKeys}
          onAdd={addCatalogFiles}
          onClose={() => setFileDialogSource(null)}
        />
      ) : null}
    </>
  );
}
