import styles from './HomeTimelineDate.module.css';

export type HomeTimelineDay = '今天' | '明天' | '后天';

type HomeTimelineDateProps = {
  date: string;
  relative: HomeTimelineDay;
  count: number;
};

function formatTimelineDate(value: string): string {
  const date = new Date(`${value}T00:00:00+08:00`);
  const monthDay = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const weekday = date.toLocaleDateString('zh-CN', { weekday: 'short' });
  return `${monthDay} ${weekday}`;
}

export function HomeTimelineDate({ date, relative, count }: HomeTimelineDateProps) {
  return (
    <header className={styles.timelineDate} data-today={relative === '今天'} data-timeline-day={relative}>
      <span className={styles.dateCopy}>
        <strong>{relative}</strong>
        <span className={styles.dateMeta}>
          <time dateTime={date}>{formatTimelineDate(date)}</time>
          <span>{count} 项</span>
        </span>
      </span>
      <span className={styles.dayNode} data-timeline-node="day" aria-hidden="true" />
    </header>
  );
}
