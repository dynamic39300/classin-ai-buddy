import { ArrowLeft, Download, File, FolderOpen, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRole } from '@domain/account/role';
import { getAuthorizedResources } from '@domain/space/space';
import { useClassWorkspaceStore } from '@features/class-workspace/class-workspace-store';
import { useSpaceWorkspaceStore } from './space-workspace-store';
import styles from './SpaceWorkspace.module.css';

export function StudentResourceWorkspace({ role, classId }: { role: AppRole; classId?: string }) {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<string | null>(null);
  const { classes } = useClassWorkspaceStore();
  const { catalogResources } = useSpaceWorkspaceStore();
  const record = classId ? classes.find(({ id, visibleTo }) => id === classId && visibleTo.includes(role)) : undefined;
  const resources = record ? getAuthorizedResources(role, record.id, catalogResources) : [];
  const className = record?.name ?? '当前班级';
  const backPath = classId ? `/student/classes/${classId}` : '/student/classes';

  return <section className={styles.contextPage} aria-labelledby="context-resource-title"><header className={styles.contextHeader}><button className={styles.backButton} type="button" onClick={() => navigate(backPath)}><ArrowLeft aria-hidden="true" size={16} />{className}</button><span className={styles.eyebrow}>学生视角 · 授权资源</span><h1 id="context-resource-title">关联资源</h1><p>只显示当前班级已授权的学习资料，不提供完整资源库入口。</p></header>{record ? <div className={styles.contextNotice}><FolderOpen aria-hidden="true" size={18} /><span>资料来自班级课程和老师授权。需要更多资料时，请回到班级内容或班级消息查看。</span></div> : <div className={styles.lockedState}><LockKeyhole aria-hidden="true" size={22} /><strong>无法访问这个班级资源</strong><span>当前视角没有对应的授权上下文。</span><button className={styles.secondaryButton} type="button" onClick={() => navigate('/student/classes')}>返回我的班级</button></div>}<div className={styles.contextList}>{resources.map((resource) => <article className={styles.contextRow} key={resource.id}><span className={styles.resourceType}><File aria-hidden="true" size={18} /><strong>{resource.format}</strong></span><div><strong>{resource.title}</strong><small>{resource.stage} · {resource.subject} · {resource.publisher}</small><p>{resource.description}</p></div><button className={styles.secondaryButton} type="button" onClick={() => setFeedback(`${resource.title}预览入口已打开，本 Demo 不下载真实文件。`)}><Download aria-hidden="true" size={15} />查看资料</button></article>)}{record && resources.length === 0 ? <div className={styles.emptyState}><FolderOpen aria-hidden="true" size={22} /><strong>暂时没有关联资源</strong><span>老师发布资料后，会在对应课程上下文中显示。</span></div> : null}</div>{feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}</section>;
}
