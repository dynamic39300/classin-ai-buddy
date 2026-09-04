import styles from './TeacherInAvatar.module.css';
import { publicAssetUrl } from '@shared/public-assets';

type TeacherInAvatarProps = Readonly<{
  size?: 'micro' | 'compact' | 'standard' | 'welcome';
}>;

export function TeacherInAvatar({ size = 'standard' }: TeacherInAvatarProps) {
  const poster = publicAssetUrl('brand/workbuddy-avatar-poster.png');
  return (
    <span
      aria-hidden="true"
      className={`${styles.avatar} ${styles[size]}`}
      data-teachbuddy-avatar="true"
      data-workbuddy-avatar="true"
      style={{ backgroundImage: `url("${poster}")` }}
    >
      <video
        className={styles.video}
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        preload="metadata"
      >
        <source src={publicAssetUrl('brand/workbuddy-avatar-loop.mp4')} type="video/mp4" />
      </video>
    </span>
  );
}
