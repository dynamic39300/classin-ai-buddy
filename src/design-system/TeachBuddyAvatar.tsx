import styles from './TeachBuddyAvatar.module.css';

type TeachBuddyAvatarProps = Readonly<{
  size?: 'micro' | 'compact' | 'standard' | 'welcome';
}>;

export function TeachBuddyAvatar({ size = 'standard' }: TeachBuddyAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.avatar} ${styles[size]}`}
      data-teachbuddy-avatar="true"
      data-workbuddy-avatar="true"
    >
      <video
        className={styles.video}
        autoPlay
        loop
        muted
        playsInline
        poster="/brand/workbuddy-avatar-poster.png"
        preload="metadata"
      >
        <source src="/brand/workbuddy-avatar-loop.mp4" type="video/mp4" />
      </video>
    </span>
  );
}
