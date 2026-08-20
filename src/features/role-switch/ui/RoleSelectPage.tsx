import { BookOpen, BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoleHomePath, type AppRole } from '@domain/account/role';
import { useRoleSession } from '../model/role-session';
import styles from './RoleSelectPage.module.css';

const ROLE_OPTIONS: ReadonlyArray<{
  role: AppRole;
  label: string;
  description: string;
  Icon: typeof BriefcaseBusiness;
}> = [
  {
    role: 'teacher',
    label: '老师视角',
    description: '管理班级、布置作业和查看报告',
    Icon: BriefcaseBusiness,
  },
  {
    role: 'student-family',
    label: '学生视角',
    description: '查看课程、完成作业和跟踪成长',
    Icon: BookOpen,
  },
];

export function RoleSelectPage() {
  const { selectRole } = useRoleSession();
  const navigate = useNavigate();

  const handleSelect = (role: AppRole) => {
    selectRole(role);
    navigate(getRoleHomePath(role), { replace: true });
  };

  return (
    <main className={styles.page}>
      <section className={styles.identity} aria-labelledby="eeo-slogan">
        <div className={styles.productLockup} aria-label="ClassIn 桌面端">
          <span className={styles.productName}>ClassIn</span>
          <span className={styles.productPlatform}>桌面端</span>
        </div>
        <div className={styles.brandStatement}>
          <img className={styles.eeoLogo} src="/brand/eeo.svg" alt="EEO" />
          <p id="eeo-slogan">Empower Education Online</p>
        </div>
        <p className={styles.brandCaption}>翼鸥教育旗下在线教与学平台</p>
      </section>

      <section className={styles.selector} aria-label="视角选择">
        <header className={styles.selectorHeader}>
          <span>欢迎使用 ClassIn</span>
          <h1 id="role-select-title">选择本次使用视角</h1>
          <p>进入与你当前身份对应的工作台，之后可从侧栏身份区随时切换。</p>
        </header>
        <div className={styles.options}>
          {ROLE_OPTIONS.map(({ role, label, description, Icon }) => (
            <button
              className={styles.roleOption}
              data-role={role}
              key={role}
              type="button"
              onClick={() => handleSelect(role)}
            >
              <span className={styles.roleIcon}><Icon aria-hidden="true" size={22} /></span>
              <span className={styles.roleCopy}>
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          ))}
        </div>
        <p className={styles.legal}>本 Demo 使用本地模拟数据，不连接真实 ClassIn 账号。</p>
      </section>
    </main>
  );
}
