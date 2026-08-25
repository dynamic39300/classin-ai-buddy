import { Check, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { STANDALONE_TEACHBUDDY_ROUTES, TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { useStandaloneTeacher } from './standalone-teacher-context';
import styles from './StandaloneWorkBuddy.module.css';

const PRODUCT_PREVIEW = '/brand/workbuddy-standalone-product-preview.png';

export function StandaloneLandingPage() {
  const { identity } = useStandaloneTeacher();
  return (
    <div className={styles.marketingPage}>
      <header className={styles.marketingHeader}>
        <Link className={styles.wordmark} to={STANDALONE_TEACHBUDDY_ROUTES.root}><span><Sparkles size={18} /></span><strong>{TEACHBUDDY_BRAND.officialName}</strong><small>{TEACHBUDDY_BRAND.descriptor}</small></Link>
        <nav aria-label="官网导航"><a href="#capabilities">教学能力</a><a href="#plans">AI 点数</a><a href="#classin">连接 ClassIn</a></nav>
        <div className={styles.headerActions}>{identity.status === 'signed_in' ? <Link to={STANDALONE_TEACHBUDDY_ROUTES.newTask}>进入工作台</Link> : <><Link to={STANDALONE_TEACHBUDDY_ROUTES.login}>登录</Link><Link data-primary="true" to={STANDALONE_TEACHBUDDY_ROUTES.register}>免费开始</Link></>}</div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>为每一位老师准备的 AI 教学工作台</span>
            <h1>把教学想法，变成<br /><em>可以直接审阅的成果</em></h1>
            <p>从一节课、一套课程方案到一份测验，{TEACHBUDDY_BRAND.shortName} 通过对话理解你的目标，生成可检查、可修改的教学产物。</p>
            <div className={styles.heroActions}><Link data-primary="true" to={identity.status === 'signed_in' ? STANDALONE_TEACHBUDDY_ROUTES.newTask : STANDALONE_TEACHBUDDY_ROUTES.register}>免费开始 <span aria-hidden="true">→</span></Link><a href="#classin">了解 ClassIn</a></div>
            <div className={styles.heroProof}><span><Check size={14} />个人教师账号</span><span><Check size={14} />注册即得 360 AI 点数</span><span><Check size={14} />结果先审阅再使用</span></div>
          </div>
          <figure className={styles.productVisual}><img alt={`${TEACHBUDDY_BRAND.officialName} 教师工作台的新建任务页面`} src={PRODUCT_PREVIEW} /><figcaption><span>产品体验</span><strong>一个入口，承接完整教学任务</strong></figcaption></figure>
        </section>

        <section className={styles.capabilities} id="capabilities" aria-labelledby="capabilities-title">
          <header><span>从目标到成果</span><h2 id="capabilities-title">不是聊天窗口，是老师的任务工作台</h2><p>每个任务都保留上下文、过程、产物与确认记录。</p></header>
          <div><article><span>01</span><h3>生成智能课件</h3><p>明确教学范围、时长与方式，生成可逐页审阅和修改的课件。</p></article><article><span>02</span><h3>生成课程方案包</h3><p>一次形成课件、作业、测验与录播脚本，并分别确认处理。</p></article><article><span>03</span><h3>生成诊断测验</h3><p>生成含教师版答案与解析的试卷，再沉淀为教学活动草稿。</p></article></div>
        </section>

        <section className={styles.pointsStory} id="plans" aria-labelledby="points-title">
          <div><span className={styles.kicker}>清晰可控的 AI 点数</span><h2 id="points-title">先看到消耗，再开始任务</h2><p>每类任务都有清晰报价。创建成功才结算，未创建会释放预占点数，流水可随时核对。</p><Link to={STANDALONE_TEACHBUDDY_ROUTES.register}>领取 360 点免费体验</Link></div>
          <dl><div><dt>60</dt><dd>单个课件</dd></div><div><dt>80</dt><dd>诊断测验</dd></div><div><dt>120</dt><dd>课程方案包</dd></div></dl>
        </section>

        <section className={styles.classinStory} id="classin" aria-labelledby="classin-title">
          <div><span className={styles.kicker}>独立使用，也能继续连接</span><h2 id="classin-title">没有 ClassIn 上下文，也可以开始</h2></div>
          <div><p>首期可通过任务描述和上传资料完成生成。连接 ClassIn 后，可自动带入班级、课程、作业和学情，并把已确认结果沉淀到教学业务中。</p><a href="https://www.classin.com/" rel="noreferrer" target="_blank">了解 ClassIn 教学平台 <span aria-hidden="true">↗</span></a></div>
        </section>
      </main>
      <footer className={styles.marketingFooter}><span>{TEACHBUDDY_BRAND.officialName}</span><span>面向教师的独立 AI 教学工作台</span></footer>
    </div>
  );
}

function safeNext(value: string | null): string {
  return value?.startsWith(`${STANDALONE_TEACHBUDDY_ROUTES.app}/`) ? value : STANDALONE_TEACHBUDDY_ROUTES.newTask;
}

export function StandaloneAuthPage({ mode }: Readonly<{ mode: 'login' | 'register' }>) {
  const { identity, login, register } = useStandaloneTeacher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  if (identity.status === 'signed_in') return <Navigate to={next} replace />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = mode === 'register' ? register({ name, email, password }) : login({ email, password });
    if (result.ok) {
      navigate(next, { replace: true, state: { intent: 'context-attached' } });
      return;
    }
    const messages: Record<string, string> = {
      invalid_name: '请输入至少 2 个字的教师姓名。', invalid_email: '请输入有效的邮箱地址。', weak_password: '密码至少需要 8 位。',
      email_exists: '该邮箱已注册，请直接登录。', invalid_credentials: '邮箱或密码不正确。',
    };
    setError(messages[result.reason] ?? '暂时无法继续，请检查后重试。');
  };

  return (
    <main className={styles.authPage}>
      <Link className={styles.authBrand} to={STANDALONE_TEACHBUDDY_ROUTES.root}><span><Sparkles size={20} /></span><strong>{TEACHBUDDY_BRAND.officialName}</strong><small>{TEACHBUDDY_BRAND.descriptor}</small></Link>
      <section className={styles.authPanel} aria-labelledby="auth-title">
        <span className={styles.kicker}>教师个人账号</span>
        <h1 id="auth-title">{mode === 'register' ? '开始你的 AI 教学工作台' : `欢迎回到 ${TEACHBUDDY_BRAND.shortName}`}</h1>
        <p>{mode === 'register' ? '注册即得 360 AI 点数，完整体验课件、方案与测验任务。' : '继续查看任务、教学产物和 AI 点数流水。'}</p>
        <form onSubmit={submit} noValidate>
          {mode === 'register' ? <label>教师称呼<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：林老师" /></label> : null}
          <label>邮箱<input autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teacher@example.com" /></label>
          <label>密码<input aria-describedby={error ? 'auth-error' : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" /></label>
          <p className={styles.formError} id="auth-error" role="alert">{error}</p>
          <button type="submit">{mode === 'register' ? '注册并免费开始' : '登录'}</button>
        </form>
        <p className={styles.authSwitch}>{mode === 'register' ? '已经有账号？' : '还没有账号？'} <Link to={`${mode === 'register' ? STANDALONE_TEACHBUDDY_ROUTES.login : STANDALONE_TEACHBUDDY_ROUTES.register}?next=${encodeURIComponent(next)}`}>{mode === 'register' ? '直接登录' : '免费注册'}</Link></p>
        <small>注册即得 360 AI 点，开启你的教学工作台。</small>
      </section>
      <aside className={styles.authAside}><span>教师的一天，少一点重复工作</span><blockquote>“先让我看清楚结果，再决定是否使用。”</blockquote><p>{TEACHBUDDY_BRAND.shortName} 为每个任务保留清晰的上下文、生成过程、审阅动作和结果证据。</p></aside>
    </main>
  );
}
