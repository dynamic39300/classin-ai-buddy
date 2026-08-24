import styles from './WorkBuddyAvatar.module.css';

type WorkBuddyAvatarProps = Readonly<{
  size?: 'compact' | 'standard' | 'welcome';
}>;

export function WorkBuddyAvatar({ size = 'standard' }: WorkBuddyAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.avatar} ${styles[size]}`}
      data-workbuddy-avatar="true"
    >
      <video
        className={styles.video}
        autoPlay
        loop
        muted
        playsInline
        poster="/brand/workbuddy-avatar-poster.png"
        preload="auto"
      >
        <source src="/brand/workbuddy-avatar-loop.mp4" type="video/mp4" />
      </video>
    </span>
  );
}
