import { ArrowLeft, QrCode, ScanLine, UserRoundPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeachingObjectIcon } from '@design-system/TeachingObjectIcon';
import type { AppRole } from '@domain/account/role';
import styles from './JoinWorkspace.module.css';

type JoinTarget = 'class' | 'open-course' | 'contact' | 'scan';

const TARGETS = [
  { id: 'class' as const, label: '加入班级', detail: '使用班级口令提交加入请求' },
  { id: 'open-course' as const, label: '加入公开课', detail: '使用公开课口令加入' },
  { id: 'contact' as const, label: '添加联系人', detail: '提交 ClassIn 账号或手机号' },
  { id: 'scan' as const, label: '扫一扫', detail: '识别班级、公开课或联系人二维码' },
];

function JoinTargetIcon({ target, size }: { target: JoinTarget; size: number }) {
  if (target === 'class' || target === 'open-course') return <TeachingObjectIcon kind={target} size={size} />;
  return target === 'contact'
    ? <UserRoundPlus aria-hidden="true" size={size} />
    : <ScanLine aria-hidden="true" size={size} />;
}

export function JoinWorkspace({ role }: { role: AppRole }) {
  const navigate = useNavigate();
  const [target, setTarget] = useState<JoinTarget>('class');
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const prefix = role === 'teacher' ? '/teacher' : '/student';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) return;
    if (target === 'open-course') {
      if (role === 'teacher') {
        setFeedback('加入公开课仅在学生视角开放，请先切换视角。');
        return;
      }
      navigate(`/student/open-courses/join?passcode=${encodeURIComponent(value.trim())}`);
      return;
    }
    setFeedback(target === 'class'
      ? '班级加入请求仅作 Placeholder，未写入真实成员关系。'
      : '联系人请求仅作 Placeholder，未建立真实联系人关系。');
  };

  const active = TARGETS.find(({ id }) => id === target)!;
  return (
    <section className={styles.page} aria-labelledby="join-title">
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(`${prefix}/messages?category=direct`)}><ArrowLeft aria-hidden="true" size={17} />消息</button>
        <div><span>联系人入口</span><h1 id="join-title">加入与添加</h1><p>选择要处理的对象</p></div>
      </header>
      <div className={styles.layout}>
        <nav aria-label="加入与添加类型">
          {TARGETS.map(({ id, label, detail }) => <button type="button" aria-current={target === id ? 'page' : undefined} key={id} onClick={() => { setTarget(id); setValue(''); setFeedback(null); }}><JoinTargetIcon target={id} size={18} /><span><strong>{label}</strong><small>{detail}</small></span></button>)}
        </nav>
        <main>
          <JoinTargetIcon target={active.id} size={24} />
          <h2>{active.label}</h2>
          {target === 'scan' ? <>
            <div className={styles.scanPlaceholder}><QrCode aria-hidden="true" size={48} /><strong>扫码 Placeholder</strong><span>未访问摄像头，也不会解析真实二维码</span></div>
            <button className={styles.primary} type="button" onClick={() => setFeedback('扫一扫仅作 Placeholder，未调用摄像头或写入扫码结果。')}>打开扫码入口</button>
          </> : <form onSubmit={submit}>
            <label>{target === 'contact' ? 'ClassIn 账号或手机号' : '口令'}<input autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} placeholder={target === 'contact' ? '输入账号或手机号' : '输入口令'} /></label>
            <button className={styles.primary} type="submit" disabled={!value.trim()}>{target === 'open-course' ? '继续' : '提交'}</button>
          </form>}
          {feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}
        </main>
      </div>
    </section>
  );
}
