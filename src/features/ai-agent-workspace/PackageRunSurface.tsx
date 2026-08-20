import { Boxes, CheckCircle2, CircleAlert, FileText, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkBuddyWorkspace } from './workbuddy-workspace';
import styles from './PackageRunSurface.module.css';

type PackagePanel = 'navigator' | 'approval' | 'receipt' | 'none';
const STATE_LABELS = { planned: '计划中', ready: '可复查', failed: '生成失败', excluded: '已排除', written_back: '已写回' } as const;
const RESULT_LABELS = { succeeded: 'succeeded', failed: 'failed', not_executed: 'not_executed', waiting: 'waiting' } as const;

export function PackageRunSurface() {
  const { packageRun: run, packageReceipt: receipt, generatePackage, setPackageItemIncluded, executePackageSave, retryPackageItem } = useWorkBuddyWorkspace();
  const [panel, setPanel] = useState<PackagePanel>('none');
  if (!run) return null;

  return <section className={styles.page} data-panel-open={panel !== 'none'} aria-labelledby="package-run-title">
    <section className={styles.main}>
      <header><div><h1 id="package-run-title">{run.title}</h1><span>{run.stage === 'configuring' ? '确认范围' : run.stage === 'partial_success' ? '部分成功' : run.stage === 'completed' ? '已完成' : '完成待复查'} · 固定 Mock</span></div>{run.stage !== 'configuring' ? <button type="button" onClick={() => setPanel('navigator')}>方案包导航</button> : null}</header>
      <div className={styles.content}>
        <section className={styles.goal}><span>课程目标</span><p>{run.goal}</p><small>独立 Task Type · course-package · {run.contextSnapshotId}</small>{run.sourceArtifactRef ? <div className={styles.sourceRefs}><span>parentRunRef · {run.parentRunRef}</span><span>sourceArtifactRef · {run.sourceArtifactRef.id} · {run.sourceArtifactRef.version}</span><Link to={`/teacher/ai-agent/runs/${run.parentRunRef}`}>返回源课件 Run</Link></div> : null}</section>
        {run.stage === 'configuring' ? <section className={styles.configure}><Boxes aria-hidden="true" size={22} /><div><h2>确认课程方案包范围</h2><p>{run.sourceArtifactRef ? '请重新确认本次独立 ContextSnapshot 与配套产物范围；不会继承原任务未使用的隐式 Context。' : '四类课程对象共享课程目标，但保持独立产物状态和写回结果。'}</p><ul>{run.artifacts.map((item) => <li key={item.id}><CheckCircle2 aria-hidden="true" size={15} /><span><strong>{item.title}</strong><small>{item.kind} · {item.dependsOn.length ? `依赖 ${item.dependsOn.join(', ')}` : '根产物'}</small></span></li>)}</ul><button type="button" onClick={() => { generatePackage(); setPanel('navigator'); }}>{run.sourceArtifactRef ? '确认派生 Context 与产物清单' : '确认产物清单并生成'}</button></div></section> : <section className={styles.graph}><h2>Artifact Graph</h2><p>课件是根产物；作业、测验和录播脚本引用课件结构。单项失败不会抹掉其他产物。</p>{run.artifacts.map((item) => <article data-state={item.state} key={item.id}><span>{item.state === 'failed' ? <CircleAlert aria-hidden="true" size={16} /> : <FileText aria-hidden="true" size={16} />}</span><div><strong>{item.title}</strong><p>{item.kind} · {item.version} · {STATE_LABELS[item.state]}</p></div>{item.dependsOn.length ? <code>← {item.dependsOn[0]}</code> : <code>root</code>}</article>)}</section>}
      </div>
    </section>

    {panel === 'navigator' ? <aside className={styles.panel} aria-label="课程方案包导航"><header><strong>Package Navigator</strong><button type="button" onClick={() => setPanel('none')}>关闭</button></header><div className={styles.panelBody}>{run.artifacts.map((item) => <button className={styles.artifactRow} type="button" key={item.id}><span>{item.title}</span><small>{STATE_LABELS[item.state]}</small></button>)}<p>固定 Mock Artifact Graph · 每个产物独立复查和写回。</p></div><footer>{run.artifacts.some(({ state }) => state === 'failed') ? <button type="button" onClick={() => retryPackageItem('package-recording')}><RefreshCw aria-hidden="true" size={14} />重试失败项</button> : null}<button className={styles.primary} type="button" onClick={() => setPanel('approval')}>批量审批可用项</button></footer></aside> : null}

    {panel === 'approval' ? <aside className={styles.panel} aria-label="课程方案包审批"><header><strong>课程方案包审批</strong><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header><div className={styles.panelBody}><p>只审批当前组织、同一目标范围内的可用产物；可取消单项。</p>{run.artifacts.map((item) => <label className={styles.approvalItem} key={item.id}><input type="checkbox" checked={item.included && item.state !== 'failed' && item.state !== 'written_back'} disabled={item.state === 'failed' || item.state === 'written_back'} onChange={(event) => setPackageItemIncluded(item.id, event.target.checked)} /><span><strong>{item.title}</strong><small>{item.state === 'failed' ? '失败项本次 not_executed' : item.state === 'written_back' ? '已成功，不重复执行' : '待写回'}</small></span></label>)}</div><footer><button className={styles.primary} type="button" onClick={() => { executePackageSave(); setPanel('receipt'); }}>批准并执行</button></footer></aside> : null}

    {panel === 'receipt' && receipt ? <aside className={styles.panel} aria-label="课程方案包 ExecutionReceipt"><header><strong>{receipt.status === 'partial_success' ? '部分成功' : '写回完成'}</strong><button type="button" onClick={() => setPanel('navigator')}>返回导航</button></header><div className={styles.panelBody}><code>{receipt.id}</code>{receipt.items.map((item) => <article className={styles.resultRow} key={item.artifactId}><strong>{item.artifactId}</strong><span data-result={item.result}>{RESULT_LABELS[item.result]}</span>{item.objectId ? <small>{item.objectId}</small> : null}</article>)}<p>{receipt.truthLabel}</p></div><footer>{receipt.items.some(({ result }) => result === 'failed') ? <button className={styles.primary} type="button" onClick={() => { retryPackageItem('package-recording'); setPanel('navigator'); }}>重试失败项</button> : null}</footer></aside> : null}
  </section>;
}
