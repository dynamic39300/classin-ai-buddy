import { Search, Sparkles, UserRound } from 'lucide-react';
import { useId, type KeyboardEvent } from 'react';
import type { AgentDiscoveryProjection } from '@domain/class-agent/agent-discovery';
import {
  projectAgentPickerOptions,
  type AgentPickerOption,
  type AgentPickerPerson,
} from './agent-picker-options';
import styles from './AgentMentionPicker.module.css';

type AgentMentionPickerProps = Readonly<{
  projection: AgentDiscoveryProjection;
  people?: readonly AgentPickerPerson[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onQueryChange?: (query: string) => void;
  onSelectAgent: (agentId: string) => void;
  onSelectPerson?: (person: AgentPickerPerson) => void;
}>;

export function AgentMentionPicker({
  projection,
  people = [],
  activeIndex,
  onActiveIndexChange,
  onClose,
  onQueryChange,
  onSelectAgent,
  onSelectPerson,
}: AgentMentionPickerProps) {
  const listboxId = useId();
  const options = projectAgentPickerOptions(projection, people);
  const selected = options[activeIndex] ?? options[0];
  const choose = (option: AgentPickerOption | undefined) => {
    if (!option) return;
    if (option.kind === 'agent') onSelectAgent(option.agentId);
    else onSelectPerson?.(option.person);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      onActiveIndexChange(Math.max(0, Math.min(options.length - 1, activeIndex + direction)));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onActiveIndexChange(event.key === 'Home' ? 0 : Math.max(0, options.length - 1));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (!selected) return;
      event.preventDefault();
      choose(selected);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };
  const agentOptions = options.filter((option): option is Extract<AgentPickerOption, { kind: 'agent' }> => option.kind === 'agent');
  const peopleOptions = options.filter((option): option is Extract<AgentPickerOption, { kind: 'person' }> => option.kind === 'person');

  return (
    <section className={styles.picker} aria-label="选择班级 Agent" data-agent-picker-mode={projection.mode}>
      <header className={styles.header}>
        <span><strong>{projection.mode === 'mixed-mention' ? '选择提及对象' : '选择班级 Agent'}</strong><small>{projection.totalAuthorized} 个可用</small></span>
        {onQueryChange ? (
          <label className={styles.search}>
            <Search aria-hidden="true" size={15} />
            <span className={styles.srOnly}>搜索班级 Agent</span>
            <input aria-activedescendant={selected ? `${listboxId}-${selected.key}` : undefined} aria-autocomplete="list" aria-controls={listboxId} autoComplete="off" autoFocus onChange={(event) => onQueryChange(event.target.value)} onKeyDown={handleKeyDown} placeholder="搜索名称、学科或能力" role="combobox" value={projection.query} />
          </label>
        ) : <small className={styles.typedHint}>继续输入名称即可筛选</small>}
      </header>
      <div className={styles.list} id={listboxId} role="listbox" aria-label="可提及对象">
        {agentOptions.length > 0 ? (
          <div className={styles.group} role="group" aria-label="班级 Agent">
            <span className={styles.groupLabel}>班级 Agent</span>
            {agentOptions.map((option) => {
              const candidate = projection.candidates.find(({ agent }) => agent.id === option.agentId);
              if (!candidate) return null;
              const index = options.indexOf(option);
              return <button aria-selected={activeIndex === index} id={`${listboxId}-${option.key}`} key={option.key} onClick={() => choose(option)} onMouseEnter={() => onActiveIndexChange(index)} role="option" type="button"><span className={styles.avatar}><Sparkles aria-hidden="true" size={15} /></span><span className={styles.copy}><strong>{candidate.agent.name}<em>Agent</em></strong><small>{candidate.agent.classLabel} · {candidate.agent.capabilitySummary}</small></span></button>;
            })}
          </div>
        ) : null}
        {peopleOptions.length > 0 ? (
          <div className={styles.group} role="group" aria-label="班级成员">
            <span className={styles.groupLabel}>班级成员</span>
            {peopleOptions.map((option) => {
              const index = options.indexOf(option);
              return <button aria-selected={activeIndex === index} id={`${listboxId}-${option.key}`} key={option.key} onClick={() => choose(option)} onMouseEnter={() => onActiveIndexChange(index)} role="option" type="button"><span className={styles.avatar} data-person="true"><UserRound aria-hidden="true" size={15} /></span><span className={styles.copy}><strong>{option.person.name}</strong><small>{option.person.description}</small></span></button>;
            })}
          </div>
        ) : null}
        {options.length === 0 ? <div className={styles.empty} role="status"><strong>没有匹配的已授权 Agent</strong><span>请尝试名称、学科或能力关键词</span></div> : null}
      </div>
      <footer>↑↓ 选择 · Enter 确认 · Esc 关闭</footer>
    </section>
  );
}
