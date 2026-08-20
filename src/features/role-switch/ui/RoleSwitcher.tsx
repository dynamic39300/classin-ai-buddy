import { ArrowRightLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoleHomePath, type AppRole } from '@domain/account/role';
import { resolveRoleSwitch } from '@domain/account/role-switch-policy';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import { useRoleSession } from '../model/role-session';
import styles from './RoleSwitcher.module.css';

type RoleSwitcherProps = {
  role: AppRole;
};

function getRoleShortLabel(role: AppRole): string {
  return role === 'teacher' ? '老师' : '学生';
}

function getSwitchLabel(role: AppRole): string {
  return role === 'teacher' ? '切换至学生' : '切换至老师';
}

export function RoleSwitcher({ role }: RoleSwitcherProps) {
  const { switchRole } = useRoleSession();
  const { guard } = useOperationGuard();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  const completeSwitch = (targetRole: AppRole) => {
    switchRole();
    setNotice(null);
    navigate(getRoleHomePath(targetRole), { replace: true });
  };

  const handleSwitch = (targetRole: AppRole) => {
    if (targetRole === role) return;

    const decision = resolveRoleSwitch(guard.context);
    if (decision.kind === 'blocked') {
      setNotice(decision.reason);
      return;
    }
    if (decision.kind === 'confirm-unsaved') {
      setNotice('当前页面有未保存编辑，请选择保存后切换、放弃后切换或取消。');
      return;
    }
    completeSwitch(targetRole);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.control} role="group" aria-label="角色切换">
        <div className={styles.currentRole} aria-label={`当前为${getRoleShortLabel(role)}`}>
          <Check aria-hidden="true" size={15} />
          <span>当前：</span>
          <strong>{getRoleShortLabel(role)}</strong>
        </div>
        <button
          className={styles.switchButton}
          type="button"
          aria-label={getSwitchLabel(role)}
          title={getSwitchLabel(role)}
          onClick={() => handleSwitch(role === 'teacher' ? 'student-family' : 'teacher')}
        >
          <ArrowRightLeft aria-hidden="true" size={15} />
          <span>{getSwitchLabel(role)}</span>
        </button>
      </div>
      {notice ? (
        <div className={styles.notice} role="alert">
          <p>{notice}</p>
          {guard.context.kind === 'draft' || guard.context.kind === 'unsaved-edit' ? (
            <div className={styles.noticeActions}>
              <button type="button" onClick={() => { guard.resolveUnsaved?.('save'); completeSwitch(role === 'teacher' ? 'student-family' : 'teacher'); }}>保存后切换</button>
              <button type="button" onClick={() => { guard.resolveUnsaved?.('discard'); completeSwitch(role === 'teacher' ? 'student-family' : 'teacher'); }}>放弃并切换</button>
              <button type="button" onClick={() => setNotice(null)}>取消</button>
            </div>
          ) : <button type="button" onClick={() => setNotice(null)}>知道了</button>}
        </div>
      ) : null}
    </div>
  );
}
