import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown,
  CircleHelp, Clock3, FileText, History, Lightbulb, MessageCircle, Pencil, Send,
  Sparkles, Target, TriangleAlert, Users,
} from "lucide-react";
import "./App.css";

type Stage = "home" | "brief" | "generating" | "plan" | "confirm" | "saving" | "saved" | "error";
type ErrorKind = "conflict" | "permission" | "temporary" | "partial";
type Variant = "focus" | "plan" | "timeline";

const variantNames: Record<Variant, string> = { focus: "专注视图", plan: "方案视图", timeline: "过程视图" };

function readVariant(): Variant {
  const value = new URLSearchParams(window.location.search).get("variant");
  return value === "plan" || value === "timeline" ? value : "focus";
}

function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [variant, setVariant] = useState<Variant>(readVariant);
  const [reviewMode, setReviewMode] = useState(() => new URLSearchParams(window.location.search).get("review") === "1");
  const [errorKind, setErrorKind] = useState<ErrorKind>("temporary");
  const [task, setTask] = useState("把课程目标整理成课程方案");
  const [goal, setGoal] = useState("让八年级学生完成一篇约 500 字的个人叙事文");
  const [grade, setGrade] = useState("八年级");
  const [lessons, setLessons] = useState(8);

  useEffect(() => {
    if (stage !== "generating" && stage !== "saving") return;
    const timer = window.setTimeout(() => setStage(stage === "generating" ? "plan" : "saved"), 1100);
    return () => window.clearTimeout(timer);
  }, [stage]);

  function startTask(nextTask: string) {
    setTask(nextTask);
    setStage("brief");
  }

  function changeVariant(next: Variant) {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState({}, "", url);
  }

  function restart() {
    setStage("home");
    setGoal("让八年级学生完成一篇约 500 字的个人叙事文");
    setErrorKind("temporary");
  }

  return <div className="teacher-app">
    <Header reviewMode={reviewMode} onReviewMode={() => setReviewMode(!reviewMode)} />
    <main className={`teacher-main teacher-main-${stage} teacher-main-${variant}`}>
      {stage === "home" && <HomeView onStart={startTask} />}
      {stage === "brief" && <BriefView task={task} goal={goal} setGoal={setGoal} grade={grade} setGrade={setGrade} lessons={lessons} setLessons={setLessons} onBack={restart} onContinue={() => setStage("generating")} />}
      {stage === "generating" && <GeneratingView />}
      {stage === "plan" && <PlanView variant={variant} goal={goal} grade={grade} lessons={lessons} onBack={() => setStage("brief")} onConfirm={() => setStage("confirm")} />}
      {stage === "confirm" && <ConfirmView goal={goal} grade={grade} lessons={lessons} onBack={() => setStage("plan")} onSave={() => setStage("saving")} onDemo={(kind) => { setErrorKind(kind); setStage("error"); }} reviewMode={reviewMode} />}
      {stage === "saving" && <SavingView />}
      {stage === "saved" && <SavedView onRestart={restart} onEdit={() => setStage("plan")} />}
      {stage === "error" && <ErrorView kind={errorKind} onBack={() => setStage("confirm")} onRetry={() => setStage("saving")} onRestart={restart} />}
    </main>
    {reviewMode && <ReviewBar variant={variant} setVariant={changeVariant} setStage={setStage} setErrorKind={setErrorKind} onClose={() => setReviewMode(false)} />}
  </div>;
}

function Header({ reviewMode, onReviewMode }: { reviewMode: boolean; onReviewMode: () => void }) {
  return <header className="teacher-header"><div className="header-inner"><a className="wordmark" href="/?variant=focus"><span className="wordmark-icon"><Sparkles size={15} /></span><span><strong>WorkBuddy</strong><small>教师工作台</small></span></a><nav className="main-nav" aria-label="主导航"><button className="nav-item nav-item-active"><BookOpen size={16} /> 工作台</button><button className="nav-item"><CalendarDays size={16} /> 我的课程</button><button className="nav-item"><History size={16} /> 最近记录</button></nav><div className="header-actions"><span className="sample-badge">示例课程</span><button className="help-button" onClick={onReviewMode} aria-label={reviewMode ? "退出评审模式" : "打开评审模式"} title={reviewMode ? "退出评审模式" : "打开评审模式"}><CircleHelp size={18} /></button></div></div></header>;
}

function HomeView({ onStart }: { onStart: (task: string) => void }) {
  return <div className="home-layout"><section className="home-intro"><p className="home-kicker">今天，先完成一件教学工作</p><h1>你想先做什么？</h1><p>告诉我你的想法，我会陪你一步步整理成可以直接使用的课程方案。</p></section><section className="task-list" aria-label="开始一项任务"><TaskCard icon={<Target size={20} />} title="把课程目标整理成课程方案" description="从教学目标开始，生成单元结构和课时安排" recommended onClick={() => onStart("把课程目标整理成课程方案")} /><TaskCard icon={<FileText size={20} />} title="准备下一节课" description="整理教学重点、课堂活动和课前材料" onClick={() => onStart("准备下一节课")} /><TaskCard icon={<MessageCircle size={20} />} title="写一段课后反馈" description="把课堂观察整理成给学生或家长的话" onClick={() => onStart("写一段课后反馈")} /></section><div className="free-entry"><div className="free-entry-heading"><Lightbulb size={17} /><strong>也可以直接告诉我</strong></div><div className="free-entry-row"><input aria-label="直接描述教学任务" placeholder="例如：帮我设计一次关于人物描写的写作课" onKeyDown={(event) => { if (event.key === "Enter") onStart("自定义教学任务"); }} /><button className="primary-button" onClick={() => onStart("自定义教学任务")}><Send size={15} /> 开始</button></div></div><p className="home-note">当前使用示例课程数据，不会修改你的真实课程。</p></div>;
}

function TaskCard({ icon, title, description, recommended, onClick }: { icon: ReactNode; title: string; description: string; recommended?: boolean; onClick: () => void }) {
  return <button className="task-card" onClick={onClick}><span className="task-card-icon">{icon}</span><span className="task-card-copy"><strong>{title}</strong><small>{description}</small></span>{recommended && <span className="recommended-label">推荐</span>}<ArrowRight className="task-card-arrow" size={17} /></button>;
}

function FlowHeader({ step, title, description, onBack }: { step: number; title: string; description: string; onBack?: () => void }) {
  return <div className="flow-header"><button className="back-button" onClick={onBack ?? (() => undefined)}><ArrowLeft size={16} /> 返回</button><div className="flow-progress"><span>第 {step} 步，共 3 步</span><div className="progress-track"><i style={{ width: `${step * 33.33}%` }} /></div></div><div className="flow-title"><h1>{title}</h1><p>{description}</p></div></div>;
}

function BriefView({ task, goal, setGoal, grade, setGrade, lessons, setLessons, onBack, onContinue }: { task: string; goal: string; setGoal: (value: string) => void; grade: string; setGrade: (value: string) => void; lessons: number; setLessons: (value: number) => void; onBack: () => void; onContinue: () => void }) {
  return <div className="flow-layout"><FlowHeader step={1} title="先说说你的目标" description={`这次我们来做：${task}`} onBack={onBack} /><section className="brief-card"><label htmlFor="goal">你希望学生最后学会什么？</label><textarea id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /><p className="field-hint">不用写得很完整，想到什么写什么就可以。</p><div className="brief-row"><fieldset><legend>适用年级</legend><div className="choice-row">{["七年级", "八年级", "九年级"].map((value) => <button className={grade === value ? "choice choice-selected" : "choice"} key={value} onClick={() => setGrade(value)}>{value}</button>)}</div></fieldset><fieldset><legend>预计课时</legend><div className="lesson-stepper"><button onClick={() => setLessons(Math.max(1, lessons - 1))} aria-label="减少课时">−</button><strong>{lessons} 课时</strong><button onClick={() => setLessons(Math.min(20, lessons + 1))} aria-label="增加课时">＋</button></div></fieldset></div><div className="brief-actions"><button className="quiet-button" onClick={onBack}>先不做了</button><button className="primary-button" onClick={onContinue}>继续 <ArrowRight size={15} /></button></div></section><aside className="reassurance"><CheckCircle2 size={17} /><div><strong>你随时可以修改</strong><p>我会先给你一个方案草稿，确认后才会保存。</p></div></aside></div>;
}

function GeneratingView() { return <div className="center-state"><div className="breathing-mark"><Sparkles size={23} /></div><h1>我正在整理你的课程方案</h1><p>先把目标拆成单元结构和课时安排，很快就好。</p><div className="loading-lines"><span /><span /><span /></div></div>; }

function PlanView({ variant, goal, grade, lessons, onBack, onConfirm }: { variant: Variant; goal: string; grade: string; lessons: number; onBack: () => void; onConfirm: () => void }) {
  return <div className="plan-layout"><FlowHeader step={2} title="这是我整理的课程方案" description="你可以先浏览整体安排，再决定是否保存。" onBack={onBack} /><div className="plan-grid"><section className="plan-result"><div className="result-heading"><div><span className="result-eyebrow">{grade} · {lessons} 课时</span><h2>四周叙事写作单元</h2></div><span className="draft-badge">方案草稿</span></div><div className="goal-quote"><Target size={16} /><div><strong>课程目标</strong><p>{goal}</p></div></div><div className="unit-list"><Unit number="01" title="认识叙事结构" detail="理解开头、发展、转折和结尾" lessons="2 课时" /><Unit number="02" title="写出具体细节" detail="练习场景、动作和人物视角" lessons="3 课时" /><Unit number="03" title="完成并修改作品" detail="完成初稿，互相交流并修改" lessons="3 课时" /></div><button className="text-button" onClick={onBack}><Pencil size={14} /> 修改这份方案</button></section><aside className="plan-side"><div className="next-box"><span className="next-icon"><Check size={16} /></span><div><strong>下一步</strong><p>确认后，我会把这份方案保存到你的示例课程中。</p></div><button className="primary-button" onClick={onConfirm}>确认方案 <ArrowRight size={15} /></button></div><div className="source-box"><div><Users size={15} /><strong>我参考了这些信息</strong></div><span>你的教学目标</span><span>{grade}英语课程模板 <em>示例</em></span><span>每周 2 课时的安排 <em>示例</em></span><button className="source-more">查看详情 <ChevronDown size={14} /></button></div>{variant === "timeline" && <div className="mini-timeline"><strong>处理进度</strong><span className="mini-done">目标已理解</span><span className="mini-done">课程方案已整理</span><span>等待你确认</span></div>}</aside></div></div>;
}

function Unit({ number, title, detail, lessons }: { number: string; title: string; detail: string; lessons: string }) { return <div className="unit-item"><span className="unit-number">{number}</span><div><strong>{title}</strong><p>{detail}</p></div><span className="unit-lessons"><Clock3 size={13} /> {lessons}</span></div>; }

function ConfirmView({ goal, grade, lessons, onBack, onSave, onDemo, reviewMode }: { goal: string; grade: string; lessons: number; onBack: () => void; onSave: () => void; onDemo: (kind: ErrorKind) => void; reviewMode: boolean }) {
  return <div className="confirm-layout"><FlowHeader step={3} title="保存前，再确认一下" description="这份方案会保存到当前的示例课程中。" onBack={onBack} /><section className="confirm-card"><div className="confirm-icon"><Check size={21} /></div><h2>课程方案已经准备好了</h2><p>保存后，你还可以继续修改课程内容。</p><div className="confirm-summary"><SummaryRow label="课程目标" value={goal} /><SummaryRow label="适用年级" value={grade} /><SummaryRow label="课程安排" value={`四周，共 ${lessons} 课时`} /></div><div className="confirm-actions"><button className="quiet-button" onClick={onBack}><ArrowLeft size={15} /> 返回修改</button><button className="primary-button" onClick={onSave}><Check size={15} /> 保存课程方案</button></div></section>{reviewMode && <div className="review-demo-panel"><TriangleAlert size={15} /><span>评审用：模拟保存结果</span><button onClick={() => onDemo("partial")}>部分完成</button><button onClick={() => onDemo("conflict")}>版本冲突</button><button onClick={() => onDemo("permission")}>没有权限</button><button onClick={() => onDemo("temporary")}>稍后重试</button></div>}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>; }
function SavingView() { return <div className="center-state"><div className="breathing-mark breathing-mark-save"><BookOpen size={23} /></div><h1>正在保存课程方案</h1><p>不会影响其他课程，请稍等一下。</p><div className="save-progress"><i /></div></div>; }
function SavedView({ onRestart, onEdit }: { onRestart: () => void; onEdit: () => void }) { return <div className="center-state saved-state"><div className="success-mark"><Check size={25} /></div><p className="success-kicker">保存完成</p><h1>你的课程方案已经准备好了</h1><p>接下来可以继续完善教案，也可以先去做别的事情。</p><div className="saved-actions"><button className="primary-button" onClick={onEdit}><Pencil size={15} /> 继续完善</button><button className="quiet-button" onClick={onRestart}>回到工作台</button></div></div>; }
function ErrorView({ kind, onBack, onRetry, onRestart }: { kind: ErrorKind; onBack: () => void; onRetry: () => void; onRestart: () => void }) { const content: Record<ErrorKind, { title: string; detail: string; action: string }> = { conflict: { title: "课程有了新的变化", detail: "保存前，课程内容已经被更新。你的方案没有丢，我们先把两边的变化放在一起看看。", action: "查看变化" }, permission: { title: "现在还不能保存到这里", detail: "这个示例课程暂时不允许直接保存。你的方案仍然在这里，可以继续编辑或换一个位置。", action: "继续编辑" }, temporary: { title: "暂时没有保存成功", detail: "可能是网络短暂不稳定。你的方案已经保留，不需要重新开始。", action: "再试一次" }, partial: { title: "方案保存了一部分", detail: "课程结构已经保存，部分课时安排还在草稿中。你可以继续处理剩下的部分。", action: "继续处理" } }; const current = content[kind]; return <div className="center-state error-state"><div className="error-mark"><TriangleAlert size={24} /></div><p className="error-kicker">需要你看一下</p><h1>{current.title}</h1><p>{current.detail}</p><div className="saved-actions"><button className="primary-button" onClick={kind === "temporary" ? onRetry : onBack}>{current.action} <ArrowRight size={15} /></button><button className="quiet-button" onClick={onRestart}>回到工作台</button></div></div>; }

function ReviewBar({ variant, setVariant, setStage, setErrorKind, onClose }: { variant: Variant; setVariant: (variant: Variant) => void; setStage: (stage: Stage) => void; setErrorKind: (kind: ErrorKind) => void; onClose: () => void }) { return <div className="review-bar"><span>评审视图</span>{(Object.keys(variantNames) as Variant[]).map((key) => <button className={variant === key ? "review-button review-button-active" : "review-button"} key={key} onClick={() => setVariant(key)}>{variantNames[key]}</button>)}<i /><button className="review-button" onClick={() => { setErrorKind("temporary"); setStage("error"); }}>查看失败状态</button><button className="review-close" onClick={onClose}>关闭评审</button></div>; }

export { App };
