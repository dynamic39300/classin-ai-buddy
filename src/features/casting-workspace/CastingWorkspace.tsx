import {
  Check,
  ChevronRight,
  CircleHelp,
  MonitorUp,
  RotateCcw,
  Square,
  Wifi,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperationGuard } from '@app/shell/use-operation-guard';
import { isCastingCode, transitionCasting, type CastingSession, type CastingTarget } from '@domain/casting/casting';
import { CASTING_CODE_TARGET, CASTING_NETWORK, CASTING_TARGETS } from '@mocks/scenarios/casting';
import styles from './CastingWorkspace.module.css';

const INITIAL_SESSION: CastingSession = { status: 'idle' };

function getSessionTarget(session: CastingSession): CastingTarget | null {
  return session.status === 'connecting' || session.status === 'connected' || session.status === 'failed'
    ? session.target
    : session.status === 'ended'
      ? session.previousTarget
      : null;
}

function getStatusLabel(status: CastingSession['status']): string {
  return status === 'idle'
    ? '准备投屏'
    : status === 'connecting'
      ? '连接中'
      : status === 'connected'
        ? '投屏中'
        : status === 'failed'
          ? '连接失败'
          : '投屏已结束';
}

function getTimeLabel(connectedAt: string): string {
  return connectedAt.split(' ').pop() ?? connectedAt;
}

export function CastingWorkspace() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CastingSession>(INITIAL_SESSION);
  const [code, setCode] = useState('');
  const { registerGuard } = useOperationGuard();
  const target = getSessionTarget(session);
  const isBusy = session.status === 'connecting' || session.status === 'connected';
  const statusLabel = getStatusLabel(session.status);
  const codeInvalid = code.length > 0 && !isCastingCode(code);

  useEffect(() => {
    registerGuard({
      context: isBusy
        ? { kind: 'critical-operation', operation: 'casting' }
        : { kind: 'idle' },
    });
    return () => registerGuard({ context: { kind: 'idle' } });
  }, [isBusy, registerGuard]);

  const transition = (event: Parameters<typeof transitionCasting>[1]) => {
    setSession((current) => transitionCasting(current, event));
  };

  const connect = (nextTarget: CastingTarget | null) => {
    if (!nextTarget) return;
    transition({ type: 'CONNECT', target: nextTarget });
  };

  const reset = () => {
    transition({ type: 'RESET' });
    setCode('');
  };

  const close = () => {
    if (!isBusy) navigate('/teacher/home');
  };

  return (
    <section className={styles.page} aria-label="投屏 SDK">
      <div className={styles.dialog} role="dialog" aria-modal="false" aria-labelledby="casting-title">
        <header className={styles.dialogHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.appIcon} aria-hidden="true"><MonitorUp size={18} /></span>
            <h1 id="casting-title">ClassIn 投屏</h1>
          </div>
          <button className={styles.closeButton} type="button" onClick={close} disabled={isBusy} aria-label={isBusy ? '投屏进行中，关闭不可用' : '关闭投屏窗口'} title={isBusy ? '请先取消连接或结束投屏' : '关闭投屏窗口'}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        {session.status === 'idle' ? (
          <div className={styles.idleBody}>
            <div className={styles.networkLine}>
              <Wifi aria-hidden="true" size={17} />
              <strong>{CASTING_NETWORK.name}</strong>
              <span>IP：{CASTING_NETWORK.ip}</span>
            </div>

            <section className={styles.codeSection} aria-labelledby="code-title">
              <h2 id="code-title">输码投屏</h2>
              <label htmlFor="casting-code">投屏码</label>
              <div className={styles.codeControl} data-invalid={codeInvalid}>
                <input id="casting-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="请输入投屏码" aria-describedby={codeInvalid ? 'code-help code-error' : 'code-help'} />
                <button type="button" onClick={() => connect(isCastingCode(code) ? CASTING_CODE_TARGET : null)} disabled={!isCastingCode(code)}>投屏</button>
              </div>
              <small id="code-help">输入教室或大屏上显示的 6 位数字。</small>
              {codeInvalid ? <span id="code-error" className={styles.error} role="alert">请输入 6 位数字投屏码</span> : null}
            </section>

            <div className={styles.choiceDivider} aria-hidden="true"><span>或选择设备</span></div>

            <section className={styles.deviceSection} aria-labelledby="device-title">
              <h2 id="device-title">附近设备</h2>
              <div className={styles.deviceList} aria-label="可用投屏设备">
                {CASTING_TARGETS.map((device) => (
                  <button key={device.id} className={styles.deviceRow} type="button" onClick={() => connect(device)} aria-label={`投屏到 ${device.name}`}>
                    <span className={styles.deviceIcon} aria-hidden="true"><MonitorUp size={19} /></span>
                    <span className={styles.deviceCopy}><strong>{device.name}</strong></span>
                    <ChevronRight aria-hidden="true" size={17} className={styles.rowAction} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.stateBody} role="status" aria-live="polite">
            <div className={styles.stateIcon} data-status={session.status} aria-hidden="true">
              {session.status === 'connected' || session.status === 'ended' ? <Check size={26} /> : session.status === 'failed' ? <X size={26} /> : <MonitorUp size={26} />}
            </div>
            <h2>{statusLabel}</h2>
            <p className={styles.stateCopy}>
              {session.status === 'connecting' && target ? `正在连接 ${target.name}，请确认设备已开启。` : null}
              {session.status === 'connected' && target ? `已连接 ${target.name}。画面传输为本地 Demo 模拟。` : null}
              {session.status === 'failed' ? session.reason : null}
              {session.status === 'ended' ? `${session.previousTarget.name} 的投屏已关闭。` : null}
            </p>

            {session.status === 'connecting' ? (
              <div className={styles.connectingActions}>
                <button className={styles.secondaryButton} type="button" onClick={() => transition({ type: 'CANCEL' })}><X aria-hidden="true" size={15} />取消连接</button>
                <div className={styles.demoActions} aria-label="Demo 连接结果">
                  <span>Demo</span>
                  <button type="button" onClick={() => transition({ type: 'SUCCEED', connectedAt: '2026-08-08 14:15' })}><Check aria-hidden="true" size={14} />成功</button>
                  <button type="button" onClick={() => transition({ type: 'FAIL', reason: '设备未响应。可以重新连接，真实设备能力未接入。' })}><X aria-hidden="true" size={14} />失败</button>
                </div>
              </div>
            ) : null}

            {session.status === 'connected' ? (
              <div className={styles.connectedDetails}>
                <span>开始时间</span>
                <strong>{getTimeLabel(session.connectedAt)}</strong>
                <button className={styles.endButton} type="button" onClick={() => transition({ type: 'END' })}><Square aria-hidden="true" size={14} />结束投屏</button>
              </div>
            ) : null}

            {session.status === 'failed' ? (
              <div className={styles.stateActions}>
                <button className={styles.primaryButton} type="button" onClick={() => transition({ type: 'RETRY' })}><RotateCcw aria-hidden="true" size={15} />重新连接</button>
                <button className={styles.secondaryButton} type="button" onClick={reset}>重新选择设备</button>
              </div>
            ) : null}

            {session.status === 'ended' ? <button className={styles.primaryButton} type="button" onClick={reset}>再次投屏</button> : null}
          </div>
        )}

        <footer className={styles.dialogFooter}>
          <CircleHelp aria-hidden="true" size={15} />
          <span>此窗口仅演示投屏流程，不连接真实设备或传输画面。</span>
        </footer>
      </div>
    </section>
  );
}
